from langchain_google_genai import ChatGoogleGenerativeAI
from backend.state import AgentState

# Using our stable model
llm = ChatGoogleGenerativeAI(
    model="gemini-3.6-flash" 
)

def tester_node(state: AgentState):
    """
    The AI Tester Node.
    Reads the Developer's code and performs a QA review for bugs and edge cases.
    """
    messages = state.get("messages", [])
    
    system_prompt = (
        "You are the AI Quality Assurance (QA) Tester for the Oxygen team. "
        "Review the source code provided by the Senior Developer. "
        "Your job is to identify potential bugs, unhandled edge cases, or optimizations. "
        "Output a formal QA Testing Report. If the code passes, state that it is approved for documentation. "
        "Address your response to the Technical Writer."
    )
    
    # Using our foolproof dictionary structure
    invoke_messages = [
        {"role": "system", "content": system_prompt},
        *messages,
        {"role": "user", "content": "QA Tester, please review the developer's codebase and provide a formal QA report."}
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
        "messages": [{"role": "assistant", "content": f"[Tester]: {reply_text}"}],
        "tester_status": "testing_code" # <-- We will animate a QA character with this later!
    }