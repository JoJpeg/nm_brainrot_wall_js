# Brainrot Wall

**Interactive Multimedia Installation for Rundgang "Extase" 2025**  
*Kunsthochschule Kassel*

A dynamic, auto-scrolling video wall installation that creates an infinite, hypnotic stream of media content with spatial audio.
Most of the code - aswell as documentation is written by AI and only supervised by a human. `¯\_(ツ)_/¯`

![Brainrot Wall Preview](https://img.shields.io/badge/Status-Exhibition%20Ready-brightgreen)

## 🎭 About the Installation

Brainrot Wall was created for the "Extase" exhibition at Kunsthochschule Kassel in 2025. This interactive installation presents a constantly flowing wall of videos and images arranged in a masonry layout, creating a mesmerizing "brainrot" experience that reflects contemporary digital media consumption patterns.

The installation features:
- **Infinite scrolling** with independent column movement
- **Spatial audio** that pans based on visual positioning
- **Real-time control interface** for live performance
- **Multi-folder media management** for curated content

## 🚀 Features

### Visual System
- **Masonry Layout**: Dynamic grid system with customizable column count (2-10 columns)
- **Endless Scroll**: Infinite vertical movement with content recycling
- **Independent Column Movement**: Each column moves at different speeds for organic flow
- **Responsive Design**: Adapts to different screen sizes and orientations

### Audio System
- **Spatial Audio**: 3D stereo panning based on horizontal position
- **Volume Management**: Distance-based volume control from viewport center
- **Circuit Breaker Pattern**: Robust error handling for audio failures
- **Multi-browser Support**: Works across modern web browsers

### Control Interface
- **Collapsible Control Panel**: TAB to toggle, spacebar for auto-scroll
- **Real-time Parameters**: Speed, uniformity, column count, pop-in/out distances
- **Individual Column Control**: Independent speed control for each column
- **Multi-folder Support**: Add/remove media folders during runtime

### Performance Optimization
- **Viewport-based Rendering**: Only visible content is actively processed
- **Memory Management**: Automatic cleanup of media resources
- **Audio Throttling**: Optimized audio updates to prevent performance issues
- **Error Recovery**: Automatic recovery from media loading failures

## 🛠 Technical Architecture

The codebase is modularly structured for maintainability and performance:

```
brainrot_wall_js/
├── index.html          # Main HTML entry point
├── style.css           # Complete styling and UI design
├── constants.js        # Global variables and configuration
├── audio-manager.js    # Spatial audio system and error handling
├── file-manager.js     # Media file handling and folder management
├── layout-manager.js   # Masonry layout and positioning system
├── media-items.js      # Media element creation and lifecycle
├── ui-controls.js      # Control panel and user interface
├── sketch.js           # Main p5.js coordination and lifecycle
└── REFACTORING_DOCS.md # Detailed architecture documentation
```

### Key Technologies
- **p5.js**: Creative coding framework for interactive media
- **Web Audio API**: Spatial audio processing and effects
- **CSS Grid/Flexbox**: Responsive layout system
- **File API**: Local media file handling
- **HTML5 Video/Audio**: Media playback and control

## 🎮 Controls

### Keyboard Controls
- **TAB**: Toggle control panel visibility
- **SPACEBAR**: Start/stop auto-scroll

### Control Panel Options
- **Speed Control**: Adjust overall scrolling speed (0.5x - 5x)
- **Column Count**: Change number of columns (2-10)
- **Uniformity**: Blend between individual and uniform column speeds
- **Individual Column Speeds**: Fine-tune each column independently
- **Pop-In/Out Distance**: Control when items appear/disappear
- **Folder Management**: Add multiple media folders, remove individually

## 🎨 Installation Setup

### For Exhibitions/Performances

1. **Prepare Media Content**:
   - Organize videos and images in separate folders
   - Recommended formats: MP4, WebM (video), JPG, PNG (images)
   - Consider aspect ratios for optimal masonry layout

2. **Browser Setup**:
   - Use modern browsers (Chrome, Firefox, Safari, Edge)
   - Enable audio autoplay (required for spatial audio)
   - Full-screen mode recommended for exhibitions

3. **Performance Optimization**:
   - Close unnecessary browser tabs
   - Ensure adequate system memory (8GB+ recommended)
   - Use hardware acceleration if available

4. **Control Configuration**:
   - Test column count for your display resolution
   - Adjust scroll speeds for desired visual effect
   - Configure pop-in/out distances for smooth transitions

### For Development

```bash
# Clone or download the repository
git clone [repository-url]
cd brainrot_wall_js

# Open in a local server (required for file system access)
# Using Python:
python -m http.server 8000

# Using Node.js:
npx http-server
#or
npx serve

# Open browser to localhost:8000
```

## 📁 Media Management

The installation supports multiple media folders for organized content curation:

1. **Initial Folder Selection**: Use the main folder selector to choose your primary media collection
2. **Additional Folders**: Click "📁 Weiteren Ordner hinzufügen" to add more media sources
3. **Folder Removal**: Use the 🗑️ button next to each folder to remove specific collections
4. **Live Updates**: Add or remove folders during runtime without restarting

## 🔊 Audio Features

### Spatial Audio System
- **Horizontal Panning**: Audio pans left/right based on visual position
- **Distance-based Volume**: Content closer to center is louder
- **Error Recovery**: Automatic fallback when audio issues occur
- **Browser Compatibility**: Handles different AudioContext implementations

### Audio Troubleshooting
- **No Audio**: Click or interact with the page to enable AudioContext
- **Audio Dropouts**: Reduce the number of visible items or scroll speed
- **Browser Restrictions**: Some browsers require user interaction before audio playback

## 🎯 Exhibition Context: "Extase" 2025

Created for the "Extase" exhibition at Kunsthochschule Kassel, this installation explores themes of:

- **Digital Overwhelm**: The endless stream reflects modern media consumption
- **Hypnotic States**: Repetitive movement induces trance-like viewing
- **Spatial Relationships**: Audio-visual correspondence creates immersive experience
- **Curatorial Control**: Real-time manipulation enables performative interaction

The work questions our relationship with digital media streams and the psychological states they induce, creating a space for both critical reflection and aesthetic appreciation.

## 🐛 Troubleshooting

### Common Issues

**Installation won't load media files**:
- Ensure you're running from a local server (not file://)
- Check browser console for security restrictions
- Verify media file formats are supported

**Performance issues**:
- Reduce column count for lower-spec devices
- Decrease scroll speed
- Close other browser tabs
- Check available system memory

**Audio problems**:
- Click on the page to activate AudioContext
- Check browser audio permissions
- Verify speakers/headphones are connected
- Try refreshing the page

**Control panel not responsive**:
- Press TAB to toggle visibility
- Check JavaScript console for errors
- Ensure all script files are loaded correctly

## 🔧 Development Notes

### Code Architecture
The modular structure allows for easy modification and extension:

- **constants.js**: Modify global settings and configuration
- **audio-manager.js**: Extend spatial audio features
- **layout-manager.js**: Customize layout algorithms
- **ui-controls.js**: Add new control interfaces

### Performance Considerations
- Memory management is crucial for long-running installations
- Audio throttling prevents excessive CPU usage
- Viewport culling optimizes rendering performance

### Browser Compatibility
Tested on:
- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅

## 📄 License

This project was created for the "Extase" exhibition 2025 at Kunsthochschule Kassel.

## 👥 Credits

**Exhibition**: Rundgang "Extase" 2025  
**Institution**: Kunsthochschule Kassel  
**Year**: 2025

---

*Brainrot Wall - An exploration of digital media streams and hypnotic states*
