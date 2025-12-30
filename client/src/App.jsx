import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProfileProvider } from './context/ProfileContext'
import { ChatProvider } from './context/ChatContext'
import { RequestsProvider } from './context/RequestsContext'
import { ChurchesProvider } from './context/ChurchesContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Purpose from './pages/Purpose'
import Partnerships from './pages/Partnerships'
import DownloadApp from './pages/DownloadApp'
import Login from './pages/Login'
import GetStarted from './pages/GetStarted'
import Matchmaking from './pages/Matchmaking'
import Profile from './pages/Profile'
import ThankYou from './pages/ThankYou'
import SentRequests from './pages/SentRequests'
import ReceivedRequests from './pages/ReceivedRequests'
import Posts from './pages/Posts'
import Chat from './pages/Chat'
import './App.css'

function App() {
  return (
    <ChurchesProvider>
      <AuthProvider>
        <ProfileProvider>
          <ChatProvider>
            <RequestsProvider>
              <Router>
                <div className="App">
                  <Navbar />
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/purpose" element={<Purpose />} />
                    <Route path="/partnerships" element={<Partnerships />} />
                    <Route path="/download" element={<DownloadApp />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/get-started" element={<GetStarted />} />
                    <Route path="/matchmaking" element={<Matchmaking />} />
                    <Route path="/profile" element={<Profile />} />
                  <Route path="/thank-you" element={<ThankYou />} />
                  <Route path="/sent-requests" element={<SentRequests />} />
                  <Route path="/received-requests" element={<ReceivedRequests />} />
                  <Route path="/posts" element={<Posts />} />
                  <Route path="/chat/:chatId?" element={<Chat />} />
                  </Routes>
                </div>
              </Router>
            </RequestsProvider>
          </ChatProvider>
        </ProfileProvider>
      </AuthProvider>
    </ChurchesProvider>
  )
}

export default App

