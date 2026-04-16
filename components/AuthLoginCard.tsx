"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

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

      localStorage.setItem("ziply5_access_token", payload.data.accessToken);
      localStorage.setItem("ziply5_refresh_token", payload.data.refreshToken);
      localStorage.setItem("ziply5_user_role", payload.data.user.role);
      window.dispatchEvent(new Event("storage"));

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-black/40 relative px-4">
      <div className="absolute inset-0 bg-black/40 z-0" />
      <div className="relative z-10 w-full max-w-xl bg-[#FFC222] rounded-[40px] p-4 md:p-10 shadow-xl text-center">
        <h1 className="text-3xl font-melon font-bold mb-8">{title}</h1>

        <form className="flex flex-col gap-5" onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="User Name"
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

          <div className="text-left">
            <Link href="/forgotPassword" className="text-red-500 text-sm hover:underline">
              Forgot your password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 bg-primary text-white py-4 rounded-xl font-semibold tracking-wide shadow-md hover:scale-[1.02] transition"
          >
            {loading ? "LOGGING IN..." : "LOGIN"}
          </button>

          {portal === "website" ? (
            <p className="text-sm mt-2">
              <Link href="/signup" className="text-red-500 hover:underline">
                Signup
              </Link>
            </p>
          ) : (
            <p className="text-sm mt-2">
              <Link href={backLinkHref} className="text-red-500 hover:underline">
                Back to website
              </Link>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
