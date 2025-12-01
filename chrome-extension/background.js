// Background script for handling keyboard commands and communication
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-overlay') {
    // Get the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        // Send message to content script to toggle overlay
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'toggle-overlay'
        });
      }
    });
  }
});

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Cisco Questions Search Overlay installed');
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'get-questions') {
    // Load questions from the extension's resources
    fetch(chrome.runtime.getURL('extractedCCNA3_questions.json'))
      .then(response => response.json())
      .then(data => {
        sendResponse({ questions: data });
      })
      .catch(error => {
        console.error('Error loading questions:', error);
        sendResponse({ error: 'Failed to load questions' });
      });

    // Return true to indicate async response
    return true;
  }
});
