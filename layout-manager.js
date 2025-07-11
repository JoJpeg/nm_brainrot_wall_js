// Layout Manager Module
// =====================

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

function moveElementsByColumnOffset() {
    mediaItems.forEach(item => {
        if (item.domElement && item.column < columnOffsets.length) {
            // Calculate the visual Y position (original Y minus column offset)
            const visualY = item.y - columnOffsets[item.column];
            item.domElement.style.top = visualY + 'px';
        }
    });
}

function updateContainerHeight() {
    columnHeights = columnHeights.map(h => Math.max(0, h || 0)); // Ensure no NaN or negative
    totalContentHeight = Math.max(0, ...columnHeights);
    if (videoContainerElement) {
        videoContainerElement.style.height = totalContentHeight + 'px';
    }
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
