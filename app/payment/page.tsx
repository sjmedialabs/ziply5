"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

export default function PaymentPage() {
  const router = useRouter();

  const handlePay = () => {
    router.push("/payment-success");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F1E6] p-4">

      <div className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-sm border">

        {/* Order Summary Toggle */}
        <div className="flex justify-between items-center border rounded-xl px-4 py-3 mb-6">
          <div className="flex items-center gap-2 text-[#646464]">
            Show Order Summary <ChevronDown size={16} />
          </div>
          <span className="text-primary font-semibold">Rs. 3770.00</span>
        </div>

        {/* Title */}
        <h2 className="font-melon text-lg mb-6">Payment Details</h2>

        {/* Payment Methods */}
        <div className="mb-6">
          <p className="text-sm text-[#646464] mb-3">Payment method</p>

          <div className="flex gap-3">

            {/* Card */}
            <div className="border-2 border-primary rounded-xl p-3 flex-1 flex justify-between items-center">
              <div>
                <p className="font-medium">**** 8304</p>
                <p className="text-xs text-[#646464]">Visa • Edit</p>
              </div>
              <img src="/images/visa.png" className="h-5" />
            </div>

            {/* UPI */}
            <div className="border rounded-xl p-3 flex-1">
              <p className="text-sm">*******@ybl</p>
              <p className="text-xs text-[#646464]">Phonepe | Edit</p>
            </div>

            {/* New */}
            <div className="border rounded-xl p-3 flex items-center justify-center w-20">
              <span className="text-primary font-medium">+</span>
            </div>

          </div>
        </div>

        {/* Card Holder */}
        <div className="mb-4">
          <label className="text-sm text-[#646464]">
            Card holder name
          </label>
          <input className="input mt-1" placeholder="Ex. Jane Cooper" />
        </div>

        {/* Billing */}
        <div className="mb-4">
          <label className="text-sm text-[#646464]">
            Billing address
          </label>
          <select className="input mt-1">
            <option>United States</option>
          </select>
        </div>

        {/* Zip + City */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-[#646464]">Zip code</label>
            <input className="input mt-1" placeholder="Ex. 73923" />
          </div>

          <div>
            <label className="text-sm text-[#646464]">City</label>
            <input className="input mt-1" placeholder="Ex. New York" />
          </div>
        </div>

        {/* Checkbox */}
        <div className="flex items-center gap-2 mb-6 text-sm text-[#646464]">
          <input type="checkbox" defaultChecked />
          Billing address is same as shipping
        </div>

        {/* Pay Button */}
        <button
          onClick={handlePay}
          className="w-full bg-primary text-white py-4 rounded-full font-medium shadow-md font-melon tracking-wide"
        >
          Pay Rs.3770 →
        </button>

      </div>
    </div>
  );
}