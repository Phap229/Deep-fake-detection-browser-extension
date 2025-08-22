// Background script for Face Selection Deepfake Detector Extension

chrome.runtime.onInstalled.addListener(() => {
    console.log('Face Selection Deepfake Detector Extension installed');
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);
    
    // Always send a response
    sendResponse({ received: true });
});
