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
  conversionEnabled: boolean;
  providerConfigured: boolean;
  enabled: boolean;
  payoutRates: { MTN: number; AIRTEL: number; GLO: number; NINE_MOBILE: number };
};

type ApiResponse = { success: boolean; data: Settings };

const fieldClass =
  "mt-1 w-full rounded-lg border border-white/15 bg-[#151515] px-3 py-2 text-sm text-white outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20";

export default function AirtimeCashSettings() {
  const { getToken } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [requests, setRequests] = useState<Array<Record<string, unknown>>>([]);

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await apiFetch<ApiResponse>(
        "/api/v1/admin/settings/airtime-cash", getToken,
      );
      setSettings(response.data);
      const queue = await apiFetch<{ success: boolean; data: Array<Record<string, unknown>> }>(
        "/api/v1/admin/airtime-data-cash", getToken,
      );
      setRequests(queue.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load settings.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

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
            enabled: settings.enabled,
            payoutRates: settings.payoutRates,
            ...(apiKey.trim() ? { providerApiKey: apiKey.trim() } : {}),
          }),
        },
      );
      setSettings(response.data);
      setApiKey("");
      setMessage(response.data.conversionEnabled ? "Settings saved. New tenant requests are enabled; cash settlement still requires admin verification." : "Settings saved. New tenant requests remain disabled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Loading Airtime-to-Cash settings…</section>;
  }

  return (
    <section className="mt-6 rounded-2xl border border-yellow-500/30 bg-[#080808] p-5 text-white shadow-[0_0_40px_rgba(250,204,21,0.08)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-400">Monetization</p>
          <h2 className="mt-1 text-xl font-bold text-yellow-300">Airtime-to-Cash</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-400">Configure the provider, customer payout rates and settlement controls.</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${settings?.enabled ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-200" : "border-white/10 bg-white/5 text-gray-300"}`}>{settings?.enabled ? "Requests enabled" : "Requests disabled"}</span>
      </div>

      <div className="mt-5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
        Airtime transfer success is not proof of cash settlement. An administrator must independently verify the provider cash receipt and record its settlement reference before Flutterwave can pay the customer. No customer wallet is used.
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-200">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-100">{message}</p>}

      <div className="mt-5">
        <label className="block text-sm font-medium text-gray-200">
          Airtime to Cash Automation API token
          <input className={fieldClass} type="password" autoComplete="new-password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={settings?.providerApiKeyConfigured ? "Configured — enter only to replace" : "Enter provider API token"} />
          <span className="mt-1 block text-xs text-gray-400">{settings?.providerApiKeyConfigured ? "A token is stored securely. Its value is never displayed." : "No provider token configured."} Never put credentials in source code or logs.</span>
        </label>
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-[#111] p-4">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span><span className="block text-sm font-semibold text-white">Enable tenant Airtime-to-Cash requests</span><span className="mt-1 block text-xs text-gray-400">Payouts remain behind settlement verification.</span></span>
          <input type="checkbox" checked={settings?.enabled ?? false} onChange={(e) => setSettings((current) => current ? { ...current, enabled: e.target.checked } : current)} className="h-5 w-5 accent-yellow-400" />
        </label>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {([
          ["MTN", "MTN"],
          ["AIRTEL", "Airtel"],
          ["GLO", "Glo"],
          ["NINE_MOBILE", "9mobile"],
        ] as const).map(([key, label]) => (
          <label key={key} className="text-sm font-medium text-gray-200">
            {label} customer payout (%)
            <input className={fieldClass} type="number" min="1" max="100" step="0.1"
              value={settings?.payoutRates?.[key] ?? 0}
              onChange={(e) => setSettings((current) => current ? {
                ...current,
                payoutRates: { ...current.payoutRates, [key]: Number(e.target.value) },
              } : current)} />
          </label>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" disabled={saving || !settings} onClick={() => void save()} className="rounded-lg bg-[#FACC15] px-5 py-2.5 text-sm font-bold text-black shadow-[0_0_20px_rgba(250,204,21,0.18)] hover:bg-yellow-300 disabled:opacity-50">{saving ? "Saving…" : "Save settings"}</button>
      </div>

      <div className="mt-8 border-t border-white/10 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-lg font-bold text-yellow-200">Conversion & settlement monitor</h3><p className="mt-1 text-sm text-gray-400">Review provider-confirmed airtime transfers and independently confirm cash receipt.</p></div>
          <button type="button" onClick={() => void load()} className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white hover:border-yellow-400">Refresh queue</button>
        </div>
        <div className="mt-4 space-y-3">
          {requests.length === 0 ? <p className="rounded-xl border border-white/10 bg-[#111] p-4 text-sm text-gray-400">No conversion requests yet.</p> : requests.map((item) => {
            const id = String(item.id ?? "");
            const status = String(item.status ?? "");
            return <div key={id} className="rounded-xl border border-white/10 bg-[#111] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{String((item.tenant as Record<string, unknown> | undefined)?.firstName ?? "Tenant")} {String((item.tenant as Record<string, unknown> | undefined)?.lastName ?? "")} · {String(item.network ?? "")}</p>
                  <p className="mt-1 break-all font-mono text-xs text-gray-400">{String(item.reference ?? "")}</p>
                  <p className="mt-2 text-sm text-gray-300">{String(item.bankName ?? "")} · {String(item.accountName ?? "")} · {String(item.accountNumber ?? "")}</p>
                </div>
                <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-200">{status.replaceAll("_", " ")}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <span className="text-gray-400">Airtime <b className="text-white">₦{Number(item.amount ?? 0).toLocaleString()}</b></span>
                <span className="text-gray-400">Customer payout <b className="text-yellow-200">₦{Number(item.quotedPayout ?? 0).toLocaleString()}</b></span>
                <span className="text-gray-400">Aviritech margin <b className="text-white">₦{Number(item.platformMargin ?? 0).toLocaleString()}</b></span>
              </div>
              {item.providerMessage ? <p className="mt-2 text-xs text-gray-400">{String(item.providerMessage)}</p> : null}
              {["MANUAL_REVIEW", "PROCESSING"].includes(status) && !item.flutterwaveReference ? <button type="button" onClick={async () => {
                const providerReference = window.prompt("Enter the provider transfer reference confirmed in the Airtime to Cash Automation account:");
                if (!providerReference?.trim()) return;
                if (!window.confirm("I independently confirmed that the airtime transfer completed at the provider. Continue to cash settlement review?")) return;
                setSaving(true);
                try {
                  await apiFetch(`/api/v1/admin/airtime-data-cash/${encodeURIComponent(id)}/confirm-provider-transfer`, getToken, {
                    method: "POST", body: JSON.stringify({ providerTransferConfirmed: true, providerReference: providerReference.trim() }),
                  });
                  setMessage("Provider transfer confirmed. Verify actual cash settlement before authorizing payout.");
                  await load();
                } catch (err) { setError(err instanceof Error ? err.message : "Unable to confirm provider transfer."); }
                finally { setSaving(false); }
              }} disabled={saving} className="mt-4 rounded-lg border border-yellow-400/40 px-4 py-2 text-xs font-semibold text-yellow-200 disabled:opacity-50">Confirm provider transfer</button> : null}
              {status === "SETTLEMENT_REVIEW" ? <button type="button" onClick={async () => {
                const settlementReference = window.prompt("Enter the settlement reference confirmed in the provider account:");
                if (!settlementReference?.trim()) return;
                if (!window.confirm("I independently verified that the cash proceeds are received and available for payout. Continue with the Flutterwave bank transfer?")) return;
                setSaving(true);
                setError("");
                try {
                  await apiFetch(`/api/v1/admin/airtime-data-cash/${encodeURIComponent(id)}/confirm-settlement`, getToken, {
                    method: "POST", body: JSON.stringify({ cashSettlementConfirmed: true, settlementReference: settlementReference.trim() }),
                  });
                  setMessage("Settlement recorded. Flutterwave payout submitted for reconciliation.");
                  await load();
                } catch (err) { setError(err instanceof Error ? err.message : "Unable to confirm settlement."); }
                finally { setSaving(false); }
              }} disabled={saving} className="mt-4 rounded-lg bg-[#FACC15] px-4 py-2 text-xs font-bold text-black disabled:opacity-50">Confirm cash received & pay customer</button> : null}
              {(status === "PAYOUT_PROCESSING" || (status === "MANUAL_REVIEW" && Boolean(item.flutterwaveReference))) && <button type="button" onClick={async () => {
                setSaving(true);
                try { await apiFetch(`/api/v1/admin/airtime-data-cash/${encodeURIComponent(id)}/reconcile`, getToken, { method: "POST" }); await load(); }
                catch (err) { setError(err instanceof Error ? err.message : "Reconciliation failed."); }
                finally { setSaving(false); }
              }} disabled={saving} className="mt-4 rounded-lg border border-yellow-400/40 px-4 py-2 text-xs font-semibold text-yellow-200 disabled:opacity-50">Reconcile Flutterwave transfer</button>}
            </div>;
          })}
        </div>
      </div>
    </section>
  );
}
