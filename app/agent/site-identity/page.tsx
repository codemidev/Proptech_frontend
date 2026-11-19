"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Camera, Loader2, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";

type SiteIdentityResponse = {
  success: boolean;
  data: { captured: boolean; photoUrl: string | null; capturedAt: string | null };
};

export default function AgentSiteIdentityPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Live camera capture requires a secure browser connection.");
      }
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to access your camera. Check browser permissions.");
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    let active = true;
    apiFetch<SiteIdentityResponse>("/api/v1/agents/me/site-identity", getToken)
      .then((result) => {
        if (!active) return;
        if (result.data.captured) {
          router.replace("/dashboard");
          return;
        }
        void startCamera();
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load your site identity status.");
      });
    return () => {
      active = false;
      stopCamera();
    };
  }, [getToken, isLoaded, isSignedIn, router, startCamera, stopCamera]);

  async function captureAndSubmit() {
    const video = videoRef.current;
    if (!video || !cameraReady || !video.videoWidth || !video.videoHeight) {
      setError("Wait for the camera preview before capturing your selfie.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const canvas = document.createElement("canvas");
      const size = Math.min(video.videoWidth, video.videoHeight);
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Unable to prepare the camera image.");
      context.drawImage(
        video,
        (video.videoWidth - size) / 2,
        (video.videoHeight - size) / 2,
        size,
        size,
        0,
        0,
        size,
        size,
      );
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Camera capture failed.")), "image/jpeg", 0.9);
      });
      const form = new FormData();
      form.append("file", blob, "agent-site-selfie.jpg");
      await apiFetch("/api/v1/agents/me/site-identity", getToken, {
        method: "POST",
        body: form,
      });
      stopCamera();
      setNotice("Your permanent site identity photo and QR identity are ready.");
      router.replace("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save your site identity selfie.");
    } finally {
      setBusy(false);
    }
  }

  if (!isLoaded || !isSignedIn) {
    return <main className="flex min-h-screen items-center justify-center bg-[#111111] text-sm text-white/70">Loading secure site identity setup…</main>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111111] px-4 py-10">
      <section className="w-full max-w-xl overflow-hidden rounded-3xl border border-[#FACC15]/30 bg-[#171717] shadow-xl">
        <header className="bg-[#111111] px-6 py-6 text-white border-b border-[#FACC15]/40">
          <div className="flex items-center gap-3"><ShieldCheck className="text-[#FACC15]" size={26} /><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Aviritech PropTech</p><h1 className="mt-1 text-xl font-bold">Agent site identity setup</h1></div></div>
        </header>
        <div className="space-y-5 p-6">
          <div><h2 className="text-lg font-bold text-white">Capture your live site identity selfie</h2><p className="mt-1 text-sm leading-6 text-white/70">This photo is used on your permanent Agent ID card and shown to customers when they verify you at an assigned property inspection. It is stored separately from your KYC documents and profile photo.</p></div>
          <div className="overflow-hidden rounded-2xl border-2 border-[#FACC15] bg-black">
            <video ref={videoRef} autoPlay muted playsInline className="aspect-square w-full object-cover" />
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void startCamera()} disabled={busy} className="rounded-xl border border-[#FACC15]/70 bg-[#111111] px-4 py-3 text-sm font-semibold text-[#FACC15] hover:bg-[#242424] disabled:opacity-50">Enable camera</button>
            <button type="button" onClick={() => void captureAndSubmit()} disabled={!cameraReady || busy} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FACC15] px-4 py-3 text-sm font-bold text-[#111111] hover:bg-[#eabf0b] disabled:cursor-not-allowed disabled:opacity-50">{busy ? <><Loader2 size={17} className="animate-spin" /> Saving selfie…</> : <><Camera size={17} /> Capture and continue</>}</button>
          </div>
          <p className="text-xs leading-5 text-white/60">For a clear identity photo, face the camera directly, use good lighting, and remove anything that obscures your face. This camera-only capture flow does not by itself perform biometric liveness or anti-spoof verification.</p>
          {error && <p role="alert" className="rounded-xl border border-red-400/40 bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
          {notice && <p role="status" className="rounded-xl border border-[#FACC15]/40 bg-[#FACC15]/10 p-3 text-sm text-[#FACC15]">{notice}</p>}
        </div>
      </section>
    </main>
  );
}
