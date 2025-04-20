/**
 * Code Debugger Agent for Earth Engine Agent
 * 
 * This agent diagnoses and fixes errors in Google Earth Engine code.
 */

import { ChatOpenAI } from "@langchain/openai";
import { AgentState } from "./types";
import { PromptTemplate } from "@langchain/core/prompts";
import { getApiKey } from "../config";

// Define the prompt template for the code debugger
const CODE_DEBUGGER_PROMPT = PromptTemplate.fromTemplate(`
You are a code debugging agent for Google Earth Engine. Your role is to analyze error messages from
the Earth Engine console and fix the code to resolve these issues.

USER REQUEST: {input}
ORIGINAL CODE: 
\`\`\`javascript
{code}
\`\`\`

ERROR MESSAGES: 
{errors}

Carefully analyze the error messages and fix the code. Here are some common causes of errors in Earth Engine code:

1. Invalid dataset IDs or incorrect access to properties
2. Incorrect band names or indices
3. Geometry issues in regions/areas
4. Type mismatches (e.g., using an image function on an image collection)
5. Missing required parameters in functions
6. Incorrect use of Earth Engine API functions
7. Visualization parameter issues
8. Scale/projection issues

Return the fixed code with explanations of what you changed and why. The code should be complete and runnable in the Google Earth Engine Code Editor.

IMPORTANT: Only make changes necessary to fix the errors. Keep the overall structure and logic the same unless it's directly causing the error.
`);

// Create the code debugger agent
export const createCodeDebuggerAgent = () => {
  // Create the code debugger function
  return async (state: AgentState): Promise<AgentState> => {
    // If we don't have code or errors, return the state unchanged
    if (!state.generatedCode || !state.errors) {
      console.log("Code debugger: No code or errors to debug");
      return state;
    }

    console.log("Code debugger processing errors");

    try {
      // Get API key from secure storage
      const apiKey = await getApiKey();
      
      if (!apiKey) {
        return {
          ...state,
          response: "OpenAI API key is not configured. Please set your API key in the settings."
        };
      }
      
      // Initialize the LLM with the API key
      const model = new ChatOpenAI({
        modelName: "gpt-3.5-turbo",
        temperature: 0,
        openAIApiKey: apiKey,
        configuration: {
          dangerouslyAllowBrowser: true // Required for running in browser extension
        }
      });
      
      // Generate the debugged code using the LLM
      const formattedPrompt = await CODE_DEBUGGER_PROMPT.format({
        input: state.input,
        code: state.generatedCode,
        errors: state.errors
      });
      
      const result = await model.invoke(formattedPrompt);
      
      // Extract the code from the LLM response
      const debuggerResponse = result.content.toString();
      
      // Extract code block if it's wrapped in markdown code fences
      let debuggedCode = state.generatedCode; // Default to original if can't find fixed code
      const codeBlockMatch = debuggerResponse.match(/```(?:javascript|js)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        debuggedCode = codeBlockMatch[1].trim();
      }

      console.log("Debugged code:", debuggedCode);

      // Return the updated state
      return {
        ...state,
        generatedCode: debuggedCode,
        debugLog: [...(state.debugLog || []), `Fixed code issues: ${debuggerResponse}`],
        errors: undefined // Clear errors since they've been addressed
      };
    } catch (error) {
      console.error("Error in code debugger agent:", error);
      return {
        ...state,
        debugLog: [...(state.debugLog || []), `Error in debugging: ${error}`],
        response: state.response || "I encountered an error while debugging the code. Please try again with a simplified request."
      };
    }
  };
}; 