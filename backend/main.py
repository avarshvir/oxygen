import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn
import json

from backend.graph import app_graph 

app = FastAPI()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Frontend connected to Oxygen Backend!")
    
    # LOCAL state per connection
    project_state = {
        "messages": []
    }
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Update configuration if received
            if message_data.get("type") == "config":
                project_state["config"] = message_data.get("config", {})
                print("Received new LLM config:", project_state["config"])
                continue
                
            user_text = message_data.get("content", "")
            
            project_state["messages"].append({"role": "user", "content": user_text})
            old_msg_count = len(project_state["messages"])
            
            print("Invoking LangGraph AI with streaming...")
            
            final_state = project_state
            
            async for current_state in app_graph.astream(project_state, stream_mode="values"):
                final_state = current_state
                current_messages = current_state.get("messages", [])
                
                if len(current_messages) > old_msg_count:
                    new_messages = current_messages[old_msg_count:]
                    old_msg_count = len(current_messages)
                    
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
                        if "[Project Manager]:" in content:
                            agent_name = "pm"
                            label = "Project Manager"
                            content = content.replace("[Project Manager]:", "").strip()
                        elif "[Researcher]:" in content:
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
            
            # 3. Update our local memory for the next loop
            project_state = final_state
                
    except WebSocketDisconnect:
        print("Frontend disconnected.")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)