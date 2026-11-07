"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

type PaymentSettingsResponse = {
  success: boolean;
  data: {
    flutterwave: {
      mode: "TEST" | "LIVE";
      publicKey: string;
      secretKeyConfigured: boolean;
      webhookSecretConfigured: boolean;
    };
    propertySubmission: {
      enabled: boolean;
      fee: number;
      currency: string;
    };
    landVault: {
      fee: number;
      currency: string;
    };
    inspection: {
      fee: number;
      currency: string;
    };
    aeroInspection: {
      fee: number;
      currency: string;
    };
    contractGeneration?: {
      fee: number;
      currency: string;
    };
  };
};

type PaymentForm = {
  mode: "TEST" | "LIVE";
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
  enabled: boolean;
  fee: string;
  currency: string;
  landVaultFee: string;
  landVaultCurrency: string;
  inspectionFee: string;
  inspectionCurrency: string;
  aeroInspectionFee: string;
  aeroInspectionCurrency: string;
  contractGenerationFee: string;
};

export default function PaymentSettings() {
  const { getToken } = useAuth();

  const [form, setForm] = useState<PaymentForm>({
    mode: "TEST",
    publicKey: "",
    secretKey: "",
    webhookSecret: "",
    enabled: true,
    fee: "10000",
    currency: "NGN",
    landVaultFee: "50000",
    landVaultCurrency: "NGN",
    inspectionFee: "5000",
    inspectionCurrency: "NGN",
    aeroInspectionFee: "0",
    aeroInspectionCurrency: "NGN",
    contractGenerationFee: "2000",
  });

  const [secretConfigured, setSecretConfigured] = useState(false);
  const [webhookConfigured, setWebhookConfigured] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const response = await apiFetch<PaymentSettingsResponse>(
          "/api/v1/admin/settings/payment",
          getToken,
        );

        if (cancelled) return;

        const flutterwave = response.data.flutterwave;
        const propertySubmission = response.data.propertySubmission;
        const landVault = response.data.landVault;
        const inspection = response.data.inspection;
        const aeroInspection = response.data.aeroInspection;
        const contractGeneration = response.data.contractGeneration;

        setForm({
          mode: flutterwave.mode,
          publicKey: flutterwave.publicKey || "",
          secretKey: "",
          webhookSecret: "",
          enabled: propertySubmission.enabled,
          fee: String(propertySubmission.fee ?? 10000),
          currency: propertySubmission.currency || "NGN",
          landVaultFee: String(landVault?.fee ?? 50000),
          landVaultCurrency: landVault?.currency || "NGN",
          inspectionFee: String(inspection?.fee ?? 5000),
          inspectionCurrency: inspection?.currency || "NGN",
          aeroInspectionFee: String(aeroInspection?.fee ?? 0),
          aeroInspectionCurrency: aeroInspection?.currency || "NGN",
          contractGenerationFee: String(contractGeneration?.fee ?? 2000),
        });

        setSecretConfigured(flutterwave.secretKeyConfigured);
        setWebhookConfigured(flutterwave.webhookSecretConfigured);
      } catch (err) {
        if (cancelled) return;

        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load payment settings.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [getToken]);

  function update<K extends keyof PaymentForm>(
    key: K,
    value: PaymentForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setMessage("");
    setError("");
  }

  async function saveSettings() {
    const fee = Number(form.fee);

    if (!Number.isFinite(fee) || fee < 0) {
      setError("Enter a valid non-negative submission fee.");
      return;
    }

    if (!/^[A-Za-z]{3}$/.test(form.currency.trim())) {
      setError("Currency must be a valid 3-letter code such as NGN.");
      return;
    }

    const landVaultFee = Number(form.landVaultFee);

    if (!Number.isFinite(landVaultFee) || landVaultFee < 0) {
      setError("Enter a valid non-negative LandVault fee.");
      return;
    }

    if (!/^[A-Za-z]{3}$/.test(form.landVaultCurrency.trim())) {
      setError(
        "LandVault currency must be a valid 3-letter code such as NGN.",
      );
      return;
    }

    const inspectionFee = Number(form.inspectionFee);
    if (!Number.isSafeInteger(inspectionFee) || inspectionFee < 0) {
      setError("Enter a valid non-negative whole-number inspection fee.");
      return;
    }

    if (!/^[A-Za-z]{3}$/.test(form.inspectionCurrency.trim())) {
      setError("Inspection currency must be a valid 3-letter code such as NGN.");
      return;
    }

    const aeroInspectionFee = Number(form.aeroInspectionFee);
    if (!Number.isSafeInteger(aeroInspectionFee) || aeroInspectionFee < 0) {
      setError("Enter a valid non-negative whole-number Aero inspection fee.");
      return;
    }

    if (!/^[A-Za-z]{3}$/.test(form.aeroInspectionCurrency.trim())) {
      setError("Aero inspection currency must be a valid 3-letter code such as NGN.");
      return;
    }

    const contractGenerationFee = Number(form.contractGenerationFee);
    if (!Number.isSafeInteger(contractGenerationFee) || contractGenerationFee < 0) {
      setError("Enter a valid non-negative whole-number contract-generation fee.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await apiFetch<PaymentSettingsResponse>(
        "/api/v1/admin/settings/payment",
        getToken,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            flutterwave: {
              mode: form.mode,
              publicKey: form.publicKey.trim(),
              ...(form.secretKey.trim()
                ? { secretKey: form.secretKey.trim() }
                : {}),
              ...(form.webhookSecret.trim()
                ? { webhookSecret: form.webhookSecret.trim() }
                : {}),
            },
            propertySubmission: {
              enabled: form.enabled,
              fee,
              currency: form.currency.trim().toUpperCase(),
            },
            landVault: {
              fee: landVaultFee,
              currency: form.landVaultCurrency.trim().toUpperCase(),
            },
            inspection: {
              fee: inspectionFee,
              currency: form.inspectionCurrency.trim().toUpperCase(),
            },
            aeroInspection: {
              fee: aeroInspectionFee,
              currency: form.aeroInspectionCurrency.trim().toUpperCase(),
            },
            contractGeneration: {
              fee: contractGenerationFee,
            },
          }),
        },
      );

      const flutterwave = response.data.flutterwave;
      const propertySubmission = response.data.propertySubmission;
      const landVault = response.data.landVault;
      const inspection = response.data.inspection;
      const aeroInspection = response.data.aeroInspection;
      const contractGeneration = response.data.contractGeneration;

      setForm((current) => ({
        ...current,
        mode: flutterwave.mode,
        publicKey: flutterwave.publicKey || "",
        secretKey: "",
        webhookSecret: "",
        enabled: propertySubmission.enabled,
        fee: String(propertySubmission.fee),
        currency: propertySubmission.currency,
        landVaultFee: String(landVault?.fee ?? landVaultFee),
        landVaultCurrency: landVault?.currency || "NGN",
        inspectionFee: String(inspection?.fee ?? inspectionFee),
        inspectionCurrency: inspection?.currency || "NGN",
        aeroInspectionFee: String(aeroInspection?.fee ?? aeroInspectionFee),
        aeroInspectionCurrency: aeroInspection?.currency || form.aeroInspectionCurrency,
        contractGenerationFee: String(contractGeneration?.fee ?? contractGenerationFee),
      }));

      setSecretConfigured(flutterwave.secretKeyConfigured);
      setWebhookConfigured(flutterwave.webhookSecretConfigured);

      setMessage("Payment settings saved successfully.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save payment settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 w-48 rounded bg-gray-200" />
          <div className="mt-3 h-4 w-72 rounded bg-gray-100" />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="h-12 rounded-xl bg-gray-100" />
            <div className="h-12 rounded-xl bg-gray-100" />
            <div className="h-12 rounded-xl bg-gray-100" />
            <div className="h-12 rounded-xl bg-gray-100" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-950">
            Payment Settings
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure Flutterwave, property sale submission, and LandVault
            verification, inspection, and contract-generation payments.
          </p>
        </div>

        <div
          className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${
            form.enabled
              ? "bg-green-50 text-green-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {form.enabled ? "Submission payment enabled" : "Submission payment disabled"}
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {message}
        </div>
      )}

      <div className="mt-6 space-y-7">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">
            Flutterwave
          </h3>

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Mode
              </span>
              <select
                value={form.mode}
                onChange={(e) =>
                  update("mode", e.target.value as "TEST" | "LIVE")
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
              >
                <option value="TEST">TEST</option>
                <option value="LIVE">LIVE</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Public Key
              </span>
              <input
                type="text"
                value={form.publicKey}
                onChange={(e) => update("publicKey", e.target.value)}
                placeholder="FLWPUBK_TEST-..."
                autoComplete="off"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Secret Key
                {secretConfigured && (
                  <span className="ml-2 text-xs font-bold text-green-600">
                    Configured
                  </span>
                )}
              </span>
              <input
                type="password"
                value={form.secretKey}
                onChange={(e) => update("secretKey", e.target.value)}
                placeholder={
                  secretConfigured
                    ? "Leave blank to keep current key"
                    : "FLWSECK_TEST-..."
                }
                autoComplete="new-password"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Webhook Secret Hash
                {webhookConfigured && (
                  <span className="ml-2 text-xs font-bold text-green-600">
                    Configured
                  </span>
                )}
              </span>
              <input
                type="password"
                value={form.webhookSecret}
                onChange={(e) => update("webhookSecret", e.target.value)}
                placeholder={
                  webhookConfigured
                    ? "Leave blank to keep current secret"
                    : "Webhook secret hash"
                }
                autoComplete="new-password"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
              />
            </label>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-7">
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">
            Property Sale Submission
          </h3>

          <div className="mt-4 grid gap-5 md:grid-cols-3">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-4">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => update("enabled", e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 accent-yellow-400"
              />
              <span>
                <span className="block text-sm font-bold text-gray-900">
                  Require payment
                </span>
                <span className="block text-xs text-gray-500">
                  Charge before a sale listing is submitted.
                </span>
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Submission Fee
              </span>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">
                  ₦
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.fee}
                  onChange={(e) => update("fee", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 py-3 pl-9 pr-4 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Currency
              </span>
              <input
                type="text"
                maxLength={3}
                value={form.currency}
                onChange={(e) =>
                  update("currency", e.target.value.toUpperCase())
                }
                placeholder="NGN"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm uppercase outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
              />
            </label>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-7">
          <div className="mb-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">
              LandVault Verification & Certification
            </h3>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Configure the mandatory LandVault verification and certification
              fee charged before the property enters the LandVault protocol.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                LandVault Fee
              </span>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">
                  ₦
                </span>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.landVaultFee}
                  onChange={(e) =>
                    update("landVaultFee", e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 py-3 pl-9 pr-4 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                />
              </div>

              <span className="mt-1 block text-xs text-gray-500">
                Current default: ₦50,000
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                LandVault Currency
              </span>

              <input
                type="text"
                maxLength={3}
                value={form.landVaultCurrency}
                onChange={(e) =>
                  update(
                    "landVaultCurrency",
                    e.target.value.toUpperCase(),
                  )
                }
                placeholder="NGN"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm uppercase outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
              />

              <span className="mt-1 block text-xs text-gray-500">
                Three-letter ISO-style currency code.
              </span>
            </label>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-7">
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">
            Inspection & Contract Generation
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Configure inspection booking and lease contract-generation fees.
          </p>
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Inspection Fee
              </span>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">₦</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.inspectionFee}
                  onChange={(e) => update("inspectionFee", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 py-3 pl-9 pr-4 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Inspection Currency
              </span>
              <input
                type="text"
                maxLength={3}
                value={form.inspectionCurrency}
                onChange={(e) => update("inspectionCurrency", e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm uppercase outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Contract Generation Fee
              </span>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">₦</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.contractGenerationFee}
                  onChange={(e) => update("contractGenerationFee", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 py-3 pl-9 pr-4 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                />
              </div>
            </label>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-7">
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">
            Aero Drone Inspection
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Optional paid drone inspection requested by property owners.
            A zero fee keeps the service free until pricing is configured.
          </p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Aero Inspection Fee
              </span>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">₦</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.aeroInspectionFee}
                  onChange={(e) => update("aeroInspectionFee", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 py-3 pl-9 pr-4 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Aero Inspection Currency
              </span>
              <input
                type="text"
                maxLength={3}
                value={form.aeroInspectionCurrency}
                onChange={(e) => update("aeroInspectionCurrency", e.target.value.toUpperCase())}
                placeholder="NGN"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm uppercase outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            Secret keys are encrypted before being stored.
          </p>

          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className="rounded-xl bg-black px-6 py-3 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Payment Settings"}
          </button>
        </div>
      </div>
    </section>
  );
}
