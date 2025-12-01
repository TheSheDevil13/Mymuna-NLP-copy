import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './LessonPage.css' 

const API_BASE_URL = import.meta.env.DEV ? '/api' : 'http://localhost:8000'

// Added 'mode' prop with default value 'lesson'
function LessonsListPage({ language, setLanguage, mode = 'lesson' }) {
  const [lessons, setLessons] = useState([])

  useEffect(() => {
    fetch(`${API_BASE_URL}/lessons`)
      .then(res => res.json())
      .then(data => setLessons(data))
      .catch(err => console.error("Failed to load lessons", err))
  }, [])

  // Helper to get title based on mode
  const getPageTitle = () => {
    if (mode === 'quiz') {
      return language === 'bn' ? 'মজার কুইজ খেলুন' : 'Play Fun Quizzes'
    }
    return language === 'bn' ? 'পাঠ নির্বাচন করুন' : 'Select a Lesson'
  }

  const getPageSubtitle = () => {
    if (mode === 'quiz') {
      return language === 'bn' ? 'তোমার পছন্দের কুইজটি বেছে নাও' : 'Choose a quiz to play'
    }
    return language === 'bn' ? 'আপনার পছন্দের বিষয় বেছে নিন' : 'Choose your favorite topic'
  }

  return (
    <div className="lesson-page">
      <div className="lesson-container">
        <div className="lesson-section">
          <div className="lesson-header" style={mode === 'quiz' ? {background: 'linear-gradient(135deg, #FF9966 0%, #FF5E62 100%)'} : {}}>
            <h1>{getPageTitle()}</h1>
            <p>{getPageSubtitle()}</p>
            
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

          <div className="lesson-view" style={{ display: 'block', padding: '30px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
              {lessons.map(lesson => (
                <Link 
                  // Dynamically determine link destination based on mode
                  to={mode === 'quiz' ? `/quiz/${lesson.id}` : `/lesson/${lesson.id}`} 
                  key={lesson.id}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    background: 'white',
                    padding: '25px',
                    borderRadius: '15px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    border: mode === 'quiz' ? '2px solid #FF9966' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                  }}
                  >
                    <span style={{ fontSize: '3rem', marginBottom: '15px' }}>
                      {mode === 'quiz' ? '🧩' : '📚'}
                    </span>
                    <h3 style={{ 
                      margin: 0, 
                      color: '#333', 
                      fontSize: '1.3rem',
                      fontWeight: '700'
                    }}>
                      {language === 'bn' ? lesson.title_bn : lesson.title_en}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LessonsListPage