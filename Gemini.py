from google.cloud import aiplatform
from vertexai.generative_models import GenerativeModel, Part
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

# Load system prompts from JSON
prompts_path = script_dir / "system_prompts.json"
with open(prompts_path, 'r', encoding='utf-8') as f:
    SYSTEM_PROMPTS = json.load(f)

# Global chat sessions stored by (mode, language_code)
# mode can be 'chat' or 'object_detection'
chat_sessions = {}

def get_system_prompt(mode='chat', language_code='bn-BD'):
    """
    Load the appropriate system prompt based on mode and language code.

    Args:
        mode (str): 'chat' or 'object_detection'
        language_code (str): Language code (e.g., 'bn-BD' for Bangla, 'en-US' for English)

    Returns:
        str: The system prompt text
    """
    # Determine language key (bn or en)
    lang_key = 'en' if language_code.startswith('en') else 'bn'

    # Get the appropriate prompt
    prompt = SYSTEM_PROMPTS[mode][lang_key]

    return prompt

def get_or_create_chat_session(mode='chat', language_code='bn-BD'):
    """
    Get existing chat session or create a new one for the given mode and language.

    Args:
        mode (str): 'chat' or 'object_detection'
        language_code (str): Language code (e.g., 'bn-BD' for Bangla, 'en-US' for English)

    Returns:
        Chat session object
    """
    session_key = (mode, language_code)

    # For object detection, always create a new session since each interaction has a new image
    if mode == 'object_detection' or session_key not in chat_sessions:
        # Load system prompt for this mode and language
        system_instruction = get_system_prompt(mode, language_code)

        # Create model with system instruction
        # Use gemini-2.0-flash-exp for vision capabilities
        model_name = "gemini-2.0-flash-exp" if mode == 'object_detection' else "gemini-2.5-flash-lite"
        model = GenerativeModel(
            model_name,
            system_instruction=system_instruction
        )

        # Start new chat session
        chat_sessions[session_key] = model.start_chat()

    return chat_sessions[session_key]

def send_message(user_msg, mode='chat', language_code='bn-BD', image_bytes=None):
    """
    Send a message to Gemini and get a response.

    Args:
        user_msg (str): The user's message.
        mode (str): 'chat' or 'object_detection' (default: 'chat')
        language_code (str): Language code (default: 'bn-BD' for Bangla)
        image_bytes (bytes): For object_detection mode, the image data

    Returns:
        str: The assistant's reply.
    """
    # Get or create chat session for this mode and language
    chat = get_or_create_chat_session(mode, language_code)

    # For object detection with image, send multimodal content
    if mode == 'object_detection' and image_bytes:
        # Create image part from bytes
        image_part = Part.from_data(data=image_bytes, mime_type="image/jpeg")

        # Send both image and text
        response = chat.send_message([image_part, user_msg])
    else:
        # Send text only
        response = chat.send_message(user_msg)

    # Extract assistant text
    assistant_reply = response.text

    return assistant_reply

def reset_chat_session(mode='chat', language_code='bn-BD'):
    """
    Reset/clear the chat session for a given mode and language.

    Args:
        mode (str): 'chat' or 'object_detection'
        language_code (str): Language code
    """
    session_key = (mode, language_code)
    if session_key in chat_sessions:
        del chat_sessions[session_key]

if __name__ == "__main__":
    response = send_message("Hello, how are you?", mode='chat', language_code='en-US')
    print(response)
