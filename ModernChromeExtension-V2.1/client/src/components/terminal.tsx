import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TerminalProps {
  selectedCode: string;
  onClose: () => void;
}

interface Message {
  type: 'user' | 'ai' | 'improvement';
  content: string;
}

export function Terminal({ selectedCode, onClose }: TerminalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial code analysis when component mounts
  useEffect(() => {
    analyzeCode();
  }, []);

  const analyzeCode = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: selectedCode,
          analyze: true,
        }),
      });

      const data = await response.json();
      if (data.explanation && data.improvements) {
        setMessages([
          { type: 'ai', content: data.explanation },
          { type: 'improvement', content: data.improvements }
        ]);
      }
    } catch (error) {
      setMessages([
        { type: 'ai', content: 'Sorry, I encountered an error while analyzing the code.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: selectedCode,
          question: userMessage,
        }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, { type: 'ai', content: data.explanation }]);
    } catch (error) {
      setMessages(prev => [...prev, { type: 'ai', content: 'Sorry, I encountered an error while processing your request.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[500px] bg-black/95 text-white backdrop-blur-xl border border-white/10 shadow-2xl rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-white/5">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="text-sm font-mono">Code Terminal</div>
        <Button
          variant="ghost"
          size="sm"
          className="text-white/70 hover:text-white"
          onClick={onClose}
        >
          ×
        </Button>
      </div>

      <div className="p-4 h-[400px] overflow-y-auto font-mono text-sm">
        <div className="text-green-400 mb-4">
          Selected code: {selectedCode.length > 100 ? `${selectedCode.slice(0, 100)}...` : selectedCode}
        </div>
        
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-3 ${
              message.type === 'user' 
                ? 'text-blue-400' 
                : message.type === 'improvement' 
                  ? 'text-purple-400 border-l-2 border-purple-400 pl-2' 
                  : 'text-green-400'
            }`}
          >
            {message.type === 'user' 
              ? '> ' 
              : message.type === 'improvement' 
                ? '🔧 Improvements:\n' 
                : '$ '}
            {message.content}
          </div>
        ))}
        
        {isLoading && (
          <div className="text-yellow-400">
            Processing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-white/10">
        <div className="flex items-center space-x-2">
          <span className="text-green-400">{'>'}</span>
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent border-none text-white placeholder-white/30 focus:outline-none focus:ring-0"
            placeholder="Ask about the code..."
            disabled={isLoading}
          />
        </div>
      </form>
    </Card>
  );
} 