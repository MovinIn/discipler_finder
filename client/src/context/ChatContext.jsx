import { createContext, useContext, useState } from 'react'

const ChatContext = createContext()

export function ChatProvider({ children }) {
  const [chats, setChats] = useState([
    {
      id: 1,
      userId: 2,
      userName: 'Michael Chen',
      userEmail: 'michael.chen@example.com',
      lastMessage: 'Looking forward to connecting with you!',
      lastMessageTime: '2 hours ago',
      unreadCount: 2,
      relationshipType: 'Mentor'
    },
    {
      id: 2,
      userId: 3,
      userName: 'Emily Rodriguez',
      userEmail: 'emily.rodriguez@example.com',
      lastMessage: 'Thanks for reaching out!',
      lastMessageTime: '1 day ago',
      unreadCount: 0,
      relationshipType: 'Disciple'
    }
  ])

  const [messages, setMessages] = useState({
    1: [
      { id: 1, senderId: 2, text: 'Hello! I saw your request.', time: '2 hours ago', isRead: false },
      { id: 2, senderId: 2, text: 'Looking forward to connecting with you!', time: '2 hours ago', isRead: false },
      { id: 3, senderId: 'current', text: 'Thank you! I\'m excited too.', time: '1 hour ago', isRead: true }
    ],
    2: [
      { id: 1, senderId: 3, text: 'Hi there!', time: '1 day ago', isRead: true },
      { id: 2, senderId: 3, text: 'Thanks for reaching out!', time: '1 day ago', isRead: true },
      { id: 3, senderId: 'current', text: 'You\'re welcome!', time: '1 day ago', isRead: true }
    ]
  })

  const addChat = (chat) => {
    setChats(prev => {
      // Check if a chat with the same userId already exists
      const existingChat = prev.find(c => c.userId === chat.userId)
      if (existingChat) {
        // Chat already exists, don't add duplicate
        return prev
      }
      // Add new chat
      return [...prev, chat]
    })
    setMessages(prev => {
      // Only initialize messages if chat doesn't already exist
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
    // Use a callback to access current state
    return chats.find(c => c.userId === userId)
  }

  const sendMessage = (chatId, message) => {
    const newMessage = {
      id: Date.now(),
      senderId: 'current',
      text: message,
      time: 'Just now',
      isRead: true
    }
    
    setMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMessage]
    }))

    // Update last message in chat
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { ...chat, lastMessage: message, lastMessageTime: 'Just now' }
        : chat
    ))
  }

  const markAsRead = (chatId) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
    ))
    setMessages(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map(msg => ({ ...msg, isRead: true }))
    }))
  }

  return (
    <ChatContext.Provider value={{ chats, messages, addChat, sendMessage, markAsRead, getChatByUserId }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  return useContext(ChatContext)
}

