import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { FaUser, FaChevronDown, FaTimes } from 'react-icons/fa'
import { useProfile } from '../context/ProfileContext'
import { useRequests } from '../context/RequestsContext'
import { useAuth } from '../context/AuthContext'
import './Matchmaking.css'

const API_BASE_URL = 'http://localhost:8080/api'

function Matchmaking() {
  const { profile, updateProfile } = useProfile()
  const { addSentRequest } = useRequests()
  const { user } = useAuth()
  const [requestedMatches, setRequestedMatches] = useState(new Set())
  const [showNotification, setShowNotification] = useState(false)
  const [notificationPerson, setNotificationPerson] = useState('')
  const [expandedCard, setExpandedCard] = useState(null)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [requestMessage, setRequestMessage] = useState('')
  const [allMatches, setAllMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const isFetchingRef = useRef(false)

  // Autofill gender preference from profile gender if not already set
  useEffect(() => {
    if (profile.gender && !profile.matchmakingGenderPreference) {
      // Map profile gender to matchmaking preference (case-insensitive)
      const genderLower = profile.gender.toLowerCase()
      if (genderLower === 'male' || genderLower === 'female') {
        updateProfile({ matchmakingGenderPreference: genderLower })
      }
    }
  }, [profile.gender, profile.matchmakingGenderPreference, updateProfile])

  const fetchPosts = useCallback(async () => {
    if (!user || !user.profile || !user.profile.church || isFetchingRef.current) {
      setLoading(false)
      return
    }

    isFetchingRef.current = true

    try {
      const minAge = parseInt(profile.matchmakingMinAge) || 13
      const maxAge = parseInt(profile.matchmakingMaxAge) || 120
      const church = user.profile.church

      const formData = new URLSearchParams()
      formData.append('action', 'query_posts')
      formData.append('id', user.profile.id)
      formData.append('session_id', user.session_id)

      // Only include type if preference is not "Show All" (not empty string)
      if (profile.preference && profile.preference.trim() !== '') {
        // Map frontend preference to backend type (inverted: if user wants to disciple, find people who want to be discipled)
        const typeMap = {
          'disciple': 'D', // User wants to disciple, so find people who want to be discipled
          'be-discipled': 'M', // User wants to be discipled, so find people who want to disciple
          'accountability': 'A' // User wants accountability, so find people who want accountability
        }
        const backendType = typeMap[profile.preference] || 'D'
        formData.append('type', backendType)
      }

      // Only include gender if it's not "Any Gender" (not empty string)
      if (profile.matchmakingGenderPreference && profile.matchmakingGenderPreference.trim() !== '') {
        formData.append('gender', profile.matchmakingGenderPreference)
      }

      formData.append('l_age', minAge.toString())
      formData.append('h_age', maxAge.toString())
      formData.append('church', church)

      const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      })

      if (response.status >= 200 && response.status < 300) {
        const posts = await response.json()
        // Map API response to match structure
        const matches = posts.map(post => ({
          id: post.id,  // Use post ID instead of user ID to allow multiple posts per person
          userId: post.user_id,  // Keep user ID for sending requests
          name: post.name,
          email: post.email,
          gender: post.gender,
          age: post.age,
          preference: post.type === 'M' ? 'disciple' : post.type === 'D' ? 'be-discipled' : 'accountability',
          lookingFor: post.requirements || '',
          future: post.goals || '',
          disciplingExperience: post.experience || 'Not specified'
        }))
        setAllMatches(matches)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [user, profile])

  // Fetch posts from API
  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // Helper function to truncate text
  const truncateText = (text, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  // Helper function to convert gender abbreviation to full word
  const formatGender = (gender) => {
    if (gender === 'M') return 'Male'
    if (gender === 'F') return 'Female'
    return gender || 'Not specified'
  }

  // Helper function to format preference type
  const formatPreferenceType = (preference) => {
    const typeMap = {
      'disciple': 'Mentor',
      'be-discipled': 'Disciple',
      'accountability': 'Accountability Partner'
    }
    return typeMap[preference] || 'Mentor'
  }

  // Helper function to format type request text with proper grammar
  const getTypeRequestParts = (preference) => {
    const typeMap = {
      'disciple': 'Mentor',
      'be-discipled': 'Disciple',
      'accountability': 'Accountability Partner'
    }
    const type = typeMap[preference] || 'Mentor'
    const article = type.startsWith('A') ? 'an' : 'a'
    return { article, type }
  }

  const handlePreferenceChange = (e) => {
    updateProfile({ preference: e.target.value })
  }

  const handleGenderPreferenceChange = (e) => {
    updateProfile({ matchmakingGenderPreference: e.target.value })
  }

  const handleMinAgeChange = (e) => {
    updateProfile({ matchmakingMinAge: e.target.value })
  }

  const handleMaxAgeChange = (e) => {
    updateProfile({ matchmakingMaxAge: e.target.value })
  }


  // Filter matches based on user preferences (filtering is mostly done server-side, but we can do additional client-side filtering)
  const matches = useMemo(() => {
    return allMatches
  }, [allMatches])

  const handleRequestMatchClick = (match) => {
    setSelectedMatch(match)
    setRequestMessage('')
    setShowMessageModal(true)
  }

  const handleSendRequest = async () => {
    if (!selectedMatch) return
    if (!user || !user.profile || !user.session_id) {
      alert('You must be logged in to send requests')
      return
    }

    try {
      // Map preference to backend type
      const typeMap = {
        'disciple': 'M', // User wants to disciple, so they're requesting to be a Mentor
        'be-discipled': 'D', // User wants to be discipled, so they're requesting to be a Disciple
        'accountability': 'A' // User wants accountability, so they're requesting to be an Accountability Partner
      }
      const requestType = typeMap[profile.preference || 'disciple'] || 'M'

      const formData = new URLSearchParams()
      formData.append('action', 'send_request')
      formData.append('id', user.profile.id.toString())
      formData.append('session_id', user.session_id)
      formData.append('requestee_id', selectedMatch.id.toString())
      formData.append('message', requestMessage.trim() || '')
      formData.append('type', requestType)

      const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      })

      const result = await response.json()

      if (response.status >= 200 && response.status < 300) {
        // Add to sent requests locally
        const getRelationshipType = () => {
          if (profile.preference === 'disciple') {
            return 'Mentor'
          } else if (profile.preference === 'be-discipled') {
            return 'Disciple'
          } else if (profile.preference === 'accountability') {
            return 'Accountability Partner'
          }
          return 'Mentor'
        }

        const newRequest = {
          id: result.request_id || Date.now(),
          userId: selectedMatch.id,
          name: selectedMatch.name,
          email: selectedMatch.email || '',
          preference: selectedMatch.preference,
          relationshipType: getRelationshipType(),
          message: requestMessage.trim() || ''
        }

        addSentRequest(newRequest)
        setRequestedMatches(prev => new Set([...prev, selectedMatch.id]))
        setNotificationPerson(selectedMatch.name)
        setShowNotification(true)
        setShowMessageModal(false)
        setRequestMessage('')
        setSelectedMatch(null)

        // Hide notification after 3 seconds
        setTimeout(() => {
          setShowNotification(false)
        }, 3000)
      } else {
        alert(result.message || 'Failed to send request')
      }
    } catch (error) {
      console.error('Error sending request:', error)
      alert('Failed to send request. Please try again.')
    }
  }

  const handleCancelRequest = () => {
    setShowMessageModal(false)
    setRequestMessage('')
    setSelectedMatch(null)
  }

  const handleSeeMore = (matchId) => {
    setExpandedCard(expandedCard === matchId ? null : matchId)
  }

  const handleCloseModal = () => {
    setExpandedCard(null)
  }

  return (
    <div className="matchmaking-page">
      <div className="matchmaking-container">
        <div className="matchmaking-header">
          <h1>Find Your Match</h1>
          <p className="matchmaking-intro">
            Browse through potential discipling matches and connect with others in your community.
          </p>
          <div className="matchmaking-filters">
            <div className="preference-filter">
              <label htmlFor="preference-select">Preference:</label>
              <select
                id="preference-select"
                value={profile.preference || ''}
                onChange={handlePreferenceChange}
                className="preference-select"
              >
                <option value="">Show All</option>
                <option value="disciple">I want to disciple someone</option>
                <option value="be-discipled">I want to be discipled</option>
                <option value="accountability">I want an accountability partner</option>
              </select>
            </div>

            <div className="preference-filter">
              <label htmlFor="gender-select">Gender:</label>
              <select
                id="gender-select"
                value={profile.matchmakingGenderPreference || ''}
                onChange={handleGenderPreferenceChange}
                className="preference-select"
              >
                <option value="">Any Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>

            <div className="age-filter">
              <label htmlFor="min-age">Age Range:</label>
              <div className="age-inputs">
                <input
                  type="number"
                  id="min-age"
                  placeholder="Min"
                  min="13"
                  max="120"
                  value={profile.matchmakingMinAge || ''}
                  onChange={handleMinAgeChange}
                  className="age-input"
                />
                <span className="age-separator">-</span>
                <input
                  type="number"
                  id="max-age"
                  placeholder="Max"
                  min="13"
                  max="120"
                  value={profile.matchmakingMaxAge || ''}
                  onChange={handleMaxAgeChange}
                  className="age-input"
                />
              </div>
            </div>
          </div>
        </div>

        {showNotification && (
          <div className="notification">
            <span>✓</span>
            <p>{notificationPerson} received your invitation!</p>
          </div>
        )}

        <div className="matches-feed">
          {loading ? (
            <div className="loading-message">Loading matches...</div>
          ) : matches.length === 0 ? (
            <div className="no-matches-message">No matches found. Try adjusting your filters.</div>
          ) : (
            matches.map((match) => (
            <div key={match.id} className="match-card">
              <div className="match-content">
                <div className="match-header">
                  <div className="match-avatar">
                    <FaUser />
                  </div>
                  <div className="match-info">
                    <div className="match-primary-info">
                      <h3 className="match-name">{match.name}</h3>
                      <span className="match-email">{match.email}</span>
                    </div>
                    <div className="match-secondary-info">
                      <span className="match-gender">{formatGender(match.gender)}</span>
                      <span className="match-age">{match.age} years old</span>
                    </div>
                  </div>
                </div>

                <div className="match-type-request-large">
                  Requesting {getTypeRequestParts(match.preference).article} <span className="match-type-text">{getTypeRequestParts(match.preference).type}</span>
                </div>

                <div className="match-section">
                  <h4>What they're looking for:</h4>
                  <p className="truncated-text">{truncateText(match.lookingFor)}</p>
                </div>

                <div className="match-section">
                  <h4>Future goals:</h4>
                  <p className="truncated-text">{truncateText(match.future)}</p>
                </div>

                <div className="match-section">
                  <h4>Discipling experience:</h4>
                  <p className="truncated-text">{truncateText(match.disciplingExperience || 'Not specified')}</p>
                </div>

                <button
                  className="see-more-btn"
                  onClick={() => handleSeeMore(match.id)}
                >
                  <FaChevronDown />
                  <span>See More</span>
                </button>
              </div>

              <div className="match-card-footer">
                <button
                  className={`request-match-btn ${requestedMatches.has(match.id) ? 'requested' : ''}`}
                  onClick={() => handleRequestMatchClick(match)}
                  disabled={requestedMatches.has(match.id)}
                >
                  {requestedMatches.has(match.id) ? 'Request Sent ✓' : 'Request Match'}
                </button>
              </div>
            </div>
            ))
          )}
        </div>

        {/* Modal for expanded view */}
        {expandedCard && (() => {
          const match = matches.find(m => m.id === expandedCard)
          if (!match) return null
          return (
            <div className="modal-overlay" onClick={handleCloseModal}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={handleCloseModal}>
                  <FaTimes />
                </button>
                <div className="modal-header">
                  <div className="match-avatar">
                    <FaUser />
                  </div>
                  <div className="modal-header-info">
                    <div className="match-primary-info">
                      <h2>{match.name}</h2>
                      <span className="match-email">{match.email}</span>
                    </div>
                    <div className="match-secondary-info">
                      <span className="match-gender">{formatGender(match.gender)}</span>
                      <span className="match-age">{match.age} years old</span>
                    </div>
                  </div>
                </div>

                <div className="modal-body">
                  <div className="match-type-request-large">
                    Requesting {getTypeRequestParts(match.preference).article} <span className="match-type-text">{getTypeRequestParts(match.preference).type}</span>
                  </div>

                  <div className="modal-section">
                    <h4>What they're looking for:</h4>
                    <p>{match.lookingFor}</p>
                  </div>

                  <div className="modal-section">
                    <h4>Future goals:</h4>
                    <p>{match.future}</p>
                  </div>

                  <div className="modal-section">
                    <h4>Discipling experience:</h4>
                    <p>{match.disciplingExperience || 'Not specified'}</p>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    className={`request-match-btn ${requestedMatches.has(match.id) ? 'requested' : ''}`}
                    onClick={() => {
                      handleRequestMatchClick(match)
                      handleCloseModal()
                    }}
                    disabled={requestedMatches.has(match.id)}
                  >
                    {requestedMatches.has(match.id) ? 'Request Sent ✓' : 'Request Match'}
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Message Modal */}
        {showMessageModal && selectedMatch && (
          <div className="modal-overlay" onClick={handleCancelRequest}>
            <div className="modal-content message-modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={handleCancelRequest}>
                <FaTimes />
              </button>
              <div className="modal-header">
                <div className="match-avatar">
                  <FaUser />
                </div>
                <div className="modal-header-info">
                  <h2>Send Request to {selectedMatch.name}</h2>
                  <p className="modal-subtitle">Add a message to your request</p>
                </div>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="request-message">Message (Optional)</label>
                  <textarea
                    id="request-message"
                    className="message-textarea"
                    placeholder="Write a message to introduce yourself and explain why you'd like to connect..."
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    rows="6"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="cancel-btn"
                  onClick={handleCancelRequest}
                >
                  Cancel
                </button>
                <button
                  className="send-request-btn"
                  onClick={handleSendRequest}
                >
                  Send Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Matchmaking

