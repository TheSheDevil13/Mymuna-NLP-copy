import pyaudio
import wave
from google.cloud import speech
import os
from pathlib import Path

def record_audio(output_file="recording.wav", duration=5, rate=16000):
    # Audio recording parameters
    CHUNK = 1024
    FORMAT = pyaudio.paInt16
    CHANNELS = 1
    RATE = rate
    RECORD_SECONDS = duration

    audio = pyaudio.PyAudio()
    print("Recording...")
    # Start recording
    stream = audio.open(
        format=FORMAT,
        channels=CHANNELS,
        rate=RATE,
        input=True,
        frames_per_buffer=CHUNK
    )
    
    frames = []
    
    # Record audio
    for i in range(0, int(RATE / CHUNK * RECORD_SECONDS)):
        data = stream.read(CHUNK)
        frames.append(data)
    
    print("Recording finished.")
    
    # Get sample size before terminating
    sample_width = audio.get_sample_size(FORMAT)
    
    # Stop and close stream
    stream.stop_stream()
    stream.close()
    audio.terminate()
    
    # Save audio to WAV file
    wf = wave.open(output_file, 'wb')
    wf.setnchannels(CHANNELS)
    wf.setsampwidth(sample_width)
    wf.setframerate(RATE)
    wf.writeframes(b''.join(frames))
    wf.close()
    
    print(f"Audio saved to {output_file}")
    return output_file


def runSTT(audio_file, output_file=None, rate=16000, language_code='bn-BD'):

    # Set Google Cloud credentials from script directory
    script_dir = Path(__file__).parent
    key_path = script_dir / "key.json"
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(key_path)
    
    # Read audio file
    with open(audio_file, 'rb') as f:
        audio_content = f.read()
    
    # Initialize Google Speech-to-Text client
    client = speech.SpeechClient()
    
    # Configure audio and recognition settings for Bangla
    audio = speech.RecognitionAudio(content=audio_content)
    
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=rate,
        language_code=language_code,  # Bangla (Bangladesh)
        enable_automatic_punctuation=True,
    )
    
    print("Transcribing...")
    
    # Perform speech recognition
    response = client.recognize(config=config, audio=audio)
    
    # Extract transcription
    transcription = ""
    for result in response.results:
        transcription += result.alternatives[0].transcript + " "
    
    transcription = transcription.strip()
    
    if transcription:
        print(f"Transcription: {transcription}")
        
        # Write to file with UTF-8 encoding
        if output_file: # if output_file is provided, write to file
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(transcription)
            
            print(f"Transcription saved to {output_file}")

    else:
        print("No speech detected or transcription failed.")
    
    return transcription


def runSTT_from_bytes(audio_bytes, rate=None, encoding=None, language_code='bn-BD'):
    """
    Converts audio bytes to text using Google Cloud Speech-to-Text API.
    
    Args:
        audio_bytes (bytes): The audio data as bytes.
        rate (int, optional): Sample rate of the audio. If None, will auto-detect.
                              Default is 16000 for WAV, None for WebM (auto-detect).
        encoding: Audio encoding. If None, will auto-detect. Options:
                  - speech.RecognitionConfig.AudioEncoding.LINEAR16 (WAV)
                  - speech.RecognitionConfig.AudioEncoding.WEBM_OPUS (WebM)
                  - speech.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED (auto-detect)
    
    Returns:
        str: The transcribed text.
    """
    # Set Google Cloud credentials from script directory
    script_dir = Path(__file__).parent
    key_path = script_dir / "key.json"
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(key_path)
    
    # Initialize Google Speech-to-Text client
    client = speech.SpeechClient()
    
    # Configure audio and recognition settings for Bangla
    audio = speech.RecognitionAudio(content=audio_bytes)
    
    # Use auto-detect if encoding not specified
    if encoding is None:
        encoding = speech.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED
    
    # Build config - only include sample_rate if specified
    # For WebM OPUS, the sample rate is in the header and shouldn't be specified
    config_dict = {
        "encoding": encoding,
        "language_code": language_code,  # Bangla (Bangladesh)
        "enable_automatic_punctuation": True,
    }
    
    # Only add sample_rate_hertz if rate is specified
    # For WebM OPUS, Google Cloud reads it from the file header
    if rate is not None:
        config_dict["sample_rate_hertz"] = rate
    
    config = speech.RecognitionConfig(**config_dict)
    
    # Perform speech recognition
    response = client.recognize(config=config, audio=audio)
    
    # Extract transcription
    transcription = ""
    for result in response.results:
        transcription += result.alternatives[0].transcript + " "
    
    transcription = transcription.strip()
    
    return transcription


# Example usage
if __name__ == "__main__":
    # Google Cloud credentials are automatically loaded from key.json in the script directory
    
    # Record audio
    audio_file = record_audio(output_file="recording.wav", duration=5, rate=16000)
    
    # Transcribe the recorded audio
    text = runSTT(audio_file=audio_file, output_file="bangla_output.txt", rate=16000, language_code='en-US')
    print(f"Result: {text}")
    pass