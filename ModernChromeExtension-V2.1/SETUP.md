# Quick Setup Guide

## Download and Run Locally

### Step 1: Download Project Files
You can download this entire project by clicking the download button or using git:

```bash
git clone [your-repo-url]
cd ai-text-explainer
```

### Step 2: Install Node.js
Make sure you have Node.js 18+ installed:
- Download from: https://nodejs.org/
- Verify installation: `node --version`

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Configure OpenAI API
1. Get your API key from: https://platform.openai.com/api-keys
2. Copy `.env.example` to `.env`
3. Replace `your_openai_api_key_here` with your actual API key

### Step 5: Start the Application
```bash
npm run dev
```

The application will start at: http://localhost:5000

## Chrome Extension Conversion

To convert this web app into a Chrome extension:

### 1. Create manifest.json
```json
{
  "manifest_version": 3,
  "name": "AI Text Explainer",
  "version": "1.0",
  "description": "Get instant AI explanations for selected text",
  "permissions": ["scripting"],
  "host_permissions": ["https://api.openai.com/*"],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["content.css"]
  }],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html"
  }
}
```

### 2. Extract Core Components
- Copy `TextExplainerPopup` component to content script
- Move API calls to background script for security
- Add extension-specific event listeners

### 3. Load in Chrome
1. Open Chrome Extensions (chrome://extensions/)
2. Enable Developer mode
3. Click "Load unpacked"
4. Select your extension folder

## Troubleshooting

**API Key Issues:**
- Ensure your OpenAI API key is valid
- Check that you have sufficient credits
- Verify the key is correctly set in `.env`

**Port Issues:**
- If port 5000 is busy, the app will automatically use the next available port
- Check the console output for the actual port number

**Build Issues:**
- Delete `node_modules` and run `npm install` again
- Ensure you're using Node.js 18 or higher