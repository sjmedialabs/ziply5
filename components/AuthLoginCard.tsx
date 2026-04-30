"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { persistSession } from "@/lib/auth-session";
import { Lock, Mail, Shield, Eye, EyeOff } from "lucide-react";

type Portal = "website" | "admin";

type LoginResponse = {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
    accessToken: string;
    refreshToken: string;
  };
};

export default function AuthLoginCard({
  title,
  portal,
  backLinkHref = "/",
}: {
  title: string;
  portal: Portal;
  backLinkHref?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, portal }),
      });
      const payload = (await response.json()) as LoginResponse;

      if (!response.ok || !payload.success || !payload.data) {
        setError(payload.message || "Login failed");
        return;
      }

      persistSession({
        accessToken: payload.data.accessToken,
        refreshToken: payload.data.refreshToken,
        role: payload.data.user.role,
        user: payload.data.user,
      });

      if (payload.data.user.role === "admin" || payload.data.user.role === "super_admin") {
        router.push("/admin/dashboard");
      } else {
        const next = searchParams.get("next");
        if (portal === "website" && next && next.startsWith("/")) {
          router.push(next);
        } else {
          router.push("/profile");
        }
      }
    } catch {
      setError("Unable to login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F7F8FB] px-4 py-10">
      {/* Background accents */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#FFC222]/25 blur-2xl" />
      <div className="pointer-events-none absolute -right-28 -bottom-28 h-80 w-80 rounded-full bg-[#FFC222]/20 blur-2xl" />
      <div className="pointer-events-none absolute left-10 top-1/2 hidden h-28 w-28 -translate-y-1/2 rounded-full bg-[#7B3010]/10 blur-xl md:block" />
      <div className="pointer-events-none absolute right-12 top-24 hidden h-24 w-24 rounded-full bg-[#7B3010]/10 blur-xl md:block" />

      <div className="mx-auto flex w-full max-w-[520px] items-center justify-center">
        <div className="w-full rounded-3xl bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.10)] ring-1 ring-black/5 md:p-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFC222]/20 text-[#7B3010]">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-center font-melon text-3xl font-bold text-[#111827]">
            {portal === "admin" ? "Admin Login" : "Login"}
          </h1>
          <p className="mt-1 text-center text-sm text-[#6B7280]">Please sign in to continue</p>

          <form className="mt-8 flex flex-col gap-4" onSubmit={handleLogin}>
            <label className="block">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="admin@ziply5.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-12 pr-4 text-sm text-[#111827] outline-none transition focus:border-[#FFC222] focus:ring-4 focus:ring-[#FFC222]/20"
                />
              </div>
            </label>

            <label className="block">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-12 pr-12 text-sm text-[#111827] outline-none transition focus:border-[#FFC222] focus:ring-4 focus:ring-[#FFC222]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#6B7280] hover:bg-[#F3F4F6]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </label>

            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-left text-sm text-red-700">{error}</p>}

            <div className="flex items-center justify-between">
              <Link href="/forgotPassword" className="text-sm font-medium text-[#B45309] hover:underline">
                Forgot your password?
              </Link>
              {portal === "website" ? (
                <Link href="/signup" className="text-sm font-medium text-[#111827] hover:underline">
                  Create account
                </Link>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-12 w-full rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"
            >
              {loading ? "LOGGING IN..." : "LOGIN"}
            </button>

            <div className="mt-6">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[#E5E7EB]" />
                <span className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">or</span>
                <div className="h-px flex-1 bg-[#E5E7EB]" />
              </div>

              {portal === "admin" ? (
                <div className="mt-4 text-center">
                  <Link href={backLinkHref} className="inline-flex items-center gap-2 text-sm font-medium text-[#111827] hover:underline">
                    ← Back to website
                  </Link>
                </div>
              ) : (
                <div className="mt-4 text-center text-sm text-[#6B7280]">
                  New here?{" "}
                  <Link href="/signup" className="font-semibold text-[#111827] hover:underline">
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
