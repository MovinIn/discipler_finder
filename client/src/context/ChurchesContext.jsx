import { createContext, useContext, useState, useEffect } from 'react'

const ChurchesContext = createContext()

const API_BASE_URL = 'http://localhost:8080/api'

export function ChurchesProvider({ children }) {
  const [churches, setChurches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch churches on app startup
    const fetchChurches = async () => {
      try {
        const formData = new URLSearchParams()
        formData.append('action', 'get_churches')

        const response = await fetch(`${API_BASE_URL}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString()
        })

        if (response.ok) {
          const data = await response.json()
          setChurches(data)
        } else {
          console.error('Failed to fetch churches')
        }
      } catch (error) {
        console.error('Error fetching churches:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchChurches()
  }, [])

  return (
    <ChurchesContext.Provider value={{ churches, loading }}>
      {children}
    </ChurchesContext.Provider>
  )
}

export function useChurches() {
  return useContext(ChurchesContext)
}



