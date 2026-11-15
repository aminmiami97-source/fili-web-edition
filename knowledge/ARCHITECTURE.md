# FILI Web Edition architecture

## Inference

FILI uses Qwen3-0.6B from the public ONNX model repository `onnx-community/Qwen3-0.6B-ONNX`.

The website loads the quantized model with Transformers.js and ONNX Runtime Web in a dedicated browser Web Worker. The WebGPU backend executes model inference on the visitor's device. No Hugging Face Inference Provider API is called, and no inference API token is required.

The first visit downloads the model files from the public Hugging Face model repository. The browser caches those files for later visits. The model download is separate from chat: user prompts and chat history are processed locally and are not sent to an AI inference API.

## Knowledge retrieval

The first version uses lightweight keyword matching over a small set of FILI identity and architecture notes embedded in the worker. This is a RAG baseline, not a vector database or model-training process.

## Conversation history

The browser stores recent conversations in localStorage. This is local browser history and short-term context; it is not a server-side account memory system and does not update model weights.

## Model and adapter status

The current browser build uses the ONNX export of the base Qwen3-0.6B model. The separately trained FILI LoRA adapter is not included in this ONNX model yet. To use that adapter, it would need to be merged/exported into a compatible ONNX model and tested with Transformers.js.

## Requirements and limitations

- A modern browser with WebGPU support is required by this build.
- A compatible GPU and sufficient device memory are required.
- The first model download can be large and takes longer than later visits.
- Generation speed depends on the visitor's GPU, browser, and available memory.
- If WebGPU is unavailable, the model will not load in this version.
- The site is static-hosted on Netlify; model inference happens in the browser.
