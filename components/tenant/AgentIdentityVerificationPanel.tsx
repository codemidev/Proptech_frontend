"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { AlertTriangle, Camera, CheckCircle2, Loader2, ShieldCheck, X } from "lucide-react";
import { apiFetch, resolveMediaUrl } from "@/lib/api";

type VerifiedAgent = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  avatar: string | null;
  clearanceTier: string | null;
  kycVerified: boolean;
};

type VerificationResponse = {
  success: boolean;
  data: {
    verified: boolean;
    expiresAt: string;
    agent: VerifiedAgent;
    message: string;
  };
};

type Detector = {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
};

type DetectorConstructor = new (options?: { formats: string[] }) => Detector;

export function AgentIdentityVerificationPanel({
  inspectionId,
  onVerified,
  onRevoked,
}: {
  inspectionId: string;
  onVerified: (agent: VerifiedAgent) => void;
  onRevoked: () => void;
}) {
  const { getToken } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [agent, setAgent] = useState<VerifiedAgent | null>(null);
  const [reporting, setReporting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  function stopCamera() {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function submitScannedCode(rawValue: string) {
    if (busy) return;
    const match = rawValue.trim().match(/AVIRITECH-AGENT:([A-Za-z0-9_-]{20,128})/i);
    const code = match?.[1];
    if (!code) {
      setError("This is not an Aviritech Agent ID QR code. Do not proceed.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await apiFetch<VerificationResponse>(
        \`/api/v1/inspections/\${encodeURIComponent(inspectionId)}/verify-agent\`,
        getToken,
        {
          method: "POST",
          body: JSON.stringify({ credentialCode: code }),
        },
      );
      if (!response.data?.verified || !response.data.agent) {
        throw new Error("The agent could not be verified for this inspection.");
      }
      setAgent(response.data.agent);
      setMessage(response.data.message);
      setConfirmed(false);
      stopCamera();
    } catch (err) {
      setAgent(null);
      onRevoked();
      setError(err instanceof Error
        ? err.message
        : "Agent verification failed. Do not proceed with this person.");
      stopCamera();
    } finally {
      setBusy(false);
    }
  }

  async function startCamera() {
    setError("");
    setMessage("");
    setAgent(null);
    setConfirmed(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is unavailable. Open this page in a secure mobile browser.");
      }
      const DetectorClass = (window as Window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
      if (!DetectorClass) {
        throw new Error("QR scanning is not supported by this browser. Please use the latest Chrome on Android.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      setCameraOpen(true);

      const video = videoRef.current;
      if (!video) throw new Error("Camera preview could not be initialized.");
      video.srcObject = stream;
      await video.play();

      const detector = new DetectorClass({ formats: ["qr_code"] });
      const scan = async () => {
        if (!streamRef.current || !videoRef.current) return;
        if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && codes[0]?.rawValue) {
              await submitScannedCode(codes[0].rawValue);
              return;
            }
          } catch {
            // Camera frames can be temporarily unreadable; continue scanning.
          }
        }
        frameRef.current = requestAnimationFrame(() => void scan());
      };
      frameRef.current = requestAnimationFrame(() => void scan());
    } catch (err) {
      stopCamera();
      setError(err instanceof Error ? err.message : "Unable to open the back camera.");
    }
  }

  async function reportMismatch() {
    setReporting(true);
    setError("");
    try {
      const response = await apiFetch<{ success: boolean; message?: string }>(
        \`/api/v1/inspections/\${encodeURIComponent(inspectionId)}/report-agent-mismatch\`,
        getToken,
        { method: "POST" },
      );
      setAgent(null);
      setConfirmed(false);
      onRevoked();
      setMessage(response.message || "Identity mismatch reported to Aviritech Admin and Super Admin.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit the safety report.");
    } finally {
      setReporting(false);
    }
  }

  const fullName = agent
    ? [agent.firstName, agent.lastName].filter(Boolean).join(" ") || "Verified Aviritech Agent"
    : "";

  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-[#1A3C6E]/15 bg-white shadow-sm">
      <div className="flex items-start gap-3 bg-[#1A3C6E] p-4 text-white">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
          <ShieldCheck size={21} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Aviritech Agent Safety Check</p>
          <p className="mt-1 text-xs leading-5 text-white/75">
            Scan the ID card using your phone&apos;s back camera. We verify the agent&apos;s KYC and assignment to this inspection.
          </p>
        </div>
        {cameraOpen && (
          <button type="button" onClick={stopCamera} className="rounded-lg p-2 text-white/80 hover:bg-white/10" aria-label="Close scanner">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="p-4">
        {!cameraOpen && !agent && (
          <button type="button" onClick={() => void startCamera()} disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FACC15] px-4 py-3 text-sm font-bold text-[#1A3C6E] transition hover:brightness-95 disabled:opacity-60">
            {busy ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />}
            Scan agent ID with back camera
          </button>
        )}

        {cameraOpen && (
          <div className="relative overflow-hidden rounded-2xl bg-slate-950">
            <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-44 w-64 rounded-2xl border-2 border-[#FACC15] shadow-[0_0_0_999px_rgba(0,0,0,0.32)]" />
            </div>
            <p className="absolute bottom-3 left-3 right-3 rounded-lg bg-black/60 px-3 py-2 text-center text-xs font-medium text-white">
              Hold the agent&apos;s QR card inside the frame
            </p>
          </div>
        )}

        {busy && <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-600"><Loader2 size={14} className="animate-spin" /> Verifying identity and inspection assignment…</p>}

        {agent && (
          <div className="mt-1 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-3">
              {agent.avatar ? (
                <img src={resolveMediaUrl(agent.avatar)} alt={fullName} className="h-16 w-16 rounded-xl border-2 border-white object-cover shadow-sm" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white text-2xl font-bold text-[#1A3C6E]">{fullName.slice(0, 1)}</div>
              )}
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800"><CheckCircle2 size={13} /> Verified & assigned</p>
                <p className="mt-1 text-base font-bold text-slate-950">{fullName}</p>
                <p className="mt-0.5 text-xs text-slate-600">{agent.phoneNumber || "Phone number not available"}</p>
                <p className="mt-1 text-[11px] font-semibold text-emerald-800">Aviritech KYC verified · {agent.clearanceTier?.replaceAll("_", " ") || "Agent"}</p>
              </div>
            </div>
            <p className="mt-3 rounded-xl bg-white/80 p-3 text-xs leading-5 text-slate-700">{message}</p>
            {!confirmed ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => { setConfirmed(true); onVerified(agent); }} className="min-h-11 rounded-xl bg-[#1A3C6E] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#142f57]">Photo matches — continue</button>
                <button type="button" disabled={reporting} onClick={() => void reportMismatch()} className="min-h-11 rounded-xl border border-red-200 bg-white px-3 py-2.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-60">{reporting ? "Reporting…" : "Photo does not match"}</button>
              </div>
            ) : (
              <p className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-800"><CheckCircle2 size={15} /> Identity confirmed. Accept & Apply / Reject are now enabled.</p>
            )}
          </div>
        )}

        {error && (
          <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {message && !agent && !error && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">{message}</p>
        )}
        {agent && confirmed && (
          <button type="button" onClick={() => { setAgent(null); setConfirmed(false); onRevoked(); }} className="mt-3 text-xs font-semibold text-slate-500 underline underline-offset-2">Rescan agent ID</button>
        )}
      </div>
    </section>
  );
}
