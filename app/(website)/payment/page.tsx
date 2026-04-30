"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { getCartItems, setCartItems } from "@/lib/cart";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function PaymentPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scriptReady, setScriptReady] = useState(false);
  const [processingGateway, setProcessingGateway] = useState<"COD" | "ONLINE" | null>(null);
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [retryAmount, setRetryAmount] = useState<number | null>(null);
  const [retryMode, setRetryMode] = useState(false);
  const [couponAdjustedTotal, setCouponAdjustedTotal] = useState<number | null>(null);
  const autoRetryTriggeredRef = useRef(false);
  const [items, setItemsState] = useState<ReturnType<typeof getCartItems>>([]);
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

  useEffect(() => {
    // Avoid hydration mismatch: cart is client-only (localStorage)
    setItemsState(getCartItems());
  }, []);

  const subTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = items.length > 0 ? 20 : 0;
  const calculatedTotal = subTotal + shipping; // Renamed to avoid confusion with couponAdjustedTotal
  const payableAmount = useMemo(() => {
    if (retryMode) {
      return retryAmount ?? calculatedTotal;
    }
    // If not in retry mode, use the coupon-adjusted total from localStorage if available, otherwise use the calculated total.
    return couponAdjustedTotal ?? calculatedTotal;
  }, [retryMode, retryAmount, couponAdjustedTotal, calculatedTotal]);

  const postCartEvent = async (eventType: string, meta?: Record<string, unknown>) => {
    try {
      const sessionKey = window.localStorage.getItem("ziply5_session_key") || "";
      if (!sessionKey) return;
      await fetch("/api/cart/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKey,
          items,
          total: payableAmount,
          eventType,
          meta,
        }),
      });
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    if (!items.length) return;
    void postCartEvent("payment_page_opened", { lastVisitedPage: "/payment" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const createOrderMutation = useMutation({
    mutationFn: async ({ token, gateway }: { token: string; gateway: "cod" | "razorpay" }) => {
      const checkoutRef =
        window.localStorage.getItem("ziply5_checkout_ref") ??
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
      window.localStorage.setItem("ziply5_checkout_ref", checkoutRef);

      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map((i) => ({
            slug: i.slug, // REQUIRED
            quantity: Number(i.quantity ?? 1),
          })),
          shipping,
          gateway,

          billingAddress: {
            fullName: billingAddress.fullName,
            line1: billingAddress.line1,
            city: billingAddress.city,
            state: billingAddress.state,
            postalCode: billingAddress.postalCode,
            country: billingAddress.country,
            phone: billingAddress.phone || "",
          },

          paymentStatus: gateway === "cod" ? "pending" : "pending",
          paymentId:
            gateway === "cod"
              ? undefined
              : `checkout_ref:${checkoutRef}`,
        })
      });
      const json = (await res.json()) as { success?: boolean; message?: string; data?: { id: string } };
      if (!res.ok || json.success === false || !json.data?.id) {
        throw new Error(json.message ?? "Unable to create order.");
      }
      return json.data.id;
    },
  });

  const initiatePaymentMutation = useMutation({
    mutationFn: async ({ token, orderId }: { token: string; orderId: string }) => {
      const intentRes = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId, provider: "razorpay" }),
      });
      const intentJson = (await intentRes.json()) as {
        success?: boolean;
        message?: string;
        data?: {
          externalId: string;
          amount: number;
          currency: string;
          publicKey?: string;
          key?: string;
          keyId?: string;
          orderId: string;
        };
      };
      const publicKey =
        intentJson.data?.publicKey ??
        intentJson.data?.key ??
        intentJson.data?.keyId ??
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!intentRes.ok || intentJson.success === false || !intentJson.data?.externalId || !publicKey) {
        throw new Error(intentJson.message ?? "Unable to initialize payment.");
      }
      return {
        ...intentJson.data,
        publicKey,
      };
    },
  });
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
    const pendingOrderId = window.localStorage.getItem("ziply5_pending_order_id");
    if (pendingOrderId) setCreatedOrderId(pendingOrderId);
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

    const savedFinalTotal = window.localStorage.getItem("ziply5_final_total");
    if (savedFinalTotal) {
      const parsedTotal = Number(savedFinalTotal);
      if (Number.isFinite(parsedTotal)) {
        setCouponAdjustedTotal(parsedTotal);
      }
    }
  }, []);
