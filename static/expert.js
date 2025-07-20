// expert.js
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const botType = urlParams.get('bot') || 'technical';
    const chatBox = document.getElementById('chat-box');
    const quickQuestions = document.getElementById('quickQuestions');
    const expertTitle = document.getElementById('expertTitle');
    const assistantTitle = document.getElementById('assistantTitle');
    
    // Set titles
    const titles = {
        elearning: 'E-Learning Assistant',
        shopping: 'Shopping Assistant',
        technical: 'Technical Assistant'
    };
    
    expertTitle.textContent = titles[botType];
    assistantTitle.textContent = titles[botType];
    
    // Add bot class to body for styling
    document.body.classList.add(botType);
    
    // Load bot configuration
    const botConfig = bots[botType];
    
    // Add welcome message
    const welcomeMsg = document.createElement('div');
    welcomeMsg.className = 'message bot-message';
    welcomeMsg.innerHTML = `
        <div class="message-header">
            <div class="avatar">FP</div>
            <div class="username">${titles[botType]}</div>
        </div>
        <div class="message-content">
            ${botConfig.welcome}
        </div>
        <div class="message-time">${getCurrentTime()}</div>
    `;
    chatBox.appendChild(welcomeMsg);
    
    // Add quick questions
    botConfig.questions.forEach(q => {
        const btn = document.createElement('button');
        btn.className = 'quick-question';
        btn.textContent = q;
        btn.onclick = () => askQuestion(q, botType);
        quickQuestions.appendChild(btn);
    });
});

function askQuestion(question, botType) {
    const chatBox = document.getElementById('chat-box');
    
    // Add user question
    const userMsg = document.createElement('div');
    userMsg.className = 'message user-message';
    userMsg.innerHTML = `
        <div class="message-header">
            <div class="avatar">U</div>
            <div class="username">You</div>
        </div>
        <div class="message-content">
            <p>${question}</p>
        </div>
        <div class="message-time">${getCurrentTime()}</div>
    `;
    chatBox.appendChild(userMsg);
    
    // Add bot response
    const botResponse = bots[botType].responses[question] || "I'm sorry, I don't have information about that.";
    
    const botMsg = document.createElement('div');
    botMsg.className = 'message bot-message';
    botMsg.innerHTML = `
        <div class="message-header">
            <div class="avatar">FP</div>
            <div class="username">${bots[botType].name}</div>
        </div>
        <div class="message-content">
            ${botResponse}
        </div>
        <div class="message-time">${getCurrentTime()}</div>
    `;
    
    // Add slight delay for natural interaction
    setTimeout(() => {
        chatBox.appendChild(botMsg);
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 500);
}

function goBack() {
    window.location.href = 'index.html';
}

function getCurrentTime() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + 
           now.getMinutes().toString().padStart(2, '0');
}

