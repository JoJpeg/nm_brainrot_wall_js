// File Manager Module
// ===================

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
        
        // Only add folder to selectedFolders if it's not already there
        if (!selectedFolders.includes(folderName)) {
            selectedFolders.push(folderName);
        }
        
        // Track which files belong to this folder
        if (!folderFileMap.has(folderName)) {
            folderFileMap.set(folderName, []);
        }
        
        let newUniqueFiles = filesReceived.filter(f_new =>
            !allMediaFiles.some(f_existing => f_existing.name === f_new.name && f_existing.size === f_new.size)
        );

        if (newUniqueFiles.length > 0) {
            allMediaFiles.push(...newUniqueFiles);
            // Add files to folder mapping
            folderFileMap.get(folderName).push(...newUniqueFiles);
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
        
        // Only add folder to selectedFolders if it's not already there
        if (!selectedFolders.includes(folderName)) {
            selectedFolders.push(folderName);
        }
        
        // Track which files belong to this folder
        if (!folderFileMap.has(folderName)) {
            folderFileMap.set(folderName, []);
        }
        
        // Add unique files to existing collection
        let newUniqueFiles = filesReceived.filter(f_new =>
            !allMediaFiles.some(f_existing => f_existing.name === f_new.name && f_existing.size === f_new.size)
        );

        if (newUniqueFiles.length > 0) {
            allMediaFiles.push(...newUniqueFiles);
            folderFileMap.get(folderName).push(...newUniqueFiles);
            console.log(`ADDITIONAL_FOLDERS: Adding ${newUniqueFiles.length} new files from ${folderName}`);
            newUniqueFiles.forEach(file => createMediaItem(file));
            updateContainerHeight();
            updateFolderStatus();
        } else {
            console.log("ADDITIONAL_FOLDERS: No new unique files found");
            updateFolderStatus();
        }
    }
}

function updateFolderStatus() {
    let statusElement = select('#folder-status');
    let addMoreButton = select('#add-more-button');
    
    if (!statusElement) return;
    
    if (selectedFolders.length === 0) {
        statusElement.html('Kein Ordner ausgewählt');
        if (addMoreButton) addMoreButton.style('display', 'none');
    } else {
        // Create a container for folder list
        let folderListHtml = '<div class="folder-list">';
        let totalFiles = allMediaFiles.length;
        
        selectedFolders.forEach((folderName, index) => {
            let folderFiles = folderFileMap.get(folderName) || [];
            folderListHtml += `
                <div class="folder-item">
                    <span class="folder-name">${folderName}</span>
                    <span class="folder-count">(${folderFiles.length} files)</span>
                    <button class="delete-folder-btn" onclick="deleteFolder('${folderName}')">🗑️</button>
                </div>
            `;
        });
        
        folderListHtml += '</div>';
        folderListHtml += `<div class="total-files">Total: ${totalFiles} files</div>`;
        
        statusElement.html(folderListHtml);
        
        if (addMoreButton) addMoreButton.style('display', 'block');
    }
}

function deleteFolder(folderName) {
    console.log(`DELETE_FOLDER: Deleting folder "${folderName}"`);
    
    // Find files belonging to this folder
    let folderFiles = folderFileMap.get(folderName) || [];
    
    if (folderFiles.length === 0) {
        console.warn(`DELETE_FOLDER: No files found for folder ${folderName}`);
        return;
    }
    
    // Remove media items associated with this folder's files
    let itemsToRemove = [];
    mediaItems.forEach(item => {
        if (folderFiles.some(file => file.name === item.file.name && file.size === item.file.size)) {
            itemsToRemove.push(item);
        }
    });
    
    // Clean up and remove items
    itemsToRemove.forEach(item => {
        cleanupItemAudio(item);
        if (item.domElement) item.domElement.remove();
        if (item.objectURL) URL.revokeObjectURL(item.objectURL);
        
        // Remove from mediaItems array
        let index = mediaItems.indexOf(item);
        if (index > -1) {
            mediaItems.splice(index, 1);
        }
    });
    
    // Remove files from allMediaFiles
    allMediaFiles = allMediaFiles.filter(file => 
        !folderFiles.some(folderFile => folderFile.name === file.name && folderFile.size === file.size)
    );
    
    // Remove folder from tracking
    folderFileMap.delete(folderName);
    let folderIndex = selectedFolders.indexOf(folderName);
    if (folderIndex > -1) {
        selectedFolders.splice(folderIndex, 1);
    }
    
    // Recalculate layout
    if (mediaItems.length > 0) {
        recalculateLayout();
    } else {
        // If no items left, reset everything
        columnHeights = new Array(columnCount).fill(0);
        columnOffsets = new Array(columnCount).fill(0);
        totalContentHeight = 0;
        if (videoContainerElement) videoContainerElement.style.height = '0px';
    }
    
    updateFolderStatus();
    console.log(`DELETE_FOLDER: Successfully deleted folder "${folderName}" with ${itemsToRemove.length} items`);
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
    
    allMediaFiles = []; 
    mediaItems = [];
    selectedFolders = []; // Reset folder tracking
    folderFileMap.clear(); // Clear folder-file mapping
    scrollOffset = 0; 
    totalContentHeight = 0;
    columnHeights = new Array(columnCount).fill(0);
    columnOffsets = new Array(columnCount).fill(0); // Reset column offsets
    // Keep individual column speeds as they are user preferences
    if (videoContainerElement) videoContainerElement.style.height = '0px';
    isFirstSelection = true;
    updateFolderStatus(); // Update folder status display
    console.log("CLEAR_ALL: Abgeschlossen.");
}
