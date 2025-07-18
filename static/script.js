// script.js
const input = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const welcomeScreen = document.getElementById("welcome");
const convoList = document.getElementById("conversation-list");

let currentSessionId = null;
let currentChat = [];
let allConversations = [];

function getCurrentTime() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + 
           now.getMinutes().toString().padStart(2, '0');
}

function createMessageElement(msg) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(msg.sender === 'user' ? 'user-message' : 'bot-message');
    
    const time = getCurrentTime();
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <div class="avatar">${msg.sender === 'user' ? 'U' : 'FP'}</div>
            <div class="username">${msg.sender === 'user' ? 'You' : 'FSPro Assistant'}</div>
        </div>
        <div class="message-content">
            ${msg.text}
        </div>
        <div class="message-time">${time}</div>
    `;
    
    return messageDiv;
}

function renderChat() {
    if (currentChat.length > 0) {
        welcomeScreen.style.display = "none";
    } else {
        welcomeScreen.style.display = "block";
        return;
    }
    
    while (chatBox.children.length > 1) {
        chatBox.removeChild(chatBox.lastChild);
    }
    
    currentChat.forEach(msg => {
        chatBox.appendChild(createMessageElement(msg));
    });
    
    scrollToBottom();
}

function sendMessage() {
    const msg = input.value.trim();
    if (!msg) return;
    
    currentChat.push({ 
        sender: "user", 
        text: `<p>${msg}</p>`,
        session_id: currentSessionId
    });
    renderChat();
    input.value = "";
    input.focus();
    
    // Show animated typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.id = "typing";
    typingDiv.className = "message bot-message";
    typingDiv.innerHTML = `
        <div class="message-header">
            <div class="avatar">FP</div>
            <div class="username">FSPro Assistant</div>
        </div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
        <div class="message-time">${getCurrentTime()}</div>
    `;
    chatBox.appendChild(typingDiv);
    scrollToBottom();

    // Send to backend
    fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            message: msg,
            session_id: currentSessionId
        })
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("typing")?.remove();
        currentSessionId = data.session_id;
        currentChat.push({ 
            sender: "bot", 
            text: data.response,
            session_id: currentSessionId
        });
        renderChat();
    })
    .catch(() => {
        document.getElementById("typing")?.remove();
        currentChat.push({ 
            sender: "bot", 
            text: `<p style="color: var(--error);">❌ Error processing response. Please try again.</p>`,
            session_id: currentSessionId
        });
        renderChat();
    });
}

function startNewChat() {
    if (currentChat.length) {
        allConversations.push({
            id: currentSessionId,
            title: getConversationTitle(),
            chat: [...currentChat],
            timestamp: Date.now()
        });
        updateSidebar();
    }
    
    currentSessionId = null;
    currentChat = [];
    renderChat();
    input.value = "";
}

function getConversationTitle() {
    if (currentChat.length < 2) return "New Chat";
    
    const firstUserMsg = currentChat.find(m => m.sender === "user")?.text || "";
    const cleanText = firstUserMsg.replace(/<[^>]*>/g, '');
    return cleanText.length > 25 ? cleanText.substring(0, 25) + '...' : cleanText;
}

function updateSidebar() {
    convoList.innerHTML = "";
    
    // Sort conversations by timestamp (newest first)
    allConversations.sort((a, b) => b.timestamp - a.timestamp);
    
    allConversations.forEach((convo, index) => {
        const li = document.createElement('div');
        li.className = "history-item";
        li.dataset.id = convo.id;
        li.innerHTML = `
            <i class="fas fa-comment"></i> ${convo.title}
            <span class="delete-btn">&times;</span>
        `;
        
        li.onclick = () => loadChat(index);
        
        const delBtn = li.querySelector('.delete-btn');
        delBtn.onclick = (e) => {
            e.stopPropagation();
            allConversations.splice(index, 1);
            updateSidebar();
            if (currentSessionId === convo.id) {
                startNewChat();
            }
        };
        
        convoList.appendChild(li);
    });
}

function loadChat(index) {
    const convo = allConversations[index];
    currentSessionId = convo.id;
    currentChat = [...convo.chat];
    renderChat();
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Initialize
updateSidebar();