import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TextExplainerPopup } from "@/components/text-explainer-popup";

interface PopupState {
  text: string;
  position: { x: number; y: number };
}

export function DemoContent(): JSX.Element {
  const [activePopup, setActivePopup] = useState<PopupState | null>(null);

  const handleTextClick = (e: React.MouseEvent<HTMLSpanElement>, text: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setActivePopup({
      text,
      position: { x: rect.left, y: rect.bottom + 10 }
    });
  };

  const closePopup = () => {
    setActivePopup(null);
  };

  return (
    <>
      <Card>
        <CardContent>
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              Artificial intelligence represents a{" "}
              <span
                className="bg-gradient-to-r from-green-200 to-green-300 px-1 py-0.5 rounded cursor-pointer hover:from-green-300 hover:to-green-400 transition-colors"
                onClick={(e) => handleTextClick(e, "paradigm shift")}
              >
                paradigm shift
              </span>{" "}
              in how we approach complex problem-solving. Machine learning algorithms can process vast amounts of data to identify patterns that would be impossible for humans to detect manually.
            </p>

            <p>
              The concept of{" "}
              <span
                className="bg-gradient-to-r from-green-200 to-green-300 px-1 py-0.5 rounded cursor-pointer hover:from-green-300 hover:to-green-400 transition-colors"
                onClick={(e) => handleTextClick(e, "neural networks")}
              >
                neural networks
              </span>{" "}
              is inspired by the structure of the human brain, consisting of interconnected nodes that simulate neurons. These networks can learn and adapt through training on large datasets.
            </p>

            <p>
              Natural language processing enables computers to understand and generate human language, making applications like chatbots and{" "}
              <span
                className="bg-gradient-to-r from-green-200 to-green-300 px-1 py-0.5 rounded cursor-pointer hover:from-green-300 hover:to-green-400 transition-colors"
                onClick={(e) => handleTextClick(e, "translation services")}
              >
                translation services
              </span>{" "}
              possible. This technology has revolutionized how we interact with digital systems.
            </p>

            <p className="text-sm text-gray-500 italic flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
              </svg>
              Try clicking on the highlighted terms above to see the popup in action!
            </p>
          </div>
        </CardContent>
      </Card>

      {activePopup && (
        <TextExplainerPopup
          selectedText={activePopup.text}
          position={activePopup.position}
          onClose={closePopup}
          onExplainMore={() => window.open(`https://gemini.google.com/app?text=${encodeURIComponent('Give explanation/solution in detail:\n\n' + activePopup.text)}`, '_blank')}
        />
      )}
    </>
  );
}
