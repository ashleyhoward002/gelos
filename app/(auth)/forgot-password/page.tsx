"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { createClient } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-soft-lavender to-bright-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <Logo size="lg" />
          </div>
          <p className="text-slate-medium">Where your people come together</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-8 border border-gray-200">
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-electric-cyan/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-electric-cyan"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-heading font-semibold mb-2 text-slate-dark">
                Check your email!
              </h2>
              <p className="text-slate-medium mb-6">
                We sent a password reset link to{" "}
                <span className="font-medium text-slate-dark">{email}</span>
              </p>
              <p className="text-sm text-slate-medium mb-4">
                Didn&apos;t receive the email? Check your spam folder or{" "}
                <button
                  onClick={() => setSuccess(false)}
                  className="text-electric-cyan hover:underline font-medium"
                >
                  try again
                </button>
              </p>
              <Link
                href="/login"
                className="text-electric-cyan hover:underline font-medium"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-heading font-semibold mb-2 text-center text-slate-dark">
                Forgot your password?
              </h2>
              <p className="text-slate-medium text-center mb-6">
                Enter your email and we&apos;ll send you a link to reset it.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="label">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>

              <p className="mt-6 text-center text-slate-medium">
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="text-electric-cyan hover:underline font-medium"
                >
                  Log In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
