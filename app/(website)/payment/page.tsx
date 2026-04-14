"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCartItems, setCartItems } from "@/lib/cart";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function PaymentPage() {
  const router = useRouter();
  const [scriptReady, setScriptReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [billingAddress, setBillingAddress] = useState({
    fullName: "",
    line1: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    phone: "",
  });
  const [hasCheckoutBilling, setHasCheckoutBilling] = useState(false);

  const items = useMemo(() => getCartItems(), []);
  const subTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = items.length > 0 ? 20 : 0;
  const total = subTotal + shipping;

  useEffect(() => {
    const token = window.localStorage.getItem("ziply5_access_token");
    if (!token) {
      setLoggedIn(false);
      return;
    }
    fetch("/api/v1/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json: { success?: boolean }) => {
        setLoggedIn(Boolean(json.success));
      })
      .catch(() => setLoggedIn(false));

    const savedBilling = window.localStorage.getItem("ziply5_checkout_billing_address");
    if (savedBilling) {
      try {
        const parsed = JSON.parse(savedBilling) as Partial<typeof billingAddress>;
        const merged = {
          fullName: (parsed.fullName ?? "").toString(),
          line1: (parsed.line1 ?? "").toString(),
          city: (parsed.city ?? "").toString(),
          state: (parsed.state ?? "").toString(),
          postalCode: (parsed.postalCode ?? "").toString(),
          country: (parsed.country ?? "India").toString(),
          phone: (parsed.phone ?? "").toString(),
        };
        setBillingAddress(merged);
        setHasCheckoutBilling(
          Boolean(merged.fullName.trim() && merged.city.trim() && merged.state.trim() && merged.postalCode.trim()),
        );
      } catch {
        setHasCheckoutBilling(false);
      }
    }
  }, []);

  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-razorpay='true']");
    if (existing) {
      setScriptReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpay = "true";
    script.onload = () => setScriptReady(true);
    script.onerror = () => setError("Failed to load Razorpay checkout.");
    document.body.appendChild(script);
  }, []);

  const askLogin = () => {
    router.push(`/login?next=${encodeURIComponent("/payment")}`);
  };

  const payNow = async () => {
    if (!loggedIn) {
      setError("Please login to complete purchase.");
      askLogin();
      return;
    }
    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }
    if (!billingAddress.fullName.trim() || !billingAddress.city.trim() || !billingAddress.state.trim() || !billingAddress.postalCode.trim()) {
      setError("Please fill required billing address fields.");
      return;
    }
    if (!scriptReady || !window.Razorpay) {
      setError("Razorpay checkout is not ready yet.");
      return;
    }

    setPaying(true);
    setError("");
    try {
      const token = window.localStorage.getItem("ziply5_access_token");
      if (!token) throw new Error("Please login to continue.");

      const orderRes = await fetch("/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map((i) => ({ slug: i.slug, quantity: i.quantity })),
          shipping,
          gateway: "razorpay",
        }),
      });
      const orderJson = (await orderRes.json()) as { success?: boolean; message?: string; data?: { id: string; total: string | number; currency?: string } };
      if (!orderRes.ok || orderJson.success === false || !orderJson.data?.id) {
        throw new Error(orderJson.message ?? "Unable to create order.");
      }

      const intentRes = await fetch("/api/v1/payments/intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: orderJson.data.id,
          provider: "razorpay",
        }),
      });
      const intentJson = (await intentRes.json()) as {
        success?: boolean
        message?: string
        data?: {
          externalId: string
          amount: number
          currency: string
          publicKey?: string
          orderId: string
        }
      };
      if (!intentRes.ok || intentJson.success === false || !intentJson.data?.externalId || !intentJson.data?.publicKey) {
        throw new Error(intentJson.message ?? "Unable to initialize payment.");
      }

      const razorpay = new window.Razorpay({
        key: intentJson.data.publicKey,
        amount: Math.round(intentJson.data.amount * 100),
        currency: intentJson.data.currency || "INR",
        name: "ZiPLY5",
        description: `Order ${intentJson.data.orderId.slice(0, 8)}`,
        order_id: intentJson.data.externalId,
        prefill: {
          name: billingAddress.fullName,
          contact: billingAddress.phone,
        },
        notes: {
          billing_line1: billingAddress.line1,
          billing_city: billingAddress.city,
          billing_state: billingAddress.state,
          billing_postal_code: billingAddress.postalCode,
          billing_country: billingAddress.country,
          orderId: intentJson.data.orderId,
        },
        theme: { color: "#7B3010" },
        handler: () => {
          setCartItems([]);
          router.push(`/payment-success?orderId=${encodeURIComponent(intentJson.data!.orderId)}`);
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
          },
        },
      });
      razorpay.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed.");
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F1E6] p-4">
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-sm border">
        <h2 className="font-melon text-lg mb-6">Billing Address</h2>

        {!loggedIn && (
          <div className="mb-4 rounded-lg border border-[#E8DCC8] bg-[#FFFBF3] p-3 text-sm text-[#4A1D1F]">
            Login is required to complete purchase.
            <button
              type="button"
              onClick={askLogin}
              className="ml-2 rounded-full bg-[#7B3010] px-3 py-1 text-xs font-semibold uppercase text-white"
            >
              Login
            </button>
          </div>
        )}

        {hasCheckoutBilling ? (
          <div className="mb-6 rounded-xl border px-4 py-3 text-sm text-[#646464]">
            <p className="font-semibold text-[#7B3010]">{billingAddress.fullName}</p>
            {billingAddress.line1 ? <p>{billingAddress.line1}</p> : null}
            <p>
              {billingAddress.city}, {billingAddress.state} {billingAddress.postalCode}
            </p>
            <p>{billingAddress.country}</p>
            {billingAddress.phone ? <p>Phone: {billingAddress.phone}</p> : null}
            <button
              type="button"
              onClick={() => router.push("/checkout")}
              className="mt-2 text-xs font-semibold text-[#7B3010] underline"
            >
              Change billing address in checkout
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 mb-6">
            <input
              className="input"
              placeholder="Full name"
              value={billingAddress.fullName}
              onChange={(e) => setBillingAddress((prev) => ({ ...prev, fullName: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Address line"
              value={billingAddress.line1}
              onChange={(e) => setBillingAddress((prev) => ({ ...prev, line1: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                className="input"
                placeholder="City"
                value={billingAddress.city}
                onChange={(e) => setBillingAddress((prev) => ({ ...prev, city: e.target.value }))}
              />
              <input
                className="input"
                placeholder="State"
                value={billingAddress.state}
                onChange={(e) => setBillingAddress((prev) => ({ ...prev, state: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                className="input"
                placeholder="Postal code"
                value={billingAddress.postalCode}
                onChange={(e) => setBillingAddress((prev) => ({ ...prev, postalCode: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Phone (optional)"
                value={billingAddress.phone}
                onChange={(e) => setBillingAddress((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
          </div>
        )}

        <div className="mb-5 rounded-xl border px-4 py-3 text-sm text-[#646464]">
          Payable amount: <span className="font-semibold text-[#7B3010]">Rs. {total.toFixed(2)}</span>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={() => void payNow()}
          disabled={paying || !scriptReady}
          className="w-full bg-primary text-white py-4 rounded-full font-medium shadow-md font-melon tracking-wide disabled:opacity-60"
        >
          {paying ? "Processing..." : "Pay Now"}
        </button>
      </div>
    </div>
  );
}