import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import '../styles/globals.css'
import { ChatInterface } from '../components/ChatInterface'
import { LoginButton } from '../components/LoginButton'

const Sidepanel: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  
  return (
    <div className="flex flex-col h-screen">
      <header className="p-4 border-b flex justify-between items-center">
        <h1 className="text-xl font-bold">Earth Agent</h1>
        <LoginButton isLoggedIn={isLoggedIn} onLoginChange={setIsLoggedIn} />
      </header>
      
      <main className="flex-1 overflow-auto p-4">
        <ChatInterface />
      </main>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Sidepanel />
  </React.StrictMode>,
)

// Log that the sidepanel has loaded
console.log('Earth Agent sidepanel loaded') 