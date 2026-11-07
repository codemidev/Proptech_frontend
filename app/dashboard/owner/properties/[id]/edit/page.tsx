"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PropertyWizard } from "@/components/owner/property-wizard/PropertyWizard";

export default function OwnerPropertyEditPage() {
  const params = useParams();
  const router = useRouter();

  const propertyId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : "";

  if (!propertyId) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
          Property ID is missing.
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() =>
                router.push("/dashboard/owner/properties")
              }
              className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
            >
              <ArrowLeft size={16} />
              Back to My Properties
            </button>

            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Edit Property
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Update the complete property record.
            </p>
          </div>
        </div>

        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-6 lg:p-8">
          <PropertyWizard
            initialPropertyId={propertyId}
          />
        </section>
      </div>
    </main>
  );
}
