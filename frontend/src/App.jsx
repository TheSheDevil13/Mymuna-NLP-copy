import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ChatPage from './pages/ChatPage'
import ObjectsPage from './pages/ObjectsPage'
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
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
