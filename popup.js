//  Deepfake Detector Extension
class FaceSelectionDetector {
    constructor() {
        this.isSelecting = false;
        this.selectedFaceData = null;
        this.initializeEventListeners();
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
            this.updateStatus(' Selection active - Click and drag on screen to select a face', 'loading');

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
            if (message.type === 'FACE_SELECTED') {
                this.handleFaceSelection(message.data, tabId);
            } else if (message.type === 'CANCEL_SELECTION') {
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

    async handleFaceSelection(selectionData, tabId) {
        try {
            console.log('🎯 Face selection received:', selectionData);
            this.updateStatus('📷 Processing selected face...', 'loading');

            // Capture the visible tab
            const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
            console.log('📸 Tab captured, processing image...');
            
            // Create image from data URL
            const img = new Image();
            img.onload = () => {
                console.log('🖼️ Image loaded, processing face...');
                this.processSelectedFace(img, selectionData);
            };
            img.onerror = (error) => {
                console.error('❌ Image failed to load:', error);
                this.updateStatus('❌ Failed to load captured image', 'error');
            };
            img.src = dataUrl;

        } catch (error) {
            console.error('❌ Failed to process face selection:', error);
            this.updateStatus('❌ Failed to process selection: ' + error.message, 'error');
        }
    }

    processSelectedFace(img, selectionData) {
        try {
            console.log('🔍 Processing face with selection data:', selectionData);
            
            // Create crop data
            const cropData = {
                x: Math.round(selectionData.x),
                y: Math.round(selectionData.y),
                width: Math.round(selectionData.width),
                height: Math.round(selectionData.height),
                detection_method: 'Manual Screen Selection',
                timestamp: new Date().toISOString()
            };
            
            // Create cropped image
            const croppedCanvas = this.getCroppedImage(img, cropData);
            console.log('✂️ Cropped image created');
            
            // Store the selected face data
            this.selectedFaceData = {
                cropData: cropData,
                canvas: croppedCanvas
            };
            
            // Display the cropped result
            this.displaySelectedFace(croppedCanvas);
            console.log('🖼️ Face displayed');
            
            // Enable analysis button
            this.updateAnalysisButton();
            console.log('🔘 Analysis button enabled');
            
            // Update status
            this.updateStatus('✅ Face selected! You can now analyze it for deepfakes.', 'success');

        } catch (error) {
            console.error('❌ Failed to process face:', error);
            this.updateStatus('❌ Failed to process face: ' + error.message, 'error');
        }
    }

    getCroppedImage(img, cropData) {
        try {
            console.log('✂️ Starting image crop...');
            
            // Create a new canvas for the cropped image
            const croppedCanvas = document.createElement('canvas');
            const croppedCtx = croppedCanvas.getContext('2d');
            
            if (!croppedCtx) {
                throw new Error('Failed to get canvas context');
            }
            
            // Set canvas dimensions
            croppedCanvas.width = cropData.width;
            croppedCanvas.height = cropData.height;
            
            // Validate crop coordinates
            if (cropData.x < 0 || cropData.y < 0 || 
                cropData.x + cropData.width > img.width || 
                cropData.y + cropData.height > img.height) {
                throw new Error('Crop coordinates are outside image boundaries');
            }
            
            // Draw the cropped portion from the original image
            croppedCtx.drawImage(
                img,
                cropData.x, cropData.y, cropData.width, cropData.height, // Source rectangle
                0, 0, cropData.width, cropData.height                    // Destination rectangle
            );
            
            console.log('✅ Image cropped successfully');
            return croppedCanvas;
            
        } catch (error) {
            console.error('❌ Error in getCroppedImage:', error);
            throw error;
        }
    }

    displaySelectedFace(croppedCanvas) {
        try {
            console.log('🎨 Starting to display selected face...');
            
            // Display it in the result canvas
            const resultCanvas = document.getElementById('faceCanvas');
            if (!resultCanvas) {
                console.error('❌ Result canvas not found!');
                return;
            }
            
            const resultCtx = resultCanvas.getContext('2d');
            if (!resultCtx) {
                console.error('❌ Result canvas context not found!');
                return;
            }
            
            // Clear the canvas
            resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
            
            // Calculate scale to fit the result canvas
            const maxSize = 300;
            const scale = Math.min(maxSize / croppedCanvas.width, maxSize / croppedCanvas.height);
            const displayWidth = croppedCanvas.width * scale;
            const displayHeight = croppedCanvas.height * scale;
            
            // Center the image
            const offsetX = (maxSize - displayWidth) / 2;
            const offsetY = (maxSize - displayHeight) / 2;
            
            // Draw the cropped face
            resultCtx.drawImage(
                croppedCanvas,
                offsetX, offsetY, displayWidth, displayHeight
            );
            
            console.log('🎨 Image drawn to canvas');
            
            // Update the information display
            this.updateFaceInfo();
            console.log('📊 Face info updated');
            
            // Show the result section
            const resultSection = document.getElementById('selectedFaceSection');
            if (resultSection) {
                resultSection.classList.remove('hidden');
                console.log('👁️ Result section made visible');
            }
            
        } catch (error) {
            console.error('❌ Error displaying selected face:', error);
        }
    }

    updateFaceInfo() {
        if (!this.selectedFaceData) return;
        
        try {
            const cropData = this.selectedFaceData.cropData;
            
            // Update selection size
            const sizeElement = document.getElementById('selectionSize');
            if (sizeElement) {
                const sizeText = `${Math.round(cropData.width)} × ${Math.round(cropData.height)} px`;
                sizeElement.textContent = sizeText;
            }
            
            // Update selection method
            const methodElement = document.getElementById('selectionMethod');
            if (methodElement) {
                methodElement.textContent = cropData.detection_method;
            }
            
        } catch (error) {
            console.error('❌ Error updating face info:', error);
        }
    }

    updateAnalysisButton() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
        }
    }

