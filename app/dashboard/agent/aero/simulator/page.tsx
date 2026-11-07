"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import * as THREE from "three";

type Telemetry = {
  altitude: number;
  speed: number;
  heading: number;
  battery: number;
  latitude: number;
  longitude: number;
};

const INITIAL: Telemetry = {
  altitude: 0,
  speed: 0,
  heading: 0,
  battery: 100,
  latitude: 4.8156,
  longitude: 7.0498,
};

export default function AeroSimulatorPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const droneRef = useRef<THREE.Group | null>(null);
  const frameRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const telemetryRef = useRef(INITIAL);
  const [telemetry, setTelemetry] = useState(INITIAL);
  const [flying, setFlying] = useState(false);
  const [message, setMessage] = useState("Simulator ready");
  const [recording, setRecording] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#101b2d");
    scene.fog = new THREE.Fog("#101b2d", 25, 100);

    const camera = new THREE.PerspectiveCamera(
      55,
      mount.clientWidth / mount.clientHeight,
      0.1,
      500,
    );
    camera.position.set(7, 6, 10);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x26344a, 2));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(8, 15, 10);
    sun.castShadow = true;
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: "#26394a", roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.15;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(100, 50, "#71869b", "#40566b");
    grid.position.y = -0.12;
    scene.add(grid);

    const drone = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.25, 0.65),
      new THREE.MeshStandardMaterial({
        color: "#facc15",
        metalness: 0.35,
        roughness: 0.4,
      }),
    );
    body.castShadow = true;
    drone.add(body);

    const armMaterial = new THREE.MeshStandardMaterial({ color: "#dce5ee" });
    const rotorMaterial = new THREE.MeshStandardMaterial({ color: "#111827" });

    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(1.25, 0.09, 0.09),
        armMaterial,
      );
      arm.position.set(x * 0.42, 0, z * 0.28);
      arm.rotation.y = Math.atan2(z, x);
      drone.add(arm);

      const motor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 0.12, 16),
        rotorMaterial,
      );
      motor.position.set(x * 0.85, 0.08, z * 0.85);
      drone.add(motor);

      const rotor = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.025, 0.08),
        new THREE.MeshStandardMaterial({
          color: "#cbd5e1",
          transparent: true,
          opacity: 0.7,
        }),
      );
      rotor.position.set(x * 0.85, 0.17, z * 0.85);
      drone.add(rotor);
    }

    drone.position.y = 0.25;
    scene.add(drone);
    droneRef.current = drone;

    const marker = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1.3, 4),
      new THREE.MeshStandardMaterial({ color: "#facc15" }),
    );
    marker.position.set(0, 0.65, -5);
    scene.add(marker);

    const resize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", resize);

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const t = telemetryRef.current;
      const d = droneRef.current;
      if (d) {
        d.rotation.y = -THREE.MathUtils.degToRad(t.heading);
        d.position.y = 0.25 + t.altitude * 0.12;
        d.position.x = THREE.MathUtils.clamp(d.position.x, -35, 35);
        d.position.z = THREE.MathUtils.clamp(d.position.z, -35, 35);
      }
      if (d) {
        camera.position.lerp(
          new THREE.Vector3(d.position.x + 7, d.position.y + 6, d.position.z + 10),
          0.035,
        );
        camera.lookAt(d.position);
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
    };
  }, []);

  const updateFlight = useCallback((action: string) => {
    const current = { ...telemetryRef.current };

    if (action === "takeoff") {
      setFlying(true);
      current.altitude = Math.max(current.altitude, 5);
      setMessage("SIMULATED FLIGHT · TAKEOFF");
    } else if (action === "land") {
      current.altitude = 0;
      current.speed = 0;
      setFlying(false);
      setMessage("SIMULATED FLIGHT · LANDED");
    } else if (action === "up") {
      current.altitude = Math.min(120, current.altitude + 2);
    } else if (action === "down") {
      current.altitude = Math.max(0, current.altitude - 2);
    } else if (action === "left") {
      current.heading = (current.heading - 10 + 360) % 360;
    } else if (action === "right") {
      current.heading = (current.heading + 10) % 360;
    } else if (action === "forward") {
      if (current.altitude <= 0) {
        setMessage("Take off before moving the virtual drone");
        return;
      }

      current.speed = Math.min(20, current.speed + 1);
      const radians = THREE.MathUtils.degToRad(current.heading);
      const distance = Math.max(0.5, current.speed * 0.15);
      const drone = droneRef.current;

      if (drone) {
        const previousX = drone.position.x;
        const previousZ = drone.position.z;

        drone.position.x = THREE.MathUtils.clamp(
          previousX + Math.sin(radians) * distance,
          -35,
          35,
        );
        drone.position.z = THREE.MathUtils.clamp(
          previousZ - Math.cos(radians) * distance,
          -35,
          35,
        );

        current.longitude += (drone.position.x - previousX) * 0.00001;
        current.latitude -= (drone.position.z - previousZ) * 0.00001;
      }
    } else if (action === "back") {
      current.speed = Math.max(0, current.speed - 1);
    }

    telemetryRef.current = current;
    setTelemetry(current);
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
        event.preventDefault();
        if (keysRef.current.has(event.key)) return;
        keysRef.current.add(event.key);
        const map: Record<string, string> = {
          ArrowUp: "forward",
          ArrowDown: "back",
          ArrowLeft: "left",
          ArrowRight: "right",
          " ": "up",
        };
        updateFlight(map[event.key]);
      }
    };
    const up = (event: KeyboardEvent) => keysRef.current.delete(event.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [updateFlight]);

  useEffect(() => {
    if (!flying) return;
    const interval = window.setInterval(() => {
      const current = { ...telemetryRef.current };
      current.battery = Math.max(0, current.battery - 0.03);
      telemetryRef.current = current;
      setTelemetry(current);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [flying]);

  const capturePhoto = () => {
    const canvas = rendererRef.current?.domElement;
    if (!canvas) return;
    const image = canvas.toDataURL("image/png");
    setPhoto(image);
    const link = document.createElement("a");
    link.href = image;
    link.download = `aviritech-aero-sim-${Date.now()}.png`;
    link.click();
    setMessage("SIMULATED IMAGE CAPTURED");
  };

  const toggleRecording = () => {
    const canvas = rendererRef.current?.domElement;
    if (!canvas || !("MediaRecorder" in window)) {
      setMessage("Video recording is not supported by this browser");
      return;
    }

    if (recording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      return;
    }

    const stream = canvas.captureStream(24);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `aviritech-aero-sim-${Date.now()}.webm`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("SIMULATED VIDEO SAVED");
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    setMessage("SIMULATED VIDEO RECORDING");
  };

  const requestPhoneLocation = () => {
    if (!navigator.geolocation) {
      setMessage("Phone GPS is unavailable in this browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const current = {
          ...telemetryRef.current,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        telemetryRef.current = current;
        setTelemetry(current);
        setMessage("MOBILE GPS FIX · GROUND POSITION ONLY");
      },
      () => setMessage("Phone location permission was not granted"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <main className="min-h-screen bg-[#0b1423] text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 md:px-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-yellow-400">AVIRITECH AERO</p>
          <h1 className="text-xl font-bold md:text-2xl">Virtual Drone Simulator</h1>
        </div>
        <span className="rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-300">
          SIMULATION MODE
        </span>
      </header>

      <div className="grid gap-4 p-3 md:grid-cols-[1fr_310px] md:p-6">
        <section className="min-w-0 space-y-3">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#101b2d]">
            <div ref={mountRef} className="h-[48vh] min-h-[310px] w-full md:h-[65vh]" />
            <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-black/55 px-3 py-2 text-xs">
              <div className="font-bold text-yellow-300">{message}</div>
              <div className="mt-1 text-white/70">Virtual aerial view · Not real drone footage</div>
            </div>
            <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-2 text-xs">
              ALT {telemetry.altitude.toFixed(0)} m · HDG {telemetry.heading.toFixed(0)}°
            </div>
            <button
              onClick={() => setShowControls(!showControls)}
              className="absolute bottom-3 right-3 rounded-lg bg-yellow-400 px-3 py-2 text-xs font-bold text-slate-950"
            >
              {showControls ? "Hide controls" : "Show controls"}
            </button>
          </div>

          {showControls && (
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-[#111e30] p-3">
              <div />
              <button onClick={() => updateFlight("forward")} className="control">▲<span>Forward</span></button>
              <div />
              <button onClick={() => updateFlight("left")} className="control">◀<span>Turn left</span></button>
              <button onClick={() => updateFlight("down")} className="control">▼<span>Descend</span></button>
              <button onClick={() => updateFlight("right")} className="control">▶<span>Turn right</span></button>
              <button onClick={() => updateFlight("back")} className="control">−<span>Slow down</span></button>
              <button onClick={() => updateFlight("up")} className="control">＋<span>Ascend</span></button>
              <div />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button onClick={() => updateFlight("takeoff")} disabled={flying} className="action bg-yellow-400 text-slate-950 disabled:opacity-40">Take off</button>
            <button onClick={() => updateFlight("land")} disabled={!flying} className="action bg-white/10 disabled:opacity-40">Land</button>
            <button onClick={capturePhoto} className="action bg-white/10">Capture photo</button>
            <button onClick={toggleRecording} className={`action ${recording ? "bg-red-600" : "bg-white/10"}`}>
              {recording ? "Stop recording" : "Record video"}
            </button>
          </div>
        </section>

        <aside className="space-y-3">
          <section className="rounded-2xl border border-white/10 bg-[#111e30] p-4">
            <h2 className="mb-3 font-bold">Flight telemetry</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Altitude", `${telemetry.altitude.toFixed(0)} m`],
                ["Speed", `${telemetry.speed.toFixed(0)} km/h`],
                ["Heading", `${telemetry.heading.toFixed(0)}°`],
                ["Battery", `${telemetry.battery.toFixed(0)}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white/5 p-3">
                  <p className="text-xs text-white/50">{label}</p>
                  <p className="mt-1 text-xl font-bold">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-yellow-400" style={{ width: `${telemetry.battery}%` }} />
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#111e30] p-4">
            <h2 className="mb-3 font-bold">Position</h2>
            <p className="text-xs text-white/50">Latitude</p>
            <p className="font-mono">{telemetry.latitude.toFixed(6)}</p>
            <p className="mt-2 text-xs text-white/50">Longitude</p>
            <p className="font-mono">{telemetry.longitude.toFixed(6)}</p>
            <p className="mt-3 text-xs text-yellow-300">SIMULATED coordinates unless mobile GPS is requested.</p>
            <button onClick={requestPhoneLocation} className="action mt-3 w-full bg-white/10">
              Use phone GPS
            </button>
            <p className="mt-2 text-xs text-white/40">Phone GPS is ground-level positioning, not aerial drone GPS.</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#111e30] p-4">
            <h2 className="mb-2 font-bold">Capture status</h2>
            <p className="text-sm text-white/60">All captures from this simulator are labelled SIMULATED. They are not certified inspection evidence.</p>
            {photo && (
              <Image src={photo} alt="Latest simulated drone capture" width={640} height={360} unoptimized className="mt-3 h-auto w-full rounded-lg" />
            )}
          </section>
        </aside>
      </div>

      <style jsx>{`
        .control {
          min-height: 65px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 12px;
          background: rgba(255,255,255,.06);
          font-size: 20px;
          font-weight: 700;
          touch-action: manipulation;
        }
        .control span { font-size: 10px; font-weight: 500; color: #aebdce; }
        .action {
          min-height: 46px;
          border-radius: 11px;
          padding: 10px;
          font-size: 12px;
          font-weight: 700;
          touch-action: manipulation;
        }
      `}</style>
    </main>
  );
}
