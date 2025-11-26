# Bangla NLP - Bangla Voice Chat

A full-stack Bangla voice chat application using Google Cloud Speech-to-Text, Gemini AI, and Text-to-Speech.

## Project Structure

```
Mymuna-NLP/
├── app.py                 # FastAPI backend
├── Gemini.py              # Gemini AI integration
├── GoogleSTT.py           # Speech-to-Text integration
├── GoogleTTS.py           # Text-to-Speech integration
├── TTS.py                 # Alternative TTS (BanglaTTS)
├── system_prompt.txt      # System prompt for Gemini
├── key.json               # Google Cloud credentials (not in repo)
├── requirements.txt       # Python dependencies
├── test_api.py            # API testing script
└── frontend/              # React + Vite frontend
    ├── src/
    │   ├── App.jsx        # Main chat component
    │   ├── App.css        # Styles
    │   ├── main.jsx       # React entry point
    │   └── index.css      # Global styles
    ├── package.json
    └── vite.config.js
```

## Setup

### Backend Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Make sure `key.json` contains your Google Cloud credentials with the following APIs enabled:
   - Google Cloud Speech-to-Text API
   - Google Cloud Text-to-Speech API
   - Vertex AI API

3. Start the backend server:
```bash
python app.py
```

The backend will run on `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Usage

1. Start both backend and frontend servers
2. Open `http://localhost:3000` in your browser
3. Allow microphone access when prompted
4. Click "Start" to begin recording
5. Click "Stop" to send the audio
6. The assistant will automatically respond with audio and display the conversation text

## Features

- 🎤 Voice recording (click to start/stop)
- 💬 Text input as alternative
- 🔊 Automatic audio playback of responses
- 💬 Chat history with transcribed text
- 📱 Mobile responsive design
- 🇧🇩 Full Bangla language support
- 🧹 Automatic markdown stripping for clean TTS output

## API Endpoints

- `POST /chat/audio` - Send audio file, receive JSON with:
  - `user_text`: Transcribed text from audio
  - `assistant_text`: Assistant's text response (markdown stripped)
  - `audio_base64`: Base64-encoded audio response
- `POST /chat/text` - Send text message, receive JSON with:
  - `response`: Assistant's text response
- `GET /` - Health check

## Technologies

- **Backend**: 
  - FastAPI
  - Google Cloud Speech-to-Text API
  - Google Cloud Text-to-Speech API
  - Vertex AI (Gemini 2.5 Flash)
- **Frontend**: 
  - React 18
  - Vite
- **Audio Formats**: 
  - WebM (browser recording)
  - WAV (TTS output)
  - Native Google Cloud format support (no conversion needed)

