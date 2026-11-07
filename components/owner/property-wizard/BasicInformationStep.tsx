"use client";

import type { PropertyWizardData } from "./types";

type Props = {
  value: PropertyWizardData;
  onChange: (patch: Partial<PropertyWizardData>) => void;
};

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "any" : undefined}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
      />
    </label>
  );
}

export function BasicInformationStep({
  value,
  onChange,
}: Props) {
  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Basic information & pricing
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Give buyers the essential information and pricing for this property.
        </p>
      </div>

      <div className="space-y-7">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">
            Listing information
          </h2>

          <div className="mt-5 space-y-5">
            <Field
              label="Property title"
              value={value.title}
              onChange={(title) => onChange({ title })}
              placeholder="e.g. Modern 4 Bedroom Duplex in GRA"
              required
            />

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Description
              </span>
              <textarea
                value={value.description}
                onChange={(event) =>
                  onChange({ description: event.target.value })
                }
                rows={5}
                placeholder="Describe the property..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Listing type <span className="text-red-500">*</span>
              </span>

              <select
                value={value.listingType}
                onChange={(event) =>
                  onChange({
                    listingType: event.target.value as PropertyWizardData["listingType"],
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
              >
                <option value="SALE">For Sale</option>
                <option value="RENT">For Rent</option>
                <option value="SHORTLET">Shortlet</option>
                <option value="LEASE">For Lease</option>
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">
            Pricing
          </h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Currency
              </span>

              <select
                value={value.currency}
                onChange={(event) =>
                  onChange({
                    currency:
                      event.target.value as PropertyWizardData["currency"],
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
              >
                <option value="NGN">NGN — Nigerian Naira</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — Pound Sterling</option>
                <option value="BTC">BTC — Bitcoin</option>
                <option value="ETH">ETH — Ethereum</option>
                <option value="USDT">USDT — Tether</option>
              </select>
            </label>

            <Field
              label="Property price"
              value={value.price}
              onChange={(price) => onChange({ price })}
              type="number"
              placeholder="0.00"
              required
            />

            <Field
              label="Service charge"
              value={value.serviceCharge}
              onChange={(serviceCharge) =>
                onChange({ serviceCharge })
              }
              type="number"
              placeholder="0.00"
            />

            <Field
              label="Caution fee"
              value={value.cautionFee}
              onChange={(cautionFee) => onChange({ cautionFee })}
              type="number"
              placeholder="0.00"
            />

            <Field
              label="Agency fee"
              value={value.agencyFee}
              onChange={(agencyFee) => onChange({ agencyFee })}
              type="number"
              placeholder="0.00"
            />

            <Field
              label="Legal fee"
              value={value.legalFee}
              onChange={(legalFee) => onChange({ legalFee })}
              type="number"
              placeholder="0.00"
            />
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Estimated upfront total
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {value.currency}{" "}
              {[
                value.price,
                value.serviceCharge,
                value.cautionFee,
                value.agencyFee,
                value.legalFee,
              ]
                .reduce((sum, item) => {
                  const amount = Number(item);
                  return Number.isFinite(amount)
                    ? sum + amount
                    : sum;
                }, 0)
                .toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              This is calculated for display only and is not stored as a separate database field.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
