"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, LoaderCircle, Minus, Plus, ShoppingBag, Trash2, Upload, X } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Api<T> = { success: boolean; data: T; message?: string };
type Product = {
  id: string; title: string; slug: string; description: string | null; price: string | number;
  currency: string; quantityAvailable: number; images: string[];
  vendor: { id: string; businessName: string };
  category: { name: string; slug: string; kind: string };
};
type CartItem = { id: string; quantity: number; product: Product };
type Cart = { id: string; items: CartItem[]; subtotal: string | number; currency: string };
type Listing = { products: Product[]; pagination: { total: number; page: number; totalPages: number } };
type PaymentOptions = { flutterwaveEnabled: boolean; kuunEnabled: boolean };
type PaymentInstruction = {
  id: string; reference: string; type: "MERCHANT_PAYMENT" | "PLATFORM_CHARGE";
  vendorId: string | null; merchantName: string; amount: string; currency: string;
  accountName: string; accountNumber: string; status: string;
};
type CheckoutResult = {
  paymentMethod: "FLUTTERWAVE" | "KUUN"; orderId: string; orderNumber: string;
  amountDue?: string; subtotal?: string; platformCharge?: string; paymentLink?: string;
  paymentInstructions?: PaymentInstruction[]; message?: string;
};
type Obligation = PaymentInstruction & { status: "AWAITING_PROOF" | "PROOF_SUBMITTED" | "VERIFIED" | "REJECTED"; proofSubmittedAt?: string | null; rejectionReason?: string | null };

const field = "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-[#1A3C6E]";
const money = (amount: string | number, currency = "NGN") => new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(amount || 0));

