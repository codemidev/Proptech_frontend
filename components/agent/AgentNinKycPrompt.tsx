"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

type Submission = {
  id: string;
  status: string;
  ninLast4?: string | null;
  submittedAt: string;
};

type ApiResponse<T> = { success: boolean; data: T; message?: string };

export function AgentNinKycPrompt() {
  const { getToken } = useAuth();
  const [checked, setChecked] = useState(false);
  const [required, setRequired] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [nin, setNin] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await apiFetch<ApiResponse<Submission[]>>(
        "/api/v1/agents/me/kyc",
        getToken,
      );
      const latest = Array.isArray(response.data) ? response.data[0] : undefined;
      const hasNin = Boolean(latest?.ninLast4);
      setRequired(!hasNin);
    } catch {
      // Do not infer that the agent has submitted NIN when the status check fails.
      setRequired(true);
    } finally {
      setChecked(true);
    }
  }, [getToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!/^\\d{11}$/.test(nin)) {
      setError("Enter your 11-digit NIN.");
      return;
    }
    if (!file) {
      setError("Upload a government-issued identity document.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("The selected file exceeds the 10 MB limit.");
      return;
    }
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Upload a PDF, JPG, PNG or WebP document.");
      return;
    }

    const body = new FormData();
    body.append("file", file);
    body.append("documentType", "GOVERNMENT_ID");
    body.append("nin", nin);

    setBusy(true);
    try {
      const response = await apiFetch<ApiResponse<Submission>>(
        "/api/v1/agents/me/kyc/documents",
        getToken,
        { method: "POST", body },
      );
      setNotice(response.message || "Your NIN and identity document have been submitted securely.");
      setNin("");
      setFile(null);
      const input = document.getElementById("agent-nin-kyc-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await refresh();
      setDismissed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "NIN submission failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!checked || !required) return null;

  return (
    <>
      {dismissed ? (
        <div className="fixed bottom-4 right-4 z-[90] max-w-sm rounded-xl border border-amber-200 bg-white p-4 shadow-xl">
          <p className="text-sm font-semibold text-slate-900">NIN verification required</p>
          <p className="mt-1 text-xs text-slate-600">Submit your NIN to unlock Agent Network operations.</p>
          <button type="button" onClick={() => setDismissed(false)} className="mt-3 rounded-lg bg-[#1A3C6E] px-4 py-2 text-xs font-bold text-white">Submit NIN</button>
        </div>
      ) : (
        <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="agent-nin-title">
          <section className="my-auto w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b28b00]">Mandatory agent verification</p>
                <h2 id="agent-nin-title" className="mt-2 text-xl font-bold text-slate-950">Submit your NIN</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">All Aviritech agents must submit their 11-digit National Identification Number and a government-issued identity document for administrator verification.</p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Required</span>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="agent-nin-number" className="mb-1.5 block text-sm font-semibold text-slate-800">National Identification Number (NIN)</label>
                <input id="agent-nin-number" type="text" inputMode="numeric" autoComplete="off" maxLength={11} value={nin} onChange={(event) => setNin(event.target.value.replace(/\\D/g, "").slice(0, 11))} placeholder="Enter your 11-digit NIN" required className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm text-slate-900 outline-none focus:border-[#1A3C6E] focus:ring-2 focus:ring-blue-100" />
              </div>

              <div>
                <label htmlFor="agent-nin-kyc-file" className="mb-1.5 block text-sm font-semibold text-slate-800">Government-issued identity document</label>
                <input id="agent-nin-kyc-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required className="block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-[#1A3C6E] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white" />
                <p className="mt-1 text-xs text-slate-500">PDF, JPG, PNG or WebP. Maximum 10 MB.</p>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">
                Your NIN is encrypted before storage. It is not shown in full in your dashboard and is accessible only to authorized administrators for verification. Onsite Face ID does not replace NIN verification.
              </div>

              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

              <button type="submit" disabled={busy} className="w-full rounded-lg bg-[#1A3C6E] px-4 py-3 text-sm font-bold text-white hover:bg-[#142f57] disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Submitting securely..." : "Submit NIN for verification"}</button>
              <button type="button" disabled={busy} onClick={() => setDismissed(true)} className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Remind me later</button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
