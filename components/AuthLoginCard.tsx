"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { persistSession } from "@/lib/auth-session";
import { Lock, Mail, Shield, Eye, EyeOff } from "lucide-react";
import { OtpVerification } from "./otp/OtpVerification";

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
  const [loginMethod, setLoginMethod] = useState<"password" | "otp">("password");
  const [phone, setPhone] = useState("");
  const [otpStep, setOtpStep] = useState<"phone" | "verify">("phone");

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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        body: JSON.stringify({ mobile: phone, purpose: "LOGIN" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setOtpStep("verify");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ mobile: phone, code, purpose: "LOGIN" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      persistSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        role: data.user.role,
        user: data.user,
      });
      router.push("/profile");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F7F8FB] px-4 py-10">
      <div className="mx-auto flex w-full max-w-[520px] items-center justify-center">
        <div className="w-full rounded-3xl bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.10)] ring-1 ring-black/5 md:p-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFC222]/20 text-[#7B3010]">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-center font-melon text-3xl font-bold text-[#111827]">
            {portal === "admin" ? "Admin Login" : "Login"}
          </h1>

          <div className="mt-6 flex gap-2 rounded-2xl bg-[#F3F4F6] p-1">
            <button
              onClick={() => { setLoginMethod("password"); setError(""); }}
              className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${loginMethod === "password" ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280]"}`}
            >
              E-mail
            </button>
            <button
              onClick={() => { setLoginMethod("otp"); setError(""); }}
              className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${loginMethod === "otp" ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280]"}`}
            >
              Mobile No.
            </button>
          </div>

          {loginMethod === "password" ? (
            <form className="mt-8 flex flex-col gap-4" onSubmit={handleLogin}>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-12 pr-4 text-sm outline-none focus:border-[#FFC222]"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-12 pr-12 text-sm outline-none focus:border-[#FFC222]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#6B7280]"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <div className="flex justify-end">
                <Link
                  href="/forgotPassword"
                  className="text-xs font-medium text-[#7B3010] hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-2xl bg-[#FFC222] font-semibold text-[#7B3010] shadow-sm transition hover:brightness-95 disabled:opacity-60"
              >
                {loading ? "LOGGING IN..." : "LOGIN"}
              </button>
            </form>
          ) : otpStep === "phone" ? (
            <form className="mt-8 flex flex-col gap-4" onSubmit={handleSendOtp}>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  placeholder="Mobile Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-12 pr-4 text-sm outline-none focus:border-[#FFC222]"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-2xl bg-[#FFC222] font-semibold text-[#7B3010] shadow-sm transition hover:brightness-95"
              >
                {loading ? "SENDING..." : "SEND OTP"}
              </button>
            </form>
          ) : (
            <div className="mt-8">
              <OtpVerification
                mobile={phone}
                onVerify={handleVerifyOtp}
                onResend={async () => {
                  await fetch("/api/auth/otp/send", {
                    method: "POST",
                    body: JSON.stringify({ mobile: phone, purpose: "LOGIN" }),
                  });
                }}
                isLoading={loading}
              />
            </div>
          )}

          <div className="mt-6 text-center text-sm text-[#6B7280]">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-[#111827] hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
