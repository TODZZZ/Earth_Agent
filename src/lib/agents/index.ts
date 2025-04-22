/**
 * Minimal Agentic System for Earth Engine Agent
 * 
 * A simple, dependency-free implementation of the agent workflow.
 */

import { AgentResponse, AgentState } from '@/lib/agents/types';
import { getApiKey } from '../config';
import { EarthEngineTools } from '../tools';
import { callOpenAIAPI } from '../api/openai';

/**
 * Fallback response when an error occurs during processing
 */
const errorFallback = (error: unknown, logs: string[] = []): AgentResponse => {
  return {
    response: `I encountered an unexpected error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again with a different query.`,
    code: "// Error processing request",
    debugLog: [...logs, error instanceof Error ? error.message : 'Unknown error']
  };
};

/**
 * Log a message to the UI in real-time
 */
const logToUI = (message: string) => {
  console.log(message);
  try {
    window.postMessage({ type: 'AGENT_LOG', log: message }, '*');
  } catch (error) {
    console.error('Failed to send log to UI:', error);
  }
};

/**
 * Initialize the agent system with a simple sequential workflow
 */
const initializeAgentSystem = async (): Promise<(input: string) => Promise<AgentResponse>> => {
  logToUI('Initializing minimal Earth Agent system');

  // Get API key
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.error('No API key found');
    logToUI('No API key found. Please configure your API key in settings.');
    return noApiKeyFallback;
  }

  // Initialize simple OpenAI-based model access function
  const callChatCompletionAPI = async (prompt: string, systemMessage: string, step: string) => {
    try {
      logToUI(`[${step}] Sending request to OpenAI API...`);
      
      const response = await callOpenAIAPI(prompt, systemMessage, 'gpt-4-1106-preview');
      logToUI(`[${step}] Received response from OpenAI API`);
      return response;
    } catch (error) {
      console.error(`[${step}] Error calling OpenAI API:`, error);
      logToUI(`[${step}] Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  logToUI('Model access function initialized successfully');

  // Create the processing function with proper type safety
  const processingFunction = async (input: string): Promise<AgentResponse> => {
    logToUI('Started processing request: ' + input);
    const logs: string[] = ['Starting processing of request'];

    try {
        if (!input) {
        logToUI('Empty input received');
          return {
            response: "I couldn't process your request. Please provide a valid query.",
          code: "// No code was generated (empty input)",
          debugLog: ['Empty input received']
          };
        }

      // Initialize state with user input
        let state: AgentState = { input };
      logs.push(`Initialized state with user input: "${input}"`);
      logToUI(`Initialized state with user input: "${input}"`);
      
      // STEP 1: Analyze the request and create a plan
      try {
        logs.push('STEP 1: Analyzing request and creating plan');
        logToUI('STEP 1: Analyzing request and creating plan');
        
        // First, assess if the problem is feasible with Earth Engine
        logs.push('Checking feasibility with Earth Engine...');
        logToUI('Checking feasibility with Earth Engine...');
        const assessmentResult = await EarthEngineTools.assessProblem(input);
        console.log('Feasibility assessment:', assessmentResult);
        logs.push(`Feasibility assessment: ${assessmentResult.feasible ? 'FEASIBLE' : 'NOT FEASIBLE'}`);
        logToUI(`Feasibility assessment: ${assessmentResult.feasible ? 'FEASIBLE' : 'NOT FEASIBLE'}`);
        
        if (!assessmentResult.feasible) {
          const message = `Task not feasible: ${assessmentResult.explanation}`;
          logs.push(message);
          logToUI(message);
          return {
            response: `I'm sorry, but I don't think Google Earth Engine is the right tool for this request. ${assessmentResult.explanation}`,
            code: "// Task not feasible with Earth Engine",
            debugLog: logs
          };
        }
        
        // Generate a plan using the model
        logs.push('Generating task plan using LLM...');
        logToUI('Generating task plan using LLM...');
        const planSystemPrompt = `You are a planning agent for Google Earth Engine tasks.
        Analyze user requests and create detailed plans for fulfilling them using Google Earth Engine.`;
        
        const planPrompt = `Analyze the following request and create a detailed plan for fulfilling it using Google Earth Engine:
        
        ${input}
        
        Your plan should include:
        1. The specific Earth Engine datasets that might be useful
        2. The processing steps required
        3. How to visualize or present the results
        
        Be specific and detailed in your plan.`;
        
        const taskPlan = await callChatCompletionAPI(planPrompt, planSystemPrompt, 'Planner');
        
        // Update state with the plan
        state.taskPlan = taskPlan;
        logs.push('Plan created successfully');
        logToUI('Plan created successfully');
        logs.push(`Plan summary: ${taskPlan.substring(0, 100)}...`);
        logToUI(`Plan summary: ${taskPlan.substring(0, 100)}...`);
        console.log('Plan created:', state.taskPlan);
      } catch (error) {
        console.error('Error in planning stage:', error);
        const errorMsg = `Error in planning stage: ${error instanceof Error ? error.message : 'Unknown error'}`;
        logs.push(errorMsg);
        logToUI(errorMsg);
        return {
          response: `I encountered an error while planning how to approach your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again with a more specific query.`,
          code: "// Error in planning stage",
          debugLog: logs
        };
      }
      
      // STEP 2: Select relevant datasets
      try {
        logs.push('STEP 2: Selecting relevant datasets');
        logToUI('STEP 2: Selecting relevant datasets');
        
        // Only proceed if we have a plan
        if (!state.taskPlan) {
          const errorMsg = 'No task plan available';
          logs.push(errorMsg);
          logToUI(errorMsg);
          throw new Error(errorMsg);
        }
        
        // Use model to extract dataset needs from the plan
        logs.push('Analyzing dataset needs based on the plan...');
        logToUI('Analyzing dataset needs based on the plan...');
        const datasetSystemPrompt = `You are a data specialist for Google Earth Engine.
        Identify specific datasets that would be most relevant for Earth Engine tasks.`;
        
        const datasetPrompt = `Based on the following Earth Engine task plan, identify the specific datasets that would be most relevant:
        
        ${state.taskPlan}
        
        List the top 3-5 most relevant Earth Engine datasets for this task, with a brief explanation of why each is appropriate.`;
        
        const datasetSelectionText = await callChatCompletionAPI(datasetPrompt, datasetSystemPrompt, 'Dataset Selector');
        logs.push('Dataset needs identified');
        logToUI('Dataset needs identified');
        
        // Search for datasets based on this analysis
        logs.push('Extracting search terms from dataset analysis...');
        logToUI('Extracting search terms from dataset analysis...');
        const searchTerms = extractSearchTerms(datasetSelectionText);
        logs.push(`Search terms extracted: ${searchTerms.join(', ')}`);
        logToUI(`Search terms extracted: ${searchTerms.join(', ')}`);
        
        // Extract timeframe from user input and task plan
        const timeframe = extractTimeframe(state.input + ' ' + (state.taskPlan || ''));
        if (timeframe) {
          logs.push(`Extracted timeframe: ${timeframe.start || 'any'} to ${timeframe.end || 'present'}`);
          logToUI(`Extracted timeframe: ${timeframe.start || 'any'} to ${timeframe.end || 'present'}`);
        } else {
          logs.push('No specific timeframe detected. Will prioritize recent datasets.');
          logToUI('No specific timeframe detected. Will prioritize recent datasets.');
        }
        
        let allDatasets: any[] = [];
        
        logs.push('Searching for matching datasets in Earth Engine catalog...');
        logToUI('Searching for matching datasets in Earth Engine catalog...');
        for (const term of searchTerms) {
          logs.push(`Searching for term: "${term}"`);
          logToUI(`Searching for term: "${term}"`);
          const foundDatasets = await EarthEngineTools.databaseSearch(term, timeframe);
          logs.push(`Found ${foundDatasets.length} datasets for term "${term}"`);
          logToUI(`Found ${foundDatasets.length} datasets for term "${term}"`);
          allDatasets = [...allDatasets, ...foundDatasets];
        }
        
        // Remove duplicates and limit to top 5
        logs.push('Removing duplicate datasets and selecting top candidates...');
        logToUI('Removing duplicate datasets and selecting top candidates...');
        const uniqueDatasets = removeDuplicateDatasets(allDatasets).slice(0, 5);
        
        // Debug the dataset structure
        logs.push('Dataset structure debug:');
        uniqueDatasets.forEach((dataset, idx) => {
          logs.push(`Dataset ${idx+1} keys: ${Object.keys(dataset).join(', ')}`);
          logs.push(`Dataset ${idx+1} id: ${dataset.id}`);
          logs.push(`Dataset ${idx+1} asset_url: ${dataset.asset_url}`);
        });
        
        // Ensure each dataset has all required properties
        const processedDatasets = uniqueDatasets.map(dataset => {
          // Make sure all fields are present even if empty
          return {
            id: dataset.id || '',
            title: dataset.title || dataset.name || dataset.id || 'Unknown Dataset',
            name: dataset.name || dataset.title || dataset.id || 'Unknown Dataset',
            description: dataset.description || 'No description available',
            type: dataset.type || 'image',
            asset_url: dataset.asset_url || `https://developers.google.com/earth-engine/datasets/catalog/${dataset.id?.replace(/\//g, '_')}`,
            tags: dataset.tags || '',
            start_date: dataset.start_date || '',
            end_date: dataset.end_date || '',
            provider: dataset.provider || 'Unknown Provider'
          };
        });
        
        // Update state with selected datasets
        state.selectedDatabases = processedDatasets;
        state.databaseSelectionText = datasetSelectionText;
        
        logs.push(`Selected ${state.selectedDatabases?.length || 0} unique datasets`);
        logToUI(`Selected ${state.selectedDatabases?.length || 0} unique datasets`);
        if (state.selectedDatabases && state.selectedDatabases.length > 0) {
          logs.push('Selected datasets:');
          logToUI('Selected datasets:');
          state.selectedDatabases.forEach((dataset, index) => {
            const datasetInfo = `${index + 1}. ${dataset.name || dataset.id}`;
            logs.push(datasetInfo);
            logs.push(`   ID: ${dataset.id}`);
            logs.push(`   URL: ${dataset.asset_url}`);
            logToUI(datasetInfo);
          });
        }
        console.log('Selected datasets:', state.selectedDatabases?.length || 0);
      } catch (error) {
        console.error('Error in dataset selection stage:', error);
        const errorMsg = `Error in dataset selection stage: ${error instanceof Error ? error.message : 'Unknown error'}`;
        logs.push(errorMsg);
        logToUI(errorMsg);
        return {
          response: `I encountered an error while selecting appropriate datasets: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again with a more specific request.`,
          code: "// Error in dataset selection stage",
          debugLog: logs
        };
      }
      
      // STEP 3: Analyze dataset access methods
      try {
        logs.push('STEP 3: Analyzing dataset access methods');
        logToUI('STEP 3: Analyzing dataset access methods');
        
        // Only proceed if we have selected datasets
        if (!state.selectedDatabases || state.selectedDatabases.length === 0) {
          const errorMsg = 'No datasets selected';
          logs.push(errorMsg);
          logToUI(errorMsg);
          throw new Error(errorMsg);
        }
        
        logs.push('Determining correct access methods for each dataset...');
        logToUI('Determining correct access methods for each dataset...');
        
        // We'll store access methods here
        const accessMethods: Record<string, any> = {};
        
        // For each dataset, analyze its documentation to extract access method
        for (const dataset of state.selectedDatabases) {
          // Debug log to check the dataset structure
          logs.push(`Processing dataset: ${dataset.id}`);
          logs.push(`Dataset properties: ${Object.keys(dataset).join(', ')}`);
          
          if (!dataset.asset_url) {
            logs.push(`No asset URL available for dataset ${dataset.id}, generating standard URL`);
            logToUI(`No asset URL available for dataset ${dataset.id}, generating URL`);
            
            // Generate a standard URL format if none is provided
            const formattedId = dataset.id?.replace(/\//g, '_');
            dataset.asset_url = `https://developers.google.com/earth-engine/datasets/catalog/${formattedId}`;
            logs.push(`Generated URL: ${dataset.asset_url}`);
          }
          
          logs.push(`Analyzing documentation for ${dataset.id} from ${dataset.asset_url}`);
          logToUI(`Analyzing documentation for ${dataset.id} from ${dataset.asset_url}`);
          
          // Use OpenAI to extract information from documentation URL
          const urlAnalysisSystemPrompt = `You are an AI agent that analyzes Earth Engine catalog URLs to extract comprehensive information about datasets. 
          For each URL provided:
          1. Determine the dataset ID
          2. Extract the dataset type (Image, ImageCollection, or FeatureCollection) 
          3. Extract a detailed description of the dataset
          4. Identify all available bands/properties with descriptions
          5. Determine the correct access method for the dataset
          6. Extract code examples when available
          7. Identify visualization parameters when available

          Respond in a structured format for each dataset with sections for DATASET ID, TYPE, DESCRIPTION, AVAILABLE BANDS, ACCESS METHOD, CODE EXAMPLE, and VISUALIZATION PARAMETERS.`;
          
          const urlAnalysisPrompt = (urls: string[]) => 
            `I have the following Earth Engine catalog URLs:

${urls.map((url, index) => `${index + 1}. ${url}`).join('\n')}

For each URL:
1. Extract the dataset ID from the URL
2. Determine if it's an Image, ImageCollection, or FeatureCollection
3. Extract a comprehensive description of the dataset's purpose and content
4. List all available bands/properties with descriptions when available
5. Determine the correct access method in Earth Engine code
6. Extract any code examples that show how to use this dataset
7. Identify any visualization parameters recommended for this dataset

Please format your response in a structured way for each dataset with these headers:
DATASET ID:
TYPE:
DESCRIPTION:
AVAILABLE BANDS:
ACCESS METHOD:
CODE EXAMPLE:
VISUALIZATION PARAMETERS:

This information will be used to generate Earth Engine code, so be comprehensive and accurate.`;
          
          try {
            const urlAnalysisResponse = await callChatCompletionAPI(urlAnalysisPrompt([dataset.asset_url]), urlAnalysisSystemPrompt, `URL Analysis for ${dataset.id}`);
            
            // Parse the response to extract information about this specific dataset
            const datasetInfoRegex = new RegExp(`DATASET ID:[\\s\\S]*?${dataset.id}[\\s\\S]*?(?:DATASET ID:|$)`, 'i');
            const datasetInfoMatch = urlAnalysisResponse.match(datasetInfoRegex);
            const datasetInfoResponse = datasetInfoMatch ? datasetInfoMatch[0] : '';
            
            if (!datasetInfoResponse) {
              throw new Error(`Could not extract information for dataset: ${dataset.id}`);
            }

            // Extract type information
            const typeMatch = datasetInfoResponse.match(/TYPE:(.+?)(?:DESCRIPTION:|$)/s);
            const type = typeMatch && typeMatch[1].trim();
            
            // Extract description
            const descriptionMatch = datasetInfoResponse.match(/DESCRIPTION:(.+?)(?:AVAILABLE BANDS:|$)/s);
            const description = descriptionMatch && descriptionMatch[1].trim();
            
            // Extract bands information
            let bands: Array<{name: string, description: string}> = [];
            const bandsMatch = datasetInfoResponse.match(/AVAILABLE BANDS:(.+?)(?:ACCESS METHOD:|$)/s);
            if (bandsMatch && bandsMatch[1]) {
              // Parse bands from the response
              const bandText = bandsMatch[1].trim();
              const bandLines = bandText.split('\n').filter(line => line.trim().length > 0);
              bands = bandLines.map(line => {
                const parts = line.split(':');
                if (parts.length > 1) {
                  return { name: parts[0].trim(), description: parts[1].trim() };
                }
                return { name: line.trim(), description: '' };
              });
            }
            
            // Extract access method
            const accessMethodMatch = datasetInfoResponse.match(/ACCESS METHOD:(.+?)(?:CODE EXAMPLE:|$)/s);
            const accessMethod = accessMethodMatch && accessMethodMatch[1].trim();
            
            // Extract code example
            const codeExampleMatch = datasetInfoResponse.match(/CODE EXAMPLE:(.+?)(?:VISUALIZATION PARAMETERS:|$)/s);
            const codeExample = codeExampleMatch && codeExampleMatch[1].trim();
            
            // Extract visualization parameters
            const visParamsMatch = datasetInfoResponse.match(/VISUALIZATION PARAMETERS:(.+?)(?:DATASET ID:|$)/s);
            const visParams = visParamsMatch && visParamsMatch[1].trim();

            // Store the extracted information
            accessMethods[dataset.id] = {
              id: dataset.id,
              type: type || 'unknown',
              description: description || 'No description available',
              bands: bands,
              accessType: (type || '').toLowerCase().includes('collection') ? 
                (type || '').toLowerCase().includes('feature') ? 'ee.FeatureCollection' : 'ee.ImageCollection' : 
                'ee.Image',
              accessLine: accessMethod || `var dataset = ee.Image('${dataset.id}');`,
              codeSnippet: codeExample || '',
              visParams: visParams || ''
            };
            
            logs.push(`Determined access method for ${dataset.id}: ${accessMethod}`);
            logToUI(`Analyzed dataset: ${dataset.id}`);
            
          } catch (error) {
            logs.push(`Error analyzing URL for ${dataset.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            logToUI(`Error analyzing URL for ${dataset.id}, using fallback`);
            
            // Apply fallback based on dataset type
            let fallbackType = 'ee.Image';
            if (dataset.type === 'image_collection') {
              fallbackType = 'ee.ImageCollection';
            } else if (dataset.type === 'table' || dataset.type === 'feature_collection') {
              fallbackType = 'ee.FeatureCollection';
            }
            
            accessMethods[dataset.id] = {
              id: dataset.id,
              type: fallbackType,
              description: dataset.description || 'No description available',
              bands: [],
              accessType: fallbackType,
              accessLine: `var dataset = ${fallbackType}('${dataset.id}');`,
              codeSnippet: '',
              visParams: ''
            };
          }
        }
        
        // Update state with access methods
        state.datasetAccessMethods = accessMethods;
        logs.push(`Access methods determined: ${JSON.stringify(accessMethods, null, 2)}`);
        logToUI(`Access methods determined for ${Object.keys(accessMethods).length} datasets`);
        
      } catch (error) {
        console.error('Error in dataset access analysis stage:', error);
        const errorMsg = `Error in dataset access analysis stage: ${error instanceof Error ? error.message : 'Unknown error'}`;
        logs.push(errorMsg);
        logToUI(errorMsg);
        
        // Create fallback access methods based on type
        if (state.selectedDatabases) {
          const fallbackMethods: Record<string, any> = {};
          
          state.selectedDatabases.forEach(dataset => {
            // Simple mapping based on common patterns
            let fallbackType = 'ee.Image';
            if (dataset.type === 'image_collection') {
              fallbackType = 'ee.ImageCollection';
            } else if (dataset.type === 'table' || dataset.type === 'feature_collection') {
              fallbackType = 'ee.FeatureCollection';
            }
            
            fallbackMethods[dataset.id] = {
              id: dataset.id,
              type: fallbackType,
              description: dataset.description || 'No description available',
              bands: [],
              accessType: fallbackType,
              accessLine: `var dataset = ${fallbackType}('${dataset.id}');`,
              codeSnippet: '',
              visParams: ''
            };
          });
          
          state.datasetAccessMethods = fallbackMethods;
          logs.push(`Using fallback access methods due to error`);
          logToUI(`Using fallback access methods due to error`);
        }
      }
      
      // STEP 4: Generate Earth Engine code
      try {
        logs.push('STEP 4: Generating Earth Engine code');
        logToUI('STEP 4: Generating Earth Engine code');
        
        // Only proceed if we have a plan and datasets
        if (!state.taskPlan || !state.selectedDatabases) {
          const errorMsg = 'Missing task plan or datasets';
          logs.push(errorMsg);
          logToUI(errorMsg);
          throw new Error(errorMsg);
        }
        
        // Format datasets for prompt
        logs.push('Formatting dataset information for code generation...');
        logToUI('Formatting dataset information for code generation...');
        
        // Generate code using the model
        logs.push('Generating Earth Engine code with LLM...');
        logToUI('Generating Earth Engine code with LLM...');
        const codeSystemPrompt = `You are an expert in Google Earth Engine JavaScript programming.
        Write clean, efficient, and well-commented code that addresses user tasks using multiple datasets effectively.`;
        
        const codePrompt = (
          datasets: any[], 
          location: string, 
          accessMethods: Record<string, any> = {},
          step1Response: string = ""
        ) => {
          return `I need to create Earth Engine JavaScript code that uses multiple of the following datasets:

${formatDatasetsForPrompt(datasets, accessMethods)}

My area of interest is: ${location}

Please write complete, working Earth Engine JavaScript code that:
1. Loads at least 3-4 of these datasets (use as many as appropriate for a meaningful analysis)
2. Processes and visualizes the data in meaningful ways
3. Includes proper attribution and descriptions for each dataset used
4. Creates a proper visualization with appropriate visualization parameters
5. Exports or displays results on the map

The code should be complete, functional, and ready to run in the Earth Engine Code Editor.
Include helpful comments to explain key steps in the analysis.

Background context from my initial query: 
${step1Response}

Please provide only the working Earth Engine JavaScript code with no additional explanation.`;
        };
        
        const codeResponse = await callChatCompletionAPI(codePrompt(state.selectedDatabases, state.input, state.datasetAccessMethods, state.taskPlan), codeSystemPrompt, 'Code Generator');
        const generatedCode = extractCodeBlock(codeResponse);
        logs.push('Code generated successfully');
        logToUI('Code generated successfully');
        
        // Update state with generated code
        state.generatedCode = generatedCode;
        console.log('Code generated successfully');
      } catch (error) {
        console.error('Error in code generation stage:', error);
        const errorMsg = `Error in code generation stage: ${error instanceof Error ? error.message : 'Unknown error'}`;
        logs.push(errorMsg);
        logToUI(errorMsg);
        return {
          response: `I encountered an error while generating Earth Engine code: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again with a more specific request.`,
          code: "// Error in code generation",
          debugLog: logs
        };
      }
      
      // STEP 5: Create final response
      try {
        logs.push('STEP 5: Creating final response');
        logToUI('STEP 5: Creating final response');
        
        // Only proceed if we have generated code
        if (!state.generatedCode) {
          const errorMsg = 'No code was generated';
          logs.push(errorMsg);
          logToUI(errorMsg);
          throw new Error(errorMsg);
        }
        
        // Generate a summary response using the model
        logs.push('Generating user-friendly explanation of the code...');
        logToUI('Generating user-friendly explanation of the code...');
        const summarySystemPrompt = `You are an Earth science educator explaining Google Earth Engine concepts to users.
        Create clear, concise summaries that non-experts can understand.`;
        
        const summaryPrompt = `Create a clear, concise summary of the following Earth Engine task:
        
        USER REQUEST: ${state.input}
        
        GENERATED CODE: ${state.generatedCode}
        
        Explain what the code does in simple terms, how it addresses the user's request, and how they can use it.`;
        
        const response = await callChatCompletionAPI(summaryPrompt, summarySystemPrompt, 'Response Summarizer');
        logs.push('Response summary generated successfully');
        logToUI('Response summary generated successfully');
        
        // Return the final agent response
        return {
          response: response,
          code: state.generatedCode,
          debugLog: logs
        };
      } catch (error) {
        console.error('Error in response generation stage:', error);
        const errorMsg = `Error in response generation stage: ${error instanceof Error ? error.message : 'Unknown error'}`;
        logs.push(errorMsg);
        logToUI(errorMsg);
        
        // Fallback to a simpler response if summary fails
        return {
          response: "I've generated Earth Engine code based on your request. You can run this code in the Earth Engine Code Editor to accomplish your task.",
          code: state.generatedCode || "// No code was generated",
          debugLog: logs
        };
      }
    } catch (error) {
      console.error('Error in processing:', error);
      return errorFallback(error, logs);
    }
  };

  return processingFunction;
};

/**
 * Fallback response when there's no API key
 */
const noApiKeyFallback = async (_input: string): Promise<AgentResponse> => {
  return {
    response: "I need an API key to work. Please configure your API key in the extension settings.",
    code: "// No API key configured",
    debugLog: ['No API key configured. Please set your API key in settings.']
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
const formatDatasetsForPrompt = (datasets: any[], accessMethods: Record<string, any> = {}): string => {
  return datasets.map(dataset => {
    const accessInfo = accessMethods[dataset.id] || {
      accessType: dataset.type === 'image_collection' ? 'ee.ImageCollection' : 
                 dataset.type === 'table' ? 'ee.FeatureCollection' : 'ee.Image',
      accessLine: `var dataset = ee.Image('${dataset.id}');`,
      codeSnippet: '',
      description: dataset.description || 'No description available',
      bands: [] as Array<{name: string, description: string}>
    };
    
    let formattedDataset = `- ${dataset.name || dataset.title || dataset.id} (${dataset.id}): 
      Type: ${dataset.type || 'unknown'}
      Access Method: ${accessInfo.accessLine}
      Description: ${accessInfo.description || dataset.description || 'No description available'}`;
    
    // Add bands information if available
    if (accessInfo.bands && accessInfo.bands.length > 0) {
      formattedDataset += `\n      Available Bands/Properties: ${accessInfo.bands.map((band: {name: string, description: string} | string) => 
        typeof band === 'string' ? band : (band.name + (band.description ? ` - ${band.description}` : ''))
      ).join(', ')}`;
    }
    
    // Add visualization parameters if available
    if (accessInfo.visParams) {
      formattedDataset += `\n      Visualization Parameters: ${accessInfo.visParams}`;
    }
    
    // Add code example if available
    if (accessInfo.codeSnippet && accessInfo.codeSnippet.length > 0) {
      const codeLines = accessInfo.codeSnippet.split('\n');
      // Only include a short version of the code snippet to keep the prompt manageable
      const shortCodeSnippet = codeLines.slice(0, Math.min(5, codeLines.length)).join('\n');
      formattedDataset += `\n      Code Example:\n      ${shortCodeSnippet}${codeLines.length > 5 ? '\n      // ... more code ...' : ''}`;
    }
    
    return formattedDataset;
  }).join('\n\n');
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

/**
 * Extract timeframe information from text
 */
const extractTimeframe = (text: string): { start?: string; end?: string } | undefined => {
  const timeframe: { start?: string; end?: string } = {};
  
  // Check for year or date patterns
  const yearPattern = /\b(19\d{2}|20\d{2})\b/g;
  // Below patterns are available for future use if needed
  // /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/g - for full dates (YYYY-MM-DD)
  // /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\b/gi - for month+year format
  
  // Extract years
  const years = Array.from(text.matchAll(yearPattern), m => m[0]);
  
  // Look for time range indicators
  const fromPattern = /(?:from|since|after|beginning|start(?:ing)?\s+(?:from|in))\s+(\d{4}|\w+\s+\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i;
  const toPattern = /(?:to|until|through|ending|end(?:ing)?\s+(?:in|at))\s+(\d{4}|\w+\s+\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i;
  const betweenPattern = /between\s+(\d{4}|\w+\s+\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\s+and\s+(\d{4}|\w+\s+\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i;
  const forPattern = /for\s+(?:the\s+)?(?:year|period)\s+(\d{4}|\w+\s+\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i;
  const inPattern = /\bin\s+(?:the\s+)?(?:year|period)?\s*(\d{4})\b/i;
  const recentPattern = /\b(?:latest|newest|most\s+recent|current)\b/i;
  
  // Check for specific patterns
  const fromMatch = text.match(fromPattern);
  const toMatch = text.match(toPattern);
  const betweenMatch = text.match(betweenPattern);
  const forMatch = text.match(forPattern);
  const inMatch = text.match(inPattern);
  const recentMatch = text.match(recentPattern);
  
  // Process matched patterns
  if (betweenMatch) {
    timeframe.start = betweenMatch[1];
    timeframe.end = betweenMatch[2];
  } else {
    if (fromMatch) {
      timeframe.start = fromMatch[1];
    }
    if (toMatch) {
      timeframe.end = toMatch[1];
    }
    if (forMatch || (inMatch !== null)) {
      const yearStr = forMatch ? forMatch[1] : (inMatch ? inMatch[1] : '');
      if (yearStr) {
        timeframe.start = yearStr;
        timeframe.end = yearStr;
      }
    }
  }
  
  // If we have no structured timeframe but have years
  if (!timeframe.start && !timeframe.end && years.length > 0) {
    // Sort years to find earliest and latest
    const sortedYears = [...years].sort();
    if (sortedYears.length === 1) {
      // Single year mentioned
      timeframe.start = sortedYears[0];
      timeframe.end = sortedYears[0];
    } else if (sortedYears.length > 1 && !recentMatch) {
      // Multiple years, assume first and last are the range
      timeframe.start = sortedYears[0];
      timeframe.end = sortedYears[sortedYears.length - 1];
    }
  }
  
  // If latest/recent is mentioned and no other timeframe, leave end undefined to get latest
  if (recentMatch && !timeframe.start && !timeframe.end) {
    // Set start to recent period (5 years ago)
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    timeframe.start = fiveYearsAgo.getFullYear().toString();
  }
  
  // If we have any dates, normalize them to ISO format
  if (timeframe.start) {
    timeframe.start = normalizeDate(timeframe.start);
  }
  if (timeframe.end) {
    timeframe.end = normalizeDate(timeframe.end);
  }
  
  // Only return timeframe if we found something
  return (timeframe.start || timeframe.end) ? timeframe : undefined;
};

/**
 * Normalize dates to ISO format
 */
const normalizeDate = (dateStr: string): string => {
  // If it's just a year, return it as is
  if (/^\d{4}$/.test(dateStr)) {
    return dateStr + '-01-01'; // Set to January 1 of that year
  }
  
  // Try to parse various date formats
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    // Fall back to original string if parsing fails
  }
  
  return dateStr;
};

export { initializeAgentSystem }; 
