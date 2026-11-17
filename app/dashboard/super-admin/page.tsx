"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UserButton, useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

type Permission = { id: string; name: string; resource: string; action: string; description?: string | null };
type AdminAccount = {
  id: string; email: string; firstName: string | null; lastName: string | null;
  role: "ADMIN"; isActive: boolean; permissions: Permission[]; createdAt: string;
};
type AdminInvitation = {
  id: string; email: string; firstName: string; lastName: string;
  status: "PENDING" | "FAILED"; expiresAt: string; createdAt: string;
  failureReason?: string | null; permissions: Permission[];
};
type ApiResponse<T> = { success: boolean; data: T; message?: string };
const field = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100";

export default function SuperAdminDashboard() {
  const { getToken } = useAuth();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [a, p] = await Promise.all([
        apiFetch<ApiResponse<{ admins: AdminAccount[]; invitations: AdminInvitation[] }>>("/api/v1/super-admin/admins", getToken),
        apiFetch<ApiResponse<{ permissions: Permission[] }>>("/api/v1/super-admin/permissions", getToken),
      ]);
      setAdmins(a.data.admins); setInvitations(a.data.invitations ?? []); setPermissions(p.data.permissions);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load administrator access."); }
    finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { void load(); }, [load]);

  const groups = useMemo(() => permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.resource] ??= []).push(p); return acc;
  }, {}), [permissions]);

  function togglePermission(id: string) {
    setSelected(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  }
  function startCreate() {
    setFirstName(""); setLastName(""); setEmail(""); setSelected([]);
    setEditing(null); setCreating(true); setError(""); setNotice("");
  }
  function startEdit(admin: AdminAccount) {
    setSelected(admin.permissions.map(p => p.id)); setEditing(admin); setCreating(false);
    setError(""); setNotice("");
  }

  async function createAdmin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      await apiFetch("/api/v1/super-admin/admins", getToken, {
        method: "POST",
        body: JSON.stringify({
          firstName: firstName.trim(), lastName: lastName.trim(),
          email: email.trim().toLowerCase(), role: "ADMIN", permissionIds: selected,
        }),
      });
      setCreating(false);
      setNotice("Admin account created. The secure sign-in/setup email has been sent.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create admin account."); }
    finally { setSaving(false); }
  }

  async function savePermissions() {
    if (!editing) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await apiFetch(`/api/v1/super-admin/admins/${encodeURIComponent(editing.id)}/permissions`, getToken, {
        method: "PATCH", body: JSON.stringify({ permissionIds: selected }),
      });
      setEditing(null); setNotice("Administrator privileges updated."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update privileges."); }
    finally { setSaving(false); }
  }

  async function changeStatus(admin: AdminAccount) {
    const isActive = !admin.isActive;
    if (!window.confirm(`${isActive ? "Reactivate" : "Deactivate"} access for ${admin.email}?`)) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await apiFetch(`/api/v1/super-admin/admins/${encodeURIComponent(admin.id)}/status`, getToken, {
        method: "PATCH", body: JSON.stringify({ isActive }),
      });
      setNotice(isActive ? "Admin account reactivated." : "Admin account deactivated.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update account status."); }
    finally { setSaving(false); }
  }

  async function revokeInvitation(invitation: AdminInvitation) {
    if (!window.confirm(`Revoke the pending invitation for ${invitation.email}?`)) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await apiFetch(`/api/v1/super-admin/invitations/${encodeURIComponent(invitation.id)}/revoke`, getToken, {
        method: "PATCH",
      });
      setNotice("Admin invitation revoked.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to revoke invitation."); }
    finally { setSaving(false); }
  }

  const formOpen = creating || Boolean(editing);
  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-700">Platform governance</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Admin access</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Create platform administrators and control exactly which areas they can access.
              New accounts receive ADMIN privileges only; Super Admin cannot be assigned here.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-slate-700">Profile & password</p>
              <p className="text-[11px] text-slate-500">Manage your account securely</p>
            </div>
            <UserButton />
            <button onClick={startCreate} className="h-11 rounded-xl bg-[#FACC15] px-5 text-sm font-bold text-slate-950 hover:bg-yellow-300">+ Create admin</button>
          </div>
        </header>

        {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {notice && <div role="status" className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</div>}

        {formOpen && (
          <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">{editing ? `Privileges: ${editing.email}` : "Create platform admin"}</h2>
                <p className="mt-1 text-sm text-slate-500">{editing ? "Choose the privileges this administrator should have." : "The system sends a secure sign-in/setup link. Passwords are never emailed."}</p>
              </div>
              <button onClick={() => { setCreating(false); setEditing(null); }} aria-label="Close" className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100">×</button>
            </div>
            {creating && (
              <form onSubmit={createAdmin} className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">First name<input className={field} value={firstName} onChange={e => setFirstName(e.target.value)} required autoComplete="given-name" /></label>
                <label className="text-sm font-semibold">Last name<input className={field} value={lastName} onChange={e => setLastName(e.target.value)} required autoComplete="family-name" /></label>
                <label className="text-sm font-semibold sm:col-span-2">Work email / login email<input className={field} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
                <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <strong>ADMIN</strong><span className="ml-2 text-xs text-slate-500">Platform-wide account, restricted by selected privileges</span>
                </div>
                <div className="sm:col-span-2"><PermissionPicker groups={groups} selected={selected} onToggle={togglePermission} /></div>
                <div className="flex justify-end gap-3 sm:col-span-2">
                  <button type="button" onClick={() => setCreating(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold">Cancel</button>
                  <button disabled={saving} className="rounded-xl bg-[#111827] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Creating..." : "Create admin & send email"}</button>
                </div>
              </form>
            )}
            {editing && <><PermissionPicker groups={groups} selected={selected} onToggle={togglePermission} /><div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold">Cancel</button>
              <button disabled={saving} onClick={() => void savePermissions()} className="rounded-xl bg-[#111827] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save privileges"}</button>
            </div></>}
          </section>
        )}

        {invitations.length > 0 && (
          <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <h2 className="font-bold">Admin invitations</h2>
              <p className="mt-1 text-sm text-slate-500">Pending invitations and delivery failures.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {invitations.map(invitation => (
                <article key={invitation.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{invitation.firstName} {invitation.lastName}</p>
                    <p className="text-sm text-slate-500">{invitation.email}</p>
                    <p className="mt-1 text-xs text-slate-500">{invitation.permissions.length} privileges · Expires {new Date(invitation.expiresAt).toLocaleString()}</p>
                    {invitation.failureReason && <p className="mt-1 text-xs text-red-700">{invitation.failureReason}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${invitation.status === "PENDING" ? "bg-yellow-50 text-yellow-800" : "bg-red-50 text-red-700"}`}>{invitation.status === "PENDING" ? "Pending" : "Delivery failed"}</span>
                    {invitation.status === "PENDING" && <button disabled={saving} onClick={() => void revokeInvitation(invitation)} className="rounded-lg border border-red-200 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">Revoke</button>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div><h2 className="font-bold">Platform administrators</h2><p className="mt-1 text-sm text-slate-500">Manage account access, invitation status, and privileges.</p></div>
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{admins.length} accounts</span>
          </div>
          {loading ? <div className="space-y-3 p-6">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div>
          : admins.length === 0 ? <div className="px-6 py-14 text-center"><p className="font-semibold">No platform admins found</p><p className="mt-1 text-sm text-slate-500">Create the first delegated administrator when ready.</p></div>
          : <div className="divide-y divide-slate-100">{admins.map(admin => {
            const name = [admin.firstName, admin.lastName].filter(Boolean).join(" ") || admin.email;
            return <article key={admin.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-bold">{name}</h3>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${admin.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{admin.isActive ? "Active" : "Inactive"}</span>
                {admin.invitationStatus === "PENDING" && <span className="rounded-full bg-yellow-50 px-2.5 py-1 text-[10px] font-bold text-yellow-800">Invitation pending</span>}
              </div><p className="mt-1 text-sm text-slate-500">{admin.email}</p><p className="mt-2 text-xs text-slate-500">ADMIN · {admin.permissions.length} assigned permissions</p></div>
              <div className="flex flex-wrap gap-2"><button onClick={() => startEdit(admin)} className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-bold hover:bg-slate-50">Edit privileges</button>
                <button disabled={saving} onClick={() => void changeStatus(admin)} className={`rounded-lg px-3.5 py-2 text-xs font-bold disabled:opacity-50 ${admin.isActive ? "border border-red-200 text-red-700 hover:bg-red-50" : "bg-slate-900 text-white"}`}>{admin.isActive ? "Deactivate" : "Reactivate"}</button></div>
            </article>;
          })}</div>}
          <div className="border-t border-slate-100 px-5 py-4 text-xs leading-5 text-slate-500 sm:px-6">
            Super Admin accounts must be excluded and protected server-side. The backend must also prevent removal or deactivation of the last active Super Admin.
          </div>
        </section>
      </div>
    </main>
  );
}

function PermissionPicker({ groups, selected, onToggle }: {
  groups: Record<string, Permission[]>; selected: string[]; onToggle: (id: string) => void;
}) {
  const resources = Object.keys(groups).sort();
  if (!resources.length) return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">The backend permission catalogue has not loaded. It must return the available permissions before access can be assigned.</div>;
  return <div className="mt-2">
    <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">Assigned privileges</h3><span className="text-xs text-slate-500">{selected.length} selected</span></div>
    <div className="grid gap-3 lg:grid-cols-2">{resources.map(resource => <fieldset key={resource} className="rounded-xl border border-slate-200 p-4">
      <legend className="px-1 text-sm font-bold capitalize text-slate-800">{resource.replace(/[_-]/g, " ")}</legend>
      <div className="mt-2 space-y-2">{groups[resource].map(p => <label key={p.id} className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
        <input type="checkbox" checked={selected.includes(p.id)} onChange={() => onToggle(p.id)} className="mt-0.5 h-4 w-4 accent-yellow-500" />
        <span><span className="block text-sm font-semibold text-slate-800">{p.name}</span>{p.description && <span className="mt-0.5 block text-xs text-slate-500">{p.description}</span>}</span>
      </label>)}</div>
    </fieldset>)}</div>
  </div>;
}
