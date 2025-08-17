# Web Marker Extension - Source Code

This is the complete source code for the Web Marker browser extension that allows users to draw, annotate, and mark up any webpage with various tools including markers, highlighters, text, lines, and erasers.

## Mozilla Add-on Submission - Build Instructions

### System Requirements

**Operating System Requirements:**
- Windows 10 or later
- macOS 10.14 (Mojave) or later  
- Linux (Ubuntu 18.04+ or equivalent distributions)

**Required Software and Versions:**

1. **Firefox Browser** (for testing):
   - **Minimum Version**: 88.0 or later
   - **Download**: https://www.mozilla.org/firefox/
   - **Installation**: Follow standard Firefox installation process for your operating system

2. **Command Line Interface**:
   - **Linux/macOS**: Terminal (pre-installed)
   - **Windows**: Command Prompt, PowerShell, or Git Bash
   - **Version**: Any recent version

3. **Text Editor** (optional, for code inspection):
   - Any text editor (Visual Studio Code, Sublime Text, Notepad++, vim, nano, etc.)
   - **No specific version requirements**

**Build Environment Requirements:**
- **Disk Space**: Minimum 50MB free space
- **Memory**: No specific requirements (standard system memory sufficient)
- **Network**: Internet connection only needed for testing external website functionality
- **Permissions**: Standard user permissions (no administrator/root access required)

### Programs NOT Required

This extension intentionally uses **zero build tools** to maintain simplicity and transparency:

- ❌ **Node.js** - Not required (no npm, yarn, or Node-based tools)
- ❌ **Python** - Not required (no pip packages or Python scripts)
- ❌ **Build Tools** - No webpack, rollup, gulp, grunt, or similar
- ❌ **Transpilers** - No Babel, TypeScript compiler, or ES6+ transpilation
- ❌ **CSS Preprocessors** - No Sass, Less, Stylus, or PostCSS
- ❌ **Minifiers** - No UglifyJS, Terser, or CSS minification tools
- ❌ **Package Managers** - No dependency installation or management needed

### Build Process Overview

This extension uses **pure vanilla technologies** with **no compilation or build steps**:

- **JavaScript**: Pure ES5/ES6 vanilla JavaScript (no frameworks or libraries except Fabric.js)
- **HTML**: Standard HTML5 markup
- **CSS**: Standard CSS3 stylesheets
- **Assets**: Static PNG images and manifest JSON

**The only pre-built file** is `fabric.min.js`, which is a third-party library (documented below).

### Step-by-Step Build Instructions

**To create an exact copy of the add-on code:**

1. **Download/Extract Source Code**
   ```bash
   # Extract the source code to your desired directory
   # No git clone or package installation required
   ```

2. **Verify File Integrity** (optional but recommended)
   ```bash
   # Ensure all required files are present:
   ls -la *.js *.html *.css *.json *.png
   # Should show: manifest.json, background.js, marker.js, options.js, 
   # options.html, popup.html, main.css, fabric.min.js, and all PNG icons
   ```

3. **Run Build Script** (creates organized copy)
   ```bash
   # Make build script executable (Linux/macOS)
   chmod +x build.sh
   
   # Execute build script
   ./build.sh
   
   # On Windows (if using Command Prompt):
   # bash build.sh
   ```

4. **Verify Build Output**
   ```bash
   # Check that all files were copied correctly
   ls -la build/
   # Should contain identical copies of all source files
   ```

5. **Load Extension in Firefox for Testing**
   - Open Firefox browser
   - Navigate to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on..."
   - Navigate to your project directory
   - Select `manifest.json` file (from root directory or build/ directory)
   - Extension should load successfully

