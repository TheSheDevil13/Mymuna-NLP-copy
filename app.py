from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from io import BytesIO
from google.cloud import speech
from GoogleSTT import runSTT_from_bytes
from Gemini import send_message, reset_chat_session
from GoogleTTS import runTTS
import uvicorn
import base64
import re
import json
import os
from pathlib import Path
from typing import Optional

app = FastAPI(title="Bangla Voice Chat API")

# Define lessons directory
LESSONS_DIR = Path(__file__).parent / "lessons"

def strip_markdown(text):
    """Remove markdown formatting from text for TTS."""
    if not text: return text
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'\*([^*]+)\*', r'\1', text)
    text = re.sub(r'__([^_]+)__', r'\1', text)
    text = re.sub(r'_([^_]+)_', r'\1', text)
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'`([^`]+)`', r'\1', text)
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    text = re.sub(r'^#{1,6}\s+(.+)$', r'\1', text, flags=re.MULTILINE)
    text = re.sub(r'^[\s]*[-*+]\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'^[\s]*\d+\.\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'^[-*]{3,}$', '', text, flags=re.MULTILINE)
    text = re.sub(r'\n\s*\n', '\n\n', text)
    text = text.strip()
    return text

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Bangla Voice Chat API is running"}

@app.get("/lessons")
async def get_lessons():
    """Scan the lessons directory and return available lessons."""
    lessons_list = []
    
    if not LESSONS_DIR.exists():
        return []

    for folder in LESSONS_DIR.iterdir():
        if folder.is_dir():
            meta_path = folder / "metadata.json"
            if meta_path.exists():
                try:
                    with open(meta_path, 'r', encoding='utf-8') as f:
                        meta = json.load(f)
                        lessons_list.append({
                            "id": folder.name,
                            "title_en": meta.get("title_en", folder.name),
                            "title_bn": meta.get("title_bn", folder.name)
                        })
                except Exception as e:
                    print(f"Error reading metadata for {folder.name}: {e}")
    
    return lessons_list

