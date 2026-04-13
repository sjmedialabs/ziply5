"use client";

import Link from "next/link";

export default function ForgotPasswordPage() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 👉 Later: call API to send reset email
    alert("Password reset link sent!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black/40 relative px-4">
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 z-0" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-xl bg-[#FFC222] rounded-[40px] p-4 md:p-10 shadow-xl text-center">
        
        {/* Heading */}
        <h1 className="text-3xl font-melon font-bold mb-8">
          Recover password
        </h1>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          {/* Email Input */}
          <input
            type="email"
            placeholder="Email address"
            className="w-full px-6 py-4 rounded-full border-2 border-[#7B3010] bg-transparent outline-none"
          />

          {/* Button */}
          <button
            type="submit"
            className="bg-primary text-white py-4 rounded-xl font-semibold tracking-wide shadow-md hover:scale-[1.02] transition"
          >
            LOGIN
          </button>

          {/* Back to login */}
          <Link
            href="/login"
            className="text-red-500 text-sm hover:underline"
          >
            Back to login
          </Link>

        </form>
      </div>
    </div>
  );
}