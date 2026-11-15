# FILI web edition architecture

## Current request flow
1. The browser sends the latest conversation messages to the Node.js backend.
2. The backend retrieves a small number of relevant sections from Markdown files in this folder.
3. The backend adds FILI's system instructions and retrieved knowledge to the request.
4. The backend sends the request to the Hugging Face OpenAI-compatible chat-completions endpoint, with Featherless AI explicitly selected for the default model.
5. The backend streams the response back to the browser.

## Current model
The default model identifier is Qwen/Qwen3-0.6B. The model can be changed with the HF_MODEL environment variable.

## Knowledge retrieval
The first version uses lightweight keyword matching over Markdown sections. This is a simple retrieval-augmented generation (RAG) baseline, not a vector database or model-training process. Add factual project information to this folder as needed.

## Conversation context and memory
The browser stores recent conversations in localStorage on the user's device. Recent messages are sent to the backend as context when the user chats. This is browser-local history and short-term context; it is not a server-side account memory system and it does not update model weights.

## LoRA adapter status
A separately trained LoRA adapter is not loaded by this web edition yet. To use it, deploy a compatible inference server that serves the adapter (or a merged model), then configure HF_API_URL and HF_MODEL for that endpoint.

## Security boundaries
- The inference token is read only by the server from environment variables.
- Never put API tokens in public frontend files or commit a real .env file.
- The backend validates message roles and lengths and applies a simple in-memory per-IP request limit.
- Chat contents are not written to server-side conversation storage by this starter app.
- Requests are sent to the configured model provider; review that provider's current data-handling terms before public use.