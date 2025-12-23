"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Background color options organized by category
const backgroundColors = {
  warm: [
    { name: "Warm Cream", value: "#FFF8F0" },
    { name: "Peach", value: "#FFEFD5" },
    { name: "Soft Coral", value: "#FFE4E1" },
    { name: "Sunset Orange", value: "#FFE5CC" },
  ],
  cool: [
    { name: "Sky Blue", value: "#F0F8FF" },
    { name: "Mint", value: "#F0FFF4" },
    { name: "Light Lavender", value: "#F0F0FF" },
    { name: "Aqua", value: "#E0FFFF" },
  ],
  pastel: [
    { name: "Soft Pink", value: "#FFF0F5" },
    { name: "Lemon", value: "#FFFACD" },
    { name: "Lilac", value: "#E8E0F0" },
    { name: "Rose", value: "#FFE4EC" },
  ],
  neutral: [
    { name: "White", value: "#FFFFFF" },
    { name: "Off-White", value: "#FAFAFA" },
    { name: "Light Gray", value: "#F5F5F5" },
    { name: "Warm Gray", value: "#F0EDE8" },
  ],
};

interface BackgroundPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentColor: string;
  onSelect: (color: string) => void;
}

export function BackgroundPickerModal({
  isOpen,
  onClose,
  currentColor,
  onSelect,
}: BackgroundPickerModalProps) {
  const [selectedColor, setSelectedColor] = useState(currentColor);

  const handleApply = () => {
    onSelect(selectedColor);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-heading font-semibold text-slate-dark">Background Color</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Color sections */}
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {/* Warm colors */}
              <div>
                <h3 className="text-sm font-medium text-slate-medium mb-2">Warm</h3>
                <div className="grid grid-cols-4 gap-2">
                  {backgroundColors.warm.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={`aspect-square rounded-lg border-2 transition-all ${
                        selectedColor === color.value
                          ? "border-vibrant-orange scale-105 shadow-md"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Cool colors */}
              <div>
                <h3 className="text-sm font-medium text-slate-medium mb-2">Cool</h3>
                <div className="grid grid-cols-4 gap-2">
                  {backgroundColors.cool.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={`aspect-square rounded-lg border-2 transition-all ${
                        selectedColor === color.value
                          ? "border-vibrant-orange scale-105 shadow-md"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Pastel colors */}
              <div>
                <h3 className="text-sm font-medium text-slate-medium mb-2">Pastel</h3>
                <div className="grid grid-cols-4 gap-2">
                  {backgroundColors.pastel.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={`aspect-square rounded-lg border-2 transition-all ${
                        selectedColor === color.value
                          ? "border-vibrant-orange scale-105 shadow-md"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Neutral colors */}
              <div>
                <h3 className="text-sm font-medium text-slate-medium mb-2">Neutral</h3>
                <div className="grid grid-cols-4 gap-2">
                  {backgroundColors.neutral.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={`aspect-square rounded-lg border-2 transition-all ${
                        selectedColor === color.value
                          ? "border-vibrant-orange scale-105 shadow-md"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <h3 className="text-sm font-medium text-slate-medium mb-2">Preview</h3>
                <div
                  className="h-20 rounded-lg border border-gray-200"
                  style={{ backgroundColor: selectedColor }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-gray-200">
              <button onClick={onClose} className="btn-outline flex-1">
                Cancel
              </button>
              <button onClick={handleApply} className="btn-primary flex-1">
                Apply
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
