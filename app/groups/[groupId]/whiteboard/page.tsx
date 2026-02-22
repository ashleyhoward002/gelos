"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getWhiteboards, createWhiteboard, deleteWhiteboard, WhiteboardBoard } from "@/lib/whiteboard";
import Header from "@/components/Header";

export default function WhiteboardListPage() {
  const params = useParams();
  const groupId = params.groupId as string;

  const [boards, setBoards] = useState<WhiteboardBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadBoards();
  }, [groupId]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function loadBoards() {
    setLoading(true);
    const data = await getWhiteboards(groupId);
    setBoards(data);
    setLoading(false);
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    const result = await createWhiteboard(groupId, newTitle.trim());
    if (result.success) {
      setShowCreateModal(false);
      setNewTitle("");
      setToast({ message: "Whiteboard created!", type: "success" });
      loadBoards();
    } else {
      setToast({ message: result.error || "Failed to create", type: "error" });
    }
    setCreating(false);
  }

  async function handleDelete(boardId: string) {
    if (!confirm("Delete this whiteboard? This cannot be undone.")) return;
    setDeletingId(boardId);
    const result = await deleteWhiteboard(boardId, groupId);
    if (result.success) {
      setToast({ message: "Whiteboard deleted", type: "success" });
      loadBoards();
    } else {
      setToast({ message: result.error || "Failed to delete", type: "error" });
    }
    setDeletingId(null);
  }

  return (
    <div className="min-h-screen bg-bright-white">
      <Header
        showBack
        backHref={`/groups/${groupId}`}
        title="Whiteboard"
        subtitle={`${boards.length} board${boards.length !== 1 ? "s" : ""}`}
      />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Create Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full mb-6 p-4 border-2 border-dashed border-electric-cyan/30 rounded-xl hover:border-electric-cyan/50 transition-colors flex items-center justify-center gap-2 text-electric-cyan"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-semibold">Create New Whiteboard</span>
        </button>

        {/* Boards Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-cyan"></div>
          </div>
        ) : boards.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🎨</div>
            <h3 className="font-heading font-semibold text-lg mb-2">No whiteboards yet</h3>
            <p className="text-slate-medium">Create one to start collaborating!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {boards.map((board) => (
              <div
                key={board.id}
                className="relative bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <Link
                  href={`/groups/${groupId}/whiteboard/${board.id}`}
                  className="block p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ backgroundColor: board.background_color }}
                    >
                      🎨
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-semibold truncate">{board.title}</h3>
                      <p className="text-sm text-slate-medium">
                        {board.element_count || 0} element{board.element_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  {board.creator && (
                    <p className="text-xs text-slate-light mt-2">
                      Created by {board.creator.display_name || board.creator.full_name}
                    </p>
                  )}
                </Link>
                {/* Delete button */}
                <button
                  onClick={() => handleDelete(board.id)}
                  disabled={deletingId === board.id}
                  className="absolute top-2 right-2 p-2 text-slate-light hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deletingId === board.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-heading font-bold text-xl mb-4">New Whiteboard</h3>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Whiteboard name"
              className="input w-full mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTitle.trim()) handleCreate();
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTitle("");
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim() || creating}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 left-4 right-4 max-w-md mx-auto p-4 rounded-xl shadow-lg z-50 ${
            toast.type === "success" ? "bg-green-500" : "bg-red-500"
          } text-white font-medium text-center`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
