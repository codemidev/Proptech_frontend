"use client";

import PaymentSettings from "@/components/admin/PaymentSettings";
import KYCSettings from "@/components/admin/KYCSettings";
import AirtimeCashSettings from "@/components/admin/AirtimeCashSettings";
import PrivyVaultSettings from "@/components/admin/PrivyVaultSettings";

export default function AdminSettingsPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f5] text-gray-950">
      <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-6">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            System
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Settings
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Configure platform-wide payment, KYC, and monetization settings.
          </p>
        </div>

        <PaymentSettings />
        <KYCSettings />
        <AirtimeCashSettings />
        <PrivyVaultSettings />
      </div>
    </main>
  );
}
