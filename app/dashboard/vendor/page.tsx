"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, Building2, LoaderCircle, RefreshCw, Save } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Api<T> = { success: boolean; data: T; message?: string };
type Vendor = {
  id: string;
  businessName: string;
  type: string;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
  kuunAccountName: string | null;
  kuunAccountNumber: string | null;
};

const field = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-[#1A3C6E] focus:ring-2 focus:ring-[#1A3C6E]/10";
const primary = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#1A3C6E] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50";

export default function VendorDashboard() {
  const { getToken } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch<Api<Vendor>>("/api/v1/marketplace/vendors/me", getToken);
      setVendor(result.data);
      setAccountName(result.data.kuunAccountName || "");
      setAccountNumber(result.data.kuunAccountNumber || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load your merchant profile.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { void load(); }, [load]);

  async function saveAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await apiFetch<Api<{ kuunAccountName: string; kuunAccountNumber: string }>>(
        "/api/v1/marketplace/vendors/me/kuun-account",
        getToken,
        {
          method: "PATCH",
          body: JSON.stringify({
            kuunAccountName: accountName.trim(),
            kuunAccountNumber: accountNumber.trim(),
          }),
        },
      );
      setAccountName(result.data.kuunAccountName);
      setAccountNumber(result.data.kuunAccountNumber);
      setNotice("Your Kuun receiving account has been saved. Flutterwave checkout remains active.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save Kuun account details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/marketplace" className="flex items-center gap-2 font-black text-[#1A3C6E]">
            <span className="rounded-xl bg-[#FACC15] p-2"><Building2 size={19} /></span>
            AVIRITECH <span className="font-medium text-slate-500">Merchant workspace</span>
          </Link>
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={16} />Dashboard</Link>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#1A3C6E]">Marketplace payments</p>
            <h1 className="mt-2 text-3xl font-black">Receiving account</h1>
            <p className="mt-2 text-sm text-slate-600">Add the Kuun account customers should use when paying your business directly.</p>
          </div>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button>
        </div>

        {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {notice && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

        {loading ? (
          <div className="flex justify-center py-24 text-sm text-slate-500"><LoaderCircle className="mr-2 animate-spin" />Loading merchant profile…</div>
        ) : vendor ? (
          <section className="mt-7 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">{vendor.businessName}</h2>
                <p className="mt-1 text-sm text-slate-500">Merchant profile · {vendor.status.replaceAll("_", " ")}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{vendor.status}</span>
            </div>

            {vendor.type !== "MERCHANT" ? (
              <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Kuun receiving-account setup is currently available for Marketplace merchant profiles.</p>
            ) : (
              <>
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 font-bold text-amber-950"><BadgeCheck size={18} />Kuun account details</div>
                  <p className="mt-1 text-sm leading-6 text-amber-900">Enter the account name and account number registered with Kuun. These details belong to your merchant profile and are not displayed on public product listings.</p>
                </div>
                <form onSubmit={saveAccount} className="mt-6 grid gap-5">
                  <label className="text-sm font-semibold text-slate-800">
                    Kuun account name
                    <input required minLength={2} maxLength={120} autoComplete="name" value={accountName} onChange={event => setAccountName(event.target.value)} className={field} placeholder="Name registered to the Kuun account" />
                  </label>
                  <label className="text-sm font-semibold text-slate-800">
                    Kuun account number
                    <input required inputMode="numeric" autoComplete="off" pattern="[0-9]{8,20}" minLength={8} maxLength={20} value={accountNumber} onChange={event => setAccountNumber(event.target.value.replace(/[^0-9]/g, ""))} className={field} placeholder="Enter your Kuun account number" />
                    <span className="mt-1 block text-xs font-normal text-slate-500">Use digits only (8–20 digits).</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <button disabled={saving} className={primary}>{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}Save Kuun account</button>
                    <span className="text-xs text-slate-500">You can update these details later.</span>
                  </div>
                </form>
              </>
            )}
          </section>
        ) : (
          <section className="mt-7 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black">Merchant profile not found</h2>
            <p className="mt-2 text-sm text-slate-600">Submit a Marketplace merchant application first. Once your vendor profile exists, you can add your Kuun receiving account here.</p>
            <Link href="/marketplace" className="mt-5 inline-flex rounded-xl bg-[#1A3C6E] px-4 py-3 text-sm font-bold text-white">Open Marketplace</Link>
          </section>
        )}

        <section className="mt-6 max-w-3xl rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-black">Flutterwave remains active</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Adding a Kuun receiving account does not switch off or replace the existing Flutterwave checkout. Customers can continue using the current Flutterwave payment flow.</p>
        </section>
      </div>
    </main>
  );
}
