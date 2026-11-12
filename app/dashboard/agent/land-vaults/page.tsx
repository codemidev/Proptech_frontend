"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  ImagePlus,
  LocateFixed,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Video,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";

type Status =
  | "DRAFT"
  | "PAYMENT_PENDING"
  | "PAYMENT_CONFIRMED"
  | "OWNER_COMPLETION_REQUIRED"
  | "OWNER_COMPLETED"
  | "DUE_DILIGENCE_PENDING"
  | "UNDER_DUE_DILIGENCE"
  | "AGENT_APPROVED"
  | "AGENT_REJECTED"
  | "ADMIN_REVIEW"
  | "ADMIN_APPROVED"
  | "ADMIN_REJECTED"
  | "BLOCKCHAIN_PENDING"
  | "BLOCKCHAIN_ANCHORED"
  | "CERTIFIED"
  | "SUSPENDED"
  | "ARCHIVED";

type Point = {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracyM?: number | null;
  headingDegrees?: number | null;
  capturedAt?: string | null;
  captureMethod?: string;
};

type Evidence = {
  id: string;
  category: string;
  mediaType: string;
  url: string;
  mimeType?: string | null;
  caption?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracyM?: number | null;
  createdAt: string;
};

type PropertyDocument = {
  id: string;
  type?: string;
  title?: string | null;
  fileUrl: string;
  isVerified?: boolean;
  createdAt?: string;
};

type LocationValue = string | { name?: string | null } | null;

function getLocationLabel(value: LocationValue | undefined): string {
  if (typeof value === "string") return value;
  return value?.name ?? "";
}

type Vault = {
  id: string;
  vaultCode: string;
  status: Status;
  propertyId: string;
  updatedAt: string;
  property: {
    id: string;
    title?: string | null;
    propertyCode?: string | null;
    address?: {
      addressLine1?: string | null;
      city?: LocationValue;
      state?: LocationValue;
    } | null;
    coordinates?: Point[];
    parcel?: {
      parcelNumber?: string | null;
      area?: number | string | null;
      perimeter?: number | string | null;
      measurementUnit?: string | null;
    } | null;
    documents?: PropertyDocument[];
    media?: Array<{
      id: string;
      type?: string;
      url: string;
      caption?: string | null;
    }>;
  };
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

type GovernmentVisit = {
  officeName: string;
  officeLocation: string;
  visitDate: string;
  recordReference: string;
  notes: string;
};

type AeroMission = {
  id: string;
  status: "REQUESTED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  property: {
    id: string;
    title?: string | null;
    propertyCode?: string | null;
  };
  assignedDrone?: {
    manufacturer: string;
    model: string;
    serialNumber: string;
  } | null;
};

type SurveyData = {
  survey: {
    id: string;
    areaSqm?: number | string | null;
    perimeterM?: number | string | null;
    geoJson?: {
      properties?: {
        findings?: string;
        recommendation?: string;
        verificationMethod?: "SITE_VISIT" | "AFI_DRONE" | "BOTH";
        governmentVisits?: GovernmentVisit[];
        aeroMissionId?: string | null;
      };
    } | null;
    points: Point[];
  } | null;
  evidence: Evidence[];
};

const BoundaryMap = dynamic(
  () => import("@/components/agent/land-vault/LandVaultBoundaryMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[360px] items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        Loading survey map...
      </div>
    ),
  },
);

