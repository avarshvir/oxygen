from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn
import json
from backend.graph import app_graph 

app = FastAPI()

# Our lightweight global memory substitute
project_state = {
    "messages": []
}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Frontend connected to Oxygen Backend!")
    
    global project_state
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            user_text = message_data.get("content", "")
            
            # 1. Append user message
            project_state["messages"].append({"role": "user", "content": user_text})
            old_msg_count = len(project_state["messages"])
            
            # 2. Run the LangGraph logic gate
            print("Invoking LangGraph AI...")
            final_state = app_graph.invoke(project_state)
            project_state = final_state  # Update our global memory
            
            # 3. Send all NEW messages to the frontend
            new_messages = final_state["messages"][old_msg_count:]
            
            for msg in new_messages:
                # LangGraph outputs complex objects now because of the tools. 
                # We need to safely extract the text.
                content = msg.content if hasattr(msg, 'content') else msg.get("content", "")
                
                # Filter out the hidden tool calls and search results!
                msg_type = msg.type if hasattr(msg, 'type') else msg.get("type", "")
                if not content or msg_type == "tool":
                    continue 

                agent_name = "pm"
                label = "Project Manager"
                
                # Check our internal dialogue tags
                if "[Researcher]:" in content:
                    agent_name = "researcher"
                    label = "AI Researcher"
                    content = content.replace("[Researcher]:", "").strip()
                elif "[Developer]:" in content:
                    agent_name = "developer"
                    label = "AI Developer"
                    content = content.replace("[Developer]:", "").strip()
                elif "[Tester]:" in content:
                    agent_name = "tester"
                    label = "QA Tester"
                    content = content.replace("[Tester]:", "").strip()
                elif "[TechWriter]:" in content:
                    agent_name = "writer"
                    label = "Technical Writer"
                    content = content.replace("[TechWriter]:", "").strip()
                
                await websocket.send_text(json.dumps({
                    "agent": agent_name,
                    "label": label,
                    "content": content
                }))
                
    except WebSocketDisconnect:
        print("Frontend disconnected.")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)