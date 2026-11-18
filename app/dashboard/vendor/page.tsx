"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, Boxes, Building2, LoaderCircle, Plus, RefreshCw, Save } from "lucide-react";
import { apiFetch, resolveMediaUrl } from "@/lib/api";

type Api<T> = { success: boolean; data: T; message?: string };
type Vendor = {
  id: string;
  businessName: string;
  type: string;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
  kuunAccountName: string | null;
  kuunAccountNumber: string | null;
};
type Category = { id: string; name: string; slug: string; kind: "PRODUCT" | "SMART_HOME" | "HOME_SERVICE" | "DELIVERY" };
type Product = {
  id: string; title: string; description: string | null; sku: string | null; price: string | number;
  currency: string; quantityAvailable: number; status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  images: string[]; category: { id: string; name: string };
};
type MerchantPayment = {
  id: string;
  reference: string;
  amount: string | number;
  currency: string;
  status: "AWAITING_PROOF" | "PROOF_SUBMITTED" | "VERIFIED" | "REJECTED";
  accountName: string;
  accountNumber: string;
  proofOriginalName: string | null;
  proofMimeType: string | null;
  proofSubmittedAt: string | null;
  rejectionReason: string | null;
  order: { id: string; orderNumber: string; status: string; createdAt: string };
  buyer: { id: string; firstName: string | null; lastName: string | null; email: string; phoneNumber: string | null };
};

