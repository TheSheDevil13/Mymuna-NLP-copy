import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import './LessonPage.css' 

const API_BASE_URL = import.meta.env.DEV ? '/api' : 'http://localhost:8000'

function QuizPage({ language }) {
  const { topicId } = useParams()
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [score, setScore] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [quizStarted, setQuizStarted] = useState(false)
  
  // Refs for managing audio and race conditions
  const audioRef = useRef(null)
  const timerRef = useRef(null)
  const audioRequestId = useRef(0) // New ref to track active audio request

  // Fetch Questions
  useEffect(() => {
    setLoading(true)
    fetch(`${API_BASE_URL}/lesson/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: topicId })
    })
    .then(res => {
      if (!res.ok) throw new Error("Quiz not found")
      return res.json()
    })
    .then(data => {
      setQuestions(data)
      setLoading(false)
    })
    .catch(err => {
      console.error(err)
      setError("Quiz not available for this lesson.")
      setLoading(false)
    })
  }, [topicId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  // --- ROBUST AUDIO PLAYER HELPER ---
  const playAudio = async (text) => {
    if (!text) return;

    // 1. Generate a new ID for this request
    const currentRequestId = ++audioRequestId.current;

    // 2. Stop any currently playing audio immediately
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }

    try {
        const langCode = language === 'bn' ? 'bn-BD' : 'en-US';
        const response = await fetch(`${API_BASE_URL}/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, language_code: langCode })
        });

        if (!response.ok) throw new Error('TTS failed');

        // 3. CHECK FOR STALE REQUEST: 
        // If the user clicked something else while we were fetching, 
        // audioRequestId.current will be different. Stop here.
        if (currentRequestId !== audioRequestId.current) return;

        const data = await response.json();
        const audioBytes = Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0));
        const audioBlob = new Blob([audioBytes], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // 4. Double check before playing (just in case)
        if (currentRequestId !== audioRequestId.current) return;

        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.play().catch(e => console.error("Audio play failed", e));
        
        audio.onended = () => URL.revokeObjectURL(audioUrl);

    } catch (err) {
        console.error("TTS Error:", err);
    }
  }

  // --- RECOMMENDATION LOGIC ---
  const getRecommendation = () => {
    const percentage = (score / questions.length) * 100
    
    if (percentage === 100) {
        return { 
            msg: language === 'bn' ? "🌟 অসাধারণ! পরবর্তী পাঠে যাও।" : "🌟 Amazing! Move to the next lesson.", 
            audioMsg: language === 'bn' ? "অসাধারণ! তুমি সুপারস্টার! তুমি এখন অন্য কুইজ বা পরবর্তী পাঠে যেতে পারো।" : "Amazing! You are a Superstar! You should try other quizzes now.",
            color: "#667eea", 
            bg: "#f0f2ff",
            actionType: 'next'
        };
    }
    if (percentage >= 80) {
        return { 
            msg: language === 'bn' ? "🎉 দারুণ! অন্য কুইজ চেষ্টা করো।" : "🎉 Great Job! Try other quizzes.", 
            audioMsg: language === 'bn' ? "দারুণ করেছ! তুমি খুব ভালো বুঝেছ। চলো অন্য কুইজ খেলি।" : "Great Job! You understood well. Let's try other quizzes.",
            color: "#4CAF50", 
            bg: "#E8F5E9",
            actionType: 'next'
        };
    }
    if (percentage >= 50) {
        return { 
            msg: language === 'bn' ? "🙂 ভালো করেছ! আরেকটু পড়লে ভালো করবে।" : "🙂 Good Try! Reading the lesson again will help.", 
            audioMsg: language === 'bn' ? "ভালো করেছ! তবে পাঠটি আরেকবার পড়লে আরও ভালো করবে।" : "Good Try! Reading the lesson again will help you improve.",
            color: "#764ba2", 
            bg: "#f3eafa",
            actionType: 'review'
        };
    }
    return { 
        msg: language === 'bn' ? "🌱 চিন্তা করো না! চলো আবার পাঠটি পড়ি।" : "🌱 Don't worry! Let's read the lesson again.", 
        audioMsg: language === 'bn' ? "চিন্তা করো না! চলো আমরা আবার পাঠটি পড়ি।" : "Don't worry! Let's go back and read the lesson again.",
        color: "#e74c3c", 
        bg: "#fdeaea",
        actionType: 'review'
    };
  }

  // --- EFFECT: MANAGE AUDIO FLOW ---
  useEffect(() => {
    if (!quizStarted || questions.length === 0) return;

    let timeoutId;

    const runAudioSequence = async () => {
        if (showResult) {
            // CASE 1: Result Screen
            timeoutId = setTimeout(() => {
                const rec = getRecommendation();
                playAudio(rec.audioMsg);
            }, 500);
        } else {
            // CASE 2: Question Screen
            const q = questions[currentQ];
            const textToRead = language === 'bn' ? q.question_bn : q.question_en;
            timeoutId = setTimeout(() => playAudio(textToRead), 500);
        }
    };

    runAudioSequence();

    return () => clearTimeout(timeoutId);
  }, [currentQ, quizStarted, showResult, questions, language]);


  // --- HANDLE ANSWER ---
  const handleOptionClick = (option) => {
    if (selectedOption) return; 

    setSelectedOption(option);
    
    const correctKey = language === 'bn' ? 'correct_answer_bn' : 'correct_answer_en';
    const isCorrect = option === questions[currentQ][correctKey];

    let feedbackText = "";
    
    if (isCorrect) {
      setScore(score + 1);
      setFeedback('correct');
      feedbackText = language === 'bn' ? "সঠিক উত্তর!" : "That's correct!";
    } else {
      setFeedback('incorrect');
      feedbackText = language === 'bn' ? "ভুল উত্তর।" : "That's incorrect.";
    }

    // Play feedback (This increments requestId, effectively cancelling any pending question audio)
    playAudio(feedbackText);

    timerRef.current = setTimeout(() => {
      if (currentQ + 1 < questions.length) {
        setCurrentQ(currentQ + 1);
        setSelectedOption(null);
        setFeedback(null);
      } else {
        setShowResult(true);
      }
    }, 1500); 
  }

  if (loading) return (
    <div className="lesson-page">
      <div className="spinner" style={{width: '50px', height: '50px', borderWidth: '5px', borderColor: '#fff', borderTopColor: '#667eea'}}></div>
    </div>
  )

  if (error || !questions.length) return (
    <div className="lesson-page">
      <div className="error-message" style={{background: 'white', border: 'none', padding: '30px', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}}>
        <h3>⚠️ {error || "No questions found."}</h3>
        <Link to="/quizzes" style={{textDecoration: 'none', color: '#667eea', fontWeight: 'bold', marginTop: '10px', display: 'block'}}>
          &larr; Back to Quizzes
        </Link>
      </div>
    </div>
  )

  const q = questions[currentQ];
  const questionText = language === 'bn' ? q.question_bn : q.question_en;
  const options = language === 'bn' ? q.options_bn : q.options_en;
  const correctAns = language === 'bn' ? q.correct_answer_bn : q.correct_answer_en;
  const rec = showResult ? getRecommendation() : null;

  return (
    <div className="lesson-page">
      <div className="lesson-container">
        <div className="lesson-section">
          
          <div className="lesson-header">
            <h1>{language === 'bn' ? 'মজার কুইজ' : 'Fun Quiz'}</h1>
            <p>{topicId.replace('_', ' ').toUpperCase()}</p>
          </div>

          <div className="lesson-view" style={{
            flexDirection: 'column', 
            padding: '30px', 
            justifyContent: 'flex-start',
            minHeight: '500px',
            background: 'white'
          }}>
            {!quizStarted ? (
              // --- START SCREEN ---
              <div style={{
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%', 
                  marginTop: '50px'
              }}>
                <div style={{fontSize: '6rem', marginBottom: '20px', animation: 'bounce 2s infinite'}}>🧩</div>
                <h2 style={{color: '#333', marginBottom: '15px'}}>
                    {language === 'bn' ? 'তুমি কি প্রস্তুত?' : 'Are you ready?'}
                </h2>
                <p style={{fontSize: '1.2rem', color: '#666', marginBottom: '40px', textAlign: 'center'}}>
                    {language === 'bn' 
                        ? `${questions.length}টি প্রশ্ন আছে। শুরু করতে নিচের বাটনে ক্লিক করো!` 
                        : `There are ${questions.length} questions. Click the button below to start!`}
                </p>
                <button 
                    onClick={() => setQuizStarted(true)}
                    className="voice-button"
                    style={{padding: '15px 50px', fontSize: '1.5rem'}}
                >
                    {language === 'bn' ? 'শুরু করুন' : 'Start Quiz'}
                </button>
              </div>
            ) : !showResult ? (
              // --- QUESTION SCREEN ---
              <>
                <div style={{width: '100%', maxWidth: '600px', height: '8px', background: '#eee', borderRadius: '10px', marginBottom: '30px'}}>
                    <div style={{
                        width: `${((currentQ + 1) / questions.length) * 100}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)', 
                        borderRadius: '10px',
                        transition: 'width 0.5s ease'
                    }}></div>
                </div>

                <div style={{
                  fontSize: '1.6rem', 
                  fontWeight: '600', 
                  marginBottom: '30px', 
                  textAlign: 'center', 
                  color: '#2d3436',
                  lineHeight: '1.5'
                }}>
                  {currentQ + 1}. {questionText}
                </div>

                <div style={{display: 'grid', gap: '15px', width: '100%', maxWidth: '600px'}}>
                  {options.map((opt, idx) => {
                    let borderColor = '#e0e0e0';
                    let bgColor = 'white';
                    let textColor = '#333';
                    
                    if (selectedOption === opt) {
                      if (opt === correctAns) {
                        bgColor = '#d4edda'; borderColor = '#28a745'; textColor = '#155724'; 
                      } else {
                        bgColor = '#f8d7da'; borderColor = '#dc3545'; textColor = '#721c24'; 
                      }
                    } else if (selectedOption && opt === correctAns) {
                       bgColor = '#d4edda'; borderColor = '#28a745'; textColor = '#155724'; 
                    }

                    return (
                      <button 
                        key={idx}
                        onClick={() => handleOptionClick(opt)}
                        style={{
                          padding: '18px 25px',
                          fontSize: '1.2rem',
                          borderRadius: '50px', 
                          border: `2px solid ${selectedOption ? borderColor : 'transparent'}`, 
                          background: selectedOption && (selectedOption === opt || opt === correctAns) ? bgColor : '#f8f9fa', 
                          color: textColor,
                          cursor: selectedOption ? 'default' : 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: selectedOption === opt ? 'none' : '0 2px 5px rgba(0,0,0,0.05)',
                          textAlign: 'center',
                          fontWeight: '500'
                        }}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              // --- RESULT SCREEN ---
              <div style={{
                  textAlign: 'center', 
                  width: '100%', 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center'
              }}>
                <h2 style={{color: '#667eea', marginBottom: '10px'}}>{language === 'bn' ? 'তোমার স্কোর' : 'Your Score'}</h2>
                
                <div style={{
                    fontSize: '5rem', 
                    fontWeight: '800', 
                    color: '#333', 
                    marginBottom: '20px',
                }}>
                  <span style={{color: rec.color}}>{score}</span>
                  <span style={{color: '#ccc', fontSize: '3rem'}}>/</span>
                  <span style={{color: '#ccc', fontSize: '3rem'}}>{questions.length}</span>
                </div>

                <div style={{
                    padding: '30px', 
                    background: rec.bg, 
                    borderRadius: '15px',
                    marginBottom: '40px',
                    maxWidth: '600px',
                    borderLeft: `5px solid ${rec.color}`
                }}>
                  <p style={{fontSize: '1.4rem', fontWeight: '500', color: '#444', margin: 0}}>
                    {rec.msg}
                  </p>
                </div>
                
                <div style={{display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center'}}>
                    
                    {rec.actionType === 'review' ? (
                        <Link to={`/lesson/${topicId}`} style={{textDecoration: 'none'}}>
                            <button 
                                className="voice-button" 
                                style={{minWidth: '220px', padding: '15px 30px', fontSize: '1.1rem'}}
                            >
                            📖 {language === 'bn' ? 'পাঠটি পড়ো' : 'Read Lesson'}
                            </button>
                        </Link>
                    ) : (
                        <Link to="/quizzes" style={{textDecoration: 'none'}}>
                            <button 
                                className="voice-button" 
                                style={{minWidth: '220px', padding: '15px 30px', fontSize: '1.1rem'}}
                            >
                            🧩 {language === 'bn' ? 'অন্য কুইজ' : 'Other Quizzes'}
                            </button>
                        </Link>
                    )}

                    <button 
                        onClick={() => { setShowResult(false); setCurrentQ(0); setScore(0); setSelectedOption(null); setFeedback(null); setQuizStarted(false); }}
                        className="voice-button" 
                        style={{
                            minWidth: '200px', 
                            padding: '15px 30px', 
                            fontSize: '1.1rem',
                            background: 'white',
                            color: '#667eea',
                            border: '2px solid #667eea'
                        }}
                    >
                    🔄 {language === 'bn' ? 'আবার খেলো' : 'Play Again'}
                    </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuizPage