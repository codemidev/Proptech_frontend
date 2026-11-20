"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import * as THREE from "three";
import { apiFetch } from "@/lib/api";

type ApiResponse<T> = { success: boolean; data: T; message?: string };
type Bank = { id: number; code: string; name: string };
type CashStatus = {
  enabled: boolean;
  providerConfigured: boolean;
  payoutConfigured: boolean;
  payoutRates: { MTN: number; AIRTEL: number; GLO: number; NINE_MOBILE: number };
  message: string;
};
type RequestItem = {
  id: string;
  reference: string;
  network: string;
  amount: string | number;
  quotedPayout: string | number | null;
  bankName: string | null;
  accountName: string | null;
  status: string;
  providerMessage: string | null;
  flutterwaveTransferStatus: string | null;
  createdAt: string;
};

const limits: Record<string, { min: number; max: number }> = {
  MTN: { min: 50, max: 10000 },
  AIRTEL: { min: 50, max: 20000 },
  GLO: { min: 50, max: 1000 },
  NINE_MOBILE: { min: 50, max: 20000 },
};

const money = (value: number) => new Intl.NumberFormat("en-NG", {
  style: "currency", currency: "NGN", maximumFractionDigits: 0,
}).format(value);

function AlienSignal({ active }: { active: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const element = host.current;
    if (!element) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    element.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.z = 6.2;

    const core = new THREE.Group();
    scene.add(core);

    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.25, 2),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, wireframe: true, transparent: true, opacity: 0.78 }),
    );
    core.add(shell);

    const inner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.82, 1),
      new THREE.MeshBasicMaterial({ color: 0xffe680, wireframe: true, transparent: true, opacity: 0.22 }),
    );
    core.add(inner);

    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.42, wireframe: true });
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.012, 8, 140), ringMaterial);
    ringA.rotation.x = 1.12;
    ringA.rotation.y = 0.34;
    core.add(ringA);

    const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.008, 8, 140), ringMaterial.clone());
    ringB.rotation.x = -0.72;
    ringB.rotation.y = 0.86;
    core.add(ringB);

    const count = 520;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const radius = 2.05 + Math.random() * 1.15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({ color: 0xfacc15, size: 0.018, transparent: true, opacity: 0.8 }),
    );
    scene.add(particles);

    const glow = new THREE.PointLight(0xfacc15, 3.5, 10);
    glow.position.set(1.8, 1.4, 3);
    scene.add(glow);

    const resize = () => {
      const width = Math.max(1, element.clientWidth);
      const height = Math.max(1, element.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();

    const onPointer = (event: PointerEvent) => {
      const bounds = element.getBoundingClientRect();
      pointer.current.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      pointer.current.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    };
    element.addEventListener("pointermove", onPointer);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      core.rotation.y += 0.0024;
      core.rotation.x += 0.0008;
      core.rotation.y += (pointer.current.x * 0.28 - core.rotation.y) * 0.003;
      core.rotation.x += (-pointer.current.y * 0.2 - core.rotation.x) * 0.003;
      ringA.rotation.z += 0.0018;
      ringB.rotation.z -= 0.0012;
      particles.rotation.y -= 0.0005;
      shell.scale.setScalar(active ? 1 + Math.sin(Date.now() * 0.002) * 0.018 : 1);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      element.removeEventListener("pointermove", onPointer);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [active]);

  return <div ref={host} className="pointer-events-auto absolute inset-0 opacity-90" aria-hidden="true" />;
}

