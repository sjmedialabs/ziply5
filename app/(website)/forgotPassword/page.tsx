"use client";

import Link from "next/link";
import { useState } from "react";

type ForgotResult = { message: string; resetToken?: string };

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDevToken(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = (await res.json()) as { success?: boolean; message?: string; data?: ForgotResult };
      if (!res.ok || json.success === false) {
        setError(json.message ?? "Request failed");
        return;
      }
      setDone(true);
      if (json.data?.resetToken) {
        setDevToken(json.data.resetToken);
      }
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
        <h1 className="mb-8 font-melon text-3xl font-bold">Recover password</h1>

        {done ? (
          <div className="space-y-4 text-left text-sm text-[#4A1D1F]">
            <p>If an account exists for that email, you will receive reset instructions.</p>
            {devToken && (
              <p className="rounded-lg bg-white/80 p-3 font-mono text-xs">
                Dev mode: reset token returned. Use it on{" "}
                <Link href={`/resetPassword?token=${encodeURIComponent(devToken)}`} className="font-semibold underline">
                  reset password
                </Link>
                .
              </p>
            )}
            <Link href="/login" className="inline-block text-sm text-red-600 hover:underline">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {error && <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-900">{error}</p>}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full rounded-full border-2 border-[#7B3010] bg-transparent px-6 py-4 outline-none"
            />

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-primary py-4 font-semibold tracking-wide text-white shadow-md transition hover:scale-[1.02] disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>

            <Link href="/login" className="text-sm text-red-500 hover:underline">
              Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
