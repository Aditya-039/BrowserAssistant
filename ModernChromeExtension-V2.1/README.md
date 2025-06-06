# AI Text Explainer - Chrome Extension Prototype

A modern web application prototype showcasing a Chrome extension UI for instant text explanations using GPT-3.5-turbo.

## Features

- **Real-time Text Selection**: Automatically detects text selection on any webpage
- **AI-Powered Explanations**: Uses GPT-3.5-turbo to provide clear, concise explanations (50 words max)
- **Modern UI**: Deepgram-inspired design with glassmorphism effects and AI gradients
- **Smart Positioning**: Intelligently positions popups near selected text
- **Debounced API Calls**: 300ms debounce to prevent API spam
- **Error Handling**: Graceful error handling with user-friendly messages
- **Interactive Demo**: Live demonstration of all popup states

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- OpenAI API key

## Installation

1. **Clone or download this repository**
2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:5000`

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/           # Utility libraries
│   │   ├── pages/         # Application pages
│   │   └── index.css      # Global styles with AI theme
├── server/                # Backend Express server
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API routes
│   └── vite.ts            # Vite configuration
├── shared/                # Shared types and schemas
└── package.json           # Dependencies and scripts
```

## Usage

### Interactive Demo
- Use the demo controls to test different popup states
- Click on highlighted terms in the demo content
- Select any text to see the AI explanation feature

### Real Implementation
The popup automatically appears when you:
1. Select text on any webpage (1-1000 characters)
2. Wait 300ms (debounce period)
3. See the AI explanation appear near your selection

### API Integration
- Powered by OpenAI GPT-3.5-turbo
- 50-word explanation limit for quick reading
- Fallback error messages for API failures

## Chrome Extension Implementation

To convert this prototype to a Chrome extension:

1. **Create manifest.json:**
   ```json
   {
     "manifest_version": 3,
     "name": "AI Text Explainer",
     "version": "1.0",
     "permissions": ["scripting"],
     "host_permissions": ["https://api.openai.com/*"],
     "content_scripts": [{
       "matches": ["<all_urls>"],
       "js": ["content.js"]
     }]
   }
   ```

2. **Extract the popup component** to a content script
3. **Move API calls** to a background script for security
4. **Add extension-specific styling** with high z-index

## Technical Specifications

- **Popup Width:** 320px
- **Border Radius:** 12px
- **Z-Index:** 9999
- **Animation:** 300ms fade-in with scale
- **Debounce:** 300ms
- **Max Text Length:** 1000 characters
- **Explanation Limit:** 50 words

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Environment Variables
- `OPENAI_API_KEY` - Your OpenAI API key
- `NODE_ENV` - Environment (development/production)

## Dependencies

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Radix UI components
- TanStack React Query for API management
- Wouter for routing

### Backend
- Express.js server
- OpenAI API integration
- Zod for validation
- TypeScript compilation

## License

MIT License - feel free to use this prototype for your own projects.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues or questions about this prototype, please check the OpenAI API documentation for authentication requirements.