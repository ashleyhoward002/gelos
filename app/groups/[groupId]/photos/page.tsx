"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import {
  uploadPhotos,
  toggleFavorite,
  deletePhoto,
  updatePhoto,
  checkForDuplicates,
  batchDeletePhotos,
  batchUpdateOuting,
  batchToggleFavorite,
  Photo,
} from "@/lib/photos";
import { getOutingsForSelect } from "@/lib/outings";
import Header from "@/components/Header";

// Color palette for uploaders
const UPLOADER_COLORS = [
  "#00D4FF", // electric cyan
  "#A855F7", // neon purple
  "#FF8C42", // vibrant orange
  "#4ADE80", // cosmic green
  "#EC4899", // hot pink
  "#FFD700", // golden sun
  "#06B6D4", // cyan
  "#8B5CF6", // violet
];

export default function PhotosPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTap = useRef(0);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [outings, setOutings] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // View & Filter state
  const [view, setView] = useState<"grid" | "event" | "uploader">("grid");
  const [filterEvent, setFilterEvent] = useState<string | null>(null);
  const [filterUploader, setFilterUploader] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [selectedOuting, setSelectedOuting] = useState("");

  // Duplicate detection state
  const [duplicates, setDuplicates] = useState<{ filename: string; size: number; existingPhoto: Photo }[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [imgTransition, setImgTransition] = useState(true);
  const [doubleTapAnim, setDoubleTapAnim] = useState<string | null>(null);

  // Edit photo state (in lightbox)
  const [editCaption, setEditCaption] = useState("");
  const [editOuting, setEditOuting] = useState("");
  const [saving, setSaving] = useState(false);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showOutingSelect, setShowOutingSelect] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Derived data
  const uploaders = [...new Set(photos.map((p) => p.uploader?.display_name || p.uploader?.full_name || "Unknown"))];
  const events = [...new Set(photos.filter((p) => p.outing).map((p) => p.outing!.title))];

  // Uploader color map
  const uploaderColors: Record<string, string> = {};
  uploaders.forEach((name, idx) => {
    uploaderColors[name] = UPLOADER_COLORS[idx % UPLOADER_COLORS.length];
  });

  // Filtered photos
  const filtered = photos.filter((p) => {
    if (showFavoritesOnly && !p.is_favorite) return false;
    if (filterEvent && p.outing?.title !== filterEvent) return false;
    if (filterUploader) {
      const uploaderName = p.uploader?.display_name || p.uploader?.full_name || "Unknown";
      if (uploaderName !== filterUploader) return false;
    }
    return true;
  });

  // Grouped by event
  const groupedByEvent = events.reduce((acc, event) => {
    const eventPhotos = filtered.filter((p) => p.outing?.title === event);
    if (eventPhotos.length > 0) acc[event] = eventPhotos;
    return acc;
  }, {} as Record<string, Photo[]>);

  useEffect(() => {
    loadData();
  }, [groupId]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (lightboxIndex !== null) {
          closeLightbox();
        } else if (selectionMode) {
          exitSelectionMode();
        }
        return;
      }
      if (lightboxIndex !== null) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          goPrev();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          goNext();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, filtered.length, selectionMode]);

  // Toast auto-hide
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    // Fetch photos
    let query = supabase
      .from("photos")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    const { data: photosData, error: photosError } = await query;
    if (photosError) console.error("Error fetching photos:", photosError);

    // Fetch uploader info
    const photosWithDetails: Photo[] = [];
    for (const photo of photosData || []) {
      const { data: uploader } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", photo.uploaded_by)
        .single();

      let outing = null;
      if (photo.outing_id) {
        const { data: outingData } = await supabase
          .from("outings")
          .select("id, title")
          .eq("id", photo.outing_id)
          .single();
        outing = outingData;
      }

      photosWithDetails.push({ ...photo, uploader, outing });
    }

    const outingsData = await getOutingsForSelect(groupId);
    setPhotos(photosWithDetails);
    setOutings(outingsData);
    setLoading(false);
  }

  // Lightbox functions
  const openLightbox = (photoId: string) => {
    if (selectionMode) {
      togglePhotoSelection(photoId);
      return;
    }
    const idx = filtered.findIndex((p) => p.id === photoId);
    setImgTransition(false);
    setLightboxIndex(idx);
    const photo = filtered[idx];
    setEditCaption(photo.caption || "");
    setEditOuting(photo.outing_id || "");
    setTimeout(() => setImgTransition(true), 50);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    setTouchDelta(0);
  };

  const goNext = useCallback(() => {
    if (lightboxIndex !== null && lightboxIndex < filtered.length - 1) {
      setImgTransition(true);
      const newIdx = lightboxIndex + 1;
      setLightboxIndex(newIdx);
      const photo = filtered[newIdx];
      setEditCaption(photo.caption || "");
      setEditOuting(photo.outing_id || "");
    }
  }, [lightboxIndex, filtered]);

  const goPrev = useCallback(() => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setImgTransition(true);
      const newIdx = lightboxIndex - 1;
      setLightboxIndex(newIdx);
      const photo = filtered[newIdx];
      setEditCaption(photo.caption || "");
      setEditOuting(photo.outing_id || "");
    }
  }, [lightboxIndex, filtered]);

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setImgTransition(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    setTouchDelta(e.touches[0].clientX - touchStart);
  };

  const handleTouchEnd = () => {
    setImgTransition(true);
    if (Math.abs(touchDelta) > 60) {
      if (touchDelta < 0) goNext();
      else goPrev();
    }
    setTouchStart(null);
    setTouchDelta(0);
  };

  // Double tap to like
  const handleDoubleTap = (photoId: string) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      const photo = photos.find((p) => p.id === photoId);
      if (photo && !photo.is_favorite) {
        handleToggleFavorite(photoId);
      }
      setDoubleTapAnim(photoId);
      setTimeout(() => setDoubleTapAnim(null), 600);
    }
    lastTap.current = now;
  };

  async function handleToggleFavorite(photoId: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    const result = await toggleFavorite(photoId, groupId);
    if (result.success) {
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, is_favorite: result.is_favorite! } : p))
      );
    }
  }

  async function handleDelete(photoId: string) {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    const result = await deletePhoto(photoId, groupId);
    if (result.success) {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      closeLightbox();
    } else {
      alert(result.error);
    }
  }

  async function handleSavePhoto() {
    if (lightboxIndex === null) return;
    const photo = filtered[lightboxIndex];

    setSaving(true);
    const result = await updatePhoto(photo.id, groupId, {
      caption: editCaption,
      outing_id: editOuting || null,
    });

    if (result.error) {
      alert(result.error);
    } else {
      const updatedPhoto = {
        ...photo,
        caption: editCaption || null,
        outing_id: editOuting || null,
        outing: editOuting ? outings.find((o) => o.id === editOuting) || null : null,
      };
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? updatedPhoto : p)));
    }
    setSaving(false);
  }

  // Upload functions
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("files", file));
    if (caption) formData.append("caption", caption);
    if (selectedOuting) formData.append("outingId", selectedOuting);

    const result = await uploadPhotos(groupId, formData);
    if (result.error) {
      alert(result.error);
    } else {
      setShowUploadModal(false);
      setSelectedFiles([]);
      setCaption("");
      setSelectedOuting("");
      loadData();
    }
    setUploading(false);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setCheckingDuplicates(true);
    setPendingFiles(files);

    const fileInfo = files.map((f) => ({ name: f.name, size: f.size }));
    const foundDuplicates = await checkForDuplicates(groupId, fileInfo);

    if (foundDuplicates.length > 0) {
      setDuplicates(foundDuplicates);
      setShowDuplicateModal(true);
    } else {
      setSelectedFiles(files);
    }
    setCheckingDuplicates(false);
  }

  function handleSkipDuplicates() {
    const duplicateNames = new Set(duplicates.map((d) => d.filename));
    setSelectedFiles(pendingFiles.filter((f) => !duplicateNames.has(f.name)));
    setShowDuplicateModal(false);
    setDuplicates([]);
    setPendingFiles([]);
  }

  function handleUploadAnyway() {
    setSelectedFiles(pendingFiles);
    setShowDuplicateModal(false);
    setDuplicates([]);
    setPendingFiles([]);
  }

  function handleCancelDuplicates() {
    setShowDuplicateModal(false);
    setDuplicates([]);
    setPendingFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Selection mode functions
  function enterSelectionMode() {
    setSelectionMode(true);
    setSelectedPhotos(new Set());
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedPhotos(new Set());
    setShowDeleteConfirm(false);
    setShowOutingSelect(false);
  }

  function togglePhotoSelection(photoId: string) {
    setSelectedPhotos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) newSet.delete(photoId);
      else newSet.add(photoId);
      return newSet;
    });
  }

  function selectAll() {
    setSelectedPhotos(new Set(filtered.map((p) => p.id)));
  }

  async function handleBatchDelete() {
    setBatchProcessing(true);
    const result = await batchDeletePhotos(Array.from(selectedPhotos), groupId);
    if (result.error) {
      setToast({ message: result.error, type: "error" });
    } else {
      setToast({ message: `${result.count} photo${result.count !== 1 ? "s" : ""} deleted`, type: "success" });
      setPhotos((prev) => prev.filter((p) => !selectedPhotos.has(p.id)));
      exitSelectionMode();
    }
    setBatchProcessing(false);
    setShowDeleteConfirm(false);
  }

  async function handleBatchOuting(outingId: string) {
    setBatchProcessing(true);
    const outing = outings.find((o) => o.id === outingId);
    const result = await batchUpdateOuting(Array.from(selectedPhotos), groupId, outingId || null);
    if (result.error) {
      setToast({ message: result.error, type: "error" });
    } else {
      const message = outingId
        ? `${result.count} photo${result.count !== 1 ? "s" : ""} added to "${outing?.title}"`
        : `${result.count} photo${result.count !== 1 ? "s" : ""} removed from outing`;
      setToast({ message, type: "success" });
      loadData();
      exitSelectionMode();
    }
    setBatchProcessing(false);
    setShowOutingSelect(false);
  }

  async function handleBatchFavorite(setFavorite: boolean) {
    setBatchProcessing(true);
    const result = await batchToggleFavorite(Array.from(selectedPhotos), groupId, setFavorite);
    if (result.error) {
      setToast({ message: result.error, type: "error" });
    } else {
      const message = setFavorite
        ? `${result.count} photo${result.count !== 1 ? "s" : ""} added to favorites`
        : `${result.count} photo${result.count !== 1 ? "s" : ""} removed from favorites`;
      setToast({ message, type: "success" });
      setPhotos((prev) => prev.map((p) => (selectedPhotos.has(p.id) ? { ...p, is_favorite: setFavorite } : p)));
      exitSelectionMode();
    }
    setBatchProcessing(false);
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function getUploaderName(photo: Photo) {
    return photo.uploader?.display_name || photo.uploader?.full_name || "Unknown";
  }

  const currentPhoto = lightboxIndex !== null ? filtered[lightboxIndex] : null;

  return (
    <div className="min-h-screen bg-bright-white">
      <Header
        showBack
        backHref={`/groups/${groupId}`}
        title="Photos"
        subtitle={selectionMode ? `${selectedPhotos.size} selected` : `${filtered.length} photos`}
      />

      <main className="max-w-4xl mx-auto px-3 py-4">
        {/* View Toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
          {[
            { key: "grid" as const, label: "All" },
            { key: "event" as const, label: "By Event" },
            { key: "uploader" as const, label: "By Person" },
          ].map((v) => (
            <button
              key={v.key}
              onClick={() => {
                setView(v.key);
                setFilterEvent(null);
                setFilterUploader(null);
              }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                view === v.key
                  ? "bg-white text-slate-dark shadow-sm"
                  : "text-slate-medium hover:text-slate-dark"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Selection Mode Header */}
        {selectionMode ? (
          <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-xl shadow-sm">
            <div className="flex items-center gap-2">
              <button onClick={selectAll} className="text-sm font-medium text-electric-cyan">
                Select All
              </button>
              <span className="text-slate-light">·</span>
              <button onClick={() => setSelectedPhotos(new Set())} className="text-sm font-medium text-slate-medium">
                Clear
              </button>
            </div>
            <button onClick={exitSelectionMode} className="text-sm font-medium text-slate-medium">
              Cancel
            </button>
          </div>
        ) : (
          /* Action Bar */
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                showFavoritesOnly
                  ? "bg-electric-cyan text-white"
                  : "bg-white text-slate-dark hover:bg-electric-cyan/10"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill={showFavoritesOnly ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              Favorites
            </button>

            <div className="flex items-center gap-2">
              {photos.length > 0 && (
                <button onClick={enterSelectionMode} className="btn-secondary text-sm py-2">
                  Select
                </button>
              )}
              <button onClick={() => setShowUploadModal(true)} className="btn-primary text-sm py-2">
                + Upload
              </button>
            </div>
          </div>
        )}

        {/* Batch Action Bar */}
        {selectionMode && selectedPhotos.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-xl shadow-sm mb-4">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={batchProcessing}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
            <button
              onClick={() => setShowOutingSelect(true)}
              disabled={batchProcessing}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-dark hover:bg-gray-50 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Add to Event
            </button>
            <button
              onClick={() => handleBatchFavorite(true)}
              disabled={batchProcessing}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-electric-cyan hover:bg-electric-cyan/10 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Favorite
            </button>
          </div>
        )}

        {/* Filter Pills (Event/Uploader filters) */}
        {view === "event" && !filterEvent && events.length > 0 && (
          <div className="space-y-2 mb-4">
            {events.map((event) => {
              const count = photos.filter((p) => p.outing?.title === event).length;
              return (
                <button
                  key={event}
                  onClick={() => setFilterEvent(event)}
                  className="w-full flex justify-between items-center p-4 bg-white rounded-xl hover:shadow-md transition-shadow"
                >
                  <span className="font-semibold text-slate-dark">{event}</span>
                  <span className="text-sm text-slate-medium">{count} photos</span>
                </button>
              );
            })}
          </div>
        )}

        {view === "uploader" && !filterUploader && uploaders.length > 0 && (
          <div className="space-y-2 mb-4">
            {uploaders.map((name) => {
              const count = photos.filter((p) => getUploaderName(p) === name).length;
              return (
                <button
                  key={name}
                  onClick={() => setFilterUploader(name)}
                  className="w-full flex items-center gap-3 p-4 bg-white rounded-xl hover:shadow-md transition-shadow"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: uploaderColors[name] }}
                  />
                  <span className="flex-1 text-left font-semibold text-slate-dark">{name}</span>
                  <span className="text-sm text-slate-medium">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Active Filter Badge */}
        {(filterEvent || filterUploader) && (
          <div className="flex items-center justify-between p-3 bg-slate-dark text-white rounded-xl mb-4">
            <span className="font-semibold">{filterEvent || filterUploader}</span>
            <button
              onClick={() => {
                setFilterEvent(null);
                setFilterUploader(null);
              }}
              className="text-sm text-white/60 hover:text-white"
            >
              × Clear
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-cyan"></div>
          </div>
        ) : filtered.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-electric-cyan/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-electric-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-heading font-semibold text-lg mb-2">No photos yet</h3>
            <p className="text-slate-medium mb-4">
              {showFavoritesOnly
                ? "No favorite photos. Tap the heart on any photo to add it!"
                : "Upload some photos to start building memories!"}
            </p>
            {!showFavoritesOnly && (
              <button onClick={() => setShowUploadModal(true)} className="btn-primary">
                Upload Photos
              </button>
            )}
          </div>
        ) : (
          /* Masonry Grid */
          (view === "grid" || filterEvent || filterUploader) && (
            <div className="flex gap-2">
              {/* Column 1 */}
              <div className="flex-1 flex flex-col gap-2">
                {filtered.filter((_, i) => i % 2 === 0).map((photo) => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    uploaderColor={uploaderColors[getUploaderName(photo)]}
                    isSelected={selectedPhotos.has(photo.id)}
                    selectionMode={selectionMode}
                    onOpen={() => openLightbox(photo.id)}
                    onToggleFavorite={(e) => handleToggleFavorite(photo.id, e)}
                    onDoubleTap={() => handleDoubleTap(photo.id)}
                    doubleTapAnim={doubleTapAnim === photo.id}
                  />
                ))}
              </div>
              {/* Column 2 */}
              <div className="flex-1 flex flex-col gap-2">
                {filtered.filter((_, i) => i % 2 === 1).map((photo) => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    uploaderColor={uploaderColors[getUploaderName(photo)]}
                    isSelected={selectedPhotos.has(photo.id)}
                    selectionMode={selectionMode}
                    onOpen={() => openLightbox(photo.id)}
                    onToggleFavorite={(e) => handleToggleFavorite(photo.id, e)}
                    onDoubleTap={() => handleDoubleTap(photo.id)}
                    doubleTapAnim={doubleTapAnim === photo.id}
                  />
                ))}
              </div>
            </div>
          )
        )}

        {/* Event Sections (when in event view without filter) */}
        {view === "event" && !filterEvent && Object.keys(groupedByEvent).length > 0 && (
          <div className="space-y-6 mt-4">
            {Object.entries(groupedByEvent).map(([event, eventPhotos]) => (
              <div key={event}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-heading font-bold text-lg">{event}</h3>
                  <button
                    onClick={() => setFilterEvent(event)}
                    className="text-sm text-electric-cyan font-semibold"
                  >
                    See all →
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3">
                  {eventPhotos.slice(0, 5).map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => openLightbox(photo.id)}
                      className="flex-shrink-0 w-28 h-28 rounded-xl overflow-hidden cursor-pointer shadow-sm"
                    >
                      <img
                        src={photo.file_url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Link to Outings */}
        {!selectionMode && !loading && (
          <div className="mt-8 p-4 bg-white rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-semibold">Organize by Events</h3>
                <p className="text-sm text-slate-medium">Create events to organize your photos</p>
              </div>
              <Link href={`/groups/${groupId}/outings`} className="btn-secondary text-sm">
                View Events
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Lightbox */}
      {currentPhoto && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex flex-col"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white text-2xl"
          >
            ×
          </button>

          {/* Counter */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/50 text-sm font-semibold z-10">
            {lightboxIndex! + 1} / {filtered.length}
          </div>

          {/* Image */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="relative max-w-[92%] max-h-[70vh]">
              <img
                src={currentPhoto.file_url}
                alt=""
                className="max-w-full max-h-[70vh] object-contain rounded-lg select-none"
                style={{
                  transform: `translateX(${touchDelta}px)`,
                  transition: imgTransition ? "transform 0.25s ease" : "none",
                }}
                onClick={() => handleDoubleTap(currentPhoto.id)}
                draggable={false}
              />
              {doubleTapAnim === currentPhoto.id && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-6xl animate-ping">❤️</span>
                </div>
              )}
            </div>
          </div>

          {/* Nav Arrows */}
          {lightboxIndex! > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white text-3xl z-10"
            >
              ‹
            </button>
          )}
          {lightboxIndex! < filtered.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white text-3xl z-10"
            >
              ›
            </button>
          )}

          {/* Info Panel */}
          <div
            className="bg-white rounded-t-2xl p-4 max-h-[40vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Meta */}
            <div className="flex items-center gap-3 text-sm text-slate-medium mb-4">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: uploaderColors[getUploaderName(currentPhoto)] }}
              />
              <span className="font-semibold" style={{ color: uploaderColors[getUploaderName(currentPhoto)] }}>
                {getUploaderName(currentPhoto)}
              </span>
              <span>·</span>
              <span>{formatDate(currentPhoto.created_at)}</span>
              {currentPhoto.outing && (
                <>
                  <span>·</span>
                  <span>{currentPhoto.outing.title}</span>
                </>
              )}
            </div>

            {/* Edit fields (owner only) */}
            {currentPhoto.uploaded_by === currentUserId ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  placeholder="Add a caption..."
                  className="input w-full"
                />
                <select
                  value={editOuting}
                  onChange={(e) => setEditOuting(e.target.value)}
                  className="input w-full"
                >
                  <option value="">No event</option>
                  {outings.map((o) => (
                    <option key={o.id} value={o.id}>{o.title}</option>
                  ))}
                </select>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleToggleFavorite(currentPhoto.id, e)}
                      className={`p-2 rounded-lg transition-colors ${
                        currentPhoto.is_favorite
                          ? "bg-electric-cyan text-white"
                          : "bg-gray-100 text-slate-medium hover:bg-electric-cyan/10"
                      }`}
                    >
                      <svg
                        className="w-5 h-5"
                        fill={currentPhoto.is_favorite ? "currentColor" : "none"}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(currentPhoto.id)}
                      className="p-2 rounded-lg bg-gray-100 text-slate-medium hover:bg-red-100 hover:text-red-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <button
                    onClick={handleSavePhoto}
                    disabled={saving}
                    className="btn-primary disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {currentPhoto.caption && <p className="font-medium mb-2">{currentPhoto.caption}</p>}
                <button
                  onClick={(e) => handleToggleFavorite(currentPhoto.id, e)}
                  className={`p-2 rounded-lg transition-colors ${
                    currentPhoto.is_favorite
                      ? "bg-electric-cyan text-white"
                      : "bg-gray-100 text-slate-medium hover:bg-electric-cyan/10"
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill={currentPhoto.is_favorite ? "currentColor" : "none"}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
            )}

            {/* Swipe hint */}
            <p className="text-center text-xs text-slate-light mt-4">
              Swipe or use arrows to browse
            </p>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-xl">Upload Photos</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFiles([]);
                  setCaption("");
                  setSelectedOuting("");
                }}
                className="text-slate-medium hover:text-slate-dark"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={checkingDuplicates}
                  className="w-full p-8 border-2 border-dashed border-electric-cyan/30 rounded-xl hover:border-electric-cyan/50 transition-colors disabled:opacity-50"
                >
                  {checkingDuplicates ? (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-cyan mx-auto mb-2"></div>
                      <p className="font-medium text-slate-dark">Checking for duplicates...</p>
                    </div>
                  ) : selectedFiles.length > 0 ? (
                    <div className="text-center">
                      <p className="font-medium text-electric-cyan">
                        {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""} selected
                      </p>
                      <p className="text-sm text-slate-medium mt-1">Click to change</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg className="w-12 h-12 text-electric-cyan/50 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="font-medium text-slate-dark">Tap to select photos</p>
                    </div>
                  )}
                </button>
              </div>

              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption (optional)"
                className="input w-full"
              />

              {outings.length > 0 && (
                <select
                  value={selectedOuting}
                  onChange={(e) => setSelectedOuting(e.target.value)}
                  className="input w-full"
                >
                  <option value="">No event</option>
                  {outings.map((o) => (
                    <option key={o.id} value={o.id}>{o.title}</option>
                  ))}
                </select>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFiles([]);
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedFiles.length === 0 || uploading}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg">Delete Photos</h3>
                <p className="text-sm text-slate-medium">This cannot be undone</p>
              </div>
            </div>
            <p className="text-slate-dark mb-6">
              Delete {selectedPhotos.size} photo{selectedPhotos.size !== 1 ? "s" : ""}?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleBatchDelete}
                disabled={batchProcessing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {batchProcessing ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outing Select Modal */}
      {showOutingSelect && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowOutingSelect(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-bold text-xl mb-4">Add to Event</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              <button
                onClick={() => handleBatchOuting("")}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 text-slate-medium"
              >
                Remove from event
              </button>
              {outings.map((o) => (
                <button
                  key={o.id}
                  onClick={() => handleBatchOuting(o.id)}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50"
                >
                  {o.title}
                </button>
              ))}
            </div>
            <button onClick={() => setShowOutingSelect(false)} className="btn-secondary w-full">Cancel</button>
          </div>
        </div>
      )}

      {/* Duplicate Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCancelDuplicates}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-electric-cyan/10 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-electric-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="font-heading font-bold text-xl">Duplicates Detected</h2>
                <p className="text-sm text-slate-medium">{duplicates.length} photo{duplicates.length > 1 ? "s" : ""} may already exist</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {duplicates.map((dup, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  <img src={dup.existingPhoto.file_url} alt="" className="w-16 h-16 object-cover rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-dark truncate">{dup.filename}</p>
                    <p className="text-sm text-slate-medium">{formatFileSize(dup.size)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              {pendingFiles.length > duplicates.length && (
                <button onClick={handleSkipDuplicates} className="btn-primary w-full">
                  Skip Duplicates & Continue
                </button>
              )}
              <button onClick={handleUploadAnyway} className="btn-secondary w-full">Upload Anyway</button>
              <button onClick={handleCancelDuplicates} className="text-slate-medium py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}>
            {toast.type === "success" ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Photo Card Component
function PhotoCard({
  photo,
  uploaderColor,
  isSelected,
  selectionMode,
  onOpen,
  onToggleFavorite,
  onDoubleTap,
  doubleTapAnim,
}: {
  photo: Photo;
  uploaderColor: string;
  isSelected: boolean;
  selectionMode: boolean;
  onOpen: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onDoubleTap: () => void;
  doubleTapAnim: boolean;
}) {
  const uploaderName = photo.uploader?.display_name || photo.uploader?.full_name || "Unknown";

  return (
    <div
      onClick={onDoubleTap}
      className={`relative rounded-xl overflow-hidden bg-white shadow-sm cursor-pointer group ${
        isSelected ? "ring-4 ring-electric-cyan" : ""
      }`}
    >
      <div onClick={onOpen} className="relative">
        <img
          src={photo.file_url}
          alt={photo.caption || ""}
          loading="lazy"
          className={`w-full object-cover transition-transform group-hover:scale-105 ${
            isSelected ? "opacity-80" : ""
          }`}
        />

        {/* Event overlay */}
        {photo.outing && (
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent">
            <span className="text-white text-xs font-semibold uppercase tracking-wide opacity-90">
              {photo.outing.title}
            </span>
          </div>
        )}

        {/* Double tap heart */}
        {doubleTapAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-5xl animate-ping">❤️</span>
          </div>
        )}
      </div>

      {/* Selection checkbox */}
      {selectionMode && (
        <div
          className={`absolute top-2 left-2 w-6 h-6 rounded-md border-2 flex items-center justify-center ${
            isSelected ? "bg-electric-cyan border-electric-cyan" : "bg-white/80 border-slate-medium"
          }`}
        >
          {isSelected && (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      )}

      {/* Favorite button */}
      {!selectionMode && (
        <button
          onClick={onToggleFavorite}
          className={`absolute top-2 right-2 p-1.5 rounded-full transition-all ${
            photo.is_favorite
              ? "bg-electric-cyan text-white"
              : "bg-white/80 text-slate-medium opacity-0 group-hover:opacity-100"
          }`}
        >
          <svg
            className="w-4 h-4"
            fill={photo.is_favorite ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: uploaderColor }} />
          <span className="text-xs font-semibold text-slate-dark truncate">{uploaderName}</span>
        </div>
        <span className="text-xs text-slate-light flex-shrink-0">
          {new Date(photo.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>
    </div>
  );
}
