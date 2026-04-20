"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch } from "@/lib/dashboard-fetch";

import { ConsoleTable, ConsoleTd } from "@/components/dashboard/ConsoleTable";
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  // Modal State
  const [open, setOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Submit State
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");

    authedFetch<{ items: UserRow[]; total: number }>(
      "/api/v1/users?page=1&limit=100"
    )
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

  // Submit Handler
  const handleCreateUser = async () => {
    try {
      setSubmitting(true);
      setSuccessMsg("");
      setError("");

      await authedFetch("/api/v1/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          role: "customer",
          isFromAdmin: true,
        }),
      });

      setSuccessMsg("User created successfully 🎉");

      // Reset form
      setName("");
      setEmail("");
      setPassword("");

      // Reload users list
      load();

      // Close modal after short delay
      setTimeout(() => {
        setOpen(false);
        setSuccessMsg("");
      }, 1500);
    } catch (e: any) {
      setError(e.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">
            Users
          </h1>
          <p className="text-sm text-[#646464]">
            {total} accounts (paginated API).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => load()}
            className="rounded-full border border-[#E8DCC8] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#4A1D1F] hover:bg-[#FFFBF3]"
          >
            Refresh
          </button>

          <Button
            onClick={() => setOpen(true)}
            className="bg-[#4A1D1F] rounded-full cursor-pointer text-xs h-[30px] text-white hover:bg-[#4A1D1F]/90"
          >
            Add User
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {loading && (
        <p className="text-sm text-[#646464]">Loading…</p>
      )}

      {!loading && (
        <ConsoleTable
          headers={["Name", "Email", "Roles", "Status", "Joined"]}
        >
          {rows.length === 0 ? (
            <tr>
              <ConsoleTd
                colSpan={5}
                className="py-8 text-center text-[#646464]"
              >
                No users.
              </ConsoleTd>
            </tr>
          ) : (
            rows.map((u) => (
              <tr
                key={u.id}
                className="hover:bg-[#FFFBF3]/80"
              >
                <ConsoleTd className="font-medium">
                  {u.name}
                </ConsoleTd>

                <ConsoleTd>{u.email}</ConsoleTd>

                <ConsoleTd className="text-[12px] capitalize">
                  {u.roles
                    .map((r) =>
                      r.role.key.replaceAll("_", " ")
                    )
                    .join(", ") || "—"}
                </ConsoleTd>

                <ConsoleTd className="capitalize">
                  {u.status}
                </ConsoleTd>

                <ConsoleTd className="text-[12px] text-[#646464]">
                  {new Date(
                    u.createdAt
                  ).toLocaleDateString()}
                </ConsoleTd>
              </tr>
            ))
          )}
        </ConsoleTable>
      )}

      {/* Add User Modal */}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">

            {/* Name */}

            <div className="space-y-1">
              <Label>Name</Label>

              <Input
                placeholder="Enter full name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
              />
            </div>

            {/* Email */}

            <div className="space-y-1">
              <Label>Email</Label>

              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
              />
            </div>

            {/* Password */}

            <div className="space-y-1">
              <Label>Password</Label>

              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
              />
            </div>

            {/* Success Message */}

            {successMsg && (
              <p className="text-sm text-green-600">
                {successMsg}
              </p>
            )}

          </div>

          <DialogFooter className="mt-4">

            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>

            <Button
              onClick={handleCreateUser}
              disabled={submitting}
              className="bg-[#4A1D1F] text-white hover:bg-[#4A1D1F]/90"
            >
              {submitting
                ? "Creating..."
                : "Create User"}
            </Button>

          </DialogFooter>
        </DialogContent>
      </Dialog>

    </section>
  );
}