"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // 👉 Add your auth logic here later

    // Redirect to profile
    router.push("/profile");
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-black/40 relative px-4">
      
      {/* Background overlay (optional image behind) */}
      <div className="absolute inset-0 bg-black/40 z-0" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-xl bg-[#FFC222] rounded-[40px] p-4 md:p-10 shadow-xl text-center">
        
        {/* Heading */}
        <h1 className="text-3xl font-melon font-bold mb-8">
          LOGIN
        </h1>

        {/* Form */}
        <form className="flex flex-col gap-5" onSubmit={handleLogin}>
          
          {/* Username */}
          <input
            type="text"
            placeholder="User Name"
            className="w-full px-6 py-4 rounded-full border-2 border-[#7B3010] bg-transparent outline-none"
          />

          {/* Password */}
          <input
            type="password"
            placeholder="Password"
            className="w-full px-6 py-4 rounded-full border-2 border-[#7B3010] bg-transparent outline-none"
          />

          {/* Forgot Password */}
          <div className="text-left">
            <Link
              href="/forgotPassword"
              className="text-red-500 text-sm hover:underline"
            >
              Forgot your password?
            </Link>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="mt-4 bg-primary text-white py-4 rounded-xl font-semibold tracking-wide shadow-md hover:scale-[1.02] transition"
          >
            LOGIN
          </button>

          {/* Signup */}
          <p className="text-sm mt-2">
            <Link
              href="/signup"
              className="text-red-500 hover:underline"
            >
              Signup
            </Link>
          </p>

        </form>
      </div>
    </div>
  );
}