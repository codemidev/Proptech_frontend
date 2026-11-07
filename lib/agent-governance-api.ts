import { apiFetch, type GetToken } from "@/lib/api";
import type {
  AgentAuditResponse,
  AgentClearanceTier,
  AgentGovernanceStats,
  AgentMutationResponse,
  AgentQueueResponse,
  AdminAgent,
  Pagination,
} from "@/lib/agent-governance";

function normalizeAgent(value: unknown): AdminAgent | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || typeof item.email !== "string") return null;

  const tier: AgentClearanceTier | null =
    item.agentClearanceTier === "TIER_1" ||
    item.agentClearanceTier === "TIER_2" ||
    item.agentClearanceTier === "TIER_3"
      ? item.agentClearanceTier
      : null;

  return {
    id: item.id,
    clerkId: typeof item.clerkId === "string" ? item.clerkId : null,
    email: item.email,
    firstName: typeof item.firstName === "string" ? item.firstName : null,
    lastName: typeof item.lastName === "string" ? item.lastName : null,
    status: typeof item.status === "string" ? item.status : "ACTIVE",
    isVerified: typeof item.isVerified === "boolean" ? item.isVerified : false,
    isActive: typeof item.isActive === "boolean" ? item.isActive : true,
    agentClearanceTier: tier,
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : null,
    organization:
      item.organization && typeof item.organization === "object"
        ? (item.organization as AdminAgent["organization"])
        : null,
  };
}

function extractQueue(payload: AgentQueueResponse) {
  if (Array.isArray(payload.data)) {
    return {
      agents: payload.data
        .map(normalizeAgent)
        .filter((item): item is AdminAgent => Boolean(item)),
      pagination: undefined,
    };
  }

  const data = payload.data && typeof payload.data === "object"
    ? payload.data
    : {};
  const raw = data as Record<string, unknown>;
  const source =
    Array.isArray(raw.agents)
      ? raw.agents
      : Array.isArray(raw.users)
        ? raw.users
        : Array.isArray(raw.items)
          ? raw.items
          : Array.isArray(raw.results)
            ? raw.results
            : [];

  return {
    agents: source
      .map(normalizeAgent)
      .filter((item): item is AdminAgent => Boolean(item)),
    pagination:
      raw.pagination && typeof raw.pagination === "object"
        ? (raw.pagination as Pagination)
        : undefined,
  };
}

export async function getAgentVerificationQueue(getToken: GetToken) {
  const response = await apiFetch<AgentQueueResponse>(
    "/api/v1/admin/dashboard/agents/verification?page=1&limit=100",
    getToken,
  );
  return extractQueue(response);
}

export async function getAgentVerificationStats(
  getToken: GetToken,
  fallback: AgentGovernanceStats,
) {
  try {
    const response = await apiFetch<{
      success: boolean;
      data?: Record<string, unknown>;
    }>(
      "/api/v1/admin/dashboard/agents/verification/stats",
      getToken,
    );
    const data = response.data ?? {};
    const number = (...keys: string[]) => {
      for (const key of keys) {
        const value = data[key];
        if (typeof value === "number" && Number.isFinite(value)) return value;
      }
      return null;
    };
    return {
      total: number("total", "totalAgents") ?? fallback.total,
      pending:
        number("pending", "pendingAgents", "pendingApproval") ?? fallback.pending,
      active: number("active", "activeAgents", "approvedAgents") ?? fallback.active,
      suspended: number("suspended", "suspendedAgents") ?? fallback.suspended,
      rejected: number("rejected", "rejectedAgents") ?? fallback.rejected,
      tier1: number("tier1", "tier1Agents") ?? fallback.tier1,
      tier2: number("tier2", "tier2Agents") ?? fallback.tier2,
      tier3: number("tier3", "tier3Agents") ?? fallback.tier3,
    } satisfies AgentGovernanceStats;
  } catch {
    return fallback;
  }
}

export function approveAgent(
  agentId: string,
  clearanceTier: AgentClearanceTier,
  getToken: GetToken,
) {
  return apiFetch<AgentMutationResponse>(
    `/api/v1/admin/dashboard/agents/${encodeURIComponent(agentId)}/verification`,
    getToken,
    {
      method: "PATCH",
      body: JSON.stringify({ action: "APPROVE", clearanceTier }),
    },
  );
}

export function rejectAgent(
  agentId: string,
  reason: string,
  getToken: GetToken,
) {
  return apiFetch<AgentMutationResponse>(
    `/api/v1/admin/dashboard/agents/${encodeURIComponent(agentId)}/verification`,
    getToken,
    {
      method: "PATCH",
      body: JSON.stringify({ action: "REJECT", reason: reason.trim() }),
    },
  );
}

export function changeAgentTier(
  agentId: string,
  clearanceTier: AgentClearanceTier,
  reason: string,
  getToken: GetToken,
) {
  return apiFetch<AgentMutationResponse>(
    `/api/v1/admin/dashboard/agents/${encodeURIComponent(agentId)}/tier`,
    getToken,
    {
      method: "PATCH",
      body: JSON.stringify({ clearanceTier, reason: reason.trim() }),
    },
  );
}

export function suspendAgent(
  agentId: string,
  reason: string,
  getToken: GetToken,
) {
  return apiFetch<AgentMutationResponse>(
    `/api/v1/admin/dashboard/agents/${encodeURIComponent(agentId)}/status`,
    getToken,
    {
      method: "PATCH",
      body: JSON.stringify({ action: "SUSPEND", reason: reason.trim() }),
    },
  );
}

export function reactivateAgent(
  agentId: string,
  reason: string | undefined,
  getToken: GetToken,
) {
  return apiFetch<AgentMutationResponse>(
    `/api/v1/admin/dashboard/agents/${encodeURIComponent(agentId)}/status`,
    getToken,
    {
      method: "PATCH",
      body: JSON.stringify({
        action: "REACTIVATE",
        ...(reason?.trim() ? { reason: reason.trim() } : {}),
      }),
    },
  );
}

export async function getAgentAuditHistory(
  getToken: GetToken,
  params: { search?: string; action?: string; agentId?: string; page?: number },
) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: "50",
  });
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.action && params.action !== "ALL") query.set("action", params.action);
  if (params.agentId && params.agentId !== "ALL") query.set("agentId", params.agentId);

  return apiFetch<AgentAuditResponse>(
    `/api/v1/admin/dashboard/agents/audit?${query.toString()}`,
    getToken,
  );
}
