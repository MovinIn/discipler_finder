import { FaChurch, FaCross, FaPrayingHands } from 'react-icons/fa'
import './Partnerships.css'

function Partnerships() {
  // Sample church data - in a real app, this would come from an API
  const churches = [
    {
      id: 1,
      name: 'Grace Community Church',
      location: 'Springfield, IL',
      icon: FaChurch,
      description: 'A welcoming community focused on discipleship and spiritual growth.'
    },
    {
      id: 2,
      name: 'Faith Baptist Church',
      location: 'Chicago, IL',
      icon: FaCross,
      description: 'Committed to biblical teaching and authentic relationships.'
    },
    {
      id: 3,
      name: 'Hope Fellowship',
      location: 'Peoria, IL',
      icon: FaPrayingHands,
      description: 'Building disciples who make disciples in our community.'
    },
    {
      id: 4,
      name: 'Living Word Church',
      location: 'Rockford, IL',
      icon: FaChurch,
      description: 'Empowering believers to grow in faith and serve others.'
    },
    {
      id: 5,
      name: 'Victory Christian Center',
      location: 'Naperville, IL',
      icon: FaCross,
      description: 'A vibrant community dedicated to spiritual transformation.'
    },
    {
      id: 6,
      name: 'Calvary Chapel',
      location: 'Aurora, IL',
      icon: FaPrayingHands,
      description: 'Teaching God\'s Word and fostering deep discipleship relationships.'
    }
  ]

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
            const IconComponent = church.icon
            return (
              <div key={church.id} className="church-card">
                <div className="church-icon">
                  <IconComponent />
                </div>
                <h3 className="church-name">{church.name}</h3>
                <p className="church-location">{church.location}</p>
                <p className="church-description">{church.description}</p>
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

