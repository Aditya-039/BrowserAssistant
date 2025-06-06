import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TextExplainerPopup } from "@/components/text-explainer-popup";
import { Terminal } from "@/components/terminal";
import { DemoContent } from "@/components/demo-content";
import { useTextSelection } from "@/hooks/use-text-selection";

export default function Home() {
  const [demoState, setDemoState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showDemo, setShowDemo] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const { selectedText, selectionPosition, clearSelection } = useTextSelection();

  const handleDemoSuccess = () => {
    setDemoState('success');
    setShowDemo(true);
  };

  const handleDemoLoading = () => {
    setDemoState('loading');
    setShowDemo(true);
  };

  const handleDemoError = () => {
    setDemoState('error');
    setShowDemo(true);
  };

  const handleCloseDemo = () => {
    setShowDemo(false);
    setDemoState('idle');
  };

  const isCodeSelection = (text: string) => {
    const codePatterns = [
      /function\s+\w+\s*\(/,
      /class\s+\w+/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /var\s+\w+\s*=/,
      /if\s*\(.+\)\s*{/,
      /for\s*\(.+\)\s*{/,
      /while\s*\(.+\)\s*{/,
      /import\s+.*from/,
      /export\s+/,
      /<\w+.*>/,
      /\w+\s*\(\s*\)\s*=>/,
    ];
    return codePatterns.some(pattern => pattern.test(text));
  };

  return (
    <div className="min-h-screen bg-background neural-pattern">
      {/* Floating orbs for visual appeal */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="floating-orb w-32 h-32 top-20 left-10"></div>
        <div className="floating-orb w-24 h-24 top-40 right-20" style={{ animationDelay: '2s' }}></div>
        <div className="floating-orb w-40 h-40 bottom-32 left-1/3" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Hero Header */}
      <div className="relative">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-16 h-16 ai-gradient rounded-2xl flex items-center justify-center ai-glow animate-pulse-glow">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="absolute inset-0 ai-gradient rounded-2xl opacity-20 blur-xl"></div>
              </div>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold mb-6">
              <span className="ai-gradient-text">AI Text Explainer</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Experience the future of text comprehension with our AI-powered Chrome extension. 
              Select any text and get instant, intelligent explanations powered by GPT-3.5-turbo.
            </p>
            <div className="flex justify-center mt-8">
              <div className="glass-card px-6 py-3 rounded-full">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Live Demo Active</span>
                  <div className="w-2 h-2 ai-gradient rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Demo Controls */}
        <Card className="glass-card border-0 mb-8">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center">
              <div className="w-8 h-8 ai-gradient rounded-lg mr-3 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              Interactive Demo Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <Button onClick={handleDemoSuccess} className="ai-gradient hover:opacity-90 transition-all group">
                <svg className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Success
              </Button>
              <Button onClick={handleDemoLoading} variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 group">
                <svg className="w-4 h-4 mr-2 animate-spin group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Loading
              </Button>
              <Button onClick={handleDemoError} variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 group">
                <svg className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Error
              </Button>
              <Button onClick={handleCloseDemo} variant="outline" className="border-muted-foreground/30 hover:bg-muted/20 group">
                <svg className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Hide
              </Button>
            </div>
            <div className="glass-card p-4 rounded-lg">
              <div className="text-sm text-muted-foreground flex items-center">
                <div className="w-5 h-5 mr-2 ai-gradient rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Test different popup states above, or select text in the content below to see the AI explanation in action.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Demo Content */}
          <DemoContent />

          {/* Technical Specifications */}
          <div className="space-y-6">
            {/* Design Specs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                  </svg>
                  Design Specifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Popup Width:</span>
                    <Badge variant="secondary">320px</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Border Radius:</span>
                    <Badge variant="secondary">8px</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Z-Index:</span>
                    <Badge variant="secondary">9999</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Animation:</span>
                    <Badge variant="secondary">200ms fade-in</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Debounce:</span>
                    <Badge variant="secondary">300ms</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Features */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Technical Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Automatic text selection detection
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Smart positioning near selected text
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    GPT-3.5-turbo integration with 50-word limit
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    300ms debounce to prevent API spam
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Click-outside dismissal
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Error handling with user-friendly messages
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* OpenAI Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  Google Gemini Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-md p-3 mb-3">
                  <code className="text-xs text-gray-700">
                    "Give explanation/solution in detail: {'{selected_text}'}"
                  </code>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Model:</strong> Gemini Pro</p>
                  <p><strong>Max Tokens:</strong> ~75 (for 50 words + formatting)</p>
                  <p><strong>Temperature:</strong> 0.3 (for consistent, factual responses)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Demo Popup */}
      {showDemo && (
        <TextExplainerPopup
          selectedText="paradigm shift in computational technology"
          state={demoState}
          position={{ x: window.innerWidth / 2 - 160, y: window.innerHeight / 2 - 50 }}
          onClose={handleCloseDemo}
          onExplainMore={() => window.open(`https://gemini.google.com/app?text=${encodeURIComponent('Give explanation/solution in detail:\n\n paradigm shift in computational technology')}`, '_blank')}
        />
      )}

      {/* Real Text Selection Popup */}
      {selectedText && !showDemo && (
        <>
          <TextExplainerPopup
            selectedText={selectedText}
            state="loading"
            position={selectionPosition}
            onClose={clearSelection}
            onExplainMore={() => {
              if (isCodeSelection(selectedText)) {
                setShowTerminal(true);
              } else {
                window.open(`https://gemini.google.com/app?text=${encodeURIComponent('Give explanation/solution in detail:\n\n' + selectedText)}`, '_blank');
              }
            }}
          />
          {showTerminal && isCodeSelection(selectedText) && (
            <Terminal
              selectedCode={selectedText}
              onClose={() => {
                setShowTerminal(false);
                clearSelection();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
