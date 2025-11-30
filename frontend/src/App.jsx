import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ChatPage from './pages/ChatPage'
import ObjectsPage from './pages/ObjectsPage'
import LessonPage from './pages/LessonPage'
import LessonsListPage from './pages/LessonsListPage'
import './App.css'

// Wrapper to extract ID from URL and pass to LessonPage
function LessonPageWrapper() {
  const { topicId } = useParams()
  return <LessonPage topic={topicId} />
}

function App() {
  return (
    <Router>
      <div className="app">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/objects" element={<ObjectsPage />} />
            <Route path="/lessons" element={<LessonsListPage />} />
            <Route path="/lesson/:topicId" element={<LessonPageWrapper />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App