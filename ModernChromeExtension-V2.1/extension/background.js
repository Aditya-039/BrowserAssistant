// AI Text Explainer - Background Script
// Handles API calls to Google's Gemini API

const DEFAULT_PROMPTS = {
  brief: "Give a clear explanation of the following text in a simple and easy way within 50 words.",
  detailed: "Give a detailed explanation of the following text. The Text explanation should not exceed 100 words."
};

let settingsCache = {
  mode: 'brief',
  customPrompts: {}
};

// Initialize stats tracking
let stats = {
  totalRequests: 0,
  totalExplanations: 0,
  dailyRequests: 0,
  lastResponseTime: 0,
  history: []
};

// Initialize stats on extension load
chrome.runtime.onInstalled.addListener(async () => {
  await initializeStats();
});

// Initialize stats when extension starts
initializeStats();

async function initializeStats() {
  try {
    // Get existing stats
    const savedStats = await chrome.storage.local.get([
      'totalRequests',
      'totalExplanations',
      'dailyRequests',
      'lastResetDate',
      'history'
    ]);

    // Check if we need to reset daily stats
    const today = new Date().toDateString();
    const lastResetDate = savedStats.lastResetDate;

    if (!lastResetDate || lastResetDate !== today) {
      // Reset daily counts at the start of a new day
      await chrome.storage.local.set({
        dailyRequests: 0,
        lastResetDate: today
      });
      stats.dailyRequests = 0;
    } else {
      // Load existing stats
      stats = {
        totalRequests: savedStats.totalRequests || 0,
        totalExplanations: savedStats.totalExplanations || 0,
        dailyRequests: savedStats.dailyRequests || 0,
        lastResponseTime: savedStats.lastResponseTime || 0,
        history: savedStats.history || []
      };
    }

    // Save initial stats
    await chrome.storage.local.set(stats);
    broadcastStatsUpdate();
  } catch (error) {
    console.error('Error initializing stats:', error);
  }
}

async function incrementStats(type) {
  try {
    if (type === 'request') {
      stats.totalRequests++;
      stats.dailyRequests++;
    } else if (type === 'explanation') {
      stats.totalExplanations++;
    }

    // Save updated stats
    await chrome.storage.local.set(stats);
    broadcastStatsUpdate();
  } catch (error) {
    console.error('Error incrementing stats:', error);
  }
}

async function trackResponseTime(startTime) {
  try {
    const responseTime = Date.now() - startTime;
    stats.lastResponseTime = responseTime;
    await chrome.storage.local.set({ lastResponseTime: responseTime });
    broadcastStatsUpdate();
  } catch (error) {
    console.error('Error tracking response time:', error);
  }
}

async function addToHistory(historyItem) {
  try {
    stats.history.unshift(historyItem);
    
    // Keep only last 100 items
    if (stats.history.length > 100) {
      stats.history.length = 100;
    }
    
    await chrome.storage.local.set({ history: stats.history });
    broadcastStatsUpdate();
  } catch (error) {
    console.error('Error updating history:', error);
  }
}

function broadcastStatsUpdate() {
  chrome.runtime.sendMessage({
    type: 'statsUpdate',
    data: stats
  }).catch(() => {
    // Ignore errors when no listeners are available
  });
}

// Load API key
async function loadApiKey() {
  try {
    const result = await chrome.storage.local.get(['geminiApiKey']);
    const apiKey = result.geminiApiKey;
    console.log('API key loaded:', apiKey ? 'Present' : 'Not found');
    return apiKey || null;
  } catch (error) {
    console.error('Error loading API key:', error);
    throw new Error('Failed to load API key: ' + error.message);
  }
}

// Save API key
async function saveApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('Invalid API key format');
  }

  try {
    await chrome.storage.local.set({ geminiApiKey: apiKey });
    console.log('API key saved successfully');
  } catch (error) {
    console.error('Error saving API key:', error);
    throw new Error('Failed to save API key: ' + error.message);
  }
}

