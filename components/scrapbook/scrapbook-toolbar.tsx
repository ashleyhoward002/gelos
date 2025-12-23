"use client";

import { useState } from "react";

interface ScrapbookToolbarProps {
  onAddPhoto: () => void;
  onAddText: () => void;
  onAddSticker: () => void;
  onChangeBackground: () => void;
  onSave: () => void;
  saving: boolean;
  hasUnsavedChanges: boolean;
}

export function ScrapbookToolbar({
  onAddPhoto,
  onAddText,
  onAddSticker,
  onChangeBackground,
  onSave,
  saving,
  hasUnsavedChanges,
}: ScrapbookToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-white rounded-xl shadow-card border border-gray-200">
      {/* Add Photo */}
      <button
        onClick={onAddPhoto}
        className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-slate-dark"
        title="Add Photo"
      >
        <svg className="w-5 h-5 text-electric-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="hidden sm:inline text-sm font-medium">Photo</span>
      </button>

      {/* Add Text */}
      <button
        onClick={onAddText}
        className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-slate-dark"
        title="Add Text"
      >
        <svg className="w-5 h-5 text-neon-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span className="hidden sm:inline text-sm font-medium">Text</span>
      </button>

      {/* Add Sticker */}
      <button
        onClick={onAddSticker}
        className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-slate-dark"
        title="Add Sticker"
      >
        <span className="text-xl">⭐</span>
        <span className="hidden sm:inline text-sm font-medium">Sticker</span>
      </button>

      <div className="w-px h-6 bg-gray-200" />

      {/* Background */}
      <button
        onClick={onChangeBackground}
        className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-slate-dark"
        title="Change Background"
      >
        <svg className="w-5 h-5 text-vibrant-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
        <span className="hidden sm:inline text-sm font-medium">Background</span>
      </button>

      <div className="flex-1" />

      {/* Save indicator */}
      {hasUnsavedChanges && (
        <span className="text-xs text-slate-medium">Unsaved changes</span>
      )}

      {/* Save Button */}
      <button
        onClick={onSave}
        disabled={saving || !hasUnsavedChanges}
        className="flex items-center gap-2 px-4 py-2 bg-electric-cyan text-white rounded-lg font-medium hover:bg-electric-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="hidden sm:inline">Saving...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="hidden sm:inline">Save</span>
          </>
        )}
      </button>
    </div>
  );
}
