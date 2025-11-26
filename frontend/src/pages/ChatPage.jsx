import { useState, useRef, useEffect } from 'react'
import './ChatPage.css'

const API_BASE_URL = import.meta.env.DEV ? '/api' : 'http://localhost:8000'

function ChatPage() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [messages, setMessages] = useState([])
  const [error, setError] = useState(null)
  const [language, setLanguage] = useState('bn')

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const responseAudioRef = useRef(null)

  const getLanguageCode = () => {
    return language === 'en' ? 'en-US' : 'bn-BD'
  }

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (responseAudioRef.current) {
        responseAudioRef.current.pause()
        responseAudioRef.current = null
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await sendAudioToBackend(audioBlob)

        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Microphone access denied. Please allow microphone access.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const sendAudioToBackend = async (audioBlob) => {
    setIsProcessing(true)
    setError(null)

    try {
      const formData = new FormData()
      const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' })
      formData.append('audio', audioFile)
      formData.append('language_code', getLanguageCode())

      const response = await fetch(`${API_BASE_URL}/chat/audio`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to process audio')
      }

      const data = await response.json()
      const { user_text, assistant_text, audio_base64 } = data

      const audioBytes = Uint8Array.from(atob(audio_base64), c => c.charCodeAt(0))
      const responseAudioBlob = new Blob([audioBytes], { type: 'audio/wav' })
      const audioUrl = URL.createObjectURL(responseAudioBlob)

      const audio = new Audio(audioUrl)
      audio.play().catch(err => {
        console.error('Error playing audio:', err)
      })

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
      }

      responseAudioRef.current = audio

      setMessages(prev => [
        ...prev,
        { type: 'user', text: user_text },
        { type: 'assistant', text: assistant_text }
      ])

    } catch (err) {
      console.error('Error sending audio:', err)
      setError(err.message || 'Failed to process audio. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const sendTextMessage = async (text) => {
    if (!text.trim()) return

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/chat/text?text=${encodeURIComponent(text)}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()

      setMessages(prev => [
        ...prev,
        { type: 'user', text },
        { type: 'assistant', text: data.response }
      ])

    } catch (err) {
      console.error('Error sending text:', err)
      setError(err.message || 'Failed to send message. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>Bangla NLP</h1>
        <p>{language === 'bn' ? 'বাংলা ভয়েস চ্যাট' : 'Voice Chat'}</p>

        <div className="language-toggle">
          <span className={language === 'bn' ? 'active' : ''}>বাংলা</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={language === 'en'}
              onChange={(e) => setLanguage(e.target.checked ? 'en' : 'bn')}
            />
            <span className="slider"></span>
          </label>
          <span className={language === 'en' ? 'active' : ''}>English</span>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="welcome-message">
            {language === 'bn' ? (
              <>
                <p>👋 স্বাগতম! আপনার প্রশ্ন জিজ্ঞাসা করুন।</p>
                <p>🎤 মাইক্রোফোন বোতামে ক্লিক করে কথা বলুন অথবা নিচে টেক্সট লিখুন।</p>
              </>
            ) : (
              <>
                <p>👋 Welcome! Ask your questions.</p>
                <p>🎤 Click the microphone button to speak or type below.</p>
              </>
            )}
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}`}>
            <div className="message-content">
              {msg.text}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="message assistant">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="chat-input">
        <div className="input-group">
          <input
            type="text"
            placeholder={language === 'bn' ? 'টেক্সট লিখুন...' : 'Type text...'}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                sendTextMessage(e.target.value)
                e.target.value = ''
              }
            }}
            disabled={isProcessing || isRecording}
            className="text-input"
          />
          <button
            onClick={() => {
              const input = document.querySelector('.text-input')
              if (input.value) {
                sendTextMessage(input.value)
                input.value = ''
              }
            }}
            disabled={isProcessing || isRecording}
            className="send-button"
          >
            {language === 'bn' ? 'পাঠান' : 'Send'}
          </button>
        </div>

        <button
          className={`record-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'disabled' : ''}`}
          onClick={() => {
            if (isRecording) {
              stopRecording()
            } else {
              startRecording()
            }
          }}
          disabled={isProcessing}
        >
          {isRecording ? (
            <>
              <span className="pulse"></span>
              <span>Stop</span>
            </>
          ) : (
            <>
              <span className="mic-icon">🎤</span>
              <span>Start</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default ChatPage
