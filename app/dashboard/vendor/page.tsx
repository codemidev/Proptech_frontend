"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, Boxes, Building2, Clock3, LoaderCircle, Plus, RefreshCw, Truck, Wrench } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Api<T> = { success: boolean; data: T; message?: string };
type Category = { id: string; name: string; slug: string; kind: "PRODUCT" | "SMART_HOME" | "HOME_SERVICE" | "DELIVERY" };
type Vendor = { id: string; businessName: string; type: string; status: "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED"; email: string | null; phone: string | null; address: string | null; createdAt: string };
type Product = { id: string; title: string; price: string | number; quantityAvailable: number; status: "DRAFT" | "ACTIVE" | "ARCHIVED"; category: { id: string; name: string } };
type Service = { id: string; title: string; basePrice: string | number | null; serviceAreas: string[]; status: "DRAFT" | "ACTIVE" | "ARCHIVED"; category: { id: string; name: string } };
type VendorBooking = {
  id:string; bookingNumber:string; status:string; serviceTitleSnapshot:string; serviceAddress:string;
  requestedScheduleAt:string|null; scheduledAt:string|null; quoteAmount:string|number|null; vendorNotes:string|null;
  customer:{firstName:string|null;lastName:string|null;email:string;phoneNumber:string|null};
};
const field = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1A3C6E]";
const primary = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#1A3C6E] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50";
const money = (n: string | number | null) => n == null ? "Quote required" : new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:2}).format(Number(n));

