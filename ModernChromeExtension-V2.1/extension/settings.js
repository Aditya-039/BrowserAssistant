// Default prompts
const DEFAULT_PROMPTS = {
    brief: "Give a clear explanation of the following text in a simple and easy way within 50 words.",
    detailed: "Give a detailed explanation of the following text. The Text explanation should not exceed 100 words."
};

// Settings state
let currentSettings = {
    mode: 'brief',
    customPrompts: {
        custom1: '',
        custom2: '',
        custom3: ''
    }
};

// DOM Elements
const modeOptions = document.querySelectorAll('.mode-option');
const customPromptInputs = {
    custom1: document.getElementById('custom1-text'),
    custom2: document.getElementById('custom2-text'),
    custom3: document.getElementById('custom3-text')
};
const statusElement = document.getElementById('status');

// Initialize settings
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load saved settings
        const saved = await chrome.storage.local.get(['explainerMode', 'customPrompts']);
        
        if (saved.explainerMode) {
            currentSettings.mode = saved.explainerMode;
        }
        
        if (saved.customPrompts) {
            currentSettings.customPrompts = {
                ...currentSettings.customPrompts,
                ...saved.customPrompts
            };
        }

        // Update UI with saved settings
        updateUI();
        
        showStatus('Settings loaded successfully', 'success');
    } catch (error) {
        console.error('Error loading settings:', error);
        showStatus('Error loading settings', 'error');
    }
});

// Update UI based on current settings
function updateUI() {
    // Update mode selection
    document.querySelector(`input[value="${currentSettings.mode}"]`).checked = true;
    document.querySelector(`[data-mode="${currentSettings.mode}"]`).classList.add('active');

    // Update custom prompt inputs
    Object.entries(currentSettings.customPrompts).forEach(([key, value]) => {
        if (customPromptInputs[key]) {
            customPromptInputs[key].value = value;
        }
    });
}

// Handle mode selection
modeOptions.forEach(option => {
    const radio = option.querySelector('input[type="radio"]');
    
    option.addEventListener('click', async () => {
        const mode = option.dataset.mode;
        
        // Update UI
        modeOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        radio.checked = true;

        // Save selection
        try {
            currentSettings.mode = mode;
            await chrome.storage.local.set({ explainerMode: mode });
            showStatus('Mode updated successfully', 'success');
        } catch (error) {
            console.error('Error saving mode:', error);
            showStatus('Error saving mode', 'error');
        }
    });
});

// Save custom prompt
async function saveCustomPrompt(promptId) {
    const textarea = document.getElementById(`${promptId}-text`);
    const promptText = textarea.value.trim();

    if (!promptText) {
        showStatus('Please enter a prompt template', 'error');
        return;
    }

    try {
        // Update local state
        currentSettings.customPrompts[promptId] = promptText;

        // Save to storage
        await chrome.storage.local.set({
            customPrompts: currentSettings.customPrompts
        });

        showStatus('Custom prompt saved successfully', 'success');
    } catch (error) {
        console.error('Error saving custom prompt:', error);
        showStatus('Error saving custom prompt', 'error');
    }
}

// Show status message
function showStatus(message, type = 'success') {
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    
    // Clear status after 3 seconds
    setTimeout(() => {
        statusElement.className = 'status';
    }, 3000);
}

// Export settings for use in other extension components
window.getExplanationPrompt = () => {
    const mode = currentSettings.mode;
    
    if (mode === 'brief' || mode === 'detailed') {
        return DEFAULT_PROMPTS[mode];
    }
    
    return currentSettings.customPrompts[mode] || DEFAULT_PROMPTS.brief;
}; 