"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SignupResponse = {
  success: boolean;
  message: string;
};

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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
      router.push("/login");
    } catch {
      setError("Unable to signup. Please try again.");
    } finally {
      setLoading(false);
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          
          {/* First Name */}
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-6 py-4 rounded-full border-2 border-[#7B3010] bg-transparent outline-none"
          />

          {/* Last Name */}
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-6 py-4 rounded-full border-2 border-[#7B3010] bg-transparent outline-none"
          />

          {/* Email */}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-6 py-4 rounded-full border-2 border-[#7B3010] bg-transparent outline-none"
          />

          {/* Password */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-6 py-4 rounded-full border-2 border-[#7B3010] bg-transparent outline-none"
          />

          {error && <p className="text-left text-sm text-red-600">{error}</p>}

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-primary text-white py-4 rounded-xl font-semibold tracking-wide shadow-md hover:scale-[1.02] transition"
          >
            {loading ? "CREATING..." : "Create Account"}
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