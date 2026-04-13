"use client"

import Image from "next/image"
import Link from "next/link"

interface CartItem {
  slug: string
  name: string
  quantity: number
  weight: string
  price: number
  image: string
}

interface CartDropdownProps {
  items: CartItem[]
  total: number
  open: boolean
  onIncrement: (slug: string) => void
  onDecrement: (slug: string) => void
}

export default function CartDropdown({ items, total, open, onIncrement, onDecrement }: CartDropdownProps) {
  return (
      <div
        className={`absolute right-0 top-full mt-2 w-[420px] rounded-[28px] border-2 border-[#e64a19] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.15)] transition-all duration-200 ease-out z-50 ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >

        <div className="px-6 py-6">

  {items.length === 0 ? (
    <div className="py-8 text-center text-sm text-gray-500">Your cart is empty.</div>
  ) : (
    <>
      {/* ITEMS */}
      <div className="space-y-6">
        {items.map((item) => (
          <div key={item.slug} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 rounded-lg">
                <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-contain p-2" />
              </div>

              <div className="flex-1">
                <p className="mb-1 font-melon text-xs font-medium text-black">{item.name}</p>
                <p className="text-xs text-gray-500">
                  Weight: <span className="font-melon text-xs font-medium text-black">{item.weight}</span>
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => onDecrement(item.slug)}
                    className="h-6 w-6 rounded border border-gray-300 text-sm font-bold text-[#7a1e0e] hover:bg-gray-100"
                  >
                    -
                  </button>
                  <span className="min-w-5 text-center text-xs font-semibold text-black">{item.quantity}</span>
                  <button
                    onClick={() => onIncrement(item.slug)}
                    className="h-6 w-6 rounded border border-gray-300 text-sm font-bold text-[#7a1e0e] hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <p className="font-melon text-lg font-medium text-orange-500">Rs.{(item.price * item.quantity).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="my-6 border-t border-gray-200" />

      <div className="mb-6 flex items-center justify-between font-melon text-2xl font-medium text-[#7a1e0e]">
        <span>Grand Total</span>
        <span>{total.toFixed(2)}</span>
      </div>

      <Link
        href="/checkout"
        className="block w-full rounded-full bg-[#7a1e0e] py-4 text-center font-melon text-lg font-medium text-yellow-300 shadow-md transition hover:opacity-90"
      >
        Proceed to checkout →
      </Link>
    </>
  )}

      </div>
      </div>
  )
}