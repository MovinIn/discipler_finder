import { useNavigate } from 'react-router-dom'
import { FaComments, FaUser } from 'react-icons/fa'
import { useProfile } from '../context/ProfileContext'
import { useChat } from '../context/ChatContext'
import { useRequests } from '../context/RequestsContext'
import './SentRequests.css'

function SentRequests() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const { addChat, getChatByUserId } = useChat()
  const { sentRequests } = useRequests()

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

  const handleChatClick = (userId) => {
    // Check if chat exists, if not create it
    const existingChat = getChatByUserId(userId)
    if (!existingChat) {
      const request = sentRequests.find(r => r.userId === userId)
      if (request) {
        const newChat = {
          id: request.userId,
          userId: request.userId,
          userName: request.name,
          userEmail: request.email,
          lastMessage: 'Chat started',
          lastMessageTime: 'Just now',
          unreadCount: 0,
          relationshipType: getRelationshipType()
        }
        addChat(newChat)
      }
    }
    navigate(`/chat/${userId}`)
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
                      Requested to be an <span className="type-value">{getRelationshipType()}</span>
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

