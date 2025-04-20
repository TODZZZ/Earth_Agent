import { describe, it, expect } from 'vitest';
import { initializeAgentSystem } from '../index';

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
}); 