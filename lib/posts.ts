"use server";

import { createServerSupabaseClient } from "./supabase-server";
import { revalidatePath } from "next/cache";

export interface Post {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  has_liked?: boolean;
  comments?: PostComment[];
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  text: string;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export async function getPosts(groupId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching posts:", error);
    return [];
  }

  // Get author info and check if user has liked
  const postsWithDetails = await Promise.all(
    (posts || []).map(async (post) => {
      // Get author info
      const { data: author } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", post.user_id)
        .single();

      // Check if current user has liked this post
      let hasLiked = false;
      if (user) {
        const { data: like } = await supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", post.id)
          .eq("user_id", user.id)
          .single();
        hasLiked = !!like;
      }

      return {
        ...post,
        author,
        has_liked: hasLiked,
      };
    })
  );

  return postsWithDetails as Post[];
}

export async function getPost(postId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: post, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (error) {
    console.error("Error fetching post:", error);
    return null;
  }

  // Get author info
  const { data: author } = await supabase
    .from("users")
    .select("id, display_name, full_name, avatar_url")
    .eq("id", post.user_id)
    .single();

  // Check if current user has liked this post
  let hasLiked = false;
  if (user) {
    const { data: like } = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", post.id)
      .eq("user_id", user.id)
      .single();
    hasLiked = !!like;
  }

  // Get comments with author info
  const { data: comments } = await supabase
    .from("post_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  const commentsWithAuthors = await Promise.all(
    (comments || []).map(async (comment) => {
      const { data: commentAuthor } = await supabase
        .from("users")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", comment.user_id)
        .single();

      return {
        ...comment,
        author: commentAuthor,
      };
    })
  );

  return {
    ...post,
    author,
    has_liked: hasLiked,
    comments: commentsWithAuthors,
  } as Post;
}

export async function createPost(
  groupId: string,
  data: {
    content: string;
    image_url?: string;
  }
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!data.content.trim()) {
    return { error: "Content is required" };
  }

  // Create the post
  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      group_id: groupId,
      user_id: user.id,
      content: data.content.trim(),
      image_url: data.image_url || null,
    })
    .select()
    .single();

  if (postError) {
    console.error("Error creating post:", postError);
    return { error: postError.message };
  }

  // Create notifications for group members
  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .is("left_at", null)
    .neq("user_id", user.id);

  if (members && members.length > 0) {
    const { data: profile } = await supabase
      .from("users")
      .select("display_name, full_name")
      .eq("id", user.id)
      .single();

    const creatorName = profile?.display_name || profile?.full_name || "Someone";

    const notifications = members.map((m: { user_id: string }) => ({
      user_id: m.user_id,
      type: "post_created",
      title: "New Post",
      message: `${creatorName} shared a new post`,
      link: `/groups/${groupId}/feed`,
      group_id: groupId,
    }));

    await supabase.from("notifications").insert(notifications);
  }

  revalidatePath(`/groups/${groupId}/feed`);
  return { success: true, post };
}

export async function updatePost(
  postId: string,
  groupId: string,
  data: {
    content: string;
  }
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!data.content.trim()) {
    return { error: "Content is required" };
  }

  const { error } = await supabase
    .from("posts")
    .update({
      content: data.content.trim(),
    })
    .eq("id", postId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating post:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/feed`);
  return { success: true };
}

export async function deletePost(postId: string, groupId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting post:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/feed`);
  return { success: true };
}

export async function likePost(postId: string, groupId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if already liked
  const { data: existing } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    // Unlike
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("id", existing.id);

    if (error) {
      console.error("Error unliking post:", error);
      return { error: error.message };
    }
  } else {
    // Like
    const { error } = await supabase.from("post_likes").insert({
      post_id: postId,
      user_id: user.id,
    });

    if (error) {
      console.error("Error liking post:", error);
      return { error: error.message };
    }

    // Notify post author (if not self-like)
    const { data: post } = await supabase
      .from("posts")
      .select("user_id, group_id")
      .eq("id", postId)
      .single();

    if (post && post.user_id !== user.id) {
      const { data: profile } = await supabase
        .from("users")
        .select("display_name, full_name")
        .eq("id", user.id)
        .single();

      const likerName = profile?.display_name || profile?.full_name || "Someone";

      await supabase.from("notifications").insert({
        user_id: post.user_id,
        type: "post_liked",
        title: "Post Liked",
        message: `${likerName} liked your post`,
        link: `/groups/${post.group_id}/feed`,
        group_id: post.group_id,
      });
    }
  }

  revalidatePath(`/groups/${groupId}/feed`);
  return { success: true };
}

export async function addComment(
  postId: string,
  groupId: string,
  text: string
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!text.trim()) {
    return { error: "Comment text is required" };
  }

  const { data: comment, error } = await supabase
    .from("post_comments")
    .insert({
      post_id: postId,
      user_id: user.id,
      text: text.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding comment:", error);
    return { error: error.message };
  }

  // Notify post author (if not self-comment)
  const { data: post } = await supabase
    .from("posts")
    .select("user_id, group_id")
    .eq("id", postId)
    .single();

  if (post && post.user_id !== user.id) {
    const { data: profile } = await supabase
      .from("users")
      .select("display_name, full_name")
      .eq("id", user.id)
      .single();

    const commenterName = profile?.display_name || profile?.full_name || "Someone";

    await supabase.from("notifications").insert({
      user_id: post.user_id,
      type: "post_commented",
      title: "New Comment",
      message: `${commenterName} commented on your post`,
      link: `/groups/${post.group_id}/feed`,
      group_id: post.group_id,
    });
  }

  revalidatePath(`/groups/${groupId}/feed`);
  return { success: true, comment };
}

export async function updateComment(
  commentId: string,
  groupId: string,
  text: string
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!text.trim()) {
    return { error: "Comment text is required" };
  }

  const { error } = await supabase
    .from("post_comments")
    .update({
      text: text.trim(),
    })
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating comment:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/feed`);
  return { success: true };
}

export async function deleteComment(commentId: string, groupId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("post_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting comment:", error);
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}/feed`);
  return { success: true };
}
