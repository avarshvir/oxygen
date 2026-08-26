from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.tools import DuckDuckGoSearchRun
from backend.state import AgentState

# 1. Define the tool and expose it so the graph can use it
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
    
    # We only inject the system prompt if it's the very first time the Researcher is speaking.
    # This prevents the prompt from stacking infinitely if it loops back from a web search.
    if len(messages) > 0 and messages[-1].get("role") == "user":
        system_prompt = (
            "You are the AI Technical Researcher for the Oxygen team. "
            "You MUST use your search tool to look up the latest framework versions, "
            "API documentation, and best practices before proposing a tech stack. "
            "Once you have the search results, write a detailed Technical Proposal. "
            "Address your response to the Project Manager."
        )
        # Prepend the system prompt to the message history
        invoke_messages = [{"role": "system", "content": system_prompt}] + messages
    else:
        # If returning from a search, just pass the existing history
        invoke_messages = messages

    # Call the LLM (it will either return a tool call OR the final text proposal)
    response = llm_with_tools.invoke(invoke_messages)
    
    return {
        # We append the raw AIMessage object so LangGraph can read the tool calls
        "messages": [response],
        "researcher_status": "researching_tech_stack" 
    }