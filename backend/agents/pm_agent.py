import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from backend.state import AgentState

load_dotenv()

# Using the required model, temperature removed to prevent conflicts
llm = ChatGoogleGenerativeAI(
    model="gemini-3.6-flash" 
)

def pm_node(state: AgentState):
    messages = state.get("messages", [])
    
    system_prompt = (
        "You are the AI Project Manager for the Oxygen software development team. "
        "Your job is to talk to the user, gather their software requirements, "
        "and prepare to delegate the technical research to the AI Researcher. "
        "Keep your responses professional, corporate, and concise."
    )
    
    response = llm.invoke([
        {"role": "system", "content": system_prompt},
        *messages
    ])
    
    # --- THE FIX: Force Gemini's output into a clean string ---
    reply_text = response.content
    if isinstance(reply_text, list):
        reply_text = reply_text[0].get("text", str(reply_text))
    else:
        reply_text = str(reply_text)
    
    return {
        "messages": [{"role": "assistant", "content": reply_text}],
        "pm_status": "talking_to_user"
    }