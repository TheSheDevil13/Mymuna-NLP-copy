import { Nav } from 'react-bootstrap'
import { Link, useLocation } from 'react-router-dom'
import './Sidebar.css'

function Sidebar() {
  const location = useLocation()

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Mymuna NLP</h3>
      </div>
      <Nav className="flex-column sidebar-nav">
        <Nav.Link
          as={Link}
          to="/"
          className={location.pathname === '/' ? 'active' : ''}
        >
          <i className="bi bi-chat-dots"></i>
          <span>Chat</span>
        </Nav.Link>
        <Nav.Link
          as={Link}
          to="/objects"
          className={location.pathname === '/objects' ? 'active' : ''}
        >
          <i className="bi bi-camera-video"></i>
          <span>Objects</span>
        </Nav.Link>
        <Nav.Link
          as={Link}
          to="/lessons"
          className={location.pathname.startsWith('/lesson') ? 'active' : ''}
        >
          <i className="bi bi-book"></i>
          <span>Lessons</span>
        </Nav.Link>
      </Nav>
    </div>
  )
}

export default Sidebar