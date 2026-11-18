"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight, Boxes, Camera, ChevronRight, ClipboardList, Home,
  Lightbulb, LoaderCircle, Search, ShieldCheck, ShoppingBasket, Truck,
  Wrench, X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type Category = { id: string; name: string; slug: string; description?: string | null; kind: "PRODUCT" | "SMART_HOME" | "HOME_SERVICE" | "DELIVERY" };
type Vendor = { id: string; businessName: string; averageRating?: number | string | null };
type Product = { id: string; title: string; slug: string; description?: string | null; price: string | number; currency: string; quantityAvailable: number; images: string[]; category: Category; vendor: Vendor };
type Service = { id: string; title: string; slug: string; description?: string | null; basePrice?: string | number | null; currency: string; estimatedDurationMinutes?: number | null; serviceAreas: string[]; images: string[]; category: Category; vendor: Vendor };
type CartItem = { id: string; quantity: number; product: Product };
type Cart = { id: string; items: CartItem[]; subtotal: string; currency: string };
type Order = { id: string; orderNumber: string; status: string; deliveryStatus: string; total: string | number; currency: string; createdAt: string; items: Array<{ id: string; titleSnapshot: string; quantity: number; lineTotal: string | number; vendor: { businessName: string } }>; payment?: { status: string; reference: string } | null };
type ApiResult<T> = { success: boolean; data: T; message?: string };
type ListingResult<T> = { products?: T[]; services?: T[]; pagination?: { total: number; page: number; totalPages: number } };

const money = (amount: string | number, currency = "NGN") =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(amount || 0));

const groupLabel = (kind: Category["kind"]) => kind === "PRODUCT" ? "Shop" : kind === "SMART_HOME" ? "Smart living" : kind === "DELIVERY" ? "Delivery" : "Services";

