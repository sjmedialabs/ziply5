"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch } from "@/lib/dashboard-fetch";
import { ConsoleTable, ConsoleTd } from "@/components/dashboard/ConsoleTable";

type UserRow = {
  id: string;
  email: string;
  name: string;
  status: string;
  createdAt: string;
  roles: Array<{ role: { key: string; name: string } }>;
};

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    authedFetch<{ items: UserRow[]; total: number }>("/api/v1/users?page=1&limit=100")
      .then((d) => {
        setRows(d.items);
        setTotal(d.total);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">Users</h1>
          <p className="text-sm text-[#646464]">{total} accounts (paginated API).</p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-full border border-[#E8DCC8] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F] hover:bg-[#FFFBF3]"
        >
          Refresh
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {loading && <p className="text-sm text-[#646464]">Loading…</p>}

      {!loading && (
        <ConsoleTable headers={["Name", "Email", "Roles", "Status", "Joined"]}>
          {rows.length === 0 ? (
            <tr>
              <ConsoleTd colSpan={5} className="py-8 text-center text-[#646464]">
                No users.
              </ConsoleTd>
            </tr>
          ) : (
            rows.map((u) => (
              <tr key={u.id} className="hover:bg-[#FFFBF3]/80">
                <ConsoleTd className="font-medium">{u.name}</ConsoleTd>
                <ConsoleTd>{u.email}</ConsoleTd>
                <ConsoleTd className="text-[12px] capitalize">
                  {u.roles.map((r) => r.role.key.replaceAll("_", " ")).join(", ") || "—"}
                </ConsoleTd>
                <ConsoleTd className="capitalize">{u.status}</ConsoleTd>
                <ConsoleTd className="text-[12px] text-[#646464]">{new Date(u.createdAt).toLocaleDateString()}</ConsoleTd>
              </tr>
            ))
          )}
        </ConsoleTable>
      )}
    </section>
  );
}
