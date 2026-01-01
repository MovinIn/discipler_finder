import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FaChevronDown } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../context/ProfileContext'
import { useNotifications } from '../context/NotificationsContext'
import './Navbar.css'

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isHomeDropdownOpen, setIsHomeDropdownOpen] = useState(false)
  const [isFeaturesDropdownOpen, setIsFeaturesDropdownOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { isLoggedIn, logout, user } = useAuth()
  const { clearProfile } = useProfile()
  const { unreadCount, isNotificationsTabActive } = useNotifications()
  const dropdownRef = useRef(null)
  const featuresDropdownRef = useRef(null)
  const isSigningOutRef = useRef(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
    setIsHomeDropdownOpen(false)
    setIsFeaturesDropdownOpen(false)
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

  const isFeaturesSectionActive = () => {
    const featuresPaths = ['/get-started', '/posts', '/relationships', '/sent-requests']
    return featuresPaths.includes(location.pathname)
  }

  const handleSignOut = async () => {
    // Prevent duplicate clicks
    if (isSigningOutRef.current) return
    isSigningOutRef.current = true

    try {
      // Call the logout function which handles both API call and local state clearing
      await logout()
      clearProfile()
      navigate('/')
      closeMenu()
    } finally {
      isSigningOutRef.current = false
    }
  }

  const toggleHomeDropdown = () => {
    setIsHomeDropdownOpen(!isHomeDropdownOpen)
  }

  const closeHomeDropdown = () => {
    setIsHomeDropdownOpen(false)
  }

  const toggleFeaturesDropdown = () => {
    setIsFeaturesDropdownOpen(!isFeaturesDropdownOpen)
  }

  const closeFeaturesDropdown = () => {
    setIsFeaturesDropdownOpen(false)
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsHomeDropdownOpen(false)
      }
      if (featuresDropdownRef.current && !featuresDropdownRef.current.contains(event.target)) {
        setIsFeaturesDropdownOpen(false)
      }
    }

    if (isHomeDropdownOpen || isFeaturesDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isHomeDropdownOpen, isFeaturesDropdownOpen])

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
            <>
            <li className="navbar-item dropdown-item" ref={dropdownRef}>
              <div
                className={`navbar-link dropdown-toggle ${isHomeSectionActive() ? 'active' : ''}`}
                onMouseEnter={() => !isMenuOpen && setIsHomeDropdownOpen(true)}
                onMouseLeave={() => !isMenuOpen && setIsHomeDropdownOpen(false)}
                onClick={(e) => {
                  if (isMenuOpen) {
                    e.preventDefault()
                    toggleHomeDropdown()
                  }
                }}
              >
                <Link
                  to="/"
                  onClick={(e) => {
                    if (isMenuOpen) {
                      e.preventDefault()
                      toggleHomeDropdown()
                    } else {
                      closeMenu()
                      closeHomeDropdown()
                    }
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
            <li className="navbar-item">
              <Link
                to="/profile"
                className={`navbar-link ${isActive('/profile')}`}
                onClick={closeMenu}
              >
                Profile
              </Link>
            </li>
            </>
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
              <li className="navbar-item dropdown-item" ref={featuresDropdownRef}>
                <div
                  className={`navbar-link dropdown-toggle ${isFeaturesSectionActive() ? 'active' : ''}`}
                  onMouseEnter={() => !isMenuOpen && setIsFeaturesDropdownOpen(true)}
                  onMouseLeave={() => !isMenuOpen && setIsFeaturesDropdownOpen(false)}
                  onClick={(e) => {
                    if (isMenuOpen) {
                      e.preventDefault()
                      toggleFeaturesDropdown()
                    }
                  }}
                >
                  <Link
                    to="/get-started"
                    onClick={(e) => {
                      if (isMenuOpen) {
                        e.preventDefault()
                        toggleFeaturesDropdown()
                      } else {
                        closeMenu()
                        closeFeaturesDropdown()
                      }
                    }}
                    className="dropdown-home-link"
                  >
                    Get Started
                  </Link>
                  <button
                    className="dropdown-arrow-btn"
                    onClick={(e) => {
                      e.preventDefault()
                      toggleFeaturesDropdown()
                    }}
                    onMouseEnter={(e) => {
                      e.stopPropagation()
                      if (!isMenuOpen) setIsFeaturesDropdownOpen(true)
                    }}
                  >
                    <FaChevronDown className="dropdown-icon" />
                  </button>
                </div>
                <ul
                  className={`dropdown-menu ${isFeaturesDropdownOpen ? 'open' : ''}`}
                  onMouseEnter={() => !isMenuOpen && setIsFeaturesDropdownOpen(true)}
                  onMouseLeave={() => !isMenuOpen && setIsFeaturesDropdownOpen(false)}
                >
                  <li>
                    <Link
                      to="/get-started"
                      className={`dropdown-link ${isActive('/get-started')}`}
                      onClick={() => {
                        closeMenu()
                        closeFeaturesDropdown()
                      }}
                    >
                      Get Started
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/posts"
                      className={`dropdown-link ${isActive('/posts')}`}
                      onClick={() => {
                        closeMenu()
                        closeFeaturesDropdown()
                      }}
                    >
                      Posts
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/relationships"
                      className={`dropdown-link ${isActive('/relationships')}`}
                      onClick={() => {
                        closeMenu()
                        closeFeaturesDropdown()
                      }}
                    >
                      Relationships
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/sent-requests"
                      className={`dropdown-link ${isActive('/sent-requests')}`}
                      onClick={() => {
                        closeMenu()
                        closeFeaturesDropdown()
                      }}
                    >
                      Sent Requests
                    </Link>
                  </li>
                </ul>
              </li>
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
                  to="/chat"
                  className={`navbar-link ${isActive('/chat')}`}
                  onClick={closeMenu}
                >
                  Chat
                </Link>
              </li>
              <li className="navbar-item">
                <Link
                  to="/notifications"
                  className={`navbar-link ${isActive('/notifications')}`}
                  onClick={closeMenu}
                >
                  Notifications
                  {!isNotificationsTabActive && unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                  )}
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
