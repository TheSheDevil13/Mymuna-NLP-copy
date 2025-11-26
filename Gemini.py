from google.cloud import aiplatform
from vertexai.generative_models import GenerativeModel
from pathlib import Path
import os
import json

# Set Google Cloud credentials from script directory
script_dir = Path(__file__).parent
key_path = script_dir / "key.json"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(key_path)

# Load project ID from key.json
with open(key_path, 'r') as f:
    key_data = json.load(f)
    project_id = key_data["project_id"]

# Initialize Vertex AI
aiplatform.init(
    project=project_id,
    location="us-central1"
)

# Global chat sessions stored by language code
chat_sessions = {}

def get_system_prompt(language_code='bn-BD'):
    """
    Load the appropriate system prompt based on language code.
    
    Args:
        language_code (str): Language code (e.g., 'bn-BD' for Bangla, 'en-US' for English)
    
    Returns:
        str: The system prompt text
    """
    # Determine which system prompt file to use based on language
    if language_code.startswith('en'):
        system_prompt_path = script_dir / "system_prompt_en.txt"
    else:
        system_prompt_path = script_dir / "system_prompt.txt"
    
    with open(system_prompt_path, 'r', encoding='utf-8') as f:
        return f.read().strip()

def get_or_create_chat_session(language_code='bn-BD'):
    """
    Get existing chat session or create a new one for the given language.
    
    Args:
        language_code (str): Language code (e.g., 'bn-BD' for Bangla, 'en-US' for English)
    
    Returns:
        Chat session object
    """
    if language_code not in chat_sessions:
        # Load system prompt for this language
        system_instruction = get_system_prompt(language_code)
        
        # Create model with system instruction
        model = GenerativeModel(
            "gemini-2.5-flash-lite",
            system_instruction=system_instruction
        )
        
        # Start new chat session
        chat_sessions[language_code] = model.start_chat()
    
    return chat_sessions[language_code]

def send_message(user_msg, language_code='bn-BD'):
    """
    Send a message to Gemini and get a response.
    
    Args:
        user_msg (str): The user's message.
        language_code (str): Language code (default: 'bn-BD' for Bangla)
    
    Returns:
        str: The assistant's reply.
    """
    # Get or create chat session for this language
    chat = get_or_create_chat_session(language_code)
    
    # Send message and get response
    response = chat.send_message(user_msg)
    
    # Extract assistant text
    assistant_reply = response.text
    
    return assistant_reply

if __name__ == "__main__":
    response = send_message("Hello, how are you?")
    print(response)