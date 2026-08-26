from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition

from backend.state import AgentState
from backend.agents.pm_agent import pm_node
from backend.agents.research_agent import research_node, tools # <-- Import tools from researcher
from backend.agents.dev_agent import dev_node
from backend.agents.tester_agent import tester_node
from backend.agents.tech_writer_agent import tech_writer_node

# 1. The Logic Gate (Human-in-the-Loop Router)
def approval_router(state: AgentState):
    messages = state.get("messages", [])
    
    user_messages = [m for m in messages if m.get("role") == "user"]
    if not user_messages:
        return "researcher"
        
    last_user_text = user_messages[-1].get("content", "").lower()

    if "accept" in last_user_text or "approve" in last_user_text or "looks good" in last_user_text:
        print("ROUTE: Proposal Accepted -> Going to Developer")
        return "developer"
        
    elif "reject" in last_user_text or "change" in last_user_text or "no" in last_user_text:
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
workflow.add_node("tools", ToolNode(tools))      # <-- The new execution node for web search
workflow.add_node("developer", dev_node)
workflow.add_node("tester", tester_node)
workflow.add_node("writer", tech_writer_node)

# 4. Define the Flow (Edges)
workflow.set_entry_point("pm")

# The PM uses the router to decide where to send the task
workflow.add_conditional_edges("pm", approval_router)

# --- THE NEW TOOL LOOP ---
# If the Researcher returns a tool call, route to "tools". Otherwise, route to END to pause for human approval.
workflow.add_conditional_edges("researcher", tools_condition)

# After the tool executes the search, it must route BACK to the Researcher so it can read the data.
workflow.add_edge("tools", "researcher")
# -------------------------

# The rest of the automated pipeline
workflow.add_edge("developer", "tester")
workflow.add_edge("tester", "writer")
workflow.add_edge("writer", END)

# 5. Compile the graph
app_graph = workflow.compile()