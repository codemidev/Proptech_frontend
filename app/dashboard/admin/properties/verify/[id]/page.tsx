"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { apiFetch, resolveMediaUrl } from "@/lib/api";

type RelatedName = { id?: string; name?: string | null };
type PropertyMedia = {
  id: string; type: string; url: string; thumbnailUrl?: string | null;
  caption?: string | null; isFeatured?: boolean; status?: string; sortOrder?: number;
};
type PropertyDocument = {
  id: string; type: string; title: string; fileUrl: string;
  version?: number; isVerified?: boolean; createdAt?: string; uploadedBy?: string | null;
  surveyExtraction?: {
    status?: string; reviewStatus?: string; confidence?: number | null;
    coordinateSystem?: string | null; units?: string | null;
    warnings?: unknown; errorMessage?: string | null; rawExtractedText?: string | null;
    pageCount?: number | null; coordinatePoints?: unknown;
  } | null;
};
type PropertyRecord = {
  id: string; propertyCode: string; title: string; slug: string; creationStatus?: string;
  description?: string | null; listingType: string; status: string;
  price: string | number; serviceCharge?: string | number | null;
  cautionFee?: string | number | null; agencyFee?: string | number | null;
  legalFee?: string | number | null; currency: string;
  bedrooms?: number | null; bathrooms?: number | null; toilets?: number | null;
  kitchens?: number | null; parkingSpaces?: number | null; floors?: number | null;
  yearBuilt?: number | null; landSize?: string | number | null;
  buildingSize?: string | number | null; measurementUnit?: string | null;
  verified: boolean; published: boolean; featured: boolean;
  createdAt: string; updatedAt: string;
  propertyType?: { name?: string; category?: string; description?: string | null } | null;
  owner?: { id: string; firstName?: string | null; lastName?: string | null; email: string; phoneNumber?: string | null; avatar?: string | null } | null;
  agent?: { firstName?: string | null; lastName?: string | null; email?: string; phoneNumber?: string | null } | null;
  organization?: { name?: string; type?: string } | null;
  address?: {
    addressLine1?: string; addressLine2?: string | null; landmark?: string | null;
    postalCode?: string | null; country?: RelatedName | null; state?: RelatedName | null;
    localGovernment?: RelatedName | null; city?: RelatedName | null;
    district?: RelatedName | null; estate?: RelatedName | null;
    building?: { name?: string; floors?: number | null } | null;
    unit?: { unitNumber?: string; floor?: number | null } | null;
  } | null;
  amenities?: { amenity?: { name?: string; description?: string | null } }[];
  features?: { feature?: { name?: string; description?: string | null } }[];
  media?: PropertyMedia[];
  documents?: PropertyDocument[];
  coordinates?: { id: string; latitude: string | number; longitude: string | number; altitude?: string | number | null; pointOrder: number }[];
  parcel?: { parcelNumber?: string | null; area?: string | number | null; perimeter?: string | number | null; measurementUnit?: string | null } | null;
  surveyPlans?: { id: string; surveyNumber?: string | null; surveyorName?: string | null; surveyDate?: string | null; fileUrl: string }[];
  gisFiles?: { id: string; type: string; fileUrl: string; createdAt?: string }[];
  geoJsonFiles?: { id: string; fileUrl: string; jsonData?: unknown; createdAt?: string }[];
};
type ApiResponse = { success: boolean; data: PropertyRecord; message?: string };

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not provided";
  return String(value);
}
function money(value: unknown, currency: string): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? currency + " " + amount.toLocaleString() : display(value);
}
function date(value?: string | null): string {
  if (!value) return "Not available";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-100 border-l-4 border-l-[#FACC15] px-5 py-4"><h2 className="font-bold text-slate-900">{title}</h2></div>
    <div className="p-5">{children}</div>
  </section>;
}
function Field({ label, value }: { label: string; value: unknown }) {
  return <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-semibold text-slate-900">{display(value)}</p></div>;
}

export default function AdminPropertySubmissionReviewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { getToken } = useAuth();
  const [property, setProperty] = useState<PropertyRecord | null>(null);
  const [busy, setBusy] = useState(true);
  const [action, setAction] = useState<"" | "approve" | "reject">("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      const response = await apiFetch<ApiResponse>("/api/v1/admin/properties/" + encodeURIComponent(id), getToken);
      setProperty(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load the property submission.");
    } finally {
      setBusy(false);
    }
  }, [getToken, id]);

  // The loader updates state only after its asynchronous API request completes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function review(decision: "approve" | "reject") {
    if (decision === "reject" && !reason.trim()) {
      setError("Enter a reason before rejecting this submission.");
      return;
    }
    if (decision === "approve" && !window.confirm("Approve and publish this property?")) return;
    setAction(decision);
    setError("");
    try {
      await apiFetch("/api/v1/admin/properties/" + encodeURIComponent(id) + "/" + decision, getToken, {
        method: "POST",
        ...(decision === "reject" ? { body: JSON.stringify({ reason: reason.trim() }) } : {}),
      });
      router.push("/dashboard/admin/properties/verify");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The review action could not be completed.");
    } finally {
      setAction("");
    }
  }

  if (busy) return <main className="min-h-screen bg-slate-50 p-6 text-slate-900"><p className="mx-auto max-w-6xl py-12 text-sm text-slate-500">Loading complete property submission…</p></main>;
  if (!property) return <main className="min-h-screen bg-slate-50 p-6 text-slate-900"><div className="mx-auto max-w-4xl"><Link href="/dashboard/admin/properties/verify" className="text-sm font-semibold">← Pending properties</Link><p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || "Property submission not found."}</p></div></main>;

  const address = property.address;
  const media = [...(property.media ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const images = media.filter(item => item.type === "IMAGE" || item.type === "FLOOR_PLAN");
  const videoTypes = ["VIDEO", "DRONE_VIDEO", "WALKTHROUGH_VIDEO", "TOUR_360"];
  const videos = media.filter(item => videoTypes.includes(item.type));
  const otherMedia = media.filter(item => !images.includes(item) && !videos.includes(item));
  const ownerName = [property.owner?.firstName, property.owner?.lastName].filter(Boolean).join(" ");
  const addressParts = [address?.addressLine1, address?.addressLine2, address?.landmark, address?.city?.name, address?.district?.name, address?.estate?.name, address?.localGovernment?.name, address?.state?.name, address?.country?.name].filter(Boolean);

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8">
    <div className="mx-auto max-w-7xl space-y-6 font-[var(--font-dm)]">
      <Link href="/dashboard/admin/properties/verify" className="text-sm font-semibold text-slate-600 hover:text-slate-950">← Back to pending properties</Link>
      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 border-t-4 border-t-[#FACC15] bg-white p-5 shadow-sm sm:flex-row sm:items-start sm:p-7">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#1A3C6E]">AVIRITECH PROPTECH · PROPERTY REVIEW</p>
          <h1 className="mt-2 break-words text-2xl font-black sm:text-3xl">{property.title}</h1>
          <p className="mt-2 text-sm text-slate-500">{property.propertyCode} · Submitted {date(property.createdAt)}</p>
          <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-[#FACC15]/20 px-3 py-1 text-xs font-bold text-[#1A3C6E]">{property.status}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{property.listingType}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{property.propertyType?.name || "Property type not set"}</span></div>
        </div>
        <div className="shrink-0 text-left sm:text-right"><p className="text-xs font-medium uppercase text-slate-500">Asking price</p><p className="mt-1 text-2xl font-black">{money(property.price, property.currency)}</p></div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Section title={"Property media (" + media.length + ")"}>
            {media.length === 0 ? <p className="text-sm text-slate-500">No photos or videos were attached to this submission.</p> : <>
              {images.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{images.map(item => <a key={item.id} href={resolveMediaUrl(item.url)} target="_blank" rel="noreferrer" className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveMediaUrl(item.thumbnailUrl || item.url)} alt={item.caption || "Owner-submitted property image"} className="aspect-[4/3] w-full object-cover transition group-hover:scale-[1.02]" />
                {item.isFeatured && <span className="absolute left-2 top-2 rounded bg-[#FACC15] px-2 py-1 text-[10px] font-bold text-slate-950">FEATURED</span>}
                {item.caption && <span className="block truncate p-2 text-xs text-slate-700">{item.caption}</span>}
              </a>)}</div>}
              {videos.length > 0 && <div className="mt-5 grid gap-4 md:grid-cols-2">{videos.map(item => <div key={item.id} className="min-w-0"><video controls preload="metadata" playsInline poster={item.thumbnailUrl ? resolveMediaUrl(item.thumbnailUrl) : undefined} className="max-h-[420px] w-full rounded-xl bg-black"><source src={resolveMediaUrl(item.url)} /></video><p className="mt-2 text-xs font-semibold text-slate-600">{item.type.split("_").join(" ")}{item.caption ? " · " + item.caption : ""} · Status: {display(item.status)}</p></div>)}</div>}
              {otherMedia.length > 0 && <div className="mt-5 space-y-2">{otherMedia.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3"><span className="text-sm font-medium">{item.type.split("_").join(" ")}{item.caption ? " · " + item.caption : ""}</span><a href={resolveMediaUrl(item.url)} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#1A3C6E] underline">Open uploaded file</a></div>)}</div>}
            </>}
          </Section>

          <Section title="Property description">
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{property.description || "No description was provided."}</p>
          </Section>

          <Section title="Property identity and specifications">
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Property title" value={property.title} /><Field label="Property code" value={property.propertyCode} /><Field label="Property type" value={property.propertyType?.name} /><Field label="Type category" value={property.propertyType?.category} /><Field label="Property type description" value={property.propertyType?.description} /><Field label="Listing type" value={property.listingType} /><Field label="Price" value={money(property.price, property.currency)} /><Field label="Service charge" value={property.serviceCharge == null ? null : money(property.serviceCharge, property.currency)} /><Field label="Caution fee" value={property.cautionFee == null ? null : money(property.cautionFee, property.currency)} /><Field label="Agency fee" value={property.agencyFee == null ? null : money(property.agencyFee, property.currency)} /><Field label="Legal fee" value={property.legalFee == null ? null : money(property.legalFee, property.currency)} /><Field label="Bedrooms" value={property.bedrooms} /><Field label="Bathrooms" value={property.bathrooms} /><Field label="Toilets" value={property.toilets} /><Field label="Kitchens" value={property.kitchens} /><Field label="Parking spaces" value={property.parkingSpaces} /><Field label="Floors" value={property.floors} /><Field label="Year built" value={property.yearBuilt} /><Field label="Land size" value={property.landSize == null ? null : display(property.landSize) + " " + display(property.measurementUnit)} /><Field label="Building size" value={property.buildingSize == null ? null : display(property.buildingSize) + " " + display(property.measurementUnit)} /><Field label="Currency" value={property.currency} />
            </div>
          </Section>

          <Section title="Property location">
            <p className="mb-5 text-sm leading-6 text-slate-700">{addressParts.length ? addressParts.join(", ") : "No address details were provided."}</p>
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Address line 1" value={address?.addressLine1} /><Field label="Address line 2" value={address?.addressLine2} /><Field label="Landmark" value={address?.landmark} /><Field label="Postal code" value={address?.postalCode} /><Field label="Country" value={address?.country?.name} /><Field label="State" value={address?.state?.name} /><Field label="LGA" value={address?.localGovernment?.name} /><Field label="City" value={address?.city?.name} /><Field label="District" value={address?.district?.name} /><Field label="Estate" value={address?.estate?.name} /><Field label="Building" value={address?.building?.name} /><Field label="Building floors" value={address?.building?.floors} /><Field label="Unit" value={address?.unit?.unitNumber} /><Field label="Unit floor" value={address?.unit?.floor} />
            </div>
          </Section>

          <Section title={"Amenities (" + (property.amenities?.length ?? 0) + ")"}>
            {property.amenities?.length ? <div className="flex flex-wrap gap-2">{property.amenities.map((entry, index) => <div key={entry.amenity?.name || index} className="rounded-xl bg-slate-100 px-3 py-2"><p className="text-sm font-semibold text-slate-800">{entry.amenity?.name || "Unnamed amenity"}</p>{entry.amenity?.description && <p className="mt-1 text-xs text-slate-600">{entry.amenity.description}</p>}</div>)}</div> : <p className="text-sm text-slate-500">No amenities were selected.</p>}
          </Section>

          <Section title={"Features (" + (property.features?.length ?? 0) + ")"}>
            {property.features?.length ? <div className="flex flex-wrap gap-2">{property.features.map((entry, index) => <div key={entry.feature?.name || index} className="rounded-xl bg-slate-100 px-3 py-2"><p className="text-sm font-semibold text-slate-800">{entry.feature?.name || "Unnamed feature"}</p>{entry.feature?.description && <p className="mt-1 text-xs text-slate-600">{entry.feature.description}</p>}</div>)}</div> : <p className="text-sm text-slate-500">No additional features were selected.</p>}
          </Section>

          <Section title={"Supporting documents (" + (property.documents?.length ?? 0) + ")"}>
            {property.documents?.length ? <div className="divide-y divide-slate-100">{property.documents.map(doc => <div key={doc.id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center">
              <div><p className="text-sm font-semibold text-slate-900">{doc.title}</p><p className="mt-1 text-xs text-slate-500">{doc.type.split("_").join(" ")} · Version {doc.version ?? 1} · {date(doc.createdAt)}</p><p className="mt-1 text-xs text-slate-500">Verification: {doc.isVerified ? "Verified" : "Not verified"} · Uploaded by: {display(doc.uploadedBy)}</p>{doc.surveyExtraction && <div className="mt-2 space-y-1 text-xs text-slate-500"><p>Survey extraction: {display(doc.surveyExtraction.reviewStatus)} · Processing: {display(doc.surveyExtraction.status)}</p><p>Coordinate system: {display(doc.surveyExtraction.coordinateSystem)} · Units: {display(doc.surveyExtraction.units)} · Confidence: {display(doc.surveyExtraction.confidence)}</p>{doc.surveyExtraction.errorMessage && <p className="text-red-700">Extraction issue: {doc.surveyExtraction.errorMessage}</p>}<p>Pages detected: {display(doc.surveyExtraction.pageCount)}</p>{doc.surveyExtraction.warnings != null && <p>Extraction warnings: {JSON.stringify(doc.surveyExtraction.warnings)}</p>}{doc.surveyExtraction.coordinatePoints != null && <details className="rounded-lg bg-slate-50 p-2"><summary className="cursor-pointer font-semibold">Extracted coordinate points</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(doc.surveyExtraction.coordinatePoints, null, 2)}</pre></details>}{doc.surveyExtraction.rawExtractedText && <details className="rounded-lg bg-slate-50 p-2"><summary className="cursor-pointer font-semibold">Extracted source text</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words">{doc.surveyExtraction.rawExtractedText}</pre></details>}</div>}</div>
              <a href={resolveMediaUrl(doc.fileUrl)} target="_blank" rel="noreferrer" className="shrink-0 text-sm font-bold text-[#1A3C6E] underline">Open document</a>
            </div>)}</div> : <p className="text-sm text-slate-500">No supporting documents were attached.</p>}
          </Section>

          <Section title="Survey and parcel information">
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3"><Field label="Parcel number" value={property.parcel?.parcelNumber} /><Field label="Parcel area" value={property.parcel?.area} /><Field label="Parcel perimeter" value={property.parcel?.perimeter} /><Field label="Measurement unit" value={property.parcel?.measurementUnit} /></div>
            {property.surveyPlans?.length ? <div className="mt-5 divide-y divide-slate-100">{property.surveyPlans.map(plan => <div key={plan.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span>{plan.surveyNumber || "Survey plan"} · {plan.surveyorName || "Surveyor not specified"} · Survey date: {date(plan.surveyDate)}</span><a href={resolveMediaUrl(plan.fileUrl)} target="_blank" rel="noreferrer" className="font-bold text-[#1A3C6E] underline">Open survey plan</a></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No separate survey plans were attached.</p>}
            {property.coordinates?.length ? <div className="mt-5 overflow-x-auto"><p className="mb-2 text-sm font-semibold">Submitted coordinates</p><table className="w-full min-w-[420px] text-left text-xs"><thead><tr className="border-b text-slate-500"><th className="p-2">Point</th><th className="p-2">Latitude</th><th className="p-2">Longitude</th><th className="p-2">Altitude</th></tr></thead><tbody>{property.coordinates.map(point => <tr key={point.id} className="border-b border-slate-100"><td className="p-2">{point.pointOrder}</td><td className="p-2">{point.latitude}</td><td className="p-2">{point.longitude}</td><td className="p-2">{display(point.altitude)}</td></tr>)}</tbody></table></div> : null}
          </Section>
          <Section title="GIS and geospatial uploads">
            {property.gisFiles?.length ? <div className="divide-y divide-slate-100">{property.gisFiles.map(file => <div key={file.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><p className="text-sm font-semibold">{file.type.split("_").join(" ")}</p><p className="text-xs text-slate-500">{date(file.createdAt)}</p></div><a href={resolveMediaUrl(file.fileUrl)} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#1A3C6E] underline">Open GIS file</a></div>)}</div> : <p className="text-sm text-slate-500">No GIS files were uploaded.</p>}
            {property.geoJsonFiles?.length ? <div className="mt-4 space-y-3">{property.geoJsonFiles.map(file => <div key={file.id} className="rounded-xl bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">GeoJSON submission · {date(file.createdAt)}</p><a href={resolveMediaUrl(file.fileUrl)} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#1A3C6E] underline">Open GeoJSON file</a></div>{file.jsonData != null && <details className="mt-2"><summary className="cursor-pointer text-xs font-semibold">View stored geometry/data</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(file.jsonData, null, 2)}</pre></details>}</div>)}</div> : <p className="mt-3 text-sm text-slate-500">No GeoJSON data was uploaded.</p>}
          </Section>
        </div>

        <aside className="min-w-0 space-y-6">
          <Section title="Owner / submitter">
            {property.owner?.avatar ? <div className="mb-4 flex items-center gap-3"><img src={resolveMediaUrl(property.owner.avatar)} alt="" className="h-12 w-12 rounded-full object-cover" /><div><p className="font-bold">{ownerName || "Property owner"}</p><p className="text-xs text-slate-500">Owner profile</p></div></div> : <p className="font-bold">{ownerName || "Owner name not provided"}</p>}
            <div className="mt-4 space-y-4"><Field label="Email" value={property.owner?.email} /><Field label="Phone" value={property.owner?.phoneNumber} /><Field label="Owner ID" value={property.owner?.id} /></div>
          </Section>
          <Section title="Submission status">
            <div className="space-y-4"><Field label="Current status" value={property.status} /><Field label="Creation workflow status" value={property.creationStatus} /><Field label="Submitted" value={date(property.createdAt)} /><Field label="Last updated" value={date(property.updatedAt)} /><Field label="Verified" value={property.verified ? "Yes" : "No"} /><Field label="Published" value={property.published ? "Yes" : "No"} /><Field label="Featured" value={property.featured ? "Yes" : "No"} /><Field label="Organization" value={property.organization?.name} /><Field label="Assigned agent" value={property.agent ? [property.agent.firstName, property.agent.lastName].filter(Boolean).join(" ") || property.agent.email : null} /></div>
          </Section>
          <Section title="Administrator decision">
            <label htmlFor="rejection-reason" className="mb-2 block text-sm font-semibold text-slate-700">Rejection reason (required when rejecting)</label>
            <textarea id="rejection-reason" value={reason} onChange={event => setReason(event.target.value)} rows={4} placeholder="Explain what needs correction or why this submission cannot be approved." className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-[#FACC15] focus:ring-2 focus:ring-[#FACC15]/30" />
            <div className="mt-4 grid gap-2"><button type="button" disabled={!!action || property.status !== "PENDING_APPROVAL"} onClick={() => void review("approve")} className="rounded-xl bg-[#FACC15] px-4 py-3 text-sm font-bold text-[#1A3C6E] shadow-sm transition hover:bg-[#EAB308] disabled:cursor-not-allowed disabled:opacity-50">{action === "approve" ? "Approving…" : "Approve & publish property"}</button><button type="button" disabled={!!action || property.status !== "PENDING_APPROVAL" || !reason.trim()} onClick={() => void review("reject")} className="rounded-xl border border-red-300 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">{action === "reject" ? "Rejecting…" : "Reject submission"}</button></div>
            {property.status !== "PENDING_APPROVAL" && <p className="mt-3 text-xs text-slate-500">This property is no longer awaiting approval, so review actions are disabled.</p>}
          </Section>
        </aside>
      </div>
    </div>
  </main>;
}
