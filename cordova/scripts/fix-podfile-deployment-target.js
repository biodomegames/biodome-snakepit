#!/usr/bin/env node

/**
 * Cordova hook to automatically add post_install block to Podfile
 * This fixes deployment target warnings by forcing all pods to use iOS 12.0
 */

const fs = require('fs');
const path = require('path');

const PODFILE_PATH = path.join(__dirname, '..', 'platforms', 'ios', 'Podfile');
const POST_INSTALL_BLOCK = `
# Fix deployment target warnings - forces all pods to use iOS 12.0 minimum
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '12.0'
    end
  end
end
`;

module.exports = function(context) {
  const podfilePath = PODFILE_PATH;
  
  // Check if Podfile exists
  if (!fs.existsSync(podfilePath)) {
    console.log('Podfile not found, skipping deployment target fix');
    return;
  }

  // Read the Podfile
  let podfileContent = fs.readFileSync(podfilePath, 'utf8');

  // Check if post_install block already exists
  if (podfileContent.includes('post_install do |installer|')) {
    console.log('Podfile already has post_install block, skipping');
    return;
  }

  // Add the post_install block at the end
  podfileContent = podfileContent.trim() + POST_INSTALL_BLOCK;
  
  // Write back to file
  fs.writeFileSync(podfilePath, podfileContent, 'utf8');
  console.log('Added post_install block to Podfile to fix deployment target warnings');
};

// If run directly (for testing)
if (require.main === module) {
  module.exports({});
}


