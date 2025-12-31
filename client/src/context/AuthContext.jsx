import { createContext, useContext, useState, useEffect } from 'react'
import { signoutOnce } from '../services/apiService'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const storedSession = localStorage.getItem('session_id')
    if (storedUser && storedSession) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
        setIsLoggedIn(true)
      } catch (e) {
        localStorage.removeItem('user')
        localStorage.removeItem('session_id')
      }
    }
    setLoading(false)
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
        localStorage.setItem('user', JSON.stringify(result))
        localStorage.setItem('session_id', result.session_id)
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
    // Get user ID from multiple possible locations
    let userId = null
    if (user?.profile?.id) {
      userId = user.profile.id
    } else if (user?.id) {
      userId = user.id
    } else {
      // Try to get from localStorage as fallback
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser)
          userId = parsedUser?.profile?.id || parsedUser?.id
        } catch (e) {
          // Error parsing stored user - continue with logout
        }
      }
    }

    const storedSessionId = localStorage.getItem('session_id')

    // Call signout (deduplication handled in apiService)
    if (storedSessionId && userId) {
      await signoutOnce(userId, storedSessionId)
    }

    // Always clear local state
    setIsLoggedIn(false)
    setUser(null)
    localStorage.removeItem('user')
    localStorage.removeItem('session_id')
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

