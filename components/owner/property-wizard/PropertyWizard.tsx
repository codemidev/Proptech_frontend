"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Save,
  Building2,
  Box,
  Upload,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch, type GetToken } from "@/lib/api";

import { WizardProgress } from "./WizardProgress";
import { PropertyTypeStep } from "./PropertyTypeStep";
import { BasicInformationStep } from "./BasicInformationStep";
import { PropertyDetailsStep } from "./PropertyDetailsStep";
import { LandDetailsStep } from "./LandDetailsStep";
import { AmenitiesFeaturesStep } from "./AmenitiesFeaturesStep";
import { PropertyMediaStep } from "./PropertyMediaStep";
import { PropertyLocationStep } from "./PropertyLocationStep";
import { PropertyReviewStep } from "./PropertyReviewStep";

import type {
  Amenity,
  Feature,
  PropertyMedia,
  PropertyType,
  PropertyWizardData,
} from "./types";

import { initialPropertyWizardData } from "./types";
import BIMViewer from "../bim/BIMViewer";

type Props = {
  initialPropertyId?: string | null;
  initialOwnerId?: string | null;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};


type WizardBuilding = {
  id: string;
  estateId: string;
  name: string;
  floors?: number | null;
  estate?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    units?: number;
    properties?: number;
    bimModels?: number;
  };
};

type WizardEstate = {
  id: string;
  districtId: string;
  name: string;
  description?: string | null;
};

type WizardBIMVersion = {
  id: string;
  version: number;
  originalFileName: string;
  fileUrl?: string | null;
  fileSize?: number | string | null;
  mimeType?: string | null;
  processingStatus: string;
  processingError?: string | null;
  viewerAssetUrl?: string | null;
};

type WizardBIMModel = {
  id: string;
  buildingId: string;
  name: string;
  description?: string | null;
  discipline?: string | null;
  status?: string | null;
  currentVersionId?: string | null;
  currentVersion?: WizardBIMVersion | null;
  versions?: WizardBIMVersion[];
}

type WizardBIMModelWithKey = WizardBIMModel & {
  clientKey: string;
};

type WizardBIMResponse = {
  success?: boolean;
  data?: {
    building?: WizardBuilding;
    models?: WizardBIMModel[];
  } | WizardBIMModel[] | WizardBIMModel;
};

function normalizeBimModel(
  model: WizardBIMModel,
): WizardBIMModelWithKey | null {
  const id =
    typeof model?.id === "string"
      ? model.id.trim()
      : "";

  if (!id) {
    return null;
  }

  return {
    ...model,
    id,
    clientKey: id,
  };
}

function extractBimModels(
  response: WizardBIMResponse | null | undefined,
): WizardBIMModel[] {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (
    data &&
    typeof data === "object" &&
    "models" in data &&
    Array.isArray(data.models)
  ) {
    return data.models;
  }

  if (
    data &&
    typeof data === "object" &&
    "id" in data &&
    typeof data.id === "string"
  ) {
    return [data as WizardBIMModel];
  }

  return [];
}

function normalizeBimModels(
  response: WizardBIMResponse | null | undefined,
): WizardBIMModelWithKey[] {
  const normalized = extractBimModels(response)
    .map(normalizeBimModel)
    .filter(
      (model): model is WizardBIMModelWithKey =>
        model !== null,
    );

  const seen = new Set<string>();

  return normalized.filter((model) => {
    if (seen.has(model.clientKey)) {
      return false;
    }

    seen.add(model.clientKey);
    return true;
  });
}

