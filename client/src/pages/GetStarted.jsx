import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../context/ProfileContext'
import './GetStarted.css'

function GetStarted() {
  const navigate = useNavigate()
  const { profile, updateProfile } = useProfile()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    church: profile.church || '',
    preference: profile.preference || '',
    age: profile.age || '',
    gender: profile.gender || '',
    lookingFor: profile.lookingFor || '',
    future: profile.future || '',
    disciplingExperience: profile.disciplingExperience || ''
  })

  // Update form data when profile changes
  useEffect(() => {
    setFormData({
      church: profile.church || '',
      preference: profile.preference || '',
      age: profile.age || '',
      gender: profile.gender || '',
      lookingFor: profile.lookingFor || '',
      future: profile.future || '',
      disciplingExperience: profile.disciplingExperience || ''
    })
  }, [profile])

  // Sample churches - in a real app, this would come from an API
  // Matching the churches from Partnerships page
  const churches = [
    'Grace Community Church',
    'Faith Baptist Church',
    'Hope Fellowship',
    'Living Word Church',
    'Victory Christian Center',
    'Calvary Chapel'
  ]

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleChurchSubmit = (e) => {
    e.preventDefault()
    if (formData.church) {
      setStep(2)
    }
  }

  const handlePreferenceSubmit = (e) => {
    e.preventDefault()
    if (formData.preference) {
      setStep(3)
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    // Save to profile context
    updateProfile(formData)
    // In a real app, this would submit to an API
    console.log('Form submitted:', formData)
    navigate('/thank-you')
  }

  const handleBack = () => {
    if (step === 3) {
      setStep(2)
    } else if (step === 2) {
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

  return (
    <div className="get-started-page">
      <div className="get-started-container">
        <div className="get-started-card">
          <div className="step-indicator">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>
              <span className="step-number">1</span>
              <span className="step-label">Church</span>
            </div>
            <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>
              <span className="step-number">2</span>
              <span className="step-label">Preference</span>
            </div>
            <div className={`step-line ${step >= 3 ? 'active' : ''}`}></div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>
              <span className="step-number">3</span>
              <span className="step-label">Profile</span>
            </div>
          </div>

          {step === 1 && (
            <div className="step-content">
              <h1>Select Your Church</h1>
              <p className="step-description">
                Choose the church you're associated with to get started.
              </p>
              <form onSubmit={handleChurchSubmit} className="church-form">
                <div className="form-group">
                  <label htmlFor="church">Church</label>
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
                <button type="submit" className="submit-btn">
                  Continue
                </button>
              </form>
            </div>
          )}

          {step === 2 && (
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
                  <button type="button" onClick={() => setStep(1)} className="back-btn">
                    Back
                  </button>
                  <button type="submit" className="submit-btn">
                    Continue
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 3 && (
            <div className="step-content">
              <h1>Tell Us About Yourself</h1>
              <p className="step-description">
                Help us match you with the right discipling relationship.
              </p>
              <form onSubmit={handleFormSubmit} className="profile-form">
                <div className="form-group">
                  <label htmlFor="age">Age</label>
                  <input
                    type="number"
                    id="age"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="Enter your age"
                    min="13"
                    max="120"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="gender">Gender</label>
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

                {formData.preference === 'disciple' && (
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
                )}

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

