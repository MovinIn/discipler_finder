import { useNavigate } from 'react-router-dom'
import { FaComments, FaUser } from 'react-icons/fa'
import { useProfile } from '../context/ProfileContext'
import { useChat } from '../context/ChatContext'
import { useRequests } from '../context/RequestsContext'
import { useAuth } from '../context/AuthContext'
import './SentRequests.css'

function SentRequests() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const { addChat, getChatByUserId } = useChat()
  const { sentRequests, loading } = useRequests()
  const { user, isLoggedIn, loading: authLoading } = useAuth()

  const getRelationshipType = () => {
    // Based on user's own preference when they sent the request
    // If user wants to disciple, they're requesting to be a Mentor
    // If user wants to be discipled, they're requesting to be a Disciple
    // If user wants accountability, they're requesting to be an Accountability Partner
    if (profile.preference === 'disciple') {
      return 'Mentor'
    } else if (profile.preference === 'be-discipled') {
      return 'Disciple'
    } else if (profile.preference === 'accountability') {
      return 'Accountability Partner'
    }
    return 'Mentor' // Default
  }

  const handleChatClick = async (userId) => {
    // Check if chat exists, if not create it
    const existingChat = getChatByUserId(userId)
    if (existingChat) {
      // Use the existing chat's id for navigation
      navigate(`/chat/${existingChat.id}`)
    } else {
      // Create new chat in database
      const request = sentRequests.find(r => r.userId === userId)
      if (request && user && user.profile && user.session_id) {
        try {
          console.log('Creating chat for users:', user.profile.id, 'and', userId)
          const createFormData = new URLSearchParams()
          createFormData.append('action', 'create_chat')
          createFormData.append('id', user.profile.id)
          createFormData.append('session_id', user.session_id)
          createFormData.append('requestee_id', userId)

          const createResponse = await fetch(`http://localhost:8080/api`, {
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
              userId: request.userId,
              userName: request.name,
              userEmail: request.email,
              lastMessage: 'Chat started',
              lastMessageTime: 'Just now',
              unreadCount: 0,
              relationshipType: getRelationshipType()
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
      <div className="sent-requests-page">
        <div className="sent-requests-container">
          <h1>Sent Requests</h1>
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
      <div className="sent-requests-page">
        <div className="sent-requests-container">
          <h1>Sent Requests</h1>
          <p>Loading sent requests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="sent-requests-page">
      <div className="sent-requests-container">
        <h1>Sent Requests</h1>
        <p className="page-description">
          View the requests you've sent to connect with others.
        </p>

        {sentRequests.length === 0 ? (
          <div className="empty-state">
            <p>You haven't sent any requests yet.</p>
          </div>
        ) : (
          <div className="requests-grid">
            {sentRequests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-content">
                  <div className="request-header">
                    <div className="request-avatar">
                      <FaUser />
                    </div>
                    <div className="request-info">
                      <h3 className="request-name">{request.name}</h3>
                      <p className="request-email">{request.email}</p>
                    </div>
                  </div>
                  
                  <div className="request-details">
                    <p className="relationship-type">
                      You requested to be {getRelationshipType().startsWith('A') ? 'an' : 'a'} <span className="type-value">{getRelationshipType()}</span>
                    </p>
                    {request.message && (
                      <div className="request-message">
                        <p className="message-label">Your message:</p>
                        <p className="message-text">{request.message}</p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  className="chat-icon-btn"
                  onClick={() => handleChatClick(request.userId)}
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

export default SentRequests

