#!/bin/bash

# Create base64 encoded favicon data for a pizza slice icon
echo 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAMMOAADDDgAAAAAAAAAAAAD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AAAAAP8AAAD/AAAA/wAAAP////8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wAAAAD/PjQr/z40K/8+NCv/AAAA/////wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8AAAAA/z40K/89Myv/PjQr/wAAAP////8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AAAAAP8+NCv/PjQr/z40K/8AAAD/////AP///wD///8A////AP///wD///8A////AP///wD///8A////AAAAAP8AAAD/PjQr/z40K/8+NCv/AAAA/wAAAP////8A////AP///wD///8A////AP///wD///8A////AAAAAP89Myv/AAAA/z40K/89Myv/PjQr/wAAAP89Myv/AAAA/////wD///8A////AP///wD///8AAAAA/wAAAP89Myv/PjQr/wAAAP8+NCv/PjQr/wAAAP8+NCv/PjQr/wAAAP8AAAD/////AP///wAAAAD/PjQr/z40K/89Myv/PjQr/wAAAP89Myv/PjQr/wAAAP89Myv/PjQr/z40K/8+NCv/AAAA/////wAAAAD/PjQr/z0zK/8+NCv/AAAA/z40K/8AAAD/AAAA/z40K/8AAAD/PjQr/z0zK/8+NCv/AAAA/////wAAAAD/PjQr/z40K/8AAAD/PjQr/wAAAP////8A////AAAAAP8+NCv/AAAA/z40K/8+NCv/AAAA/////wAAAAD/AAAA/wAAAP8AAAD/AAAA/////wD///8A////AP///wAAAAD/AAAA/wAAAP8AAAD/AAAA/////wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A' | base64 -d > public/favicon.ico

# Copy favicon.ico to create other sizes
cp public/favicon.ico public/favicon-16x16.png
cp public/favicon.ico public/favicon-32x32.png
cp public/favicon.ico public/apple-touch-icon.png
cp public/favicon.ico public/android-chrome-192x192.png
cp public/favicon.ico public/android-chrome-512x512.png

# Create site.webmanifest
echo '{
  "name": "DoughMaster.ai",
  "short_name": "DoughMaster",
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "display": "standalone"
}' > public/site.webmanifest 