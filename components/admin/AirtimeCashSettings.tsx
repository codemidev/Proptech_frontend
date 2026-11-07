"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

type Settings = {
  providerApiKeyConfigured: boolean;
  platformFeePercent: number;
  platformFeeFixed: number;
  platformFeeMin: number;
  platformFeeMax: number;
  providerFeePercent: number;
  conversionEnabled: false;
  providerConfigured: boolean;
};

type ApiResponse = { success: boolean; data: Settings };

const fieldClass =
  "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100";

export default function AirtimeCashSettings() {
  const { getToken } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [amount, setAmount] = useState("1000");
  const [quote, setQuote] = useState<{
    amount: number; platformFee: number; estimatedProviderFee: number;
    estimatedPayout: number; indicativeOnly: boolean; message: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await apiFetch<ApiResponse>(
        "/api/v1/admin/settings/airtime-cash", getToken,
      );
      setSettings(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load settings.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await apiFetch<ApiResponse>(
        "/api/v1/admin/settings/airtime-cash",
        getToken,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platformFeePercent: settings.platformFeePercent,
            platformFeeFixed: settings.platformFeeFixed,
            platformFeeMin: settings.platformFeeMin,
            platformFeeMax: settings.platformFeeMax,
            providerFeePercent: settings.providerFeePercent,
            ...(apiKey.trim() ? { providerApiKey: apiKey.trim() } : {}),
          }),
        },
      );
      setSettings(response.data);
      setApiKey("");
      setMessage("Settings saved. Live conversion remains disabled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function getQuote() {
    setError("");
    setQuote(null);
    try {
      const response = await apiFetch<{
        success: boolean; data: NonNullable<typeof quote>
      }>("/api/v1/admin/settings/airtime-cash/quote", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      setQuote(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not calculate quote.");
    }
  }

  function update(key: keyof Settings, value: string) {
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    setSettings((current) => current ? { ...current, [key]: number } : current);
  }

  if (loading) {
    return <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Loading Airtime-to-Cash settings…</section>;
  }

  return (
    <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Monetization</p>
          <h2 className="mt-1 text-xl font-bold">Airtime-to-Cash</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Configure fee estimates and store the provider credential securely.</p>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Live conversion disabled</span>
      </div>

      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Provider credentials and fee settings do not activate conversion or payouts. Live processing stays disabled until provider settlement verification, idempotent wallet crediting, failure handling, and reconciliation are implemented.
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm font-medium text-gray-700 sm:col-span-2 lg:col-span-3">
          Provider API key
          <input className={fieldClass} type="password" autoComplete="new-password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={settings?.providerApiKeyConfigured ? "Configured — enter only to replace" : "Enter provider API key"} />
          <span className="mt-1 block text-xs text-gray-500">{settings?.providerApiKeyConfigured ? "A key is stored. The existing value is never displayed." : "No provider key configured."} Do not put secrets in source code or logs.</span>
        </label>
        <label className="text-sm font-medium text-gray-700">Platform fee (%)<input className={fieldClass} type="number" min="0" max="100" step="0.1" value={settings?.platformFeePercent ?? ""} onChange={(e) => update("platformFeePercent", e.target.value)} /></label>
        <label className="text-sm font-medium text-gray-700">Platform fixed fee (₦)<input className={fieldClass} type="number" min="0" step="1" value={settings?.platformFeeFixed ?? ""} onChange={(e) => update("platformFeeFixed", e.target.value)} /></label>
        <label className="text-sm font-medium text-gray-700">Minimum platform fee (₦)<input className={fieldClass} type="number" min="0" step="1" value={settings?.platformFeeMin ?? ""} onChange={(e) => update("platformFeeMin", e.target.value)} /></label>
        <label className="text-sm font-medium text-gray-700">Maximum platform fee (₦)<input className={fieldClass} type="number" min="0" step="1" value={settings?.platformFeeMax ?? ""} onChange={(e) => update("platformFeeMax", e.target.value)} /></label>
        <label className="text-sm font-medium text-gray-700">Estimated provider fee (%)<input className={fieldClass} type="number" min="0" max="100" step="0.1" value={settings?.providerFeePercent ?? ""} onChange={(e) => update("providerFeePercent", e.target.value)} /></label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" disabled={saving || !settings} onClick={() => void save()} className="rounded-lg bg-[#FACC15] px-5 py-2.5 text-sm font-bold text-gray-950 hover:bg-yellow-400 disabled:opacity-50">{saving ? "Saving…" : "Save settings"}</button>
      </div>

      <div className="mt-7 border-t border-gray-100 pt-5">
        <h3 className="font-semibold">Fee quote preview</h3>
        <p className="mt-1 text-sm text-gray-500">Uses the server's current fee settings. This is indicative only, not a live conversion offer.</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-gray-700">Amount (₦)<input className={fieldClass} type="number" min="100" max="5000000" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
          <button type="button" onClick={() => void getQuote()} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50">Calculate quote</button>
        </div>
        {quote && <dl className="mt-4 grid gap-3 rounded-xl bg-gray-50 p-4 text-sm sm:grid-cols-2">
          <div><dt className="text-gray-500">Requested amount</dt><dd className="font-semibold">₦{quote.amount.toLocaleString()}</dd></div>
          <div><dt className="text-gray-500">Platform fee</dt><dd className="font-semibold">₦{quote.platformFee.toLocaleString()}</dd></div>
          <div><dt className="text-gray-500">Estimated provider fee</dt><dd className="font-semibold">₦{quote.estimatedProviderFee.toLocaleString()}</dd></div>
          <div><dt className="text-gray-500">Estimated payout</dt><dd className="font-bold">₦{quote.estimatedPayout.toLocaleString()}</dd></div>
          <p className="text-xs text-gray-500 sm:col-span-2">{quote.message}</p>
        </dl>}
      </div>
    </section>
  );
}
