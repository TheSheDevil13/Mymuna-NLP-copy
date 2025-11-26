import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ChatPage from './pages/ChatPage'
import ObjectsPage from './pages/ObjectsPage'
import LessonPage from './pages/LessonPage'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/objects" element={<ObjectsPage />} />
            <Route path="/lesson/liberation-war" element={<LessonPage topic="liberation-war" />} />
            <Route path="/lesson/world-war-2" element={<LessonPage topic="world-war-2" />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