// Bot configurations
const bots = {
    elearning: {
        name: "E-Learning Assistant",
        welcome: `
            <p>Welcome to the E-Learning Assistant! I'm here to help you with:</p>
            <ul>
                <li>Course recommendations</li>
                <li>Learning paths</li>
                <li>Study resources</li>
                <li>Certification guidance</li>
            </ul>
            <p>Ask me anything about online learning!</p>
        `,
        questions: [
            "Recommend programming courses",
            "Best free courses?",
            "How to get certified?",
            "Learning paths for AI"
        ],
        responses: {
            "Recommend programming courses": `
                <p>Here are top programming courses:</p>
                <ul>
                    <li><strong>Python for Everybody</strong> (Coursera) - Free</li>
                    <li><strong>Full Stack Web Development</strong> (Udemy) - $129.99</li>
                    <li><strong>JavaScript Algorithms</strong> (freeCodeCamp) - Free</li>
                    <li><strong>Data Structures</strong> (edX) - Free with certificate $99</li>
                </ul>
                <p>View all courses: <a href="#">coursera.org/programming</a></p>
            `,
            "Best free courses?": `
                <p>Top free courses across categories:</p>
                <ul>
                    <li><strong>Introduction to AI</strong> (Stanford Online)</li>
                    <li><strong>Machine Learning Fundamentals</strong> (Google)</li>
                    <li><strong>Web Development Bootcamp</strong> (freeCodeCamp)</li>
                    <li><strong>Business Foundations</strong> (Coursera)</li>
                </ul>
                <p>All free courses: <a href="#">edx.org/free-courses</a></p>
            `,
            "How to get certified?": `
                <p>To get certified:</p>
                <ol>
                    <li>Choose your specialization (IT, Business, Design, etc.)</li>
                    <li>Complete required courses (usually 4-6 months)</li>
                    <li>Pass the certification exam</li>
                    <li>Build portfolio projects</li>
                </ol>
                <p>Popular certifications: AWS Certified, Google IT Support, PMP</p>
            `,
            "Learning paths for AI": `
                <p>AI Learning Path:</p>
                <ol>
                    <li>Mathematics fundamentals (Linear Algebra, Calculus)</li>
                    <li>Python programming</li>
                    <li>Machine Learning basics</li>
                    <li>Deep Learning (TensorFlow/PyTorch)</li>
                    <li>Natural Language Processing</li>
                    <li>Computer Vision</li>
                </ol>
                <p>Recommended path: <a href="#">ai-learning-path.com</a></p>
            `
        }
    },
    shopping: {
        name: "Shopping Assistant",
        welcome: `
            <p>Hello! I'm your Shopping Assistant. I can help you with:</p>
            <ul>
                <li>Product recommendations</li>
                <li>Price comparisons</li>
                <li>Deals and discounts</li>
                <li>Order tracking</li>
            </ul>
            <p>What would you like help with today?</p>
        `,
        questions: [
            "Best laptops under $1000",
            "Today's deals",
            "Track my order",
            "Return policy"
        ],
        responses: {
            "Best laptops under $1000": `
                <p>Top laptops under $1000:</p>
                <ul>
                    <li><strong>Dell XPS 13</strong> - $999 (Intel i7, 16GB RAM)</li>
                    <li><strong>MacBook Air M1</strong> - $949 (Apple M1, 8GB RAM)</li>
                    <li><strong>HP Envy 13</strong> - $899 (Intel i5, 12GB RAM)</li>
                    <li><strong>Asus ZenBook 14</strong> - $849 (Ryzen 7, 16GB RAM)</li>
                </ul>
                <p><a href="#">View all laptop deals</a></p>
            `,
            "Today's deals": `
                <p>Today's top deals:</p>
                <ul>
                    <li>📱 <strong>Smartphones:</strong> Up to 40% off flagship models</li>
                    <li>👕 <strong>Fashion:</strong> Buy 1 get 1 50% off all apparel</li>
                    <li>🏠 <strong>Home:</strong> 30% off furniture and decor</li>
                    <li>💻 <strong>Electronics:</strong> Extra 10% off with code TECH10</li>
                </ul>
                <p>Flash sale ending in 3 hours! <a href="#">Shop now</a></p>
            `,
            "Track my order": `
                <p>To track your order:</p>
                <ol>
                    <li>Go to <a href="#">My Orders</a></li>
                    <li>Find your order number (ex: ORD-12345)</li>
                    <li>Click "Track Package"</li>
                </ol>
                <p>Or enter your order number here for instant tracking:</p>
                <input type="text" placeholder="Order number" class="track-input">
                <button class="track-btn">Track</button>
            `,
            "Return policy": `
                <p>Our return policy:</p>
                <ul>
                    <li>✅ 30-day money-back guarantee</li>
                    <li>✅ Free returns for most items</li>
                    <li>✅ Refund processed within 3 business days</li>
                    <li>❌ Electronics must be unopened</li>
                </ul>
                <p>Start return: <a href="#">Return Center</a></p>
            `
        }
    },
    technical: {
        name: "Technical Assistant",
        welcome: `
            <p>Hello! I'm your Technical Assistant. I can help with:</p>
            <ul>
                <li>Code debugging</li>
                <li>Architecture design</li>
                <li>Performance optimization</li>
                <li>Technology recommendations</li>
            </ul>
            <p>What technical challenge can I help you solve today?</p>
        `,
        questions: [
            "Fix Python error",
            "Database design tips",
            "Optimize React app",
            "Deployment best practices"
        ],
        responses: {
            "Fix Python error": `
                <p>To fix Python errors:</p>
                <ol>
                    <li>Read the full error message carefully</li>
                    <li>Check line numbers mentioned</li>
                    <li>Search error message online</li>
                    <li>Use try/except blocks</li>
                    <li>Validate inputs</li>
                </ol>
                <p>Common errors:</p>
                <div class="code-block">
                    <div class="code-header">
                        <span>Python Errors</span>
                    </div>
                    <pre># NameError - undefined variable
print(undefined_var)

# Solution:
undefined_var = "some value"
print(undefined_var)</pre>
                </div>
            `,
            "Database design tips": `
                <p>Database design best practices:</p>
                <ul>
                    <li>Normalize data (3NF minimum)</li>
                    <li>Use appropriate data types</li>
                    <li>Establish proper indexes</li>
                    <li>Implement foreign key constraints</li>
                    <li>Consider read vs write patterns</li>
                </ul>
                <p>Example schema:</p>
                <div class="code-block">
                    <div class="code-header">
                        <span>SQL Schema</span>
                    </div>
                    <pre>CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);</pre>
                </div>
            `,
            "Optimize React app": `
                <p>React optimization techniques:</p>
                <ol>
                    <li>Use React.memo for components</li>
                    <li>Implement code splitting</li>
                    <li>Virtualize long lists</li>
                    <li>Memoize expensive calculations</li>
                    <li>Avoid unnecessary re-renders</li>
                </ol>
                <p>Performance example:</p>
                <div class="code-block">
                    <div class="code-header">
                        <span>React.memo</span>
                    </div>
                    <pre>const ExpensiveComponent = React.memo(({ data }) => {
    // Component logic
    return &lt;div&gt;{data}&lt;/div&gt;;
});

// Only re-renders when props change
export default ExpensiveComponent;</pre>
                </div>
            `,
            "Deployment best practices": `
                <p>Deployment best practices:</p>
                <ul>
                    <li>Use CI/CD pipelines</li>
                    <li>Implement blue-green deployments</li>
                    <li>Monitor performance and errors</li>
                    <li>Automate rollback procedures</li>
                    <li>Secure sensitive data</li>
                </ul>
                <p>Sample CI config:</p>
                <div class="code-block">
                    <div class="code-header">
                        <span>.github/workflows/deploy.yml</span>
                    </div>
                    <pre>name: Deploy
on:
  push:
    branches: [ main ]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
      - run: npm ci
      - run: npm build
      - name: Deploy to AWS
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id=${{ secretsAWS_ACCESS_KEY_ID }}
          aws-secret-access-key=${{ secretsAWS_SECRET_ACCESS_KEY }}
          aws-region=us-east-1
      - run: aws s3 sync build/ s3://my-bucket</pre>
                </div>
            `
        }
    }
};