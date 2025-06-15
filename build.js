#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

const isDev = process.argv.includes('--dev');

console.log('🔨 Building ForensicsWHOIS Extension...');
console.log(`📦 Mode: ${isDev ? 'Development' : 'Production'}`);

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
fs.ensureDirSync(distDir);

// Copy all files except source files that need processing
const filesToCopy = [
  'icons',
  'libs',
  'styles',
  'scripts/background.js',
  'scripts/content.js',
  'popup/popup.html',
  'PRIVACY.md',
  'README.md'
];

console.log('📁 Copying static files...');
filesToCopy.forEach(file => {
  const srcPath = path.join(__dirname, file);
  const destPath = path.join(distDir, file);
  
  if (fs.existsSync(srcPath)) {
    fs.copySync(srcPath, destPath);
    console.log(`✅ Copied: ${file}`);
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

// Process manifest.json with environment variables
console.log('⚙️  Processing manifest.json...');
const manifestPath = path.join(__dirname, 'manifest.json');
const manifestContent = fs.readJsonSync(manifestPath);

// Update version for production builds
if (!isDev) {
  const now = new Date();
  const buildNumber = now.getFullYear().toString().slice(-2) + 
                     (now.getMonth() + 1).toString().padStart(2, '0') + 
                     now.getDate().toString().padStart(2, '0');
  manifestContent.version = `1.0.${buildNumber}`;
}

fs.writeJsonSync(path.join(distDir, 'manifest.json'), manifestContent, { spaces: 2 });
console.log('✅ Processed: manifest.json');

// Process popup.js with environment variables
console.log('⚙️  Processing popup.js with environment variables...');
const popupJsPath = path.join(__dirname, 'popup/popup.js');
let popupJsContent = fs.readFileSync(popupJsPath, 'utf8');

// Get API key from environment
const apiKey = process.env.APILAYER_API_KEY;
const apiTimeoutMs = process.env.API_TIMEOUT_MS || '10000';
const cacheDurationHours = process.env.CACHE_DURATION_HOURS || '1';

if (!apiKey || apiKey === 'your_api_key_here') {
  console.error('❌ ERROR: APILAYER_API_KEY not found in environment variables!');
  console.error('📝 Please create a .env file with your API key:');
  console.error('   APILAYER_API_KEY=your_actual_api_key_here');
  process.exit(1);
}

// Replace the configuration object with environment variables
const configReplacement = `// Configuration - Loaded from environment variables during build
const CONFIG = {
  API_KEY: '${apiKey}',
  API_BASE_URL: 'https://api.apilayer.com/whois/query',
  CACHE_DURATION_MS: ${parseInt(cacheDurationHours) * 60 * 60 * 1000}, // ${cacheDurationHours} hour(s)
  MAX_RETRIES: 3,
  TIMEOUT_MS: ${parseInt(apiTimeoutMs)} // ${parseInt(apiTimeoutMs) / 1000} seconds
};`;

// Replace the CONFIG object in the file
const configRegex = /\/\/ Configuration[\s\S]*?};/;
popupJsContent = popupJsContent.replace(configRegex, configReplacement);

// Ensure popup directory exists in dist
fs.ensureDirSync(path.join(distDir, 'popup'));
fs.writeFileSync(path.join(distDir, 'popup/popup.js'), popupJsContent);
console.log('✅ Processed: popup.js with API key injection');

// Create .gitignore if it doesn't exist
const gitignorePath = path.join(__dirname, '.gitignore');
if (!fs.existsSync(gitignorePath)) {
  console.log('📝 Creating .gitignore...');
  const gitignoreContent = `# Environment variables
.env

# Build output
dist/

# Node modules
node_modules/

# OS generated files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo

# Logs
*.log
npm-debug.log*
`;
  fs.writeFileSync(gitignorePath, gitignoreContent);
  console.log('✅ Created: .gitignore');
}

console.log('🎉 Build completed successfully!');
console.log(`📦 Extension built in: ${distDir}`);
console.log('🚀 Load the extension from the dist/ folder in Chrome');

if (isDev) {
  console.log('🔧 Development build - API key visible in source');
} else {
  console.log('🔒 Production build - API key securely injected');
} 