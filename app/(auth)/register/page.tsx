"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signUp } from "@/lib/auth";
import { Logo } from "@/components/ui/logo";

function RegisterForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const result = await signUp(formData, redirectTo || undefined);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else if (result?.requiresConfirmation) {
        setSuccess(result.message || "Check your email to confirm your account!");
        setLoading(false);
      }
    } catch {
      // If signUp redirects, this won't be reached
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-2">
          <Logo size="lg" />
        </div>
        <p className="text-slate-medium">Where your people come together</p>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-8 border border-gray-200">
        <h2 className="text-2xl font-heading font-semibold mb-6 text-center text-slate-dark">
          Create Account
        </h2>

        {success ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">📧</div>
            <h3 className="text-xl font-heading font-semibold text-slate-dark mb-2">
              Check Your Email
            </h3>
            <p className="text-slate-medium mb-4">{success}</p>
            <p className="text-sm text-slate-medium">
              Click the link in your email to confirm your account and complete registration.
            </p>
          </div>
        ) : (
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="label">
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              className="input"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="input"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="input"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="label">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              className="input"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
        )}

        {!success && (
        <p className="mt-6 text-center text-slate-medium">
          Already have an account?{" "}
          <Link
            href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login"}
            className="text-electric-cyan hover:underline font-medium"
          >
            Sign in
          </Link>
        </p>
        )}
      </div>
    </div>
  );
}

function RegisterFallback() {
  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-2">
          <Logo size="lg" />
        </div>
        <p className="text-slate-medium">Where your people come together</p>
      </div>
      <div className="bg-white rounded-2xl shadow-card p-8 border border-gray-200">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-aurora">
      <Suspense fallback={<RegisterFallback />}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
