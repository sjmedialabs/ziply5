"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 👉 Later: API call for signup

    // Redirect after signup
    router.push("/profile");
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          
          {/* First Name */}
          <input
            type="text"
            placeholder="First Name"
            className="w-full px-6 py-4 rounded-full border-2 border-[#7B3010] bg-transparent outline-none"
          />

          {/* Last Name */}
          <input
            type="text"
            placeholder="Last Name"
            className="w-full px-6 py-4 rounded-full border-2 border-[#7B3010] bg-transparent outline-none"
          />

          {/* Email */}
          <input
            type="email"
            placeholder="Email address"
            className="w-full px-6 py-4 rounded-full border-2 border-[#7B3010] bg-transparent outline-none"
          />

          {/* Password */}
          <input
            type="password"
            placeholder="Password"
            className="w-full px-6 py-4 rounded-full border-2 border-[#7B3010] bg-transparent outline-none"
          />

          {/* Button */}
          <button
            type="submit"
            className="mt-2 bg-primary text-white py-4 rounded-xl font-semibold tracking-wide shadow-md hover:scale-[1.02] transition"
          >
            Create Account
          </button>

          {/* Login Link */}
          <p className="text-sm mt-2">
            <Link
              href="/login"
              className="text-red-500 hover:underline"
            >
              Login
            </Link>
          </p>

        </form>
      </div>
    </div>
  );
}