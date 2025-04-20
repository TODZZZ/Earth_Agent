/**
 * Planner Agent for Earth Engine Agent
 * 
 * This agent analyzes the user request and creates a plan for fulfilling it.
 */

import { ChatOpenAI } from "@langchain/openai";
import { AgentState } from "./types";
import { PromptTemplate } from "@langchain/core/prompts";
import { getApiKey } from "../config";
import { EarthEngineTools } from "../tools";

// Define the prompt template for the planner
const PLANNER_PROMPT = PromptTemplate.fromTemplate(`
You are a planning agent for Google Earth Engine. Your role is to analyze the user's request and determine:
1. If the request can be accomplished using Google Earth Engine
2. What Earth Engine datasets might be needed
3. What processing steps would be required
4. A step-by-step plan to fulfill the request

USER REQUEST: {input}

First, determine if this request can be accomplished using Google Earth Engine. Earth Engine is good for:
- Analyzing satellite imagery and geospatial data
- Processing large-scale Earth observation data
- Creating visualizations and maps of geographic data
- Performing spatial and temporal analysis of environmental data

Earth Engine is NOT suitable for:
- Non-geospatial tasks (general programming, web development, etc.)
- Tasks that don't involve Earth observation data
- Personal navigation or routing

If the request is not suitable for Earth Engine, explain why and suggest alternatives.
If the request is suitable, provide a detailed plan for how to accomplish it using Earth Engine.

Your plan should include:
1. The specific Earth Engine datasets that might be useful
2. The processing steps required
3. How to visualize or present the results

Be specific and detailed in your plan.
`);

// Create the planner agent
export const createPlannerAgent = () => {
  // Create the planner function
  return async (state: AgentState): Promise<AgentState> => {
    console.log("Planner processing input:", state.input);

    try {
      // First, assess if the problem is feasible with Earth Engine
      console.log("Assessing problem feasibility...");
      const assessmentResult = await EarthEngineTools.assessProblem(state.input);
      console.log("Assessment result:", JSON.stringify(assessmentResult));
      
      if (!assessmentResult.feasible) {
        console.log("Request not feasible with Earth Engine:", assessmentResult.explanation);
        return {
          ...state,
          response: `I'm sorry, but I don't think Google Earth Engine is the right tool for this request. ${assessmentResult.explanation}`
        };
      }
      
      // Get API key from secure storage
      console.log("Retrieving API key...");
      const apiKey = await getApiKey();
      
      if (!apiKey) {
        console.error("API key not found in storage");
        return {
          ...state,
          response: "OpenAI API key is not configured. Please set your API key in the settings."
        };
      }
      
      console.log("API key retrieved, length:", apiKey.length);
      
      // Initialize the LLM with the API key
      console.log("Initializing LLM...");
      try {
        const model = new ChatOpenAI({
          modelName: "gpt-4o",
          temperature: 0,
          openAIApiKey: apiKey,
          configuration: {
            dangerouslyAllowBrowser: true // Required for running in browser extension
          }
        });

        // Generate the plan using the LLM
        console.log("Generating plan using LLM...");
        const formattedPrompt = await PLANNER_PROMPT.format({
          input: state.input
        });
        
        console.log("Prompt formatted, calling OpenAI API...");
        const result = await model.invoke(formattedPrompt);
        
        // Extract the plan from the LLM response
        const taskPlan = result.content.toString();

        console.log("Generated plan:", taskPlan);

        // Return the updated state
        return {
          ...state,
          taskPlan
        };
      } catch (apiError) {
        console.error("OpenAI API error:", apiError);
        if (apiError instanceof Error) {
          console.error("Error details:", apiError.message, apiError.stack);
        }
        return {
          ...state,
          response: `Error calling OpenAI API: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`
        };
      }
    } catch (error) {
      console.error("Error in planner agent:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message, error.stack);
      }
      return {
        ...state,
        response: `I encountered an error while planning the task: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  };
}; 