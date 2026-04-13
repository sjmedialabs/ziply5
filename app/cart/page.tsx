"use client";

import BannerSection from "@/components/BannerSection";
import { ArrowLeft, Minus, Plus, X } from "lucide-react";
import Link from "next/link";

export default function CartPage() {
  const cartItems = [
    {
      id: 1,
      name: "Dal Makhana Rice",
      price: 250,
      quantity: 2,
      weight: "500g",
      img: "assets/cartpage/dalMakhaniRice.png",
    },
    {
      id: 2,
      name: "Spl Veg Rice",
      price: 250,
      quantity: 4,
      weight: "250g",
      img: "assets/cartpage/specialVegRice.png",
    },
    {
      id: 3,
      name: "Sambar Rice",
      price: 250,
      quantity: 4,
      weight: "250g",
      img: "assets/cartpage/sambharRice.png",
    },
    {
      id: 4,
      name: "Palki Prawn Rice",
      price: 250,
      quantity: 2,
      weight: "500g",
      img: "assets/cartpage/palakPrawanRice.png",
    },
  ];

  const subTotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const shipping = 20;
  const total = subTotal + shipping;

  return (
    <div>
      {/* Banner */}
      <BannerSection
        title="Shopping Cart"
        subtitle="Some of the queries you want to know about us."
        gradient="linear-gradient(to right, #EFD7EF 0%, #F5F9FC 30%, #F8EAE1 60%, #EAF8F9 100%)"
      />

      {/* Cart Section */}
      <section className="py-16 bg-[#F5F1E6]">
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-3 items-center gap-10">

<div className="lg:col-span-2 overflow-x-auto">

  {/* 🔙 Back Button */}
  <button className="flex items-center gap-2 bg-gray-200 px-5 py-2 rounded-full text-sm mb-6 hover:bg-gray-300 transition">
    <ArrowLeft size={16} />
    Back To Products Details
  </button>

  {/* 🧾 Title Row */}
  <div className="flex justify-between items-center border-b pb-3 mb-4 font-melon tracking-wide">
    <h2 className="font-medium text-black text-lg">
      Shopping Cart
    </h2>

    <span className="font-medium text-black">
      ({cartItems.length.toString().padStart(2, "0")} Items)
    </span>
  </div>

  {/* ✅ SCROLL WRAPPER */}
  <div className="overflow-x-auto">
    <div className="min-w-[700px]">

      {/* 📊 Table Header */}
      <div className="grid grid-cols-4 text-center text-sm text-[#787878] border-b pb-3 mb-6 font-melon tracking-wide">
        <span>Product Details</span>
        <span>Price</span>
        <span>Quantity</span>
        <span>Total</span>
      </div>

      {/* 📦 Items */}
      {cartItems.map((item) => (
        <div
          key={item.id}
          className="grid grid-cols-4 items-center text-center py-6 border-b"
        >
          {/* Product */}
          <div className="flex items-center text-start gap-4">
            <div className="w-20 h-20 border border-[#E0E0E0] rounded-xl flex items-center justify-center shadow-sm">
              <img
                src={item.img}
                className="w-16 h-16 rounded-lg object-contain"
              />
            </div>

            <div>
              <p className="font-medium text-black font-melon tracking-wide">
                {item.name}
              </p>
              <p className="text-xs text-[#787878]">
                Weight: <span className="text-black font-medium">{item.weight}</span>
              </p>
              <p className="text-xs text-[#787878]">
                Qty: <span className="text-black font-medium">{item.quantity}</span>
              </p>
            </div>
          </div>

          {/* Price */}
          <div>
            <p className="text-primary font-melon tracking-wide font-medium">
              Rs.{item.price}
            </p>
          </div>

          {/* Quantity */}
          <div className="flex items-center border rounded-full w-fit overflow-hidden">
            <button className="px-3 py-1 border-r">
              <Minus size={14} />
            </button>

            <span className="px-4">{item.quantity}</span>

            <button className="px-3 py-1 border-l">
              <Plus size={14} />
            </button>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between">
            <span className="text-black font-melon tracking-wide font-medium">
              Rs.{item.price * item.quantity}.00
            </span>

            <button className="w-8 h-8 border border-red-400 text-red-500 rounded-full flex items-center justify-center">
              <X size={14} />
            </button>
          </div>
        </div>
      ))}

    </div>
  </div>

  {/* Continue Shopping */}
  <button className="mt-8 flex items-center gap-2 text-primary text-sm font-bold border border-gray-200 px-5 py-1 rounded-full">
    <ArrowLeft size={16} />
    Continue Shopping
  </button>

</div>

          {/* RIGHT: Summary Card */}
          <div className="bg-[#FFC222] rounded-3xl p-6 shadow-md h-fit">
            <h3 className="font-melon text-xl text-center mb-6">
              Order Summary
            </h3>

            {/* Coupon */}
            <div className="flex justify-between items-center py-6 border-y border-white font-melon tracking-wide">
              <p className="text-sm">Apply Coupons</p>
              <button className="bg-black text-xs px-3 py-1 rounded-full text-[#FFC222]">
                Apply
              </button>
            </div>

            {/* Details */}
            <p className="pt-6 text-sm pb-2 font-melon tracking-wide">Product Deails:</p>
            <div className="space-y-3 text-lg font-melon tracking-wide text-[#C03621]">
              <div className="flex justify-between">
                <span>Sub Total</span>
                <span>INR {subTotal}</span>
              </div>

              <div className="flex justify-between">
                <span>Shipping</span>
                <span>INR {shipping}</span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t my-4" />

            {/* Total */}
            <div className="flex justify-between font-medium text-lg font-melon tracking-wide text-[#C03621]">
              <span>Grand Total</span>
              <span>{total}</span>
            </div>

            {/* Button */}
            <Link href="/checkout">
              <button className="mt-6 w-full bg-[#7B3010] text-[#FFC222] py-3 rounded-full font-medium font-melon tracking-wide">
                Proceed to checkout →
              </button>
            </Link>

            {/* Note */}
            <p className="text-xs text-gray-700 mt-4">
              Safe and Secure Payments. Easy Returns. 100% Authentic Products.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
}