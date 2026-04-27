"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { setCartItems } from "@/lib/cart"

export default function RecoverCartPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [message, setMessage] = useState("Recovering your cart...")

  useEffect(() => {
    const token = params?.token
    if (!token) return
    void fetch(`/api/abandoned-carts/recover/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const payload = await res.json()
        if (!res.ok || !payload?.success || !payload?.data) throw new Error(payload?.message ?? "Recovery failed")
        const items = Array.isArray(payload.data.items) ? payload.data.items : []
        setCartItems(items)
        setMessage("Cart restored. Redirecting to checkout...")
        setTimeout(() => router.replace("/checkout"), 600)
      })
      .catch((e) => setMessage(e instanceof Error ? e.message : "Unable to recover cart"))
  }, [params?.token, router])

  return (
    <section className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-xl border border-[#E8DCC8] bg-white p-6 text-center">
        <h1 className="font-melon text-xl font-bold text-[#4A1D1F]">Cart Recovery</h1>
        <p className="mt-2 text-sm text-[#646464]">{message}</p>
      </div>
    </section>
  )
}

