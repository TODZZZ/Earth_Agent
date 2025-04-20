import React, { useState, useEffect } from 'react';
import { saveApiKey, getApiKey, isApiKeySet } from '@/lib/config';

interface ApiKeyFormProps {
  onApiKeySet: () => void;
}

const ApiKeyForm: React.FC<ApiKeyFormProps> = ({ onApiKeySet }) => {
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Check if API key is already set
    const checkApiKey = async () => {
      try {
        const keyExists = await isApiKeySet();
        if (keyExists) {
          try {
            const key = await getApiKey();
            if (key) {
              // Show a masked version of the key (only last 4 chars)
              const maskedKey = '*'.repeat(key.length - 4) + key.slice(-4);
              setApiKey(maskedKey);
            }
          } catch (err) {
            console.error('Error retrieving API key:', err);
            setLoadError('Error retrieving your API key. You may need to enter it again.');
          }
        }
      } catch (err) {
        console.error('Error checking API key status:', err);
        setLoadError('Error checking API key status. Please try refreshing the page.');
      }
    };
    
    checkApiKey();
  }, []);

  const validateApiKey = (key: string): boolean => {
    if (!key || key.trim() === '') {
      setError('API key is required');
      return false;
    }
    
    // Check if it's the masked key from the UI
    if (key.includes('*')) {
      setError('Please enter your full API key');
      return false;
    }
    
    // Basic OpenAI key format validation
    const openAIKeyPattern = /^sk-[a-zA-Z0-9_-]{32,}$/;
    if (!openAIKeyPattern.test(key.trim())) {
      setError('Invalid API key format. OpenAI keys should start with "sk-" followed by at least 32 characters.');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const trimmedKey = apiKey.trim();
    if (!validateApiKey(trimmedKey)) {
      return;
    }
    
    try {
      setSaving(true);
      await saveApiKey(trimmedKey);
      onApiKeySet();
    } catch (err) {
      console.error('Error saving API key:', err);
      setError('Failed to save API key: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">API Key Configuration</h2>
      <p className="mb-4 text-sm text-gray-700">
        To use the Earth Agent, you need to provide your OpenAI API key. 
        Your key will be stored securely in your browser's local storage.
      </p>
      
      {loadError && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-md">
          <p>{loadError}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
            OpenAI API Key
          </label>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setError(null); // Clear error when user types
            }}
            placeholder="sk-..."
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
        
        <button
          type="submit"
          disabled={saving}
          className={`w-full py-2 px-4 rounded-md text-white font-medium 
            ${saving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
        >
          {saving ? 'Saving...' : 'Save API Key'}
        </button>
      </form>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>You can get an API key from <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-600 hover:underline">OpenAI's website</a>.</p>
        <p className="mt-1">Your API key is only stored in your browser and is never sent to our servers.</p>
      </div>
    </div>
  );
};

export default ApiKeyForm; 