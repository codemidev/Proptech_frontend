import { Search, X } from "lucide-react";
import type { AgentGovernanceFilters } from "@/lib/agent-governance";

export function AgentQueueFilters({
  filters,
  onChange,
  onClear,
}: {
  filters: AgentGovernanceFilters;
  onChange: (filters: AgentGovernanceFilters) => void;
  onClear: () => void;
}) {
  const active =
    Boolean(filters.search.trim()) ||
    filters.status !== "ALL" ||
    filters.tier !== "ALL" ||
    filters.verification !== "ALL";

  return (
    <div className="border-b border-slate-100 p-4 sm:p-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="font-bold text-slate-900">Verification queue</h2>
          <p className="mt-1 text-xs text-slate-500">Organization-scoped Agent review and administration.</p>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row">
          <label className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              placeholder="Search Agent"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 sm:w-64"
            />
          </label>

          <select value={filters.status} onChange={(e) => onChange({ ...filters, status: e.target.value as AgentGovernanceFilters["status"] })} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
            <option value="ALL">All statuses</option>
            <option value="PENDING_APPROVAL">Pending approval</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="REJECTED">Rejected</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <select value={filters.tier} onChange={(e) => onChange({ ...filters, tier: e.target.value as AgentGovernanceFilters["tier"] })} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
            <option value="ALL">All tiers</option>
            <option value="UNASSIGNED">Unassigned</option>
            <option value="TIER_1">Tier 1</option>
            <option value="TIER_2">Tier 2</option>
            <option value="TIER_3">Tier 3</option>
          </select>

          <select value={filters.verification} onChange={(e) => onChange({ ...filters, verification: e.target.value as AgentGovernanceFilters["verification"] })} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
            <option value="ALL">All verification</option>
            <option value="VERIFIED">Verified</option>
            <option value="NOT_VERIFIED">Not verified</option>
          </select>

          {active && (
            <button type="button" onClick={onClear} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              <X size={15} /> Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
