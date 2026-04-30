"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { persistSession } from "@/lib/auth-session";
import { Eye, EyeOff, Lock, Mail, Phone, Shield, User } from "lucide-react";

type SignupResponse = {
  success: boolean;
  message: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    user?: { role?: string };
    otp?: string;
  };
};

export default function SignupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"email" | "mobile">("email");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const persistAuth = (payload: SignupResponse) => {
    if (!payload.data?.accessToken || !payload.data?.refreshToken || !payload.data?.user?.role) return false;
    persistSession({
      accessToken: payload.data.accessToken,
      refreshToken: payload.data.refreshToken,
      role: payload.data.user.role,
      user: payload.data.user,
    });
    return true;
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${firstName} ${lastName}`.trim(),
          email,
          password,
          role: "customer",
        }),
      });
      const payload = (await response.json()) as SignupResponse;

      if (!response.ok || !payload.success) {
        setError(payload.message || "Signup failed");
        return;
      }
      setSuccess("Account created successfully. A welcome email has been sent from Ziply5.");
      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch {
      setError("Unable to signup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = async () => {
    setError("");
    setSuccess("");
    setOtpLoading(true);
    try {
      const response = await fetch("/api/v1/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "login" }),
      });
      const payload = (await response.json()) as SignupResponse;
      if (!response.ok || !payload.success) {
        setError(payload.message || "Failed to send OTP");
        return;
      }
      setOtpSent(true);
      setSuccess("OTP sent to your mobile number.");
    } catch {
      setError("Unable to send OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setVerifyLoading(true);
    try {
      const response = await fetch("/api/v1/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp, portal: "website" }),
      });
      const payload = (await response.json()) as SignupResponse;
      if (!response.ok || !payload.success) {
        setError(payload.message || "OTP verification failed");
        return;
      }
      if (persistAuth(payload)) {
        setSuccess("Mobile signup completed successfully.");
        router.push("/profile");
      } else {
        setError("Authentication tokens missing. Please login again.");
      }
    } catch {
      setError("Unable to verify OTP. Please try again.");
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F7F8FB] px-4 py-10">
      {/* Background accents */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#FFC222]/25 blur-2xl" />
      <div className="pointer-events-none absolute -right-28 -bottom-28 h-80 w-80 rounded-full bg-[#FFC222]/20 blur-2xl" />
      <div className="pointer-events-none absolute left-10 top-1/2 hidden h-28 w-28 -translate-y-1/2 rounded-full bg-[#7B3010]/10 blur-xl md:block" />
      <div className="pointer-events-none absolute right-12 top-24 hidden h-24 w-24 rounded-full bg-[#7B3010]/10 blur-xl md:block" />

      <div className="mx-auto flex w-full max-w-[560px] items-center justify-center">
        <div className="w-full rounded-3xl bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.10)] ring-1 ring-black/5 md:p-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFC222]/20 text-[#7B3010]">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-center font-melon text-3xl font-bold text-[#111827]">Create account</h1>
          <p className="mt-1 text-center text-sm text-[#6B7280]">Sign up to continue</p>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-full border-2 border-[#7B3010] p-1">
          <button
            type="button"
            onClick={() => {
              setMode("email");
              setError("");
              setSuccess("");
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "email" ? "bg-[#7B3010] text-white" : "text-[#7B3010] hover:bg-[#7B3010]/5"}`}
          >
            Email signup
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("mobile");
              setError("");
              setSuccess("");
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "mobile" ? "bg-[#7B3010] text-white" : "text-[#7B3010] hover:bg-[#7B3010]/5"}`}
          >
            Mobile OTP
          </button>
        </div>

        {/* Form */}
        {mode === "email" ? (
          <form onSubmit={handleEmailSignup} className="mt-8 flex flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type="text"
                    autoComplete="given-name"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-12 pr-4 text-sm text-[#111827] outline-none transition focus:border-[#FFC222] focus:ring-4 focus:ring-[#FFC222]/20"
                  />
                </div>
              </label>
              <label className="block">
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type="text"
                    autoComplete="family-name"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-12 pr-4 text-sm text-[#111827] outline-none transition focus:border-[#FFC222] focus:ring-4 focus:ring-[#FFC222]/20"
                  />
                </div>
              </label>
            </div>

            <label className="block">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Email address"
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
                  autoComplete="new-password"
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
            {success && <p className="rounded-xl bg-green-50 px-3 py-2 text-left text-sm text-green-800">{success}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-12 w-full rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"
            >
              {loading ? "CREATING..." : "Create Account"}
            </button>

            <div className="mt-4 text-center text-sm text-[#6B7280]">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-[#111827] hover:underline">
                Login
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="mt-8 flex flex-col gap-4">
            <label className="block">
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Mobile number (+91...)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-12 pr-4 text-sm text-[#111827] outline-none transition focus:border-[#FFC222] focus:ring-4 focus:ring-[#FFC222]/20"
                />
              </div>
            </label>
            <button
              type="button"
              onClick={() => void requestOtp()}
              disabled={otpLoading || !phone.trim()}
              className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white text-sm font-semibold uppercase tracking-wide text-[#111827] transition hover:bg-[#F9FAFB] disabled:opacity-60"
            >
              {otpLoading ? "SENDING OTP..." : otpSent ? "Resend OTP" : "Send OTP"}
            </button>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827] outline-none transition focus:border-[#FFC222] focus:ring-4 focus:ring-[#FFC222]/20"
            />
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-left text-sm text-red-700">{error}</p>}
            {success && <p className="rounded-xl bg-green-50 px-3 py-2 text-left text-sm text-green-800">{success}</p>}
            <button
              type="submit"
              disabled={verifyLoading || otp.trim().length !== 6}
              className="mt-2 h-12 w-full rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"
            >
              {verifyLoading ? "VERIFYING..." : "Verify OTP & Continue"}
            </button>

            <div className="mt-4 text-center text-sm text-[#6B7280]">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-[#111827] hover:underline">
                Login
              </Link>
            </div>
          </form>
        )}
          <div className="mt-6">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[#E5E7EB]" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">or</span>
              <div className="h-px flex-1 bg-[#E5E7EB]" />
            </div>
            <div className="mt-4 text-center">
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#111827] hover:underline">
                ← Back to website
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}