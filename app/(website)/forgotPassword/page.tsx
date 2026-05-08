"use client";

import Link from "next/link";
import { useState } from "react";
import { Shield, Mail, Phone } from "lucide-react";
import { OtpVerification } from "@/components/otp/OtpVerification";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [method, setMethod] = useState<"email" | "mobile">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"request" | "otp" | "new_password" | "done">("request");
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Request failed");
      setStep("done");
      toast.success("Reset link sent to your email");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        body: JSON.stringify({ mobile: phone, purpose: "RESET_PASSWORD" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setStep("otp");
      toast.success("Verification code sent to your mobile");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setStep("new_password");
    // We'll store the code to send with the new password
    (window as any)._otpCode = code;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({
          mobile: phone,
          code: (window as any)._otpCode,
          purpose: "RESET_PASSWORD",
          newPassword,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setStep("done");
      toast.success("Password reset successfully");
    } catch (err: any) {
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
            Recover Password
          </h1>

          {step === "done" ? (
            <div className="mt-8 text-center">
              <p className="text-sm text-[#6B7280]">
                Success! You can now log in with your new password.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block w-full rounded-2xl bg-[#FFC222] py-3 font-semibold text-[#7B3010]"
              >
                Go to Login
              </Link>
            </div>
          ) : (
            <>
              {step === "request" && (
                <div className="mt-6 flex gap-2 rounded-2xl bg-[#F3F4F6] p-1">
                  <button
                    onClick={() => setMethod("email")}
                    className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${method === "email" ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280]"}`}
                  >
                    Email
                  </button>
                  <button
                    onClick={() => setMethod("mobile")}
                    className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${method === "mobile" ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280]"}`}
                  >
                    Mobile
                  </button>
                </div>
              )}

              {step === "request" && method === "email" && (
                <form className="mt-8 flex flex-col gap-4" onSubmit={handleSendEmail}>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                      required
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-12 pr-4 text-sm outline-none focus:border-[#FFC222]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full rounded-2xl bg-[#FFC222] font-semibold text-[#7B3010] shadow-sm transition hover:brightness-95"
                  >
                    {loading ? "SENDING..." : "SEND RESET LINK"}
                  </button>
                </form>
              )}

              {step === "request" && method === "mobile" && (
                <form className="mt-8 flex flex-col gap-4" onSubmit={handleSendOtp}>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                      required
                      placeholder="Mobile Number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-12 pr-4 text-sm outline-none focus:border-[#FFC222]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full rounded-2xl bg-[#FFC222] font-semibold text-[#7B3010] shadow-sm transition hover:brightness-95"
                  >
                    {loading ? "SENDING OTP..." : "SEND VERIFICATION CODE"}
                  </button>
                </form>
              )}

              {step === "otp" && (
                <div className="mt-8">
                  <OtpVerification
                    mobile={phone}
                    onVerify={handleVerifyOtp}
                    onResend={async () => {
                      await fetch("/api/auth/otp/send", {
                        method: "POST",
                        body: JSON.stringify({ mobile: phone, purpose: "RESET_PASSWORD" }),
                      });
                    }}
                    isLoading={loading}
                  />
                </div>
              )}

              {step === "new_password" && (
                <form className="mt-8 flex flex-col gap-4" onSubmit={handleResetPassword}>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                      required
                      type="password"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-12 pr-4 text-sm outline-none focus:border-[#FFC222]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full rounded-2xl bg-[#FFC222] font-semibold text-[#7B3010] shadow-sm transition hover:brightness-95"
                  >
                    {loading ? "RESETTING..." : "RESET PASSWORD"}
                  </button>
                </form>
              )}
            </>
          )}

          <div className="mt-6 text-center text-sm text-[#6B7280]">
            Remembered?{" "}
            <Link href="/login" className="font-semibold text-[#111827] hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
