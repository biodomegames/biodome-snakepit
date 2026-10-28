const fs = require('fs-extra');
const path = require('path');

// Source and destination directories
const srcDir = path.join(__dirname, '..', 'src', 'js');
const destDir = path.join(__dirname, 'platforms', 'ios', 'www', 'js');

// Ensure destination directory exists
fs.ensureDirSync(destDir);

// Copy all JS files
fs.copySync(srcDir, destDir, {
    filter: (src) => {
        return src.endsWith('.js');
    }
});

console.log('JavaScript files copied successfully!'); 