import React, { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  code?: string
}

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Mock AI response for now, will connect to LangChain agents later
      setTimeout(() => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'This is a mock response. I will integrate with LangGraph agents in the next phase.',
          code: 'var image = ee.Image("USGS/SRTMGL1_003");\nvar elevation = image.select("elevation");\nMap.setCenter(-112.8598, 36.2841, 9); // Center on the Grand Canyon\nMap.addLayer(elevation, {min: 0, max: 4000, palette: ["blue", "green", "yellow", "red"]}, "Elevation");'
        }
        setMessages(prev => [...prev, assistantMessage])
        setIsLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Error processing message:', error)
      setIsLoading(false)
    }
  }

  const handleRunCode = (code: string) => {
    console.log('Running code in Earth Engine:', code)
    // Will implement code execution via content script in Phase 2
    alert('Code execution will be implemented in Phase 2')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto mb-4">
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`mb-4 p-3 rounded-lg ${
              message.role === 'user' 
                ? 'bg-blue-100 ml-8' 
                : 'bg-gray-100 mr-8'
            }`}
          >
            <div className="font-semibold mb-1">
              {message.role === 'user' ? 'You' : 'Earth Agent'}
            </div>
            <div className="whitespace-pre-wrap">{message.content}</div>
            
            {message.code && (
              <div className="mt-2">
                <div className="bg-gray-800 text-gray-200 p-3 rounded-md overflow-x-auto">
                  <pre><code>{message.code}</code></pre>
                </div>
                <button
                  onClick={() => handleRunCode(message.code!)}
                  className="mt-2 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Run Code
                </button>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-center items-center my-4">
            <div className="animate-pulse text-gray-500">Earth Agent is thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Earth Agent something..."
          className="flex-1 border rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
        >
          Send
        </button>
      </form>
    </div>
  )
} 