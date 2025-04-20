/**
 * Agent System for Earth Engine Agent
 * 
 * This module exports the main agent system that coordinates all sub-agents.
 */

import { AgentResponse, AgentState } from '@/lib/agents/types';
import { createPlannerAgent } from './planner';
import { createDatabaseSelectorAgent } from './databaseSelector';
import { createCodeGeneratorAgent } from './codeGenerator';
import { createCodeDebuggerAgent } from './codeDebugger';
import { createSummarizerAgent } from './summarizer';
import { EarthEngineTools } from '../tools';

/**
 * Initialize the agent system and return a function that executes the workflow.
 * This implementation provides a coordinated workflow for the agents.
 */
const initializeAgentSystem = async () => {
  console.log('Initializing Earth Agent system');
  
  try {
    // Create the individual agents
    const plannerAgent = createPlannerAgent();
    const databaseSelectorAgent = createDatabaseSelectorAgent();
    const codeGeneratorAgent = createCodeGeneratorAgent();
    const codeDebuggerAgent = createCodeDebuggerAgent();
    const summarizerAgent = createSummarizerAgent();
    
    // Validate that all agents were created successfully
    if (!plannerAgent || !databaseSelectorAgent || !codeGeneratorAgent || 
        !codeDebuggerAgent || !summarizerAgent) {
      throw new Error('Failed to initialize one or more agents');
    }
    
    // Return a function that executes the workflow with the given input
    return async (input: string): Promise<AgentResponse> => {
      console.log('Agent system received input:', input);
      
      try {
        // Validate input to prevent null/undefined errors
        if (!input) {
          return {
            response: "I couldn't process your request. Please provide a valid query.",
            code: "// No code was generated (empty input)"
          };
        }

        // Initialize the state with the user input
        let state: AgentState = { input };
        
        // Step 1: Planning - Understand the request and create a plan
        console.log('Step 1: Planning');
        state = await plannerAgent(state);
        
        // If the planner provided a response, it means the task isn't feasible
        // or there was an error, so return that response
        if (state.response) {
          return {
            response: state.response,
            code: state.generatedCode || '// No code was generated'
          };
        }
        
        // Step 2: Database Selection - Find relevant datasets
        console.log('Step 2: Database Selection');
        state = await databaseSelectorAgent(state);
        
        // Step 3: Code Generation - Generate code based on the plan and selected databases
        console.log('Step 3: Code Generation');
        state = await codeGeneratorAgent(state);
        
        // Step 4: Code execution simulation (in a real deployment, this would execute in GEE)
        console.log('Step 4: Executing code');
        try {
          const runResult = await EarthEngineTools.runCode(state.generatedCode || '');
          console.log('Code execution result:', runResult);
          
          // Check for errors in the console
          const consoleCheckResult = await EarthEngineTools.checkConsole();
          if (consoleCheckResult.success && consoleCheckResult.errors && 
              Array.isArray(consoleCheckResult.errors) && consoleCheckResult.errors.length > 0) {
            console.log('Detected errors:', consoleCheckResult.errors);
            state.errors = consoleCheckResult.errors
              .map((e: {level: string, message: string}) => `${e.level}: ${e.message}`)
              .join('\n');
            
            // Step 5: Debug if there are errors
            console.log('Step 5: Debugging code');
            state = await codeDebuggerAgent(state);
            
            // Try running the fixed code if available
            if (state.generatedCode) {
              console.log('Retrying with fixed code');
              const retryResult = await EarthEngineTools.runCode(state.generatedCode);
              console.log('Retry result:', retryResult);
            }
          }
          
          // Step 6: Inspect the map (in a real deployment)
          console.log('Step 6: Inspecting results');
          const inspectionResult = await EarthEngineTools.inspectMap({lat: 37.7749, lng: -122.4194});
          if (inspectionResult && inspectionResult.data) {
            state.inspectionResults = typeof inspectionResult.data === 'string' 
              ? inspectionResult.data 
              : JSON.stringify(inspectionResult.data, null, 2);
          }
        } catch (error) {
          console.error('Error during execution or inspection:', error);
          if (error instanceof Error) {
            state.errors = error.message;
          } else if (typeof error === 'string') {
            state.errors = error;
          } else {
            state.errors = 'Unknown error during execution';
          }
          
          // Try to debug the code if there were errors
          try {
            state = await codeDebuggerAgent(state);
          } catch (debugError) {
            console.error('Error in code debugger:', debugError);
            // Continue with the workflow even if debugging fails
          }
        }
        
        // Step 7: Summarize the results
        console.log('Step 7: Summarizing');
        try {
          state = await summarizerAgent(state);
        } catch (summaryError) {
          console.error('Error in summarizer:', summaryError);
          // If summarizer fails, use a fallback response
          state.response = state.response || 
            'I generated some code based on your request, but encountered an error summarizing the results.';
        }
        
        // Create the agent response
        return {
          response: state.response || 'No response was generated.',
          code: state.generatedCode || '// No code was generated',
          debugLog: state.debugLog
        };
      } catch (error) {
        console.error('Error in agent workflow:', error);
        
        // Return a fallback response in case of error
        return {
          response: `I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again with a more specific request.`,
          code: '// Error processing request',
          debugLog: error instanceof Error ? [error.message] : ['Unknown error']
        };
      }
    };
  } catch (initError) {
    console.error('Error initializing agent system:', initError);
    
    // Return a minimal function that just reports the initialization error
    return async (_input: string): Promise<AgentResponse> => {
      return {
        response: `The Earth Agent system could not be initialized. Error: ${initError instanceof Error ? initError.message : 'Unknown initialization error'}`,
        code: '// System initialization error',
        debugLog: initError instanceof Error ? [initError.message] : ['Unknown initialization error']
      };
    };
  }
};

export { initializeAgentSystem }; 