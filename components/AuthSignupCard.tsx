"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, Phone, Lock, Shield, Eye, EyeOff } from "lucide-react";
import { OtpVerification } from "./otp/OtpVerification";
import { toast } from "sonner";
import { persistSession } from "@/lib/auth-session";

export default function AuthSignupCard() {
  const router = useRouter();
  const [mode, setMode] = useState<"email" | "mobile">("email");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: "customer",
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Signup failed");
      }
      
      toast.success("Account created successfully!");
      router.push("/login");
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        body: JSON.stringify({ mobile: formData.phone, purpose: "REGISTER" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      
      setStep("otp");
      toast.success("Verification code sent to your mobile");
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({
          mobile: formData.phone,
          code,
          purpose: "REGISTER",
          name: formData.name,
          email: formData.email,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      persistSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        role: data.user.role,
        user: data.user,
      });

      toast.success("Account created successfully!");
      router.push("/profile");
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
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
            {step === "form" ? "Create Account" : "Verify Mobile"}
          </h1>
          
          {step === "form" && (
            <div className="mt-6 flex gap-2 rounded-2xl bg-[#F3F4F6] p-1">
              <button
                onClick={() => { setMode("email"); setError(""); }}
                className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${mode === "email" ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280]"}`}
              >
                E-mail
              </button>
              <button
                onClick={() => { setMode("mobile"); setError(""); }}
                className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${mode === "mobile" ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280]"}`}
              >
                Mobile No.
              </button>
            </div>
          )}

          {step === "form" ? (
            mode === "email" ? (
              <form className="mt-8 flex flex-col gap-4" onSubmit={handleEmailSignup}>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    required
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-12 pr-4 text-sm outline-none transition focus:border-[#FFC222]"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    required
                    type="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-12 pr-4 text-sm outline-none transition focus:border-[#FFC222]"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-12 pr-12 text-sm outline-none transition focus:border-[#FFC222]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#6B7280]"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 h-12 w-full rounded-2xl bg-[#FFC222] font-semibold text-[#7B3010] shadow-sm transition hover:brightness-95 disabled:opacity-60"
                >
                  {loading ? "CREATING..." : "CREATE ACCOUNT"}
                </button>
              </form>
            ) : (
              <form className="mt-8 flex flex-col gap-4" onSubmit={handleSendOtp}>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    required
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-12 pr-4 text-sm outline-none transition focus:border-[#FFC222]"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    required
                    type="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-12 pr-4 text-sm outline-none transition focus:border-[#FFC222]"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    required
                    placeholder="Mobile Number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-12 pr-4 text-sm outline-none transition focus:border-[#FFC222]"
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 h-12 w-full rounded-2xl bg-[#FFC222] font-semibold text-[#7B3010] shadow-sm transition hover:brightness-95 disabled:opacity-60"
                >
                  {loading ? "SENDING CODE..." : "REGISTER WITH OTP"}
                </button>
              </form>
            )
          ) : (
            <div className="mt-8">
              <OtpVerification
                mobile={formData.phone}
                onVerify={handleVerifyOtp}
                onResend={async () => {
                  await fetch("/api/auth/otp/send", {
                    method: "POST",
                    body: JSON.stringify({ mobile: formData.phone, purpose: "REGISTER" }),
                  });
                }}
                isLoading={loading}
              />
            </div>
          )}

          <div className="mt-6 text-center text-sm text-[#6B7280]">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#111827] hover:underline">
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
