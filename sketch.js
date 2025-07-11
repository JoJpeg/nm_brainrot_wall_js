// Main Sketch Module
// ==================
// This file coordinates all modules and handles the main p5.js lifecycle

function setup() {
    noCanvas();
    viewportHeight = window.innerHeight;

    let containerP5Element = select('#video-container');
    if (!containerP5Element) {
        console.error("SETUP: #video-container Element nicht im DOM gefunden!");
        alert("Fehler: #video-container nicht gefunden. Bitte HTML überprüfen.");
        return;
    }
    videoContainerElement = containerP5Element.elt;
    console.log("SETUP: videoContainerElement ist gesetzt.");

    updateLayoutDimensions();
    createControlPanel();
    initializeGlobalAudioContext();
    console.log("SETUP: Virtuelles Masonry-Rendering-System initialisiert.");

    window.addEventListener('resize', () => {
        // Temporarily disable audio operations during window resize
        audioDisabled = true;
        
        viewportHeight = window.innerHeight;
        console.log("RESIZE_EVENT: Window resized, calling updateLayoutDimensions()...");
        updateLayoutDimensions();
        if (mediaItems.length > 0) {
            console.log("RESIZE_EVENT: ...und recalculating layout for existing items.");
            recalculateLayout();
        }
        
        // Re-enable audio after a short delay
        setTimeout(() => {
            audioDisabled = false;
            console.log("RESIZE_EVENT: Audio re-enabled after resize.");
        }, 1000);
    });
    
    // Add user interaction handlers to resume AudioContext
    ['click', 'touchstart', 'keydown'].forEach(eventType => {
        document.addEventListener(eventType, resumeAudioContextOnInteraction, { once: true });
    });
    
    // Clean up AudioContext when page unloads
    window.addEventListener('beforeunload', () => {
        if (globalAudioContext) {
            globalAudioContext.close().catch(() => {});
        }
    });
    
    // Make deleteFolder function globally available
    window.deleteFolder = deleteFolder;
    
    console.log("SETUP: p5.js Sketch initialisiert. Bitte Videos auswählen.");
}

// Handle keyboard input
function keyPressed() {
    // Toggle control panel when TAB key is pressed
    if (keyCode === 9) { // TAB key
        // Remove "Press TAB" label on first tab press
        if (!tabPressed) {
            let pressTABLabel = select('p');
            if (pressTABLabel) {
                pressTABLabel.remove();
            }
            tabPressed = true;
        }
        
        controlPanelOpen = !controlPanelOpen;
        
        if (controlPanel) {
            controlPanel.toggleClass('collapsed');
        }

        if(controlPanelOpen && autoScrollEnabled){
            console.log("KEY_PRESSED: Auto-Scroll gestoppt.");
        }
        // Prevent default TAB behavior
        return false;
    }

    // Toggle auto-scroll when Space key is pressed
    if (key === ' ') {
        toggleAutoScroll();
        return false; // Prevent default space behavior (scrolling)
    }
}

function draw() {
    if (autoScrollEnabled && mediaItems.length > 0) {
        // Update column offsets independently
        for (let i = 0; i < columnCount; i++) {
            let effectiveSpeed;
            if (uniformity === 1) {
                // Uniform speed - all columns move at the same speed
                effectiveSpeed = scrollSpeed;
            } else {
                // Blend between individual speeds and uniform speed based on uniformity
                let individualSpeed = scrollSpeed * individualColumnSpeeds[i];
                let uniformSpeed = scrollSpeed;
                effectiveSpeed = individualSpeed * (1 - uniformity) + uniformSpeed * uniformity;
            }
            columnOffsets[i] += effectiveSpeed;
        }
        
        // Move all items based on their column offset
        moveElementsByColumnOffset();
        
        optimizeVideoPlayback();
        moveItemsForEndlessScroll();
        changeAudioVolume('centerY'); // Adjust volume based on item position
    }
}
