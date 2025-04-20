/**
 * Configuration management for Earth Agent
 * 
 * Handles API keys and other configuration securely using Chrome storage
 */

// Default configuration values
export const DEFAULT_CONFIG = {
  modelName: "gpt-3.5-turbo",
  temperature: 0
};

// Keys used in Chrome storage
export const STORAGE_KEYS = {
  OPENAI_API_KEY: 'earth_agent_openai_api_key',
  SETTINGS: 'earth_agent_settings',
};

/**
 * Save the OpenAI API key securely to Chrome storage
 */
export const saveApiKey = async (apiKey: string): Promise<void> => {
  try {
    // First check if we're in a context where chrome.storage is available
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
      console.warn("Chrome storage API is not available in saveApiKey");
      throw new Error('Chrome storage API is not available');
    }
    
    console.log("Saving API key to Chrome storage, length:", apiKey.length);
    await chrome.storage.sync.set({ [STORAGE_KEYS.OPENAI_API_KEY]: apiKey });
    console.log('API key saved successfully');
  } catch (error) {
    console.error('Error saving API key:', error);
    throw new Error('Failed to save API key');
  }
};

/**
 * Get the OpenAI API key from Chrome storage
 */
export const getApiKey = async (): Promise<string | null> => {
  try {
    // First check if we're in a context where chrome.storage is available
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
      console.warn("Chrome storage API is not available in getApiKey");
      return null;
    }
    
    console.log("Retrieving API key from Chrome storage...");
    const result = await chrome.storage.sync.get([STORAGE_KEYS.OPENAI_API_KEY]);
    const apiKey = result[STORAGE_KEYS.OPENAI_API_KEY] || null;
    console.log("API key retrieved from storage:", apiKey ? `length: ${apiKey.length}` : "not found");
    return apiKey;
  } catch (error) {
    console.error('Error retrieving API key:', error);
    return null;
  }
};

/**
 * Check if the API key is set
 */
export const isApiKeySet = async (): Promise<boolean> => {
  try {
    // First check if we're in a context where chrome.storage is available
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
      console.warn("Chrome storage API is not available");
      return false;
    }
    
    const apiKey = await getApiKey();
    const isSet = !!apiKey;
    console.log("API key is set:", isSet);
    return isSet;
  } catch (error) {
    console.error('Error checking if API key is set:', error);
    return false;
  }
};

/**
 * Save settings to Chrome storage
 */
export const saveSettings = async (settings: Record<string, any>): Promise<void> => {
  try {
    // First check if we're in a context where chrome.storage is available
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
      console.warn("Chrome storage API is not available in saveSettings");
      throw new Error('Chrome storage API is not available');
    }
    
    await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: settings });
    console.log('Settings saved successfully');
  } catch (error) {
    console.error('Error saving settings:', error);
    throw new Error('Failed to save settings');
  }
};

/**
 * Get settings from Chrome storage
 */
export const getSettings = async (): Promise<Record<string, any>> => {
  try {
    // First check if we're in a context where chrome.storage is available
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
      console.warn("Chrome storage API is not available in getSettings");
      return {};
    }
    
    const result = await chrome.storage.sync.get([STORAGE_KEYS.SETTINGS]);
    return result[STORAGE_KEYS.SETTINGS] || {};
  } catch (error) {
    console.error('Error retrieving settings:', error);
    return {};
  }
}; 