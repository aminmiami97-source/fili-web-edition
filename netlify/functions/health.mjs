const MODEL = process.env.HF_MODEL || "Qwen/Qwen3-0.6B";

export const config = {
  path: "/api/health"
};

export default async function healthHandler() {
  return Response.json({
    ok: true,
    configured: Boolean(process.env.HF_TOKEN),
    model: MODEL,
    knowledgeSections: 2
  }, {
    headers: { "Cache-Control": "no-store" }
  });
}
