#!/bin/bash

# Build script for SLD Editor v3 integration

# Set paths
SLD_EDITOR_DIR="sld-editor-v3"
OUTPUT_DIR="static/js/admin"
OUTPUT_FILE="${OUTPUT_DIR}/sld-editor-bundle.js"

# Check if SLD Editor directory exists
if [ ! -d "$SLD_EDITOR_DIR" ]; then
  echo "Error: SLD Editor directory not found at ${SLD_EDITOR_DIR}"
  exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Build the SLD Editor
echo "Building SLD Editor v3..."
cd "$SLD_EDITOR_DIR"
yarn install
yarn build
cd ..

# Copy the built bundle to our output location
echo "Copying bundle to ${OUTPUT_FILE}..."
cp "${SLD_EDITOR_DIR}/dist/assets/index-*.js" "$OUTPUT_FILE"

# Success message
echo "SLD Editor bundle created successfully!"
echo "Bundle location: ${OUTPUT_FILE}"
