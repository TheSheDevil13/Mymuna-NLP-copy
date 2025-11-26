"""
Simple test script for the Bangla Voice Chat API.
This demonstrates how to use the API endpoints.
"""

import requests

# Base URL of the API
BASE_URL = "http://localhost:8000"

def test_text_chat():
    """Test the text chat endpoint."""
    print("Testing text chat endpoint...")
    
    response = requests.post(
        f"{BASE_URL}/chat/text",
        params={"text": "আমি বাংলায় কথা বলতে পারি।"}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"Response: {data['response']}")
    else:
        print(f"Error: {response.status_code} - {response.text}")


def test_audio_chat(audio_file_path):
    """Test the audio chat endpoint."""
    print(f"Testing audio chat endpoint with {audio_file_path}...")
    
    with open(audio_file_path, 'rb') as f:
        files = {'audio': ('audio.wav', f, 'audio/wav')}
        response = requests.post(
            f"{BASE_URL}/chat/audio",
            files=files
        )
    
    if response.status_code == 200:
        # Save the response audio
        with open('response_audio.wav', 'wb') as f:
            f.write(response.content)
        print("Response audio saved to response_audio.wav")
    else:
        print(f"Error: {response.status_code} - {response.text}")


if __name__ == "__main__":
    # Test health check
    print("Testing health check...")
    response = requests.get(f"{BASE_URL}/")
    print(f"Status: {response.json()}\n")
    
    # Test text chat
    test_text_chat()
    print("\n" + "="*50 + "\n")
    
    # Test audio chat (uncomment if you have an audio file)
    # test_audio_chat("recording.wav")

