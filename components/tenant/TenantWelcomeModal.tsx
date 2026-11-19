"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  House,
  Search,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";

type TenantWelcomeModalProps = {
  firstName?: string | null;
  onDismiss: () => void;
};

const highlights = [
  {
    icon: Search,
    title: "Discover homes",
    description: "Explore properties that fit your plans.",
    detail: "Find a place that feels right. Explore available homes and shortlist the ones you love.",
  },
  {
    icon: ClipboardList,
    title: "Track applications",
    description: "Keep your property journey organised.",
    detail: "Follow every application milestone and keep your rental journey moving with confidence.",
  },
  {
    icon: CalendarCheck,
    title: "Book inspections",
    description: "Arrange visits with confidence.",
    detail: "Choose a convenient inspection and get closer to seeing your next home in person.",
  },
  {
    icon: Wrench,
    title: "Get support",
    description: "Manage maintenance and home services.",
    detail: "Find help when you need it, from maintenance requests to important property updates.",
  },
];

function WelcomeUniverse() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = sceneHostRef.current;
    if (!canvas || !host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 5.2);

    const universe = new THREE.Group();
    scene.add(universe);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.02, 2),
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        metalness: 0.72,
        roughness: 0.24,
        emissive: 0x6b4e00,
        emissiveIntensity: 0.28,
        flatShading: true,
      }),
    );
    universe.add(core);

    const innerWire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.12, 1),
      new THREE.MeshBasicMaterial({
        color: 0xffe36a,
        wireframe: true,
        transparent: true,
        opacity: 0.42,
      }),
    );
    universe.add(innerWire);

    const orbitMaterial = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.58,
    });
    const orbit = new THREE.Mesh(
      new THREE.TorusGeometry(1.48, 0.008, 8, 120),
      orbitMaterial,
    );
    orbit.rotation.set(0.92, 0.34, 0.42);
    universe.add(orbit);

    const orbitTwo = new THREE.Mesh(
      new THREE.TorusGeometry(1.68, 0.004, 6, 120),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2,
      }),
    );
    orbitTwo.rotation.set(1.2, -0.62, -0.25);
    universe.add(orbitTwo);

    const particleCount = 220;
    const positions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      const radius = 1.85 + Math.random() * 1.05;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[index * 3 + 2] = radius * Math.cos(phi);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: 0xffdf55,
        size: 0.025,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true,
      }),
    );
    universe.add(particles);

    scene.add(new THREE.AmbientLight(0xffffff, 1.25));
    const keyLight = new THREE.PointLight(0xffd84d, 34, 12);
    keyLight.position.set(3, 3, 4);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0xffffff, 18, 10);
    rimLight.position.set(-3, -2, 2);
    scene.add(rimLight);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frameId = 0;
    let pointerX = 0;
    let pointerY = 0;
    let targetX = 0;
    let targetY = 0;

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = host.getBoundingClientRect();
      targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.5;
      targetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.35;
    };

    const animate = () => {
      frameId = window.requestAnimationFrame(animate);
      pointerX += (targetX - pointerX) * 0.035;
      pointerY += (targetY - pointerY) * 0.035;
      universe.rotation.y += 0.0028;
      universe.rotation.x += 0.0008;
      universe.rotation.y += (pointerX - universe.rotation.y * 0.08) * 0.008;
      universe.rotation.x += (pointerY - universe.rotation.x) * 0.008;
      core.rotation.y -= 0.0015;
      innerWire.rotation.y += 0.0018;
      orbit.rotation.z += 0.0016;
      particles.rotation.y -= 0.0007;
      renderer.render(scene, camera);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    host.addEventListener("pointermove", handlePointerMove);
    resize();

    if (reducedMotion.matches) {
      renderer.render(scene, camera);
    } else {
      animate();
    }

    const handleMotionPreference = () => {
      window.cancelAnimationFrame(frameId);
      if (reducedMotion.matches) {
        renderer.render(scene, camera);
      } else {
        animate();
      }
    };
    reducedMotion.addEventListener("change", handleMotionPreference);

    return () => {
      window.cancelAnimationFrame(frameId);
      reducedMotion.removeEventListener("change", handleMotionPreference);
      observer.disconnect();
      host.removeEventListener("pointermove", handlePointerMove);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={sceneHostRef}
      className="absolute inset-0"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}

export function TenantWelcomeModal({
  firstName,
  onDismiss,
}: TenantWelcomeModalProps) {
  const greetingName = firstName?.trim() || "there";
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const selectedFeature = highlights.find(
    (feature) => feature.title === activeFeature,
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/85 px-3 py-6 backdrop-blur-xl sm:px-6"
      role="presentation"
    >
      <section
        aria-labelledby="tenant-welcome-title"
        aria-describedby="tenant-welcome-description"
        aria-modal="true"
        className="relative my-auto w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/10 bg-[#111111] text-white shadow-[0_32px_100px_rgba(0,0,0,0.7)]"
        role="dialog"
      >
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#FACC15]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-white/[0.04] blur-3xl" />

        <div className="relative flex items-center justify-between border-b border-white/10 bg-[#090909] px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FACC15] text-[#090909] shadow-[0_0_28px_rgba(250,204,21,0.2)]">
              <House size={21} strokeWidth={2.4} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-extrabold tracking-[0.2em] text-white">AVIRITECH</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                PropTech · Tenant experience
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close welcome message"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/65 transition hover:border-[#FACC15]/50 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </div>

        <div className="relative px-5 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-9">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#FACC15]/25 bg-[#FACC15]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#FACC15]">
            <Sparkles size={13} aria-hidden="true" />
            A smarter way to experience home
          </div>

          <div className="grid gap-6 sm:grid-cols-[1.2fr_0.8fr] sm:items-center">
            <div>
              <h2
                id="tenant-welcome-title"
                className="max-w-md text-3xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-4xl"
              >
                Welcome{firstName?.trim() ? "," : ""}{" "}
                <span className="text-[#FACC15]">{greetingName}.</span>
                <span className="mt-1 block">Welcome home.</span>
              </h2>
              <p
                id="tenant-welcome-description"
                className="mt-4 max-w-md text-sm leading-6 text-white/65 sm:text-base"
              >
                Your property journey deserves a smarter experience. Discover,
                manage and enjoy your home with everything you need in one place.
              </p>
            </div>

            <div className="relative mx-auto flex aspect-square w-full max-w-[220px] items-center justify-center overflow-hidden rounded-[32px] border border-[#FACC15]/20 bg-[radial-gradient(circle_at_50%_45%,#35301b_0%,#1a1a1a_48%,#090909_100%)] shadow-[inset_0_0_50px_rgba(250,204,21,0.06),0_0_45px_rgba(250,204,21,0.08)] sm:max-w-[210px]">
              <div className="pointer-events-none absolute inset-3 rounded-[26px] border border-white/[0.07]" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,transparent_35%,rgba(0,0,0,0.38)_100%)]" />
              <WelcomeUniverse />
              <span className="pointer-events-none absolute bottom-4 z-10 text-[9px] font-bold uppercase tracking-[0.24em] text-white/55">
                Your home. Your universe.
              </span>
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                Everything starts here
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#FACC15]/65">
                Select a portal
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {highlights.map(({ icon: Icon, title, description }) => {
                const isActive = activeFeature === title;
                return (
                  <button
                    key={title}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActiveFeature(isActive ? null : title)}
                    className={`group relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border p-3.5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[#FACC15]/45 hover:bg-[#292929] hover:shadow-[0_8px_28px_rgba(250,204,21,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${isActive ? "border-[#FACC15]/65 bg-[#292929] shadow-[0_0_24px_rgba(250,204,21,0.1)]" : "border-white/[0.07] bg-[#1D1D1D]"}`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${isActive ? "bg-[#FACC15] text-[#090909]" : "bg-[#FACC15]/10 text-[#FACC15]"}`}>
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="block text-sm font-bold text-white">{title}</span>
                        <ArrowRight
                          size={13}
                          className={`transition-all duration-300 ${isActive ? "translate-x-0 text-[#FACC15] opacity-100" : "-translate-x-1 text-[#FACC15] opacity-0 group-hover:translate-x-0 group-hover:opacity-100"}`}
                          aria-hidden="true"
                        />
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-white/50">{description}</span>
                    </span>
                    {isActive && (
                      <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#FACC15] shadow-[0_0_10px_3px_rgba(250,204,21,0.5)]" />
                    )}
                  </button>
                );
              })}
            </div>
            <div
              className="mt-3 min-h-[54px] rounded-xl border border-[#FACC15]/15 bg-[#FACC15]/[0.05] px-4 py-3"
              aria-live="polite"
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#FACC15]/75">
                {selectedFeature ? `Portal activated · ${selectedFeature.title}` : "Your experience, your control"}
              </p>
              <p className="mt-1 text-xs leading-5 text-white/65">
                {selectedFeature?.detail ?? "Choose any portal above to preview what you can do inside Aviritech."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#FACC15] px-5 py-3.5 text-sm font-extrabold tracking-wide text-[#090909] shadow-[0_10px_32px_rgba(250,204,21,0.16)] transition hover:bg-[#FFDA38] hover:shadow-[0_12px_38px_rgba(250,204,21,0.24)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111] active:scale-[0.99]"
          >
            LET&apos;S GET STARTED
            <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" />
          </button>
          <p className="mt-3 text-center text-[10px] font-medium tracking-wide text-white/35">
            Your home. Your journey. Your Aviritech.
          </p>
        </div>
      </section>
    </div>
  );
}
