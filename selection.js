// Face Selection Overlay Script
// This script is injected into the active tab to create a selection interface

(function() {
    'use strict';
    
    console.log('🎯 Face selection overlay script loaded');
    
    // Create the selection overlay
    const overlay = document.createElement('div');
    overlay.id = 'face-selection-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.3);
        z-index: 999999;
        cursor: crosshair;
        user-select: none;
        pointer-events: auto;
    `;
    
    // Create instructions
    const instructions = document.createElement('div');
    instructions.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 16px;
        font-weight: 600;
        z-index: 1000000;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;
    instructions.innerHTML = `
        🎯 <strong>Face Selection Mode</strong><br>
        Click and drag to select a face area<br>
        <span style="font-size: 14px; opacity: 0.8;">Press ESC to cancel</span>
    `;
    
    // Create selection rectangle
    const selectionRect = document.createElement('div');
    selectionRect.style.cssText = `
        position: fixed;
        border: 3px solid #ff0000;
        background: rgba(255, 0, 0, 0.1);
        display: none;
        pointer-events: none;
        z-index: 1000001;
        border-radius: 4px;
    `;
    
    // Create size indicator
    const sizeIndicator = document.createElement('div');
    sizeIndicator.style.cssText = `
        position: fixed;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        display: none;
        pointer-events: none;
        z-index: 1000002;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
        font-family: Arial, sans-serif;
    `;
    
    // Create confirmation container
    const confirmContainer = document.createElement('div');
    confirmContainer.id = 'confirm-container';
    confirmContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 25px;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
        z-index: 1000003;
        text-align: center;
        font-family: Arial, sans-serif;
        display: none;
        min-width: 300px;
    `;
    
    confirmContainer.innerHTML = `
        <h3 style="margin: 0 0 20px 0; color: #333;">🎯 Face Selected!</h3>
        <div id="selection-preview" style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <div style="font-size: 14px; color: #666; margin-bottom: 10px;">Selection Size:</div>
            <div id="selection-size" style="font-weight: bold; color: #333; font-size: 18px;"></div>
        </div>
        <div style="display: flex; gap: 15px; justify-content: center;">
            <button id="confirm-selection" style="
                background: #28a745;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
            ">✅ Confirm Selection</button>
            <button id="cancel-selection" style="
                background: #dc3545;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
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
        const sizeElement = document.getElementById('selection-size');
        if (sizeElement) {
            sizeElement.textContent = `${width} × ${height} px`;
        }
        
        confirmContainer.style.display = 'block';
        
        // Add event listeners to buttons
        const confirmBtn = document.getElementById('confirm-selection');
        const cancelBtn = document.getElementById('cancel-selection');
        
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                confirmSelection(x, y, width, height);
            };
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = cancelSelection;
        }
    }
    
    // Confirm selection
    function confirmSelection(x, y, width, height) {
        // Send selection data to popup
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
    
    console.log('🎯 Face selection overlay loaded successfully');
})();
