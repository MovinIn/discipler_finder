import './Home.css'

function Home() {
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-content">
          <h1>Welcome to Discipler Finder</h1>
          <p className="hero-subtitle">
            Connect with spiritual mentors and disciples in your community
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <h2>About Discipler Finder</h2>
          <p>
            Discipler Finder is a platform designed to help Christians connect with 
            spiritual mentors and disciples. Whether you're looking for someone to guide 
            you in your faith journey or you're ready to disciple others, our application 
            makes it easy to find meaningful connections within your community.
          </p>
          <p>
            Our mission is to facilitate authentic relationships that foster spiritual 
            growth and accountability. Through our platform, you can search for mentors 
            based on location, interests, and spiritual gifts, making it easier than ever 
            to find the right discipling relationship.
          </p>
        </div>
      </section>

      <section className="features-section">
        <div className="container">
          <h2>Key Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Find Mentors</h3>
              <p>
                Search for experienced disciples who can guide you in your spiritual 
                journey and help you grow in your faith.
              </p>
            </div>
            <div className="feature-card">
              <h3>Connect with Disciples</h3>
              <p>
                If you're ready to disciple others, connect with those who are seeking 
                mentorship and spiritual guidance.
              </p>
            </div>
            <div className="feature-card">
              <h3>Build Community</h3>
              <p>
                Join a network of believers committed to growing together and supporting 
                one another in faith.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home

