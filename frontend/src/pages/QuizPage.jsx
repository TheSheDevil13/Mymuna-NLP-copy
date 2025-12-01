import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import './LessonPage.css' // Reusing lesson styles

const API_BASE_URL = import.meta.env.DEV ? '/api' : 'http://localhost:8000'

function QuizPage({ language }) {
  const { topicId } = useParams()
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [score, setScore] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)
  const [feedback, setFeedback] = useState(null) // 'correct' or 'incorrect'
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
    if (selectedOption) return; // Prevent double clicks

    setSelectedOption(option);
    
    // Determine keys based on language
    const correctKey = language === 'bn' ? 'correct_answer_bn' : 'correct_answer_en';
    const isCorrect = option === questions[currentQ][correctKey];

    if (isCorrect) {
      setScore(score + 1);
      setFeedback('correct');
    } else {
      setFeedback('incorrect');
    }

    // Auto-advance after 1.5 seconds
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
            color: "#FFD700",
            bg: "#FFF9C4"
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
            color: "#2196F3",
            bg: "#E3F2FD"
        };
    }
    return { 
        msg: language === 'bn' ? "🌱 চিন্তা করো না! চলো আবার পাঠটি পড়ি। 🌱" : "🌱 Don't worry! Let's read the lesson again. 🌱", 
        color: "#FF5722",
        bg: "#FFCCBC"
    };
  }

  if (loading) return (
    <div className="lesson-page">
      <div className="spinner" style={{width: '50px', height: '50px', borderWidth: '5px'}}></div>
    </div>
  )

  if (error || !questions.length) return (
    <div className="lesson-page">
      <div className="error-message">{error || "No questions found."}</div>
    </div>
  )

  // Dynamic Content based on language
  const q = questions[currentQ];
  const questionText = language === 'bn' ? q.question_bn : q.question_en;
  const options = language === 'bn' ? q.options_bn : q.options_en;
  const correctAns = language === 'bn' ? q.correct_answer_bn : q.correct_answer_en;

  return (
    <div className="lesson-page">
      <div className="lesson-container">
        <div className="lesson-section" style={{ border: '4px solid #FFAB91', borderRadius: '25px', overflow: 'hidden' }}>
          
          {/* Header */}
          <div className="lesson-header" style={{ background: 'linear-gradient(135deg, #FF9966 0%, #FF5E62 100%)', color: 'white' }}>
            <h1>🎈 {language === 'bn' ? 'মজার কুইজ' : 'Fun Quiz'} 🎈</h1>
            <p>{topicId.replace('_', ' ').toUpperCase()}</p>
          </div>

          <div className="lesson-view" style={{
            flexDirection: 'column', 
            padding: '30px', 
            justifyContent: 'flex-start',
            minHeight: '500px'
          }}>
            {!showResult ? (
              <>
                {/* Progress Bar */}
                <div style={{width: '100%', maxWidth: '600px', height: '10px', background: '#eee', borderRadius: '5px', marginBottom: '20px'}}>
                    <div style={{
                        width: `${((currentQ + 1) / questions.length) * 100}%`,
                        height: '100%',
                        background: '#FF9966',
                        borderRadius: '5px',
                        transition: 'width 0.5s ease'
                    }}></div>
                </div>

                <div style={{
                  fontSize: '1.8rem', 
                  fontWeight: 'bold', 
                  marginBottom: '30px', 
                  textAlign: 'center', 
                  color: '#2d3436',
                  lineHeight: '1.4'
                }}>
                  {currentQ + 1}. {questionText}
                </div>

                <div style={{display: 'grid', gap: '20px', width: '100%', maxWidth: '600px'}}>
                  {options.map((opt, idx) => {
                    let bgColor = 'white';
                    let borderColor = '#ffeaa7';
                    let scale = '1';
                    
                    if (selectedOption === opt) {
                      if (opt === correctAns) {
                        bgColor = '#d4edda'; borderColor = '#28a745'; // Green
                      } else {
                        bgColor = '#f8d7da'; borderColor = '#dc3545'; // Red
                      }
                      scale = '1.02';
                    } else if (selectedOption && opt === correctAns) {
                       bgColor = '#d4edda'; borderColor = '#28a745'; // Show correct if wrong picked
                    }

                    return (
                      <button 
                        key={idx}
                        onClick={() => handleOptionClick(opt)}
                        style={{
                          padding: '20px',
                          fontSize: '1.4rem',
                          borderRadius: '15px',
                          border: `3px solid ${selectedOption ? borderColor : '#ffeaa7'}`,
                          background: bgColor,
                          cursor: selectedOption ? 'default' : 'pointer',
                          transition: 'all 0.2s',
                          transform: `scale(${scale})`,
                          boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                          color: '#2d3436',
                          textAlign: 'center'
                        }}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
                
                {feedback && (
                  <div style={{
                      fontSize: '2rem', 
                      marginTop: '30px', 
                      fontWeight: 'bold',
                      color: feedback === 'correct' ? '#28a745' : '#dc3545',
                      animation: 'pulse 0.5s'
                  }}>
                    {feedback === 'correct' ? (language === 'bn' ? '✅ সঠিক!' : '✅ Correct!') : (language === 'bn' ? '❌ ভুল!' : '❌ Oops!')}
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
                <h2 style={{color: '#555', marginBottom: '20px'}}>{language === 'bn' ? 'তোমার স্কোর' : 'Your Score'}</h2>
                
                <div style={{
                    fontSize: '6rem', 
                    fontWeight: '900', 
                    color: getRecommendation().color, 
                    marginBottom: '20px',
                    textShadow: '2px 2px 0px rgba(0,0,0,0.1)'
                }}>
                  {score} / {questions.length}
                </div>

                <div style={{
                    padding: '30px', 
                    background: getRecommendation().bg, 
                    borderRadius: '20px',
                    marginBottom: '40px',
                    maxWidth: '600px',
                    border: `2px solid ${getRecommendation().color}`
                }}>
                  <p style={{fontSize: '1.8rem', fontWeight: 'bold', color: '#444', margin: 0}}>
                    {getRecommendation().msg}
                  </p>
                </div>
                
                <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center'}}>
                    <button 
                    onClick={() => { setShowResult(false); setCurrentQ(0); setScore(0); setSelectedOption(null); setFeedback(null); }}
                    style={{
                        padding: '15px 40px', fontSize: '1.3rem', borderRadius: '50px', 
                        background: '#FF9966', color: 'white', border: 'none', cursor: 'pointer',
                        fontWeight: '600', boxShadow: '0 5px 15px rgba(255, 153, 102, 0.4)'
                    }}
                    >
                    🔄 {language === 'bn' ? 'আবার খেলো' : 'Play Again'}
                    </button>

                    <Link to="/quizzes" style={{textDecoration: 'none'}}>
                        <button style={{
                            padding: '15px 40px', fontSize: '1.3rem', borderRadius: '50px', 
                            background: 'white', color: '#FF9966', border: '2px solid #FF9966', cursor: 'pointer',
                            fontWeight: '600'
                        }}>
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