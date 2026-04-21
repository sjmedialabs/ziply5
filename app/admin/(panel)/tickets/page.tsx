"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authedFetch, authedPatch } from "@/lib/dashboard-fetch";
import { ConsoleTable, ConsoleTd } from "@/components/dashboard/ConsoleTable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Headphones, Eye, Trash2, RefreshCw } from "lucide-react";

type TicketRow = {
  id: string;
  type: "ticket" | "mention" | "alert";
  subject: string;
  preview: string;
  sender: { name: string; avatar: string; email: string };
  status: "open" | "in_progress" | "resolved" | "closed";
  unread: boolean;
  date: string;
  priority?: "normal" | "urgent";
};

const STATUSES = ["open", "in_progress", "resolved", "closed"] as const;

// Generate fallback rows based on rich templates
const generateFallbackRows = (): TicketRow[] => {
  const templates: Omit<TicketRow, "id">[] = [
    {
      type: "ticket",
      subject: "Order #123 delayed?",
      preview: "Hi team, my delivery was supposed to arrive yesterday but I haven't received any updates yet. Can you please check?",
      sender: { name: "John Doe (customer)", avatar: "JD", email: "john@example.com" },
      status: "open",
      unread: true,
      date: "2h ago",
      priority: "urgent",
    },
    {
      type: "mention",
      subject: "Mentioned in #405",
      preview: "@admin can we get an approval for this refund request?",
      sender: { name: "Sarah Smith (agent)", avatar: "SS", email: "sarah@ziply5.com" },
      status: "in_progress",
      unread: true,
      date: "4h ago",
      priority: "normal",
    },
    {
      type: "alert",
      subject: "High Server Load",
      preview: "The main API server is experiencing unusually high load (90% CPU).",
      sender: { name: "System Alert", avatar: "SA", email: "noreply@ziply5.com" },
      status: "open",
      unread: false,
      date: "5h ago",
      priority: "urgent",
    },
    {
      type: "ticket",
      subject: "Missing item in delivery",
      preview: "I ordered the special combo but the extra fries were missing from the package.",
      sender: { name: "Emily Chen (customer)", avatar: "EC", email: "emily.c@example.com" },
      status: "resolved",
      unread: false,
      date: "1d ago",
      priority: "normal",
    },
    {
      type: "ticket",
      subject: "Question about ingredients",
      preview: "Does the Cashew Chicken contain any dairy products? I am highly allergic.",
      sender: { name: "Michael B. (customer)", avatar: "MB", email: "mikeb@example.com" },
      status: "open",
      unread: true,
      date: "1d ago",
      priority: "urgent",
    },
  ];

  return Array.from({ length: 20 }).map((_, i) => ({
    ...templates[i % templates.length],
    id: `MSG-${1000 + i}`,
    unread: i < 12, 
  }));
};

const FALLBACK_ROWS = generateFallbackRows();

