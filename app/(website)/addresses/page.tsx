"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authedDelete, authedFetch, authedPost, authedPatch } from "@/lib/dashboard-fetch";
import { useLocations } from "@/hooks/useLocations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function AddressesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Addr[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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
  const [fetchingPincode, setFetchingPincode] = useState(false);

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
      .catch(() => {});
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

    // 3. Absolute Failsafe: If mapping file fails to load, allow all cities so the dropdown isn't broken
    return Object.keys(cityMap).length === 0;
  });

  const load = useCallback(() => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("ziply5_access_token") : null;
    if (!token) {
      setLoading(false);
      router.replace("/login?next=/addresses");
      return;
    }
    setLoading(true);
    setError("");
    authedFetch<Addr[]>("/api/v1/me/addresses")
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  // Pincode Lookup Logic
  useEffect(() => {
    const pin = postalCode.trim();
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
                const titleCaseState = fetchedState.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.substring(1)).join(' ');
                setState(titleCaseState);
              }
            }

            if (fetchedCity) {
              const titleCaseCity = fetchedCity.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.substring(1)).join(' ');
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
  }, [postalCode]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!line1.trim() || !city.trim() || !state.trim() || !postalCode.trim()) return;
    setBusy("add");
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
      };

      if (editingId) {
        await authedPatch(`/api/v1/me/addresses/${editingId}`, payload);
      } else {
        await authedPost("/api/v1/me/addresses", payload);
      }

      setEditingId(null);
      setFirstName("");
      setLastName("");
      setEmail("");
      setLine1("");
      setLine2("");
      setCity("");
      setState("");
      setPostalCode("");
      setLabel("");
      setPhone("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this address?")) return;
    setBusy(id);
    setError("");
    try {
      await authedDelete<{ id: string }>(`/api/v1/me/addresses/${id}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setBusy(null);
    }
  };

  const startEdit = (a: Addr) => {
    setEditingId(a.id);
    setLabel(a.label || "");
    setFirstName(a.firstName || "");
    setLastName(a.lastName || "");
    setEmail(a.email || "");
    setLine1(a.line1);
    setLine2(a.line2 || "");
    setCity(a.city);
    setState(a.state);
    setPostalCode(a.postalCode);
    setPhone(a.phone || "");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
        {/* heading and back link */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Saved addresses</h1>
          <p className="text-sm text-[#646464]">Used at checkout when you are signed in.</p>
        </div>
        <Link href="/profile" className="text-sm font-semibold text-[#7B3010] underline">
          Back to profile
        </Link>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {loading && <p className="text-sm text-[#646464]">Loading…</p>}

      {!loading && (
        <>
          {/* Address Lists */}
          <ul className="mb-8 space-y-3">
            {rows.length === 0 ? (
              <li className="rounded-2xl border border-[#E8DCC8] bg-white p-6 text-sm text-[#646464]">
                No addresses saved yet.
              </li>
            ) : (
              rows.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[#E8DCC8] bg-white p-4 shadow-sm"
                >
                  <div className="text-sm">
                    {(a.firstName || a.lastName) && (
                      <p className="font-semibold text-[#4A1D1F]">
                        {a.firstName} {a.lastName} {a.email ? `(${a.email})` : ""}
                      </p>
                    )}
                    {a.label && <p className="font-semibold text-[#4A1D1F]">{a.label}</p>}
                    <p className="text-[#333]">
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ""}
                    </p>
                    <p className="text-[#646464]">
                      {a.city}, {a.state} {a.postalCode}, {a.country}
                    </p>
                    {a.phone && <p className="text-[#646464]">{a.phone}</p>}
                    {a.isDefault && (
                      <span className="mt-1 inline-block rounded-full bg-[#FFFBF3] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#7B3010]">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => startEdit(a)}
                      className="text-xs font-semibold uppercase text-[#7B3010] hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy === a.id}
                      onClick={() => remove(a.id)}
                      className="text-xs font-semibold uppercase text-red-700 hover:underline disabled:opacity-50"
                    >
                      {busy === a.id ? "…" : "Remove"}
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
            {/* Add address form */}
          <div className="rounded-2xl border border-[#E8DCC8] bg-[#FFFBF3]/40 p-6">
            <h2 className="font-melon text-lg font-semibold text-[#4A1D1F]">
              {editingId ? "Edit address" : "Add address"}
            </h2>
            {editingId && <button onClick={() => setEditingId(null)} className="text-xs text-[#646464] underline">Cancel editing</button>}
            <form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase text-[#646464] sm:col-span-2">
                Label (optional)
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold uppercase text-[#646464]">
                First Name
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold uppercase text-[#646464]">
                Last Name
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold uppercase text-[#646464] sm:col-span-2">
                Email Address
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold uppercase text-[#646464] sm:col-span-2">
                Line 1
                <input
                  required
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold uppercase text-[#646464] sm:col-span-2">
                Line 2
                <input
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold uppercase text-[#646464]">
                State
                <Select required value={state || undefined} onValueChange={(val) => {
                  setState(val);
                  setCity("");
                }}>
                  <SelectTrigger className="mt-1 !h-[38px] w-full rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm shadow-none focus:border-[#7B3010] focus:ring-0 focus-visible:ring-0">
                    <SelectValue placeholder="Select State" />
                  </SelectTrigger>
                  <SelectContent>
                    {states?.map((s) => (
                      <SelectItem key={s.value} value={s.label}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="text-xs font-semibold uppercase text-[#646464]">
                City
                <Select required disabled={!state} value={city || undefined} onValueChange={setCity}>
                  <SelectTrigger className="mt-1 !h-[38px] w-full rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm shadow-none focus:border-[#7B3010] focus:ring-0 focus-visible:ring-0">
                    <SelectValue placeholder={!state ? "Select state first" : "Select City"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCities?.map((c) => (
                      <SelectItem key={c.value} value={c.label}>{c.label}</SelectItem>
                    ))}
                    {city && !availableCities.find(c => c.label === city) && (
                      <SelectItem value={city}>{city}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </label>
              <label className="text-xs font-semibold uppercase text-[#646464]">
                Postal code
                <input
                  required
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  disabled={fetchingPincode}
                  className="mt-1 w-full rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm"
                />
                {fetchingPincode && <p className="text-[10px] text-primary animate-pulse mt-0.5">Fetching location...</p>}
              </label>
              <label className="text-xs font-semibold uppercase text-[#646464]">
                Country
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold uppercase text-[#646464] sm:col-span-2">
                Phone
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D9D9D1] bg-white px-3 py-2 text-sm"
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={busy === "add"}
                  className="rounded-full bg-[#7B3010] px-6 py-2.5 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
                >
                  {busy === "add" ? "Saving…" : "Save address"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
