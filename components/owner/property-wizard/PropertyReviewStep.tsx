"use client";

import {
  CheckCircle2,
  ImageIcon,
  MapPin,
  Pencil,
} from "lucide-react";
import { resolveMediaUrl } from "@/lib/api";
import type {
  Amenity,
  Feature,
  PropertyMedia,
  PropertyWizardData,
} from "./types";

type PropertyReviewStepProps = {
  value: PropertyWizardData;
  media: PropertyMedia[];
  amenities: Amenity[];
  features: Feature[];
  onEditStep: (step: number) => void;
  showAeroOption?: boolean;
  requestAeroInspection?: boolean;
  aeroInspectionFee?: { fee: number; currency: string } | null;
  aeroInspectionFeeError?: string;
  onRequestAeroInspectionChange?: (requested: boolean) => void;
};

function display(value: string, fallback = "Not provided") {
  return value.trim() ? value : fallback;
}

function stripBidiControlChars(value: string): string {
  return value.replace(
    /[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g,
    "",
  );
}

function formatMoney(
  value: string,
  currency: PropertyWizardData["currency"],
) {
  if (!value.trim()) {
    return "Not provided";
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return value;
  }

  try {
    return stripBidiControlChars(
      new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(numeric),
    );
  } catch {
    return stripBidiControlChars(
      `${currency} ${numeric.toLocaleString("en-NG")}`,
    );
  }
}

function formatNumber(value: string) {
  if (!value.trim()) {
    return "Not provided";
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return value;
  }

  return numeric.toLocaleString("en-NG", {
    maximumFractionDigits: 2,
  });
}

function Section({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="text-base font-bold text-slate-900">
          {title}
        </h3>

        <button
          type="button"
          onClick={() => onEdit(step)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <Pencil size={15} />
          Edit
        </button>
      </div>

      {children}
    </section>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 break-words text-sm font-medium text-slate-900">
        {value}
      </p>
    </div>
  );
}

function ListValue({
  values,
  emptyText,
}: {
  values: string[];
  emptyText: string;
}) {
  if (values.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700"
        >
          {value}
        </span>
      ))}
    </div>
  );
}

