from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from io import BytesIO
from google.cloud import speech
from GoogleSTT import runSTT_from_bytes
from Gemini import send_message, reset_chat_session
from GoogleTTS import runTTS
import uvicorn
import base64
import re
from typing import Optional

app = FastAPI(title="Bangla Voice Chat API")


def strip_markdown(text):
    """
    Remove markdown formatting from text for TTS.
    Keeps the text content but removes formatting characters.
    """
    if not text:
        return text

    # Remove bold/italic markers (**text**, *text*, __text__, _text_)
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # **bold**
    text = re.sub(r'\*([^*]+)\*', r'\1', text)      # *italic*
    text = re.sub(r'__([^_]+)__', r'\1', text)       # __bold__
    text = re.sub(r'_([^_]+)_', r'\1', text)         # _italic_

    # Remove code blocks (```code``` and `code`)
    text = re.sub(r'```[\s\S]*?```', '', text)       # ```code blocks```
    text = re.sub(r'`([^`]+)`', r'\1', text)         # `inline code`

    # Remove links but keep the text [text](url) -> text
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)

    # Remove headers (# Header -> Header)
    text = re.sub(r'^#{1,6}\s+(.+)$', r'\1', text, flags=re.MULTILINE)

    # Remove list markers (- item, * item, 1. item)
    text = re.sub(r'^[\s]*[-*+]\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'^[\s]*\d+\.\s+', '', text, flags=re.MULTILINE)

    # Remove horizontal rules (---, ***)
    text = re.sub(r'^[-*]{3,}$', '', text, flags=re.MULTILINE)

    # Clean up extra whitespace
    text = re.sub(r'\n\s*\n', '\n\n', text)  # Multiple newlines to double
    text = text.strip()

    return text

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "Bangla Voice Chat API is running"}


