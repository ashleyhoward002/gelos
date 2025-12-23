"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getStickerCategories, getStickers, StickerCategory, Sticker } from "@/lib/scrapbook";

interface StickerPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (sticker: Sticker) => void;
}

export function StickerPickerModal({ isOpen, onClose, onSelect }: StickerPickerModalProps) {
  const [categories, setCategories] = useState<StickerCategory[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  async function loadData() {
    setLoading(true);
    const [cats, allStickers] = await Promise.all([
      getStickerCategories(),
      getStickers(),
    ]);
    setCategories(cats);
    setStickers(allStickers);
    setLoading(false);
  }

  const filteredStickers = selectedCategory
    ? stickers.filter((s) => s.category_id === selectedCategory)
    : stickers;

  const handleSelect = (sticker: Sticker) => {
    onSelect(sticker);
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
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-heading font-semibold text-slate-dark">Choose a Sticker</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 p-4 border-b border-gray-100 overflow-x-auto">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === null
                    ? "bg-vibrant-orange text-white"
                    : "bg-gray-100 text-slate-medium hover:bg-gray-200"
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category.id
                      ? "bg-vibrant-orange text-white"
                      : "bg-gray-100 text-slate-medium hover:bg-gray-200"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* Stickers grid */}
            <div className="p-4 max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-cyan"></div>
                </div>
              ) : filteredStickers.length === 0 ? (
                <p className="text-center text-slate-medium py-10">No stickers found</p>
              ) : (
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {filteredStickers.map((sticker) => (
                    <button
                      key={sticker.id}
                      onClick={() => handleSelect(sticker)}
                      className="aspect-square flex items-center justify-center text-3xl rounded-xl hover:bg-gray-100 transition-colors hover:scale-110"
                      title={sticker.name}
                    >
                      {sticker.emoji || "⭐"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
