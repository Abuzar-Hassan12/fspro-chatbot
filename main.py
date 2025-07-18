# main.py
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from training_model import get_bot_response
import uuid
import time

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Session storage
sessions = {}

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    user_input = data.get("message", "").strip()
    session_id = data.get("session_id", "")
    
    if not session_id or session_id not in sessions:
        session_id = str(uuid.uuid4())
        sessions[session_id] = {
            "history": [],
            "created_at": time.time(),
            "last_active": time.time()
        }
    
    if not user_input:
        raise HTTPException(status_code=400, detail="Empty message")
    
    # Get bot response with conversation history
    bot_reply = get_bot_response(
        user_input, 
        session_id,
        sessions[session_id]["history"]
    )
    
    # Update session history
    sessions[session_id]["history"].extend([
        {"role": "user", "content": user_input},
        {"role": "assistant", "content": bot_reply}
    ])
    sessions[session_id]["last_active"] = time.time()
    
    # Clean up old sessions (1 hour inactivity)
    cleanup_sessions()
    
    return JSONResponse({
        "response": bot_reply,
        "session_id": session_id
    })

def cleanup_sessions(max_age=3600):
    current_time = time.time()
    expired = [sid for sid, session in sessions.items() 
               if current_time - session["last_active"] > max_age]
    for sid in expired:
        del sessions[sid]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)