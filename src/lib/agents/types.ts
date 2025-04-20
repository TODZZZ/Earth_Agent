/**
 * Type definitions for Earth Engine Agent
 */

import { DatasetEntry } from "../tools/databaseSearch";

export interface AgentState {
  // User input
  input: string;
  
  // Task planning
  taskPlan?: string;
  
  // Database selection
  selectedDatabases?: DatasetEntry[];
  databaseSelectionText?: string;
  
  // Code generation
  generatedCode?: string;
  
  // Debugging
  errors?: string;
  debugLog?: string[];
  
  // Inspection results from Earth Engine
  inspectionResults?: string;
  
  // Final response to user
  response?: string;
}

export interface AgentResponse {
  response: string;
  code?: string;
  debugLog?: string[];
} 