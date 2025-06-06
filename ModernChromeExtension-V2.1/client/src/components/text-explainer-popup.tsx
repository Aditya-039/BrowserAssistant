import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ExplainTextRequest, ExplanationResponse } from "@shared/schema";

interface TextExplainerPopupProps {
  selectedText: string;
  state?: 'loading' | 'success' | 'error' | 'idle';
  position: { x: number; y: number };
  onClose: () => void;
  onExplainMore: () => void;
  explanation?: string;
}

export function TextExplainerPopup({
  selectedText,
  state: initialState = 'idle',
  position,
  onClose,
  onExplainMore,
  explanation: providedExplanation,
}: TextExplainerPopupProps) {
  const [currentState, setCurrentState] = useState(initialState);
  const [explanation, setExplanation] = useState(providedExplanation || '');
  const popupRef = useRef<HTMLDivElement>(null);

  const explainMutation = useMutation({
    mutationFn: async (text: string): Promise<ExplanationResponse> => {
      const response = await apiRequest('POST', '/api/explain', { text } as ExplainTextRequest);
      return response.json();
    },
    onSuccess: (data) => {
      setExplanation(data.explanation);
      setCurrentState('success');
    },
    onError: () => {
      setCurrentState('error');
    },
  });

  useEffect(() => {
    if (currentState === 'idle' && selectedText && !providedExplanation) {
      setCurrentState('loading');
      explainMutation.mutate(selectedText);
    }
  }, [selectedText, currentState, providedExplanation, explainMutation]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleRetry = () => {
    setCurrentState('loading');
    explainMutation.mutate(selectedText);
  };

  // Ensure popup stays within viewport
  const adjustedPosition = {
    x: Math.min(Math.max(position.x, 10), window.innerWidth - 330),
    y: Math.min(Math.max(position.y, 10), window.innerHeight - 200),
  };

  return (
    <div 
      ref={popupRef}
      className="fixed animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        zIndex: 9999,
      }}
    >
      <Card className="w-80 shadow-xl border border-gray-200">
        {/* Arrow */}
        <div className="absolute -top-2 left-5 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-white" 
             style={{ filter: 'drop-shadow(0 -2px 4px rgba(0, 0, 0, 0.1))' }} />
        
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 pr-3">
              {currentState === 'loading' && (
                <div className="flex items-center space-x-3">
                  <svg className="w-4 h-4 animate-spin text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-sm text-gray-600">Getting explanation...</span>
                </div>
              )}

              {currentState === 'success' && (
                <p className="text-sm text-gray-800 leading-relaxed">
                  {explanation || "A fundamental change in approach or underlying assumptions. In AI context, it represents a major shift from traditional programming to machine learning methodologies that revolutionize problem-solving capabilities."}
                </p>
              )}

              {currentState === 'error' && (
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-800 mb-2">
                      Couldn't fetch explanation. Try again later.
                    </p>
                    <Button 
                      onClick={handleRetry} 
                      variant="ghost" 
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 h-auto p-0 text-xs font-medium"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Try again
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="w-6 h-6 p-0 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          {currentState === 'success' && (
            <div className="pt-2 border-t border-gray-100">
              <Button
                onClick={onExplainMore}
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700 h-auto p-0 text-xs font-medium"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Explain more (Open advanced GPT)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
