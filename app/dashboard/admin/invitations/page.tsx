"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

type Invitation = {
  id: string;
  email: string;
  title: "CEO" | "CTO" | "COO";
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  createdBy?: { firstName: string | null; lastName: string | null; email: string };
};

const CONFIGURED_API_URL = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") || "";

function getApiUrl() {
  if (CONFIGURED_API_URL) return CONFIGURED_API_URL;
  if (typeof window !== "undefined" && window.location.port === "3000") {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return "";
}

export default function AdminInvitationsPage() {
  const { getToken } = useAuth();
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState<"CEO" | "CTO" | "COO">("CEO");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [createdLink, setCreatedLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const request = useCallback(async (path: string, method = "GET", body?: unknown) => {
    const token = await getToken();
    if (!token) throw new Error("Your session has expired. Sign in again.");

    const response = await fetch(`${getApiUrl()}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || data?.message || "The request could not be completed.");
    }
    return data;
  }, [getToken]);

  const loadInvitations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await request("/api/v1/admin/dashboard/invitations");
      setInvitations(result?.data?.invitations ?? []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load invitations.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  async function createInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    setCreatedLink("");

    try {
      const result = await request("/api/v1/admin/dashboard/invitations", "POST", { email, title });
      setCreatedLink(result?.data?.invitationUrl ?? "");
      setEmail("");
      setNotice("Invitation created. Copy the link and share it with the executive.");
      await loadInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create invitation.");
    } finally {
      setSaving(false);
    }
  }

  async function revokeInvitation(id: string) {
    if (!window.confirm("Revoke this pending invitation? The link will stop working.")) return;
    setError("");
    setNotice("");
    try {
      await request(`/api/v1/admin/dashboard/invitations/${encodeURIComponent(id)}/revoke`, "PATCH");
      setNotice("Invitation revoked.");
      await loadInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to revoke invitation.");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(createdLink);
      setNotice("Invitation link copied.");
    } catch {
      setError("Could not access the clipboard. Select and copy the link manually.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 md:px-8">
      <div className="mx-auto max-w-6xl space-y-7">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Administration</p>
          <h1 className="mt-2 text-2xl font-bold">Executive invitations</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Invite your CEO, CTO or COO to the existing admin dashboard. Each invitation is email-bound, expires after 72 hours and can only be used once.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Create an invitation</h2>
          <form onSubmit={createInvitation} className="mt-4 grid gap-4 md:grid-cols-[1fr_180px_auto] md:items-end">
            <label className="block text-sm font-medium">
              Executive email
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="executive@company.com"
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-600"
              />
            </label>
            <label className="block text-sm font-medium">
              Position
              <select
                value={title}
                onChange={(event) => setTitle(event.target.value as "CEO" | "CTO" | "COO")}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm"
              >
                <option value="CEO">CEO</option>
                <option value="CTO">CTO</option>
                <option value="COO">COO</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create invitation"}
            </button>
          </form>

          {createdLink && (
            <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-950">Invitation link — copy and share securely</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input readOnly value={createdLink} className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs text-slate-700" />
                <button type="button" onClick={() => void copyLink()} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
                  Copy link
                </button>
              </div>
              <p className="mt-2 text-xs text-blue-900">This link is shown only when created. The server stores only its token hash.</p>
            </div>
          )}

          {notice && <p role="status" className="mt-4 text-sm text-green-700">{notice}</p>}
          {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-semibold">Organization invitations</h2>
              <p className="mt-1 text-xs text-slate-500">Only invitations belonging to your organization are shown.</p>
            </div>
            <button onClick={() => void loadInvitations()} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50">
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="p-6 text-sm text-slate-500">Loading invitations...</p>
          ) : invitations.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No executive invitations have been created.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Executive</th>
                    <th className="px-5 py-3">Position</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Expires</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invitations.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4 font-medium">{item.email}</td>
                      <td className="px-5 py-4">{item.title}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{item.status}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{new Date(item.expiresAt).toLocaleString()}</td>
                      <td className="px-5 py-4">
                        {item.status === "PENDING" && new Date(item.expiresAt) > new Date() ? (
                          <button onClick={() => void revokeInvitation(item.id)} className="text-xs font-semibold text-red-700 hover:underline">
                            Revoke
                          </button>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
