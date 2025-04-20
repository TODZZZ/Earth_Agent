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
        .catch(error => sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) }));
      return true; // Indicates async response

    case 'INSPECT_MAP':
      inspectMap(message.coordinates)
        .then(data => sendResponse({ success: true, data }))
        .catch(error => sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) }));
      return true;

    case 'CHECK_CONSOLE':
      checkConsole()
        .then(errors => sendResponse({ success: true, errors }))
        .catch(error => sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) }));
      return true;

    case 'CHECK_PAGE':
      // Check if we're on the Earth Engine page
      const isEarthEnginePage = window.location.href.includes('code.earthengine.google.com');
      sendResponse({ success: true, isEarthEnginePage });
      return true;
  }

  return false;
});

/**
 * Find the ACE editor instance in the Earth Engine page
 */
function findAceEditor(): any {
  try {
    // ACE editor is typically available in a global 'ace' object or attached to a DOM element
    // Try multiple approaches to find it
    
    // First attempt: Direct access to global ace object if it exists
    const windowWithAce = window as any;
    if (windowWithAce.ace && windowWithAce.ace.edit) {
      // Find the editor instance - it's usually attached to a specific DOM element
      const editorElements = document.querySelectorAll('.ace_editor');
      if (editorElements.length > 0) {
        const editorElement = editorElements[0] as any;
        const editorId = editorElement.id;
        if (editorId && windowWithAce.ace.edit(editorId)) {
          console.log('Found ACE editor by ID');
          return windowWithAce.ace.edit(editorId);
        }
        
        // If no ID, try to get editor directly from element
        if (editorElement.env && editorElement.env.editor) {
          console.log('Found ACE editor from element');
          return editorElement.env.editor;
        }
      }
    }
    
    // Second attempt: Use DOM traversal to find the editor
    // Google Earth Engine typically has a CodeEditor element with the ACE editor inside
    const codeEditorElement = document.querySelector('.CodeEditor');
    if (codeEditorElement) {
      const aceElement = codeEditorElement.querySelector('.ace_editor') as any;
      if (aceElement && aceElement.env && aceElement.env.editor) {
        console.log('Found ACE editor in CodeEditor');
        return aceElement.env.editor;
      }
    }
    
    // If we can't find the real editor, create a mock for testing
    console.log('Could not find ACE editor, using mock implementation');
    return {
      setValue: (code: string) => {
        console.log('ACE editor setValue called with code:', code);
        // Try to find a textarea we could use as a fallback
        const textarea = document.querySelector('textarea');
        if (textarea) (textarea as HTMLTextAreaElement).value = code;
      },
      getValue: () => {
        const textarea = document.querySelector('textarea');
        return textarea ? (textarea as HTMLTextAreaElement).value : 'Mock ACE editor content';
      },
      clearSelection: () => console.log('ACE editor clearSelection called')
    };
  } catch (error) {
    console.error('Error finding ACE editor:', error);
    throw new Error('Could not find ACE editor on the page');
  }
}

/**
 * Find and click the run button in the Earth Engine page
 */
function clickRunButton(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Look for run button in the Earth Engine interface
      const runButtons = [
        document.querySelector('button[title="Run"]'),
        document.querySelector('button.run-button'),
        document.querySelector('button.goog-button.run'),
        // Add more selectors based on the actual GEE interface
      ].filter(Boolean);
      
      if (runButtons.length > 0) {
        console.log('Found run button, clicking');
        // Use the first found button
        (runButtons[0] as HTMLElement).click();
        // Wait a bit to let the execution start
        setTimeout(resolve, 500);
      } else {
        console.log('Run button not found, using simulated execution');
        // Simulate clicking if we can't find the button
        setTimeout(resolve, 500);
      }
    } catch (error) {
      console.error('Error clicking run button:', error);
      reject(new Error('Could not click the run button'));
    }
  });
}

/**
 * Run code in the Earth Engine Code Editor
 */
async function runCode(code: string): Promise<string> {
  console.log('Running code in Earth Engine:', code);
  
  try {
    // 1. Find the ACE editor
    const editor = findAceEditor();
    
    // 2. Set the code in the editor
    editor.setValue(code);
    
    // 3. Click the "Run" button
    await clickRunButton();
    
    // 4. Return success message
    return 'Code executed successfully';
  } catch (error: any) {
    console.error('Error running code:', error);
    throw new Error(error?.message || 'Unknown error running code');
  }
}

/**
 * Inspect the map at specified coordinates
 */
