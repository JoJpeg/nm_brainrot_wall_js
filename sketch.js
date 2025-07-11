// Globale Variablen
let inputButton;
let videoContainerElement;
let controlPanel; // Reference to control panel for keyboard toggle
let isFirstSelection = true;
let spacePressed = false; // Track if space has been pressed to remove the label

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
    console.log("SETUP: Virtuelles Masonry-Rendering-System initialisiert.");

    window.addEventListener('resize', () => {
        viewportHeight = window.innerHeight;
        console.log("RESIZE_EVENT: Window resized, calling updateLayoutDimensions()...");
        updateLayoutDimensions();
        if (mediaItems.length > 0) {
            console.log("RESIZE_EVENT: ...und recalculating layout for existing items.");
            recalculateLayout();
        }
    });
    console.log("SETUP: p5.js Sketch initialisiert. Bitte Videos auswählen.");
}

// Handle keyboard input
function keyPressed() {
    // Toggle control panel when Space key is pressed
    if (key === ' ') {
        // Remove "Press Space" label on first space press
        if (!spacePressed) {
            let pressSpaceLabel = select('p');
            if (pressSpaceLabel) {
                pressSpaceLabel.remove();
            }
            spacePressed = true;
        }
        
        if (controlPanel) {
            controlPanel.toggleClass('collapsed');
        }
        // Prevent default space bar behavior (scrolling)
        return false;
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
    inputButton = createFileInput(handleFileProcessing, 'true').parent(fileGroup);
    inputButton.elt.setAttribute('webkitdirectory', true);
    inputButton.elt.setAttribute('directory', true);
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
        changeAudioVolume('muteAll'); 
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
    mediaItems.forEach(item => {
        if (item.domElement) item.domElement.remove();
        if (item.objectURL) URL.revokeObjectURL(item.objectURL);
    });
    allMediaFiles = []; mediaItems = [];
    scrollOffset = 0; totalContentHeight = 0;
    columnHeights = new Array(columnCount).fill(0);
    columnOffsets = new Array(columnCount).fill(0); // Reset column offsets
    // Keep individual column speeds as they are user preferences
    if (videoContainerElement) videoContainerElement.style.height = '0px';
    isFirstSelection = true;
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

    let newUniqueFiles = filesReceived.filter(f_new =>
        !allMediaFiles.some(f_existing => f_existing.name === f_new.name && f_existing.size === f_new.size)
    );

    if (newUniqueFiles.length > 0) {
        allMediaFiles.push(...newUniqueFiles);
        console.log(`FILE_PROCESSING: Erstelle ${newUniqueFiles.length} neue Media-Items.`);
        newUniqueFiles.forEach(file => createMediaItem(file));
        updateContainerHeight(); // Single call after all new items are processed and their estimated heights added
        console.log(`FILE_PROCESSING: ${newUniqueFiles.length} Items hinzugefügt. Initiale totalContentHeight=${totalContentHeight.toFixed(0)}`);
    } else {
        console.log("FILE_PROCESSING: Keine neuen einzigartigen Dateien.");
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
            mediaItem.mediaElement.onerror = (e) => console.error(`CREATE_ITEM: Video-Ladefehler für ${nativeFileObject.name}`, e);
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
    try {
        // Create audio context and nodes if they don't exist
        if (!item.audioContext) {
            item.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            item.audioSource = item.audioContext.createMediaElementSource(item.mediaElement);
            item.stereoPanner = item.audioContext.createStereoPanner();
            
            // Connect the audio graph
            item.audioSource.connect(item.stereoPanner);
            item.stereoPanner.connect(item.audioContext.destination);
        }
        
        // Calculate pan value based on horizontal position
        let itemCenterX = item.x + (item.mediaElement.offsetWidth / 2);
        let viewportCenterX = window.innerWidth / 2;
        let pan = (itemCenterX - viewportCenterX) / (window.innerWidth / 2);
        pan = Math.max(-1, Math.min(1, pan)); // Clamp pan between -1 and 1
        
        // Apply the panning
        item.stereoPanner.pan.value = pan;
        
    } catch (error) {
        console.warn('Audio panning not supported or failed:', error);
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

function changeAudioVolume(style) {
    // style: 'centerY', 'onlyOne', 'muteAll'
    if (!mediaItems || mediaItems.length === 0) return;
    
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
                item.mediaElement.volume = vol; // Full volume for items close to center
                applyAudioPanning(item);
            } else if (style === 'onlyOne') {
                // Implementation for onlyOne style
            } else if (style === 'muteAll') {
                item.mediaElement.volume = 0.0; // Mute all videos
            } else {
                item.mediaElement.volume = 0.0; // Mute all others
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
    mediaItems.forEach(item => {
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