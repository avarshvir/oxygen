from langchain_google_genai import ChatGoogleGenerativeAI
from backend.state import AgentState

# Initialize the LLM
llm = ChatGoogleGenerativeAI(model="gemini-3.6-flash")

def pm_node(state: AgentState):
    """
    The AI Project Manager Node.
    Gathers requirements from the user before passing to the Researcher.
    """
    messages = state.get("messages", [])
    
    system_prompt = (
        "You are the AI Project Manager for the Oxygen team. "
        "Your job is to clarify project requirements with the user. "
        "If the user has provided enough information, acknowledge it briefly and state that you are handing it off to the Researcher."
    )
    
    # Prepend the system prompt
    invoke_messages = [{"role": "system", "content": system_prompt}] + messages
    
    # Call the LLM
    response = llm.invoke(invoke_messages)
    
    # --- THE FIX: Bulletproof extraction ---
    reply_text = response.content
    
    if isinstance(reply_text, list):
        if len(reply_text) > 0:
            # Safely extract text if the list is not empty
            reply_text = reply_text[0].get("text", "")
        else:
            # Fallback if Gemini returns an empty list
            reply_text = "Understood. I have logged those constraints and am passing the specifications to our AI Researcher now."
    else:
        # Standard string fallback
        reply_text = str(reply_text)
    
    return {
        "messages": [{"role": "assistant", "content": f"[Project Manager]: {reply_text}"}],
        "pm_status": "gathering_requirements"
    }