@app.post("/chat/audio")
async def chat_with_audio(
    audio: UploadFile = File(...),
    language_code: Optional[str] = Form('bn-BD')
):
    """
    Process audio input, convert to text, get Gemini response, and return audio with text.

    Args:
        audio: Audio file (WAV format, 16kHz, mono, LINEAR16 or WebM)
        language_code: Language code for STT and TTS (default: 'bn-BD' for Bangla)

    Returns:
        JSON with user_text, assistant_text, and audio_base64
    """
    try:
        # Read audio file
        audio_bytes = await audio.read()

        if not audio_bytes:
            raise HTTPException(status_code=400, detail="No audio data received")

        # Detect audio format from filename or content type
        audio_format = None
        if audio.filename:
            audio_format = audio.filename.split('.')[-1].lower()
        elif audio.content_type:
            if 'webm' in audio.content_type:
                audio_format = 'webm'
            elif 'wav' in audio.content_type:
                audio_format = 'wav'

        # Determine encoding and sample rate for Google Cloud Speech-to-Text
        encoding = speech.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED
        sample_rate = None  # None means auto-detect

        if audio_format == 'webm':
            encoding = speech.RecognitionConfig.AudioEncoding.WEBM_OPUS
            sample_rate = None
            print("Detected WebM format, using WEBM_OPUS encoding")
        elif audio_format == 'wav':
            encoding = speech.RecognitionConfig.AudioEncoding.LINEAR16
            sample_rate = 16000
            print("Detected WAV format, using LINEAR16 encoding")
        else:
            print(f"Audio format: {audio_format or 'unknown'}, using auto-detection")

        # Step 1: Convert audio to text using STT
        print("Converting audio to text...")
        try:
            user_text = runSTT_from_bytes(audio_bytes, rate=sample_rate, encoding=encoding, language_code=language_code)
        except Exception as e:
            print(f"STT Error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Speech-to-text failed: {str(e)}")

        if not user_text:
            raise HTTPException(status_code=400, detail="No speech detected in audio")

        print(f"User said: {user_text}")

        # Step 2: Get response from Gemini (chat mode)
        print("Getting response from Gemini...")
        try:
            assistant_text = send_message(user_text, mode='chat', language_code=language_code)
        except Exception as e:
            print(f"Gemini Error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Gemini API failed: {str(e)}")

        if not assistant_text:
            raise HTTPException(status_code=500, detail="No response from Gemini")

        print(f"Assistant replied: {assistant_text}")

        # Step 3: Strip markdown for both TTS and display
        assistant_text_clean = strip_markdown(assistant_text)
        print(f"Text (markdown stripped): {assistant_text_clean}")

        # Step 4: Convert response to audio using TTS
        print("Converting response to audio...")
        try:
            response_audio_bytes = runTTS(assistant_text_clean, return_bytes=True, language_code=language_code)
        except Exception as e:
            print(f"TTS Error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Text-to-speech failed: {str(e)}")

        # Step 5: Encode audio to base64 for JSON response
        audio_base64 = base64.b64encode(response_audio_bytes).decode('utf-8')

        # Return JSON with text and audio
        return JSONResponse(
            content={
                "user_text": user_text,
                "assistant_text": assistant_text_clean,
                "audio_base64": audio_base64
            },
            media_type="application/json"
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/objects/detect")
async def detect_objects_with_audio(
    audio: UploadFile = File(...),
    image: UploadFile = File(...),
    language_code: Optional[str] = Form('bn-BD')
):
    """
    Process image and audio, send both to Gemini for educational response about objects.

    Args:
        audio: Audio file (WebM format)
        image: Image file (JPEG/PNG)
        language_code: Language code for STT and TTS (default: 'bn-BD' for Bangla)

    Returns:
        JSON with user_text, assistant_text, and audio_base64
    """
    try:
        # Read image file
        image_bytes = await image.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="No image data received")

        # Read audio file
        audio_bytes = await audio.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="No audio data received")

        # Step 1: Convert audio to text using STT
        print("Converting audio to text...")
        encoding = speech.RecognitionConfig.AudioEncoding.WEBM_OPUS
        try:
            user_text = runSTT_from_bytes(audio_bytes, rate=None, encoding=encoding, language_code=language_code)
        except Exception as e:
            print(f"STT Error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Speech-to-text failed: {str(e)}")

        if not user_text:
            raise HTTPException(status_code=400, detail="No speech detected in audio")

        print(f"User said: {user_text}")

        # Step 2: Send image + text to Gemini (object_detection mode with vision)
        print("Sending image and text to Gemini for analysis...")
        try:
            assistant_text = send_message(
                user_text,
                mode='object_detection',
                language_code=language_code,
                image_bytes=image_bytes
            )
        except Exception as e:
            print(f"Gemini Error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Gemini API failed: {str(e)}")

        if not assistant_text:
            raise HTTPException(status_code=500, detail="No response from Gemini")

        print(f"Assistant replied: {assistant_text}")

        # Step 3: Strip markdown for both TTS and display
        assistant_text_clean = strip_markdown(assistant_text)

        # Step 4: Convert response to audio using TTS
        print("Converting response to audio...")
        try:
            response_audio_bytes = runTTS(assistant_text_clean, return_bytes=True, language_code=language_code)
        except Exception as e:
            print(f"TTS Error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Text-to-speech failed: {str(e)}")

        # Step 5: Encode audio to base64 for JSON response
        audio_base64 = base64.b64encode(response_audio_bytes).decode('utf-8')

        # Return JSON with all information
        return JSONResponse(
            content={
                "user_text": user_text,
                "assistant_text": assistant_text_clean,
                "audio_base64": audio_base64
            },
            media_type="application/json"
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/chat/text")
async def chat_with_text(text: str):
    """
    Process text input, get Gemini response, and return text.
    Useful for testing or text-only clients.

    Args:
        text: User's text message

    Returns:
        JSON with assistant's text response
    """
    try:
        assistant_text = send_message(text, mode='chat')
        return {"response": assistant_text}

    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/session/reset")
async def reset_session(
    mode: Optional[str] = Form('chat'),
    language_code: Optional[str] = Form('bn-BD')
):
    """
    Reset the chat session for a given mode and language.

    Args:
        mode: 'chat' or 'object_detection'
        language_code: Language code

    Returns:
        Success message
    """
    try:
        reset_chat_session(mode=mode, language_code=language_code)
        return {"message": f"Session reset successfully for {mode} mode"}
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to reset session: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
