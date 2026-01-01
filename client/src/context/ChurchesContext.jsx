import { createContext, useContext, useState, useEffect } from 'react'
import { fetchChurchesOnce, getCachedChurches, hasChurchesBeenFetched } from '../services/apiService'

const ChurchesContext = createContext()

export function ChurchesProvider({ children }) {
  // Initialize with cached data if available
  const [churches, setChurches] = useState(getCachedChurches())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    fetchChurchesOnce().then(data => {
      if (!cancelled) {
        setChurches(data || [])
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
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



