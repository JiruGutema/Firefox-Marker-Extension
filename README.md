# Web Marker Extension - Source Code

This is the source code for the Web Marker browser extension that allows users to draw on webpages.

## Build Instructions

### Prerequisites

- No build tools required - this extension uses vanilla JavaScript
- Any text editor
- Web browser for testing

### Operating System Requirements

- Any operating system (Windows, macOS, Linux)
- No specific build environment needed

### Build Process

This extension does not require any build process. All files are written in vanilla JavaScript, HTML, and CSS without any transpilation, minification, or concatenation.

### Step-by-Step Instructions

1. **Extract the source code** to a directory on your system

2. **Run the build script** (optional - files can be used directly):
   ```bash
   cd mozilla-submission
   ./build.sh
   ```

3. **Load the extension in Firefox for testing:**
   - Open Firefox
   - Navigate to `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file from the `src` directory (or `build` directory if you ran the build script)

4. **Test the extension:**
   - Navigate to any regular website (not protected pages like about: or moz-extension:)
   - Click the Web Marker icon in the toolbar
   - The drawing interface should appear on the page

### File Structure

```
src/
├── manifest.json          # Extension manifest
├── background.js          # Background script (unminified)
├── marker.js             # Content script (unminified source)
├── options.js            # Options page script
├── options.html          # Options page
├── popup.html            # Popup HTML
├── main.css              # Styles
├── fabric.min.js         # Third-party library (Fabric.js)
└── icons/                # Extension icons
    ├── icon.png
    ├── marker.png
    ├── eraser.png
    ├── save.png
    ├── pointer.png
    ├── highlighter.png
    ├── clear.png
    ├── undo.png
    ├── redo.png
    ├── cup-border.png
    ├── exit.png
    ├── line.png
    ├── text.png
    └── move.png
```

### Third-Party Libraries

- **Fabric.js** (fabric.min.js) - Canvas library for drawing functionality
  - Version: Latest stable
  - Source: https://fabricjs.com/
  - License: MIT
  - Used for: Canvas drawing and manipulation

### Notes

- All source files are in their original, unminified form
- No build tools, transpilers, or minifiers are used
- The extension works directly with the provided source files
- fabric.min.js is the only minified file and is a third-party library