import os
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from typing import List, Dict, Optional

# Store conversations by their unique ID
conversations: Dict[str, List[Dict[str, str]]] = {}

# Create & configure Groq client
api_key = os.getenv('grok_api')
if not api_key:
    print("Warning: GROQ_API_KEY is not set. Some functionality may be limited.")
    client = None
else:
    client = Groq(api_key=api_key)

# Request model for chat input
class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

# Response model for chat output
class ChatResponse(BaseModel):
    conversation_id: str
    messages: List[Dict[str, str]]
    response: str

# Create FastAPI app
app = FastAPI(
    title="FitBot Conversation API",
    description="AI Fitness Companion Chatbot with Conversation Management"
)

# Add CORS middleware to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    """
    Root endpoint to confirm the API is running
    """
    return {
        "message": "Welcome to FitBot AI Fitness Companion",
        "endpoints": [
            "/chat - Main interaction endpoint",
            "/end-conversation - Close a specific conversation"
        ]
    }

@app.post("/chat", response_model=ChatResponse)
def fitness_chat(request: ChatRequest):
    """
    Handles fitness chat interactions with conversation management
    """
    # Check if Groq client is configured
    if client is None:
        return ChatResponse(
            conversation_id="error",
            messages=[],
            response="API key not configured. Cannot process request."
        )
    
    # Determine or create conversation ID
    conversation_id = request.conversation_id or str(uuid.uuid4())
    
    # Initialize conversation if not exists
    if conversation_id not in conversations:
        system_prompt = (
            "You are a helpful AI fitness coach named FitBot specialized in creating and adapting "
            "training routines for users like Alex (30-year-old web developer). You offer short, "
            "motivational advice on workout plans, progress tracking, constraints (like mild shoulder pain), "
            "and basic diet suggestions. You speak in a friendly, encouraging tone."
        )
        conversations[conversation_id] = [{"role": "system", "content": system_prompt}]

    # Add the user message
    conversations[conversation_id].append({"role": "user", "content": request.message})

    # Handle special diet suggestion case
    if "diet suggestion" in request.message.lower():
        diet_response = (
            "Here's a basic healthy eating tip: focus on protein-rich foods (lean meats, beans), "
            "colorful vegetables, and whole grains. Stay hydrated. For personalized advice, "
            "consider consulting a nutritionist."
        )
        conversations[conversation_id].append({"role": "assistant", "content": diet_response})
        
        return ChatResponse(
            conversation_id=conversation_id,
            messages=[msg for msg in conversations[conversation_id] if msg['role'] != 'system'],
            response=diet_response
        )

    # Call the Groq LLM for normal chat
    try:
        completion = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=conversations[conversation_id],
            temperature=0.7,
            max_tokens=600,
            top_p=1,
            stream=False,
            stop=None,
        )
        response_content = completion.choices[0].message.content

        # Append AI response
        conversations[conversation_id].append({"role": "assistant", "content": response_content})

        return ChatResponse(
            conversation_id=conversation_id,
            messages=[msg for msg in conversations[conversation_id] if msg['role'] != 'system'],
            response=response_content
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/end-conversation")
def end_conversation(conversation_id: str):
    """
    Ends a specific conversation by removing it from conversations
    """
    if conversation_id in conversations:
        del conversations[conversation_id]
        return {"message": f"Conversation {conversation_id} has ended"}
    else:
        raise HTTPException(status_code=404, detail="Conversation not found")

# Optional: Main block for running with uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)