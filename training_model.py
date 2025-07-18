# training_model.py
# filepath: c:\Users\DELL\Desktop\chatbot\training_model.py
from langchain_ollama import ChatOllama
# ...existing code...
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
import re

# 1. Model setup with streaming and better parameters
llm = ChatOllama(
    model="llama3",
    temperature=0.7,
    num_ctx=4096,
    num_gpu_layers=40,  # Use more GPU layers if available
    system="""You are FSPro Assistant, an expert AI developer assistant. 
    Respond concisely, provide code examples when relevant, and maintain 
    conversation context. Be practical and solution-oriented."""
)

# 2. Enhanced prompt template
prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert AI developer assistant. Maintain context from previous messages. 
     Provide clear, concise answers with code examples when relevant. Structure responses for readability.
     Current conversation:
     {history}
     ---
     Now respond to:"""),
    ("human", "{input}")
])

# 3. Chain with history management
def format_history(history):
    return "\n".join(
        f"{msg['role'].capitalize()}: {msg['content']}" 
        for msg in history
    )

chain = (
    {
        "input": RunnablePassthrough(),
        "history": RunnablePassthrough()
    }
    | prompt
    | llm
    | StrOutputParser()
)

# 4. Enhanced response processing
def postprocess_response(response):
    # Format code blocks
    response = re.sub(
        r"```(\w+)?\s*(.*?)```", 
        r'<div class="code-block"><div class="code-header">\1</div><pre>\2</pre></div>', 
        response, 
        flags=re.DOTALL
    )
    
    # Format lists
    response = re.sub(r"^\s*-\s*(.+)$", r"<li>\1</li>", response, flags=re.MULTILINE)
    response = response.replace("<li>", "<ul><li>").replace("</li>", "</li></ul>")
    
    return response

# 5. Interface for FastAPI
def get_bot_response(user_input: str, session_id: str, history: list) -> str:
    formatted_history = format_history(history[-6:])  # Last 3 exchanges
    
    response = chain.invoke({
        "input": user_input,
        "history": formatted_history
    })
    
    return postprocess_response(response)