"use client"

import Image from "next/image"

interface CartItem {
  id: number
  name: string
  qty: number
  weight: string
  price: number
  image: string
}

interface CartDropdownProps {
  items: CartItem[]
  total: number
}

export default function CartDropdown({ items, total }: CartDropdownProps) {
  return (
    <div className="absolute right-0 top-full mt-4 
      w-[420px] bg-white 
      rounded-[28px] 
      border-2 border-[#e64a19] 
      shadow-[0_10px_30px_rgba(0,0,0,0.15)] 
      opacity-0 invisible 
      group-hover:opacity-100 group-hover:visible 
      transition-all duration-500 ease-in-out 
      z-50 pointer-events-none group-hover:pointer-events-auto">

      <div className="px-6 py-6">

  {/* ITEMS */}
  <div className="space-y-6">
    {items.map((item) => (
      <div key={item.id} className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-12">
        <div className="w-16 h-16 relative  rounded-lg flex-shrink-0">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-contain p-2"
          />
        </div>

        <div className="flex-1">
          <p className="font-medium text-xs font-melon mb-2 text-black">
            {item.name}
          </p>

          <p className="text-xs text-gray-500">
            Weight: <span className="font-medium text-xs font-melon text-black">{item.weight}</span>
          </p>

          <p className="text-xs text-gray-500">
            Qty: <span className="font-medium text-xs font-melon text-black">{item.qty}</span>
          </p>
        </div>
        </div>

        <p className="font-medium font-melon text-lg text-orange-500">
          Rs.{item.price}
        </p>

      </div>
    ))}
  </div>

  {/* DIVIDER */}
  <div className="my-6 border-t border-gray-200"></div>

  {/* TOTAL */}
  <div className="flex justify-between font-melon items-center text-2xl font-medium text-[#7a1e0e] mb-6">
    <span>Grand Total</span>
    <span>{total.toFixed(2)}</span>
  </div>

  {/* BUTTON */}
  <button className="w-full bg-[#7a1e0e] font-melon text-yellow-300 py-4 rounded-full text-lg font-medium shadow-md hover:opacity-90 transition">
    Proceed to checkout →
  </button>

</div>
    </div>
  )
}