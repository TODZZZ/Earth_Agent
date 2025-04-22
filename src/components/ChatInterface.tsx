import React, { useState, useRef, useEffect } from 'react'
import { initializeAgentSystem } from '../lib/agents'
import { AgentResponseSchema } from '../lib/agents/types'
import { z } from 'zod'
import { getApiKey } from '@/lib/config'
import { callOpenAIAPI } from '../lib/api/openai'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  code?: string
  debugLog?: string[]
}

// Add an interface for code memory
interface CodeMemoryItem {
  code: string
  timestamp: number
  description?: string
  errorMessages?: string[]
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
  // Add state for code memory
  const [codeMemory, setCodeMemory] = useState<CodeMemoryItem[]>([])
  const [lastGeneratedCode, setLastGeneratedCode] = useState<string | null>(null)
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
    
    // Load code memory from localStorage on mount
    const savedCodeMemory = localStorage.getItem('earthAgentCodeMemory');
    if (savedCodeMemory) {
      try {
        const parsedMemory = JSON.parse(savedCodeMemory);
        setCodeMemory(parsedMemory);
      } catch (e) {
        console.error('Failed to parse saved code memory:', e);
      }
    }
    
    return () => {
      window.removeEventListener('message', handleLogMessage);
    };
  }, [])

  // Save code memory to localStorage when it changes
  useEffect(() => {
    if (codeMemory.length > 0) {
      localStorage.setItem('earthAgentCodeMemory', JSON.stringify(codeMemory));
    }
  }, [codeMemory]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, processingLogs])

  // Check if the user is asking to debug or fix previous code
  const isDebugRequest = (text: string): boolean => {
    const debugKeywords = [
      'debug', 'fix', 'error', 'issue', 'problem', 'not working',
      'broken', 'fails', 'doesn\'t work', 'doesn\'t run', 'doesn\'t execute'
    ];
    
    const lowerText = text.toLowerCase();
    
    // Check if the text contains debugging keywords
    return debugKeywords.some(keyword => lowerText.includes(keyword)) && 
           lastGeneratedCode !== null;
  }

  // Extract error message from user input
  const extractErrorMessage = (text: string): string => {
    // Look for common error message patterns
    const errorPatterns = [
      /error:?\s*(.*?)(?:\.|$)/i,
      /exception:?\s*(.*?)(?:\.|$)/i,
      /failed:?\s*(.*?)(?:\.|$)/i,
      /problem:?\s*(.*?)(?:\.|$)/i,
      /issue:?\s*(.*?)(?:\.|$)/i
    ];
    
    for (const pattern of errorPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // If no specific pattern was found, return the entire text
    return text;
  }

  // Direct debug method that bypasses the full agent system
  const handleDebugRequest = async (userInput: string, codeToDebug: string): Promise<{
    response: string;
    code?: string;
    debugLog?: string[];
  }> => {
    try {
      const errorMsg = extractErrorMessage(userInput);
      setProcessingLogs(prev => [...prev, `Extracted error message: ${errorMsg}`]);
      setProcessingLogs(prev => [...prev, 'Sending debug request directly to language model...']);
      
      // Get API key
      const apiKey = await getApiKey();
      if (!apiKey) {
        throw new Error('No API key configured. Please set your API key in the settings.');
      }
      
      // Create a specialized debug prompt
      const debugPrompt = `I need you to debug this Google Earth Engine JavaScript code and fix any errors:

\`\`\`javascript
${codeToDebug}
\`\`\`

The error is: ${errorMsg}

Please provide the corrected code and a brief explanation of what was wrong and how you fixed it. Format your response with a short explanation followed by the corrected code in a code block.`;

      setProcessingLogs(prev => [...prev, 'Calling OpenAI API directly for debugging...']);
      
      // Call OpenAI API using the helper function
      const systemMessage = 'You are an expert in Google Earth Engine JavaScript programming who specializes in debugging code. Provide concise explanations and corrected code.';
      
      const completionText = await callOpenAIAPI(debugPrompt, systemMessage);
      
      // Extract code block from completion
      const codeBlockRegex = /```(?:javascript|js)?\s*([\s\S]*?)```/;
      const match = completionText.match(codeBlockRegex);
      
      let fixedCode = codeToDebug; // Default to original code
      let explanation = completionText; // Default to full response
      
      if (match && match[1]) {
        fixedCode = match[1].trim();
        
        // Extract explanation (everything before the first code block)
        const parts = completionText.split(codeBlockRegex);
        if (parts.length > 0) {
          explanation = parts[0].trim();
        }
      }
      
      setProcessingLogs(prev => [...prev, 'Successfully received debugging help']);
      
      return {
        response: explanation,
        code: fixedCode,
        debugLog: ['Debug request processed successfully']
      };
    } catch (error) {
      console.error('Error in direct debug request:', error);
      throw error;
    }
  };

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
      
      // Check if this is a debug request - EARLY DETECTION
      const debugRequest = isDebugRequest(trimmedInput);
      
      // Early decision point: debug or generate
      if (debugRequest && lastGeneratedCode) {
        // Fast path: Direct debug request
        try {
          setProcessingLogs(prev => [...prev, 'Debug request detected, using optimized debug path']);
          
          // Use specialized debug handler that bypasses full agent system
          const debugResponse = await handleDebugRequest(trimmedInput, lastGeneratedCode);
          
          // Store the fixed code in memory if present
          if (debugResponse.code) {
            setLastGeneratedCode(debugResponse.code);
            setCodeMemory(prev => [
              {
                code: debugResponse.code || '',
                timestamp: Date.now(),
                description: 'Fixed code',
                errorMessages: [extractErrorMessage(trimmedInput)]
              },
              ...prev.slice(0, 9) // Keep only the 10 most recent items
            ]);
          }
          
          // Create message from debug response
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: debugResponse.response,
            code: debugResponse.code,
            debugLog: debugResponse.debugLog || processingLogs
          }
          
          setMessages(prev => [...prev, assistantMessage]);
          setProcessingLogs([]);
        } catch (error) {
          console.error('Error in optimized debug path:', error);
          const errorResponse: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `I encountered an error while trying to debug the code: ${error instanceof Error ? error.message : 'Unknown error'}. Please try describing the error differently.`,
            debugLog: processingLogs
          }
          setMessages(prev => [...prev, errorResponse]);
        }
      } else if (agentSystem) {
        // Regular path: Use full agent system for code generation
        setProcessingLogs(prev => [...prev, 'Using full agent system for request processing']);
        
        try {
          // Get response from agent system with detailed error tracking
          console.log('Sending query to agent system:', trimmedInput);
          const rawResponse = await agentSystem(trimmedInput)
          console.log('Raw response from agent system:', rawResponse);
          
          // Validate with Zod schema to ensure correct format
          try {
            const validatedResponse = AgentResponseSchema.parse(rawResponse)
            
            // Store generated code in memory if present
            if (validatedResponse.code) {
              setLastGeneratedCode(validatedResponse.code);
              setCodeMemory(prev => [
                {
                  code: validatedResponse.code || '',
                  timestamp: Date.now(),
                  description: trimmedInput.substring(0, 100) // First 100 chars of query as description
                },
                ...prev.slice(0, 9) // Keep only the 10 most recent items
              ]);
            }
            
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
          // Handle agent errors as before
          handleAgentError(agentError);
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

  // Helper function to handle agent errors (extracted to reduce duplication)
  const handleAgentError = (agentError: any) => {
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
  };

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