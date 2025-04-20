import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import '../styles/globals.css'
import { ChatInterface } from '../components/ChatInterface'
import ApiKeyForm from './components/ApiKeyForm'
import { isApiKeySet } from '@/lib/config'

const Sidepanel: React.FC = () => {
  const [isApiKeyConfigured, setIsApiKeyConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    // Check if API key is set on component mount
    const checkApiKey = async () => {
      try {
        const hasApiKey = await isApiKeySet();
        setIsApiKeyConfigured(hasApiKey);
      } catch (err) {
        console.error('Error checking API key status:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkApiKey();
  }, []);
  
  const handleApiKeySet = () => {
    setIsApiKeyConfigured(true);
  };
  
  return (
    <div className="flex flex-col h-full w-full">
      <header className="p-4 border-b">
        <h1 className="text-xl font-bold mb-2">Earth Agent</h1>
        <p className="text-sm text-gray-600">
          AI-powered assistant for Google Earth Engine
        </p>
      </header>
      
      <main className="flex-1 overflow-auto p-4 flex flex-col w-full">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : !isApiKeyConfigured ? (
          <div className="flex-1 flex items-center justify-center w-full">
            <div className="w-full max-w-md">
              <ApiKeyForm onApiKeySet={handleApiKeySet} />
            </div>
          </div>
        ) : (
          <ChatInterface />
        )}
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