"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { ScrapbookElement } from "@/components/scrapbook/scrapbook-element";
import { ScrapbookToolbar } from "@/components/scrapbook/scrapbook-toolbar";
import { StickerPickerModal } from "@/components/scrapbook/sticker-picker-modal";
import { PhotoPickerModal } from "@/components/scrapbook/photo-picker-modal";
import { BackgroundPickerModal } from "@/components/scrapbook/background-picker-modal";
import {
  getScrapbookPage,
  getScrapbookElements,
  createElement,
  updateElement,
  deleteElement,
  updateScrapbookPage,
  saveAllElements,
  bringToFront,
  ScrapbookPage,
  ScrapbookElement as ScrapbookElementType,
  TextContent,
  PhotoContent,
  StickerContent,
  Sticker,
} from "@/lib/scrapbook";
import { Photo } from "@/lib/photos";

export default function ScrapbookEditorPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const pageId = params.pageId as string;

  const canvasRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState<ScrapbookPage | null>(null);
  const [elements, setElements] = useState<ScrapbookElementType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Modal states
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);

  // Canvas scale for drag calculations
  const [canvasScale, setCanvasScale] = useState(1);

  useEffect(() => {
    loadPageData();
  }, [pageId]);

  // Auto-save debounce
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 3000); // Auto-save after 3 seconds of no changes

    return () => clearTimeout(timer);
  }, [elements, hasUnsavedChanges]);

  // Deselect on canvas click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (canvasRef.current && e.target === canvasRef.current) {
        setSelectedElementId(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  async function loadPageData() {
    setLoading(true);
    const [pageData, elementsData] = await Promise.all([
      getScrapbookPage(pageId),
      getScrapbookElements(pageId),
    ]);

    if (!pageData) {
      router.push(`/groups/${groupId}/scrapbook`);
      return;
    }

    setPage(pageData);
    setElements(elementsData);
    setLoading(false);
  }

  const handleSave = async () => {
    if (!hasUnsavedChanges || saving) return;

    setSaving(true);
    await saveAllElements(
      pageId,
      elements.map((el) => ({
        id: el.id,
        position_x: el.position_x,
        position_y: el.position_y,
        width: el.width,
        height: el.height,
        rotation: el.rotation,
        z_index: el.z_index,
        content: el.content,
      }))
    );
    setHasUnsavedChanges(false);
    setSaving(false);
  };

  const handleElementUpdate = useCallback((elementId: string, updates: Partial<ScrapbookElementType>) => {
    setElements((prev) =>
      prev.map((el) => (el.id === elementId ? { ...el, ...updates } : el))
    );
    setHasUnsavedChanges(true);
  }, []);

  const handleElementDelete = async (elementId: string) => {
    await deleteElement(elementId);
    setElements((prev) => prev.filter((el) => el.id !== elementId));
    setSelectedElementId(null);
    setHasUnsavedChanges(false); // Already deleted from DB
  };

  const handleAddPhoto = async (photo: Photo) => {
    const content: PhotoContent = {
      photoId: photo.id,
      photoUrl: photo.file_url,
      caption: photo.caption || undefined,
    };

    const result = await createElement(pageId, "photo", content, { x: 100, y: 100 });
    if (result.success && result.element) {
      setElements((prev) => [...prev, result.element!]);
      setSelectedElementId(result.element.id);
    }
  };

  const handleAddText = async () => {
    const content: TextContent = {
      text: "Double-click to edit",
      fontSize: 18,
      color: "#1E293B",
      textAlign: "center",
    };

    const result = await createElement(pageId, "text", content, { x: 150, y: 150 });
    if (result.success && result.element) {
      setElements((prev) => [...prev, result.element!]);
      setSelectedElementId(result.element.id);
    }
  };

  const handleAddSticker = async (sticker: Sticker) => {
    const content: StickerContent = {
      stickerId: sticker.id,
      emoji: sticker.emoji || undefined,
      stickerUrl: sticker.image_url || undefined,
    };

    const result = await createElement(pageId, "sticker", content, { x: 200, y: 200 });
    if (result.success && result.element) {
      setElements((prev) => [...prev, result.element!]);
      setSelectedElementId(result.element.id);
    }
  };

  const handleBackgroundChange = async (color: string) => {
    if (!page) return;

    await updateScrapbookPage(pageId, { background_color: color });
    setPage({ ...page, background_color: color });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bright-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-cyan"></div>
      </div>
    );
  }

  if (!page) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/groups/${groupId}/scrapbook`}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-slate-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-heading font-semibold text-slate-dark">{page.title}</h1>
              {page.description && (
                <p className="text-sm text-slate-medium">{page.description}</p>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 text-sm">
            {saving ? (
              <span className="text-slate-medium flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-electric-cyan/30 border-t-electric-cyan rounded-full animate-spin" />
                Saving...
              </span>
            ) : hasUnsavedChanges ? (
              <span className="text-amber-600">Unsaved changes</span>
            ) : (
              <span className="text-green-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4">
        <div className="max-w-4xl mx-auto">
          <ScrapbookToolbar
            onAddPhoto={() => setShowPhotoModal(true)}
            onAddText={handleAddText}
            onAddSticker={() => setShowStickerModal(true)}
            onChangeBackground={() => setShowBackgroundModal(true)}
            onSave={handleSave}
            saving={saving}
            hasUnsavedChanges={hasUnsavedChanges}
          />
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto">
          {/* Canvas */}
          <div
            ref={canvasRef}
            className="relative mx-auto rounded-2xl shadow-xl overflow-hidden"
            style={{
              width: 800,
              height: 800,
              backgroundColor: page.background_color,
            }}
            onClick={(e) => {
              if (e.target === canvasRef.current) {
                setSelectedElementId(null);
              }
            }}
          >
            {/* Elements */}
            {elements.map((element) => (
              <ScrapbookElement
                key={element.id}
                element={element}
                isSelected={selectedElementId === element.id}
                onSelect={() => {
                  setSelectedElementId(element.id);
                  bringToFront(element.id, pageId);
                }}
                onUpdate={(updates) => handleElementUpdate(element.id, updates)}
                onDelete={() => handleElementDelete(element.id)}
                canvasScale={canvasScale}
              />
            ))}

            {/* Empty state */}
            {elements.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-center p-8">
                <div>
                  <div className="text-6xl mb-4">✨</div>
                  <h3 className="text-lg font-semibold text-slate-dark mb-2">Start creating!</h3>
                  <p className="text-slate-medium max-w-xs mx-auto">
                    Use the toolbar above to add photos, text, and stickers to your scrapbook page
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <PhotoPickerModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onSelect={handleAddPhoto}
        groupId={groupId}
      />

      <StickerPickerModal
        isOpen={showStickerModal}
        onClose={() => setShowStickerModal(false)}
        onSelect={handleAddSticker}
      />

      <BackgroundPickerModal
        isOpen={showBackgroundModal}
        onClose={() => setShowBackgroundModal(false)}
        currentColor={page.background_color}
        onSelect={handleBackgroundChange}
      />
    </div>
  );
}
