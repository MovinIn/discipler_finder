import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaComments, FaUser } from 'react-icons/fa'
import { useChat } from '../context/ChatContext'
import { useAuth } from '../context/AuthContext'
import './Relationships.css'

const API_BASE_URL = '/api'

function Relationships() {
  const navigate = useNavigate()
  const { addChat, getChatByUserId } = useChat()
  const { user, isLoggedIn, loading: authLoading } = useAuth()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  const getRelationshipType = (type) => {
    // Map type from API ('M', 'D', 'A') to relationship type string
    if (type === 'M') {
      return 'Disciple'
    } else if (type === 'D') {
      return 'Mentor'
    } else if (type === 'A') {
      return 'Accountability Partner'
    }
    return 'Mentor' // Default
  }

  const fetchMatches = useCallback(async () => {
    if (!user || !user.profile || !user.session_id) {
      setLoading(false)
      return
    }

    try {
      const formData = new URLSearchParams()
      formData.append('action', 'get_matches')
      formData.append('id', user.profile.id)
      formData.append('session_id', user.session_id)

      const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      })

      if (response.status >= 200 && response.status < 300) {
        const matchesData = await response.json()
        // Transform API response to match structure
        const transformedMatches = matchesData.map(match => ({
          id: match.profile.id,
          userId: match.profile.id,
          name: match.profile.name,
          email: match.profile.email,
          type: match.type,
          relationshipType: getRelationshipType(match.type),
        }))
        setMatches(transformedMatches)
      }
    } catch (error) {
      console.error('Error fetching matches:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  const handleChatClick = async (userId) => {
    // Check if chat exists, if not create it
    const existingChat = getChatByUserId(userId)
    if (existingChat) {
      // Use the existing chat's id for navigation
      navigate(`/chat/${existingChat.id}`)
    } else {
      // Create new chat in database
      const match = matches.find(m => m.userId === userId)
      if (match && user && user.profile && user.session_id) {
        try {
          console.log('Creating chat for users:', user.profile.id, 'and', userId)
          const createFormData = new URLSearchParams()
          createFormData.append('action', 'create_chat')
          createFormData.append('id', user.profile.id)
          createFormData.append('session_id', user.session_id)
          createFormData.append('requestee_id', userId)

          const createResponse = await fetch(`${API_BASE_URL}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: createFormData.toString()
          })

          if (createResponse.status >= 200 && createResponse.status < 300) {
            const createResult = await createResponse.json()
            const chatId = createResult.chat_id

            // Create local chat object with real chat ID
            const newChat = {
              id: chatId,
              userId: match.userId,
              userName: match.name,
              userEmail: match.email,
              lastMessage: 'Chat started',
              lastMessageTime: 'Just now',
              unreadCount: 0,
              relationshipType: match.relationshipType
            }
            addChat(newChat)
            // Navigate using the real chat's id
            navigate(`/chat/${chatId}`)
          } else {
            console.error('Failed to create chat')
          }
        } catch (error) {
          console.error('Error creating chat:', error)
        }
      }
    }
  }

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="relationships-page">
        <div className="relationships-container">
          <h1>Relationships</h1>
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

  if (loading) {
    return (
      <div className="relationships-page">
        <div className="relationships-container">
          <h1>Relationships</h1>
          <p>Loading relationships...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relationships-page">
      <div className="relationships-container">
        <h1>Relationships</h1>
        <p className="page-description">
          View your active relationships and connect with your mentors, disciples, and accountability partners.
        </p>

        {matches.length === 0 ? (
          <div className="empty-state">
            <p>You don't have any active relationships yet.</p>
          </div>
        ) : (
          <div className="relationships-grid">
            {matches.map((match) => (
              <div key={match.id} className="relationship-card">
                <div className="relationship-content">
                  <div className="relationship-header">
                    <div className="relationship-avatar">
                      <FaUser />
                    </div>
                    <div className="relationship-info">
                      <h3 className="relationship-name">{match.name}</h3>
                      <p className="relationship-email">{match.email}</p>
                    </div>
                  </div>
                  
                  <div className="relationship-details">
                    <p className="relationship-type">
                      <span className="type-label">{match.relationshipLabel}</span>
                    </p>
                    <p className="relationship-category">
                      Relationship Type: <span className="type-value">{match.relationshipType}</span>
                    </p>
                  </div>
                </div>

                <button
                  className="chat-icon-btn"
                  onClick={() => handleChatClick(match.userId)}
                  title="Open chat"
                >
                  <FaComments />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Relationships
