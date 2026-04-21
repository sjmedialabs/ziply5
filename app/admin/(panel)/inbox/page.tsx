"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authedFetch, authedPatch } from "@/lib/dashboard-fetch";
import { ConsoleTable, ConsoleTd } from "@/components/dashboard/ConsoleTable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Trash2, RefreshCw, Mail, X } from "lucide-react";

type InboxRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: "open" | "contacted" | "closed";
  createdAt: string;
};

const STATUSES = ["open", "contacted", "closed"] as const;

export default function AdminInboxPage() {
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingRow, setViewingRow] = useState<InboxRow | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isSilentRefresh = false) => {
    if (!isSilentRefresh) setLoading(true);
    else setRefreshing(true);
    
    setError("");
    try {
      // Try live API first, fallback to mock data if it fails/404s
      const res: any = await authedFetch("/api/v1/inbox");
      const messages = Array.isArray(res) ? res : (res?.data || []);
      
      if (messages.length > 0) {
        setRows(messages);
        const d: Record<string, string> = {};
        messages.forEach((t: InboxRow) => { d[t.id] = t.status; });
        setDraft(d);
      } else {
        setRows([]);
      }
    } catch (err: any) {
      console.error("Inbox fetch error:", err);
      setError(err?.message || "Failed to load inbox data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    
    // Poll every 30 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [loadData]);

  const apply = async (id: string) => {
    const status = draft[id];
    if (!status) return;
    setUpdating(id);
    try {
      await authedPatch(`/api/v1/inbox/${id}`, { status });
      await loadData(true); // Refresh without full loading spinner
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await authedFetch(`/api/v1/inbox/${deletingId}`, { method: "DELETE" });
      await loadData(true); // Refresh without full loading spinner
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete message");
    } finally {
      setDeletingId(null);
    }
  };

  const openCount = rows.filter((r) => r.status === "open").length;
  const filteredRows = rows.filter((r) => {
    if (tab === "closed") return r.status === "closed";
    if (tab === "contacted") return r.status === "contacted";
    return true; // "all"
  });

  return (
    <>
      {/* VIEW DETAILS MODAL */}
      {viewingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <h3 className="text-xl font-bold font-melon text-[#4A1D1F]">Message Details</h3>
              <button onClick={() => setViewingRow(null)} className="text-gray-400 hover:text-gray-800 transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 text-sm text-[#646464]">
              <div className="flex justify-between">
                <span className="font-semibold text-black">Name:</span> <span>{viewingRow.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-black">Email:</span> <span>{viewingRow.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-black">Phone:</span> <span>{viewingRow.phone || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-black">Date:</span> <span>{new Date(viewingRow.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black">Status:</span>
                <span className="uppercase tracking-wide text-[10px] font-bold bg-gray-100 text-gray-800 px-2 py-1 rounded-md">{viewingRow.status.replace("_", " ")}</span>
              </div>
              <div className="pt-3 border-t border-gray-100 mt-2">
                <span className="font-semibold text-black block mb-2">Message:</span>
                <div className="bg-[#FFFBF3] border border-[#E8DCC8] p-4 rounded-lg whitespace-pre-wrap leading-relaxed text-[#4A1D1F]">{viewingRow.message}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE TOAST / CONFIRMATION */}
      {deletingId && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-white p-5 shadow-2xl border border-[#E8DCC8] w-80 animate-in slide-in-from-bottom-5">
          <h3 className="text-[15px] font-bold text-[#4A1D1F] mb-1">Delete Message?</h3>
          <p className="text-[13px] text-[#646464] mb-4">Are you sure you want to delete this message? This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeletingId(null)} className="px-4 py-2 text-xs font-semibold text-[#4A1D1F] hover:bg-[#FFFBF3] rounded-lg border border-[#E8DCC8] transition-colors cursor-pointer">
              Cancel
            </button>
            <button onClick={confirmDelete} className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer">
              Delete
            </button>
          </div>
        </div>
      )}

    <section className="mx-auto max-w-7xl space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">
            Inbox
          </h1>
          <p className="text-sm text-[#646464] mt-1">Website contact queries and messages.</p>
        </div>
        <button
          type="button"
          onClick={() => loadData()}
          disabled={loading || refreshing}
          className="rounded-full border border-[#E8DCC8] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F] hover:bg-[#FFFBF3] flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* STATS BAR */}
      <div className="flex flex-wrap gap-3">
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">{openCount} Open</span>
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">{rows.filter(r => r.status === 'contacted').length} Contacted</span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">Total: {rows.length}</span>
      </div>

      {/* TABS */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full max-w-[300px] grid-cols-3 h-auto cursor-pointer">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="contacted">Contacted</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
        </TabsList>
      </Tabs>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {loading && <p className="text-sm text-[#646464]">Loading inbox...</p>}

      {/* TABLE */}
      {!loading && (
        <ConsoleTable headers={["Sender", "Phone", "Message", "Date", "Status", "Actions"]}>
          {filteredRows.length === 0 ? (
            <tr>
              <ConsoleTd colSpan={6} className="py-12 text-center text-[#646464]">
                No messages yet.
              </ConsoleTd>
            </tr>
          ) : (
            filteredRows.map((row) => (
              <tr key={row.id} className="group hover:bg-[#FFFBF3]/80">
                {/* AVATAR & NAME */}
                <ConsoleTd className="align-middle">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-800">
                      {row.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col max-w-[140px]">
                      <span className="truncate text-[13px] font-medium text-[#4A1D1F]">
                        {row.name}
                      </span>
                      <span className="truncate text-[11px] text-[#646464]">{row.email}</span>
                    </div>
                  </div>
                </ConsoleTd>

                {/* PHONE */}
                <ConsoleTd className="align-middle">
                  <span className="text-sm text-[#646464] whitespace-nowrap">{row.phone || "N/A"}</span>
                </ConsoleTd>

                {/* MESSAGE */}
                <ConsoleTd className="align-middle max-w-[350px]">
                  <p className="text-sm line-clamp-1 text-[#646464]" title={row.message}>
                    {row.message}
                  </p>
                </ConsoleTd>

                {/* DATE */}
                <ConsoleTd className="align-middle text-xs text-[#646464] whitespace-nowrap">
                  {new Date(row.createdAt).toLocaleDateString()}
                </ConsoleTd>

                {/* STATUS */}
                <ConsoleTd className="align-middle">
                  <div className="flex items-center gap-2">
                    <select
                      value={draft[row.id] ?? row.status}
                      onChange={(e) => setDraft((d) => ({ ...d, [row.id]: e.target.value }))}
                      className="w-[100px] rounded-lg border border-[#D9D9D1] bg-white px-2 py-1 text-[11px] capitalize cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
                      ))}
                    </select>
                    <button type="button" disabled={updating === row.id || (draft[row.id] ?? row.status) === row.status} onClick={() => apply(row.id)} className="rounded-md cursor-pointer bg-[#7B3010] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white disabled:opacity-40 hover:bg-[#5a220b] transition-colors">
                      {updating === row.id ? "…" : "Apply"}
                    </button>
                  </div>
                </ConsoleTd>

                {/* ACTIONS */}
                <ConsoleTd className="align-middle">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" title="View Details" onClick={() => setViewingRow(row)} className="rounded-lg cursor-pointer border border-[#E8DCC8] p-1.5 text-[#4A1D1F] hover:bg-[#FFFBF3] transition-colors">
                      <Eye size={14} />
                    </button>
                    <a href={`mailto:${row.email}`} title="Reply via Email" className="rounded-lg border border-[#E8DCC8] p-1.5 text-[#4A1D1F] hover:bg-[#FFFBF3] transition-colors">
                      <Mail size={14} />
                    </a>
                    <button type="button" title="Delete" onClick={() => setDeletingId(row.id)} className="rounded-lg border border-[#E8DCC8] p-1.5 text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </ConsoleTd>
              </tr>
            ))
          )}
        </ConsoleTable>
      )}
    </section>
    </>
  );
}
