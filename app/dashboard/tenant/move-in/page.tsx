"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Truck, MapPin } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TopAppBar } from "@/components/shell/TopAppBar";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";

type LeaseOption = {
  id: string;
  property: { title: string };
};

type MoveIn = {
  id: string;
  handoverStatus: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  keyCollectionMethod: "DELIVERY" | "PHYSICAL_PICKUP" | null;
  preferredDeliveryLocation: string | null;
  electricityMeterNumber: string | null;
  electricityMeterReading: string | null;
  waterMeterNumber: string | null;
  waterMeterReading: string | null;
  lease: {
    id: string;
    property: { id: string; title: string };
  };
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

const statusTone: Record<
  MoveIn["handoverStatus"],
  "success" | "pending" | "danger"
> = {
  PENDING: "pending",
  IN_PROGRESS: "pending",
  COMPLETED: "success",
};

export default function MoveInPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();

  const [moveIn, setMoveIn] = useState<MoveIn | null>(null);
  const [leaseOptions, setLeaseOptions] = useState<LeaseOption[]>([]);
  const [selectedLeaseId, setSelectedLeaseId] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<
    "DELIVERY" | "PHYSICAL_PICKUP" | null
  >(null);
  const [preferredDeliveryLocation, setPreferredDeliveryLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const response = await apiFetch<ApiResponse<LeaseOption[] | null>>(
          "/api/v1/leases/me/confirmed",
          getToken,
        );

        const options = response.data ?? [];
        if (cancelled) return;

        setLeaseOptions(options);

        const requestedLeaseId = new URLSearchParams(
          window.location.search,
        ).get("leaseId");

        const chosenLeaseId =
          requestedLeaseId &&
          options.some((lease) => lease.id === requestedLeaseId)
            ? requestedLeaseId
            : options[0]?.id;

        if (!chosenLeaseId) {
          setError("No confirmed tenancy is available for move-in.");
          return;
        }

        const result = await apiFetch<ApiResponse<MoveIn | null>>(
          `/api/v1/move-in/me?leaseId=${encodeURIComponent(chosenLeaseId)}`,
          getToken,
        );

        if (cancelled) return;

        setSelectedLeaseId(chosenLeaseId);
        setMoveIn(result.data);
        setSelectedMethod(result.data?.keyCollectionMethod ?? null);
        setPreferredDeliveryLocation(
          result.data?.preferredDeliveryLocation ?? "",
        );

        if (!result.data) {
          setError("No move-in record exists for this confirmed tenancy yet.");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load move-in status.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, router]);

  async function selectLease(leaseId: string) {
    if (!leaseId || leaseId === selectedLeaseId) return;

    setLoading(true);
    setError("");

    try {
      const result = await apiFetch<ApiResponse<MoveIn | null>>(
        `/api/v1/move-in/me?leaseId=${encodeURIComponent(leaseId)}`,
        getToken,
      );

      setSelectedLeaseId(leaseId);
      setMoveIn(result.data);
      setSelectedMethod(result.data?.keyCollectionMethod ?? null);
      setPreferredDeliveryLocation(
        result.data?.preferredDeliveryLocation ?? "",
      );

      router.replace(
        `/dashboard/tenant/move-in?leaseId=${encodeURIComponent(leaseId)}`,
      );

      if (!result.data) {
        setError("No move-in record exists for this confirmed tenancy yet.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load this tenancy.",
      );
    } finally {
      setLoading(false);
    }
  }

  function chooseKeyMethod(method: "DELIVERY" | "PHYSICAL_PICKUP") {
    setSelectedMethod(method);
    setError("");
  }

  async function saveKeyMethod() {
    if (!selectedLeaseId) {
      setError("Select a confirmed tenancy first.");
      return;
    }

    if (!selectedMethod) {
      setError("Choose delivery or physical pickup.");
      return;
    }

    if (
      selectedMethod === "DELIVERY" &&
      !preferredDeliveryLocation.trim()
    ) {
      setError("Enter the full address where you want your keys delivered.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await apiFetch<ApiResponse<MoveIn>>(
        "/api/v1/move-in/me",
        getToken,
        {
          method: "PATCH",
          body: JSON.stringify({
            leaseId: selectedLeaseId,
            keyCollectionMethod: selectedMethod,
            ...(selectedMethod === "DELIVERY"
              ? {
                  preferredDeliveryLocation:
                    preferredDeliveryLocation.trim(),
                }
              : {}),
          }),
        },
      );

      setMoveIn(response.data);
      setSelectedMethod(response.data.keyCollectionMethod);
      setPreferredDeliveryLocation(
        response.data.preferredDeliveryLocation ?? "",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save key collection details.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <TopAppBar title="Move-in" />

      <div className="mx-auto max-w-lg space-y-4 px-4 py-4">
        {leaseOptions.length > 1 && (
          <label className="block text-sm font-medium">
            Select rental
            <select
              value={selectedLeaseId}
              onChange={(event) => void selectLease(event.target.value)}
              disabled={loading || saving}
              className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3"
            >
              {leaseOptions.map((lease) => (
                <option key={lease.id} value={lease.id}>
                  {lease.property.title}
                </option>
              ))}
            </select>
          </label>
        )}

        {loading ? (
          <p className="py-8 text-center text-sm text-black/40">
            Loading...
          </p>
        ) : error && !moveIn ? (
          <p className="py-6 text-center text-sm text-black/50">{error}</p>
        ) : moveIn ? (
          <>
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">
                  {moveIn.lease.property.title}
                </p>
                <StatusPill tone={statusTone[moveIn.handoverStatus]}>
                  {moveIn.handoverStatus.replace("_", " ")}
                </StatusPill>
              </div>
            </Card>

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <div>
              <p className="text-xs font-semibold text-black/50">
                KEY COLLECTION
              </p>

              {moveIn.handoverStatus !== "COMPLETED" && (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => chooseKeyMethod("DELIVERY")}
                      className={`flex flex-col items-center gap-2 rounded-xl border p-4 disabled:opacity-50 ${
                        selectedMethod === "DELIVERY"
                          ? "border-brand-yellow bg-brand-yellow/10"
                          : "border-black/10 bg-white"
                      }`}
                    >
                      <Truck size={20} />
                      <span className="text-sm font-medium">Delivery</span>
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => chooseKeyMethod("PHYSICAL_PICKUP")}
                      className={`flex flex-col items-center gap-2 rounded-xl border p-4 disabled:opacity-50 ${
                        selectedMethod === "PHYSICAL_PICKUP"
                          ? "border-brand-yellow bg-brand-yellow/10"
                          : "border-black/10 bg-white"
                      }`}
                    >
                      <MapPin size={20} />
                      <span className="text-sm font-medium">
                        Physical Pickup
                      </span>
                    </button>
                  </div>

                  {selectedMethod === "DELIVERY" && (
                    <div className="mt-4">
                      <label
                        htmlFor="delivery-address"
                        className="mb-2 block text-sm font-medium"
                      >
                        Delivery address
                      </label>
                      <textarea
                        id="delivery-address"
                        value={preferredDeliveryLocation}
                        onChange={(event) =>
                          setPreferredDeliveryLocation(event.target.value)
                        }
                        maxLength={1000}
                        rows={3}
                        disabled={saving}
                        placeholder="Enter house/building, street, area, city, and any directions for the delivery"
                        className="w-full rounded-xl border border-black/15 bg-white p-3 text-sm outline-none focus:border-brand-yellow disabled:opacity-50"
                      />
                    </div>
                  )}

                  {selectedMethod === "PHYSICAL_PICKUP" && (
                    <Card className="mt-4 p-4">
                      <p className="text-xs font-semibold text-black/50">
                        KEY PICKUP OFFICE
                      </p>
                      <p className="mt-2 font-semibold">
                        Aviritech Port Harcourt Branch
                      </p>
                      <p className="mt-1 text-sm text-black/70">
                        Aba Road, FHA, Gumbo House, Port Harcourt, Rivers
                        State, Nigeria
                      </p>
                      <p className="mt-2 text-xs text-black/50">
                        Please contact Aviritech to confirm pickup arrangements
                        before visiting.
                      </p>
                    </Card>
                  )}

                  <button
                    type="button"
                    onClick={() => void saveKeyMethod()}
                    disabled={saving || !selectedMethod}
                    className="mt-4 w-full rounded-xl bg-brand-yellow px-4 py-3 text-sm font-semibold text-black disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save key collection details"}
                  </button>
                </>
              )}

              {moveIn.handoverStatus === "COMPLETED" && (
                <p className="mt-3 text-sm text-black/50">
                  Handover is complete. Actual key collection is tracked
                  separately.
                </p>
              )}
            </div>

            {(moveIn.electricityMeterNumber || moveIn.waterMeterNumber) && (
              <Card className="p-4">
                <p className="text-xs font-semibold text-black/50">
                  METER INFORMATION
                </p>

                {moveIn.electricityMeterNumber && (
                  <p className="mt-2 text-sm">
                    Electricity: {moveIn.electricityMeterNumber}
                    {moveIn.electricityMeterReading &&
                      ` · ${moveIn.electricityMeterReading}`}
                  </p>
                )}

                {moveIn.waterMeterNumber && (
                  <p className="mt-1 text-sm">
                    Water: {moveIn.waterMeterNumber}
                    {moveIn.waterMeterReading &&
                      ` · ${moveIn.waterMeterReading}`}
                  </p>
                )}
              </Card>
            )}

            <p className="text-xs text-black/40">
              Handover completion does not automatically confirm that you
              collected the keys.
            </p>
          </>
        ) : (
          <p className="py-6 text-center text-sm text-black/50">
            No move-in record is available for this rental.
          </p>
        )}
      </div>
    </>
  );
}
