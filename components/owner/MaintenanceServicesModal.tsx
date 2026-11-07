"use client";

import { useEffect } from "react";

type MaintenanceServicesModalProps = {
  open: boolean;
  propertyId: string;
  propertyName: string;
  onClose: () => void;
};

const services = [
  {
    title: "Plumbing",
    description: "Pipes, leaks, drainage, faucets and water systems",
  },
  {
    title: "Electrical",
    description: "Wiring, lighting, sockets, breakers and electrical repairs",
  },
  {
    title: "AC & HVAC",
    description: "Air conditioning installation, servicing and repairs",
  },
  {
    title: "Carpentry",
    description: "Doors, cabinets, woodwork and property repairs",
  },
  {
    title: "Painting",
    description: "Interior, exterior and finishing services",
  },
  {
    title: "Cleaning",
    description: "Deep cleaning, regular cleaning and move-in cleaning",
  },
  {
    title: "Tiling & Masonry",
    description: "Flooring, walls, concrete and building repairs",
  },
  {
    title: "Generator & Power",
    description: "Generator servicing, installations and power systems",
  },
  {
    title: "Security",
    description: "CCTV, access control, locks and security systems",
  },
  {
    title: "General Repairs",
    description: "Property repairs and miscellaneous maintenance work",
  },
];

const merchantCategories = [
  "Building Materials",
  "Electrical Materials",
  "Plumbing Materials",
  "Hardware",
  "Furniture",
  "Appliances",
  "Paint & Finishes",
  "Property Equipment",
];

export function MaintenanceServicesModal({
  open,
  propertyId,
  propertyName,
  onClose,
}: MaintenanceServicesModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="maintenance-services-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 sm:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Property Services
            </p>

            <h2
              id="maintenance-services-title"
              className="mt-1 text-2xl font-black tracking-tight text-slate-950"
            >
              Maintenance & Services
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Services and verified merchant categories for{" "}
              <span className="font-semibold text-slate-700">
                {propertyName}
              </span>
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Property ID: {propertyId}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close maintenance services"
            className="rounded-full border border-slate-200 px-3 py-2 text-lg font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6 sm:px-8">
          <section>
            <div className="mb-4">
              <h3 className="text-lg font-black text-slate-950">
                Skills & Services
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Find professionals for repairs, maintenance and property
                services.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <button
                  key={service.title}
                  type="button"
                  className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#FACC15] hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-bold text-slate-900">
                      {service.title}
                    </h4>

                    <span className="rounded-full bg-[#FACC15] px-2 py-1 text-[10px] font-black uppercase text-slate-950">
                      Service
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {service.description}
                  </p>

                  <span className="mt-3 inline-block text-xs font-bold text-slate-700 group-hover:text-slate-950">
                    Request service →
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-4">
              <h3 className="text-lg font-black text-slate-950">
                Merchant Vendors
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Browse merchant categories for property materials, equipment
                and supplies.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {merchantCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-[#FACC15] hover:bg-white hover:shadow-sm"
                >
                  <div className="text-sm font-bold text-slate-900">
                    {category}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    View vendors →
                  </div>
                </button>
              ))}
            </div>
          </section>

          <div className="mt-8 rounded-2xl bg-slate-950 p-5 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-black">
                  Need something specific?
                </h3>
                <p className="mt-1 text-sm text-slate-300">
                  Tell us what your property needs and connect with the right
                  service provider.
                </p>
              </div>

              <button
                type="button"
                className="shrink-0 rounded-xl bg-[#FACC15] px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-[#F5C518]"
              >
                Request a Service
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
