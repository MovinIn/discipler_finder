import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../context/ProfileContext'
import { useAuth } from '../context/AuthContext'
import './GetStarted.css'

const API_BASE_URL = 'http://localhost:8080/api'

function GetStarted() {
  const navigate = useNavigate()
  const { profile, updateProfile } = useProfile()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    preference: profile.preference || '',
    lookingFor: profile.lookingFor || '',
    future: profile.future || '',
    disciplingExperience: profile.disciplingExperience || ''
  })

  // Update form data when profile changes
  useEffect(() => {
    setFormData({
      preference: profile.preference || '',
      lookingFor: profile.lookingFor || '',
      future: profile.future || '',
      disciplingExperience: profile.disciplingExperience || ''
    })
  }, [profile])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handlePreferenceSubmit = (e) => {
    e.preventDefault()
    if (formData.preference) {
      setStep(2)
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()

    if (!user || !user.profile || !user.session_id) {
      alert('You must be logged in to submit your post')
      return
    }

    try {
      const formDataToSend = new URLSearchParams()
      formDataToSend.append('action', 'send_post')
      formDataToSend.append('id', user.profile.id.toString())
      formDataToSend.append('session_id', user.session_id)
      formDataToSend.append('type', mapPreferenceToBackendType(formData.preference))
      formDataToSend.append('requirements', formData.lookingFor)
      formDataToSend.append('goals', formData.future)
      formDataToSend.append('experience', formData.disciplingExperience || '')

      const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formDataToSend.toString()
      })

      const result = await response.json()

      if (response.status >= 200 && response.status < 300) {
        // Save to profile context
        updateProfile(formData)
        // Navigate to thank you page
        navigate('/thank-you')
      } else {
        alert(result.message || 'Failed to submit your post')
      }
    } catch (error) {
      console.error('Error submitting post:', error)
      alert('Failed to submit your post. Please try again.')
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
    }
  }

  // Get dynamic placeholders based on preference
  const getPlaceholders = () => {
    switch (formData.preference) {
      case 'disciple':
        return {
          lookingFor: 'Describe what you can offer as a discipler and what you look for in someone to disciple...',
          future: 'Share your goals for discipling others and what you hope to achieve...'
        }
      case 'be-discipled':
        return {
          lookingFor: 'Describe what you\'re looking for in a mentor and what areas you want to grow in...',
          future: 'Share your goals for being discipled and what you hope to gain from this relationship...'
        }
      case 'accountability':
        return {
          lookingFor: 'Describe what kind of accountability partner you\'re looking for...',
          future: 'Share your goals for accountability and what you hope to achieve together...'
        }
      default:
        return {
          lookingFor: 'Describe what you\'re looking for in a discipling relationship...',
          future: 'Share your goals and what you hope to gain from this experience...'
        }
    }
  }

  const placeholders = getPlaceholders()

  // Map frontend preference to backend post type
  const mapPreferenceToBackendType = (preference) => {
    switch (preference) {
      case 'disciple':
        return 'M' // User wants to disciple, so they're a Mentor
      case 'be-discipled':
        return 'D' // User wants to be discipled, so they're a Disciple
      case 'accountability':
        return 'A' // User wants accountability, so they're an Accountability partner
      default:
        return 'M'
    }
  }

  return (
    <div className="get-started-page">
      <div className="get-started-container">
        <div className="get-started-card">
          <div className="step-indicator">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>
              <span className="step-number">1</span>
              <span className="step-label">Preference</span>
            </div>
            <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>
              <span className="step-number">2</span>
              <span className="step-label">Profile</span>
            </div>
          </div>

          {step === 1 && (
            <div className="step-content">
              <h1>What Are You Looking For?</h1>
              <p className="step-description">
                Select the type of relationship you're seeking.
              </p>
              <form onSubmit={handlePreferenceSubmit} className="preference-form">
                <div className="preference-options">
                  <label className="preference-option">
                    <input
                      type="radio"
                      name="preference"
                      value="disciple"
                      checked={formData.preference === 'disciple'}
                      onChange={handleChange}
                      required
                    />
                    <div className="preference-card">
                      <h3>I Want to Disciple Someone</h3>
                      <p>I'm ready to mentor and guide someone in their faith journey.</p>
                    </div>
                  </label>

                  <label className="preference-option">
                    <input
                      type="radio"
                      name="preference"
                      value="be-discipled"
                      checked={formData.preference === 'be-discipled'}
                      onChange={handleChange}
                      required
                    />
                    <div className="preference-card">
                      <h3>I Want to Be Discipled</h3>
                      <p>I'm looking for a mentor to guide me in my faith journey.</p>
                    </div>
                  </label>

                  <label className="preference-option">
                    <input
                      type="radio"
                      name="preference"
                      value="accountability"
                      checked={formData.preference === 'accountability'}
                      onChange={handleChange}
                      required
                    />
                    <div className="preference-card">
                      <h3>I Want an Accountability Partner</h3>
                      <p>I'm looking for someone to keep me accountable in my walk with God.</p>
                    </div>
                  </label>
                </div>
                <div className="form-actions">
                  <button type="submit" className="submit-btn">
                    Continue
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="step-content">
              <h1>Tell Us About Yourself</h1>
              <p className="step-description">
                Help us match you with the right discipling relationship.
              </p>
              <form onSubmit={handleFormSubmit} className="profile-form">
                <div className="form-group">
                  <label htmlFor="lookingFor">What do you look for?</label>
                  <textarea
                    id="lookingFor"
                    name="lookingFor"
                    value={formData.lookingFor}
                    onChange={handleChange}
                    placeholder={placeholders.lookingFor}
                    rows="4"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="future">What do you want from this?</label>
                  <textarea
                    id="future"
                    name="future"
                    value={formData.future}
                    onChange={handleChange}
                    placeholder={placeholders.future}
                    rows="4"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="disciplingExperience">Discipling Experience</label>
                  <textarea
                    id="disciplingExperience"
                    name="disciplingExperience"
                    value={formData.disciplingExperience}
                    onChange={handleChange}
                    placeholder="Describe your prior experience discipling someone else..."
                    rows="4"
                  />
                </div>

                <div className="form-actions">
                  <button type="button" onClick={handleBack} className="back-btn">
                    Back
                  </button>
                  <button type="submit" className="submit-btn">
                    Submit
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GetStarted

