"use client";

import BannerSection from "@/components/BannerSection";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useLocation } from "@/hooks/useLocation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { useState } from "react";

export default function CheckoutPage() {
      const {
    state,
    setState,
    city,
    setCity,
    states,
    cities,
  } = useLocation();
    const [method, setMethod] = useState("card");
  const items = [
    { name: "Dal Makhana Rice", price: 750 },
    { name: "Spl Veg Rice", price: 1500 },
    { name: "Sambar Rice", price: 1000 },
    { name: "Palak Prawn Rice", price: 500 },
  ];

  const total = items.reduce((acc, item) => acc + item.price, 0);

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
            <button className="flex items-center gap-2 bg-gray-200 text-[#656565] font-semibold px-5 py-2 rounded-full text-sm">
              <ArrowLeft size={16} />
              Back To Shopping Cart
            </button>
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
          <input className="input mt-1" placeholder="First name" />
        </div>

        {/* Last Name */}
        <div>
          <label className="text-[#646464] text-sm">Last Name</label>
          <input className="input mt-1" placeholder="Last name" />
        </div>

        {/* Email */}
        <div className="">
          <label className="text-[#646464] text-sm">Email Address</label>
          <input className="input mt-1" placeholder="Email address" />
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
            onBlur={(e) => {
              const value = e.target.value;

              if (!/^\d{6}$/.test(value)) {
                alert("Invalid Pincode (must be 6 digits)");
              }
            }}
          />
        </div>

      </div>
    </div>
            {/* Payment */}
 <div>
      <h2 className="font-melon text-lg font-medium mb-4">
        Payment Method:
      </h2>

      <RadioGroup
        value={method}
        onValueChange={setMethod}
        className="space-y-4"
      >

        {/* CREDIT CARD */}
        <div className="border rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RadioGroupItem value="card" id="card" />
            <label htmlFor="card" className="text-[#646464]">
              Credit Card
            </label>
          </div>

          <div className="flex gap-2">
            <img src="assets/cartpage/cardImages.png" className="h-4" />
          </div>
        </div>

        {/* CARD FIELDS */}
        {method === "card" && (
          <div className="space-y-4">

            {/* Card Number */}
            <div>
              <label className="text-[#646464] text-sm">
                Card Number
              </label>
              <input
                className="input mt-1"
                placeholder="1234 5678 9012 3456"
              />
            </div>

            {/* Expiry + CVV */}
            <div className="grid grid-cols-3 gap-4">

              {/* Month */}
              <div>
                <label className="text-[#646464] text-sm">
                  Month
                </label>
                <Select>
                  <SelectTrigger className="input mt-1">
                    <SelectValue placeholder="MM" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i} value={`${i + 1}`}>
                        {String(i + 1).padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Year */}
              <div>
                <label className="text-[#646464] text-sm">
                  Year
                </label>
                <Select>
                  <SelectTrigger className="input mt-1">
                    <SelectValue placeholder="YYYY" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() + i;
                      return (
                        <SelectItem key={year} value={`${year}`}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* CVV */}
              <div>
                <label className="text-[#646464] text-sm">
                  Security Code
                </label>
                <input
                  className="input mt-1"
                  placeholder="CVV"
                />
              </div>
            </div>

          </div>
        )}

        {/* CASH ON DELIVERY */}
        <div className="border rounded-xl p-4 flex items-center gap-3">
          <RadioGroupItem value="cod" id="cod" />
          <label htmlFor="cod" className="text-[#646464]">
            Cash on Delivery
          </label>
        </div>

      </RadioGroup>
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
            {/* Button */}
            <button className=" bg-[#7B3010] shadow-2xl tracking-wide font-medium text-white w-full py-4 rounded-full font-melon">
              Place Order Now →
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
              {items.map((item, i) => (
                <>
                <div key={i} className="flex justify-between text-sm pb-2">
                  <div>
                    <p className="font-medium font-melon text-[#C03621] tracking-wide">{item.name}</p>
                    <p className="text-xs text-[#646464]">
                      Creamy vanilla ice cream
                    </p>
                  </div>

                  <span className="text-[#C03621] font-medium font-melon tracking-wide">
                    Rs.{item.price}.00
                  </span>
                </div>
                <div className="w-full h-0.5 bg-black"></div>
                </>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-between text-[#C03621] font-medium font-melon tracking-wide">
              <span>Grand Total</span>
              <span>Rs.{total}.00</span>
            </div>

          </div>

        </div>
      </section>
    </div>
  );
}