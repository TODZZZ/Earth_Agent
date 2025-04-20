/**
 * Code Generator Agent for Earth Engine Agent
 * 
 * This agent generates Google Earth Engine code based on the user's request,
 * task plan, and selected databases.
 */

import { ChatOpenAI } from "@langchain/openai";
import { AgentState } from "./types";
import { PromptTemplate } from "@langchain/core/prompts";
import { getApiKey } from "../config";

// Define the prompt template for the code generator
const CODE_GENERATOR_PROMPT = PromptTemplate.fromTemplate(`
You are a code generation agent for Google Earth Engine. Your role is to generate JavaScript code 
that runs in the Google Earth Engine Code Editor to fulfill the user's request.

USER REQUEST: {input}
TASK PLAN: {taskPlan}
SELECTED DATASETS: {selectedDatabases}

Generate complete, runnable Google Earth Engine JavaScript code that fulfills the user's request.
The code should:
1. Import and properly reference the selected datasets
2. Apply appropriate filters, transformations, and analyses
3. Create visualizations with good default parameters
4. Include comments explaining key steps
5. Be well-structured and follow Google Earth Engine best practices

Make sure the code is complete and ready to run in the Google Earth Engine Code Editor.
Use standard Earth Engine JavaScript API conventions.

Return only the code with no additional text before or after.
`);

// Create the code generator agent
export const createCodeGeneratorAgent = () => {
  // Create the code generator function
  return async (state: AgentState): Promise<AgentState> => {
    // If we don't have selected databases, return the state unchanged
    if (!state.selectedDatabases || state.selectedDatabases.length === 0) {
      console.log("Code generator: No databases selected");
      return state;
    }

    console.log("Code generator processing selected databases");

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

      // Format the selected databases for the prompt
      const formattedDatabases = JSON.stringify(state.selectedDatabases, null, 2);

      // Generate the code using the LLM
      const formattedPrompt = await CODE_GENERATOR_PROMPT.format({
        input: state.input,
        taskPlan: state.taskPlan || "No specific task plan available.",
        selectedDatabases: formattedDatabases
      });
      
      const result = await model.invoke(formattedPrompt);
      
      // Extract the code from the LLM response
      const generatedContent = result.content.toString();
      
      // Extract code block if it's wrapped in markdown code fences
      let generatedCode = generatedContent;
      const codeBlockMatch = generatedContent.match(/```(?:javascript|js)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        generatedCode = codeBlockMatch[1].trim();
      }

      console.log("Generated code:", generatedCode);

      // Return the updated state
      return {
        ...state,
        generatedCode,
        response: createResponseFromGeneratedCode(state.input, state.selectedDatabases, generatedCode)
      };
    } catch (error) {
      console.error("Error in code generator agent:", error);
      return {
        ...state,
        generatedCode: "// Error generating code",
        response: "I encountered an error while generating Google Earth Engine code for your request. Please try again with a more specific request."
      };
    }
  };
};

// Helper function to create a response message based on the generated code
function createResponseFromGeneratedCode(input: string, selectedDatabases: any[], code: string): string {
  const datasetNames = selectedDatabases.map(db => db.name).join(", ");
  const codeLength = code.length;
  
  return `
Based on your request to "${input}", I've generated Google Earth Engine code (${codeLength} characters) that uses the following datasets: ${datasetNames}.

The code:
1. Loads the necessary Earth Engine datasets
2. Processes the data to extract the information you requested
3. Creates a visualization to display the results

You can run this code in the Google Earth Engine Code Editor by clicking the "Run Code" button below.
  `.trim();
} 