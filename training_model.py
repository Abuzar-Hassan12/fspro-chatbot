# training_model.py
import re
import logging
import html
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

YOUR_GOOGLE_API_KEY = "AIzaSyBJuaCibNPf8bOuPMbdfYVeH37kcCEyKoM"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- AI Language Model Initialization ---
llm = None
try:
    if not YOUR_GOOGLE_API_KEY or len(YOUR_GOOGLE_API_KEY) < 10:
        raise ValueError("The provided Google API key is invalid or missing.")
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=YOUR_GOOGLE_API_KEY, temperature=0.7)
    logger.info("✅ Gemini model initialized successfully.")
except Exception as e:
    logger.error(f"🔴 CRITICAL: Error initializing Gemini model: {e}")
    raise RuntimeError(f"Fatal: Gemini model could not be initialized. Error: {e}")

# --- ENHANCED PROMPT FOR PROFESSIONAL RESPONSES ---
professional_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are FSPro Assistant, an elite AI developer assistant. Your purpose is to provide clear, accurate, and professional support.

    **Your Response Formatting Rules:**
    - **Structure:** Use headings, lists, and clear paragraphs to structure your responses.
    - **Markdown:** You MUST use Markdown for formatting.
      - Use `**text**` for **bolding** important keywords.
      - Use `*text*` for *italicizing* for emphasis.
      - Use triple backticks for code blocks (e.g., ```python\nprint('Hello')\n```).
      - Use hyphens (`-`) or asterisks (`*`) for bulleted lists.
    - **Tone:** Maintain a helpful, expert, and solution-oriented tone.
    - **Context:** Refer to the 'Current conversation' to maintain context.

    Current conversation:
    {history}
    ---
    Now, respond to the user's query professionally."""),
    ("human", "{input}")
])

# --- CHAIN for generating chat responses ---
chat_chain = (
    RunnablePassthrough.assign(history=lambda x: "\n".join(f"{msg.get('role', 'user').capitalize()}: {msg.get('content', '')}" for msg in x.get('history', [])))
    | professional_prompt
    | llm
    | StrOutputParser()
)

# --- CHAIN for summarizing conversation titles ---
summarize_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a title summarization expert. Based on the following conversation, create a concise, intelligent, and descriptive title that is no more than 5-6 words long."),
    ("user", "{history}")
])
summarize_chain = summarize_prompt | llm | StrOutputParser()


# --- PROFESSIONAL RESPONSE FORMATTING ENGINE ---
def postprocess_response(text: str) -> str:
    # 1. Isolate and format code blocks to protect their content
    code_blocks = []
    def replace_code_block(match):
        lang = match.group(1) or ""
        code = html.escape(match.group(2))
        formatted_block = f'<div class="code-block"><div class="code-header">{lang}</div><pre><code>{code}</code></pre></div>'
        code_blocks.append(formatted_block)
        return f"__CODE_BLOCK_{len(code_blocks)-1}__"
    
    processed_text = re.sub(r"```(\w*)\n?(.*?)```", replace_code_block, text, flags=re.DOTALL)

    # 2. Process the remaining text (with placeholders)
    lines = processed_text.split('\n')
    html_output = []
    in_list = False

    for line in lines:
        if not line.strip(): continue # Skip empty lines

        # Bold and Italic
        line = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', line)
        line = re.sub(r'\*(.*?)\*', r'<em>\1</em>', line)

        # Lists
        if line.strip().startswith(("- ", "* ")):
            item_content = line.strip()[2:]
            if not in_list:
                html_output.append("<ul>")
                in_list = True
            html_output.append(f"<li>{item_content}</li>")
        else:
            if in_list:
                html_output.append("</ul>")
                in_list = False
            html_output.append(line)

    if in_list: html_output.append("</ul>")

    final_html = "<br>".join(html_output).replace("<ul><br>", "<ul>").replace("<br></ul>", "</ul>")

    # 3. Re-insert the formatted code blocks
    for i, block in enumerate(code_blocks):
        final_html = final_html.replace(f"__CODE_BLOCK_{i}__<br>", block).replace(f"__CODE_BLOCK_{i}__", block)
        
    return final_html

# --- Main Functions called by FastAPI ---
def get_bot_response(user_input: str, history: list) -> str:
    try:
        logger.info(f"✅ Processing request: '{user_input}'")
        response = chat_chain.invoke({"input": user_input, "history": history})
        return postprocess_response(response)
    except Exception as e:
        logger.error(f"🔴 Error in get_bot_response: {e}")
        return "❌ An error occurred while processing your request."

def get_summary_title(history: list) -> str:
    try:
        logger.info("✅ Generating summary title...")
        history_str = "\n".join(f"{msg.get('role', 'user').capitalize()}: {msg.get('content', '')}" for msg in history)
        if not history_str: return "New Chat"
        title = summarize_chain.invoke({"history": history_str})
        return title.strip().replace('"', '')
    except Exception as e:
        logger.error(f"🔴 Error in get_summary_title: {e}")
        # Fallback to a simple title
        return history[0].get('content', 'Chat')[:30] if history else "New Chat"