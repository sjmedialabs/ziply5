"use client";

import BannerSection from "@/components/BannerSection";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useLocation } from "@/hooks/useLocation";
import { getCartItems, type CartItem } from "@/lib/cart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const {
    state,
    setState,
    city,
    setCity,
    states,
    cities,
  } = useLocation();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [billing, setBilling] = useState({
    firstName: "",
    lastName: "",
    email: "",
    line1: "",
    postalCode: "",
    phone: "",
  });

  useEffect(() => {
    const syncCart = () => setItems(getCartItems());
    syncCart();
    window.addEventListener("ziply5:cart-updated", syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener("ziply5:cart-updated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  const subTotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = items.length === 0 ? 0 : 20;
  const total = subTotal + shipping;

  const goToPayment = async () => {
    if (items.length === 0) {
      window.alert("Your cart is empty.");
      return;
    }
    setPlacing(true);
    setOrderError("");
    try {
      const fullName = `${billing.firstName} ${billing.lastName}`.trim();
      const payload = {
        fullName,
        email: billing.email.trim(),
        line1: billing.line1.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: billing.postalCode.trim(),
        country: "India",
        phone: billing.phone.trim(),
      };
      if (!payload.fullName || !payload.city || !payload.state || !payload.postalCode) {
        setOrderError("Please complete billing address before payment.");
        return;
      }
      window.localStorage.setItem("ziply5_checkout_billing_address", JSON.stringify(payload));

      const token =
        typeof window !== "undefined" ? window.localStorage.getItem("ziply5_access_token") : null;
      if (!token) {
        router.push(`/login?next=${encodeURIComponent("/payment")}`);
        return;
      }
      router.push("/payment");
    } catch {
      setOrderError("Unable to continue to payment. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div>
      {/* Banner */}
      <BannerSection
        title="Check out"
        subtitle="Some of the queries you want to know about us."
        gradient="linear-gradient(to right, #EFD7EF 0%, #F5F9FC 30%, #F8EAE1 60%, #EAF8F9 100%)"
      />

      {/* Main Section */}
      <section className="py-16 bg-[#F5F1E6]">
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-3 gap-10">

          {/* LEFT FORM */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Back Button */}
            <div>
              <Link href="/cart">
                <button className="flex items-center gap-2 bg-gray-200 text-[#656565] font-semibold px-5 py-2 rounded-full text-sm">
                  <ArrowLeft size={16} />
                  Back To Shopping Cart
                </button>
              </Link>
            </div>
            {/* Billing */}
  <div>
      <h2 className="font-melon text-lg font-medium mb-4">
        Billing Address:
      </h2>

      <div className="grid md:grid-cols-2 gap-4">

        {/* First Name */}
        <div>
          <label className="text-[#646464] text-sm">First Name</label>
          <input
            className="input mt-1"
            placeholder="First name"
            value={billing.firstName}
            onChange={(e) => setBilling((prev) => ({ ...prev, firstName: e.target.value }))}
          />
        </div>

        {/* Last Name */}
        <div>
          <label className="text-[#646464] text-sm">Last Name</label>
          <input
            className="input mt-1"
            placeholder="Last name"
            value={billing.lastName}
            onChange={(e) => setBilling((prev) => ({ ...prev, lastName: e.target.value }))}
          />
        </div>

        {/* Email */}
        <div className="">
          <label className="text-[#646464] text-sm">Email Address</label>
          <input
            className="input mt-1"
            placeholder="Email address"
            value={billing.email}
            onChange={(e) => setBilling((prev) => ({ ...prev, email: e.target.value }))}
          />
        </div>

        {/* Address Line */}
        <div className="">
          <label className="text-[#646464] text-sm">Address Line</label>
          <input
            className="input mt-1"
            placeholder="House no, street, area"
            value={billing.line1}
            onChange={(e) => setBilling((prev) => ({ ...prev, line1: e.target.value }))}
          />
        </div>

        {/* State */}
        <div>
          <label className="text-[#646464] text-sm">State</label>
          <Select onValueChange={(val) => {
            setState(val);
            setCity(""); // reset city
          }}>
            <SelectTrigger className="input mt-1">
              <SelectValue placeholder="Select State" />
            </SelectTrigger>
            <SelectContent>
              {states.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* City */}
        <div>
          <label className="text-[#646464] text-sm">City</label>
          <Select
            value={city}
            onValueChange={setCity}
            disabled={!state}
          >
            <SelectTrigger className="input mt-1">
              <SelectValue placeholder="Select City" />
            </SelectTrigger>
            <SelectContent>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Zip Code */}
        <div className="">
          <label className="text-[#646464] text-sm">
            Zip / Postal Code
          </label>
          <input
            className="input mt-1"
            placeholder="Enter pincode"
            value={billing.postalCode}
            onChange={(e) => setBilling((prev) => ({ ...prev, postalCode: e.target.value }))}
            onBlur={(e) => {
              const value = e.target.value;

              if (!/^\d{6}$/.test(value)) {
                alert("Invalid Pincode (must be 6 digits)");
              }
            }}
          />
        </div>

        {/* Phone */}
        <div className="">
          <label className="text-[#646464] text-sm">Phone (optional)</label>
          <input
            className="input mt-1"
            placeholder="Phone number"
            value={billing.phone}
            onChange={(e) => setBilling((prev) => ({ ...prev, phone: e.target.value }))}
          />
        </div>

      </div>
    </div>
    <div className="mt-4 flex flex-col gap-4">
            {/* Terms */}
            <div className="text-center">
            <p className="text-xs text-[#646464]">
              By clicking the button, you agree to the{" "}
              <Link href="/terms" className="text-primary underline">
                Terms and Conditions
              </Link>
            </p>
            </div>
            {orderError && (
              <p className="text-center text-sm text-red-600">{orderError}</p>
            )}
            {/* Button */}
            <button
              type="button"
              onClick={() => void goToPayment()}
              disabled={placing}
              className="bg-[#7B3010] shadow-2xl tracking-wide font-medium text-white w-full py-4 rounded-full font-melon disabled:opacity-60"
            >
              {placing ? "Please wait…" : "Pay Now →"}
            </button>
            </div>
          </div>

          {/* RIGHT SUMMARY */}
          <div className="bg-[#FFC222] rounded-3xl p-4 md:p-8 h-fit">

            <div className="flex justify-between font-melon ">
              <span>Items</span>
              <span>Price</span>
            </div>
            <div className="w-full h-0.5 bg-black mt-4"></div>
            <div className="space-y-4 py-8">
              {items.map((item) => (
                <div key={item.slug}>
                <div className="flex justify-between text-sm pb-2">
                  <div>
                    <p className="font-medium font-melon text-[#C03621] tracking-wide">{item.name}</p>
                    <p className="text-xs text-[#646464]">
                      Qty: {item.quantity} | Net wt. {item.weight}
                    </p>
                  </div>

                  <span className="text-[#C03621] font-medium font-melon tracking-wide">
                    Rs.{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
                <div className="w-full h-0.5 bg-black"></div>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-sm text-[#646464] text-center py-4">No items in cart.</p>
              )}
            </div>

            {/* Total */}
            <div className="flex justify-between text-[#C03621] font-medium font-melon tracking-wide">
              <span>Sub Total</span>
              <span>Rs.{subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#C03621] font-medium font-melon tracking-wide mt-2">
              <span>Shipping</span>
              <span>Rs.{shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#C03621] font-medium font-melon tracking-wide mt-2">
              <span>Grand Total</span>
              <span>Rs.{total.toFixed(2)}</span>
            </div>

          </div>

        </div>
      </section>
    </div>
  );
}