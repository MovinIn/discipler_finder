import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const ChatContext = createContext()

const API_BASE_URL = '/api'

export function ChatProvider({ children }) {
  const { user } = useAuth()
  const [chats, setChats] = useState([])
  const [messages, setMessages] = useState({})
  const [loading, setLoading] = useState(true)
  const [wsConnection, setWsConnection] = useState(null)
  const [typingUsers, setTypingUsers] = useState({})
  const [typingTimeouts, setTypingTimeouts] = useState({})
  const [pendingMessages, setPendingMessages] = useState([])
  const [isReconnecting, setIsReconnecting] = useState(false)

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
            const otherParticipant = chatData.participants.find(p => p.id !== user.profile.id)
            const lastMessage = chatData.messages && chatData.messages.length > 0 
              ? chatData.messages[chatData.messages.length - 1] 
              : null
            
            // Calculate unread count
            const lastReadId = chatData.last_read_message_id || 0
            let unreadCount = chatData.messages
              ? chatData.messages.filter(msg => msg.id > lastReadId && msg.sender_id !== user.profile.id).length
              : 0

            // If we have 10 messages and none of them have ID <= lastReadId,
            // it means the last read message is older than the 10 messages we polled,
            // so there are more than 10 unread messages
            if (chatData.messages && chatData.messages.length === 10) {
              const hasReadMessage = chatData.messages.some(msg => msg.id <= lastReadId)
              if (!hasReadMessage && unreadCount > 0) {
                unreadCount = '10+'
              }
            }

            return {
              id: chatData.chat_id,
              userId: otherParticipant?.id,
              userName: otherParticipant?.name || 'Unknown',
              userEmail: otherParticipant?.email || '',
              lastMessage: lastMessage?.content || '',
              lastMessageTime: lastMessage ? formatTime(lastMessage.created_at) : '',
              unreadCount: unreadCount,
              relationshipType: 'Friend' // Could be enhanced later
            }
          })

          // Sort chats: unread messages first, then read messages, ordered by latest message within each category
          const sortedChats = transformedChats.sort((a, b) => {
            // Helper function to get numeric unread count
            const getUnreadCount = (chat) => {
              if (chat.unreadCount === '10+') return 10
              return typeof chat.unreadCount === 'number' ? chat.unreadCount : 0
            }

            const aUnread = getUnreadCount(a)
            const bUnread = getUnreadCount(b)

            // First sort by unread count (descending - unread first)
            if (aUnread > 0 && bUnread === 0) return -1
            if (aUnread === 0 && bUnread > 0) return 1

            // If both have same unread status, sort by latest message time
            // Convert time strings to comparable format
            const getTimeValue = (timeStr) => {
              if (!timeStr || timeStr === '') return 0
              // For relative times like "Just now", "5 minutes ago", etc., we'll use a simple heuristic
              if (timeStr === 'Just now') return Date.now()
              if (timeStr.includes('minute')) return Date.now() - (parseInt(timeStr) * 60000)
              if (timeStr.includes('hour')) return Date.now() - (parseInt(timeStr) * 3600000)
              if (timeStr.includes('day')) return Date.now() - (parseInt(timeStr) * 86400000)
              // For absolute dates, parse them
              try {
                return new Date(timeStr).getTime()
              } catch {
                return 0
              }
            }

            const aTime = getTimeValue(a.lastMessageTime)
            const bTime = getTimeValue(b.lastMessageTime)

            return bTime - aTime // Most recent first
          })

          setChats(sortedChats)

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

  // WebSocket connection management
  useEffect(() => {
    if (user && user.profile && user.session_id) {
      connectWebSocket()
    } else {
      disconnectWebSocket()
    }

    return () => {
      disconnectWebSocket()
    }
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

  // WebSocket connection management
  const connectWebSocket = () => {
    if (!user || !user.profile || !user.session_id) return

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const host = window.location.host.includes('localhost') ? 'localhost:8080' : window.location.host
      const wsUrl = `${protocol}://${host}/ws/chat?id=${user.profile.id}&session_id=${user.session_id}`
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('WebSocket connected')
        setWsConnection(ws)
        setIsReconnecting(false)

        // Send any pending messages
        if (pendingMessages.length > 0) {
          console.log('Sending pending messages:', pendingMessages.length)
          pendingMessages.forEach(({ chatId, message }) => {
            const messageData = {
              id: chatId,
              isMessage: true,
              content: message.trim()
            }
            try {
              ws.send(JSON.stringify(messageData))
            } catch (error) {
              console.error('Error sending pending message:', error)
            }
          })
          setPendingMessages([])
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleWebSocketMessage(data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setWsConnection(null)
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (error) {
      console.error('Error creating WebSocket connection:', error)
    }
  }

  const disconnectWebSocket = () => {
    if (wsConnection) {
      wsConnection.close()
      setWsConnection(null)
    }
    setIsReconnecting(false)
    setPendingMessages([])
  }

  // Global function to disconnect websocket (accessible from other contexts)
  window.disconnectChatWebSocket = disconnectWebSocket

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'message':
        handleIncomingMessage(data)
        break
      case 'typing':
        handleTypingIndicator(data)
        break
      case 'error':
        console.error('WebSocket error:', data.message)
        break
      default:
        console.log('Unknown message type:', data.type)
    }
  }

  // Handle incoming message
  const handleIncomingMessage = (data) => {
    const { chat_id, message_id, sender_id, message, sent_at } = data
    const chatId = parseInt(chat_id) // Ensure chat_id is a number

    if (sender_id === user.profile.id) {
      // This is a confirmation of our sent message - update the local message with real ID and mark as read
      setMessages(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map(msg =>
          msg.senderId === 'current' && msg.id.toString().length > 10 // Temporary IDs are timestamps
            ? { ...msg, id: message_id, isRead: true, time: formatTime(sent_at) }
            : msg
        )
      }))
      return
    }

    // This is an incoming message from another user
    const newMessage = {
      id: message_id,
      senderId: sender_id,
      text: message,
      time: formatTime(sent_at),
      isRead: true  // Mark as read immediately when received
    }

    setMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMessage]
    }))

    // Clear typing indicator for this sender since they just sent a message
    setTypingUsers(prev => {
      const newTyping = { ...prev }
      if (newTyping[chatId] === sender_id) {
        delete newTyping[chatId]
      }
      return newTyping
    })

    // Mark messages as read in the backend
    markAsRead(chatId)
    setChats(prev => {
      const updatedChats = prev.map(chat =>
        chat.id === chatId
          ? {
              ...chat,
              lastMessage: message,
              lastMessageTime: 'Just now',
              unreadCount: 0  // Reset unread count since we marked as read
            }
          : chat
      )
      // Resort chats after updating with new message
      return updatedChats.sort((a, b) => {
        const getUnreadCount = (chat) => {
          if (chat.unreadCount === '10+') return 10
          return typeof chat.unreadCount === 'number' ? chat.unreadCount : 0
        }

        const aUnread = getUnreadCount(a)
        const bUnread = getUnreadCount(b)

        if (aUnread > 0 && bUnread === 0) return -1
        if (aUnread === 0 && bUnread > 0) return 1

        const getTimeValue = (timeStr) => {
          if (!timeStr || timeStr === '') return 0
          if (timeStr === 'Just now') return Date.now()
          if (timeStr.includes('minute')) return Date.now() - (parseInt(timeStr) * 60000)
          if (timeStr.includes('hour')) return Date.now() - (parseInt(timeStr) * 3600000)
          if (timeStr.includes('day')) return Date.now() - (parseInt(timeStr) * 86400000)
          try {
            return new Date(timeStr).getTime()
          } catch {
            return 0
          }
        }

        const aTime = getTimeValue(a.lastMessageTime)
        const bTime = getTimeValue(b.lastMessageTime)

        return bTime - aTime
      })
    })
  }

  // Handle typing indicator
  const handleTypingIndicator = (data) => {
    const { chat_id, user_id } = data

    // Skip typing indicators from current user
    if (user_id === user.profile.id) return

    setTypingUsers(prev => ({
      ...prev,
      [chat_id]: user_id
    }))

    // Clear typing indicator after 3 seconds
    setTimeout(() => {
      setTypingUsers(prev => {
        const newTyping = { ...prev }
        if (newTyping[chat_id] === user_id) {
          delete newTyping[chat_id]
        }
        return newTyping
      })
    }, 3000)
  }

  // Typing indicator management
  const startTyping = (chatId) => {
    if (!wsConnection || !user || !user.profile) return

    // Send initial typing message
    sendTypingMessage(chatId)

    // Set up interval to send typing messages every 10 seconds
    const intervalId = setInterval(() => {
      sendTypingMessage(chatId)
    }, 10000)

    setTypingTimeouts(prev => ({
      ...prev,
      [chatId]: intervalId
    }))
  }

  const stopTyping = (chatId) => {
    // Clear the typing interval
    if (typingTimeouts[chatId]) {
      clearInterval(typingTimeouts[chatId])
      setTypingTimeouts(prev => {
        const newTimeouts = { ...prev }
        delete newTimeouts[chatId]
        return newTimeouts
      })
    }
  }

  const sendTypingMessage = (chatId) => {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      // If disconnected, don't try to reconnect for typing messages
      return
    }

    const typingMessage = {
      id: chatId,
      isMessage: false, // Typing indicator
      content: "" // Empty content indicates typing
    }

    try {
      wsConnection.send(JSON.stringify(typingMessage))
    } catch (error) {
      console.error('Error sending typing message:', error)
    }
  }

  const addChat = (chat) => {
    setChats(prev => {
      const existingChat = prev.find(c => c.userId === chat.userId)
      if (existingChat) {
        return prev
      }
      // Sort the new chats array
      return [...prev, chat].sort((a, b) => {
        // Helper function to get numeric unread count
        const getUnreadCount = (c) => {
          if (c.unreadCount === '10+') return 10
          return typeof c.unreadCount === 'number' ? c.unreadCount : 0
        }

        const aUnread = getUnreadCount(a)
        const bUnread = getUnreadCount(b)

        // First sort by unread count (descending - unread first)
        if (aUnread > 0 && bUnread === 0) return -1
        if (aUnread === 0 && bUnread > 0) return 1

        // If both have same unread status, sort by latest message time
        const getTimeValue = (timeStr) => {
          if (!timeStr || timeStr === '') return 0
          if (timeStr === 'Just now') return Date.now()
          if (timeStr.includes('minute')) return Date.now() - (parseInt(timeStr) * 60000)
          if (timeStr.includes('hour')) return Date.now() - (parseInt(timeStr) * 3600000)
          if (timeStr.includes('day')) return Date.now() - (parseInt(timeStr) * 86400000)
          try {
            return new Date(timeStr).getTime()
          } catch {
            return 0
          }
        }

        const aTime = getTimeValue(a.lastMessageTime)
        const bTime = getTimeValue(b.lastMessageTime)

        return bTime - aTime
      })
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

  // Function to resort chats when their properties change
  const resortChats = () => {
    setChats(prev => [...prev].sort((a, b) => {
      // Helper function to get numeric unread count
      const getUnreadCount = (chat) => {
        if (chat.unreadCount === '10+') return 10
        return typeof chat.unreadCount === 'number' ? chat.unreadCount : 0
      }

      const aUnread = getUnreadCount(a)
      const bUnread = getUnreadCount(b)

      // First sort by unread count (descending - unread first)
      if (aUnread > 0 && bUnread === 0) return -1
      if (aUnread === 0 && bUnread > 0) return 1

      // If both have same unread status, sort by latest message time
      const getTimeValue = (timeStr) => {
        if (!timeStr || timeStr === '') return 0
        if (timeStr === 'Just now') return Date.now()
        if (timeStr.includes('minute')) return Date.now() - (parseInt(timeStr) * 60000)
        if (timeStr.includes('hour')) return Date.now() - (parseInt(timeStr) * 3600000)
        if (timeStr.includes('day')) return Date.now() - (parseInt(timeStr) * 86400000)
        try {
          return new Date(timeStr).getTime()
        } catch {
          return 0
        }
      }

      const aTime = getTimeValue(a.lastMessageTime)
      const bTime = getTimeValue(b.lastMessageTime)

      return bTime - aTime
    }))
  }

  const sendMessage = (chatId, message) => {
    // Validate message length
    if (message.length > 2048) {
      alert('Message must be at most 2048 characters')
      return
    }

    if (!message || message.trim().length === 0) {
      alert('Message cannot be empty')
      return
    }

    // Stop typing before sending message
    stopTyping(chatId)

    // Optimistically update UI first
    const newMessage = {
      id: Date.now(), // Temporary ID until server responds
      senderId: 'current',
      text: message.trim(),
      time: 'Just now',
      isRead: false // Will be marked as read when server confirms or user views
    }

    setMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMessage]
    }))

    setChats(prev => {
      const updatedChats = prev.map(chat =>
        chat.id === chatId
          ? { ...chat, lastMessage: message.trim(), lastMessageTime: 'Just now' }
          : chat
      )
      // Resort chats after updating with sent message
      return updatedChats.sort((a, b) => {
        const getUnreadCount = (chat) => {
          if (chat.unreadCount === '10+') return 10
          return typeof chat.unreadCount === 'number' ? chat.unreadCount : 0
        }

        const aUnread = getUnreadCount(a)
        const bUnread = getUnreadCount(b)

        if (aUnread > 0 && bUnread === 0) return -1
        if (aUnread === 0 && bUnread > 0) return 1

        const getTimeValue = (timeStr) => {
          if (!timeStr || timeStr === '') return 0
          if (timeStr === 'Just now') return Date.now()
          if (timeStr.includes('minute')) return Date.now() - (parseInt(timeStr) * 60000)
          if (timeStr.includes('hour')) return Date.now() - (parseInt(timeStr) * 3600000)
          if (timeStr.includes('day')) return Date.now() - (parseInt(timeStr) * 86400000)
          try {
            return new Date(timeStr).getTime()
          } catch {
            return 0
          }
        }

        const aTime = getTimeValue(a.lastMessageTime)
        const bTime = getTimeValue(b.lastMessageTime)

        return bTime - aTime
      })
    })

    // Check if WebSocket is connected
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      if (!isReconnecting) {
        console.log('WebSocket disconnected, attempting to reconnect...')
        setIsReconnecting(true)
        // Queue the message to be sent after reconnection
        setPendingMessages(prev => [...prev, { chatId, message: message.trim() }])
        connectWebSocket()
      } else {
        // Already reconnecting, just queue the message
        console.log('WebSocket reconnecting, queuing message...')
        setPendingMessages(prev => [...prev, { chatId, message: message.trim() }])
      }
      return
    }

    // Send message via WebSocket
    const messageData = {
      id: chatId,
      isMessage: true,
      content: message.trim()
    }

    try {
      console.log('Sending WebSocket message:', messageData)
      wsConnection.send(JSON.stringify(messageData))
      console.log('WebSocket message sent successfully')
    } catch (error) {
      console.error('Error sending message:', error)
      // If sending fails, queue the message for retry
      setPendingMessages(prev => [...prev, { chatId, message: message.trim() }])
      if (!isReconnecting) {
        setIsReconnecting(true)
        connectWebSocket()
      }
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

    // Find the latest message with a real database ID (not a temporary timestamp)
    let latestMessage = null
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      const msg = chatMessages[i]
      // Check if ID looks like a real database ID (not a timestamp > 10 digits)
      if (msg.id.toString().length <= 10 || msg.id < 10000000000) {
        latestMessage = msg
        break
      }
    }
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
        setChats(prev => {
          const updatedChats = prev.map(c =>
            c.id === chatId ? { ...c, unreadCount: 0 } : c
          )
          // Resort chats after marking as read
          return updatedChats.sort((a, b) => {
            const getUnreadCount = (chat) => {
              if (chat.unreadCount === '10+') return 10
              return typeof chat.unreadCount === 'number' ? chat.unreadCount : 0
            }

            const aUnread = getUnreadCount(a)
            const bUnread = getUnreadCount(b)

            if (aUnread > 0 && bUnread === 0) return -1
            if (aUnread === 0 && bUnread > 0) return 1

            const getTimeValue = (timeStr) => {
              if (!timeStr || timeStr === '') return 0
              if (timeStr === 'Just now') return Date.now()
              if (timeStr.includes('minute')) return Date.now() - (parseInt(timeStr) * 60000)
              if (timeStr.includes('hour')) return Date.now() - (parseInt(timeStr) * 3600000)
              if (timeStr.includes('day')) return Date.now() - (parseInt(timeStr) * 86400000)
              try {
                return new Date(timeStr).getTime()
              } catch {
                return 0
              }
            }

            const aTime = getTimeValue(a.lastMessageTime)
            const bTime = getTimeValue(b.lastMessageTime)

            return bTime - aTime
          })
        })
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
      typingUsers,
      addChat,
      sendMessage,
      sendMessageToUser,
      markAsRead,
      getChatByUserId,
      loadOlderMessages,
      startTyping,
      stopTyping,
      resortChats,
      disconnectWebSocket
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  return useContext(ChatContext)
}

