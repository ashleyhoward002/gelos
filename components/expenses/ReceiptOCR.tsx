"use client";

import { useState, useRef } from "react";
import { createWorker, Worker } from "tesseract.js";
import { ReceiptItem, ReceiptData } from "./ReceiptSplitter";

interface ReceiptOCRProps {
  onComplete: (data: ReceiptData) => void;
  onCancel: () => void;
}

export default function ReceiptOCR({ onComplete, onCancel }: ReceiptOCRProps) {
  const [image, setImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedItems, setParsedItems] = useState<ReceiptItem[]>([]);
  const [step, setStep] = useState<"capture" | "processing" | "review">("capture");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Capture/upload image
  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview the image
    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
      processImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Process image with Tesseract
  const processImage = async (imageData: string) => {
    setStep("processing");
    setProcessing(true);
    setProgress(0);

    try {
      // Initialize Tesseract worker
      const worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      // Recognize text
      const { data: { text } } = await worker.recognize(imageData);

      // Parse the text to extract items and prices
      const items = parseReceiptText(text);
      setParsedItems(items);

      await worker.terminate();
      setStep("review");
    } catch (error) {
      console.error("OCR Error:", error);
      alert("Failed to process receipt. Please try again or enter items manually.");
      setStep("capture");
    }

    setProcessing(false);
  };

  // Parse receipt text to extract line items and prices
  const parseReceiptText = (text: string): ReceiptItem[] => {
    const lines = text.split("\n").filter(line => line.trim());
    const items: ReceiptItem[] = [];

    // Common price patterns: $12.99, 12.99, $12, etc.
    const pricePattern = /\$?\s*(\d+\.?\d{0,2})\s*$/;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip common non-item lines
      const skipPatterns = [
        /^(subtotal|sub total|tax|total|tip|gratuity|thank|welcome|receipt|date|time|card|visa|mastercard|amex|discover|check|cash|change|guest|server|table)/i,
        /^\d{2}[\/\-]\d{2}/, // Dates like 01/15 or 01-15
        /^[*\-=_]+$/, // Separators
        /^\d{4,}/, // Long numbers (card numbers, check numbers)
        /^#\d+/, // Order numbers
        /phone|fax|www|http|@/i, // Contact info
      ];

      if (skipPatterns.some(p => p.test(trimmed))) continue;
      if (trimmed.length < 3) continue;

      // Try to extract price from end of line
      const priceMatch = trimmed.match(pricePattern);
      if (priceMatch) {
        const priceStr = priceMatch[1];
        const price = parseFloat(priceStr);

        if (price > 0 && price < 500) { // Reasonable item price
          const itemName = trimmed.substring(0, trimmed.length - priceMatch[0].length).trim();
          if (itemName.length > 1) {
            items.push({
              id: `ocr_${Date.now()}_${items.length}`,
              name: cleanItemName(itemName),
              price: price,
              category: guessCategory(itemName),
            });
          }
        }
      }
    }

    return items;
  };

  // Clean up OCR artifacts from item names
  const cleanItemName = (name: string): string => {
    return name
      .replace(/[^\w\s\-'&]/g, "") // Remove special chars except hyphen, apostrophe, ampersand
      .replace(/\s+/g, " ")     // Normalize whitespace
      .trim()
      .slice(0, 50);            // Limit length
  };

  // Guess item category based on keywords
  const guessCategory = (name: string): ReceiptItem["category"] => {
    const lower = name.toLowerCase();

    // Drinks
    if (/beer|wine|cocktail|margarita|martini|vodka|rum|whiskey|bourbon|soda|sprite|coke|pepsi|tea|coffee|juice|lemonade|water|iced|latte|espresso|mocha|chai|milk|shake/i.test(lower)) {
      return "drink";
    }

    // Pizza
    if (/pizza|pie|slice|margherita|pepperoni|cheese pizza/i.test(lower)) {
      return "pizza";
    }

    // Appetizers
    if (/app|appetizer|starter|dip|nachos|wings|fries|chips|bread|salad|soup|mozzarella|calamari|bruschetta|hummus|guac|spinach|loaded/i.test(lower)) {
      return "app";
    }

    // Entrees
    if (/burger|steak|chicken|fish|salmon|shrimp|pasta|entree|dinner|lunch|sandwich|wrap|tacos?|burrito|bowl|rice|noodle|curry|grilled|fried|baked|roasted/i.test(lower)) {
      return "entree";
    }

    return "other";
  };

  // Handle item editing
  const updateItem = (id: string, updates: Partial<ReceiptItem>) => {
    setParsedItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const removeItem = (id: string) => {
    setParsedItems(prev => prev.filter(item => item.id !== id));
  };

  const addManualItem = () => {
    setParsedItems(prev => [...prev, {
      id: `manual_${Date.now()}`,
      name: "",
      price: 0,
      category: "other",
    }]);
  };

  // Complete and pass to ReceiptSplitter
  const handleComplete = () => {
    const validItems = parsedItems.filter(item => item.name && item.price > 0);
    const subtotal = validItems.reduce((sum, item) => sum + item.price, 0);
    onComplete({
      items: validItems,
      subtotal,
      tax: 0,
      gratuity: 0,
      total: subtotal,
    });
  };

  // Render based on step
  if (step === "capture") {
    return (
      <div className="space-y-4">
        <div className="text-center pb-4 border-b border-gray-200">
          <div className="text-4xl mb-2">📷</div>
          <h2 className="font-heading font-bold text-xl">Scan Receipt</h2>
          <p className="text-sm text-slate-medium">Take a photo or upload an image</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageCapture}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full p-8 border-2 border-dashed border-electric-cyan/30 rounded-xl hover:border-electric-cyan/50 transition-colors"
        >
          <div className="text-center">
            <svg className="w-12 h-12 text-electric-cyan/50 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="font-medium text-slate-dark">Tap to capture or upload</p>
            <p className="text-xs text-slate-medium mt-1">JPG, PNG, or HEIC</p>
          </div>
        </button>

        <button onClick={onCancel} className="btn-ghost w-full">
          Cancel
        </button>
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-cyan mx-auto mb-4"></div>
          <h2 className="font-heading font-bold text-xl mb-2">Reading Receipt...</h2>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-electric-cyan h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-slate-medium">{progress}% complete</p>
        </div>
      </div>
    );
  }

  // Review step
  return (
    <div className="space-y-4">
      <div className="text-center pb-4 border-b border-gray-200">
        <div className="text-4xl mb-2">✏️</div>
        <h2 className="font-heading font-bold text-xl">Review Items</h2>
        <p className="text-sm text-slate-medium">
          Found {parsedItems.length} items - edit as needed
        </p>
      </div>

      {/* Image preview */}
      {image && (
        <div className="relative h-24 rounded-xl overflow-hidden bg-gray-100">
          <img src={image} alt="Receipt" className="w-full h-full object-contain" />
          <button
            onClick={() => { setImage(null); setStep("capture"); setParsedItems([]); }}
            className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow-sm hover:bg-white"
          >
            <svg className="w-4 h-4 text-slate-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      )}

      {/* Parsed items */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {parsedItems.length === 0 ? (
          <div className="text-center py-6 text-slate-medium">
            <p>No items detected. Try a clearer photo or add manually.</p>
          </div>
        ) : (
          parsedItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItem(item.id, { name: e.target.value })}
                className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-electric-cyan"
                placeholder="Item name"
              />
              <div className="relative w-20">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-medium text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={item.price || ""}
                  onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-5 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-electric-cyan"
                />
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="text-slate-light hover:text-red-500 p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      <button
        onClick={addManualItem}
        className="text-electric-cyan text-sm font-medium hover:underline"
      >
        + Add item manually
      </button>

      {/* Summary */}
      {parsedItems.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-medium">Subtotal ({parsedItems.filter(i => i.name && i.price > 0).length} items)</span>
            <span className="font-bold">
              ${parsedItems.filter(i => i.name && i.price > 0).reduce((sum, item) => sum + item.price, 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="btn-secondary flex-1">
          Cancel
        </button>
        <button
          onClick={handleComplete}
          disabled={parsedItems.filter(i => i.name && i.price > 0).length === 0}
          className="btn-primary flex-1 disabled:opacity-50"
        >
          Continue to Split
        </button>
      </div>
    </div>
  );
}
