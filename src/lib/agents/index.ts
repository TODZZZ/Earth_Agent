/**
 * Minimal Agentic System for Earth Engine Agent
 * 
 * A simple, dependency-free implementation of the agent workflow.
 */

import { AgentResponse, AgentState } from '@/lib/agents/types';
import { getApiKey } from '../config';
import { EarthEngineTools } from '../tools';

/**
 * Fallback response when an error occurs during processing
 */
const errorFallback = (error: unknown): AgentResponse => {
  return {
    response: `I encountered an unexpected error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again with a different query.`,
    code: "// Error processing request",
    debugLog: [error instanceof Error ? error.message : 'Unknown error']
  };
};

/**
 * Initialize the agent system with a simple sequential workflow
 */
const initializeAgentSystem = async (): Promise<(input: string) => Promise<AgentResponse>> => {
  console.log('Initializing minimal Earth Agent system');

  // Get OpenAI API key
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.error('No API key found');
    return noApiKeyFallback;
  }

  // Initialize simple fetch-based model access function
  const callChatCompletionAPI = async (prompt: string, systemMessage: string) => {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: prompt }
          ],
          temperature: 0
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
  };

  console.log('Model access function initialized successfully');

  // Create the processing function with proper type safety
  const processingFunction = async (input: string): Promise<AgentResponse> => {
    console.log('Processing request:', input);

    try {
      if (!input) {
        return {
          response: "I couldn't process your request. Please provide a valid query.",
          code: "// No code was generated (empty input)"
        };
      }

      // Initialize state with user input
      let state: AgentState = { input };
      
      // STEP 1: Analyze the request and create a plan
      try {
        console.log('Step 1: Analyzing request and creating plan');
        
        // First, assess if the problem is feasible with Earth Engine
        const assessmentResult = await EarthEngineTools.assessProblem(input);
        console.log('Feasibility assessment:', assessmentResult);
        
        if (!assessmentResult.feasible) {
          return {
            response: `I'm sorry, but I don't think Google Earth Engine is the right tool for this request. ${assessmentResult.explanation}`,
            code: "// Task not feasible with Earth Engine"
          };
        }
        
        // Generate a plan using the model
        const planSystemPrompt = `You are a planning agent for Google Earth Engine tasks.
        Analyze user requests and create detailed plans for fulfilling them using Google Earth Engine.`;
        
        const planPrompt = `Analyze the following request and create a detailed plan for fulfilling it using Google Earth Engine:
        
        ${input}
        
        Your plan should include:
        1. The specific Earth Engine datasets that might be useful
        2. The processing steps required
        3. How to visualize or present the results
        
        Be specific and detailed in your plan.`;
        
        const taskPlan = await callChatCompletionAPI(planPrompt, planSystemPrompt);
        
        // Update state with the plan
        state.taskPlan = taskPlan;
        console.log('Plan created:', state.taskPlan);
      } catch (error) {
        console.error('Error in planning stage:', error);
        return {
          response: `I encountered an error while planning how to approach your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again with a more specific query.`,
          code: "// Error in planning stage"
        };
      }
      
      // STEP 2: Select relevant datasets
      try {
        console.log('Step 2: Selecting relevant datasets');
        
        // Only proceed if we have a plan
        if (!state.taskPlan) {
          throw new Error('No task plan available');
        }
        
        // Use model to extract dataset needs from the plan
        const datasetSystemPrompt = `You are a data specialist for Google Earth Engine.
        Identify specific datasets that would be most relevant for Earth Engine tasks.`;
        
        const datasetPrompt = `Based on the following Earth Engine task plan, identify the specific datasets that would be most relevant:
        
        ${state.taskPlan}
        
        List the top 3-5 most relevant Earth Engine datasets for this task, with a brief explanation of why each is appropriate.`;
        
        const datasetSelectionText = await callChatCompletionAPI(datasetPrompt, datasetSystemPrompt);
        
        // Search for datasets based on this analysis
        const searchTerms = extractSearchTerms(datasetSelectionText);
        let allDatasets: any[] = [];
        
        for (const term of searchTerms) {
          const foundDatasets = await EarthEngineTools.databaseSearch(term);
          allDatasets = [...allDatasets, ...foundDatasets];
        }
        
        // Remove duplicates and limit to top 5
        const uniqueDatasets = removeDuplicateDatasets(allDatasets).slice(0, 5);
        
        // Update state with selected datasets
        state.selectedDatabases = uniqueDatasets;
        state.databaseSelectionText = datasetSelectionText;
        
        console.log('Selected datasets:', state.selectedDatabases?.length || 0);
      } catch (error) {
        console.error('Error in dataset selection stage:', error);
        return {
          response: `I encountered an error while selecting appropriate datasets: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again with a more specific request.`,
          code: "// Error in dataset selection stage"
        };
      }
      
      // STEP 3: Generate Earth Engine code
      try {
        console.log('Step 3: Generating Earth Engine code');
        
        // Only proceed if we have a plan and datasets
        if (!state.taskPlan || !state.selectedDatabases) {
          throw new Error('Missing task plan or datasets');
        }
        
        // Format datasets for prompt
        const datasetsFormatted = formatDatasetsForPrompt(state.selectedDatabases);
        
        // Generate code using the model
        const codeSystemPrompt = `You are an expert in Google Earth Engine JavaScript programming.
        Write clean, efficient, and well-commented code that addresses user tasks.`;
        
        const codePrompt = `Create Google Earth Engine JavaScript code for the following task:
        
        TASK: ${state.input}
        
        PLAN: ${state.taskPlan}
        
        AVAILABLE DATASETS:
        ${datasetsFormatted}
        
        Write clean, efficient Earth Engine code that accomplishes this task. Include comments to explain your approach.
        The code should be ready to run in the Earth Engine Code Editor. Return ONLY the JavaScript code.`;
        
        const codeResponse = await callChatCompletionAPI(codePrompt, codeSystemPrompt);
        const generatedCode = extractCodeBlock(codeResponse);
        
        // Update state with generated code
        state.generatedCode = generatedCode;
        console.log('Code generated successfully');
      } catch (error) {
        console.error('Error in code generation stage:', error);
        return {
          response: `I encountered an error while generating Earth Engine code: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again with a more specific request.`,
          code: "// Error in code generation"
        };
      }
      
      // STEP 4: Create final response
      try {
        console.log('Step 4: Creating final response');
        
        // Only proceed if we have generated code
        if (!state.generatedCode) {
          throw new Error('No code was generated');
        }
        
        // Generate a summary response using the model
        const summarySystemPrompt = `You are an Earth science educator explaining Google Earth Engine concepts to users.
        Create clear, concise summaries that non-experts can understand.`;
        
        const summaryPrompt = `Create a clear, concise summary of the following Earth Engine task:
        
        USER REQUEST: ${state.input}
        
        GENERATED CODE: ${state.generatedCode}
        
        Explain what the code does in simple terms, how it addresses the user's request, and how they can use it.`;
        
        const response = await callChatCompletionAPI(summaryPrompt, summarySystemPrompt);
        
        // Return the final agent response
        return {
          response: response,
          code: state.generatedCode,
          debugLog: [`Task completed successfully`]
        };
      } catch (error) {
        console.error('Error in response generation stage:', error);
        
        // Fallback to a simpler response if summary fails
        return {
          response: "I've generated Earth Engine code based on your request. You can run this code in the Earth Engine Code Editor to accomplish your task.",
          code: state.generatedCode || "// No code was generated",
          debugLog: [`Error in response generation: ${error instanceof Error ? error.message : 'Unknown error'}`]
        };
      }
    } catch (error) {
      console.error('Error in processing user request:', error);
      return errorFallback(error);
    }
  };

  // Add defensive check before returning
  if (typeof processingFunction !== 'function') {
    console.error('Failed to initialize processing function properly');
    return noApiKeyFallback; // Return fallback as a safety measure
  }

  // Return a properly typed wrapper function for the processingFunction
  return (userInput: string): Promise<AgentResponse> => {
    if (!userInput || typeof userInput !== 'string') {
      console.error('Invalid input provided to agent system:', userInput);
      return Promise.resolve({
        response: "I couldn't process your request. Please provide a valid query.",
        code: "// No code was generated (invalid input)",
        debugLog: ["Invalid input type provided"]
      });
    }
    
    return processingFunction(userInput);
  };
};

