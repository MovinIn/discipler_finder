import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const RequestsContext = createContext()
const API_BASE_URL = 'http://localhost:8080/api'

export function RequestsProvider({ children }) {
  const { user } = useAuth()
  const [sentRequests, setSentRequests] = useState([])
  const [receivedRequests, setReceivedRequests] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch sent requests from API
  useEffect(() => {
    const fetchSentRequests = async () => {
      if (!user || !user.profile || !user.session_id) {
        setLoading(false)
        return
      }

      try {
        const formData = new URLSearchParams()
        formData.append('action', 'get_sent_requests')
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
          const requestsData = await response.json()

          // Transform API response to match frontend structure
          const transformedRequests = requestsData.map(request => ({
            id: request.request_id,
            userId: request.profile.id,
            name: request.profile.name,
            email: request.profile.email,
            type: request.type,
            message: request.message || '',
            requested_at: request.requested_at
          }))

          setSentRequests(transformedRequests)
        } else {
          console.error('Failed to fetch sent requests:', response.status)
        }
      } catch (error) {
        console.error('Error fetching sent requests:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSentRequests()
  }, [user])

  // Fetch received requests from API
  useEffect(() => {
    const fetchReceivedRequests = async () => {
      if (!user || !user.profile || !user.session_id) {
        setLoading(false)
        return
      }

      try {
        const formData = new URLSearchParams()
        formData.append('action', 'get_received_requests')
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
          const requestsData = await response.json()

          // Transform API response to match frontend structure
          const transformedRequests = requestsData.map(request => ({
            id: request.request_id,
            userId: request.profile.id,
            name: request.profile.name,
            email: request.profile.email,
            type: request.type,
            message: request.message || '',
            requested_at: request.requested_at
          }))

          setReceivedRequests(transformedRequests)
        } else {
          console.error('Failed to fetch received requests')
        }
      } catch (error) {
        console.error('Error fetching received requests:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReceivedRequests()
  }, [user])

  const addSentRequest = (request) => {
    setSentRequests(prev => [...prev, request])
  }

  const removeSentRequest = (requestId) => {
    setSentRequests(prev => prev.filter(r => r.id !== requestId))
  }

  const addReceivedRequest = (request) => {
    setReceivedRequests(prev => [...prev, request])
  }

  const removeReceivedRequest = (requestId) => {
    setReceivedRequests(prev => prev.filter(r => r.id !== requestId))
  }

  return (
    <RequestsContext.Provider value={{
      sentRequests,
      receivedRequests,
      loading,
      addSentRequest,
      removeSentRequest,
      addReceivedRequest,
      removeReceivedRequest
    }}>
      {children}
    </RequestsContext.Provider>
  )
}

export function useRequests() {
  return useContext(RequestsContext)
}

