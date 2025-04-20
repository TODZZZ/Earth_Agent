/**
 * Type definitions for Earth Engine Agent
 */

import { DatasetEntry } from "../tools/databaseSearch";
import { z } from "zod";

// Zod schemas for validation
export const DatasetEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.string().optional(),
  tags: z.array(z.string()).optional(),
  url: z.string().optional()
});

export const AgentStateSchema = z.object({
  input: z.string(),
  taskPlan: z.string().optional(),
  selectedDatabases: z.array(DatasetEntrySchema).optional(),
  databaseSelectionText: z.string().optional(),
  generatedCode: z.string().optional(),
  errors: z.string().optional(),
  debugLog: z.array(z.string()).optional(),
  inspectionResults: z.string().optional(),
  response: z.string().optional()
});

export const AgentResponseSchema = z.object({
  response: z.string(),
  code: z.string().optional(),
  debugLog: z.array(z.string()).optional()
});

// TypeScript interfaces
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