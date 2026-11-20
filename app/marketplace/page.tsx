"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  ArrowRight,
  BedDouble,
  Boxes,
  Cable,
  Camera,
  ChevronRight,
  ClipboardList,
  CookingPot,
  Hammer,
  Home,
  Lightbulb,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Truck,
  Wrench,
} from "lucide-react";

const categories = [
  { id: "groceries", label: "Groceries & Essentials", description: "Everyday household supplies, pantry items and cleaning products.", icon: ShoppingBasket, group: "Shop" },
  { id: "furniture", label: "Furniture & Home", description: "Furniture, kitchenware, bedding, décor and home organisation.", icon: BedDouble, group: "Shop" },
  { id: "appliances", label: "Appliances & Electronics", description: "Home appliances, electronics and everyday equipment.", icon: CookingPot, group: "Shop" },
  { id: "building", label: "Home Improvement", description: "Electrical, plumbing, hardware, paint and building materials.", icon: Hammer, group: "Shop" },
  { id: "iot", label: "IoT & Smart Home", description: "Smart locks, sensors, CCTV, access control and automation.", icon: Camera, group: "Smart living" },
  { id: "networking", label: "Connectivity & Power", description: "Internet, networking, backup power and energy solutions.", icon: Cable, group: "Smart living" },
  { id: "cleaning", label: "Cleaning Services", description: "Home cleaning, deep cleaning and scheduled housekeeping.", icon: Home, group: "Services" },
  { id: "repairs", label: "Repairs & Maintenance", description: "Plumbing, electrical, HVAC, carpentry and general repairs.", icon: Wrench, group: "Services" },
  { id: "moving", label: "Moving & Delivery", description: "Home moves, item collection and last-mile delivery.", icon: Truck, group: "Services" },
  { id: "security", label: "Safety & Security", description: "Security professionals, smart security and safety equipment.", icon: ShieldCheck, group: "Services" },
];

const groups = ["All", "Shop", "Smart living", "Services"];


