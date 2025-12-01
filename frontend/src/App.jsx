import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ChatPage from './pages/ChatPage'
import ObjectsPage from './pages/ObjectsPage'
import LessonPage from './pages/LessonPage'
import LessonsListPage from './pages/LessonsListPage'
import QuizPage from './pages/QuizPage' 
import './App.css'

// Wrapper to extract ID and pass props
function LessonPageWrapper({ language, setLanguage }) {
  const { topicId } = useParams()
  return <LessonPage topic={topicId} language={language} setLanguage={setLanguage} />
}

// Wrapper for Quiz Page
function QuizPageWrapper({ language }) {
  const { topicId } = useParams()
  return <QuizPage language={language} />
}

function App() {
  const [language, setLanguage] = useState('bn')

  return (
    <Router>
      <div className="app">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route 
              path="/" 
              element={<ChatPage language={language} setLanguage={setLanguage} />} 
            />
            <Route 
              path="/objects" 
              element={<ObjectsPage language={language} setLanguage={setLanguage} />} 
            />
            
            {/* Lesson Routes */}
            <Route 
              path="/lessons" 
              element={<LessonsListPage language={language} setLanguage={setLanguage} mode="lesson" />} 
            />
            <Route 
              path="/lesson/:topicId" 
              element={<LessonPageWrapper language={language} setLanguage={setLanguage} />} 
            />

            {/* NEW QUIZ ROUTES */}
            <Route 
              path="/quizzes" 
              element={<LessonsListPage language={language} setLanguage={setLanguage} mode="quiz" />} 
            />
            <Route 
              path="/quiz/:topicId" 
              element={<QuizPageWrapper language={language} />} 
            />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App