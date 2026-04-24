"use client";

import { useState, useEffect } from "react";
import { useLocations } from "../../hooks/useLocations";
import { authedFetch } from "../../lib/dashboard-fetch";

export default function LocationCreatorForm({
  type,
  onSuccess,
}: {
  type: "warehouse" | "state" | "city";
  onSuccess?: () => void;
}) {
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [parentState, setParentState] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Free API data
  const [apiStates, setApiStates] = useState<{ name: string; state_code: string }[]>([]);
  const [apiCities, setApiCities] = useState<string[]>([]);
  const [cityMap, setCityMap] = useState<Record<string, string[]>>({});
  const [apiLoading, setApiLoading] = useState(false);

  // Only fetch states if we are creating a city (to populate the dropdown)
  const { data: states } = useLocations("state");

  // Fetch local Indian locations JSON on mount
  useEffect(() => {
    if (type === "state" || type === "city") {
      setApiLoading(true);
      fetch("/data/india-locations.json")
        .then((res) => res.json())
        .then((data) => {
          if (data?.states) setApiStates(data.states);
          if (data?.cities) setCityMap(data.cities);
        })
        .catch((err) => console.error("Failed to load local locations", err))
        .finally(() => setApiLoading(false));
    }
  }, [type]);

  // Instantly populate cities when a parent state is selected
  useEffect(() => {
    if (type === "city" && parentState) {
      const selectedStateObj = states?.find((s) => s.value === parentState);
      if (selectedStateObj?.label && cityMap[selectedStateObj.label]) {
        setApiCities(cityMap[selectedStateObj.label]);
      } else {
        setApiCities([]);
      }
    } else {
      setApiCities([]);
    }
  }, [type, parentState, states, cityMap]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await authedFetch("/api/admin/locations", {
        method: "POST",
        body: JSON.stringify({
          type,
          label,
          value: value || label.toLowerCase().replace(/\s+/g, "-"),
          ...(type === "city" ? { parentState } : {}),
        }),
      });
      
      // authedFetch handles success validation automatically
      setLabel("");
      setValue("");
      setParentState("");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl border border-[#E8DCC8] shadow-sm space-y-4">
      <h3 className="font-semibold text-[#4A1D1F] capitalize">Add New {type}</h3>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {type === "city" && (
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase text-[#646464]">Parent State</label>
          <select required value={parentState} onChange={(e) => setParentState(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D9D9D1] rounded-lg outline-none focus:border-[#7B3010]">
            <option value="">Select a state...</option>
            {states?.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-[11px] font-bold uppercase text-[#646464]">Label (Name)</label>
        {type === "state" && (apiStates.length > 0 || apiLoading) ? (
          <select required disabled={apiLoading} value={label} onChange={(e) => {
            setLabel(e.target.value);
            const s = apiStates.find((st) => st.name === e.target.value);
            if (s) setValue(s.state_code);
          }} className="w-full px-3 py-2 text-sm border border-[#D9D9D1] rounded-lg outline-none focus:border-[#7B3010] bg-white">
            <option value="">{apiLoading ? "Loading Indian States..." : "Select an Indian State..."}</option>
            {apiStates.map((s) => <option key={s.state_code} value={s.name}>{s.name}</option>)}
          </select>
        ) : type === "city" && parentState && (apiCities.length > 0 || apiLoading) ? (
          <select required disabled={apiLoading} value={label} onChange={(e) => setLabel(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D9D9D1] rounded-lg outline-none focus:border-[#7B3010] bg-white">
            <option value="">{apiLoading ? "Loading Cities..." : "Select a City..."}</option>
            {apiCities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        ) : (
          <input type="text" required placeholder={`e.g. ${type === 'state' ? 'Maharashtra' : type === 'city' ? 'Mumbai' : 'Main Hub'}`} value={label} onChange={(e) => setLabel(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D9D9D1] rounded-lg outline-none focus:border-[#7B3010]" />
        )}
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold uppercase text-[#646464]">Value / ID (Optional)</label>
        <input type="text" placeholder="Auto-generated if empty" value={value} onChange={(e) => setValue(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D9D9D1] rounded-lg outline-none focus:border-[#7B3010]" />
      </div>

      <button type="submit" disabled={loading} className="w-full py-2.5 mt-2 text-[11px] font-semibold text-white uppercase tracking-wide bg-[#7B3010] hover:bg-[#5c2410] rounded-full disabled:opacity-50 transition-colors">
        {loading ? "Saving..." : `Create ${type}`}
      </button>
    </form>
  );
}