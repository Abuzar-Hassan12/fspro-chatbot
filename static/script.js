// script.js
const input = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const welcomeScreen = document.getElementById("welcome");
const convoList = document.getElementById("conversation-list");
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const closeSidebar = document.getElementById("closeSidebar");

let currentSessionId = null;
let currentChat = [];
let allConversations = [];
let isProcessing = false;

// DOM Content Loaded ensures safe element access
document.addEventListener("DOMContentLoaded", () => {
    initFromStorage();
    setupEventListeners();
});

function setupEventListeners() {
    // Input handling
    input.addEventListener("keydown", handleInputKeydown);
    
    // UI interactions
    menuToggle.addEventListener("click", toggleSidebar);
    closeSidebar.addEventListener("click", closeSidebarHandler);
    
    // Chat actions
    document.querySelector(".send-btn").addEventListener("click", sendMessage);
    document.querySelector(".new-chat-btn").addEventListener("click", startNewChat);
}

function initFromStorage() {
    try {
        const savedChats = localStorage.getItem('fspro_chats');
        const activeChat = localStorage.getItem('fspro_active_chat');
        
        if (savedChats) {
            allConversations = JSON.parse(savedChats) || [];
        }
        
        if (activeChat) {
            const chatData = JSON.parse(activeChat);
            currentSessionId = chatData.sessionId;
            currentChat = chatData.chat || [];
        }
        
        updateSidebar();
        renderChat();
    } catch (error) {
        console.error("Error loading from localStorage:", error);
        showError("Failed to load chat history");
    }
}

function saveToStorage() {
    try {
        localStorage.setItem('fspro_chats', JSON.stringify(allConversations));
        
        if (currentSessionId) {
            localStorage.setItem('fspro_active_chat', JSON.stringify({
                sessionId: currentSessionId,
                chat: currentChat
            }));
        }
    } catch (error) {
        console.error("Error saving to localStorage:", error);
    }
}

