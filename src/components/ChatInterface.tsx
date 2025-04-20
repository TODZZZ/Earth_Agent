import React, { useState, useRef, useEffect } from 'react'
import { initializeAgentSystem } from '../lib/agents'
import { AgentResponseSchema } from '../lib/agents/types'
import { z } from 'zod'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  code?: string
}

interface ChatInterfaceProps {
  onQuerySubmit?: () => Promise<void>
}

// Define the possible agent error types to identify which agent failed
interface AgentError extends Error {
  agent?: string;   // Which agent failed (planner, database selector, etc.)
  phase?: string;   // Which phase of processing failed
  details?: any;    // Additional error details
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onQuerySubmit }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [agentSystem, setAgentSystem] = useState<any>(null)
  const [agentInitError, setAgentInitError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize the agent system on component mount
  useEffect(() => {
    const setup = async () => {
      try {
        console.log('Initializing agent system...')
        const system = await initializeAgentSystem()
        
        // Add defensive check to ensure system is a function
        if (typeof system !== 'function') {
          console.error('Agent system is not a function!', system)
          throw new Error('Agent system initialization failed: system is not a function')
        }
        
        console.log('Agent system initialized successfully')
        setAgentSystem(() => system) // Wrap in arrow function to ensure function type
      } catch (error) {
        console.error('Error initializing agent system:', error)
        // Set error state to show in UI
        setAgentInitError(error instanceof Error ? error.message : 'Unknown initialization error')
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
            // Get response from agent system with detailed error tracking
            console.log('Sending query to agent system:', trimmedInput);
            const rawResponse = await agentSystem(trimmedInput)
            console.log('Raw response from agent system:', rawResponse);
            
            // Validate with Zod schema to ensure correct format
            try {
              const validatedResponse = AgentResponseSchema.parse(rawResponse)
              
              // Create message from validated response
              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: validatedResponse.response,
                code: validatedResponse.code
              }
              
              setMessages(prev => [...prev, assistantMessage])
            } catch (zodError) {
              // Handle Zod validation errors specifically
              console.error('Zod validation error:', zodError);
              throw new Error(`Response validation failed: ${zodError instanceof z.ZodError ? 
                zodError.errors.map(e => e.message).join(', ') : 'Unknown Zod error'}`);
            }
          } catch (agentError) {
            // Provide detailed error logging to identify which agent/step failed
            if (agentError instanceof Error) {
              // Extract any agent-specific information if available
              const errorAgent = (agentError as AgentError).agent || 'unknown';
              const errorPhase = (agentError as AgentError).phase || 'unknown';
              const errorDetails = (agentError as AgentError).details;
              
              console.error(`Error in agent system [${errorAgent}][${errorPhase}]:`, agentError);
              console.error('Error details:', errorDetails);
              console.error('Error stack:', agentError.stack);
            } else {
              console.error('Non-Error object thrown in agent system:', agentError);
            }
            
            // Try to extract any useful error information
            let errorMessage = 'Unknown error';
            let errorLocation = '';
            
            if (agentError instanceof Error) {
              errorMessage = agentError.message;
              // Try to extract context from error message or properties
              if ((agentError as AgentError).agent) {
                errorLocation = `in ${(agentError as AgentError).agent} agent`;
              } else if ((agentError as AgentError).phase) {
                errorLocation = `during ${(agentError as AgentError).phase}`;
              } else if (agentError.stack) {
                // Try to extract context from stack trace
                const stackLines = agentError.stack.split('\n');
                for (const line of stackLines) {
                  if (line.includes('/agents/') && !line.includes('/index.ts')) {
                    const agentMatch = line.match(/\/agents\/([^\/\.]+)/);
                    if (agentMatch && agentMatch[1]) {
                      errorLocation = `in ${agentMatch[1]} agent`;
                      break;
                    }
                  }
                }
              }
            } else if (agentError instanceof z.ZodError) {
              // Handle Zod validation errors specifically
              errorMessage = `Data validation error: ${agentError.errors.map(e => e.message).join(', ')}`;
            }
            
            const errorResponse: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `I encountered an error ${errorLocation} while processing your request: ${errorMessage}. Please try again with a different query.`
            }
            setMessages(prev => [...prev, errorResponse])
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
    
    // Add loading state
    const runButtonElement = document.getElementById('run-code-button') as HTMLButtonElement
    const runSpinnerElement = document.getElementById('run-spinner') as HTMLDivElement
    
    if (runButtonElement) runButtonElement.disabled = true
    if (runSpinnerElement) runSpinnerElement.style.display = 'block'
    
    // Send a message to the background script to open Earth Engine and run the code
    chrome.runtime.sendMessage(
      { type: 'OPEN_EARTH_ENGINE_AND_RUN_CODE', code },
      (response) => {
        // Reset UI
        if (runButtonElement) runButtonElement.disabled = false
        if (runSpinnerElement) runSpinnerElement.style.display = 'none'
        
        if (chrome.runtime.lastError) {
          console.error('Error sending message to background:', chrome.runtime.lastError)
          const errorMessage = chrome.runtime.lastError.message || 'Unknown error'
          alert(`Error: Could not run code in Earth Engine. ${errorMessage}`)
          return
        }
        
        if (response?.success) {
          console.log('Code injection successful:', response.result)
          // Success message - can be a toast notification instead of an alert
          alert('Code successfully sent to Earth Engine and executed.')
        } else {
          console.error('Error running code:', response?.error)
          alert(`Error: ${response?.error || 'Could not run code in Earth Engine'}`)
        }
      }
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto mb-4">
        {/* Display error during initialization */}
        {agentInitError && (
          <div className="mb-4 p-3 rounded-lg bg-red-100 mr-8">
            <div className="font-semibold mb-1 text-red-700">
              Error Initializing Earth Agent
            </div>
            <div className="whitespace-pre-wrap">{agentInitError}</div>
            <div className="mt-2 text-sm text-gray-600">
              Please check your API key configuration in the settings or try again later.
            </div>
          </div>
        )}

        {/* Display loading indicator during initialization */}
        {!agentSystem && !agentInitError && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 mr-8">
            <div className="font-semibold mb-1">
              Earth Agent
            </div>
            <div className="flex items-center text-gray-600">
              <div className="animate-pulse mr-2">Initializing Earth Agent system...</div>
            </div>
          </div>
        )}
        
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
                <div className="flex items-center mt-2">
                  <button
                    id="run-code-button"
                    onClick={() => handleRunCode(message.code!)}
                    className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center"
                  >
                    <span className="mr-1">Run Code</span>
                    <div 
                      id="run-spinner" 
                      className="hidden animate-spin h-4 w-4"
                      style={{ display: 'none' }}
                    >
                      <svg className="w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </button>
                </div>
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