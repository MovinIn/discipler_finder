import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const ChatContext = createContext()

const API_BASE_URL = 'http://localhost:8080/api'

export function ChatProvider({ children }) {
  const { user } = useAuth()
  const [chats, setChats] = useState([])
  const [messages, setMessages] = useState({})
  const [loading, setLoading] = useState(true)

  // Fetch latest messages on mount and when user changes
  useEffect(() => {
    const fetchLatestMessages = async () => {
      if (!user || !user.profile || !user.session_id) {
        setLoading(false)
        return
      }

      try {
        const formData = new URLSearchParams()
        formData.append('action', 'get_latest_messages')
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
          const chatsData = await response.json()
          
          // Transform API response to chat structure
          const transformedChats = chatsData.map(chatData => {
            const otherParticipant = chatData.participants.find(p => p.user_id !== user.profile.id)
            const lastMessage = chatData.messages && chatData.messages.length > 0 
              ? chatData.messages[chatData.messages.length - 1] 
              : null
            
            // Calculate unread count
            const lastReadId = chatData.last_read_message_id || 0
            const unreadCount = chatData.messages 
              ? chatData.messages.filter(msg => msg.id > lastReadId && msg.sender_id !== user.profile.id).length
              : 0

            return {
              id: chatData.chat_id,
              userId: otherParticipant?.user_id,
              userName: otherParticipant?.name || 'Unknown',
              userEmail: otherParticipant?.email || '',
              lastMessage: lastMessage?.content || '',
              lastMessageTime: lastMessage ? formatTime(lastMessage.created_at) : '',
              unreadCount: unreadCount,
              relationshipType: 'Friend' // Could be enhanced later
            }
          })

          setChats(transformedChats)

          // Transform messages
          const transformedMessages = {}
          chatsData.forEach(chatData => {
            transformedMessages[chatData.chat_id] = (chatData.messages || []).map(msg => ({
              id: msg.id,
              senderId: msg.sender_id === user.profile.id ? 'current' : msg.sender_id,
              text: msg.content,
              time: formatTime(msg.created_at),
              isRead: msg.id <= (chatData.last_read_message_id || 0) || msg.sender_id === user.profile.id
            }))
          })
          setMessages(transformedMessages)
        }
      } catch (error) {
        console.error('Error fetching latest messages:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLatestMessages()
  }, [user])

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  const addChat = (chat) => {
    setChats(prev => {
      const existingChat = prev.find(c => c.userId === chat.userId)
      if (existingChat) {
        return prev
      }
      return [...prev, chat]
    })
    setMessages(prev => {
      if (!prev[chat.id]) {
        return {
          ...prev,
          [chat.id]: []
        }
      }
      return prev
    })
  }

  const getChatByUserId = (userId) => {
    return chats.find(c => c.userId === userId)
  }

  const sendMessage = async (chatId, message) => {
    if (!user || !user.profile || !user.session_id) return

    // Validate message length
    if (message.length > 2048) {
      alert('Message must be at most 2048 characters')
      return
    }

    try {
      const formData = new URLSearchParams()
      formData.append('action', 'send_message')
      formData.append('id', user.profile.id)
      formData.append('session_id', user.session_id)
      formData.append('chat_id', chatId)
      formData.append('message', message)

      const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      })

      if (response.status >= 200 && response.status < 300) {
        const result = await response.json()
        const newMessage = {
          id: result.message_id,
          senderId: 'current',
          text: message,
          time: 'Just now',
          isRead: true
        }
        
        setMessages(prev => ({
          ...prev,
          [chatId]: [...(prev[chatId] || []), newMessage]
        }))

        setChats(prev => prev.map(chat => 
          chat.id === chatId 
            ? { ...chat, lastMessage: message, lastMessageTime: 'Just now' }
            : chat
        ))
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    }
  }

  const sendMessageToUser = async (userId, message) => {
    if (!user || !user.profile || !user.session_id) return

    // Validate message length
    if (message.length > 2048) {
      alert('Message must be at most 2048 characters')
      return
    }

    try {
      // First, check if chat exists
      let chat = getChatByUserId(userId)
      let chatId = chat?.id

      // If no chat exists, create one
      if (!chatId) {
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
          chatId = createResult.chat_id
        } else {
          const error = await createResponse.json()
          alert(error.message || 'Failed to create chat')
          return
        }
      }

      // Now send the message
      await sendMessage(chatId, message)
    } catch (error) {
      console.error('Error sending message to user:', error)
      alert('Failed to send message')
    }
  }

  const markAsRead = async (chatId) => {
    if (!user || !user.profile || !user.session_id) return

    const chat = chats.find(c => c.id === chatId)
    if (!chat) return

    const chatMessages = messages[chatId] || []
    if (chatMessages.length === 0) return

    // Find the latest message ID
    const latestMessage = chatMessages[chatMessages.length - 1]
    if (!latestMessage) return

    try {
      const formData = new URLSearchParams()
      formData.append('action', 'mark_messages_as_read')
      formData.append('id', user.profile.id)
      formData.append('session_id', user.session_id)
      formData.append('chat_id', chatId)
      formData.append('message_id', latestMessage.id)

      const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      })

      if (response.status >= 200 && response.status < 300) {
        setChats(prev => prev.map(c => 
          c.id === chatId ? { ...c, unreadCount: 0 } : c
        ))
        setMessages(prev => ({
          ...prev,
          [chatId]: (prev[chatId] || []).map(msg => ({ ...msg, isRead: true }))
        }))
      }
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const loadOlderMessages = async (chatId, earliestMessageId) => {
    if (!user || !user.profile || !user.session_id) return []

    try {
      const formData = new URLSearchParams()
      formData.append('action', 'get_older_messages')
      formData.append('id', user.profile.id)
      formData.append('session_id', user.session_id)
      formData.append('chat_id', chatId)
      formData.append('earliest_message_id', earliestMessageId)

      const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      })

      if (response.status >= 200 && response.status < 300) {
        const olderMessages = await response.json()
        const transformedMessages = olderMessages.map(msg => ({
          id: msg.id,
          senderId: msg.sender_id === user.profile.id ? 'current' : msg.sender_id,
          text: msg.message,
          time: formatTime(msg.sent_at),
          isRead: true
        }))

        // Prepend older messages to existing messages
        setMessages(prev => ({
          ...prev,
          [chatId]: [...transformedMessages.reverse(), ...(prev[chatId] || [])]
        }))

        return transformedMessages
      }
    } catch (error) {
      console.error('Error loading older messages:', error)
    }
    return []
  }

  return (
    <ChatContext.Provider value={{ 
      chats, 
      messages, 
      loading,
      addChat, 
      sendMessage, 
      sendMessageToUser,
      markAsRead, 
      getChatByUserId,
      loadOlderMessages
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  return useContext(ChatContext)
}

