// Background script for Face Selection Deepfake Detector Extension

chrome.runtime.onInstalled.addListener(() => {
    console.log('Face Selection Deepfake Detector Extension installed');
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'FACE_SELECTED') {
        // Handle face selection immediately
        handleFaceSelection(message.data, sender.tab);
    } else if (message.type === 'CANCEL_SELECTION') {
        // Handle selection cancellation
        console.log('Selection cancelled by user');
    } else if (message.type === 'ANALYSIS_COMPLETE') {
        // Handle analysis completion and reopen popup
        reopenPopupWithResults(message.data);
    } else if (message.type === 'PROCESSED_IMAGE_READY') {
        // Handle processed image from content script
        sendToDeepfakeAPI(message.data.imageDataUrl, message.data.selectionData, sender.tab);
    } else if (message.type === 'CAPTURE_TAB') {
        // Handle tab capture request from content script
        handleTabCapture(message.data, sender.tab, sendResponse);
        return true; // Keep message channel open for async response
    }
    
    // Always send a response
    sendResponse({ received: true });
});

// Handle face selection immediately
async function handleFaceSelection(selectionData, tab) {
    try {
        // Send message to content script to process the image
        chrome.tabs.sendMessage(tab.id, {
            type: 'PROCESS_SELECTION',
            data: selectionData
        });
        
    } catch (error) {
        console.error('❌ Failed to process face selection:', error);
    }
}

// Handle tab capture request from content script
async function handleTabCapture(selectionData, tab, sendResponse) {
    try {
        // Capture the visible tab
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
        
        // Send the data URL back to the content script
        sendResponse({ dataUrl: dataUrl });
        
    } catch (error) {
        console.error('❌ Failed to capture tab:', error);
        sendResponse({ error: error.message });
    }
}

// Send to deepfake detection API
async function sendToDeepfakeAPI(imageDataUrl, selectionData, tab) {
    try {
        // Convert data URL to blob for FormData
        const imageResponse = await fetch(imageDataUrl);
        const blob = await imageResponse.blob();
        
        // Create FormData for the upload - match the API expected format
        const formData = new FormData();
        formData.append('file', blob, 'face.png'); // API expects 'file' parameter
        
        // API endpoint for deepfake detection - your running detection website
        const apiEndpoint = 'http://127.0.0.1:8080/analyze/';
        
        // Send POST request to backend
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Send analysis results back to content script
            chrome.tabs.sendMessage(tab.id, {
                type: 'ANALYSIS_RESULTS',
                data: result
            });
            
            // Reopen popup with results
            reopenPopupWithResults(result);
            
        } else {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
    } catch (error) {
        console.error('❌ API request failed:', error);
        
        // Show user-friendly error messages
        let errorMessage = 'Analysis failed';
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = 'Network error: Unable to connect to deepfake detection service. Make sure the detection website is running on http://127.0.0.1:8080';
        } else if (error.message.includes('HTTP 500')) {
            errorMessage = 'Server error: Service temporarily unavailable';
        } else {
            errorMessage = `Analysis failed: ${error.message}`;
        }
        
        // Create error result matching your API format
        const errorResult = {
            result: null,
            probability: 0.0,
            error: errorMessage
        };
        
        // Send error results back to content script
        chrome.tabs.sendMessage(tab.id, {
            type: 'ANALYSIS_RESULTS',
            data: errorResult
        });
        
        // Reopen popup with error results
        reopenPopupWithResults(errorResult);
    }
}

// Reopen popup with results
function reopenPopupWithResults(results) {
    try {
        // Store results in chrome.storage
        chrome.storage.local.set({ 
            analysisResults: results,
            timestamp: new Date().toISOString()
        }, () => {
            // Try to reopen the popup
            try {
                chrome.action.openPopup();
            } catch (error) {
                // Popup will be opened manually by user
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to store results:', error);
    }
}

// Track popup window
chrome.action.onClicked.addListener((tab) => {
    // This will be called when the extension icon is clicked
    console.log('Extension icon clicked, opening popup');
});
