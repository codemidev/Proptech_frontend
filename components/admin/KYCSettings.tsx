"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

type KYCSettingsResponse = {
  success: boolean;
  data: {
    enabled: boolean;
    provider: string;
    environment: "SANDBOX" | "LIVE";
    apiKeyConfigured: boolean;
    apiSecretConfigured: boolean;
  };
};

type KYCForm = {
  enabled: boolean;
  provider: string;
  environment: "SANDBOX" | "LIVE";
  apiKey: string;
  apiSecret: string;
};

export default function KYCSettings() {
  const { getToken } = useAuth();

  const [form, setForm] = useState<KYCForm>({
    enabled: false,
    provider: "METAMAP",
    environment: "SANDBOX",
    apiKey: "",
    apiSecret: "",
  });

  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [apiSecretConfigured, setApiSecretConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch<KYCSettingsResponse>(
        "/api/v1/admin/settings/kyc",
        getToken,
      );

      setForm({
        enabled: response.data.enabled,
        provider: response.data.provider || "METAMAP",
        environment: response.data.environment || "SANDBOX",
        apiKey: "",
        apiSecret: "",
      });

      setApiKeyConfigured(response.data.apiKeyConfigured);
      setApiSecretConfigured(response.data.apiSecretConfigured);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load KYC settings.",
      );
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  function update<K extends keyof KYCForm>(
    key: K,
    value: KYCForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setMessage("");
    setError("");
  }

  async function saveSettings() {
    const provider = form.provider.trim().toUpperCase();

    if (!/^[A-Z0-9_-]{2,50}$/.test(provider)) {
      setError("Enter a valid KYC provider name.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await apiFetch<KYCSettingsResponse>(
        "/api/v1/admin/settings/kyc",
        getToken,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            enabled: form.enabled,
            provider,
            environment: form.environment,
            ...(form.apiKey.trim()
              ? { apiKey: form.apiKey.trim() }
              : {}),
            ...(form.apiSecret.trim()
              ? { apiSecret: form.apiSecret.trim() }
              : {}),
          }),
        },
      );

      setForm((current) => ({
        ...current,
        enabled: response.data.enabled,
        provider: response.data.provider,
        environment: response.data.environment,
        apiKey: "",
        apiSecret: "",
      }));

      setApiKeyConfigured(response.data.apiKeyConfigured);
      setApiSecretConfigured(response.data.apiSecretConfigured);

      setMessage("KYC settings saved successfully.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save KYC settings.",
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
          <div className="mt-3 h-4 w-80 rounded bg-gray-100" />
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
            KYC Configuration
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Configure the identity-verification provider for future agent KYC
            integration. KYC is not currently enforced during signup.
          </p>
        </div>

        <div
          className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${
            form.enabled
              ? "bg-green-50 text-green-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {form.enabled ? "KYC integration enabled" : "KYC integration disabled"}
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

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-gray-700">
            Provider
          </span>
          <input
            type="text"
            value={form.provider}
            onChange={(e) => update("provider", e.target.value)}
            placeholder="METAMAP"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
          />
          <span className="mt-2 block text-xs text-gray-400">
            Example: METAMAP
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-gray-700">
            Environment
          </span>
          <select
            value={form.environment}
            onChange={(e) =>
              update(
                "environment",
                e.target.value as "SANDBOX" | "LIVE",
              )
            }
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
          >
            <option value="SANDBOX">SANDBOX</option>
            <option value="LIVE">LIVE</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-gray-700">
            API Key
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={form.apiKey}
            onChange={(e) => update("apiKey", e.target.value)}
            placeholder={
              apiKeyConfigured
                ? "Leave blank to keep existing key"
                : "Enter API key"
            }
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
          />
          <span className="mt-2 block text-xs font-medium text-gray-500">
            {apiKeyConfigured ? "API key configured" : "API key not configured"}
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-gray-700">
            API Secret
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={form.apiSecret}
            onChange={(e) => update("apiSecret", e.target.value)}
            placeholder={
              apiSecretConfigured
                ? "Leave blank to keep existing secret"
                : "Enter API secret"
            }
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
          />
          <span className="mt-2 block text-xs font-medium text-gray-500">
            {apiSecretConfigured
              ? "API secret configured"
              : "API secret not configured"}
          </span>
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => update("enabled", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
          />
          <span>
            <span className="block text-sm font-bold text-gray-900">
              Enable KYC integration
            </span>
            <span className="block text-xs text-gray-500">
              This prepares the provider for future KYC verification flows.
            </span>
          </span>
        </label>

        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="rounded-xl bg-gray-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save KYC Settings"}
        </button>
      </div>

      <p className="mt-4 text-xs leading-5 text-gray-400">
        Credentials are stored server-side using encrypted system settings.
        They are never returned to the browser after saving.
      </p>
    </section>
  );
}
