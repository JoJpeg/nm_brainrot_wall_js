// Media Items Module
// ==================

function createMediaItem(nativeFileObject) {
    if (columnWidth <= 0) {
        console.error(`CREATE_ITEM: columnWidth (${columnWidth.toFixed(2)}) ungültig für ${nativeFileObject.name}.`);
        return;
    }

    let shortestColumnIdx = 0;
    let shortestEffectiveHeight = columnHeights[0];


    // When items are added during auto-scroll, we need to consider the column offsets
    for (let i = 1; i < columnCount; i++) {
        let effectiveHeight = columnHeights[i];

        // If auto-scroll is active and column offsets exist, 
        // we want to place new items where they'll be visible
        if (autoScrollEnabled && columnOffsets && columnOffsets[i] !== undefined) {
            // Ensure new items appear below the current viewport
            let minVisibleY = columnOffsets[i] + viewportHeight + popInPx;
            effectiveHeight = Math.max(effectiveHeight, minVisibleY);
        }

        if (effectiveHeight < shortestEffectiveHeight) {
            shortestEffectiveHeight = effectiveHeight;
            shortestColumnIdx = i;
        }
    }

    let x = shortestColumnIdx * (columnWidth + gutterSize);
    let y = shortestEffectiveHeight;
    // Ensure y position accounts for column offset if auto-scrolling
    if (autoScrollEnabled && columnOffsets && columnOffsets[shortestColumnIdx] !== undefined) {
        let minVisibleY = columnOffsets[shortestColumnIdx] + viewportHeight + popInPx;
        y = Math.max(y, minVisibleY);
    }
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
            mediaItem.mediaElement.onerror = (e) => {
                console.error(`CREATE_ITEM: Bild-Ladefehler für ${nativeFileObject.name}`, e);
                URL.revokeObjectURL(objectURL);
                mediaItem.objectURL = null;
            }
        } else {
            gridItemDiv.remove();
            URL.revokeObjectURL(objectURL);
            return;
        }
    } catch (e) {
        gridItemDiv.remove();
        if (objectURL) URL.revokeObjectURL(objectURL);
        return;
    }

    mediaItems.push(mediaItem);
    columnHeights[shortestColumnIdx] = y + mediaItem.height + gutterSize; // Update with estimated height
    videoContainerElement.appendChild(gridItemDiv.elt);

    // Ensure initial visual position is correct
    if (columnOffsets && columnOffsets[shortestColumnIdx] !== undefined) {
        const visualY = y - columnOffsets[shortestColumnIdx];
        gridItemDiv.elt.style.top = visualY + 'px';
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
                if (isVisible && item.mediaElement.paused) {
                    item.mediaElement.play().catch(e => { });
                } else if (!isVisible && !item.mediaElement.paused) {
                    item.mediaElement.pause();
                }
            } catch (e) { }
        }
    });
}
