<!-- PUPPETEER CONFIGURATION FOR CLOUD ENVIRONMENTS -->

# Puppeteer Configuration for Railway/Cloud Deployment

## Overview
When deploying Puppeteer to Railway or other cloud containers, you need to launch Chromium with special flags because the container environment doesn't have the same GUI capabilities as a local machine.

## Cloud-Safe Puppeteer Launch Configuration

```javascript
// Example: Configurable Puppeteer instance for both local and cloud environments

const puppeteer = require('puppeteer');

const getPuppeteerOptions = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
        // Cloud environment (Railway, Render, Heroku, etc.)
        return {
            headless: 'new',           // Use the new Headless mode (faster, more reliable)
            args: [
                '--no-sandbox',         // Required in container environments
                '--disable-setuid-sandbox',  // Additional sandbox disable for containers
                '--disable-dev-shm-usage',   // Prevent /dev/shm shared memory issues in containers
                '--disable-gpu',        // Disable GPU acceleration (not available in containers)
                '--no-first-run',       // Skip first-run dialogs
                '--no-default-browser-check',
                '--disable-extensions',
                '--disable-sync'
            ],
            timeout: 30000,            // 30 second timeout for cloud operations
        };
    } else {
        // Local development
        return {
            headless: 'new',
            args: [
                '--disable-gpu',
            ],
            timeout: 15000,
        };
    }
};

// Usage in your code
const browser = await puppeteer.launch(getPuppeteerOptions());
const page = await browser.newPage();
await page.goto('https://example.com');
// ... do work ...
await browser.close();
```

## Critical Flags Explained

| Flag | Purpose |
|------|---------|
| `--no-sandbox` | **ESSENTIAL** - Disables sandbox security. Required because containers run as unprivileged users. |
| `--disable-setuid-sandbox` | Prevents setuid sandbox errors in containerized environments. |
| `--disable-dev-shm-usage` | Prevents memory errors in /dev/shm. Cloud containers often have limited shared memory. |
| `--disable-gpu` | Disables GPU acceleration (not available in most cloud containers). |
| `--headless='new'` | Uses newer, faster headless mode introduced in Chrome 112+. |

## Advanced: With Error Handling

```javascript
const launchBrowserSafely = async () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const options = {
                headless: 'new',
                args: isProduction
                    ? [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                      ]
                    : ['--disable-gpu'],
                timeout: 30000,
            };
            
            const browser = await puppeteer.launch(options);
            return browser;
        } catch (error) {
            console.error(`Browser launch attempt ${attempt}/${maxRetries} failed:`, error.message);
            
            if (attempt === maxRetries) {
                throw new Error(`Failed to launch browser after ${maxRetries} attempts`);
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
    }
};

// Usage
const browser = await launchBrowserSafely();
```

## Troubleshooting Common Cloud Errors

### Error: "No usable sandbox"
**Solution**: Ensure `--no-sandbox` is in the args list.

### Error: "Cannot create /dev/shm: Permission denied"
**Solution**: Add `--disable-dev-shm-usage` flag.

### Error: "Timeout waiting for browser"
**Solution**: Increase timeout value and ensure system packages are installed (via nixpacks.toml).

### Error: "Chromium not found"
**Solution**: Ensure `chromium` is in your nixpacks.toml system packages list.

## Railway-Specific Setup Checklist

- ✅ `nixpacks.toml` includes `chromium`, `nss`, `freetype`, `harfbuzz`, `ca-certificates`
- ✅ Puppeteer launch includes `--no-sandbox` and `--disable-dev-shm-usage`
- ✅ NODE_ENV is set to 'production' on Railway
- ✅ Browser operations have 30+ second timeouts
- ✅ Errors are logged for debugging (check Railway logs)

