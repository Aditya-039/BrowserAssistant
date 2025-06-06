import { useState, useEffect, useCallback } from "react";

interface UseTextSelectionReturn {
  selectedText: string;
  selectionPosition: { x: number; y: number };
  clearSelection: () => void;
}

export function useTextSelection(): UseTextSelectionReturn {
  const [selectedText, setSelectedText] = useState("");
  const [selectionPosition, setSelectionPosition] = useState({ x: 0, y: 0 });
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const clearSelection = useCallback(() => {
    setSelectedText("");
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => {
      // Clear existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Set new debounced timer (300ms as specified in requirements)
      const timer = setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim() || "";
        
        if (text.length > 0 && text.length <= 1000) {
          const range = selection?.getRangeAt(0);
          if (range) {
            const rect = range.getBoundingClientRect();
            
            // Position popup to the right of selection, with fallback to left if needed
            let x = rect.right + 10;
            let y = rect.top;
            
            // Ensure popup stays within viewport
            if (x + 320 > window.innerWidth) {
              x = rect.left - 330; // Show on left side
            }
            
            if (y + 200 > window.innerHeight) {
              y = window.innerHeight - 210;
            }
            
            // Ensure minimum distances from edges
            x = Math.max(10, x);
            y = Math.max(10, y);

            setSelectedText(text);
            setSelectionPosition({ x, y });
          }
        } else {
          setSelectedText("");
        }
      }, 300); // 300ms debounce as specified in requirements

      setDebounceTimer(timer);
    };

    // Listen for selection changes
    document.addEventListener("selectionchange", handleSelectionChange);

    // Cleanup
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  // Clear selection when clicking elsewhere
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      // Don't clear if clicking within a popup or on demo content
      const target = event.target as HTMLElement;
      if (target.closest('[data-popup]') || target.closest('.bg-gradient-to-r')) {
        return;
      }
      
      // Small delay to allow for new selections
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.toString().trim().length === 0) {
          clearSelection();
        }
      }, 10);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [clearSelection]);

  return {
    selectedText,
    selectionPosition,
    clearSelection,
  };
}
