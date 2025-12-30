import { useState, useEffect, useRef } from 'react'
import { useProfile } from '../context/ProfileContext'
import { useChurches } from '../context/ChurchesContext'
import { useAuth } from '../context/AuthContext'
import './Profile.css'

const API_BASE_URL = 'http://localhost:8080/api'

function Profile() {
  const { profile, updateProfile } = useProfile()
  const { churches } = useChurches()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    church: '',
    dateOfBirth: '',
    gender: ''
  })
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const lastUserIdRef = useRef(null)

  // Convert YYYY-MM-DD to MM/DD/YYYY
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = date.getFullYear()
    return `${month}/${day}/${year}`
  }

  // Convert MM/DD/YYYY to YYYY-MM-DD
  const formatDateForAPI = (dateString) => {
    if (!dateString) return ''
    const match = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (!match) return ''
    const [, month, day, year] = match
    return `${year}-${month}-${day}`
  }

  useEffect(() => {
    // Load profile data from user.profile (from login response)
    // Only re-initialize if user changes (login/logout) or if we haven't initialized yet
    const currentUserId = user?.profile?.id
    
    if (user && user.profile && currentUserId !== lastUserIdRef.current) {
      const name = user.profile.name || ''
      const email = user.profile.email || ''
      const church = user.profile.church || ''
      const dateOfBirth = user.profile.dob ? formatDateForDisplay(user.profile.dob) : ''
      const gender = user.profile.gender || ''

      setFormData({ name, email, church, dateOfBirth, gender })
      lastUserIdRef.current = currentUserId
    } else if (!user && profile && lastUserIdRef.current !== null) {
      // User logged out, reset
      lastUserIdRef.current = null
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        church: profile.church || '',
        dateOfBirth: profile.dateOfBirth || '',
        gender: profile.gender || ''
      })
    } else if (!user && !lastUserIdRef.current && profile) {
      // Initial load without user (shouldn't happen, but handle gracefully)
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        church: profile.church || '',
        dateOfBirth: profile.dateOfBirth || '',
        gender: profile.gender || ''
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.profile?.id, user?.profile?.name, user?.profile?.email, user?.profile?.church, user?.profile?.dob, user?.profile?.gender])

  const formatDateInput = (value) => {
    // Check if input ends with a slash (user is trying to move to next section)
    const endsWithSlash = value.endsWith('/')
    
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '')
    
    // Limit to 8 digits (MMDDYYYY)
    const limited = digits.slice(0, 8)
    
    // Format with slashes: MM/DD/YYYY
    if (limited.length === 0) {
      return ''
    } else if (limited.length === 1) {
      // Single digit month
      if (endsWithSlash) {
        // User typed "1/" - pad to "01/"
        return `${limited.padStart(2, '0')}/`
      }
      return limited
    } else if (limited.length === 2) {
      // Two digits for month - pad if single digit, add slash
      const month = limited.slice(0, 2).padStart(2, '0')
      return `${month}/`
    } else if (limited.length === 3) {
      // Month + 1 digit day
      const month = limited.slice(0, 2).padStart(2, '0')
      const day = limited.slice(2)
      if (endsWithSlash) {
        // User typed "1/5/" - pad day to "01/05/"
        return `${month}/${day.padStart(2, '0')}/`
      }
      return `${month}/${day}`
    } else if (limited.length === 4) {
      // Month + 2 digits day - pad both if needed, add slash
      const month = limited.slice(0, 2).padStart(2, '0')
      const day = limited.slice(2, 4).padStart(2, '0')
      return `${month}/${day}/`
    } else {
      // Full date - pad month and day
      const month = limited.slice(0, 2).padStart(2, '0')
      const day = limited.slice(2, 4).padStart(2, '0')
      const year = limited.slice(4)
      return `${month}/${day}/${year}`
    }
  }

  const validateDate = (dateString) => {
    if (!dateString) return false
    
    // Check format MM/DD/YYYY
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
    const match = dateString.match(dateRegex)
    
    if (!match) return false
    
    const month = parseInt(match[1], 10)
    const day = parseInt(match[2], 10)
    const year = parseInt(match[3], 10)
    
    // Validate month (1-12)
    if (month < 1 || month > 12) return false
    
    // Validate day (1-31, but we'll check month-specific limits)
    if (day < 1 || day > 31) return false
    
    // Validate year (reasonable range, e.g., 1900 to current year)
    const currentYear = new Date().getFullYear()
    if (year < 1900 || year > currentYear) return false
    
    // Check if the date is actually valid (handles leap years, month days, etc.)
    const date = new Date(year, month - 1, day)
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return false
    }
    
    // Check if date is in the future
    if (date > new Date()) return false
    
    return true
  }

  const handleDateChange = (e) => {
    const rawValue = e.target.value
    const formatted = formatDateInput(rawValue)
    setFormData({
      ...formData,
      dateOfBirth: formatted
    })
    setIsSaved(false)
  }

  const handleDateBlur = (e) => {
    const dateValue = e.target.value
    if (dateValue && !validateDate(dateValue)) {
      // Clear invalid date
      setFormData({
        ...formData,
        dateOfBirth: ''
      })
    }
  }

  const handleChange = (e) => {
    // Use special handler for date of birth
    if (e.target.name === 'dateOfBirth') {
      handleDateChange(e)
      return
    }
    
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setIsSaved(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!user || !user.profile || !user.session_id) {
      alert('You must be logged in to update your profile')
      return
    }

    // Validate date
    if (!validateDate(formData.dateOfBirth)) {
      alert('Please enter a valid date of birth')
      return
    }

    setIsSaving(true)

    try {
      const formDataToSend = new URLSearchParams()
      formDataToSend.append('action', 'update_profile')
      formDataToSend.append('id', user.profile.id)
      formDataToSend.append('session_id', user.session_id)
      formDataToSend.append('name', formData.name)
      formDataToSend.append('email', formData.email)
      formDataToSend.append('dob', formatDateForAPI(formData.dateOfBirth))
      formDataToSend.append('church', formData.church)
      formDataToSend.append('gender', formData.gender)

      const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formDataToSend.toString()
      })

      const result = await response.json()

      if (response.status >= 200 && response.status < 300) {
        // Update local state
        updateProfile(formData)
        // Update user object in AuthContext
        if (user) {
          user.profile = {
            ...user.profile,
            name: formData.name,
            email: formData.email,
            church: formData.church,
            dob: formatDateForAPI(formData.dateOfBirth),
            gender: formData.gender
          }
        }
        setIsSaved(true)
        setTimeout(() => {
          setIsSaved(false)
        }, 3000)
      } else {
        alert(result.message || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-card">
          <h1>Your Profile</h1>
          <p className="profile-description">
            Manage your profile information to help others find you and match with you.
          </p>

          {isSaved && (
            <div className="save-notification">
              <span>✓</span>
              <p>Profile saved successfully!</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label htmlFor="name">
                Full Name <span className="required-star">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
                className="name-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">
                Email <span className="required-star">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="email-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="church">
                Church <span className="required-star">*</span>
              </label>
              <select
                id="church"
                name="church"
                value={formData.church}
                onChange={handleChange}
                required
                className="church-select"
              >
                <option value="">-- Select a church --</option>
                {churches && churches.map((church) => (
                  <option key={church.id} value={church.name}>
                    {church.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="dateOfBirth">
                Date of Birth <span className="required-star">*</span>
              </label>
              <input
                type="text"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                onBlur={handleDateBlur}
                placeholder="MM/DD/YYYY (e.g., 01/15/1990)"
                pattern="\d{2}/\d{2}/\d{4}"
                required
                className="date-input"
                maxLength={10}
              />
              <small className="date-hint">Format: MM/DD/YYYY</small>
            </div>

            <div className="form-group">
              <label htmlFor="gender">
                Gender <span className="required-star">*</span>
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                className="church-select"
              >
                <option value="">-- Select gender --</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>

            <button type="submit" className="submit-btn" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Profile

