import { createContext, useContext, useState } from 'react'

const ProfileContext = createContext()

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState({
    church: '',
    preference: '', // 'disciple', 'be-discipled', 'accountability'
    age: '',
    gender: '',
    lookingFor: '',
    future: '',
    disciplingExperience: '',
    matchmakingGenderPreference: '', // Gender filter for matchmaking
    matchmakingMinAge: '', // Minimum age filter
    matchmakingMaxAge: '' // Maximum age filter
  })

  const updateProfile = (data) => {
    setProfile(prev => ({ ...prev, ...data }))
  }

  const clearProfile = () => {
    setProfile({
      church: '',
      preference: '',
      age: '',
      gender: '',
      lookingFor: '',
      future: '',
      disciplingExperience: '',
      matchmakingGenderPreference: '',
      matchmakingMinAge: '',
      matchmakingMaxAge: ''
    })
  }

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, clearProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}

