#!/bin/bash

# Web Marker Extension - Build Script
# This script creates a clean build directory with all extension files
# No compilation, transpilation, or minification occurs

echo "Building Web Marker Extension..."
echo "================================"

# Create build directory
echo "Creating build directory..."
mkdir -p build/

# Copy all source files to build directory
echo "Copying source files..."
cp *.js *.html *.css *.json *.png build/

# Verify all files were copied
echo "Verifying build output..."
if [ -f "build/manifest.json" ] && [ -f "build/background.js" ] && [ -f "build/marker.js" ]; then
    echo "✅ Core files copied successfully"
else
    echo "❌ Error: Core files missing in build directory"
    exit 1
fi

# Count files
SOURCE_COUNT=$(ls -1 *.js *.html *.css *.json *.png 2>/dev/null | wc -l)
BUILD_COUNT=$(ls -1 build/*.js build/*.html build/*.css build/*.json build/*.png 2>/dev/null | wc -l)

echo "Source files: $SOURCE_COUNT"
echo "Build files: $BUILD_COUNT"

if [ "$SOURCE_COUNT" -eq "$BUILD_COUNT" ]; then
    echo "✅ All files copied successfully"
else
    echo "⚠️  Warning: File count mismatch"
fi

echo ""
echo "Build completed successfully!"
echo "Extension files are ready in the 'build/' directory"
echo ""
echo "Next steps:"
echo "1. Open Firefox"
echo "2. Navigate to about:debugging#/runtime/this-firefox"
echo "3. Click 'Load Temporary Add-on'"
echo "4. Select manifest.json from the build/ directory"
echo ""
echo "Build output size:"
du -sh build/ 2>/dev/null || echo "Build directory created"