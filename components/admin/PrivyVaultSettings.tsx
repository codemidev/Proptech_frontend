"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

type VaultStatus = {
  configured: boolean;
  appId: string | null;
  unlocked: boolean;
  expiresAt: number | null;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  data: VaultStatus;
};

export default function PrivyVaultSettings() {
  const { getToken } = useAuth();

  const [status, setStatus] = useState<VaultStatus>({
    configured: false,
    appId: null,
    unlocked: false,
    expiresAt: null,
  });
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [vaultPassword, setVaultPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch<ApiResponse>(
        "/api/v1/admin/settings/privy-vault",
        getToken,
      );
      setStatus(result.data);
      setAppId(result.data.appId ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Privy vault.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(
    path: string,
    method: string,
    body?: Record<string, string>,
  ) {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const result = await apiFetch<ApiResponse>(
        path,
        getToken,
        {
          method,
          headers: { "Content-Type": "application/json" },
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
      );

      setStatus(result.data);
      setAppId(result.data.appId ?? "");
      setMessage(result.message ?? "Vault updated.");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Privy vault operation failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const ok = await run(
      "/api/v1/admin/settings/privy-vault",
      "PUT",
      { appId, appSecret, vaultPassword },
    );

    if (ok) {
      setAppSecret("");
      setVaultPassword("");
    }
  }

  async function unlock() {
    const ok = await run(
      "/api/v1/admin/settings/privy-vault/unlock",
      "POST",
      { vaultPassword },
    );

    if (ok) setVaultPassword("");
  }

  async function lock() {
    await run("/api/v1/admin/settings/privy-vault/lock", "POST");
    setVaultPassword("");
    setAppSecret("");
  }

  if (loading) {
    return (
      <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-500">Loading Privy vault…</p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-xl font-black text-gray-950">Privy Wallet Configuration</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure the server credentials for embedded wallet integration.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
          status.unlocked
            ? "bg-green-50 text-green-700"
            : status.configured
              ? "bg-amber-50 text-amber-700"
              : "bg-gray-100 text-gray-600"
        }`}>
          {status.unlocked ? "Vault unlocked" : status.configured ? "Vault locked" : "Not configured"}
        </span>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </p>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-gray-700">Privy App ID</span>
          <input
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-yellow-500"
            placeholder="Privy App ID"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-gray-700">Privy App Secret</span>
          <input
            type="password"
            value={appSecret}
            onChange={(e) => setAppSecret(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-yellow-500"
            placeholder={status.configured ? "Enter new secret to rotate" : "Enter App Secret"}
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-2 block text-sm font-semibold text-gray-700">
            Separate vault password
          </span>
          <input
            type="password"
            value={vaultPassword}
            onChange={(e) => setVaultPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-yellow-500"
            placeholder="At least 16 characters"
          />
          <span className="mt-2 block text-xs text-gray-500">
            Never use your normal login password. The vault password is not stored.
          </span>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {!status.configured ? (
          <button
            type="button"
            disabled={busy || !appId.trim() || !appSecret || vaultPassword.length < 16}
            onClick={() => void save()}
            className="rounded-xl bg-[#FACC15] px-5 py-3 text-sm font-bold text-gray-950 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Encrypt and save credentials"}
          </button>
        ) : (
          <>
            {!status.unlocked ? (
              <button
                type="button"
                disabled={busy || vaultPassword.length < 16}
                onClick={() => void unlock()}
                className="rounded-xl bg-[#FACC15] px-5 py-3 text-sm font-bold text-gray-950 disabled:opacity-50"
              >
                {busy ? "Unlocking…" : "Unlock vault"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy || !appId.trim() || !appSecret || vaultPassword.length < 16}
                  onClick={() => void save()}
                  className="rounded-xl bg-[#FACC15] px-5 py-3 text-sm font-bold text-gray-950 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Rotate credentials"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void lock()}
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-bold text-gray-700 disabled:opacity-50"
                >
                  Lock vault
                </button>
              </>
            )}
          </>
        )}
      </div>

      <p className="mt-5 text-xs leading-5 text-gray-500">
        The App Secret is never returned to this page. Unlock sessions expire after five minutes.
        Wallet private keys are separate and must never be entered here.
      </p>
    </section>
  );
}
