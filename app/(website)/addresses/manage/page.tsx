"use client";

import { useCallback, useEffect, useRef, useState, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authedFetch, authedPost, authedPatch } from "@/lib/dashboard-fetch";
import { useLocations } from "@/hooks/useLocations";
import { toast } from "@/lib/toast";

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

function ManageAddressContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams ? searchParams.get("id") : null;
  const next = searchParams ? searchParams.get("next") : null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("IN");
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [fetchingPincode, setFetchingPincode] = useState(false);
  const [pincodeCities, setPincodeCities] = useState<string[]>([]);
  const loadedPostalCodeRef = useRef("");

  // States and refs for searchable city dropdown
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState("");

  const normalizeStr = (str: string) =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

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

    // 1. Check for strict DB relationship (for custom-created locations)
    const parentRef = c.parentState || c.valueJson?.parentState || c.meta?.parentState;
    if (parentRef) {
      return parentRef === selectedStateObj.value || parentRef === selectedStateObj.label;
    }

    // 2. Fallback to local JSON map (for standard India locations)
    if (selectedStateObj.label && cityMap[selectedStateObj.label]) {
      return cityMap[selectedStateObj.label].includes(c.label);
    }

    // 3. Absolute Failsafe
    return Object.keys(cityMap).length === 0;
  });

  // Click outside listener for searchable city dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const allCityOptions = useMemo(() => {
    let options: string[] = [];
    if (pincodeCities.length > 0) {
      options = [...pincodeCities];
      if (city && !options.includes(city)) {
        options.unshift(city);
      }
    } else if (availableCities && availableCities.length > 0) {
      options = availableCities.map((c: any) => c.label);
      if (city && !options.includes(city)) {
        options.unshift(city);
      }
    } else if (city) {
      options = [city];
    }
    return Array.from(new Set(options));
  }, [pincodeCities, availableCities, city]);

  const filteredCityOptions = useMemo(() => {
    const query = citySearchQuery.trim().toLowerCase();
    if (!query) return allCityOptions;
    return allCityOptions.filter(opt => opt.toLowerCase().includes(query));
  }, [allCityOptions, citySearchQuery]);

  // Load address if in edit mode
  useEffect(() => {
    if (!id) return;
    const loadAddress = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await authedFetch<Addr[]>("/api/v1/me/addresses");
        const match = data.find((a) => a.id === id);
        if (match) {
          setLabel(match.label || "");
          setFirstName(match.firstName || "");
          setLastName(match.lastName || "");
          setEmail(match.email || "");
          setLine1(match.line1);
          setLine2(match.line2 || "");
          setState(match.state);
          setCity(match.city);
          setPostalCode(match.postalCode);
          loadedPostalCodeRef.current = match.postalCode;
          setPhone(match.phone || "");
          setCountry(match.country || "IN");
          setIsDefault(match.isDefault);
        } else {
          toast.error("Address not found.");
          router.push(next && next.startsWith("/") ? next : "/addresses");
        }
      } catch (err) {
        setError("Failed to load address details.");
      } finally {
        setLoading(false);
      }
    };
    void loadAddress();
  }, [id, next, router]);

  // Prefill user profile info when adding a new address
  useEffect(() => {
    if (id) return;

    const token = typeof window !== "undefined" ? window.localStorage.getItem("ziply5_access_token") : null;
    const userStr = typeof window !== "undefined" ? window.localStorage.getItem("ziply5_user") : null;
    if (!token || !userStr) return;

    let userId = "";
    try {
      const user = JSON.parse(userStr);
      if (user) {
        userId = user.id || "";
        if (user.name) {
          const parts = user.name.split(" ");
          setFirstName(parts[0] || "");
          setLastName(parts.slice(1).join(" ") || "");
        }
        if (user.email) {
          setEmail(user.email);
        }
      }
    } catch (err) {
      console.error("Failed to parse user session info in manage address page", err);
    }

    if (!userId) return;

    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/v1/profile?userId=${encodeURIComponent(userId)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-user-id": userId
          },
        });
        const payload = await res.json();
        if (payload.success && payload.data) {
          if (payload.data.name) {
            const parts = payload.data.name.split(" ");
            setFirstName(parts[0] || "");
            setLastName(parts.slice(1).join(" ") || "");
          }
          if (payload.data.email) {
            setEmail(payload.data.email);
          }
          if (payload.data.profile?.phone) {
            setPhone(payload.data.profile.phone);
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile in manage address page", err);
      }
    };
    void fetchProfile();
  }, [id]);

  // Pincode Lookup Logic
  useEffect(() => {
    const pin = postalCode.trim();
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setPincodeCities([]);
      return;
    }
    if (!states || states.length === 0) {
      return;
    }
    if (loadedPostalCodeRef.current === pin) {
      return;
    }
    const controller = new AbortController();
    const runLookup = async () => {
      setFetchingPincode(true);
      try {
        const res = await fetch(`/api/v1/pincode/${pin}`, { signal: controller.signal });
        const payload = await res.json();
        if (payload.success && payload.data) {
          const { city: fetchedCity, state: fetchedState, names } = payload.data;

          // Case-insensitive & accent-insensitive state matching
          if (fetchedState) {
            const normState = normalizeStr(fetchedState);
            const matchedState = states.find(s => normalizeStr(s.label) === normState);

            if (matchedState) {
              setState(matchedState.label);
              loadedPostalCodeRef.current = pin;

              let finalCity = "";
              if (names && Array.isArray(names)) {
                setPincodeCities(names);
                if (names.length === 1) {
                  finalCity = names[0];
                } else if (names.length > 1) {
                  finalCity = "";
                }
              } else {
                setPincodeCities([]);
                if (fetchedCity) {
                  finalCity = fetchedCity.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.substring(1)).join(' ');
                }
              }
              setCity(finalCity);
            } else {
              toast.error(
                "Delivery service unavailable",
                "Currently we don't have delivery service to this state. Please enter another pincode."
              );
              setPostalCode("");
              setState("");
              setCity("");
              setPincodeCities([]);
              loadedPostalCodeRef.current = "";
            }
          } else {
            toast.error(
              "Pincode not found",
              "We couldn't find details for this pincode. Please select your State and City manually."
            );
            setState("");
            setCity("");
            setPincodeCities([]);
            loadedPostalCodeRef.current = "";
          }
        } else {
          toast.error(
            "Pincode not found",
            "We couldn't find details for this pincode. Please select your State and City manually."
          );
          setState("");
          setCity("");
          setPincodeCities([]);
          loadedPostalCodeRef.current = "";
        }
      } catch (err) {
        if ((err as any).name !== "AbortError") {
          console.error("Pincode lookup failed:", err);
          toast.error(
            "Pincode lookup failed",
            "Could not verify pincode. Please select your State and City manually."
          );
          setState("");
          setCity("");
          setPincodeCities([]);
          loadedPostalCodeRef.current = "";
        }
      } finally {
        setFetchingPincode(false);
      }
    };
    void runLookup();
    return () => controller.abort();
  }, [postalCode, states]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!line1.trim() || !city.trim() || !state.trim() || !postalCode.trim()) return;

    // Validate Pincode (Indian Pincode: 6 digits, doesn't start with 0)
    const pin = postalCode.trim();
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      const msg = "Please enter a valid 6-digit Indian postal code.";
      setError(msg);
      toast.error("Validation Error", msg);
      return;
    }

    // Validate Email if provided
    const emailStr = email.trim();
    if (emailStr && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
      const msg = "Please enter a valid email address.";
      setError(msg);
      toast.error("Validation Error", msg);
      return;
    }

    // Validate Indian Mobile Number if provided
    const phoneStr = phone.trim();
    if (phoneStr && !/^(?:\+91|91|0)?[6-9]\d{9}$/.test(phoneStr)) {
      const msg = "Please enter a valid Indian mobile number (e.g. 9876543210).";
      setError(msg);
      toast.error("Validation Error", msg);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const payload = {
        label: label.trim() || null,
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        email: email.trim() || null,
        line1: line1.trim(),
        line2: line2.trim() || null,
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        country: country.trim() || "IN",
        phone: phone.trim() || null,
        isDefault,
      };

      if (id) {
        await authedPatch(`/api/v1/me/addresses/${id}`, payload);
        toast.success("Success", "Address updated successfully.");
      } else {
        await authedPost("/api/v1/me/addresses", payload);
        toast.success("Success", "Address saved successfully.");
      }

      window.dispatchEvent(new Event("storage"));

      // Redirect back
      if (next && next.startsWith("/")) {
        router.push(next);
      } else {
        router.push("/addresses");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save address";
      setError(msg);
      toast.error("Error", msg);
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => {
    if (next && next.startsWith("/")) {
      router.push(next);
    } else {
      router.push("/addresses");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="text-sm text-[#646464] animate-pulse">Loading address details…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Heading and back link */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">
            {id ? "Edit address" : "Add address"}
          </h1>
          <p className="text-sm text-[#646464]">
            Provide delivery address details below.
          </p>
        </div>
        <button
          onClick={handleBack}
          className="text-sm font-semibold text-[#7B3010] underline cursor-pointer bg-transparent border-0"
        >
          Cancel and go back
        </button>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      <div className="relative rounded-2xl border border-[#E8DCC8] bg-[#FFFBF3]/40 p-6">
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase text-[#646464] sm:col-span-2">
            Label (optional)
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm"
              placeholder="e.g. Home, Office"
            />
          </label>
          <label className="text-xs font-semibold uppercase text-[#646464]">
            First Name
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm"
              placeholder="First Name"
            />
          </label>
          <label className="text-xs font-semibold uppercase text-[#646464]">
            Last Name
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm"
              placeholder="Last Name"
            />
          </label>
          <label className="text-xs font-semibold uppercase text-[#646464] sm:col-span-2">
            Email Address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm"
              placeholder="email@example.com"
            />
          </label>
          <label className="text-xs font-semibold uppercase text-[#646464] sm:col-span-2">
            Line 1
            <input
              required
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm"
              placeholder="Flat/House No., Building Name, Street"
            />
          </label>
          <label className="text-xs font-semibold uppercase text-[#646464] sm:col-span-2">
            Line 2
            <input
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm"
              placeholder="Apartment, Suite, Unit, Landmark (optional)"
            />
          </label>
          <label className="text-xs font-semibold uppercase text-[#646464]">
            Postal code
            <input
              required
              value={postalCode}
              onChange={(e) => {
                loadedPostalCodeRef.current = "";
                setPostalCode(e.target.value);
              }}
              disabled={fetchingPincode}
              className="mt-1 w-full rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm"
              placeholder="6-digit Pincode"
            />
            {fetchingPincode && <p className="text-[10px] text-primary animate-pulse mt-0.5">Fetching location...</p>}
          </label>
          <label className="text-xs font-semibold uppercase text-[#646464]">
            Country
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm"
              placeholder="IN"
            />
          </label>
          <label className="text-xs font-semibold uppercase text-[#646464]">
            State
            <div className="relative mt-1">
              <select
                required
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setCity("");
                  setIsCityDropdownOpen(false);
                  setCitySearchQuery("");
                }}
                className="h-[38px] w-full rounded-lg border border-[#D9D9D1] bg-white pl-3 pr-8 py-2 text-sm shadow-none focus:border-[#7B3010] focus:ring-0 focus-visible:ring-0 outline-none appearance-none"
              >
                <option value="" disabled>Select State</option>
                {state && !states?.some(s => s.label === state) && (
                  <option value={state}>{state}</option>
                )}
                {(states || []).map((s) => (
                  <option key={s.value} value={s.label}>{s.label}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="h-4 w-4 text-[#646464] opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </label>
          <div className="text-xs font-semibold uppercase text-[#646464] relative" ref={cityDropdownRef}>
            City
            <div className="relative mt-1">
              <button
                type="button"
                disabled={!state}
                onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                className="h-[38px] w-full text-left rounded-lg border border-[#D9D9D1] bg-white pl-3 pr-8 py-2 text-sm shadow-none focus:border-[#7B3010] focus:outline-none focus:ring-1 focus:ring-[#7B3010] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
              >
                <span className={city ? "text-black" : "text-gray-400"}>
                  {city || (!state ? "Select state first" : "Select City")}
                </span>
                <div className="pointer-events-none flex items-center">
                  <svg className="h-4 w-4 text-[#646464] opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              <input
                required
                value={city}
                onChange={() => {}}
                className="absolute inset-x-0 bottom-0 h-0 w-0 opacity-0 pointer-events-none"
                tabIndex={-1}
              />

              {isCityDropdownOpen && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[#D9D9D1] bg-white p-2 shadow-lg">
                  <input
                    type="text"
                    value={citySearchQuery}
                    onChange={(e) => setCitySearchQuery(e.target.value)}
                    placeholder="Search city..."
                    className="w-full mb-2 rounded border border-[#D9D9D1] px-2 py-1.5 text-xs outline-none focus:border-[#7B3010]"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  <div className="space-y-0.5">
                    {filteredCityOptions.length > 0 ? (
                      filteredCityOptions.map((cName) => (
                        <div
                          key={cName}
                          onClick={() => {
                            setCity(cName);
                            setIsCityDropdownOpen(false);
                            setCitySearchQuery("");
                          }}
                          className={`cursor-pointer rounded px-2.5 py-1.5 text-sm hover:bg-[#FFFBF3] hover:text-[#7B3010] ${
                            city === cName ? "bg-[#FFFBF3] text-[#7B3010] font-medium" : "text-gray-700"
                          }`}
                        >
                          {cName}
                        </div>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-xs text-gray-400 italic">No cities found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <label className="text-xs font-semibold uppercase text-[#646464] sm:col-span-2">
            Phone
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm"
              placeholder="10-digit Phone Number"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-[#646464] sm:col-span-2 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-[#D9D9D1] text-[#7B3010] focus:ring-[#7B3010] cursor-pointer"
            />
            Set as default address
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-[#7B3010] px-6 py-2.5 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50 cursor-pointer"
            >
              {busy ? "Saving…" : "Save address"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ManageAddressPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="text-sm text-[#646464]">Loading…</p>
      </div>
    }>
      <ManageAddressContent />
    </Suspense>
  );
}
