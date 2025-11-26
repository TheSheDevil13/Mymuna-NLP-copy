from google.cloud import texttospeech
import os
from pathlib import Path


def runTTS(text, output_file=None, language_code='bn-BD', return_bytes=False):
    """
    Converts text to speech using Google Cloud Text-to-Speech API.
    
    Args:
        text (str): The text to convert to speech.
        output_file (str, optional): Path to save the audio file. If None and return_bytes=False, 
                                     audio will be saved to a default location.
        language_code (str): Language code. Default is 'bn-BD' for Bangla.
        return_bytes (bool): If True, returns audio bytes instead of saving to file.
    
    Returns:
        bytes or str: If return_bytes=True, returns audio bytes. Otherwise returns path to saved file.
    """
    # Set Google Cloud credentials from script directory
    script_dir = Path(__file__).parent
    key_path = script_dir / "key.json"
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(key_path)
    
    # Initialize the client
    client = texttospeech.TextToSpeechClient()
    
    # Set the text input
    synthesis_input = texttospeech.SynthesisInput(text=text)
    
    # Configure the voice (using default voice for the language)
    voice = texttospeech.VoiceSelectionParams(
        language_code=language_code,
    )
    
    # Select the audio file type
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.LINEAR16  # WAV format
    )
    
    # Perform the text-to-speech request
    print(f"Converting text to speech: '{text}'")
    response = client.synthesize_speech(
        input=synthesis_input, voice=voice, audio_config=audio_config
    )
    
    # Get the audio content
    audio_content = response.audio_content
    
    if return_bytes:
        # Return audio bytes directly (useful for FastAPI streaming)
        print("Audio generated in memory")
        return audio_content
    else:
        # Save to file
        if output_file is None:
            output_file = "output.wav"
        
        with open(output_file, 'wb') as out:
            out.write(audio_content)
        
        print(f"Audio saved to {output_file}")
        return output_file


# Example usage
if __name__ == "__main__":
    bangla_text = "আমি বাংলায় কথা বলতে পারি।"
    english_text = "I can speak in Bangla."
    
    # Example 1: Save to file
    output_file = "google_tts_output.wav"
    runTTS(english_text, output_file=output_file, language_code='en-US')
    print(f"Generated speech saved to {output_file}")
    
    # Example 2: Get audio bytes (for FastAPI)
    # audio_bytes = runTTS(bangla_text, return_bytes=True)
    # print(f"Audio bytes length: {len(audio_bytes)}")

