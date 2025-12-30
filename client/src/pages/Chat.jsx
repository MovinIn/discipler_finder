import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaComments, FaUser, FaPaperPlane, FaChevronDown } from 'react-icons/fa'
import { useChat } from '../context/ChatContext'
import './Chat.css'

function Chat() {
  const { chatId } = useParams()
  const navigate = useNavigate()
  const { chats, messages, loading, typingUsers, sendMessage, markAsRead, loadOlderMessages, startTyping, stopTyping } = useChat()
  const [selectedChat, setSelectedChat] = useState(null)
  const [messageInput, setMessageInput] = useState('')
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true)
  const [allMessagesLoaded, setAllMessagesLoaded] = useState({})
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)

  useEffect(() => {
    if (chatId) {
      const chat = chats.find(c => c.id === parseInt(chatId)) || chats.find(c => c.userId === parseInt(chatId))
      if (chat) {
        setSelectedChat(chat)
        // Store the last selected chat ID in localStorage
        localStorage.setItem('lastSelectedChatId', chat.id.toString())
        // Reset all messages loaded state when switching chats
        setAllMessagesLoaded(prev => ({
          ...prev,
          [chat.id]: false
        }))
        // Don't auto-mark as read here - only when user clicks or receives messages
      }
    } else {
      // No specific chat ID in URL - check if we have a last selected chat
      const lastChatId = localStorage.getItem('lastSelectedChatId')
      if (lastChatId && chats.length > 0) {
        const lastChat = chats.find(c => c.id === parseInt(lastChatId))
        if (lastChat) {
          // Redirect to the last selected chat
          navigate(`/chat/${lastChatId}`, { replace: true })
          return
        }
      }
      setSelectedChat(null)
    }
  }, [chatId, chats, navigate])

  // Mark messages as read when new messages arrive for current chat
  useEffect(() => {
    if (selectedChat && messages[selectedChat.id]) {
      const chatMessages = messages[selectedChat.id]
      const hasUnreadMessages = chatMessages.some(msg => !msg.isRead && msg.senderId !== 'current')

      if (hasUnreadMessages) {
        markAsRead(selectedChat.id)
      }
    }
  }, [messages, selectedChat, markAsRead])

  // Scroll to bottom immediately when a chat is selected
  useEffect(() => {
    if (selectedChat && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' })
    }
  }, [selectedChat])

  // Scroll to bottom when messages change (only if user is already at bottom)
  useEffect(() => {
    if (messagesEndRef.current && isScrolledToBottom) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, selectedChat, isScrolledToBottom])

  // Handle typing indicators
  useEffect(() => {
    if (!selectedChat) return

    let typingTimeout

    const handleTyping = () => {
      startTyping(selectedChat.id)
      clearTimeout(typingTimeout)
      typingTimeout = setTimeout(() => {
        stopTyping(selectedChat.id)
      }, 1000) // Stop typing after 1 second of no input
    }

    const handleStopTyping = () => {
      clearTimeout(typingTimeout)
      stopTyping(selectedChat.id)
    }

    return () => {
      handleStopTyping()
    }
  }, [selectedChat, startTyping, stopTyping])

  // Handle scroll to load older messages
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container || !selectedChat) return

    const handleScroll = async () => {
      if (container.scrollTop === 0 && !loadingOlder && !allMessagesLoaded[selectedChat.id]) {
        const currentMessages = messages[selectedChat.id] || []
        if (currentMessages.length > 0) {
          const earliestMessage = currentMessages[0]
          setLoadingOlder(true)
          const olderMessages = await loadOlderMessages(selectedChat.id, earliestMessage.id)
          setLoadingOlder(false)

          // Check if no more older messages were loaded
          if (olderMessages.length === 0) {
            setAllMessagesLoaded(prev => ({
              ...prev,
              [selectedChat.id]: true
            }))
            return // Don't try to maintain scroll position if no messages were added
          }

          // Maintain scroll position after loading
          setTimeout(() => {
            if (container) {
              const firstMessage = container.querySelector('.message')
              if (firstMessage) {
                firstMessage.scrollIntoView()
              }
            }
          }, 100)
        }
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [selectedChat, messages, loadOlderMessages, loadingOlder, allMessagesLoaded])

  // Track if user is scrolled to bottom
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container || !selectedChat) return

    const handleScrollForBottom = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10 // 10px tolerance
      setIsScrolledToBottom(isAtBottom)
    }

    container.addEventListener('scroll', handleScrollForBottom)
    // Check initial state
    handleScrollForBottom()

    return () => container.removeEventListener('scroll', handleScrollForBottom)
  }, [selectedChat, messages])

  const handleChatSelect = (chat) => {
    navigate(`/chat/${chat.id}`)
    markAsRead(chat.id)
  }

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (messageInput.trim() && selectedChat && messageInput.length <= 2048) {
      sendMessage(selectedChat.id, messageInput.trim())
      setMessageInput('')
    } else if (messageInput.length > 2048) {
      alert('Message must be at most 2048 characters')
    }
  }

  const handleMessageInputChange = (e) => {
    const value = e.target.value
    if (value.length <= 2048) {
      setMessageInput(value)
    }
  }

  const currentMessages = selectedChat ? (messages[selectedChat.id] || []) : []

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-sidebar">
          <h2>Messages</h2>
          {loading ? (
            <div className="empty-chats">
              <p>Loading...</p>
            </div>
          ) : chats.length === 0 ? (
            <div className="empty-chats">
              <p>No conversations yet.</p>
            </div>
          ) : (
            <div className="chat-threads">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`chat-thread ${selectedChat?.id === chat.id ? 'active' : ''}`}
                  onClick={() => handleChatSelect(chat)}
                >
                  <div className="thread-avatar">
                    <FaUser />
                  </div>
                  <div className="thread-content">
                    <div className="thread-header">
                      <h4 className="thread-name">{chat.userName}</h4>
                      {chat.unreadCount > 0 && (
                        <span className="unread-badge">{chat.unreadCount}</span>
                      )}
                    </div>
                    <p className="thread-last-message">{chat.lastMessage}</p>
                    <span className="thread-time">{chat.lastMessageTime}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="chat-main">
          {selectedChat ? (
            <>
              <div className="chat-header">
                <div className="chat-header-info">
                  <div className="chat-header-avatar">
                    <FaUser />
                  </div>
                  <div>
                    <h3>{selectedChat.userName}</h3>
                  </div>
                </div>
              </div>

              <div className="chat-messages" ref={messagesContainerRef}>
                {loadingOlder && (
                  <div className="loading-older">
                    <p>Loading older messages...</p>
                  </div>
                )}
                {currentMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`message ${message.senderId === 'current' ? 'sent' : 'received'}`}
                  >
                    <div className="message-content">
                      <p>{message.text}</p>
                      <span className="message-time">{message.time}</span>
                    </div>
                  </div>
                ))}
                {selectedChat && typingUsers[selectedChat.id] && (
                  <div className="typing-indicator">
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <p>{selectedChat.userName} is typing...</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {!isScrolledToBottom && (
                <button
                  className="scroll-to-bottom-btn"
                  onClick={scrollToBottom}
                  title="Scroll to bottom"
                >
                  <FaChevronDown />
                </button>
              )}

              <form className="chat-input-form" onSubmit={handleSendMessage}>
                <div className="chat-input-wrapper">
                  <textarea
                    className="chat-input"
                    placeholder="Type a message... (max 2048 characters)"
                    value={messageInput}
                    onChange={handleMessageInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (e.shiftKey) {
                          // Shift+Enter: allow new line (default behavior)
                          if (selectedChat) {
                            startTyping(selectedChat.id)
                          }
                        } else {
                          // Enter: send message
                          e.preventDefault()
                          handleSendMessage(e)
                        }
                      } else {
                        // Other keys: handle typing indicator
                        if (selectedChat) {
                          startTyping(selectedChat.id)
                        }
                      }
                    }}
                    onKeyUp={(e) => {
                      if (selectedChat && e.key !== 'Enter') {
                        // Typing will be stopped by the useEffect timeout
                      }
                    }}
                    rows={1}
                    maxLength={2048}
                  />
                  <div className="message-length-indicator">
                    {messageInput.length}/2048
                  </div>
                </div>
                <button type="submit" className="send-btn" disabled={!messageInput.trim()}>
                  <FaPaperPlane />
                </button>
              </form>
            </>
          ) : (
            <div className="no-chat-selected">
              <FaComments className="no-chat-icon" />
              <p>Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Chat

