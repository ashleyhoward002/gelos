"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  getPosts,
  createPost,
  deletePost,
  likePost,
  addComment,
  deleteComment,
  Post,
} from "@/lib/posts";
import Header from "@/components/Header";
import { Heart, MessageCircle, Trash2, Send, Image as ImageIcon } from "lucide-react";

export default function FeedPage() {
  const params = useParams();
  const groupId = params.groupId as string;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Create post state
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Comment state
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [groupId]);

  async function loadData() {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      const postsData = await getPosts(groupId);
      setPosts(postsData);
    } catch (error) {
      console.error("Error loading feed:", error);
    }
    setLoading(false);
  }

  async function handleCreatePost() {
    if (!newPostContent.trim() && !newPostImage) return;

    setCreating(true);
    try {
      let imageUrl = null;

      // Upload image if present
      if (newPostImage) {
        const supabase = createClient();
        const fileExt = newPostImage.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${groupId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(filePath, newPostImage);

        if (uploadError) {
          console.error("Error uploading image:", uploadError);
          alert("Failed to upload image");
          setCreating(false);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("post-images").getPublicUrl(filePath);
        imageUrl = publicUrl;
      }

      const result = await createPost(groupId, {
        content: newPostContent,
        image_url: imageUrl || undefined,
      });

      if (result.error) {
        alert(result.error);
      } else {
        setNewPostContent("");
        setNewPostImage(null);
        setImagePreview(null);
        loadData();
      }
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post");
    }
    setCreating(false);
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setNewPostImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function removeImage() {
    setNewPostImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleLike(postId: string) {
    await likePost(postId, groupId);
    loadData();
  }

  async function handleDeletePost(postId: string) {
    if (!confirm("Delete this post?")) return;

    const result = await deletePost(postId, groupId);
    if (result.success) {
      loadData();
    } else {
      alert(result.error);
    }
  }

  async function handleAddComment(postId: string) {
    const text = commentTexts[postId];
    if (!text?.trim()) return;

    const result = await addComment(postId, groupId, text);
    if (result.success) {
      setCommentTexts({ ...commentTexts, [postId]: "" });
      loadData();
    } else {
      alert(result.error);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm("Delete this comment?")) return;

    const result = await deleteComment(commentId, groupId);
    if (result.success) {
      loadData();
    } else {
      alert(result.error);
    }
  }

  function toggleComments(postId: string) {
    setShowComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bright-white">
        <Header
          showBack
          backHref={`/groups/${groupId}`}
          title="Feed"
          subtitle="Loading..."
        />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-cyan"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bright-white">
      <Header
        showBack
        backHref={`/groups/${groupId}`}
        title="Feed"
        subtitle="Share updates with your group"
      />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Post */}
        <div className="card mb-6">
          <h2 className="font-heading font-semibold text-lg mb-4">Create Post</h2>
          <textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="What's on your mind?"
            className="input w-full resize-none"
            rows={3}
          />

          {imagePreview && (
            <div className="mt-4 relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-64 rounded-lg object-cover"
              />
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary flex items-center gap-2"
              disabled={creating}
            >
              <ImageIcon size={18} />
              Add Image
            </button>
            <button
              onClick={handleCreatePost}
              disabled={creating || (!newPostContent.trim() && !newPostImage)}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {creating ? "Posting..." : "Post"}
            </button>
          </div>
        </div>

        {/* Posts List */}
        {posts.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-medium">No posts yet. Be the first to share!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="card">
                {/* Post Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-soft-lavender/50 rounded-full flex items-center justify-center">
                      <span className="font-heading font-semibold text-slate-dark">
                        {(post.author?.display_name || post.author?.full_name || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-slate-dark">
                        {post.author?.display_name || post.author?.full_name || "Unknown"}
                      </div>
                      <div className="text-sm text-slate-medium">
                        {new Date(post.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>

                  {post.user_id === currentUserId && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="text-slate-medium hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>

                {/* Post Content */}
                <p className="text-slate-dark mb-4 whitespace-pre-wrap">{post.content}</p>

                {/* Post Image */}
                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt="Post"
                    className="w-full rounded-lg mb-4"
                  />
                )}

                {/* Actions */}
                <div className="flex items-center gap-6 pb-4 border-b border-gray-200">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-2 transition-colors ${
                      post.has_liked
                        ? "text-neon-purple"
                        : "text-slate-medium hover:text-neon-purple"
                    }`}
                  >
                    <Heart
                      size={20}
                      fill={post.has_liked ? "currentColor" : "none"}
                    />
                    <span>{post.likes_count}</span>
                  </button>

                  <button
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-2 text-slate-medium hover:text-electric-cyan transition-colors"
                  >
                    <MessageCircle size={20} />
                    <span>{post.comments_count}</span>
                  </button>
                </div>

                {/* Comments Section */}
                {showComments[post.id] && (
                  <div className="pt-4">
                    {/* Existing Comments */}
                    {post.comments && post.comments.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {post.comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="bg-gray-50 rounded-lg p-3"
                          >
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-soft-lavender/50 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-semibold text-slate-dark">
                                    {(
                                      comment.author?.display_name ||
                                      comment.author?.full_name ||
                                      "?"
                                    )
                                      .charAt(0)
                                      .toUpperCase()}
                                  </span>
                                </div>
                                <span className="font-medium text-sm text-slate-dark">
                                  {comment.author?.display_name ||
                                    comment.author?.full_name ||
                                    "Unknown"}
                                </span>
                              </div>

                              {comment.user_id === currentUserId && (
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="text-slate-medium hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-slate-dark ml-8">
                              {comment.text}
                            </p>
                            <p className="text-xs text-slate-medium ml-8 mt-1">
                              {new Date(comment.created_at).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                }
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Comment */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={commentTexts[post.id] || ""}
                        onChange={(e) =>
                          setCommentTexts({
                            ...commentTexts,
                            [post.id]: e.target.value,
                          })
                        }
                        onKeyPress={(e) =>
                          e.key === "Enter" && handleAddComment(post.id)
                        }
                        placeholder="Write a comment..."
                        className="input flex-1"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={!commentTexts[post.id]?.trim()}
                        className="btn-primary disabled:opacity-50"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
