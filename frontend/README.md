# Bangla NLP Frontend

React + Vite frontend for the Bangla Voice Chat application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Features

- 🎤 Voice recording (click to start/stop)
- 💬 Text input as alternative
- 🔊 Automatic audio playback of responses
- 💬 Chat history with transcribed text
- 📱 Mobile responsive design

## Backend Connection

Make sure the FastAPI backend is running on `http://localhost:8000` before using the frontend.

The frontend is configured to proxy API requests through Vite's dev server, so API calls to `/api/*` will be forwarded to `http://localhost:8000/*`.

