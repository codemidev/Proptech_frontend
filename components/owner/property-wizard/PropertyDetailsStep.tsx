"use client";

import type { PropertyWizardData } from "./types";
import { LandDetailsStep } from "./LandDetailsStep";

type Props = {
  value: PropertyWizardData;
  onChange: (patch: Partial<PropertyWizardData>) => void;
};

const fields = [
  ["bedrooms", "Bedrooms"],
  ["bathrooms", "Bathrooms"],
  ["toilets", "Toilets"],
  ["kitchens", "Kitchens"],
  ["parkingSpaces", "Parking spaces"],
  ["floors", "Floors"],
  ["yearBuilt", "Year built"],
] as const;

export function PropertyDetailsStep({
  value,
  onChange,
}: Props) {
  const category = String(
    value.propertyTypeCategory ?? "",
  ).toUpperCase();

  const propertyTypeName = String(
    value.propertyTypeName ?? "",
  ).toUpperCase();

  const isLand =
    category.includes("LAND") ||
    propertyTypeName.includes("LAND");

  if (isLand) {
    return (
      <LandDetailsStep
        value={value}
        onChange={onChange}
      />
    );
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Property details
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Add the physical characteristics of the property.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([key, label]) => (
            <label key={key} className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                {label}
              </span>

              <input
                type="number"
                min="0"
                step="1"
                value={value[key]}
                onChange={(event) =>
                  onChange({
                    [key]: event.target.value,
                  } as Partial<PropertyWizardData>)
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
              />
            </label>
          ))}
        </div>

        <div className="mt-6 border-t border-slate-100 pt-6">
          <h2 className="text-base font-semibold text-slate-900">
            Size
          </h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-3">
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
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Building size
              </span>

              <input
                type="number"
                min="0"
                step="any"
                value={value.buildingSize}
                onChange={(event) =>
                  onChange({
                    buildingSize: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
              />
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
          </div>
        </div>
      </div>
    </div>
  );
}
