# Brainrot Wall - Code Refactoring Documentation

### File Structure

### 1. `constants.js`
**Purpose**: Global variables and configuration constants
**Contains**:
- UI state variables (controlPanel, inputButton, etc.)
- Folder management variables
- Media arrays (allMediaFiles, mediaItems)
- Scrolling variables
- Masonry layout variables
- Column movement variables
- Audio constants

### 2. `audio-manager.js`
**Purpose**: Complete audio management system
**Contains**:
- Global AudioContext management
- Audio initialization and error handling
- Circuit breaker pattern for audio errors
- Audio panning and volume control
- Audio cleanup functions
- User interaction handlers for AudioContext

**Key Features**:
- Robust error handling with circuit breaker pattern
- Automatic audio context recovery
- Spatial audio panning based on item position
- Volume control based on viewport position

### 3. `file-manager.js`
**Purpose**: File handling and folder management
**Contains**:
- File selection and processing
- Media file type detection
- Folder tracking and management
- Additional folder selection
- Folder deletion functionality
- File status updates

**Key Features**:
- Multi-folder support
- Duplicate file prevention
- Folder-based file organization
- Individual folder deletion

### 4. `layout-manager.js`
**Purpose**: Masonry layout and positioning system
**Contains**:
- Layout dimension calculations
- Column count management
- Auto-scroll functionality
- Element positioning
- Container height management
- Layout recalculation

**Key Features**:
- Dynamic column count adjustment
- Independent column scrolling
- Responsive layout calculations
- Endless scroll implementation

### 5. `media-items.js`
**Purpose**: Media item creation and management
**Contains**:
- Media item creation (video/image)
- Item height updates
- Video playback optimization
- Media element lifecycle management

**Key Features**:
- Automatic media type detection
- Dynamic height adjustment
- Viewport-based playback optimization
- Memory leak prevention

### 6. `ui-controls.js`
**Purpose**: User interface controls and interaction
**Contains**:
- Control panel creation
- Slider and button handlers
- Speed controls
- Column speed controls
- Pop-in/out settings
- Display updates

**Key Features**:
- Dynamic control generation
- Real-time parameter updates
- Individual column speed control
- Responsive UI updates

### 7. `sketch.js` (Refactored)
**Purpose**: Main p5.js lifecycle coordination
**Contains**:
- `setup()` function
- `draw()` function
- `keyPressed()` function
- Module coordination

**Key Features**:
- Clean separation of concerns
- Minimal, focused functionality
- Proper module coordination

## Benefits of Refactoring

### 1. **Maintainability**
- Each module has a single responsibility
- Easier to locate and fix bugs
- Cleaner code organization

### 2. **Readability**
- Functions are grouped by purpose
- Smaller, more focused files
- Better code documentation

### 3. **Modularity**
- Independent modules can be tested separately
- Easier to add new features
- Potential for code reuse

### 4. **Performance**
- Better separation allows for optimized loading
- Easier to identify performance bottlenecks
- More efficient debugging

### 5. **Scalability**
- Easy to add new modules
- Simple to extend existing functionality
- Better foundation for future development

## Loading Order
The modules must be loaded in the correct order in `index.html`:

```html
<script src="constants.js"></script>
<script src="audio-manager.js"></script>
<script src="file-manager.js"></script>
<script src="layout-manager.js"></script>
<script src="media-items.js"></script>
<script src="ui-controls.js"></script>
<script src="sketch.js"></script>
```

## Function Dependencies
- All modules depend on global variables from `constants.js`
- `sketch.js` coordinates calls to functions in other modules
- Audio functions are centralized in `audio-manager.js`
- UI updates are handled by `ui-controls.js`
