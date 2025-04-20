/**
 * Background script for Earth Agent extension
 */

// Earth Engine editor URL
const EARTH_ENGINE_EDITOR_URL = 'https://code.earthengine.google.com';

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Earth Agent installed', details);
  
  // Configure the side panel behavior to open when icon is clicked
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch(error => console.error('Error setting panel behavior:', error));
});

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab?.windowId) {
    chrome.sidePanel.open({ windowId: tab.windowId })
      .catch(error => console.error('Error opening side panel:', error));
  }
});

// Message handling between content script and sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message, 'from:', sender);

  // Handle different message types here
  if (message.type === 'TEST_CONNECTION') {
    sendResponse({ success: true, message: 'Background connection successful' });
    return true;
  }
  
  if (message.type === 'OPEN_EARTH_ENGINE_AND_RUN_CODE') {
    console.log('Received request to open Earth Engine and run code');
    
    // Get the code to inject
    const code = message.code;
    if (!code) {
      sendResponse({ success: false, error: 'No code provided' });
      return true;
    }
    
    // Check if Earth Engine is already open in a tab
    chrome.tabs.query({ url: `${EARTH_ENGINE_EDITOR_URL}/*` }, (tabs) => {
      if (tabs.length > 0) {
        const earthEngineTab = tabs[0];
        
        // Activate the tab
        chrome.tabs.update(earthEngineTab.id!, { active: true }, () => {
          // Inject the code
          injectAndRunCodeInTab(earthEngineTab.id!, code, sendResponse);
        });
      } else {
        // Open Earth Engine in a new tab
        chrome.tabs.create({ url: EARTH_ENGINE_EDITOR_URL }, (newTab) => {
          if (!newTab || !newTab.id) {
            sendResponse({ success: false, error: 'Failed to open Earth Engine' });
            return;
          }
          
          console.log('Opened new Earth Engine tab, waiting for it to load');
          
          // Set up a listener to wait for the page to load
          const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
            if (tabId === newTab.id && changeInfo.status === 'complete') {
              // Remove the listener once the page is loaded
              chrome.tabs.onUpdated.removeListener(listener);
              
              console.log('Earth Engine page loaded, waiting for initialization');
              
              // Wait for Earth Engine to initialize
              setTimeout(() => {
                injectAndRunCodeInTab(newTab.id!, code, sendResponse);
              }, 5000); // Wait 5 seconds for Earth Engine to initialize
            }
          };
          
          // Add the listener
          chrome.tabs.onUpdated.addListener(listener);
        });
      }
    });
    
    return true; // Using sendResponse asynchronously
  }

  // For async responses
  return true;
});

/**
 * Injects and runs code in a specific tab
 */
function injectAndRunCodeInTab(tabId: number, code: string, sendResponse: (response: any) => void) {
  console.log(`Injecting code into tab ${tabId}`);
  
  chrome.tabs.sendMessage(
    tabId,
    { type: 'RUN_CODE', code },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message to tab:', chrome.runtime.lastError);
        
        // The content script might not be loaded yet, let's try with executeScript
        chrome.scripting.executeScript({
          target: { tabId },
          func: (codeToInject) => {
            // This function runs in the context of the page
            console.log('Executing code injection via executeScript');
            
            // Try to find the ACE editor
            const editorElement = document.querySelector('.ace_editor');
            if (!editorElement) {
              console.error('Could not find ACE editor');
              return { success: false, error: 'Could not find editor' };
            }
            
            try {
              // Try direct text input manipulation
              const textInput = document.querySelector('.ace_text-input');
              if (textInput) {
                console.log('Found text input, setting value');
                (textInput as HTMLTextAreaElement).focus();
                document.execCommand('selectAll', false);
                document.execCommand('insertText', false, codeToInject);
                
                // Click run button
                const runButton = document.querySelector('.goog-button.run-button') || 
                                 document.querySelector('button[title="Run"]');
                if (runButton) {
                  console.log('Clicking run button');
                  (runButton as HTMLElement).click();
                  return { success: true, message: 'Code injected and run button clicked' };
                }
                
                return { success: true, message: 'Code injected but run button not found' };
              }
              
              return { success: false, error: 'Could not find text input' };
            } catch (error) {
              console.error('Error in executeScript:', error);
              return { success: false, error: String(error) };
            }
          },
          args: [code]
        }, (results) => {
          if (results && results[0] && results[0].result && results[0].result.success) {
            sendResponse({ success: true, result: results[0].result.message });
          } else {
            const error = results && results[0] && results[0].result ? results[0].result.error : 'Unknown error';
            sendResponse({ success: false, error });
          }
        });
        
        return;
      }
      
      // Forward the response from the content script
      sendResponse(response);
    }
  );
}

console.log('Earth Agent background script loaded'); 