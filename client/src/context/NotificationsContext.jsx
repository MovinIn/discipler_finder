import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useAuth } from './AuthContext'
import { useLocation } from 'react-router-dom'

const NotificationsContext = createContext()
const API_BASE_URL = '/api'

export function NotificationsProvider({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [isNotificationsTabActive, setIsNotificationsTabActive] = useState(false)

  // Check if notifications tab is active
  useEffect(() => {
    setIsNotificationsTabActive(location.pathname === '/notifications')
  }, [location.pathname])

  // Calculate unread notifications
  const unreadCount = useMemo(() => {
    if (!user || !user.profile || !user.profile.lastLoginAt || !notifications.length) {
      return 0
    }

    const lastLoginAt = new Date(user.profile.lastLoginAt)
    
    return notifications.filter(notification => {
      if (!notification.created_at) return false
      const createdAt = new Date(notification.created_at)
      return createdAt > lastLoginAt
    }).length
  }, [notifications, user])

  // Fetch notifications from API
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user || !user.profile || !user.session_id) {
        setLoading(false)
        setNotifications([])
        return
      }

      try {
        const formData = new URLSearchParams()
        formData.append('action', 'get_notifications')
        formData.append('id', user.profile.id.toString())
        formData.append('session_id', user.session_id)

        const response = await fetch(`${API_BASE_URL}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString()
        })

        if (response.status >= 200 && response.status < 300) {
          const notificationsData = await response.json()
          setNotifications(notificationsData)
        } else {
          console.error('Failed to fetch notifications:', response.status)
          setNotifications([])
        }
      } catch (error) {
        console.error('Error fetching notifications:', error)
        setNotifications([])
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [user])

  const refreshNotifications = async () => {
    if (!user || !user.profile || !user.session_id) {
      return
    }

    try {
      const formData = new URLSearchParams()
      formData.append('action', 'get_notifications')
      formData.append('id', user.profile.id.toString())
      formData.append('session_id', user.session_id)

      const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      })

      if (response.status >= 200 && response.status < 300) {
        const notificationsData = await response.json()
        setNotifications(notificationsData)
      }
    } catch (error) {
      console.error('Error refreshing notifications:', error)
    }
  }

  // Helper function to check if a notification is unread
  const isUnread = (notification) => {
    if (!user || !user.profile || !user.profile.lastLoginAt || !notification.created_at) {
      return false
    }
    const lastLoginAt = new Date(user.profile.lastLoginAt)
    const createdAt = new Date(notification.created_at)
    return createdAt > lastLoginAt
  }

  return (
    <NotificationsContext.Provider value={{
      notifications,
      loading,
      refreshNotifications,
      unreadCount,
      isNotificationsTabActive,
      isUnread
    }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationsContext)
}
