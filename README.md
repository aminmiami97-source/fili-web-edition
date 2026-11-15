# FILI Web Edition

**FILI 1.0** is a chat-focused AI assistant with its own interface, personality instructions, browser-local conversation history, and a small knowledge-retrieval layer.

> **Model transparency:** FILI currently runs the ONNX export of **Qwen3-0.6B** locally in the visitor's browser. FILI is the assistant product and experience; the underlying foundation-model weights are Qwen's. The separately trained FILI LoRA adapter is not included in this browser build yet.

## Features

- Responsive dark interface with a violet accent
- Local Qwen3-0.6B inference using Transformers.js and ONNX Runtime Web
- WebGPU acceleration in a dedicated browser worker
- First-run model download progress
- Streaming assistant replies
- Browser-local conversation history
- Copy response action
- FILI personality instructions and a lightweight local knowledge-retrieval baseline
- No hosted inference API, inference token, or model-provider credits required

## Deploy on Netlify

This repository builds as a static site. Netlify only hosts the web files; the visitor's browser runs the model.

1. Open https://app.netlify.com/.
2. Choose **Add new project → Import an existing project**.
3. Connect GitHub and select `aminmiami97-source/fili-web-edition`.
4. Confirm these build settings:
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
5. Deploy the project.

**No Hugging Face API token or secret environment variable is required.** The model weights are fetched from the public ONNX model repository on the visitor's first load. Their chat messages are processed locally in their browser.

## First use

1. Open the deployed FILI website in a modern browser with WebGPU support (current Chrome or Edge on a compatible device is recommended).
2. Click **Load FILI model**.
3. Wait while the browser downloads the model files and compiles the GPU shaders. This can take a while on the first visit.
4. Once the status says the model is ready, start chatting.

The browser caches model files for subsequent visits. Clearing the browser's site data may require downloading them again.

## Local development

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production build locally, run:

```bash
npm run build
npm start
```

## Privacy

Chat prompts and responses are processed on the visitor's device by the locally loaded model. The site does not send chat messages to Hugging Face Inference Providers or another model API. The browser does download model files from the public Hugging Face model repository. Conversation history is kept in browser localStorage.

## Current limitations

- **WebGPU required:** This version needs a browser and device with compatible WebGPU support. If the browser cannot access a GPU adapter, the model will not load.
- **First-run download:** The ONNX model files are downloaded by the visitor's browser and may take time and bandwidth on first use.
- **Device performance:** Response speed and memory use depend on each visitor's hardware.
- **LoRA adapter:** The FILI LoRA adapter trained in the earlier experiment is not yet integrated into this ONNX export.
- **Knowledge retrieval:** The starter knowledge retrieval uses keyword matching over a small set of notes. It is not yet a vector database.
- **Memory:** Conversation history is browser-local and is not synced between devices or accounts.

## License

The original source code in this repository is released under the Apache License 2.0. Third-party models, libraries, fonts, and other assets remain subject to their own licenses and terms. See [LICENSE](LICENSE).
