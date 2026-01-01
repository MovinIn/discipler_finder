import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationsContext'
import { useAuth } from '../context/AuthContext'
import { FaBell } from 'react-icons/fa'
import './Notifications.css'

function Notifications() {
  const navigate = useNavigate()
  const { notifications, loading, refreshNotifications, isNotificationsTabActive, isUnread } = useNotifications()
  const { user, isLoggedIn, loading: authLoading } = useAuth()

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="notifications-page">
        <div className="notifications-container">
          <h1>Notifications</h1>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn || !user) {
    navigate('/login')
    return null
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    
    try {
      // Handle different timestamp formats (number, string, or object)
      let date
      if (typeof timestamp === 'number') {
        date = new Date(timestamp)
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp)
      } else if (timestamp && typeof timestamp === 'object' && timestamp.getTime) {
        // If it's already a Date object
        date = timestamp
      } else {
        // Try to parse as string
        date = new Date(timestamp)
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return ''
      }
      
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) {
        return 'Just now'
      } else if (diffMins < 60) {
        return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
      } else {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }
    } catch (error) {
      console.error('Error formatting date:', error)
      return ''
    }
  }

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="notifications-container">
          <h1>Notifications</h1>
          <p>Loading notifications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="notifications-page">
      <div className="notifications-container">
        <div className="notifications-header">
          <h1>Notifications</h1>
          <button 
            className="refresh-btn"
            onClick={refreshNotifications}
            title="Refresh notifications"
          >
            Refresh
          </button>
        </div>
        <p className="page-description">
          Stay updated with your latest notifications.
        </p>

        {notifications.length === 0 ? (
          <div className="empty-state">
            <FaBell className="empty-icon" />
            <p>You have no notifications at this time.</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification, index) => {
              const unread = isNotificationsTabActive && isUnread(notification)
              return (
                <div key={index} className="notification-item">
                  <div className="notification-icon-wrapper">
                    <div className="notification-icon">
                      <FaBell />
                    </div>
                    {unread && <div className="unread-indicator"></div>}
                  </div>
                  <div className="notification-content">
                    <p className="notification-message">{notification.message}</p>
                    <p className="notification-time">
                      {formatDate(notification.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Notifications
