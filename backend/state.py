from typing import TypedDict, Annotated, Sequence
import operator

# We use a custom reducer to append new messages to the existing list
def add_messages(left: list, right: list) -> list:
    return left + right

class AgentState(TypedDict):
    # Chat history and internal agent dialogue
    messages: Annotated[list[dict], add_messages]
    
    # User's LLM Configuration
    config: dict
    
    # Software Development Lifecycle Data
    project_requirements: str
    proposal_draft: str
    source_code: str
    test_results: str
    documentation: str
    
    # UI Statuses for your 2D Canvas animations
    pm_status: str
    researcher_status: str
    dev_status: str
    tester_status: str
    writer_status: str