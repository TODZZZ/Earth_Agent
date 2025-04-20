/**
 * Database Selector Agent for Earth Engine Agent
 * 
 * This agent selects appropriate databases from Earth Engine catalog
 * based on the user query and task plan.
 */

import { ChatOpenAI } from "@langchain/openai";
import { AgentState } from "./types";
import { PromptTemplate } from "@langchain/core/prompts";
import { getApiKey } from "../config";
import { EarthEngineTools } from "../tools";
import { DatasetEntry } from "../tools/databaseSearch";

// Define the prompt template for the database selector
const DATABASE_SELECTOR_PROMPT = PromptTemplate.fromTemplate(`
You are a database selection agent for Google Earth Engine. Your job is to select the most appropriate 
Earth Engine datasets for a given task.

USER REQUEST: {input}
TASK PLAN: {taskPlan}
AVAILABLE DATASETS:
{availableDatabases}

Select the most appropriate datasets from the available options to accomplish the task. For each selected 
dataset, briefly explain why it's appropriate for the task.

Consider the following factors:
1. Spatial resolution - Is high spatial detail required?
2. Temporal coverage - Is historical data needed? How recent should the data be?
3. Update frequency - Does the task require the most up-to-date data?
4. Data type - What physical variables are needed (e.g., elevation, temperature, vegetation)?
5. Relevance to the specific task

Return your selections in a well-formatted list with justifications for each choice.
Be specific about which dataset IDs you are selecting from the provided list.
`);

// Create the database selector agent
export const createDatabaseSelectorAgent = () => {
  // Create the database selector function
  return async (state: AgentState): Promise<AgentState> => {
    // If we don't have a task plan, return the state unchanged
    if (!state.taskPlan) {
      console.log("Database selector: No task plan available");
      return state;
    }

    console.log("Database selector processing task plan");

    try {
      // Search for relevant databases based on the user's input
      const searchResults = await EarthEngineTools.databaseSearch(state.input);
      
      if (!searchResults || searchResults.length === 0) {
        return {
          ...state,
          response: "I couldn't find any relevant Earth Engine datasets for your request. Please try a different query."
        };
      }
      
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

      // Format the available databases for the prompt
      const formattedDatabases = JSON.stringify(searchResults, null, 2);

      // Generate database selections using the LLM
      const formattedPrompt = await DATABASE_SELECTOR_PROMPT.format({
        input: state.input,
        taskPlan: state.taskPlan,
        availableDatabases: formattedDatabases
      });
      
      const result = await model.invoke(formattedPrompt);
      
      // Extract database selections from the LLM response
      const selectionText = result.content.toString();
      
      console.log("Database selections:", selectionText);
      
      // Extract selected database IDs from the selection text
      const databaseIds = extractDatabaseIds(selectionText, searchResults);
      
      // Get the full database objects for the selected IDs
      const selectedDatabases = searchResults.filter(db => databaseIds.includes(db.id));
      
      console.log("Selected databases:", selectedDatabases);

      // Return the updated state
      return {
        ...state,
        selectedDatabases,
        databaseSelectionText: selectionText
      };
    } catch (error) {
      console.error("Error in database selector agent:", error);
      return {
        ...state,
        response: "I encountered an error while selecting Earth Engine datasets. Please try again with a more specific request."
      };
    }
  };
};

// Helper function to extract database IDs from the selection text
function extractDatabaseIds(selectionText: string, availableDatabases: DatasetEntry[]): string[] {
  const ids = new Set<string>();
  
  // Loop through all available databases and check if their ID is mentioned in the selection text
  for (const db of availableDatabases) {
    if (selectionText.includes(db.id)) {
      ids.add(db.id);
    }
  }
  
  return Array.from(ids);
} 