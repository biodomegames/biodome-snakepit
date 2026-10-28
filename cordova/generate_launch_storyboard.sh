#!/bin/bash

# Generate launch storyboard images from splash screen
# This script creates images for the LaunchStoryboard.imageset and updates the storyboard

SPLASH_SOURCE="res/screen/splash.png"
IMAGESET_DIR="platforms/ios/Mine Match/Assets.xcassets/LaunchStoryboard.imageset"
STORYBOARD_FILE="platforms/ios/Mine Match/CDVLaunchScreen.storyboard"
BACKGROUND_COLOR_FILE="platforms/ios/Mine Match/Assets.xcassets/SplashScreenBackgroundColor.colorset/Contents.json"

# Check if source image exists
if [ ! -f "$SPLASH_SOURCE" ]; then
    echo "Error: Splash image not found at $SPLASH_SOURCE"
    exit 1
fi

# Check if imageset directory exists
if [ ! -d "$IMAGESET_DIR" ]; then
    echo "Error: Imageset directory not found at $IMAGESET_DIR"
    echo "Make sure you've run 'cordova build ios' first"
    exit 1
fi

# Create a temporary directory for the images
mkdir -p temp_launch_images

# Generate a single 1024x1024 image (maintain aspect ratio, center on white background)
# iOS will scale this as needed for different devices
magick "$SPLASH_SOURCE" -resize 1024x1024 -gravity center -background white -extent 1024x1024 temp_launch_images/LaunchStoryboard.png

# Copy image to imageset
cp temp_launch_images/LaunchStoryboard.png "$IMAGESET_DIR/"

# Remove any old @2x and @3x images if they exist
rm -f "$IMAGESET_DIR/LaunchStoryboard@2x.png"
rm -f "$IMAGESET_DIR/LaunchStoryboard@3x.png"

# Generate simplified Contents.json with only the single image
cat > "$IMAGESET_DIR/Contents.json" << 'EOF'
{
  "images" : [
    {
      "filename" : "LaunchStoryboard.png",
      "idiom" : "universal"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
EOF

# Fix background color to be explicitly white (not system color)
if [ -f "$BACKGROUND_COLOR_FILE" ]; then
    cat > "$BACKGROUND_COLOR_FILE" << 'EOF'
{
  "colors": [
    {
      "idiom": "universal",
      "color": {
        "color-space": "srgb",
        "components": {
          "red": "1.000",
          "green": "1.000",
          "blue": "1.000",
          "alpha": "1.000"
        }
      }
    }
  ],
  "info": {
    "author": "Xcode",
    "version": 1
  }
}
EOF
    echo "Updated background color to white"
fi

# Update the storyboard to use scaleAspectFit and add proper centered constraints
if [ -f "$STORYBOARD_FILE" ]; then
    # Create a backup
    cp "$STORYBOARD_FILE" "$STORYBOARD_FILE.bak"
    
    # Use Python to properly update the storyboard
    python3 << 'PYTHON_SCRIPT'
import xml.etree.ElementTree as ET
import sys

storyboard_file = sys.argv[1]

try:
    tree = ET.parse(storyboard_file)
    root = tree.getroot()
    
    # Define namespace
    ns = {'ib': 'com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB'}
    
    # Find the imageView
    imageView = None
    for elem in root.iter():
        if elem.tag.endswith('imageView') and elem.get('id') == '2ns-9I-Qjs':
            imageView = elem
            break
    
    if imageView is not None:
        # Set contentMode to scaleAspectFit
        imageView.set('contentMode', 'scaleAspectFit')
        print("Updated imageView to scaleAspectFit")
    
    # Find the parent view
    parentView = None
    for elem in root.iter():
        if elem.tag.endswith('view') and elem.get('id') == 'Ze5-6b-2t3':
            parentView = elem
            break
    
    if parentView is not None:
        # Find or create constraints element
        constraints = None
        for child in parentView:
            if child.tag.endswith('constraints'):
                constraints = child
                break
        
        if constraints is None:
            # Create constraints element
            constraints = ET.SubElement(parentView, 'constraints')
        
        # Clear existing constraints
        constraints.clear()
        
        # Add simple centered constraints with fixed size (290x290 points)
        # This is a fixed size that won't interfere with the main app view
        # Center X
        centerX = ET.SubElement(constraints, 'constraint')
        centerX.set('firstItem', '2ns-9I-Qjs')
        centerX.set('firstAttribute', 'centerX')
        centerX.set('secondItem', 'Ze5-6b-2t3')
        centerX.set('secondAttribute', 'centerX')
        centerX.set('id', 'centerX-constraint')
        
        # Center Y
        centerY = ET.SubElement(constraints, 'constraint')
        centerY.set('firstItem', '2ns-9I-Qjs')
        centerY.set('firstAttribute', 'centerY')
        centerY.set('secondItem', 'Ze5-6b-2t3')
        centerY.set('secondAttribute', 'centerY')
        centerY.set('id', 'centerY-constraint')
        
        # Fixed width constraint (290 points - about 70% of iPhone width)
        width = ET.SubElement(constraints, 'constraint')
        width.set('firstItem', '2ns-9I-Qjs')
        width.set('firstAttribute', 'width')
        width.set('constant', '290')
        width.set('id', 'width-constraint')
        
        # Aspect ratio constraint (1:1)
        aspectRatio = ET.SubElement(constraints, 'constraint')
        aspectRatio.set('firstItem', '2ns-9I-Qjs')
        aspectRatio.set('firstAttribute', 'height')
        aspectRatio.set('secondItem', '2ns-9I-Qjs')
        aspectRatio.set('secondAttribute', 'width')
        aspectRatio.set('multiplier', '1:1')
        aspectRatio.set('id', 'aspect-ratio-constraint')
        
        print("Added centered constraints to storyboard")
    
    # Write the updated storyboard
    tree.write(storyboard_file, encoding='utf-8', xml_declaration=True)
    print("Storyboard updated successfully")
    
except Exception as e:
    print(f"Error updating storyboard: {e}")
    sys.exit(1)
PYTHON_SCRIPT
    "$STORYBOARD_FILE"
    
    if [ $? -ne 0 ]; then
        echo "Warning: Could not automatically update storyboard constraints"
        echo "You may need to manually center the image in Xcode"
    fi
fi

# Clean up
rm -rf temp_launch_images

echo "Launch storyboard images generated and storyboard updated"
