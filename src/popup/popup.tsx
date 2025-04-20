import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import '../styles/globals.css'

const Popup: React.FC = () => {
  const [status, setStatus] = useState<string>('Checking status...')
  const [isEarthEnginePage, setIsEarthEnginePage] = useState<boolean>(false)

  useEffect(() => {
    // Check if we're on the Earth Engine page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0]
      if (currentTab && currentTab.url?.includes('code.earthengine.google.com')) {
        setIsEarthEnginePage(true)
        setStatus('Ready to use Earth Agent')
      } else {
        setIsEarthEnginePage(false)
        setStatus('Please navigate to Google Earth Engine Code Editor')
      }
    })
  }, [])

  const openSidepanel = () => {
    // This is a placeholder for Chrome's upcoming side panel API
    // In the future this can use chrome.sidePanel.open() when available
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'OPEN_SIDEPANEL' })
      }
    })
    window.close() // Close the popup
  }

  return (
    <div className="p-4 w-64">
      <h1 className="text-xl font-bold mb-4">Earth Agent</h1>
      
      <div className="mb-4">
        <div className="text-sm">Status:</div>
        <div className={`font-medium ${isEarthEnginePage ? 'text-green-600' : 'text-red-600'}`}>
          {status}
        </div>
      </div>
      
      {isEarthEnginePage && (
        <button 
          onClick={openSidepanel}
          className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Open Earth Agent
        </button>
      )}
      
      {!isEarthEnginePage && (
        <a 
          href="https://code.earthengine.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-2 text-center bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Go to Earth Engine
        </a>
      )}
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
)

console.log('Earth Agent popup loaded') 