@app.post("/chat/audio")
async def chat_with_audio(audio: UploadFile = File(...), language_code: Optional[str] = Form('bn-BD')):
    try:
        audio_bytes = await audio.read()
        if not audio_bytes: raise HTTPException(status_code=400, detail="No audio data")

        # Detect format
        audio_format = 'wav'
        if audio.filename and audio.filename.split('.')[-1].lower() == 'webm':
            audio_format = 'webm'
        
        encoding = speech.RecognitionConfig.AudioEncoding.WEBM_OPUS if audio_format == 'webm' else speech.RecognitionConfig.AudioEncoding.LINEAR16
        sample_rate = None if audio_format == 'webm' else 16000

        user_text = runSTT_from_bytes(audio_bytes, rate=sample_rate, encoding=encoding, language_code=language_code)
        if not user_text: raise HTTPException(status_code=400, detail="No speech detected")

        assistant_text = send_message(user_text, mode='chat', language_code=language_code)
        assistant_text_clean = strip_markdown(assistant_text)
        response_audio_bytes = runTTS(assistant_text_clean, return_bytes=True, language_code=language_code)
        audio_base64 = base64.b64encode(response_audio_bytes).decode('utf-8')

        return JSONResponse(content={
            "user_text": user_text,
            "assistant_text": assistant_text_clean,
            "audio_base64": audio_base64
        })
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/objects/detect")
async def detect_objects_with_audio(audio: UploadFile = File(...), image: UploadFile = File(...), language_code: Optional[str] = Form('bn-BD')):
    try:
        image_bytes = await image.read()
        audio_bytes = await audio.read()
        
        user_text = runSTT_from_bytes(audio_bytes, rate=None, encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS, language_code=language_code)
        if not user_text: raise HTTPException(status_code=400, detail="No speech detected")

        assistant_text = send_message(user_text, mode='object_detection', language_code=language_code, image_bytes=image_bytes)
        assistant_text_clean = strip_markdown(assistant_text)
        response_audio_bytes = runTTS(assistant_text_clean, return_bytes=True, language_code=language_code)
        audio_base64 = base64.b64encode(response_audio_bytes).decode('utf-8')

        return JSONResponse(content={
            "user_text": user_text,
            "assistant_text": assistant_text_clean,
            "audio_base64": audio_base64
        })
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/text")
async def chat_with_text(text: str):
    try:
        assistant_text = send_message(text, mode='chat')
        return {"response": assistant_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/session/reset")
async def reset_session(mode: Optional[str] = Form('chat'), language_code: Optional[str] = Form('bn-BD'), topic: Optional[str] = Form(None)):
    try:
        reset_chat_session(mode=mode, language_code=language_code, topic=topic)
        return {"message": "Session reset"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class LessonStartRequest(BaseModel):
    topic: str
    language_code: Optional[str] = 'bn-BD'

class LessonTextRequest(BaseModel):
    text: str
    topic: str
    language_code: Optional[str] = 'bn-BD'

# --- NEW CLASS FOR TTS REQUEST ---
class TTSRequest(BaseModel):
    text: str
    language_code: Optional[str] = 'bn-BD'

# --- NEW ENDPOINT FOR TTS ---
@app.post("/tts")
async def text_to_speech(request: TTSRequest):
    try:
        audio_bytes = runTTS(request.text, return_bytes=True, language_code=request.language_code)
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        return JSONResponse(content={
            "audio_base64": audio_base64
        })
    except Exception as e:
        print(f"Error in TTS: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/lesson/start")
async def start_lesson(request: LessonStartRequest):
    try:
        topic_id = request.topic
        language_code = request.language_code
        lang_key = 'en' if language_code.startswith('en') else 'bn'
        
        # 1. Read lesson content
        lesson_folder = LESSONS_DIR / topic_id
        content_path = lesson_folder / f"content_{lang_key}.txt"
        if not content_path.exists():
            content_path = lesson_folder / "content_en.txt" # Fallback
            
        lesson_context = ""
        if content_path.exists():
            with open(content_path, 'r', encoding='utf-8') as f:
                lesson_context = f.read()

        # 2. Get Topic Name
        meta_path = lesson_folder / "metadata.json"
        topic_name = topic_id
        if meta_path.exists():
            with open(meta_path, 'r', encoding='utf-8') as f:
                meta = json.load(f)
                topic_name = meta.get(f"title_{lang_key}", topic_id)

        # 3. Create initial message
        if lang_key == 'bn':
            initial_message = f"আমি {topic_name} সম্পর্কে শিখতে চাই। দয়া করে পাঠ শুরু করুন।"
        else:
            initial_message = f"I want to learn about {topic_name}. Please start the lesson."
        
        # 4. Reset and Start Session with Context
        reset_chat_session(mode='lesson_delivery', language_code=language_code, topic=topic_id)
        
        assistant_text = send_message(
            initial_message,
            mode='lesson_delivery',
            language_code=language_code,
            topic=topic_id,
            context=lesson_context
        )
        
        assistant_text_clean = strip_markdown(assistant_text)
        response_audio_bytes = runTTS(assistant_text_clean, return_bytes=True, language_code=language_code)
        audio_base64 = base64.b64encode(response_audio_bytes).decode('utf-8')
        
        return JSONResponse(content={
            "assistant_text": assistant_text_clean,
            "audio_base64": audio_base64
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/lesson/audio")
async def lesson_with_audio(audio: UploadFile = File(...), topic: Optional[str] = Form(...), language_code: Optional[str] = Form('bn-BD')):
    try:
        audio_bytes = await audio.read()
        user_text = runSTT_from_bytes(audio_bytes, rate=None, encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS, language_code=language_code)
        
        if not user_text: raise HTTPException(status_code=400, detail="No speech detected")
        
        # Pass topic so Gemini finds the correct session with context
        assistant_text = send_message(
            user_text,
            mode='lesson_delivery',
            language_code=language_code,
            topic=topic
        )
        
        assistant_text_clean = strip_markdown(assistant_text)
        response_audio_bytes = runTTS(assistant_text_clean, return_bytes=True, language_code=language_code)
        audio_base64 = base64.b64encode(response_audio_bytes).decode('utf-8')
        
        return JSONResponse(content={
            "user_text": user_text,
            "assistant_text": assistant_text_clean,
            "audio_base64": audio_base64
        })
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/lesson/text")
async def lesson_with_text(request: LessonTextRequest):
    try:
        assistant_text = send_message(
            request.text,
            mode='lesson_delivery',
            language_code=request.language_code,
            topic=request.topic
        )
        
        assistant_text_clean = strip_markdown(assistant_text)
        response_audio_bytes = runTTS(assistant_text_clean, return_bytes=True, language_code=request.language_code)
        audio_base64 = base64.b64encode(response_audio_bytes).decode('utf-8')
        
        return JSONResponse(content={
            "response": assistant_text_clean,
            "audio_base64": audio_base64
        })
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/lesson/quiz")
async def get_lesson_quiz(request: LessonStartRequest):
    try:
        # Construct path to the quiz.json file
        lesson_folder = LESSONS_DIR / request.topic
        quiz_path = lesson_folder / "quiz.json"
        
        # Check if file exists
        if not quiz_path.exists():
            raise HTTPException(status_code=404, detail="Quiz not found for this topic")
            
        # Read and return the JSON directly
        with open(quiz_path, 'r', encoding='utf-8') as f:
            quiz_data = json.load(f)
        return quiz_data
        
    except Exception as e:
        print(f"Error reading quiz: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error reading quiz: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)