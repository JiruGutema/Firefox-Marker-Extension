# Web Marker Extension

A browser extension that allows users to draw, annotate, and mark up any webpage with various tools including markers, highlighters, text, lines, and erasers.

## Installation for Testing (No Build Required)

This extension uses vanilla JavaScript, HTML, and CSS. No build tools (Node.js, Webpack, etc.) are required.

1. Clone or download this repository.
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
3. Click **"Load Temporary Add-on..."**.
4. Select the `manifest.json` file in this directory.

## Features

- **Drawing Tools**: Pen, Highlighter, Eraser, Line, Text.
- **Controls**: Change color, thickness, and move/undo/redo actions.
- **Dashboard**: A standalone Whiteboard/Dashboard canvas accessible directly from the toolbar.
- **Save**: Take screenshots of your marked-up pages.

## Third-Party Libraries

- **Fabric.js** (`fabric.min.js` v5.3.0)
  - Purpose: HTML5 canvas library for interactive drawing.
  - License: MIT
  - Source: [fabricjs.com](https://fabricjs.com/)

## Build Script (Optional)

If you need to package the extension into a clean directory:
```bash
chmod +x build.sh
./build.sh
```
This simply copies the source files into a `build/` directory for easy zipping.