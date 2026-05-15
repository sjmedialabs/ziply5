"use client";

import BannerSection from "@/components/BannerSection";
import { ArrowLeft, Loader2 } from "lucide-react";
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
import {
  readCheckoutStorage,
  writeCheckoutStorage,
  type CheckoutAddress,
} from "@/lib/ecommerce-order";
import { toast } from "@/lib/toast";
import { calculateZiply5Shipping } from "@/src/lib/shipping/ziply5-shipping";

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
      .catch(() => { });
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
  const [appliedCouponId, setAppliedCouponId] = useState<string | null>(null);

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

  const [fetchingPincode, setFetchingPincode] = useState(false);

  const normalizeStr = (str: string) =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const loadAddresses = useCallback(async () => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("ziply5_access_token") : null;
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent("/checkout")}`);
      return;
    }
    try {
      const data = await authedFetch<Addr[]>("/api/v1/me/addresses");
      setSavedAddresses(data);
    } catch { }
  }, [router]);

  useEffect(() => {
    const syncCart = () => setItems(getCartItems());
    syncCart();
    window.addEventListener("ziply5:cart-updated", syncCart);
    window.addEventListener("storage", syncCart);

    const savedCoupon = window.localStorage.getItem("ziply5_coupon_code");
    if (savedCoupon && !couponCode) setCouponCode(savedCoupon);

    const savedCouponId = window.localStorage.getItem("ziply5_applied_coupon_id");
    if (savedCouponId) setAppliedCouponId(savedCouponId);

    const savedCheckout = readCheckoutStorage();
    if (savedCheckout) {
      if (savedCheckout.billingAddress) {
        const [firstName, ...last] = (savedCheckout.billingAddress.fullName || "").split(" ");
        setBilling((prev) => ({
          ...prev,
          firstName: firstName ?? "",
          lastName: last.join(" "),
          email: savedCheckout.billingAddress?.email ?? "",
          line1: savedCheckout.billingAddress?.addressLine1 ?? "",
          postalCode: savedCheckout.billingAddress?.postalCode ?? "",
          phone: savedCheckout.billingAddress?.phone ?? "",
        }));
        setState(savedCheckout.billingAddress.state ?? "");
        setCity(savedCheckout.billingAddress.city ?? "");
      }

      // Also restore coupon from checkout storage if available
      if (savedCheckout.coupon) {
        if (!couponCode && savedCheckout.coupon.code) {
          setCouponCode(savedCheckout.coupon.code);
        }
        if (!appliedCouponId && savedCheckout.coupon.couponId) {
          setAppliedCouponId(savedCheckout.coupon.couponId);
        }
      }
    }

    void loadAddresses();

    const fetchProfile = async () => {
      const token = window.localStorage.getItem("ziply5_access_token");
      const userStr = window.localStorage.getItem("ziply5_user");
      if (!token || !userStr) return;
      try {
        const user = JSON.parse(userStr);
        if (!user?.id) return;
        const res = await fetch(`/api/v1/profile?userId=${encodeURIComponent(user.id)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-user-id": user.id
          },
        });
        const payload = await res.json();
        if (payload.success && payload.data) {
          setBilling((prev) => ({
            ...prev,
            email: prev.email || payload.data.email || "",
            phone: prev.phone || payload.data.profile?.phone || "",
            firstName: prev.firstName || payload.data.name?.split(" ")[0] || "",
            lastName: prev.lastName || payload.data.name?.split(" ").slice(1).join(" ") || "",
          }));
        }
      } catch (err) {
        console.error("Failed to fetch profile in checkout", err);
      }
    };
    fetchProfile();

    return () => {
      window.removeEventListener("ziply5:cart-updated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, [couponCode, loadAddresses]);

  // Pincode Lookup Logic
  useEffect(() => {
    const pin = billing.postalCode.trim();
    if (pin.length === 6 && /^\d{6}$/.test(pin)) {
      const controller = new AbortController();
      const runLookup = async () => {
        setFetchingPincode(true);
        try {
          const res = await fetch(`/api/v1/pincode/${pin}`, { signal: controller.signal });
          const payload = await res.json();
          if (payload.success && payload.data) {
            const { city: fetchedCity, state: fetchedState } = payload.data;

            // Case-insensitive & accent-insensitive state matching
            if (fetchedState && states) {
              const normState = normalizeStr(fetchedState);
              const matchedState = states.find(s => normalizeStr(s.label) === normState);

              if (matchedState) {
                setState(matchedState.label);
              } else {
                // Fallback to title case
                const titleCaseState = fetchedState.toLowerCase().split(' ').map((w: any) => w.charAt(0).toUpperCase() + w.substring(1)).join(' ');
                setState(titleCaseState);
              }
            }

            if (fetchedCity) {
              const normCity = normalizeStr(fetchedCity);
              const titleCaseCity = fetchedCity.toLowerCase().split(' ').map((w: any) => w.charAt(0).toUpperCase() + w.substring(1)).join(' ');

              // We need to wait for state to update and cities to be available
              // or just set the city and hope the Select can handle it.
              // Since availableCities depends on 'state', we set a small timeout or use the city directly.
              setCity(titleCaseCity);
            }
          }
        } catch (err) {
          if ((err as any).name !== "AbortError") {
            console.error("Pincode lookup failed:", err);
          }
        } finally {
          setFetchingPincode(false);
        }
      };
      void runLookup();
      return () => controller.abort();
    }
  }, [billing.postalCode]);

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

  const totalPacksForShipping = useMemo(
    () => validatedItems.reduce((acc, item) => acc + Math.max(1, Math.floor(Number(item.quantity) || 0)), 0),
    [validatedItems],
  );
  const shipping = useMemo(() => {
    if (items.length === 0 || totalPacksForShipping < 1) return 0;
    return calculateZiply5Shipping(totalPacksForShipping).chargeInr;
  }, [items.length, totalPacksForShipping]);

  const [deliveryCheck, setDeliveryCheck] = useState<{
    loading: boolean;
    error: string | null;
    lastOk: boolean;
    data: {
      status: string;
      deliverable: boolean;
      message?: string;
      estimatedDeliveryDaysMin: number | null;
      estimatedDeliveryDaysMax: number | null;
      codAvailable: boolean;
      prepaidAvailable: boolean;
    } | null;
  }>({ loading: false, error: null, lastOk: false, data: null });

  const runDeliveryCheck = useCallback(async () => {
    const pin = billing.postalCode.trim();
    if (!/^\d{6}$/.test(pin) || totalPacksForShipping < 1) {
      setDeliveryCheck((prev) => ({ ...prev, loading: false, error: null, data: null, lastOk: false }));
      return;
    }
    setDeliveryCheck((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch("/api/shipping/check-serviceability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delivery_postcode: pin,
          cod: false,
          totalItems: totalPacksForShipping,
        }),
      });
      const payload = (await res.json()) as {
        success?: boolean;
        message?: string;
        data?: {
          status: string;
          deliverable: boolean;
          message?: string;
          estimatedDeliveryDaysMin: number | null;
          estimatedDeliveryDaysMax: number | null;
          codAvailable: boolean;
          prepaidAvailable: boolean;
        };
      };
      if (!res.ok || payload.success === false || !payload.data) {
        throw new Error(payload.message ?? "Unable to verify delivery for this pincode.");
      }
      const d = payload.data;
      setDeliveryCheck({ loading: false, error: null, lastOk: true, data: d });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Delivery check failed";
      setDeliveryCheck({ loading: false, error: msg, lastOk: false, data: null });
      toast.warning("Could not verify delivery right now. You can still try to place your order.");
    }
  }, [billing.postalCode, totalPacksForShipping]);

  useEffect(() => {
    const pin = billing.postalCode.trim();
    if (!/^\d{6}$/.test(pin) || totalPacksForShipping < 1) {
      setDeliveryCheck({ loading: false, error: null, lastOk: false, data: null });
      return;
    }
    const t = window.setTimeout(() => {
      void runDeliveryCheck();
    }, 450);
    return () => window.clearTimeout(t);
  }, [billing.postalCode, totalPacksForShipping, runDeliveryCheck]);
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
      const payload = (await response.json()) as { success?: boolean; message?: string; data?: { discount: number; couponId?: string } };
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message ?? "Unable to apply coupon.");
      }
      setCouponDiscount(Number(payload.data.discount));
      if (payload.data.couponId) {
        window.localStorage.setItem("ziply5_applied_coupon_id", payload.data.couponId);
        window.localStorage.setItem("ziply5_coupon_code", couponCode.trim());
        setAppliedCouponId(payload.data.couponId);
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
    setAppliedCouponId(null);
    try {
      window.localStorage.removeItem("ziply5_coupon_code");
      window.localStorage.removeItem("ziply5_applied_coupon_id");
      window.localStorage.removeItem("ziply5_final_total");

      // Also update consolidated checkout storage if it exists
      const savedCheckout = readCheckoutStorage();
      if (savedCheckout) {
        savedCheckout.coupon = null;
        writeCheckoutStorage(savedCheckout);
      }
    } catch { }
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
      toast.error("Your cart is empty.");
      return;
    }
    if (hasValidationErrors) {
      const message = "Some items in your cart are invalid. Please update your cart."
      setOrderError(message);
      toast.error(message);
      return;
    }
    setPlacing(true);
    setOrderError("");
    try {
      if (deliveryCheck.data?.status === "not_deliverable" && deliveryCheck.lastOk) {
        const message = "Delivery is not available for this pincode. Please choose a different address.";
        setOrderError(message);
        toast.error(message);
        return;
      }
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
      if (!payload.fullName || !payload.email || !payload.line1 || !payload.city || !payload.state || !payload.postalCode || !payload.phone) {
        const message = "Please complete all required fields before payment."
        setOrderError(message);
        toast.error(message);
        return;
      }
      if (!/^[6-9]\d{9}$/.test(payload.phone)) {
        const message = "Please enter a valid 10-digit Indian mobile number."
        setOrderError(message);
        toast.error(message);
        return;
      }
      window.localStorage.setItem("ziply5_checkout_billing_address", JSON.stringify(payload));
      if (couponApplied) {
        window.localStorage.setItem("ziply5_final_total", total.toString());
      } else {
        window.localStorage.removeItem("ziply5_final_total");
      }
      const normalizedAddress: CheckoutAddress = {
        fullName: payload.fullName,
        phone: payload.phone ?? "",
        email: payload.email ?? "",
        addressLine1: payload.line1,
        addressLine2: "",
        city: payload.city,
        state: payload.state,
        country: payload.country,
        postalCode: payload.postalCode,
      };
      writeCheckoutStorage({
        items: validatedItems.map((item) => ({
          id: item.id,
          productId: item.productId || item.slug,
          variantId: item.variantId ?? null,
          sku: item.sku ?? null,
          slug: item.slug,
          name: item.productName || item.name,
          variantLabel: item.weight || "",
          image: item.image,
          price: item.price,
          comparePrice: item.basePrice ?? item.price,
          quantity: item.quantity,
          subtotal: Number((item.price * item.quantity).toFixed(2)),
          tax: Number((item.price * item.quantity * (taxPercentage / 100)).toFixed(2)),
          stock: item.stock ?? null,
          weight: item.weight,
        })),
        shippingAddress: normalizedAddress,
        billingAddress: normalizedAddress,
        selectedShippingMethod: "standard",
        coupon: couponApplied
          ? {
            couponId: appliedCouponId || window.localStorage.getItem("ziply5_applied_coupon_id"),
            code: couponCode.trim(),
            discountType: "flat",
            discountValue: couponDiscount,
            appliedDiscount: offerTotalDiscount,
          }
          : null,
        subtotal: Number(subTotal.toFixed(2)),
        discount: Number(offerTotalDiscount.toFixed(2)),
        tax: Number(taxAmount.toFixed(2)),
        shippingCharge: Number((offerAdjustedShipping ?? shipping).toFixed(2)),
        totalItemsUsedForShipping: totalPacksForShipping,
        total: Number(total.toFixed(2)),
        updatedAt: new Date().toISOString(),
      });
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
            } catch { }
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
          } catch { }
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
      const message = e instanceof Error ? e.message : "Unable to continue to payment. Please try again."
      setOrderError(message);
      toast.error(message);
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
                  <label className="text-[#646464] text-sm">First Name <span className="text-red-500">*</span></label>
                  <input
                    className="input mt-1"
                    placeholder="First name"
                    value={billing.firstName}
                    onChange={(e) => setBilling((prev) => ({ ...prev, firstName: e.target.value }))}
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="text-[#646464] text-sm">Last Name <span className="text-red-500">*</span></label>
                  <input
                    className="input mt-1"
                    placeholder="Last name"
                    value={billing.lastName}
                    onChange={(e) => setBilling((prev) => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>

                {/* Email */}
                <div className="">
                  <label className="text-[#646464] text-sm">Email Address <span className="text-red-500">*</span></label>
                  <input
                    className="input mt-1"
                    placeholder="Email address"
                    value={billing.email}
                    onChange={(e) => setBilling((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                {/* Address Line */}
                <div className="">
                  <label className="text-[#646464] text-sm">Address Line <span className="text-red-500">*</span></label>
                  <input
                    className="input mt-1"
                    placeholder="House no, street, area"
                    value={billing.line1}
                    onChange={(e) => setBilling((prev) => ({ ...prev, line1: e.target.value }))}
                  />
                </div>

                {/* State */}
                <div>
                  <label className="text-[#646464] text-sm">State <span className="text-red-500">*</span></label>
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
                  <label className="text-[#646464] text-sm">City <span className="text-red-500">*</span></label>
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
                      {city && !availableCities.find(c => c.label === city) && (
                        <SelectItem value={city}>{city}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Zip Code */}
                <div className="">
                  <label className="text-[#646464] text-sm">Zip / Postal Code <span className="text-red-500">*</span></label>
                  <input
                    className="input mt-1"
                    placeholder="Enter pincode"
                    value={billing.postalCode}
                    onChange={(e) => setBilling((prev) => ({ ...prev, postalCode: e.target.value }))}
                    disabled={fetchingPincode}
                    onBlur={(e) => {
                      const value = e.target.value;

                      if (!/^\d{6}$/.test(value)) {
                        toast.error("Invalid Pincode (must be 6 digits)");
                      }
                    }}
                  />
                  {fetchingPincode && <p className="text-[10px] text-primary animate-pulse mt-1">Fetching location details...</p>}
                </div>

                {/* Phone */}
                <div className="">
                  <label className="text-[#646464] text-sm">Phone <span className="text-red-500">*</span></label>
                  <input
                    className="input mt-1"
                    placeholder="10-digit mobile number"
                    value={billing.phone}
                    maxLength={10}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setBilling((prev) => ({ ...prev, phone: val }));
                    }}
                  />
                </div>

                {/* Delivery validation (Shiprocket serviceability — pricing is Ziply5 slabs only) */}
                {billing.postalCode.trim().length >= 6 && validatedItems.length > 0 && (
                  <div className="md:col-span-2 rounded-xl border border-[#e8e0d4] bg-white/80 p-3 text-sm text-[#646464]">
                    {deliveryCheck.loading && (
                      <p className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Checking delivery for this pincode…
                      </p>
                    )}
                    {!deliveryCheck.loading && deliveryCheck.error && (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-amber-800">{deliveryCheck.error}</span>
                        <button
                          type="button"
                          className="rounded-full border border-[#7B3010] px-3 py-1 text-xs font-semibold text-[#7B3010]"
                          onClick={() => void runDeliveryCheck()}
                        >
                          Retry
                        </button>
                      </div>
                    )}
                    {!deliveryCheck.loading && !deliveryCheck.error && deliveryCheck.data?.status === "deliverable" && (
                      <p className="text-emerald-800">
                        Deliverable
                        {deliveryCheck.data.estimatedDeliveryDaysMin != null && (
                          <span className="ml-1">
                            · Est. {deliveryCheck.data.estimatedDeliveryDaysMin}
                            {deliveryCheck.data.estimatedDeliveryDaysMax != null &&
                              deliveryCheck.data.estimatedDeliveryDaysMax !== deliveryCheck.data.estimatedDeliveryDaysMin
                              ? `–${deliveryCheck.data.estimatedDeliveryDaysMax}`
                              : ""}{" "}
                            day(s)
                          </span>
                        )}
                      </p>
                    )}
                    {!deliveryCheck.loading && !deliveryCheck.error && deliveryCheck.data?.status === "limited_service" && (
                      <p className="text-amber-900">
                        Limited service for this pincode (fewer courier options or longer transit). You can continue with prepaid;
                        COD may be restricted for this destination.
                      </p>
                    )}
                    {!deliveryCheck.loading && !deliveryCheck.error && deliveryCheck.data?.status === "not_deliverable" && (
                      <p className="text-red-700 font-medium">
                        Not deliverable to this pincode. Please update your address to continue.
                      </p>
                    )}
                    {!deliveryCheck.loading && !deliveryCheck.error && deliveryCheck.data?.status === "api_unavailable" && (
                      <p className="text-amber-900">
                        {deliveryCheck.data.message ??
                          "We could not verify delivery with the carrier right now. You may still place your order; we will confirm before dispatch."}
                      </p>
                    )}
                  </div>
                )}

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
                <p className="text-center text-sm text-red-600 mb-4">{orderError}</p>
              )}

              {items.length > 0 && total < 250 && (
                <div className="rounded-2xl bg-white/60 p-3 text-center border border-red-200/50 mb-2">
                  <p className="text-xs font-medium text-red-700">
                    Add INR {(250 - total).toFixed(2)} more to place order.
                    <br />
                    <span className="text-[10px] opacity-70">(Minimum order: INR 250.00)</span>
                  </p>
                </div>
              )}

              {/* Button */}
              <button
                type="button"
                onClick={() => void goToPayment()}
                disabled={placing || items.length === 0 || total < 250 || (deliveryCheck.data?.status === "not_deliverable" && deliveryCheck.lastOk)}
                className="bg-[#7B3010] shadow-2xl tracking-wide font-medium text-white w-full py-4 rounded-full font-melon disabled:opacity-60 disabled:cursor-not-allowed transition-all"
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
              <span>Shipping ({totalPacksForShipping} packs)</span>
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