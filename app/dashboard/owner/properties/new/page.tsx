"use client";

import dynamic from "next/dynamic";
import { ArrowLeft, ArrowRight, Blocks, Building2, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState, useEffect} from "react";

const PropertyWizard = dynamic(
  () =>
    import(
      "@/components/owner/property-wizard/PropertyWizard"
    ).then((module) => module.PropertyWizard),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[500px] items-center justify-center text-sm text-slate-500">
        Loading property editor...
      </div>
    ),
  },
);

const LandVaultWizard = dynamic(
  () =>
    import(
      "@/components/owner/land-vault/LandVaultWizard"
    ).then((module) => module.LandVaultWizard),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[500px] items-center justify-center text-sm text-slate-500">
        Loading LandVault...
      </div>
    ),
  },
);

type Workflow = "select" | "normal" | "landvault";

export default function NewPropertyPage() {
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<Workflow>("select");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const requestedOwnerId = params.get("ownerId");
    const requestedWorkflow = params.get("workflow");

    if (requestedOwnerId) {
      setOwnerId(requestedOwnerId);
    }

    if (
      requestedWorkflow === "normal" ||
      requestedWorkflow === "landvault"
    ) {
      setWorkflow(requestedWorkflow);
    }
  }, []);

  if (workflow === "normal") {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => setWorkflow("select")}
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Choose another workflow
          </button>

          <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7 lg:p-8">
            <PropertyWizard  initialOwnerId={ownerId} />
          </section>
        </div>
      </main>
    );
  }

  if (workflow === "landvault") {
    return (
      <main className="min-h-screen bg-[#050505] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => setWorkflow("select")}
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            Choose another workflow
          </button>

          <LandVaultWizard />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard/owner"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>

        <div className="mb-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400 text-slate-950">
              <Sparkles size={21} strokeWidth={2.5} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Add Property
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Choose the property experience you want to create.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <button
            type="button"
            onClick={() => setWorkflow("normal")}
            className="group rounded-3xl border border-slate-200 bg-white p-7 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl sm:p-9"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-50 text-slate-900">
                <Building2 size={27} />
              </div>

              <ArrowRight
                className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-900"
                size={22}
              />
            </div>

            <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Standard listing
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Normal Property
            </h2>

            <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
              Create a conventional property listing for rent, sale, lease or
              shortlet using the existing Aviritech property workflow.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              {["8-step wizard", "Media", "Location", "BIM"].map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
                >
                  {item}
                </span>
              ))}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setWorkflow("landvault")}
            className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-7 text-left text-white shadow-2xl transition duration-200 hover:-translate-y-1 hover:border-yellow-400/50 sm:p-9"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-25"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(250,204,21,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(250,204,21,.12) 1px, transparent 1px)",
                backgroundSize: "30px 30px",
              }}
            />

            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400 text-slate-950">
                  <Blocks size={27} />
                </div>

                <ArrowRight
                  className="text-slate-600 transition group-hover:translate-x-1 group-hover:text-yellow-400"
                  size={22}
                />
              </div>

              <div className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-yellow-400">
                <Sparkles size={13} />
                Web3 property identity
              </div>

              <h2 className="mt-2 text-2xl font-bold">
                LandVault
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
                Create a verifiable digital property record with ownership,
                evidence, due diligence and future blockchain anchoring.
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                {[
                  "Digital identity",
                  "Evidence vault",
                  "Due diligence",
                  "Blockchain ready",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-slate-700 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex items-center gap-2 text-sm font-semibold text-yellow-400">
                <ShieldCheck size={17} />
                Secure your property identity
              </div>
            </div>
          </button>
        </div>
      </div>
    </main>
  );
}
