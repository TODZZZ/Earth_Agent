/**
 * Background script for Earth Agent extension
 */

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Earth Agent installed', details);
});

// Message handling between content script and popup/sidepanel
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