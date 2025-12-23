import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaComments, FaUser, FaPaperPlane } from 'react-icons/fa'
import { useChat } from '../context/ChatContext'
import './Chat.css'

function Chat() {
  const { chatId } = useParams()
  const navigate = useNavigate()
  const { chats, messages, sendMessage, markAsRead } = useChat()
  const [selectedChat, setSelectedChat] = useState(null)
  const [messageInput, setMessageInput] = useState('')

  useEffect(() => {
    if (chatId) {
      const chat = chats.find(c => c.id === parseInt(chatId))
      if (chat) {
        setSelectedChat(chat)
        markAsRead(chat.id)
      }
    } else {
      setSelectedChat(null)
    }
  }, [chatId, chats, markAsRead])

  const handleChatSelect = (chat) => {
    navigate(`/chat/${chat.id}`)
    markAsRead(chat.id)
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (messageInput.trim() && selectedChat) {
      sendMessage(selectedChat.id, messageInput.trim())
      setMessageInput('')
    }
  }

  const currentMessages = selectedChat ? (messages[selectedChat.id] || []) : []

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-sidebar">
          <h2>Messages</h2>
          {chats.length === 0 ? (
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

              <div className="chat-messages">
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
              </div>

              <form className="chat-input-form" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                />
                <button type="submit" className="send-btn">
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