function MarketplaceScene() {
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setClearColor(0x000000, 0);
    element.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 9);
    const stage = new THREE.Group();
    scene.add(stage);

    const dark = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.62, metalness: 0.12, transparent: true, opacity: 0.48 });
    const darkSoft = new THREE.MeshStandardMaterial({ color: 0x252525, roughness: 0.7, transparent: true, opacity: 0.36 });
    const yellow = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.15 });
    const cyan = new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.4, metalness: 0.1 });
    const coral = new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.45 });
    const violet = new THREE.MeshStandardMaterial({ color: 0xa78bfa, roughness: 0.45 });
    const green = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.45 });

    const addMesh = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    };

    // Floating parcel with a contrasting tape strip.
    const parcel = new THREE.Group();
    parcel.position.set(-2.05, 0.25, 0);
    parcel.rotation.set(0.28, -0.42, -0.12);
    stage.add(parcel);
    addMesh(new THREE.BoxGeometry(1.45, 1.15, 1.05), dark, parcel, 0, 0, 0);
    addMesh(new THREE.BoxGeometry(0.2, 1.17, 1.07), yellow, parcel, 0.12, 0, 0.01);
    addMesh(new THREE.BoxGeometry(1.47, 0.14, 1.07), darkSoft, parcel, 0, 0.38, 0.01);

    // Mobile device / smart-home product.
    const phone = new THREE.Group();
    phone.position.set(1.9, -0.05, 0.15);
    phone.rotation.set(0.12, 0.36, 0.22);
    stage.add(phone);
    addMesh(new THREE.BoxGeometry(0.92, 1.62, 0.16), dark, phone, 0, 0, 0);
    addMesh(new THREE.BoxGeometry(0.78, 1.35, 0.025), darkSoft, phone, 0, 0.02, 0.095);
    addMesh(new THREE.BoxGeometry(0.34, 0.055, 0.025), cyan, phone, 0, -0.42, 0.12);
    addMesh(new THREE.SphereGeometry(0.12, 18, 18), coral, phone, 0.2, 0.36, 0.12);

    // Shopping bag and handle.
    const bag = new THREE.Group();
    bag.position.set(0.05, -0.85, 0.55);
    bag.rotation.z = -0.12;
    stage.add(bag);
    addMesh(new THREE.BoxGeometry(0.88, 0.78, 0.52), darkSoft, bag, 0, 0, 0);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 8, 28, Math.PI), dark);
    handle.position.set(0, 0.43, 0.02);
    handle.rotation.z = Math.PI;
    bag.add(handle);
    addMesh(new THREE.BoxGeometry(0.18, 0.18, 0.04), violet, bag, 0.18, -0.02, 0.29);

    // Small home object and accent product tile.
    const home = new THREE.Group();
    home.position.set(-0.15, 1.15, -0.25);
    home.rotation.set(0.2, -0.28, 0.1);
    stage.add(home);
    addMesh(new THREE.BoxGeometry(0.92, 0.72, 0.72), dark, home, 0, 0, 0);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.58, 4), dark);
    roof.position.set(0, 0.62, 0);
    roof.rotation.y = Math.PI / 4;
    home.add(roof);
    addMesh(new THREE.BoxGeometry(0.18, 0.28, 0.035), green, home, 0.18, -0.08, 0.38);

    const orbit = new THREE.Mesh(
      new THREE.TorusGeometry(2.8, 0.012, 6, 120),
      new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.12 }),
    );
    orbit.rotation.x = 0.9;
    orbit.rotation.y = 0.2;
    stage.add(orbit);

    const dotsGeometry = new THREE.BufferGeometry();
    const dotPositions = new Float32Array(120 * 3);
    for (let i = 0; i < 120; i += 1) {
      dotPositions[i * 3] = (Math.random() - 0.5) * 7;
      dotPositions[i * 3 + 1] = (Math.random() - 0.5) * 4.5;
      dotPositions[i * 3 + 2] = -1.5 + Math.random();
    }
    dotsGeometry.setAttribute("position", new THREE.BufferAttribute(dotPositions, 3));
    const dots = new THREE.Points(dotsGeometry, new THREE.PointsMaterial({ color: 0x171717, size: 0.025, transparent: true, opacity: 0.24 }));
    scene.add(dots);

    scene.add(new THREE.AmbientLight(0xffffff, 2.1));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.3);
    keyLight.position.set(3, 5, 7);
    scene.add(keyLight);

    const resize = () => {
      const width = Math.max(1, element.clientWidth);
      const height = Math.max(1, element.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      camera.position.z = width < 540 ? 10.8 : 9;
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
    const started = performance.now();
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      const t = (now - started) * 0.001;
      stage.rotation.y += (pointer.current.x * 0.18 - stage.rotation.y) * 0.025;
      stage.rotation.x += (-pointer.current.y * 0.1 - stage.rotation.x) * 0.025;
      parcel.position.y = 0.25 + Math.sin(t * 1.1) * 0.12;
      phone.position.y = -0.05 + Math.sin(t * 1.25 + 1.4) * 0.16;
      bag.position.y = -0.85 + Math.sin(t * 0.9 + 2.1) * 0.1;
      home.rotation.y = -0.28 + Math.sin(t * 0.65) * 0.12;
      orbit.rotation.z += 0.0018;
      dots.rotation.y += 0.00035;
      renderer.render(scene, camera);
    };
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!motionQuery.matches) animate(performance.now());
    else renderer.render(scene, camera);

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
      [dark, darkSoft, yellow, cyan, coral, violet, green].forEach((material) => material.dispose());
    };
  }, []);

  return <div ref={host} className="pointer-events-auto absolute inset-0" aria-hidden="true" />;
}

