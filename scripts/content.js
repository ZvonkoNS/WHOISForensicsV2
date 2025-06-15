(function() {
  'use strict';
  
  // Sanitize string values to prevent XSS
  function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[<>'"&]/g, (char) => {
      const entities = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' };
      return entities[char] || char;
    });
  }

  // Safely extract metadata with size limits
  const metadata = {};
  try {
    document.querySelectorAll('meta').forEach(meta => {
      const name = meta.getAttribute('name') || meta.getAttribute('property');
      const content = meta.getAttribute('content');
      
      if (name && content && name.length < 100 && content.length < 1000) {
        metadata[sanitizeString(name)] = sanitizeString(content);
      }
    });
  } catch (error) {
    console.error('Error extracting metadata:', error);
  }

  // Safely extract artifacts with size limits
  const artifacts = {};
  
  try {
    // Limit cookie data size
    const cookieData = document.cookie;
    artifacts.cookies = cookieData.length > 5000 ? 'Cookie data too large (>5KB)' : sanitizeString(cookieData);
  } catch (error) {
    artifacts.cookies = 'Error accessing cookies';
  }

  try {
    // Safely extract localStorage with size limits
    const localStorageData = {};
    let totalSize = 0;
    for (let i = 0; i < localStorage.length && totalSize < 10000; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      if (key && value) {
        const keySize = key.length + value.length;
        if (totalSize + keySize < 10000) {
          localStorageData[sanitizeString(key)] = sanitizeString(value);
          totalSize += keySize;
        }
      }
    }
    artifacts.localStorage = localStorageData;
  } catch (error) {
    artifacts.localStorage = { error: 'Error accessing localStorage' };
  }

  try {
    // Safely extract sessionStorage with size limits
    const sessionStorageData = {};
    let totalSize = 0;
    for (let i = 0; i < sessionStorage.length && totalSize < 10000; i++) {
      const key = sessionStorage.key(i);
      const value = sessionStorage.getItem(key);
      if (key && value) {
        const keySize = key.length + value.length;
        if (totalSize + keySize < 10000) {
          sessionStorageData[sanitizeString(key)] = sanitizeString(value);
          totalSize += keySize;
        }
      }
    }
    artifacts.sessionStorage = sessionStorageData;
  } catch (error) {
    artifacts.sessionStorage = { error: 'Error accessing sessionStorage' };
  }

  // Send data with error handling
  try {
    chrome.runtime.sendMessage({
      type: 'forensicsData',
      metadata: metadata,
      artifacts: artifacts,
      timestamp: new Date().toISOString(),
      url: window.location.href
    });
  } catch (error) {
    console.error('Error sending forensics data:', error);
  }
})(); 