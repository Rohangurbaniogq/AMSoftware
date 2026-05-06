"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";

type Mode = "login" | "signup";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, login } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <svg className="animate-spin h-8 w-8 text-[var(--yellow)]" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (user) {
    return <>{children}</>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim();
    const trimmedName = name.trim();

    if (!trimmedEmail) {
      setError("Please enter your email");
      return;
    }
    if (!trimmedEmail.endsWith("@ogq.org")) {
      setError("Only @ogq.org email addresses are allowed");
      return;
    }
    if (!trimmedCode) {
      setError("Please enter the access code");
      return;
    }
    if (mode === "signup" && !trimmedName) {
      setError("Please enter your name");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode === "login" ? "login" : "register",
          name: trimmedName,
          email: trimmedEmail,
          code: trimmedCode,
        }),
      });

      const data = await res.json();

      if (data.success && data.user) {
        // Prefetch data while login completes so DataProvider has it cached
        fetch("/api/athletes");
        fetch("/api/submissions");
        login(data.user);
      } else {
        setError(data.message || "Something went wrong");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight">
            <span className="text-[var(--yellow)]">OGQ</span> Athlete Monitor
          </h1>
          <p className="text-sm text-[var(--foreground)]/50 mt-2">
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-[var(--card-bg)] rounded-xl p-8 border border-[var(--grey-border)]/50"
          style={{ boxShadow: "var(--card-shadow)" }}
        >
          {/* Mode Switcher */}
          <div className="flex gap-1 mb-6 bg-[var(--section-bg)] rounded-xl p-1">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === "login"
                  ? "bg-[var(--yellow)] text-black shadow-sm"
                  : "text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(""); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === "signup"
                  ? "bg-[var(--yellow)] text-black shadow-sm"
                  : "text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name - only on signup */}
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-[var(--foreground)] placeholder-[var(--foreground)]/30 text-sm transition-all duration-200"
                  autoFocus
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@ogq.org"
                className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-[var(--foreground)] placeholder-[var(--foreground)]/30 text-sm transition-all duration-200"
                autoFocus={mode === "login"}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50 mb-2">
                Access Code
              </label>
              <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter code"
                className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-[var(--foreground)] placeholder-[var(--foreground)]/30 text-sm transition-all duration-200"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-[var(--yellow)] hover:bg-[var(--yellow-dark)] text-black font-bold rounded-xl transition-all duration-200 text-sm uppercase tracking-wider disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {mode === "login" ? "Signing in..." : "Creating account..."}
                </span>
              ) : (
                mode === "login" ? "Sign In" : "Create Account"
              )}
            </button>
          </form>

          {/* Switch mode link */}
          <p className="text-center text-xs text-[var(--foreground)]/50 mt-5">
            {mode === "login" ? (
              <>
                New here?{" "}
                <button onClick={switchMode} className="text-[var(--yellow)] font-semibold hover:underline">
                  Sign Up
                </button>
              </>
            ) : (
              <>
                Already registered?{" "}
                <button onClick={switchMode} className="text-[var(--yellow)] font-semibold hover:underline">
                  Log In
                </button>
              </>
            )}
          </p>
        </div>

        <p className="text-center text-xs text-[var(--foreground)]/30 mt-6">
          Access restricted to OGQ personnel only
        </p>
      </div>
    </div>
  );
}