export default function MarketplacePage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<"products" | "services">("products");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCart = useCallback(async () => {
    if (!isSignedIn) { setCart(null); return; }
    const result = await apiFetch<ApiResult<Cart>>("/api/v1/marketplace/cart", getToken);
    setCart(result.data);
  }, [getToken, isSignedIn]);

  const loadOrders = useCallback(async () => {
    if (!isSignedIn) { setOrders([]); return; }
    const result = await apiFetch<ApiResult<Order[]>>("/api/v1/marketplace/orders/me", getToken);
    setOrders(result.data);
  }, [getToken, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) return;
    let active = true;
    setLoading(true);
    Promise.all([
      apiFetch<ApiResult<Category[]>>("/api/v1/marketplace/categories", getToken),
      apiFetch<ApiResult<ListingResult<Product>>>("/api/v1/marketplace/products?page=1&limit=50", getToken),
      apiFetch<ApiResult<ListingResult<Service>>>("/api/v1/marketplace/services?page=1&limit=50", getToken),
      isSignedIn ? apiFetch<ApiResult<Cart>>("/api/v1/marketplace/cart", getToken) : Promise.resolve(null),
      isSignedIn ? apiFetch<ApiResult<Order[]>>("/api/v1/marketplace/orders/me", getToken) : Promise.resolve(null),
    ]).then(([categoryResult, productResult, serviceResult, cartResult, orderResult]) => {
      if (!active) return;
      setCategories(categoryResult.data || []);
      setProducts(productResult.data?.products || []);
      setServices(serviceResult.data?.services || []);
      setCart(cartResult?.data || null);
      setOrders(orderResult?.data || []);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Marketplace could not be loaded.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [getToken, isLoaded, isSignedIn]);

  const visibleProducts = useMemo(() => products.filter((item) => {
    const term = query.trim().toLowerCase();
    return (category === "all" || item.category.slug === category) &&
      (!term || [item.title, item.description, item.vendor.businessName, item.category.name].join(" ").toLowerCase().includes(term));
  }), [products, query, category]);

  const visibleServices = useMemo(() => services.filter((item) => {
    const term = query.trim().toLowerCase();
    return (category === "all" || item.category.slug === category) &&
      (!term || [item.title, item.description, item.vendor.businessName, item.category.name].join(" ").toLowerCase().includes(term));
  }), [services, query, category]);

  const addToCart = async (productId: string) => {
    if (!isSignedIn) { setNotice("Sign in to add products to your cart."); return; }
    setBusy(productId); setError(""); setNotice("");
    try {
      const result = await apiFetch<ApiResult<Cart>>("/api/v1/marketplace/cart/items", getToken, {
        method: "POST", body: JSON.stringify({ productId, quantity: 1 }),
      });
      setCart(result.data);
      setNotice("Added to your cart.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add this product."); }
    finally { setBusy(""); }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    setBusy(itemId); setError("");
    try {
      if (quantity < 1) {
        await apiFetch<ApiResult<unknown>>(`/api/v1/marketplace/cart/items/${itemId}`, getToken, { method: "DELETE" });
        await loadCart();
      } else {
        const result = await apiFetch<ApiResult<Cart>>(`/api/v1/marketplace/cart/items/${itemId}`, getToken, { method: "PATCH", body: JSON.stringify({ quantity }) });
        setCart(result.data);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Cart update failed."); }
    finally { setBusy(""); }
  };

  const checkout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cart?.items.length) return;
    setBusy("checkout"); setError(""); setNotice("");
    try {
      const result = await apiFetch<ApiResult<{ paymentLink: string }>>("/api/v1/marketplace/checkout", getToken, {
        method: "POST", body: JSON.stringify({ deliveryAddress, deliveryPhone: deliveryPhone || undefined }),
      });
      if (!result.data.paymentLink) throw new Error("The payment provider did not return a checkout link.");
      window.location.assign(result.data.paymentLink);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Checkout could not be initialized."); setBusy(""); }
  };

  const categoryOptions = categories.filter((item) => activeTab === "products"
    ? item.kind === "PRODUCT" || item.kind === "SMART_HOME"
    : item.kind === "SMART_HOME" || item.kind === "HOME_SERVICE" || item.kind === "DELIVERY");

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-black tracking-tight text-[#1A3C6E]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FACC15]"><Home size={19} /></span>
            AVIRITECH <span className="font-medium text-slate-500">Marketplace</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/dashboard/owner/maintenance" className="hidden font-semibold text-slate-600 hover:text-[#1A3C6E] sm:inline">Maintenance</Link>
            <Link href="/dashboard" className="rounded-xl bg-[#1A3C6E] px-4 py-2.5 font-bold text-white hover:bg-[#244b82]">My dashboard</Link>
          </nav>
        </div>
      </header>

      <section className="bg-[#1A3C6E] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_.8fr] md:items-center lg:px-8 lg:py-16">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-[#FACC15]">Home living, all in one place</p>
            <h1 className="mt-3 max-w-2xl text-3xl font-black leading-tight sm:text-5xl">Everything your home needs. One marketplace.</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">Discover household goods, smart-home technology, trusted skilled professionals and delivery services from verified providers.</p>
            <a href="#catalogue" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#FACC15] px-5 py-3 text-sm font-black text-slate-950 hover:bg-[#F5C518]">Explore marketplace <ArrowRight size={17} /></a>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[{icon:ShoppingBasket,title:"Shop essentials",desc:"Products for everyday living"},{icon:Lightbulb,title:"Smart home",desc:"IoT and connected devices"},{icon:Wrench,title:"Book professionals",desc:"Skills and home services"},{icon:Truck,title:"Get it delivered",desc:"Delivery partners and logistics"}].map((item) => {
              const Icon = item.icon;
              return <div key={item.title} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"><Icon className="text-[#FACC15]" size={23}/><p className="mt-4 text-sm font-extrabold">{item.title}</p><p className="mt-1 text-xs leading-5 text-blue-100">{item.desc}</p></div>;
            })}
          </div>
        </div>
      </section>

      <section id="catalogue" className="mx-auto grid max-w-7xl gap-6 px-4 py-9 sm:px-6 lg:grid-cols-[1fr_350px] lg:px-8">
        <div className="min-w-0">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="text-xs font-black uppercase tracking-[.18em] text-[#1A3C6E]">Discover</p><h2 className="mt-1 text-2xl font-black">Marketplace catalogue</h2><p className="mt-1 text-sm text-slate-500">Only active listings from verified providers appear here.</p></div>
            <label className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:max-w-xs"><Search size={17} className="text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products and services" className="w-full bg-transparent text-sm outline-none"/></label>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => { setActiveTab("products"); setCategory("all"); }} className={`rounded-full px-4 py-2 text-xs font-bold ${activeTab === "products" ? "bg-[#1A3C6E] text-white" : "border border-slate-200 bg-white text-slate-600"}`}>Products</button>
            <button type="button" onClick={() => { setActiveTab("services"); setCategory("all"); }} className={`rounded-full px-4 py-2 text-xs font-bold ${activeTab === "services" ? "bg-[#1A3C6E] text-white" : "border border-slate-200 bg-white text-slate-600"}`}>Services & delivery</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setCategory("all")} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${category === "all" ? "bg-[#FACC15] text-slate-950" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>All categories</button>
            {categoryOptions.map((item) => <button key={item.id} type="button" onClick={() => setCategory(item.slug)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${category === item.slug ? "bg-[#FACC15] text-slate-950" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{item.name}</button>)}
          </div>

          {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {notice && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
          {loading ? <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18}/> Loading marketplace catalogue…</div> : activeTab === "products" ? (
            visibleProducts.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleProducts.map((product) => <article key={product.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between"><span className="rounded-lg bg-[#FACC15]/20 p-2 text-[#1A3C6E]"><Boxes size={20}/></span><span className="text-xs text-slate-500">{product.quantityAvailable} in stock</span></div>
                <p className="mt-4 text-xs font-semibold text-[#1A3C6E]">{product.category.name}</p><h3 className="mt-1 font-extrabold">{product.title}</h3><p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-500">{product.description || "Available from a verified Aviritech marketplace merchant."}</p>
                <p className="mt-3 text-lg font-black">{money(product.price, product.currency)}</p><p className="mt-1 text-xs text-slate-500">Sold by {product.vendor.businessName}</p>
                <button type="button" disabled={busy === product.id || product.quantityAvailable < 1} onClick={() => addToCart(product.id)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A3C6E] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#244b82] disabled:cursor-not-allowed disabled:opacity-50">{busy === product.id ? <LoaderCircle size={16} className="animate-spin"/> : <ShoppingBasket size={16}/>} Add to cart</button>
              </article>)}
            </div> : <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><ShoppingBasket className="mx-auto text-slate-300" size={30}/><h3 className="mt-3 font-bold">No products listed yet</h3><p className="mt-1 text-sm text-slate-500">Verified merchants’ active products will appear here when available.</p></div>
          ) : (
            visibleServices.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {visibleServices.map((service) => <article key={service.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between"><span className="rounded-lg bg-[#FACC15]/20 p-2 text-[#1A3C6E]">{service.category.kind === "DELIVERY" ? <Truck size={20}/> : service.category.kind === "SMART_HOME" ? <Camera size={20}/> : <Wrench size={20}/>}</span><span className="text-xs text-slate-500">{groupLabel(service.category.kind)}</span></div>
                <p className="mt-4 text-xs font-semibold text-[#1A3C6E]">{service.category.name}</p><h3 className="mt-1 font-extrabold">{service.title}</h3><p className="mt-1 min-h-10 text-sm text-slate-500">{service.description || "Service offered by a verified Aviritech provider."}</p>
                <p className="mt-3 text-lg font-black">{service.basePrice == null ? "Quote required" : money(service.basePrice, service.currency)}</p><p className="mt-1 text-xs text-slate-500">Provided by {service.vendor.businessName}{service.serviceAreas.length ? ` · ${service.serviceAreas.join(", ")}` : ""}</p>
                <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">Booking and provider availability will be enabled when the service-booking workflow is released.</div>
              </article>)}
            </div> : <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><Wrench className="mx-auto text-slate-300" size={30}/><h3 className="mt-3 font-bold">No services listed yet</h3><p className="mt-1 text-sm text-slate-500">Verified providers’ active services will appear here when available.</p></div>
          )}
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-[#1A3C6E]">Your basket</p><h2 className="mt-1 text-xl font-black">Cart</h2></div><ShoppingBasket className="text-[#1A3C6E]" size={22}/></div>
            {!isSignedIn ? <p className="mt-4 text-sm text-slate-500">Sign in to save your cart and continue to checkout.</p> : !cart?.items.length ? <p className="mt-4 text-sm text-slate-500">Your cart is empty. Add products from the catalogue.</p> : <>
              <div className="mt-4 space-y-3">{cart.items.map((item) => <div key={item.id} className="border-b border-slate-100 pb-3">
                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-sm font-bold">{item.product.title}</p><p className="text-xs text-slate-500">{money(item.product.price, item.product.currency)} each</p></div><button type="button" aria-label={`Remove ${item.product.title}`} onClick={() => updateQuantity(item.id, 0)} className="text-slate-400 hover:text-red-600"><X size={16}/></button></div>
                <div className="mt-2 flex items-center justify-between"><div className="flex items-center gap-3"><button type="button" aria-label="Decrease quantity" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="h-7 w-7 rounded-lg border border-slate-200">−</button><span className="text-sm font-bold">{item.quantity}</span><button type="button" aria-label="Increase quantity" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="h-7 w-7 rounded-lg border border-slate-200">+</button></div><span className="text-sm font-bold">{money(Number(item.product.price) * item.quantity, item.product.currency)}</span></div>
              </div>)}</div>
              <div className="mt-4 flex justify-between text-sm font-black"><span>Subtotal</span><span>{money(cart.subtotal, cart.currency)}</span></div>
              <p className="mt-1 text-xs text-slate-500">Delivery is quoted separately by a provider. No delivery fee is added until a verified quote is available.</p>
              <form onSubmit={checkout} className="mt-4 space-y-3">
                <label className="block text-xs font-bold text-slate-700">Delivery address<input required minLength={8} maxLength={500} value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="House number, street, area, city" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-[#1A3C6E]"/></label>
                <label className="block text-xs font-bold text-slate-700">Delivery phone (optional)<input value={deliveryPhone} onChange={(event) => setDeliveryPhone(event.target.value)} maxLength={30} placeholder="Phone number" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-[#1A3C6E]"/></label>
                <button type="submit" disabled={busy === "checkout"} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FACC15] px-4 py-3 text-sm font-black text-slate-950 hover:bg-[#F5C518] disabled:opacity-60">{busy === "checkout" ? <LoaderCircle size={16} className="animate-spin"/> : <ShieldCheck size={16}/>} Continue to secure payment</button>
              </form>
            </>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><ClipboardList size={19} className="text-[#1A3C6E]"/><h2 className="font-black">Your orders</h2></div>
            {!isSignedIn ? <p className="mt-3 text-sm text-slate-500">Sign in to view your orders.</p> : orders.length ? <div className="mt-3 space-y-3">{orders.slice(0, 5).map((order) => <div key={order.id} className="rounded-xl bg-slate-50 p-3"><div className="flex justify-between gap-2"><p className="text-xs font-black">{order.orderNumber}</p><span className="text-[10px] font-bold uppercase text-[#1A3C6E]">{order.status.replaceAll("_", " ")}</span></div><p className="mt-1 text-sm font-bold">{money(order.total, order.currency)}</p><p className="mt-1 text-xs text-slate-500">{order.items.length} line item(s) · Delivery: {order.deliveryStatus.replaceAll("_", " ").toLowerCase()}</p></div>)}</div> : <p className="mt-3 text-sm text-slate-500">Your completed checkouts will appear here.</p>}
          </section>

          <section className="rounded-2xl bg-[#FFF8D9] p-5 ring-1 ring-[#FACC15]/40"><div className="flex items-center gap-2"><Boxes size={19}/><h2 className="font-black">Sell on Aviritech</h2></div><p className="mt-2 text-sm leading-6 text-slate-600">Merchants, IoT providers, delivery partners and skilled professionals can apply to join the marketplace.</p><Link href="/dashboard/vendor" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#1A3C6E]">Vendor workspace <ChevronRight size={16}/></Link></section>
        </aside>
      </section>

      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><span>Aviritech PropTech Marketplace</span><span>Secure payments are processed by the configured payment provider.</span></div></footer>
    </main>
  );
}
