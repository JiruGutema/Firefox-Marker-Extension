#!/bin/bash

# Web Marker Extension - Build Script
# This script creates the extension package for Mozilla submission

echo "Building Web Marker Extension..."

# Create build directory
mkdir -p build

# Copy all source files to build directory
echo "Copying source files..."
cp -r src/* build/

echo "Build completed successfully!"
echo "Extension files are ready in the 'build' directory"
echo ""
echo "To test the extension:"
echo "1. Open Firefox"
echo "2. Navigate to about:debugging"
echo "3. Click 'This Firefox'"
echo "4. Click 'Load Temporary Add-on'"
echo "5. Select the manifest.json file from the build directory"