"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  updateDocument,
  getOutingsForDocuments,
} from "@/lib/documents";
import {
  GroupDocument,
  DocumentCategory,
  documentCategoryLabels,
} from "@/lib/document-constants";
import { formatFileSize, getFileIcon } from "@/lib/utils";
import Header from "@/components/Header";

interface Outing {
  id: string;
  title: string;
}

export default function DocumentsPage() {
  const params = useParams();
  const groupId = params.groupId as string;

  const [documents, setDocuments] = useState<GroupDocument[]>([]);
  const [outings, setOutings] = useState<Outing[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>("other");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadOutingId, setUploadOutingId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit modal
  const [editingDocument, setEditingDocument] = useState<GroupDocument | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<DocumentCategory>("other");
  const [editDescription, setEditDescription] = useState("");
  const [editOutingId, setEditOutingId] = useState("");
  const [saving, setSaving] = useState(false);

  // Preview modal
  const [previewDocument, setPreviewDocument] = useState<GroupDocument | null>(null);

  useEffect(() => {
    loadData();
  }, [groupId]);

  async function loadData() {
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setCurrentUserId(user.id);
    }

    const [docsData, outingsData] = await Promise.all([
      getDocuments(groupId),
      getOutingsForDocuments(groupId),
    ]);

    setDocuments(docsData);
    setOutings(outingsData);
    setLoading(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!uploadName) {
        // Auto-fill name from filename (without extension)
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setUploadName(nameWithoutExt);
      }
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile || !uploadName.trim()) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("name", uploadName);
    formData.append("category", uploadCategory);
    if (uploadDescription) formData.append("description", uploadDescription);
    if (uploadOutingId) formData.append("outing_id", uploadOutingId);

    const result = await uploadDocument(groupId, formData);

    if (result.error) {
      alert(result.error);
    } else {
      setShowUploadModal(false);
      resetUploadForm();
      loadData();
    }

    setUploading(false);
  }

  function resetUploadForm() {
    setUploadName("");
    setUploadCategory("other");
    setUploadDescription("");
    setUploadOutingId("");
    setUploadFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function openEditModal(doc: GroupDocument) {
    setEditingDocument(doc);
    setEditName(doc.name);
    setEditCategory(doc.category);
    setEditDescription(doc.description || "");
    setEditOutingId(doc.outing_id || "");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDocument) return;

    setSaving(true);

    const result = await updateDocument(editingDocument.id, groupId, {
      name: editName,
      category: editCategory,
      description: editDescription || null,
      outing_id: editOutingId || null,
    });

    if (result.error) {
      alert(result.error);
    } else {
      setEditingDocument(null);
      loadData();
    }

    setSaving(false);
  }

  async function handleDelete(doc: GroupDocument) {
    if (!confirm(`Are you sure you want to delete "${doc.name}"?`)) return;

    const result = await deleteDocument(doc.id, groupId);

    if (result.error) {
      alert(result.error);
    } else {
      loadData();
    }
  }

  function getMemberName(user: { display_name: string | null; full_name: string | null } | null | undefined): string {
    return user?.display_name || user?.full_name || "Unknown";
  }

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    if (selectedCategory !== "all" && doc.category !== selectedCategory) return false;
    if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Group by category for display
  const groupedDocuments = filteredDocuments.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = [];
    }
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<DocumentCategory, GroupDocument[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-bright-white">
        <Header showBack backHref={`/groups/${groupId}`} title="Documents" />
        <div className="flex items-center justify-center py-12">
          <p className="text-slate-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bright-white">
      <Header
        showBack
        backHref={`/groups/${groupId}`}
        title="Documents"
        subtitle="Store & share files"
      />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Search & Filter */}
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="input w-full"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory | "all")}
              className="input"
            >
              <option value="all">All Categories</option>
              {Object.entries(documentCategoryLabels).map(([key, { label, icon }]) => (
                <option key={key} value={key}>
                  {icon} {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Upload Button */}
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn-primary w-full mb-6 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload Document
        </button>

        {/* Documents List */}
        {filteredDocuments.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-4">📁</div>
            <h3 className="font-heading font-semibold text-lg mb-2">No documents yet!</h3>
            <p className="text-slate-medium">
              Upload itineraries, tickets, reservations, and more to share with your group.
            </p>
          </div>
        ) : selectedCategory === "all" ? (
          // Grouped view
          <div className="space-y-6">
            {Object.entries(groupedDocuments).map(([category, docs]) => (
              <div key={category} className="card">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">{documentCategoryLabels[category as DocumentCategory].icon}</span>
                  <h2 className="font-heading font-semibold text-lg">
                    {documentCategoryLabels[category as DocumentCategory].label}
                  </h2>
                  <span className="text-sm text-slate-medium">({docs.length})</span>
                </div>
                <div className="space-y-3">
                  {docs.map((doc) => (
                    <DocumentItem
                      key={doc.id}
                      document={doc}
                      currentUserId={currentUserId}
                      onPreview={() => setPreviewDocument(doc)}
                      onEdit={() => openEditModal(doc)}
                      onDelete={() => handleDelete(doc)}
                      getMemberName={getMemberName}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Flat view for single category
          <div className="card">
            <div className="space-y-3">
              {filteredDocuments.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  document={doc}
                  currentUserId={currentUserId}
                  onPreview={() => setPreviewDocument(doc)}
                  onEdit={() => openEditModal(doc)}
                  onDelete={() => handleDelete(doc)}
                  getMemberName={getMemberName}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-heading font-bold text-xl mb-4">Upload Document</h2>

            <form onSubmit={handleUpload} className="space-y-4">
              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt"
                  required
                  className="w-full text-sm text-slate-dark file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-electric-cyan file:text-white hover:file:bg-electric-cyan-dark"
                />
                {uploadFile && (
                  <p className="text-sm text-slate-medium mt-1">
                    {formatFileSize(uploadFile.size)}
                  </p>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Document Name
                </label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  required
                  className="input w-full"
                  placeholder="e.g., Flight Tickets"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)}
                  className="input w-full"
                >
                  {Object.entries(documentCategoryLabels).map(([key, { label, icon }]) => (
                    <option key={key} value={key}>
                      {icon} {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Outing (optional) */}
              {outings.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">
                    Link to Trip/Outing (optional)
                  </label>
                  <select
                    value={uploadOutingId}
                    onChange={(e) => setUploadOutingId(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">No specific trip</option>
                    {outings.map((outing) => (
                      <option key={outing.id} value={outing.id}>
                        {outing.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  rows={2}
                  className="input w-full resize-none"
                  placeholder="Add any notes about this document..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingDocument && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setEditingDocument(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-heading font-bold text-xl mb-4">Edit Document</h2>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Document Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="input w-full"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as DocumentCategory)}
                  className="input w-full"
                >
                  {Object.entries(documentCategoryLabels).map(([key, { label, icon }]) => (
                    <option key={key} value={key}>
                      {icon} {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Outing */}
              {outings.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">
                    Link to Trip/Outing
                  </label>
                  <select
                    value={editOutingId}
                    onChange={(e) => setEditOutingId(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">No specific trip</option>
                    {outings.map((outing) => (
                      <option key={outing.id} value={outing.id}>
                        {outing.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="input w-full resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDocument(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDocument && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
          onClick={() => setPreviewDocument(null)}
        >
          <div className="relative w-full max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setPreviewDocument(null)}
              className="absolute -top-12 right-0 text-white hover:text-electric-cyan transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="bg-white rounded-xl p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{getFileIcon(previewDocument.file_type)}</span>
                <div>
                  <h2 className="font-heading font-bold text-xl">{previewDocument.name}</h2>
                  <p className="text-sm text-slate-medium">
                    {documentCategoryLabels[previewDocument.category].label} • {formatFileSize(previewDocument.file_size)}
                  </p>
                </div>
              </div>

              {previewDocument.description && (
                <p className="text-slate-medium mb-4">{previewDocument.description}</p>
              )}

              {previewDocument.outing && (
                <p className="text-sm text-slate-medium mb-4">
                  Linked to: <span className="text-electric-cyan">{previewDocument.outing.title}</span>
                </p>
              )}

              {/* Preview content */}
              {previewDocument.file_type.startsWith("image/") ? (
                <div className="max-h-[60vh] overflow-auto">
                  <img
                    src={previewDocument.file_url}
                    alt={previewDocument.name}
                    className="max-w-full rounded-lg"
                  />
                </div>
              ) : previewDocument.file_type === "application/pdf" ? (
                <div className="h-[60vh]">
                  <iframe
                    src={previewDocument.file_url}
                    className="w-full h-full rounded-lg border border-gray-200"
                    title={previewDocument.name}
                  />
                </div>
              ) : (
                <div className="text-center py-12 bg-bright-white rounded-lg">
                  <span className="text-4xl mb-4 block">{getFileIcon(previewDocument.file_type)}</span>
                  <p className="text-slate-medium">Preview not available for this file type</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <a
                  href={previewDocument.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open
                </a>
                <a
                  href={previewDocument.file_url}
                  download={previewDocument.name}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Document item component
function DocumentItem({
  document,
  currentUserId,
  onPreview,
  onEdit,
  onDelete,
  getMemberName,
}: {
  document: GroupDocument;
  currentUserId: string;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
  getMemberName: (user: { display_name: string | null; full_name: string | null } | null | undefined) => string;
}) {
  const isUploader = document.uploaded_by === currentUserId;

  return (
    <div className="flex items-center gap-4 p-4 bg-bright-white rounded-xl hover:bg-gray-200/50 transition-colors">
      {/* Icon */}
      <div
        className="w-12 h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-soft-lavender/20 transition-colors"
        onClick={onPreview}
      >
        <span className="text-2xl">{getFileIcon(document.file_type)}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <button
          onClick={onPreview}
          className="font-medium text-slate-dark hover:text-electric-cyan transition-colors truncate block text-left w-full"
        >
          {document.name}
        </button>
        <div className="flex items-center gap-2 text-sm text-slate-medium">
          <span>{formatFileSize(document.file_size)}</span>
          <span>•</span>
          <span>by {getMemberName(document.uploader)}</span>
          {document.outing && (
            <>
              <span>•</span>
              <span className="text-electric-cyan truncate">{document.outing.title}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <a
          href={document.file_url}
          download={document.name}
          className="p-2 text-slate-medium hover:text-electric-cyan hover:bg-electric-cyan/10 rounded-lg transition-colors"
          title="Download"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </a>
        {isUploader && (
          <>
            <button
              onClick={onEdit}
              className="p-2 text-slate-medium hover:text-electric-cyan hover:bg-electric-cyan/10 rounded-lg transition-colors"
              title="Edit"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-slate-medium hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
