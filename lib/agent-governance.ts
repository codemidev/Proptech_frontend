export type AgentClearanceTier = "TIER_1" | "TIER_2" | "TIER_3";

export type AgentStatus =
  | "PENDING_APPROVAL"
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "REJECTED"
  | "DELETED"
  | string;

export type AgentVerificationAction = "APPROVE" | "REJECT";
export type AgentStatusAction = "SUSPEND" | "REACTIVATE";

export type VerificationFilter = "ALL" | "VERIFIED" | "NOT_VERIFIED";
export type TierFilter = "ALL" | "UNASSIGNED" | AgentClearanceTier;
export type StatusFilter = "ALL" | AgentStatus;

export type AgentGovernanceFilters = {
  search: string;
  status: StatusFilter;
  tier: TierFilter;
  verification: VerificationFilter;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminAgent = {
  id: string;
  clerkId?: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: AgentStatus;
  isVerified: boolean;
  isActive: boolean;
  agentClearanceTier: AgentClearanceTier | null;
  updatedAt?: string | null;
  organization?: {
    id?: string | null;
    name?: string | null;
    slug?: string | null;
  } | null;
};

export type AgentGovernanceStats = {
  total: number;
  pending: number;
  active: number;
  suspended: number;
  rejected: number;
  tier1: number;
  tier2: number;
  tier3: number;
};

export type AgentQueueResponse = {
  success: boolean;
  data:
    | AdminAgent[]
    | {
        agents?: unknown[];
        users?: unknown[];
        items?: unknown[];
        results?: unknown[];
        pagination?: Pagination;
      };
};

export type AgentMutationResponse = {
  success: boolean;
  message?: string;
  data?: unknown;
};

export type AgentAuditRecord = {
  id: string;
  action: string;
  eventAction: string | null;
  entity: string;
  entityId: string;
  description: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  actor: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  agent: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    agentClearanceTier: AgentClearanceTier | null;
    status: string;
  } | null;
};

export type AgentAuditResponse = {
  success: boolean;
  data: {
    logs: AgentAuditRecord[];
    pagination: Pagination;
  };
};

export function agentDisplayName(
  agent: Pick<AdminAgent, "firstName" | "lastName">,
) {
  return (
    [agent.firstName, agent.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "Unnamed Agent"
  );
}

export function tierLabel(tier: AgentClearanceTier | null | undefined) {
  return tier ? tier.replace("TIER_", "Tier ") : "Unassigned";
}

export function statusLabel(status: string | null | undefined) {
  return (
    status || "UNKNOWN"
  )
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
