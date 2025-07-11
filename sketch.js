// Globale Variablen
let inputButton;
let videoContainerElement;
let controlPanel; // Reference to control panel for keyboard toggle
let controlPanelOpen = false;
let isFirstSelection = true;
let tabPressed = false; // Track if space has been pressed to remove the label
let selectedFolders = []; // Track multiple selected folders

// Einfache Variablen für automatisches Scrolling
let allMediaFiles = [];
let mediaItems = [];
let scrollSpeed = 1;
let viewportHeight;
let scrollOffset = 0;
let autoScrollEnabled = false;
let popInPx = 0; // Pixel, um die Items vor dem Scrollen "hereinpoppen" sollen
let popOutPx = 200; // Pixel, um die Items nach dem Scrollen "herauspoppen" sollen

// Masonry-Layout Variablen
let columnCount = 6;
let columnWidth = 100;
let columnHeights = [];
let gutterSize = 10;
let totalContentHeight = 0;
let renderBuffer = 0; // Items further than this above viewport top are candidates for moving

// Column movement offsets for independent scrolling
let columnOffsets = [];
let columnSpeeds = []; // Different speed for each column
let individualColumnSpeeds = []; // User-controlled speed for each column
let uniformity = 0; // 0 = full individual speeds, 1 = uniform movement

let lastLogFrame = 0;
const logInterval = 60; // Log draw info approx every second

// Global Audio Management
let globalAudioContext = null;
let audioContextState = 'none'; // 'none', 'initializing', 'ready', 'error', 'suspended'
let audioInitializationPromise = null;

// Circuit breaker pattern for audio errors
let audioErrorCount = 0;
let lastAudioError = 0;
let audioDisabled = false;
const MAX_AUDIO_ERRORS = 3;
const ERROR_RESET_TIME = 10000; // 10 seconds
const AUDIO_THROTTLE_TIME = 100; // Only update audio every 100ms
let lastAudioUpdate = 0;

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

function createControlPanel() {
    controlPanel = createDiv('');
    controlPanel.addClass('control-panel collapsed');
    
    // Initialize individual column speeds if not set
    if (individualColumnSpeeds.length === 0) {
        individualColumnSpeeds = new Array(columnCount).fill(0).map(() => 0.5 + Math.random() * 1.0); // Random between 0.5 and 1.5
    }
    
    // let toggleBtn = createDiv('⚙️').addClass('control-toggle').parent(controlPanel);
    // toggleBtn.mousePressed(() => controlPanel.toggleClass('collapsed'));
    createElement('h3', 'Brainrot Wall Controls').parent(controlPanel);
    let fileGroup = createDiv('').addClass('control-group').parent(controlPanel);
    createElement('label', 'Medien-Ordner auswählen:').parent(fileGroup);
    
    // Primary folder selection button
    inputButton = createFileInput(handleFileProcessing, 'true').parent(fileGroup);
    inputButton.elt.setAttribute('webkitdirectory', true);
    inputButton.elt.setAttribute('directory', true);
    
    // Add more folders button (initially hidden)
    let addMoreButton = createButton('📁 Weiteren Ordner hinzufügen').parent(fileGroup).id('add-more-button');
    addMoreButton.style('display', 'none');
    addMoreButton.style('margin-top', '5px');
    addMoreButton.mousePressed(showAdditionalFolderSelector);
    
    // Status display
    let folderStatus = createDiv('Kein Ordner ausgewählt').addClass('folder-status').parent(fileGroup).id('folder-status');
    folderStatus.style('font-size', '12px');
    folderStatus.style('color', '#999');
    folderStatus.style('margin-top', '5px');
    let scrollGroup = createDiv('').addClass('control-group').parent(controlPanel);
    createElement('label', 'Auto-Scroll:').parent(scrollGroup);
    let scrollButton = createButton('▶️ Starten').parent(scrollGroup).id('scroll-button');
    scrollButton.mousePressed(toggleAutoScroll);
    let speedGroup = createDiv('').addClass('control-group').parent(controlPanel);
    createElement('label', 'Geschwindigkeit:').parent(speedGroup);
    let speedSlider = createSlider(0.5, 5, scrollSpeed, 0.1).parent(speedGroup);
    speedSlider.input(() => { scrollSpeed = speedSlider.value(); updateSpeedDisplay(); });
    createDiv(`${scrollSpeed.toFixed(1)}x`).addClass('speed-display').parent(speedGroup).id('speed-display');
    
    
    // Column count control
    let columnCountGroup = createDiv('').addClass('control-group').parent(controlPanel);
    createElement('label', 'Number of Columns:').parent(columnCountGroup);
    let columnCountSlider = createSlider(2, 10, columnCount, 1).parent(columnCountGroup);
    columnCountSlider.input(() => { 
        let newColumnCount = columnCountSlider.value();
        if (newColumnCount !== columnCount) {
            changeColumnCount(newColumnCount);
            updateColumnCountDisplay();
        }
    });
    createDiv(`${columnCount} columns`).addClass('column-count-display').parent(columnCountGroup).id('column-count-display');
    // Uniformity control
    let uniformityGroup = createDiv('').addClass('control-group').parent(controlPanel);
    createElement('label', 'Uniformity:').parent(uniformityGroup);
    let uniformitySlider = createSlider(0, 1.0, uniformity, 0.1).parent(uniformityGroup);
    uniformitySlider.input(() => { uniformity = uniformitySlider.value(); updateUniformityDisplay(); });
    createDiv(`${uniformity.toFixed(1)}`).addClass('uniformity-display').parent(uniformityGroup).id('uniformity-display');
    
    // Individual column speed controls
    let columnSpeedGroup = createDiv('').addClass('control-group').parent(controlPanel);
    createElement('label', 'Individual Column Speeds:').parent(columnSpeedGroup);
    createColumnSpeedControls(columnSpeedGroup);
   
    //pop in and pop out settings
    let popSettingsGroup = createDiv('').addClass('control-group').parent(controlPanel);
    createElement('label', 'Pop-In/Out Einstellungen:').parent(popSettingsGroup);
    let popOutSlider = createSlider(-500, 500, popOutPx,
        10).parent(popSettingsGroup);
    popOutSlider.input(() => {
        popOutPx = popOutSlider.value();
        updatePopLabels(); // Update the display label immediately
    });
    createDiv(`Pop-Out: ${popOutPx}px`).addClass('pop-out-display').parent(popSettingsGroup).id('pop-out-display'); 
    let popInSlider = createSlider(-500, 500, popInPx,
        10).parent(popSettingsGroup);
    popInSlider.input(() => {
        popInPx = popInSlider.value();
        updatePopLabels(); // Update the display label immediately
    });
    createDiv(`Pop-In: ${popInPx}px`).addClass('pop-in-display').parent(popSettingsGroup).id('pop-in-display');

    let clearGroup = createDiv('').addClass('control-group').parent(controlPanel);
    createButton('🗑️ Alle löschen').addClass('danger').parent(clearGroup).mousePressed(clearAllVideos);

}
function updatePopLabels(){
        //update pop-in and pop-out labels
        let popInDisplay = select('#pop-in-display');
        if (popInDisplay) popInDisplay.html(`Pop-In: ${popInPx}px`);
        let popOutDisplay = select('#pop-out-display');
        if (popOutDisplay) popOutDisplay.html(`Pop-Out: ${popOutPx}px`);
}
function updateSpeedDisplay() {
    let display = select('#speed-display');
    if (display) display.html(`${scrollSpeed.toFixed(1)}x`);
}

