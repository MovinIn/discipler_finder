import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

const API_BASE_URL = '/api'

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const storedSession = localStorage.getItem('session_id')
    console.log('AuthContext useEffect - storedUser:', storedUser, 'storedSession:', storedSession)
    if (storedUser && storedSession) {
      try {
        const userData = JSON.parse(storedUser)
        console.log('Setting user data:', userData)
        setUser(userData)
        setIsLoggedIn(true)
        console.log('Auth state set - isLoggedIn: true')
      } catch (e) {
        console.log('Error parsing stored user data:', e)
        localStorage.removeItem('user')
        localStorage.removeItem('session_id')
      }
    } else {
      console.log('No stored user data found')
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    try {
      const formData = new URLSearchParams()
      formData.append('action', 'login')
      formData.append('email', email)
      formData.append('password', password)

      const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      })

      const result = await response.json()

      // Check HTTP status code: 2xx = success, anything else = error
      if (response.status >= 200 && response.status < 300) {
        console.log('Login successful - setting user:', result)
        setUser(result)
        setIsLoggedIn(true)
        localStorage.setItem('user', JSON.stringify(result))
        localStorage.setItem('session_id', result.session_id)
        console.log('Auth state after login - isLoggedIn: true, user:', result)
        return { success: true }
      } else {
        // Error response - extract error message from JSON
        console.log('Login failed - response:', result)
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

      const response = await fetch(`${API_BASE_URL}`, {
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
    console.log('=== LOGOUT CALLED ===')
    console.log('User object:', user)
    console.log('User type:', typeof user)
    console.log('User.profile:', user?.profile)
    console.log('User.profile.id:', user?.profile?.id)

    try {
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
            console.log('Got userId from localStorage:', userId)
          } catch (e) {
            console.error('Error parsing stored user:', e)
          }
        }
      }

      const storedSessionId = localStorage.getItem('session_id')
      console.log('Stored sessionId:', storedSessionId)
      console.log('Resolved userId:', userId)

      // Always try to call the signout API if we have a session ID
      if (storedSessionId && userId) {
        const formData = new URLSearchParams()
        formData.append('action', 'signout')
        formData.append('id', userId.toString())
        formData.append('session_id', storedSessionId)

        console.log('=== MAKING SIGNOUT POST REQUEST ===')
        console.log('URL:', API_BASE_URL)
        console.log('Form data:', formData.toString())

        const response = await fetch(`${API_BASE_URL}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString()
        })

        console.log('=== SIGNOUT RESPONSE ===')
        console.log('Status:', response.status)
        console.log('Status text:', response.statusText)
        
        if (response.ok) {
          const result = await response.json()
          console.log('Response JSON:', result)
        } else {
          const errorText = await response.text()
          console.error('Error response:', errorText)
        }
      } else {
        console.warn('=== SKIPPING API CALL ===')
        console.warn('Missing sessionId:', !storedSessionId)
        console.warn('Missing userId:', !userId)
      }
    } catch (error) {
      console.error('=== SIGNOUT API CALL FAILED ===')
      console.error('Error:', error)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      // Continue with local logout even if API call fails
    }

    // Always clear local state regardless of API call success
    console.log('=== CLEARING LOCAL AUTH STATE ===')
    setIsLoggedIn(false)
    setUser(null)
    localStorage.removeItem('user')
    localStorage.removeItem('session_id')
    console.log('=== LOGOUT COMPLETE ===')
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

