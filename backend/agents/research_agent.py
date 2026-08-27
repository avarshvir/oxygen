from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.tools import DuckDuckGoSearchRun
from backend.state import AgentState

# 1. Define the tool and expose it
search_tool = DuckDuckGoSearchRun()
tools = [search_tool]

# 2. Bind the tool to the LLM
llm = ChatGoogleGenerativeAI(model="gemini-3.6-flash")
llm_with_tools = llm.bind_tools(tools)

def research_node(state: AgentState):
    """
    The AI Researcher Node (Equipped with Web Search).
    Analyzes the state and either executes a search or writes a proposal.
    """
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
    response = llm_with_tools.invoke(invoke_messages)
    
    return {
        "messages": [response],
        "researcher_status": "researching_tech_stack" 
    }