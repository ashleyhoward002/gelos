"use server";

import { createServerSupabaseClient } from "./supabase-server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function signUp(formData: FormData, redirectTo?: string) {
  const supabase = await createServerSupabaseClient();
  const headersList = await headers();
  const origin = headersList.get("origin") || `https://${headersList.get("x-forwarded-host")}` || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;

  // Build the callback URL with the redirect parameter
  const callbackUrl = redirectTo
    ? `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
    : `${origin}/auth/callback`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        display_name: fullName.split(" ")[0],
      },
      emailRedirectTo: callbackUrl,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Check if email confirmation is required
  // If user.identities is empty, user already exists with this email
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { error: "An account with this email already exists. Please sign in." };
  }

  if (data.user && !data.session) {
    // Email confirmation required - user is created but not confirmed
    return {
      success: true,
      message: "Check your email to confirm your account!",
      requiresConfirmation: true
    };
  }

  // If we have a session, user is logged in (no email confirmation required)
  redirect(redirectTo || "/dashboard");
}

export async function signIn(formData: FormData, redirectTo?: string) {
  const supabase = await createServerSupabaseClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes("Email not confirmed")) {
      return { error: "Please check your email and confirm your account before signing in." };
    }
    return { error: error.message };
  }

  redirect(redirectTo || "/dashboard");
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
