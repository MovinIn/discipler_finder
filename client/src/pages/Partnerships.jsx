import { FaChurch, FaCross, FaPrayingHands } from 'react-icons/fa'
import { useChurches } from '../context/ChurchesContext'
import './Partnerships.css'

function Partnerships() {
  const { churches, loading } = useChurches()

  // Map icon codes to icon components
  const getIcon = (imgCode) => {
    switch (imgCode) {
      case 'church':
        return FaChurch
      case 'cross':
        return FaCross
      case 'praying':
        return FaPrayingHands
      default:
        return FaChurch
    }
  }

  if (loading) {
    return (
      <div className="partnerships-page">
        <div className="container">
          <h1>Partner Churches</h1>
          <p>Loading churches...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="partnerships-page">
      <div className="container">
        <h1>Partner Churches</h1>
        <p className="partnerships-intro">
          We are grateful to partner with these churches and ministries that share 
          our vision of connecting believers in discipling relationships.
        </p>
        
        <div className="churches-grid">
          {churches.map((church) => {
            const IconComponent = getIcon(church.img_code)
            return (
              <div key={church.id} className="church-card">
                <div className="church-icon">
                  <IconComponent />
                </div>
                <h3 className="church-name">{church.name}</h3>
                <p className="church-location">{church.address}</p>
                <p className="church-description">{church.splash_text}</p>
              </div>
            )
          })}
        </div>

        <div className="partnership-cta">
          <p>
            Is your church interested in partnering with Discipler Finder?
          </p>
          <button className="contact-btn">Contact Us</button>
        </div>
      </div>
    </div>
  )
}

export default Partnerships

