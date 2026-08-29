from langchain_community.tools import DuckDuckGoSearchRun
from backend.state import AgentState
from backend.llm_factory import get_llm

# 1. Define the tool and expose it
search_tool = DuckDuckGoSearchRun()
tools = [search_tool]

def research_node(state: AgentState):
    """
    The AI Researcher Node (Equipped with Web Search).
    Analyzes the state and either executes a search or writes a proposal.
    """
    print("\n🚀 [AI Researcher] is thinking...")
    
    # Instantiate LLM based on user config and bind tools
    llm = get_llm(state.get("config", {}))
    llm_with_tools = llm.bind_tools(tools)
    
    messages = state.get("messages", [])
    
    # Safely get the role/type of the last message in the history
    last_msg = messages[-1] if messages else {}
    
    # CHECK: Is it a dictionary or a LangChain Message object?
    if isinstance(last_msg, dict):
        last_role = last_msg.get("type") or last_msg.get("role", "")
    else:
        last_role = getattr(last_msg, 'type', "")

    system_prompt = (
        "You are the AI Technical Researcher for the Oxygen team. "
        "You MUST use your search tool to look up the latest framework versions, "
        "API documentation, and best practices before proposing a tech stack. "
        "Once you have the search results, write a detailed Technical Proposal. "
        "Address your response to the Project Manager."
    )

    if last_role == "tool":
        # We are returning from DuckDuckGo.
        invoke_messages = [{"role": "system", "content": system_prompt}] + messages
    else:
        # We are coming from the PM. Hand the mic to the Researcher as a User.
        invoke_messages = [
            {"role": "system", "content": system_prompt},
            *messages,
            {"role": "user", "content": "Researcher, please use your search tool to evaluate the latest tech and draft the proposal."}
        ]

    # Call the LLM
    try:
        response = llm_with_tools.invoke(invoke_messages)
    except Exception as e:
        # If the local Ollama model doesn't support tools, fallback to a standard text response
        fallback_prompt = (
            "You are the AI Technical Researcher named 'Toky' for the Oxygen team. "
            "Write a detailed Technical Proposal for the given requirements based on your internal knowledge. "
            "Address your response to the Project Manager."
        )
        if last_role == "tool":
            invoke_messages = [{"role": "system", "content": fallback_prompt}] + messages
        else:
            invoke_messages = [
                {"role": "system", "content": fallback_prompt},
                *messages,
                {"role": "user", "content": "Researcher, please evaluate the latest tech and draft the proposal based on your internal knowledge."}
            ]
        response = llm.invoke(invoke_messages)
    
    # Check if the LLM decided to use a tool
    if getattr(response, "tool_calls", []):
        # We must return the exact AIMessage so LangGraph can execute the tool
        return {
            "messages": [response],
            "researcher_status": "researching_tech_stack" 
        }
    else:
        # It's a normal text response (the final proposal)
        reply_text = response.content
        if isinstance(reply_text, list):
            reply_text = reply_text[0].get("text", str(reply_text))
        else:
            reply_text = str(reply_text)
            
        return {
            "messages": [{"role": "assistant", "content": f"[Researcher]: {reply_text}"}],
            "researcher_status": "researching_tech_stack" 
        }