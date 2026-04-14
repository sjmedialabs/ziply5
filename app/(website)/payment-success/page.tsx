"use client";

import { Check } from "lucide-react";

export default function PaymentSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F1E6] p-4">

      <div className="bg-[#FFC222] rounded-3xl p-8 w-full max-w-md text-center shadow-md">

        {/* Icon */}
        <div className="w-16 h-16 bg-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="text-white" />
        </div>

        {/* Title */}
        <p className="text-[#646464]">Payment Success!</p>

        <h2 className="text-2xl font-bold mt-2">
          INR 3770.00
        </h2>

        <div className="border-t my-6" />

        {/* Details */}
        <div className="text-sm space-y-3 text-left">

          <div className="flex justify-between">
            <span>Ref Number</span>
            <span>000085752257</span>
          </div>

          <div className="flex justify-between">
            <span>Payment Time</span>
            <span>25-02-2023, 13:22:16</span>
          </div>

          <div className="flex justify-between">
            <span>Payment Method</span>
            <span>Phonepe</span>
          </div>

          <div className="flex justify-between">
            <span>Sender Name</span>
            <span>Keshav krishna</span>
          </div>

        </div>

        <div className="border-t border-dashed my-6" />

        {/* Bottom */}
        <div className="text-sm space-y-2 text-left">
          <div className="flex justify-between">
            <span>Amount</span>
            <span>INR 3770.00</span>
          </div>

          <div className="flex justify-between">
            <span>Discount</span>
            <span>Rs.17.00</span>
          </div>
        </div>

      </div>
    </div>
  );
}