"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRightLeft,
  Smartphone,
  Wallet,
  Landmark,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { TopAppBar } from "@/components/shell/TopAppBar";
import { Card } from "@/components/ui/Card";

type ConversionType = "airtime" | "data";
type PayoutMethod = "wallet" | "bank";

const networks = ["MTN", "Airtel", "Glo", "9mobile"] as const;

export default function AirtimeDataToCashPage() {
  const [conversionType, setConversionType] =
    useState<ConversionType>("airtime");
  const [network, setNetwork] = useState<(typeof networks)[number]>("MTN");
  const [amount, setAmount] = useState("1000");
  const [payoutMethod, setPayoutMethod] =
    useState<PayoutMethod>("wallet");

  const parsedAmount = Number(amount);
  const validAmount =
    amount.trim() !== "" &&
    Number.isFinite(parsedAmount) &&
    parsedAmount >= 100 &&
    parsedAmount <= 1000000;

  return (
    <>
      <TopAppBar title="Airtime & Data to Cash" />

      <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <Link
          href="/dashboard/tenant/utilities"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Utilities
        </Link>

        <section>
          <p className="text-sm font-medium text-slate-500">
            Tenant workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Airtime & Data to Cash
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Choose what you want to convert and where eligible proceeds
            should be paid. Conversion rates and availability must be
            confirmed by an approved provider.
          </p>
        </section>

        <Card>
          <div className="space-y-6 p-5 sm:p-6">
            <div>
              <label className="mb-3 block text-sm font-semibold text-slate-900">
                Choose conversion type
              </label>
              <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  aria-pressed={conversionType === "airtime"}
                  onClick={() => setConversionType("airtime")}
                  className={`rounded-lg px-3 py-3 text-sm font-semibold transition ${
                    conversionType === "airtime"
                      ? "bg-[#FACC15] text-slate-950 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Airtime to Cash
                </button>
                <button
                  type="button"
                  aria-pressed={conversionType === "data"}
                  onClick={() => setConversionType("data")}
                  className={`rounded-lg px-3 py-3 text-sm font-semibold transition ${
                    conversionType === "data"
                      ? "bg-[#FACC15] text-slate-950 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Data to Cash
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="conversion-network"
                className="mb-2 block text-sm font-semibold text-slate-900"
              >
                Mobile network
              </label>
              <select
                id="conversion-network"
                value={network}
                onChange={(event) =>
                  setNetwork(event.target.value as (typeof networks)[number])
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-yellow-300"
              >
                {networks.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="conversion-amount"
                className="mb-2 block text-sm font-semibold text-slate-900"
              >
                {conversionType === "airtime"
                  ? "Airtime value (NGN)"
                  : "Data bundle value (NGN)"}
              </label>
              <div className="flex items-center rounded-xl border border-slate-300 focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-yellow-300">
                <span className="pl-4 text-slate-500">₦</span>
                <input
                  id="conversion-amount"
                  type="number"
                  min="100"
                  max="1000000"
                  step="1"
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Enter amount"
                  className="w-full rounded-xl bg-transparent px-3 py-3 text-sm text-slate-900 outline-none"
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Enter an amount between ₦100 and ₦1,000,000. These are
                interface limits, not a provider quote or confirmed service
                limits.
              </p>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-slate-900">
                Where should your proceeds go?
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={payoutMethod === "wallet"}
                  onClick={() => setPayoutMethod("wallet")}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                    payoutMethod === "wallet"
                      ? "border-slate-900 bg-yellow-50 ring-1 ring-slate-900"
                      : "border-slate-200 hover:border-slate-400"
                  }`}
                >
                  <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">
                      Aviritech Wallet
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600">
                      Credit your wallet after a provider confirms conversion.
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  aria-pressed={payoutMethod === "bank"}
                  onClick={() => setPayoutMethod("bank")}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                    payoutMethod === "bank"
                      ? "border-slate-900 bg-yellow-50 ring-1 ring-slate-900"
                      : "border-slate-200 hover:border-slate-400"
                  }`}
                >
                  <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">
                      Bank Account
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600">
                      Direct payout, subject to verification and availability.
                    </span>
                  </span>
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <p className="text-sm font-semibold text-amber-950">
                    Conversion provider not yet enabled
                  </p>
                  <p className="mt-1 text-sm leading-5 text-amber-900">
                    {conversionType === "airtime"
                      ? "A compatible airtime-to-cash provider must confirm receipt before proceeds can be credited."
                      : "Data-to-cash requires a provider that explicitly supports eligible data transfers and redemption."}{" "}
                    No live conversion, wallet credit, or bank transfer will
                    be initiated from this page.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-4 py-3 font-semibold text-slate-500"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Conversion unavailable
            </button>

            {!validAmount && amount.trim() !== "" && (
              <p role="alert" className="text-sm text-red-600">
                Enter a valid amount from ₦100 to ₦1,000,000.
              </p>
            )}

            <div className="flex items-start gap-2 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Your selected options are for setup only. No conversion
                estimate is guaranteed, and no wallet or bank balance is
                changed by this screen.
              </p>
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <Smartphone className="h-5 w-5 shrink-0 text-slate-500" />
          <p className="text-sm text-slate-600">
            Selected: {conversionType === "airtime" ? "Airtime" : "Data"} ·{" "}
            {network} · {amount.trim() ? `₦${amount}` : "Amount not entered"} ·{" "}
            {payoutMethod === "wallet" ? "Aviritech Wallet" : "Bank Account"}
          </p>
        </div>
      </main>
    </>
  );
}
