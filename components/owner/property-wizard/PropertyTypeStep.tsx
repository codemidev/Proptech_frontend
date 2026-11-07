"use client";

import { Building2, Check } from "lucide-react";
import type {
  PropertyType,
  PropertyWizardData,
} from "./types";

type Props = {
  value: PropertyWizardData;
  propertyTypes: PropertyType[];
  onChange: (patch: Partial<PropertyWizardData>) => void;
};

export function PropertyTypeStep({
  value,
  propertyTypes,
  onChange,
}: Props) {
  /**
   * Land listings use the dedicated LandVaultX workflow.
   *
   * Keep LAND property types in the backend/schema for LandVaultX and
   * existing records, but do not expose them in the normal Property
   * Upload wizard.
   */
  const uploadPropertyTypes = propertyTypes.filter(
    (item) =>
      item.category?.toUpperCase() !== "LAND" &&
      item.name?.toUpperCase() !== "LAND",
  );

  const categories = Array.from(
    new Set(uploadPropertyTypes.map((item) => item.category)),
  );

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          What type of property are you listing?
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Choose the property type that best describes this listing.
        </p>
      </div>

      <div className="space-y-7">
        {categories.map((category) => {
          const items = uploadPropertyTypes.filter(
            (item) => item.category === category,
          );

          return (
            <section key={category}>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                {category.replaceAll("_", " ")}
              </h2>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((propertyType) => {
                  const selected =
                    value.propertyTypeId === propertyType.id;

                  return (
                    <button
                      key={propertyType.id}
                      type="button"
                      onClick={() =>
                        onChange({
                          propertyTypeId: propertyType.id,
                          propertyTypeName: propertyType.name,
                          propertyTypeCategory: propertyType.category,
                        })
                      }
                      className={[
                        "group relative rounded-2xl border p-5 text-left transition",
                        selected
                          ? "border-yellow-400 bg-yellow-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
                      ].join(" ")}
                    >
                      {selected && (
                        <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-slate-900">
                          <Check size={14} strokeWidth={3} />
                        </span>
                      )}

                      <div
                        className={[
                          "mb-4 flex h-11 w-11 items-center justify-center rounded-xl",
                          selected
                            ? "bg-yellow-400"
                            : "bg-slate-100 group-hover:bg-slate-200",
                        ].join(" ")}
                      >
                        <Building2 size={21} />
                      </div>

                      <h3 className="font-semibold text-slate-900">
                        {propertyType.name}
                      </h3>

                      {propertyType.description && (
                        <p className="mt-1 text-sm leading-5 text-slate-500">
                          {propertyType.description}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
