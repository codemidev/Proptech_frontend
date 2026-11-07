"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { TopAppBar } from "@/components/shell/TopAppBar";
import { Card } from "@/components/ui/Card";

type Settings = { bankName: string; accountName: string; accountNumber: string };
type ApiResponse = { success: boolean; data?: Settings; message?: string };

const empty: Settings = { bankName: "", accountName: "", accountNumber: "" };

export default function OwnerPaymentSettingsPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch<ApiResponse>("/api/v1/payments/owner-settings", getToken);
      if (!result.success || !result.data) throw new Error(result.message || "Unable to load payment settings.");
      setSettings(result.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load payment settings.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { router.replace("/sign-in"); return; }
    void load();
  }, [isLoaded, isSignedIn, router, load]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await apiFetch<ApiResponse>(
        "/api/v1/payments/owner-settings",
        getToken,
        { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) },
      );
      if (!result.success) throw new Error(result.message || "Unable to save payment details.");
      setSuccess(result.message || "Payment details saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save payment details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <TopAppBar title="Owner Payment Settings" />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">Owner workspace</p>
          <h1 className="text-2xl font-semibold tracking-tight">Payment Settings</h1>
          <p className="text-sm leading-6 text-black/55">Set the bank account tenants should use for direct rent payments. Keep these details accurate.</p>
        </header>
        <Card className="space-y-5 p-5 sm:p-6">
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
          {loading ? <p className="animate-pulse text-sm text-black/55">Loading payment settings…</p> : (
            <form onSubmit={save} className="space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Bank name</span>
                <input required maxLength={100} autoComplete="off" value={settings.bankName} onChange={e => setSettings(v => ({...v, bankName: e.target.value}))} className="min-h-12 w-full rounded-xl border border-black/15 px-4 outline-none focus:border-black" placeholder="e.g. Access Bank" />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Account name</span>
                <input required maxLength={150} autoComplete="off" value={settings.accountName} onChange={e => setSettings(v => ({...v, accountName: e.target.value}))} className="min-h-12 w-full rounded-xl border border-black/15 px-4 outline-none focus:border-black" placeholder="Name registered with the bank" />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Account number</span>
                <input required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} autoComplete="off" value={settings.accountNumber} onChange={e => setSettings(v => ({...v, accountNumber: e.target.value.replace(/\D/g, "").slice(0, 10)}))} className="min-h-12 w-full rounded-xl border border-black/15 px-4 outline-none focus:border-black" placeholder="10-digit account number" />
              </label>
              <button disabled={saving} className="min-h-12 w-full rounded-xl bg-[#FACC15] px-5 py-3 text-sm font-semibold text-black hover:brightness-95 disabled:opacity-50">{saving ? "Saving…" : "Save payment details"}</button>
            </form>
          )}
        </Card>
        <Link href="/dashboard/owner" className="inline-flex min-h-11 items-center rounded-xl border border-black/15 px-4 py-2 text-sm font-semibold">Back to owner dashboard</Link>
      </main>
    </>
  );
}