export default function AirtimeToCashExperience() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [status, setStatus] = useState<CashStatus | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [history, setHistory] = useState<RequestItem[]>([]);
  const [network, setNetwork] = useState("MTN");
  const [sender, setSender] = useState("");
  const [amount, setAmount] = useState("2000");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [requestId, setRequestId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadHistory = useCallback(async () => {
    const response = await apiFetch<ApiResponse<RequestItem[]>>("/api/v1/airtime-data-cash/me", getToken);
    setHistory(response.data ?? []);
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    void Promise.all([
      apiFetch<ApiResponse<CashStatus>>("/api/v1/airtime-data-cash/status", getToken),
      apiFetch<ApiResponse<RequestItem[]>>("/api/v1/airtime-data-cash/me", getToken),
    ]).then(async ([service, requests]) => {
      if (cancelled) return;
      setStatus(service.data);
      setHistory(requests.data ?? []);
      if (service.data.payoutConfigured) {
        try {
          const bankList = await apiFetch<ApiResponse<Bank[]>>("/api/v1/airtime-data-cash/banks", getToken);
          if (!cancelled) setBanks(bankList.data ?? []);
        } catch (err) {
          if (!cancelled) setError(err instanceof Error ? err.message : "Bank directory is temporarily unavailable.");
        }
      }
    }).catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load Airtime-to-Cash.");
    });
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken]);

  const rate = status?.payoutRates?.[network as keyof CashStatus["payoutRates"]] ?? 0;
  const numericAmount = Number(amount);
  const payout = Number.isFinite(numericAmount) ? Math.round(numericAmount * rate / 100) : 0;
  const margin = Math.max(0, numericAmount - payout);
  const range = limits[network];

  async function resolveBankAccount() {
    setBusy(true); setError(""); setNotice(""); setAccountName("");
    try {
      const response = await apiFetch<ApiResponse<{ accountName: string; accountNumber: string }>>(
        "/api/v1/airtime-data-cash/resolve-account", getToken,
        { method: "POST", body: JSON.stringify({ accountNumber, bankCode }) },
      );
      setAccountName(response.data.accountName);
      setNotice("Bank account verified. Check the account name before continuing.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify this bank account.");
    } finally { setBusy(false); }
  }

  async function startRequest() {
    if (!status?.enabled) { setError("Airtime-to-Cash is not currently available."); return; }
    if (!accountName || !sender.trim() || !range || numericAmount < range.min || numericAmount > range.max) {
      setError("Complete the sender, amount and verified bank details first."); return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await apiFetch<ApiResponse<{ id: string; reference: string }>>(
        "/api/v1/airtime-data-cash", getToken,
        { method: "POST", body: JSON.stringify({
          type: "AIRTIME_TO_CASH", network, amount: numericAmount,
          payoutMethod: "BANK", sender, bankCode, accountNumber,
        }) },
      );
      setRequestId(response.data.id);
      setOtp(""); setPin("");
      setNotice(response.message || "OTP sent. Enter the code and SIM transfer PIN to continue.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start conversion.");
    } finally { setBusy(false); }
  }

  async function verifyAndConvert() {
    if (!requestId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await apiFetch<ApiResponse<{ status: string }>>(
        `/api/v1/airtime-data-cash/${encodeURIComponent(requestId)}/convert`, getToken,
        { method: "POST", body: JSON.stringify({ otp, pin }) },
      );
      setNotice(response.message || "Airtime transfer submitted for settlement review.");
      setRequestId(""); setOtp(""); setPin("");
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Airtime transfer could not be completed.");
      await loadHistory().catch(() => undefined);
    } finally { setBusy(false); }
  }

  if (!isLoaded || (isSignedIn && !status)) {
    return <section className="my-7 rounded-3xl border border-yellow-400/20 bg-[#050505] p-6 text-sm text-yellow-100">Initializing secure conversion channel…</section>;
  }
  if (!isSignedIn) return null;

  return (
    <section className="my-8 overflow-hidden rounded-[28px] border border-yellow-400/25 bg-[#050505] text-white shadow-[0_0_60px_rgba(250,204,21,0.08)]">
      <div className="relative isolate min-h-[230px] overflow-hidden border-b border-yellow-400/15 bg-[radial-gradient(circle_at_70%_50%,rgba(250,204,21,0.13),transparent_40%),linear-gradient(120deg,#050505,#111108_55%,#050505)] px-6 py-7 sm:px-8">
        <AlienSignal active={Boolean(status?.enabled)} />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#050505_0%,rgba(5,5,5,0.88)_42%,transparent_100%)]" />
        <div className="relative z-10 max-w-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-yellow-400">Aviritech · Utilities / Liquidity rail</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">AIRTIME <span className="text-yellow-400">→ CASH</span></h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-gray-300">Convert unused Nigerian airtime into a verified bank payout. OTP protected. Settlement reviewed. No wallet holding.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
            <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1.5 text-yellow-200">Secure channel</span>
            <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-gray-300">Flutterwave payout</span>
            <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-gray-300">3D signal active</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-200">{error}</p>}
          {notice && <p role="status" className="rounded-xl border border-yellow-400/25 bg-yellow-400/10 p-3 text-sm text-yellow-100">{notice}</p>}
          {!status?.enabled && <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 text-sm text-yellow-100">Conversion is currently paused by Aviritech administrators. You can view the workflow, but requests cannot be submitted.</div>}

          {!requestId ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Mobile network
                  <select value={network} onChange={(e) => { setNetwork(e.target.value); setAccountName(""); }} className="mt-2 w-full rounded-xl border border-white/15 bg-[#151515] px-3 py-3 text-sm font-semibold text-white outline-none focus:border-yellow-400">
                    <option value="MTN">MTN</option><option value="AIRTEL">Airtel</option><option value="GLO">Glo</option><option value="NINE_MOBILE">9mobile / T2</option>
                  </select>
                </label>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Airtime amount (₦)
                  <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min={range?.min ?? 50} max={range?.max ?? 20000} step="1" className="mt-2 w-full rounded-xl border border-white/15 bg-[#151515] px-3 py-3 text-sm font-semibold text-white outline-none focus:border-yellow-400" />
                  <span className="mt-1 block text-[10px] normal-case tracking-normal text-gray-500">Allowed: ₦{range?.min.toLocaleString()} – ₦{range?.max.toLocaleString()}</span>
                </label>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 sm:col-span-2">Sender&apos;s phone number
                  <input value={sender} onChange={(e) => setSender(e.target.value)} inputMode="tel" placeholder="080XXXXXXXX" className="mt-2 w-full rounded-xl border border-white/15 bg-[#151515] px-3 py-3 text-sm text-white outline-none focus:border-yellow-400" />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Destination bank
                  <select value={bankCode} onChange={(e) => { setBankCode(e.target.value); setAccountName(""); }} className="mt-2 w-full rounded-xl border border-white/15 bg-[#151515] px-3 py-3 text-sm text-white outline-none focus:border-yellow-400">
                    <option value="">Select bank</option>
                    {banks.filter((bank) => /^\d+$/.test(bank.code)).map((bank) => <option key={bank.id} value={bank.code}>{bank.name}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Account number
                  <input value={accountNumber} onChange={(e) => { setAccountNumber(e.target.value); setAccountName(""); }} inputMode="numeric" maxLength={10} placeholder="10-digit account number" className="mt-2 w-full rounded-xl border border-white/15 bg-[#151515] px-3 py-3 text-sm text-white outline-none focus:border-yellow-400" />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => void resolveBankAccount()} disabled={busy || !bankCode || accountNumber.length !== 10} className="rounded-xl border border-yellow-400/50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-yellow-200 hover:bg-yellow-400/10 disabled:opacity-40">Verify bank account</button>
                {accountName && <span className="text-sm font-semibold text-yellow-200">✓ {accountName}</span>}
              </div>
              <div className="rounded-2xl border border-yellow-400/20 bg-[#111108] p-4">
                <div className="flex items-center justify-between gap-3"><span className="text-xs uppercase tracking-wider text-gray-400">Estimated bank payout</span><span className="text-[10px] font-bold uppercase tracking-wider text-yellow-300">{rate > 0 ? `${rate}% payout rate` : "Rate unavailable"}</span></div>
                <p className="mt-2 text-3xl font-black tracking-tight text-yellow-300">{money(payout)}</p>
                <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-xs"><span className="text-gray-400">Airtime value</span><span className="font-semibold text-white">{money(numericAmount || 0)}</span></div>
                <div className="mt-2 flex justify-between text-xs"><span className="text-gray-400">Aviritech gross margin</span><span className="font-semibold text-white">{money(margin)}</span></div>
                <p className="mt-3 text-[10px] leading-5 text-gray-500">The payout is fixed at request creation. The gross margin is before provider and payout operating costs.</p>
              </div>
              <button type="button" onClick={() => void startRequest()} disabled={busy || !status?.enabled || !accountName || !sender.trim() || !Number.isSafeInteger(numericAmount) || numericAmount < (range?.min ?? 50) || numericAmount > (range?.max ?? 20000) || payout <= 0} className="w-full rounded-xl bg-[#FACC15] px-5 py-4 text-sm font-black uppercase tracking-wider text-black shadow-[0_0_28px_rgba(250,204,21,0.2)] transition hover:-translate-y-0.5 hover:bg-yellow-300 disabled:translate-y-0 disabled:opacity-40">{busy ? "Establishing secure session…" : "Generate OTP & continue"}</button>
            </>
          ) : (
            <div className="space-y-4 rounded-2xl border border-yellow-400/25 bg-[#111108] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-300">Identity challenge</p>
              <h3 className="text-xl font-bold">Verify your SIM</h3>
              <p className="text-sm text-gray-400">Enter the OTP sent by your mobile network and your SIM transfer PIN. These values are used only for this transfer and are not stored.</p>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">SMS one-time password
                <input value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" maxLength={8} className="mt-2 w-full rounded-xl border border-white/15 bg-[#151515] px-3 py-3 text-lg tracking-[0.3em] text-white outline-none focus:border-yellow-400" />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">SIM transfer PIN
                <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" inputMode="numeric" maxLength={6} autoComplete="off" className="mt-2 w-full rounded-xl border border-white/15 bg-[#151515] px-3 py-3 text-lg tracking-[0.3em] text-white outline-none focus:border-yellow-400" />
              </label>
              <button type="button" onClick={() => void verifyAndConvert()} disabled={busy || otp.length < 4 || pin.length < 4} className="w-full rounded-xl bg-[#FACC15] px-5 py-4 text-sm font-black uppercase tracking-wider text-black disabled:opacity-40">{busy ? "Verifying transfer…" : "Verify OTP & transfer airtime"}</button>
              <button type="button" onClick={async () => {
                setBusy(true); setError(""); setNotice("");
                try {
                  const response = await apiFetch<ApiResponse<unknown>>(
                    `/api/v1/airtime-data-cash/${encodeURIComponent(requestId)}/cancel`,
                    getToken,
                    { method: "POST" },
                  );
                  setRequestId(""); setOtp(""); setPin("");
                  setNotice(response.message || "Conversion request cancelled.");
                  await loadHistory();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Unable to cancel this conversion request.");
                } finally { setBusy(false); }
              }} disabled={busy} className="w-full rounded-xl border border-white/15 px-4 py-3 text-xs font-semibold text-gray-300 disabled:opacity-40">Cancel request</button>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-300">Settlement protocol</p>
            <ol className="mt-4 space-y-4 text-sm">
              {[
                ["01", "Bank account verified", "Flutterwave resolves the account name before request creation."],
                ["02", "SIM ownership verified", "Network OTP and SIM transfer PIN authorize the airtime movement."],
                ["03", "Airtime transfer confirmed", "Provider response and balance details are recorded."],
                ["04", "Cash receipt reviewed", "Aviritech verifies actual cash settlement before payout."],
                ["05", "Bank payout reconciled", "Flutterwave transfer status is checked before completion."],
              ].map(([step, title, description]) => <li key={step} className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-yellow-400/30 bg-yellow-400/10 font-mono text-xs font-bold text-yellow-200">{step}</span><span><b className="block text-white">{title}</b><span className="mt-1 block text-xs leading-5 text-gray-500">{description}</span></span></li>)}
            </ol>
          </div>
          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-300">Network limits</p>
            <div className="mt-3 space-y-2 text-xs">
              {Object.entries(limits).map(([key, value]) => <div key={key} className="flex justify-between"><span className="text-gray-400">{key.replace("_", " ")}</span><span className="font-semibold text-white">₦{value.min.toLocaleString()} – ₦{value.max.toLocaleString()}</span></div>)}
            </div>
          </div>
        </aside>
      </div>

      <div className="border-t border-white/10 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-white">Your conversion activity</h3><p className="mt-1 text-xs text-gray-500">Airtime transfers and bank payout status.</p></div><button type="button" onClick={() => void loadHistory()} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-yellow-200 hover:border-yellow-400">Refresh</button></div>
        <div className="mt-4 space-y-2">
          {history.length === 0 ? <p className="rounded-xl border border-white/10 bg-[#101010] p-4 text-sm text-gray-500">No conversions yet.</p> : history.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#101010] p-4">
            <div><p className="text-sm font-semibold text-white">{item.network.replace("_", " ")} · {money(Number(item.amount))}</p><p className="mt-1 font-mono text-[10px] text-gray-500">{item.reference}</p><p className="mt-1 text-xs text-gray-400">{item.bankName} · {item.accountName}</p></div>
            <div className="text-right"><p className="font-bold text-yellow-200">{item.quotedPayout == null ? "—" : money(Number(item.quotedPayout))}</p><span className="mt-1 inline-block rounded-full border border-yellow-400/25 bg-yellow-400/10 px-2.5 py-1 text-[10px] font-bold uppercase text-yellow-200">{item.status.replaceAll("_", " ")}</span></div>
          </div>)}
        </div>
      </div>
    </section>
  );
}
