import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ChatPage from './pages/ChatPage'
import ObjectsPage from './pages/ObjectsPage'
import LessonPage from './pages/LessonPage'
import LessonsListPage from './pages/LessonsListPage'
import './App.css'

// Wrapper to extract ID and pass props
function LessonPageWrapper({ language, setLanguage }) {
  const { topicId } = useParams()
  return <LessonPage topic={topicId} language={language} setLanguage={setLanguage} />
}

function App() {
  // Global state for language
  const [language, setLanguage] = useState('bn')

  return (
    <Router>
      <div className="app">
        <Sidebar />
        <div className="main-content">
          <Routes>
            {/* Pass language props to all pages */}
            <Route 
              path="/" 
              element={<ChatPage language={language} setLanguage={setLanguage} />} 
            />
            <Route 
              path="/objects" 
              element={<ObjectsPage language={language} setLanguage={setLanguage} />} 
            />
            <Route 
              path="/lessons" 
              element={<LessonsListPage language={language} setLanguage={setLanguage} />} 
            />
            <Route 
              path="/lesson/:topicId" 
              element={<LessonPageWrapper language={language} setLanguage={setLanguage} />} 
            />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App