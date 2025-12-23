import { createContext, useContext, useState } from 'react'

const RequestsContext = createContext()

export function RequestsProvider({ children }) {
  const [sentRequests, setSentRequests] = useState([
    {
      id: 1,
      userId: 2,
      name: 'Michael Chen',
      email: 'michael.chen@example.com',
      preference: 'be-discipled',
      relationshipType: 'Mentor',
      message: 'Hi! I saw your profile and would love to connect with you.'
    },
    {
      id: 2,
      userId: 3,
      name: 'Emily Rodriguez',
      email: 'emily.rodriguez@example.com',
      preference: 'disciple',
      relationshipType: 'Disciple',
      message: 'I think we could have a great discipling relationship!'
    }
  ])

  const [receivedRequests, setReceivedRequests] = useState([
    {
      id: 1,
      userId: 4,
      name: 'David Thompson',
      email: 'david.thompson@example.com',
      preference: 'be-discipled',
      relationshipType: 'Mentor',
      message: 'Hello! I would love to be mentored by you.'
    },
    {
      id: 2,
      userId: 6,
      name: 'James Wilson',
      email: 'james.wilson@example.com',
      preference: 'disciple',
      relationshipType: 'Disciple',
      message: 'I think you would be a great disciple!'
    }
  ])

  const addSentRequest = (request) => {
    setSentRequests(prev => [...prev, request])
  }

  const removeSentRequest = (requestId) => {
    setSentRequests(prev => prev.filter(r => r.id !== requestId))
  }

  const addReceivedRequest = (request) => {
    setReceivedRequests(prev => [...prev, request])
  }

  const removeReceivedRequest = (requestId) => {
    setReceivedRequests(prev => prev.filter(r => r.id !== requestId))
  }

  return (
    <RequestsContext.Provider value={{
      sentRequests,
      receivedRequests,
      addSentRequest,
      removeSentRequest,
      addReceivedRequest,
      removeReceivedRequest
    }}>
      {children}
    </RequestsContext.Provider>
  )
}

export function useRequests() {
  return useContext(RequestsContext)
}

