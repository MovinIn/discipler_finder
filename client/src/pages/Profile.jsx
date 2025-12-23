import { useState, useEffect } from 'react'
import { useProfile } from '../context/ProfileContext'
import './Profile.css'

function Profile() {
  const { profile, updateProfile } = useProfile()
  const [formData, setFormData] = useState({
    church: profile.church || '',
    dateOfBirth: profile.dateOfBirth || '',
    gender: profile.gender || '',
    lookingFor: profile.lookingFor || '',
    future: profile.future || '',
    disciplingExperience: profile.disciplingExperience || ''
  })
  const [isSaved, setIsSaved] = useState(false)

  // Sample churches - matching the churches from Partnerships page
  const churches = [
    'Grace Community Church',
    'Faith Baptist Church',
    'Hope Fellowship',
    'Living Word Church',
    'Victory Christian Center',
    'Calvary Chapel'
  ]

  useEffect(() => {
    // Load profile data when component mounts or profile changes
    setFormData({
      church: profile.church || '',
      dateOfBirth: profile.dateOfBirth || '',
      gender: profile.gender || '',
      lookingFor: profile.lookingFor || '',
      future: profile.future || '',
      disciplingExperience: profile.disciplingExperience || ''
    })
  }, [profile])

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

  const handleSubmit = (e) => {
    e.preventDefault()
    updateProfile(formData)
    setIsSaved(true)
    
    // Hide saved message after 3 seconds
    setTimeout(() => {
      setIsSaved(false)
    }, 3000)
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
                {churches.map((church, index) => (
                  <option key={index} value={church}>
                    {church}
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
              >
                <option value="">-- Select gender --</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="lookingFor">What do you look for?</label>
              <textarea
                id="lookingFor"
                name="lookingFor"
                value={formData.lookingFor}
                onChange={handleChange}
                placeholder="Describe what you're looking for in a discipling relationship..."
                rows="4"
              />
            </div>

            <div className="form-group">
              <label htmlFor="future">What do you want from this?</label>
              <textarea
                id="future"
                name="future"
                value={formData.future}
                onChange={handleChange}
                placeholder="Share your goals and what you hope to gain from this experience..."
                rows="4"
              />
            </div>

            <div className="form-group">
              <label htmlFor="disciplingExperience">Discipling Experience</label>
              <textarea
                id="disciplingExperience"
                name="disciplingExperience"
                value={formData.disciplingExperience}
                onChange={handleChange}
                placeholder="Describe your prior experience discipling someone else, if any..."
                rows="4"
              />
            </div>

            <button type="submit" className="submit-btn">
              Save Profile
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Profile

