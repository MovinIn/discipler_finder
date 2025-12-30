import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaComments, FaUser, FaCheck, FaTimes } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'
import { useRequests } from '../context/RequestsContext'
import './Posts.css'

const API_BASE_URL = 'http://localhost:8080/api'

function Posts() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addChat, getChatByUserId } = useChat()
  const { receivedRequests, removeReceivedRequest } = useRequests()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPostType, setSelectedPostType] = useState(null)
  const lastFetchedUserIdRef = useRef(null)

  useEffect(() => {
    const fetchPosts = async () => {
      if (!user || !user.profile || !user.profile.id) {
        setLoading(false)
        return
      }

      // Prevent duplicate calls for the same user
      if (lastFetchedUserIdRef.current === user.profile.id) {
        setLoading(false)
        return
      }

      lastFetchedUserIdRef.current = user.profile.id

      try {
        const formData = new URLSearchParams()
        formData.append('action', 'get_posts')
        formData.append('id', user.profile.id.toString())
        formData.append('session_id', user.session_id || '')

        const response = await fetch(`${API_BASE_URL}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString()
        })

        if (response.ok) {
          const data = await response.json()
          setPosts(data)
          // Auto-select first post if available
          if (data.length > 0) {
            setSelectedPostType(data[0].type)
          }
        } else {
          console.error('Failed to fetch posts')
        }
      } catch (error) {
        console.error('Error fetching posts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [user?.profile?.id])

  // Filter received requests by selected post type
  const filteredRequests = selectedPostType
    ? receivedRequests.filter(request => request.type === selectedPostType)
    : []

  const getRelationshipType = (type) => {
    if (type === 'M') {
      return 'Mentor'
    } else if (type === 'D') {
      return 'Disciple'
    } else {
      return 'Accountability Partner'
    }
  }

  const handleAccept = async (request) => {
    if (!user || !user.profile || !user.session_id) {
      alert('You must be logged in to accept requests')
      return
    }

    try {
      // Call accept_request endpoint
      const acceptFormData = new URLSearchParams()
      acceptFormData.append('action', 'accept_request')
      acceptFormData.append('id', user.profile.id)
      acceptFormData.append('session_id', user.session_id)
      acceptFormData.append('request_id', request.id)
      acceptFormData.append('requestee_id', request.userId)
      acceptFormData.append('type', request.type)

      const acceptResponse = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: acceptFormData.toString()
      })

      if (acceptResponse.status >= 200 && acceptResponse.status < 300) {
        // Request accepted successfully, now create/handle chat
        const existingChat = getChatByUserId(request.userId)

        if (existingChat) {
          // Navigate to existing chat
          navigate(`/chat/${existingChat.id}`)
        } else {
          // Create chat locally and navigate
          try {
            const createFormData = new URLSearchParams()
            createFormData.append('action', 'create_chat')
            createFormData.append('id', user.profile.id)
            createFormData.append('session_id', user.session_id)
            createFormData.append('requestee_id', request.userId)

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

              // Add chat locally with real chat ID
              const newChat = {
                id: chatId,
                userId: request.userId,
                userName: request.name,
                userEmail: request.email,
                lastMessage: 'Chat started',
                lastMessageTime: 'Just now',
                unreadCount: 0,
                relationshipType: getRelationshipType(request.type)
              }
              addChat(newChat)
              // Navigate using the real chat's id
              navigate(`/chat/${chatId}`)
            } else {
              console.error('Failed to create chat after accepting request')
            }
          } catch (error) {
            console.error('Error creating chat after accepting request:', error)
          }
        }

        // Remove from received requests (locally)
        removeReceivedRequest(request.id)
      } else {
        const errorResult = await acceptResponse.json()
        alert(errorResult.message || 'Failed to accept request')
      }
    } catch (error) {
      console.error('Error accepting request:', error)
      alert('Failed to accept request. Please try again.')
    }
  }

  const handleReject = (requestId) => {
    removeReceivedRequest(requestId)
  }

  const handleChatClick = async (userId) => {
    const existingChat = getChatByUserId(userId)
    if (existingChat) {
      navigate(`/chat/${existingChat.id}`)
    } else {
      // Create new chat in database
      const request = receivedRequests.find(r => r.userId === userId)
      if (request && user && user.profile && user.session_id) {
        try {
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
              userId: request.userId,
              userName: request.name,
              userEmail: request.email,
              lastMessage: 'Chat started',
              lastMessageTime: 'Just now',
              unreadCount: 0,
              relationshipType: getRelationshipType(request.type)
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
      <div className="posts-page">
        <div className="posts-container">
          <h1>My Posts</h1>
          <p>Loading posts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="posts-page">
      <div className="posts-container">
        <h1>My Posts</h1>
        <p className="page-description">
          View your posts and manage requests from others who want to connect with you.
        </p>

        {posts.length === 0 ? (
          <div className="empty-state">
            <p>You don't have any posts yet. Create a post in the "Get Started" tab.</p>
          </div>
        ) : (
          <div className="posts-layout">
            <div className="posts-sidebar">
              <h2>Your Posts</h2>
              <div className="posts-list">
                {posts.map((post, index) => (
                  <div
                    key={index}
                    className={`post-item ${selectedPostType === post.type ? 'active' : ''}`}
                    onClick={() => setSelectedPostType(post.type)}
                  >
                    <h3>{getRelationshipType(post.type)}</h3>
                    {post.requirements && (
                      <p className="post-preview">
                        {post.requirements.substring(0, 50)}...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="posts-content">
              {selectedPostType ? (
                <>
                  <div className="post-details">
                    {posts.find(p => p.type === selectedPostType) && (
                      <>
                        <h2>{getRelationshipType(selectedPostType)} Post</h2>
                        {posts.find(p => p.type === selectedPostType).requirements && (
                          <div className="post-section">
                            <h3>What I'm Looking For</h3>
                            <p>{posts.find(p => p.type === selectedPostType).requirements}</p>
                          </div>
                        )}
                        {posts.find(p => p.type === selectedPostType).goals && (
                          <div className="post-section">
                            <h3>My Goals</h3>
                            <p>{posts.find(p => p.type === selectedPostType).goals}</p>
                          </div>
                        )}
                        {posts.find(p => p.type === selectedPostType).experience && (
                          <div className="post-section">
                            <h3>Experience</h3>
                            <p>{posts.find(p => p.type === selectedPostType).experience}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="requests-section">
                    <h2>Requests for This Post</h2>
                    {filteredRequests.length === 0 ? (
                      <div className="empty-state">
                        <p>No requests yet for this post.</p>
                      </div>
                    ) : (
                      <div className="requests-grid">
                        {filteredRequests.map((request) => (
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
                </>
              ) : (
                <div className="empty-state">
                  <p>Select a post to view details and requests.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Posts



