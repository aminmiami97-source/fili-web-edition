const $ = selector => document.querySelector(selector);

const form = $("#chatForm");
const input = $("#messageInput");
const send = $("#sendButton");
const messages = $("#messages");
const chat = $("#chatArea");
const welcome = $("#welcome");
const typing = $("#typingIndicator");
const history = $("#historyList");
const modelSelect = $("#modelSelect");

const STORAGE_KEY = "fili-ai-conversations-v1";
let conversations = loadConversations();
let activeId = conversations[0]?.id || null;
let busy = false;

function loadConversations() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data.slice(0, 15) : [];
  } catch {
    return [];
  }
}

function saveConversations() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, 15)));
  } catch {
    // Chat still works when browser storage is unavailable.
  }
}

function currentConversation() {
  return conversations.find(item => item.id === activeId);
}

function createConversation() {
  const conversation = {
    id: crypto.randomUUID(),
    title: "New conversation",
    messages: [],
    updatedAt: Date.now()
  };

  conversations.unshift(conversation);
  activeId = conversation.id;
  saveConversations();
  renderHistory();
  renderChat();
  input.focus();
}

function renderHistory() {
  history.replaceChildren();

  conversations.slice(0, 12).forEach(conversation => {
    const button = document.createElement("button");
    button.className = "history-item" + (conversation.id === activeId ? " active" : "");
    button.type = "button";

    const icon = document.createElement("span");
    icon.textContent = "◷";

    const title = document.createElement("span");
    title.textContent = conversation.title || "Untitled";

    button.append(icon, title);
    button.addEventListener("click", () => {
      activeId = conversation.id;
      renderHistory();
      renderChat();
      closeMenu();
    });

    history.append(button);
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function formatMessage(value) {
  const fence = String.fromCharCode(96).repeat(3);
  const inlineTick = String.fromCharCode(96);
  const inlineCode = new RegExp(inlineTick + "([^" + inlineTick + "]+)" + inlineTick, "g");
  const segments = String(value).split(fence);

  return segments.map((segment, index) => {
    if (index % 2 === 1) {
      const code = escapeHTML(segment.replace(/^\w+[ \t]*\n/, "").replace(/\n$/, ""));
      return "<pre><code>" + code + "</code></pre>";
    }

    const paragraphs = escapeHTML(segment)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(inlineCode, "<code>$1</code>")
      .split(/\n{2,}/);

    return paragraphs
      .map(paragraph => paragraph.trim() ? "<p>" + paragraph.replace(/\n/g, "<br>") + "</p>" : "")
      .join("");
  }).join("");
}

function addMessage(role, content, animate = true) {
  const article = document.createElement("article");
  article.className = "message " + role;
  if (!animate) article.style.animation = "none";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "assistant" ? "f" : "YOU";

  const body = document.createElement("div");
  body.className = "message-content";

  const name = document.createElement("div");
  name.className = "message-name";
  name.textContent = role === "assistant" ? "FILI" : "YOU";

  const text = document.createElement("div");
  text.className = "message-text";

  if (role === "assistant") {
    text.innerHTML = formatMessage(content);
  } else {
    text.textContent = content;
  }

  body.append(name, text);

  if (role === "assistant") {
    const actions = document.createElement("div");
    actions.className = "message-actions";

    const copy = document.createElement("button");
    copy.className = "copy-button";
    copy.type = "button";
    copy.textContent = "Copy";
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(content);
        copy.textContent = "Copied";
      } catch {
        copy.textContent = "Unavailable";
      }
      setTimeout(() => { copy.textContent = "Copy"; }, 1200);
    });

    actions.append(copy);
    body.append(actions);
  }

  article.append(avatar, body);
  messages.append(article);
}

function renderChat() {
  const conversation = currentConversation();
  const hasMessages = Boolean(conversation?.messages?.length);

  welcome.classList.toggle("hidden", hasMessages);
  chat.classList.toggle("hidden", !hasMessages);
  messages.replaceChildren();

  if (conversation) {
    conversation.messages.forEach(message => {
      addMessage(message.role, message.content, false);
    });
  }

  scrollToBottom();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chat.scrollTop = chat.scrollHeight;
  });
}

function setBusy(value) {
  busy = value;
  send.disabled = value;
  input.disabled = value;
  typing.classList.toggle("hidden", !value);
}

function updateCounter() {
  $("#charCount").textContent = input.value.length.toLocaleString() + " / 12000";
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 180) + "px";
}

function closeMenu() {
  $("#sidebar").classList.remove("open");
  $("#mobileOverlay").classList.add("hidden");
}

async function sendMessage(rawText) {
  const text = rawText.trim();
  if (!text || busy) return;

  if (!currentConversation()) createConversation();

  const conversation = currentConversation();
  conversation.messages.push({ role: "user", content: text });

  if (conversation.messages.length === 1) {
    conversation.title = text.slice(0, 45) + (text.length > 45 ? "…" : "");
  }

  conversation.updatedAt = Date.now();
  saveConversations();

  welcome.classList.add("hidden");
  chat.classList.remove("hidden");
  messages.replaceChildren();
  conversation.messages.forEach(message => addMessage(message.role, message.content, false));

  input.value = "";
  updateCounter();
  setBusy(true);

  const assistantRow = document.createElement("article");
  assistantRow.className = "message assistant";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "f";

  const body = document.createElement("div");
  body.className = "message-content";

  const name = document.createElement("div");
  name.className = "message-name";
  name.textContent = "FILI";

  const responseText = document.createElement("div");
  responseText.className = "message-text";

  body.append(name, responseText);
  assistantRow.append(avatar, body);
  messages.append(assistantRow);

  try {
    const response = await fetch("/.netlify/functions/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelSelect.value,
        messages: conversation.messages
      })
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      throw new Error("The server returned an unreadable response.");
    }

    if (!response.ok) {
      throw new Error(data.error || "FILI couldn't connect. Please try again.");
    }

    const answer = data.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) {
      throw new Error("OpenRouter returned an empty response. Please try again.");
    }

    responseText.innerHTML = formatMessage(answer);
    conversation.messages.push({ role: "assistant", content: answer });
    conversation.updatedAt = Date.now();
    saveConversations();

    if (data.fili_model?.name) {
      name.title = "Powered by " + data.fili_model.name;
    }
  } catch (error) {
    responseText.textContent = "Connection error: " + error.message;
    conversation.messages.pop();
    saveConversations();
  } finally {
    setBusy(false);
    renderHistory();
    scrollToBottom();
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  sendMessage(input.value);
});

input.addEventListener("input", updateCounter);
input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

$("#newChatBtn").addEventListener("click", () => {
  if (!busy) {
    createConversation();
    closeMenu();
  }
});

document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => sendMessage(button.dataset.prompt));
});

$("#mobileMenuBtn").addEventListener("click", () => {
  $("#sidebar").classList.add("open");
  $("#mobileOverlay").classList.remove("hidden");
});

$("#mobileOverlay").addEventListener("click", closeMenu);

renderHistory();
if (activeId) renderChat();
updateCounter();