// Get text prompt
async function getTextPrompt(text, isCode = false) {
  if (isCode) {
    return getCodePrompt(text);
  }

  const { explanationMode } = await chrome.storage.sync.get(['explanationMode']);
  const mode = explanationMode || 'simple';

  if (mode === 'detailed') {
    return `Give a detailed explanation of the following text. The explanation should not exceed 100 words:\n\n${text}`;
  } else {
    return `Give a clear explanation of the following text in a simple and easy way within 50 words:\n\n${text}`;
  }
}

// Get code prompt
function getCodePrompt(code) {
  return `Explain what this code does. Focus on its purpose and functionality. Be clear and concise:\n\n${code}`;
}

// Handle text explanation
async function handleTextExplanation(text, isCode = false) {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text format');
  }

  try {
    const startTime = Date.now();
    
    // Increment request counter
    await incrementStats('request');

    console.log('Loading API key...');
    const apiKey = await loadApiKey();

    if (!apiKey) {
      throw new Error('Gemini API key not configured. Please set it in the extension popup.');
    }

    const { workingModelName } = await chrome.storage.local.get(['workingModelName']);
    const modelName = workingModelName || 'gemini-1.5-flash';
    console.log('Using model:', modelName);

    const prompt = await getTextPrompt(text, isCode);
    console.log('Making API request...');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topP: 1,
          maxOutputTokens: 75
        }
      })
    });

    const responseText = await response.text();
    let data = null;
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', e);
      throw new Error('Invalid response from Gemini API');
    }

    if (!response.ok) {
      handleApiError(data, response.status);
    }

    const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!explanation) {
      throw new Error('No explanation received from Gemini');
    }

    // Increment successful explanation counter
    await incrementStats('explanation');
    await trackResponseTime(startTime);

    // Add to history
    await addToHistory({
      timestamp: Date.now(),
      query: text,
      response: explanation,
      success: true
    });

    return {
      explanation: explanation,
      selectedText: text
    };

  } catch (error) {
    console.error('Gemini API error:', error);
    
    // Add failed attempt to history
    await addToHistory({
      timestamp: Date.now(),
      query: text,
      response: error.message,
      success: false
    });

    throw new Error(`Failed to get explanation: ${error.message}`);
  }
}

// Handle API errors
function handleApiError(data, status) {
  if (data?.error) {
    const errorMessage = data.error.message || 'API request failed';
    if (errorMessage.includes('quota')) {
      throw new Error('API quota exceeded. Please try again later or check your API quota limits at https://ai.google.dev/pricing');
    } else if (errorMessage.includes('API key not valid')) {
      throw new Error('Invalid API key - please check your key and try again');
    } else if (errorMessage.includes('permission')) {
      throw new Error('API key does not have permission to access Gemini API');
    }
    throw new Error(errorMessage);
  } else if (status === 401 || status === 403) {
    throw new Error('Invalid API key or insufficient permissions');
  } else {
    throw new Error(`API request failed with status ${status}`);
  }
}

// Load settings
async function loadSettings() {
  try {
    const saved = await chrome.storage.local.get(['explainerMode', 'customPrompts']);
    settingsCache.mode = saved.explainerMode || 'brief';
    settingsCache.customPrompts = saved.customPrompts || {};
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Initialize
loadSettings();

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request.action);
  
  if (request.action === 'explainText') {
    handleTextExplanation(request.text, request.isCode)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
  
  if (request.action === 'saveApiKey') {
    saveApiKey(request.apiKey)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
  
  if (request.action === 'getApiKey') {
    loadApiKey()
      .then(apiKey => sendResponse({ apiKey }))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.explainerMode) {
      settingsCache.mode = changes.explainerMode.newValue;
    }
    if (changes.customPrompts) {
      settingsCache.customPrompts = changes.customPrompts.newValue;
    }
  }
});