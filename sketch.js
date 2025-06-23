// sketch.js

// Globale Variablen
let inputButton;
let videoContainerElement;
let isFirstSelection = true;

// Einfache Variablen für automatisches Scrolling
let allMediaFiles = [];
let mediaItems = [];
let scrollSpeed = 1;
let viewportHeight;
let scrollOffset = 0;
let autoScrollEnabled = false;

// Masonry-Layout Variablen
let columnCount = 5;
let columnWidth = 100;
let columnHeights = [];
let gutterSize = 10;
let totalContentHeight = 0;
let renderBuffer = 800; // Items further than this above viewport top are candidates for moving

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

function createControlPanel() {
    let controlPanel = createDiv('');
    controlPanel.addClass('control-panel collapsed');
    let toggleBtn = createDiv('⚙️').addClass('control-toggle').parent(controlPanel);
    toggleBtn.mousePressed(() => controlPanel.toggleClass('collapsed'));
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
    let clearGroup = createDiv('').addClass('control-group').parent(controlPanel);
    createButton('🗑️ Alle löschen').addClass('danger').parent(clearGroup).mousePressed(clearAllVideos);
}

function updateSpeedDisplay() {
    let display = select('#speed-display');
    if (display) display.html(`${scrollSpeed.toFixed(1)}x`);
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
    console.log(`LAYOUT_DIMS: containerWrapperWidth=${containerWrapperWidth.toFixed(0)}, columnWidth=${columnWidth.toFixed(0)}, columnHeights initialized.`);
}

function toggleAutoScroll() {
    autoScrollEnabled = !autoScrollEnabled;
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
        scrollOffset += scrollSpeed;
        window.scrollTo(0, scrollOffset);
        optimizeVideoPlayback();
        moveItemsForEndlessScroll();

        if (frameCount % logInterval === 0 && frameCount !== lastLogFrame) {
            console.log(
                `DRAW[F:${frameCount}]: scrollOffset=${scrollOffset.toFixed(0)}, totalContentHeight=${totalContentHeight.toFixed(0)}, ` +
                `maxColH=${Math.max(0, ...columnHeights).toFixed(0)}, ` +
                `container.style.height=${videoContainerElement ? videoContainerElement.style.height : 'N/A'}`
            );
            lastLogFrame = frameCount;
        }
    }
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

function optimizeVideoPlayback() {
    let currentScrollTop = scrollOffset;
    let visibleTop = currentScrollTop - renderBuffer;
    let visibleBottom = currentScrollTop + viewportHeight + renderBuffer;
    mediaItems.forEach(item => {
        if (item.isVideo && item.mediaElement) {
            let itemTop = item.y; let itemBottom = item.y + item.height;
            let isVisible = itemBottom >= visibleTop && itemTop <= visibleBottom;
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
    const currentScrollTop = scrollOffset;
    const moveThreshold = currentScrollTop - renderBuffer;
    
    // NEW: Define the bottom of the visible screen, plus a buffer.
    // This is the lowest Y-coordinate an item is allowed to "respawn" at.
    const respawnBuffer = 200; // 200px buffer below the viewport
    const minRespawnY = currentScrollTop + viewportHeight + respawnBuffer;

    const candidateItems = mediaItems.filter(item => {
        const itemBottom = item.y + item.height;
        return itemBottom < moveThreshold;
    });

    if (candidateItems.length === 0) {
        return;
    }

    candidateItems.sort((a, b) => a.y - b.y);
    const itemsToProcess = candidateItems.slice(0, 1);

    itemsToProcess.forEach(item => {
        let newShortestColumnIdx = 0;
        let newShortestColumnHeight = columnHeights[0] || 0;
        for (let i = 1; i < columnCount; i++) {
            const h = columnHeights[i] || 0;
            if (h < newShortestColumnHeight) {
                newShortestColumnHeight = h;
                newShortestColumnIdx = i;
            }
        }

        const newX = newShortestColumnIdx * (columnWidth + gutterSize);

        // MODIFIED: Ensure the new Y position is below the viewport.
        // We take the maximum of where it *should* go (newShortestColumnHeight)
        // and the minimum position we'll allow (minRespawnY).
        const newY = Math.max(newShortestColumnHeight, minRespawnY);
        
        item.column = newShortestColumnIdx;
        item.x = newX;
        item.y = newY;

        item.domElement.style.left = newX + 'px';
        item.domElement.style.top = newY + 'px';

        columnHeights[newShortestColumnIdx] = newY + item.height + gutterSize;
    });

    updateContainerHeight();
}