export default function AdminTicketsPage() {
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const loadData = useCallback(async (isSilentRefresh = false) => {
    if (!isSilentRefresh) setLoading(true);
    else setRefreshing(true);
    
    setError("");
    try {
      const res = await authedFetch<any[]>("/api/v1/tickets");
      
      if (res && res.length > 0) {
        // Map the real Ticket format to the rich UI format
        const mapped: TicketRow[] = res.map((t) => ({
          id: t.id,
          type: "ticket",
          subject: t.subject || "No Subject",
          preview: "Ticket opened via support portal.",
          sender: { 
            name: t.createdBy?.name || "Unknown", 
            avatar: t.createdBy?.name?.[0]?.toUpperCase() || "U", 
            email: t.createdBy?.email || "No email" 
          },
          status: t.status || "open",
          unread: false,
          date: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "Just now",
        }));
        
        setRows(mapped);
        const d: Record<string, string> = {};
        mapped.forEach((t) => { d[t.id] = t.status; });
        setDraft(d);
      } else {
        setRows(FALLBACK_ROWS);
        const d: Record<string, string> = {};
        FALLBACK_ROWS.forEach((t) => { d[t.id] = t.status; });
        setDraft(d);
      }
    } catch (err) {
      console.warn("API not ready yet, using fallback data.");
      setRows(FALLBACK_ROWS);
      const d: Record<string, string> = {};
      FALLBACK_ROWS.forEach((t) => { d[t.id] = t.status; });
      setDraft(d);
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
      await authedPatch(`/api/v1/tickets/${id}`, { status });
      await loadData(true); // Silent refresh to pick up the updated status
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setUpdating(null);
    }
  };

  const unreadCount = rows.filter((r) => r.unread).length;
  const filteredRows = rows.filter((r) => {
    if (tab === "tickets") return r.type === "ticket";
    if (tab === "mentions") return r.type === "mention";
    if (tab === "alerts") return r.type === "alert";
    return true; // "all"
  });

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">
            Tickets {unreadCount > 0 && `(${unreadCount} unread)`}
          </h1>
          <p className="text-sm text-[#646464] mt-1">Manage and respond to support tickets.</p>
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
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">24 New</span>
        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">7 Urgent</span>
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">56 Open</span>
      </div>

      {/* TABS */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-4 h-auto cursor-pointer">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="mentions">Mentions</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>
      </Tabs>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {loading && <p className="text-sm text-[#646464]">Loading tickets...</p>}

      {/* TABLE */}
      {!loading && (
        <ConsoleTable headers={["Sender", "Subject", "Preview", "Date", "Status", "Actions"]}>
          {filteredRows.length === 0 ? (
            <tr>
              <ConsoleTd colSpan={6} className="py-12 text-center text-[#646464]">
                No tickets found.
              </ConsoleTd>
            </tr>
          ) : (
            filteredRows.map((t) => (
              <tr key={t.id} className={`group hover:bg-[#FFFBF3]/80 ${t.unread ? "bg-[#FFFBF3]/40" : ""}`}>
                {/* AVATAR & NAME */}
                <ConsoleTd className="align-middle">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-800">
                      {t.sender.avatar}
                    </div>
                    <div className="flex flex-col max-w-[140px]">
                      <span className={`truncate text-[13px] ${t.unread ? "font-bold text-[#4A1D1F]" : "font-medium text-[#4A1D1F]"}`}>
                        {t.sender.name}
                      </span>
                      <span className="truncate text-[11px] text-[#646464]">{t.sender.email}</span>
                    </div>
                  </div>
                </ConsoleTd>

                {/* SUBJECT */}
                <ConsoleTd className="align-middle">
                  <div className={`max-w-[220px] truncate text-[13px] ${t.unread ? "font-bold text-[#4A1D1F]" : "font-medium text-[#4A1D1F]"}`}>
                    {t.unread && <span className="inline-block w-2 h-2 mr-2 rounded-full bg-blue-500 animate-pulse" title="Unread" />}
                    {t.subject}
                  </div>
                </ConsoleTd>

                {/* PREVIEW */}
                <ConsoleTd className="align-middle max-w-[300px]">
                  <p className="text-sm text-[#646464] line-clamp-2" title={t.preview}>
                    {t.preview}
                  </p>
                </ConsoleTd>

                {/* DATE */}
                <ConsoleTd className="align-middle text-xs text-[#646464] whitespace-nowrap">
                  {t.date}
                </ConsoleTd>

                {/* STATUS with dropdown */}
                <ConsoleTd className="align-middle">
                  <div className="flex items-center gap-2">
                    <select
                      value={draft[t.id] ?? t.status}
                      onChange={(e) => setDraft((d) => ({ ...d, [t.id]: e.target.value }))}
                      className="w-[110px] rounded-lg border border-[#D9D9D1] bg-white px-2 py-1 text-[11px] capitalize cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={updating === t.id || (draft[t.id] ?? t.status) === t.status}
                      onClick={() => apply(t.id)}
                      className="rounded-md bg-[#7B3010] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white disabled:opacity-40 hover:bg-[#5a220b] transition-colors"
                    >
                      {updating === t.id ? "…" : "Apply"}
                    </button>
                  </div>
                </ConsoleTd>

                {/* ACTIONS */}
                <ConsoleTd className="align-middle">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/tickets/${t.id}`} className="rounded-lg bg-orange-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-orange-900 hover:bg-orange-200 flex items-center gap-1.5 transition-colors">
                      <Headphones size={12} /> Reply
                    </Link>
                    <button type="button" title="View" className="rounded-lg border border-[#E8DCC8] p-1.5 text-[#4A1D1F] hover:bg-[#FFFBF3] transition-colors">
                      <Eye size={14} />
                    </button>
                    <button type="button" title="Archive" className="rounded-lg border border-[#E8DCC8] p-1.5 text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors">
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
  );
}