const field = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-[#1A3C6E] focus:ring-2 focus:ring-[#1A3C6E]/10";
const primary = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#1A3C6E] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50";

export default function VendorDashboard() {
  const { getToken } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [payments, setPayments] = useState<MerchantPayment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productTitle, setProductTitle] = useState("");
  const [productCategoryId, setProductCategoryId] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productStock, setProductStock] = useState("1");
  const [productSku, setProductSku] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productImages, setProductImages] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);
  const [reviewingPayment, setReviewingPayment] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceName, setEvidenceName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch<Api<Vendor>>("/api/v1/marketplace/vendors/me", getToken);
      setVendor(result.data);
      setAccountName(result.data.kuunAccountName || "");
      setAccountNumber(result.data.kuunAccountNumber || "");
      if (result.data.status === "VERIFIED") {
        const [paymentResult, categoryResult] = await Promise.all([
          apiFetch<Api<MerchantPayment[]>>("/api/v1/marketplace/vendors/me/payments", getToken),
          apiFetch<Api<Category[]>>("/api/v1/marketplace/categories", getToken),
        ]);
        setPayments(paymentResult.data || []);
        const productCategories = (categoryResult.data || []).filter(category => category.kind === "PRODUCT" || category.kind === "SMART_HOME");
        setCategories(productCategories);
        setProductCategoryId(current => current || productCategories[0]?.id || "");
        const productResult = await apiFetch<Api<Product[]>>("/api/v1/marketplace/vendors/me/products", getToken);
        setProducts(productResult.data || []);
      } else {
        setPayments([]);
        setCategories([]);
        setProducts([]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load your merchant profile.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { void load(); }, [load]);

  async function saveAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await apiFetch<Api<{ kuunAccountName: string; kuunAccountNumber: string }>>(
        "/api/v1/marketplace/vendors/me/kuun-account",
        getToken,
        {
          method: "PATCH",
          body: JSON.stringify({
            kuunAccountName: accountName.trim(),
            kuunAccountNumber: accountNumber.trim(),
          }),
        },
      );
      setAccountName(result.data.kuunAccountName);
      setAccountNumber(result.data.kuunAccountNumber);
      setNotice("Your Kuun receiving account has been saved. Flutterwave checkout remains active.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save Kuun account details.");
    } finally {
      setSaving(false);
    }
  }



  async function createProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const price = Number(productPrice);
    const quantityAvailable = Number(productStock);
    if (!Number.isFinite(price) || price <= 0) { setError("Enter a valid product price."); return; }
    if (!Number.isInteger(quantityAvailable) || quantityAvailable < 0) { setError("Enter a valid stock quantity."); return; }
    const images = productImages.split(/\\r?\\n/).map(value => value.trim()).filter(Boolean).slice(0, 8);
    setSavingProduct(true); setError(""); setNotice("");
    try {
      await apiFetch<Api<Product>>("/api/v1/marketplace/vendors/me/products", getToken, {
        method: "POST",
        body: JSON.stringify({
          title: productTitle.trim(), categoryId: productCategoryId, price,
          quantityAvailable, currency: "NGN", status: "DRAFT",
          ...(productSku.trim() ? { sku: productSku.trim() } : {}),
          ...(productDescription.trim() ? { description: productDescription.trim() } : {}),
          images,
        }),
      });
      setProductTitle(""); setProductPrice(""); setProductStock("1"); setProductSku(""); setProductDescription(""); setProductImages("");
      setNotice("Product saved as a draft. Activate it when the listing is ready.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save this product."); }
    finally { setSavingProduct(false); }
  }

  async function updateProductStatus(product: Product, status: "ACTIVE" | "DRAFT" | "ARCHIVED") {
    setSavingProduct(true); setError(""); setNotice("");
    try {
      await apiFetch<Api<Product>>(`/api/v1/marketplace/vendors/me/products/${encodeURIComponent(product.id)}`, getToken, {
        method: "PATCH", body: JSON.stringify({ status }),
      });
      setNotice(`${product.title} moved to ${status.toLowerCase()}.`);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update this product."); }
    finally { setSavingProduct(false); }
  }

  async function reviewPayment(payment: MerchantPayment, status: "VERIFIED" | "REJECTED") {
    const reason = status === "REJECTED" ? window.prompt("Why are you rejecting this transfer proof?")?.trim() : "";
    if (status === "REJECTED" && !reason) return;
    setReviewingPayment(payment.id);
    setError("");
    setNotice("");
    try {
      await apiFetch<Api<MerchantPayment>>(
        `/api/v1/marketplace/vendors/me/payments/${encodeURIComponent(payment.id)}/review`,
        getToken,
        { method: "POST", body: JSON.stringify({ status, ...(reason ? { reason } : {}) }) },
      );
      setNotice(status === "VERIFIED" ? "Merchant transfer verified. The order will release after all required payments are verified." : "Transfer proof rejected. The customer can submit new proof.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to review this transfer.");
    } finally {
      setReviewingPayment("");
    }
  }

  async function viewEvidence(payment: MerchantPayment) {
    setError("");
    try {
      const token = await getToken();
      const response = await fetch(resolveMediaUrl(`/api/v1/marketplace/vendors/me/payments/${encodeURIComponent(payment.id)}/evidence`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error("Unable to open payment evidence.");
      const blob = await response.blob();
      if (evidenceUrl) URL.revokeObjectURL(evidenceUrl);
      setEvidenceUrl(URL.createObjectURL(blob));
      setEvidenceName(payment.proofOriginalName || payment.reference);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to open payment evidence.");
    }
  }

  function closeEvidence() {
    if (evidenceUrl) URL.revokeObjectURL(evidenceUrl);
    setEvidenceUrl("");
    setEvidenceName("");
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/marketplace" className="flex items-center gap-2 font-black text-[#1A3C6E]">
            <span className="rounded-xl bg-[#FACC15] p-2"><Building2 size={19} /></span>
            AVIRITECH <span className="font-medium text-slate-500">Merchant workspace</span>
          </Link>
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={16} />Dashboard</Link>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#1A3C6E]">Marketplace payments</p>
            <h1 className="mt-2 text-3xl font-black">Receiving account</h1>
            <p className="mt-2 text-sm text-slate-600">Add the Kuun account customers should use when paying your business directly.</p>
          </div>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button>
        </div>

        {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {notice && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

        {loading ? (
          <div className="flex justify-center py-24 text-sm text-slate-500"><LoaderCircle className="mr-2 animate-spin" />Loading merchant profile…</div>
        ) : vendor ? (
          <section className="mt-7 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">{vendor.businessName}</h2>
                <p className="mt-1 text-sm text-slate-500">Merchant profile · {vendor.status.replaceAll("_", " ")}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{vendor.status}</span>
            </div>

            {vendor.type !== "MERCHANT" ? (
              <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Kuun receiving-account setup is currently available for Marketplace merchant profiles.</p>
            ) : (
              <>
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 font-bold text-amber-950"><BadgeCheck size={18} />Kuun account details</div>
                  <p className="mt-1 text-sm leading-6 text-amber-900">Enter the account name and account number registered with Kuun. These details belong to your merchant profile and are not displayed on public product listings.</p>
                </div>
                <form onSubmit={saveAccount} className="mt-6 grid gap-5">
                  <label className="text-sm font-semibold text-slate-800">
                    Kuun account name
                    <input required minLength={2} maxLength={120} autoComplete="name" value={accountName} onChange={event => setAccountName(event.target.value)} className={field} placeholder="Name registered to the Kuun account" />
                  </label>
                  <label className="text-sm font-semibold text-slate-800">
                    Kuun account number
                    <input required inputMode="numeric" autoComplete="off" pattern="[0-9]{8,20}" minLength={8} maxLength={20} value={accountNumber} onChange={event => setAccountNumber(event.target.value.replace(/[^0-9]/g, ""))} className={field} placeholder="Enter your Kuun account number" />
                    <span className="mt-1 block text-xs font-normal text-slate-500">Use digits only (8–20 digits).</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <button disabled={saving} className={primary}>{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}Save Kuun account</button>
                    <span className="text-xs text-slate-500">You can update these details later.</span>
                  </div>
                </form>
              </>
            )}
          </section>
        ) : (
          <section className="mt-7 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black">Merchant profile not found</h2>
            <p className="mt-2 text-sm text-slate-600">Submit a Marketplace merchant application first. Once your vendor profile exists, you can add your Kuun receiving account here.</p>
            <Link href="/marketplace" className="mt-5 inline-flex rounded-xl bg-[#1A3C6E] px-4 py-3 text-sm font-bold text-white">Open Marketplace</Link>
          </section>
        )}



        {vendor?.status === "VERIFIED" && (vendor.type === "MERCHANT" || vendor.type === "IOT_PROVIDER") && (
          <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#1A3C6E]">Catalogue management</p><h2 className="mt-1 text-xl font-black">Your products</h2><p className="mt-1 text-sm text-slate-500">Create and manage product listings for the Marketplace.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{products.length} listing(s)</span></div>
            <form onSubmit={createProduct} className="mt-5 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
              <label className="text-sm font-semibold sm:col-span-2">Product title<input required minLength={2} maxLength={160} value={productTitle} onChange={e=>setProductTitle(e.target.value)} className={field} placeholder="e.g. Smart door lock"/></label>
              <label className="text-sm font-semibold">Category<select required value={productCategoryId} onChange={e=>setProductCategoryId(e.target.value)} className={field}><option value="">Choose category</option>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label className="text-sm font-semibold">Price (₦)<input required type="number" min="0.01" step="0.01" value={productPrice} onChange={e=>setProductPrice(e.target.value)} className={field} placeholder="0.00"/></label>
              <label className="text-sm font-semibold">Available stock<input required type="number" min="0" step="1" value={productStock} onChange={e=>setProductStock(e.target.value)} className={field}/></label>
              <label className="text-sm font-semibold">SKU (optional)<input maxLength={80} value={productSku} onChange={e=>setProductSku(e.target.value)} className={field} placeholder="Your stock reference"/></label>
              <label className="text-sm font-semibold sm:col-span-2">Description<textarea rows={3} maxLength={5000} value={productDescription} onChange={e=>setProductDescription(e.target.value)} className={field} placeholder="Describe the product, specifications and condition."/></label>
              <label className="text-sm font-semibold sm:col-span-2">Product image URLs (one per line, up to 8)<textarea rows={2} value={productImages} onChange={e=>setProductImages(e.target.value)} className={field} placeholder="https://..."/></label>
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button disabled={savingProduct || !productCategoryId} className={primary}>{savingProduct?<LoaderCircle size={16} className="animate-spin"/>:<Plus size={16}/>}Save product draft</button><span className="text-xs text-slate-500">New listings are saved as drafts.</span></div>
            </form>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {products.length===0 ? <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 md:col-span-2">No products yet. Add your first product above.</p> : products.map(product=><article key={product.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{product.title}</h3><p className="mt-1 text-xs text-slate-500">{product.category.name} · {product.sku || "No SKU"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${product.status==="ACTIVE"?"bg-emerald-100 text-emerald-800":product.status==="DRAFT"?"bg-amber-100 text-amber-800":"bg-slate-100 text-slate-700"}`}>{product.status}</span></div><div className="mt-3 flex items-center justify-between text-sm"><strong>{new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN"}).format(Number(product.price))}</strong><span className="text-slate-500">{product.quantityAvailable} in stock</span></div><div className="mt-3 flex flex-wrap gap-2">{product.status!=="ACTIVE"&&<button type="button" disabled={savingProduct} onClick={()=>void updateProductStatus(product,"ACTIVE")} className="rounded-lg bg-[#1A3C6E] px-3 py-2 text-xs font-bold text-white">Publish</button>}{product.status==="ACTIVE"&&<button type="button" disabled={savingProduct} onClick={()=>void updateProductStatus(product,"DRAFT")} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">Unpublish</button>}{product.status!=="ARCHIVED"&&<button type="button" disabled={savingProduct} onClick={()=>void updateProductStatus(product,"ARCHIVED")} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Archive</button>}</div></article>)}
            </div>
          </section>
        )}

        {vendor?.status === "VERIFIED" && (
          <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-[#1A3C6E]">Merchant settlement queue</p>
                <h2 className="mt-1 text-xl font-black">Customer transfer proofs</h2>
                <p className="mt-1 text-sm text-slate-500">Review only payments addressed to your merchant Kuun account. A proof upload is not confirmation of receipt.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{payments.filter(p=>p.status==="PROOF_SUBMITTED").length} awaiting review</span>
            </div>
            {payments.length === 0 ? (
              <p className="mt-5 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No merchant transfer obligations yet.</p>
            ) : (
              <div className="mt-5 space-y-3">
                {payments.map(payment => (
                  <article key={payment.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black">{payment.order.orderNumber}</p>
                        <p className="mt-1 text-xs text-slate-500">{payment.buyer.firstName || ""} {payment.buyer.lastName || ""} · {payment.buyer.email}</p>
                        <p className="mt-1 text-xs text-slate-500">Reference: {payment.reference}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${payment.status==="VERIFIED"?"bg-emerald-100 text-emerald-800":payment.status==="PROOF_SUBMITTED"?"bg-amber-100 text-amber-800":payment.status==="REJECTED"?"bg-red-100 text-red-800":"bg-slate-100 text-slate-700"}`}>{payment.status.replaceAll("_"," ")}</span>
                    </div>
                    <div className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-2">
                      <p><span className="text-slate-500">Amount:</span> <strong>{new Intl.NumberFormat("en-NG",{style:"currency",currency:payment.currency,maximumFractionDigits:2}).format(Number(payment.amount))}</strong></p>
                      <p><span className="text-slate-500">Transfer destination:</span> <strong>{payment.accountName} · {payment.accountNumber}</strong></p>
                      {payment.proofSubmittedAt && <p className="text-xs text-slate-500">Proof submitted: {new Date(payment.proofSubmittedAt).toLocaleString("en-NG")}</p>}
                      {payment.rejectionReason && <p className="text-xs text-red-700">Previous rejection: {payment.rejectionReason}</p>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {payment.proofOriginalName && <button type="button" onClick={()=>void viewEvidence(payment)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">View transfer proof</button>}
                      {payment.status==="PROOF_SUBMITTED" && <>
                        <button type="button" disabled={reviewingPayment===payment.id} onClick={()=>void reviewPayment(payment,"VERIFIED")} className="rounded-lg bg-[#1A3C6E] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{reviewingPayment===payment.id?"Saving…":"Confirm received"}</button>
                        <button type="button" disabled={reviewingPayment===payment.id} onClick={()=>void reviewPayment(payment,"REJECTED")} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Reject proof</button>
                      </>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="mt-6 max-w-3xl rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-black">Flutterwave remains active</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Adding a Kuun receiving account does not switch off or replace the existing Flutterwave checkout. Customers can continue using the current Flutterwave payment flow.</p>
        </section>
      </div>
      {evidenceUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3" role="dialog" aria-modal="true" aria-label="Payment evidence">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="truncate pr-4 text-sm font-bold">{evidenceName}</p>
              <button type="button" onClick={closeEvidence} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold">Close</button>
            </div>
            <iframe title="Payment evidence" src={evidenceUrl} className="min-h-[70vh] w-full" />
          </div>
        </div>
      )}
    </main>
  );
}