export default function MarketplacePage() {
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("All");

  const visibleCategories = useMemo(() => {
    const term = query.trim().toLowerCase();
    return categories.filter((category) => {
      const matchesGroup = activeGroup === "All" || category.group === activeGroup;
      const matchesSearch = !term || `${category.label} ${category.description}`.toLowerCase().includes(term);
      return matchesGroup && matchesSearch;
    });
  }, [activeGroup, query]);

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <header className="border-b border-yellow-400/15 bg-[#050505]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-black tracking-tight text-yellow-300">
            <img src="https://res.cloudinary.com/dcgghkk7q/image/upload/v1759998893/Aviritech_white_text_on_black_background-removebg-preview_1_xlhuzw.png" alt="Aviritech" className="h-9 w-auto max-w-[150px] object-contain" />
            <span className="border-l border-white/15 pl-2 font-medium text-gray-400">Marketplace</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/marketplace/shop" className="rounded-xl bg-[#FACC15] px-4 py-2.5 font-bold text-black hover:bg-yellow-300">Shop products</Link>
            <Link href="/dashboard/owner/maintenance" className="hidden font-semibold text-gray-300 hover:text-yellow-300 sm:inline">Maintenance</Link>
            <Link href="/dashboard" className="rounded-xl bg-[#FACC15] px-4 py-2.5 font-bold text-black hover:bg-yellow-300">My dashboard</Link>
          </nav>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b border-black/10 bg-[#FACC15] text-black">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_45%,rgba(255,255,255,0.55),transparent_38%),linear-gradient(120deg,rgba(255,255,255,0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#FACC15_0%,rgba(250,204,21,0.94)_38%,rgba(250,204,21,0.1)_100%)]" />
        <MarketplaceScene />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_.8fr] md:items-center lg:px-8 lg:py-16">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-black/70">Home living, all in one place</p>
            <h1 className="mt-3 max-w-2xl text-3xl font-black leading-tight text-black sm:text-5xl">Everything your home needs. One marketplace.</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-black sm:text-base">Discover household goods, smart-home technology, trusted skilled professionals and delivery services from one convenient destination.</p>
            <a href="#categories" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-black text-[#FACC15] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#202020]">Explore marketplace <ArrowRight size={17} /></a>
          </div>
          <div className="grid grid-cols-2 gap-3 md:pr-2">
            {[{icon:ShoppingBasket,title:"Shop essentials",desc:"Products for everyday living",color:"text-cyan-300",tile:"bg-cyan-400/15"},{icon:Lightbulb,title:"Smart home",desc:"IoT and connected devices",color:"text-violet-300",tile:"bg-violet-400/15"},{icon:Wrench,title:"Book professionals",desc:"Skills and home services",color:"text-emerald-300",tile:"bg-emerald-400/15"},{icon:Truck,title:"Get it delivered",desc:"Convenient home delivery",color:"text-orange-300",tile:"bg-orange-400/15"}].map((item) => {
              const Icon = item.icon;
              return <div key={item.title} className="group rounded-2xl border border-black/10 bg-black/75 p-4 text-white shadow-[0_12px_30px_rgba(0,0,0,0.12)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:bg-black/85"><span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.tile}`}><Icon className={item.color} size={23}/></span><p className="mt-3 text-sm font-extrabold">{item.title}</p><p className="mt-1 text-xs leading-5 text-white/65">{item.desc}</p></div>;
            })}
          </div>
        </div>
      </section>

      <section aria-label="Marketplace promotions" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><p className="text-[11px] font-black uppercase tracking-[.2em] text-yellow-300">The Aviritech edit</p><h2 className="mt-1 text-xl font-black sm:text-2xl">Discover more. Live better.</h2></div>
          <span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 sm:inline-flex">Marketplace highlights</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <article className="group relative isolate min-h-[250px] overflow-hidden rounded-[1.6rem] border border-yellow-300/20 bg-[#FACC15] p-6 text-black shadow-[0_18px_55px_rgba(250,204,21,0.08)] sm:min-h-[290px] sm:p-8 lg:col-span-2">
            <div className="pointer-events-none absolute -right-12 -top-16 h-72 w-72 rounded-full border-[36px] border-black/[0.06] transition duration-700 group-hover:scale-110" />
            <div className="pointer-events-none absolute right-8 top-8 hidden h-44 w-44 rotate-[-12deg] items-center justify-center rounded-[2rem] border border-black/10 bg-white/35 shadow-2xl backdrop-blur-sm sm:flex">
              <div className="relative flex h-32 w-24 flex-col items-center justify-center rounded-[1.4rem] border-[5px] border-black/80 bg-[#181818] shadow-xl">
                <div className="absolute top-2 h-1 w-7 rounded-full bg-white/30" />
                <Lightbulb className="text-yellow-300" size={35}/>
                <span className="mt-2 h-1.5 w-12 rounded-full bg-cyan-300"/>
                <span className="mt-2 h-1.5 w-8 rounded-full bg-emerald-300"/>
              </div>
              <span className="absolute -bottom-3 -left-4 flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-[#FACC15] bg-black text-cyan-300 shadow-xl"><Home size={27}/></span>
            </div>
            <div className="relative z-10 max-w-lg">
              <span className="inline-flex rounded-full border border-black/15 bg-black/5 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em]">Smart living collection</span>
              <h3 className="mt-5 max-w-md text-3xl font-black leading-[1.05] sm:text-4xl">A smarter home starts with the little things.</h3>
              <p className="mt-3 max-w-sm text-sm leading-6 text-black/70">Explore connected devices, home security and technology that makes everyday living easier.</p>
              <Link href="#categories" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-4 py-3 text-xs font-black text-[#FACC15] transition duration-300 hover:-translate-y-1 hover:bg-[#202020]">Explore smart living <ArrowRight size={15}/></Link>
            </div>
          </article>
          <article className="group relative isolate min-h-[250px] overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(145deg,#202b3b,#10151e_72%)] p-6 sm:min-h-[290px] sm:p-7">
            <div className="pointer-events-none absolute -right-7 -top-8 h-44 w-44 rounded-full bg-cyan-400/10 blur-2xl transition duration-700 group-hover:bg-cyan-300/20"/>
            <div className="absolute right-5 top-7 flex h-28 w-28 rotate-6 items-center justify-center rounded-[1.8rem] border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur-sm transition duration-500 group-hover:rotate-12 group-hover:scale-105">
              <ShoppingBasket className="text-cyan-300" size={58} strokeWidth={1.4}/>
              <span className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#FACC15] text-black shadow-lg"><Boxes size={18}/></span>
            </div>
            <div className="relative z-10 mt-28 sm:mt-32">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">Everyday essentials</p>
              <h3 className="mt-2 text-2xl font-black leading-tight text-white">Good finds for every corner.</h3>
              <p className="mt-2 text-xs leading-5 text-gray-300">Browse home goods, furniture and everyday essentials.</p>
              <Link href="/marketplace/shop" className="mt-4 inline-flex items-center gap-2 text-xs font-black text-cyan-300 transition group-hover:gap-3">Shop products <ArrowRight size={14}/></Link>
            </div>
          </article>
          <article className="group relative isolate min-h-[220px] overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(120deg,#123a31,#101c1a)] p-6 sm:p-7 lg:col-span-3">
            <div className="pointer-events-none absolute -right-8 -top-24 h-72 w-72 rounded-full border-[34px] border-emerald-300/[0.07] transition duration-700 group-hover:scale-110"/>
            <div className="absolute right-8 top-1/2 hidden h-36 w-36 -translate-y-1/2 items-center justify-center rounded-[2rem] border border-emerald-200/15 bg-emerald-300/[0.08] shadow-2xl backdrop-blur-sm sm:flex">
              <Wrench className="text-emerald-300" size={62} strokeWidth={1.35}/>
              <span className="absolute -bottom-3 -right-3 flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-[#123a31] bg-[#FACC15] text-black"><ShieldCheck size={22}/></span>
            </div>
            <div className="relative z-10 max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">Trusted home services</p>
              <h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">The right help, right when home needs it.</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/70">Connect with skilled professionals for repairs, cleaning and property maintenance.</p>
              <Link href="/dashboard/owner/maintenance" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-200/25 bg-white/10 px-4 py-3 text-xs font-black text-white backdrop-blur-sm transition hover:-translate-y-1 hover:bg-white/15">Explore home services <ArrowRight size={15}/></Link>
            </div>
          </article>
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-black uppercase tracking-[.18em] text-yellow-300">Explore</p><h2 className="mt-1 text-2xl font-black">Browse by category</h2><p className="mt-1 text-sm text-gray-400">Products, connected-home solutions and services for your home.</p></div>
          <label className="flex w-full items-center gap-2 rounded-xl border border-white/15 bg-[#151515] px-3 py-2.5 sm:max-w-xs"><Search size={17} className="text-gray-500"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search categories" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500"/></label>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {groups.map((group) => <button key={group} type="button" onClick={() => setActiveGroup(group)} className={`rounded-full px-4 py-2 text-xs font-bold transition ${activeGroup === group ? "bg-[#FACC15] text-black" : "border border-white/15 bg-[#101010] text-gray-300 hover:border-yellow-400"}`}>{group}</button>)}
        </div>

        {visibleCategories.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCategories.map((category) => {
            const Icon = category.icon;
            return <article key={category.id} className="rounded-2xl border border-white/10 bg-[#101010] p-5 shadow-[0_0_30px_rgba(250,204,21,0.035)] transition hover:-translate-y-0.5 hover:border-yellow-400/40 hover:bg-[#14140e]">
              <div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-300"><Icon size={22}/></span><span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">{category.group}</span></div>
              <h3 className="mt-4 font-extrabold">{category.label}</h3><p className="mt-1 min-h-10 text-sm leading-5 text-gray-400">{category.description}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-yellow-300">Explore category <ChevronRight size={15}/></div>
            </article>;
          })}
        </div> : <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-[#101010] p-10 text-center text-sm text-gray-400">No categories match that search.</div>}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#101010] p-6"><div className="flex items-center gap-2 text-yellow-300"><Boxes size={20}/><p className="font-black">For merchants & service providers</p></div><p className="mt-2 text-sm leading-6 text-gray-400">Aviritech is building a shared marketplace for product merchants, IoT suppliers, delivery partners and skilled professionals.</p><Link href="/dashboard/vendor" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-yellow-300">Vendor workspace <ArrowRight size={16}/></Link></div>
          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-6"><div className="flex items-center gap-2 text-white"><ClipboardList size={20}/><p className="font-black">Need help with a property?</p></div><p className="mt-2 text-sm leading-6 text-gray-300">Go to your owner maintenance workspace to choose a property and continue with property-related maintenance.</p><Link href="/dashboard/owner/maintenance" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-yellow-300">Open maintenance <ArrowRight size={16}/></Link></div>
        </div>
        <p className="mt-6 text-center text-xs text-gray-500">Product listings, cart, checkout and delivery tracking will appear as the merchant commerce services are connected. No sample inventory or simulated purchases are shown.</p>
      </section>
    </main>
  );
}
