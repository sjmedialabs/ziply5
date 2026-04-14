"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromQuery = searchParams.get("token") ?? "";
  const [token, setToken] = useState(tokenFromQuery);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), password }),
      });
      const json = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || json.success === false) {
        setError(json.message ?? "Reset failed");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black/40 px-4">
      <div className="absolute inset-0 z-0 bg-black/40" />
      <div className="relative z-10 w-full max-w-xl rounded-[40px] bg-[#FFC222] p-4 text-center shadow-xl md:p-10">
        <h1 className="mb-8 font-melon text-3xl font-bold">Set new password</h1>

        {done ? (
          <div className="space-y-4 text-sm text-[#4A1D1F]">
            <p>Your password has been updated. You can sign in with the new password.</p>
            <Link href="/login" className="inline-block font-semibold text-red-600 underline">
              Go to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
            {error && <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-900">{error}</p>}
            <label className="text-xs font-semibold uppercase text-[#4A1D1F]">
              Reset token
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="mt-1 w-full rounded-full border-2 border-[#7B3010] bg-transparent px-6 py-3 font-mono text-sm outline-none"
                placeholder="Paste token from email (or dev link)"
              />
            </label>
            <label className="text-xs font-semibold uppercase text-[#4A1D1F]">
              New password
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-full border-2 border-[#7B3010] bg-transparent px-6 py-3 outline-none"
              />
            </label>
            <label className="text-xs font-semibold uppercase text-[#4A1D1F]">
              Confirm password
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-full border-2 border-[#7B3010] bg-transparent px-6 py-3 outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-xl bg-primary py-4 font-semibold tracking-wide text-white shadow-md transition hover:scale-[1.02] disabled:opacity-50"
            >
              {loading ? "Updating…" : "Update password"}
            </button>
            <Link href="/login" className="text-center text-sm text-red-500 hover:underline">
              Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f6f0dc] text-sm text-[#646464]">
          Loading…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
