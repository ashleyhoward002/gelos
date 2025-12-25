"use client";

import { useState, useEffect, useRef } from "react";
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
import { ParallaxPhotoGallery } from "@/components/ui/parallax-scroll";

export default function PhotosPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [outings, setOutings] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Upload form state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [selectedOuting, setSelectedOuting] = useState("");

  // Duplicate detection state
  const [duplicates, setDuplicates] = useState<{ filename: string; size: number; existingPhoto: Photo }[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // Edit photo state
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

  useEffect(() => {
    loadData();
  }, [groupId, filter]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Escape exits selection mode or closes modal
      if (e.key === "Escape") {
        if (selectedPhoto) {
          setSelectedPhoto(null);
        } else if (selectionMode) {
          exitSelectionMode();
        }
        return;
      }

      // Arrow key navigation in modal
      if (selectedPhoto) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          navigateToPrevious();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          navigateToNext();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhoto, selectedPhotoIndex, photos, selectionMode]);

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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }

    // Fetch photos directly using browser client to ensure proper auth context
    let query = supabase
      .from("photos")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (filter === "favorites") {
      query = query.eq("is_favorite", true);
    } else if (filter && filter !== "all") {
      query = query.eq("outing_id", filter);
    }

    const { data: photosData, error: photosError } = await query;

    if (photosError) {
      console.error("Error fetching photos:", photosError);
    }

    // Fetch uploader info for each photo
    const photosWithDetails: Photo[] = [];
    for (const photo of (photosData || [])) {
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

      photosWithDetails.push({
        ...photo,
        uploader,
        outing,
      });
    }

    const outingsData = await getOutingsForSelect(groupId);

    setPhotos(photosWithDetails);
    setOutings(outingsData);
    setLoading(false);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setUploading(true);

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });
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

  async function handleToggleFavorite(photoId: string, e: React.MouseEvent) {
    e.stopPropagation();
    const result = await toggleFavorite(photoId, groupId);
    if (result.success) {
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId ? { ...p, is_favorite: result.is_favorite! } : p
        )
      );
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto((prev) =>
          prev ? { ...prev, is_favorite: result.is_favorite! } : null
        );
      }
    }
  }

  async function handleDelete(photoId: string) {
    if (!confirm("Are you sure you want to delete this photo?")) return;

    const result = await deletePhoto(photoId, groupId);
    if (result.success) {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setSelectedPhoto(null);
    } else {
      alert(result.error);
    }
  }

  function openPhotoDetail(photo: Photo) {
    if (selectionMode) {
      togglePhotoSelection(photo.id);
      return;
    }
    const index = photos.findIndex((p) => p.id === photo.id);
    setSelectedPhotoIndex(index);
    setSelectedPhoto(photo);
    setEditCaption(photo.caption || "");
    setEditOuting(photo.outing_id || "");
  }

  function navigateToPrevious() {
    if (selectedPhotoIndex > 0) {
      const newIndex = selectedPhotoIndex - 1;
      const newPhoto = photos[newIndex];
      setSelectedPhotoIndex(newIndex);
      setSelectedPhoto(newPhoto);
      setEditCaption(newPhoto.caption || "");
      setEditOuting(newPhoto.outing_id || "");
    }
  }

  function navigateToNext() {
    if (selectedPhotoIndex < photos.length - 1) {
      const newIndex = selectedPhotoIndex + 1;
      const newPhoto = photos[newIndex];
      setSelectedPhotoIndex(newIndex);
      setSelectedPhoto(newPhoto);
      setEditCaption(newPhoto.caption || "");
      setEditOuting(newPhoto.outing_id || "");
    }
  }

  async function handleSavePhoto() {
    if (!selectedPhoto) return;

    setSaving(true);
    const result = await updatePhoto(selectedPhoto.id, groupId, {
      caption: editCaption,
      outing_id: editOuting || null,
    });

    if (result.error) {
      alert(result.error);
    } else {
      const updatedPhoto = {
        ...selectedPhoto,
        caption: editCaption || null,
        outing_id: editOuting || null,
        outing: editOuting
          ? outings.find((o) => o.id === editOuting) || null
          : null,
      };
      setSelectedPhoto(updatedPhoto);
      setPhotos((prev) =>
        prev.map((p) => (p.id === selectedPhoto.id ? updatedPhoto : p))
      );
    }
    setSaving(false);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setCheckingDuplicates(true);
    setPendingFiles(files);

    const fileInfo = files.map(f => ({ name: f.name, size: f.size }));
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
    const duplicateNames = new Set(duplicates.map(d => d.filename));
    const nonDuplicateFiles = pendingFiles.filter(f => !duplicateNames.has(f.name));

    setSelectedFiles(nonDuplicateFiles);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  }

  function selectAll() {
    setSelectedPhotos(new Set(photos.map((p) => p.id)));
  }

  function deselectAll() {
    setSelectedPhotos(new Set());
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
      setPhotos((prev) =>
        prev.map((p) =>
          selectedPhotos.has(p.id) ? { ...p, is_favorite: setFavorite } : p
        )
      );
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
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // Render photo grid item
  function renderPhotoItem(photo: Photo) {
    const isSelected = selectedPhotos.has(photo.id);

    return (
      <div
        key={photo.id}
        onClick={() => openPhotoDetail(photo)}
        className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer group ${
          isSelected ? "ring-4 ring-electric-cyan" : ""
        }`}
      >
        <img
          src={photo.file_url}
          alt={photo.caption || "Photo"}
          className={`w-full h-full object-cover transition-all group-hover:scale-105 ${
            isSelected ? "opacity-80" : ""
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neon-purple/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Selection checkbox */}
        {selectionMode && (
          <div
            className={`absolute top-2 left-2 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? "bg-electric-cyan border-electric-cyan"
                : "bg-white/80 border-slate-medium"
            }`}
          >
            {isSelected && (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}

        {/* Favorite button (only when not in selection mode) */}
        {!selectionMode && (
          <button
            onClick={(e) => handleToggleFavorite(photo.id, e)}
            className={`absolute top-2 right-2 p-2 rounded-full transition-all ${
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

        {photo.outing && !selectionMode && (
          <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs bg-white/90 text-slate-dark px-2 py-1 rounded-full truncate block">
              {photo.outing.title}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bright-white">
      <Header
        showBack
        backHref={`/groups/${groupId}`}
        title="Photos"
        subtitle={selectionMode ? `${selectedPhotos.size} selected` : "Group memories"}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Actions */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Selection Mode Header */}
          {selectionMode ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Selection controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="px-3 py-1.5 text-sm font-medium text-slate-dark hover:bg-white rounded-lg transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAll}
                  className="px-3 py-1.5 text-sm font-medium text-slate-dark hover:bg-white rounded-lg transition-colors"
                >
                  Deselect All
                </button>
              </div>

              <div className="flex-1" />

              <button
                onClick={exitSelectionMode}
                className="px-4 py-2 text-sm font-medium text-slate-medium hover:text-slate-dark transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === "all"
                      ? "bg-electric-cyan text-white"
                      : "bg-white text-slate-dark hover:bg-electric-cyan/10"
                  }`}
                >
                  All Photos
                </button>
                <button
                  onClick={() => setFilter("favorites")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === "favorites"
                      ? "bg-electric-cyan text-white"
                      : "bg-white text-slate-dark hover:bg-electric-cyan/10"
                  }`}
                >
                  Favorites
                </button>
                {outings.length > 0 && (
                  <select
                    value={filter.startsWith("outing-") ? filter : ""}
                    onChange={(e) => setFilter(e.target.value || "all")}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-slate-dark border-0 focus:ring-2 focus:ring-electric-cyan"
                  >
                    <option value="">By Outing</option>
                    {outings.map((outing) => (
                      <option key={outing.id} value={outing.id}>
                        {outing.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {photos.length > 0 && (
                  <button
                    onClick={enterSelectionMode}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Select
                  </button>
                )}
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Upload Photos
                </button>
              </div>
            </div>
          )}

          {/* Batch Action Bar */}
          {selectionMode && selectedPhotos.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-xl shadow-sm">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={batchProcessing}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>

              <button
                onClick={() => setShowOutingSelect(true)}
                disabled={batchProcessing}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-dark hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Add to Outing
              </button>

              <button
                onClick={() => handleBatchFavorite(true)}
                disabled={batchProcessing}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-electric-cyan hover:bg-electric-cyan/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Favorite
              </button>

              <button
                onClick={() => handleBatchFavorite(false)}
                disabled={batchProcessing}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-medium hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Unfavorite
              </button>
            </div>
          )}
        </div>

        {/* Photos Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-cyan"></div>
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-electric-cyan/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-electric-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-heading font-semibold text-lg mb-2">No photos yet</h3>
            <p className="text-slate-medium mb-4">
              {filter === "favorites"
                ? "No favorite photos yet. Click the heart on any photo to add it to favorites."
                : "Upload some photos to start building your group's memories!"}
            </p>
            {filter === "all" && (
              <button onClick={() => setShowUploadModal(true)} className="btn-primary">
                Upload Photos
              </button>
            )}
          </div>
        ) : photos.length >= 6 && !selectionMode ? (
          /* Parallax Gallery for 6+ photos (disabled in selection mode) */
          <ParallaxPhotoGallery
            photos={photos}
            onPhotoClick={(photo) => openPhotoDetail(photo as Photo)}
            className="rounded-xl"
          />
        ) : (
          /* Simple Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {photos.map((photo) => renderPhotoItem(photo))}
          </div>
        )}

        {/* Link to Outings */}
        {!selectionMode && (
          <div className="mt-8 p-4 bg-white rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-semibold">Organize by Outings</h3>
                <p className="text-sm text-slate-medium">
                  Create outings to organize your photos by event
                </p>
              </div>
              <Link href={`/groups/${groupId}/outings`} className="btn-secondary text-sm">
                View Outings
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg">Upload Photos</h3>
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
                      <p className="text-sm text-slate-medium mt-1">Click to change selection</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg className="w-12 h-12 text-electric-cyan/50 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="font-medium text-slate-dark">Click to select photos</p>
                      <p className="text-sm text-slate-medium mt-1">You can select multiple files</p>
                    </div>
                  )}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">Caption (optional)</label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  className="input"
                />
              </div>

              {outings.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">Attach to Outing (optional)</label>
                  <select
                    value={selectedOuting}
                    onChange={(e) => setSelectedOuting(e.target.value)}
                    className="input"
                  >
                    <option value="">No outing</option>
                    {outings.map((outing) => (
                      <option key={outing.id} value={outing.id}>{outing.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFiles([]);
                    setCaption("");
                    setSelectedOuting("");
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

      {/* Photo Detail Modal with Navigation */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
          onClick={() => setSelectedPhoto(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white z-10 p-2"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Previous Arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateToPrevious();
            }}
            disabled={selectedPhotoIndex === 0}
            className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full transition-all z-10 ${
              selectedPhotoIndex === 0
                ? "text-white/20 cursor-not-allowed"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Next Arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateToNext();
            }}
            disabled={selectedPhotoIndex === photos.length - 1}
            className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full transition-all z-10 ${
              selectedPhotoIndex === photos.length - 1
                ? "text-white/20 cursor-not-allowed"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div
            className="max-w-4xl w-full max-h-[90vh] flex flex-col mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <img
                src={selectedPhoto.file_url}
                alt={selectedPhoto.caption || "Photo"}
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
              />
            </div>

            {/* Photo Counter */}
            <div className="text-center text-white/60 text-sm py-2">
              {selectedPhotoIndex + 1} of {photos.length} photos
            </div>

            {/* Details & Edit Panel */}
            <div className="bg-white rounded-xl p-4">
              {/* Uploader info */}
              <div className="flex items-center gap-4 text-sm text-slate-medium mb-4">
                <span className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-soft-lavender/30 rounded-full flex items-center justify-center text-xs font-medium text-slate-dark">
                    {(selectedPhoto.uploader?.display_name || selectedPhoto.uploader?.full_name || "?").charAt(0)}
                  </span>
                  {selectedPhoto.uploader?.display_name || selectedPhoto.uploader?.full_name || "Unknown"}
                </span>
                <span>{formatDate(selectedPhoto.created_at)}</span>
              </div>

              {/* Editable fields (only for photo owner) */}
              {selectedPhoto.uploaded_by === currentUserId ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-dark mb-1">Caption</label>
                    <input
                      type="text"
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      placeholder="Add a caption..."
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-dark mb-1">Linked Outing</label>
                    <select
                      value={editOuting}
                      onChange={(e) => setEditOuting(e.target.value)}
                      className="input"
                    >
                      <option value="">No outing</option>
                      {outings.map((outing) => (
                        <option key={outing.id} value={outing.id}>{outing.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleToggleFavorite(selectedPhoto.id, e)}
                        className={`p-2 rounded-lg transition-colors ${
                          selectedPhoto.is_favorite
                            ? "bg-electric-cyan text-white"
                            : "bg-gray-100 text-slate-medium hover:bg-electric-cyan/10 hover:text-electric-cyan"
                        }`}
                        title={selectedPhoto.is_favorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        <svg
                          className="w-5 h-5"
                          fill={selectedPhoto.is_favorite ? "currentColor" : "none"}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>

                      <button
                        onClick={() => handleDelete(selectedPhoto.id)}
                        className="p-2 rounded-lg bg-gray-100 text-slate-medium hover:bg-red-100 hover:text-red-600 transition-colors"
                        title="Delete photo"
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
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {selectedPhoto.caption && <p className="font-medium mb-3">{selectedPhoto.caption}</p>}
                  {selectedPhoto.outing && (
                    <p className="text-sm text-slate-medium mb-3">
                      Outing:{" "}
                      <Link
                        href={`/groups/${groupId}/outings/${selectedPhoto.outing.id}`}
                        className="text-electric-cyan hover:underline"
                      >
                        {selectedPhoto.outing.title}
                      </Link>
                    </p>
                  )}

                  <button
                    onClick={(e) => handleToggleFavorite(selectedPhoto.id, e)}
                    className={`p-2 rounded-lg transition-colors ${
                      selectedPhoto.is_favorite
                        ? "bg-electric-cyan text-white"
                        : "bg-gray-100 text-slate-medium hover:bg-electric-cyan/10 hover:text-electric-cyan"
                    }`}
                    title={selectedPhoto.is_favorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <svg
                      className="w-5 h-5"
                      fill={selectedPhoto.is_favorite ? "currentColor" : "none"}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
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
              Are you sure you want to delete {selectedPhotos.size} photo{selectedPhotos.size !== 1 ? "s" : ""}?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={batchProcessing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {batchProcessing ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outing Select Modal */}
      {showOutingSelect && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowOutingSelect(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-heading font-bold text-lg mb-4">Add to Outing</h3>

            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              <button
                onClick={() => handleBatchOuting("")}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-bright-white transition-colors text-slate-medium"
              >
                Remove from outing
              </button>
              {outings.map((outing) => (
                <button
                  key={outing.id}
                  onClick={() => handleBatchOuting(outing.id)}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-bright-white transition-colors"
                >
                  {outing.title}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowOutingSelect(false)}
              className="btn-secondary w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Duplicate Warning Modal */}
      {showDuplicateModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleCancelDuplicates}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-electric-cyan/10 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-electric-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="font-heading font-bold text-xl">Duplicate Photos Detected</h2>
                <p className="text-sm text-slate-medium">
                  {duplicates.length} photo{duplicates.length > 1 ? "s" : ""} may already exist in this group
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {duplicates.map((dup, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 bg-bright-white rounded-xl">
                  <div className="relative">
                    <img src={dup.existingPhoto.file_url} alt="Existing" className="w-16 h-16 object-cover rounded-lg" />
                    <span className="absolute -top-1 -left-1 bg-slate-dark text-white text-xs px-1.5 py-0.5 rounded">Existing</span>
                  </div>
                  <svg className="w-5 h-5 text-slate-medium flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-dark truncate">{dup.filename}</p>
                    <p className="text-sm text-slate-medium">{formatFileSize(dup.size)}</p>
                  </div>
                </div>
              ))}
            </div>

            {pendingFiles.length > duplicates.length && (
              <p className="text-sm text-slate-medium mb-4 p-3 bg-green-50 rounded-lg">
                {pendingFiles.length - duplicates.length} new photo{pendingFiles.length - duplicates.length > 1 ? "s" : ""} will be uploaded
              </p>
            )}

            <div className="flex flex-col gap-2">
              {pendingFiles.length > duplicates.length && (
                <button onClick={handleSkipDuplicates} className="btn-primary w-full flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Skip Duplicates & Continue
                </button>
              )}
              <button onClick={handleUploadAnyway} className="btn-secondary w-full flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Anyway
              </button>
              <button onClick={handleCancelDuplicates} className="text-slate-medium hover:text-slate-dark py-2 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${
              toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
            }`}
          >
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
