# FILI Web Edition

**FILI 1.0** is a chat-focused AI assistant web app with its own interface, personality instructions, and a small local knowledge-retrieval layer.

> **Model transparency:** The starter configuration uses `Qwen/Qwen3-0.6B` as its underlying model through an OpenAI-compatible inference API. FILI is the product and assistant experience; it is not a separately trained foundation model. The FILI LoRA adapter is not loaded by this first web edition yet.

## Features

- Responsive dark interface with a violet accent
- Streaming assistant replies
- Browser-local conversation history
- Copy response action
- FILI personality instructions
- Lightweight Markdown knowledge retrieval (RAG baseline)
- Server-side model token; no key is shipped to the browser
- Basic input validation and best-effort per-instance request throttling

## Deploy on Netlify (recommended)

This repository is configured for Netlify Free. The current Free plan is $0/month with a hard monthly usage limit; when the limit is reached, service pauses rather than automatically recharging the account. Check the current plan limits before sharing the site publicly.

1. Sign in at https://app.netlify.com/.
2. Choose **Add new project → Import an existing project**.
3. Connect GitHub and select `aminmiami97-source/fili-web-edition`.
4. Netlify should detect the repository settings from `netlify.toml`. Confirm:
   - Build command: `npm install`
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
5. Before publishing, open **Project configuration → Environment variables** and add:
   - `HF_TOKEN`: your Hugging Face inference token (keep this private)
   - `HF_MODEL`: `Qwen/Qwen3-0.6B`
   - `HF_API_URL`: `https://router.huggingface.co/v1/chat/completions`
6. Ensure the token is available to Functions at runtime, then deploy.
7. Open your Netlify site URL. Check `/api/health`; it should return `"configured": true`.

**Never** paste the real token into GitHub, `.env.example`, the browser JavaScript, or public issue comments. Netlify environment variables are stored separately from the repository and can be used by serverless functions.

The website and backend run on Netlify. The model inference is provided by Hugging Face and is subject to that provider's availability, account permissions, quotas, and pricing. Hosting the website for free does not guarantee free model inference.

## Local development

Requirements: Node.js 20 or newer.

1. Clone the repository.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and set your local `HF_TOKEN`.
4. Run:

   ```bash
   npm start
   ```

5. Open `http://localhost:3000`.

The original `server.js` is retained for local development. Netlify production uses the serverless functions in `netlify/functions/`.

## Model configuration

Defaults:

- `HF_API_URL=https://router.huggingface.co/v1/chat/completions`
- `HF_MODEL=Qwen/Qwen3-0.6B`

These can be changed in the hosting provider's environment-variable settings. Provider availability and usage charges or limits depend on the provider and account.

## Knowledge retrieval

The first Netlify function includes the FILI identity and architecture notes as small local knowledge sections. The initial retrieval uses keyword matching. It is a simple RAG baseline, not a vector database and not model training.

## Conversation context and memory

The browser stores recent conversations in localStorage. Recent messages are sent to the backend as context when the visitor chats. This is browser-local history and short-term context, not a server-side account memory system and it does not update model weights.

## Current limitations

- The previously trained FILI LoRA adapter is **not connected** to this website yet. It must be hosted by a compatible inference endpoint (or merged into a model) before this app can use it.
- Conversation history is stored in the visitor's browser, not in a user account or server database.
- RAG is currently a lightweight keyword-based prototype.
- Netlify streaming functions have a documented 60-second synchronous execution limit.
- Request throttling in the function is best-effort per running instance, not a complete anti-abuse system. Add stronger controls before a large public launch.
- Chat messages are sent to the configured model provider to generate replies. Review its current privacy and data-processing terms before deployment.

## License

The original source code in this repository is released under the Apache License 2.0. Third-party models, libraries, fonts, and other assets remain subject to their own licenses and terms. See [LICENSE](LICENSE).
