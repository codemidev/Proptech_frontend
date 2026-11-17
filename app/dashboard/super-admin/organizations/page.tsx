"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

type Permission = { id: string; name: string; resource: string; action: string; description?: string | null };
type Organization = { id: string; name: string; slug: string; type: string; email?: string | null; isActive: boolean; _count?: { users: number; properties: number } };
type Admin = { id: string; email: string; firstName?: string | null; lastName?: string | null; isActive: boolean; status: string; permissions: Permission[] };
type Invitation = { id: string; email: string; firstName: string; lastName: string; status: string; expiresAt: string; permissions: Array<{ permission: Permission }> };
type ApiResponse<T> = { success: boolean; data: T; message?: string };
const field = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100";

export default function OrganizationManagementPage() {
  const { getToken } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showOrganizationForm, setShowOrganizationForm] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [handoff, setHandoff] = useState<{ email: string; setupUrl: string; signInUrl: string; deliveryMethod: string; expiresAt: string } | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgType, setOrgType] = useState("COMPANY");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const selectedOrganization = organizations.find(item => item.id === organizationId);
  const groups = useMemo(() => permissions.reduce<Record<string, Permission[]>>((acc, item) => {
    (acc[item.resource] ??= []).push(item); return acc;
  }, {}), [permissions]);

  const loadOrganizations = useCallback(async () => {
    const [orgResponse, permissionResponse] = await Promise.all([
      apiFetch<ApiResponse<{ organizations: Organization[] }>>("/api/v1/super-admin/organizations", getToken),
      apiFetch<ApiResponse<{ permissions: Permission[] }>>("/api/v1/admin/organization-admins/permissions", getToken),
    ]);
    setOrganizations(orgResponse.data.organizations);
    setPermissions(permissionResponse.data.permissions);
    setOrganizationId(current => current || orgResponse.data.organizations.find(item => item.isActive)?.id || "");
  }, [getToken]);

  const loadOrganizationData = useCallback(async (id: string) => {
    if (!id) { setAdmins([]); setInvitations([]); return; }
    const query = "?organizationId=" + encodeURIComponent(id);
    const [adminResponse, invitationResponse] = await Promise.all([
      apiFetch<ApiResponse<{ admins: Admin[] }>>("/api/v1/admin/organization-admins/admins" + query, getToken),
      apiFetch<ApiResponse<{ invitations: Invitation[] }>>("/api/v1/admin/organization-admins/invitations" + query, getToken),
    ]);
    setAdmins(adminResponse.data.admins);
    setInvitations(invitationResponse.data.invitations);
  }, [getToken]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { await loadOrganizations(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load organizations."); }
    finally { setLoading(false); }
  }, [loadOrganizations]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (organizationId) void loadOrganizationData(organizationId).catch(e => setError(e instanceof Error ? e.message : "Unable to load organization administrators.")); }, [organizationId, loadOrganizationData]);

  function togglePermission(id: string) {
    setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  }
  function toggleMany(ids: string[]) {
    setSelected(current => ids.every(id => current.includes(id)) ? current.filter(id => !ids.includes(id)) : Array.from(new Set([...current, ...ids])));
  }

  async function createOrganization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const response = await apiFetch<ApiResponse<{ organization: Organization }>>("/api/v1/super-admin/organizations", getToken, {
        method: "POST",
        body: JSON.stringify({ name: orgName, slug: orgSlug || undefined, type: orgType, email: orgEmail || undefined, phone: orgPhone || undefined, description: orgDescription || undefined }),
      });
      setNotice("Organization created.");
      setShowOrganizationForm(false); setOrgName(""); setOrgSlug(""); setOrgEmail(""); setOrgPhone(""); setOrgDescription("");
      await loadOrganizations(); setOrganizationId(response.data.organization.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create organization."); }
    finally { setSaving(false); }
  }

  async function createAdmin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!organizationId) return;
    setSaving(true); setError(""); setNotice(""); setHandoff(null);
    try {
      const response = await apiFetch<ApiResponse<{ invitation: { email: string; setupUrl: string; signInUrl: string; deliveryMethod: string; expiresAt: string } }>>("/api/v1/admin/organization-admins/invitations", getToken, {
        method: "POST",
        body: JSON.stringify({ organizationId, firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim().toLowerCase(), permissionIds: selected }),
      });
      setHandoff(response.data.invitation); setNotice("Secure organization-admin invitation created. The account becomes active only after verified setup.");
      setShowAdminForm(false); setFirstName(""); setLastName(""); setEmail(""); setSelected([]);
      await loadOrganizationData(organizationId);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to invite organization admin."); }
    finally { setSaving(false); }
  }

  async function revokeInvitation(invitation: Invitation) {
    if (!window.confirm("Revoke the pending invitation for " + invitation.email + "?")) return;
    setSaving(true); setError("");
    try {
      await apiFetch("/api/v1/admin/organization-admins/invitations/" + encodeURIComponent(invitation.id) + "/revoke", getToken, { method: "PATCH" });
      setNotice("Invitation revoked."); await loadOrganizationData(organizationId);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to revoke invitation."); }
    finally { setSaving(false); }
  }

  async function changeStatus(admin: Admin) {
    const isActive = !admin.isActive;
    if (!window.confirm((isActive ? "Reactivate " : "Deactivate ") + admin.email + "?")) return;
    setSaving(true); setError("");
    try {
      await apiFetch("/api/v1/admin/organization-admins/admins/" + encodeURIComponent(admin.id) + "/status", getToken, { method: "PATCH", body: JSON.stringify({ isActive }) });
      setNotice(isActive ? "Admin reactivated." : "Admin deactivated."); await loadOrganizationData(organizationId);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update admin status."); }
    finally { setSaving(false); }
  }

  return <main className="min-h-screen bg-[#f7f7f5] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-700">Platform governance</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Organizations & admins</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Create organizations and provision organization-scoped administrators with explicit permissions.</p></div>
        <div className="flex items-center gap-3"><Link href="/dashboard/super-admin" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">Platform admins</Link><UserButton /></div>
      </header>
      {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div role="status" className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</div>}
      {handoff && <section className="mt-6 rounded-2xl border border-yellow-300 bg-yellow-50 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase text-yellow-800">Secure invitation ready</p><p className="mt-1 text-sm font-semibold">{handoff.email}</p><p className="mt-1 text-xs text-slate-600">Expires {new Date(handoff.expiresAt).toLocaleString()} · {handoff.deliveryMethod === "manual_copy" ? "Email failed; copy the setup link." : "Invitation email sent."}</p></div><button type="button" onClick={() => void navigator.clipboard.writeText(handoff.setupUrl)} className="rounded-xl bg-[#1A3C6E] px-4 py-2.5 text-sm font-bold text-white">Copy setup link</button></div><p className="mt-3 break-all text-xs text-slate-600">Setup link: {handoff.setupUrl}</p><p className="mt-1 text-xs text-slate-600">Sign in after setup: {handoff.signInUrl}</p></section>}
      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Organizations</h2><p className="mt-1 text-sm text-slate-500">Aviritech PropTech remains the default organization; create additional organizations as required.</p></div><button onClick={() => setShowOrganizationForm(value => !value)} className="rounded-xl bg-[#FACC15] px-4 py-2.5 text-sm font-bold text-slate-950">+ Create organization</button></div>
        {showOrganizationForm && <form onSubmit={createOrganization} className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">Organization name<input className={field} value={orgName} onChange={e => setOrgName(e.target.value)} required /></label>
          <label className="text-sm font-semibold">URL slug (optional)<input className={field} value={orgSlug} onChange={e => setOrgSlug(e.target.value)} placeholder="generated-from-name" /></label>
          <label className="text-sm font-semibold">Organization type<select className={field} value={orgType} onChange={e => setOrgType(e.target.value)}>{["COMPANY","ESTATE","GOVERNMENT","AGENCY","INDIVIDUAL"].map(type => <option key={type} value={type}>{type.replace("_"," ")}</option>)}</select></label>
          <label className="text-sm font-semibold">Organization email<input className={field} type="email" value={orgEmail} onChange={e => setOrgEmail(e.target.value)} /></label>
          <label className="text-sm font-semibold">Phone<input className={field} value={orgPhone} onChange={e => setOrgPhone(e.target.value)} /></label>
          <label className="text-sm font-semibold">Description<input className={field} value={orgDescription} onChange={e => setOrgDescription(e.target.value)} /></label>
          <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setShowOrganizationForm(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Creating..." : "Create organization"}</button></div>
        </form>}
        {loading ? <p className="mt-5 text-sm text-slate-500">Loading organizations...</p> : <div className="mt-5 grid gap-3 md:grid-cols-2">{organizations.map(org => <button key={org.id} type="button" onClick={() => setOrganizationId(org.id)} className={`rounded-xl border p-4 text-left transition ${organizationId === org.id ? "border-yellow-400 bg-yellow-50" : "border-slate-200 hover:border-slate-400"}`}><div className="flex items-center justify-between gap-2"><span className="font-bold">{org.name}</span><span className="text-[10px] font-bold uppercase text-slate-500">{org.type}</span></div><p className="mt-1 text-xs text-slate-500">{org.slug} · {org._count?.users ?? 0} users · {org._count?.properties ?? 0} properties</p></button>)}</div>}
      </section>
      {selectedOrganization && <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Selected organization</p><h2 className="mt-1 text-xl font-bold">{selectedOrganization.name}</h2><p className="mt-1 text-sm text-slate-500">Organization admins are scoped to this organization only.</p></div><button onClick={() => { setSelected([]); setHandoff(null); setShowAdminForm(value => !value); }} className="rounded-xl bg-[#1A3C6E] px-4 py-2.5 text-sm font-bold text-white">+ Invite organization admin</button></div>
        {showAdminForm && <form onSubmit={createAdmin} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">First name<input className={field} value={firstName} onChange={e => setFirstName(e.target.value)} required /></label><label className="text-sm font-semibold">Last name<input className={field} value={lastName} onChange={e => setLastName(e.target.value)} required /></label><label className="text-sm font-semibold sm:col-span-2">Admin email<input className={field} type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
          <div className="sm:col-span-2"><PermissionPicker groups={groups} selected={selected} onToggle={togglePermission} onToggleMany={toggleMany} /></div>
          <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setShowAdminForm(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Sending..." : "Send secure invitation"}</button></div>
        </form>}
        <div className="mt-7"><h3 className="font-bold">Organization administrators</h3>{admins.length ? <div className="mt-3 divide-y divide-slate-100">{admins.map(admin => <div key={admin.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="text-sm font-bold">{[admin.firstName,admin.lastName].filter(Boolean).join(" ") || admin.email}</p><p className="mt-1 text-xs text-slate-500">{admin.email} · {admin.permissions.length} assigned permissions</p><span className={`mt-1 inline-block rounded-full px-2 py-1 text-[10px] font-bold ${admin.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{admin.isActive ? "Active" : "Inactive"}</span></div><button disabled={saving} onClick={() => void changeStatus(admin)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">{admin.isActive ? "Deactivate" : "Reactivate"}</button></div>)}</div> : <p className="mt-3 text-sm text-slate-500">No organization admins have been provisioned yet.</p>}</div>
        <div className="mt-7"><h3 className="font-bold">Admin invitations</h3>{invitations.length ? <div className="mt-3 divide-y divide-slate-100">{invitations.map(invitation => <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="text-sm font-bold">{invitation.firstName} {invitation.lastName}</p><p className="mt-1 text-xs text-slate-500">{invitation.email} · {invitation.permissions.length} permissions · expires {new Date(invitation.expiresAt).toLocaleString()}</p><span className="mt-1 inline-block text-[10px] font-bold uppercase text-slate-500">{invitation.status}</span></div>{invitation.status === "PENDING" && <button disabled={saving} onClick={() => void revokeInvitation(invitation)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Revoke</button>}</div>)}</div> : <p className="mt-3 text-sm text-slate-500">No invitations for this organization.</p>}</div>
      </section>}
    </div>
  </main>;
}

function PermissionPicker({ groups, selected, onToggle, onToggleMany }: { groups: Record<string, Permission[]>; selected: string[]; onToggle: (id: string) => void; onToggleMany: (ids: string[]) => void }) {
  const resources = Object.keys(groups).sort();
  const allIds = resources.flatMap(resource => groups[resource].map(permission => permission.id));
  return <div><div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="text-sm font-bold">Granted permissions</h3><p className="text-xs text-slate-500">{selected.length} selected. Only permissions held by the inviter can be assigned.</p></div><label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={allIds.length > 0 && allIds.every(id => selected.includes(id))} onChange={() => onToggleMany(allIds)} className="accent-yellow-500" />Select all</label></div><div className="grid gap-3 lg:grid-cols-2">{resources.map(resource => <fieldset key={resource} className="rounded-xl border border-slate-200 p-3"><legend className="px-1 text-xs font-bold capitalize">{resource.replace(/[_-]/g," ")}</legend>{groups[resource].map(permission => <label key={permission.id} className="flex items-start gap-2 rounded-lg px-2 py-2 text-xs hover:bg-slate-50"><input type="checkbox" checked={selected.includes(permission.id)} onChange={() => onToggle(permission.id)} className="mt-0.5 accent-yellow-500" /><span><strong>{permission.name}</strong>{permission.description && <span className="block text-slate-500">{permission.description}</span>}</span></label>)}</fieldset>)}</div></div>;
}
