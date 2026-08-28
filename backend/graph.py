from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition

from backend.state import AgentState
from backend.agents.pm_agent import pm_node
from backend.agents.research_agent import research_node, tools 
from backend.agents.dev_agent import dev_node
from backend.agents.tester_agent import tester_node
from backend.agents.tech_writer_agent import tech_writer_node

# 1. The UPGRADED Logic Gate
# 1. The UPGRADED Logic Gate
def approval_router(state: AgentState):
    messages = state.get("messages", [])
    
    # Safely extract user text
    user_texts = []
    for m in messages:
        if isinstance(m, dict):
            role = m.get("role", "")
            content = m.get("content", "")
        else:
            role = getattr(m, 'type', '') 
            content = getattr(m, 'content', '')
            
        if role in ["user", "human"]:
            user_texts.append(str(content).lower())
    
    if not user_texts:
        return "researcher"
        
    last_user_text = user_texts[-1]

    # --- THE FIX: Expanded vocabulary for the router ---
    approval_words = ["accept", "approve", "looks good", "ok", "proceed", "yes", "go ahead", "sure"]
    rejection_words = ["reject", "change", "no", "stop", "wait"]

    # Check if ANY of the approval words are in the user's message
    if any(word in last_user_text for word in approval_words):
        print("ROUTE: Proposal Accepted -> Going to Developer")
        return "developer"
        
    elif any(word in last_user_text for word in rejection_words):
        print("ROUTE: Proposal Rejected -> Going back to Researcher")
        return "researcher"
        
    else:
        print("ROUTE: New project -> Going to Researcher")
        return "researcher"

# 2. Initialize the Graph
workflow = StateGraph(AgentState)

# 3. Add the Agents AND the new ToolNode
workflow.add_node("pm", pm_node)
workflow.add_node("researcher", research_node)
workflow.add_node("tools", ToolNode(tools))      
workflow.add_node("developer", dev_node)
workflow.add_node("tester", tester_node)
workflow.add_node("writer", tech_writer_node)

# 4. Define the Flow (Edges)
workflow.set_entry_point("pm")

workflow.add_conditional_edges("pm", approval_router)
workflow.add_conditional_edges("researcher", tools_condition)
workflow.add_edge("tools", "researcher")

workflow.add_edge("developer", "tester")
workflow.add_edge("tester", "writer")
workflow.add_edge("writer", END)

# 5. Compile the graph
app_graph = workflow.compile()