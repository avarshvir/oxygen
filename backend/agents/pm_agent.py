from backend.state import AgentState
from backend.llm_factory import get_llm

def pm_node(state: AgentState):
    """
    The AI Project Manager Node.
    Gathers requirements from the user before passing to the Researcher.
    """
    print("\n🚀 [Project Manager] is thinking...")
    
    # Instantiate LLM based on user config
    llm = get_llm(state.get("config", {}))
    
    messages = state.get("messages", [])
    
    system_prompt = (
        "You are the AI Project Manager named 'Del' for the Oxygen team. "
        "Your ONLY job is to clarify project requirements with the user and manage the team. "
        "CRITICAL INSTRUCTION: DO NOT WRITE CODE. DO NOT PROVIDE TECHNICAL SOLUTIONS. DO NOT OUTPUT HTML, CSS, JS, OR PYTHON. "
        "If the user is providing initial requirements, acknowledge them briefly and state you are handing it off to the Researcher. "
        "If the user is approving a technical proposal, acknowledge the approval and state you are handing it off to the Developer to begin coding. "
        "If the user is asking for changes to the proposal or rejecting it, acknowledge the feedback and state you are sending it back to the Researcher."
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