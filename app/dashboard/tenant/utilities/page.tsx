"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { AlertCircle, CheckCircle2, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TopAppBar } from "@/components/shell/TopAppBar";
import { Card } from "@/components/ui/Card";

type Row = Record<string, unknown>;
type ApiResponse<T> = { success: boolean; data: T; message?: string };

type TenancyMeter = {
  id: string;
  service: "Electricity" | "Water";
  number: string;
  propertyTitle: string;
};

type MoveInResponse = {
  success: boolean;
  data: {
    electricityMeterNumber: string | null;
    waterMeterNumber: string | null;
    lease?: { property?: { title?: string | null } | null } | null;
  } | null;
};

type Purchase = {
  id: string;
  billerName: string;
  itemName: string;
  customerId: string;
  customerLabel: string | null;
  amount: string | number;
  providerFee: string | number;
  currency: string;
  providerMessage: string | null;
  providerToken: string | null;
  status: string;
  createdAt: string;
  payment: { reference: string; status: string };
};

const rows = (value: unknown): Row[] => {
  const root = value && typeof value === "object" ? value as Row : {};
  if (Array.isArray(root.data)) return root.data as Row[];
  const nested = root.data && typeof root.data === "object" ? root.data as Row : {};
  return Array.isArray(nested.data) ? nested.data as Row[] : [];
};

const str = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

const codeOf = (row: Row, keys: string[]) =>
  keys.map((key) => str(row[key]).trim()).find(Boolean) ?? "";

const nameOf = (row: Row, keys: string[], fallback: string) =>
  keys.map((key) => str(row[key]).trim()).find(Boolean) || fallback;

const money = (value: string | number, currency = "NGN") =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const fieldClass =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100";

const buttonClass =
  "rounded-xl bg-[#FACC15] px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50";

function statusLabel(status: string) {
  switch (status) {
    case "SUCCESS": return "Delivered";
    case "FAILED": return "Failed";
    case "PROCESSING": return "Processing";
    case "AWAITING_FUNDING": return "Awaiting provider funding";
    case "PAYMENT_PENDING": return "Payment pending";
    default: return "Delivery confirmation pending";
  }
}