export default function MarketplaceShopPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [options, setOptions] = useState<PaymentOptions>({ flutterwaveEnabled: true, kuunEnabled: false });
  const [payments, setPayments] = useState<Obligation[]>([]);
  const [instructions, setInstructions] = useState<Obligation[]>([]);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"FLUTTERWAVE" | "KUUN">("FLUTTERWAVE");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [listing, paymentOptions] = await Promise.all([
        apiFetch<Api<Listing>>("/api/v1/marketplace/products?page=1&limit=50", getToken),
        apiFetch<Api<PaymentOptions>>("/api/v1/marketplace/payment-options", getToken),
      ]);
      setProducts(listing.data.products || []);
      setOptions(paymentOptions.data);
      if (isSignedIn) {
        const cartResult = await apiFetch<Api<Cart>>("/api/v1/marketplace/cart", getToken);
        setCart(cartResult.data);
      } else setCart(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Marketplace products could not be loaded.");
    } finally { setLoading(false); }
  }, [getToken, isSignedIn]);

  useEffect(() => { if (isLoaded) void load(); }, [isLoaded, load]);

  const subtotal = useMemo(() => Number(cart?.subtotal || 0), [cart]);

  async function addToCart(productId: string) {
    if (!isSignedIn) { setError("Sign in to add products to your cart."); return; }
    setBusy(productId); setError(""); setNotice("");
    try {
      const result = await apiFetch<Api<Cart>>("/api/v1/marketplace/cart/items", getToken, {
        method: "POST", body: JSON.stringify({ productId, quantity: 1 }),
      });
      setCart(result.data); setNotice("Product added to your cart.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add this product."); }
    finally { setBusy(""); }
  }

  async function changeQuantity(item: CartItem, quantity: number) {
    setBusy(item.id); setError("");
    try {
      if (quantity < 1) {
        const result = await apiFetch<Api<unknown>>(`/api/v1/marketplace/cart/items/${item.id}`, getToken, { method: "DELETE" });
        void result;
        await loadCartOnly();
      } else {
        const result = await apiFetch<Api<Cart>>(`/api/v1/marketplace/cart/items/${item.id}`, getToken, {
          method: "PATCH", body: JSON.stringify({ quantity }),
        });
        setCart(result.data);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update cart."); }
    finally { setBusy(""); }
  }

  async function loadCartOnly() {
    const result = await apiFetch<Api<Cart>>("/api/v1/marketplace/cart", getToken);
    setCart(result.data);
  }

  async function checkout() {
    if (!address.trim() || address.trim().length < 8) { setError("Enter a complete delivery address."); return; }
    if (paymentMethod === "KUUN" && !options.kuunEnabled) { setError("Kuun checkout is not yet configured by Aviritech."); return; }
    setBusy("checkout"); setError(""); setNotice("");
    try {
      const result = await apiFetch<Api<CheckoutResult>>("/api/v1/marketplace/checkout", getToken, {
        method: "POST",
        body: JSON.stringify({ deliveryAddress: address.trim(), ...(phone.trim() ? { deliveryPhone: phone.trim() } : {}), paymentMethod }),
      });
      if (result.data.paymentMethod === "FLUTTERWAVE" && result.data.paymentLink) {
        window.location.assign(result.data.paymentLink);
        return;
      }
      const obligations = (result.data.paymentInstructions || []) as Obligation[];
      setInstructions(obligations);
      setPayments(obligations);
      setShowCheckout(false);
      setNotice(`Order ${result.data.orderNumber} created. Complete each transfer and upload its proof below.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Checkout could not be completed."); }
    finally { setBusy(""); }
  }

  async function uploadProof(obligation: Obligation, file?: File) {
    if (!file) return;
    setBusy(obligation.id); setError(""); setNotice("");
    try {
      const form = new FormData();
      form.append("evidence", file);
      await apiFetch<Api<unknown>>(`/api/v1/marketplace/payments/${obligation.id}/proof`, getToken, {
        method: "POST", body: form,
      });
      setPayments(current => current.map(item => item.id === obligation.id ? { ...item, status: "PROOF_SUBMITTED" } : item));
      setInstructions(current => current.map(item => item.id === obligation.id ? { ...item, status: "PROOF_SUBMITTED" } : item));
      setNotice("Proof uploaded. The payment is awaiting manual verification by the recipient.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Proof could not be uploaded."); }
    finally { setBusy(""); }
  }

  if (!isLoaded) return <main className="p-10 text-center text-sm text-slate-500">Loading marketplace…</main>;

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/marketplace" className="flex items-center gap-2 font-black text-[#1A3C6E]"><span className="rounded-xl bg-[#FACC15] p-2"><ShoppingBag size={18}/></span>AVIRITECH <span className="font-medium text-slate-500">Marketplace shop</span></Link>
          <Link href="/marketplace" className="flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={16}/>Marketplace</Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[.2em] text-[#1A3C6E]">Verified merchants</p><h1 className="mt-2 text-3xl font-black">Shop products</h1><p className="mt-2 text-sm text-slate-500">Products listed by approved Aviritech Marketplace merchants.</p></div>
          <button type="button" onClick={()=>setShowCheckout(true)} disabled={!cart?.items.length} className="inline-flex items-center gap-2 rounded-xl bg-[#1A3C6E] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"><ShoppingBag size={17}/>Cart ({cart?.items.reduce((sum,item)=>sum+item.quantity,0)||0})</button>
        </div>
        {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {notice && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
        {loading ? <div className="flex justify-center py-24 text-sm text-slate-500"><LoaderCircle className="mr-2 animate-spin"/>Loading products…</div> :
          products.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No products are available yet.</div> :
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map(product=><article key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="aspect-[4/3] bg-slate-100">{product.images?.[0] ? <img src={product.images[0]} alt={product.title} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-sm text-slate-400">No product image</div>}</div>
              <div className="p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#1A3C6E]">{product.category.name}</p>
                <h2 className="mt-1 line-clamp-2 font-black">{product.title}</h2>
                <p className="mt-1 text-xs text-slate-500">{product.vendor.businessName}</p>
                <p className="mt-3 text-lg font-black">{money(product.price,product.currency)}</p>
                <p className="mt-1 text-xs text-slate-500">{product.quantityAvailable} available</p>
                <button type="button" disabled={busy===product.id} onClick={()=>void addToCart(product.id)} className="mt-4 w-full rounded-xl bg-[#1A3C6E] px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy===product.id?"Adding…":"Add to cart"}</button>
              </div>
            </article>)}
          </div>
        }

        {instructions.length > 0 && <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <div><p className="text-xs font-black uppercase tracking-[.18em] text-[#1A3C6E]">Manual transfer checkout</p><h2 className="mt-1 text-xl font-black">Transfer instructions</h2><p className="mt-1 text-sm text-slate-500">Make each transfer separately. Upload proof for each one; the recipient must verify receipt before the order is released.</p></div>
          <div className="mt-5 space-y-4">
            {instructions.map(item=><article key={item.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-black">{item.merchantName}</h3><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{item.status.replaceAll("_"," ")}</span></div>
              <div className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-2">
                <p><span className="text-slate-500">Amount:</span> <strong>{money(item.amount,item.currency)}</strong></p>
                <p><span className="text-slate-500">Reference:</span> <strong>{item.reference}</strong></p>
                <p><span className="text-slate-500">Account name:</span> <strong>{item.accountName}</strong></p>
                <p><span className="text-slate-500">Account number:</span> <strong>{item.accountNumber}</strong></p>
              </div>
              {item.status==="REJECTED" && <p className="mt-2 text-xs text-red-700">{item.rejectionReason}</p>}
              {item.status!=="VERIFIED" && item.status!=="PROOF_SUBMITTED" && <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#1A3C6E]/40 px-4 py-3 text-sm font-bold text-[#1A3C6E]"><Upload size={16}/>{busy===item.id?"Uploading proof…":"Upload transfer proof"}<input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" className="hidden" disabled={busy===item.id} onChange={event=>void uploadProof(item,event.target.files?.[0])}/></label>}
              {item.status==="PROOF_SUBMITTED" && <p className="mt-3 text-sm font-semibold text-amber-800">Proof submitted. Awaiting recipient verification.</p>}
              {item.status==="VERIFIED" && <p className="mt-3 text-sm font-semibold text-emerald-700">Payment verified.</p>}
            </article>)}
          </div>
        </section>}
      </div>

      {showCheckout && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3" role="dialog" aria-modal="true" aria-label="Checkout">
        <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 sm:p-7">
          <div className="flex items-center justify-between"><h2 className="text-xl font-black">Checkout</h2><button type="button" onClick={()=>setShowCheckout(false)} className="rounded-lg border border-slate-200 p-2"><X size={18}/></button></div>
          <div className="mt-4 space-y-3">
            {cart?.items.map(item=><div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
              <div className="min-w-0"><p className="truncate text-sm font-bold">{item.product.title}</p><p className="text-xs text-slate-500">{item.product.vendor.businessName}</p></div>
              <div className="flex items-center gap-2"><button type="button" onClick={()=>void changeQuantity(item,item.quantity-1)} className="rounded-md border border-slate-200 p-1"><Minus size={14}/></button><span className="w-5 text-center text-sm font-bold">{item.quantity}</span><button type="button" onClick={()=>void changeQuantity(item,item.quantity+1)} className="rounded-md border border-slate-200 p-1"><Plus size={14}/></button><button type="button" onClick={()=>void changeQuantity(item,0)} className="rounded-md p-1 text-red-600"><Trash2 size={14}/></button></div>
            </div>)}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4"><span className="text-sm text-slate-500">Products subtotal</span><strong>{money(subtotal)}</strong></div>
          <div className="mt-4 grid gap-3">
            <label className="text-sm font-semibold">Delivery address<textarea value={address} onChange={e=>setAddress(e.target.value)} rows={3} className={field+" mt-1"} placeholder="Enter full delivery address"/></label>
            <label className="text-sm font-semibold">Delivery phone (optional)<input value={phone} onChange={e=>setPhone(e.target.value)} className={field+" mt-1"} placeholder="Contact phone"/></label>
          </div>
          <div className="mt-5">
            <p className="text-sm font-black">Payment method</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className={`cursor-pointer rounded-xl border p-4 ${paymentMethod==="FLUTTERWAVE"?"border-[#1A3C6E] bg-blue-50":"border-slate-200"}`}><input type="radio" checked={paymentMethod==="FLUTTERWAVE"} onChange={()=>setPaymentMethod("FLUTTERWAVE")} className="mr-2"/> <strong className="text-sm">Flutterwave</strong><p className="mt-1 text-xs text-slate-500">Continue with the existing secure checkout.</p></label>
              <label className={`cursor-pointer rounded-xl border p-4 ${paymentMethod==="KUUN"?"border-[#1A3C6E] bg-blue-50":"border-slate-200"} ${!options.kuunEnabled?"opacity-50":""}`}><input type="radio" checked={paymentMethod==="KUUN"} disabled={!options.kuunEnabled} onChange={()=>setPaymentMethod("KUUN")} className="mr-2"/> <strong className="text-sm">Kuun bank transfer</strong><p className="mt-1 text-xs text-slate-500">{options.kuunEnabled?"Pay each merchant and Aviritech separately, then upload proof.":"Temporarily unavailable until Aviritech configures its receiving account and fee."}</p></label>
            </div>
          </div>
          <button type="button" disabled={busy==="checkout"||!cart?.items.length} onClick={()=>void checkout()} className="mt-6 w-full rounded-xl bg-[#1A3C6E] px-4 py-3 text-sm font-black text-white disabled:opacity-50">{busy==="checkout"?"Preparing checkout…":paymentMethod==="KUUN"?"Continue to transfer instructions":"Continue to Flutterwave"}</button>
        </div>
      </div>}
    </main>
  );
}
