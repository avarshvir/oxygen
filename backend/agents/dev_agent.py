from langchain_google_genai import ChatGoogleGenerativeAI
from backend.state import AgentState

# Using the stable model
llm = ChatGoogleGenerativeAI(
    model="gemini-3.6-flash" 
)

def dev_node(state: AgentState):
    """
    The AI Developer Node.
    Reads the Researcher's technical proposal and writes the actual code.
    """
    messages = state.get("messages", [])
    
    system_prompt = (
        "You are the AI Senior Software Developer for the Oxygen team. "
        "Review the technical proposal provided by the AI Researcher. "
        "Write the core, foundational code required to start the project based exactly on their tech stack. "
        "Provide clean, well-commented code blocks. Address your response to the Tester."
    )
    
    # We use the same foolproof dictionary structure!
    invoke_messages = [
        {"role": "system", "content": system_prompt},
        *messages,
        {"role": "user", "content": "Developer, please write the foundational code based on the approved proposal."}
    ]
    
    # Call the LLM
    response = llm.invoke(invoke_messages)
    
    # Extract clean text
    reply_text = response.content
    if isinstance(reply_text, list):
        reply_text = reply_text[0].get("text", str(reply_text))
    else:
        reply_text = str(reply_text)
    
    return {
        "messages": [{"role": "assistant", "content": f"[Developer]: {reply_text}"}],
        "dev_status": "writing_code" # <-- This will trigger the typing animation later!
    }