# ForensicsWHOIS Browser Extension

A professional browser extension for law enforcement and security professionals to gather comprehensive forensic information about websites.

## 🔍 Features

- **WHOIS Data**: Comprehensive domain registration information
- **DNS Records**: A records, reverse DNS lookups
- **SSL Certificates**: Certificate details and validation
- **Website Metadata**: Meta tags, titles, descriptions
- **Digital Artifacts**: Cookies, localStorage, sessionStorage
- **PDF Reports**: Professional forensic reports with integrity hashing
- **Caching**: Intelligent caching to prevent rate limiting

## 🛡️ Security Features

- **Input Validation**: All inputs are validated and sanitized
- **XSS Prevention**: All data is sanitized to prevent cross-site scripting
- **Limited Permissions**: Minimal required permissions for security
- **Secure Communications**: HTTPS-only API communications
- **Data Integrity**: SHA-256 hashing for report verification
- **Local Storage**: All data stored locally, no external data transmission

## 📋 Requirements

- Chrome Browser (Manifest V3 compatible)
- APILayer WHOIS API key (for comprehensive WHOIS data)

## 🚀 Installation

### For Development:
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `ForensicsWHOIS` folder

### For Production:
Install from the Chrome Web Store (coming soon)

## 🔧 Configuration

The extension uses the APILayer WHOIS API for reliable WHOIS data. For production use:

1. Obtain an API key from [APILayer](https://apilayer.com/marketplace/whois-api)
2. Replace the API key in the configuration (see Security Considerations below)

## 🔒 Security Considerations

### API Key Security
**IMPORTANT**: The current implementation includes a demo API key in the source code. For production use:

1. **Option 1**: Use environment variables or build-time configuration
2. **Option 2**: Implement a proxy server to hide the API key
3. **Option 3**: Use Chrome's identity API for secure key management

### Data Privacy
- All data is processed locally in the browser
- No data is transmitted to external servers except for API calls
- Cached data is automatically expired after 1 hour
- Users can clear all data by reinstalling the extension

## 📊 API Services Used

- **APILayer WHOIS API**: Primary WHOIS data source
- **RDAP Servers**: Official registry data fallback
- **Google DNS**: DNS record lookups
- **crt.sh**: SSL certificate information

## 🏗️ Architecture

```
ForensicsWHOIS/
├── manifest.json          # Extension configuration
├── popup/
│   ├── popup.html         # Main UI
│   ├── popup.js           # Core logic
│   └── popup.css          # Styling
├── scripts/
│   ├── background.js      # Background service worker
│   └── content.js         # Content script for data extraction
├── libs/
│   ├── jspdf.umd.min.js   # PDF generation
│   └── crypto-js.min.js   # Cryptographic functions
├── icons/                 # Extension icons
├── styles/                # Additional styles
├── PRIVACY.md             # Privacy policy
└── README.md              # This file
```

## 🔍 Usage

1. Navigate to any website
2. Click the ForensicsWHOIS extension icon
3. Click "Generate Report" to gather forensic data
4. Review the collected information
5. Click "Download Report" to generate a PDF report

## 📝 Report Contents

The generated PDF report includes:
- **Header**: Domain, timestamp, and SHA-256 hash for integrity
- **WHOIS Information**: Registration details, contacts, dates
- **DNS Records**: A records and reverse DNS lookups
- **SSL Certificate**: Certificate details and validation
- **Metadata**: Website meta tags and information
- **Digital Artifacts**: Cookies and storage data

## 🛠️ Development

### Code Quality
- ESLint configuration for code quality
- Input validation and sanitization
- Error handling and logging
- Modular architecture

### Testing
- Test on various websites and domains
- Verify API rate limiting handling
- Check PDF generation with large datasets
- Validate security measures

## 📜 License

[Specify your license here]

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes with proper security measures
4. Add tests if applicable
5. Submit a pull request

## ⚠️ Legal Notice

This extension is designed for legitimate forensic and security research purposes. Users are responsible for:
- Complying with applicable laws and regulations
- Respecting website terms of service
- Using the tool ethically and responsibly
- Obtaining proper authorization when required

## 📞 Support

For support, bug reports, or feature requests:
- Create an issue on GitHub
- Contact: [Your Contact Information]

## 🔄 Changelog

### Version 1.0.0
- Initial release
- WHOIS data collection via APILayer API
- DNS and SSL certificate information
- PDF report generation with integrity hashing
- Comprehensive security measures
- Privacy-focused design 