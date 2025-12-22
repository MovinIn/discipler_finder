import { Link } from 'react-router-dom'
import './ThankYou.css'

function ThankYou() {
  return (
    <div className="thank-you-page">
      <div className="thank-you-container">
        <div className="thank-you-card">
          <div className="success-icon">✓</div>
          <h1>Thank You!</h1>
          <p className="thank-you-message">
            Your information has been submitted successfully. We'll review your 
            profile and help connect you with the right discipling relationship.
          </p>
          <p className="thank-you-submessage">
            You'll be notified once we find a match for you.
          </p>
          <div className="thank-you-actions">
            <Link to="/" className="home-btn">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThankYou

