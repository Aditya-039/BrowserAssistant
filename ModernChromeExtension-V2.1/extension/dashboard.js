// Global variables for tracking stats
let responseTimes = [];
let activityData = new Array(30).fill(0);
let stats = {};
let isExtensionValid = true;
let updateInterval;

// Payment link mapping
const PAYMENT_LINKS = {
  monthly: 'https://buy.stripe.com/your_monthly_link',
  '5': 'https://buy.stripe.com/your_5_link',
  '10': 'https://buy.stripe.com/your_10_link',
  '20': 'https://buy.stripe.com/your_20_link',
  'custom': 'https://buy.stripe.com/your_custom_link'
};

// Code Correction Module
const codeCorrection = {
  lastAnalyzedCode: null,
  lastLanguage: null,
  
  async analyzeSelection(code, language) {
    // Prevent duplicate analysis of same code
    if (code === this.lastAnalyzedCode && language === this.lastLanguage) {
      return null;
    }
    
    this.lastAnalyzedCode = code;
    this.lastLanguage = language;
    
    try {
      const analysis = await this.performAnalysis(code, language);
      return this.formatSuggestions(analysis);
    } catch (error) {
      console.error('Code analysis error:', error);
      return null;
    }
  },
  
  async performAnalysis(code, language) {
    // Request analysis from the backend
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'analyzeCode',
        payload: {
          code,
          language,
          timestamp: Date.now() // Ensure fresh analysis
        }
      });
      
      return response.analysis;
    } catch (error) {
      throw new Error('Failed to analyze code: ' + error.message);
    }
  },
  
  formatSuggestions(analysis) {
    if (!analysis || !analysis.suggestions) {
      return null;
    }
    
    return {
      suggestions: analysis.suggestions.map(suggestion => ({
        type: suggestion.type, // 'error', 'warning', 'style'
        message: suggestion.message,
        line: suggestion.line,
        column: suggestion.column,
        fix: suggestion.fix
      })),
      summary: analysis.summary,
      fixes: analysis.fixes || []
    };
  },
  
  clearCache() {
    this.lastAnalyzedCode = null;
    this.lastLanguage = null;
  }
};

// Terminal functionality
const terminal = {
  history: [],
  historyIndex: -1,
  commands: {
    help: {
      description: 'Show available commands',
      execute: () => {
        const commandsList = Object.entries(terminal.commands)
          .map(([name, cmd]) => `${name.padEnd(15)} - ${cmd.description}`)
          .join('\n');
        terminal.printOutput(commandsList);
      }
    },
    clear: {
      description: 'Clear terminal output',
      execute: () => {
        const terminalContent = document.getElementById('terminalContent');
        terminalContent.innerHTML = '';
      }
    },
    analyze: {
      description: 'Analyze current code',
      execute: async () => {
        const code = document.getElementById('codeEditor').innerText;
        const language = document.getElementById('languageSelect').value;
        
        if (!code.trim()) {
          terminal.printError('No code to analyze. Please enter some code in the editor.');
          return;
        }

        terminal.printInfo('Analyzing code...');
        try {
          const analysis = await analyzeCode(code, language);
          terminal.printSuccess('Analysis complete!');
          terminal.printOutput(formatAnalysisResult(analysis));
        } catch (error) {
          terminal.printError('Analysis failed: ' + error.message);
        }
      }
    },
    version: {
      description: 'Show terminal version',
      execute: () => {
        terminal.printOutput('Code Analysis Terminal v1.0.0');
      }
    }
  },

  initialize() {
    const terminalInput = document.getElementById('terminalInput');
    if (!terminalInput) return;

    terminalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const command = terminalInput.value.trim();
        if (command) {
          this.executeCommand(command);
          terminalInput.value = '';
          this.history.push(command);
          this.historyIndex = this.history.length;
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.historyIndex > 0) {
          this.historyIndex--;
          terminalInput.value = this.history[this.historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          terminalInput.value = this.history[this.historyIndex];
        } else {
          this.historyIndex = this.history.length;
          terminalInput.value = '';
        }
      }
    });

    // Handle terminal control buttons
    const closeBtn = document.querySelector('.control.close');
    const minimizeBtn = document.querySelector('.control.minimize');
    const maximizeBtn = document.querySelector('.control.maximize');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        const terminalSection = document.querySelector('.terminal-section');
        if (terminalSection) {
          terminalSection.style.display = 'none';
        }
      });
    }

    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        const terminalBody = document.querySelector('.terminal-body');
        if (terminalBody) {
          terminalBody.style.display = terminalBody.style.display === 'none' ? 'flex' : 'none';
        }
      });
    }

    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', () => {
        const terminalSection = document.querySelector('.terminal-section');
        if (terminalSection) {
          terminalSection.classList.toggle('maximized');
        }
      });
    }
  },

  executeCommand(commandStr) {
    const [command, ...args] = commandStr.split(' ');
    this.printCommand(commandStr);

    const cmd = this.commands[command];
    if (cmd) {
      try {
        cmd.execute(args);
      } catch (error) {
        this.printError(`Error executing command: ${error.message}`);
      }
    } else {
      this.printError(`Command not found: ${command}`);
      this.printInfo('Type "help" to see available commands');
    }
  },

  printCommand(command) {
    this.print(`$ ${command}`, 'terminal-command');
  },

  printOutput(text) {
    this.print(text, 'terminal-output');
  },

  printError(text) {
    this.print(text, 'terminal-error');
  },

  printSuccess(text) {
    this.print(text, 'terminal-success');
  },

  printInfo(text) {
    this.print(text, 'terminal-info');
  },

  print(text, className = '') {
    const terminalContent = document.getElementById('terminalContent');
    if (!terminalContent) return;

    const line = document.createElement('div');
    line.className = `terminal-line ${className}`;
    line.textContent = text;
    terminalContent.appendChild(line);
    terminalContent.scrollTop = terminalContent.scrollHeight;
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Check extension context
    if (!chrome.runtime) {
      handleExtensionInvalidation();
      return;
    }

    // Initialize stats
    await refreshStats();
    
    // Set up the activity chart
    initializeActivityChart();
    
    // Set up payment buttons
    setupPaymentButtons();
    
    // Set up real-time updates
    setupRealtimeUpdates();
    
    // Navigation handling
    setupNavigation();

    // LLM Selection handling
    setupLLMSelection();

    // Set up plan selection
    setupPlanSelection();

    // Code Analysis Functionality
    initializeCodeAnalysis();

    // Initialize terminal
    terminal.initialize();

  } catch (error) {
    console.error('Error initializing dashboard:', error);
    handleExtensionError(error);
  }
});

function handleExtensionInvalidation() {
  isExtensionValid = false;
  const errorMessage = 'Extension context has been invalidated. Please refresh the page.';
  showError(errorMessage);
  disableInteractiveElements();
}

function handleExtensionError(error) {
  console.error('Extension error:', error);
  const errorMessage = error.message || 'An error occurred. Please refresh the page.';
  showError(errorMessage);
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #ef4444;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    z-index: 9999;
  `;
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

function disableInteractiveElements() {
  // Disable all buttons
  document.querySelectorAll('button').forEach(button => {
    button.disabled = true;
  });

  // Disable all inputs
  document.querySelectorAll('input').forEach(input => {
    input.disabled = true;
  });

  // Add visual indication
  document.body.classList.add('extension-disabled');
}

function initializeActivityChart() {
  const activityChart = document.getElementById('activityChart');
  if (!activityChart) return;

  activityData.forEach(() => {
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = '0%';
    activityChart.appendChild(bar);
  });
}

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      if (!isExtensionValid) {
        handleExtensionInvalidation();
        return;
      }

      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const pageId = item.getAttribute('data-page');
      showPage(pageId);
    });
  });
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => {
    page.style.display = 'none';
  });
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) {
    targetPage.style.display = 'block';
  }
}

function setupLLMSelection() {
  const llmCards = document.querySelectorAll('.llm-card');
  llmCards.forEach(card => {
    card.addEventListener('click', async () => {
      if (!isExtensionValid) {
        handleExtensionInvalidation();
        return;
      }

      try {
        llmCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const llmName = card.querySelector('.llm-name').textContent;
        await saveLLMSelection(llmName);
      } catch (error) {
        handleExtensionError(error);
      }
    });
  });
}

async function saveLLMSelection(llmName) {
  if (!isExtensionValid) {
    handleExtensionInvalidation();
    return;
  }

  try {
    await chrome.storage.local.set({ selectedLLM: llmName });
    updateLLMStatus(llmName);
  } catch (error) {
    handleExtensionError(error);
  }
}

function updateLLMStatus(llmName) {
  const statusText = `Model switched to ${llmName}`;
  updateExtensionStatus(statusText);
}

async function refreshStats() {
  try {
    const newStats = await chrome.storage.local.get([
      'totalRequests',
      'totalExplanations',
      'dailyRequests',
      'lastResponseTime',
      'history',
      'selectedLLM'
    ]);

    if (Object.keys(newStats).length > 0) {
      updateStats(newStats);
    } else {
      // If no stats exist, initialize with zeros
      updateStats({
        totalRequests: 0,
        totalExplanations: 0,
        dailyRequests: 0,
        lastResponseTime: 0,
        history: []
      });
    }
  } catch (error) {
    console.error('Error refreshing stats:', error);
    handleExtensionError(error);
  }
}

function calculateSuccessRate(stats) {
  if (!stats.totalRequests) return 0;
  return Math.round((stats.totalExplanations / stats.totalRequests) * 100);
}

function calculateAvgResponseTime() {
  if (!responseTimes.length) return 0;
  return Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
}

function updateStats(newStats) {
  try {
    // Update stats object
    stats = { ...stats, ...newStats };

    // Update UI elements with animations
    const elements = {
      'totalRequests': stats.totalRequests || 0,
      'dailyRequests': stats.dailyRequests || 0,
      'totalExplanations': stats.totalExplanations || 0
    };

    // Update each element if it exists
    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        animateValue(id, value);
      }
    });
    
    // Update success rate
    const successRate = calculateSuccessRate(stats);
    const successRateElement = document.getElementById('successRate');
    if (successRateElement) {
      animateValue('successRate', successRate, '%');
    }
    
    // Update response time
    if (stats.lastResponseTime) {
      const lastResponseElement = document.getElementById('lastResponseTime');
      const avgResponseElement = document.getElementById('avgResponseTime');
      
      if (lastResponseElement) {
        lastResponseElement.textContent = `${stats.lastResponseTime}ms`;
      }
      
      if (avgResponseElement) {
        responseTimes.push(stats.lastResponseTime);
        if (responseTimes.length > 50) responseTimes.shift();
        const avgTime = calculateAvgResponseTime();
        avgResponseElement.textContent = `${avgTime}ms`;
      }
    }

    // Update history if available
    if (stats.history) {
      updateHistoryTable(stats.history);
    }

    // Update activity data
    if (typeof stats.dailyRequests !== 'undefined') {
      activityData.shift();
      activityData.push(stats.dailyRequests);
      updateChart();
    }

    // Update extension status
    updateExtensionStatus('Ready');
  } catch (error) {
    console.error('Error updating stats:', error);
    handleExtensionError(error);
  }
}

function animateValue(elementId, newValue, suffix = '') {
  const element = document.getElementById(elementId);
  if (!element) return;

  const currentValue = parseInt(element.textContent) || 0;
  if (currentValue === newValue) return;

  const diff = newValue - currentValue;
  const duration = 500; // Animation duration in ms
  const steps = 20; // Number of steps in animation
  const stepValue = diff / steps;
  let currentStep = 0;

  const animate = () => {
    currentStep++;
    const current = Math.round(currentValue + (stepValue * currentStep));
    element.textContent = `${current}${suffix}`;

    if (currentStep < steps) {
      requestAnimationFrame(animate);
    } else {
      element.textContent = `${newValue}${suffix}`;
    }
  };

  requestAnimationFrame(animate);
}

function updateChart() {
  const chart = document.getElementById('activityChart');
  if (!chart) return;

  const bars = chart.children;
  const maxValue = Math.max(...activityData, 1);

  Array.from(bars).forEach((bar, i) => {
    const height = (activityData[i] / maxValue) * 100;
    bar.style.transition = 'height 0.3s ease-in-out';
    bar.style.height = `${height}%`;

    // Add pulse effect for new data
    if (i === bars.length - 1 && height > 0) {
      bar.classList.remove('pulse');
      void bar.offsetWidth; // Force reflow
      bar.classList.add('pulse');
    }
  });
}

function updateHistoryTable(history = []) {
  const tableBody = document.getElementById('historyTableBody');
  if (!tableBody) return;

  // Keep only the last 50 entries for performance
  history = history.slice(0, 50);

  // Update existing rows and add new ones
  history.forEach((item, index) => {
    let row = tableBody.children[index];
    
    if (!row) {
      row = document.createElement('tr');
      row.style.opacity = '0';
      tableBody.appendChild(row);
      
      // Animate new row
      setTimeout(() => {
        row.style.transition = 'opacity 0.3s ease-in';
        row.style.opacity = '1';
      }, 50 * index);
    }

    row.innerHTML = `
      <td>${new Date(item.timestamp).toLocaleString()}</td>
      <td>${item.query}</td>
      <td>${item.response}</td>
      <td style="color: ${item.success ? '#10b981' : '#ef4444'}">${item.success ? '✓' : '✗'}</td>
    `;
  });

  // Remove extra rows
  while (tableBody.children.length > history.length) {
    const row = tableBody.lastChild;
    row.style.opacity = '0';
    setTimeout(() => row.remove(), 300);
  }
}

function setupRealtimeUpdates() {
  // Clear any existing interval
  if (updateInterval) {
    clearInterval(updateInterval);
  }

  // Set up storage change listener
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (!isExtensionValid) return;

    if (namespace === 'local') {
      const updates = {};
      for (const [key, { newValue }] of Object.entries(changes)) {
        updates[key] = newValue;
      }
      if (Object.keys(updates).length > 0) {
        updateStats(updates);
      }
    }
  });

  // Set up message listener for real-time updates
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'statsUpdate' && message.data) {
      updateStats(message.data);
    }
  });

  // Initial stats load
  refreshStats();

  // Periodic refresh every 2 seconds
  updateInterval = setInterval(async () => {
    if (!isExtensionValid) {
      clearInterval(updateInterval);
      return;
    }
    await refreshStats();
  }, 2000);

  // Clean up interval when page is hidden/closed
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(updateInterval);
    } else {
      setupRealtimeUpdates();
    }
  });
}

function updateExtensionStatus(status) {
  const statusElement = document.getElementById('extensionStatus');
  if (statusElement) {
    statusElement.textContent = status;
    statusElement.className = 'status-' + status.toLowerCase().replace(' ', '-');
  }
}

// Add event listeners for payment buttons
function setupPaymentButtons() {
  document.querySelectorAll('[data-payment-link]').forEach(button => {
    button.addEventListener('click', (e) => {
      const linkType = e.target.getAttribute('data-payment-link');
      const paymentLink = PAYMENT_LINKS[linkType];
      if (paymentLink) {
        window.open(paymentLink);
      }
    });
  });
}

// Plan selection handling
function setupPlanSelection() {
  const planButtons = document.querySelectorAll('.plan-button');
  const pricingCards = document.querySelectorAll('.pricing-card');
  const requestAccessBtn = document.getElementById('requestAccessBtn');

  // Load active plan
  chrome.storage.sync.get(['activePlan'], function(result) {
    if (result.activePlan) {
      selectPlan(result.activePlan, false);
    }
  });

  // Handle card selection
  pricingCards.forEach(card => {
    card.addEventListener('click', (e) => {
      if (!isExtensionValid) {
        handleExtensionInvalidation();
        return;
      }

      // Don't trigger if clicking the request access button
      if (e.target.id === 'requestAccessBtn') {
        return;
      }

      const planName = card.querySelector('.plan-name').textContent.trim();
      
      // Toggle selection
      if (card.classList.contains('selected')) {
        deselectPlan(card);
      } else {
        selectPlan(planName, true);
      }
    });
  });

  // Handle infinity access button separately
  if (requestAccessBtn) {
    requestAccessBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent card click
      handleInfinityAccess();
    });
  }
}

async function selectPlan(planName, shouldSave = true) {
  try {
    const pricingGrid = document.querySelector('.pricing-grid');
    const previousPlan = await chrome.storage.sync.get(['activePlan']);
    const previousCard = previousPlan.activePlan ? 
      Array.from(document.querySelectorAll('.pricing-card'))
        .find(card => card.querySelector('.plan-name').textContent.trim() === previousPlan.activePlan) : null;

    // Remove existing selections
    document.querySelectorAll('.pricing-card').forEach(card => {
      card.classList.remove('selected', 'focus');
    });
    
    // Find and select the new card
    const cards = document.querySelectorAll('.pricing-card');
    let selectedCard = null;
    
    cards.forEach(card => {
      const cardPlanName = card.querySelector('.plan-name').textContent.trim();
      if (cardPlanName === planName) {
        selectedCard = card;
        card.classList.add('selected');
      }
    });

    if (selectedCard && shouldSave) {
      // Start cinematic sequence
      pricingGrid.classList.add('upgrading');
      selectedCard.classList.add('focus');

      // Transfer perks if upgrading from previous plan
      if (previousCard && previousCard !== selectedCard) {
        await transferPerks(previousCard, selectedCard);
      }

      // Save selection
      await chrome.storage.sync.set({ activePlan: planName });
      
      // Show success message
      showSuccessMessage(`Successfully upgraded to ${planName}!`);
      
      // Trigger celebration effects
      await celebrateUpgrade(selectedCard);

      // Reset grid state
      setTimeout(() => {
        pricingGrid.classList.remove('upgrading');
      }, 2000);
    }
  } catch (error) {
    console.error('Error selecting plan:', error);
    handleExtensionError(error);
  }
}

async function transferPerks(fromCard, toCard) {
  const perks = fromCard.querySelectorAll('.feature-item:not(.disabled)');
  const fromRect = fromCard.getBoundingClientRect();
  const toRect = toCard.getBoundingClientRect();

  // Create container for perk badges
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '1000';
  document.body.appendChild(container);

  // Animate each perk
  for (let i = 0; i < perks.length; i++) {
    const perk = perks[i];
    const badge = document.createElement('div');
    badge.className = 'perk-badge';
    badge.textContent = perk.textContent.trim();

    // Set start and end positions
    const startX = fromRect.left + fromRect.width / 2;
    const startY = fromRect.top + perk.offsetTop;
    const endX = toRect.left + toRect.width / 2;
    const endY = toRect.top + toRect.height / 2;

    badge.style.setProperty('--start-x', `${startX}px`);
    badge.style.setProperty('--start-y', `${startY}px`);
    badge.style.setProperty('--end-x', `${endX}px`);
    badge.style.setProperty('--end-y', `${endY}px`);

    container.appendChild(badge);

    // Animate with delay
    await new Promise(resolve => {
      setTimeout(() => {
        badge.classList.add('animating');
        badge.addEventListener('animationend', () => {
          badge.remove();
          resolve();
        }, { once: true });
      }, i * 150);
    });
  }

  // Cleanup
  setTimeout(() => container.remove(), 1000);
}

async function celebrateUpgrade(selectedCard) {
  const container = document.createElement('div');
  container.className = 'celebration-container';
  document.body.appendChild(container);

  // Create light ring
  const ring = document.createElement('div');
  ring.className = 'light-ring';
  const rect = selectedCard.getBoundingClientRect();
  ring.style.left = `${rect.left + rect.width / 2}px`;
  ring.style.top = `${rect.top + rect.height / 2}px`;
  container.appendChild(ring);
  ring.classList.add('animating');

  // Create sparkles
  const corners = [
    { x: 0, y: 0 },
    { x: window.innerWidth, y: 0 },
    { x: 0, y: window.innerHeight },
    { x: window.innerWidth, y: window.innerHeight }
  ];

  corners.forEach(corner => {
    for (let i = 0; i < 3; i++) {
      const sparkle = document.createElement('div');
      sparkle.className = 'sparkle';
      
      // Random position near corner
      const startX = corner.x + (Math.random() - 0.5) * 100;
      const startY = corner.y + (Math.random() - 0.5) * 100;
      
      // Travel towards card center
      const travelX = rect.left + rect.width / 2 - startX;
      const travelY = rect.top + rect.height / 2 - startY;

      sparkle.style.setProperty('--start-x', `${startX}px`);
      sparkle.style.setProperty('--start-y', `${startY}px`);
      sparkle.style.setProperty('--travel-x', `${travelX}px`);
      sparkle.style.setProperty('--travel-y', `${travelY}px`);

      container.appendChild(sparkle);
      
      setTimeout(() => {
        sparkle.classList.add('animating');
        createTrail(sparkle, container);
      }, i * 200);
    }
  });

  // Prepare for future sound support
  const audio = document.createElement('audio');
  audio.className = 'audio-trigger';
  audio.setAttribute('data-sound', 'upgrade');
  container.appendChild(audio);

  // Cleanup
  setTimeout(() => container.remove(), 2000);
}

function createTrail(sparkle, container) {
  const interval = setInterval(() => {
    const rect = sparkle.getBoundingClientRect();
    const trail = document.createElement('div');
    trail.className = 'trail';
    trail.style.left = `${rect.left + rect.width / 2}px`;
    trail.style.top = `${rect.top + rect.height / 2}px`;
    container.appendChild(trail);
    trail.classList.add('animating');
    
    // Cleanup trail
    trail.addEventListener('animationend', () => trail.remove(), { once: true });
  }, 50);

  // Stop creating trails when sparkle animation ends
  sparkle.addEventListener('animationend', () => {
    clearInterval(interval);
    sparkle.remove();
  }, { once: true });
}

function deselectPlan(card) {
  card.classList.remove('selected');
  chrome.storage.sync.remove(['activePlan']);
}

// Success message with CMD theme
function showSuccessMessage(message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'success-message';
  messageDiv.innerHTML = `
    <span class="success-icon">✓</span>
    <span class="success-text">${message}</span>
  `;

  // Add success message styles if not already present
  if (!document.getElementById('success-message-styles')) {
    const style = document.createElement('style');
    style.id = 'success-message-styles';
    style.textContent = `
      .success-message {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-darker);
        color: var(--text-light);
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 8px;
        border: 1px solid var(--primary);
        box-shadow: 0 0 20px rgba(122, 162, 247, 0.2);
        animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                   fadeOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) 2.7s forwards;
      }

      .success-icon {
        color: var(--primary);
        font-size: 16px;
      }

      @keyframes slideDown {
        from { transform: translate(-50%, -100%); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }

      @keyframes fadeOut {
        to { opacity: 0; transform: translate(-50%, -20px); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(messageDiv);

  // Remove message after animation
  messageDiv.addEventListener('animationend', (e) => {
    if (e.animationName === 'fadeOut') {
      messageDiv.remove();
    }
  });
}

function showUpgradeAnimation() {
  const successElement = document.createElement('div');
  successElement.className = 'upgrade-success';
  document.body.appendChild(successElement);

  // Create particle effects
  for (let i = 0; i < 12; i++) {
    const particle = document.createElement('div');
    particle.className = 'success-particle';
    particle.style.cssText = `
      position: absolute;
      width: 8px;
      height: 8px;
      background: var(--primary);
      border-radius: 50%;
      pointer-events: none;
      opacity: 0;
      transform: translate(-50%, -50%);
      animation: particleAnim 1s ease-out forwards;
      left: 50%;
      top: 50%;
      animation-delay: ${i * 0.1}s;
    `;
    
    // Random angle for each particle
    const angle = (i / 12) * Math.PI * 2;
    const distance = 100;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    
    particle.style.setProperty('--x', `${x}px`);
    particle.style.setProperty('--y', `${y}px`);
    
    successElement.appendChild(particle);
  }

  // Add particle animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes particleAnim {
      0% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(0);
      }
      50% {
        opacity: 1;
        transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1);
      }
      100% {
        opacity: 0;
        transform: translate(calc(-50% + var(--x) * 1.2), calc(-50% + var(--y) * 1.2)) scale(0);
      }
    }
  `;
  document.head.appendChild(style);

  // Remove the success animation after it completes
  successElement.addEventListener('animationend', () => {
    successElement.remove();
    style.remove();
  });
}

function handleInfinityAccess() {
  // Create modal for infinity access request
  const modal = document.createElement('div');
  modal.className = 'infinity-modal';
  modal.innerHTML = `
    <div class="infinity-modal-content">
      <h2>Request Infinity Access</h2>
      <p>Please provide your details and we'll get back to you within 24 hours.</p>
      <form id="infinityForm">
        <input type="text" placeholder="Company Name" required>
        <input type="email" placeholder="Business Email" required>
        <textarea placeholder="Tell us about your needs" required></textarea>
        <button type="submit">Submit Request</button>
      </form>
    </div>
  `;

  // Add modal styles
  const style = document.createElement('style');
  style.textContent = `
    .infinity-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.3s ease;
    }

    .infinity-modal-content {
      background: var(--bg-darker);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 24px;
      width: 90%;
      max-width: 500px;
    }

    .infinity-modal h2 {
      margin-bottom: 16px;
      font-size: 24px;
      font-weight: 600;
    }

    .infinity-modal p {
      color: var(--text-dim);
      margin-bottom: 24px;
    }

    .infinity-modal form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .infinity-modal input,
    .infinity-modal textarea {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px;
      color: var(--text-light);
      font-family: inherit;
    }

    .infinity-modal textarea {
      height: 120px;
      resize: vertical;
    }

    .infinity-modal button {
      background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
      color: white;
      border: none;
      padding: 12px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .infinity-modal button:hover {
      opacity: 0.9;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(modal);

  // Handle form submission
  const form = modal.querySelector('#infinityForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // Here you would typically send the form data to your backend
    modal.remove();
    showSuccessMessage('Your request has been submitted! We\'ll contact you soon.');
  });

  // Close modal on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Selection handling
document.addEventListener('selectionchange', async () => {
  const selection = window.getSelection();
  if (!selection.toString().trim()) return;
  
  // Get selected code and detect language
  const code = selection.toString();
  const language = detectCodeLanguage(selection);
  
  if (!code || !language) return;
  
  // Show loading state
  showAnalysisLoading();
  
  // Get fresh analysis
  const corrections = await codeCorrection.analyzeSelection(code, language);
  if (corrections) {
    displayCorrections(corrections);
  }
});

function detectCodeLanguage(selection) {
  // Get the closest code block or element with language hints
  const codeElement = selection.anchorNode.parentElement.closest('pre, code');
  if (!codeElement) return null;
  
  // Check for language class hints (e.g. language-javascript, lang-python)
  const classes = Array.from(codeElement.classList);
  const langClass = classes.find(cls => 
    cls.startsWith('language-') || 
    cls.startsWith('lang-') ||
    cls.startsWith('type-')
  );
  
  if (langClass) {
    return langClass.split('-')[1];
  }
  
  // Fallback: Try to detect from content
  return detectFromContent(selection.toString());
}

function detectFromContent(code) {
  // Simple language detection heuristics
  if (code.includes('function') || code.includes('const') || code.includes('let')) {
    return 'javascript';
  }
  if (code.includes('def ') || code.includes('import ') || 'print(' in code) {
    return 'python';
  }
  if (code.includes('public class') || code.includes('void ')) {
    return 'java';
  }
  return null;
}

function displayCorrections(corrections) {
  // Remove any existing correction display
  const existing = document.getElementById('code-corrections');
  if (existing) existing.remove();
  
  // Create corrections panel
  const panel = document.createElement('div');
  panel.id = 'code-corrections';
  panel.className = 'code-corrections-panel';
  
  // Add corrections content with terminal and input
  panel.innerHTML = `
    <div class="corrections-header">
      <h3>Code Analysis</h3>
      <button class="close-btn">×</button>
    </div>
    <div class="corrections-content">
      ${corrections.summary ? `<div class="summary">${corrections.summary}</div>` : ''}
      <div class="suggestions">
        ${corrections.suggestions && corrections.suggestions.length > 0 ? 
          corrections.suggestions.map(suggestion => `
            <div class="suggestion ${suggestion.type}">
              <div class="suggestion-header">
                <span class="type">${suggestion.type}</span>
                <span class="location">Line ${suggestion.line}</span>
              </div>
              <div class="message">${suggestion.message}</div>
              ${suggestion.fix ? `
                <div class="fix">
                  <pre><code>${suggestion.fix}</code></pre>
                </div>
              ` : ''}
            </div>
          `).join('') : 
          `<div class="no-suggestions">
            <div class="success-icon">✓</div>
            <div class="message">No improvements needed</div>
            <div class="sub-message">Your code looks good and follows best practices</div>
          </div>`
        }
      </div>
      <div class="terminal-section">
        <div class="terminal-header">
          <span class="terminal-title">LLM Terminal</span>
          <div class="terminal-controls">
            <button class="clear-terminal">Clear</button>
          </div>
        </div>
        <div class="terminal-output" id="terminalOutput"></div>
        <div class="terminal-input-wrapper">
          <span class="prompt">></span>
          <input type="text" class="terminal-input" placeholder="Ask about the code..." />
        </div>
      </div>
    </div>
  `;
  
  // Add to document
  document.body.appendChild(panel);
  
  // Set up terminal functionality
  setupTerminal(panel);
  
  // Handle close button
  panel.querySelector('.close-btn').addEventListener('click', () => {
    panel.remove();
    codeCorrection.clearCache();
  });
}

function setupTerminal(panel) {
  const terminalOutput = panel.querySelector('#terminalOutput');
  const input = panel.querySelector('.terminal-input');
  const clearBtn = panel.querySelector('.clear-terminal');
  let selectedCode = window.getSelection().toString().trim();
  
  // Handle input submission
  input.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      const query = input.value.trim();
      input.value = '';
      
      // Add user query to terminal
      appendToTerminal(terminalOutput, `> ${query}`, 'user-input');
      
      // Show loading indicator
      const loadingId = appendToTerminal(terminalOutput, 'Processing...', 'loading');
      
      try {
        // Send to LLM
        const response = await sendToLLM(query, selectedCode);
        
        // Remove loading message
        removeFromTerminal(loadingId);
        
        // Add response to terminal
        appendToTerminal(terminalOutput, response, 'llm-response');
      } catch (error) {
        // Remove loading message
        removeFromTerminal(loadingId);
        
        // Show error in terminal
        appendToTerminal(terminalOutput, 'Error: ' + error.message, 'error');
      }
      
      // Scroll to bottom
      terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }
  });
  
  // Handle clear button
  clearBtn.addEventListener('click', () => {
    terminalOutput.innerHTML = '';
  });
}

async function sendToLLM(query, code) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'queryLLM',
      payload: {
        query,
        code,
        timestamp: Date.now()
      }
    });
    
    return response.result;
  } catch (error) {
    throw new Error('Failed to get LLM response: ' + error.message);
  }
}

function appendToTerminal(terminal, content, className) {
  const entry = document.createElement('div');
  entry.className = `terminal-entry ${className}`;
  entry.innerHTML = content;
  
  // Generate unique ID for entry
  const id = 'entry-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  entry.id = id;
  
  terminal.appendChild(entry);
  return id;
}

function removeFromTerminal(id) {
  const entry = document.getElementById(id);
  if (entry) entry.remove();
}

// Create or get the style element for dynamic styles
function getOrCreateStyleElement(id) {
  let styleElement = document.getElementById(id);
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = id;
    document.head.appendChild(styleElement);
  }
  return styleElement;
}

// Add terminal styles
const terminalStyles = `
  .terminal-section {
    margin-top: 20px;
    background: var(--bg-darker);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
  }

  .terminal-header {
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .terminal-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-light);
  }

  .terminal-controls {
    display: flex;
    gap: 8px;
  }

  .terminal-button {
    background: var(--primary);
    color: white;
    border: none;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .terminal-button:hover {
    opacity: 0.9;
  }

  #clearTerminal {
    background: var(--bg-darker);
    border: 1px solid var(--border-color);
  }

  .terminal-output {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    font-family: 'Consolas', monospace;
    font-size: 13px;
    line-height: 1.5;
    min-height: 200px;
  }

  .terminal-input-wrapper {
    display: flex;
    align-items: center;
    padding: 12px;
    background: rgba(0, 0, 0, 0.2);
    border-top: 1px solid var(--border-color);
  }

  .prompt {
    color: var(--primary);
    margin-right: 8px;
    font-family: 'Consolas', monospace;
  }

  .terminal-input {
    flex: 1;
    background: none;
    border: none;
    color: var(--text-light);
    font-family: 'Consolas', monospace;
    font-size: 13px;
    outline: none;
  }

  .terminal-input::placeholder {
    color: var(--text-dim);
    opacity: 0.5;
  }

  .terminal-entry {
    margin-bottom: 8px;
    padding: 4px 0;
  }

  .terminal-entry.user {
    color: var(--text-dim);
  }

  .terminal-entry.system {
    color: var(--primary);
  }

  .terminal-entry.error {
    color: #ef4444;
  }

  .terminal-entry.result {
    color: var(--text-light);
    background: rgba(255, 255, 255, 0.02);
    border-radius: 4px;
    padding: 8px;
    margin: 4px 0;
  }

  /* Code Analysis Styles */
  .code-analysis-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 16px;
  }

  .code-input-section {
    background: var(--bg-darker);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
  }

  .code-input-header {
    padding: 12px;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .language-selector select {
    background: var(--bg-darker);
    border: 1px solid var(--border-color);
    color: var(--text-light);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
  }

  .code-editor {
    min-height: 300px;
    padding: 16px;
    font-family: 'Consolas', monospace;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-light);
    white-space: pre-wrap;
    overflow-y: auto;
  }

  .code-editor:focus {
    outline: none;
  }

  /* Syntax Highlighting */
  .token.keyword { color: #ff79c6; }
  .token.string { color: #f1fa8c; }
  .token.number { color: #bd93f9; }
  .token.function { color: #50fa7b; }
  .token.comment { color: #6272a4; }
  .token.operator { color: #ff79c6; }
  .token.punctuation { color: #f8f8f2; }
`;

// Initialize styles when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Add terminal styles
  const styleElement = getOrCreateStyleElement('terminal-styles');
  styleElement.textContent = terminalStyles;

  // Add additional styles
  const additionalStyleElement = getOrCreateStyleElement('additional-styles');
  additionalStyleElement.textContent = additionalStyles;

  // Initialize code analysis
  initializeCodeAnalysis();
  
  // ... rest of existing initialization code ...
});

// Code Analysis Functionality
function initializeCodeAnalysis() {
  const codeEditor = document.getElementById('codeEditor');
  const analysisOutput = document.getElementById('analysisOutput');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const clearTerminalBtn = document.getElementById('clearTerminal');
  const clearAnalysisBtn = document.getElementById('clearAnalysis');
  const languageSelect = document.getElementById('languageSelect');
  const analysisQuery = document.getElementById('analysisQuery');

  // Initialize syntax highlighting
  let currentCode = '';
  let currentLanguage = languageSelect.value;

  // Handle code input and syntax highlighting
  codeEditor.addEventListener('input', () => {
    currentCode = codeEditor.innerText;
    highlightCode(currentCode, currentLanguage);
  });

  // Handle language change
  languageSelect.addEventListener('change', () => {
    currentLanguage = languageSelect.value;
    highlightCode(currentCode, currentLanguage);
  });

  // Handle analysis button click
  analyzeBtn.addEventListener('click', async () => {
    if (!currentCode.trim()) {
      appendToAnalysisOutput('Please enter some code to analyze', 'error');
      return;
    }

    appendToAnalysisOutput('Analyzing code...', 'system');
    
    try {
      const analysis = await analyzeCode(currentCode, currentLanguage);
      appendToAnalysisOutput(analysis, 'result');
    } catch (error) {
      appendToAnalysisOutput('Error analyzing code: ' + error.message, 'error');
    }
  });

  // Handle query input
  analysisQuery.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter' && analysisQuery.value.trim()) {
      const query = analysisQuery.value.trim();
      analysisQuery.value = '';

      appendToAnalysisOutput('> ' + query, 'user');
      appendToAnalysisOutput('Processing query...', 'system');

      try {
        const response = await queryLLM(query, currentCode, currentLanguage);
        appendToAnalysisOutput(response, 'result');
      } catch (error) {
        appendToAnalysisOutput('Error: ' + error.message, 'error');
      }
    }
  });

  // Handle clear buttons
  clearTerminalBtn.addEventListener('click', () => {
    analysisOutput.innerHTML = '';
  });

  clearAnalysisBtn.addEventListener('click', () => {
    codeEditor.innerText = '';
    analysisOutput.innerHTML = '';
    currentCode = '';
    highlightCode('', currentLanguage);
  });
}

async function analyzeCode(code, language) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'analyzeCode',
      payload: {
        code,
        language,
        timestamp: Date.now()
      }
    });

    return formatAnalysisResult(response.analysis);
  } catch (error) {
    throw new Error('Failed to analyze code: ' + error.message);
  }
}

async function queryLLM(query, code, language) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'queryLLM',
      payload: {
        query,
        code,
        language,
        timestamp: Date.now()
      }
    });

    return response.result;
  } catch (error) {
    throw new Error('Failed to get response: ' + error.message);
  }
}

function formatAnalysisResult(analysis) {
  if (!analysis) return 'No analysis results available';

  let result = '';

  if (analysis.summary) {
    result += `Summary:\n${analysis.summary}\n\n`;
  }

  if (analysis.suggestions && analysis.suggestions.length > 0) {
    result += 'Suggestions:\n';
    analysis.suggestions.forEach((suggestion, index) => {
      result += `${index + 1}. ${suggestion.type.toUpperCase()}: ${suggestion.message}\n`;
      if (suggestion.line) {
        result += `   Line ${suggestion.line}${suggestion.column ? `, Column ${suggestion.column}` : ''}\n`;
      }
      if (suggestion.fix) {
        result += `   Suggested fix:\n   ${suggestion.fix}\n`;
      }
      result += '\n';
    });
  } else {
    result += 'No improvements suggested. The code looks good!\n';
  }

  return result;
}

function appendToAnalysisOutput(content, type) {
  const analysisOutput = document.getElementById('analysisOutput');
  const entry = document.createElement('div');
  entry.className = `terminal-entry ${type}`;
  entry.textContent = content;
  analysisOutput.appendChild(entry);
  analysisOutput.scrollTop = analysisOutput.scrollHeight;
}

function highlightCode(code, language) {
  // Simple syntax highlighting (you can integrate a proper syntax highlighter like Prism.js)
  const highlighted = code
    .replace(/\b(function|const|let|var|return|if|else|for|while)\b/g, '<span class="token keyword">$1</span>')
    .replace(/"([^"]*)"/g, '<span class="token string">"$1"</span>')
    .replace(/\b(\d+)\b/g, '<span class="token number">$1</span>')
    .replace(/\b([a-zA-Z]+)\(/g, '<span class="token function">$1</span>(')
    .replace(/\/\/.*/g, '<span class="token comment">$&</span>');

  document.getElementById('codeEditor').innerHTML = highlighted;
}

function showAnalysisLoading() {
  // Remove any existing correction display
  const existing = document.getElementById('code-corrections');
  if (existing) existing.remove();
  
  // Create loading panel
  const panel = document.createElement('div');
  panel.id = 'code-corrections';
  panel.className = 'code-corrections-panel';
  
  panel.innerHTML = `
    <div class="corrections-header">
      <h3>Code Analysis</h3>
      <button class="close-btn">×</button>
    </div>
    <div class="corrections-content">
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <div class="message">Analyzing code...</div>
      </div>
    </div>
  `;
  
  document.body.appendChild(panel);
  
  // Handle close button
  panel.querySelector('.close-btn').addEventListener('click', () => {
    panel.remove();
    codeCorrection.clearCache();
  });
}

// Add new styles for empty and loading states
const additionalStyles = `
  .no-suggestions {
    padding: 32px 24px;
    text-align: center;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }

  .no-suggestions .success-icon {
    font-size: 24px;
    color: #10b981;
    margin-bottom: 12px;
  }

  .no-suggestions .message {
    color: var(--text-light);
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 4px;
  }

  .no-suggestions .sub-message {
    color: var(--text-dim);
    font-size: 13px;
  }

  .loading-state {
    padding: 32px 24px;
    text-align: center;
  }

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border-color);
    border-top-color: var(--primary);
    border-radius: 50%;
    margin: 0 auto 12px;
    animation: spin 1s linear infinite;
  }

  .loading-state .message {
    color: var(--text-dim);
    font-size: 13px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`; 