export default function VendorDashboard() {
  const { getToken } = useAuth();
  const [vendor,setVendor] = useState<Vendor|null>(null), [categories,setCategories] = useState<Category[]>([]);
  const [products,setProducts] = useState<Product[]>([]), [services,setServices] = useState<Service[]>([]);
  const [bookings,setBookings] = useState<VendorBooking[]>([]);
  const [loading,setLoading] = useState(true), [saving,setSaving] = useState(false), [error,setError] = useState(""), [notice,setNotice] = useState("");
  const [businessName,setBusinessName] = useState(""), [type,setType] = useState("MERCHANT"), [email,setEmail] = useState(""), [phone,setPhone] = useState(""), [address,setAddress] = useState("");
  const [productOpen,setProductOpen] = useState(false), [serviceOpen,setServiceOpen] = useState(false);
  const [productTitle,setProductTitle] = useState(""), [productCategory,setProductCategory] = useState(""), [productPrice,setProductPrice] = useState(""), [stock,setStock] = useState("1"), [productDescription,setProductDescription] = useState(""), [sku,setSku] = useState(""), [images,setImages] = useState("");
  const [serviceTitle,setServiceTitle] = useState(""), [serviceCategory,setServiceCategory] = useState(""), [servicePrice,setServicePrice] = useState(""), [duration,setDuration] = useState(""), [areas,setAreas] = useState(""), [serviceDescription,setServiceDescription] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [p,c] = await Promise.all([
        apiFetch<Api<Vendor>>("/api/v1/marketplace/vendors/me",getToken),
        apiFetch<Api<Category[]>>("/api/v1/marketplace/categories",getToken),
      ]);
      setVendor(p.data); setCategories(c.data || []);
      if(p.data.status === "VERIFIED") {
        const [productsResult,servicesResult,bookingsResult] = await Promise.all([
          apiFetch<Api<Product[]>>("/api/v1/marketplace/vendors/me/products",getToken),
          apiFetch<Api<Service[]>>("/api/v1/marketplace/vendors/me/services",getToken),
          apiFetch<Api<VendorBooking[]>>("/api/v1/marketplace/vendors/me/bookings",getToken),
        ]);
        setProducts(productsResult.data || []); setServices(servicesResult.data || []); setBookings(bookingsResult.data || []);
      } else { setProducts([]); setServices([]); setBookings([]); }
    } catch(e) {
      const message=e instanceof Error?e.message:"Unable to load vendor workspace.";
      if(message.toLowerCase().includes("vendor profile not found")) {
        setVendor(null);
        try { const c=await apiFetch<Api<Category[]>>("/api/v1/marketplace/categories",getToken); setCategories(c.data||[]); }
        catch(cause) { setError(cause instanceof Error?cause.message:"Unable to load categories."); }
      } else setError(message);
    } finally { setLoading(false); }
  },[getToken]);
  useEffect(()=>{void load();},[load]);
  const productCategories=useMemo(()=>categories.filter(c=>c.kind==="PRODUCT"||c.kind==="SMART_HOME"),[categories]);
  const serviceCategories=useMemo(()=>categories.filter(c=>c.kind!=="PRODUCT"),[categories]);
  const StatusIcon=vendor?.status==="VERIFIED"?BadgeCheck:Clock3;

  async function apply(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();setSaving(true);setError("");setNotice("");
    try {
      const r=await apiFetch<Api<Vendor>>("/api/v1/marketplace/vendors/me",getToken,{method:"POST",body:JSON.stringify({businessName:businessName.trim(),type,email:email.trim()||undefined,phone:phone.trim()||undefined,address:address.trim()||undefined})});
      setVendor(r.data);setNotice("Application submitted. An administrator must verify your business before you can publish listings.");
    } catch(x) {setError(x instanceof Error?x.message:"Application failed.");} finally {setSaving(false);}
  }
  async function createProduct(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();setSaving(true);setError("");setNotice("");
    try {
      await apiFetch<Api<Product>>("/api/v1/marketplace/vendors/me/products",getToken,{method:"POST",body:JSON.stringify({categoryId:productCategory,title:productTitle.trim(),description:productDescription.trim()||undefined,sku:sku.trim()||undefined,price:Number(productPrice),currency:"NGN",quantityAvailable:Number(stock),images:images.split("\n").map(x=>x.trim()).filter(Boolean),status:"DRAFT"})});
      setProductOpen(false);setProductTitle("");setProductCategory("");setProductPrice("");setStock("1");setProductDescription("");setSku("");setImages("");setNotice("Product saved as a draft.");await load();
    } catch(x) {setError(x instanceof Error?x.message:"Product could not be saved.");} finally {setSaving(false);}
  }
  async function createService(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();setSaving(true);setError("");setNotice("");
    try {
      await apiFetch<Api<Service>>("/api/v1/marketplace/vendors/me/services",getToken,{method:"POST",body:JSON.stringify({categoryId:serviceCategory,title:serviceTitle.trim(),description:serviceDescription.trim()||undefined,basePrice:servicePrice.trim()?Number(servicePrice):null,currency:"NGN",estimatedDurationMinutes:duration.trim()?Number(duration):null,serviceAreas:areas.split(",").map(x=>x.trim()).filter(Boolean),images:[],status:"DRAFT"})});
      setServiceOpen(false);setServiceTitle("");setServiceCategory("");setServicePrice("");setDuration("");setAreas("");setServiceDescription("");setNotice("Service saved as a draft.");await load();
    } catch(x) {setError(x instanceof Error?x.message:"Service could not be saved.");} finally {setSaving(false);}
  }
  async function quoteBooking(event:React.FormEvent<HTMLFormElement>,bookingId:string) {
    event.preventDefault();const data=new FormData(event.currentTarget);
    const amount=Number(data.get("quoteAmount"));const scheduled=String(data.get("scheduledAt")||"");
    setSaving(true);setError("");setNotice("");
    try {
      await apiFetch<Api<VendorBooking>>(`/api/v1/marketplace/vendors/me/bookings/${bookingId}/quote`,getToken,{method:"POST",body:JSON.stringify({quoteAmount:amount,scheduledAt:scheduled?new Date(scheduled).toISOString():undefined,vendorNotes:String(data.get("vendorNotes")||"")||undefined})});
      setNotice("Quote sent to the customer.");await load();
    } catch(e) {setError(e instanceof Error?e.message:"Could not send service quote.");} finally {setSaving(false);}
  }
  async function declineBooking(bookingId:string) {
    if(!window.confirm("Decline this service request?"))return;
    setSaving(true);setError("");
    try {await apiFetch<Api<unknown>>(`/api/v1/marketplace/vendors/me/bookings/${bookingId}/decline`,getToken,{method:"POST",body:JSON.stringify({})});setNotice("Service request declined.");await load();}
    catch(e){setError(e instanceof Error?e.message:"Could not decline request.");}finally{setSaving(false);}
  }
  async function advanceBooking(bookingId:string,status:"IN_PROGRESS"|"COMPLETED") {
    setSaving(true);setError("");
    try {await apiFetch<Api<VendorBooking>>(`/api/v1/marketplace/vendors/me/bookings/${bookingId}/status`,getToken,{method:"PATCH",body:JSON.stringify({status})});setNotice(status==="IN_PROGRESS"?"Work marked as started.":"Service marked as completed.");await load();}
    catch(e){setError(e instanceof Error?e.message:"Could not update service booking.");}finally{setSaving(false);}
  }

  async function productStatus(item:Product,status:Product["status"]) {
    setSaving(true);setError("");
    try {await apiFetch<Api<Product>>(`/api/v1/marketplace/vendors/me/products/${item.id}`,getToken,{method:"PATCH",body:JSON.stringify({status})});setNotice(`Product moved to ${status.toLowerCase()}.`);await load();}
    catch(x){setError(x instanceof Error?x.message:"Could not update product.");}finally{setSaving(false);}
  }
  async function serviceStatus(item:Service,status:Service["status"]) {
    setSaving(true);setError("");
    try {await apiFetch<Api<Service>>(`/api/v1/marketplace/vendors/me/services/${item.id}`,getToken,{method:"PATCH",body:JSON.stringify({status})});setNotice(`Service moved to ${status.toLowerCase()}.`);await load();}
    catch(x){setError(x instanceof Error?x.message:"Could not update service.");}finally{setSaving(false);}
  }

  return <main className="min-h-screen bg-[#F7F8FA] text-slate-950">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"><Link href="/marketplace" className="flex items-center gap-2 font-black text-[#1A3C6E]"><span className="rounded-xl bg-[#FACC15] p-2"><Building2 size={19}/></span>AVIRITECH <span className="font-medium text-slate-500">Vendor workspace</span></Link><Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={16}/>Dashboard</Link></div></header>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#1A3C6E]">Merchant and service partner portal</p><h1 className="mt-2 text-3xl font-black">Vendor workspace</h1><p className="mt-2 text-sm text-slate-500">Manage your business profile, product catalogue and service offerings.</p></div><button onClick={()=>void load()} disabled={loading} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold"><RefreshCw size={16} className={loading?"animate-spin":""}/>Refresh</button></div>
      {error&&<div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}{notice&&<div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      {loading?<div className="flex justify-center py-24 text-sm text-slate-500"><LoaderCircle className="mr-2 animate-spin"/>Loading workspace…</div>:!vendor?
      <section className="mt-7 max-w-3xl rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Apply as a marketplace vendor</h2><p className="mt-1 text-sm text-slate-500">Applications are reviewed before listing access is enabled.</p><form onSubmit={apply} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold sm:col-span-2">Business name<input required minLength={2} maxLength={120} value={businessName} onChange={e=>setBusinessName(e.target.value)} className={field}/></label>
        <label className="text-sm font-semibold">Business type<select value={type} onChange={e=>setType(e.target.value)} className={field}>{[["MERCHANT","General merchant"],["IOT_PROVIDER","Smart-home / IoT"],["DELIVERY_PROVIDER","Delivery / logistics"],["HOME_SERVICES","Home services"],["ELECTRICIAN","Electrician"],["PLUMBER","Plumber"],["CARPENTER","Carpenter"],["PAINTER","Painter"],["INTERIOR_DESIGNER","Interior designer"],["SECURITY","Security"],["MOVER","Moving services"],["CLEANER","Cleaning services"],["HVAC","HVAC"],["INTERNET_PROVIDER","Internet provider"],["OTHER","Other"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
        <label className="text-sm font-semibold">Business email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} className={field}/></label><label className="text-sm font-semibold">Phone<input value={phone} onChange={e=>setPhone(e.target.value)} className={field}/></label><label className="text-sm font-semibold">Business address<input value={address} onChange={e=>setAddress(e.target.value)} className={field}/></label>
        <div className="sm:col-span-2"><button disabled={saving} className={primary}>{saving?<LoaderCircle size={16} className="animate-spin"/>:<Plus size={16}/>}Submit application</button></div>
      </form></section>
      :<>
        <section className="mt-7 rounded-2xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-black">{vendor.businessName}</h2><span className={`rounded-full px-3 py-1 text-xs font-bold ${vendor.status==="VERIFIED"?"bg-emerald-100 text-emerald-800":vendor.status==="PENDING"?"bg-amber-100 text-amber-800":"bg-red-100 text-red-800"}`}>{vendor.status}</span></div><p className="mt-2 text-sm text-slate-500">{vendor.type.replaceAll("_"," ")} · {vendor.email||"No email"} · {vendor.phone||"No phone"}</p><p className="mt-1 text-xs text-slate-500">{vendor.address||"No business address supplied"}</p></div><div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold"><StatusIcon size={18}/>{vendor.status==="VERIFIED"?"Verified provider":vendor.status==="PENDING"?"Awaiting review":"Listing access restricted"}</div></div>
        {vendor.status==="PENDING"&&<p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Your application is awaiting administrator review. You can prepare your details, but listings remain unavailable until approval.</p>}
        {vendor.status==="REJECTED"&&<p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">Your application was not approved. Contact Aviritech support for review guidance.</p>}
        {vendor.status==="SUSPENDED"&&<p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">Your vendor access is suspended. Listing management is disabled.</p>}</section>
        {vendor.status==="VERIFIED"&&<>
          <div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-5"><Boxes className="text-[#1A3C6E]"/><p className="mt-3 text-2xl font-black">{products.length}</p><p className="text-sm text-slate-500">Products</p></div><div className="rounded-2xl border bg-white p-5"><Wrench className="text-[#1A3C6E]"/><p className="mt-3 text-2xl font-black">{services.length}</p><p className="text-sm text-slate-500">Services</p></div><div className="rounded-2xl border bg-white p-5"><Truck className="text-[#1A3C6E]"/><p className="mt-3 text-2xl font-black">{products.filter(p=>p.status==="ACTIVE").length+services.filter(s=>s.status==="ACTIVE").length}</p><p className="text-sm text-slate-500">Active listings</p></div></div>
          <div className="mt-6 flex flex-wrap gap-3"><button onClick={()=>{setProductOpen(v=>!v);setServiceOpen(false)}} className={primary}><Plus size={16}/>Add product</button><button onClick={()=>{setServiceOpen(v=>!v);setProductOpen(false)}} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold"><Plus size={16}/>Add service</button></div>
          {productOpen&&<form onSubmit={createProduct} className="mt-4 grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2"><h3 className="text-lg font-black sm:col-span-2">New product draft</h3><label className="text-sm font-semibold">Name<input required minLength={2} value={productTitle} onChange={e=>setProductTitle(e.target.value)} className={field}/></label><label className="text-sm font-semibold">Category<select required value={productCategory} onChange={e=>setProductCategory(e.target.value)} className={field}><option value="">Select category</option>{productCategories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="text-sm font-semibold">Price (NGN)<input required type="number" min="0.01" step="0.01" value={productPrice} onChange={e=>setProductPrice(e.target.value)} className={field}/></label><label className="text-sm font-semibold">Stock<input required type="number" min="0" step="1" value={stock} onChange={e=>setStock(e.target.value)} className={field}/></label><label className="text-sm font-semibold">SKU<input value={sku} onChange={e=>setSku(e.target.value)} className={field}/></label><label className="text-sm font-semibold sm:col-span-2">Description<textarea rows={3} value={productDescription} onChange={e=>setProductDescription(e.target.value)} className={field}/></label><label className="text-sm font-semibold sm:col-span-2">Image URLs (one per line)<textarea rows={2} value={images} onChange={e=>setImages(e.target.value)} className={field}/></label><div className="flex gap-2 sm:col-span-2"><button disabled={saving} className={primary}>Save draft</button><button type="button" onClick={()=>setProductOpen(false)} className="rounded-xl border px-4 text-sm">Cancel</button></div></form>}
          {serviceOpen&&<form onSubmit={createService} className="mt-4 grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2"><h3 className="text-lg font-black sm:col-span-2">New service draft</h3><label className="text-sm font-semibold">Service name<input required minLength={2} value={serviceTitle} onChange={e=>setServiceTitle(e.target.value)} className={field}/></label><label className="text-sm font-semibold">Category<select required value={serviceCategory} onChange={e=>setServiceCategory(e.target.value)} className={field}><option value="">Select category</option>{serviceCategories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="text-sm font-semibold">Base price (NGN, optional)<input type="number" min="0.01" step="0.01" value={servicePrice} onChange={e=>setServicePrice(e.target.value)} className={field}/></label><label className="text-sm font-semibold">Duration in minutes<input type="number" min="15" max="10080" value={duration} onChange={e=>setDuration(e.target.value)} className={field}/></label><label className="text-sm font-semibold sm:col-span-2">Service areas (comma-separated)<input value={areas} onChange={e=>setAreas(e.target.value)} className={field} placeholder="Lekki, Ikeja, Victoria Island"/></label><label className="text-sm font-semibold sm:col-span-2">Description<textarea rows={3} value={serviceDescription} onChange={e=>setServiceDescription(e.target.value)} className={field}/></label><div className="flex gap-2 sm:col-span-2"><button disabled={saving} className={primary}>Save draft</button><button type="button" onClick={()=>setServiceOpen(false)} className="rounded-xl border px-4 text-sm">Cancel</button></div></form>}
          <section className="mt-8"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">Service requests</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{bookings.length} total</span></div>
            {bookings.length?<div className="mt-4 space-y-3">{bookings.map(b=><article key={b.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black text-[#1A3C6E]">{b.bookingNumber}</p><h3 className="mt-1 font-bold">{b.serviceTitleSnapshot}</h3><p className="mt-1 text-sm text-slate-500">Customer: {[b.customer.firstName,b.customer.lastName].filter(Boolean).join(" ")||b.customer.email} · {b.customer.phoneNumber||"No phone"}</p><p className="mt-1 text-xs text-slate-500">Address: {b.serviceAddress}</p>{b.requestedScheduleAt&&<p className="mt-1 text-xs text-slate-500">Preferred: {new Date(b.requestedScheduleAt).toLocaleString("en-NG")}</p>}</div><span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{b.status.replaceAll("_"," ")}</span></div>
              {b.status==="REQUESTED"&&<form onSubmit={e=>void quoteBooking(e,b.id)} className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3"><label className="text-xs font-bold">Quote (NGN)<input name="quoteAmount" required type="number" min="0.01" step="0.01" className={field}/></label><label className="text-xs font-bold">Proposed schedule<input name="scheduledAt" type="datetime-local" className={field}/></label><label className="text-xs font-bold sm:col-span-3">Message / quote details<textarea name="vendorNotes" rows={2} className={field} placeholder="Scope, inclusions and any conditions"/></label><div className="flex gap-2 sm:col-span-3"><button disabled={saving} className={primary}>Send quote</button><button type="button" disabled={saving} onClick={()=>void declineBooking(b.id)} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-700">Decline</button></div></form>}
              {b.quoteAmount!=null&&<p className="mt-3 text-sm font-bold">Quoted: {money(b.quoteAmount)}{b.scheduledAt?` · ${new Date(b.scheduledAt).toLocaleString("en-NG")}`:""}</p>}
              {b.vendorNotes&&<p className="mt-1 text-xs text-slate-500">{b.vendorNotes}</p>}
              {b.status==="PAID"&&<button disabled={saving} onClick={()=>void advanceBooking(b.id,"IN_PROGRESS")} className={`${primary} mt-3`}>Start service</button>}
              {b.status==="IN_PROGRESS"&&<button disabled={saving} onClick={()=>void advanceBooking(b.id,"COMPLETED")} className={`${primary} mt-3`}>Mark completed</button>}
            </article>)}</div>:<p className="mt-3 rounded-xl border border-dashed p-6 text-sm text-slate-500">No service requests yet. Customer requests for your active service listings will appear here.</p>}
          </section>
          <section className="mt-8"><h2 className="text-xl font-black">Products</h2>{products.length?<div className="mt-4 grid gap-3 md:grid-cols-2">{products.map(p=><article key={p.id} className="rounded-2xl border bg-white p-5"><div className="flex justify-between gap-3"><div><p className="text-xs text-[#1A3C6E]">{p.category.name}</p><h3 className="mt-1 font-bold">{p.title}</h3><p className="mt-1 text-sm text-slate-500">{money(p.price)} · Stock {p.quantityAvailable}</p></div><span className="h-fit rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{p.status}</span></div><div className="mt-4 flex gap-2">{p.status!=="ACTIVE"&&<button disabled={saving||p.quantityAvailable<1} onClick={()=>void productStatus(p,"ACTIVE")} className={primary}>Publish</button>}{p.status==="ACTIVE"&&<button disabled={saving} onClick={()=>void productStatus(p,"DRAFT")} className="rounded-xl border px-3 text-xs font-bold">Unpublish</button>}{p.status!=="ARCHIVED"&&<button disabled={saving} onClick={()=>void productStatus(p,"ARCHIVED")} className="rounded-xl border px-3 text-xs font-bold text-red-700">Archive</button>}</div></article>)}</div>:<p className="mt-3 rounded-xl border border-dashed p-6 text-sm text-slate-500">No products listed yet.</p>}</section>
          <section className="mt-8"><h2 className="text-xl font-black">Services</h2>{services.length?<div className="mt-4 grid gap-3 md:grid-cols-2">{services.map(s=><article key={s.id} className="rounded-2xl border bg-white p-5"><div className="flex justify-between gap-3"><div><p className="text-xs text-[#1A3C6E]">{s.category.name}</p><h3 className="mt-1 font-bold">{s.title}</h3><p className="mt-1 text-sm text-slate-500">{money(s.basePrice)}{s.serviceAreas.length?` · ${s.serviceAreas.join(", ")}`:""}</p></div><span className="h-fit rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{s.status}</span></div><div className="mt-4 flex gap-2">{s.status!=="ACTIVE"&&<button disabled={saving} onClick={()=>void serviceStatus(s,"ACTIVE")} className={primary}>Publish</button>}{s.status==="ACTIVE"&&<button disabled={saving} onClick={()=>void serviceStatus(s,"DRAFT")} className="rounded-xl border px-3 text-xs font-bold">Unpublish</button>}{s.status!=="ARCHIVED"&&<button disabled={saving} onClick={()=>void serviceStatus(s,"ARCHIVED")} className="rounded-xl border px-3 text-xs font-bold text-red-700">Archive</button>}</div></article>)}</div>:<p className="mt-3 rounded-xl border border-dashed p-6 text-sm text-slate-500">No service offerings yet.</p>}</section>
        </>}
      </>}
      <div className="mt-8 rounded-2xl bg-[#FFF8D9] p-5 text-sm text-slate-700"><p className="font-bold">Marketplace publishing policy</p><p className="mt-2 leading-6">Listings are saved as drafts first. Only verified vendors can publish. Customer service booking, delivery assignment and merchant settlement are separate workflows and are not represented as active here.</p></div>
    </div>
  </main>;
}
