# ForensicsWHOIS Build System

This document explains how to build the ForensicsWHOIS extension using environment variables for secure API key management.

## 🔧 Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)
- APILayer WHOIS API key

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Configure your API key:**
   Edit `.env` and replace `your_api_key_here` with your actual APILayer API key:
   ```
   APILAYER_API_KEY=your_actual_api_key_here
   ```

4. **Build the extension:**
   ```bash
   npm run build
   ```

5. **Load in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist/` folder

## 📁 Build Output

The build process creates a `dist/` directory containing:
- All extension files with API key securely injected
- Production-ready manifest with updated version
- Optimized and sanitized code

## 🔒 Security Features

### Environment Variables
- API keys are never stored in source code
- Build-time injection prevents runtime exposure
- `.env` file is automatically added to `.gitignore`

### Build Process Security
- Validates API key presence before building
- Sanitizes all configuration values
- Creates production-ready builds with security headers

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Production build with environment variables |
| `npm run dev` | Development build (API key visible in source) |
| `npm run clean` | Remove build artifacts |

## ⚙️ Configuration Options

Edit your `.env` file to customize:

```bash
# Required: Your APILayer API key
APILAYER_API_KEY=your_api_key_here

# Optional: API timeout in milliseconds (default: 10000)
API_TIMEOUT_MS=10000

# Optional: Cache duration in hours (default: 1)
CACHE_DURATION_HOURS=1
```

## 🔄 Development Workflow

### For Development
```bash
npm run dev
```
- Creates development build
- API key visible in source for debugging
- Faster build process

### For Production
```bash
npm run build
```
- Creates production build
- API key securely injected
- Optimized for distribution
- Auto-generates version numbers

## 📦 Distribution

### Chrome Web Store
1. Run `npm run build`
2. Zip the `dist/` folder
3. Upload to Chrome Web Store Developer Dashboard

### Manual Distribution
1. Run `npm run build`
2. Share the `dist/` folder
3. Users load as unpacked extension

## 🛡️ Security Best Practices

### API Key Management
- ✅ Use environment variables (this build system)
- ✅ Use a proxy server for additional security
- ✅ Rotate API keys regularly
- ❌ Never commit API keys to version control
- ❌ Never hardcode API keys in source

### Build Security
- The build system validates all inputs
- Sanitizes configuration values
- Creates secure production builds
- Automatically excludes sensitive files

## 🔍 Troubleshooting

### Build Fails: "API key not found"
- Ensure `.env` file exists in project root
- Check that `APILAYER_API_KEY` is set in `.env`
- Verify no extra spaces around the `=` sign

### Extension Not Loading
- Check Chrome Developer Tools console for errors
- Verify all files are present in `dist/` folder
- Ensure manifest.json is valid JSON

### API Calls Failing
- Verify API key is valid and active
- Check APILayer account quota/limits
- Review network connectivity

## 📝 File Structure

```
ForensicsWHOIS/
├── .env                 # Your environment variables (not in git)
├── .env.example         # Template for environment variables
├── .gitignore          # Excludes sensitive files
├── package.json        # Node.js dependencies and scripts
├── build.js            # Build system script
├── dist/               # Built extension (created by build)
├── popup/              # Extension popup source
├── scripts/            # Background and content scripts
├── styles/             # CSS files
├── icons/              # Extension icons
├── libs/               # Third-party libraries
└── BUILD.md           # This documentation
```

## 🆘 Support

If you encounter issues:
1. Check this documentation
2. Verify your `.env` configuration
3. Review the build output for error messages
4. Check Chrome extension developer tools

## 🔄 Version History

- **v1.0.0**: Initial build system with environment variables
- Automatic version numbering based on build date
- Production builds use format: `1.0.YYMMDD` 