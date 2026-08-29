import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_ollama import ChatOllama

def get_llm(config: dict):
    """
    Returns an LLM instance based on the user's config.
    Config should look like:
    {
        "provider": "gemini" | "ollama",
        "model": "gemini-1.5-flash" | "llama3",
        "api_key": "..." (optional for ollama)
    }
    """
    provider = config.get("provider", "gemini").lower()
    
    if provider == "ollama":
        model_name = config.get("model", "llama3.1")
        # Ensure we use an Ollama instance
        return ChatOllama(model=model_name)
    else:
        # Default to Gemini
        model_name = config.get("model", "gemini-1.5-flash")
        api_key = config.get("api_key", "").strip()
        
        # If the user didn't provide an API key in the UI, fallback to the .env file
        if not api_key:
            api_key = os.environ.get("GOOGLE_API_KEY")
            
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key
        )
