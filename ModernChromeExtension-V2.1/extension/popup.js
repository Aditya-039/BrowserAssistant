// AI Text Explainer - Popup Script
// Handles extension settings and configuration

class PopupManager {
  constructor() {
    // Initialize element references
    this.apiKeyInput = document.getElementById('apiKey');
    this.saveButton = document.getElementById('saveButton');
    this.statusDiv = document.getElementById('status');
    this.simpleModeBtn = document.getElementById('simpleMode');
    this.detailedModeBtn = document.getElementById('detailedMode');
    this.dailyCountSpan = document.getElementById('dailyCount');
    this.totalCountSpan = document.getElementById('totalCount');
    this.extensionStatusSpan = document.getElementById('extensionStatus');

    // Verify all required elements are present
    if (!this.apiKeyInput || !this.saveButton || !this.statusDiv || 
        !this.simpleModeBtn || !this.detailedModeBtn) {
      console.error('Required elements not found in popup.html');
      return;
    }

    this.init();
  }

  async init() {
    try {
      await this.loadSavedSettings();
      await this.loadUsageStats();
      this.setupEventListeners();
    } catch (error) {
      console.error('Error initializing popup:', error);
      if (this.statusDiv) {
        this.showStatus('Error initializing extension settings', 'error');
      }
    }
  }

  async loadSavedSettings() {
    const { apiKey, explanationMode } = await chrome.storage.sync.get(['apiKey', 'explanationMode']);
    if (apiKey) {
      this.apiKeyInput.value = apiKey;
    }
    
    // Set the mode button states
    const mode = explanationMode || 'simple';
    this.updateModeButtons(mode);
  }

  async loadUsageStats() {
    try {
      const result = await chrome.storage.local.get(['dailyCount', 'totalCount', 'lastResetDate']);
      const today = new Date().toDateString();
      
      // Reset daily count if it's a new day
      if (result.lastResetDate !== today) {
        await chrome.storage.local.set({
          dailyCount: 0,
          lastResetDate: today
        });
        this.dailyCountSpan.textContent = '0';
      } else {
        this.dailyCountSpan.textContent = result.dailyCount || '0';
      }
      
      this.totalCountSpan.textContent = result.totalCount || '0';
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  }

  setupEventListeners() {
    // API key and save button listeners
    if (this.saveButton && this.apiKeyInput) {
      this.saveButton.addEventListener('click', () => this.saveSettings());
      this.apiKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.saveSettings();
        }
      });

      this.apiKeyInput.addEventListener('input', () => {
        if (this.apiKeyInput.value.trim()) {
          this.saveButton.textContent = 'Save & Test Configuration';
        } else {
          this.saveButton.textContent = 'Save Configuration';
        }
      });
    }

    // Mode button listeners
    if (this.simpleModeBtn && this.detailedModeBtn) {
      this.simpleModeBtn.addEventListener('click', () => this.setMode('simple'));
      this.detailedModeBtn.addEventListener('click', () => this.setMode('detailed'));
    }
  }

  async setMode(mode) {
    await chrome.storage.sync.set({ explanationMode: mode });
    this.updateModeButtons(mode);
  }

  updateModeButtons(mode) {
    if (this.simpleModeBtn && this.detailedModeBtn) {
      this.simpleModeBtn.classList.toggle('active', mode === 'simple');
      this.detailedModeBtn.classList.toggle('active', mode === 'detailed');
    }
  }

  async saveSettings() {
    const apiKey = this.apiKeyInput.value.trim();
    
    if (!apiKey) {
      this.showStatus('Please enter a valid API key', 'error');
      return;
    }

    this.saveButton.disabled = true;
    this.saveButton.textContent = 'Testing...';

    try {
      console.log('Testing API key...');
      // Test the API key with a simple request
      await this.testApiKey(apiKey);
      
      console.log('API key test successful, saving...');
      // Save API key through background script
      const saveResponse = await chrome.runtime.sendMessage({ 
        action: 'saveApiKey', 
        apiKey: apiKey 
      });

      if (saveResponse.error) {
        throw new Error(saveResponse.error);
      }
      
      this.showStatus('API key saved and verified successfully!', 'success');
      this.extensionStatusSpan.textContent = 'Ready';
      this.saveButton.textContent = 'Saved ✓';
      
      setTimeout(() => {
        this.saveButton.textContent = 'Save Configuration';
      }, 2000);

    } catch (error) {
      console.error('Error saving API key:', error);
      this.showStatus('API key test failed: ' + error.message, 'error');
      this.extensionStatusSpan.textContent = 'Invalid key';
    } finally {
      this.saveButton.disabled = false;
    }
  }

  async testApiKey(apiKey) {
    console.log('Making test API request...');
    try {
      // Test with gemini-1.5-flash model directly
      const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      console.log('Testing content generation at:', generateUrl);

      const response = await fetch(generateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: "Test"
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 5
          }
        })
      });

      console.log('API test response status:', response.status);
      
      // Try to get the response text first
      const responseText = await response.text();
      console.log('API test response text:', responseText);

      // Only try to parse as JSON if we have content
      let errorData = null;
      if (responseText) {
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          console.warn('Failed to parse response as JSON:', e);
        }
      }

      if (!response.ok) {
        if (errorData?.error) {
          const errorMessage = errorData.error.message || 'Invalid API key';
          // Check for specific error types
          if (errorMessage.includes('quota')) {
            console.log('Quota error detected, but key might be valid');
            return true;
          } else if (errorMessage.includes('API key not valid')) {
            throw new Error('Invalid API key - please check your key and try again');
          } else if (errorMessage.includes('permission')) {
            throw new Error('API key does not have permission to access Gemini API');
          } else if (errorMessage.includes('deprecated')) {
            // If the model is deprecated, try gemini-pro as fallback
            return await this.testWithFallbackModel(apiKey);
          }
          throw new Error(errorMessage);
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('Invalid API key or insufficient permissions');
        } else {
          throw new Error(`API request failed with status ${response.status}`);
        }
      }

      // Store the working model name
      await chrome.storage.local.set({ workingModelName: 'gemini-1.5-flash' });
      console.log('API test successful, using gemini-1.5-flash model');
      return true;

    } catch (error) {
      console.error('API test error:', error);
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error - please check your internet connection');
      }
      throw error;
    }
  }

  async testWithFallbackModel(apiKey) {
    console.log('Trying fallback model gemini-pro...');
    const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    const response = await fetch(fallbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Test"
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API request failed with fallback model');
    }

    // Store the working model name
    await chrome.storage.local.set({ workingModelName: 'gemini-pro' });
    console.log('API test successful with fallback model gemini-pro');
    return true;
  }

  showStatus(message, type = 'info') {
    this.statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
    
    // Auto-hide success messages
    if (type === 'success') {
      setTimeout(() => {
        this.statusDiv.innerHTML = '';
      }, 3000);
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});