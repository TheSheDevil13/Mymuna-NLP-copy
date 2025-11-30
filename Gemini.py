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

# Global chat sessions stored by (mode, language_code, topic)
chat_sessions = {}

def get_system_prompt(mode='chat', language_code='bn-BD', topic=None, context=None):
    """
    Load the appropriate system prompt based on mode and language code.
    """
    # Determine language key (bn or en)
    lang_key = 'en' if language_code.startswith('en') else 'bn'

    # Get the appropriate prompt
    prompt = SYSTEM_PROMPTS[mode][lang_key]
    
    # For lesson_delivery, add topic-specific instruction
    if mode == 'lesson_delivery':
        if context:
            # Teach from the provided text file content
            if lang_key == 'bn':
                prompt += f"\n\nনিচের তথ্যের ওপর ভিত্তি করে পাঠদান করুন:\n{context}"
            else:
                prompt += f"\n\nTeach the lesson based strictly on the following information:\n{context}"
        elif topic:
            # Fallback for legacy hardcoded topics
            topic_names = {
                'liberation-war': {'bn': 'বাংলাদেশের মুক্তিযুদ্ধ', 'en': 'Bangladesh Liberation War'},
                'world-war-2': {'bn': 'দ্বিতীয় বিশ্বযুদ্ধ', 'en': 'World War 2'}
            }
            if topic in topic_names:
                topic_name = topic_names[topic][lang_key]
                if lang_key == 'bn':
                    prompt += f"\n\nআপনি এখন {topic_name} সম্পর্কে পাঠ দিচ্ছেন।"
                else:
                    prompt += f"\n\nYou are now teaching about {topic_name}."
    
    return prompt

def get_or_create_chat_session(mode='chat', language_code='bn-BD', topic=None, context=None):
    """
    Get existing chat session or create a new one.
    """
    # Create session key based on mode
    if mode == 'lesson_delivery':
        session_key = (mode, language_code, topic)
    else:
        session_key = (mode, language_code)

    # For object detection, always create a new session
    if mode == 'object_detection' or session_key not in chat_sessions:
        # Load system prompt with context if available
        system_instruction = get_system_prompt(mode, language_code, topic, context)

        # Create model
        model_name = "gemini-2.0-flash-exp" if mode == 'object_detection' else "gemini-2.5-flash-lite"
        model = GenerativeModel(
            model_name,
            system_instruction=system_instruction
        )

        # Start new chat session
        chat_sessions[session_key] = model.start_chat()

    return chat_sessions[session_key]

def send_message(user_msg, mode='chat', language_code='bn-BD', image_bytes=None, topic=None, context=None):
    """
    Send a message to Gemini and get a response.
    """
    # Get or create chat session
    chat = get_or_create_chat_session(mode, language_code, topic, context)

    # For object detection with image
    if mode == 'object_detection' and image_bytes:
        image_part = Part.from_data(data=image_bytes, mime_type="image/jpeg")
        response = chat.send_message([image_part, user_msg])
    else:
        # Send text only
        response = chat.send_message(user_msg)

    return response.text

def reset_chat_session(mode='chat', language_code='bn-BD', topic=None):
    """
    Reset/clear the chat session.
    """
    if mode == 'lesson_delivery':
        session_key = (mode, language_code, topic)
    else:
        session_key = (mode, language_code)
    
    if session_key in chat_sessions:
        del chat_sessions[session_key]

if __name__ == "__main__":
    response = send_message("Hello, how are you?", mode='chat', language_code='en-US')
    print(response)