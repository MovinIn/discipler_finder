import { useState, useEffect } from 'react'
import { useProfile } from '../context/ProfileContext'
import './Profile.css'

function Profile() {
  const { profile, updateProfile } = useProfile()
  const [formData, setFormData] = useState({
    church: profile.church || '',
    age: profile.age || '',
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
      age: profile.age || '',
      gender: profile.gender || '',
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
              <label htmlFor="age">
                Age <span className="required-star">*</span>
              </label>
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

