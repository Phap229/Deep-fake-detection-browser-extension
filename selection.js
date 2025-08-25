// Face Selection Overlay Script
// This script is injected into the active tab to create a selection interface

(function() {
    'use strict';
    
    console.log('🎯 Face selection overlay script loaded');
    
    // Create the overlay
    const overlay = document.createElement('div');
    overlay.id = 'face-selection-overlay';
    overlay.style.cssText = `
        position: fixed !important; top: 0 !important; left: 0 !important;
        width: 100vw !important; height: 100vh !important;
        background: rgba(0, 0, 255, 0.3) !important; border: 5px solid red !important;
        z-index: 999999 !important; cursor: crosshair !important; user-select: none !important;
        pointer-events: auto !important; box-sizing: border-box !important;
    `;

    // Create instructions
    const instructions = document.createElement('div');
    instructions.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8); color: white; padding: 15px 25px;
        border-radius: 10px; font-family: Arial, sans-serif; font-size: 16px;
        font-weight: 600; z-index: 1000000; pointer-events: none;
    `;
    instructions.textContent = '🎯 Face Selection Mode - Click and drag to select a face';

    // Create selection rectangle
    const selectionRect = document.createElement('div');
    selectionRect.id = 'selection-rect';
    selectionRect.style.cssText = `
        position: fixed; border: 2px dashed #00ff00; background: rgba(0, 255, 0, 0.1);
        display: none; z-index: 1000001; pointer-events: none;
    `;

    // Create size indicator
    const sizeIndicator = document.createElement('div');
    sizeIndicator.id = 'size-indicator';
    sizeIndicator.style.cssText = `
        position: fixed; background: rgba(0, 0, 0, 0.8); color: white;
        padding: 8px 12px; border-radius: 6px; font-family: Arial, sans-serif;
        font-size: 14px; font-weight: 600; z-index: 1000002; pointer-events: none;
        display: none;
    `;

    // Create confirmation container
    const confirmContainer = document.createElement('div');
    confirmContainer.id = 'confirm-container';
    confirmContainer.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: white; border-radius: 15px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 1000003; text-align: center; font-family: Arial, sans-serif; display: none;
    `;

    // Add confirmation content
    confirmContainer.innerHTML = `
        <h3 style="margin: 0 0 20px 0; color: #333;">🎯 Face Selection Confirmed</h3>
        <p style="margin: 0 0 25px 0; color: #666;">The selected area will be analyzed for deepfakes.</p>
        <div style="display: flex; gap: 15px; justify-content: center;">
            <button id="confirm-btn" style="
                background: #28a745; color: white; border: none; padding: 12px 25px;
                border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;
            ">✅ Confirm & Analyze</button>
            <button id="cancel-btn" style="
                background: #dc3545; color: white; border: none; padding: 12px 25px;
                border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;
            ">❌ Cancel</button>
        </div>
    `;

    // Add elements to page
    document.body.appendChild(overlay);
    document.body.appendChild(instructions);
    document.body.appendChild(selectionRect);
    document.body.appendChild(sizeIndicator);
    document.body.appendChild(confirmContainer);




    
    // Selection variables
    let isSelecting = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    
    // Mouse event handlers
    overlay.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        startX = e.clientX;
        startY = e.clientY;
        currentX = startX;
        currentY = startY;
        isSelecting = true;
        
        selectionRect.style.display = 'block';
        sizeIndicator.style.display = 'block';
        
        // Update selection rectangle
        updateSelectionRect();
        updateSizeIndicator();
    });
    
    overlay.addEventListener('mousemove', (e) => {
        if (!isSelecting) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        currentX = e.clientX;
        currentY = e.clientY;
        
        updateSelectionRect();
        updateSizeIndicator();
    });
    
    overlay.addEventListener('mouseup', (e) => {
        if (!isSelecting) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        isSelecting = false;
        
        // Hide selection elements
        selectionRect.style.display = 'none';
        sizeIndicator.style.display = 'none';
        
        // Calculate final selection
        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        
        // Validate minimum size
        if (width < 50 || height < 50) {
            alert('Selection too small. Please select a larger area (minimum 50x50 pixels).');
            return;
        }
        
        // Show confirmation dialog
        showConfirmation(left, top, width, height);
    });
    
    // Keyboard event handler
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cancelSelection();
        }
    });
    
    // Update selection rectangle
    function updateSelectionRect() {
        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        
        selectionRect.style.left = left + 'px';
        selectionRect.style.top = top + 'px';
        selectionRect.style.width = width + 'px';
        selectionRect.style.height = height + 'px';
    }
    
    // Update size indicator
    function updateSizeIndicator() {
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        
        sizeIndicator.textContent = `${width} × ${height} px`;
        sizeIndicator.style.left = (currentX + 10) + 'px';
        sizeIndicator.style.top = (currentY - 40) + 'px';
    }
    
    // Show confirmation dialog
    function showConfirmation(x, y, width, height) {
        confirmContainer.style.display = 'block';
        
        // Add event listeners to buttons
        const confirmBtn = document.getElementById('confirm-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                confirmSelection(x, y, width, height);
            };
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                cancelSelection();
            };
        }
    }
    
    // Confirm selection
    function confirmSelection(x, y, width, height) {
        // Send selection data to background script
        chrome.runtime.sendMessage({
            type: 'FACE_SELECTED',
            data: {
                x: x,
                y: y,
                width: width,
                height: height,
                timestamp: new Date().toISOString()
            }
        });
        
        // Clean up
        cleanup();
    }
    
    // Cancel selection
    function cancelSelection() {
        chrome.runtime.sendMessage({
            type: 'CANCEL_SELECTION'
        });
        
        cleanup();
    }
    
    // Clean up overlay
    function cleanup() {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
        if (instructions && instructions.parentNode) {
            instructions.parentNode.removeChild(instructions);
        }
        if (selectionRect && selectionRect.parentNode) {
            selectionRect.parentNode.removeChild(selectionRect);
        }
        if (sizeIndicator && sizeIndicator.parentNode) {
            sizeIndicator.parentNode.removeChild(sizeIndicator);
        }
        if (confirmContainer && confirmContainer.parentNode) {
            confirmContainer.parentNode.removeChild(confirmContainer);
        }

    }
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'ANALYSIS_RESULTS') {
            handleAnalysisResults(message.data);
        } else if (message.type === 'PROCESS_SELECTION') {
            // Background script wants us to process the selection
            processSelection(message.data);
        }
        sendResponse({ received: true });
    });
    
    // Process the selection by capturing and cropping the image
    async function processSelection(selectionData) {
        try {
            // Request the background script to capture the tab
            chrome.runtime.sendMessage({
                type: 'CAPTURE_TAB',
                data: selectionData
            }, (response) => {
                if (response && response.dataUrl) {
                    processImageData(response.dataUrl, selectionData);
                }
            });
            
        } catch (error) {
            console.error('❌ Failed to process selection:', error);
        }
    }
    
    // Process the captured image data
    function processImageData(dataUrl, selectionData) {
        try {
            // Create image from data URL
            const img = new Image();
            img.onload = () => {
                const croppedCanvas = cropImage(img, selectionData);
                
                // Convert to blob and then to data URL for transmission
                croppedCanvas.toBlob(async (blob) => {
                    // Convert blob to data URL for transmission
                    const reader = new FileReader();
                    reader.onload = () => {
                        const dataUrl = reader.result;
                        
                        chrome.runtime.sendMessage({
                            type: 'PROCESSED_IMAGE_READY',
                            data: {
                                imageDataUrl: dataUrl,
                                selectionData: selectionData
                            }
                        });
                    };
                    reader.readAsDataURL(blob);
                }, 'image/png', 1.0);
            };
            img.onerror = (error) => {
                console.error('❌ Image failed to load:', error);
            };
            img.src = dataUrl;
            
        } catch (error) {
            console.error('❌ Failed to process image data:', error);
        }
    }
    
    // Crop image function
    function cropImage(img, selectionData) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = selectionData.width;
        canvas.height = selectionData.height;
        
        ctx.drawImage(
            img,
            selectionData.x, selectionData.y, selectionData.width, selectionData.height,
            0, 0, selectionData.width, selectionData.height
        );
        
        return canvas;
    }
    
    // Handle analysis results
    function handleAnalysisResults(results) {
        // Show notification that analysis is complete
        showAnalysisCompleteNotification();
        
        // Results will be displayed in the popup when it reopens
    }
    
    // Show notification that analysis is complete
    function showAnalysisCompleteNotification() {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: 600;
            z-index: 1000005;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.5s ease-out;
        `;
        
        notification.innerHTML = `
            ✅ Analysis Complete!<br>
            <span style="font-size: 12px; opacity: 0.9;">Click the extension icon to see results</span>
        `;
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
    
    console.log('🎯 Face selection overlay loaded successfully');
})();