    async analyzeSelectedFace() {
        if (!this.selectedFaceData) {
            this.updateStatus('❌ No face selected to analyze', 'error');
            return;
        }

        try {
            this.updateStatus(' Analyzing for deepfakes...', 'loading');
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
            
            console.log(`Cropped image size: ${resultCanvas.width}x${resultCanvas.height}`);
            console.log(`Blob size: ${blob.size} bytes`);
            
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
            console.log('🚀 Sending image to deepfake detection API...');
            
            // Create FormData for the upload
            const formData = new FormData();
            formData.append('image', blob, 'face.png');
            formData.append('detection_method', this.selectedFaceData.cropData.detection_method);
            formData.append('timestamp', new Date().toISOString());
            formData.append('image_size', `${this.selectedFaceData.cropData.width}x${this.selectedFaceData.cropData.height}`);
            
            // API endpoint for deepfake detection (UPDATE THIS WITH YOUR ACTUAL ENDPOINT)
            const apiEndpoint = 'https://your-deepfake-api-endpoint.com/detect';
            
            console.log('📡 Sending POST request to:', apiEndpoint);
            
            // Send POST request to backend
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                body: formData
            });
            
            console.log('📥 Response received:', response.status, response.statusText);
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ API response:', result);
                this.updateStatus('✅ Analysis complete!', 'success');
                this.displayResults(result);
            } else {
                const errorText = await response.text();
                console.error('❌ API error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
            
        } catch (error) {
            console.error('❌ API request failed:', error);
            
            // Show user-friendly error messages
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.updateStatus('❌ Network error: Unable to connect to deepfake detection service', 'error');
            } else if (error.message.includes('HTTP 401')) {
                this.updateStatus('❌ Authentication error: Invalid API key or credentials', 'error');
            } else if (error.message.includes('HTTP 403')) {
                this.updateStatus('❌ Access denied: Insufficient permissions', 'error');
            } else if (error.message.includes('HTTP 500')) {
                this.updateStatus('❌ Server error: Service temporarily unavailable', 'error');
            } else {
                this.updateStatus(`❌ Analysis failed: ${error.message}`, 'error');
            }
            
            // For development/testing, show mock result
            this.showMockResult();
        } finally {
            this.hideAnalysisStatus();
        }
    }

    showMockResult() {
        this.updateStatus('✅ Mock analysis complete!', 'success');
        this.displayResults({
            success: true,
            message: "Mock deepfake detection result",
            confidence: 0.85,
            is_deepfake: false,
            probability: 0.15,
            timestamp: new Date().toISOString(),
            analysis_method: "Mock Deepfake Detection Model"
        });
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
            <h4> Deepfake Detection Results:</h4>
            <div class="result-summary">
        `;
        
        if (result.is_deepfake !== undefined) {
            const status = result.is_deepfake ? '❌ DEEPFAKE DETECTED' : '✅ REAL FACE';
            const color = result.is_deepfake ? '#e74c3c' : '#27ae60';
            resultHTML += `
                <div class="result-status" style="color: ${color}; font-weight: bold; font-size: 18px; margin: 10px 0;">
                    ${status}
                </div>
            `;
        }
        
        if (result.probability !== undefined) {
            const percentage = Math.round(result.probability * 100);
            resultHTML += `
                <div class="result-probability">
                    <strong>Deepfake Probability:</strong> ${percentage}%
                </div>
            `;
        }
        
        resultHTML += `
            </div>
            <div class="result-details">
                <h5>Detailed Results:</h5>
                <pre>${JSON.stringify(result, null, 2)}</pre>
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