function updateUniformityDisplay() {
    let display = select('#uniformity-display');
    if (display) display.html(`${uniformity.toFixed(1)}`);
}

function updateColumnSpeedDisplay(columnIndex) {
    let display = select(`#col-speed-${columnIndex}`);
    if (display) display.html(`${individualColumnSpeeds[columnIndex].toFixed(1)}x`);
}

function updateColumnCountDisplay() {
    let display = select('#column-count-display');
    if (display) display.html(`${columnCount} columns`);
}

function createColumnSpeedControls(parentGroup) {
    // Remove existing column speed rows
    let existingRows = selectAll('.column-speed-row');
    existingRows.forEach(row => row.remove());
    
    // Create new controls for current column count
    for (let i = 0; i < columnCount; i++) {
        // Ensure we have a speed value for this column
        if (!individualColumnSpeeds[i]) {
            individualColumnSpeeds[i] = 0.5 + Math.random() * 1.0; // Random between 0.5 and 1.5
        }
        
        let colGroup = createDiv('').addClass('column-speed-row').parent(parentGroup);
        createElement('span', `Col ${i + 1}:`).addClass('column-label').parent(colGroup);
        let colSlider = createSlider(0.1, 2.0, individualColumnSpeeds[i], 0.1).parent(colGroup);
        colSlider.input(() => { 
            individualColumnSpeeds[i] = colSlider.value(); 
            updateColumnSpeedDisplay(i); 
        });
        createDiv(`${individualColumnSpeeds[i].toFixed(1)}x`).addClass('column-speed-display').parent(colGroup).id(`col-speed-${i}`);
    }
}

function changeColumnCount(newColumnCount) {
    if (newColumnCount === columnCount) return;
    
    console.log(`COLUMN_COUNT_CHANGE: Changing from ${columnCount} to ${newColumnCount} columns`);
    
    // Pause auto-scroll during the transition
    let wasAutoScrolling = autoScrollEnabled;
    if (autoScrollEnabled) {
        autoScrollEnabled = false;
        toggleAutoScroll();
    }
    
    // Update column count
    columnCount = newColumnCount;
    
    // Adjust individual column speeds array
    if (individualColumnSpeeds.length > columnCount) {
        // Remove excess speeds
        individualColumnSpeeds = individualColumnSpeeds.slice(0, columnCount);
    } else if (individualColumnSpeeds.length < columnCount) {
        // Add new speeds with random values
        while (individualColumnSpeeds.length < columnCount) {
            individualColumnSpeeds.push(0.5 + Math.random() * 1.0); // Random between 0.5 and 1.5
        }
    }
    
    // Recalculate layout dimensions and rebuild everything
    updateLayoutDimensions();
    
    // Find the column speed group and recreate controls
    let allLabels = selectAll('label');
    let columnSpeedGroup = null;
    for (let i = 0; i < allLabels.length; i++) {
        if (allLabels[i].html() === 'Individual Column Speeds:') {
            columnSpeedGroup = allLabels[i].parent();
            break;
        }
    }
    
    if (columnSpeedGroup) {
        createColumnSpeedControls(columnSpeedGroup);
    }
    
    // Rebuild the layout with existing media
    if (mediaItems.length > 0) {
        recalculateLayout();
    }
    
    // Resume auto-scroll if it was running
    if (wasAutoScrolling) {
        autoScrollEnabled = true;
        toggleAutoScroll();
    }
    
    console.log(`COLUMN_COUNT_CHANGE: Successfully changed to ${columnCount} columns`);
}

