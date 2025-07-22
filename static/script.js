document.addEventListener("DOMContentLoaded", () => {
    const elements = {
        input: document.getElementById("user-input"),
        chatBox: document.getElementById("chat-box"),
        welcomeScreen: document.getElementById("welcome"),
        convoList: document.getElementById("conversation-list"),
        sidebar: document.getElementById("sidebar"),
        menuToggle: document.getElementById("menuToggle"),
        closeSidebar: document.getElementById("closeSidebar"),
        sendBtn: document.querySelector(".send-btn"),
        newChatBtn: document.querySelector(".new-chat-btn")
    };

    let currentSessionId = null;
    let currentChat = [];
    let allConversations = [];
    let isProcessing = false;

    // Setup button events
    function setupEventListeners() {
        elements.sendBtn.addEventListener("click", sendMessage);
        elements.input.addEventListener("keydown", handleInputKeydown);
        elements.newChatBtn.addEventListener("click", startNewChat);
        elements.menuToggle?.addEventListener("click", () => elements.sidebar.classList.add("active"));
        elements.closeSidebar?.addEventListener("click", () => elements.sidebar.classList.remove("active"));
    }

    function initFromStorage() {
        try {
            const savedChats = localStorage.getItem('fspro_chats');
            if (savedChats) allConversations = JSON.parse(savedChats);
            const activeChat = localStorage.getItem('fspro_active_chat');
            if (activeChat) {
                const chatData = JSON.parse(activeChat);
                currentSessionId = chatData.sessionId;
                currentChat = chatData.chat || [];
            }
        } catch (e) {
            console.error("Storage Error:", e);
            allConversations = [];
        }
        updateSidebar();
        renderChat();
    }

    function saveToStorage() {
        localStorage.setItem('fspro_chats', JSON.stringify(allConversations));
        if (currentSessionId) {
            localStorage.setItem('fspro_active_chat', JSON.stringify({
                sessionId: currentSessionId,
                chat: currentChat
            }));
        } else {
            localStorage.removeItem('fspro_active_chat');
        }
    }

    function createMessageElement(msg) {
        const div = document.createElement("div");
        div.className = `message ${msg.sender}-message`;
        const content = msg.sender === "user"
            ? msg.text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")
            : msg.text;
        div.innerHTML = `
            <div class="message-header">
                <div class="avatar">${msg.sender === "user" ? "U" : "FP"}</div>
                <div class="username">${msg.sender === "user" ? "You" : "FSPro Assistant"}</div>
            </div>
            <div class="message-content">${content}</div>
            <div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        `;
        return div;
    }

    function renderChat() {
        elements.chatBox.querySelectorAll(".message").forEach(m => m.remove());
        if (currentChat.length === 0) {
            elements.welcomeScreen.style.display = "flex";
        } else {
            elements.welcomeScreen.style.display = "none";
            currentChat.forEach(msg => elements.chatBox.appendChild(createMessageElement(msg)));
        }
        scrollToBottom();
    }

    function handleInputKeydown(e) {
        if (e.key === "Enter" && !e.shiftKey && !isProcessing) {
            e.preventDefault();
            sendMessage();
        }
    }

    async function sendMessage() {
        const msg = elements.input.value.trim();
        if (!msg || isProcessing) return;

        isProcessing = true;
        elements.input.disabled = true;
        currentChat.push({ sender: "user", text: msg });
        renderChat();
        elements.input.value = "";
        showTypingIndicator();

        try {
            const res = await fetch("/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: msg, session_id: currentSessionId })
            });

            if (!res.ok) throw new Error("Failed to send message.");
            const data = await res.json();
            processBotResponse(data);
        } catch (err) {
            handleError(err);
        } finally {
            isProcessing = false;
            elements.input.disabled = false;
            elements.input.focus();
        }
    }

    function showTypingIndicator() {
        if (document.getElementById("typing")) return;
        const typing = createMessageElement({
            sender: "bot",
            text: `<div class="typing-indicator"><span></span><span></span><span></span></div>`
        });
        typing.id = "typing";
        elements.chatBox.appendChild(typing);
        scrollToBottom();
    }

    function processBotResponse(data) {
        document.getElementById("typing")?.remove();
        currentSessionId = data.session_id;
        currentChat.push({ sender: "bot", text: data.response });
        saveToStorage();
        renderChat();
    }

    function handleError(error) {
        console.error("Chat Error:", error);
        document.getElementById("typing")?.remove();
        currentChat.push({ sender: "bot", text: `❌ Error: ${error.message}` });
        renderChat();
    }

    async function startNewChat() {
        if (currentChat.length > 0 && currentSessionId) {
            const idx = allConversations.findIndex(c => c.id === currentSessionId);
            if (idx !== -1) {
                allConversations[idx].chat = [...currentChat];
            } else {
                allConversations.push({
                    id: currentSessionId,
                    title: "Summarizing...",
                    chat: [...currentChat],
                    timestamp: Date.now()
                });
            }
            updateSidebar();
            try {
                const res = await fetch("/summarize-title", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ session_id: currentSessionId })
                });
                const data = await res.json();
                const finalIdx = allConversations.findIndex(c => c.id === currentSessionId);
                if (finalIdx !== -1) allConversations[finalIdx].title = data.title;
            } catch (err) {
                console.warn("Title summarization failed");
            }
        }

        currentSessionId = null;
        currentChat = [];
        saveToStorage();
        updateSidebar();
        renderChat();
        elements.input.focus();
    }

    function updateSidebar() {
        elements.convoList.innerHTML = "";
        allConversations
            .sort((a, b) => b.timestamp - a.timestamp)
            .forEach(convo => {
                const item = document.createElement("div");
                item.className = "history-item";
                item.dataset.id = convo.id;
                item.innerHTML = `
                    <i class="fas fa-comment"></i>
                    <span>${convo.title}</span>
                    <button class="delete-btn"><i class="fas fa-trash"></i></button>
                `;
                item.addEventListener("click", e => {
                    if (!e.target.closest(".delete-btn")) loadChat(convo.id);
                });
                item.querySelector(".delete-btn").addEventListener("click", e => {
                    e.stopPropagation();
                    deleteConversation(convo.id);
                });
                elements.convoList.appendChild(item);
            });
    }

    function deleteConversation(convoId) {
        allConversations = allConversations.filter(c => c.id !== convoId);
        if (currentSessionId === convoId) {
            startNewChat();
        } else {
            saveToStorage();
            updateSidebar();
        }
    }

    async function loadChat(convoId) {
        const convo = allConversations.find(c => c.id === convoId);
        if (convo && currentSessionId !== convoId) {
            await startNewChat();
            currentSessionId = convo.id;
            currentChat = [...convo.chat];
            saveToStorage();
            renderChat();
            elements.sidebar.classList.remove("active");
            elements.input.focus();
        }
    }

    function scrollToBottom() {
        elements.chatBox.scrollTop = elements.chatBox.scrollHeight;
    }

    setupEventListeners();
    initFromStorage();
});

window.addEventListener("resize", () => {
    const activeElement = document.activeElement;
    if (window.innerHeight < 500 && activeElement.tagName === 'INPUT') {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});
