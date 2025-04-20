/**
 * Content script for Earth Engine Agent
 * 
 * This script runs in the context of the Google Earth Engine page
 * and allows interaction with the page DOM.
 */

console.log('Earth Engine Agent content script loaded');

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Content script received message:', message);

  // Handle different message types
  switch (message.type) {
    case 'RUN_CODE':
      runCode(message.code)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Indicates async response

    case 'INSPECT_MAP':
      inspectMap()
        .then(data => sendResponse({ success: true, data }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'CHECK_PAGE':
      // Check if we're on the Earth Engine page
      const isEarthEnginePage = window.location.href.includes('code.earthengine.google.com');
      sendResponse({ success: true, isEarthEnginePage });
      return true;
  }

  return false;
});

// Function to run code in the Earth Engine Code Editor
async function runCode(code: string): Promise<string> {
  console.log('Running code in Earth Engine:', code);
  
  // This is a placeholder for Phase 2 implementation
  // In Phase 2, we'll implement actual DOM manipulation to:
  // 1. Find the ACE editor on the page
  // 2. Clear existing code
  // 3. Insert the new code
  // 4. Click the "Run" button
  
  return Promise.resolve('Code execution will be implemented in Phase 2');
}

// Function to inspect the map at the current cursor position
async function inspectMap(): Promise<any> {
  console.log('Inspecting map');
  
  // This is a placeholder for Phase 2 implementation
  // In Phase 2, we'll implement:
  // 1. Click the inspector button
  // 2. Click on the map at specified coordinates
  // 3. Extract the information from the inspector panel
  
  return Promise.resolve({
    message: 'Map inspection will be implemented in Phase 2',
    mockData: {
      elevation: 1234,
      coordinates: {
        lat: 37.7749,
        lng: -122.4194
      }
    }
  });
}

// Notify the background script that the content script is loaded
chrome.runtime.sendMessage({
  type: 'CONTENT_SCRIPT_LOADED',
  url: window.location.href
}); 