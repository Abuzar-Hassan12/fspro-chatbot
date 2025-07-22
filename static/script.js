// script.js
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
        } catch (e) { console.error("Storage Error:", e); allConversations = []; }
        updateSidebar();
        renderChat();
    }

    function saveToStorage() {
        localStorage.setItem('fspro_chats', JSON.stringify(allConversations));
        if (currentSessionId) {
            localStorage.setItem('fspro_active_chat', JSON.stringify({ sessionId: currentSessionId, chat: currentChat }));
        } else {
            localStorage.removeItem('fspro_active_chat');
        }
    }

    function createMessageElement(msg) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.sender}-message`;
        const content = msg.sender === 'user' ? msg.text.replace(/</g, "<").replace(/>/g, ">").replace(/\n/g, "<br>") : msg.text;
        messageDiv.innerHTML = `
            <div class="message-header">
                <div class="avatar">${msg.sender === 'user' ? 'U' : 'FP'}</div>
                <div class="username">${msg.sender === 'user' ? 'You' : 'FSPro Assistant'}</div>
            </div>
            <div class="message-content">${content}</div>
            <div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>`;
        return messageDiv;
    }

    function renderChat() {
        elements.welcomeScreen.style.display = currentChat.length > 0 ? "none" : "flex";
        const existingMessages = elements.chatBox.querySelectorAll('.message');
        existingMessages.forEach(m => m.remove());
        currentChat.forEach(msg => elements.chatBox.appendChild(createMessageElement(msg)));
        scrollToBottom();
    }

    function handleInputKeydown(e) {
        if (e.key === "Enter" && !e.shiftKey && !isProcessing) {
            e.preventDefault();
            sendMessage();
        }
    }

    async function sendMessage() {
        if (isProcessing) return;
        const msg = elements.input.value.trim();
        if (!msg) return;

        isProcessing = true;
        elements.input.disabled = true;
        currentChat.push({ sender: "user", text: msg });
        renderChat();
        elements.input.value = "";
        showTypingIndicator();

        try {
            const response = await fetch("/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify({ message: msg, session_id: currentSessionId })
            });
            if (!response.ok) throw new Error((await response.json()).detail || "Network response was not ok.");
            const data = await response.json();
            processBotResponse(data);
        } catch (error) {
            handleError(error);
        } finally {
            isProcessing = false;
            elements.input.disabled = false;
            elements.input.focus();
        }
    }
    
    function showTypingIndicator() {
        if (document.getElementById("typing")) return;
        const typingDiv = createMessageElement({ sender: 'bot', text: '<div class="typing-indicator"><span></span><span></span><span></span></div>' });
        typingDiv.id = "typing";
        elements.chatBox.appendChild(typingDiv);
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
        console.error('Error:', error);
        const typingIndicator = document.getElementById("typing");
        if(typingIndicator) {
            typingIndicator.querySelector('.message-content').innerHTML = `❌ Error: ${error.message}`;
        } else {
            currentChat.push({ sender: "bot", text: `❌ Error: ${error.message}` });
            renderChat();
        }
    }

    async function startNewChat() {
        if (currentChat.length > 0 && currentSessionId) {
            const convoIndex = allConversations.findIndex(c => c.id === currentSessionId);
            if (convoIndex > -1) { // Update existing conversation in history
                allConversations[convoIndex].chat = [...currentChat];
            } else { // Add new conversation to history
                allConversations.push({ id: currentSessionId, title: "Summarizing...", chat: [...currentChat], timestamp: Date.now() });
            }
            updateSidebar(); // Show "Summarizing..." immediately
            
            try {
                const response = await fetch("/summarize-title", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id: currentSessionId })
                });
                if (!response.ok) throw new Error("Failed to summarize.");
                const data = await response.json();
                const finalIndex = allConversations.findIndex(c => c.id === currentSessionId);
                if(finalIndex > -1) allConversations[finalIndex].title = data.title;
            } catch (e) {
                console.error("Summarization failed:", e);
                const failedIndex = allConversations.findIndex(c => c.id === currentSessionId);
                if(failedIndex > -1) allConversations[failedIndex].title = "Chat History"; // Fallback title
            }
        }
        
        // Reset for the new chat
        currentSessionId = null;
        currentChat = [];
        saveToStorage();
        updateSidebar();
        renderChat();
        elements.input.focus();
    }
    
    function updateSidebar() {
        elements.convoList.innerHTML = "";
        [...allConversations].sort((a, b) => b.timestamp - a.timestamp).forEach(convo => {
            const li = document.createElement('div');
            li.className = "history-item";
            li.dataset.id = convo.id;
            li.innerHTML = `<i class="fas fa-comment"></i><span>${convo.title}</span><button class="delete-btn"><i class="fas fa-trash"></i></button>`;
            li.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-btn')) loadChat(convo.id);
            });
            li.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteConversation(convo.id);
            });
            elements.convoList.appendChild(li);
        });
    }

    function deleteConversation(convoId) {
        allConversations = allConversations.filter(c => c.id !== convoId);
        if (currentSessionId === convoId) startNewChat();
        else {
            saveToStorage();
            updateSidebar();
        }
    }

    async function loadChat(convoId) {
        const convoToLoad = allConversations.find(c => c.id === convoId);
        if (convoToLoad && currentSessionId !== convoId) {
            await startNewChat(); // Save current chat before switching
            currentSessionId = convoToLoad.id;
            currentChat = [...convoToLoad.chat];
            saveToStorage();
            renderChat();
            elements.sidebar.classList.remove('active');
            elements.input.focus();
        }
    }
    
    function scrollToBottom() {
        elements.chatBox.scrollTop = elements.chatBox.scrollHeight;
    }

    // Initialize the application
    initFromStorage();
    setupEventListeners();
});

// Optional: Auto-focus input on keyboard open
window.addEventListener('resize', () => {
    const activeElement = document.activeElement;
    if (window.innerHeight < 500 && activeElement.tagName === 'INPUT') {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});
