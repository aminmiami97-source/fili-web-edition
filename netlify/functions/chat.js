const MODELS = {
  "fili-1.4": process.env.FILI_14_MODEL,
  "fili-1.3": process.env.FILI_13_MODEL,
  "fili-1.2": process.env.FILI_12_MODEL
};
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: { "Allow": "POST" }, body: "Method not allowed" };
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return json(503, { error: "OpenRouter is not configured yet. Add OPENROUTER_API_KEY in Netlify environment variables." });
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Invalid request body." }); }
  const model = MODELS[body.model];
  if (!model) return json(400, { error: "Unknown FILI model or its model ID is not configured." });
  const messages = Array.isArray(body.messages) ? body.messages.filter(m => m && ["user","assistant"].includes(m.role) && typeof m.content === "string").slice(-16) : [];
  if (!messages.length) return json(400, { error: "Send a message to begin." });
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json", "HTTP-Referer": process.env.SITE_URL || "https://fili-ai.netlify.app", "X-Title": "FILI AI" },
      body: JSON.stringify({ model, messages, temperature: 0.7 })
    });
    const data = await response.json();
    if (!response.ok) return json(response.status, { error: data?.error?.message || "OpenRouter request failed." });
    return json(200, data);
  } catch { return json(502, { error: "Unable to reach OpenRouter. Please try again." }); }
};
function json(statusCode, data) { return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(data) }; }