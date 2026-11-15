const $ = (selector) => document.querySelector(selector);
const form = $("#chatForm");
const input = $("#messageInput");
const sendButton = $("#sendButton");
const messagesEl = $("#messages");
const chatArea = $("#chatArea");
const welcome = $("#welcome");
const typing = $("#typingIndicator");
const historyList = $("#historyList");
const connectionStatus = $("#connectionStatus");
const loadModelBtn = $("#loadModelBtn");
const modelProgressWrap = $("#modelProgressWrap");
const modelProgressLabel = $("#modelProgressLabel");
const modelProgressPercent = $("#modelProgressPercent");
const modelProgressBar = $("#modelProgressBar");
const modelError = $("#modelError");
const STORAGE_KEY = "fili-web-v2";
let conversations = loadConversations();
let activeId = conversations[0]?.id || null;
let isSending = false;
let modelState = "checking";
let loadPromise = null;
let resolveModelLoad = null;
let rejectModelLoad = null;
let activeAssistantText = "";
let activeAssistantNode = null;
let generatingConversation = null;
let modelWorker;

function loadConversations() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.slice(0, 12) : [];
  } catch { return []; }
}
function saveConversations() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, 12))); }
  catch { /* Browser storage may be disabled or full. */ }
}
function activeConversation() { return conversations.find((item) => item.id === activeId); }
function makeConversation() {
  const conversation = { id: crypto.randomUUID(), title: "New conversation", messages: [], updatedAt: Date.now() };
  conversations.unshift(conversation);
  activeId = conversation.id;
  saveConversations();
  renderHistory();
  renderConversation();
  input.focus();
}
function renderHistory() {
  historyList.replaceChildren();
  conversations.slice(0, 10).forEach((conversation) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-item" + (conversation.id === activeId ? " active" : "");
    const icon = document.createElement("span");
    icon.textContent = "◷";
    const title = document.createElement("span");
    title.textContent = conversation.title || "New conversation";
    button.append(icon, title);
    button.title = conversation.title || "New conversation";
    button.addEventListener("click", () => {
      activeId = conversation.id;
      renderHistory();
      renderConversation();
      closeMobileMenu();
    });
    historyList.append(button);
  });
}
function renderConversation() {
  const conversation = activeConversation();
  const hasMessages = Boolean(conversation?.messages?.length);
  welcome.classList.toggle("hidden", hasMessages);
  chatArea.classList.toggle("hidden", !hasMessages);
  messagesEl.replaceChildren();
  if (conversation) {
    conversation.messages.forEach((message) => {
      addMessage(message.role, message.content, message.sources || [], false);
    });
  }
  scrollToBottom();
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}
function renderSafeMarkdown(text) {
  const escaped = escapeHtml(text);
  const blocks = [];
  let output = escaped.replace(/```([\w+-]*)\n([\s\S]*?)```/g, (_, language, code) => {
    const index = blocks.push("<pre><code>" + code.replace(/\n$/, "") + "</code></pre>") - 1;
    return "%%CODE_BLOCK_" + index + "%%";
  });
  output = output.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  output = output.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  output = output.split(/\n\n+/).map((part) =>
    part.startsWith("%%CODE_BLOCK_") ? part : "<p>" + part.replace(/\n/g, "<br>") + "</p>"
  ).join("");
  output = output.replace(/%%CODE_BLOCK_(\d+)%%/g, (_, index) => blocks[Number(index)] || "");
  return output;
}
function addMessage(role, content, sources = [], animate = true) {
  const row = document.createElement("article");
  row.className = "message " + role;
  if (!animate) row.style.animation = "none";
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "assistant" ? "F" : "YOU";
  const body = document.createElement("div");
  body.className = "message-content";
  const name = document.createElement("div");
  name.className = "message-name";
  name.textContent = role === "assistant" ? "FILI" : "YOU";
  const text = document.createElement("div");
  text.className = "message-text";
  if (role === "assistant") text.innerHTML = renderSafeMarkdown(content);
  else text.textContent = content;
  body.append(name, text);

  if (role === "assistant") {
    const actions = document.createElement("div");
    actions.className = "message-actions";
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "copy-button";
    copy.textContent = "Copy response";
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(content);
        copy.textContent = "Copied";
      } catch {
        copy.textContent = "Copy unavailable";
      }
      setTimeout(() => { copy.textContent = "Copy response"; }, 1500);
    });
    actions.append(copy);
    body.append(actions);
    if (sources.length) {
      const note = document.createElement("div");
      note.className = "source-note";
      note.textContent = "Knowledge used: " + sources.join(" · ");
      body.append(note);
    }
  }
  row.append(avatar, body);
  messagesEl.append(row);
  return text;
}
function scrollToBottom() {
  requestAnimationFrame(() => { chatArea.scrollTop = chatArea.scrollHeight; });
}
function setBusy(value) {
  isSending = value;
  sendButton.disabled = value;
  input.disabled = value;
  typing.classList.toggle("hidden", !value);
  if (!chatArea.classList.contains("hidden")) scrollToBottom();
}
function updateConnection(state, text) {
  connectionStatus.innerHTML = "<i></i> " + escapeHtml(text);
  connectionStatus.classList.toggle("online", state === "ready");
  connectionStatus.classList.toggle("offline", state === "error");
}
function showModelProgress(label, percent = null) {
  modelProgressWrap.classList.remove("hidden");
  modelProgressLabel.textContent = label;
  if (percent === null || !Number.isFinite(percent)) {
    modelProgressPercent.textContent = "";
  } else {
    const value = Math.max(0, Math.min(100, percent));
    modelProgressPercent.textContent = Math.round(value) + "%";
    modelProgressBar.style.width = value + "%";
  }
}
function handleWorkerMessage(event) {
  const data = event.data || {};
  switch (data.status) {
    case "available":
      if (modelState === "checking") {
        modelState = "idle";
        updateConnection("idle", "GPU ready · model not loaded");
        loadModelBtn.disabled = false;
      }
      break;
    case "loading":
      modelState = "loading";
      updateConnection("loading", "Loading local model");
      loadModelBtn.disabled = true;
      loadModelBtn.textContent = "Loading model…";
      showModelProgress(data.data || "Preparing Qwen3 model files…");
      break;
    case "initiate":
      showModelProgress("Downloading " + (data.file || "model file") + "…", 0);
      break;
    case "progress":
      showModelProgress(
        "Downloading " + (data.file || "model file") + "…",
        typeof data.progress === "number" ? data.progress : null
      );
      break;
    case "done":
      showModelProgress("Downloaded " + (data.file || "model file"), 100);
      break;
    case "ready":
      modelState = "ready";
      updateConnection("ready", "AI running on this device");
      $("#sidebarModel").textContent = "Qwen3 · 0.6B · Local";
      loadModelBtn.textContent = "Model loaded ✓";
      loadModelBtn.disabled = true;
      showModelProgress("FILI is ready on this device.", 100);
      modelError.classList.add("hidden");
      if (resolveModelLoad) resolveModelLoad();
      resolveModelLoad = null;
      rejectModelLoad = null;
      loadPromise = Promise.resolve();
      break;
    case "start":
      activeAssistantText = "";
      activeAssistantNode = addMessage("assistant", "", data.sources || []);
      break;
    case "token":
      activeAssistantText += data.text || "";
      if (activeAssistantNode) {
        activeAssistantNode.innerHTML = renderSafeMarkdown(activeAssistantText);
        scrollToBottom();
      }
      break;
    case "complete":
      if (generatingConversation && activeAssistantText.trim()) {
        generatingConversation.messages.push({
          role: "assistant",
          content: activeAssistantText,
          sources: data.sources || []
        });
        generatingConversation.updatedAt = Date.now();
        saveConversations();
      }
      generatingConversation = null;
      activeAssistantNode = null;
      setBusy(false);
      renderHistory();
      scrollToBottom();
      break;
    case "generation-error": {
      const message = data.data || "FILI could not generate a response.";
      if (activeAssistantNode) activeAssistantNode.innerHTML = "<p>" + escapeHtml(message) + "</p>";
      else addMessage("assistant", message);
      generatingConversation = null;
      activeAssistantNode = null;
      setBusy(false);
      break;
    }
    case "error": {
      modelState = "error";
      updateConnection("error", "GPU unavailable");
      loadModelBtn.disabled = true;
      loadModelBtn.textContent = "Model unavailable";
      modelError.textContent = data.data || "FILI could not initialize WebGPU.";
      modelError.classList.remove("hidden");
      modelProgressWrap.classList.add("hidden");
      if (rejectModelLoad) rejectModelLoad(new Error(modelError.textContent));
      rejectModelLoad = null;
      resolveModelLoad = null;
      loadPromise = null;
      break;
    }
  }
}
function loadModel() {
  if (modelState === "ready") return Promise.resolve();
  if (loadPromise) return loadPromise;
  if (modelState === "error") {
    return Promise.reject(new Error(modelError.textContent || "The local model is unavailable."));
  }

  modelState = "loading";
  loadModelBtn.disabled = true;
  loadModelBtn.textContent = "Loading model…";
  modelError.classList.add("hidden");
  showModelProgress("Connecting to the local model loader…");

  loadPromise = new Promise((resolve, reject) => {
    resolveModelLoad = resolve;
    rejectModelLoad = reject;
    modelWorker.postMessage({ type: "load" });
  });
  return loadPromise;
}
async function sendMessage(rawText) {
  const content = rawText.trim();
  if (!content || isSending) return;

  setBusy(true);
  try {
    await loadModel();
  } catch (error) {
    setBusy(false);
    modelError.textContent = error.message || "The model could not be loaded.";
    modelError.classList.remove("hidden");
    return;
  }

  let conversation = activeConversation();
  if (!conversation) {
    makeConversation();
    conversation = activeConversation();
  }

  conversation.messages.push({ role: "user", content });
  if (conversation.messages.length === 1) {
    conversation.title = content.slice(0, 42) + (content.length > 42 ? "…" : "");
  }
  conversation.updatedAt = Date.now();
  saveConversations();
  renderHistory();
  welcome.classList.add("hidden");
  chatArea.classList.remove("hidden");
  messagesEl.replaceChildren();
  conversation.messages.forEach((message) => {
    addMessage(message.role, message.content, message.sources || [], false);
  });

  input.value = "";
  updateCounter();
  generatingConversation = conversation;
  activeAssistantText = "";
  activeAssistantNode = null;
  modelWorker.postMessage({
    type: "generate",
    data: { messages: conversation.messages.slice(-12) }
  });
}
function updateCounter() {
  $("#charCount").textContent = input.value.length.toLocaleString() + " / 12000";
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 180) + "px";
}
function closeMobileMenu() {
  $("#sidebar").classList.remove("open");
  $("#mobileOverlay").classList.add("hidden");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(input.value);
});
input.addEventListener("input", updateCounter);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});
$("#newChatBtn").addEventListener("click", () => {
  if (isSending) return;
  makeConversation();
  closeMobileMenu();
});
loadModelBtn.addEventListener("click", () => {
  loadModel().catch(() => {});
});
document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => sendMessage(button.dataset.prompt));
});
$("#mobileMenuBtn").addEventListener("click", () => {
  $("#sidebar").classList.add("open");
  $("#mobileOverlay").classList.remove("hidden");
});
$("#mobileOverlay").addEventListener("click", closeMobileMenu);

modelWorker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
modelWorker.addEventListener("message", handleWorkerMessage);
modelWorker.addEventListener("error", (event) => {
  const message = event.message || "The model worker stopped unexpectedly.";
  handleWorkerMessage({ data: { status: "error", data: message } });
});
modelWorker.postMessage({ type: "check" });

renderHistory();
if (activeId) renderConversation();
