const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const GIT_OPTS = {
	cwd: PROJECT_ROOT,
	encoding: 'utf8',
	stdio: ['pipe', 'pipe', 'pipe'],
	maxBuffer: 10 * 1024 * 1024,
};

const CONFIG_FILE = path.join(PROJECT_ROOT, 'changelog-config.json');
const CHANGELOG_FILE = path.join(PROJECT_ROOT, 'changelog.txt');
const CONFIG_JS_FILE = path.join(PROJECT_ROOT, 'src/js/config.js');

function tryGit(args) {
	try {
		return execSync(args, GIT_OPTS).trim();
	} catch {
		return null;
	}
}

// Read version and build from config.js
const configJsContent = fs.readFileSync(CONFIG_JS_FILE, 'utf8');
const versionMatch = configJsContent.match(/version:\s*"([^"]+)"/);
const buildMatch = configJsContent.match(/build:\s*(\d+)/);
const version = versionMatch ? versionMatch[1] : 'unknown';
const build = buildMatch ? buildMatch[1] : 'unknown';

// Ensure the config file exists
if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ lastCommit: '' }));
}

// Read the last processed commit
const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));

// Need a real git repo with at least one commit (new clones / no git / empty repo: skip)
const currentCommit = tryGit('git rev-parse HEAD');
if (!currentCommit) {
	console.log('Changelog: skipping (no git repository or no commits yet).');
	process.exit(0);
}

// If we've already processed this commit, exit
if (config.lastCommit === currentCommit) {
	console.log('No new commits to process');
	process.exit(0);
}

// Get git log from last processed commit to current with full message and author
const range = config.lastCommit ? `${config.lastCommit}..HEAD` : 'HEAD';
const execCmd = `git log ${range} --pretty=format:"%h|%ad|%an|%B" --date=short`;
console.log('EXEC: ', execCmd);
let gitLog = tryGit(execCmd);
if (gitLog === null && config.lastCommit) {
	console.warn(
		'Changelog: could not read git range (wrong or missing lastCommit in changelog-config.json). Resetting tracker to current HEAD.'
	);
	fs.writeFileSync(CONFIG_FILE, JSON.stringify({ lastCommit: currentCommit }));
	process.exit(0);
}
if (gitLog === null) {
	console.warn('Changelog: git log failed; skipping.');
	process.exit(0);
}

// Parse the log entries and filter out merge commits and version bumps
const entries = gitLog.split('\n')
    .reduce((acc, line) => {
        if (line.trim() === '') return acc;
        
        // Check if this is a new commit entry
        if (line.includes('|')) {
            const [hash, date, author, ...messageParts] = line.split('|');
            if (author)
            {
                acc.push({
                    hash: hash.trim(),
                    date: date.trim(),
                    author: author.trim(),
                    message: messageParts.join('|').trim()
                });
    
            }
        } else if (acc.length > 0) {
            // Append to the last message if it's a continuation
            acc[acc.length - 1].message += '\n' + line.trim();
        }
        return acc;
    }, [])
    .filter(entry => {
        const lowerMessage = entry.message.toLowerCase();
        return !lowerMessage.startsWith('merge branch') && 
               !lowerMessage.startsWith('bump') &&
               !lowerMessage.includes('merge pull request');
    });

// Group entries by date
const groupedEntries = entries.reduce((acc, entry) => {
    if (!acc[entry.date]) {
        acc[entry.date] = [];
    }
    acc[entry.date].push(entry);
    return acc;
}, {});

// Generate changelog content
let changelogContent = `------- Version ${version} (Build ${build}) -------\n\n`;

const weekdayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' });

Object.entries(groupedEntries)
    .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
    .forEach(([date, entries]) => {
        let weekdayLabel = '';
        const parsedDate = new Date(`${date}T00:00:00Z`);
        if (!Number.isNaN(parsedDate.getTime())) {
            weekdayLabel = weekdayFormatter.format(parsedDate).toLowerCase();
        }
        const header = weekdayLabel ? `## ${date} (${weekdayLabel})` : `## ${date}`;
        changelogContent += `${header}\n`;
        entries.forEach(entry => {
            // Split message into lines and indent continuation lines
            const messageLines = entry.message.split('\n');
            const firstName = entry.author.split(' ')[0];
            changelogContent += `-  ${messageLines[0]} (${firstName})\n`;
            if (messageLines.length > 1) {
                messageLines.slice(1).forEach(line => {
                    if (line.trim()) {
                        changelogContent += `-  ${line}\n`;
                    }
                });
            }
        });
        changelogContent += '\n';
    });

// Read existing changelog
let existingContent = '';
if (fs.existsSync(CHANGELOG_FILE)) {
    existingContent = fs.readFileSync(CHANGELOG_FILE, 'utf8');
}

// Combine new entries with existing content
const finalContent = changelogContent + '\n' + existingContent;

// Write the updated changelog
fs.writeFileSync(CHANGELOG_FILE, finalContent);

// Update the config with the current commit
fs.writeFileSync(CONFIG_FILE, JSON.stringify({ lastCommit: currentCommit }));

console.log('Changelog updated successfully'); 