const handleCOD = async () => {
  try {
    if (!loggedIn) {
      askLogin();
      return;
    }

    if (!billingAddress.fullName.trim()) {
      setError("Fill billing details.");
      return;
    }

    setProcessingGateway("COD");
    setError("");
    setStatusText("Placing order...");

    const token = window.localStorage.getItem("ziply5_access_token");
    if (!token) throw new Error("Login required");

    const orderId = await createOrderMutation.mutateAsync({ token, gateway: "cod" });

    // ✅ cleanup
    setCartItems([]);
    window.localStorage.removeItem("ziply5_checkout_ref");
    window.localStorage.removeItem("ziply5_final_total");

    setProcessingGateway(null);

    router.push(`/order-success?orderId=${orderId}`);
  } catch (e) {
    setError(e instanceof Error ? e.message : "COD failed");
    setProcessingGateway(null);
  }
};
const handleOnlinePayment = async () => {
  try {
    if (!loggedIn) {
      askLogin();
      return;
    }

    if (!billingAddress.fullName.trim()) {
      setError("Fill billing details.");
      return;
    }

    if (!scriptReady || !window.Razorpay) {
      throw new Error("Payment gateway not ready");
    }

    setProcessingGateway("ONLINE");
    setError("");
    setStatusText("Creating order...");

    const token = window.localStorage.getItem("ziply5_access_token");
    if (!token) throw new Error("Login required");

    const orderId =
      createdOrderId ??
      (await createOrderMutation.mutateAsync({ token, gateway: "razorpay" }));

    setCreatedOrderId(orderId);
    window.localStorage.setItem("ziply5_pending_order_id", orderId);

    setStatusText("Redirecting to payment...");

    await openRazorpay(token, orderId);
  } catch (e) {
    setError(e instanceof Error ? e.message : "Payment failed");
    setProcessingGateway(null);
  }
};
  useEffect(() => {
    const retryOrderId = searchParams.get("orderId");
    if (!retryOrderId) return;
    setRetryMode(true);
    setCreatedOrderId(retryOrderId);
    window.localStorage.setItem("ziply5_pending_order_id", retryOrderId);
    const queryAmount = Number(searchParams.get("amount") ?? "");
    if (Number.isFinite(queryAmount) && queryAmount > 0) setRetryAmount(queryAmount);

    const queryName = searchParams.get("name") ?? "";
    const queryPhone = searchParams.get("phone") ?? "";
    const queryAddress = searchParams.get("address") ?? "";
    if (queryName || queryPhone || queryAddress) {
      setBillingAddress((prev) => ({
        ...prev,
        fullName: queryName || prev.fullName,
        phone: queryPhone || prev.phone,
        line1: queryAddress || prev.line1,
      }));
    }

    const token = window.localStorage.getItem("ziply5_access_token");
    if (!token) return;
    void (async () => {
      try {
        const res = await fetch(`/api/v1/orders/${encodeURIComponent(retryOrderId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = (await res.json()) as {
          success?: boolean;
          data?: {
            id?: string;
            total?: number | string;
            customerName?: string | null;
            customerPhone?: string | null;
            customerAddress?: string | null;
          };
        };
        if (!res.ok || !json.success || !json.data) return;
        if (json.data.id) {
          setCreatedOrderId(String(json.data.id));
          window.localStorage.setItem("ziply5_pending_order_id", String(json.data.id));
        }
        const fetchedAmount = Number(json.data.total ?? "");
        if (Number.isFinite(fetchedAmount) && fetchedAmount > 0) setRetryAmount(fetchedAmount);
        setBillingAddress((prev) => ({
          ...prev,
          fullName: (json.data?.customerName ?? prev.fullName ?? "").toString(),
          phone: (json.data?.customerPhone ?? prev.phone ?? "").toString(),
          line1: (json.data?.customerAddress ?? prev.line1 ?? "").toString(),
        }));
      } catch {
        // keep retry flow functional using query params/local state fallback
      }
    })();
  }, [searchParams]);

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

  const openRazorpay = async (token: string, orderId: string) => {
    const intent = await initiatePaymentMutation.mutateAsync({ token, orderId });
    const Razorpay = window.Razorpay;
    if (!Razorpay) throw new Error("Razorpay checkout is not ready yet.");
    const razorpay = new Razorpay({
      key: intent.publicKey,
      amount: Math.round(intent.amount * 100),
      currency: intent.currency || "INR",
      name: "ZiPLY5",
      description: `Order ${intent.orderId.slice(0, 8)}`,
      order_id: intent.externalId,
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
        orderId: intent.orderId,
      },
      theme: { color: "#7B3010" },
      handler: async (response: {
        razorpay_order_id?: string
        razorpay_payment_id?: string
        razorpay_signature?: string
      }) => {
        try {
          setStatusText("Verifying payment...");
          if (!response?.razorpay_order_id || !response?.razorpay_payment_id || !response?.razorpay_signature) {
            throw new Error("Incomplete payment response from gateway.")
          }
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              orderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          })
          const verifyJson = (await verifyRes.json()) as { success?: boolean; message?: string }
          if (!verifyRes.ok || verifyJson.success === false) {
            window.localStorage.removeItem("ziply5_final_total"); // Clear coupon-adjusted total on verification failure
            throw new Error(verifyJson.message ?? "Payment verification failed")
          }

          setStatusText("Payment successful.");
          window.localStorage.removeItem("ziply5_pending_order_id");
          window.localStorage.removeItem("ziply5_checkout_ref");
          setCartItems([]);
          router.push(`/payment-success?orderId=${orderId}`);
          window.localStorage.removeItem("ziply5_final_total"); // Clear coupon-adjusted total on successful online payment
        } catch (error) {
          setProcessingGateway(null)
          setError(error instanceof Error ? error.message : "Payment verification failed")
          void postCartEvent("payment_failed", { reason: error instanceof Error ? error.message : "verify_failed" })
        }
      },
      modal: {
        ondismiss: () => {
          setStatusText("Payment interrupted. You can retry.");
          setError("Payment was not completed. Please retry.");
          setProcessingGateway(null);
          void postCartEvent("payment_cancelled", { source: "razorpay_modal_dismiss" });
        },
      },
    });
    razorpay.open();
  };

  useEffect(() => {
    if (!retryMode || !createdOrderId || !loggedIn || !scriptReady || autoRetryTriggeredRef.current) return;
    autoRetryTriggeredRef.current = true;
    void handleOnlinePayment();
  }, [retryMode, createdOrderId, loggedIn, scriptReady]);

  const retryPayment = async () => {
    if (!createdOrderId) return;
    const token = window.localStorage.getItem("ziply5_access_token");
    if (!token) {
      setError("Please login to retry payment.");
      return;
    }
    setProcessingGateway("ONLINE");
    setError("");
    setStatusText("Retrying payment...");
    try {
      await openRazorpay(token, createdOrderId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Retry failed.");
      setProcessingGateway(null);
    }
  };

  return (
    <div className="py-24 flex items-center justify-center bg-[#F5F1E6] p-4">
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
          Payable amount: <span className="font-semibold text-[#7B3010]">Rs. {payableAmount.toFixed(2)}</span>
        </div>
      <div className="flex flex-row gap-3">

  {/* ✅ COD BUTTON */}
  <button
    type="button"
    onClick={() => handleCOD()}
    disabled={processingGateway !== null || createOrderMutation.isPending}
    className="w-full hover:bg-primary hover:text-white text-primary border-primary border py-4 rounded-full font-medium"
  >
    {processingGateway === "COD" ? "Processing..." : "Cash on Delivery"}
  </button>

  {/* ✅ PAY NOW BUTTON */}
  <button
    type="button"
    onClick={() => handleOnlinePayment()}
    disabled={
      processingGateway !== null ||
      !scriptReady ||
      createOrderMutation.isPending ||
      initiatePaymentMutation.isPending
    }
    className="w-full border hover:border-[#7B3010] hover:bg-white hover:text-[#7B3010] bg-primary text-white py-4 rounded-full font-medium"
  >
    {processingGateway === "ONLINE" ? "Processing..." : "Pay Now"}
  </button>

</div>
        {/* {createdOrderId && (
          <button
            type="button"
            onClick={() => void retryPayment()}
            disabled={processingOrder || initiatePaymentMutation.isPending}
            className="mt-3 w-full rounded-full border border-[#E8DCC8] bg-white py-3 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F] disabled:opacity-40"
          >
            Retry Payment
          </button>
        )} */}
      </div>
    </div>
  );
}
export default function PaymentPage() {
  return (
    <Suspense fallback={null}>
      <PaymentPageInner />
    </Suspense>
  );
}
