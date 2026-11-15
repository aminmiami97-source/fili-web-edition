const MODEL = process.env.HF_MODEL || "Qwen/Qwen3-0.6B:featherless-ai";
const [model, provider = "auto"] = MODEL.split(":");

export const config = {
  path: "/api/health"
};

export default async function healthHandler() {
  return Response.json({
    ok: true,
    configured: Boolean(process.env.HF_TOKEN),
    model,
    provider,
    knowledgeSections: 2
  }, {
    headers: { "Cache-Control": "no-store" }
  });
}
