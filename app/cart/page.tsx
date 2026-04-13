"use client";

import BannerSection from "@/components/BannerSection";
import { getCartItems, setCartItems, type CartItem } from "@/lib/cart";
import { ArrowLeft, Minus, Plus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const formatMoney = (amount: number) => amount.toFixed(2);

export default function CartPage() {
  const [cartItems, setLocalCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setLocalCartItems(getCartItems());
  }, []);

  const persistCart = (next: CartItem[]) => {
    setLocalCartItems(next);
    setCartItems(next);
  };

  const updateQuantity = (slug: string, delta: number) => {
    const next = cartItems.map((item) =>
      item.slug === slug
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    );
    persistCart(next);
  };

  const removeItem = (slug: string) => {
    const next = cartItems.filter((item) => item.slug !== slug);
    persistCart(next);
  };

  const subTotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const shipping = cartItems.length === 0 ? 0 : 20;
  const total = subTotal + shipping;

  return (
    <div>
      <BannerSection
        title="Shopping Cart"
        subtitle="Some of the queries you want to know about us."
        gradient="linear-gradient(to right, #EFD7EF 0%, #F5F9FC 30%, #F8EAE1 60%, #EAF8F9 100%)"
      />

      <section className="bg-[#F5F1E6] py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-3">
          <div className="overflow-x-auto lg:col-span-2">
            <Link
              href="/products"
              className="mb-6 inline-flex items-center gap-2 rounded-full bg-gray-200 px-5 py-2 text-sm transition hover:bg-gray-300"
            >
              <ArrowLeft size={16} />
              Back To Products
            </Link>

            <div className="mb-4 flex items-center justify-between border-b pb-3 font-melon tracking-wide">
              <h2 className="text-lg font-medium text-black">Shopping Cart</h2>
              <span className="font-medium text-black">
                ({cartItems.length.toString().padStart(2, "0")} Items)
              </span>
            </div>

            {cartItems.length === 0 ? (
              <div className="rounded-2xl border border-[#E0E0E0] bg-white p-10 text-center">
                <p className="text-[#646464]">Your cart is empty.</p>
                <Link
                  href="/products"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white"
                >
                  Continue Shopping
                </Link>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <div className="min-w-[700px]">
                    <div className="mb-6 grid grid-cols-4 border-b pb-3 text-center text-sm text-[#787878]">
                      <span>Product Details</span>
                      <span>Price</span>
                      <span>Quantity</span>
                      <span>Total</span>
                    </div>

                    {cartItems.map((item) => (
                      <div
                        key={item.slug}
                        className="grid grid-cols-4 items-center border-b py-6 text-center"
                      >
                        <div className="flex items-center gap-4 text-start">
                          <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-[#E0E0E0] shadow-sm">
                            <img
                              src={item.image || "/placeholder.svg"}
                              alt={item.name}
                              className="h-16 w-16 rounded-lg object-contain"
                            />
                          </div>
                          <div>
                            <p className="font-melon font-medium tracking-wide text-black">
                              {item.name}
                            </p>
                            <p className="text-xs text-[#787878]">
                              Weight:{" "}
                              <span className="font-medium text-black">
                                {item.weight}
                              </span>
                            </p>
                          </div>
                        </div>

                        <p className="font-melon font-medium tracking-wide text-primary">
                          Rs.{formatMoney(item.price)}
                        </p>

                        <div className="flex w-fit items-center overflow-hidden rounded-full border">
                          <button
                            className="border-r px-3 py-1"
                            onClick={() => updateQuantity(item.slug, -1)}
                            aria-label={`Decrease quantity for ${item.name}`}
                          >
                            <Minus size={14} />
                          </button>
                          <span className="px-4">{item.quantity}</span>
                          <button
                            className="border-l px-3 py-1"
                            onClick={() => updateQuantity(item.slug, 1)}
                            aria-label={`Increase quantity for ${item.name}`}
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-melon font-medium tracking-wide text-black">
                            Rs.{formatMoney(item.price * item.quantity)}
                          </span>
                          <button
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-red-400 text-red-500"
                            onClick={() => removeItem(item.slug)}
                            aria-label={`Remove ${item.name} from cart`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  href="/products"
                  className="mt-8 inline-flex items-center gap-2 rounded-full border border-gray-200 px-5 py-1 text-sm font-bold text-primary"
                >
                  <ArrowLeft size={16} />
                  Continue Shopping
                </Link>
              </>
            )}
          </div>

          <div className="h-fit rounded-3xl bg-[#FFC222] p-6 shadow-md">
            <h3 className="mb-6 text-center font-melon text-xl">
              Order Summary
            </h3>

            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm">Apply Coupons</p>
              <button className="rounded-full bg-black px-3 py-1 text-xs text-white">
                Apply
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Sub Total</span>
                <span>INR {formatMoney(subTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>INR {formatMoney(shipping)}</span>
              </div>
            </div>

            <div className="my-4 border-t" />

            <div className="flex justify-between font-semibold">
              <span>Grand Total</span>
              <span>INR {formatMoney(total)}</span>
            </div>

            <Link href="/checkout">
              <button
                className="mt-6 w-full rounded-xl bg-primary py-3 font-melon font-medium tracking-wide text-white"
                disabled={cartItems.length === 0}
              >
                Proceed to checkout →
              </button>
            </Link>

            <p className="mt-4 text-xs text-gray-700">
              Safe and Secure Payments. Easy Returns. 100% Authentic Products.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}