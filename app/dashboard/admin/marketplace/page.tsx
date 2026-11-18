"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Building2, CheckCircle2, Clock3, LoaderCircle, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Vendor = {
  id:string; businessName:string; type:string; status:"PENDING"|"VERIFIED"|"REJECTED"|"SUSPENDED";
  email:string|null; phone:string|null; address:string|null; averageRating:number|null; createdAt:string;
  user:{id:string;email:string;firstName:string|null;lastName:string|null};
};
type Result={success:boolean;data:{vendors:Vendor[];pagination:{page:number;limit:number;total:number;totalPages:number}}};
type Action={success:boolean;data:Vendor};
const statuses=["PENDING","VERIFIED","REJECTED","SUSPENDED"] as const;

export default function MarketplaceVendorReviewPage(){
 const {getToken}=useAuth();
 const [status,setStatus]=useState<(typeof statuses)[number]>("PENDING");
 const [vendors,setVendors]=useState<Vendor[]>([]);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState("");
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [page,setPage]=useState(1);
 const [totalPages,setTotalPages]=useState(1);
 const [total,setTotal]=useState(0);

 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const result=await apiFetch<Result>(`/api/v1/marketplace/admin/vendors?status=${status}&page=${page}&limit=20`,getToken);
   setVendors(result.data.vendors||[]);setTotalPages(result.data.pagination.totalPages||1);setTotal(result.data.pagination.total||0);
  }catch(e){setError(e instanceof Error?e.message:"Unable to load marketplace vendor applications.");}
  finally{setLoading(false);}
 },[getToken,status,page]);
 useEffect(()=>{void load();},[load]);

 async function review(vendor:Vendor,next:"VERIFIED"|"REJECTED"|"SUSPENDED"){
  const action=next==="VERIFIED"?"approve":next==="REJECTED"?"reject":"suspend";
  if(!window.confirm(`Are you sure you want to ${action} ${vendor.businessName}?`))return;
  setSaving(vendor.id);setError("");setNotice("");
  try{
   await apiFetch<Action>(`/api/v1/marketplace/admin/vendors/${vendor.id}/review`,getToken,{method:"POST",body:JSON.stringify({status:next})});
   setNotice(`${vendor.businessName} was ${next.toLowerCase()}.`);await load();
  }catch(e){setError(e instanceof Error?e.message:`Could not ${action} vendor.`);}
  finally{setSaving("");}
 }

 return <main className="min-h-screen bg-[#F7F8FA] text-slate-950">
  <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"><Link href="/dashboard/admin" className="flex items-center gap-2 font-black text-[#1A3C6E]"><span className="rounded-xl bg-[#FACC15] p-2"><Building2 size={19}/></span>AVIRITECH <span className="font-medium text-slate-500">Marketplace review</span></Link><Link href="/dashboard/admin" className="flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={16}/>Admin dashboard</Link></div></header>
  <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
   <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#1A3C6E]">Marketplace governance</p><h1 className="mt-2 text-3xl font-black">Vendor applications</h1><p className="mt-2 text-sm text-slate-500">Review business applications and control vendor publishing eligibility.</p></div><button onClick={()=>void load()} disabled={loading} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold"><RefreshCw size={16} className={loading?"animate-spin":""}/>Refresh</button></div>
   {error&&<div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
   {notice&&<div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
   <div className="mt-7 flex flex-wrap gap-2">{statuses.map(s=><button key={s} onClick={()=>{setStatus(s);setPage(1)}} className={`rounded-full px-4 py-2 text-xs font-bold ${status===s?"bg-[#1A3C6E] text-white":"border border-slate-200 bg-white text-slate-600"}`}>{s.replaceAll("_"," ")}</button>)}</div>
   <div className="mt-4 flex items-center justify-between text-sm text-slate-500"><span>{total} {status.toLowerCase()} vendor(s)</span><span>Page {page} of {totalPages}</span></div>
   {loading?<div className="flex justify-center py-24 text-sm text-slate-500"><LoaderCircle className="mr-2 animate-spin"/>Loading applications…</div>:vendors.length===0?<div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><Building2 className="mx-auto text-slate-300" size={32}/><h2 className="mt-3 font-bold">No {status.toLowerCase()} vendors</h2><p className="mt-1 text-sm text-slate-500">There are no vendor records in this status.</p></div>:<div className="mt-4 grid gap-4 lg:grid-cols-2">{vendors.map(v=><article key={v.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black">{v.businessName}</h2><p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#1A3C6E]">{v.type.replaceAll("_"," ")}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${v.status==="VERIFIED"?"bg-emerald-100 text-emerald-800":v.status==="PENDING"?"bg-amber-100 text-amber-800":v.status==="SUSPENDED"?"bg-red-100 text-red-800":"bg-slate-100 text-slate-700"}`}>{v.status}</span></div>
    <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><div><p className="text-[11px] font-bold uppercase text-slate-400">Applicant</p><p className="mt-1 text-sm font-semibold">{[v.user.firstName,v.user.lastName].filter(Boolean).join(" ")||"Name not provided"}</p><p className="text-xs text-slate-500">{v.user.email}</p></div><div><p className="text-[11px] font-bold uppercase text-slate-400">Business contact</p><p className="mt-1 text-sm">{v.email||"No business email"}</p><p className="text-xs text-slate-500">{v.phone||"No phone supplied"}</p></div><div className="sm:col-span-2"><p className="text-[11px] font-bold uppercase text-slate-400">Business address</p><p className="mt-1 text-sm">{v.address||"No address supplied"}</p></div><div><p className="text-[11px] font-bold uppercase text-slate-400">Application date</p><p className="mt-1 text-sm">{new Date(v.createdAt).toLocaleString("en-NG")}</p></div><div><p className="text-[11px] font-bold uppercase text-slate-400">Vendor reference</p><p className="mt-1 break-all font-mono text-xs">{v.id}</p></div></div>
    {v.status==="PENDING"&&<div className="mt-4 flex flex-wrap gap-2"><button disabled={saving===v.id} onClick={()=>void review(v,"VERIFIED")} className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 size={16}/>{saving===v.id?"Saving…":"Approve vendor"}</button><button disabled={saving===v.id} onClick={()=>void review(v,"REJECTED")} className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50"><XCircle size={16}/>Reject</button></div>}
    {v.status==="VERIFIED"&&<button disabled={saving===v.id} onClick={()=>void review(v,"SUSPENDED")} className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50"><ShieldCheck size={16}/>Suspend vendor</button>}
    {v.status==="SUSPENDED"&&<p className="mt-4 flex items-center gap-2 text-xs text-red-700"><Clock3 size={15}/>Suspended vendors cannot publish or sell listings.</p>}
   </article>)}</div>}
   <div className="mt-6 flex justify-end gap-2"><button disabled={page<=1||loading} onClick={()=>setPage(p=>p-1)} className="rounded-xl border bg-white px-4 py-2 text-sm font-bold disabled:opacity-40">Previous</button><button disabled={page>=totalPages||loading} onClick={()=>setPage(p=>p+1)} className="rounded-xl border bg-white px-4 py-2 text-sm font-bold disabled:opacity-40">Next</button></div>
   <p className="mt-6 rounded-xl bg-blue-50 p-4 text-xs leading-5 text-blue-900">Approval is enforced by the backend permission <strong>marketplace.vendors.review</strong>. This screen does not grant vendor permissions or bypass the server-side review state machine.</p>
  </div>
 </main>;
}
