"use client";

import { useState, useEffect } from "react";
import { useLocations } from "../../hooks/useLocations";
import { authedFetch } from "../../lib/dashboard-fetch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown } from "lucide-react";

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
  const [selectedCities, setSelectedCities] = useState<string[]>([]);

  // Free API data
  const [apiStates, setApiStates] = useState<{ name: string; state_code: string }[]>([]);
  const [apiCities, setApiCities] = useState<string[]>([]);
  const [cityMap, setCityMap] = useState<Record<string, string[]>>({});
  const [apiLoading, setApiLoading] = useState(false);

  // Only fetch states if we are creating a city (to populate the dropdown)
  const { data: states } = useLocations("state");
  const { data: existingCities } = useLocations("city");

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
        const allCitiesForState = cityMap[selectedStateObj.label];
        const citiesInDbForState = new Set(
          (existingCities || [])
            .filter((c: any) => c.parentState === parentState)
            .map((c: any) => c.label)
        );
        const availableCities = allCitiesForState.filter(
          (cityName) => !citiesInDbForState.has(cityName)
        );
        setApiCities(availableCities);
      } else {
        setApiCities([]);
      }
    } else {
      setApiCities([]);
    }
    setSelectedCities([]);
  }, [type, parentState, states, cityMap, existingCities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type === "city" && apiCities.length > 0 && selectedCities.length === 0) {
      setError("Please select at least one city.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      if (type === "city" && apiCities.length > 0 && selectedCities.length > 0) {
        // Bulk insert multiple cities at once
        await Promise.all(
          selectedCities.map((city) =>
            authedFetch("/api/admin/locations", {
              method: "POST",
              body: JSON.stringify({
                type,
                label: city,
                value: city.toLowerCase().replace(/\s+/g, "-"),
                parentState,
              }),
            })
          )
        );
      } else {
        // Single generic insert
        await authedFetch("/api/admin/locations", {
          method: "POST",
          body: JSON.stringify({
            type,
            label,
            value: value || label.toLowerCase().replace(/\s+/g, "-"),
            ...(type === "city" ? { parentState } : {}),
          }),
        });
      }
      
      // authedFetch handles success validation automatically
      setLabel("");
      setValue("");
      setParentState("");
      setSelectedCities([]);
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
          <Select required value={parentState} onValueChange={setParentState}>
            <SelectTrigger className="!h-auto w-full rounded-lg border-[#D9D9D1] text-sm shadow-none focus:border-[#7B3010] focus:ring-0 focus-visible:ring-0">
              <SelectValue placeholder="Select a state..." />
            </SelectTrigger>
            <SelectContent>
              {states?.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-[11px] font-bold uppercase text-[#646464]">Label (Name)</label>
        {type === "state" && (apiStates.length > 0 || apiLoading) ? (
          <Select required disabled={apiLoading} value={label} onValueChange={(newLabel) => {
              setLabel(newLabel);
              const s = apiStates.find((st) => st.name === newLabel);
              if (s) setValue(s.state_code);
            }}>
            <SelectTrigger className="!h-auto w-full rounded-lg border-[#D9D9D1] bg-white text-sm shadow-none focus:border-[#7B3010] focus:ring-0 focus-visible:ring-0">
              <SelectValue placeholder={apiLoading ? "Loading Indian States..." : "Select an Indian State..."} />
            </SelectTrigger>
            <SelectContent>
              {apiStates.map((s) => <SelectItem key={s.state_code} value={s.name}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : type === "city" && parentState && (apiCities.length > 0 || apiLoading) ? (
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" disabled={apiLoading} className="flex w-full items-center justify-between rounded-lg border border-[#D9D9D1] bg-white px-3 py-2.5 text-sm shadow-none outline-none focus:border-[#7B3010] disabled:opacity-50">
                <span className="truncate">
                  {apiLoading ? "Loading Cities..." : selectedCities.length > 0 ? `${selectedCities.length} cities selected` : "Select Cities..."}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <div className="flex items-center justify-between border-b border-[#D9D9D1] p-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#4A1D1F]">
                  <Checkbox
                    checked={selectedCities.length > 0 && selectedCities.length === apiCities.length}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedCities([...apiCities]);
                      else setSelectedCities([]);
                    }}
                  />
                  Select All
                </label>
                <span className="text-xs text-muted-foreground">{selectedCities.length} selected</span>
              </div>
              <ScrollArea className="h-[250px]">
                <div className="flex flex-col gap-1 p-2">
                  {apiCities.map((c) => (
                    <label key={c} className="flex cursor-pointer items-center gap-2 rounded p-2 text-sm hover:bg-[#FFFBF3]">
                      <Checkbox checked={selectedCities.includes(c)} onCheckedChange={(checked) => setSelectedCities((prev) => checked ? [...prev, c] : prev.filter((city) => city !== c))} />
                      {c}
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        ) : (
          <input type="text" required placeholder={`e.g. ${type === 'state' ? 'Maharashtra' : type === 'city' ? 'Mumbai' : 'Main Hub'}`} value={label} onChange={(e) => setLabel(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D9D9D1] rounded-lg outline-none focus:border-[#7B3010]" />
        )}
      </div>

      {!(type === "city" && parentState && (apiCities.length > 0 || apiLoading)) && (
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase text-[#646464]">Value / ID (Optional)</label>
          <input type="text" placeholder="Auto-generated if empty" value={value} onChange={(e) => setValue(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D9D9D1] rounded-lg outline-none focus:border-[#7B3010]" />
        </div>
      )}

      <button type="submit" disabled={loading} className="w-full cursor-pointer py-2.5 mt-2 text-[11px] font-semibold text-white uppercase tracking-wide bg-[#7B3010] hover:bg-[#5c2410] rounded-full disabled:opacity-50 transition-colors">
        {loading ? "Saving..." : `Create ${type}`}
      </button>
    </form>
  );
}