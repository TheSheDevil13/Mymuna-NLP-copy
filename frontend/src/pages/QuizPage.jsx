import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import './LessonPage.css' // Using standard app styles

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
            color: "#667eea", // App Theme Blue
            bg: "#f0f2ff"
        };
    }
    if (percentage >= 80) {
        return { 
            msg: language === 'bn' ? "🎉 দারুণ করেছ! তুমি পাঠটি খুব ভালো বুঝেছ। 🎉" : "🎉 Great Job! You understood the lesson well. 🎉", 
            color: "#4CAF50", // Success Green
            bg: "#E8F5E9"
        };
    }
    if (percentage >= 50) {
        return { 
            msg: language === 'bn' ? "🙂 ভালো করেছ! আরেকটু পড়লে আরও ভালো করবে। 🙂" : "🙂 Good Try! Reading the lesson again will help. 🙂", 
            color: "#764ba2", // App Theme Purple
            bg: "#f3eafa"
        };
    }
    return { 
        msg: language === 'bn' ? "🌱 চিন্তা করো না! চলো আবার পাঠটি পড়ি। 🌱" : "🌱 Don't worry! Let's read the lesson again. 🌱", 
        color: "#e74c3c", // Error Red
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
        {/* Standard Theme Border Radius and Shadow */}
        <div className="lesson-section">
          
          {/* Standard Header (Purple Gradient) */}
          <div className="lesson-header">
            <h1>{language === 'bn' ? 'মজার কুইজ' : 'Fun Quiz'}</h1>
            <p>{topicId.replace('_', ' ').toUpperCase()}</p>
          </div>

          <div className="lesson-view" style={{
            flexDirection: 'column', 
            padding: '30px', 
            justifyContent: 'flex-start',
            minHeight: '500px',
            background: 'white' // Ensure white background
          }}>
            {!showResult ? (
              <>
                {/* Progress Bar (App Theme Color) */}
                <div style={{width: '100%', maxWidth: '600px', height: '8px', background: '#eee', borderRadius: '10px', marginBottom: '30px'}}>
                    <div style={{
                        width: `${((currentQ + 1) / questions.length) * 100}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)', // App Theme Gradient
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
                        bgColor = '#d4edda'; borderColor = '#28a745'; textColor = '#155724'; // Green
                      } else {
                        bgColor = '#f8d7da'; borderColor = '#dc3545'; textColor = '#721c24'; // Red
                      }
                    } else if (selectedOption && opt === correctAns) {
                       bgColor = '#d4edda'; borderColor = '#28a745'; textColor = '#155724'; // Reveal correct
                    }

                    return (
                      <button 
                        key={idx}
                        onClick={() => handleOptionClick(opt)}
                        style={{
                          padding: '18px 25px',
                          fontSize: '1.2rem',
                          borderRadius: '50px', // Standard rounded pills
                          border: `2px solid ${selectedOption ? borderColor : 'transparent'}`, // Hide border initially for cleaner look
                          background: selectedOption && (selectedOption === opt || opt === correctAns) ? bgColor : '#f8f9fa', // Light grey default like inputs
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
                
                {feedback && (
                  <div style={{
                      fontSize: '1.5rem', 
                      marginTop: '30px', 
                      fontWeight: 'bold',
                      color: feedback === 'correct' ? '#28a745' : '#dc3545',
                      animation: 'fadeIn 0.3s'
                  }}>
                    {feedback === 'correct' ? (language === 'bn' ? '✅ সঠিক!' : '✅ Correct!') : (language === 'bn' ? '❌ ভুল!' : '❌ Incorrect')}
                  </div>
                )}
              </>
            ) : (
              // Result View
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
                        onClick={() => { setShowResult(false); setCurrentQ(0); setScore(0); setSelectedOption(null); setFeedback(null); }}
                        className="voice-button" // Uses standard app button style
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