function BuildingBIMStep({
  value,
  getToken,
  onChange,
}: {
  value: PropertyWizardData;
  getToken: () => Promise<string | null>;
  onChange: (patch: Partial<PropertyWizardData>) => void;
}) {
  const [buildings, setBuildings] = useState<WizardBuilding[]>([]);
  const [estates, setEstates] = useState<WizardEstate[]>([]);
  const [loadingEstates, setLoadingEstates] = useState(false);
  const [creatingEstate, setCreatingEstate] = useState(false);
  const [showCreateEstate, setShowCreateEstate] = useState(false);
  const [newEstateName, setNewEstateName] = useState("");
  const [newEstateDescription, setNewEstateDescription] = useState("");

  const [models, setModels] = useState<WizardBIMModelWithKey[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(true);
  const [loadingBim, setLoadingBim] = useState(false);
  const [error, setError] = useState("");

  const [bimName, setBimName] = useState("");
  const [bimDescription, setBimDescription] = useState("");
  const [bimDiscipline, setBimDiscipline] = useState("");
  const [bimFiles, setBimFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<
    { name: string; status: "pending" | "uploading" | "done" | "error"; message?: string }[]
  >([]);
  const [uploadingBim, setUploadingBim] = useState(false);

  const availableBuildings = value.estateId
    ? buildings.filter(
        (building) =>
          building.estateId === value.estateId,
      )
    : [];

  const selectedBuilding =
    value.buildingId && value.buildingName
      ? {
          id: value.buildingId,
          estateId: value.estateId,
          name: value.buildingName,
          floors: value.buildingFloors
            ? Number(value.buildingFloors)
            : null,
          estate: value.estateName
            ? {
                id: value.estateId,
                name: value.estateName,
              }
            : null,
        }
      : buildings.find(
          (building) => building.id === value.buildingId,
        );

  const loadEstates = useCallback(async () => {
    try {
      setLoadingEstates(true);
      setError("");

      /*
       * Estates belong to the organization, not to the currently
       * selected district.
       *
       * District is still stored on each Estate as its canonical
       * physical location, but it must never control Estate discovery.
       */
      const response = await apiFetch<ApiResponse<WizardEstate[]>>(
        "/api/v1/locations/estates",
        getToken,
      );

      const items = Array.isArray(response.data)
        ? response.data
        : [];

      setEstates(items);
    } catch (err) {
      setEstates([]);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load estates",
      );
    } finally {
      setLoadingEstates(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadEstates();
  }, [loadEstates]);

  const loadBuildings = useCallback(async () => {
    try {
      setLoadingBuildings(true);
      setError("");

      const response = await apiFetch<ApiResponse<WizardBuilding[]>>(
        "/api/v1/buildings",
        getToken,
      );

      setBuildings(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load buildings",
      );
    } finally {
      setLoadingBuildings(false);
    }
  }, [getToken]);

  const loadBim = useCallback(
    async (buildingId: string) => {
      if (!buildingId) {
        setModels([]);
        return;
      }

      try {
        setLoadingBim(true);
        setError("");

        const response = await apiFetch<WizardBIMResponse>(
          `/api/v1/buildings/${buildingId}/bim`,
          getToken,
        );

        const normalizedModels =
          normalizeBimModels(response);

        console.debug(
          "[BuildingBIMStep] BIM models:",
          normalizedModels.map((model) => ({
            id: model.id,
            clientKey: model.clientKey,
            name: model.name,
            currentVersionId: model.currentVersionId,
          })),
        );

        setModels(normalizedModels);
      } catch (err) {
        setModels([]);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load BIM models",
        );
      } finally {
        setLoadingBim(false);
      }
    },
    [getToken],
  );

  useEffect(() => {
    void loadBuildings();
  }, [loadBuildings]);

  useEffect(() => {
    void loadBim(value.buildingId);
  }, [value.buildingId, loadBim]);

  function handleEstateChange(estateId: string) {
    const estate = estates.find(
      (item) => item.id === estateId,
    );

    const estateChanged =
      value.estateId !== estateId;

    onChange({
      estateId,
      estateName: estate?.name ?? "",
      ...(estateChanged
        ? {
            buildingId: "",
            buildingName: "",
            buildingFloors: "",
          }
        : {}),
    });
  }

  function handleBuildingChange(
    buildingId: string,
  ) {
    const building = availableBuildings.find(
      (item) => item.id === buildingId,
    );

    onChange({
      buildingId,
      buildingName: building?.name ?? "",
      buildingFloors:
        building?.floors != null
          ? String(building.floors)
          : "",
    });
  }

  async function handleCreateEstate() {
    if (!value.districtId) {
      setError(
        "Select a district in Location before creating an estate.",
      );
      return;
    }

    const name = newEstateName.trim();

    if (name.length < 2) {
      setError(
        "Estate name must be at least 2 characters.",
      );
      return;
    }

    try {
      setCreatingEstate(true);
      setError("");

      const response = await apiFetch<ApiResponse<WizardEstate>>(
        "/api/v1/locations/estates",
        getToken,
        {
          method: "POST",
          body: JSON.stringify({
            districtId: value.districtId,
            name,
            ...(newEstateDescription.trim()
              ? {
                  description:
                    newEstateDescription.trim(),
                }
              : {}),
          }),
        },
      );

      const estate = response.data;

      if (!estate?.id) {
        throw new Error(
          "Estate was created without an ID.",
        );
      }

      setEstates((current) =>
        [...current.filter((item) => item.id !== estate.id), estate]
          .sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
      );

      onChange({
        estateId: estate.id,
        estateName: estate.name,
        buildingId: "",
        buildingName: "",
        buildingFloors: "",
      });

      setNewEstateName("");
      setNewEstateDescription("");
      setShowCreateEstate(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create estate",
      );
    } finally {
      setCreatingEstate(false);
    }
  }

  async function handleBimUpload() {
    if (!value.buildingId) {
      setError("Select a building before uploading a BIM model.");
      return;
    }

    if (bimFiles.length === 0) {
      setError("Select at least one IFC file first.");
      return;
    }

    function validateIfcSelection(file: File): string | null {
      const fileName = file.name.trim();

      if (!/\.ifc$/i.test(fileName)) {
        return "Only IFC files are supported.";
      }

      if (file.size <= 0) {
        return "The selected BIM file is empty.";
      }

      if (file.size > 250 * 1024 * 1024) {
        return "BIM files must be 250 MB or smaller.";
      }

      return null;
    }

    for (const file of bimFiles) {
      const validationError = validateIfcSelection(file);

      if (validationError) {
        setError(`${file.name}: ${validationError}`);
        return;
      }
    }

    try {
      setError("");
      setUploadingBim(true);

      let modelId = models[0]?.id;

      if (!modelId) {
        const firstFileName = bimFiles[0].name.trim();

        const modelResponse = await apiFetch<WizardBIMResponse>(
          `/api/v1/buildings/${value.buildingId}/bim`,
          getToken,
          {
            method: "POST",
            body: JSON.stringify({
              name: bimName || firstFileName.replace(/\.ifc$/i, ""),
              description: bimDescription || "Property BIM model",
              discipline: bimDiscipline || "ARCHITECTURAL",
            }),
          },
        );

        const createdModels = normalizeBimModels(modelResponse);
        modelId = createdModels[0]?.id || "";

        if (!modelId) {
          throw new Error("BIM model could not be created.");
        }
      }

      for (let i = 0; i < bimFiles.length; i++) {
        const file = bimFiles[i];
        const fileName = file.name.trim();

        setUploadProgress((prev) =>
          prev.map((p, idx) =>
            idx === i ? { ...p, status: "uploading" } : p,
          ),
        );

        try {
          const formData = new FormData();
          formData.append("file", file, fileName);

          await apiFetch(
            `/api/v1/buildings/${value.buildingId}/bim/${modelId}/versions`,
            getToken,
            {
              method: "POST",
              body: formData,
            },
          );

          setUploadProgress((prev) =>
            prev.map((p, idx) =>
              idx === i ? { ...p, status: "done" } : p,
            ),
          );
        } catch (uploadError) {
          const message =
            uploadError instanceof Error
              ? uploadError.message
              : "Upload failed";

          setUploadProgress((prev) =>
            prev.map((p, idx) =>
              idx === i ? { ...p, status: "error", message } : p,
            ),
          );

          const refreshResponse = await apiFetch<WizardBIMResponse>(
            `/api/v1/buildings/${value.buildingId}/bim`,
            getToken,
          );

          setModels(
            normalizeBimModels(refreshResponse),
          );

          throw new Error(`${fileName}: ${message}`);
        }
      }

      setBimFiles([]);

      const refreshResponse = await apiFetch<WizardBIMResponse>(
        `/api/v1/buildings/${value.buildingId}/bim`,
        getToken,
      );

      setModels(
        normalizeBimModels(refreshResponse),
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to upload BIM model",
      );
    } finally {
      setUploadingBim(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Building & BIM
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          This property is associated with its building. Upload the
          BIM model for that building below.
        </p>
      </div>

      {/* -------------------------------------------------------
          ESTATE
          Estate is mandatory for final property submission.
          It is persisted immediately when created.
         ------------------------------------------------------- */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-yellow-100 p-2">
            <Building2 size={20} />
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">
              Estate
            </h3>
            <p className="text-sm text-slate-500">
              Select the estate this property belongs to.
            </p>
          </div>

          {loadingEstates && (
            <Loader2
              size={17}
              className="ml-auto animate-spin"
            />
          )}
        </div>

        <>
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={value.estateId}
                onChange={(event) =>
                  handleEstateChange(event.target.value)
                }
                disabled={loadingEstates || creatingEstate}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 disabled:opacity-60"
              >
                <option value="">
                  Select estate
                </option>

                {estates.map((estate) => (
                  <option
                    key={estate.id}
                    value={estate.id}
                  >
                    {estate.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setShowCreateEstate(
                    (current) => !current,
                  );
                }}
                disabled={creatingEstate}
                className="shrink-0 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
              >
                + Create New Estate
              </button>
            </div>

            {estates.length === 0 &&
              !loadingEstates &&
              !showCreateEstate && (
                <p className="mt-3 text-sm text-slate-500">
                  No estates have been created for your organization yet.
                  Create one to continue.
                </p>
              )}

            {showCreateEstate && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Estate name
                    </label>

                    <input
                      type="text"
                      value={newEstateName}
                      onChange={(event) =>
                        setNewEstateName(
                          event.target.value,
                        )
                      }
                      placeholder="e.g. Aviritech Gardens"
                      disabled={creatingEstate}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Description
                    </label>

                    <textarea
                      value={newEstateDescription}
                      onChange={(event) =>
                        setNewEstateDescription(
                          event.target.value,
                        )
                      }
                      rows={3}
                      placeholder="Optional estate description"
                      disabled={creatingEstate}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 disabled:opacity-60"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateEstate(false);
                        setNewEstateName("");
                        setNewEstateDescription("");
                      }}
                      disabled={creatingEstate}
                      className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-60"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void handleCreateEstate();
                      }}
                      disabled={
                        creatingEstate ||
                        newEstateName.trim().length < 2
                      }
                      className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {creatingEstate ? (
                        <span className="flex items-center gap-2">
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                          Creating...
                        </span>
                      ) : (
                        "Create Estate"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {value.estateId && (
              <div className="mt-4 rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">
                  Selected estate
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {value.estateName || "Estate selected"}
                </p>
              </div>
            )}
          </>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-yellow-100 p-2">
            <Building2 size={20} />
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">
              Building
            </h3>
            <p className="text-sm text-slate-500">
              Building for this property
            </p>
          </div>
        </div>

        <select
          value={value.buildingId}
          onChange={(event) =>
            handleBuildingChange(
              event.target.value,
            )
          }
          disabled={!value.estateId || loadingBuildings}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 disabled:bg-slate-50 disabled:opacity-60"
        >
          <option value="">
            {value.estateId
              ? loadingBuildings
                ? "Loading buildings..."
                : "Select building (optional)"
              : "Select an estate first"}
          </option>

          {availableBuildings.map((building) => (
            <option
              key={building.id}
              value={building.id}
            >
              {building.name}
              {building.floors != null
                ? ` — ${building.floors} floor${
                    building.floors === 1 ? "" : "s"
                  }`
                : ""}
            </option>
          ))}
        </select>

        {value.estateId &&
          !loadingBuildings &&
          availableBuildings.length === 0 && (
            <p className="mt-2 text-xs text-slate-500">
              No buildings exist in this estate yet. A building can
              be created from the property location/building data.
            </p>
          )}

        {selectedBuilding && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Building</p>
              <p className="mt-1 text-sm font-semibold">
                {selectedBuilding.name}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Floors</p>
              <p className="mt-1 text-sm font-semibold">
                {selectedBuilding.floors ?? "—"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">BIM Models</p>
              <p className="mt-1 text-sm font-semibold">
                {selectedBuilding._count?.bimModels ?? models.length}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 p-2">
              <Box size={20} />
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                BIM Models
              </h3>
              <p className="text-sm text-slate-500">
                Models associated with this building.
              </p>
            </div>

            {loadingBim && (
              <Loader2
                size={17}
                className="animate-spin"
              />
            )}
          </div>

          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Model name
                  </label>
                  <input
                    type="text"
                    value={bimName}
                    onChange={(event) =>
                      setBimName(event.target.value)
                    }
                    placeholder="e.g. Architectural Model"
                    disabled={uploadingBim}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Discipline
                  </label>
                  <select
                    value={bimDiscipline}
                    onChange={(event) =>
                      setBimDiscipline(event.target.value)
                    }
                    disabled={uploadingBim}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 disabled:opacity-60"
                  >
                    <option value="">Select discipline</option>
                    <option value="ARCHITECTURAL">
                      Architectural
                    </option>
                    <option value="STRUCTURAL">
                      Structural
                    </option>
                    <option value="MEP">MEP</option>
                    <option value="CIVIL">Civil</option>
                    <option value="LANDSCAPE">
                      Landscape
                    </option>
                    <option value="FIRE">Fire</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Description
                  </label>
                  <textarea
                    value={bimDescription}
                    onChange={(event) =>
                      setBimDescription(event.target.value)
                    }
                    rows={3}
                    placeholder="Optional description"
                    disabled={uploadingBim}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 disabled:opacity-60"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    IFC file
                  </label>
                  <input
                    type="file"
                    accept=".ifc"
                    multiple
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      setBimFiles(files);
                      setUploadProgress(
                        files.map((f) => ({ name: f.name, status: "pending" as const })),
                      );
                    }}
                    disabled={uploadingBim}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium disabled:opacity-60"
                    />
                    <p className="mt-1.5 text-xs text-slate-500">
                      IFC files only. Maximum size: 250 MB each. Selecting multiple files
                      uploads them as new versions of this model, in order.
                    </p>
                </div>
              </div>

              {!value.buildingId && (
                <p className="mt-3 text-sm text-amber-700">
                  Select a building above to upload and associate a BIM model.
                </p>
              )}

                            {uploadProgress.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs">
                  {uploadProgress.map((p) => (
                    <li key={p.name} className="flex items-center justify-between">
                      <span className="truncate">{p.name}</span>
                      <span
                        className={
                          p.status === "done"
                            ? "text-green-600"
                            : p.status === "error"
                              ? "text-red-600"
                              : "text-slate-500"
                        }
                      >
                        {p.status === "uploading" ? "Uploading\u2026" : p.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleBimUpload()}
                  disabled={uploadingBim || !value.buildingId}
                  className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadingBim ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={17} />
                      Upload BIM Model
                    </>
                  )}
                </button>
              </div>
            </div>

          {!loadingBim && models.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
              <Box
                size={28}
                className="mx-auto mb-2 text-slate-400"
              />
              <p className="text-sm font-medium text-slate-700">
                No BIM models found
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Add an IFC model for this building.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {models.map((model) => (
                <div
                  key={model.clientKey}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {model.name}
                      </p>

                      {model.description && (
                        <p className="mt-1 text-sm text-slate-500">
                          {model.description}
                        </p>
                      )}
                    </div>

                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                      {model.status ?? "ACTIVE"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {model.discipline && (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                        {model.discipline}
                      </span>
                    )}

                    {model.versions?.length ? (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                        {model.versions.length} version
                        {model.versions.length === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>

                  {(() => {
                    const currentVersion =
                      model.currentVersion ??
                      model.versions?.find(
                        (version) =>
                          version.id === model.currentVersionId,
                      ) ??
                      model.versions?.[0];

                    if (!currentVersion?.fileUrl) {
                      return null;
                    }

                    return (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                        <BIMViewer
                          fileUrl={currentVersion.fileUrl}
                          modelName={model.name}
                          version={currentVersion.version}
                        />
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

type PropertyApiResponse = {
  id: string;
  buildingId?: string | null;
  title?: string | null;
  description?: string | null;
  listingType?: PropertyWizardData["listingType"];
  price?: number | string | null;
  serviceCharge?: number | string | null;
  cautionFee?: number | string | null;
  agencyFee?: number | string | null;
  legalFee?: number | string | null;
  currency?: PropertyWizardData["currency"];
  propertyTypeId?: string | null;
  propertyType?: {
    id?: string;
    name?: string | null;
    category?: string | null;
  } | null;

  bedrooms?: number | string | null;
  bathrooms?: number | string | null;
  toilets?: number | string | null;
  kitchens?: number | string | null;
  parkingSpaces?: number | string | null;
  floors?: number | string | null;
  yearBuilt?: number | string | null;
  landSize?: number | string | null;
  buildingSize?: number | string | null;
  measurementUnit?: string | null;
  parcelNumber?: string | null;

  parcel?: {
    parcelNumber?: string | null;
    area?: number | string | null;
    measurementUnit?: string | null;
  } | null;

  amenities?: Array<{
    amenityId: string;
  }>;

  features?: Array<{
    featureId: string;
  }>;

  address?: {
    countryId?: string | null;
    stateId?: string | null;
    localGovernmentId?: string | null;
    cityId?: string | null;
    districtId?: string | null;
    estateId?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    landmark?: string | null;
    postalCode?: string | null;
  } | null;

  coordinates?: Array<{
    latitude: number | string;
    longitude: number | string;
  }>;
};

type WizardStep = {
  id: number;
  title: string;
  description: string;
};

const steps: WizardStep[] = [
  {
    id: 1,
    title: "Property Type",
    description: "Choose the type of property",
  },
  {
    id: 2,
    title: "Basic Information",
    description: "Add the main listing information",
  },
  {
    id: 3,
    title: "Property Details",
    description: "Add property specifications",
  },
  {
    id: 4,
    title: "Amenities & Features",
    description: "Highlight available features",
  },
  {
    id: 5,
    title: "Media",
    description: "Upload property images",
  },
  {
    id: 6,
    title: "Location",
    description: "Set the property location",
  },
  {
    id: 7, title: "Building & BIM", description: "Associate a building and BIM model",
  },
    { id: 8, title: "Review", description: "Review and submit your listing" },
];

function optionalNumber(
  value: string,
): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : undefined;
}

function toStringValue(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
}

function buildCreatePayload(
  value: PropertyWizardData,
) {
  return {
    title: value.title.trim(),
    listingType: value.listingType,
    price: Number(value.price),
    currency: value.currency,
    propertyTypeId: value.propertyTypeId,

    ...(value.buildingId
      ? {
          buildingId: value.buildingId,
        }
      : {}),

    ...(optionalNumber(value.landSize) !== undefined
      ? {
          landSize: optionalNumber(value.landSize),
        }
      : {}),

    ...(value.measurementUnit
      ? {
          measurementUnit: value.measurementUnit,
        }
      : {}),

    ...(value.parcelNumber.trim()
      ? {
          parcelNumber: value.parcelNumber.trim(),
        }
      : {}),

    ...(value.description.trim()
      ? {
          description:
            value.description.trim(),
        }
      : {}),

    ...(optionalNumber(
      value.serviceCharge,
    ) !== undefined
      ? {
          serviceCharge: Number(
            value.serviceCharge,
          ),
        }
      : {}),

    ...(optionalNumber(
      value.cautionFee,
    ) !== undefined
      ? {
          cautionFee: Number(
            value.cautionFee,
          ),
        }
      : {}),

    ...(optionalNumber(
      value.agencyFee,
    ) !== undefined
      ? {
          agencyFee: Number(
            value.agencyFee,
          ),
        }
      : {}),

    ...(optionalNumber(
      value.legalFee,
    ) !== undefined
      ? {
          legalFee: Number(
            value.legalFee,
          ),
        }
      : {}),
  };
}

function buildUpdatePayload(
  value: PropertyWizardData,
) {
  return {
    title: value.title.trim(),
    listingType: value.listingType,
    price: Number(value.price),
    currency: value.currency,
    propertyTypeId: value.propertyTypeId,

    buildingId: value.buildingId || null,

    description:
      value.description.trim(),

    serviceCharge:
      optionalNumber(
        value.serviceCharge,
      ),

    cautionFee:
      optionalNumber(
        value.cautionFee,
      ),

    agencyFee:
      optionalNumber(
        value.agencyFee,
      ),

    legalFee:
      optionalNumber(
        value.legalFee,
      ),

    bedrooms:
      optionalNumber(
        value.bedrooms,
      ),

    bathrooms:
      optionalNumber(
        value.bathrooms,
      ),

    toilets:
      optionalNumber(
        value.toilets,
      ),

    kitchens:
      optionalNumber(
        value.kitchens,
      ),

    parkingSpaces:
      optionalNumber(
        value.parkingSpaces,
      ),

    floors:
      optionalNumber(
        value.floors,
      ),

    yearBuilt:
      optionalNumber(
        value.yearBuilt,
      ),

    landSize:
      optionalNumber(
        value.landSize,
      ),

    buildingSize:
      optionalNumber(
        value.buildingSize,
      ),

    measurementUnit:
      value.measurementUnit,

    ...(value.parcelNumber.trim()
      ? {
          parcelNumber: value.parcelNumber.trim(),
        }
      : {
          parcelNumber: "",
        }),
  };
}

function propertyToWizardData(
  property: PropertyApiResponse,
): PropertyWizardData {
  const firstCoordinate =
    property.coordinates?.[0];

  return {
    propertyId: property.id,
    buildingId: property.buildingId ?? "",
    buildingName: "",
    buildingFloors: "",

    propertyTypeId:
      property.propertyTypeId ?? "",

    propertyTypeName:
      property.propertyType?.name ?? "",

    propertyTypeCategory:
      property.propertyType?.category ?? "",

    title:
      property.title ?? "",

    description:
      property.description ?? "",

    listingType:
      property.listingType ?? "SALE",

    price:
      toStringValue(property.price),

    serviceCharge:
      toStringValue(
        property.serviceCharge,
      ),

    cautionFee:
      toStringValue(
        property.cautionFee,
      ),

    agencyFee:
      toStringValue(
        property.agencyFee,
      ),

    legalFee:
      toStringValue(
        property.legalFee,
      ),

    currency:
      property.currency ?? "NGN",

    bedrooms:
      toStringValue(
        property.bedrooms,
      ),

    bathrooms:
      toStringValue(
        property.bathrooms,
      ),

    toilets:
      toStringValue(
        property.toilets,
      ),

    kitchens:
      toStringValue(
        property.kitchens,
      ),

    parkingSpaces:
      toStringValue(
        property.parkingSpaces,
      ),

    floors:
      toStringValue(
        property.floors,
      ),

    yearBuilt:
      toStringValue(
        property.yearBuilt,
      ),

    landSize:
      toStringValue(
        property.landSize,
      ),

    buildingSize:
      toStringValue(
        property.buildingSize,
      ),

    measurementUnit:
      property.measurementUnit ??
      "sqm",

    parcelNumber:
      property.parcel?.parcelNumber ?? "",

    amenityIds:
      property.amenities?.map(
        (item) => item.amenityId,
      ) ?? [],

    featureIds:
      property.features?.map(
        (item) => item.featureId,
      ) ?? [],

    countryId:
      property.address?.countryId ?? "",
    countryName: "",

    stateId:
      property.address?.stateId ?? "",
    stateName: "",

    localGovernmentId:
      property.address
        ?.localGovernmentId ?? "",
    localGovernmentName: "",

    cityId:
      property.address?.cityId ?? "",
    cityName: "",

    districtId:
      property.address?.districtId ?? "",
    districtName: "",

    estateId:
      property.address?.estateId ?? "",
    estateName: "",

    addressLine1:
      property.address?.addressLine1 ??
      "",

    addressLine2:
      property.address?.addressLine2 ??
      "",

    landmark:
      property.address?.landmark ?? "",

    postalCode:
      property.address?.postalCode ??
      "",

    latitude:
      firstCoordinate
        ? Number(firstCoordinate.latitude)
        : null,

    longitude:
      firstCoordinate
        ? Number(firstCoordinate.longitude)
        : null,
  };
}

export function PropertyWizard({
  initialPropertyId = null,
}: Props) {
  const { getToken } = useAuth();

  /**
   * Existing properties are edited in-place.
   *
   * IMPORTANT:
   * Edit mode must never enter the property-submission payment flow.
   * Payment is only part of creating/submitting a new SALE listing.
   */
  const isEditMode = Boolean(initialPropertyId);

  const effectiveGetToken =
    getToken as GetToken;

  const [currentStep, setCurrentStep] =
    useState(1);

  const [data, setData] =
    useState<PropertyWizardData>(
      initialPropertyWizardData,
    );

  const [propertyTypes, setPropertyTypes] =
    useState<PropertyType[]>([]);

  const [amenities, setAmenities] =
    useState<Amenity[]>([]);

  const [features, setFeatures] =
    useState<Feature[]>([]);

  const [media, setMedia] =
    useState<PropertyMedia[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [savedMessage, setSavedMessage] =
    useState("");

  const [requestAeroInspection, setRequestAeroInspection] =
    useState(false);

  const [aeroInspectionFee, setAeroInspectionFee] =
    useState<{ fee: number; currency: string } | null>(null);

  const [aeroInspectionFeeError, setAeroInspectionFeeError] =
    useState("");

  useEffect(() => {
    if (isEditMode) return;

    let cancelled = false;

    apiFetch<ApiResponse<{ fee: number; currency: string }>>(
      "/api/v1/payments/property-submission/aero-fee",
      effectiveGetToken,
    )
      .then((response) => {
        if (cancelled) return;
        setAeroInspectionFee(response.data);
        setAeroInspectionFeeError("");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setAeroInspectionFee(null);
        setAeroInspectionFeeError(
          error instanceof Error
            ? error.message
            : "Unable to retrieve Aero inspection pricing.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveGetToken, isEditMode]);

  const updateData = useCallback(
    (
      patch: Partial<PropertyWizardData>,
    ) => {
      setData((current) => ({
        ...current,
        ...patch,
      }));

      setError("");
      setSavedMessage("");
    },
    [],
  );

  const loadMetadata = useCallback(
    async () => {
      const [
        propertyTypesResponse,
        amenitiesResponse,
        featuresResponse,
      ] = await Promise.all([
        apiFetch<
          ApiResponse<PropertyType[]>
        >(
          "/api/v1/property-types",
          effectiveGetToken,
        ),

        apiFetch<
          ApiResponse<Amenity[]>
        >(
          "/api/v1/properties/metadata/amenities",
          effectiveGetToken,
        ),

        apiFetch<
          ApiResponse<Feature[]>
        >(
          "/api/v1/properties/metadata/features",
          effectiveGetToken,
        ),
      ]);

      setPropertyTypes(
        propertyTypesResponse.data,
      );

      setAmenities(
        amenitiesResponse.data,
      );

      setFeatures(
        featuresResponse.data,
      );
    },
    [effectiveGetToken],
  );

  const loadProperty =
    useCallback(
      async (propertyId: string) => {
        const response =
          await apiFetch<
            ApiResponse<PropertyApiResponse>
          >(
            `/api/v1/properties/${propertyId}`,
            effectiveGetToken,
          );

        setData(
          propertyToWizardData(
            response.data,
          ),
        );

        if (
          response.data.id
        ) {
          const mediaResponse =
            await apiFetch<
              ApiResponse<PropertyMedia[]>
            >(
              `/api/v1/properties/${response.data.id}/media`,
              effectiveGetToken,
            ).catch(() => null);

          if (mediaResponse?.data) {
            setMedia(
              mediaResponse.data,
            );
          }
        }
      },
      [effectiveGetToken],
    );

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        setLoading(true);
        setError("");

        await loadMetadata();

        if (
          initialPropertyId &&
          !cancelled
        ) {
          await loadProperty(
            initialPropertyId,
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load property wizard",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [
    initialPropertyId,
    loadMetadata,
    loadProperty,
  ]);

  /**
   * Creates the actual database draft.
   *
   * IMPORTANT:
   * This must only be called after Step 2 validation,
   * because the backend requires title + price + listingType
   * in addition to propertyTypeId.
   */
  async function createDraftIfNeeded(
    value: PropertyWizardData,
  ) {
    if (value.propertyId) {
      return value.propertyId;
    }

    const response =
      await apiFetch<
        ApiResponse<PropertyApiResponse>
      >(
        "/api/v1/properties",
        effectiveGetToken,
        {
          method: "POST",
          body: JSON.stringify(
            buildCreatePayload(value),
          ),
        },
      );

    const propertyId =
      response.data.id;

    if (!propertyId) {
      throw new Error(
        "Property draft was created without an ID.",
      );
    }

    setData((current) => ({
      ...current,
      propertyId,
    }));

    return propertyId;
  }

  async function saveCurrentStep(
    step: number,
    latestData: PropertyWizardData = data,
  ) {
    setSaving(true);
    setError("");
    setSavedMessage("");

    try {
      /**
       * STEP 1:
       *
       * Do not create a database property yet.
       * Property type selection is kept in local wizard state.
       */
      if (step === 1) {
        return;
      }

      /**
       * STEP 2+:
       *
       * At this point title, price, listing type and
       * property type have been validated, so it is safe
       * to create the DRAFT.
       */
      const propertyId =
        await createDraftIfNeeded(
          latestData,
        );

      /**
       * STEP 2+ property fields.
       */
      if (step >= 2) {
        await apiFetch(
          `/api/v1/properties/${propertyId}`,
          effectiveGetToken,
          {
            method: "PATCH",
            body: JSON.stringify(
              buildUpdatePayload(
                latestData,
              ),
            ),
          },
        );
      }

      /**
       * STEP 4:
       * Persist amenities and features.
       */
      if (step === 4) {
        await Promise.all([
          apiFetch(
            `/api/v1/properties/${propertyId}/amenities`,
            effectiveGetToken,
            {
              method: "PUT",
              body: JSON.stringify({
                amenityIds:
                  latestData.amenityIds,
              }),
            },
          ),

          apiFetch(
            `/api/v1/properties/${propertyId}/features`,
            effectiveGetToken,
            {
              method: "PUT",
              body: JSON.stringify({
                featureIds:
                  latestData.featureIds,
              }),
            },
          ),
        ]);
      }

      /**
       * STEP 6:
       * Persist address, coordinates and the building for this property.
       */
      if (step === 6) {
        let stepData = latestData;

        if (
          stepData.buildingName.trim() &&
          !stepData.estateId
        ) {
          throw new Error(
            "Select an estate before creating the building.",
          );
        }

        /*
         * Create the building once for this property.
         *
         * The building belongs to the selected estate and its ID is then
         * attached to the property. We intentionally do not create another
         * building if the wizard already has a buildingId.
         */
        if (
          !stepData.buildingId &&
          stepData.buildingName.trim()
        ) {
          if (!stepData.estateId) {
            throw new Error(
              "Select an estate before creating the building.",
            );
          }

          const buildingResponse =
            await apiFetch<
              ApiResponse<{
                id: string;
                name: string;
                floors?: number | null;
              }>
            >(
              "/api/v1/buildings",
              effectiveGetToken,
              {
                method: "POST",
                body: JSON.stringify({
                  estateId: stepData.estateId,
                  name: stepData.buildingName.trim(),
                  floors:
                    stepData.buildingFloors.trim()
                      ? Number(stepData.buildingFloors)
                      : null,
                }),
              },
            );

          const building = buildingResponse.data;

          if (!building?.id) {
            throw new Error(
              "Building was created without an ID.",
            );
          }

          stepData = {
            ...stepData,
            buildingId: building.id,
            buildingName: building.name,
            buildingFloors:
              building.floors != null
                ? String(building.floors)
                : stepData.buildingFloors,
          };

          setData((current) => ({
            ...current,
            buildingId: building.id,
            buildingName: building.name,
            buildingFloors:
              building.floors != null
                ? String(building.floors)
                : current.buildingFloors,
          }));

          /*
           * Attach the newly-created building to the property.
           */
          await apiFetch(
            `/api/v1/properties/${propertyId}`,
            effectiveGetToken,
            {
              method: "PATCH",
              body: JSON.stringify({
                buildingId: building.id,
              }),
            },
          );
        }

        await apiFetch(
          `/api/v1/properties/${propertyId}/address`,
          effectiveGetToken,
          {
            method: "PUT",
            body: JSON.stringify({
              countryId:
                latestData.countryId,

              stateId:
                latestData.stateId,

              ...(latestData.localGovernmentId
                ? {
                    localGovernmentId:
                      latestData.localGovernmentId,
                  }
                : {}),

              cityId:
                latestData.cityId,

              ...(latestData.districtId
                ? {
                    districtId:
                      latestData.districtId,
                  }
                : {}),

              ...(latestData.estateId
                ? {
                    estateId:
                      latestData.estateId,
                  }
                : {}),

              addressLine1:
                latestData.addressLine1,

              ...(latestData.addressLine2
                ? {
                    addressLine2:
                      latestData.addressLine2,
                  }
                : {}),

              ...(latestData.landmark
                ? {
                    landmark:
                      latestData.landmark,
                  }
                : {}),

              ...(latestData.postalCode
                ? {
                    postalCode:
                      latestData.postalCode,
                  }
                : {}),
            }),
          },
        );

        if (
          latestData.latitude !== null &&
          latestData.longitude !== null
        ) {
          await apiFetch(
            `/api/v1/properties/${propertyId}/coordinates`,
            effectiveGetToken,
            {
              method: "PUT",
              body: JSON.stringify({
                coordinates: [
                  {
                    latitude:
                      latestData.latitude,

                    longitude:
                      latestData.longitude,
                  },
                ],
              }),
            },
          );
        }
      }

      /**
       * STEP 7:
       * Re-persist the complete address before final submission.
       */
      if (step === 7) {
        if (!latestData.districtId) {
          throw new Error(
            "A district is required before submitting the property.",
          );
        }

        if (!latestData.estateId) {
          throw new Error(
            "An estate is required before submitting the property.",
          );
        }

        await apiFetch(
          `/api/v1/properties/${propertyId}/address`,
          effectiveGetToken,
          {
            method: "PUT",
            body: JSON.stringify({
              countryId: latestData.countryId,
              stateId: latestData.stateId,

              ...(latestData.localGovernmentId
                ? {
                    localGovernmentId:
                      latestData.localGovernmentId,
                  }
                : {}),

              cityId: latestData.cityId,

              ...(latestData.districtId
                ? { districtId: latestData.districtId }
                : {}),
              ...(latestData.estateId
                ? { estateId: latestData.estateId }
                : {}),

              addressLine1:
                latestData.addressLine1,

              ...(latestData.addressLine2
                ? {
                    addressLine2:
                      latestData.addressLine2,
                  }
                : {}),

              ...(latestData.landmark
                ? {
                    landmark:
                      latestData.landmark,
                  }
                : {}),

              ...(latestData.postalCode
                ? {
                    postalCode:
                      latestData.postalCode,
                  }
                : {}),
            }),
          },
        );

        /*
         * If a building was selected in Step 7, make sure the
         * property points at that building. The backend submission
         * service independently verifies that the building belongs
         * to the selected Estate.
         */
        if (latestData.buildingId) {
          await apiFetch(
            `/api/v1/properties/${propertyId}`,
            effectiveGetToken,
            {
              method: "PATCH",
              body: JSON.stringify({
                buildingId:
                  latestData.buildingId,
              }),
            },
          );
        }
      }

      return propertyId;
    } catch (err) {
      /*
       * Keep the exact failure visible in the browser console.
       *
       * The wizard performs several API calls in one step, so the UI
       * error message alone does not tell us which step failed.
       */
      console.error("[PropertyWizard] saveCurrentStep FAILED", {
        step,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });

      const message =
        err instanceof Error
          ? err.message
          : "Unable to save this step";

      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }

  function validateStep(
    step: number,
    value: PropertyWizardData = data,
  ) {
    if (step === 1) {
      if (!value.propertyTypeId) {
        setError(
          "Please select a property type.",
        );

        return false;
      }
    }

    if (step === 2) {
      if (
        value.title.trim().length < 3
      ) {
        setError(
          "Property title must be at least 3 characters.",
        );

        return false;
      }

      if (
        !value.price ||
        !Number.isFinite(
          Number(value.price),
        ) ||
        Number(value.price) <= 0
      ) {
        setError(
          "Please enter a valid property price.",
        );

        return false;
      }

      if (!value.listingType) {
        setError(
          "Please select a listing type.",
        );

        return false;
      }

      if (!value.propertyTypeId) {
        setError(
          "Please select a property type.",
        );

        return false;
      }
    }

    if (step === 6) {
      if (!value.countryId) {
        setError(
          "Please select a country.",
        );

        return false;
      }

      if (!value.stateId) {
        setError(
          "Please select a state.",
        );

        return false;
      }

      if (!value.cityId) {
        setError(
          "Please select a city.",
        );

        return false;
      }

      if (
        !value.addressLine1.trim()
      ) {
        setError(
          "Please enter the property address.",
        );

        return false;
      }
    }


    if (step === 7) {
      if (!value.districtId) {
        setError("Please select a district before submitting the property.");
        return false;
      }

      if (!value.estateId) {
        setError("Please select or create an estate before submitting the property.");
        return false;
      }
    }

    return true;
  }

  async function handleNext() {
    setError("");
    setSavedMessage("");

    /**
     * Capture the current state synchronously.
     *
     * This is important because React state updates are
     * asynchronous and we don't want Step 2 creation to
     * accidentally use stale values.
     */
    const latestData = data;

    if (
      !validateStep(
        currentStep,
        latestData,
      )
    ) {
      return;
    }

    try {
      await saveCurrentStep(
        currentStep,
        latestData,
      );

      if (
        currentStep < steps.length
      ) {
        setCurrentStep(
          (step) => step + 1,
        );
      }
    } catch {
      // saveCurrentStep already populated the error.
    }
  }

  function handleBack() {
    if (currentStep <= 1) {
      return;
    }

    setError("");
    setSavedMessage("");

    setCurrentStep(
      (step) => step - 1,
    );
  }

  async function handleSaveDraft() {
    setError("");
    setSavedMessage("");

    /**
     * Step 1 does not have enough information to create
     * a valid backend property yet.
     */
    if (currentStep === 1) {
      setSavedMessage(
        "Property type saved. Complete the basic information to create the draft.",
      );

      return;
    }

    try {
      await saveCurrentStep(
        currentStep,
        data,
      );

      setSavedMessage(
        "Draft saved successfully.",
      );
    } catch {
      // Error already displayed.
    }
  }

  async function handleSubmit() {
    try {
      setError("");
      setSavedMessage("");

      if (!data.propertyId) {
        throw new Error(
          "Property draft has not been created yet. Please complete the basic information first.",
        );
      }

      setSubmitting(true);

      /**
       * Persist the final wizard state before submission.
       */
      console.log("[PropertyWizard] SUBMIT: saving final property state");

      await saveCurrentStep(
        7,
        data,
      );

      console.log("[PropertyWizard] SUBMIT: final property state saved");

      /**
       * EDIT MODE:
       *
       * Existing properties are updated in-place. They must NEVER
       * initialize property-submission payment and must NEVER redirect
       * the owner to a payment page.
       */
      if (isEditMode) {
        console.log(
          "[PropertyWizard] EDIT: changes saved without payment",
          {
            propertyId: data.propertyId,
            listingType: data.listingType,
          },
        );

        setSavedMessage(
          "Property changes saved successfully.",
        );

        window.location.href =
          "/dashboard/owner/properties";

        return;
      }

      /**
       * NEW PROPERTY MODE:
       *
       * Preserve the existing SALE payment flow. Payment is required
       * only when creating/submitting a new SALE property.
       */
      if (!isEditMode && data.listingType === "SALE") {
        console.log(
          "[PropertyWizard] SUBMIT: initializing SALE payment",
          { propertyId: data.propertyId },
        );

        console.log(
          "[PropertyWizard] PAYMENT: about to initialize",
          {
            propertyId: data.propertyId,
            listingType: data.listingType,
          },
        );

        let paymentResponse: {
          success: boolean;
          data: {
            paymentLink: string;
            reference: string;
          };
        };

        try {
          paymentResponse = await apiFetch<{
            success: boolean;
            data: {
              paymentLink: string;
              reference: string;
            };
          }>(
            "/api/v1/payments/property-submission/initialize",
            effectiveGetToken,
            {
              method: "POST",
              body: JSON.stringify({
                propertyId: data.propertyId,
                requestAeroInspection,
              }),
            },
          );
        } catch (paymentError) {
          console.error(
            "[PropertyWizard] PAYMENT: initialization FAILED",
            paymentError,
          );
          throw paymentError;
        }

        console.log(
          "[PropertyWizard] PAYMENT: initialization returned",
          {
            hasPaymentLink: Boolean(
              paymentResponse.data?.paymentLink,
            ),
            hasReference: Boolean(
              paymentResponse.data?.reference,
            ),
          },
        );

        if (!paymentResponse.data?.paymentLink) {
          throw new Error("Unable to initialize the property payment.");
        }

        window.location.href = paymentResponse.data.paymentLink;
        return;
      }

      await apiFetch(
        `/api/v1/properties/${data.propertyId}/submit`,
        effectiveGetToken,
        {
          method: "POST",
        },
      );

      setSavedMessage(
        "Property submitted successfully.",
      );

      window.location.href =
        "/dashboard/owner";
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit property",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const mediaChanged = useCallback(async () => {
    if (!data.propertyId) {
      setMedia([]);
      return;
    }

    try {
      const response = await apiFetch<ApiResponse<PropertyMedia[]>>(
        `/api/v1/properties/${data.propertyId}/media`,
        effectiveGetToken,
      );

      setMedia(Array.isArray(response.data) ? response.data : []);
    } catch {
      setMedia([]);
    }
  }, [data.propertyId, effectiveGetToken]);

  const stepContent = useMemo(() => {
    switch (currentStep) {
      case 1:
        return (
          <PropertyTypeStep
            value={data}
            propertyTypes={
              propertyTypes
            }
            onChange={updateData}
          />
        );

      case 2:
        return (
          <BasicInformationStep
            value={data}
            onChange={updateData}
          />
        );

      case 3:
        return (
          <PropertyDetailsStep
            value={data}
            onChange={updateData}
          />
        );

      case 4:
        return (
          <AmenitiesFeaturesStep
            value={data}
            amenities={amenities}
            features={features}
            onChange={updateData}
          />
        );

      case 5:
        return (
          <PropertyMediaStep
            value={data}
            media={media}
            getToken={
              effectiveGetToken
            }
            onMediaChange={
              mediaChanged
            }
          />
        );

      case 6:
        return (
          <PropertyLocationStep
            value={data}
            getToken={
              effectiveGetToken
            }
            onChange={updateData}
          />
        );
        case 7:
          return (
            <BuildingBIMStep
              value={data}
              getToken={effectiveGetToken}
              onChange={updateData}
            />
          );

        case 8:
          return (
            <PropertyReviewStep
              value={data}
              media={media}
              amenities={amenities}
              features={features}
              showAeroOption={!isEditMode}
              requestAeroInspection={requestAeroInspection}
              aeroInspectionFee={aeroInspectionFee}
              aeroInspectionFeeError={aeroInspectionFeeError}
              onRequestAeroInspectionChange={setRequestAeroInspection}
              onEditStep={(step) => {
              setError("");
              setSavedMessage("");
              setCurrentStep(step);
            }}
          />
        );

      default:
        return null;
    }
  }, [
    currentStep,
    data,
    propertyTypes,
    amenities,
    features,
    media,
    effectiveGetToken,
    updateData,
    mediaChanged,
  ]);

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2
            size={18}
            className="animate-spin"
          />
          Loading property wizard...
        </div>
      </div>
    );
  }

  return (
    <div>
      <WizardProgress
        steps={steps}
        currentStep={currentStep}
      />

      {error && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {savedMessage && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 size={17} />
          {savedMessage}
        </div>
      )}

      {stepContent}

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={
            currentStep === 1 ||
            saving ||
            submitting
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft size={17} />
          Back
        </button>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={
              handleSaveDraft
            }
            disabled={
              saving ||
              submitting
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {saving ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <Save size={17} />
            )}

            {saving
              ? "Saving..."
              : "Save draft"}
          </button>

          {currentStep <
          steps.length ? (
            <button
              type="button"
              onClick={
                handleNext
              }
              disabled={
                saving ||
                submitting
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-yellow-300 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  Saving...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight
                    size={17}
                  />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={
                handleSubmit
              }
              disabled={
                saving ||
                submitting
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-yellow-300 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  {isEditMode
                    ? "Saving Changes..."
                    : "Submitting..."}
                </>
              ) : (
                <>
                  {isEditMode
                    ? "Save Changes"
                    : "Submit Property"}
                  <CheckCircle2
                    size={17}
                  />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
