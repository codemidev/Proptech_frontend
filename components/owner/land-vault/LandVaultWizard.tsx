"use client";

import { useAuth } from "@clerk/nextjs"
import { apiFetch } from "@/lib/api"
import SurveyParcelMap from "@/components/owner/land-vault/SurveyParcelMap";

import { useMemo, useState, useEffect} from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Blocks,
  Check,
  Circle,
  FileCheck2,
  Fingerprint,
  Globe2,
  LockKeyhole,
  MapPin,
  Network,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  WalletCards,
} from "lucide-react";

type Step = {
  id: number;
  label: string;
  short: string;
};

const STEPS: Step[] = [
  { id: 1, label: "Property Identity", short: "Identity" },
  { id: 2, label: "Property Details", short: "Details" },
  { id: 3, label: "Ownership", short: "Ownership" },
  { id: 4, label: "Evidence Vault", short: "Evidence" },
  { id: 5, label: "Due Diligence", short: "Due Diligence" },
  { id: 6, label: "Review & Secure", short: "Review" },
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100";

const labelClass = "mb-2 block text-sm font-medium text-slate-700";

type PropertyTypeApiItem = {
  id: string;
  name?: string;
  category?: string;
};

type LocationOption = {
  id: string;
  name: string;
};

type LocationCountry = LocationOption & {
  isoCode: string;
};

type LocationCity = LocationOption & {
  stateId: string;
  localGovernmentId: string | null;
};

type LocationDistrict = LocationOption & {
  cityId: string | null;
};

type LocationApiResponse<T> = {
  success: boolean;
  data: T;
};

type LandVaultApiResponse = {
  data?: {
    id?: string;
    vaultCode?: string;
    status?: string;
    propertyId?: string;
  };
};

type SurveyCoordinatePoint = {
  pointOrder: number;
  beaconId: string;
  easting: number;
  northing: number;
  confidence: number | null;
  distanceFromPrevious?: number | null;
  bearingFromPrevious?: number | null;
};

type SurveyExtractionSummary = {
  status: string;
  reviewStatus: string;
  confidence: number | null;
  pageCount: number | null;
  coordinateSystem: string | null;
  units: string | null;
  coordinatePoints: SurveyCoordinatePoint[];
  warnings: string[];
  errorMessage: string | null;
};

function extractApiData<T>(response: unknown): T {
  const value = response as { data?: T };

  if (value && typeof value === "object" && "data" in value) {
    return value.data as T;
  }

  return response as T;
}

function findPropertyTypeId(
  propertyTypes: PropertyTypeApiItem[],
  requestedClass: string,
): string | undefined {
  const normalized = requestedClass.trim().toLowerCase();

  const exact = propertyTypes.find((item) => {
    const name = String(item.name ?? "").trim().toLowerCase();
    const category = String(item.category ?? "").trim().toLowerCase();

    if (normalized === "land") {
      return (
        name === "land" ||
        category === "land" ||
        name.includes("land")
      );
    }

    if (normalized === "residential") {
      return (
        name === "residential" ||
        category === "residential" ||
        name.includes("residential")
      );
    }

    if (normalized === "commercial") {
      return (
        name === "commercial" ||
        category === "commercial" ||
        name.includes("commercial")
      );
    }

    if (normalized === "mixed_use") {
      return (
        name.includes("mixed") ||
        category.includes("mixed")
      );
    }

    return false;
  });

  return exact?.id;
}


function EvidenceFilePicker({
  title,
  description,
  accept,
  files,
  onFilesChange,
  onRemove,
}: {
  title: string;
  description: string;
  accept: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
  onRemove: (index: number) => void;
}) {
  const [fileError, setFileError] = useState<string | null>(null);

  const previews = useMemo(
    () =>
      files.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [files],
  );

  useEffect(() => {
    return () => {
      previews.forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handleFileSelection = (fileList: FileList | null) => {
    // Copy FileList before clearing the input. FileList can become empty
    // when the input value is reset.
    const selectedFiles = Array.from(fileList ?? []);
    const maxSize = 100 * 1024 * 1024;

    const validFiles = selectedFiles.filter((file) => file.size <= maxSize);
    const oversizedFiles = selectedFiles.filter((file) => file.size > maxSize);

    onFilesChange(validFiles);

    setFileError(
      oversizedFiles.length > 0
        ? `${oversizedFiles.map((file) => file.name).join(", ")} must be 100 MB or smaller.`
        : null,
    );
  };

  return (
    <div className="landvault-evidence-card min-w-0 rounded-xl border border-slate-200 bg-white p-3 text-black sm:p-4">
      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 py-4 text-center !text-black transition hover:border-yellow-400 hover:bg-yellow-50/40">
        <UploadCloud size={22} className="!text-black" />
        <span className="mt-2 text-sm font-semibold !text-black">{title}</span>
        <span className="mt-1 text-xs !text-black">{description}</span>
        <span className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold !text-black">
          Choose files
        </span>
        <input
          type="file"
          multiple
          accept={accept}
          className="sr-only"
          onChange={(event) => {
            handleFileSelection(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
      </label>

      {fileError && (
        <p role="alert" className="mt-2 text-xs font-semibold text-red-600">
          {fileError}
        </p>
      )}

      {previews.length > 0 && (
        <ul className="mt-3 max-h-[28rem] space-y-3 overflow-y-auto">
          {previews.map(({ file, url }, index) => {
            const isImage = file.type.startsWith("image/");
            const isVideo = file.type.startsWith("video/");
            const isPdf =
              file.type === "application/pdf" ||
              file.name.toLowerCase().endsWith(".pdf");
            const isDocument = /\.(pdf|doc|docx)$/i.test(file.name);

            return (
              <li
                key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                className="landvault-evidence-card min-w-0 rounded-lg border border-slate-200 bg-white p-3 text-black"
              >
                <div className="flex min-w-0 items-start gap-3">
                  {isImage ? (
                    <img
                      src={url}
                      alt={file.name}
                      className="h-20 w-24 shrink-0 rounded-lg border border-slate-200 bg-slate-50 object-cover"
                    />
                  ) : isVideo ? (
                    <video
                      src={url}
                      controls
                      preload="metadata"
                      className="h-20 w-32 shrink-0 rounded-lg bg-black object-contain"
                    />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold !text-black">
                      {isPdf ? "PDF" : file.name.split(".").pop()?.toUpperCase() || "FILE"}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="break-all text-xs font-semibold !text-black">
                      {file.name}
                    </p>
                    <p className="mt-1 text-xs !text-black">
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </p>

                    {isPdf && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-semibold !text-black">
                          Preview PDF
                        </summary>
                        <iframe
                          src={url}
                          title={`Preview of ${file.name}`}
                          className="mt-2 h-72 w-full rounded-lg border border-slate-300 bg-white"
                        />
                      </details>
                    )}

                    {isDocument && !isPdf && (
                      <a
                        href={url}
                        download={file.name}
                        className="mt-2 inline-block text-xs font-semibold text-blue-700 underline"
                      >
                        Download Word document
                      </a>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    aria-label={`Remove ${file.name}`}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-yellow-400">
          <Icon size={19} />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Web3Panel() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-5 text-white shadow-xl">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(250,204,21,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(250,204,21,.12) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-yellow-400">
            <Network size={15} />
            LandVault Protocol
          </div>

          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
            SECURE SESSION
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-400">Digital identity</p>
            <p className="mt-1 font-medium">Property-bound</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Evidence model</p>
            <p className="mt-1 font-medium">Verifiable records</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Anchor state</p>
            <p className="mt-1 font-medium text-yellow-300">Pending</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandVaultWizard() {
  const { getToken } = useAuth();

  const [step, setStep] = useState(1);
  const [propertyName, setPropertyName] = useState("");
  const [propertyType, setPropertyType] = useState("LAND");
  const [listingPurpose, setListingPurpose] = useState("OWNERSHIP");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [locationStates, setLocationStates] = useState<LocationOption[]>([]);
  const [locationLgas, setLocationLgas] = useState<LocationOption[]>([]);
  const [locationCities, setLocationCities] = useState<LocationCity[]>([]);
  const [locationDistricts, setLocationDistricts] = useState<LocationDistrict[]>([]);
  const [selectedStateId, setSelectedStateId] = useState("");
  const [selectedLgaId, setSelectedLgaId] = useState("");
  const [selectedCityId, setSelectedCityId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [lgasLoading, setLgasLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [size, setSize] = useState("");
  const [sizeUnit, setSizeUnit] = useState("sqm");
  const [propertyValue, setPropertyValue] = useState("");
  const [ownershipType, setOwnershipType] = useState("INDIVIDUAL");
  const [titleReference, setTitleReference] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [uploadedEvidence, setUploadedEvidence] = useState<string[]>([]);
  const [surveyDocumentFiles, setSurveyDocumentFiles] = useState<File[]>([]);
  const [uploadedSurveyDocuments, setUploadedSurveyDocuments] = useState<string[]>([]);
  const [surveyExtractionResults, setSurveyExtractionResults] = useState<
    Array<{ fileName: string; extraction: SurveyExtractionSummary }>
  >([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [dueDiligence, setDueDiligence] = useState({
    dispute: false,
    encumbrance: false,
    title: false,
    location: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [vaultCode, setVaultCode] = useState("");
  const [landVaultStatus, setLandVaultStatus] = useState("");
  const [createdPropertyId, setCreatedPropertyId] = useState("");
  const [landVaultId, setLandVaultId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadNigeriaStates() {
      try {
        setLocationsLoading(true);
        setLocationError("");

        const countriesResponse =
          await apiFetch<LocationApiResponse<LocationCountry[]>>(
            "/api/v1/locations/countries",
            getToken,
          );

        const nigeria = countriesResponse.data.find(
          (country) => country.isoCode.toUpperCase() === "NG",
        );

        if (!nigeria) {
          throw new Error("Nigeria was not found in the locations database.");
        }

        if (!cancelled) {
          setSelectedCountryId(nigeria.id);
        }

        const statesResponse =
          await apiFetch<LocationApiResponse<LocationOption[]>>(
            `/api/v1/locations/states?countryId=${encodeURIComponent(nigeria.id)}`,
            getToken,
          );

        if (!cancelled) {
          setLocationStates(statesResponse.data);
        }
      } catch (error) {
        if (!cancelled) {
          setLocationError(
            error instanceof Error
              ? error.message
              : "Unable to load Nigerian states.",
          );
        }
      } finally {
        if (!cancelled) {
          setLocationsLoading(false);
        }
      }
    }

    void loadNigeriaStates();

    return () => {
      cancelled = true;
    };
  }, [getToken]);

  // Load LGAs for the selected state.
  useEffect(() => {
    if (!selectedStateId) {
      setLocationLgas([]);
      return;
    }

    let cancelled = false;

    async function loadStateLgas() {
      try {
        setLgasLoading(true);
        setLocationError("");

        const response =
          await apiFetch<LocationApiResponse<LocationOption[]>>(
            `/api/v1/locations/local-governments?stateId=${encodeURIComponent(selectedStateId)}`,
            getToken,
          );

        if (!cancelled) {
          setLocationLgas(response.data);
        }
      } catch (error) {
        if (!cancelled) {
          setLocationLgas([]);
          setLocationError(
            error instanceof Error
              ? error.message
              : "Unable to load local government areas.",
          );
        }
      } finally {
        if (!cancelled) {
          setLgasLoading(false);
        }
      }
    }

    void loadStateLgas();

    return () => {
      cancelled = true;
    };
  }, [selectedStateId, getToken]);

  // Load cities for the selected state.
  useEffect(() => {
    if (!selectedStateId) {
      setLocationCities([]);
      return;
    }

    let cancelled = false;

    async function loadStateCities() {
      try {
        setCitiesLoading(true);
        setLocationError("");

        const response =
          await apiFetch<LocationApiResponse<LocationCity[]>>(
            `/api/v1/locations/cities?stateId=${encodeURIComponent(selectedStateId)}`,
            getToken,
          );

        if (!cancelled) {
          setLocationCities(response.data);
        }
      } catch (error) {
        if (!cancelled) {
          setLocationCities([]);
          setLocationError(
            error instanceof Error
              ? error.message
              : "Unable to load cities.",
          );
        }
      } finally {
        if (!cancelled) {
          setCitiesLoading(false);
        }
      }
    }

    void loadStateCities();

    return () => {
      cancelled = true;
    };
  }, [selectedStateId, getToken]);

  // Load districts for the selected LGA. The API includes both
  // directly linked districts and legacy city-linked districts.
  useEffect(() => {
    if (!selectedLgaId) {
      setLocationDistricts([]);
      return;
    }

    let cancelled = false;

    async function loadLgaDistricts() {
      try {
        setDistrictsLoading(true);
        setLocationError("");

        const response =
          await apiFetch<LocationApiResponse<LocationDistrict[]>>(
            `/api/v1/locations/districts?localGovernmentId=${encodeURIComponent(selectedLgaId)}`,
            getToken,
          );

        if (!cancelled) {
          setLocationDistricts(response.data);
        }
      } catch (error) {
        if (!cancelled) {
          setLocationDistricts([]);
          setLocationError(
            error instanceof Error
              ? error.message
              : "Unable to load districts.",
          );
        }
      } finally {
        if (!cancelled) {
          setDistrictsLoading(false);
        }
      }
    }

    void loadLgaDistricts();

    return () => {
      cancelled = true;
    };
  }, [selectedLgaId, getToken]);

  const filteredLocationCities = useMemo(
    () =>
      selectedLgaId
        ? locationCities.filter(
            (city) =>
              !city.localGovernmentId ||
              city.localGovernmentId === selectedLgaId,
          )
        : locationCities,
    [locationCities, selectedLgaId],
  );

  const progress = useMemo(
    () => Math.round((step / STEPS.length) * 100),
    [step],
  );

  function next() {
    setStep((value) => Math.min(STEPS.length, value + 1));
  }

  function previous() {
    setStep((value) => Math.max(1, value - 1));
  }

  function handleSurveyFilesSelected(files: File[]) {
    const allowed = new Set(["application/pdf", "image/jpeg", "image/png"]);
    const existing = new Set(
      surveyDocumentFiles.map((file) =>
        [file.name, file.size, file.lastModified].join(":"),
      ),
    );
    const valid = files.filter(
      (file) =>
        allowed.has(file.type) &&
        file.size <= 100 * 1024 * 1024 &&
        !existing.has(
          [file.name, file.size, file.lastModified].join(":"),
        ),
    );

    if (valid.length !== files.length) {
      setSubmitError("Survey plans must be PDF, JPEG or PNG and no larger than 100 MB.");
    } else {
      setSubmitError("");
    }

    setSurveyDocumentFiles((current) => [...current, ...valid]);
  }

  async function submit() {
    if (submitting) return;

    setSubmitError("");

    const trimmedName = propertyName.trim();
    const numericValue = Number(propertyValue);
    const numericSize = Number(size);

    if (!trimmedName) {
      setSubmitError("Enter a property or land name before continuing.");
      setStep(1);
      return;
    }

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      setSubmitError(
        "Enter a valid property value greater than zero.",
      );
      setStep(2);
      return;
    }

    if (size && (!Number.isFinite(numericSize) || numericSize <= 0)) {
      setSubmitError("Enter a valid land size.");
      setStep(2);
      return;
    }

    const selectedCity = locationCities.find(
      (item) => item.id === selectedCityId,
    );

    if (
      !address.trim() ||
      !selectedCountryId ||
      !selectedStateId ||
      !selectedCityId ||
      !selectedCity
    ) {
      setSubmitError(
        "Enter the property address and select a state and city before continuing.",
      );
      setStep(2);
      return;
    }

    if (
      selectedCity.localGovernmentId &&
      selectedCity.localGovernmentId !== selectedLgaId
    ) {
      setSubmitError(
        "Select the Local Government Area associated with the chosen city.",
      );
      setStep(2);
      return;
    }

    if (selectedDistrictId && !selectedLgaId) {
      setSubmitError(
        "Select a Local Government Area before selecting a district.",
      );
      setStep(2);
      return;
    }

    setSubmitting(true);

    try {
      /*
       * LandVault deliberately reuses the existing Property model.
       *
       * This creates a DRAFT property first, then creates the LandVault
       * record against the returned property id.
       *
       * No blockchain transaction is fabricated here.
       */

      const token = await getToken();

      if (!token) {
        throw new Error(
          "Your authentication session has expired. Please sign in again.",
        );
      }

      let propertyId = createdPropertyId;
      if (!propertyId) {
        const propertyTypesResponse =
          await apiFetch<unknown>(
            "/api/v1/property-types",
            getToken,
          );

        const rawPropertyTypes = extractApiData<unknown>(
          propertyTypesResponse,
        );

        const propertyTypes = Array.isArray(rawPropertyTypes)
          ? rawPropertyTypes as PropertyTypeApiItem[]
          : Array.isArray(
                (rawPropertyTypes as { items?: unknown[] })?.items,
              )
            ? ((rawPropertyTypes as { items: unknown[] }).items as PropertyTypeApiItem[])
            : [];

        const propertyTypeId = findPropertyTypeId(
          propertyTypes,
          propertyType,
        );

        if (!propertyTypeId) {
          throw new Error(
            `No matching property type was found for "${propertyType}". Refresh the property type configuration and try again.`,
          );
        }

        const propertyPayload: Record<string, unknown> = {
          title: trimmedName,
          listingType: "SALE",
          price: numericValue,
          currency: "NGN",
          propertyTypeId,
        };

        if (description.trim()) {
          propertyPayload.description = description.trim();
        }

        if (
          size &&
          Number.isFinite(numericSize) &&
          numericSize > 0
        ) {
          propertyPayload.landSize = numericSize;
        }

        if (sizeUnit.trim()) {
          propertyPayload.measurementUnit = sizeUnit.trim();
        }

        if (titleReference.trim()) {
          propertyPayload.parcelNumber = titleReference.trim();
        }

        const propertyResponse =
          await apiFetch<{
            data: {
              id: string;
            };
          }>(
            "/api/v1/properties",
            getToken,
            {
              method: "POST",
              body: JSON.stringify(propertyPayload),
            },
          );

        propertyId = propertyResponse?.data?.id;

        if (!propertyId) {
          throw new Error(
            "The property was created but no property ID was returned by the server.",
          );
        }

        setCreatedPropertyId(propertyId);
      }

      // Persist the administrative location against the property.
      // This also runs when retrying with an already-created property ID.
      await apiFetch(
        `/api/v1/properties/${encodeURIComponent(propertyId)}/address`,
        getToken,
        {
          method: "PUT",
          body: JSON.stringify({
            countryId: selectedCountryId,
            stateId: selectedStateId,
            ...(selectedLgaId ? { localGovernmentId: selectedLgaId } : {}),
            cityId: selectedCityId,
            ...(selectedDistrictId ? { districtId: selectedDistrictId } : {}),
            addressLine1: address.trim(),
          }),
        },
      );

      setUploadingEvidence(true);
      try {
        const evidenceGroups = [
          { type: "IMAGE", files: imageFiles },
          { type: "VIDEO", files: videoFiles },
          { type: "DOCUMENT", files: documentFiles },
          { type: "FLOOR_PLAN", files: surveyDocumentFiles },
        ] as const;

        const completedUploads = new Set(uploadedEvidence);

        for (const group of evidenceGroups) {
          for (const file of group.files) {
            const fileKey = [
              group.type,
              file.name,
              file.size,
              file.lastModified,
            ].join(":");

            if (completedUploads.has(fileKey)) continue;

            if (file.size > 100 * 1024 * 1024) {
              throw new Error(`${file.name} exceeds the 100 MB upload limit.`);
            }

            const formData = new FormData();
            formData.append("type", group.type);
            formData.append("caption", file.name);
            formData.append("file", file);

            await apiFetch(
              `/api/v1/properties/${encodeURIComponent(propertyId)}/media`,
              getToken,
              {
                method: "POST",
                body: formData,
              },
            );

            completedUploads.add(fileKey);
            setUploadedEvidence(Array.from(completedUploads));

            if (group.type === "FLOOR_PLAN") {
              const surveyKey = [
                file.name,
                file.size,
                file.lastModified,
              ].join(":");
              setUploadedSurveyDocuments((current) =>
                current.includes(surveyKey) ? current : [...current, surveyKey],
              );
            }

            if (group.type === "FLOOR_PLAN") {
              const surveyKey = [
                file.name,
                file.size,
                file.lastModified,
              ].join(":");
              setUploadedSurveyDocuments((current) =>
                current.includes(surveyKey)
                  ? current
                  : [...current, surveyKey],
              );
            }
          }
        }
      } finally {
        setUploadingEvidence(false);
      }

      let createdLandVaultId = landVaultId;
      if (!createdLandVaultId) {
        const landVaultResponse =
          await apiFetch<LandVaultApiResponse>(
            "/api/v1/land-vaults",
            getToken,
            {
              method: "POST",
              body: JSON.stringify({
                propertyId,
              }),
            },
          );

        const landVaultData = extractApiData<{
          id?: string;
          vaultCode?: string;
          status?: string;
          propertyId?: string;
        }>(landVaultResponse);

        if (!landVaultData?.id) {
          throw new Error(
            "The property was created, but the LandVault record was not returned by the server.",
          );
        }

        createdLandVaultId = landVaultData.id;
        setLandVaultId(createdLandVaultId);
        setVaultCode(landVaultData.vaultCode ?? "");
        setLandVaultStatus(landVaultData.status ?? "DRAFT");
      }

      /*
       * PAYMENT IS A HARD GATE FOR LANDVAULT.
       *
       * The LandVault remains DRAFT until the payment initialization
       * endpoint moves it to PAYMENT_PENDING. Flutterwave then redirects
       * to the dedicated LandVault callback where the backend verifies
       * the payment and advances:
       *
       * PAYMENT_PENDING
       *   -> PAYMENT_CONFIRMED
       *   -> OWNER_COMPLETION_REQUIRED
       *
       * Do not mark the LandVault as submitted here.
       */
      const paymentResponse = await apiFetch<{
        success: boolean;
        data?: {
          paymentLink?: string;
          reference?: string;
          landVaultId?: string;
          status?: string;
        };
        message?: string;
      }>(
        "/api/v1/payments/land-vault/initialize",
        getToken,
        {
          method: "POST",
          body: JSON.stringify({
            landVaultId: createdLandVaultId,
          }),
        },
      );

      const paymentLink = paymentResponse?.data?.paymentLink;

      if (!paymentLink) {
        throw new Error(
          paymentResponse?.message ||
            "LandVault was created, but the verification payment could not be initialized.",
        );
      }

      /*
       * Do not show the old "Owner completion required" screen.
       * Payment must happen first.
       */
      window.location.assign(paymentLink);
      return;
    } catch (error) {
      console.error("LandVault initialization failed:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Unable to initialize LandVault. Please try again.";

      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-2xl">
        <div
          className="relative p-8 sm:p-12"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 0%, rgba(250,204,21,.18), transparent 45%)",
          }}
        >
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-yellow-400/30 bg-yellow-400/10 text-yellow-400">
              <BadgeCheck size={42} />
            </div>

            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-yellow-400">
              LandVault payment required
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Complete verification payment to continue.
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400">
              Your LandVault record has been created, but owner completion is
              locked until the verification and certification payment is
              successfully confirmed.
            </p>

            <div className="mx-auto mt-7 grid max-w-xl gap-3 text-left sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-white/5 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Vault code
                </p>
                <p className="mt-2 font-mono text-sm font-semibold text-yellow-400">
                  {vaultCode || "Pending"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-white/5 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Status
                </p>
                <p className="mt-2 text-sm font-semibold text-emerald-300">
                  {landVaultStatus || "DRAFT"}
                </p>
              </div>
            </div>

            {createdPropertyId && (
              <p className="mt-4 text-xs text-slate-500">
                Property record: <span className="font-mono">{createdPropertyId}</span>
              </p>
            )}

            <div className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-2">
              {[
                ["Vault status", landVaultStatus || "DRAFT"],
                ["Property identity", propertyName || "Pending"],
                ["Verification", "Payment required"],
                ["Blockchain anchor", "Pending"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-800 bg-white/[0.04] p-4"
                >
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 font-medium">{value}</p>
                </div>
              ))}
            </div>

            {landVaultId && (
              <button
                type="button"
                onClick={async () => {
                  if (submitting) return;

                  try {
                    setSubmitting(true);
                    setSubmitError("");

                    const response = await apiFetch<{
                      success: boolean;
                      data?: {
                        paymentLink?: string;
                      };
                      message?: string;
                    }>(
                      "/api/v1/payments/land-vault/initialize",
                      getToken,
                      {
                        method: "POST",
                        body: JSON.stringify({
                          landVaultId,
                        }),
                      },
                    );

                    const paymentLink = response?.data?.paymentLink;

                    if (!paymentLink) {
                      throw new Error(
                        response?.message ||
                          "Unable to initialize the LandVault payment.",
                      );
                    }

                    window.location.assign(paymentLink);
                  } catch (error) {
                    setSubmitError(
                      error instanceof Error
                        ? error.message
                        : "Unable to initialize the LandVault payment.",
                    );
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={submitting}
              >
                <WalletCards size={17} />
                {submitting ? "Preparing payment..." : "Pay verification fee"}
                <ArrowRight size={16} />
              </button>
            )}

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="ml-2 mt-8 inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Return to LandVault
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="landvault-wizard space-y-5 font-sans antialiased">
      <Web3Panel />

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-yellow-600">
                <Sparkles size={14} />
                Digital property vault
              </div>
              <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Create your LandVault
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Build a trusted digital identity for your property.
              </p>
            </div>

            <div className="hidden text-right sm:block">
              <p className="text-xs text-slate-400">Progress</p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {progress}%
              </p>
            </div>
          </div>

          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-yellow-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {STEPS.map((item) => {
              const active = item.id === step;
              const complete = item.id < step;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => item.id <= step && setStep(item.id)}
                  className={`group text-left ${
                    item.id <= step ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${
                        complete
                          ? "border-yellow-400 bg-yellow-400 text-slate-950"
                          : active
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      {complete ? <Check size={13} /> : item.id}
                    </div>
                    <span
                      className={`hidden text-xs font-medium lg:block ${
                        active ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      {item.short}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {submitError && (
          <div className="mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:mx-7">
            <p className="font-semibold">LandVault setup failed</p>
            <p className="mt-1 leading-6">{submitError}</p>
          </div>
        )}

        <div className="space-y-5 bg-[#f8f8f6] p-4 sm:p-7">
          {step === 1 && (
            <Section
              icon={Fingerprint}
              title="Property identity"
              description="Start the cryptographic identity of the property record."
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Property / Land name</label>
                  <input
                    className={inputClass}
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    placeholder="e.g. Sunrise Estate Plot 42"
                  />
                </div>

                <div>
                  <label className={labelClass}>Property class</label>
                  <select
                    className={inputClass}
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                  >
                    <option value="LAND">Land</option>
                    <option value="RESIDENTIAL">Residential</option>
                    <option value="COMMERCIAL">Commercial</option>
                    <option value="MIXED_USE">Mixed use</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Vault purpose</label>
                  <select
                    className={inputClass}
                    value={listingPurpose}
                    onChange={(e) => setListingPurpose(e.target.value)}
                  >
                    <option value="OWNERSHIP">Ownership verification</option>
                    <option value="SALE">Prepare for sale</option>
                    <option value="TRANSFER">Property transfer</option>
                    <option value="RECORD">Permanent property record</option>
                  </select>
                </div>
              </div>
            </Section>
          )}

          {step === 2 && (
            <Section
              icon={MapPin}
              title="Property details"
              description="Capture the physical identity that will be linked to the vault."
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Property address</label>
                  <input
                    className={inputClass}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Full property address"
                  />
                </div>

                <div>
                  <label className={labelClass}>State</label>
                  <select
                    className={inputClass}
                    value={selectedStateId}
                    disabled={locationsLoading}
                    onChange={(event) => {
                      const selected = locationStates.find(
                        (item) => item.id === event.target.value,
                      );

                      setSelectedStateId(event.target.value);
                      setSelectedLgaId("");
                      setSelectedCityId("");
                      setSelectedDistrictId("");
                      setLocationLgas([]);
                      setLocationCities([]);
                      setLocationDistricts([]);
                      setState(selected?.name ?? "");
                      setLga("");
                    }}
                  >
                    <option value="">
                      {locationsLoading ? "Loading states..." : "Select state"}
                    </option>
                    {locationStates.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Local Government Area (LGA)</label>
                  <select
                    className={inputClass}
                    value={selectedLgaId}
                    disabled={!selectedStateId || lgasLoading}
                    onChange={(event) => {
                      const selected = locationLgas.find(
                        (item) => item.id === event.target.value,
                      );

                      setSelectedLgaId(event.target.value);
                      setSelectedCityId("");
                      setSelectedDistrictId("");
                      setLocationDistricts([]);
                      setLga(selected?.name ?? "");
                    }}
                  >
                    <option value="">
                      {!selectedStateId
                        ? "Select a state first"
                        : lgasLoading
                          ? "Loading LGAs..."
                          : "Select LGA"}
                    </option>
                    {locationLgas.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>City</label>
                  <select
                    className={inputClass}
                    value={selectedCityId}
                    disabled={!selectedStateId || citiesLoading}
                    onChange={(event) => {
                      setSelectedCityId(event.target.value);
                      setSelectedDistrictId("");
                    }}
                  >
                    <option value="">
                      {!selectedStateId
                        ? "Select a state first"
                        : citiesLoading
                          ? "Loading cities..."
                          : "Select city"}
                    </option>
                    {filteredLocationCities.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>District</label>
                  <select
                    className={inputClass}
                    value={selectedDistrictId}
                    disabled={!selectedLgaId || districtsLoading}
                    onChange={(event) =>
                      setSelectedDistrictId(event.target.value)
                    }
                  >
                    <option value="">
                      {!selectedLgaId
                        ? "Select an LGA first"
                        : districtsLoading
                          ? "Loading districts..."
                          : "Select district (optional)"}
                    </option>
                    {locationDistricts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                {locationError && (
                  <p className="sm:col-span-2 text-sm text-red-600" role="alert">
                    {locationError}
                  </p>
                )}

                <div>
                  <label className={labelClass}>
                    Property value (NGN)
                  </label>
                  <input
                    className={inputClass}
                    type="number"
                    min="1"
                    step="1"
                    value={propertyValue}
                    onChange={(e) =>
                      setPropertyValue(e.target.value)
                    }
                    placeholder="e.g. 25000000"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Used to initialize the underlying property record.
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Property size</label>
                  <input
                    className={inputClass}
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="e.g. 650"
                  />
                </div>

                <div>
                  <label className={labelClass}>Unit</label>
                  <select
                    className={inputClass}
                    value={sizeUnit}
                    onChange={(e) => setSizeUnit(e.target.value)}
                  >
                    <option value="sqm">Square meters</option>
                    <option value="hectares">Hectares</option>
                    <option value="acres">Acres</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Property description</label>
                  <textarea
                    className={`${inputClass} min-h-28 resize-y`}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the property and anything important about its physical identity."
                  />
                </div>
              </div>
            </Section>
          )}

          {step === 3 && (
            <Section
              icon={ShieldCheck}
              title="Ownership"
              description="Establish who controls the property record."
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Ownership structure</label>
                  <select
                    className={inputClass}
                    value={ownershipType}
                    onChange={(e) => setOwnershipType(e.target.value)}
                  >
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="JOINT">Joint ownership</option>
                    <option value="COMPANY">Company</option>
                    <option value="TRUST">Trust</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Title / reference number</label>
                  <input
                    className={inputClass}
                    value={titleReference}
                    onChange={(e) => setTitleReference(e.target.value)}
                    placeholder="Optional title reference"
                  />
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex gap-3">
                  <LockKeyhole className="mt-0.5 shrink-0 text-yellow-700" size={18} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Your identity stays protected
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      LandVault creates a verifiable property record. Sensitive
                      personal information should not be placed on a public
                      blockchain.
                    </p>
                  </div>
                </div>
              </div>
            </Section>
          )}

          {step === 4 && (
            <Section
              icon={FileCheck2}
              title="Evidence vault"
              description="Upload photographs, videos and supporting ownership records separately."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <EvidenceFilePicker
                  title="Property images"
                  description="JPG, PNG, WebP or GIF"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  files={imageFiles}
                  onFilesChange={(files) =>
                    files.length > 0 && setImageFiles((current) => [...current, ...files])
                  }
                  onRemove={(index) =>
                    setImageFiles((current) => current.filter((_, i) => i !== index))
                  }
                />

                <EvidenceFilePicker
                  title="Property videos"
                  description="MP4, WebM or MOV"
                  accept="video/mp4,video/webm,video/quicktime"
                  files={videoFiles}
                  onFilesChange={(files) =>
                    files.length > 0 && setVideoFiles((current) => [...current, ...files])
                  }
                  onRemove={(index) =>
                    setVideoFiles((current) => current.filter((_, i) => i !== index))
                  }
                />

                <div className="md:col-span-2">
                  <EvidenceFilePicker
                    title="Ownership and survey documents"
                    description="PDF, DOC or DOCX"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    files={documentFiles}
                    onFilesChange={(files) =>
                      files.length > 0 && setDocumentFiles((current) => [...current, ...files])
                    }
                    onRemove={(index) =>
                      setDocumentFiles((current) => current.filter((_, i) => i !== index))
                    }
                  />
                </div>

                <div className="md:col-span-2">
                  <EvidenceFilePicker
                    title="Survey plan for extraction"
                    description="PDF, JPG or PNG"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    files={surveyDocumentFiles}
                    onFilesChange={handleSurveyFilesSelected}
                    onRemove={(index) => {
                      const file = surveyDocumentFiles[index];
                      if (!file) return;

                      const fileKey = [
                        file.name,
                        file.size,
                        file.lastModified,
                      ].join(":");

                      setSurveyDocumentFiles((current) =>
                        current.filter((_, i) => i !== index)
                      );
                      setUploadedSurveyDocuments((current) =>
                        current.filter((key) => key !== fileKey)
                      );
                      setSurveyExtractionResults((current) =>
                        current.filter((item) => item.fileName !== file.name)
                      );
                    }}
                  />
                </div>
              </div>

              <p className="mt-4 rounded-lg bg-yellow-50 p-3 text-xs leading-5 text-slate-600">
                Survey plans are saved as supporting property evidence for
                administrator and agent review. OCR extraction is deferred.
                Each file must be 100 MB or smaller.
              </p>

              {uploadedEvidence.length > 0 && (
                <p className="mt-2 text-xs font-medium text-emerald-700">
                  {uploadedEvidence.length} evidence file(s) uploaded successfully.
                </p>
              )}

              {uploadedSurveyDocuments.length > 0 && (
                <p className="mt-2 text-xs font-medium text-emerald-700">
                  {uploadedSurveyDocuments.length} survey plan(s) uploaded successfully.
                </p>
              )}

              {surveyExtractionResults.length > 0 && (
                <div className="mt-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Survey OCR extraction results
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Extracted values are preliminary and require surveyor or
                      administrator review. They are not certification.
                    </p>
                  </div>

                  {surveyExtractionResults.map(({ fileName, extraction }) => {
                    const points = extraction.coordinatePoints ?? [];
                    const hasMinimumPoints = points.length >= 3;

                    return (
                      <div
                        key={fileName}
                        className="rounded-xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="break-all text-sm font-semibold text-slate-900">
                            {fileName}
                          </p>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              extraction.status === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {extraction.status === "COMPLETED"
                              ? "OCR completed"
                              : "OCR failed"}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
                          <div>
                            <p className="text-slate-500">Coordinate points</p>
                            <p className="mt-1 font-semibold text-slate-900">
                              {points.length}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">OCR confidence</p>
                            <p className="mt-1 font-semibold text-slate-900">
                              {extraction.confidence == null
                                ? "Unavailable"
                                : `${extraction.confidence.toFixed(1)}%`}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Pages processed</p>
                            <p className="mt-1 font-semibold text-slate-900">
                              {extraction.pageCount ?? "Unknown"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Coordinate system</p>
                            <p className="mt-1 font-semibold text-slate-900">
                              {extraction.coordinateSystem ?? "Not identified"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Units</p>
                            <p className="mt-1 font-semibold text-slate-900">
                              {extraction.units ?? "Not identified"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Minimum point check</p>
                            <p
                              className={`mt-1 font-semibold ${
                                hasMinimumPoints
                                  ? "text-emerald-700"
                                  : "text-amber-700"
                              }`}
                            >
                              {hasMinimumPoints
                                ? "3-point minimum met"
                                : "Incomplete — at least 3 required"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Backend review status</p>
                            <p className={`mt-1 font-semibold ${
                              extraction.reviewStatus === "INCOMPLETE"
                                ? "text-amber-700"
                                : "text-slate-900"
                            }`}>
                              {extraction.reviewStatus}
                            </p>
                          </div>
                        </div>

                        {points.length > 0 && (
                          <div className="mt-5">
                            <SurveyParcelMap
                              points={points}
                              coordinateSystem={extraction.coordinateSystem ?? null}
                              units={extraction.units ?? null}
                            />
                          </div>
                        )}

                        {points.length > 0 && (
                          <div className="mt-4 overflow-x-auto">
                            <p className="mb-2 text-xs font-semibold text-slate-700">
                              Extracted beacon coordinates
                            </p>
                            <table className="w-full min-w-[650px] text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-500">
                                  <th className="px-2 py-2">Point</th>
                                  <th className="px-2 py-2">Beacon</th>
                                  <th className="px-2 py-2">Easting</th>
                                  <th className="px-2 py-2">Northing</th>
                                  <th className="px-2 py-2">Distance from previous</th>
                                  <th className="px-2 py-2">Grid bearing</th>
                                </tr>
                              </thead>
                              <tbody>
                                {points.map((point) => (
                                  <tr
                                    key={`${point.pointOrder}-${point.beaconId}`}
                                    className="border-b border-slate-100 text-slate-700"
                                  >
                                    <td className="px-2 py-2">{point.pointOrder}</td>
                                    <td className="px-2 py-2 font-medium">
                                      {point.beaconId}
                                    </td>
                                    <td className="px-2 py-2">
                                      {point.easting.toLocaleString()}
                                    </td>
                                    <td className="px-2 py-2">
                                      {point.northing.toLocaleString()}
                                    </td>
                                    <td className="px-2 py-2">
                                      {point.distanceFromPrevious == null
                                        ? "—"
                                        : `${point.distanceFromPrevious.toFixed(3)} m`}
                                    </td>
                                    <td className="px-2 py-2">
                                      {point.bearingFromPrevious == null
                                        ? "—"
                                        : `${point.bearingFromPrevious.toFixed(4)}°`}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                          Distances and grid bearings above, when available,
                          are calculated from consecutive extracted coordinates.
                          They are preliminary and are not a comparison with
                          the printed survey schedule. Printed-distance and
                          bearing comparison remains pending survey-format
                          validation. No mismatch is silently corrected.
                        </div>

                        {extraction.errorMessage && (
                          <p className="mt-3 text-xs text-red-700">
                            Extraction error: {extraction.errorMessage}
                          </p>
                        )}

                        {extraction.warnings?.length > 0 && (
                          <div className="mt-3 rounded-lg bg-slate-50 p-3">
                            <p className="text-xs font-semibold text-slate-700">
                              Extraction warnings
                            </p>
                            <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-slate-600">
                              {extraction.warnings.map((warning, index) => (
                                <li key={`${index}-${warning}`}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          )}

          {step === 5 && (
            <Section
              icon={Globe2}
              title="Due diligence"
              description="Declare the current verification state of the property."
            >
              <div className="space-y-3">
                {[
                  ["title", "I have valid title evidence for this property."],
                  ["location", "The stated location corresponds to the property."],
                  ["dispute", "I am not aware of an unresolved ownership dispute."],
                  ["encumbrance", "I am not aware of an undisclosed encumbrance."],
                ].map(([key, text]) => {
                  const checked =
                    dueDiligence[key as keyof typeof dueDiligence];

                  return (
                    <label
                      key={key}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setDueDiligence((current) => ({
                            ...current,
                            [key]: e.target.checked,
                          }))
                        }
                        className="mt-1 h-4 w-4 accent-yellow-400"
                      />
                      <span className="text-sm leading-6 text-slate-700">
                        {text}
                      </span>
                    </label>
                  );
                })}
              </div>
            </Section>
          )}

          {step === 6 && (
            <Section
              icon={Blocks}
              title="Review & secure"
              description="Review the identity before the LandVault enters verification."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ["Property", propertyName || "Not provided"],
                  ["Class", propertyType],
                  ["Location", address || "Not provided"],
                  ["Size", size ? `${size} ${sizeUnit}` : "Not provided"],
                  ["Ownership", ownershipType],
                  ["Evidence", `${imageFiles.length} image(s), ${videoFiles.length} video(s), ${documentFiles.length} document(s)`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-5 text-white">
                <div className="flex items-start gap-3">
                  <WalletCards className="mt-0.5 text-yellow-400" size={20} />
                  <div>
                    <p className="font-semibold">Ready for verification</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      Submitting creates the LandVault workflow. Blockchain
                      anchoring remains pending until the real backend
                      verification and anchor stages are completed.
                    </p>
                  </div>
                </div>
              </div>
            </Section>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <button
            type="button"
            onClick={previous}
            disabled={step === 1}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {step < STEPS.length ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Continue
              <ArrowRight size={16} />
            </button>
          ) : (
            <button disabled={submitting}
              type="button"
              onClick={submit}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-yellow-300"
            >
              <ShieldCheck size={17} />
              {submitting ? (uploadingEvidence ? "Uploading evidence…" : "Initializing LandVault…") : "Initialize LandVault"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
