import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './LessonPage.css' // We can reuse the lesson styles

const API_BASE_URL = import.meta.env.DEV ? '/api' : 'http://localhost:8000'

// Receive language props
function LessonsListPage({ language, setLanguage }) {
  const [lessons, setLessons] = useState([])

  useEffect(() => {
    fetch(`${API_BASE_URL}/lessons`)
      .then(res => res.json())
      .then(data => setLessons(data))
      .catch(err => console.error("Failed to load lessons", err))
  }, [])

  return (
    <div className="lesson-page">
      <div className="lesson-container">
        <div className="lesson-section">
          <div className="lesson-header">
            <h1>{language === 'bn' ? 'পাঠ নির্বাচন করুন' : 'Select a Lesson'}</h1>
            <p>{language === 'bn' ? 'আপনার পছন্দের বিষয় বেছে নিন' : 'Choose your favorite topic'}</p>
            
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
                  to={`/lesson/${lesson.id}`} 
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
                    textAlign: 'center'
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
                    <span style={{ fontSize: '2.5rem', marginBottom: '15px' }}>📚</span>
                    <h3 style={{ 
                      margin: 0, 
                      color: '#333', 
                      fontSize: '1.2rem',
                      fontWeight: '600'
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