export function PropertyReviewStep({
  value,
  media,
  amenities,
  features,
  onEditStep,
  showAeroOption = false,
  requestAeroInspection = false,
  aeroInspectionFee = null,
  aeroInspectionFeeError = "",
  onRequestAeroInspectionChange,
}: PropertyReviewStepProps) {
  const additionalFees =
    Number(value.serviceCharge || 0) +
    Number(value.cautionFee || 0) +
    Number(value.agencyFee || 0) +
    Number(value.legalFee || 0);

  const selectedAmenityNames = value.amenityIds
    .map(
      (id) =>
        amenities.find((amenity) => amenity.id === id)?.name,
    )
    .filter((name): name is string => Boolean(name));

  const selectedFeatureNames = value.featureIds
    .map(
      (id) =>
        features.find((feature) => feature.id === id)?.name,
    )
    .filter((name): name is string => Boolean(name));

  const locationParts = [
    value.addressLine1,
    value.addressLine2,
    value.estateName,
    value.districtName,
    value.cityName,
    value.localGovernmentName,
    value.stateName,
    value.countryName,
    value.landmark,
    value.postalCode,
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2
            size={21}
            className="mt-0.5 shrink-0 text-green-600"
          />

          <div>
            <h2 className="font-bold text-slate-900">
              Review your property
            </h2>

            <p className="mt-1.5 text-sm leading-6 text-slate-600">
              Please review the information below before submitting
              your property for approval. You can edit any section
              before submitting.
            </p>
          </div>
        </div>
      </div>

      <Section
        title="Property Type"
        step={1}
        onEdit={onEditStep}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Property type"
            value={display(
              value.propertyTypeName,
            )}
          />

          <Field
            label="Property type ID"
            value={display(
              value.propertyTypeId,
            )}
          />
        </div>
      </Section>

      <Section
        title="Basic Information & Pricing"
        step={2}
        onEdit={onEditStep}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Property title"
            value={display(value.title)}
          />

          <Field
            label="Listing type"
            value={display(value.listingType)}
          />

          <Field
            label="Price"
            value={formatMoney(
              value.price,
              value.currency,
            )}
          />

          <Field
            label="Currency"
            value={display(value.currency)}
          />

          <Field
            label="Service charge"
            value={formatMoney(
              value.serviceCharge,
              value.currency,
            )}
          />

          <Field
            label="Caution fee"
            value={formatMoney(
              value.cautionFee,
              value.currency,
            )}
          />

          <Field
            label="Agency fee"
            value={formatMoney(
              value.agencyFee,
              value.currency,
            )}
          />

          <Field
            label="Legal fee"
            value={formatMoney(
              value.legalFee,
              value.currency,
            )}
          />
        </div>

        {value.description.trim() && (
          <div className="mt-5 border-t border-slate-100 pt-5">
            <Field
              label="Description"
              value={value.description}
            />
          </div>
        )}

        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-slate-600">
              Additional fees
            </span>

            <span className="text-sm font-bold text-slate-900">
              {formatMoney(
                String(additionalFees),
                value.currency,
              )}
            </span>
          </div>
        </div>
      </Section>

      <Section
        title="Property Details"
        step={3}
        onEdit={onEditStep}
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Bedrooms"
            value={formatNumber(value.bedrooms)}
          />

          <Field
            label="Bathrooms"
            value={formatNumber(value.bathrooms)}
          />

          <Field
            label="Toilets"
            value={formatNumber(value.toilets)}
          />

          <Field
            label="Kitchens"
            value={formatNumber(value.kitchens)}
          />

          <Field
            label="Parking spaces"
            value={formatNumber(
              value.parkingSpaces,
            )}
          />

          <Field
            label="Floors"
            value={formatNumber(value.floors)}
          />

          <Field
            label="Year built"
            value={formatNumber(
              value.yearBuilt,
            )}
          />

          <Field
            label="Land size"
            value={
              value.landSize.trim()
                ? `${formatNumber(value.landSize)} ${value.measurementUnit}`
                : "Not provided"
            }
          />

          <Field
            label="Building size"
            value={
              value.buildingSize.trim()
                ? `${formatNumber(value.buildingSize)} ${value.measurementUnit}`
                : "Not provided"
            }
          />
        </div>
      </Section>

      <Section
        title="Amenities & Features"
        step={4}
        onEdit={onEditStep}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Selected amenities
            </p>

            <ListValue
              values={selectedAmenityNames}
              emptyText="No amenities selected"
            />
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Selected features
            </p>

            <ListValue
              values={selectedFeatureNames}
              emptyText="No features selected"
            />
          </div>
        </div>
      </Section>

      <Section
        title="Media"
        step={5}
        onEdit={onEditStep}
      >
        {media.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {media.map((item, index) => (
              <div
                key={item.id}
                className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveMediaUrl(
                    item.thumbnailUrl ??
                      item.url,
                  )}
                  alt={`Property photo ${index + 1}`}
                  className="aspect-[4/3] w-full object-cover"
                />

                {index === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-slate-800 shadow-sm">
                    Featured
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
            <ImageIcon size={19} />
            No property photos uploaded yet.
          </div>
        )}
      </Section>

      <Section
        title="Location"
        step={6}
        onEdit={onEditStep}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
            <MapPin
              size={19}
              className="mt-0.5 shrink-0 text-slate-500"
            />

            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                Property address
              </p>

              <p className="mt-1.5 text-sm leading-6 text-slate-600">
                {locationParts.length > 0
                  ? locationParts.join(", ")
                  : "Location not provided"}
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Latitude"
              value={
                value.latitude !== null
                  ? String(value.latitude)
                  : "Not provided"
              }
            />

            <Field
              label="Longitude"
              value={
                value.longitude !== null
                  ? String(value.longitude)
                  : "Not provided"
              }
            />
          </div>
        </div>
      </Section>

      {showAeroOption && value.listingType === "SALE" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <input
              id="request-aero-inspection"
              type="checkbox"
              checked={requestAeroInspection}
              disabled={!aeroInspectionFee || Boolean(aeroInspectionFeeError)}
              onChange={(event) =>
                onRequestAeroInspectionChange?.(event.target.checked)
              }
              className="mt-1 h-4 w-4 rounded border-slate-300 accent-yellow-400"
            />
            <div className="min-w-0">
              <label
                htmlFor="request-aero-inspection"
                className="cursor-pointer font-bold text-slate-900"
              >
                Request optional Aero Drone Inspection
              </label>
              {aeroInspectionFee ? (
                <p className="mt-1 text-sm text-slate-600">
                  Additional fee: {aeroInspectionFee.currency}{" "}
                  {aeroInspectionFee.fee.toLocaleString("en-NG")}
                  {aeroInspectionFee.fee === 0
                    ? " (no additional charge currently configured)"
                    : ""}
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-500">
                  {aeroInspectionFeeError ||
                    "Loading the current Aero inspection fee..."}
                </p>
              )}
              <p className="mt-2 text-xs leading-5 text-slate-500">
                When selected, this fee is added to your property submission payment.
                The drone inspection request is activated only after payment is verified.
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
        <h3 className="font-bold text-slate-900">
          Ready to submit?
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Submitting this property will move it from{" "}
          <strong>Draft</strong> to{" "}
          <strong>Pending Approval</strong>. It will then be
          reviewed before becoming available to prospective
          buyers or tenants.
        </p>
      </div>
    </div>
  );
}
