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
          to="/lesson/liberation-war"
          className={location.pathname === '/lesson/liberation-war' ? 'active' : ''}
        >
          <i className="bi bi-book"></i>
          <span>Bangladesh Liberation War</span>
        </Nav.Link>
        <Nav.Link
          as={Link}
          to="/lesson/world-war-2"
          className={location.pathname === '/lesson/world-war-2' ? 'active' : ''}
        >
          <i className="bi bi-book"></i>
          <span>World War 2</span>
        </Nav.Link>
      </Nav>
    </div>
  )
}

export default Sidebar
