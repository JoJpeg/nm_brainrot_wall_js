// Audio Manager Module
// ====================

// Global Audio Variables
let globalAudioContext = null;
let audioContextState = 'none'; // 'none', 'initializing', 'ready', 'error', 'suspended'
let audioInitializationPromise = null;

// Circuit breaker pattern for audio errors
let audioErrorCount = 0;
let lastAudioError = 0;
let audioDisabled = false;
let lastAudioUpdate = 0;

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
                item.mediaElement.volume = 0.0;
                if (item.gainNode) {
                    item.gainNode.gain.value = 0.0;
                }
                // Clean up audio nodes when muting
                cleanupItemAudio(item);
            } else {
                item.mediaElement.volume = 0.0;
                if (item.gainNode) {
                    item.gainNode.gain.value = 0.0;
                }
            }
        }
    });
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
