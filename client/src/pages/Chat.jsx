import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaComments, FaUser, FaPaperPlane } from 'react-icons/fa'
import { useChat } from '../context/ChatContext'
import './Chat.css'

function Chat() {
  const { chatId } = useParams()
  const navigate = useNavigate()
  const { chats, messages, loading, sendMessage, markAsRead, loadOlderMessages } = useChat()
  const [selectedChat, setSelectedChat] = useState(null)
  const [messageInput, setMessageInput] = useState('')
  const [loadingOlder, setLoadingOlder] = useState(false)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)

  useEffect(() => {
    if (chatId) {
      const chat = chats.find(c => c.id === parseInt(chatId)) || chats.find(c => c.userId === parseInt(chatId))
      if (chat) {
        setSelectedChat(chat)
        markAsRead(chat.id)
      }
    } else {
      setSelectedChat(null)
    }
  }, [chatId, chats, markAsRead])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, selectedChat])

  // Handle scroll to load older messages
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container || !selectedChat) return

    const handleScroll = async () => {
      if (container.scrollTop === 0 && !loadingOlder) {
        const currentMessages = messages[selectedChat.id] || []
        if (currentMessages.length > 0) {
          const earliestMessage = currentMessages[0]
          setLoadingOlder(true)
          await loadOlderMessages(selectedChat.id, earliestMessage.id)
          setLoadingOlder(false)
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
  }, [selectedChat, messages, loadOlderMessages, loadingOlder])

  const handleChatSelect = (chat) => {
    navigate(`/chat/${chat.id}`)
    markAsRead(chat.id)
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
                    <p className="chat-relationship">{selectedChat.relationshipType}</p>
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
                <div ref={messagesEndRef} />
              </div>

              <form className="chat-input-form" onSubmit={handleSendMessage}>
                <div className="chat-input-wrapper">
                  <textarea
                    className="chat-input"
                    placeholder="Type a message... (max 2048 characters)"
                    value={messageInput}
                    onChange={handleMessageInputChange}
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

