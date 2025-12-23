import { useNavigate } from 'react-router-dom'
import { FaComments, FaUser, FaCheck, FaTimes } from 'react-icons/fa'
import { useProfile } from '../context/ProfileContext'
import { useChat } from '../context/ChatContext'
import { useRequests } from '../context/RequestsContext'
import './ReceivedRequests.css'

function ReceivedRequests() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const { addChat, getChatByUserId } = useChat()
  const { receivedRequests, removeReceivedRequest } = useRequests()
  const requests = receivedRequests

  const getRelationshipType = (requestPreference) => {
    if (requestPreference === 'be-discipled') {
      return 'Mentor'
    } else if (requestPreference === 'disciple') {
      return 'Disciple'
    } else {
      return 'Accountability Partner'
    }
  }

  const handleAccept = (request) => {
    // Check if chat already exists
    const existingChat = getChatByUserId(request.userId)
    
    if (!existingChat) {
      // Add chat when accepted (only if it doesn't exist)
      const newChat = {
        id: request.userId,
        userId: request.userId,
        userName: request.name,
        userEmail: request.email,
        lastMessage: 'Chat started',
        lastMessageTime: 'Just now',
        unreadCount: 0,
        relationshipType: request.relationshipType
      }
      addChat(newChat)
    }
    
    // Remove from received requests
    removeReceivedRequest(request.id)
    
    // Navigate to chat
    navigate(`/chat/${request.userId}`)
  }

  const handleReject = (requestId) => {
    removeReceivedRequest(requestId)
  }

  const handleChatClick = (userId) => {
    // Check if chat exists, if not create it
    const existingChat = getChatByUserId(userId)
    if (!existingChat) {
      const request = requests.find(r => r.userId === userId)
      if (request) {
        const newChat = {
          id: request.userId,
          userId: request.userId,
          userName: request.name,
          userEmail: request.email,
          lastMessage: 'Chat started',
          lastMessageTime: 'Just now',
          unreadCount: 0,
          relationshipType: request.relationshipType
        }
        addChat(newChat)
      }
    }
    navigate(`/chat/${userId}`)
  }

  return (
    <div className="received-requests-page">
      <div className="received-requests-container">
        <h1>Received Requests</h1>
        <p className="page-description">
          Manage requests from others who want to connect with you.
        </p>

        {requests.length === 0 ? (
          <div className="empty-state">
            <p>You don't have any pending requests.</p>
          </div>
        ) : (
          <div className="requests-grid">
            {requests.map((request) => (
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
                      Requested to be an <span className="type-value">{getRelationshipType(request.preference)}</span>
                    </p>
                    {request.message && (
                      <div className="request-message">
                        <p className="message-label">Their message:</p>
                        <p className="message-text">{request.message}</p>
                      </div>
                    )}
                  </div>

                  <div className="request-actions">
                    <button
                      className="accept-btn"
                      onClick={() => handleAccept(request)}
                    >
                      <FaCheck />
                      <span>Accept</span>
                    </button>
                    <button
                      className="reject-btn"
                      onClick={() => handleReject(request.id)}
                    >
                      <FaTimes />
                      <span>Reject</span>
                    </button>
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

export default ReceivedRequests

