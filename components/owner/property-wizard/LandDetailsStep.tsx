"use client";

import type { PropertyWizardData } from "./types";

type Props = {
  value: PropertyWizardData;
  onChange: (patch: Partial<PropertyWizardData>) => void;
};

export function LandDetailsStep({
  value,
  onChange,
}: Props) {
  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Land details
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Provide the basic information needed to identify and verify
          this land parcel.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Land size
            </span>

            <input
              type="number"
              min="0"
              step="any"
              value={value.landSize}
              onChange={(event) =>
                onChange({
                  landSize: event.target.value,
                })
              }
              placeholder="e.g. 600"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
            />

            <p className="mt-2 text-xs text-slate-400">
              Enter the measured area of the parcel.
            </p>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Measurement unit
            </span>

            <select
              value={value.measurementUnit}
              onChange={(event) =>
                onChange({
                  measurementUnit: event.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
            >
              <option value="sqm">
                Square metres (sqm)
              </option>
              <option value="sqft">
                Square feet (sqft)
              </option>
              <option value="acres">
                Acres
              </option>
              <option value="hectares">
                Hectares
              </option>
              <option value="plots">
                Plots
              </option>
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Parcel number
            </span>

            <input
              type="text"
              value={value.parcelNumber}
              onChange={(event) =>
                onChange({
                  parcelNumber: event.target.value,
                })
              }
              placeholder="Enter parcel number if available"
              maxLength={100}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
            />

            <p className="mt-2 text-xs text-slate-400">
              This is optional at this stage and can be verified during
              due diligence.
            </p>
          </label>
        </div>

        <div className="mt-6 rounded-xl border border-yellow-100 bg-yellow-50 p-4">
          <p className="text-sm font-semibold text-slate-900">
            Land verification
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            Survey information, title documents, coordinates and other
            verification records will be handled as part of the
            property due-diligence process.
          </p>
        </div>
      </div>
    </div>
  );
}
