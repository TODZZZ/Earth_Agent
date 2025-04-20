/**
 * Types for the Earth Engine Agent system
 */

export interface AgentState {
  input: string;
  taskPlan?: string;
  selectedDatabases?: string[];
  generatedCode?: string;
  errors?: string;
  inspectionResults?: string;
  response?: string;
}

export interface AgentResponse {
  response: string;
  code?: string;
} 