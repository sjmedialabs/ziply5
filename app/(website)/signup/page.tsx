"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { persistSession } from "@/lib/auth-session";

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
    <div className="min-h-screen flex items-center justify-center bg-black/40 relative px-4">
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 z-0" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-xl bg-[#FFC222] rounded-[40px] p-4 md:p-10 shadow-xl text-center">
        
        {/* Heading */}
        <h1 className="text-3xl font-melon font-bold mb-8">
          Sign up
        </h1>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-full border-2 border-[#7B3010] p-1">
          <button
            type="button"
            onClick={() => {
              setMode("email");
              setError("");
              setSuccess("");
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "email" ? "bg-[#7B3010] text-white" : "text-[#7B3010]"}`}
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
            className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "mobile" ? "bg-[#7B3010] text-white" : "text-[#7B3010]"}`}
          >
            Mobile OTP
          </button>
        </div>

        {/* Form */}
        {mode === "email" ? (
          <form onSubmit={handleEmailSignup} className="flex flex-col gap-5">
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-6 py-4 rounded-full border-2 border-[#7B3010] bg-transparent outline-none"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-6 py-4 rounded-full border-2 border-[#7B3010] bg-transparent outline-none"
            />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-6 py-4 rounded-full border-2 border-[#7B3010] bg-transparent outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 rounded-full border-2 border-[#7B3010] bg-transparent outline-none"
            />
            {error && <p className="text-left text-sm text-red-600">{error}</p>}
            {success && <p className="text-left text-sm text-green-700">{success}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 bg-primary text-white py-4 rounded-xl font-semibold tracking-wide shadow-md hover:scale-[1.02] transition"
            >
              {loading ? "CREATING..." : "Create Account"}
            </button>
            <p className="text-sm mt-2">
              <Link
                href="/login"
                className="text-red-500 hover:underline"
              >
                Login
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="flex flex-col gap-5">
            <input
              type="tel"
              placeholder="Mobile number (+91...)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-6 py-4 rounded-full border-2 border-[#7B3010] bg-transparent outline-none"
            />
            <button
              type="button"
              onClick={() => void requestOtp()}
              disabled={otpLoading || !phone.trim()}
              className="bg-white text-[#7B3010] py-3 rounded-xl font-semibold tracking-wide shadow-sm border-2 border-[#7B3010] disabled:opacity-60"
            >
              {otpLoading ? "SENDING OTP..." : otpSent ? "Resend OTP" : "Send OTP"}
            </button>
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full px-6 py-4 rounded-full border-2 border-[#7B3010] bg-transparent outline-none"
            />
            {error && <p className="text-left text-sm text-red-600">{error}</p>}
            {success && <p className="text-left text-sm text-green-700">{success}</p>}
            <button
              type="submit"
              disabled={verifyLoading || otp.trim().length !== 6}
              className="mt-2 bg-primary text-white py-4 rounded-xl font-semibold tracking-wide shadow-md hover:scale-[1.02] transition disabled:opacity-60"
            >
              {verifyLoading ? "VERIFYING..." : "Verify OTP & Continue"}
            </button>
            <p className="text-sm mt-2">
              <Link
                href="/login"
                className="text-red-500 hover:underline"
              >
                Login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}