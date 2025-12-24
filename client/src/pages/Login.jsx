import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showResendActivation, setShowResendActivation] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login, createAccount } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    if (isLogin) {
      // Login
      const result = await login(formData.email, formData.password)
      if (result.success) {
        navigate('/')
      } else {
        setError(result.error)
        // Show resend activation option if account not activated
        if (result.error.includes('not activated') || result.error.includes('activation')) {
          setShowResendActivation(true)
        }
      }
    } else {
      // Create Account
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        setIsSubmitting(false)
        return
      }

      if (formData.password.length < 4) {
        setError('Password must be at least 4 characters')
        setIsSubmitting(false)
        return
      }

      const result = await createAccount(formData.email, formData.password)
      if (result.success) {
        setSuccess(result.message || 'Account created! Please check your email for activation instructions.')
        setFormData({ email: '', password: '', confirmPassword: '', name: '' })
        // Switch to login after 3 seconds
        setTimeout(() => {
          setIsLogin(true)
          setSuccess('')
        }, 3000)
      } else {
        setError(result.error)
      }
    }
    setIsSubmitting(false)
  }

  const handleResendActivation = async () => {
    setError('')
    setSuccess('')
    setIsSubmitting(true)
    // TODO: Implement resend activation API call
    setSuccess('Activation code sent to your email')
    setShowResendActivation(false)
    setIsSubmitting(false)
  }

  const handleRequestResetPassword = async () => {
    setError('')
    setSuccess('')
    setIsSubmitting(true)
    // TODO: Implement reset password API call
    setSuccess('If the email exists, a password reset code has been sent')
    setShowResetPassword(false)
    setIsSubmitting(false)
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <h1>{isLogin ? 'Login' : 'Create Account'}</h1>
          
          <div className="toggle-buttons">
            <button 
              className={isLogin ? 'active' : ''}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button 
              className={!isLogin ? 'active' : ''}
              onClick={() => setIsLogin(false)}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              {success}
            </div>
          )}

          {showResendActivation && (
            <div className="resend-activation-box">
              <p>Your account is not activated. Would you like us to resend the activation code?</p>
              <button 
                type="button"
                onClick={handleResendActivation}
                disabled={isSubmitting}
                className="resend-btn"
              >
                {isSubmitting ? 'Sending...' : 'Resend Activation Code'}
              </button>
              <button 
                type="button"
                onClick={() => setShowResendActivation(false)}
                className="cancel-resend-btn"
              >
                Cancel
              </button>
            </div>
          )}

          {showResetPassword && (
            <div className="reset-password-box">
              <p>Enter your email to receive a password reset code:</p>
              <button 
                type="button"
                onClick={handleRequestResetPassword}
                disabled={isSubmitting || !formData.email}
                className="reset-btn"
              >
                {isSubmitting ? 'Sending...' : 'Send Reset Code'}
              </button>
              <button 
                type="button"
                onClick={() => setShowResetPassword(false)}
                className="cancel-reset-btn"
              >
                Cancel
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required={!isLogin}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
              />
            </div>

            {!isLogin && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  required={!isLogin}
                />
              </div>
            )}

            {isLogin && (
              <div className="form-options">
                <label className="checkbox-label">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <a 
                  href="#" 
                  className="forgot-password"
                  onClick={(e) => {
                    e.preventDefault()
                    setShowResetPassword(true)
                  }}
                >
                  Forgot password?
                </a>
              </div>
            )}

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : (isLogin ? 'Login' : 'Create Account')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login