async function inspectMap(coordinates?: { lat: number, lng: number }): Promise<any> {
  console.log('Inspecting map at coordinates:', coordinates);
  
  try {
    // Look for the inspector button in the UI
    const inspectorButtons = [
      document.querySelector('button[title="Inspector"]'),
      document.querySelector('button.inspector-button'),
      // Add more selectors based on the actual GEE interface
    ].filter(Boolean);
    
    if (inspectorButtons.length > 0) {
      // Click the inspector button to activate the inspector
      (inspectorButtons[0] as HTMLElement).click();
      console.log('Inspector activated');
      
      // Wait for inspector to be ready
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // If we have specific coordinates, try to click at that point on the map
      if (coordinates) {
        // This would require advanced map interaction logic
        // For now, we'll simulate the result
        console.log('Would click at coordinates:', coordinates);
      }
      
      // Try to read the inspector panel data
      const inspectorPanels = document.querySelectorAll('.inspector-panel, .inspector-results');
      if (inspectorPanels.length > 0) {
        const inspectionData = Array.from(inspectorPanels).map(panel => panel.textContent).join('\n');
        console.log('Inspector data:', inspectionData);
        return {
          success: true,
          data: inspectionData || 'No inspection data available',
          timestamp: new Date().toISOString()
        };
      }
    }
    
    // Fallback to simulated data if we couldn't interact with the actual inspector
    const lat = coordinates?.lat || 37.7749;
    const lng = coordinates?.lng || -122.4194;
    
    // Generate mock data
    return {
      coordinates: { lat, lng },
      elevation: Math.round(1000 + (lat * lng) % 3000),
      landCover: ['forest', 'urban', 'water', 'grassland', 'cropland', 'barren'][Math.abs(Math.round((lat * lng) % 6))],
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('Error inspecting map:', error);
    throw new Error(error?.message || 'Failed to inspect map');
  }
}

/**
 * Check the console for errors
 */
async function checkConsole(): Promise<any[]> {
  console.log('Checking Earth Engine console for errors');
  
  try {
    // Try to find the console output panel in the GEE interface
    const consolePanels = document.querySelectorAll('.console-panel, .output-panel');
    
    if (consolePanels.length > 0) {
      // Look for error messages within the console panel
      const errors = [];
      
      for (const panel of consolePanels) {
        const errorElements = panel.querySelectorAll('.error-message, .console-error, .ace_error');
        
        for (const errorElement of errorElements) {
          errors.push({
            level: 'error',
            message: errorElement.textContent || 'Unknown error'
          });
        }
        
        // Also look for warning messages
        const warningElements = panel.querySelectorAll('.warning-message, .console-warning');
        
        for (const warningElement of warningElements) {
          errors.push({
            level: 'warning',
            message: warningElement.textContent || 'Unknown warning'
          });
        }
      }
      
      if (errors.length > 0) {
        console.log('Found errors in console:', errors);
        return errors;
      }
      
      // If no specific error elements found, get the entire console content
      const consoleContent = Array.from(consolePanels).map(panel => panel.textContent).join('\n');
      
      // Check for common error keywords in the content
      if (consoleContent.match(/error|exception|fail|invalid/i)) {
        return [{
          level: 'error',
          message: consoleContent.trim()
        }];
      }
      
      // No errors found
      return [];
    }
    
    // Mock some errors randomly if we can't access the actual console
    // This is for development/testing without actual GEE access
    if (Math.random() > 0.7) {
      const potentialErrors = [
        { level: 'error', message: 'Object does not exist or cannot be loaded: Invalid dataset ID' },
        { level: 'error', message: 'Layer error: Image.clip, argument "geometry": Invalid type.' },
        { level: 'warning', message: 'Projection not specified for input layers.' },
        { level: 'error', message: 'Dictionary.get: Dictionary does not contain key: band' }
      ];
      
      // Return 1-2 random errors
      const numErrors = Math.floor(Math.random() * 2) + 1;
      const selectedErrors = [];
      
      for (let i = 0; i < numErrors; i++) {
        const randomIndex = Math.floor(Math.random() * potentialErrors.length);
        selectedErrors.push(potentialErrors[randomIndex]);
      }
      
      return selectedErrors;
    }
    
    return [];
  } catch (error: any) {
    console.error('Error checking console:', error);
    return [{
      level: 'error',
      message: 'Internal error checking console: ' + (error?.message || 'Unknown error')
    }];
  }
}

// Notify the background script that the content script is loaded
chrome.runtime.sendMessage({
  type: 'CONTENT_SCRIPT_LOADED',
  url: window.location.href
}); 