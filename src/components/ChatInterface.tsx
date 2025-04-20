import React, { useState, useRef, useEffect } from 'react'
import { initializeAgentSystem } from '../lib/agents'
import { AgentResponseSchema } from '../lib/agents/types'
import { z } from 'zod'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  code?: string
  debugLog?: string[]
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
  const [processingLogs, setProcessingLogs] = useState<string[]>([])
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

    // Set up log message listener
    const handleLogMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'AGENT_LOG') {
        setProcessingLogs(prev => [...prev, event.data.log]);
      }
    };
    
    window.addEventListener('message', handleLogMessage);
    
    return () => {
      window.removeEventListener('message', handleLogMessage);
    };
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, processingLogs])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedInput = input.trim()
    if (!trimmedInput) return

    // Reset processing logs
    setProcessingLogs([])

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
                code: validatedResponse.code,
                debugLog: validatedResponse.debugLog || processingLogs
              }
              
              setMessages(prev => [...prev, assistantMessage])
              setProcessingLogs([]) // Clear processing logs after adding to message
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
              content: `I encountered an error ${errorLocation} while processing your request: ${errorMessage}. Please try again with a different query.`,
              debugLog: processingLogs
            }
            setMessages(prev => [...prev, errorResponse])
            setProcessingLogs([]) // Clear processing logs after adding to message
          }
        } else {
          // Handle empty input (shouldn't happen due to the check at the beginning)
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: "I couldn't process your request. Please provide a valid query."
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
        debugLog: processingLogs
      }
      setMessages(prev => [...prev, errorMessage])
      setProcessingLogs([]) // Clear processing logs after adding to message
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
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="flex-1 overflow-auto w-full">
        {/* Display error during initialization */}
        {agentInitError && (
          <div className="mb-4 p-3 rounded-lg bg-red-100 mr-8 w-auto">
            <div className="font-semibold mb-1 text-red-700">
              Error Initializing Earth Agent
            </div>
            <div className="whitespace-pre-wrap break-words">{agentInitError}</div>
            <div className="mt-2 text-sm text-gray-600">
              Please check your API key configuration in the settings or try again later.
            </div>
          </div>
        )}

        {/* Display loading indicator during initialization */}
        {!agentSystem && !agentInitError && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 mr-8 w-auto">
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
            } w-auto overflow-hidden flex-shrink-0 flex-grow-0`}
          >
            <div className="font-semibold mb-1">
              {message.role === 'user' ? 'You' : 'Earth Agent'}
            </div>
            <div className="whitespace-pre-wrap break-words w-full">{message.content}</div>
            
            {message.code && (
              <div className="mt-2 w-full overflow-hidden">
                <div className="bg-gray-800 text-gray-200 p-3 rounded-md overflow-x-auto w-full">
                  <pre className="whitespace-pre-wrap break-words w-full"><code>{message.code}</code></pre>
                </div>
                <button
                  onClick={() => handleRunCode(message.code!)}
                  className="mt-2 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Run Code
                </button>
              </div>
            )}
            
            {message.debugLog && message.debugLog.length > 0 && (
              <div className="mt-2 w-full">
                <details className="bg-gray-100 p-2 rounded-md w-full" open>
                  <summary className="font-medium text-gray-700 cursor-pointer">Execution Log</summary>
                  <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200 max-h-60 overflow-y-auto w-full">
                    {message.debugLog.map((log, index) => (
                      <div key={index} className="py-1 border-b border-gray-100 last:border-0 break-words">
                        {log}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        ))}
        
        {/* Display real-time processing logs while loading */}
        {isLoading && processingLogs.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 mr-8 w-auto">
            <div className="font-semibold mb-1 flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
              Earth Agent is thinking...
            </div>
            <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border border-gray-200 max-h-60 overflow-y-auto w-full">
              {processingLogs.map((log, index) => (
                <div key={index} className="py-1 border-b border-gray-100 last:border-0 break-words">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Simple loading indicator if no logs yet */}
        {isLoading && processingLogs.length === 0 && (
          <div className="flex justify-center items-center my-4">
            <div className="animate-pulse text-gray-500 flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
              Earth Agent is thinking...
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="mt-auto border-t pt-4">
        <form onSubmit={handleSubmit} className="flex w-full">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Earth Agent something..."
            className="flex-1 border border-gray-300 rounded-l-md px-4 py-2 focus:outline-none focus:border-gray-400 focus:shadow-md transition-shadow duration-200 min-w-0"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex-shrink-0"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
} 