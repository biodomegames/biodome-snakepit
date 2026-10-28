#!/bin/bash

# Create a temporary directory for the icons
mkdir -p temp_icons

# iPhone icons
magick res/icon/icon.png -resize 40x40 temp_icons/icon-20@2x.png
magick res/icon/icon.png -resize 60x60 temp_icons/icon-20@3x.png
magick res/icon/icon.png -resize 29x29 temp_icons/icon-29.png
magick res/icon/icon.png -resize 58x58 temp_icons/icon-29@2x.png
magick res/icon/icon.png -resize 87x87 temp_icons/icon-29@3x.png
magick res/icon/icon.png -resize 80x80 temp_icons/icon-40@2x.png
magick res/icon/icon.png -resize 120x120 temp_icons/icon-40@3x.png
magick res/icon/icon.png -resize 57x57 temp_icons/icon.png
magick res/icon/icon.png -resize 114x114 temp_icons/icon@2x.png
magick res/icon/icon.png -resize 120x120 temp_icons/icon-60@2x.png
magick res/icon/icon.png -resize 180x180 temp_icons/icon-60@3x.png

# iPad icons
magick res/icon/icon.png -resize 20x20 temp_icons/icon-20.png
magick res/icon/icon.png -resize 40x40 temp_icons/icon-20@2x.png
magick res/icon/icon.png -resize 29x29 temp_icons/icon-29.png
magick res/icon/icon.png -resize 58x58 temp_icons/icon-29@2x.png
magick res/icon/icon.png -resize 40x40 temp_icons/icon-40.png
magick res/icon/icon.png -resize 80x80 temp_icons/icon-40@2x.png
magick res/icon/icon.png -resize 50x50 temp_icons/icon-50.png
magick res/icon/icon.png -resize 100x100 temp_icons/icon-50@2x.png
magick res/icon/icon.png -resize 72x72 temp_icons/icon-72.png
magick res/icon/icon.png -resize 144x144 temp_icons/icon-72@2x.png
magick res/icon/icon.png -resize 76x76 temp_icons/icon-76.png
magick res/icon/icon.png -resize 152x152 temp_icons/icon-76@2x.png
magick res/icon/icon.png -resize 167x167 temp_icons/icon-83.5@2x.png

# App Store icon (must be RGB, no alpha channel)
magick res/icon/icon.png -background white -alpha remove -alpha off temp_icons/icon-1024.png

# Copy all icons to the asset catalog
cp temp_icons/* platforms/ios/Mine\ Match/Assets.xcassets/AppIcon.appiconset/

# Clean up
rm -rf temp_icons

echo "Icons generated and copied to asset catalog" 