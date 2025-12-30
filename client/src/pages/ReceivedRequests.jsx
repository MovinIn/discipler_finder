import { useNavigate } from 'react-router-dom'
import { FaComments, FaUser, FaCheck, FaTimes } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../context/ProfileContext'
import { useChat } from '../context/ChatContext'
import { useRequests } from '../context/RequestsContext'
import './ReceivedRequests.css'

function ReceivedRequests() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile()
  const { addChat, getChatByUserId } = useChat()
  const { receivedRequests, removeReceivedRequest, loading } = useRequests()
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

  const handleAccept = async (request) => {
    // First, accept the request in the backend
    if (user && user.profile && user.session_id) {
      try {
        const acceptFormData = new URLSearchParams()
        acceptFormData.append('action', 'accept_request')
        acceptFormData.append('id', user.profile.id)
        acceptFormData.append('session_id', user.session_id)
        acceptFormData.append('request_id', request.id)
        acceptFormData.append('requestee_id', request.userId)
        acceptFormData.append('type', request.type || 'A')

        const acceptResponse = await fetch(`http://localhost:8080/api`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: acceptFormData.toString()
        })

        if (acceptResponse.status === 404) {
          // Request not found - remove from UI
          removeReceivedRequest(request.id)
          return
        }

        if (acceptResponse.status >= 200 && acceptResponse.status < 300) {
          // Request accepted successfully
        } else {
          console.error('Failed to accept request')
          return
        }
      } catch (error) {
        console.error('Error accepting request:', error)
        return
      }
    }

    // Check if chat already exists
    const existingChat = getChatByUserId(request.userId)

    if (existingChat) {
      // Use existing chat's id for navigation
      removeReceivedRequest(request.id)
      navigate(`/chat/${existingChat.id}`)
    } else {
      // Create chat in database first
      if (user && user.profile && user.session_id) {
        try {
          const createFormData = new URLSearchParams()
          createFormData.append('action', 'create_chat')
          createFormData.append('id', user.profile.id)
          createFormData.append('session_id', user.session_id)
          createFormData.append('requestee_id', request.userId)

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

            // Add chat locally with real chat ID
            const newChat = {
              id: chatId,
              userId: request.userId,
              userName: request.name,
              userEmail: request.email,
              lastMessage: 'Chat started',
              lastMessageTime: 'Just now',
              unreadCount: 0,
              relationshipType: request.relationshipType
            }
            addChat(newChat)
            // Remove from received requests
            removeReceivedRequest(request.id)
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

  const handleReject = async (requestId) => {
    if (user && user.profile && user.session_id) {
      try {
        const rejectFormData = new URLSearchParams()
        rejectFormData.append('action', 'reject_request')
        rejectFormData.append('id', user.profile.id)
        rejectFormData.append('session_id', user.session_id)
        rejectFormData.append('request_id', requestId)

        const rejectResponse = await fetch(`http://localhost:8080/api`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: rejectFormData.toString()
        })

        // Remove from UI regardless of response (even if request not found)
        removeReceivedRequest(requestId)

        if (rejectResponse.status >= 200 && rejectResponse.status < 300) {
          // Request rejected successfully
        } else {
          console.error('Failed to reject request:', rejectResponse.status)
        }
      } catch (error) {
        console.error('Error rejecting request:', error)
        // Still remove from UI even if API call fails
        removeReceivedRequest(requestId)
      }
    } else {
      // Fallback: remove from UI if user not authenticated
      removeReceivedRequest(requestId)
    }
  }

  const handleChatClick = async (userId) => {
    // Check if chat exists, if not create it
    const existingChat = getChatByUserId(userId)
    if (existingChat) {
      // Use the existing chat's id for navigation
      navigate(`/chat/${existingChat.id}`)
    } else {
      // Create new chat in database
      const request = requests.find(r => r.userId === userId)
      if (request && user && user.profile && user.session_id) {
        try {
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
              relationshipType: request.relationshipType
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

  if (loading) {
    return (
      <div className="received-requests-page">
        <div className="received-requests-container">
          <h1>Received Requests</h1>
          <p>Loading received requests...</p>
        </div>
      </div>
    )
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

