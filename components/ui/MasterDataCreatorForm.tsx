"use client";

import { useState } from "react";
import { useMasterValues, useMasterGroups } from "@/hooks/useMasterData";
import { authedFetch } from "@/lib/dashboard-fetch";

type Props = {
  groupKey: string;
  groupName: string;
};

export default function MasterDataCreatorForm({ groupKey, groupName }: Props) {
  const { data: values, refetch, isLoading } = useMasterValues(groupKey);
  const { data: groups, refetch: refetchGroups } = useMasterGroups();
  
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label || !value) return;
    setIsSubmitting(true);
    setError("");

    try {
      // Auto-create Master Group if it doesn't exist yet
      const groupExists = groups?.find((g) => g.key === groupKey);
      if (!groupExists) {
        await authedFetch("/api/master/groups", {
          method: "POST",
          body: JSON.stringify({ key: groupKey, name: groupName }),
        });
        await refetchGroups();
      }

      // Create the new Master Value
      await authedFetch("/api/master/values", {
        method: "POST",
        body: JSON.stringify({
          groupKey,
          label,
          value,
          sortOrder: values ? values.length + 1 : 0,
          isActive: true,
        }),
      });

      setLabel("");
      setValue("");
      refetch();
    } catch (err: any) {
      setError(err.message || "Failed to add value");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#E8DCC8] bg-white p-4 shadow-sm">
      <h3 className="mb-4 font-semibold text-[#4A1D1F]">{groupName} ({groupKey})</h3>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="w-full rounded-md border border-[#E8DCC8] px-3 py-2 text-sm outline-none focus:border-[#7B3010]"
          placeholder="Label (e.g. Processing)"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            if (!value) setValue(e.target.value.toLowerCase().replace(/\s+/g, "_"));
          }}
          required
        />
        <input
          className="w-full rounded-md border border-[#E8DCC8] px-3 py-2 text-sm outline-none focus:border-[#7B3010]"
          placeholder="Value (e.g. processing)"
          value={value}
          onChange={(e) => setValue(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
          required
        />
        <button disabled={isSubmitting} className="rounded-md bg-[#4A1D1F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          Add
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <div className="mt-4 flex flex-col gap-1 max-h-64 overflow-y-auto">
        {isLoading ? <p className="text-xs text-gray-500">Loading...</p> : values?.map((v) => (
          <div key={v.id} className="flex justify-between rounded-md bg-gray-50 px-3 py-2 text-sm border border-gray-100">
            <span>{v.label}</span>
            <span className="font-mono text-xs text-gray-500">{v.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}