6. **Test Extension Functionality**
   - Navigate to any regular website (e.g., https://example.com)
   - Click the Web Marker extension icon in Firefox toolbar
   - Drawing interface should appear as an overlay on the webpage
   - Test all tools: marker, highlighter, eraser, text, line, pointer, move
   - Test save functionality (should capture screenshot)
   - Test undo/redo functionality

### Build Script Details

The included `build.sh` script performs these technical steps:

```bash
#!/bin/bash
# Creates a clean build directory with all extension files
mkdir -p build/
cp *.js *.html *.css *.json *.png build/
echo "Build completed - extension ready for packaging"
```

**What the build script does:**
- Creates a `build/` directory
- Copies all source files without modification
- Provides confirmation of successful build
- **No compilation, transpilation, or minification occurs**

**Build script execution time:** < 1 second
**Build output size:** ~2.5MB (primarily fabric.min.js library)

### Complete File Structure

```
Web-Marker-Extension/
├── README.md              # This file - complete build instructions
├── build.sh              # Build script (creates build/ directory)
├── manifest.json          # Extension manifest (Firefox WebExtension format)
├── background.js          # Background script (unminified source)
├── marker.js             # Content script (unminified source) 
├── options.js            # Options page script (unminified source)
├── options.html          # Options/preferences page
├── popup.html            # Popup shown on protected pages
├── main.css              # Extension UI styles (unminified)
├── fabric.min.js         # Third-party library (Fabric.js - see below)
├── icon.png              # Extension icon (128x128)
├── marker.png            # Tool icon - marker/pen
├── eraser.png            # Tool icon - eraser
├── save.png              # Tool icon - save/screenshot
├── pointer.png           # Tool icon - pointer/cursor
├── highlighter.png       # Tool icon - highlighter
├── clear.png             # Tool icon - clear canvas
├── undo.png              # Tool icon - undo action
├── redo.png              # Tool icon - redo action
├── cup-border.png        # Tool icon - border/frame
├── exit.png              # Tool icon - exit/close
├── line.png              # Tool icon - line drawing
├── text.png              # Tool icon - text insertion
├── move.png              # Tool icon - move/drag objects
└── build/                # Created by build.sh (contains copies of all files)
    ├── manifest.json
    ├── background.js
    ├── marker.js
    ├── options.js
    ├── options.html
    ├── popup.html
    ├── main.css
    ├── fabric.min.js
    └── *.png (all icon files)
```

**File Size Breakdown:**
- Total source code: ~50KB (all custom files combined)
- Third-party library (fabric.min.js): ~2.4MB
- Icons and images: ~150KB
- **Total extension size: ~2.6MB**

### Third-Party Libraries and Dependencies

**Fabric.js** (fabric.min.js)
- **Purpose**: HTML5 canvas library for interactive drawing functionality
- **Version**: 5.3.0 (latest stable at time of submission)
- **Source**: https://fabricjs.com/
- **Repository**: https://github.com/fabricjs/fabric.js
- **License**: MIT License
- **Size**: ~2.4MB minified
- **Usage in Extension**: 
  - Canvas creation and manipulation
  - Drawing tools (pen, highlighter, eraser)
  - Object manipulation (move, select, delete)
  - Undo/redo functionality
  - Export/save functionality
- **Why Minified**: This is the official distribution format from the Fabric.js project
- **Source Code Available**: Full unminified source available at the GitHub repository above

**No Other Dependencies**: The extension uses no other third-party libraries, frameworks, or dependencies.

### Source Code Verification

**All Custom Source Files (Unminified):**
- `background.js` - 2.1KB - Background script with comments
- `marker.js` - 15.2KB - Main content script with full variable names and comments  
- `options.js` - 1.8KB - Options page script with descriptive function names
- `main.css` - 8.5KB - Stylesheet with readable class names and comments
- `options.html` - 3.2KB - HTML with semantic markup
- `popup.html` - 1.1KB - Simple HTML popup
- `manifest.json` - 0.8KB - Standard WebExtension manifest

**Machine-Generated Files:**
- `fabric.min.js` - Third-party library only (documented above)

### Installation and Testing Instructions

**For Mozilla Reviewers:**

1. **Quick Test Setup** (30 seconds):
   ```bash
   # Extract submission files
   # No installation or build required
   # Load manifest.json directly in Firefox
   ```

2. **Full Build Test** (1 minute):
   ```bash
   chmod +x build.sh
   ./build.sh
   # Load build/manifest.json in Firefox
   ```

3. **Functionality Test**:
   - Visit any website (e.g., https://example.com)
   - Click extension icon in toolbar
   - Drawing interface should appear
   - Test each tool (marker, highlighter, eraser, text, line, etc.)
   - Test save functionality (captures screenshot)

### Compliance Notes

- ✅ **No Firefox Trademark Usage**: Extension name changed from "Firefox Marker" to "Web Marker"
- ✅ **Source Code Provided**: All custom code is unminified and readable
- ✅ **Build Instructions**: Complete step-by-step instructions provided
- ✅ **Build Script**: Functional build.sh script included
- ✅ **Third-Party Documentation**: Fabric.js properly documented with source links
- ✅ **No Obfuscation**: All custom JavaScript uses descriptive variable and function names
- ✅ **Standard Technologies**: Uses only standard web technologies (HTML5, CSS3, ES6)

### Support and Contact

For questions about this source code submission:
- All source code is self-documenting with inline comments
- Build process is straightforward with no complex dependencies
- Extension functionality is contained within the provided files