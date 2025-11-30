import { useState, useRef, useEffect } from 'react'
import './LessonPage.css'

const API_BASE_URL = import.meta.env.DEV ? '/api' : 'http://localhost:8000'

function LessonPage({ topic, language, setLanguage }) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [lessonStarted, setLessonStarted] = useState(false)
  
  // New state to store the real titles
  const [lessonTitles, setLessonTitles] = useState(null)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const responseAudioRef = useRef(null)

  const getLanguageCode = () => {
    return language === 'en' ? 'en-US' : 'bn-BD'
  }

  // 1. Fetch the lesson list to find the correct title for this topic
  useEffect(() => {
    fetch(`${API_BASE_URL}/lessons`)
      .then(res => res.json())
      .then(data => {
        const currentLesson = data.find(l => l.id === topic)
        if (currentLesson) {
          setLessonTitles({
            en: currentLesson.title_en,
            bn: currentLesson.title_bn
          })
        }
      })
      .catch(err => console.error("Failed to load lesson details", err))
  }, [topic])

  // 2. Helper to display the correct title (or fallback to formatted ID)
  const getDisplayTitle = () => {
    if (lessonTitles) {
      return language === 'bn' ? lessonTitles.bn : lessonTitles.en
    }
    // Fallback: replace underscores/hyphens with spaces
    return topic.replace(/_/g, ' ').replace(/-/g, ' ').toUpperCase()
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

  const startLesson = async () => {
    if (lessonStarted) return
    
    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/lesson/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic,
          language_code: getLanguageCode(),
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to start lesson')
      }

      const data = await response.json()
      const audio_base64 = data.audio_base64

      if (audio_base64) {
        const audioBytes = Uint8Array.from(atob(audio_base64), c => c.charCodeAt(0))
        const responseAudioBlob = new Blob([audioBytes], { type: 'audio/wav' })
        const audioUrl = URL.createObjectURL(responseAudioBlob)

        const audio = new Audio(audioUrl)
        audio.play().catch(err => {
          console.error('Error playing audio:', err)
        })

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          setIsProcessing(false)
        }

        responseAudioRef.current = audio
      } else {
        setIsProcessing(false)
      }

      setLessonStarted(true)
    } catch (err) {
      console.error('Error starting lesson:', err)
      setError(err.message || 'Failed to start lesson. Please try again.')
      setIsProcessing(false)
    }
  }

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
      formData.append('topic', topic)
      formData.append('language_code', getLanguageCode())

      const response = await fetch(`${API_BASE_URL}/lesson/audio`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to process audio')
      }

      const data = await response.json()
      const { audio_base64 } = data

      if (audio_base64) {
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
      }

    } catch (err) {
      console.error('Error sending audio:', err)
      setError(err.message || 'Failed to process audio. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="lesson-page">
      <div className="lesson-container">
        <div className="lesson-section">
          <div className="lesson-header">
            {/* 3. Use the helper function here */}
            <h1>{getDisplayTitle()}</h1>
            <p>{language === 'bn' ? 'ইন্টারেক্টিভ পাঠ' : 'Interactive Lesson'}</p>
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

          <div className="lesson-view">
            <div className="lesson-placeholder">
              <p>📚</p>
              <p>{language === 'bn' ? 'পাঠ শুনুন এবং প্রশ্ন করুন' : 'Listen to the lesson and ask questions'}</p>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="voice-controls">
            {!lessonStarted ? (
              <button
                className={`voice-button ${isProcessing ? 'disabled' : ''}`}
                onClick={startLesson}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="spinner"></span>
                    <span>{language === 'bn' ? 'শুরু হচ্ছে...' : 'Starting...'}</span>
                  </>
                ) : (
                  <>
                    <span>📚</span>
                    <span>{language === 'bn' ? 'পাঠ শুরু করুন' : 'Start Lesson'}</span>
                  </>
                )}
              </button>
            ) : (
              <button
                className={`voice-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'disabled' : ''}`}
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
                    <span>{language === 'bn' ? 'থামান' : 'Stop Speaking'}</span>
                  </>
                ) : isProcessing ? (
                  <>
                    <span className="spinner"></span>
                    <span>{language === 'bn' ? 'প্রসেসিং...' : 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <span className="mic-icon">🎤</span>
                    <span>{language === 'bn' ? 'কথা বলুন' : 'Start Speaking'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LessonPage