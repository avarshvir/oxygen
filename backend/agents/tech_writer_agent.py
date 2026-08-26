from langchain_google_genai import ChatGoogleGenerativeAI
from backend.state import AgentState

# Using our stable model
llm = ChatGoogleGenerativeAI(
    model="gemini-3.6-flash" 
)

def tech_writer_node(state: AgentState):
    """
    The AI Technical Writer Node.
    Reads the approved codebase and QA report, then writes the final documentation.
    """
    messages = state.get("messages", [])
    
    system_prompt = (
        "You are the AI Technical Writer for the Oxygen team. "
        "Review the Developer's code and the QA Tester's approval report. "
        "Your final task is to write a beautiful, comprehensive README.md file "
        "that explains exactly how to install, configure, and run the user's project. "
        "Format it using proper Markdown (headers, code blocks, bullet points). "
        "Address your response to the User to conclude the project."
    )
    
    # Standard dictionary invoke
    invoke_messages = [
        {"role": "system", "content": system_prompt},
        *messages,
        {"role": "user", "content": "Technical Writer, please generate the final README.md documentation for the user."}
    ]
    
    response = llm.invoke(invoke_messages)
    
    reply_text = response.content
    if isinstance(reply_text, list):
        reply_text = reply_text[0].get("text", str(reply_text))
    else:
        reply_text = str(reply_text)
    
    return {
        "messages": [{"role": "assistant", "content": f"[TechWriter]: {reply_text}"}],
        "writer_status": "writing_docs" # <-- We will animate the final character with this!
    }