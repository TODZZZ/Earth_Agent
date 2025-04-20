import React from 'react'

interface LoginButtonProps {
  isLoggedIn: boolean
  onLoginChange: (isLoggedIn: boolean) => void
}

export const LoginButton: React.FC<LoginButtonProps> = ({ isLoggedIn, onLoginChange }) => {
  const handleLogin = async () => {
    try {
      if (!isLoggedIn) {
        // Mock login for now, will implement real Google OAuth later
        console.log('Logging in with Google...')
        // Simulate successful login
        onLoginChange(true)
      } else {
        // Mock logout
        console.log('Logging out...')
        onLoginChange(false)
      }
    } catch (error) {
      console.error('Login error:', error)
    }
  }

  return (
    <button 
      onClick={handleLogin}
      className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
    >
      {isLoggedIn ? 'Logout' : 'Login with Google'}
    </button>
  )
} 