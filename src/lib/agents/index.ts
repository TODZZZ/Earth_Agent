/**
 * Agent System for Earth Engine Agent
 * 
 * This module exports the main agent system that coordinates all sub-agents using LangGraph.
 */

import { AgentResponse, AgentState } from '@/lib/agents/types';
import { createPlannerAgent } from './planner';
import { createDatabaseSelectorAgent } from './databaseSelector';
import { createCodeGeneratorAgent } from './codeGenerator';
import { createCodeDebuggerAgent } from './codeDebugger';
import { createSummarizerAgent } from './summarizer';
import { EarthEngineTools } from '../tools';

// Import from "@langchain/langgraph/web" for browser compatibility
import { END, START, StateGraph, Annotation } from "@langchain/langgraph/web";

// Custom error class to provide more context about agent failures
export class AgentError extends Error {
  agent: string;
  phase: string;
  details?: any;

  constructor(message: string, agent: string, phase: string, details?: any) {
    super(message);
    this.name = 'AgentError';
    this.agent = agent;
    this.phase = phase;
    this.details = details;
  }
}

/**
 * Initialize the agent system and return a function that executes the workflow.
 * This implementation uses LangGraph's StateGraph for proper workflow management.
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
    
    // Define our graph state
    const GraphState = Annotation.Root({
      // User input
      input: Annotation<string>(),
      
      // Task planning
      taskPlan: Annotation<string | undefined>(),
      
      // Database selection
      selectedDatabases: Annotation<any[] | undefined>(), 
      databaseSelectionText: Annotation<string | undefined>(),
      
      // Code generation
      generatedCode: Annotation<string | undefined>(),
      
      // Debugging
      errors: Annotation<string | undefined>(),
      debugLog: Annotation<string[] | undefined>({
        reducer: (existing: string[] | undefined, next: string[] | undefined) => 
          (existing || []).concat(next || [])
      }),
      
      // Inspection results from Earth Engine
      inspectionResults: Annotation<string | undefined>(),
      
      // Final response to user
      response: Annotation<string | undefined>()
    });
    
    // Define each node's function
    const plannerNode = async (state: typeof GraphState.State) => {
      try {
        console.log('Step 1: Planning');
        const result = await plannerAgent(state as AgentState);
        return result as typeof GraphState.State;
      } catch (error) {
        console.error('Error in planner node:', error);
        return {
          response: `Planning failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          debugLog: [`Planner error: ${error instanceof Error ? error.message : 'Unknown error'}`]
        } as typeof GraphState.State;
      }
    };
    
    const databaseSelectorNode = async (state: typeof GraphState.State) => {
      try {
        console.log('Step 2: Database Selection');
        if (state.response) {
          // Skip this step if there's already a response (planner rejected task)
          return state;
        }
        const result = await databaseSelectorAgent(state as AgentState);
        return result as typeof GraphState.State;
      } catch (error) {
        console.error('Error in database selector node:', error);
        return {
          ...state,
          response: `Database selection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          debugLog: [...(state.debugLog || []), `Database selector error: ${error instanceof Error ? error.message : 'Unknown error'}`]
        } as typeof GraphState.State;
      }
    };
    
    const codeGeneratorNode = async (state: typeof GraphState.State) => {
      try {
        console.log('Step 3: Code Generation');
        if (state.response) {
          // Skip this step if there's already a response
          return state;
        }
        const result = await codeGeneratorAgent(state as AgentState);
        return result as typeof GraphState.State;
      } catch (error) {
        console.error('Error in code generator node:', error);
        return {
          ...state,
          response: `Code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          debugLog: [...(state.debugLog || []), `Code generator error: ${error instanceof Error ? error.message : 'Unknown error'}`]
        } as typeof GraphState.State;
      }
    };
    
    const codeExecutionNode = async (state: typeof GraphState.State) => {
      try {
        console.log('Step 4: Executing code');
        if (state.response || !state.generatedCode) {
          // Skip this step if there's already a response or no code
          return state;
        }
        
        // Run the code in Earth Engine
        const runResult = await EarthEngineTools.runCode(state.generatedCode);
        console.log('Code execution result:', runResult);
        
        // Check for errors in the console
        const consoleCheckResult = await EarthEngineTools.checkConsole();
        if (consoleCheckResult.success && consoleCheckResult.errors && 
            Array.isArray(consoleCheckResult.errors) && consoleCheckResult.errors.length > 0) {
          
          console.log('Detected errors:', consoleCheckResult.errors);
          const errorMessage = consoleCheckResult.errors
            .map((e: {level: string, message: string}) => `${e.level}: ${e.message}`)
            .join('\n');
          
          return {
            ...state,
            errors: errorMessage
          } as typeof GraphState.State;
        }
        
        // Inspect the map
        console.log('Step 6: Inspecting results');
        const inspectionResult = await EarthEngineTools.inspectMap({lat: 37.7749, lng: -122.4194});
        if (inspectionResult && inspectionResult.data) {
          return {
            ...state,
            inspectionResults: typeof inspectionResult.data === 'string' 
              ? inspectionResult.data 
              : JSON.stringify(inspectionResult.data, null, 2)
          } as typeof GraphState.State;
        }
        
        return state;
      } catch (error) {
        console.error('Error in code execution node:', error);
        return {
          ...state,
          errors: error instanceof Error ? error.message : 'Unknown error during execution',
          debugLog: [...(state.debugLog || []), `Code execution error: ${error instanceof Error ? error.message : 'Unknown error'}`]
        } as typeof GraphState.State;
      }
    };
    
    const codeDebuggerNode = async (state: typeof GraphState.State) => {
      try {
        console.log('Step 5: Debugging code');
        if (!state.errors || !state.generatedCode) {
          // Skip this step if there are no errors or no code
          return state;
        }
        
        const result = await codeDebuggerAgent(state as AgentState);
        const debuggedState = result as typeof GraphState.State;
        
        // Try running the fixed code if available
        if (debuggedState.generatedCode && debuggedState.generatedCode !== state.generatedCode) {
          console.log('Retrying with fixed code');
          try {
            const retryResult = await EarthEngineTools.runCode(debuggedState.generatedCode);
            console.log('Retry result:', retryResult);
          } catch (retryError) {
            console.error('Error retrying fixed code:', retryError);
          }
        }
        
        return debuggedState;
      } catch (error) {
        console.error('Error in code debugger node:', error);
        return {
          ...state,
          debugLog: [...(state.debugLog || []), `Code debugger error: ${error instanceof Error ? error.message : 'Unknown error'}`]
        } as typeof GraphState.State;
      }
    };
    
    const summarizerNode = async (state: typeof GraphState.State) => {
      try {
        console.log('Step 7: Summarizing');
        if (state.response) {
          // If there's already a response (error occurred earlier), skip summarization
          return state;
        }
        
        const result = await summarizerAgent(state as AgentState);
        return result as typeof GraphState.State;
      } catch (error) {
        console.error('Error in summarizer node:', error);
        return {
          ...state,
          response: state.response || 'I generated some code based on your request, but encountered an error summarizing the results.',
          debugLog: [...(state.debugLog || []), `Summarizer error: ${error instanceof Error ? error.message : 'Unknown error'}`]
        } as typeof GraphState.State;
      }
    };
    
    // Create the graph definition with conditional routing
    const workflow = new StateGraph(GraphState)
      .addNode("planner", plannerNode)
      .addNode("databaseSelector", databaseSelectorNode)
      .addNode("codeGenerator", codeGeneratorNode)
      .addNode("codeExecution", codeExecutionNode)
      .addNode("codeDebugger", codeDebuggerNode)
      .addNode("summarizer", summarizerNode);
    
    // Define edges
    workflow
      // Start with the planner
      .addEdge(START, "planner")
      
      // If planner provides a response, end workflow. Otherwise, continue to database selection
      .addConditionalEdges(
        "planner",
        (state: any) => state.response ? "end" : "databaseSelector",
        {
          end: END,
          databaseSelector: "databaseSelector"
        }
      )
      
      // From database selector to code generator
      .addEdge("databaseSelector", "codeGenerator")
      
      // From code generator to code execution
      .addEdge("codeGenerator", "codeExecution")
      
      // If execution had errors, debug first. Otherwise, go straight to summarizer
      .addConditionalEdges(
        "codeExecution",
        (state: any) => state.errors ? "codeDebugger" : "summarizer",
        {
          codeDebugger: "codeDebugger",
          summarizer: "summarizer"
        }
      )
      
      // From debugger to summarizer
      .addEdge("codeDebugger", "summarizer")
      
      // From summarizer to end
      .addEdge("summarizer", END);
    
    // Compile the workflow
    const app = workflow.compile();
    console.log('Agent workflow compiled successfully');
    
    // Return a function that executes the workflow
    return async (input: string): Promise<AgentResponse> => {
      console.log('Agent system received input:', input);
      
      try {
        if (!input) {
          return {
            response: "I couldn't process your request. Please provide a valid query.",
            code: "// No code was generated (empty input)"
          };
        }
        
        // Execute the workflow with the initial state
        const result = await app.invoke({ input });
        
        // Extract the response
        return {
          response: result.response || 'No response was generated.',
          code: result.generatedCode,
          debugLog: result.debugLog
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