import { useState, useMemo, useEffect } from 'react'
import { FaUser, FaChurch, FaMapMarkerAlt, FaChevronDown, FaTimes } from 'react-icons/fa'
import { useProfile } from '../context/ProfileContext'
import { useRequests } from '../context/RequestsContext'
import './Matchmaking.css'

function Matchmaking() {
  const { profile, updateProfile } = useProfile()
  const { addSentRequest } = useRequests()
  const [requestedMatches, setRequestedMatches] = useState(new Set())
  const [showNotification, setShowNotification] = useState(false)
  const [notificationPerson, setNotificationPerson] = useState('')
  const [expandedCard, setExpandedCard] = useState(null)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [requestMessage, setRequestMessage] = useState('')

  // Autofill gender preference from profile gender if not already set
  useEffect(() => {
    if (profile.gender && !profile.matchmakingGenderPreference) {
      // Map profile gender to matchmaking preference (case-insensitive)
      const genderLower = profile.gender.toLowerCase()
      if (genderLower === 'male' || genderLower === 'female' || genderLower === 'other') {
        updateProfile({ matchmakingGenderPreference: genderLower })
      }
    }
  }, [profile.gender, profile.matchmakingGenderPreference, updateProfile])

  // Helper function to truncate text
  const truncateText = (text, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
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

  // Sample match data - in a real app, this would come from an API
  const allMatches = [
    {
      id: 1,
      name: 'Sarah Johnson',
      age: 28,
      gender: 'Female',
      church: 'Grace Community Church',
      location: 'Springfield, IL',
      preference: 'be-discipled', // What they want
      lookingFor: 'Looking for a mentor who can help me grow in my faith and provide guidance in my career and personal life.',
      future: 'I hope to deepen my relationship with God and become a better disciple who can eventually mentor others.',
      disciplingExperience: 'None yet, but eager to learn'
    },
    {
      id: 2,
      name: 'Michael Chen',
      age: 35,
      gender: 'Male',
      church: 'Faith Baptist Church',
      location: 'Chicago, IL',
      preference: 'disciple', // What they want - they want to disciple
      lookingFor: 'Seeking someone to disciple me in biblical study and help me develop leadership skills.',
      future: 'I want to become a small group leader and eventually serve in church leadership.',
      disciplingExperience: 'Mentored 2 people over the past 3 years'
    },
    {
      id: 3,
      name: 'Emily Rodriguez',
      age: 24,
      gender: 'Female',
      church: 'Hope Fellowship',
      location: 'Peoria, IL',
      preference: 'be-discipled',
      lookingFor: 'Looking for a female mentor who understands the challenges of being a young professional and a Christian.',
      future: 'I want to grow in my faith and learn how to balance work, relationships, and spiritual growth.',
      disciplingExperience: 'None'
    },
    {
      id: 4,
      name: 'David Thompson',
      age: 42,
      gender: 'Male',
      church: 'Living Word Church',
      location: 'Rockford, IL',
      preference: 'disciple',
      lookingFor: 'Seeking someone to disciple me in prayer and help me become a better husband and father.',
      future: 'I want to lead my family spiritually and be a positive influence in my community.',
      disciplingExperience: 'Discipled 5 people over 8 years'
    },
    {
      id: 5,
      name: 'Jessica Martinez',
      age: 31,
      gender: 'Female',
      church: 'Victory Christian Center',
      location: 'Naperville, IL',
      preference: 'accountability',
      lookingFor: 'Looking for a mentor who can help me navigate life transitions and deepen my faith.',
      future: 'I hope to start a ministry for young women and become a discipler myself.',
      disciplingExperience: 'Mentored 3 young women in the past 2 years'
    },
    {
      id: 6,
      name: 'James Wilson',
      age: 29,
      gender: 'Male',
      church: 'Calvary Chapel',
      location: 'Aurora, IL',
      preference: 'be-discipled',
      lookingFor: 'Seeking a mentor who can help me grow in evangelism and discipleship.',
      future: 'I want to be equipped to make disciples and share the gospel effectively.',
      disciplingExperience: 'None yet'
    },
    {
      id: 7,
      name: 'Robert Kim',
      age: 38,
      gender: 'Male',
      church: 'Grace Community Church',
      location: 'Springfield, IL',
      preference: 'disciple',
      lookingFor: 'Ready to mentor someone in their faith journey and help them grow spiritually.',
      future: 'I want to invest in the next generation of believers and help them become strong disciples.',
      disciplingExperience: 'Discipled 8 people over 10 years'
    },
    {
      id: 8,
      name: 'Lisa Anderson',
      age: 26,
      gender: 'Female',
      church: 'Hope Fellowship',
      location: 'Peoria, IL',
      preference: 'accountability',
      lookingFor: 'Looking for an accountability partner to help me stay consistent in my spiritual disciplines.',
      future: 'I want to grow in consistency and have someone to walk alongside me in my faith journey.',
      disciplingExperience: 'None'
    }
  ]

  // Filter matches based on user preferences
  const matches = useMemo(() => {
    let filtered = allMatches

    // Filter by preference (disciple/be-discipled/accountability)
    if (profile.preference) {
      filtered = filtered.filter(match => {
        if (profile.preference === 'disciple') {
          return match.preference === 'be-discipled'
        } else if (profile.preference === 'be-discipled') {
          return match.preference === 'disciple'
        } else if (profile.preference === 'accountability') {
          return match.preference === 'accountability'
        }
        return true
      })
    }

    // Filter by gender preference
    if (profile.matchmakingGenderPreference) {
      filtered = filtered.filter(match => 
        match.gender.toLowerCase() === profile.matchmakingGenderPreference.toLowerCase()
      )
    }

    // Filter by age range
    if (profile.matchmakingMinAge) {
      const minAge = parseInt(profile.matchmakingMinAge)
      filtered = filtered.filter(match => match.age >= minAge)
    }

    if (profile.matchmakingMaxAge) {
      const maxAge = parseInt(profile.matchmakingMaxAge)
      filtered = filtered.filter(match => match.age <= maxAge)
    }

    return filtered
  }, [profile.preference, profile.matchmakingGenderPreference, profile.matchmakingMinAge, profile.matchmakingMaxAge, allMatches])

  const handleRequestMatchClick = (match) => {
    setSelectedMatch(match)
    setRequestMessage('')
    setShowMessageModal(true)
  }

  const handleSendRequest = () => {
    if (!selectedMatch) return

    // Add to sent requests
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
      id: Date.now(),
      userId: selectedMatch.id,
      name: selectedMatch.name,
      email: `${selectedMatch.name.toLowerCase().replace(' ', '.')}@example.com`,
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
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
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
          {matches.map((match) => (
            <div key={match.id} className="match-card">
              <div className="match-content">
                <div className="match-header">
                  <div className="match-avatar">
                    <FaUser />
                  </div>
                  <div className="match-info">
                    <h3 className="match-name">{match.name}</h3>
                    <div className="match-details">
                      <span className="match-age">{match.age} years old</span>
                      <span className="match-gender">{match.gender}</span>
                    </div>
                  </div>
                </div>

                <div className="match-location">
                  <FaMapMarkerAlt />
                  <span>{match.location}</span>
                </div>

                <div className="match-church">
                  <FaChurch />
                  <span>{match.church}</span>
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
          ))}
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
                    <h2>{match.name}</h2>
                    <div className="match-details">
                      <span>{match.age} years old</span>
                      <span>{match.gender}</span>
                    </div>
                  </div>
                </div>

                <div className="modal-body">
                  <div className="modal-section">
                    <div className="modal-info-row">
                      <FaMapMarkerAlt />
                      <span>{match.location}</span>
                    </div>
                    <div className="modal-info-row">
                      <FaChurch />
                      <span>{match.church}</span>
                    </div>
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

