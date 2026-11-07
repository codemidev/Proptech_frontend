"use client";

import { Check } from "lucide-react";
import type { WizardStep } from "./types";

type Props = {
  steps: WizardStep[];
  currentStep: number;
};

export function WizardProgress({
  steps,
  currentStep,
}: Props) {
  return (
    <div className="mb-8">
      <div className="hidden items-center md:flex">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const completed = stepNumber < currentStep;
          const active = stepNumber === currentStep;

          return (
            <div
              key={step.id}
              className="flex min-w-0 flex-1 items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                    completed
                      ? "border-yellow-400 bg-yellow-400 text-slate-900"
                      : active
                        ? "border-yellow-400 bg-yellow-50 text-slate-900"
                        : "border-slate-200 bg-white text-slate-400",
                  ].join(" ")}
                >
                  {completed ? <Check size={16} /> : stepNumber}
                </div>

                <div className="min-w-0">
                  <p
                    className={[
                      "truncate text-xs font-semibold",
                      active || completed
                        ? "text-slate-900"
                        : "text-slate-400",
                    ].join(" ")}
                  >
                    {step.title}
                  </p>
                </div>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={[
                    "mx-3 h-px flex-1",
                    completed
                      ? "bg-yellow-400"
                      : "bg-slate-200",
                  ].join(" ")}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="md:hidden">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Step {currentStep} of {steps.length}
            </p>
            <h2 className="mt-1 text-base font-semibold text-slate-900">
              {steps[currentStep - 1]?.title}
            </h2>
          </div>

          <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-slate-700">
            {Math.round((currentStep / steps.length) * 100)}%
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-yellow-400 transition-all"
            style={{
              width: `${(currentStep / steps.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