export default function UtilitiesPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const [categories, setCategories] = useState<Row[]>([]);
  const [billers, setBillers] = useState<Row[]>([]);
  const [items, setItems] = useState<Row[]>([]);
  const [history, setHistory] = useState<Purchase[]>([]);
  const [tenancyMeters, setTenancyMeters] = useState<TenancyMeter[]>([]);
  const [selectedTenancyMeter, setSelectedTenancyMeter] = useState("");

  const [category, setCategory] = useState("");
  const [biller, setBiller] = useState("");
  const [item, setItem] = useState("");
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("");

  const [validated, setValidated] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedItem = items.find(
    (entry) => codeOf(entry, ["item_code", "itemCode"]) === item,
  );

  const selectedCategory = categories.find(
    (entry) => codeOf(entry, ["code", "category_code", "id"]) === category,
  );

  const categoryDescription = [
    category,
    selectedCategory
      ? nameOf(selectedCategory, ["name", "label", "category_name"], "")
      : "",
  ].join(" ").toLowerCase();

  const expectedMeterService =
    /electric|power/.test(categoryDescription)
      ? "Electricity"
      : /water/.test(categoryDescription)
        ? "Water"
        : null;

  const availableTenancyMeters = !category
    ? tenancyMeters
    : expectedMeterService
      ? tenancyMeters.filter((entry) => entry.service === expectedMeterService)
      : [];

  const fixedAmount = Number(selectedItem?.amount ?? 0);
  const providerFee = Number(selectedItem?.fee ?? 0);
  const utilityAmount = Number(amount);
  const total = utilityAmount + (Number.isFinite(providerFee) ? providerFee : 0);

  const loadHistory = useCallback(async () => {
    const response = await apiFetch<ApiResponse<Purchase[]>>(
      "/api/v1/payments/bills/purchases",
      getToken,
    );
    setHistory(response.data ?? []);
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;

    async function loadCatalogue() {
      try {
        const response = await apiFetch<ApiResponse<unknown>>(
          "/api/v1/payments/bills/categories",
          getToken,
        );
        if (!cancelled) setCategories(rows(response.data));
      } catch (err) {
        if (!cancelled) {
          setError((current) => current || (
            err instanceof Error
              ? err.message
              : "Unable to load Flutterwave utility providers."
          ));
        }
      }
    }

    async function loadPurchases() {
      try {
        const response = await apiFetch<ApiResponse<Purchase[]>>(
          "/api/v1/payments/bills/purchases",
          getToken,
        );
        if (!cancelled) setHistory(response.data ?? []);
      } catch (err) {
        if (!cancelled) {
          setError((current) => current || (
            err instanceof Error
              ? err.message
              : "Unable to load utility purchase history."
          ));
        }
      }
    }

    async function loadTenancyMeters() {
      try {
        const response = await apiFetch<MoveInResponse>(
          "/api/v1/move-in/me",
          getToken,
        );

        if (cancelled) return;

        const moveIn = response.data;
        const propertyTitle =
          moveIn?.lease?.property?.title || "Your active tenancy";

        const savedMeters: TenancyMeter[] = [];

        if (moveIn?.electricityMeterNumber?.trim()) {
          savedMeters.push({
            id: "electricity",
            service: "Electricity",
            number: moveIn.electricityMeterNumber.trim(),
            propertyTitle,
          });
        }

        if (moveIn?.waterMeterNumber?.trim()) {
          savedMeters.push({
            id: "water",
            service: "Water",
            number: moveIn.waterMeterNumber.trim(),
            propertyTitle,
          });
        }

        setTenancyMeters(savedMeters);
      } catch {
        // No active tenancy or recorded meters must not block utility access.
        if (!cancelled) setTenancyMeters([]);
      }
    }

    setLoading(true);
    setError("");

    void Promise.all([
      loadCatalogue(),
      loadPurchases(),
      loadTenancyMeters(),
    ]).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    if (!category) {
      setBillers([]);
      return;
    }
    let cancelled = false;

    async function load() {
      try {
        const response = await apiFetch<ApiResponse<unknown>>(
          `/api/v1/payments/bills/categories/${encodeURIComponent(category)}/billers`,
          getToken,
        );
        if (!cancelled) setBillers(rows(response.data));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load providers.");
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [category, getToken]);

  useEffect(() => {
    if (!biller) {
      setItems([]);
      return;
    }
    let cancelled = false;

    async function load() {
      try {
        const response = await apiFetch<ApiResponse<unknown>>(
          `/api/v1/payments/bills/billers/${encodeURIComponent(biller)}/items`,
          getToken,
        );
        if (!cancelled) setItems(rows(response.data));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load bill options.");
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [biller, getToken]);

  async function validateAccount() {
    if (!item || !customer.trim()) {
      setError("Select a bill type and enter the meter or account number.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    setValidated(null);

    try {
      if (["AIRTIME", "MOBILEDATA"].includes(category.toUpperCase())) {
        setValidated({ customer: customer.trim() });
        setNotice("This service does not require provider validation. Check the entered number carefully.");
        return;
      }

      const response = await apiFetch<ApiResponse<unknown>>(
        `/api/v1/payments/bills/validate?itemCode=${encodeURIComponent(item)}&customer=${encodeURIComponent(customer.trim())}`,
        getToken,
      );
      const wrapper = response.data && typeof response.data === "object"
        ? response.data as Row
        : {};
      const result = wrapper.data && typeof wrapper.data === "object"
        ? wrapper.data as Row
        : {};
      const responseCode = str(result.response_code);

      if (
        responseCode &&
        !["00", "0", "200"].includes(responseCode)
      ) {
        throw new Error(str(result.response_message) || "The provider could not validate this account.");
      }
      if (!responseCode && !str(result.customer)) {
        throw new Error("The provider did not confirm this account.");
      }

      setValidated(result);
      setNotice(
        str(result.name)
          ? `Account validated for ${str(result.name)}.`
          : "The provider validated this account.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account validation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function checkout() {
    if (!category || !biller || !item || !validated) {
      setError("Select a service, validate the account and review the amount.");
      return;
    }
    if (!Number.isFinite(utilityAmount) || utilityAmount <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await apiFetch<ApiResponse<{
        paymentLink: string;
        reference: string;
      }>>(
        "/api/v1/payments/bills/initialize",
        getToken,
        {
          method: "POST",
          body: JSON.stringify({
            categoryCode: category,
            billerCode: biller,
            itemCode: item,
            customerId: customer.trim(),
            amount: utilityAmount,
            idempotencyKey: crypto.randomUUID(),
          }),
        },
      );

      if (!response.data?.paymentLink) {
        throw new Error("Flutterwave did not return a checkout link.");
      }
      window.location.assign(response.data.paymentLink);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start checkout.");
      setBusy(false);
    }
  }

  async function refreshPurchase(id: string) {
    setBusy(true);
    setError("");
    try {
      await apiFetch<ApiResponse<Purchase>>(
        `/api/v1/payments/bills/purchases/${encodeURIComponent(id)}/status`,
        getToken,
      );
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to refresh provider status.");
    } finally {
      setBusy(false);
    }
  }

  if (!isLoaded || (isSignedIn && loading)) {
    return (
      <>
        <TopAppBar title="Utility Payments" />
        <main className="mx-auto max-w-5xl px-4 py-8">
          <Card><div className="flex items-center gap-3 p-5 text-sm text-slate-600">
            <RefreshCw className="h-5 w-5 animate-spin" /> Loading utility services...
          </div></Card>
        </main>
      </>
    );
  }

  if (!isSignedIn) {
    return (
      <>
        <TopAppBar title="Utility Payments" />
        <main className="mx-auto max-w-5xl px-4 py-8">
          <Card><p className="p-5 text-sm text-slate-600">Sign in to access utility payments.</p></Card>
        </main>
      </>
    );
  }

  return (
    <>
      <TopAppBar title="Utility Payments" />
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <section>
          <p className="text-sm font-medium text-slate-500">Tenant workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Utility Payments</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Pay electricity, water, internet, cable and other supported services.
            You can enter any valid meter or account number, even for a property
            you do not own or rent. An active tenancy is not required.
          </p>
        </section>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" /> {error}
          </div>
        )}
        {notice && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" /> {notice}
          </div>
        )}

        <Card>
          <div className="space-y-5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-100">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Make a utility payment</h2>
                <p className="text-sm text-slate-500">Choose a provider and validate the recipient account.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Service category
                <select className={fieldClass} value={category} onChange={(e) => {
                  setCategory(e.target.value);
                  setSelectedTenancyMeter("");
                  setBiller("");
                  setItem("");
                  setCustomer("");
                  setAmount("");
                  setValidated(null);
                }}>
                  <option value="">Select a category</option>
                  {categories.map((entry, index) => {
                    const code = codeOf(entry, ["code", "category_code", "id"]);
                    return <option key={`${code}-${index}`} value={code}>
                      {nameOf(entry, ["name", "label", "category_name"], code)}
                    </option>;
                  })}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Provider
                <select className={fieldClass} value={biller} onChange={(e) => {
                  setBiller(e.target.value);
                  setItem("");
                  setCustomer("");
                  setAmount("");
                  setValidated(null);
                }} disabled={!category}>
                  <option value="">Select a provider</option>
                  {billers.map((entry, index) => {
                    const code = codeOf(entry, ["biller_code", "billerCode"]);
                    return <option key={`${code}-${index}`} value={code}>
                      {nameOf(entry, ["name", "biller_name", "short_name"], code)}
                    </option>;
                  })}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Bill type / package
                <select className={fieldClass} value={item} onChange={(e) => {
                  const code = e.target.value;
                  setItem(code);
                  setCustomer("");
                  setValidated(null);
                  const selected = items.find(
                    (entry) => codeOf(entry, ["item_code", "itemCode"]) === code,
                  );
                  const fixed = Number(selected?.amount ?? 0);
                  setAmount(fixed > 0 ? String(fixed) : "");
                }} disabled={!biller}>
                  <option value="">Select a bill option</option>
                  {items.map((entry, index) => {
                    const code = codeOf(entry, ["item_code", "itemCode"]);
                    const fixed = Number(entry.amount ?? 0);
                    return <option key={`${code}-${index}`} value={code}>
                      {nameOf(entry, ["name", "short_name", "biller_name"], code)}
                      {fixed > 0 ? ` — ${money(fixed)}` : ""}
                    </option>;
                  })}
                </select>
              </label>

              {availableTenancyMeters.length > 0 && (
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  Use a meter from my tenancy
                  <select
                    className={fieldClass}
                    value={selectedTenancyMeter}
                    onChange={(e) => {
                      const meterId = e.target.value;
                      setSelectedTenancyMeter(meterId);
                      const saved = availableTenancyMeters.find(
                        (entry) => entry.id === meterId,
                      );

                      setCustomer(saved?.number ?? "");
                      setValidated(null);
                      setError("");
                      setNotice(
                        saved
                          ? `${saved.service} meter selected from ${saved.propertyTitle}.`
                          : "",
                      );
                    }}
                  >
                    <option value="">Enter another meter/account manually</option>
                    {availableTenancyMeters.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.service}: {entry.number} ({entry.propertyTitle})
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    Select a saved meter to fill the account number automatically.
                  </span>
                </label>
              )}

              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                {selectedItem ? nameOf(selectedItem, ["label_name", "labelName"], "Meter / account number") : "Meter / account number"}
                <input className={fieldClass} value={customer} maxLength={120}
                  autoComplete="off" placeholder="Enter the meter or account number"
                  onChange={(e) => {
                    setCustomer(e.target.value);
                    setValidated(null);
                    setNotice("");
                  }} />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Utility amount (₦)
                <input className={fieldClass} type="number" min="1" max="5000000"
                  step="0.01" value={amount}
                  disabled={fixedAmount > 0}
                  placeholder="Enter amount"
                  onChange={(e) => setAmount(e.target.value)} />
                {fixedAmount > 0 && <span className="text-xs font-normal text-slate-500">Fixed-price provider package.</span>}
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="text-slate-500">Provider fee</p>
                <p className="mt-1 font-semibold">{money(providerFee || 0)}</p>
                <p className="mt-3 text-slate-500">Estimated checkout total</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{money(total || 0)}</p>
              </div>
            </div>

            {validated && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-semibold">Account validated by provider</p>
                {str(validated.name) && <p className="mt-1">Customer: {str(validated.name)}</p>}
                {str(validated.address) && <p className="mt-1">Address: {str(validated.address)}</p>}
                <p className="mt-1 break-all">Account: {customer}</p>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 disabled:opacity-50"
                disabled={!item || !customer.trim() || busy}
                onClick={validateAccount}>
                Validate account
              </button>
              <button type="button" className={buttonClass}
                disabled={!validated || busy || !Number.isFinite(total) || total <= 0}
                onClick={checkout}>
                {busy ? "Processing..." : "Continue to secure payment"}
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Flutterwave checkout confirmation and provider delivery confirmation
              are tracked separately. Payment success does not mean the utility
              has already been delivered.
            </p>
          </div>
        </Card>

        <Card>
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Your utility purchases</h2>
                <p className="text-sm text-slate-500">Payment and delivery history.</p>
              </div>
              <button type="button" aria-label="Refresh purchase history"
                className="rounded-lg border border-slate-300 p-2"
                onClick={() => loadHistory().catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to refresh history."))}>
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {history.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">No utility purchases yet.</p>
            ) : history.map((purchase) => (
              <div key={purchase.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{purchase.billerName}</p>
                    <p className="mt-1 text-sm text-slate-600">{purchase.itemName}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">
                      {purchase.customerLabel || "Account"}: {purchase.customerId}
                    </p>
                    <p className="mt-1 break-all text-xs text-slate-500">Ref: {purchase.payment.reference}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-semibold text-slate-900">{money(purchase.amount, purchase.currency)}</p>
                    <span className="mt-2 inline-block rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                      {statusLabel(purchase.status)}
                    </span>
                  </div>
                </div>

                {purchase.providerMessage && <p className="mt-3 text-xs text-slate-500">{purchase.providerMessage}</p>}

                {purchase.providerToken && (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-xs font-semibold text-emerald-800">Provider token / code</p>
                    <p className="mt-1 break-all font-mono text-lg font-bold text-emerald-950">{purchase.providerToken}</p>
                  </div>
                )}

                {!["SUCCESS", "FAILED"].includes(purchase.status) && (
                  <button type="button" disabled={busy}
                    className="mt-3 text-xs font-semibold text-slate-700 underline disabled:opacity-50"
                    onClick={() => refreshPurchase(purchase.id)}>
                    Check delivery status
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>

        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />
          <p className="text-sm text-slate-600">
            Purchases belong to your Aviritech account and are not tied to a
            property, active lease or move-in record.
          </p>
        </div>
      </main>
    </>
  );
}
