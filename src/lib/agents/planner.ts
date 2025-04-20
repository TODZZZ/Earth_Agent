/**
 * Planner Agent for Earth Engine Agent
 * 
 * This agent analyzes user prompts and creates a task plan.
 */

import { ChatOpenAI } from "@langchain/openai";
import { AgentState } from "./types";
import { PromptTemplate } from "@langchain/core/prompts";
import { EarthEngineTools } from "../tools";

// Define the prompt template for the planner
const PLANNER_PROMPT = PromptTemplate.fromTemplate(`
You are a planning agent for Google Earth Engine tasks. Your role is to:
1. Analyze the user's request
2. Determine if it can be accomplished with Google Earth Engine
3. Create a step-by-step plan for fulfilling the request

USER REQUEST: {input}

Think through whether this request can be accomplished with Google Earth Engine.
Google Earth Engine is a platform for scientific analysis and visualization of geospatial datasets.
It's good for tasks involving:
- Analyzing satellite imagery
- Creating maps and visualizations of geographic data
- Performing geospatial analysis
- Working with large-scale raster datasets
- Time-series analysis of geographic data

Return a detailed plan with the following structure:
1. Feasibility: Can this task be accomplished with Google Earth Engine? (Yes/No/Partially)
2. Reasoning: Why or why not?
3. Task Plan: If feasible, list the specific steps needed to accomplish this task.
4. Data Needs: What types of Earth Engine datasets would be most relevant?
`);

// Create the planner agent
export const createPlannerAgent = () => {
  // Initialize the LLM
  const model = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    temperature: 0,
  });

  // Create the planner function
  return async (state: AgentState): Promise<AgentState> => {
    console.log("Planner agent processing input:", state.input);

    try {
      // First, assess if the problem can be addressed with Earth Engine
      const assessmentResult = await EarthEngineTools.assessProblem(state.input);
      
      if (!assessmentResult.feasible) {
        return {
          ...state,
          taskPlan: `This task cannot be accomplished with Earth Engine: ${assessmentResult.explanation}`,
          response: `I'm sorry, but I can't help with this task using Google Earth Engine. ${assessmentResult.explanation}`
        };
      }

      // Generate the plan using the LLM
      const formattedPrompt = await PLANNER_PROMPT.format({
        input: state.input,
      });
      
      const result = await model.invoke(formattedPrompt);
      const taskPlan = result.content.toString();

      console.log("Generated plan:", taskPlan);

      // Return the updated state
      return {
        ...state,
        taskPlan,
      };
    } catch (error) {
      console.error("Error in planner agent:", error);
      return {
        ...state,
        taskPlan: "Error creating plan. Please try again.",
        response: "I encountered an error while planning your task. Please try again or reformulate your request."
      };
    }
  };
}; 