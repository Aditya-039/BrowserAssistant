// AI Text Explainer - Content Script
// Handles text selection and popup creation on any webpage

class TextExplainerExtension {
  constructor() {
    this.popup = null;
    this.cmdPanel = null;
    this.debounceTimer = null;
    this.selectedText = '';
    this.selectionPosition = { x: 0, y: 0 };
    this.typingSpeed = 20;
    this.isTyping = false;
    this.lastWidth = 400;
    this.isResizing = false;
    this.startX = 0;
    this.startWidth = 0;
  }

  init() {
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupListeners());
    } else {
      this.setupListeners();
    }
  }

  setupListeners() {
    // Selection change listener
    document.addEventListener('selectionchange', () => this.handleSelectionChange());

    // Click listener for closing popups
    document.addEventListener('click', (e) => this.handleClick(e));

    // Escape key listener
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hidePopup();
        this.hideCmdPanel();
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      if (this.popup) {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          this.updatePopupPosition(rect);
        }
      }
    });
  }

  updatePopupPosition(rect) {
    if (!this.popup) return;

    let x = rect.right + window.scrollX + 10;
    let y = rect.top + window.scrollY;

    // Ensure popup stays within viewport
    if (x + 320 > window.innerWidth + window.scrollX) {
      x = rect.left + window.scrollX - 330;
    }

    if (y + 200 > window.innerHeight + window.scrollY) {
      y = window.innerHeight + window.scrollY - 210;
    }

    // Ensure minimum distances from edges
    x = Math.max(window.scrollX + 10, x);
    y = Math.max(window.scrollY + 10, y);

    this.popup.style.left = `${x}px`;
    this.popup.style.top = `${y}px`;
  }

  handleSelectionChange() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() || '';
      
      if (text.length > 0 && text.length <= 1000) {
        const range = selection.getRangeAt(0);
        if (range) {
          const rect = range.getBoundingClientRect();
          
          // Check if the selection is code
          const isCode = this.isCodeSelection(selection);
          
          if (isCode) {
            this.showCmdPanel(text);
          } else {
            this.showPopup(text, rect, false);
          }
        }
      } else {
        this.hidePopup();
        this.hideCmdPanel();
      }
    }, 300);
  }

  isCodeSelection(selection) {
    if (!selection || !selection.anchorNode) return false;

    // Check if selection is within a code-related element
    const codeElements = ['pre', 'code', 'script', 'style'];
    let node = selection.anchorNode;
    while (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    if (!node) return false;

    // Check for code elements
    if (codeElements.includes(node.tagName?.toLowerCase())) {
      return true;
    }

    // Check for common code editor classes
    const editorClasses = ['editor', 'code', 'syntax', 'highlight', 'javascript', 'python', 'java', 'cpp'];
    const classes = node.className?.toLowerCase() || '';
    return editorClasses.some(cls => classes.includes(cls));
  }

  showPopup(text, rect, isCode = false) {
    this.hidePopup();
    
    this.popup = document.createElement('div');
    this.popup.className = 'ai-text-explainer-popup';
    this.updatePopupPosition(rect);

    // Add popup content
    this.popup.innerHTML = `
      <div class="content-type-badge ${isCode ? 'code' : ''}">
        <svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          ${isCode 
            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>'
            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/>'}
        </svg>
        ${isCode ? 'Code' : 'Text'}
      </div>
      <div class="loading-state">
        <svg class="spinner" viewBox="0 0 24 24">
          <circle class="spinner-circle" cx="12" cy="12" r="10" />
        </svg>
        <span>Analyzing...</span>
      </div>
    `;

    document.body.appendChild(this.popup);
    this.fetchExplanation(text, isCode);
  }

  async fetchExplanation(text, isCode) {
    try {
      const response = await fetch('http://localhost:5000/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify({
          text,
          analyze: isCode
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.needsConfiguration) {
        // Show API key configuration UI
        this.showApiKeyConfig();
        return;
      }
      
      if (this.popup) {
        if (isCode) {
          this.showCodeAnalysis(data.explanation, data.improvements);
        } else {
          this.showExplanation(data.explanation);
        }
      }
    } catch (error) {
      console.error('Error fetching explanation:', error);
      let errorMessage = 'Could not connect to the server. Please make sure:';
      if (error.message.includes('Failed to fetch')) {
        errorMessage += '\n1. The server is running on port 5000\n2. You\'re using the latest version of the extension';
      } else {
        errorMessage += `\n${error.message}`;
      }
      if (this.popup) {
        this.showError(errorMessage);
      }
    }
  }

  showApiKeyConfig() {
    if (!this.popup) return;

    this.popup.innerHTML = `
      <div class="api-key-config">
        <h3 style="color: #7dcfff; margin: 0 0 12px 0; font-size: 16px;">OpenAI API Key Required</h3>
        <p style="margin: 0 0 16px 0; color: #9ca3af;">
          To use this extension, you need to provide your OpenAI API key. 
          You can get one from <a href="https://platform.openai.com/api-keys" target="_blank" style="color: #7dcfff;">OpenAI's website</a>.
        </p>
        <div style="margin-bottom: 16px;">
          <input type="password" id="apiKeyInput" placeholder="Enter your OpenAI API key" 
            style="width: 100%; padding: 8px 12px; background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.1); 
            border-radius: 6px; color: #fafafa; font-family: inherit; font-size: 14px; outline: none;"
          >
        </div>
        <button id="saveApiKey" 
          style="width: 100%; padding: 8px 16px; background: #7dcfff; color: #1a1b26; border: none; border-radius: 6px; 
          font-weight: 500; cursor: pointer; transition: all 0.2s;"
        >
          Save API Key
        </button>
        <div id="apiKeyError" style="color: #f87171; margin-top: 8px; font-size: 12px;"></div>
      </div>
    `;

    const input = this.popup.querySelector('#apiKeyInput');
    const saveButton = this.popup.querySelector('#saveApiKey');
    const errorDiv = this.popup.querySelector('#apiKeyError');

    saveButton.addEventListener('click', async () => {
      const apiKey = input.value.trim();
      if (!apiKey) {
        errorDiv.textContent = 'Please enter an API key';
        return;
      }

      saveButton.disabled = true;
      saveButton.textContent = 'Validating...';
      saveButton.style.opacity = '0.7';

      try {
        const response = await fetch('http://localhost:5000/api/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': window.location.origin
          },
          mode: 'cors',
          credentials: 'omit',
          body: JSON.stringify({ apiKey }),
        });

        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        // API key is valid, retry the original request
        this.hidePopup();
        const selection = window.getSelection();
        if (selection) {
          const text = selection.toString().trim();
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          const isCode = this.isCodeSelection(selection);
          this.showPopup(text, rect, isCode);
        }
      } catch (error) {
        let errorMessage = error.message || 'Failed to validate API key';
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Could not connect to the server. Please make sure the server is running.';
        }
        errorDiv.textContent = errorMessage;
        saveButton.disabled = false;
        saveButton.textContent = 'Save API Key';
        saveButton.style.opacity = '1';
      }
    });
  }

  showCodeAnalysis(explanation, improvements) {
    if (!this.popup) return;

    this.popup.innerHTML = `
      <div class="explanation-content">
        <div class="explanation">${explanation}</div>
        <div class="improvements">
          <h4>🔧 Suggested Improvements</h4>
          ${improvements}
        </div>
        <button class="close-btn" onclick="this.closest('.ai-text-explainer-popup').remove()">×</button>
      </div>
    `;
  }

  showExplanation(explanation) {
    if (!this.popup) return;

    this.popup.innerHTML = `
      <div class="explanation-content">
        <div class="explanation">${explanation}</div>
        <button class="close-btn" onclick="this.closest('.ai-text-explainer-popup').remove()">×</button>
      </div>
    `;
  }

  showError(message = 'Sorry, couldn\'t get an explanation. Please try again.') {
    if (!this.popup) return;

    this.popup.innerHTML = `
      <div class="error-content">
        <svg class="error-icon" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <span>${message}</span>
        <button class="close-btn" onclick="this.closest('.ai-text-explainer-popup').remove()">×</button>
      </div>
    `;
  }

  hidePopup() {
    if (this.popup && this.popup.parentNode) {
      this.popup.parentNode.removeChild(this.popup);
    }
    this.popup = null;
  }

  hideCmdPanel() {
    if (this.cmdPanel && this.cmdPanel.parentNode) {
      this.cmdPanel.parentNode.removeChild(this.cmdPanel);
    }
    this.cmdPanel = null;
  }

  handleClick(event) {
    // Only hide popup if clicking outside both popup and CMD panel
    if ((this.popup && this.popup.contains(event.target)) ||
        (this.cmdPanel && (
          this.cmdPanel.contains(event.target) ||
          event.target.closest('.ai-cmd-panel')
        ))) {
      return;
    }
    
    // Small delay to allow for new selections
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim().length === 0) {
        this.hidePopup();
      }
    }, 10);
  }

  async showCmdPanel(code) {
    if (!this.cmdPanel) {
      this.cmdPanel = document.createElement('div');
      this.cmdPanel.className = 'ai-cmd-panel';
      this.cmdPanel.style.width = this.lastWidth + 'px';
      
      this.cmdPanel.innerHTML = `
        <div class="ai-cmd-resize-handle"></div>
        <div class="ai-cmd-header">
          <div class="ai-cmd-title">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            Code Analysis
          </div>
          <button class="ai-cmd-close">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="ai-cmd-content">
          <div class="ai-cmd-section">
            <div class="ai-cmd-section-title">
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"/>
              </svg>
              Improved Code
            </div>
            <pre class="ai-cmd-code">
              <code>Loading...</code>
              <button class="ai-cmd-copy">
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
                </svg>
                Copy
              </button>
            </pre>
          </div>
          <div class="ai-cmd-section">
            <div class="ai-cmd-section-title">
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Explanation
            </div>
            <div class="ai-cmd-explanation">Analyzing code...</div>
          </div>
        </div>
      `;

      // Handle close button click
      const closeButton = this.cmdPanel.querySelector('.ai-cmd-close');
      closeButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.hideCmdPanel();
      });

      // Add resize event listeners
      const resizeHandle = this.cmdPanel.querySelector('.ai-cmd-resize-handle');
      
      const startResize = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.isResizing = true;
        this.startX = e.clientX;
        this.startWidth = this.cmdPanel.offsetWidth;
        this.cmdPanel.classList.add('resizing');
        resizeHandle.classList.add('active');
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
      };

      const resize = (e) => {
        if (!this.isResizing) return;
        e.preventDefault();
        
        const width = this.startWidth + (this.startX - e.clientX);
        if (width >= 300 && width <= 800) {
          this.lastWidth = width;
          this.cmdPanel.style.width = width + 'px';
        }
      };

      const stopResize = (e) => {
        if (e) e.preventDefault();
        this.isResizing = false;
        this.cmdPanel.classList.remove('resizing');
        resizeHandle.classList.remove('active');
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
      };

      resizeHandle.addEventListener('mousedown', startResize);
      
      document.body.appendChild(this.cmdPanel);
      // Trigger reflow before adding visible class
      this.cmdPanel.offsetHeight;
    }

    // Show the panel
    this.cmdPanel.classList.add('visible');

    try {
      const response = await this.requestExplanation(code, true);
      if (response.error) {
        throw new Error(response.error);
      }
      this.updateCmdPanel(response.explanation);
    } catch (error) {
      console.error('Error in showCmdPanel:', error);
      this.showCmdError(error.message);
    }
  }

  async typeText(element, text, skipAnimation = false) {
    // Clear any existing content and typing state
    this.isTyping = false;
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Reset the element content
    element.textContent = '';
    
    // If skipping animation, just set the text directly
    if (skipAnimation) {
      element.textContent = text;
      return;
    }

    // Create a text container and cursor
    const textContainer = document.createElement('span');
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    cursor.textContent = '|';
    
    // Add both to the element
    element.appendChild(textContainer);
    element.appendChild(cursor);

    // Start typing animation
    this.isTyping = true;
    const words = text.split(' ');
    
    try {
      for (let i = 0; i < words.length && this.isTyping; i++) {
        const word = words[i];
        const chars = word.split('');
        
        for (let j = 0; j < chars.length && this.isTyping; j++) {
          textContainer.textContent += chars[j];
          await new Promise(resolve => setTimeout(resolve, this.typingSpeed));
        }
        
        if (i < words.length - 1 && this.isTyping) {
          textContainer.textContent += ' ';
          await new Promise(resolve => setTimeout(resolve, this.typingSpeed));
        }
      }
    } finally {
      // Cleanup
      if (cursor && cursor.parentNode) {
        cursor.remove();
      }
      this.isTyping = false;
    }
  }

  updateCmdPanel(response) {
    if (!this.cmdPanel) return;

    const codeElement = this.cmdPanel.querySelector('.ai-cmd-code code');
    const explanationElement = this.cmdPanel.querySelector('.ai-cmd-explanation');

    if (codeElement && explanationElement) {
      // Update code and explanation sections
      const { improvedCode, explanation } = this.parseResponse(response);
      
      // Update code section immediately
      codeElement.textContent = improvedCode || 'No code improvements suggested';
      
      // Animate the explanation text
      this.typeText(explanationElement, explanation);
    }
  }

  parseResponse(response) {
    try {
      // Try to extract code block if present
      const codeMatch = response.match(/```(?:[\w-]*\n)?([\s\S]*?)```/);
      const improvedCode = codeMatch ? codeMatch[1].trim() : '';
      
      // Get explanation (everything after the code block or full response if no code block)
      const explanation = codeMatch 
        ? response.replace(codeMatch[0], '').trim() 
        : response.trim();
      
      return { improvedCode, explanation };
    } catch (error) {
      console.error('Error parsing response:', error);
      return { improvedCode: '', explanation: response };
    }
  }

  showCmdError(errorMessage = '') {
    if (!this.cmdPanel) return;

    const codeElement = this.cmdPanel.querySelector('.ai-cmd-code code');
    const explanationElement = this.cmdPanel.querySelector('.ai-cmd-explanation');

    codeElement.textContent = 'Error analyzing code. Please try again.';
    explanationElement.innerHTML = `
      <div style="color: #ef4444;">An error occurred while processing the code:</div>
      <div style="margin: 8px 0; padding: 8px; background: rgba(239, 68, 68, 0.1); border-radius: 4px;">
        ${errorMessage || 'Unknown error occurred'}
      </div>
      <div style="margin-top: 8px;">This might be due to:</div>
      <ul style="margin: 8px 0 0 20px; list-style-type: disc;">
        <li>API response format mismatch</li>
        <li>Rate limiting or API quota exceeded</li>
        <li>Network connectivity issues</li>
      </ul>
      <div style="margin-top: 8px;">Please try again or check the console for detailed error messages.</div>
    `;
  }
}

// Initialize the extension
const textExplainer = new TextExplainerExtension();
textExplainer.init();