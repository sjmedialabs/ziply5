"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"

function OrderSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (countdown !== 0) return
    router.push("/profile?tab=orders")
  }, [countdown, router])

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F1E6] p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-sm border text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircle2 className="text-green-600 w-12 h-12" />
          </div>
        </div>
        <h1 className="font-melon text-2xl mb-2 text-[#4A1D1F]">Order Successful!</h1>
        <p className="text-gray-600 mb-6 text-sm">
          Thank you for your order. Your order {orderId ? `#${orderId.slice(0, 8)}` : ""} has been placed successfully and will be processed soon.
        </p>
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Redirecting to your order history in <span className="font-bold text-orange-600">{countdown}</span> seconds...
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push("/profile?tab=orders")}
              className="w-full bg-[#5A272A] text-white py-3 rounded-full text-sm font-semibold uppercase tracking-wide shadow-md hover:bg-[#451f21] transition-all"
            >
              View Order History
            </button>
            <Link
              href="/"
              className="text-xs font-semibold text-gray-400 hover:text-[#5A272A] transition-colors"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F5F1E6]">
          <div className="text-sm text-[#5A272A] font-medium">Loading...</div>
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  )
}
