import { useState, useRef, useEffect } from 'react'
import './ObjectsPage.css'

const API_BASE_URL = import.meta.env.DEV ? '/api' : 'http://localhost:8000'

function ObjectsPage() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [language, setLanguage] = useState('bn')
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [capturedImage, setCapturedImage] = useState(null)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const responseAudioRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)

  const getLanguageCode = () => {
    return language === 'en' ? 'en-US' : 'bn-BD'
  }

  // Initialize camera when component mounts
  useEffect(() => {
    if (isCameraOn) {
      startCamera()
    }

    // Cleanup on unmount
    return () => {
      stopCamera()
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (responseAudioRef.current) {
        responseAudioRef.current.pause()
        responseAudioRef.current = null
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('Camera access denied. Please allow camera access.')
      setIsCameraOn(false)
    }
  }

  const stopCamera = () => {
    // Stop all video tracks
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks()
      tracks.forEach(track => {
        track.stop()
      })
      streamRef.current = null
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const captureFrame = () => {
    if (!videoRef.current || !isCameraOn) {
      return null
    }

    // Create a canvas to capture the video frame
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert canvas to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob)
      }, 'image/jpeg', 0.95)
    })
  }

  const startRecording = async () => {
    try {
      setError(null)

      // Capture frame from camera first
      const imageBlob = await captureFrame()
      if (!imageBlob) {
        setError('Please turn on the camera first.')
        return
      }
      setCapturedImage(imageBlob)

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
        await sendAudioToBackend(audioBlob, imageBlob)

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

  const sendAudioToBackend = async (audioBlob, imageBlob) => {
    setIsProcessing(true)
    setError(null)

    try {
      const formData = new FormData()
      const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' })
      const imageFile = new File([imageBlob], 'image.jpg', { type: 'image/jpeg' })

      formData.append('audio', audioFile)
      formData.append('image', imageFile)
      formData.append('language_code', getLanguageCode())

      const response = await fetch(`${API_BASE_URL}/objects/detect`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to process request')
      }

      const data = await response.json()
      const { audio_base64 } = data

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

    } catch (err) {
      console.error('Error sending data:', err)
      setError(err.message || 'Failed to process request. Please try again.')
    } finally {
      setIsProcessing(false)
      setCapturedImage(null)
    }
  }

  return (
    <div className="objects-page">
      <div className="objects-container">
        <div className="camera-section">
          <div className="camera-header">
            <h1>Identify Objects</h1>
            <p>{language === 'bn' ? 'বস্তু সনাক্তকরণ' : 'Show an object and ask'}</p>
            <div className="toggles-container">
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

              <div className="camera-toggle">
                <span className={!isCameraOn ? 'active' : ''}>📷 Off</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={isCameraOn}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setIsCameraOn(true)
                        startCamera()
                      } else {
                        stopCamera()
                        setIsCameraOn(false)
                      }
                    }}
                  />
                  <span className="slider"></span>
                </label>
                <span className={isCameraOn ? 'active' : ''}>📹 On</span>
              </div>
            </div>
          </div>

          <div className="camera-view">
            {isCameraOn ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="video-feed"
              />
            ) : (
              <div className="camera-off-message">
                <p>📷</p>
                <p>Camera is off</p>
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="voice-controls">
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default ObjectsPage
