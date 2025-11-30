import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import './LessonPage.css'

const API_BASE_URL = import.meta.env.DEV ? '/api' : 'http://localhost:8000'

function LessonPage({ topic, language, setLanguage }) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  
  // Lesson States
  const [lessonStarted, setLessonStarted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false) // True = Interrupted (Resume), False = Finished (Next)
  
  const [currentLessonText, setCurrentLessonText] = useState('')
  const [lessonTitles, setLessonTitles] = useState(null)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const responseAudioRef = useRef(null)
  
  const textContainerRef = useRef(null)
  const scrollAnimationRef = useRef(null)

  const getLanguageCode = () => {
    return language === 'en' ? 'en-US' : 'bn-BD'
  }

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

  const getDisplayTitle = () => {
    if (lessonTitles) {
      return language === 'bn' ? lessonTitles.bn : lessonTitles.en
    }
    return topic ? topic.replace(/_/g, ' ').replace(/-/g, ' ').toUpperCase() : 'Lesson'
  }

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      stopAudioPlayback()
      cancelAnimationFrame(scrollAnimationRef.current)
    }
  }, [])

  // --- Auto-Scroll Logic ---
  const startAutoScroll = (audioElement) => {
    const container = textContainerRef.current
    if (!container || !audioElement) return

    const animate = () => {
      if (audioElement.paused || audioElement.ended) {
        cancelAnimationFrame(scrollAnimationRef.current)
        return
      }
      const duration = audioElement.duration
      const currentTime = audioElement.currentTime
      if (duration > 0) {
        const progress = currentTime / duration
        const maxScroll = container.scrollHeight - container.clientHeight
        if (maxScroll > 0) container.scrollTop = maxScroll * progress
      }
      scrollAnimationRef.current = requestAnimationFrame(animate)
    }
    cancelAnimationFrame(scrollAnimationRef.current)
    scrollAnimationRef.current = requestAnimationFrame(animate)
  }

  // --- Audio Handlers ---
  const stopAudioPlayback = () => {
    if (responseAudioRef.current) {
      responseAudioRef.current.pause()
    }
    cancelAnimationFrame(scrollAnimationRef.current)
    setIsPlaying(false)
    setIsPaused(true) // Mark as Paused (Interrupted)
  }

  const playResponseAudio = (audio_base64) => {
    if (responseAudioRef.current) responseAudioRef.current.pause()
    cancelAnimationFrame(scrollAnimationRef.current)

    const audioBytes = Uint8Array.from(atob(audio_base64), c => c.charCodeAt(0))
    const responseAudioBlob = new Blob([audioBytes], { type: 'audio/wav' })
    const audioUrl = URL.createObjectURL(responseAudioBlob)

    const audio = new Audio(audioUrl)
    
    audio.onplay = () => {
      setIsPlaying(true)
      setIsPaused(false)
      startAutoScroll(audio)
    }
    
    audio.onpause = () => {
      setIsPlaying(false)
      setIsPaused(true) // User paused it
      cancelAnimationFrame(scrollAnimationRef.current)
    }

    audio.onended = () => {
      setIsPlaying(false)
      setIsPaused(false) // Finished naturally (Ready for Next Part)
      cancelAnimationFrame(scrollAnimationRef.current)
      URL.revokeObjectURL(audioUrl)
    }

    audio.play().catch(err => {
      console.error('Error playing audio:', err)
      setIsPlaying(false)
    })

    responseAudioRef.current = audio
  }

  const resumeLesson = () => {
    if (responseAudioRef.current) {
      responseAudioRef.current.play()
    }
  }

  // --- API Calls ---

  const continueLesson = () => {
    // Send "Continue" text to backend to trigger next segment
    const text = language === 'bn' ? 'হ্যাঁ, দয়া করে চালিয়ে যান।' : 'Yes, please continue.'
    sendTextToBackend(text)
  }

  const startLesson = async () => {
    if (lessonStarted) return
    setIsProcessing(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/lesson/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic, language_code: getLanguageCode() }),
      })
      if (!response.ok) throw new Error('Failed to start lesson')
      
      const data = await response.json()
      handleResponse(data)
      setLessonStarted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const sendTextToBackend = async (text) => {
    setIsProcessing(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/lesson/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          topic: topic,
          language_code: getLanguageCode()
        })
      })
      if (!response.ok) throw new Error('Failed to send message')
      const data = await response.json()
      handleResponse(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const sendAudioToBackend = async (audioBlob) => {
    setIsProcessing(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('audio', new File([audioBlob], 'audio.webm', { type: 'audio/webm' }))
      formData.append('topic', topic)
      formData.append('language_code', getLanguageCode())

      const response = await fetch(`${API_BASE_URL}/lesson/audio`, {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) throw new Error('Failed to process audio')
      const data = await response.json()
      handleResponse(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleResponse = (data) => {
    // Handle text update
    const text = data.assistant_text || data.response
    if (text) {
      setCurrentLessonText(text)
      if (textContainerRef.current) textContainerRef.current.scrollTop = 0
    }
    // Handle audio update
    if (data.audio_base64) {
      playResponseAudio(data.audio_base64)
    }
  }

  // --- Recorder Controls ---
  const startRecording = async () => {
    try {
      setError(null)
      stopAudioPlayback()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000 } })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mediaRecorder.onstop = async () => {
        await sendAudioToBackend(new Blob(audioChunksRef.current, { type: 'audio/webm' }))
        stream.getTracks().forEach(track => track.stop())
      }
      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      setError('Microphone access denied.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  return (
    <div className="lesson-page">
      <div className="lesson-container">
        <div className="lesson-section">
          <div className="lesson-header">
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

          <div className="lesson-view" style={{ 
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            padding: '30px', overflow: 'hidden' 
          }}>
            {!lessonStarted ? (
              <div className="lesson-placeholder">
                <p style={{ fontSize: '5rem' }}>📚</p>
                <p>{language === 'bn' ? 'পাঠ শুরু করতে নিচের বাটনটি চাপুন' : 'Click start to begin the lesson'}</p>
              </div>
            ) : (
              <div className="lesson-content" style={{ width: '100%', maxWidth: '800px', height: '350px', display: 'flex', flexDirection: 'column' }}>
                <div 
                  ref={textContainerRef}
                  style={{
                    background: 'white', padding: '30px 40px', borderRadius: '20px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.08)', fontSize: '1.6rem', fontWeight: '600',
                    lineHeight: '1.8', color: '#2d3436', height: '100%', overflowY: 'auto',
                    scrollBehavior: 'auto', whiteSpace: 'pre-wrap', marginBottom: '20px',
                    border: '2px solid rgba(102, 126, 234, 0.1)'
                  }}
                >
                  {currentLessonText || (language === 'bn' ? 'পাঠ লোড হচ্ছে...' : 'Loading lesson...')}
                </div>
                <div style={{ color: '#636e72', fontSize: '1rem', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <span className={isPlaying ? "pulse" : ""} style={{
                    display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%',
                    background: isProcessing ? '#fdcb6e' : isPlaying ? '#00b894' : isRecording ? '#d63031' : '#b2bec3'
                  }}></span>
                  <span>
                    {isProcessing 
                      ? (language === 'bn' ? 'প্রসেসিং...' : 'Thinking...') 
                      : isPlaying 
                        ? (language === 'bn' ? 'পাঠ চলছে...' : 'Reading...')
                        : isRecording 
                          ? (language === 'bn' ? 'শুনছি...' : 'Listening...')
                          : isPaused 
                            ? (language === 'bn' ? 'বিরতি (চালিয়ে যেতে ক্লিক করুন)' : 'Paused (Click to resume)')
                            : (language === 'bn' ? 'শেষ হয়েছে (পরের অংশের জন্য ক্লিক করুন)' : 'Finished (Click for next part)')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="voice-controls" style={{ flexDirection: 'column', gap: '15px' }}>
            
            {/* BUTTON 1: Main Control */}
            {!lessonStarted ? (
              <button 
                className={`voice-button ${isProcessing ? 'disabled' : ''}`}
                onClick={startLesson} disabled={isProcessing}
              >
                {isProcessing ? (
                  <><span className="spinner"></span><span>Processing...</span></>
                ) : (
                  <><span>▶️</span><span>{language === 'bn' ? 'পাঠ শুরু করুন' : 'Start Lesson'}</span></>
                )}
              </button>
            ) : (
              <button 
                className={`voice-button ${isPlaying ? 'recording' : ''}`}
                // Logic: If Playing -> Stop. If Paused -> Resume. If Finished -> Continue (Next Part)
                onClick={isPlaying ? stopAudioPlayback : (isPaused ? resumeLesson : continueLesson)}
                disabled={isProcessing || isRecording}
              >
                {isPlaying ? (
                  <><span>⏸</span><span>{language === 'bn' ? 'থামান' : 'Interrupt Lesson'}</span></>
                ) : isPaused ? (
                  <><span>▶️</span><span>{language === 'bn' ? 'আবার চালু করুন' : 'Resume Lesson'}</span></>
                ) : (
                  <><span>⏭️</span><span>{language === 'bn' ? 'পরের অংশ' : 'Next Part / Continue'}</span></>
                )}
              </button>
            )}

            {/* BUTTON 2: Ask Question (Visible when NOT playing and NOT processing) */}
            {lessonStarted && !isPlaying && !isProcessing && (
              <button
                className={`voice-button ${isRecording ? 'recording' : ''}`}
                onClick={() => isRecording ? stopRecording() : startRecording()}
                style={{ background: isRecording ? undefined : '#4CAF50' }}
              >
                {isRecording ? (
                  <><span className="pulse"></span><span>{language === 'bn' ? 'রেকর্ডিং থামান' : 'Stop Recording'}</span></>
                ) : (
                  <><span className="mic-icon">🎤</span><span>{language === 'bn' ? 'প্রশ্ন করুন / উত্তর দিন' : 'Ask Question / Reply'}</span></>
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