/**
 * Fallback response when no OpenAI API key is available
 */
const noApiKeyFallback = async (_input: string): Promise<AgentResponse> => {
  return {
    response: 'OpenAI API key is not configured. Please set your API key in the settings.',
    code: '// Missing API key',
    debugLog: ['No API key found']
  };
};

/**
 * Helper function to extract search terms from dataset selection text
 */
const extractSearchTerms = (text: string): string[] => {
  // Simple implementation - extract phrases that might be dataset names or topics
  const lines = text.split('\n');
  const terms: string[] = [];
  
  for (const line of lines) {
    // Look for dataset names, which often have specific patterns
    if (line.includes('Landsat') || line.includes('MODIS') || line.includes('Sentinel')) {
      const matches = line.match(/\b(Landsat|MODIS|Sentinel)[a-zA-Z0-9\s-]*/g);
      if (matches) terms.push(...matches);
    }
    
    // Look for common Earth observation terms
    const keywords = ['elevation', 'land cover', 'precipitation', 'temperature', 'vegetation', 'forest', 'water', 'snow', 'ice', 'urban', 'population'];
    for (const keyword of keywords) {
      if (line.toLowerCase().includes(keyword)) {
        terms.push(keyword);
      }
    }
  }
  
  // Add some general search terms if specific ones aren't found
  if (terms.length === 0) {
    terms.push('Landsat', 'MODIS', 'elevation', 'land cover');
  }
  
  // Remove duplicates and return
  return [...new Set(terms)];
};

/**
 * Helper function to remove duplicate datasets
 */
const removeDuplicateDatasets = (datasets: any[]): any[] => {
  const uniqueIds = new Set();
  return datasets.filter(dataset => {
    if (uniqueIds.has(dataset.id)) {
      return false;
    }
    uniqueIds.add(dataset.id);
    return true;
  });
};

/**
 * Format datasets for inclusion in a prompt
 */
const formatDatasetsForPrompt = (datasets: any[]): string => {
  return datasets.map(dataset => 
    `- ${dataset.name} (${dataset.id}): ${dataset.description || 'No description available'}`
  ).join('\n');
};

/**
 * Extract code block from model response
 */
const extractCodeBlock = (text: string): string => {
  // Try to extract code between markdown code fences
  const codeBlockRegex = /```(?:javascript|js)?\s*([\s\S]*?)```/;
  const match = text.match(codeBlockRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // If no code block is found, return the entire text
  // (this handles cases where the model might not use code fences)
  return text;
};

export { initializeAgentSystem }; 
