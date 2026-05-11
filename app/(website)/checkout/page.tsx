"use client";

import BannerSection from "@/components/BannerSection";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useLocations } from "@/hooks/useLocations";
import { getCartItems, type CartItem, setCartItems, validateCartItems } from "@/lib/cart"; 
import { useStorefrontProducts } from "@/hooks/useStorefrontProducts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authedFetch, authedPost, authedPatch } from "@/lib/dashboard-fetch"; // Utility functions for authenticated API calls

type Addr = {
  id: string;
  label: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
};

type ValidatedCartItem = CartItem & {
  isOutdated?: boolean;
  stock: number;
  variantError: boolean;
  productName: string;
  basePrice?: number;
};

export default function CheckoutPage() {
  const router = useRouter();
  const { products } = useStorefrontProducts(200);

  const [state, setState] = useState("");
  const [city, setCity] = useState("");

  const { data: states } = useLocations("state");
  const { data: cities } = useLocations("city");
  const [cityMap, setCityMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetch("/data/india-locations.json")
      .then((res) => res.json())
      .then((data) => {
        if (data?.cities) setCityMap(data.cities);
      })
      .catch(() => {});
  }, []);

  const availableCities = cities?.filter((c: any) => {
    if (!state) return false;
    const selectedStateObj = states?.find((s) => s.label === state);
    if (!selectedStateObj) return false;

    // 1. Check for strict DB relationship
    const parentRef = c.parentState || c.valueJson?.parentState || c.meta?.parentState;
    if (parentRef) {
      return parentRef === selectedStateObj.value || parentRef === selectedStateObj.label;
    }

    // 2. Fallback to local JSON map
    if (selectedStateObj.label && cityMap[selectedStateObj.label]) {
      return cityMap[selectedStateObj.label].includes(c.label);
    }

    // 3. Absolute Failsafe
    return Object.keys(cityMap).length === 0;
  });

  const sessionKey = useMemo(() => {
    if (typeof window === "undefined") return "";
    let key = window.localStorage.getItem("ziply5_session_key");
    if (!key) {
      key = "sess_" + Math.random().toString(36).substring(2, 15);
      window.localStorage.setItem("ziply5_session_key", key);
    }
    return key;
  }, []);

  const [items, setItems] = useState<CartItem[]>([]);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [offerBreakdown, setOfferBreakdown] = useState<Array<{ label: string; amount: number; type: string }>>([]);
  const [offerTotalDiscount, setOfferTotalDiscount] = useState(0);
  const [offerAdjustedShipping, setOfferAdjustedShipping] = useState<number | null>(null);
  const [offerFinalTotal, setOfferFinalTotal] = useState<number | null>(null);
  const [taxPercentage, setTaxPercentage] = useState(0);

  useEffect(() => {
    fetch("/api/v1/settings?group=TAX")
      .then((res) => res.json())
      .then((payload: any) => {
        if (payload.success && Array.isArray(payload.data)) {
          const row = payload.data.find((r: any) => r.key === "percentage");
          if (row && row.valueJson != null) {
            setTaxPercentage(Number(row.valueJson));
          }
        }
      })
      .catch((err) => console.error("Tax setting fetch failed", err));
  }, []);

  const couponApplied = !!couponCode.trim() && offerBreakdown.some((entry) => entry.type === "coupon");
  const [savedAddresses, setSavedAddresses] = useState<Addr[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("manual");
  const [originalAddress, setOriginalAddress] = useState<Addr | null>(null);
  const [billing, setBilling] = useState({
    firstName: "",
    lastName: "",
    email: "",
    line1: "",
    postalCode: "",
    phone: "",
  });

  const loadAddresses = useCallback(async () => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("ziply5_access_token") : null;
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent("/checkout")}`);
      return;
    }
    try {
      const data = await authedFetch<Addr[]>("/api/v1/me/addresses");
      setSavedAddresses(data);
    } catch {}
  }, [router]);

  useEffect(() => {
    const syncCart = () => setItems(getCartItems());
    syncCart();
    window.addEventListener("ziply5:cart-updated", syncCart);
    window.addEventListener("storage", syncCart);

    const savedCoupon = window.localStorage.getItem("ziply5_coupon_code");
    if (savedCoupon && !couponCode) setCouponCode(savedCoupon);

    void loadAddresses();

    return () => {
      window.removeEventListener("ziply5:cart-updated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, [couponCode, loadAddresses]);
useEffect(() => {
  if (!products.length) return;

  const cleaned = items.filter(item => {
    const p = products.find(p => p.id === item.productId || p.slug === item.slug);
    if (!p) return false;

    // remove invalid variant items
    if (p.productKind === "variant") {
      return item.variantId && p.variants.some(v => v.id === item.variantId);
    }

    return true;
  });

  if (cleaned.length !== items.length) {
    setCartItems(cleaned);
    setItems(cleaned);
  }
}, [products]);
  // Validate items against current product/variant data from DB
  const validatedItems = useMemo<ValidatedCartItem[]>(() => {
    return items.map((item) => {
      const p = products.find((prod) => prod.id === item.productId || prod.slug === item.slug);
      if (!p) {
        return {
          ...item,
          isOutdated: true,
          stock: 0,
          variantError: false,
          productName: item.name,
          basePrice: item.price,
        };
      }

      let price = p.price;
      let basePrice = p.oldPrice;
      let stock = p.stock ?? 0;
      let variantError = false;

      if (p.productKind === "variant") {
        const v = p.variants.find((v) => v.id === item.variantId);
        if (v) {
          price = v.price;
          basePrice = v.mrp || p.oldPrice;
          stock = v.stock;
        } else {
          variantError = true;
        }
      }

      return { ...item, price, basePrice, stock, variantError, productName: p.name };
    });
  }, [items, products]);

  const subTotal = validatedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const hasValidationErrors = validatedItems.some(i => i.variantError || i.stock < i.quantity);

  const shipping = items.length === 0 ? 0 : 20;
  const baseTotal =
    offerFinalTotal != null
      ? offerFinalTotal
      : Math.max(subTotal - offerTotalDiscount, 0) + (offerAdjustedShipping ?? shipping);
  
  const taxAmount = (subTotal - offerTotalDiscount) * (taxPercentage / 100);
  const total = baseTotal + taxAmount;

  const recalculateOffers = useCallback(
    async (incomingCoupon?: string) => {
      if (!validatedItems.length) {
        setOfferBreakdown([]);
        setOfferTotalDiscount(0);
        setCouponDiscount(0);
        setOfferAdjustedShipping(null);
        setOfferFinalTotal(null);
        return;
      }
      const token = window.localStorage.getItem("ziply5_access_token");
      const response = await fetch("/api/v1/offers/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          couponCode: (incomingCoupon ?? couponCode).trim() || null,
          cartSubtotal: subTotal,
          shippingAmount: shipping,
          items: validatedItems.map((item) => ({
            productId: item.productId,
            categoryId: null,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
        }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        data?: {
          breakdown: Array<{ label: string; amount: number; type: string }>;
          totalDiscount: number;
          adjustedShipping?: number;
          finalTotal?: number;
        };
      };
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message ?? "Unable to calculate offers.");
      }
      setOfferBreakdown(payload.data.breakdown ?? []);
      setOfferTotalDiscount(Number(payload.data.totalDiscount ?? 0));
      setOfferAdjustedShipping(
        payload.data.adjustedShipping == null ? null : Number(payload.data.adjustedShipping),
      );
      setOfferFinalTotal(
        payload.data.finalTotal == null ? null : Number(payload.data.finalTotal),
      );
      const couponSavings = (payload.data.breakdown ?? [])
        .filter((entry) => entry.type === "coupon")
        .reduce((sum, entry) => sum + Number(entry.amount), 0);
      setCouponDiscount(couponSavings);
    },
    [couponCode, shipping, subTotal, validatedItems],
  );

  useEffect(() => {
    void recalculateOffers().catch(() => {
      setOfferBreakdown([]);
      setOfferTotalDiscount(couponDiscount);
      setOfferAdjustedShipping(null);
      setOfferFinalTotal(null);
    });
  }, [couponCode, recalculateOffers]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Enter a coupon code.");
      return;
    }
    setApplyingCoupon(true);
    setCouponError("");
    try {
      const token = window.localStorage.getItem("ziply5_access_token");
      const response = await fetch("/api/apply-coupon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          code: couponCode.trim(),
          subtotal: subTotal,
          items: items.map((item) => ({
            productId: item.productId,
            categoryId: null,
            quantity: item.quantity,
          })),
        }),
      });
      const payload = (await response.json()) as { success?: boolean; message?: string; data?: { discount: number } };
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message ?? "Unable to apply coupon.");
      }
      setCouponDiscount(Number(payload.data.discount));
      if (payload.data.couponId) {
        window.localStorage.setItem("ziply5_applied_coupon_id", payload.data.couponId);
      }
      await recalculateOffers(couponCode.trim());
    } catch (error) {
      setCouponDiscount(0);
      setOfferBreakdown((prev) => prev.filter((entry) => entry.type !== "coupon"));
      setCouponError(error instanceof Error ? error.message : "Unable to apply coupon.");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = async () => {
    setCouponError("");
    setCouponDiscount(0);
    setCouponCode("");
    try {
      window.localStorage.removeItem("ziply5_coupon_code");
      window.localStorage.removeItem("ziply5_applied_coupon_id");
    } catch {}
    await recalculateOffers("");
  };

  const handleAddressSelect = (id: string) => {
    setSelectedAddressId(id);
    if (id === "manual") return;

    const addr = savedAddresses.find((a) => a.id === id);
    if (addr) {
      setBilling((prev) => ({
        firstName: addr.firstName || prev.firstName,
        lastName: addr.lastName || prev.lastName,
        email: addr.email || prev.email,
        line1: addr.line1,
        postalCode: addr.postalCode,
        phone: addr.phone || prev.phone,
      }));
      setState(addr.state);
      setCity(addr.city);
      setOriginalAddress(addr);
    } else {
      setOriginalAddress(null);
    }
  };

  const goToPayment = async () => {
    if (items.length === 0) {
      window.alert("Your cart is empty.");
      return;
    }
    if (hasValidationErrors) {
  setOrderError("Some items in your cart are invalid. Please update your cart.");
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
      if (couponApplied) {
        window.localStorage.setItem("ziply5_final_total", total.toString());
      }
      const token =
        typeof window !== "undefined" ? window.localStorage.getItem("ziply5_access_token") : null;
      if (!token) {
        router.push(`/login?next=${encodeURIComponent("/payment")}`);
        return;
      }

      if (selectedAddressId !== "manual" && originalAddress) {
        const hasChanged = 
          billing.firstName !== (originalAddress.firstName || "") ||
          billing.lastName !== (originalAddress.lastName || "") ||
          billing.email !== (originalAddress.email || "") ||
          billing.line1 !== originalAddress.line1 ||
          billing.postalCode !== originalAddress.postalCode ||
          billing.phone !== (originalAddress.phone || "") ||
          city !== originalAddress.city ||
          state !== originalAddress.state;

        if (hasChanged) {
          const update = window.confirm("You have modified a saved address. Would you like to update your profile with these changes?");
          if (update) {
            try {
              await authedPatch(`/api/v1/me/addresses/${selectedAddressId}`, {
                firstName: billing.firstName,
                lastName: billing.lastName,
                email: billing.email,
                line1: billing.line1,
                city,
                state,
                postalCode: billing.postalCode,
                phone: billing.phone || null,
              });
            } catch {}
          }
        }
      } else if (selectedAddressId === "manual") {
        const save = window.confirm("Would you like to save this address for future use?");
        if (save) {
          try {
            await authedPost("/api/v1/me/addresses", {
              label: billing.firstName ? `${billing.firstName}'s Home` : "New Address",
              firstName: billing.firstName,
              lastName: billing.lastName,
              email: billing.email,
              line1: billing.line1,
              city: city,
              state: state,
              postalCode: billing.postalCode,
              country: "India",
              phone: billing.phone || null,
            });
          } catch {}
        }
      }

      const checkoutRef =
        window.localStorage.getItem("ziply5_checkout_ref") ??
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
      window.localStorage.setItem("ziply5_checkout_ref", checkoutRef);

      // Track checkout started + contact capture (for abandoned cart recovery engine)
      await fetch("/api/checkout/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKey,
          email: billing.email || null,
          mobile: billing.phone || null,
          items: items,
          total,
          meta: {
            checkoutStage: "CHECKOUT_STARTED",
            couponCode: couponCode.trim() || null,
            address: payload,
            lastVisitedPage: "/checkout",
          },
        }),
      }).catch(() => null)

      // Backwards-compatible: ensure the older abandoned cart endpoint gets a valid payload
      await fetch("/api/v1/abandoned-carts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKey,
          email: billing.email || null,
          itemsJson: items.map((item) => ({
            slug: item.slug,
            productId: item.productId,
            variantId: item.variantId ?? null,
            quantity: item.quantity,
            name: item.name,
            price: item.price,
          })),
          total,
        }),
      }).catch(() => null);

      router.push("/payment");
    } catch (e) {
      setOrderError(e instanceof Error ? e.message : "Unable to continue to payment. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div>
      {/* Banner */}
   {/*   <BannerSection
        title="Check out"
        subtitle="Some of the queries you want to know about us."
        gradient="linear-gradient(to right, #EFD7EF 0%, #F5F9FC 30%, #F8EAE1 60%, #EAF8F9 100%)"
      />*/}

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

              {savedAddresses.length > 0 && (
                <div className="mb-6">
                  <label className="text-[#646464] text-xs font-semibold uppercase block mb-1">Select from saved addresses</label>
                  <Select value={selectedAddressId} onValueChange={handleAddressSelect}>
                    <SelectTrigger className="input">
                      <SelectValue placeholder="Choose a saved address" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Add new address...</SelectItem>
                      {savedAddresses.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.label || a.line1} ({a.city})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-[10px] text-[#646464]">
                    Fields will autofill based on selection. You can still edit them manually.
                  </p>
                </div>
              )}

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
          <Select value={state || undefined} onValueChange={(val) => {
            setState(val);
            setCity(""); // reset city
          }}>
            <SelectTrigger className="input mt-1">
              <SelectValue placeholder="Select State" />
            </SelectTrigger>
            <SelectContent>
              {states?.map((s) => (
                <SelectItem key={s.value} value={s.label}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* City */}
        <div>
          <label className="text-[#646464] text-sm">City</label>
          <Select
            value={city || undefined}
            onValueChange={setCity}
            disabled={!state}
          >
            <SelectTrigger className="input mt-1">
              <SelectValue placeholder={!state ? "Select state first" : "Select City"} />
            </SelectTrigger>
            <SelectContent>
              {availableCities?.map((c) => (
                <SelectItem key={c.value} value={c.label}>
                  {c.label}
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
              {placing ? "Please wait…" : "Place Order →"}
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
              {validatedItems.map((item) => (
                <div key={item.id}>
                <div className="flex justify-between text-sm pb-2">
                  <div>
                    <p className="font-medium font-melon text-[#C03621] tracking-wide">
                      {item.productName || item.name}
                      {item.variantError && <span className="block text-[10px] text-red-700">! Variant required</span>}
                      {item.stock < item.quantity && <span className="block text-[10px] text-red-700">! Out of stock</span>}
                    </p>
                    <p className="text-xs text-[#646464]">
                      Qty: {item.quantity} | Net wt. {item.weight}
                    </p>
                  </div>

                  <span className="text-[#C03621] font-medium font-melon tracking-wide">
                    {item.basePrice && item.basePrice > item.price && (
                      <span className="text-[10px] line-through mr-1 opacity-50">Rs.{item.basePrice.toFixed(2)}</span>
                    )}
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
              <span>Rs.{(offerAdjustedShipping ?? shipping).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#C03621] font-medium font-melon tracking-wide mt-2">
              <span>Coupon Discount</span>
              <span>-Rs.{couponDiscount.toFixed(2)}</span>
            </div>
            {offerBreakdown
              .filter((entry) => entry.type !== "coupon")
              .map((entry) => (
                <div key={`${entry.type}-${entry.label}`} className="flex justify-between text-[#C03621] font-medium font-melon tracking-wide mt-2">
                  <span>{entry.label}</span>
                  <span>-Rs.{Number(entry.amount).toFixed(2)}</span>
                </div>
              ))}
            <div className="flex justify-between text-[#C03621] font-medium font-melon tracking-wide mt-2">
              <span>Total Savings</span>
              <span>-Rs.{offerTotalDiscount.toFixed(2)}</span>
            </div>
            {taxPercentage > 0 && (
              <div className="flex justify-between text-[#C03621] font-medium font-melon tracking-wide mt-2">
                <span>Tax ({taxPercentage}%)</span>
                <span>Rs.{taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#C03621] font-medium font-melon tracking-wide mt-2">
              <span>Grand Total</span>
              <span>Rs.{total.toFixed(2)}</span>
            </div>
            <div className="mt-4 space-y-2">
              <input
                className="input"
                placeholder="Coupon code"
                value={couponCode}
                disabled={applyingCoupon || couponApplied}
                onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
              />
              <button
                type="button"
                onClick={() => void (couponApplied ? removeCoupon() : applyCoupon())}
                disabled={applyingCoupon || items.length === 0}
                className="w-full rounded-full border border-[#7B3010] bg-white py-2 text-xs font-semibold uppercase text-[#7B3010] disabled:opacity-50"
              >
                {applyingCoupon ? "Applying..." : couponApplied ? "Remove coupon" : "Apply coupon"}
              </button>
              {couponError && <p className="text-xs text-red-700">{couponError}</p>}
            </div>

          </div>

        </div>
      </section>
    </div>
  );
}