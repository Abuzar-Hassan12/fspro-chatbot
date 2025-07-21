# main.py
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from training_model import get_bot_response, get_summary_title
import uuid
import time
import logging

app = FastAPI()

# Middleware
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# In-memory session storage
sessions = {}

# --- FastAPI Endpoints ---
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/chat")
async def chat(request: Request):
    try:
        data = await request.json()
        user_input = data.get("message", "").strip()
        session_id = data.get("session_id")

        if not session_id or session_id not in sessions:
            session_id = str(uuid.uuid4())
            sessions[session_id] = {"history": [], "created_at": time.time()}
        
        sessions[session_id]["last_active"] = time.time()

        if not user_input: raise HTTPException(status_code=400, detail="Message cannot be empty.")
        
        bot_reply = get_bot_response(user_input, sessions[session_id]["history"])
        
        sessions[session_id]["history"].extend([
            {"role": "user", "content": user_input},
            {"role": "assistant", "content": bot_reply}
        ])
        
        return JSONResponse({"response": bot_reply, "session_id": session_id})
    except Exception as e:
        logging.error(f"Error in /chat: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# --- NEW ENDPOINT FOR INTELLIGENT NAMING ---
@app.post("/summarize-title")
async def summarize_title(request: Request):
    try:
        data = await request.json()
        session_id = data.get("session_id")
        if not session_id or session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found.")
        
        history = sessions[session_id].get("history", [])
        if not history:
            return JSONResponse({"title": "New Chat"})
            
        title = get_summary_title(history)
        return JSONResponse({"title": title})
    except Exception as e:
        logging.error(f"Error in /summarize-title: {e}")
        raise HTTPException(status_code=500, detail="Could not generate title.")

# --- Server Startup ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)