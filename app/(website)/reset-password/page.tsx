"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");

  useEffect(() => {
    if (!token) {
      toast.error("Invalid or missing reset token");
      router.push("/login");
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Reset failed");

      setStep("success");
      toast.success("Password reset successfully");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-bold text-[#111827]">Password Updated!</h2>
        <p className="mt-2 text-[#6B7280]">Your password has been reset successfully. You can now log in with your new password.</p>
        <Link
          href="/login"
          className="mt-8 block w-full rounded-2xl bg-[#FFC222] py-4 font-semibold text-[#7B3010] shadow-md transition hover:brightness-95"
        >
          GO TO LOGIN
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          required
          type={showPassword ? "text" : "password"}
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-14 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-12 pr-12 text-sm outline-none transition focus:border-[#FFC222] focus:ring-4 focus:ring-[#FFC222]/10"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280]"
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>

      <div className="relative">
        <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          required
          type={showPassword ? "text" : "password"}
          placeholder="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="h-14 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-12 pr-12 text-sm outline-none transition focus:border-[#FFC222] focus:ring-4 focus:ring-[#FFC222]/10"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 h-14 w-full rounded-2xl bg-[#FFC222] font-bold uppercase tracking-wider text-[#7B3010] shadow-lg shadow-[#FFC222]/20 transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
      >
        {loading ? "RESETTING..." : "RESET PASSWORD"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F7F8FB] px-4 py-10 flex items-center justify-center">
      {/* Background Accents */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#FFC222]/10 blur-3xl" />
      <div className="absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-[#7B3010]/5 blur-3xl" />

      <div className="relative w-full max-w-[500px]">
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_20px_70px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
          <div className="p-8 md:p-12">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFC222]/20 text-[#7B3010]">
              <Shield className="h-8 w-8" />
            </div>

            <div className="text-center mb-10">
              <h1 className="font-melon text-3xl font-bold text-[#111827]">New Password</h1>
              <p className="mt-2 text-sm text-[#6B7280]">Create a strong password for your account</p>
            </div>

            <Suspense fallback={<div className="h-40 animate-pulse bg-gray-100 rounded-2xl" />}>
              <ResetPasswordForm />
            </Suspense>

            <div className="mt-10 text-center">
              {/* <Link href="/login" className="text-sm font-medium text-[#6B7280] hover:text-[#111827] hover:underline">
                Back to Login
              </Link> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
