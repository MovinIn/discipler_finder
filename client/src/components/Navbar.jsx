import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FaChevronDown } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../context/ProfileContext'
import './Navbar.css'

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isHomeDropdownOpen, setIsHomeDropdownOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { isLoggedIn, logout, user } = useAuth()
  const { clearProfile } = useProfile()
  const dropdownRef = useRef(null)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
    setIsHomeDropdownOpen(false)
  }

  const isActive = (path) => {
    if (path === '/chat') {
      // Chat route can have optional chatId, so check if path starts with /chat
      return location.pathname.startsWith('/chat') ? 'active' : ''
    }
    return location.pathname === path ? 'active' : ''
  }

  const isHomeSectionActive = () => {
    const homePaths = ['/', '/purpose', '/partnerships', '/download']
    return homePaths.includes(location.pathname)
  }

  const handleSignOut = async () => {
    // Get user data from localStorage
    const storedUser = localStorage.getItem('user')
    const storedSessionId = localStorage.getItem('session_id')
    
    // Call signout API directly
    if (storedUser && storedSessionId) {
      try {
        const parsedUser = JSON.parse(storedUser)
        const userId = parsedUser?.profile?.id || parsedUser?.id
        
        if (userId) {
          const formData = new URLSearchParams()
          formData.append('action', 'signout')
          formData.append('id', userId.toString())
          formData.append('session_id', storedSessionId)
          
          await fetch('http://localhost:8080/api', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString()
          })
        }
      } catch (error) {
        console.error('Signout API error:', error)
      }
    }
    
    // Call the logout function to clear local state
    await logout()
    clearProfile()
    navigate('/')
    closeMenu()
  }

  const toggleHomeDropdown = () => {
    setIsHomeDropdownOpen(!isHomeDropdownOpen)
  }

  const closeHomeDropdown = () => {
    setIsHomeDropdownOpen(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsHomeDropdownOpen(false)
      }
    }

    if (isHomeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isHomeDropdownOpen])

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          Discipler Finder
        </Link>
        
        <button 
          className={`hamburger ${isMenuOpen ? 'active' : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <ul className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}>
          {isLoggedIn ? (
            <li className="navbar-item dropdown-item" ref={dropdownRef}>
              <div
                className={`navbar-link dropdown-toggle ${isHomeSectionActive() ? 'active' : ''}`}
                onMouseEnter={() => !isMenuOpen && setIsHomeDropdownOpen(true)}
                onMouseLeave={() => !isMenuOpen && setIsHomeDropdownOpen(false)}
              >
                <Link
                  to="/"
                  onClick={() => {
                    closeMenu()
                    closeHomeDropdown()
                  }}
                  className="dropdown-home-link"
                >
                  Home
                </Link>
                <button
                  className="dropdown-arrow-btn"
                  onClick={(e) => {
                    e.preventDefault()
                    toggleHomeDropdown()
                  }}
                  onMouseEnter={(e) => {
                    e.stopPropagation()
                    if (!isMenuOpen) setIsHomeDropdownOpen(true)
                  }}
                >
                  <FaChevronDown className="dropdown-icon" />
                </button>
              </div>
              <ul
                className={`dropdown-menu ${isHomeDropdownOpen ? 'open' : ''}`}
                onMouseEnter={() => !isMenuOpen && setIsHomeDropdownOpen(true)}
                onMouseLeave={() => !isMenuOpen && setIsHomeDropdownOpen(false)}
              >
                <li>
                  <Link
                    to="/"
                    className={`dropdown-link ${isActive('/')}`}
                    onClick={() => {
                      closeMenu()
                      closeHomeDropdown()
                    }}
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    to="/purpose"
                    className={`dropdown-link ${isActive('/purpose')}`}
                    onClick={() => {
                      closeMenu()
                      closeHomeDropdown()
                    }}
                  >
                    Purpose
                  </Link>
                </li>
                <li>
                  <Link
                    to="/partnerships"
                    className={`dropdown-link ${isActive('/partnerships')}`}
                    onClick={() => {
                      closeMenu()
                      closeHomeDropdown()
                    }}
                  >
                    Partnerships
                  </Link>
                </li>
                <li>
                  <Link
                    to="/download"
                    className={`dropdown-link ${isActive('/download')}`}
                    onClick={() => {
                      closeMenu()
                      closeHomeDropdown()
                    }}
                  >
                    Download App
                  </Link>
                </li>
              </ul>
            </li>
          ) : (
            <>
              <li className="navbar-item">
                <Link
                  to="/"
                  className={`navbar-link ${isActive('/')}`}
                  onClick={closeMenu}
                >
                  Home
                </Link>
              </li>
              <li className="navbar-item">
                <Link
                  to="/purpose"
                  className={`navbar-link ${isActive('/purpose')}`}
                  onClick={closeMenu}
                >
                  Purpose
                </Link>
              </li>
              <li className="navbar-item">
                <Link
                  to="/partnerships"
                  className={`navbar-link ${isActive('/partnerships')}`}
                  onClick={closeMenu}
                >
                  Partnerships
                </Link>
              </li>
              <li className="navbar-item">
                <Link
                  to="/download"
                  className={`navbar-link ${isActive('/download')}`}
                  onClick={closeMenu}
                >
                  Download App
                </Link>
              </li>
            </>
          )}
          {isLoggedIn && (
            <>
              <li className="navbar-item">
                <Link
                  to="/matchmaking"
                  className={`navbar-link ${isActive('/matchmaking')}`}
                  onClick={closeMenu}
                >
                  Matchmaking
                </Link>
              </li>
              <li className="navbar-item">
                <Link
                  to="/get-started"
                  className={`navbar-link ${isActive('/get-started')}`}
                  onClick={closeMenu}
                >
                  Get Started
                </Link>
              </li>
              <li className="navbar-item">
                <Link
                  to="/profile"
                  className={`navbar-link ${isActive('/profile')}`}
                  onClick={closeMenu}
                >
                  Profile
                </Link>
              </li>
              <li className="navbar-item">
                <Link
                  to="/sent-requests"
                  className={`navbar-link ${isActive('/sent-requests')}`}
                  onClick={closeMenu}
                >
                  Sent Requests
                </Link>
              </li>
              <li className="navbar-item">
                <Link
                  to="/posts"
                  className={`navbar-link ${isActive('/posts')}`}
                  onClick={closeMenu}
                >
                  Posts
                </Link>
              </li>
              <li className="navbar-item">
                <Link
                  to="/chat"
                  className={`navbar-link ${isActive('/chat')}`}
                  onClick={closeMenu}
                >
                  Chat
                </Link>
              </li>
            </>
          )}
          <li className="navbar-item navbar-item-right">
            {isLoggedIn ? (
              <button
                type="button"
                className="navbar-link sign-out-btn"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            ) : (
              <Link
                to="/login"
                className={`navbar-link ${isActive('/login')}`}
                onClick={closeMenu}
              >
                Login/Create Account
              </Link>
            )}
          </li>
        </ul>
      </div>
    </nav>
  )
}

export default Navbar
