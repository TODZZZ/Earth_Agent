import React, { useState, useRef, useEffect } from 'react'
import { initializeAgentSystem } from '../lib/agents'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  code?: string
}

interface ChatInterfaceProps {
  onQuerySubmit?: () => Promise<void>
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onQuerySubmit }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [agentSystem, setAgentSystem] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize the agent system on component mount
  useEffect(() => {
    const setup = async () => {
      try {
        console.log('Initializing agent system...')
        const system = await initializeAgentSystem()
        console.log('Agent system initialized')
        setAgentSystem(system)
      } catch (error) {
        console.error('Error initializing agent system:', error)
      }
    }
    setup()
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedInput = input.trim()
    if (!trimmedInput) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedInput
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Track usage if callback provided
      if (onQuerySubmit) {
        await onQuerySubmit();
      }
      
      if (agentSystem) {
        // Use the agent system to process the input - ensure input is valid
        if (trimmedInput) {
          try {
            const response = await agentSystem(trimmedInput)

            // Validate the response object
            if (!response || typeof response !== 'object') {
              throw new Error('Invalid response from agent system')
            }
            
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: response && typeof response.response === 'string' 
                ? response.response 
                : 'I encountered an error processing your request.',
              code: response && typeof response.code === 'string' 
                ? response.code 
                : undefined
            }
            
            setMessages(prev => [...prev, assistantMessage])
          } catch (agentError) {
            console.error('Error in agent system:', agentError)
            const errorMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `I encountered an error while processing your request: ${agentError instanceof Error ? agentError.message : 'Unknown error'}`,
            }
            setMessages(prev => [...prev, errorMessage])
          }
        } else {
          // Handle empty input (shouldn't happen due to the check at the beginning)
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: "I couldn't process your request. Please provide a valid query.",
          }
          setMessages(prev => [...prev, errorMessage])
        }
      } else {
        // Fallback if agent system isn't initialized
        setTimeout(() => {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'The Earth Agent system is still initializing. Please try again in a moment.',
            code: '// Agent system initializing'
          }
          setMessages(prev => [...prev, assistantMessage])
          setIsLoading(false)
        }, 1000)
      }
    } catch (error) {
      console.error('Error processing message:', error)
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I encountered an error while processing your request. Please try again with a different query.',
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleRunCode = (code: string) => {
    console.log('Running code in Earth Engine:', code)
    
    // Send a message to the content script to run the code
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id, 
          { type: 'RUN_CODE', code },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error sending message:', chrome.runtime.lastError)
              alert('Error: Could not run code in Earth Engine. Make sure you are on the Earth Engine Code Editor page.')
              return
            }
            
            if (response?.success) {
              alert('Code successfully sent to Earth Engine.')
            } else {
              alert(`Error: ${response?.error || 'Could not run code in Earth Engine'}`)
            }
          }
        )
      } else {
        alert('Error: No active tab found. Make sure you are on the Earth Engine Code Editor page.')
      }
    })
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