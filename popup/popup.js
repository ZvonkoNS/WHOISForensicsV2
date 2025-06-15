// Configuration - Loaded from environment variables during build
const CONFIG = {
  API_KEY: 'PLACEHOLDER_API_KEY', // Will be replaced during build
  API_BASE_URL: 'https://api.apilayer.com/whois/query',
  CACHE_DURATION_MS: 60 * 60 * 1000, // 1 hour
  MAX_RETRIES: 3,
  TIMEOUT_MS: 10000 // 10 seconds
};

document.addEventListener('DOMContentLoaded', function() {
  const generateReportBtn = document.getElementById('generateReport');
  const resultsDiv = document.getElementById('results');
  const domainSpan = document.getElementById('domain');
  let currentDomain = '';

  async function getFromCache(key) {
    try {
      const result = await chrome.storage.local.get(key);
      const cachedItem = result[key];
      if (cachedItem && (new Date().getTime() - cachedItem.timestamp < CONFIG.CACHE_DURATION_MS)) {
        console.log('Serving from cache:', key);
        return cachedItem.data;
      }
    } catch (e) {
      console.error('Error getting from cache', e);
    }
    return null;
  }

  async function setToCache(key, data) {
    try {
      const item = {
        data: data,
        timestamp: new Date().getTime()
      };
      await chrome.storage.local.set({ [key]: item });
    } catch (e) {
      console.error('Error setting to cache', e);
    }
  }

  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const url = new URL(tabs[0].url);
    currentDomain = url.hostname;
    domainSpan.textContent = currentDomain;
  });

  // Input validation and sanitization
  function validateDomain(domain) {
    if (!domain || typeof domain !== 'string') {
      throw new Error('Invalid domain: must be a non-empty string');
    }
    
    // Remove any potentially dangerous characters
    const sanitizedDomain = domain.trim().toLowerCase();
    
    // Basic domain validation regex
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    
    if (!domainRegex.test(sanitizedDomain)) {
      throw new Error('Invalid domain format');
    }
    
    if (sanitizedDomain.length > 253) {
      throw new Error('Domain name too long');
    }
    
    return sanitizedDomain;
  }

  async function fetchWhoisData(domain) {
    try {
      domain = validateDomain(domain);
    } catch (error) {
      console.error('Domain validation failed:', error.message);
      return {
        domain: {
          "Error": error.message,
          "Domain Name": domain || 'Invalid',
          "Status": "Validation Failed"
        }
      };
    }

    const cacheKey = `whois-${domain}`;
    const cachedData = await getFromCache(cacheKey);
    if (cachedData) return cachedData;

    console.log(`🔍 Starting WHOIS lookup for: ${domain}`);

    // APILayer WHOIS API - Professional and reliable service
    
    try {
        console.log('🔄 Using APILayer WHOIS API...');
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);
        
        const response = await fetch(`${CONFIG.API_BASE_URL}?domain=${encodeURIComponent(domain)}`, {
            method: 'GET',
            headers: {
                'apikey': CONFIG.API_KEY,
                'Accept': 'application/json',
                'User-Agent': 'ForensicsWHOIS/1.0'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            console.log('📊 APILayer WHOIS response:', data);
            
            if (data && !data.error && data.result) {
                const result = data.result;
                
                // Sanitize all string values to prevent XSS
                const sanitizeString = (str) => {
                    if (typeof str !== 'string') return str;
                    return str.replace(/[<>'"&]/g, (char) => {
                        const entities = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' };
                        return entities[char] || char;
                    });
                };
                
                const normalizedData = {
                    domain: {
                        "Domain Name": sanitizeString(result.domain_name) || domain,
                        "Registrar": sanitizeString(result.registrar_name) || 'Unknown',
                        "Creation Date": sanitizeString(result.creation_date) || 'Unknown',
                        "Registry Expiry Date": sanitizeString(result.expiration_date) || 'Unknown',
                        "Updated Date": sanitizeString(result.updated_date) || 'Unknown',
                        "Status": Array.isArray(result.status) ? result.status.map(sanitizeString).join(', ') : sanitizeString(result.status) || 'Unknown',
                        "Name Server": Array.isArray(result.name_servers) ? result.name_servers.map(sanitizeString).join(', ') : 'Unknown',
                        "Registrant Name": sanitizeString(result.registrant_name) || 'Private',
                        "Registrant Organization": sanitizeString(result.registrant_organization) || 'Private',
                        "Registrant Country": sanitizeString(result.registrant_country) || 'Private',
                        "Registrant Email": sanitizeString(result.registrant_email) || 'Private',
                        "Admin Name": sanitizeString(result.admin_name) || 'Private',
                        "Admin Email": sanitizeString(result.admin_email) || 'Private',
                        "Tech Name": sanitizeString(result.tech_name) || 'Private',
                        "Tech Email": sanitizeString(result.tech_email) || 'Private',
                        "Source": "APILayer WHOIS API"
                    }
                };
                
                await setToCache(cacheKey, normalizedData);
                console.log('✅ Success with APILayer WHOIS API');
                return normalizedData;
            } else if (data && data.error) {
                console.error('❌ APILayer API error:', sanitizeString(data.error));
                throw new Error(`API Error: ${data.error}`);
            } else {
                throw new Error('Invalid API response format');
            }
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.log('❌ APILayer WHOIS API failed:', error.message);
    }

    // Fallback to RDAP for official registry data
    console.log('🔄 Trying RDAP as fallback...');
    try {
        const tld = domain.split('.').pop().toLowerCase();
        
        // Key RDAP servers for major TLDs
        const rdapServers = {
            'com': 'https://rdap.verisign.com/com/v1/domain/',
            'net': 'https://rdap.verisign.com/net/v1/domain/',
            'org': 'https://rdap.publicinterestregistry.org/rdap/domain/',
            'info': 'https://rdap.afilias.net/rdap/v1/domain/',
            'biz': 'https://rdap.afilias.net/rdap/v1/domain/',
            'us': 'https://rdap.nic.us/rdap/domain/',
            'uk': 'https://rdap.nominet.uk/uk/domain/',
            'ca': 'https://rdap.ca/rdap/domain/',
            'au': 'https://rdap.audns.net.au/au/domain/',
            'de': 'https://rdap.denic.de/domain/',
            'fr': 'https://rdap.nic.fr/domain/',
            'it': 'https://rdap.nic.it/domain/',
            'nl': 'https://rdap.sidn.nl/domain/',
            'be': 'https://rdap.dns.be/domain/',
            'ch': 'https://rdap.nic.ch/domain/',
            'at': 'https://rdap.nic.at/domain/',
            'se': 'https://rdap.internetstiftelsen.se/domain/',
            'no': 'https://rdap.norid.no/domain/',
            'dk': 'https://rdap.dk-hostmaster.dk/domain/',
            'fi': 'https://rdap.ficora.fi/domain/',
            'pl': 'https://rdap.dns.pl/domain/',
            'cz': 'https://rdap.nic.cz/domain/',
            'jp': 'https://rdap.jprs.jp/domain/',
            'kr': 'https://rdap.kr/domain/',
            'cn': 'https://rdap.cnnic.cn/domain/',
            'in': 'https://rdap.registry.in/domain/',
            'br': 'https://rdap.registro.br/domain/',
            'mx': 'https://rdap.mx/domain/',
            'ru': 'https://rdap.tcinet.ru/domain/',
            'nz': 'https://rdap.srs.net.nz/domain/'
        };

        const rdapServer = rdapServers[tld];
        if (rdapServer) {
            const rdapResponse = await fetch(`${rdapServer}${domain}`, {
                headers: {
                    'Accept': 'application/rdap+json',
                    'User-Agent': 'ForensicsWHOIS/1.0'
                }
            });
            
            if (rdapResponse.ok) {
                const rdapData = await rdapResponse.json();
                console.log(`📊 RDAP response for .${tld}:`, rdapData);
                
                if (rdapData && rdapData.ldhName) {
                    const normalizedData = {
                        domain: {
                            "Domain Name": rdapData.ldhName,
                            "Status": rdapData.status ? rdapData.status.join(', ') : 'Unknown',
                            "Creation Date": rdapData.events?.find(e => e.eventAction === 'registration')?.eventDate || 'Unknown',
                            "Registry Expiry Date": rdapData.events?.find(e => e.eventAction === 'expiration')?.eventDate || 'Unknown',
                            "Updated Date": rdapData.events?.find(e => e.eventAction === 'last changed')?.eventDate || 'Unknown',
                            "Name Server": rdapData.nameservers ? rdapData.nameservers.map(ns => ns.ldhName).join(', ') : 'Unknown',
                            "Registrar": rdapData.entities?.find(e => e.roles?.includes('registrar'))?.vcardArray?.[1]?.find(v => v[0] === 'fn')?.[3] || 'Unknown',
                            "Source": `RDAP (${tld.toUpperCase()} Registry)`
                        }
                    };
                    await setToCache(cacheKey, normalizedData);
                    console.log(`✅ Success with RDAP for .${tld}`);
                    return normalizedData;
                }
            } else {
                console.log(`❌ RDAP server for .${tld} returned: ${rdapResponse.status}`);
            }
        } else {
            console.log(`⚠️ No RDAP server configured for .${tld} TLD`);
        }
    } catch (error) {
        console.log('❌ RDAP lookup failed:', error.message);
    }

    // Final fallback: Enhanced Domain Analysis
    console.log('⚠️ All WHOIS services failed, using enhanced domain analysis...');
    const domainParts = domain.split('.');
    const tld = domainParts.pop();
    const sld = domainParts.join('.');
    
    const tldInfo = getTldInfo(tld);
    
    const enhancedData = {
        domain: {
            "Domain Name": domain,
            "Second Level Domain": sld,
            "Top Level Domain": tld.toUpperCase(),
            "TLD Type": tldInfo.type,
            "TLD Description": tldInfo.description,
            "Domain Length": domain.length,
            "Subdomain Count": domainParts.length - 1,
            "Analysis": "Enhanced domain structure analysis",
            "Note": "WHOIS services temporarily unavailable - showing domain structure analysis",
            "Recommendation": "Try again later for full WHOIS data",
            "Status": "Analysis Complete"
        }
    };
    
    await setToCache(cacheKey, enhancedData);
    console.log('✅ Using enhanced domain analysis as final fallback');
    return enhancedData;
  }

  function getTldInfo(tld) {
    const tldDatabase = {
        'com': { type: 'Generic TLD', description: 'Commercial organizations' },
        'org': { type: 'Generic TLD', description: 'Non-profit organizations' },
        'net': { type: 'Generic TLD', description: 'Network infrastructure' },
        'edu': { type: 'Sponsored TLD', description: 'Educational institutions' },
        'gov': { type: 'Sponsored TLD', description: 'US Government' },
        'mil': { type: 'Sponsored TLD', description: 'US Military' },
        'int': { type: 'Sponsored TLD', description: 'International organizations' },
        'io': { type: 'ccTLD', description: 'British Indian Ocean Territory' },
        'ai': { type: 'ccTLD', description: 'Anguilla' },
        'co': { type: 'ccTLD', description: 'Colombia' },
        'me': { type: 'ccTLD', description: 'Montenegro' },
        'tv': { type: 'ccTLD', description: 'Tuvalu' },
        'ly': { type: 'ccTLD', description: 'Libya' },
        'us': { type: 'ccTLD', description: 'United States' },
        'uk': { type: 'ccTLD', description: 'United Kingdom' },
        'ca': { type: 'ccTLD', description: 'Canada' },
        'au': { type: 'ccTLD', description: 'Australia' },
        'de': { type: 'ccTLD', description: 'Germany' },
        'fr': { type: 'ccTLD', description: 'France' },
        'jp': { type: 'ccTLD', description: 'Japan' },
        'cn': { type: 'ccTLD', description: 'China' },
        'ru': { type: 'ccTLD', description: 'Russia' },
        'br': { type: 'ccTLD', description: 'Brazil' },
        'in': { type: 'ccTLD', description: 'India' }
    };
    
    return tldDatabase[tld.toLowerCase()] || { type: 'Unknown TLD', description: 'Unknown top-level domain' };
  }

  async function fetchDnsData(domain) {
    const cacheKey = `dns-${domain}`;
    const cachedData = await getFromCache(cacheKey);
    if (cachedData) return cachedData;

    try {
      const response = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
      const data = await response.json();
      await setToCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching DNS data:', error);
      return null;
    }
  }

  async function fetchReverseDnsData(ip) {
    const cacheKey = `rdns-${ip}`;
    const cachedData = await getFromCache(cacheKey);
    if (cachedData) return cachedData;

    try {
      // Convert IP to arpa format
      const reverseIp = ip.split('.').reverse().join('.') + '.in-addr.arpa';
      const response = await fetch(`https://dns.google/resolve?name=${reverseIp}&type=PTR`);
      const data = await response.json();
      await setToCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching Reverse DNS data:', error);
      return null;
    }
  }

  async function fetchSslData(domain) {
    const cacheKey = `ssl-${domain}`;
    const cachedData = await getFromCache(cacheKey);
    if (cachedData) return cachedData;

    try {
      const response = await fetch(`https://crt.sh/?q=${domain}&output=json`);
      const data = await response.json();
      await setToCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching SSL data:', error);
      return null;
    }
  }

  function displayWhoisData(data) {
    let content = '<div class="section"><h2>WHOIS Information</h2><div class="section-content">';
    if (data && data.domain) {
      for (const [key, value] of Object.entries(data.domain)) {
        if (Array.isArray(value)) {
          value.forEach(item => {
            content += `<div class="data-row">
              <div class="data-label">${key}</div>
              <div class="data-value">${item}</div>
            </div>`;
          });
        } else {
          content += `<div class="data-row">
            <div class="data-label">${key}</div>
            <div class="data-value">${value}</div>
          </div>`;
        }
      }
    } else if (data && data.error) {
      content += `<div class="data-row">
        <div class="data-label">Error</div>
        <div class="data-value">Could not retrieve WHOIS data: ${data.error}</div>
      </div>`;
    } else {
      content += `<div class="data-row">
        <div class="data-label">Status</div>
        <div class="data-value">No WHOIS data found. The API might be temporarily unavailable or the domain has no record.</div>
      </div>`;
    }
    content += '</div></div>';
    return content;
  }

  function displaySslData(data) {
    let content = '<div class="section"><h2>SSL Certificate Information</h2><div class="section-content">';
    if (data && data.length > 0) {
      // Displaying info for the most recent certificate
      const cert = data[data.length - 1];
      content += `<div class="data-row">
        <div class="data-label">Common Name</div>
        <div class="data-value">${cert.common_name}</div>
      </div>`;
      content += `<div class="data-row">
        <div class="data-label">Issuer</div>
        <div class="data-value">${cert.issuer_name}</div>
      </div>`;
      content += `<div class="data-row">
        <div class="data-label">Not Before</div>
        <div class="data-value">${cert.not_before}</div>
      </div>`;
      content += `<div class="data-row">
        <div class="data-label">Not After</div>
        <div class="data-value">${cert.not_after}</div>
      </div>`;
    } else {
      content += `<div class="data-row">
        <div class="data-label">Status</div>
        <div class="data-value">No SSL certificate information found.</div>
      </div>`;
    }
    content += '</div></div>';
    return content;
  }

  function displayDnsData(data) {
    let content = '<div class="section"><h2>DNS Information</h2><div class="section-content">';
    if (data && data.Answer) {
      data.Answer.forEach(record => {
        if (record.type === 1) { // A record
          content += `<div class="data-row">
            <div class="data-label">Type A Record</div>
            <div class="data-value">${record.data}</div>
          </div>`;
        }
      });
    } else {
      content += `<div class="data-row">
        <div class="data-label">Status</div>
        <div class="data-value">No A records found.</div>
      </div>`;
    }
    content += '</div></div>';
    return content;
  }

  function displayReverseDnsData(data, ip) {
    let content = `<div class="section"><h2>Reverse DNS for ${ip}</h2><div class="section-content">`;
    if (data && data.Answer) {
      data.Answer.forEach(record => {
         if (record.type === 12) { // PTR record
           content += `<div class="data-row">
             <div class="data-label">Hostname</div>
             <div class="data-value">${record.data}</div>
           </div>`;
         }
      });
    } else {
      content += `<div class="data-row">
        <div class="data-label">Status</div>
        <div class="data-value">No PTR records found.</div>
      </div>`;
    }
    content += '</div></div>';
    return content;
  }

  function displayMetadata(data) {
    let content = '<div class="section"><h2>Metadata</h2><div class="section-content">';
    if (data && Object.keys(data).length > 0) {
      for (const [key, value] of Object.entries(data)) {
        content += `<div class="data-row">
          <div class="data-label">${key}</div>
          <div class="data-value">${value}</div>
        </div>`;
      }
    } else {
      content += `<div class="data-row">
        <div class="data-label">Status</div>
        <div class="data-value">No metadata found.</div>
      </div>`;
    }
    content += '</div></div>';
    return content;
  }

  function displayArtifacts(data) {
    let content = '<div class="section"><h2>Artifacts</h2><div class="section-content">';
    if (data) {
      content += `<div class="data-row">
        <div class="data-label">Cookies</div>
        <div class="data-value">${data.cookies || 'No cookies found.'}</div>
      </div>`;
      
      if (data.localStorage && Object.keys(data.localStorage).length > 0) {
        for (const [key, value] of Object.entries(data.localStorage)) {
          content += `<div class="data-row">
            <div class="data-label">Local Storage: ${key}</div>
            <div class="data-value">${value}</div>
          </div>`;
        }
      } else {
        content += `<div class="data-row">
          <div class="data-label">Local Storage</div>
          <div class="data-value">No local storage data.</div>
        </div>`;
      }
      
      if (data.sessionStorage && Object.keys(data.sessionStorage).length > 0) {
        for (const [key, value] of Object.entries(data.sessionStorage)) {
          content += `<div class="data-row">
            <div class="data-label">Session Storage: ${key}</div>
            <div class="data-value">${value}</div>
          </div>`;
        }
      } else {
        content += `<div class="data-row">
          <div class="data-label">Session Storage</div>
          <div class="data-value">No session storage data.</div>
        </div>`;
      }
    } else {
      content += `<div class="data-row">
        <div class="data-label">Status</div>
        <div class="data-value">No artifacts found.</div>
      </div>`;
    }
    content += '</div></div>';
    return content;
  }

  // Refactored main logic
  generateReportBtn.addEventListener('click', async function() {
    // Add loading state
    generateReportBtn.classList.add('loading');
    generateReportBtn.disabled = true;
    
    // Update status indicator
    const statusTextEl = document.querySelector('.status-text');
    const statusDotEl = document.querySelector('.status-dot');
    statusTextEl.textContent = 'Analyzing...';
    statusDotEl.style.background = 'var(--warning)';
    
    resultsDiv.innerHTML = '<div class="section"><h2>Gathering Information</h2><div class="section-content"><div class="data-row"><div class="data-label">Status</div><div class="data-value">Please wait while we collect forensic data...</div></div></div></div>';
    const downloadBtn = document.getElementById('downloadReport');
    downloadBtn.style.display = 'none';
    
    // Wrap the content script execution and message listening in a Promise
    const forensicsPromise = new Promise((resolve) => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.scripting.executeScript({
                target: {tabId: tabs[0].id},
                files: ['scripts/content.js']
            });
        });

        chrome.runtime.onMessage.addListener(function listener(request, sender, sendResponse) {
            if (request.type === 'forensicsData') {
                const metadataContent = displayMetadata(request.metadata);
                const artifactsContent = displayArtifacts(request.artifacts);
                chrome.runtime.onMessage.removeListener(listener); // Clean up the listener
                resolve({ metadataContent, artifactsContent });
            }
        });
    });

    // WHOIS
    const whoisData = await fetchWhoisData(currentDomain);
    let finalContent = displayWhoisData(whoisData);

    // SSL
    const sslData = await fetchSslData(currentDomain);
    finalContent += displaySslData(sslData);

    // DNS
    const dnsData = await fetchDnsData(currentDomain);
    finalContent += displayDnsData(dnsData);

    // Reverse DNS
    if (dnsData && dnsData.Answer) {
        for (const record of dnsData.Answer) {
            if (record.type === 1) { // A record
                const reverseDnsData = await fetchReverseDnsData(record.data);
                finalContent += displayReverseDnsData(reverseDnsData, record.data);
            }
        }
    }

    const { metadataContent, artifactsContent } = await forensicsPromise;
    finalContent += metadataContent;
    finalContent += artifactsContent;

    resultsDiv.innerHTML = finalContent;
    
    // Add collapsible functionality to sections
    document.querySelectorAll('.section h2').forEach(header => {
      header.addEventListener('click', function() {
        this.parentElement.classList.toggle('collapsed');
      });
    });

    // Prepare text content for PDF
    const reportTextForPdf = resultsDiv.innerText;

    // Remove loading state
    generateReportBtn.classList.remove('loading');
    generateReportBtn.disabled = false;
    
    // Update status indicator
    const statusTextComplete = document.querySelector('.status-text');
    const statusDotComplete = document.querySelector('.status-dot');
    statusTextComplete.textContent = 'Complete';
    statusDotComplete.style.background = 'var(--success)';

    // Show download button and attach PDF generation logic
    downloadBtn.style.display = 'block';
    downloadBtn.onclick = function() {
        // Pass the actual results div instead of just text content
        generatePdf(reportTextForPdf, resultsDiv);
    };
  });

  function generatePdf(textContent, resultsElement) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // PDF settings
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    let yPosition = margin;
    
    // Generate Hash of the content
    const hash = CryptoJS.SHA256(textContent).toString(CryptoJS.enc.Hex);
    const timestamp = new Date().toLocaleString();
    
    // Company information
    const companyInfo = {
      name: 'Next Sight',
      website: 'www.next-sight.com',
      email: 'info@next-sight.com',
      product: 'ForensicsWHOIS'
    };
    
    // Helper function to add new page if needed
    function checkPageBreak(neededHeight = 10) {
      if (yPosition + neededHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    }
    
    // Helper function to add text with word wrapping
    function addText(text, fontSize = 10, isBold = false) {
      doc.setFontSize(fontSize);
      if (isBold) {
        doc.setFont(undefined, 'bold');
      } else {
        doc.setFont(undefined, 'normal');
      }
      
      const splitText = doc.splitTextToSize(text, maxWidth);
      const textHeight = splitText.length * (fontSize * 0.35);
      
      checkPageBreak(textHeight + 5);
      
      doc.text(splitText, margin, yPosition);
      yPosition += textHeight + 5;
    }
    
    // Helper function to add section header
    function addSectionHeader(title) {
      checkPageBreak(20);
      yPosition += 5; // Extra space before section
      addText(title, 14, true);
      yPosition += 3; // Space after header
    }
    
    // Add company header with logo space
    function addCompanyHeader() {
      // Reserve space for logo (we'll add it as text since we can't easily embed SVG)
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('NEXT SIGHT', margin, yPosition);
      yPosition += 15;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(companyInfo.website, margin, yPosition);
      doc.text(companyInfo.email, margin + 60, yPosition);
      yPosition += 20;
      
      // Add a line separator
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 15;
    }
    
    // Add company footer to each page
    function addCompanyFooter(pageNum, totalPages) {
      const footerY = pageHeight - 20;
      
      // Company info on left
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(`${companyInfo.name} | ${companyInfo.website} | ${companyInfo.email}`, margin, footerY);
      
      // Page number on right
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin - 30, footerY);
      
      // Product name in center
      const centerX = pageWidth / 2;
      const productText = `${companyInfo.product} Report`;
      const textWidth = doc.getTextWidth(productText);
      doc.text(productText, centerX - (textWidth / 2), footerY);
      
      // Add line above footer
      doc.setLineWidth(0.3);
      doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    }
    
    // Company Header
    addCompanyHeader();
    
    // Title and Header
    addText('FORENSICS WHOIS REPORT', 16, true);
    addText(`Domain: ${currentDomain}`, 12, true);
    addText(`Generated: ${timestamp}`, 10);
    addText(`Report Hash (SHA-256): ${hash}`, 8);
    yPosition += 10;
    
    // Parse the HTML content to extract structured data
    const tempDiv = document.createElement('div');
    // Use the passed resultsElement or fall back to the global one
    const sourceElement = resultsElement || document.getElementById('results');
    tempDiv.innerHTML = sourceElement.innerHTML;
    
    // Debug: Check if we have content
    console.log('PDF Generation - Source HTML:', sourceElement.innerHTML);
    console.log('PDF Generation - Sections found:', tempDiv.querySelectorAll('.section').length);
    
    // Process each section
    const sections = tempDiv.querySelectorAll('.section');
    sections.forEach(section => {
      const header = section.querySelector('h2');
      const content = section.querySelector('.section-content');
      
      if (header) {
        addSectionHeader(header.textContent);
      }
      
      if (content) {
        // Process data rows (our new structure)
        const dataRows = content.querySelectorAll('.data-row');
        
        if (dataRows.length > 0) {
          // Process structured data rows
          dataRows.forEach(row => {
            const label = row.querySelector('.data-label');
            const value = row.querySelector('.data-value');
            
            if (label && value) {
              const labelText = label.textContent.trim();
              const valueText = value.textContent.trim();
              
              if (labelText && valueText) {
                addText(`${labelText}: ${valueText}`, 9);
              }
            }
          });
        } else {
          // Fallback: Process paragraphs and other elements
          const paragraphs = content.querySelectorAll('p');
          const subHeaders = content.querySelectorAll('h3');
          
          // Handle mixed content (p and h3 elements)
          const allElements = Array.from(content.children);
          
          allElements.forEach(element => {
            if (element.tagName === 'H3') {
              yPosition += 3;
              addText(element.textContent, 11, true);
            } else if (element.tagName === 'P') {
              const text = element.textContent.trim();
              if (text) {
                // Check if it's a key-value pair
                if (text.includes(':')) {
                  const parts = text.split(':');
                  if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join(':').trim();
                    addText(`${key}: ${value}`, 9);
                  } else {
                    addText(text, 9);
                  }
                } else {
                  addText(text, 9);
                }
              }
            } else if (element.textContent.trim()) {
              // Handle any other elements with text content
              addText(element.textContent.trim(), 9);
            }
          });
          
          // If no structured content, fall back to text content
          if (allElements.length === 0 && content.textContent.trim()) {
            const lines = content.textContent.trim().split('\n');
            lines.forEach(line => {
              const trimmedLine = line.trim();
              if (trimmedLine) {
                addText(trimmedLine, 9);
              }
            });
          }
        }
      }
      
      yPosition += 8; // Space between sections
    });
    
    // Fallback: If no sections were processed, try to extract from text content
    if (sections.length === 0) {
      addSectionHeader('Report Data');
      const lines = textContent.split('\n');
      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && trimmedLine.length > 0) {
          addText(trimmedLine, 9);
        }
      });
    }
    
    // Add company footers to all pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addCompanyFooter(i, totalPages);
    }
    
    // Save the PDF
    doc.save(`ForensicsWHOIS-Report-${currentDomain}-${new Date().toISOString().split('T')[0]}.pdf`);
  }
});
