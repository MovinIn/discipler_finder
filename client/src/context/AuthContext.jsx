import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { signoutOnce } from '../services/apiService'
import { setCookie, getCookie, deleteCookie } from '../utils/cookies'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const fetchInitiated = useRef(false)

  // Check for existing session on mount
  useEffect(() => {
    // Prevent duplicate calls (e.g., from React StrictMode)
    if (fetchInitiated.current) {
      return
    }
    fetchInitiated.current = true

    const storedSession = getCookie('session_id')
    if (storedSession) {
      // Fetch user data from server using session_id
      const fetchUser = async () => {
        try {
          const formData = new URLSearchParams()
          formData.append('action', 'get_user')
          formData.append('session_id', storedSession)

          const response = await fetch('/api', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString()
          })

          if (response.status >= 200 && response.status < 300) {
            const userData = await response.json()
            setUser(userData)
            setIsLoggedIn(true)
          } else {
            // Invalid session, clear cookie
            deleteCookie('session_id')
          }
        } catch (e) {
          // Error fetching user, clear cookie
          deleteCookie('session_id')
        } finally {
          setLoading(false)
        }
      }
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    try {
      const formData = new URLSearchParams()
      formData.append('action', 'login')
      formData.append('email', email)
      formData.append('password', password)

      const response = await fetch('/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      })

      const result = await response.json()

      // Check HTTP status code: 2xx = success, anything else = error
      if (response.status >= 200 && response.status < 300) {
        setUser(result)
        setIsLoggedIn(true)
        setCookie('session_id', result.session_id)
        return { success: true }
      } else {
        // Error response - extract error message from JSON
        return { success: false, error: result.message || 'Login failed' }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const createAccount = async (email, password, name, dob, gender, church) => {
    try {
      const formData = new URLSearchParams()
      formData.append('action', 'create_account')
      formData.append('email', email)
      formData.append('password', password)
      formData.append('name', name)
      formData.append('dob', dob)
      formData.append('gender', gender)
      formData.append('church', church)

      const response = await fetch('/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      })

      const result = await response.json()

      // Check HTTP status code: 2xx = success, anything else = error
      if (response.status >= 200 && response.status < 300) {
        return { success: true, message: result.message || 'Account created successfully' }
      } else {
        // Error response - extract error message from JSON
        return { success: false, error: result.message || 'Account creation failed' }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }


  const logout = async () => {
    // Get user ID from user state
    let userId = null
    if (user?.profile?.id) {
      userId = user.profile.id
    } else if (user?.id) {
      userId = user.id
    }

    const storedSessionId = getCookie('session_id')

    // Call signout (deduplication handled in apiService)
    if (storedSessionId && userId) {
      await signoutOnce(userId, storedSessionId)
    }

    // Close chat websocket before clearing user state
    if (window.disconnectChatWebSocket) {
      window.disconnectChatWebSocket()
    }

    // Always clear local state
    setIsLoggedIn(false)
    setUser(null)
    deleteCookie('session_id')
  }

  return (
    <AuthContext.Provider value={{ 
      isLoggedIn, 
      user,
      loading,
      login, 
      logout, 
      createAccount
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

