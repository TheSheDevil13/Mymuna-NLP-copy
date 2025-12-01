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
  
  // State to track if quiz has started
  const [quizStarted, setQuizStarted] = useState(false)
  
  // Ref for managing audio playback
  const audioRef = useRef(null)

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

  // --- AUDIO LOGIC ---
  useEffect(() => {
    let isMounted = true; 

    const playAudio = async () => {
        // Only play if quiz has started and result is not shown
        if (questions.length === 0 || showResult || !quizStarted) return;

        const q = questions[currentQ];
        const textToRead = language === 'bn' ? q.question_bn : q.question_en;

        if (!textToRead) return;

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        try {
            const langCode = language === 'bn' ? 'bn-BD' : 'en-US';
            const response = await fetch(`${API_BASE_URL}/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToRead, language_code: langCode })
            });

            if (!response.ok) throw new Error('TTS failed');
            if (!isMounted) return; 

            const data = await response.json();
            const audioBytes = Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0));
            const audioBlob = new Blob([audioBytes], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);

            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            
            if (isMounted) {
                audio.play().catch(e => console.error("Audio play failed", e));
                audio.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                };
            }
        } catch (err) {
            console.error("TTS Error:", err);
        }
    };

    playAudio();
    
    return () => {
        isMounted = false; 
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };
  }, [currentQ, questions, language, showResult, quizStarted]);

  const handleOptionClick = (option) => {
    if (selectedOption) return;

    setSelectedOption(option);
    
    const correctKey = language === 'bn' ? 'correct_answer_bn' : 'correct_answer_en';
    const isCorrect = option === questions[currentQ][correctKey];

    if (isCorrect) {
      setScore(score + 1);
      setFeedback('correct');
    } else {
      setFeedback('incorrect');
    }

    if (audioRef.current) {
        audioRef.current.pause();
    }

    setTimeout(() => {
      if (currentQ + 1 < questions.length) {
        setCurrentQ(currentQ + 1);
        setSelectedOption(null);
        setFeedback(null);
      } else {
        setShowResult(true);
      }
    }, 1500);
  }

  const getRecommendation = () => {
    const percentage = (score / questions.length) * 100
    
    if (percentage === 100) {
        return { 
            msg: language === 'bn' ? "🌟 অসাধারণ! তুমি সুপারস্টার! 🌟" : "🌟 Amazing! You are a Superstar! 🌟", 
            color: "#667eea", 
            bg: "#f0f2ff"
        };
    }
    if (percentage >= 80) {
        return { 
            msg: language === 'bn' ? "🎉 দারুণ করেছ! তুমি পাঠটি খুব ভালো বুঝেছ। 🎉" : "🎉 Great Job! You understood the lesson well. 🎉", 
            color: "#4CAF50", 
            bg: "#E8F5E9"
        };
    }
    if (percentage >= 50) {
        return { 
            msg: language === 'bn' ? "🙂 ভালো করেছ! আরেকটু পড়লে আরও ভালো করবে। 🙂" : "🙂 Good Try! Reading the lesson again will help. 🙂", 
            color: "#764ba2", 
            bg: "#f3eafa"
        };
    }
    return { 
        msg: language === 'bn' ? "🌱 চিন্তা করো না! চলো আবার পাঠটি পড়ি। 🌱" : "🌱 Don't worry! Let's read the lesson again. 🌱", 
        color: "#e74c3c", 
        bg: "#fdeaea"
    };
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
                        onMouseEnter={(e) => {
                            if (!selectedOption) {
                                e.currentTarget.style.background = '#e9ecef';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!selectedOption) {
                                e.currentTarget.style.background = '#f8f9fa';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }
                        }}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
                
                {/* Feedback Text Removed Here */}
                
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
                  <span style={{color: getRecommendation().color}}>{score}</span>
                  <span style={{color: '#ccc', fontSize: '3rem'}}>/</span>
                  <span style={{color: '#ccc', fontSize: '3rem'}}>{questions.length}</span>
                </div>

                <div style={{
                    padding: '30px', 
                    background: getRecommendation().bg, 
                    borderRadius: '15px',
                    marginBottom: '40px',
                    maxWidth: '600px',
                    borderLeft: `5px solid ${getRecommendation().color}`
                }}>
                  <p style={{fontSize: '1.4rem', fontWeight: '500', color: '#444', margin: 0}}>
                    {getRecommendation().msg}
                  </p>
                </div>
                
                <div style={{display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center'}}>
                    <button 
                        onClick={() => { setShowResult(false); setCurrentQ(0); setScore(0); setSelectedOption(null); setFeedback(null); setQuizStarted(false); }}
                        className="voice-button" 
                        style={{minWidth: '200px', padding: '15px 30px', fontSize: '1.1rem'}}
                    >
                    🔄 {language === 'bn' ? 'আবার খেলো' : 'Play Again'}
                    </button>

                    <Link to="/quizzes" style={{textDecoration: 'none'}}>
                        <button 
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
                        ⬅️ {language === 'bn' ? 'অন্য কুইজ' : 'Other Quizzes'}
                        </button>
                    </Link>
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