# FILI Web Edition

**FILI 1.0** is a chat-focused AI assistant web app with its own interface, personality instructions, and a small local knowledge-retrieval layer.

> **Model transparency:** The starter configuration uses `Qwen/Qwen3-0.6B` as its underlying model through an OpenAI-compatible inference API. FILI is the product and assistant experience; it is not a separately trained foundation model. The project's LoRA adapter is not loaded by this first web edition yet.

## Features

- Responsive dark interface with a violet accent
- Streaming assistant replies
- Browser-local conversation history
- Copy response action
- Markdown knowledge files and keyword-based retrieval (RAG baseline)
- Server-side model token; no key is shipped to the browser
- Basic input validation and per-IP request limiting
- Render deployment configuration

## Run locally

Requirements: Node.js 20 or newer.

1. Clone this repository.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env`.
4. Create a Hugging Face token with **Inference Providers** permission and place it in `HF_TOKEN` in your local `.env` file.
5. Start FILI:

   ```bash
   npm start
   ```

6. Open `http://localhost:3000`.

The token must remain on the server. Never add it to `public/app.js`, `public/index.html`, or any committed file.

## Configure the model

The default settings are:

- `HF_API_URL=https://router.huggingface.co/v1/chat/completions`
- `HF_MODEL=Qwen/Qwen3-0.6B`

Set these as server environment variables to use another compatible model or inference endpoint. Provider availability, account permissions, and usage charges or limits depend on the provider and account; do not assume inference is permanently free.

## Deploy

This repository includes `render.yaml` for a Node web service.

1. Create a new web service from this GitHub repository in your hosting provider.
2. Set `HF_TOKEN` as a **secret environment variable** in the hosting dashboard. Do not commit it.
3. Keep `HF_MODEL` and `HF_API_URL` set to the values above unless you are intentionally changing the model endpoint.
4. Deploy and open the service URL. The `/api/health` endpoint reports whether a token is configured.

GitHub Pages alone cannot run this Node backend or safely store the private inference token. Use a Node-capable host for the complete app.

## Add FILI knowledge

Add or edit Markdown files inside `knowledge/`. The server loads Markdown sections at startup and retrieves relevant sections for each chat request. This starter uses keyword matching; it is not a vector database and does not train the model.

## Current limitations

- The previously trained FILI LoRA adapter is **not connected** to this website yet. It must be hosted by a compatible inference server (or merged into a model) before this app can use it.
- Conversation history is stored in the visitor's browser, not in a user account or server database.
- The RAG layer is a lightweight keyword-based prototype.
- Model output quality and availability depend on the selected model and inference provider.
- Add stronger authentication, abuse prevention, and privacy controls before offering the service to a large public audience.

## Privacy note

Chat messages are sent to the configured inference provider so it can generate replies. This starter app does not save chat transcripts on its own server, but browser history remains in the visitor's local storage. Review the provider's current privacy and data-processing terms before public deployment.

## License

The original source code in this repository is released under the Apache License 2.0. Third-party models, libraries, fonts, and other assets remain subject to their own licenses and terms. See [LICENSE](LICENSE).
