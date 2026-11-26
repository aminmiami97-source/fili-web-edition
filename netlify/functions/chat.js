const MODEL_RANKS = Object.freeze({
  "fili-1.4": 2,
  "fili-1.3": 3,
  "fili-1.2": 4
});

const CATALOG_CACHE_MS = 10 * 60 * 1000;
let cachedFreeTextModels = null;
let cachedAt = 0;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { "Allow": "POST" }, body: "Method not allowed" };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return json(503, { error: "OpenRouter is not configured yet. Add OPENROUTER_API_KEY in Netlify environment variables." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid request body." });
  }

  const rank = MODEL_RANKS[body.model];
  if (!rank) return json(400, { error: "Unknown FILI model." });

  const messages = Array.isArray(body.messages)
    ? body.messages
        .filter(message =>
          message &&
          ["user", "assistant"].includes(message.role) &&
          typeof message.content === "string"
        )
        .slice(-16)
    : [];

  if (!messages.length) return json(400, { error: "Send a message to begin." });

  try {
    const freeModels = await getRankedFreeTextModels();
    const selected = freeModels[rank - 1];

    if (!selected) {
      return json(503, {
        error: "OpenRouter currently has fewer available free text models than FILI needs. Please try another FILI version later."
      });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.SITE_URL || "https://fili-ai.netlify.app",
        "X-Title": "FILI AI"
      },
      body: JSON.stringify({
        model: selected.id,
        messages,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return json(response.status, {
        error: data?.error?.message || "OpenRouter request failed."
      });
    }

    return json(200, {
      ...data,
      fili_model: {
        alias: body.model,
        name: selected.name,
        id: selected.id,
        free_rank: rank,
        ranking_basis: "OpenRouter most-popular model usage over the last week"
      }
    });
  } catch (error) {
    return json(502, {
      error: error?.message || "Unable to reach OpenRouter. Please try again."
    });
  }
};

async function getRankedFreeTextModels() {
  if (cachedFreeTextModels && Date.now() - cachedAt < CATALOG_CACHE_MS) {
    return cachedFreeTextModels;
  }

  const response = await fetch("https://openrouter.ai/api/v1/models?sort=most-popular", {
    headers: { "Accept": "application/json" }
  });

  if (!response.ok) {
    throw new Error("Could not load OpenRouter's current free-model ranking.");
  }

  const payload = await response.json();
  const models = Array.isArray(payload.data) ? payload.data : [];

  // Only use free variants that do not require a paid model endpoint.
  // Keep the ordering supplied by OpenRouter's most-popular sort.
  const freeTextModels = models.filter(model => {
    const inputs = model.architecture?.input_modalities || [];
    const outputs = model.architecture?.output_modalities || [];
    const pricing = model.pricing || {};

    return typeof model.id === "string" &&
      model.id.endsWith(":free") &&
      inputs.includes("text") &&
      outputs.includes("text") &&
      Number(pricing.prompt) === 0 &&
      Number(pricing.completion) === 0;
  });

  if (!freeTextModels.length) {
    throw new Error("OpenRouter did not return any eligible free text models.");
  }

  cachedFreeTextModels = freeTextModels;
  cachedAt = Date.now();
  return cachedFreeTextModels;
}

function json(statusCode, data) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(data)
  };
}
