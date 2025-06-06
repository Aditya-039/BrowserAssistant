# Chrome Extension Installation Guide

## Quick Installation

1. **Download the extension folder** to your computer
2. **Open Chrome Extensions page**:
   - Go to `chrome://extensions/`
   - Or click Menu → More Tools → Extensions
3. **Enable Developer mode** (toggle in top-right corner)
4. **Click "Load unpacked"** and select this extension folder
5. **Configure your Google Gemini API key**:
   - Click the extension icon in your toolbar
   - Enter your API key from https://makersuite.google.com/app/apikey
   - Click "Save & Test Configuration"

## Usage

Once installed, the extension automatically works on any webpage:

1. **Select any text** on a webpage (1-1000 characters)
2. **Wait 300ms** for the AI popup to appear
3. **Read the explanation** generated by Google Gemini
4. **Click "Explain more"** to open Gemini for detailed analysis
5. **Click the × button** or click outside to close

## Features

- ✅ **Instant explanations** for any selected text
- ✅ **Smart positioning** - popup appears near your selection
- ✅ **Debounced requests** - prevents API spam with 300ms delay
- ✅ **Error handling** - graceful fallbacks when API fails
- ✅ **Usage tracking** - monitor your daily/total explanations
- ✅ **Modern UI** - glassmorphism design with AI gradients

## Configuration

### API Key Setup
1. Get your Gemini API key from https://makersuite.google.com/app/apikey
2. Click the extension icon in Chrome toolbar
3. Paste your API key
4. Click "Save & Test Configuration"

### Permissions
The extension requests these permissions:
- **scripting**: To inject the popup on webpages
- **storage**: To save your API key securely
- **host_permissions**: To communicate with Gemini API

## Troubleshooting

**Popup not appearing?**
- Check that you've configured your API key
- Ensure you're selecting text (not just clicking)
- Verify the selected text is 1-1000 characters

**API errors?**
- Verify your Gemini API key is valid
- Check that you have sufficient API quota
- Ensure your key has access to Gemini models

**Extension not loading?**
- Make sure Developer mode is enabled
- Try reloading the extension from chrome://extensions/
- Check the browser console for any errors

## Privacy & Security

- Your API key is stored locally in Chrome's secure storage
- Text selections are sent only to Google's official Gemini API
- No data is collected or stored by this extension
- All API calls use HTTPS encryption

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify your Gemini API key and quota
3. Try reloading the extension
4. Check Chrome's extension console for errors