function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function createMessageElement(msg) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', msg.sender === 'user' ? 'user-message' : 'bot-message');
    
    // Sanitize and format message content
    const formattedText = formatMessageText(msg.text);
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <div class="avatar">${msg.sender === 'user' ? 'U' : 'FP'}</div>
            <div class="username">${msg.sender === 'user' ? 'You' : 'FSPro Assistant'}</div>
        </div>
        <div class="message-content">
            ${formattedText}
        </div>
        <div class="message-time">${getCurrentTime()}</div>
    `;
    
    return messageDiv;
}

function formatMessageText(text) {
    // Basic XSS protection
    const sanitizedText = text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Formatting conversions
    return sanitizedText
        .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2" class="msg-image">')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/\n/g, '<br>');
}

function renderChat() {
    try {
        welcomeScreen.style.display = currentChat.length ? "none" : "flex";
        
        // Clear chat except the welcome message
        const children = Array.from(chatBox.children);
        for (let i = 1; i < children.length; i++) {
            chatBox.removeChild(children[i]);
        }
        
        // Add all messages
        currentChat.forEach(msg => {
            chatBox.appendChild(createMessageElement(msg));
        });
        
        scrollToBottom();
    } catch (error) {
        console.error("Error rendering chat:", error);
    }
}

function handleInputKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey && !isProcessing) {
        e.preventDefault();
        sendMessage();
    }
}

function sendMessage() {
    if (isProcessing) return;
    
    const msg = input.value.trim();
    if (!msg) return;
    
    try {
        // Add user message
        currentChat.push({ 
            sender: "user", 
            text: msg,
            session_id: currentSessionId
        });
        
        saveToStorage();
        renderChat();
        input.value = "";
        isProcessing = true;
        input.disabled = true;
        
        showTypingIndicator();
        
        // Send to backend
        fetch("/chat", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ 
                message: msg,
                session_id: currentSessionId
            })
        })
        .then(handleResponse)
        .catch(handleError)
        .finally(() => {
            isProcessing = false;
            input.disabled = false;
            input.focus();
        });
    } catch (error) {
        console.error("Error sending message:", error);
        handleError(error);
        isProcessing = false;
        input.disabled = false;
    }
}

function showTypingIndicator() {
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
}

function handleResponse(response) {
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

function processBotResponse(data) {
    document.getElementById("typing")?.remove();
    
    currentSessionId = data.session_id || Date.now().toString();
    
    // Add bot response
    currentChat.push({ 
        sender: "bot", 
        text: data.response,
        session_id: currentSessionId
    });
    
    saveToStorage();
    renderChat();
}

function handleError(error) {
    console.error('Error:', error);
    document.getElementById("typing")?.remove();
    
    currentChat.push({ 
        sender: "bot", 
        text: "❌ Error processing response. Please try again later.",
        session_id: currentSessionId
    });
    
    saveToStorage();
    renderChat();
}

function startNewChat() {
    try {
        if (currentChat.length) {
            allConversations.push({
                id: currentSessionId,
                title: getConversationTitle(),
                chat: [...currentChat],
                timestamp: Date.now()
            });
            saveToStorage();
            updateSidebar();
        }
        
        // Reset current chat
        currentSessionId = null;
        currentChat = [];
        localStorage.removeItem('fspro_active_chat');
        
        renderChat();
        input.value = "";
        input.focus();
    } catch (error) {
        console.error("Error starting new chat:", error);
        showError("Failed to start new chat");
    }
}

function getConversationTitle() {
    if (!currentChat.length) return "New Chat";
    
    // Find the first substantial user message
    const userMessage = currentChat.find(msg => 
        msg.sender === "user" && 
        msg.text.trim().split(/\s+/).length > 3
    );
    
    const firstUserMsg = userMessage?.text || currentChat[0]?.text || "";
    const cleanText = firstUserMsg.replace(/<[^>]*>/g, '').trim();
    
    return cleanText.length > 25 
        ? cleanText.substring(0, 25) + '...' 
        : cleanText || "New Chat";
}

function updateSidebar() {
    try {
        convoList.innerHTML = "";
        
        // Sort conversations by timestamp (newest first)
        const sortedConversations = [...allConversations].sort((a, b) => b.timestamp - a.timestamp);
        
        sortedConversations.forEach((convo, index) => {
            const li = document.createElement('div');
            li.className = "history-item";
            li.dataset.id = convo.id;
            li.innerHTML = `
                <i class="fas fa-comment"></i> ${convo.title}
                <button class="delete-btn"><i class="fas fa-trash"></i></button>
            `;
            
            li.addEventListener('click', () => loadChat(index));
            
            const delBtn = li.querySelector('.delete-btn');
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteConversation(index);
            });
            
            convoList.appendChild(li);
        });
    } catch (error) {
        console.error("Error updating sidebar:", error);
    }
}

function deleteConversation(index) {
    try {
        const convo = allConversations[index];
        
        // Remove from storage
        allConversations.splice(index, 1);
        saveToStorage();
        updateSidebar();
        
        // If it was the active chat, start a new one
        if (currentSessionId === convo.id) {
            startNewChat();
        }
    } catch (error) {
        console.error("Error deleting conversation:", error);
        showError("Failed to delete conversation");
    }
}

function loadChat(index) {
    try {
        const convo = allConversations[index];
        currentSessionId = convo.id;
        currentChat = [...convo.chat];
        saveToStorage();
        renderChat();
        closeSidebarHandler();
        input.focus();
    } catch (error) {
        console.error("Error loading chat:", error);
        showError("Failed to load conversation");
    }
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

function toggleSidebar() {
    sidebar.classList.toggle('active');
}

function closeSidebarHandler() {
    sidebar.classList.remove('active');
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = "message bot-message error-message";
    errorDiv.innerHTML = `
        <div class="message-content">
            <i class="fas fa-exclamation-circle"></i> ${message}
        </div>
    `;
    chatBox.appendChild(errorDiv);
    scrollToBottom();
}