function updateLayoutDimensions() {
    let containerWrapperWidth = window.innerWidth * 0.95;
    if (videoContainerElement && videoContainerElement.parentElement) {
        let parentWidth = videoContainerElement.parentElement.offsetWidth;
        if (parentWidth > 0) containerWrapperWidth = parentWidth;
        else console.warn("LAYOUT_DIMS: videoContainerElement.parentElement.offsetWidth is 0.");
    } else console.warn("LAYOUT_DIMS: videoContainerElement or parent not found for width.");

    if (columnCount > 0) {
        let widthForItemsOnly = containerWrapperWidth - (gutterSize * (columnCount - 1));
        columnWidth = widthForItemsOnly / columnCount;
    } else columnWidth = containerWrapperWidth;

    if (columnWidth <= 0) {
        console.warn(`LAYOUT_DIMS: Calculated columnWidth is ${columnWidth.toFixed(2)}. Defaulting to 100px.`);
        columnWidth = 100;
    }
    columnHeights = new Array(columnCount).fill(0);
    
    // Initialize column offsets and speeds
    columnOffsets = new Array(columnCount).fill(0);
    
    // Initialize individual column speeds if not already set - preserve existing random values
    if (individualColumnSpeeds.length === 0) {
        individualColumnSpeeds = new Array(columnCount).fill(0).map(() => 0.5 + Math.random() * 1.0);
    } else if (individualColumnSpeeds.length !== columnCount) {
        // Only adjust if column count changed, preserve existing values
        if (individualColumnSpeeds.length > columnCount) {
            individualColumnSpeeds = individualColumnSpeeds.slice(0, columnCount);
        } else {
            while (individualColumnSpeeds.length < columnCount) {
                individualColumnSpeeds.push(0.5 + Math.random() * 1.0);
            }
        }
    }
    
    // Set columnSpeeds based on individual speeds (will be modified by speedBoost in draw())
    columnSpeeds = [...individualColumnSpeeds];
    
    console.log(`LAYOUT_DIMS: containerWrapperWidth=${containerWrapperWidth.toFixed(0)}, columnWidth=${columnWidth.toFixed(0)}, columnHeights initialized.`);
}

function toggleAutoScroll() {
    autoScrollEnabled = !autoScrollEnabled;
    if(!autoScrollEnabled){
        // Force immediate audio muting when stopping, bypass throttling
        muteAllAudioImmediately();
    }
    let button = select('#scroll-button');
    if (button) {
        if (autoScrollEnabled) {
            button.html('⏸️ Stoppen');
            console.log("AUTOSCROLL: Aktiviert. Speed:", scrollSpeed);
        } else {
            button.html('▶️ Starten');
            console.log("AUTOSCROLL: Deaktiviert.");
        }
    }
}

function clearAllVideos() {
    console.log("CLEAR_ALL: Start...");
    if (autoScrollEnabled) {
      autoScrollEnabled = false;
      toggleAutoScroll();
    }
    
    // Clean up audio resources before removing items
    mediaItems.forEach(item => {
        cleanupItemAudio(item);
        if (item.domElement) item.domElement.remove();
        if (item.objectURL) URL.revokeObjectURL(item.objectURL);
    });
    
    allMediaFiles = []; mediaItems = [];
    selectedFolders = []; // Reset folder tracking
    scrollOffset = 0; totalContentHeight = 0;
    columnHeights = new Array(columnCount).fill(0);
    columnOffsets = new Array(columnCount).fill(0); // Reset column offsets
    // Keep individual column speeds as they are user preferences
    if (videoContainerElement) videoContainerElement.style.height = '0px';
    isFirstSelection = true;
    updateFolderStatus(); // Update folder status display
    console.log("CLEAR_ALL: Abgeschlossen.");
}

function handleFileProcessing(selectedFileOrArray) {
    console.log("FILE_PROCESSING: Start. isFirstSelection:", isFirstSelection);
    if (isFirstSelection) {
        clearAllVideos();
        isFirstSelection = false;
    } else if (columnHeights.length !== columnCount || !columnHeights.every(h => typeof h === 'number')) {
        console.warn("FILE_PROCESSING: columnHeights ungültig. Rufe updateLayoutDimensions auf.");
        updateLayoutDimensions();
    }

    let filesReceived = [];
    if (Array.isArray(selectedFileOrArray)) {
        selectedFileOrArray.forEach(p5File => {
            if (isMediaFile(p5File.file)) filesReceived.push(p5File.file);
        });
    } else if (selectedFileOrArray && selectedFileOrArray.file) {
        if (isMediaFile(selectedFileOrArray.file)) filesReceived.push(selectedFileOrArray.file);
    }

    if (filesReceived.length > 0) {
        // Extract folder name from the first file for display
        let folderPath = filesReceived[0].webkitRelativePath || filesReceived[0].name;
        let folderName = folderPath.split('/')[0] || 'Unknown Folder';
        selectedFolders.push(folderName);
        
        let newUniqueFiles = filesReceived.filter(f_new =>
            !allMediaFiles.some(f_existing => f_existing.name === f_new.name && f_existing.size === f_new.size)
        );

        if (newUniqueFiles.length > 0) {
            allMediaFiles.push(...newUniqueFiles);
            console.log(`FILE_PROCESSING: Erstelle ${newUniqueFiles.length} neue Media-Items.`);
            newUniqueFiles.forEach(file => createMediaItem(file));
            updateContainerHeight(); // Single call after all new items are processed and their estimated heights added
            updateFolderStatus(); // Update the folder display
            console.log(`FILE_PROCESSING: ${newUniqueFiles.length} Items hinzugefügt. Initiale totalContentHeight=${totalContentHeight.toFixed(0)}`);
        } else {
            console.log("FILE_PROCESSING: Keine neuen einzigartigen Dateien.");
            updateFolderStatus(); // Still update status even if no new files
        }
    }
}

