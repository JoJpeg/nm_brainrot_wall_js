// UI Controls Module
// ==================

function createControlPanel() {
    controlPanel = createDiv('');
    controlPanel.addClass('control-panel collapsed');
    
    // Initialize individual column speeds if not set
    if (individualColumnSpeeds.length === 0) {
        individualColumnSpeeds = new Array(columnCount).fill(0).map(() => 0.5 + Math.random() * 1.0); // Random between 0.5 and 1.5
    }
    
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
    let folderStatus = createDiv('').addClass('folder-status').parent(fileGroup).id('folder-status');
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
    let popOutSlider = createSlider(-500, 500, popOutPx, 10).parent(popSettingsGroup);
    popOutSlider.input(() => {
        popOutPx = popOutSlider.value();
        updatePopLabels(); // Update the display label immediately
    });
    createDiv(`Pop-Out: ${popOutPx}px`).addClass('pop-out-display').parent(popSettingsGroup).id('pop-out-display'); 
    let popInSlider = createSlider(-500, 500, popInPx, 10).parent(popSettingsGroup);
    popInSlider.input(() => {
        popInPx = popInSlider.value();
        updatePopLabels(); // Update the display label immediately
    });
    createDiv(`Pop-In: ${popInPx}px`).addClass('pop-in-display').parent(popSettingsGroup).id('pop-in-display');

    let clearGroup = createDiv('').addClass('control-group').parent(controlPanel);
    createButton('🗑️ Alle löschen').addClass('danger').parent(clearGroup).mousePressed(clearAllVideos);
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
