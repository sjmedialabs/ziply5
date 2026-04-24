"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch } from "@/lib/dashboard-fetch";
import { ConsoleTable, ConsoleTd } from "@/components/dashboard/ConsoleTable";
import LocationCreatorForm from "../../../../components/ui/LocationCreatorForm";
import { useLocations } from "../../../../hooks/useLocations";
import MasterDataCreatorForm from "../../../../components/ui/MasterDataCreatorForm";
import { Trash2 } from "lucide-react";

type SettingRow = {
  id: string;
  group: string;
  key: string;
  valueJson: unknown;
};

export default function AdminSettingsPage() {
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"generic" | "locations" | "master_data">("generic");

  const { data: warehouses, refetch: refetchWarehouses, loading: loadingWarehouses } = useLocations("warehouse", undefined);
  const { data: states, refetch: refetchStates, loading: loadingStates } = useLocations("state", undefined);
  const { data: cities, refetch: refetchCities, loading: loadingCities } = useLocations("city", undefined);


  const load = useCallback(() => {
    setLoading(true);
    setError("");
    authedFetch<SettingRow[]>("/api/v1/settings")
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const preview = (v: unknown) => {
    try {
      return JSON.stringify(v).slice(0, 120) + (JSON.stringify(v).length > 120 ? "…" : "");
    } catch {
      return "—";
    }
  };

  const handleLocationChange = () => {
    refetchWarehouses();
    refetchStates();
    refetchCities();
  };

  const handleDeleteLocation = async (type: 'warehouse' | 'state' | 'city', identifier: { id?: string, key?: string }) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}? This might also delete associated cities.`)) return;

    try {
      await authedFetch('/api/admin/locations', {
        method: 'DELETE',
        body: JSON.stringify({ type, ...identifier })
      });
      handleLocationChange(); // refetch all
    } catch (err: any) {
      alert(`Error deleting ${type}: ${err.message}`);
    }
  };
  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Settings</h1>
          <p className="text-sm text-[#646464]">Key–value store for shop config and location masters.</p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-full border border-[#E8DCC8] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F] hover:bg-[#FFFBF3]"
        >
          Refresh
        </button>
      </div>

      <div className="flex gap-4 border-b border-[#E8DCC8]">
        <button
          className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 'generic' ? 'border-b-2 border-[#7B3010] text-[#7B3010]' : 'text-[#646464] hover:text-[#2A1810]'}`}
          onClick={() => setActiveTab('generic')}
        >
          Generic Settings
        </button>
        <button
          className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 'locations' ? 'border-b-2 border-[#7B3010] text-[#7B3010]' : 'text-[#646464] hover:text-[#2A1810]'}`}
          onClick={() => setActiveTab('locations')}
        >
          Location Management
        </button>
        <button
          className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 'master_data' ? 'border-b-2 border-[#7B3010] text-[#7B3010]' : 'text-[#646464] hover:text-[#2A1810]'}`}
          onClick={() => setActiveTab('master_data')}
        >
          Dropdowns 
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {loading && <p className="text-sm text-[#646464]">Loading…</p>}

      {!loading && activeTab === 'generic' && (
        <ConsoleTable headers={["Group", "Key", "Value (JSON)"]}>
          {rows.length === 0 ? (
            <tr>
              <ConsoleTd colSpan={3} className="py-8 text-center text-[#646464]">
                No settings rows. Upsert via POST /api/v1/settings with {"{"} group, key, valueJson {"}"}.
              </ConsoleTd>
            </tr>
          ) : (
            rows.map((s) => (
              <tr key={s.id} className="hover:bg-[#FFFBF3]/80">
                <ConsoleTd>
                  <code className="text-[12px]">{s.group}</code>
                </ConsoleTd>
                <ConsoleTd>
                  <code className="text-[12px]">{s.key}</code>
                </ConsoleTd>
                <ConsoleTd className="max-w-md break-all font-mono text-[11px] text-[#646464]">{preview(s.valueJson)}</ConsoleTd>
              </tr>
            ))
          )}
        </ConsoleTable>
      )}

      {!loading && activeTab === 'locations' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <LocationCreatorForm type="warehouse" onSuccess={handleLocationChange} />
            <LocationCreatorForm type="state" onSuccess={handleLocationChange} />
            <LocationCreatorForm type="city" onSuccess={handleLocationChange} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {/* Warehouses List */}
            <div>
              <h3 className="font-semibold text-[#4A1D1F] mb-2">Warehouses</h3>
              <div className="bg-white p-2 rounded-xl border border-[#E8DCC8] shadow-sm space-y-1 max-h-96 overflow-y-auto">
                {loadingWarehouses ? <p className="p-2 text-sm text-gray-500">Loading...</p> : warehouses?.map(w => (
                  <div key={w.value} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg">
                    <span className="text-sm">{w.label}</span>
                    <button onClick={() => handleDeleteLocation('warehouse', { id: w.value })} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* States List */}
            <div>
              <h3 className="font-semibold text-[#4A1D1F] mb-2">States</h3>
              <div className="bg-white p-2 rounded-xl border border-[#E8DCC8] shadow-sm space-y-1 max-h-96 overflow-y-auto">
                {loadingStates ? <p className="p-2 text-sm text-gray-500">Loading...</p> : states?.map(s => (
                  <div key={s.value} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg">
                    <span className="text-sm">{s.label} ({s.value})</span>
                    <button onClick={() => handleDeleteLocation('state', { key: s.label })} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Cities List */}
            <div>
              <h3 className="font-semibold text-[#4A1D1F] mb-2">Cities</h3>
              <div className="bg-white p-2 rounded-xl border border-[#E8DCC8] shadow-sm space-y-1 max-h-96 overflow-y-auto">
                {loadingCities ? <p className="p-2 text-sm text-gray-500">Loading...</p> : cities?.map(c => (
                  <div key={c.value} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg">
                    <span className="text-sm">{c.label}</span>
                    <button onClick={() => handleDeleteLocation('city', { key: c.label })} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {!loading && activeTab === 'master_data' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MasterDataCreatorForm groupKey="ORDER_STATUSES" groupName="Order Statuses" />
          <MasterDataCreatorForm groupKey="RETURN_REASONS" groupName="Return Reasons" />
        </div>
      )}
    </section>
  );
}
