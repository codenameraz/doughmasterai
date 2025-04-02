#!/bin/bash

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is required but not installed. Please install it first."
    echo "You can install it using: brew install imagemagick"
    exit 1
fi

# Convert SVG to ICO and PNG files
convert -background none -density 384 public/favicon.svg -define icon:auto-resize=16,32,48 public/favicon.ico
convert -background none -density 384 public/favicon.svg -resize 16x16 public/favicon-16x16.png
convert -background none -density 384 public/favicon.svg -resize 32x32 public/favicon-32x32.png
convert -background none -density 384 public/favicon.svg -resize 180x180 public/apple-touch-icon.png
convert -background none -density 384 public/favicon.svg -resize 192x192 public/android-chrome-192x192.png
convert -background none -density 384 public/favicon.svg -resize 512x512 public/android-chrome-512x512.png

echo "Favicon files have been generated successfully!" 