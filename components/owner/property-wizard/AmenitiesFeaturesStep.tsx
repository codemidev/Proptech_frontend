"use client";

import { Check } from "lucide-react";
import type {
  Amenity,
  Feature,
  PropertyWizardData,
} from "./types";

type Props = {
  value: PropertyWizardData;
  amenities: Amenity[];
  features: Feature[];
  onChange: (patch: Partial<PropertyWizardData>) => void;
};

function ToggleGrid({
  items,
  selected,
  onToggle,
}: {
  items: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const active = selected.includes(item.id);

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            className={[
              "flex items-start gap-3 rounded-xl border p-4 text-left transition",
              active
                ? "border-yellow-400 bg-yellow-50"
                : "border-slate-200 bg-white hover:border-slate-300",
            ].join(" ")}
          >
            <span
              className={[
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                active
                  ? "border-yellow-400 bg-yellow-400 text-slate-900"
                  : "border-slate-300",
              ].join(" ")}
            >
              {active && <Check size={13} strokeWidth={3} />}
            </span>

            <span>
              <span className="block text-sm font-medium text-slate-900">
                {item.name}
              </span>
              {item.description && (
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  {item.description}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function AmenitiesFeaturesStep({
  value,
  amenities,
  features,
  onChange,
}: Props) {
  function toggle(
    key: "amenityIds" | "featureIds",
    id: string,
  ) {
    const current = value[key];

    onChange({
      [key]: current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    } as Partial<PropertyWizardData>);
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Amenities & features
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Highlight the facilities and features available at the property.
        </p>
      </div>

      <div className="space-y-7">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">
            Amenities
          </h2>

          <div className="mt-5">
            {amenities.length > 0 ? (
              <ToggleGrid
                items={amenities}
                selected={value.amenityIds}
                onToggle={(id) => toggle("amenityIds", id)}
              />
            ) : (
              <p className="text-sm text-slate-500">
                No amenities have been configured yet.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">
            Features
          </h2>

          <div className="mt-5">
            {features.length > 0 ? (
              <ToggleGrid
                items={features}
                selected={value.featureIds}
                onToggle={(id) => toggle("featureIds", id)}
              />
            ) : (
              <p className="text-sm text-slate-500">
                No features have been configured yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
