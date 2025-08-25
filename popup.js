//  Deepfake Detector Extension
class FaceSelectionDetector {
    constructor() {
        this.isSelecting = false;
        this.selectedFaceData = null;
        this.initializeEventListeners();
        this.checkForExistingResults();
    }

    initializeEventListeners() {
        const startSelectionBtn = document.getElementById('startSelectionBtn');
        const stopSelectionBtn = document.getElementById('stopSelectionBtn');
        const analyzeBtn = document.getElementById('analyzeBtn');

        if (startSelectionBtn) {
            startSelectionBtn.addEventListener('click', () => {
                this.startFaceSelection();
            });
        }

        if (stopSelectionBtn) {
            stopSelectionBtn.addEventListener('click', () => {
                this.stopFaceSelection();
            });
        }

        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => {
                this.analyzeSelectedFace();
            });
        }
    }



    // Check for existing analysis results when popup opens
    async checkForExistingResults() {
        try {
            chrome.storage.local.get(['analysisResults', 'timestamp'], (result) => {
                if (result.analysisResults && result.timestamp) {
                    // Check if results are recent (within last 5 minutes)
                    const resultTime = new Date(result.timestamp);
                    const now = new Date();
                    const timeDiff = now - resultTime;
                    
                    if (timeDiff < 5 * 60 * 1000) { // 5 minutes
                        this.displayResults(result.analysisResults);
                        this.updateStatus('Analysis complete!', 'success');
                        
                        // Clear the stored results
                        chrome.storage.local.remove(['analysisResults', 'timestamp']);
                    } else {
                        chrome.storage.local.remove(['analysisResults', 'timestamp']);
                    }
                }
            });
        } catch (error) {
            console.error('❌ Error checking for existing results:', error);
        }
    }

    async startFaceSelection() {
        try {
            // Get the current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                this.updateStatus('❌ No active tab found', 'error');
                return;
            }

            // Inject the selection script
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['selection.js']
            });

            // Update UI state
            this.isSelecting = true;
            document.getElementById('startSelectionBtn').disabled = true;
            document.getElementById('stopSelectionBtn').disabled = false;
            this.updateStatus('🎯 Selection active - Click and drag on screen to select a face', 'loading');

            // Set up message listener for this selection session
            this.setupMessageListener(tab.id);

        } catch (error) {
            console.error('❌ Failed to start selection:', error);
            this.updateStatus('❌ Failed to start selection: ' + error.message, 'error');
        }
    }

    setupMessageListener(tabId) {
        // Create message listener
        this.messageListener = (message, sender, sendResponse) => {
            if (message.type === 'CANCEL_SELECTION') {
                this.stopFaceSelection();
            }
        };

        // Add the listener
        chrome.runtime.onMessage.addListener(this.messageListener);
    }

    stopFaceSelection() {
        try {
            // Remove the selection overlay from the current tab
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        func: this.removeSelectionOverlay
                    });
                }
            });

            // Update UI state
            this.isSelecting = false;
            document.getElementById('startSelectionBtn').disabled = false;
            document.getElementById('stopSelectionBtn').disabled = true;
            this.updateStatus('⏹️ Selection stopped', 'warning');

            // Clean up message listener
            if (this.messageListener) {
                chrome.runtime.onMessage.removeListener(this.messageListener);
                this.messageListener = null;
            }

        } catch (error) {
            console.error('❌ Failed to stop selection:', error);
            this.updateStatus('❌ Failed to stop selection: ' + error.message, 'error');
        }
    }

    removeSelectionOverlay() {
        // Remove the selection overlay
        const overlay = document.getElementById('face-selection-overlay');
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
        
        // Remove confirmation container if exists
        const confirmContainer = document.getElementById('confirm-container');
        if (confirmContainer && confirmContainer.parentNode) {
            confirmContainer.parentNode.removeChild(confirmContainer);
        }
    }

    // Handle analysis results from background script
    handleAnalysisResults(results) {
        this.hideAnalysisStatus();
        this.displayResults(results);
        this.updateStatus('Analysis complete!', 'success');
    }

    // Remove old methods that are no longer needed
    // processSelectedFace, getCroppedImage, displaySelectedFace, updateFaceInfo, updateAnalysisButton
    // are now handled by the background script

    async analyzeSelectedFace() {
        if (!this.selectedFaceData) {
            this.updateStatus('❌ No face selected to analyze', 'error');
            return;
        }

        try {
            this.updateStatus('🔍 Analyzing for deepfakes...', 'loading');
            this.showAnalysisStatus('⏳ Analyzing...', 'loading');
            
            // Get the cropped image
            const resultCanvas = document.getElementById('faceCanvas');
            if (!resultCanvas) {
                throw new Error('Result canvas not found');
            }
            
            // Convert to blob (PNG format)
            const blob = await new Promise(resolve => {
                resultCanvas.toBlob(resolve, 'image/png', 1.0);
            });
            
            // Send to deepfake detection API
            await this.sendToDeepfakeAPI(blob);
            
        } catch (error) {
            this.updateStatus('❌ Analysis failed: ' + error.message, 'error');
            this.hideAnalysisStatus();
            console.error('Analysis error:', error);
        }
    }

    async sendToDeepfakeAPI(blob) {
        try {
            // Create FormData for the upload - match the API expected format
            const formData = new FormData();
            formData.append('file', blob, 'face.png'); // API expects 'file' parameter
            
            // API endpoint for deepfake detection - your running detection website
            const apiEndpoint = 'http://127.0.0.1:8080/analyze/';
            
            console.log('🚀 Sending request to deepfake API:', apiEndpoint);
            console.log('📦 Request payload:', { blobSize: blob.size, blobType: blob.type });
            
            // Send POST request to backend
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ API response received:', result);
                this.updateStatus('✅ Analysis complete!', 'success');
                this.displayResults(result);
            } else {
                const errorText = await response.text();
                console.error('❌ API error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
        } catch (error) {
            console.error('❌ API request failed:', error);
            
            // Show user-friendly error messages
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.updateStatus('❌ Network error: Unable to connect to deepfake detection service. Make sure the detection website is running on http://127.0.0.1:8080', 'error');
            } else if (error.message.includes('HTTP 500')) {
                this.updateStatus('❌ Server error: Service temporarily unavailable', 'error');
            } else {
                this.updateStatus(`❌ Analysis failed: ${error.message}`, 'error');
            }
            

        } finally {
            this.hideAnalysisStatus();
        }
    }



    showAnalysisStatus(message, type) {
        const analysisStatus = document.getElementById('analysisStatus');
        if (!analysisStatus) return;
        
        const statusIcon = analysisStatus.querySelector('.status-icon');
        const statusText = analysisStatus.querySelector('.status-text');
        
        if (statusIcon) statusIcon.textContent = message.split(' ')[0];
        if (statusText) statusText.textContent = message.split(' ').slice(1).join(' ');
        
        analysisStatus.classList.remove('hidden');
    }

    hideAnalysisStatus() {
        const analysisStatus = document.getElementById('analysisStatus');
        if (analysisStatus) {
            analysisStatus.classList.add('hidden');
        }
    }

    displayResults(result) {
        const resultsDiv = document.getElementById('results');
        if (!resultsDiv) return;
        
        let resultHTML = `
            <h4>🔍 Deepfake Detection Results:</h4>
            <div class="result-summary">
        `;
        
        // Handle the API response format from your detection website
        if (result.result) {
            const isReal = result.result === 'Real';
            const status = isReal ? '✅ REAL FACE' : '❌ DEEPFAKE DETECTED';
            const color = isReal ? '#27ae60' : '#e74c3c';
            resultHTML += `
                <div class="result-status" style="color: ${color}; font-weight: bold; font-size: 18px; margin: 10px 0;">
                    ${status}
                </div>
            `;
        }
        
        if (result.probability !== undefined) {
            const percentage = Math.round(result.probability * 100);
            let probColor = '';
            let confidenceLevel = '';
            
            if (percentage >= 80) {
                probColor = '#27ae60';
                confidenceLevel = 'High';
            } else if (percentage >= 50) {
                probColor = '#f39c12';
                confidenceLevel = 'Medium';
            } else {
                probColor = '#e74c3c';
                confidenceLevel = 'Low';
            }
            
            resultHTML += `
                <div class="result-probability" style="color: ${probColor};">
                    <strong>Confidence: ${percentage}%</strong> (${confidenceLevel})
                </div>
            `;
        }
        
        if (result.error) {
            resultHTML += `
                <div class="result-error" style="color: #e74c3c; margin: 10px 0;">
                    <strong>Error:</strong> ${result.error}
                </div>
            `;
        }
        
        resultHTML += `
            </div>
        `;
        
        resultsDiv.innerHTML = resultHTML;
        resultsDiv.classList.remove('hidden');
    }

    updateStatus(message, type) {
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.className = `status ${type}`;
        }
    }


}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FaceSelectionDetector();
});