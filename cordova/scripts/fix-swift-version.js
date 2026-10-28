#!/usr/bin/env node

/**
 * Cordova hook to automatically set SWIFT_VERSION in Xcode project
 * This fixes Swift version unsupported errors
 */

const fs = require('fs');
const path = require('path');

module.exports = function(context) {
  const projectRoot = context.opts.projectRoot || context.opts.cordova.project.root;
  const projectPbxprojPath = path.join(projectRoot, 'platforms', 'ios', 'Mine Match.xcodeproj', 'project.pbxproj');
  
  // Check if project file exists
  if (!fs.existsSync(projectPbxprojPath)) {
    console.log('Xcode project file not found, skipping Swift version fix');
    return;
  }

  // Read the project file
  let projectContent = fs.readFileSync(projectPbxprojPath, 'utf8');
  
  // Check if SWIFT_VERSION is already set in target build settings
  if (projectContent.includes('SWIFT_VERSION = 5.0')) {
    console.log('Swift version already set to 5.0, skipping');
    return;
  }

  // Find the target build settings sections (Debug and Release for "Mine Match" target)
  // These are identified by the target-specific build configuration IDs
  // Pattern: 1D6058940D05DD3E006BFB54 (Debug) and 1D6058950D05DD3E006BFB54 (Release)
  
  // Add SWIFT_VERSION to Debug configuration (before TARGETED_DEVICE_FAMILY)
  projectContent = projectContent.replace(
    /(SUPPORTS_MACCATALYST = YES;\s*)(TARGETED_DEVICE_FAMILY = "1,2";)/g,
    '$1SWIFT_VERSION = 5.0;\n\t\t\t\t$2'
  );

  // Write back to file
  fs.writeFileSync(projectPbxprojPath, projectContent, 'utf8');
  console.log('Added SWIFT_VERSION = 5.0 to Xcode project build settings');
};

// If run directly (for testing)
if (require.main === module) {
  module.exports({
    opts: {
      projectRoot: path.join(__dirname, '..')
    }
  });
}


