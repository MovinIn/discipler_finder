import { useState, useEffect } from 'react'
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

  useEffect(() => {
    const fetchPosts = async () => {
      if (!user || !user.profile || !user.profile.id) {
        setLoading(false)
        return
      }

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
  }, [user])

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

  const handleAccept = (request) => {
    const existingChat = getChatByUserId(request.userId)
    
    if (existingChat) {
      removeReceivedRequest(request.id)
      navigate(`/chat/${existingChat.id}`)
    } else {
      const newChat = {
        id: request.userId,
        userId: request.userId,
        userName: request.name,
        userEmail: request.email,
        lastMessage: 'Chat started',
        lastMessageTime: 'Just now',
        unreadCount: 0,
        relationshipType: getRelationshipType(request.type)
      }
      addChat(newChat)
      removeReceivedRequest(request.id)
      navigate(`/chat/${newChat.id}`)
    }
  }

  const handleReject = (requestId) => {
    removeReceivedRequest(requestId)
  }

  const handleChatClick = (userId) => {
    const existingChat = getChatByUserId(userId)
    if (existingChat) {
      navigate(`/chat/${existingChat.id}`)
    } else {
      const request = receivedRequests.find(r => r.userId === userId)
      if (request) {
        const newChat = {
          id: request.userId,
          userId: request.userId,
          userName: request.name,
          userEmail: request.email,
          lastMessage: 'Chat started',
          lastMessageTime: 'Just now',
          unreadCount: 0,
          relationshipType: getRelationshipType(request.type)
        }
        addChat(newChat)
        navigate(`/chat/${newChat.id}`)
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



