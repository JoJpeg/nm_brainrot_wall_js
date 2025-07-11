// Global Variables and Constants
// ====================================

// UI State
let inputButton;
let videoContainerElement;
let controlPanel;
let controlPanelOpen = false;
let isFirstSelection = true;
let tabPressed = false;

// Folder Management
let selectedFolders = [];
let folderFileMap = new Map();

// Media Arrays
let allMediaFiles = [];
let mediaItems = [];

// Scrolling Variables
let scrollSpeed = 1;
let viewportHeight;
let scrollOffset = 0;
let autoScrollEnabled = false;
let popInPx = 0;
let popOutPx = 200;

// Masonry Layout Variables
let columnCount = 6;
let columnWidth = 100;
let columnHeights = [];
let gutterSize = 10;
let totalContentHeight = 0;
let renderBuffer = 0;

// Column Movement
let columnOffsets = [];
let columnSpeeds = [];
let individualColumnSpeeds = [];
let uniformity = 0;

// Logging
let lastLogFrame = 0;
const logInterval = 60;

// Audio Constants
const MAX_AUDIO_ERRORS = 3;
const ERROR_RESET_TIME = 10000; // 10 seconds
const AUDIO_THROTTLE_TIME = 100; // Only update audio every 100ms

// Export for use in other modules (if using ES6 modules in the future)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // All the variables would be exported here
    };
}
