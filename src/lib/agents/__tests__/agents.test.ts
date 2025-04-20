import { describe, it, expect } from 'vitest';
import { initializeAgentSystem } from '../index';
import { createPlannerAgent } from '../planner';
import { createDatabaseSelectorAgent } from '../databaseSelector';
import { createCodeGeneratorAgent } from '../codeGenerator';
import { AgentState } from '../types';

describe('Agent System', () => {
  it('should initialize and respond to input', async () => {
    const agentSystem = await initializeAgentSystem();
    
    expect(agentSystem).toBeDefined();
    
    const response = await agentSystem('Show me elevation data for the Grand Canyon');
    expect(response).toHaveProperty('response');
    expect(response).toHaveProperty('code');
    expect(typeof response.response).toBe('string');
    expect(typeof response.code).toBe('string');
  });
  
  describe('Individual Agents', () => {
    it('planner agent should analyze a prompt and create a plan', async () => {
      const plannerAgent = createPlannerAgent();
      const initialState: AgentState = { input: 'Show me a vegetation map of California' };
      
      const result = await plannerAgent(initialState);
      
      expect(result).toHaveProperty('taskPlan');
      expect(typeof result.taskPlan).toBe('string');
      expect(result.taskPlan?.length).toBeGreaterThan(0);
    });
    
    it('database selector agent should select appropriate datasets', async () => {
      const databaseSelectorAgent = createDatabaseSelectorAgent();
      const initialState: AgentState = { 
        input: 'Show me a vegetation map of California',
        taskPlan: 'Feasibility: Yes\nReasoning: Vegetation maps can be created using satellite imagery with vegetation indices.\nTask Plan: 1. Find appropriate satellite imagery 2. Calculate vegetation indices 3. Filter to California region 4. Create a visualization\nData Needs: Landsat or MODIS data with vegetation bands'
      };
      
      const result = await databaseSelectorAgent(initialState);
      
      expect(result).toHaveProperty('selectedDatabases');
      expect(Array.isArray(result.selectedDatabases)).toBe(true);
      if (result.selectedDatabases && result.selectedDatabases.length > 0) {
        expect(result.selectedDatabases[0]).toHaveProperty('id');
        expect(result.selectedDatabases[0]).toHaveProperty('name');
      }
    });
    
    it('code generator agent should produce Earth Engine code', async () => {
      const codeGeneratorAgent = createCodeGeneratorAgent();
      const initialState: AgentState = { 
        input: 'Show me a vegetation map of California',
        taskPlan: 'Feasibility: Yes\nReasoning: Vegetation maps can be created using satellite imagery.\nTask Plan: 1. Find appropriate datasets 2. Calculate indices 3. Filter to region 4. Visualize',
        selectedDatabases: [{
          id: 'MODIS/006/MOD13Q1',
          title: 'MODIS Terra Vegetation Indices 16-Day Global 250m',
          description: 'Contains NDVI data for vegetation analysis',
          type: 'image_collection',
          provider: 'NASA'
        }]
      };
      
      const result = await codeGeneratorAgent(initialState);
      
      expect(result).toHaveProperty('generatedCode');
      expect(typeof result.generatedCode).toBe('string');
      expect(result.generatedCode?.length).toBeGreaterThan(0);
      expect(result).toHaveProperty('response');
      expect(typeof result.response).toBe('string');
    });
    
    it('full workflow should process a request end-to-end', async () => {
      const plannerAgent = createPlannerAgent();
      const databaseSelectorAgent = createDatabaseSelectorAgent();
      const codeGeneratorAgent = createCodeGeneratorAgent();
      
      let state: AgentState = { input: 'Show me a map of rainfall in India for 2022' };
      
      // Step 1: Planning
      state = await plannerAgent(state);
      expect(state).toHaveProperty('taskPlan');
      
      // Step 2: Database Selection
      state = await databaseSelectorAgent(state);
      expect(state).toHaveProperty('selectedDatabases');
      
      // Step 3: Code Generation
      state = await codeGeneratorAgent(state);
      expect(state).toHaveProperty('generatedCode');
      expect(state).toHaveProperty('response');
      
      // Verify code contains relevant elements
      const code = state.generatedCode || '';
      expect(code).toContain('Map');
      expect(code.toLowerCase()).toContain('india');
    });
  });
}); 