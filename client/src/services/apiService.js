// Use window to store state that persists across HMR
if (!window.__apiState) {
  window.__apiState = {
    churchesData: null,
    churchesPromise: null,
    churchesFetched: false,
    signoutInProgress: false
  }
}

// Fetch churches ONCE - completely outside React
export async function fetchChurchesOnce() {
  const state = window.__apiState
  
  // Already have data
  if (state.churchesData) {
    return state.churchesData
  }
  
  // Already fetching - return existing promise
  if (state.churchesPromise) {
    return state.churchesPromise
  }
  
  // Already tried to fetch (even if it failed)
  if (state.churchesFetched) {
    return state.churchesData || []
  }
  
  state.churchesFetched = true
  
  state.churchesPromise = (async () => {
    try {
      const formData = new URLSearchParams()
      formData.append('action', 'get_churches')
      
      const response = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      })
      
      if (response.ok) {
        const data = await response.json()
        state.churchesData = data
        return data
      }
      return []
    } catch {
      return []
    } finally {
      state.churchesPromise = null
    }
  })()
  
  return state.churchesPromise
}

// Signout ONCE
export async function signoutOnce(userId, sessionId) {
  const state = window.__apiState
  
  // Already signing out
  if (state.signoutInProgress) {
    return
  }
  
  state.signoutInProgress = true
  
  try {
    const formData = new URLSearchParams()
    formData.append('action', 'signout')
    formData.append('id', userId.toString())
    formData.append('session_id', sessionId)
    
    await fetch('/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    })
  } catch {
    // Ignore errors
  } finally {
    state.signoutInProgress = false
  }
}

// Get cached churches (sync)
export function getCachedChurches() {
  return window.__apiState?.churchesData || []
}

// Check if churches have been fetched
export function hasChurchesBeenFetched() {
  return window.__apiState?.churchesFetched || false
}
