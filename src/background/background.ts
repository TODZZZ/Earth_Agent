/**
 * Background script for Earth Agent extension
 */

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

  // For async responses
  return true;
});

console.log('Earth Agent background script loaded'); 