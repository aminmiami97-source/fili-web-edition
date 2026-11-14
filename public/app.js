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
const STORAGE_KEY = "fili-web-v1";
let conversations = loadConversations();
let activeId = conversations[0]?.id || null;
let isSending = false;

function loadConversations() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.slice(0, 12) : [];
  } catch { return []; }
}
function saveConversations() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, 12))); }
  catch { /* Storage may be disabled or full; chat still works in memory. */ }
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
  if (conversation) conversation.messages.forEach((message) => addMessage(message.role, message.content, message.sources || [], false));
  scrollToBottom();
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
function renderSafeMarkdown(text) {
  const escaped = escapeHtml(text);
  const blocks = [];
  let output = escaped.replace(/```([\w+-]*)\n([\s\S]*?)```/g, (_, language, code) => {
    const index = blocks.push('<pre><code>' + code.replace(/\n$/, "") + '</code></pre>') - 1;
    return "%%CODE_BLOCK_" + index + "%%";
  });
  output = output.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  output = output.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  output = output.split(/\n\n+/).map((part) => part.startsWith("%%CODE_BLOCK_") ? part : "<p>" + part.replace(/\n/g, "<br>") + "</p>").join("");
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
      try { await navigator.clipboard.writeText(content); copy.textContent = "Copied"; }
      catch { copy.textContent = "Copy unavailable"; }
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
function updateConnection(online, text) {
  connectionStatus.classList.toggle("online", online);
  connectionStatus.classList.toggle("offline", !online);
  connectionStatus.lastChild && (connectionStatus.lastChild.textContent = text);
  connectionStatus.innerHTML = "<i></i> " + escapeHtml(text);
  connectionStatus.classList.toggle("online", online);
  connectionStatus.classList.toggle("offline", !online);
}
async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    updateConnection(response.ok && data.configured, data.configured ? "AI connected" : "Setup needed");
    if (data.model) $("#sidebarModel").textContent = data.model;
  } catch {
    updateConnection(false, "Server unavailable");
  }
}
async function sendMessage(rawText) {
  const content = rawText.trim();
  if (!content || isSending) return;
  let conversation = activeConversation();
  if (!conversation) {
    makeConversation();
    conversation = activeConversation();
  }
  conversation.messages.push({ role: "user", content });
  if (conversation.messages.length === 1) conversation.title = content.slice(0, 42) + (content.length > 42 ? "…" : "");
  conversation.updatedAt = Date.now();
  saveConversations();
  renderHistory();
  welcome.classList.add("hidden");
  chatArea.classList.remove("hidden");
  messagesEl.replaceChildren();
  conversation.messages.forEach((message) => addMessage(message.role, message.content, message.sources || [], false));
  input.value = "";
  updateCounter();
  setBusy(true);
  let assistantText = "";
  let assistantNode = null;
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversation.messages.slice(-20).map(({ role, content: text }) => ({ role, content: text })) })
    });
    if (!response.ok) {
      let detail = "The request could not be completed.";
      try { const error = await response.json(); detail = error.error || detail; } catch {}
      throw new Error(detail);
    }
    const sources = (response.headers.get("X-FILI-Sources") || "").split(",").filter(Boolean);
    assistantNode = addMessage("assistant", "", sources);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";
      for (const event of events) {
        const line = event.split("\n").find((item) => item.startsWith("data:"));
        if (!line) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const data = JSON.parse(payload);
          const delta = data.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) {
            assistantText += delta;
            assistantNode.innerHTML = renderSafeMarkdown(assistantText);
            scrollToBottom();
          }
        } catch { /* Ignore non-JSON provider events. */ }
      }
    }
    if (!assistantText.trim()) throw new Error("The model returned an empty response. Try again.");
    conversation.messages.push({ role: "assistant", content: assistantText, sources });
    conversation.updatedAt = Date.now();
    saveConversations();
  } catch (error) {
    const message = error.message || "Something went wrong.";
    if (assistantNode) assistantNode.innerHTML = "<p>" + escapeHtml(message) + "</p>";
    else addMessage("assistant", message);
    conversation.messages.push({ role: "assistant", content: message });
    saveConversations();
  } finally {
    setBusy(false);
    renderHistory();
    scrollToBottom();
    input.focus();
  }
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
  makeConversation();
  closeMobileMenu();
});
document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => sendMessage(button.dataset.prompt));
});
$("#mobileMenuBtn").addEventListener("click", () => {
  $("#sidebar").classList.add("open");
  $("#mobileOverlay").classList.remove("hidden");
});
$("#mobileOverlay").addEventListener("click", closeMobileMenu);

renderHistory();
if (activeId) renderConversation();
checkHealth();
setInterval(checkHealth, 60000);