const categories = [
  "SITE_PHOTO",
  "SITE_VISIT",
  "BOUNDARY",
  "ROAD_ACCESS",
  "TERRAIN",
  "STRUCTURE",
  "VIDEO_WALKTHROUGH",
  "GOVERNMENT_RECORD",
  "INSPECTION_AFFIRMATION",
  "DRONE_REPORT",
  "DRONE_AERIAL",
  "OTHER",
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-amber-900";

function statusLabel(status: Status) {
  return status.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function statusClass(status: Status) {
  if (["CERTIFIED", "ADMIN_APPROVED", "BLOCKCHAIN_ANCHORED"].includes(status)) {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  }
  if (["AGENT_REJECTED", "ADMIN_REJECTED", "SUSPENDED"].includes(status)) {
    return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
  }
  if (["UNDER_DUE_DILIGENCE", "DUE_DILIGENCE_PENDING", "ADMIN_REVIEW"].includes(status)) {
    return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function numberLabel(value?: number | string | null) {
  if (value == null || value === "") return "Not recorded";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toLocaleString() : String(value);
}

export default function AgentLandVaultWorkspace() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [points, setPoints] = useState<Point[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [findings, setFindings] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [verificationMethod, setVerificationMethod] = useState<
    "SITE_VISIT" | "AFI_DRONE" | "BOTH"
  >("SITE_VISIT");
  const [governmentVisits, setGovernmentVisits] = useState<GovernmentVisit[]>([]);
  const [visitDraft, setVisitDraft] = useState<GovernmentVisit>({
    officeName: "",
    officeLocation: "",
    visitDate: new Date().toISOString().slice(0, 10),
    recordReference: "",
    notes: "",
  });
  const [aeroMissions, setAeroMissions] = useState<AeroMission[]>([]);
  const [aeroLoading, setAeroLoading] = useState(false);
  const [aeroMissionId, setAeroMissionId] = useState("");
  const [category, setCategory] = useState("SITE_PHOTO");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [gps, setGps] = useState<Point | null>(null);

  const [loading, setLoading] = useState(true);
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedVault = useMemo(
    () => vaults.find((vault) => vault.id === selectedId) ?? null,
    [vaults, selectedId],
  );

  const editable = selectedVault?.status === "UNDER_DUE_DILIGENCE";

  const loadVaults = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiFetch<ApiResponse<Vault[]>>(
        "/api/v1/land-vaults/agent/assigned",
        getToken,
      );

      if (!result.success || !Array.isArray(result.data)) {
        throw new Error(result.message || "Could not load assigned LandVaults.");
      }

      setVaults(result.data);
      setSelectedId((current) =>
        current && result.data.some((vault) => vault.id === current)
          ? current
          : result.data[0]?.id ?? "",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load assigned LandVaults.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isLoaded && isSignedIn) void loadVaults();
    else if (isLoaded && !isSignedIn) {
      setLoading(false);
      setError("Sign in to access your assigned LandVaults.");
    }
  }, [isLoaded, isSignedIn, loadVaults]);

  const loadSurvey = useCallback(async (vaultId: string) => {
    setSurveyLoading(true);
    setError("");

    try {
      const result = await apiFetch<ApiResponse<SurveyData>>(
        `/api/v1/land-vaults/${vaultId}/survey`,
        getToken,
      );

      if (!result.success) {
        throw new Error(result.message || "Could not load survey.");
      }

      const survey = result.data?.survey;
      setPoints(survey?.points ?? []);
      setEvidence(result.data?.evidence ?? []);
      setFindings(survey?.geoJson?.properties?.findings ?? "");
      setRecommendation(survey?.geoJson?.properties?.recommendation ?? "");
      setVerificationMethod(survey?.geoJson?.properties?.verificationMethod ?? "SITE_VISIT");
      setGovernmentVisits(survey?.geoJson?.properties?.governmentVisits ?? []);
      setAeroMissionId(survey?.geoJson?.properties?.aeroMissionId ?? "");
    } catch (err) {
      setPoints([]);
      setEvidence([]);
      setFindings("");
      setRecommendation("");
      setVerificationMethod("SITE_VISIT");
      setGovernmentVisits([]);
      setAeroMissionId("");
      setError(err instanceof Error ? err.message : "Could not load survey records.");
    } finally {
      setSurveyLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (selectedId) {
      setGps(null);
      void loadSurvey(selectedId);
    } else {
      setPoints([]);
      setEvidence([]);
    }
  }, [selectedId, loadSurvey]);

  useEffect(() => {
    const propertyId = selectedVault?.property.id;
    if (!propertyId) {
      setAeroMissions([]);
      return;
    }

    let active = true;
    setAeroLoading(true);

    apiFetch<ApiResponse<AeroMission[]>>(
      "/api/v1/agents/aero/requests",
      getToken,
    ).then((result) => {
      if (!active) return;
      if (!result.success || !Array.isArray(result.data)) {
        throw new Error(result.message || "Could not load AERO missions.");
      }
      setAeroMissions(
        result.data.filter((mission) => mission.property.id === propertyId),
      );
    }).catch(() => {
      if (active) setAeroMissions([]);
    }).finally(() => {
      if (active) setAeroLoading(false);
    });

    return () => {
      active = false;
    };
  }, [selectedVault?.property.id, getToken]);

  function addPoint(latitude: number, longitude: number, captureMethod = "MANUAL", accuracyM?: number) {
    setPoints((current) => [
      ...current,
      {
        latitude,
        longitude,
        captureMethod,
        accuracyM: accuracyM ?? null,
        capturedAt: new Date().toISOString(),
      },
    ]);
    setMessage("Boundary point added. Save the survey to persist it.");
  }

  function captureGps() {
    setError("");
    setMessage("");

    if (!navigator.geolocation) {
      setError("GPS is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point: Point = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude,
          accuracyM: position.coords.accuracy,
          headingDegrees: position.coords.heading,
          capturedAt: new Date(position.timestamp).toISOString(),
          captureMethod: "GPS",
        };

        setGps(point);
        addPoint(point.latitude, point.longitude, "GPS", point.accuracyM ?? undefined);
        setMessage(`GPS point captured. Reported accuracy: ±${Math.round(point.accuracyM ?? 0)} m.`);
      },
      (geoError) => {
        setError(
          geoError.code === geoError.PERMISSION_DENIED
            ? "Location permission was denied. Allow location access in your browser."
            : geoError.code === geoError.TIMEOUT
              ? "GPS request timed out. Move outdoors and try again."
              : "Unable to obtain GPS coordinates.",
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }

  async function saveSurvey() {
    if (!selectedVault || !editable) return;

    if (points.length < 3) {
      setError("Add at least three boundary points before saving.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const result = await apiFetch<ApiResponse<{ id: string; points: Point[] }>>(
        `/api/v1/land-vaults/${selectedVault.id}/survey`,
        getToken,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ points, findings, recommendation }),
        },
      );

      if (!result.success) throw new Error(result.message || "Survey save failed.");

      setMessage("Survey boundary and field report saved.");
      await loadSurvey(selectedVault.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save survey.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadEvidence() {
    if (!selectedVault || !editable || !file) {
      setError("Select a photo or video before uploading.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("category", category);
      form.append("caption", caption);

      if (gps) {
        form.append("latitude", String(gps.latitude));
        form.append("longitude", String(gps.longitude));
        if (gps.accuracyM != null) form.append("accuracyM", String(gps.accuracyM));
        if (gps.capturedAt) form.append("capturedAt", gps.capturedAt);
      }

      const result = await apiFetch<ApiResponse<Evidence>>(
        `/api/v1/land-vaults/${selectedVault.id}/evidence`,
        getToken,
        { method: "POST", body: form },
      );

      if (!result.success) throw new Error(result.message || "Evidence upload failed.");

      setFile(null);
      setCaption("");
      setMessage("Field evidence uploaded.");
      await loadSurvey(selectedVault.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload evidence.");
    } finally {
      setUploading(false);
    }
  }

  async function transition(toStatus: "UNDER_DUE_DILIGENCE" | "AGENT_APPROVED" | "AGENT_REJECTED") {
    if (!selectedVault) return;

    if (toStatus === "AGENT_APPROVED" && points.length < 3) {
      setError("Save a boundary with at least three points before submitting for admin review.");
      return;
    }

    if (toStatus === "AGENT_APPROVED" && !findings.trim()) {
      setError("Add your due diligence findings before submitting for admin review.");
      return;
    }

    if (toStatus === "AGENT_REJECTED" && !findings.trim()) {
      setError("Record the reason in Findings before rejecting this LandVault.");
      return;
    }

    setTransitioning(true);
    setError("");
    setMessage("");

    try {
      const descriptions = {
        UNDER_DUE_DILIGENCE: "Agent started LandVault field due diligence.",
        AGENT_APPROVED: "Agent completed field due diligence and submitted the LandVault for admin review.",
        AGENT_REJECTED: `Agent rejected LandVault during due diligence: ${findings.trim()}`,
      };

      const result = await apiFetch<ApiResponse<unknown>>(
        `/api/v1/land-vaults/${selectedVault.id}/transition`,
        getToken,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toStatus,
            description: descriptions[toStatus],
            metadata: { source: "agent-land-vault-workspace" },
          }),
        },
      );

      if (!result.success) throw new Error(result.message || "Status update failed.");

      setMessage(
        toStatus === "AGENT_APPROVED"
          ? "Approved and submitted to admin review."
          : toStatus === "AGENT_REJECTED"
            ? "LandVault rejected and the decision recorded."
            : "Due diligence started.",
      );

      await loadVaults();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update LandVault status.");
    } finally {
      setTransitioning(false);
    }
  }

  const ownerCoordinates = selectedVault?.property.coordinates ?? [];
  const address = [
    selectedVault?.property.address?.addressLine1,
    getLocationLabel(selectedVault?.property.address?.city),
    getLocationLabel(selectedVault?.property.address?.state),
  ].filter(Boolean).join(", ");

  const verifiedDocuments = selectedVault?.property.documents ?? [];

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-5 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <a href="/dashboard/agent" className="inline-flex items-center gap-1 hover:text-amber-600">
                <ArrowLeft size={15} /> Agent dashboard
              </a>
              <span>/</span>
              <span>LandVault workspace</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              LandVault due diligence
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Survey boundaries, capture field evidence, document findings, and submit your review.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadVaults()}
            disabled={loading}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh assignments
          </button>
        </header>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {message && (
          <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            {message}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Your assigned properties</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {vaults.length} assigned
            </span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">Loading assignments...</div>
          ) : vaults.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-8 text-center dark:bg-slate-800/60">
              <ClipboardCheck className="mx-auto mb-2 text-slate-400" size={30} />
              <p className="font-semibold">No LandVault assignments yet</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Properties assigned to your agent account will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {vaults.map((vault) => (
                <button
                  key={vault.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(vault.id);
                    setError("");
                    setMessage("");
                  }}
                  className={`min-w-0 rounded-xl border p-3 text-left transition ${
                    selectedId === vault.id
                      ? "border-amber-400 bg-amber-50/70 ring-2 ring-amber-100 dark:border-amber-500 dark:bg-amber-950/30 dark:ring-amber-900"
                      : "border-slate-200 hover:border-amber-300 dark:border-slate-700 dark:hover:border-amber-600"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate font-semibold">
                      {vault.property.title || "Untitled property"}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${statusClass(vault.status)}`}>
                      {statusLabel(vault.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {vault.vaultCode}
                  </p>
                  <p className="mt-2 flex items-center gap-1 truncate text-xs text-slate-600 dark:text-slate-300">
                    <MapPin size={13} /> {getLocationLabel(vault.property.address?.city) || getLocationLabel(vault.property.address?.state) || "Location not recorded"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        {selectedVault && (
          <>
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Selected LandVault
                    </p>
                    <h2 className="mt-1 text-xl font-bold">
                      {selectedVault.property.title || "Untitled property"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {address || "Property address not recorded"}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusClass(selectedVault.status)}`}>
                    {statusLabel(selectedVault.status)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Vault code</p>
                    <p className="mt-1 break-all text-sm font-semibold">{selectedVault.vaultCode}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Parcel area</p>
                    <p className="mt-1 text-sm font-semibold">
                      {numberLabel(selectedVault.property.parcel?.area)} {selectedVault.property.parcel?.measurementUnit || "sqm"}
                    </p>
                  </div>
                  <div className="col-span-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800 sm:col-span-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Owner reference points</p>
                    <p className="mt-1 text-sm font-semibold">{ownerCoordinates.length}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="flex items-center gap-2 font-semibold">
                  <ShieldCheck size={18} className="text-amber-500" />
                  Due diligence workflow
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {selectedVault.status === "DUE_DILIGENCE_PENDING"
                    ? "Start field verification to unlock survey and evidence tools."
                    : selectedVault.status === "UNDER_DUE_DILIGENCE"
                      ? "Record the boundary, capture evidence, and complete your findings."
                      : selectedVault.status === "ADMIN_REVIEW"
                        ? "Your submission is with the administration team."
                        : selectedVault.status === "AGENT_REJECTED"
                          ? "This LandVault was rejected. Review the record and use the dashboard workflow if it is returned for verification."
                          : "This LandVault is not currently open for agent edits."}
                </p>

                {selectedVault.status === "DUE_DILIGENCE_PENDING" && (
                  <button
                    type="button"
                    disabled={transitioning}
                    onClick={() => void transition("UNDER_DUE_DILIGENCE")}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1A3C6E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#244d87] disabled:opacity-50"
                  >
                    <Activity size={17} />
                    {transitioning ? "Starting..." : "Start due diligence"}
                  </button>
                )}

                {selectedVault.status === "UNDER_DUE_DILIGENCE" && (
                  <div className="mt-4 space-y-2">
                    <button
                      type="button"
                      disabled={transitioning || saving || points.length < 3 || !findings.trim()}
                      onClick={() => void transition("AGENT_APPROVED")}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle2 size={17} />
                      {transitioning ? "Submitting..." : "Approve & submit to admin"}
                    </button>
                    <button
                      type="button"
                      disabled={transitioning || !findings.trim()}
                      onClick={() => {
                        if (window.confirm("Reject this LandVault using the findings recorded below?")) {
                          void transition("AGENT_REJECTED");
                        }
                      }}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                    >
                      <X size={17} /> Reject LandVault
                    </button>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Approval records the agent milestone and advances the vault to admin review.
                    </p>
                  </div>
                )}

                {selectedVault.status === "ADMIN_REVIEW" && (
                  <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <CheckCircle2 className="mb-1" size={19} />
                    Submitted to admin review.
                  </div>
                )}
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.8fr)]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="flex items-center gap-2 text-lg font-bold">
                        <MapPin className="text-amber-500" size={20} />
                        Land boundary survey
                      </h2>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Tap the map to add boundary points, or capture GPS while walking the parcel.
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${editable ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                      {editable ? "Editing enabled" : "Read only"}
                    </span>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      <span className="h-2 w-2 rounded-full bg-blue-500" /> Owner reference
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      <span className="h-2 w-2 rounded-full bg-amber-500" /> Agent survey
                    </span>
                  </div>

                  <div className="h-[360px] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 sm:h-[440px]">
                    {surveyLoading ? (
                      <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading survey...</div>
                    ) : (
                      <BoundaryMap
                        points={points}
                        ownerCoordinates={ownerCoordinates}
                        editable={Boolean(editable)}
                        onAddPoint={(latitude, longitude) => {
                          if (editable) addPoint(latitude, longitude);
                        }}
                      />
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={captureGps}
                      disabled={!editable}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1A3C6E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#244d87] disabled:opacity-40"
                    >
                      <LocateFixed size={17} /> Capture current GPS
                    </button>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {points.length} boundary point{points.length === 1 ? "" : "s"} · {ownerCoordinates.length} owner reference point{ownerCoordinates.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {gps && (
                    <p className="mt-2 break-all text-xs text-slate-500 dark:text-slate-400">
                      Latest GPS: {gps.latitude.toFixed(7)}, {gps.longitude.toFixed(7)} · accuracy ±{numberLabel(gps.accuracyM)} m
                    </p>
                  )}

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Captured boundary points</h3>
                      <button
                        type="button"
                        disabled={!editable}
                        onClick={() => setPoints([])}
                        className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-40"
                      >
                        Clear all
                      </button>
                    </div>

                    {points.length === 0 ? (
                      <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        No agent survey points recorded yet.
                      </p>
                    ) : (
                      <div className="max-h-48 space-y-2 overflow-y-auto">
                        {points.map((point, index) => (
                          <div key={`${point.latitude}-${point.longitude}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-xs dark:border-slate-800">
                            <div>
                              <span className="mr-2 font-bold text-amber-700 dark:text-amber-400">P{index + 1}</span>
                              <span className="break-all text-slate-700 dark:text-slate-300">
                                {point.latitude.toFixed(7)}, {point.longitude.toFixed(7)}
                              </span>
                              <span className="ml-2 text-slate-400">
                                {point.captureMethod || "MANUAL"}
                                {point.accuracyM != null ? ` · ±${numberLabel(point.accuracyM)}m` : ""}
                              </span>
                            </div>
                            <button
                              type="button"
                              disabled={!editable}
                              onClick={() => setPoints((current) => current.filter((_, i) => i !== index))}
                              aria-label={`Remove point ${index + 1}`}
                              className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-30 dark:hover:bg-red-950"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Minimum 3 distinct points. Survey points are stored separately from owner coordinates.
                    </p>
                    <button
                      type="button"
                      onClick={() => void saveSurvey()}
                      disabled={!editable || saving || points.length < 3}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Save size={17} /> {saving ? "Saving..." : "Save survey"}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="flex items-center gap-2 text-lg font-bold">
                    <ClipboardCheck className="text-amber-500" size={20} />
                    Field findings and recommendation
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Record what you verified on site. These notes are saved with the survey boundary.
                  </p>

                  <label className="mt-4 block text-sm font-semibold" htmlFor="landvault-findings">
                    Due diligence findings
                  </label>
                  <textarea
                    id="landvault-findings"
                    value={findings}
                    onChange={(event) => setFindings(event.target.value.slice(0, 5000))}
                    disabled={!editable}
                    maxLength={5000}
                    rows={5}
                    placeholder="Describe boundary observations, access roads, visible encroachments, occupation, landmarks, and any discrepancies..."
                    className={`${inputClass} mt-2 resize-y`}
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">{findings.length}/5000</p>

                  <label className="mt-3 block text-sm font-semibold" htmlFor="landvault-recommendation">
                    Agent recommendation
                  </label>
                  <textarea
                    id="landvault-recommendation"
                    value={recommendation}
                    onChange={(event) => setRecommendation(event.target.value.slice(0, 2000))}
                    disabled={!editable}
                    maxLength={2000}
                    rows={3}
                    placeholder="Recommend approval, further investigation, or rejection with reasons..."
                    className={`${inputClass} mt-2 resize-y`}
                  />

                  <button
                    type="button"
                    onClick={() => void saveSurvey()}
                    disabled={!editable || saving || points.length < 3}
                    className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-40"
                  >
                    <Save size={16} /> Save survey and report
                  </button>
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="flex items-center gap-2 text-lg font-bold">
                    <ImagePlus className="text-amber-500" size={20} />
                    Field evidence
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Upload site photos, boundary markers, access roads, terrain, structures, and walkthrough videos.
                  </p>

                  <label className="mt-4 block text-sm font-semibold" htmlFor="evidence-file">
                    Photo or video
                  </label>
                  <input
                    id="evidence-file"
                    type="file"
                    accept="image/*,video/mp4,video/webm,video/quicktime"
                    disabled={!editable || uploading}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null)}
                    className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-amber-900 dark:text-slate-300 dark:file:bg-amber-950 dark:file:text-amber-300"
                  />

                  {file && (
                    <p className="mt-2 break-all text-xs text-slate-500 dark:text-slate-400">
                      Selected: {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  )}

                  <label className="mt-4 block text-sm font-semibold" htmlFor="evidence-category">
                    Evidence category
                  </label>
                  <select
                    id="evidence-category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    disabled={!editable}
                    className={`${inputClass} mt-2`}
                  >
                    {categories.map((item) => (
                      <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
                    ))}
                  </select>

                  <label className="mt-4 block text-sm font-semibold" htmlFor="evidence-caption">
                    Caption / observation
                  </label>
                  <input
                    id="evidence-caption"
                    value={caption}
                    onChange={(event) => setCaption(event.target.value)}
                    disabled={!editable}
                    maxLength={500}
                    placeholder="Describe what this evidence shows"
                    className={`${inputClass} mt-2`}
                  />

                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {gps ? "Latest GPS coordinates will be attached to this upload." : "Capture GPS first if you want coordinates attached to this upload."}
                  </p>

                  <button
                    type="button"
                    onClick={() => void uploadEvidence()}
                    disabled={!editable || uploading || !file}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1A3C6E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#244d87] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus size={17} /> {uploading ? "Uploading..." : "Upload evidence"}
                  </button>

                  <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <h3 className="mb-3 text-sm font-semibold">Uploaded evidence ({evidence.length})</h3>
                    {evidence.length === 0 ? (
                      <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        No field evidence uploaded yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {evidence.map((item) => (
                          <div key={item.id} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                            {item.mediaType === "IMAGE" && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.url} alt={item.caption || item.category} className="h-36 w-full object-cover" />
                            )}
                            {item.mediaType === "VIDEO" && (
                              <div className="flex items-center gap-2 bg-slate-100 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                <Video size={18} /> Video evidence
                              </div>
                            )}
                            <div className="p-3">
                              <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                {item.category.replaceAll("_", " ")}
                              </p>
                              <p className="mt-1 text-sm">{item.caption || "No caption provided"}</p>
                              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[11px] text-slate-400">
                                  {new Date(item.createdAt).toLocaleString()}
                                </span>
                                <a href={item.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
                                  Open file
                                </a>
                              </div>
                              {item.latitude != null && item.longitude != null && (
                                <p className="mt-1 break-all text-[11px] text-slate-400">
                                  GPS: {item.latitude}, {item.longitude}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="flex items-center gap-2 font-bold">
                    <FileText size={18} className="text-amber-500" />
                    Owner-submitted documents
                  </h2>
                  {verifiedDocuments.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                      No property documents were returned for this assignment.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {verifiedDocuments.map((document) => (
                        <a
                          key={document.id}
                          href={document.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-3 text-sm hover:border-amber-300 dark:border-slate-800"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{document.title || document.type || "Property document"}</span>
                            <span className="text-xs text-slate-500">{document.isVerified ? "Verified" : "Not verified"}</span>
                          </span>
                          <FileText size={17} className="shrink-0 text-slate-400" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="flex items-center gap-2 font-semibold">
                    <Clock3 size={18} className="text-slate-400" />
                    Drone inspection
                    <span className="ml-auto rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                      Coming soon
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Live drone video, remote flight controls, telemetry, and aerial mapping will be introduced in a later phase.
                  </p>
                </div>
              </aside>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
