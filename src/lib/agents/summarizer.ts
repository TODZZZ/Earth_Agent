/**
 * Summarizer Agent for Earth Engine Agent
 * 
 * This agent summarizes the Earth Engine analysis, maps, and results
 * in a clear, concise manner for the user.
 */

import { ChatOpenAI } from "@langchain/openai";
import { AgentState } from "./types";
import { PromptTemplate } from "@langchain/core/prompts";
import { getApiKey } from "../config";

// Define the prompt template for the summarizer
const SUMMARIZER_PROMPT = PromptTemplate.fromTemplate(`
You are a summarization agent for Google Earth Engine analyses. Your role is to provide clear, concise summaries
of Earth Engine analyses and their results in a way that is accessible to users of all technical levels.

USER REQUEST: {input}
TASK PLAN: {taskPlan}
SELECTED DATASETS: {selectedDatabases}
GENERATED CODE: 
\`\`\`javascript
{generatedCode}
\`\`\`
INSPECTION RESULTS: {inspectionResults}

Based on all the information above, create a comprehensive but concise summary that includes:

1. The original objective of the analysis
2. The datasets used and why they were selected
3. The key processing steps in the analysis
4. The main findings or visualizations produced
5. Any limitations or caveats of the analysis
6. Suggestions for further exploration or improvement

Make your explanation accessible to users who may not be familiar with Earth Engine or remote sensing terminology.
Use clear language and avoid unnecessary technical jargon. When mentioning technical concepts, briefly explain them.

Your summary should be comprehensive enough to be useful, but concise enough to be quickly digested.
`);

// Create the summarizer agent
export const createSummarizerAgent = () => {
  // Create the summarizer function
  return async (state: AgentState): Promise<AgentState> => {
    // If we don't have generated code, return the state unchanged
    if (!state.generatedCode) {
      console.log("Summarizer: No analysis to summarize");
      return state;
    }

    console.log("Summarizer processing analysis results");

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
        modelName: "gpt-4o",
        temperature: 0,
        openAIApiKey: apiKey,
        configuration: {
          dangerouslyAllowBrowser: true // Required for running in browser extension
        }
      });
      
      // Format the selected databases for the prompt
      const selectedDBs = state.selectedDatabases ? 
        JSON.stringify(state.selectedDatabases, null, 2) : 
        "No specific datasets were selected.";

      // Generate the summary using the LLM
      const formattedPrompt = await SUMMARIZER_PROMPT.format({
        input: state.input,
        taskPlan: state.taskPlan || "No specific task plan available.",
        selectedDatabases: selectedDBs,
        generatedCode: state.generatedCode,
        inspectionResults: state.inspectionResults || "No inspection results available."
      });
      
      try {
        const result = await model.invoke(formattedPrompt);
        
        // Safely extract the summary from the LLM response with null checking
        let summary = "I've generated Earth Engine code based on your request, but encountered an error generating a detailed summary.";
        
        if (result && result.content) {
          // Safely convert content to string, handling both string and object types
          summary = typeof result.content === 'string' 
            ? result.content 
            : result.content.toString ? result.content.toString() : JSON.stringify(result.content);
        }

        console.log("Generated summary:", summary);

        // Return the updated state with the summary as the response
        return {
          ...state,
          response: summary
        };
      } catch (invokeError) {
        console.error("Error invoking LLM for summary:", invokeError);
        return {
          ...state,
          response: state.response || "I encountered an error while summarizing the analysis. Here's the raw code and results instead."
        };
      }
    } catch (error) {
      console.error("Error in summarizer agent:", error);
      return {
        ...state,
        response: state.response || "I encountered an error while summarizing the analysis. Here's the raw code and results instead."
      };
    }
  };
}; 