function isMediaFile(nativeFileObject) {
    if (!nativeFileObject || !nativeFileObject.name) return false;
    let fileName = nativeFileObject.name.toLowerCase();
    if (nativeFileObject.type) {
        if (nativeFileObject.type.startsWith('image/')) return true;
        if (nativeFileObject.type.startsWith('video/')) return true;
    }
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    if (imageExtensions.some(ext => fileName.endsWith(ext))) return true;
    if (videoExtensions.some(ext => fileName.endsWith(ext))) return true;
    return false;
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

function moveElementsByColumnOffset() {
    mediaItems.forEach(item => {
        if (item.domElement && item.column < columnOffsets.length) {
            // Calculate the visual Y position (original Y minus column offset)
            const visualY = item.y - columnOffsets[item.column];
            item.domElement.style.top = visualY + 'px';
        }
    });
}

function createMediaItem(nativeFileObject) {
    if (columnWidth <= 0) {
        console.error(`CREATE_ITEM: columnWidth (${columnWidth.toFixed(2)}) ungültig für ${nativeFileObject.name}.`);
        return;
    }
    
    let shortestColumnIdx = 0;
    let currentShortestHeight = columnHeights[0];
    for (let i = 1; i < columnCount; i++) {
        if (columnHeights[i] < currentShortestHeight) {
            currentShortestHeight = columnHeights[i];
            shortestColumnIdx = i;
        }
    }
    let x = shortestColumnIdx * (columnWidth + gutterSize);
    let y = currentShortestHeight;

    let gridItemDiv = createDiv('').addClass('grid-item')
        .style('position', 'absolute')
        .style('left', x + 'px').style('top', y + 'px').style('width', columnWidth + 'px');
    let estimatedHeight = columnWidth * (9 / 16);

    const mediaItem = {
        file: nativeFileObject, x: x, y: y, column: shortestColumnIdx,
        height: estimatedHeight, domElement: gridItemDiv.elt,
        mediaElement: null, isVideo: false, id: `item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        objectURL: null
    };

    let p5MediaElement;
    let objectURL = null;
    try {
        objectURL = URL.createObjectURL(nativeFileObject);
        mediaItem.objectURL = objectURL;
        if (!objectURL) { gridItemDiv.remove(); return; }

        if (nativeFileObject.type.startsWith('video/')) {
            mediaItem.isVideo = true;
            p5MediaElement = createVideo(objectURL);
            if (!p5MediaElement || !p5MediaElement.elt) { gridItemDiv.remove(); URL.revokeObjectURL(objectURL); return; }
            p5MediaElement.parent(gridItemDiv).addClass('video-element-class')
                .attribute('autoplay', true).attribute('loop', true)
                .attribute('muted', true).attribute('playsinline', true).volume(0);
            mediaItem.mediaElement = p5MediaElement.elt;
            mediaItem.mediaElement.onloadedmetadata = () => {
                let actualHeight = mediaItem.mediaElement.offsetHeight;
                if (actualHeight > 0 && Math.abs(mediaItem.height - actualHeight) > 1) {
                    updateItemHeight(mediaItem, actualHeight);
                }
            };
            mediaItem.mediaElement.onerror = (e) => {
                console.error(`CREATE_ITEM: Video-Ladefehler für ${nativeFileObject.name}`, e);
                // Clean up audio resources on video error
                cleanupItemAudio(mediaItem);
            };
        } else if (nativeFileObject.type.startsWith('image/')) {
            p5MediaElement = createImg(objectURL, `Image: ${nativeFileObject.name}`);
            if (!p5MediaElement || !p5MediaElement.elt) { gridItemDiv.remove(); URL.revokeObjectURL(objectURL); return; }
            p5MediaElement.parent(gridItemDiv).addClass('image-element-class');
            mediaItem.mediaElement = p5MediaElement.elt;
            mediaItem.mediaElement.onload = () => {
                let actualHeight = mediaItem.mediaElement.offsetHeight;
                if (actualHeight > 0 && Math.abs(mediaItem.height - actualHeight) > 1) {
                    updateItemHeight(mediaItem, actualHeight);
                }
                URL.revokeObjectURL(objectURL); mediaItem.objectURL = null;
            };
            mediaItem.mediaElement.onerror = (e) => { console.error(`CREATE_ITEM: Bild-Ladefehler für ${nativeFileObject.name}`, e); URL.revokeObjectURL(objectURL); mediaItem.objectURL = null; }
        } else { gridItemDiv.remove(); URL.revokeObjectURL(objectURL); return; }
    } catch (e) { gridItemDiv.remove(); if (objectURL) URL.revokeObjectURL(objectURL); return; }

    mediaItems.push(mediaItem);
    columnHeights[shortestColumnIdx] = y + mediaItem.height + gutterSize; // Update with estimated height
    videoContainerElement.appendChild(gridItemDiv.elt);
    
    // Ensure initial visual position is correct
    if (columnOffsets && columnOffsets[shortestColumnIdx] !== undefined) {
        const visualY = y - columnOffsets[shortestColumnIdx];
        gridItemDiv.elt.style.top = visualY + 'px';
    }
}

function applyAudioPanning(item) {
    // Circuit breaker: if audio is disabled due to errors, don't attempt audio operations
    if (audioDisabled) return;
    
    // Check if we've hit the error limit recently
    if (audioErrorCount >= MAX_AUDIO_ERRORS && Date.now() - lastAudioError < ERROR_RESET_TIME) {
        if (!audioDisabled) {
            console.warn('Audio disabled due to repeated errors. Will retry in 10 seconds.');
            audioDisabled = true;
            setTimeout(() => {
                audioDisabled = false;
                audioErrorCount = 0;
                console.log('Audio re-enabled after cooldown period.');
            }, ERROR_RESET_TIME);
        }
        return;
    }
    
    if (!ensureAudioContextReady()) return;
    
    try {
        // Only create audio nodes if they don't exist AND the AudioContext is ready
        if (!item.audioSource && item.mediaElement && globalAudioContext && globalAudioContext.state === 'running') {
            // Check if the media element is already connected to avoid "already connected" errors
            if (item.mediaElement.audioTracks && item.mediaElement.audioTracks.length > 0) {
                // Element has audio tracks, safe to create audio source
                item.audioSource = globalAudioContext.createMediaElementSource(item.mediaElement);
            } else {
                // No audio tracks, skip audio processing for this element
                return;
            }
            item.stereoPanner = globalAudioContext.createStereoPanner();
            item.gainNode = globalAudioContext.createGain();
            
            // Connect the audio graph
            item.audioSource.connect(item.stereoPanner);
            item.stereoPanner.connect(item.gainNode);
            item.gainNode.connect(globalAudioContext.destination);
        }
        
        if (!item.stereoPanner || !globalAudioContext || globalAudioContext.state !== 'running') return;
        
        // Calculate pan value based on horizontal position
        let itemCenterX = item.x + (item.mediaElement.offsetWidth / 2);
        let viewportCenterX = window.innerWidth / 2;
        let pan = (itemCenterX - viewportCenterX) / (window.innerWidth / 2);
        pan = Math.max(-1, Math.min(1, pan)); // Clamp pan between -1 and 1
        
        // Apply the panning
        item.stereoPanner.pan.value = pan;
        
    } catch (error) {
        audioErrorCount++;
        lastAudioError = Date.now();
        console.warn(`Audio panning failed (error ${audioErrorCount}/${MAX_AUDIO_ERRORS}):`, error);
        
        // Clean up this item's audio to prevent further errors
        cleanupItemAudio(item);
        
        // If we've hit the error limit, disable audio temporarily
        if (audioErrorCount >= MAX_AUDIO_ERRORS) {
            audioDisabled = true;
            console.error('Too many audio errors. Disabling audio temporarily.');
            setTimeout(() => {
                audioDisabled = false;
                audioErrorCount = 0;
                console.log('Audio re-enabled after cooldown period.');
            }, ERROR_RESET_TIME);
        }
    }
}

// Global Audio Context Management
function initializeGlobalAudioContext() {
    if (audioContextState === 'initializing' && audioInitializationPromise) {
        return audioInitializationPromise;
    }
    
    // If audio is disabled due to errors, don't attempt initialization
    if (audioDisabled) {
        return Promise.reject(new Error('Audio disabled due to repeated errors'));
    }
    
    audioContextState = 'initializing';
    
    audioInitializationPromise = new Promise((resolve, reject) => {
        try {
            // Check if AudioContext is supported
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                console.warn('AudioContext not supported in this browser');
                audioContextState = 'error';
                reject(new Error('AudioContext not supported'));
                return;
            }
            
            if (globalAudioContext) {
                globalAudioContext.close().catch(() => {});
            }
            
            globalAudioContext = new AudioContextClass({
                sampleRate: 44100,
                latencyHint: 'interactive'
            });
            
            globalAudioContext.addEventListener('statechange', () => {
                console.log('AudioContext state changed to:', globalAudioContext.state);
                if (globalAudioContext.state === 'running') {
                    audioContextState = 'ready';
                } else if (globalAudioContext.state === 'suspended') {
                    audioContextState = 'suspended';
                } else if (globalAudioContext.state === 'closed') {
                    audioContextState = 'error';
                }
            });
            
            // Handle AudioContext errors with better error recovery
            const handleAudioContextError = (error) => {
                console.error('AudioContext error:', error);
                audioContextState = 'error';
                audioErrorCount++;
                lastAudioError = Date.now();
                
                // Prevent infinite recovery loops
                if (audioErrorCount >= MAX_AUDIO_ERRORS) {
                    audioDisabled = true;
                    console.error('Too many AudioContext errors. Disabling audio.');
                    setTimeout(() => {
                        audioDisabled = false;
                        audioErrorCount = 0;
                        console.log('Audio re-enabled after cooldown period.');
                    }, ERROR_RESET_TIME);
                    return;
                }
                
                // Only attempt recovery after a reasonable delay and if not too many errors
                if (Date.now() - lastAudioError > 5000) {
                    setTimeout(() => {
                        if (audioContextState === 'error' && !audioDisabled) {
                            console.log('Attempting AudioContext recovery...');
                            initializeGlobalAudioContext();
                        }
                    }, 5000);
                }
            };
            
            globalAudioContext.addEventListener('error', handleAudioContextError);
            
            // Additional error handling for older browsers
            if (globalAudioContext.onstatechange === undefined) {
                globalAudioContext.onstatechange = () => {
                    if (globalAudioContext.state === 'running') {
                        audioContextState = 'ready';
                    } else if (globalAudioContext.state === 'suspended') {
                        audioContextState = 'suspended';
                    }
                };
            }
            
            if (globalAudioContext.state === 'suspended') {
                // Try to resume AudioContext (required for user interaction)
                globalAudioContext.resume().then(() => {
                    audioContextState = 'ready';
                    console.log('AudioContext resumed successfully');
                    resolve(globalAudioContext);
                }).catch((error) => {
                    console.warn('Failed to resume AudioContext:', error);
                    audioContextState = 'suspended';
                    resolve(globalAudioContext); // Still resolve, might work later
                });
            } else {
                audioContextState = 'ready';
                resolve(globalAudioContext);
            }
            
        } catch (error) {
            console.error('Failed to create AudioContext:', error);
            audioContextState = 'error';
            audioErrorCount++;
            lastAudioError = Date.now();
            reject(error);
        }
    });
    
    return audioInitializationPromise;
}

function ensureAudioContextReady() {
    // Circuit breaker: if audio is disabled, don't attempt any operations
    if (audioDisabled) return false;
    
    if (!globalAudioContext || audioContextState === 'error') {
        // Only attempt reinitializition if we haven't exceeded error limits
        if (audioErrorCount < MAX_AUDIO_ERRORS) {
            console.log('AudioContext not ready or in error state, reinitializing...');
            initializeGlobalAudioContext().catch(() => {
                // Silently handle initialization failures to prevent spam
            });
        }
        return false;
    }
    
    if (globalAudioContext.state === 'suspended' && audioContextState !== 'suspended') {
        globalAudioContext.resume().catch((error) => {
            console.warn('Failed to resume AudioContext:', error);
            audioErrorCount++;
            lastAudioError = Date.now();
        });
    }
    
    return audioContextState === 'ready' || globalAudioContext.state === 'running';
}

function handleAudioError(error) {
    console.error('Audio error encountered:', error);
    audioContextState = 'error';
    audioErrorCount++;
    lastAudioError = Date.now();
    
    // Clean up all existing audio connections
    mediaItems.forEach(item => {
        cleanupItemAudio(item);
    });
    
    // If we've hit the error limit, disable audio completely
    if (audioErrorCount >= MAX_AUDIO_ERRORS) {
        audioDisabled = true;
        console.error('Maximum audio errors reached. Audio disabled for safety.');
        setTimeout(() => {
            audioDisabled = false;
            audioErrorCount = 0;
            console.log('Audio re-enabled after cooldown period.');
        }, ERROR_RESET_TIME);
        return;
    }
    
    // Only attempt recovery if we haven't been trying too recently
    if (Date.now() - lastAudioError > 2000) {
        setTimeout(() => {
            console.log('Attempting to recover AudioContext...');
            initializeGlobalAudioContext().then(() => {
                console.log('AudioContext recovery successful');
            }).catch((recoveryError) => {
                console.error('AudioContext recovery failed:', recoveryError);
                audioErrorCount++;
            });
        }, 2000);
    }
}

function cleanupItemAudio(item) {
    try {
        if (item.audioSource) {
            item.audioSource.disconnect();
            item.audioSource = null;
        }
        if (item.stereoPanner) {
            item.stereoPanner.disconnect();
            item.stereoPanner = null;
        }
        if (item.gainNode) {
            item.gainNode.disconnect();
            item.gainNode = null;
        }
    } catch (error) {
        console.warn('Error cleaning up audio for item:', error);
    }
}

function reconnectAudioForVisibleItems() {
    if (!ensureAudioContextReady()) return;
    
    mediaItems.forEach(item => {
        if (item.isVideo && item.mediaElement) {
            // Calculate visual position considering column offset
            const visualY = item.y - (columnOffsets[item.column] || 0);
            const itemTop = visualY;
            const itemBottom = visualY + item.height;
            
            // Check if item is visible in viewport
            const visibleTop = -renderBuffer;
            const visibleBottom = viewportHeight + renderBuffer;
            const isVisible = itemBottom >= visibleTop && itemTop <= visibleBottom;
            
            if (isVisible && item.mediaElement.volume > 0) {
                // Reconnect audio for visible items with volume
                applyAudioPanning(item);
            }
        }
    });
}

// Add user interaction handler to resume AudioContext
function resumeAudioContextOnInteraction() {
    if (globalAudioContext && globalAudioContext.state === 'suspended') {
        globalAudioContext.resume().then(() => {
            console.log('AudioContext resumed on user interaction');
            audioContextState = 'ready';
            
            // Re-add the event listener in case AudioContext gets suspended again
            setTimeout(() => {
                ['click', 'touchstart', 'keydown'].forEach(eventType => {
                    document.addEventListener(eventType, resumeAudioContextOnInteraction, { once: true });
                });
            }, 100);
        }).catch((error) => {
            console.warn('Failed to resume AudioContext on interaction:', error);
            audioContextState = 'error';
            // Try to reinitialize on error
            initializeGlobalAudioContext();
        });
    } else if (!globalAudioContext || audioContextState === 'error') {
        // Initialize AudioContext if it doesn't exist or is in error state
        initializeGlobalAudioContext().then(() => {
            console.log('AudioContext initialized on user interaction');
        }).catch((error) => {
            console.error('Failed to initialize AudioContext on interaction:', error);
        });
    }
}

function updateItemHeight(mediaItem, newHeight) {
    if (!mediaItem || newHeight <= 0 || !mediaItem.domElement) return;
    let oldItemHeight = mediaItem.height;
    let heightDifference = newHeight - oldItemHeight;
    if (Math.abs(heightDifference) < 1) return;

    mediaItem.height = newHeight;
    columnHeights[mediaItem.column] += heightDifference;
    columnHeights[mediaItem.column] = Math.max(0, columnHeights[mediaItem.column]);

    mediaItems.forEach(otherItem => {
        if (otherItem.id !== mediaItem.id && otherItem.column === mediaItem.column && otherItem.y > mediaItem.y && otherItem.domElement) {
            otherItem.y += heightDifference;
            otherItem.domElement.style.top = otherItem.y + 'px';
        }
    });
    updateContainerHeight(); // Crucial: update total height whenever an item's real height is known
}

function updateContainerHeight() {
    columnHeights = columnHeights.map(h => Math.max(0, h || 0)); // Ensure no NaN or negative
    totalContentHeight = Math.max(0, ...columnHeights);
    if (videoContainerElement) {
        videoContainerElement.style.height = totalContentHeight + 'px';
    }
}

function muteAllAudioImmediately() {
    // Force immediate muting without throttling - used when stopping auto-scroll
    if (!mediaItems || mediaItems.length === 0) return;
    
    console.log("MUTE_ALL: Immediately muting all audio");
    
    mediaItems.forEach(item => {
        if (item.mediaElement && item.isVideo) {
            // Set volume to 0 immediately
            item.mediaElement.volume = 0.0;
            
            // Also set gain node volume if it exists
            if (item.gainNode) {
                try {
                    item.gainNode.gain.value = 0.0;
                } catch (error) {
                    // Silently handle if gain node is disconnected
                }
            }
            
            // Clean up audio nodes when muting
            cleanupItemAudio(item);
        }
    });
}

function changeAudioVolume(style) {
    // style: 'centerY', 'onlyOne', 'muteAll'
    if (!mediaItems || mediaItems.length === 0) return;
    
    // Throttle audio updates to prevent excessive calls
    const now = Date.now();
    if (now - lastAudioUpdate < AUDIO_THROTTLE_TIME) return;
    lastAudioUpdate = now;
    
    // Circuit breaker: if audio is disabled, just mute everything
    if (audioDisabled) {
        mediaItems.forEach(item => {
            if (item.mediaElement && item.isVideo) {
                item.mediaElement.volume = 0.0;
            }
        });
        return;
    }
    
    mediaItems.forEach(item => {    
        if (item.mediaElement && item.isVideo) {
            
            if (style === 'centerY') {
                // Calculate visual position considering column offset
                const visualY = item.y - (columnOffsets[item.column] || 0);
                const itemCenterY = visualY + (item.height / 2);
                const viewportCenterY = viewportHeight / 2;
                const distanceFromCenter = Math.abs(itemCenterY - viewportCenterY);
                const distanceNormalized = distanceFromCenter / (viewportHeight / 2); // Normalize to [0, 1]
                let vol = 1 - distanceNormalized; // Closer to center = louder
                if(vol < 0) vol = 0; // Clamp volume to [0, 1]
                if (vol > 1) vol = 1; // Clamp volume to [0, 1]
                
                // Set volume through both the media element and gain node
                item.mediaElement.volume = vol;
                if (item.gainNode) {
                    item.gainNode.gain.value = vol;
                }
                
                // Apply panning if volume > 0
                if (vol > 0) {
                    applyAudioPanning(item);
                } else {
                    // Clean up audio nodes if volume is 0
                    cleanupItemAudio(item);
                }
            } else if (style === 'onlyOne') {
                // Implementation for onlyOne style
                item.mediaElement.volume = 0.0;
                if (item.gainNode) {
                    item.gainNode.gain.value = 0.0;
                }
            } else if (style === 'muteAll') {
                item.mediaElement.volume = 0.0; // Mute all videos
                if (item.gainNode) {
                    item.gainNode.gain.value = 0.0;
                }
                // Clean up audio nodes when muting
                cleanupItemAudio(item);
            } else {
                item.mediaElement.volume = 0.0; // Mute all others
                if (item.gainNode) {
                    item.gainNode.gain.value = 0.0;
                }
            }
        }
    });
}

function optimizeVideoPlayback() {
    mediaItems.forEach(item => {
        if (item.isVideo && item.mediaElement) {
            // Calculate visual position considering column offset
            const visualY = item.y - (columnOffsets[item.column] || 0);
            const itemTop = visualY;
            const itemBottom = visualY + item.height;
            
            // Check if item is visible in viewport
            const visibleTop = -renderBuffer;
            const visibleBottom = viewportHeight + renderBuffer;
            const isVisible = itemBottom >= visibleTop && itemTop <= visibleBottom;
            
            try {
                if (isVisible && item.mediaElement.paused) item.mediaElement.play().catch(e => {});
                else if (!isVisible && !item.mediaElement.paused) item.mediaElement.pause();
            } catch (e) {}
        }
    });
}

function recalculateLayout() {
    console.log("RECALC_LAYOUT: Start.");
    
    // Clean up audio resources before removing items
    mediaItems.forEach(item => {
        cleanupItemAudio(item);
        if (item.domElement) item.domElement.remove();
    });
    
    mediaItems = [];
    if(!columnHeights.every(h => h === 0) && columnHeights.length === columnCount) {
        console.log("RECALC_LAYOUT: Manually resetting columnHeights as they were not zeroed.");
        columnHeights = new Array(columnCount).fill(0);
    } else if (columnHeights.length !== columnCount) {
        console.error("RECALC_LAYOUT: columnHeights length is incorrect. Re-initializing.");
        columnHeights = new Array(columnCount).fill(0);
    }

    // Reset column offsets
    columnOffsets = new Array(columnCount).fill(0);
    
    totalContentHeight = 0;
    if (videoContainerElement) videoContainerElement.style.height = '0px';

    console.log("RECALC_LAYOUT: Erstelle alle Items neu aus allMediaFiles:", allMediaFiles.length);
    allMediaFiles.forEach(file => createMediaItem(file));
    updateContainerHeight();
    console.log(`RECALC_LAYOUT: Fertig. Neue totalContentHeight=${totalContentHeight.toFixed(0)}`);
}

// ===================================================================
// === CORRECTED moveItemsForEndlessScroll FUNCTION ==================
// ===================================================================
// sketch.js -> moveItemsForEndlessScroll

function moveItemsForEndlessScroll() {
    // For each column, check if items need to be moved
    for (let columnIdx = 0; columnIdx < columnCount; columnIdx++) {
        const columnOffset = columnOffsets[columnIdx];
        const moveThreshold = columnOffset - popOutPx; // Items that are this far above viewport
        
        // Find items in this column that are above the move threshold
        const candidateItems = mediaItems.filter(item => {
            if (item.column !== columnIdx) return false;
            const itemBottom = item.y + item.height;
            return itemBottom < moveThreshold;
        });

        if (candidateItems.length === 0) continue;

        // Sort by Y position and process the topmost item
        candidateItems.sort((a, b) => a.y - b.y);
        const itemsToProcess = candidateItems.slice(0, 1);

        itemsToProcess.forEach(item => {
            // Find the current height of this column
            let currentColumnHeight = Math.max(0, columnHeights[columnIdx] || 0);
            
            // Ensure the new position is below the current viewport
            const viewportTop = columnOffset;
            const minRespawnY = Math.max(
                currentColumnHeight,
                viewportTop + viewportHeight + popInPx
            );

            const newX = columnIdx * (columnWidth + gutterSize);
            const newY = minRespawnY;
            
            // Update item position
            item.x = newX;
            item.y = newY;

            // Update column height
            columnHeights[columnIdx] = newY + item.height + gutterSize;
            
            // The visual position will be updated by moveElementsByColumnOffset()
        });
    }

    updateContainerHeight();
}

// Global variable to track folders
// selectedFolders = []; - moved to global variables section

// ...existing code...

function showAdditionalFolderSelector() {
    // Create a new temporary file input for additional folder selection
    let tempInput = createFileInput(handleAdditionalFolders, 'true');
    tempInput.elt.setAttribute('webkitdirectory', true);
    tempInput.elt.setAttribute('directory', true);
    tempInput.elt.style.display = 'none';
    
    // Append to body temporarily and trigger click
    document.body.appendChild(tempInput.elt);
    tempInput.elt.click();
    
    // Clean up after selection
    tempInput.elt.addEventListener('change', () => {
        setTimeout(() => {
            if (tempInput.elt.parentNode) {
                tempInput.elt.parentNode.removeChild(tempInput.elt);
            }
        }, 100);
    });
}

function handleAdditionalFolders(selectedFileOrArray) {
    console.log("ADDITIONAL_FOLDERS: Processing additional folder selection");
    
    // Process the additional files without clearing existing content
    let filesReceived = [];
    if (Array.isArray(selectedFileOrArray)) {
        selectedFileOrArray.forEach(p5File => {
            if (isMediaFile(p5File.file)) filesReceived.push(p5File.file);
        });
    } else if (selectedFileOrArray && selectedFileOrArray.file) {
        if (isMediaFile(selectedFileOrArray.file)) filesReceived.push(selectedFileOrArray.file);
    }

    if (filesReceived.length > 0) {
        // Extract folder name from the first file for display
        let folderPath = filesReceived[0].webkitRelativePath || filesReceived[0].name;
        let folderName = folderPath.split('/')[0] || 'Unknown Folder';
        selectedFolders.push(folderName);
        
        // Add unique files to existing collection
        let newUniqueFiles = filesReceived.filter(f_new =>
            !allMediaFiles.some(f_existing => f_existing.name === f_new.name && f_existing.size === f_new.size)
        );

        if (newUniqueFiles.length > 0) {
            allMediaFiles.push(...newUniqueFiles);
            console.log(`ADDITIONAL_FOLDERS: Erstelle ${newUniqueFiles.length} neue Media-Items.`);
            newUniqueFiles.forEach(file => createMediaItem(file));
            updateContainerHeight();
            updateFolderStatus();
            console.log(`ADDITIONAL_FOLDERS: ${newUniqueFiles.length} Items hinzugefügt.`);
        } else {
            console.log("ADDITIONAL_FOLDERS: Keine neuen einzigartigen Dateien gefunden.");
            updateFolderStatus();
        }
    }
}

function updateFolderStatus() {
    let statusElement = select('#folder-status');
    let addMoreButton = select('#add-more-button');
    
    if (selectedFolders.length === 0) {
        if (statusElement) statusElement.html('Kein Ordner ausgewählt');
        if (addMoreButton) addMoreButton.style('display', 'none');
    } else if (selectedFolders.length === 1) {
        if (statusElement) statusElement.html(`Ordner: ${selectedFolders[0]} (${allMediaFiles.length} Dateien)`);
        if (addMoreButton) addMoreButton.style('display', 'block');
    } else {
        if (statusElement) statusElement.html(`${selectedFolders.length} Ordner (${allMediaFiles.length} Dateien)`);
        if (addMoreButton) addMoreButton.style('display', 'block');
    }
}