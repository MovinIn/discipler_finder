import './DownloadApp.css'

function DownloadApp() {
  return (
    <div className="download-page">
      <div className="container">
        <h1>Download the App</h1>
        <div className="download-content">
          <p>
            Get the Discipler Finder mobile app to connect with mentors and 
            disciples on the go. Available soon on iOS and Android.
          </p>
          <div className="download-buttons">
            <button className="download-btn" disabled>
              Coming Soon - iOS
            </button>
            <button className="download-btn" disabled>
              Coming Soon - Android
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DownloadApp

