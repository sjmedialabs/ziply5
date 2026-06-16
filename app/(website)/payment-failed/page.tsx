"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { XCircle } from "lucide-react"

function PaymentFailedContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")
  const reason = searchParams.get("reason")

  const handleRetry = () => {
    if (orderId) {
      router.push(`/payment?orderId=${orderId}`)
    } else {
      router.push("/checkout")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F1E6] p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-sm border text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-red-100 p-3">
            <XCircle className="text-red-600 w-12 h-12" />
          </div>
        </div>
        <h1 className="font-melon text-2xl mb-2 text-[#4A1D1F]">Payment Failed</h1>
        <p className="text-gray-600 mb-2 text-sm">
          We were unable to process your payment for order {orderId ? `#${orderId.slice(0, 8)}` : ""}.
        </p>
        
        {reason && (
          <div className="mb-6 rounded-lg bg-red-50 p-3 text-xs text-red-800 border border-red-100">
            <strong>Reason:</strong> {decodeURIComponent(reason)}
          </div>
        )}

        <div className="space-y-4 mt-6">
          <div className="flex flex-col gap-3">
            <button
              onClick={handleRetry}
              className="w-full bg-[#5A272A] text-white py-3 rounded-full text-sm font-semibold uppercase tracking-wide shadow-md hover:bg-[#451f21] transition-all"
            >
              Retry Payment
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

export default function PaymentFailedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F5F1E6]">
          <div className="text-sm text-[#5A272A] font-medium">Loading...</div>
        </div>
      }
    >
      <PaymentFailedContent />
    </Suspense>
  )
}
