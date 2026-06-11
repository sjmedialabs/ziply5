"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { setCartItems, type CartItem } from "@/lib/cart"
import { Loader2, ShoppingBag, CheckCircle2, AlertCircle, ArrowRight, Lock } from "lucide-react"

export default function RecoverCartPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState("")
  const [recoveredItems, setRecoveredItems] = useState<CartItem[]>([])
  const [cartTotal, setCartTotal] = useState<number>(0)

  useEffect(() => {
    const token = params?.token
    if (!token) {
      setStatus("error")
      setErrorMessage("Invalid recovery link.")
      return
    }
    
    // Smooth artificial delay to prevent jarring flash if network is fast
    const timer = setTimeout(() => {
      fetch(`/api/abandoned-carts/recover/${encodeURIComponent(token)}`)
        .then(async (res) => {
          const payload = await res.json()
          if (!res.ok || !payload?.success || !payload?.data) throw new Error(payload?.message ?? "Recovery failed")
          const items = Array.isArray(payload.data.items) ? payload.data.items : []
          setCartItems(items)
          setRecoveredItems(items)
          setCartTotal(payload.data.total ?? items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0))
          setStatus("success")
        })
        .catch((e) => {
          setStatus("error")
          setErrorMessage(e instanceof Error ? e.message : "Unable to recover your cart. It may have expired.")
        })
    }, 800)

    return () => clearTimeout(timer)
  }, [params?.token])

  return (
    <section className="flex min-h-[80vh] items-center justify-center bg-[#FAFAFA] px-4 py-16">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#E8DCC8] bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-500 md:p-8">
        
        {status === "loading" && (
          <div className="flex flex-col items-center py-10 text-center animate-in fade-in zoom-in duration-500">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#FDF9F3] border border-[#E8DCC8]/50">
              <ShoppingBag className="h-10 w-10 text-[#c9a96e] animate-pulse" strokeWidth={1.5} />
            </div>
            <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Welcome Back!</h1>
            <p className="mt-3 text-[15px] text-[#646464]">Unpacking your saved cart...</p>
            <Loader2 className="mt-8 h-7 w-7 animate-spin text-[#c9a96e]" />
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header section with Restored badge */}
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-semibold text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Cart Restored Successfully
              </div>
              <h1 className="font-melon mt-4 text-2xl font-bold text-[#4A1D1F] md:text-3xl">Ready to Finish?</h1>
              <p className="mt-2 text-sm text-[#646464]">We saved the items you left behind. Let's get them to you!</p>
            </div>

            {/* Restored items list */}
            <div className="mt-8 space-y-4 max-h-[300px] overflow-y-auto pr-1 border-y border-gray-100 py-4">
              {recoveredItems.map((item) => (
                <div key={item.id} className="flex gap-4 items-center rounded-xl bg-[#FDF9F3]/40 p-3 border border-[#E8DCC8]/30">
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-[#E8DCC8]/40 bg-white flex-shrink-0">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-50 text-[#c9a96e]">
                        <ShoppingBag className="h-6 w-6" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-medium text-sm text-[#4A1D1F] truncate">{item.name}</h3>
                    <p className="text-xs text-[#646464] mt-0.5">
                      {item.variantLabel || item.weight ? `${item.variantLabel || item.weight} • ` : ""}Qty: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 font-semibold text-sm text-[#4A1D1F]">
                    ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                  </div>
                </div>
              ))}
            </div>

            {/* Total display */}
            <div className="mt-6 flex justify-between items-center px-2">
              <span className="text-sm font-medium text-[#646464]">Recovered Cart Total</span>
              <span className="text-xl font-bold text-[#4A1D1F]">₹{cartTotal.toLocaleString("en-IN")}</span>
            </div>

            {/* Primary & Secondary Action CTAs */}
            <div className="mt-8 flex flex-col gap-3">
              <button 
                onClick={() => router.replace("/checkout")}
                className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#4A1D1F] py-4 text-[15px] font-semibold text-white shadow-md transition-all hover:bg-[#3d181a] hover:scale-[1.01] active:scale-[0.99]"
              >
                Proceed to Checkout
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              
              <button 
                onClick={() => router.replace("/cart")}
                className="w-full rounded-full border border-[#E8DCC8] bg-white py-3.5 text-[14px] font-semibold text-[#4A1D1F] transition-all hover:bg-[#FDF9F3]/30"
              >
                Edit Cart & Continue Shopping
              </button>
            </div>

            {/* Secure payment message */}
            <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-[#646464]">
              <Lock className="h-3.5 w-3.5 text-[#c9a96e]" />
              Secure restoration. Your progress has been safely saved.
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center py-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#fef2f2] border border-[#fecaca]">
              <AlertCircle className="h-12 w-12 text-[#ef4444]" strokeWidth={1.5} />
            </div>
            <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Oops!</h1>
            <p className="mt-3 text-[15px] text-[#646464]">{errorMessage}</p>
            <button 
              onClick={() => router.replace("/cart")}
              className="mt-8 rounded-full bg-[#4A1D1F] px-8 py-3.5 text-[15px] font-semibold text-white shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Start New Cart
            </button>
          </div>
        )}

      </div>
    </section>
  )
}
