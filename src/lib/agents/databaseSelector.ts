/**
 * Database Selector Agent for Earth Engine Agent
 * 
 * This agent selects appropriate databases from the Earth Engine catalog
 * based on the user's request and the task plan.
 */

import { ChatOpenAI } from "@langchain/openai";
import { AgentState } from "./types";
import { PromptTemplate } from "@langchain/core/prompts";
import { EarthEngineTools } from "../tools";

// Define the prompt template for the database selector
const DATABASE_SELECTOR_PROMPT = PromptTemplate.fromTemplate(`
You are a database selection agent for Google Earth Engine. Your role is to select the most appropriate 
datasets for a given task based on the user's request and the task plan.

USER REQUEST: {input}
TASK PLAN: {taskPlan}
AVAILABLE DATASETS: {availableDatasets}

Based on the user's request and the task plan, select the most appropriate datasets from the available options.
Be sure to consider:
1. The type of analysis required (e.g., vegetation, water, elevation, etc.)
2. The temporal needs (single time point vs. time series)
3. The spatial resolution requirements
4. Any specific indexes or bands mentioned in the request

Return a JSON array of selected datasets with their IDs and a brief justification for each selection.
Example format:
[
  {
    "id": "DATASET_ID",
    "name": "Dataset Name",
    "justification": "This dataset is appropriate because..."
  }
]

Keep it concise and limit your selection to at most 3 datasets that best fit the task.
`);

// Create the database selector agent
export const createDatabaseSelectorAgent = () => {
  // Initialize the LLM
  const model = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    temperature: 0,
  });

  // Create the database selector function
  return async (state: AgentState): Promise<AgentState> => {
    // If we don't have a task plan yet, return the state unchanged
    if (!state.taskPlan) {
      console.log("Database selector: No task plan available");
      return state;
    }

    console.log("Database selector processing task plan");

    try {
      // Search for relevant datasets based on the user input
      const relevantDatasets = await EarthEngineTools.databaseSearch(state.input);
      
      if (relevantDatasets.length === 0) {
        return {
          ...state,
          selectedDatabases: [],
          response: "I couldn't find any relevant Earth Engine datasets for your request. Could you provide more specific details about what kind of data you're looking for?"
        };
      }

      // Format the datasets for the prompt
      const formattedDatasets = JSON.stringify(relevantDatasets, null, 2);

      // Generate the database selections using the LLM
      const formattedPrompt = await DATABASE_SELECTOR_PROMPT.format({
        input: state.input,
        taskPlan: state.taskPlan,
        availableDatasets: formattedDatasets
      });
      
      const result = await model.invoke(formattedPrompt);
      
      // Parse the LLM response to get the selected databases
      const selectionText = result.content.toString();
      let selectedDatabases;
      
      try {
        // Extract JSON from the response - it might be embedded in text
        const jsonMatch = selectionText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          selectedDatabases = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback - if we can't parse the JSON, use the raw response
          selectedDatabases = [{ 
            id: relevantDatasets[0].id, 
            name: relevantDatasets[0].name,
            justification: "Selected as best match for the request." 
          }];
        }
      } catch (parseError) {
        console.error("Error parsing database selection:", parseError);
        selectedDatabases = [{ 
          id: relevantDatasets[0].id, 
          name: relevantDatasets[0].name,
          justification: "Selected as fallback due to parsing error." 
        }];
      }

      console.log("Selected databases:", selectedDatabases);

      // Return the updated state
      return {
        ...state,
        selectedDatabases
      };
    } catch (error) {
      console.error("Error in database selector agent:", error);
      return {
        ...state,
        selectedDatabases: [],
        response: "I encountered an error while selecting appropriate Earth Engine datasets. Please try again with a more specific request."
      };
    }
  };
}; 