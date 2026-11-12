"use client";

import { AgentClearanceStatusCard } from "@/components/agent/AgentClearanceStatusCard";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth, useUser, UserButton } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

type InspectionStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "MISSED"
  | "REJECTED";

type LandVaultStatus =
  | "DRAFT"
  | "PAYMENT_PENDING"
  | "PAYMENT_CONFIRMED"
  | "OWNER_COMPLETION_REQUIRED"
  | "OWNER_COMPLETED"
  | "DUE_DILIGENCE_PENDING"
  | "UNDER_DUE_DILIGENCE"
  | "AGENT_APPROVED"
  | "AGENT_REJECTED"
  | "ADMIN_REVIEW"
  | "ADMIN_APPROVED"
  | "ADMIN_REJECTED"
  | "BLOCKCHAIN_PENDING"
  | "BLOCKCHAIN_ANCHORED"
  | "CERTIFIED"
  | "SUSPENDED"
  | "ARCHIVED";

type Inspection = {
  id: string;
  createdAt: string;
  scheduledAt: string;
  status: InspectionStatus;
  remarks?: string | null;
  property: {
    id: string;
    title: string;
    address?: {
      addressLine1?: string | null;
    } | null;
  };
  booking?: {
    customer?: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
    } | null;
  } | null;
};

type LandVaultEvent = {
  id: string;
  type: string;
  status: LandVaultStatus;
  description?: string | null;
  actorId: string;
  createdAt: string;
};

type LandVault = {
  id: string;
  vaultCode: string;
  status: LandVaultStatus;
  propertyId: string;
  paymentCompletedAt?: string | null;
  ownerCompletedAt?: string | null;
  ownerSubmittedAt?: string | null;
  agentSubmittedToAdminAt?: string | null;
  adminApprovedAt?: string | null;
  blockchainRequestedAt?: string | null;
  blockchainAnchoredAt?: string | null;
  certifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  property: {
    id: string;
    title?: string | null;
    propertyCode?: string | null;
    agentId?: string | null;
    address?: {
      addressLine1?: string | null;
      city?: string | null;
      state?: string | null;
    } | null;
  };
  verificationEvents?: LandVaultEvent[];
};

type InspectionsResponse = {
  success: boolean;
  data: Inspection[];
};

type LandVaultResponse = {
  success: boolean;
  data: LandVault[];
};

type AgentProfile = {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  avatar?: string | null;
  status: string;
  isVerified: boolean;
  isActive: boolean;
  organizationId: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
    type: string;
    isActive: boolean;
  } | null;
  roles?: Array<{
    role: {
      name: string;
      description?: string | null;
    };
  }>;
};

type AgentProfileResponse = {
  success: boolean;
  data: AgentProfile;
};

type AgentProperty = {
  id: string;
  title: string;
  propertyCode?: string | null;
  listingType: string;
  status: string;
  price: number | string;
  currency?: string | null;
  owner?: {
    id: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  propertyType?: {
    id: string;
    name?: string | null;
  } | null;
};

type AgentPropertiesResponse = {
  success: boolean;
  data: AgentProperty[];
};

type AgentPayoutBankDetails = {
  bankCode: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
};

type AgentPayoutBankResponse = {
  success: boolean;
  data: {
    bankCode: string | null;
    bankName: string | null;
    accountName: string | null;
    accountNumber: string | null;
  };
};

type AgentPayoutEarning = {
  id: string;
  amount: string;
  percentage: string | null;
  currency: string;
  createdAt: string;
  paymentReference: string;
  source?: string;
};

type AgentPayoutEarnings = {
  commissions: AgentPayoutEarning[];
  referralRewards: AgentPayoutEarning[];
};

type AgentPayoutEarningsResponse = {
  success: boolean;
  data: AgentPayoutEarnings;
};

type AgentPropertyDetail = AgentProperty & {
  description?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  toilets?: number | null;
  kitchens?: number | null;
  parkingSpaces?: number | null;
  verified?: boolean;
  featured?: boolean;
  owner?: AgentProperty["owner"] & {
    phoneNumber?: string | null;
    isActive?: boolean;
    status?: string | null;
  };
  address?: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    landmark?: string | null;
    postalCode?: string | null;
    country?: { name?: string | null } | null;
    state?: { name?: string | null } | null;
    localGovernment?: { name?: string | null } | null;
    city?: { name?: string | null } | null;
    district?: { name?: string | null } | null;
    estate?: { name?: string | null } | null;
    building?: { name?: string | null } | null;
    unit?: {
      unitNumber?: string | null;
      name?: string | null;
    } | null;
  } | null;
  amenities?: Array<{
    id: string;
    amenity?: {
      id: string;
      name?: string | null;
      description?: string | null;
    } | null;
  }>;
};

type AgentPropertyDetailResponse = {
  success: boolean;
  data?: AgentPropertyDetail;
  message?: string;
};


type AgentClient = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  isVerified?: boolean;
};

type AgentClientsResponse = {
  success: boolean;
  data: AgentClient[];
};

type AgentPropertyType = {
  id: string;
  name: string;
};

type AgentPropertyTypesResponse = {
  success: boolean;
  data: AgentPropertyType[];
};

type CreateAgentPropertyResponse = {
  success: boolean;
  message?: string;
  data?: AgentProperty;
};



type AgentLandVaultTransition =
  | "UNDER_DUE_DILIGENCE"
  | "AGENT_APPROVED"
  | "AGENT_REJECTED"
  | "DUE_DILIGENCE_PENDING"
  | "ADMIN_REVIEW";

const LAND_VAULT_STATUSES: LandVaultStatus[] = [
  "DRAFT",
  "PAYMENT_PENDING",
  "PAYMENT_CONFIRMED",
  "OWNER_COMPLETION_REQUIRED",
  "OWNER_COMPLETED",
  "DUE_DILIGENCE_PENDING",
  "UNDER_DUE_DILIGENCE",
  "AGENT_APPROVED",
  "AGENT_REJECTED",
  "ADMIN_REVIEW",
  "ADMIN_APPROVED",
  "ADMIN_REJECTED",
  "BLOCKCHAIN_PENDING",
  "BLOCKCHAIN_ANCHORED",
  "CERTIFIED",
  "SUSPENDED",
  "ARCHIVED",
];

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusClass(status: string) {
  switch (status) {
    case "CERTIFIED":
    case "ADMIN_APPROVED":
    case "AGENT_APPROVED":
    case "BLOCKCHAIN_ANCHORED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "AGENT_REJECTED":
    case "ADMIN_REJECTED":
    case "SUSPENDED":
      return "bg-red-50 text-red-700 border-red-200";

    case "UNDER_DUE_DILIGENCE":
    case "ADMIN_REVIEW":
    case "BLOCKCHAIN_PENDING":
      return "bg-amber-50 text-amber-700 border-amber-200";

    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getCustomerName(inspection: Inspection) {
  const customer = inspection.booking?.customer;

  if (!customer) return "Customer";

  const name = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || customer.email || "Customer";
}

function getLandVaultStage(vault: LandVault) {
  if (vault.certifiedAt || vault.status === "CERTIFIED") {
    return "Certified";
  }

  if (
    vault.blockchainAnchoredAt ||
    vault.status === "BLOCKCHAIN_ANCHORED"
  ) {
    return "Blockchain anchored";
  }

  if (
    vault.adminApprovedAt ||
    vault.status === "ADMIN_APPROVED"
  ) {
    return "Admin approved";
  }

  if (
    vault.agentSubmittedToAdminAt ||
    vault.status === "ADMIN_REVIEW"
  ) {
    return "Submitted to admin";
  }

  if (vault.status === "AGENT_APPROVED") {
    return "Agent approved";
  }

  if (vault.status === "AGENT_REJECTED") {
    return "Agent rejected";
  }

  if (vault.status === "UNDER_DUE_DILIGENCE") {
    return "Under due diligence";
  }

  if (
    vault.ownerSubmittedAt ||
    vault.status === "DUE_DILIGENCE_PENDING"
  ) {
    return "Awaiting verification";
  }

  if (vault.status === "OWNER_COMPLETED") {
    return "Owner completed";
  }

  return formatStatus(vault.status);
}

export default function AgentDashboard() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [inspectionPage, setInspectionPage] = useState(1);
  const inspectionsPerPage = 10;
  const [landVaults, setLandVaults] = useState<LandVault[]>([]);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [agentProperties, setAgentProperties] = useState<AgentProperty[]>([]);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [payoutBank, setPayoutBank] = useState<AgentPayoutBankDetails>({
    bankCode: "",
    bankName: "",
    accountName: "",
    accountNumber: "",
  });
  const [payoutEarnings, setPayoutEarnings] = useState<AgentPayoutEarnings>({
    commissions: [],
    referralRewards: [],
  });
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [payoutError, setPayoutError] = useState("");
  const [payoutNotice, setPayoutNotice] = useState("");
  const [shareLoadingId, setShareLoadingId] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState("");
  const [selectedProperty, setSelectedProperty] =
    useState<AgentPropertyDetail | null>(null);
  const [propertyDetailLoading, setPropertyDetailLoading] = useState(false);
  const [propertyDetailError, setPropertyDetailError] = useState("");
  const [propertyDetailId, setPropertyDetailId] = useState<string | null>(null);
  const [landlords, setLandlords] = useState<AgentClient[]>([]);
  const [tenants, setTenants] = useState<AgentClient[]>([]);
  const [activeTenancies, setActiveTenancies] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingInspection, setUpdatingInspection] = useState<string | null>(
    null,
  );
  const [updatingLandVault, setUpdatingLandVault] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");

  const [showAddProperty, setShowAddProperty] = useState(false);
  const [propertyTypes, setPropertyTypes] = useState<AgentPropertyType[]>([]);
  const [propertyTypesLoading, setPropertyTypesLoading] = useState(false);
  const [propertyTypesError, setPropertyTypesError] = useState("");
  const [creatingProperty, setCreatingProperty] = useState(false);
  const [createPropertyError, setCreatePropertyError] = useState("");
  const [createPropertySuccess, setCreatePropertySuccess] = useState("");

  const [showCreateOwner, setShowCreateOwner] = useState(false);
  const [creatingOwner, setCreatingOwner] = useState(false);
  const [createOwnerError, setCreateOwnerError] = useState("");
  const [createOwnerSuccess, setCreateOwnerSuccess] = useState("");

  const [newOwner, setNewOwner] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
  });

  const [newProperty, setNewProperty] = useState({
    title: "",
    listingType: "RENT",
    propertyTypeId: "",
    ownerId: "",
    description: "",
    price: "",
    currency: "NGN",
    bedrooms: "",
    bathrooms: "",
  });


  async function loadPropertyDetails(propertyId: string) {
    setPropertyDetailId(propertyId);
    setSelectedProperty(null);
    setPropertyDetailError("");
    setPropertyDetailLoading(true);

    try {
      const response = await apiFetch<AgentPropertyDetailResponse>(
        `/api/v1/agents/me/properties/${propertyId}`,
        getToken,
      );

      if (!response.success || !response.data) {
        throw new Error(
          response.message || "Unable to load property details",
        );
      }

      setSelectedProperty(response.data);
    } catch (err) {
      setPropertyDetailError(
        err instanceof Error
          ? err.message
          : "Unable to load property details",
      );
    } finally {
      setPropertyDetailLoading(false);
    }
  }

  function closePropertyDetails() {
    setSelectedProperty(null);
    setPropertyDetailError("");
    setPropertyDetailLoading(false);
    setPropertyDetailId(null);
  }


  async function loadPropertyTypes() {
    if (!isLoaded || !isSignedIn) return;

    setPropertyTypesLoading(true);
    setPropertyTypesError("");

    try {
      const response = await apiFetch<AgentPropertyTypesResponse>(
        "/api/v1/property-types",
        getToken,
      );

      setPropertyTypes(response.data ?? []);
    } catch (err) {
      setPropertyTypesError(
        err instanceof Error
          ? err.message
          : "Unable to load property types",
      );
    } finally {
      setPropertyTypesLoading(false);
    }
  }

  function openAddProperty() {
    setCreatePropertyError("");
    setCreatePropertySuccess("");

    setNewProperty({
      title: "",
      listingType: "RENT",
      propertyTypeId: propertyTypes[0]?.id ?? "",
      ownerId: landlords[0]?.id ?? "",
      description: "",
      price: "",
      currency: "NGN",
      bedrooms: "",
      bathrooms: "",
    });

    setShowAddProperty(true);
  }

  function closeAddProperty() {
    if (creatingProperty) return;

    setShowAddProperty(false);
    setCreatePropertyError("");
    setCreatePropertySuccess("");
  }

  function openCreateOwner() {
    setCreateOwnerError("");
    setCreateOwnerSuccess("");
    setNewOwner({
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
    });
    setShowCreateOwner(true);
  }

  function closeCreateOwner() {
    if (creatingOwner) return;

    setShowCreateOwner(false);
    setCreateOwnerError("");
    setCreateOwnerSuccess("");
  }

  async function createPropertyOwner() {
    setCreateOwnerError("");
    setCreateOwnerSuccess("");

    const firstName = newOwner.firstName.trim();
    const lastName = newOwner.lastName.trim();
    const email = newOwner.email.trim().toLowerCase();
    const phoneNumber = newOwner.phoneNumber.trim();

    if (!firstName || firstName.length < 1) {
      setCreateOwnerError("First name is required.");
      return;
    }

    if (!lastName || lastName.length < 1) {
      setCreateOwnerError("Last name is required.");
      return;
    }

    if (!email || !email.includes("@")) {
      setCreateOwnerError("Enter a valid email address.");
      return;
    }

    setCreatingOwner(true);

    try {
      const response = await apiFetch<{
        success: boolean;
        message?: string;
        data?: AgentClient & {
          phoneNumber?: string | null;
          organizationId?: string | null;
        };
      }>(
        "/api/v1/agents/me/property-owners",
        getToken,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            ...(phoneNumber ? { phoneNumber } : {}),
          }),
        },
      );

      if (!response?.data?.id) {
        throw new Error(
          response?.message || "Property owner account could not be created.",
        );
      }

      const createdOwner = response.data;

      setLandlords((current) => {
        const withoutDuplicate = current.filter(
          (owner) => owner.id !== createdOwner.id,
        );
        return [createdOwner, ...withoutDuplicate];
      });

      setNewProperty((current) => ({
        ...current,
        ownerId: createdOwner.id,
      }));

      setCreateOwnerSuccess(
        `${firstName} ${lastName} has been created and selected as the property owner.`,
      );

      window.setTimeout(() => {
        setShowCreateOwner(false);
        setCreateOwnerSuccess("");
      }, 900);
    } catch (error) {
      setCreateOwnerError(
        error instanceof Error
          ? error.message
          : "Unable to create the property owner.",
      );
    } finally {
      setCreatingOwner(false);
    }
  }

  async function createAgentProperty() {
    setCreatePropertyError("");
    setCreatePropertySuccess("");

    const title = newProperty.title.trim();
    const price = Number(newProperty.price);

    if (!title || title.length < 3) {
      setCreatePropertyError("Property title must be at least 3 characters.");
      return;
    }

    if (!newProperty.propertyTypeId) {
      setCreatePropertyError("Select a property type.");
      return;
    }

    if (!newProperty.ownerId) {
      setCreatePropertyError("Select the property owner.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setCreatePropertyError("Enter a valid property price.");
      return;
    }

    setCreatingProperty(true);

    try {
      const payload: Record<string, unknown> = {
        title,
        listingType: newProperty.listingType,
        propertyTypeId: newProperty.propertyTypeId,
        ownerId: newProperty.ownerId,
        price,
        currency: newProperty.currency,
      };

      if (newProperty.description.trim()) {
        payload.description = newProperty.description.trim();
      }

      if (newProperty.bedrooms !== "") {
        const bedrooms = Number(newProperty.bedrooms);

        if (!Number.isInteger(bedrooms) || bedrooms < 0) {
          throw new Error("Bedrooms must be a non-negative whole number.");
        }

        payload.bedrooms = bedrooms;
      }

      if (newProperty.bathrooms !== "") {
        const bathrooms = Number(newProperty.bathrooms);

        if (!Number.isInteger(bathrooms) || bathrooms < 0) {
          throw new Error("Bathrooms must be a non-negative whole number.");
        }

        payload.bathrooms = bathrooms;
      }

      const response = await apiFetch<CreateAgentPropertyResponse>(
        "/api/v1/agents/me/properties",
        getToken,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.success) {
        throw new Error(response.message || "Unable to create property");
      }

      setCreatePropertySuccess(
        response.message || "Property created successfully.",
      );

      await loadDashboard();

      window.setTimeout(() => {
        setShowAddProperty(false);
        setCreatePropertySuccess("");
      }, 900);
    } catch (err) {
      setCreatePropertyError(
        err instanceof Error
          ? err.message
          : "Unable to create property",
      );
    } finally {
      setCreatingProperty(false);
    }
  }


  async function copyAgentReferralLink() {
    if (!referralCode) return;

    try {
      const url = new URL("/sign-up", window.location.origin);
      url.searchParams.set("ref", referralCode);
      await navigator.clipboard.writeText(url.toString());
      setShareMessage("Agent invitation link copied.");
    } catch {
      setShareMessage("Unable to copy the invitation link. Check clipboard permissions.");
    }
  }

  async function copyPropertyShareLink(propertyId: string) {
    setShareLoadingId(propertyId);
    setShareMessage("");

    try {
      const response = await apiFetch<{
        success: boolean;
        data: { path: string };
      }>(
        `/api/v1/agents/me/properties/${encodeURIComponent(propertyId)}/share`,
        getToken,
      );

      const url = new URL(response.data.path, window.location.origin);
      await navigator.clipboard.writeText(url.toString());
      setShareMessage("Property share link copied.");
    } catch (err) {
      setShareMessage(
        err instanceof Error ? err.message : "Unable to create the property share link.",
      );
    } finally {
      setShareLoadingId(null);
    }
  }

  async function loadPayoutInfo() {
    if (!isLoaded || !isSignedIn) return;

    setPayoutLoading(true);
    setPayoutError("");

    const [bankResult, earningsResult] = await Promise.allSettled([
      apiFetch<AgentPayoutBankResponse>(
        "/api/v1/agents/me/payout/bank-details",
        getToken,
      ),
      apiFetch<AgentPayoutEarningsResponse>(
        "/api/v1/agents/me/payout/earnings",
        getToken,
      ),
    ]);

    const errors: string[] = [];

    if (bankResult.status === "fulfilled") {
      const bank = bankResult.value.data;
      setPayoutBank({
        bankCode: bank?.bankCode ?? "",
        bankName: bank?.bankName ?? "",
        accountName: bank?.accountName ?? "",
        accountNumber: bank?.accountNumber ?? "",
      });
    } else {
      errors.push(
        bankResult.reason instanceof Error
          ? bankResult.reason.message
          : "Unable to load bank details.",
      );
    }

    if (earningsResult.status === "fulfilled") {
      setPayoutEarnings({
        commissions: earningsResult.value.data?.commissions ?? [],
        referralRewards: earningsResult.value.data?.referralRewards ?? [],
      });
    } else {
      errors.push(
        earningsResult.reason instanceof Error
          ? earningsResult.reason.message
          : "Unable to load eligible earnings.",
      );
    }

    setPayoutError(errors.join(" "));
    setPayoutLoading(false);
  }

  async function savePayoutBankDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPayoutError("");
    setPayoutNotice("");

    const details = {
      bankCode: payoutBank.bankCode.trim(),
      bankName: payoutBank.bankName.trim(),
      accountName: payoutBank.accountName.trim(),
      accountNumber: payoutBank.accountNumber.trim(),
    };

    if (
      !details.bankCode ||
      !details.bankName ||
      !details.accountName ||
      !/^\d{10}$/.test(details.accountNumber)
    ) {
      setPayoutError(
        "Enter the bank code, bank name, account name and a valid 10-digit account number.",
      );
      return;
    }

    setPayoutSaving(true);

    try {
      const response = await apiFetch<{ success: boolean; message?: string }>(
        "/api/v1/agents/me/payout/bank-details",
        getToken,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(details),
        },
      );

      if (!response.success) {
        throw new Error(response.message || "Unable to save bank details.");
      }

      setPayoutNotice(response.message || "Payout bank details saved.");
      await loadPayoutInfo();
    } catch (err) {
      setPayoutError(
        err instanceof Error ? err.message : "Unable to save bank details.",
      );
    } finally {
      setPayoutSaving(false);
    }
  }

  async function loadDashboard() {
    if (!isLoaded || !isSignedIn) return;

    setLoading(true);
    setError("");

    const referralRequest = apiFetch<{
      success: boolean;
      data: { referralCode: string };
    }>("/api/v1/agents/me/referral", getToken)
      .then((response) => response.data?.referralCode ?? null)
      .catch(() => null);

    void referralRequest.then(setReferralCode);

    try {
      const [
        inspectionResponse,
        landVaultResponse,
        agentResponse,
        agentPropertiesResponse,
        landlordsResponse,
        tenantsResponse,
        moveInsResponse,
      ] = await Promise.allSettled([
        apiFetch<InspectionsResponse>(
          "/api/v1/inspections/assigned",
          getToken,
        ),
        apiFetch<LandVaultResponse>(
          "/api/v1/land-vaults/agent/assigned",
          getToken,
        ),
        apiFetch<AgentProfileResponse>(
          "/api/v1/agents/me",
          getToken,
        ),
        apiFetch<AgentPropertiesResponse>(
          "/api/v1/agents/me/properties",
          getToken,
        ),
        apiFetch<AgentClientsResponse>(
          "/api/v1/agents/me/landlords",
          getToken,
        ),
        apiFetch<AgentClientsResponse>(
          "/api/v1/agents/me/tenants",
          getToken,
        ),
        apiFetch<{
          success: boolean;
          data: Array<{ lease?: { status?: string | null } | null }>;
        }>(
          "/api/v1/move-in/agent/assigned",
          getToken,
        ),
      ]);

      const errors: string[] = [];

      if (inspectionResponse.status === "fulfilled") {
        setInspections(inspectionResponse.value.data ?? []);
      } else {
        errors.push("Unable to load inspections");
        setInspections([]);
      }

      if (landVaultResponse.status === "fulfilled") {
        setLandVaults(landVaultResponse.value.data ?? []);
      } else {
        errors.push("Unable to load LandVault assignments");
        setLandVaults([]);
      }

      if (agentResponse.status === "fulfilled") {
        setAgentProfile(agentResponse.value.data ?? null);
      } else {
        errors.push("Unable to load agent account");
        setAgentProfile(null);
      }

      if (agentPropertiesResponse.status === "fulfilled") {
        setAgentProperties(agentPropertiesResponse.value.data ?? []);
      } else {
        errors.push("Unable to load assigned properties");
        setAgentProperties([]);
      }

      if (landlordsResponse.status === "fulfilled") {
        setLandlords(landlordsResponse.value.data ?? []);
      } else {
        errors.push("Unable to load landlords");
        setLandlords([]);
      }

      if (tenantsResponse.status === "fulfilled") {
        setTenants(tenantsResponse.value.data ?? []);
      } else {
        errors.push("Unable to load tenants");
        setTenants([]);
      }

      if (moveInsResponse.status === "fulfilled") {
        setActiveTenancies(
          (moveInsResponse.value.data ?? []).filter(
            (record) => record.lease?.status === "ACTIVE",
          ).length,
        );
      } else {
        errors.push("Unable to load active tenancies");
        setActiveTenancies(0);
      }

      if (errors.length > 0) {
        setError(errors.join(" • "));
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load agent dashboard",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void loadPayoutInfo();
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void loadPropertyTypes();
  }, [isLoaded, isSignedIn, getToken]);


  async function updateInspection(
    id: string,
    status: InspectionStatus,
    remarks?: string,
  ) {
    setUpdatingInspection(id);
    setError("");

    try {
      await apiFetch(`/api/v1/inspections/${id}`, getToken, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          ...(remarks ? { remarks } : {}),
        }),
      });

      setInspections((current) =>
        current.map((inspection) =>
          inspection.id === id
            ? {
                ...inspection,
                status,
                ...(remarks !== undefined ? { remarks } : {}),
              }
            : inspection,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update inspection",
      );
    } finally {
      setUpdatingInspection(null);
    }
  }

  // LANDVAULT_AGENT_ACTIONS_V1
  async function transitionLandVault(
    id: string,
    toStatus: AgentLandVaultTransition,
  ) {
    setUpdatingLandVault(id);
    setError("");

    const details: Record<
      AgentLandVaultTransition,
      { description: string; action: string }
    > = {
      UNDER_DUE_DILIGENCE: {
        description: "Agent started LandVault due diligence verification.",
        action: "start-due-diligence",
      },
      AGENT_APPROVED: {
        description:
          "Agent approved LandVault and submitted it for admin review.",
        action: "approve-and-submit-to-admin",
      },
      AGENT_REJECTED: {
        description: "Agent rejected LandVault during due diligence.",
        action: "reject",
      },
      DUE_DILIGENCE_PENDING: {
        description:
          "Agent returned LandVault to due diligence for further verification.",
        action: "return-to-due-diligence",
      },
      ADMIN_REVIEW: {
        description: "Agent submitted approved LandVault for admin review.",
        action: "submit-to-admin-review",
      },
    };

    try {
      await apiFetch(
        `/api/v1/land-vaults/${id}/transition`,
        getToken,
        {
          method: "POST",
          body: JSON.stringify({
            toStatus,
            description: details[toStatus].description,
            metadata: {
              source: "agent-land-vault-dashboard",
              action: details[toStatus].action,
            },
          }),
        },
      );

      setLandVaults((current) =>
        current.map((vault) =>
          vault.id === id
            ? {
                ...vault,
                status:
                  toStatus === "AGENT_APPROVED"
                    ? "ADMIN_REVIEW"
                    : toStatus,
                updatedAt: new Date().toISOString(),
              }
            : vault,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update LandVault",
      );
    } finally {
      setUpdatingLandVault(null);
    }
  }

  const stats = useMemo(() => {
    const upcomingInspections = inspections.filter(
      (item) =>
        item.status === "PENDING" || item.status === "CONFIRMED",
    ).length;

    const completedInspections = inspections.filter(
      (item) => item.status === "COMPLETED",
    ).length;

    const awaitingVerification = landVaults.filter(
      (item) => item.status === "DUE_DILIGENCE_PENDING",
    ).length;

    const underDueDiligence = landVaults.filter(
      (item) => item.status === "UNDER_DUE_DILIGENCE",
    ).length;

    const agentApproved = landVaults.filter(
      (item) => item.status === "AGENT_APPROVED",
    ).length;

    const agentRejected = landVaults.filter(
      (item) => item.status === "AGENT_REJECTED",
    ).length;

    const adminReview = landVaults.filter(
      (item) => item.status === "ADMIN_REVIEW",
    ).length;

    const adminApproved = landVaults.filter(
      (item) => item.status === "ADMIN_APPROVED",
    ).length;

    const adminRejected = landVaults.filter(
      (item) => item.status === "ADMIN_REJECTED",
    ).length;

    const blockchainAnchored = landVaults.filter(
      (item) =>
        item.status === "BLOCKCHAIN_ANCHORED" ||
        Boolean(item.blockchainAnchoredAt),
    ).length;

    const certified = landVaults.filter(
      (item) =>
        item.status === "CERTIFIED" || Boolean(item.certifiedAt),
    ).length;

    return {
      upcomingInspections,
      completedInspections,
      awaitingVerification,
      underDueDiligence,
      agentApproved,
      agentRejected,
      adminReview,
      adminApproved,
      adminRejected,
      blockchainAnchored,
      certified,
    };
  }, [inspections, landVaults]);

  const recentLandVaults = useMemo(
    () =>
      [...landVaults]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() -
            new Date(a.updatedAt).getTime(),
        )
        .slice(0, 6),
    [landVaults],
  );

  const upcomingInspections = useMemo(
    () =>
      [...inspections]
        .filter(
          (item) =>
            item.status === "PENDING" ||
            item.status === "CONFIRMED",
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        ),
    [inspections],
  );

  const inspectionTotalPages = Math.max(
    1,
    Math.ceil(upcomingInspections.length / inspectionsPerPage),
  );

  const paginatedUpcomingInspections = upcomingInspections.slice(
    (inspectionPage - 1) * inspectionsPerPage,
    inspectionPage * inspectionsPerPage,
  );

  const firstName =
    user?.firstName ||
    user?.username ||
    "Agent";

  if (!isLoaded || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">

        {/* AGENT_TIER_GOVERNANCE_CARD_V2 */}

        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading your agent command center...
          </p>
        </div>
      </main>
    );
  }

if (!isSignedIn) {
    return null;
  }

  return (
    <main className="agent-dashboard min-h-screen bg-[#f7f7f5] text-slate-900">

        {showCreateOwner && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Create property owner"
            onClick={closeCreateOwner}
          >
            <div
              className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#b28b00]">
                    Agent Network
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">
                    Create Property Owner
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Create the owner account and attach it to the property you are about to create.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeCreateOwner}
                  disabled={creatingOwner}
                  className="rounded-full px-3 py-2 text-xl font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Close create owner"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 p-5">
                {createOwnerError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                    {createOwnerError}
                  </div>
                )}

                {createOwnerSuccess && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
                    {createOwnerSuccess}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">
                      First Name *
                    </span>
                    <input
                      type="text"
                      value={newOwner.firstName}
                      onChange={(event) =>
                        setNewOwner((current) => ({
                          ...current,
                          firstName: event.target.value,
                        }))
                      }
                      placeholder="e.g. Chinedu"
                      disabled={creatingOwner}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#facc15] focus:ring-2 focus:ring-[#facc15]/20 disabled:bg-slate-50"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">
                      Last Name *
                    </span>
                    <input
                      type="text"
                      value={newOwner.lastName}
                      onChange={(event) =>
                        setNewOwner((current) => ({
                          ...current,
                          lastName: event.target.value,
                        }))
                      }
                      placeholder="e.g. Okafor"
                      disabled={creatingOwner}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#facc15] focus:ring-2 focus:ring-[#facc15]/20 disabled:bg-slate-50"
                    />
                  </label>

                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">
                      Email Address *
                    </span>
                    <input
                      type="email"
                      value={newOwner.email}
                      onChange={(event) =>
                        setNewOwner((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="owner@example.com"
                      disabled={creatingOwner}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#facc15] focus:ring-2 focus:ring-[#facc15]/20 disabled:bg-slate-50"
                    />
                  </label>

                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">
                      Phone Number
                    </span>
                    <input
                      type="tel"
                      value={newOwner.phoneNumber}
                      onChange={(event) =>
                        setNewOwner((current) => ({
                          ...current,
                          phoneNumber: event.target.value,
                        }))
                      }
                      placeholder="+234..."
                      disabled={creatingOwner}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#facc15] focus:ring-2 focus:ring-[#facc15]/20 disabled:bg-slate-50"
                    />
                  </label>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold text-slate-500">
                    The new account will be created as a <span className="font-bold text-slate-700">PROPERTY_OWNER</span> in your organization. After creation, the owner will be automatically selected in the property form.
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeCreateOwner}
                    disabled={creatingOwner}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={createPropertyOwner}
                    disabled={
                      creatingOwner ||
                      !newOwner.firstName.trim() ||
                      !newOwner.lastName.trim() ||
                      !newOwner.email.trim()
                    }
                    className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creatingOwner ? "Creating Owner..." : "Create & Select Owner"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAddProperty && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Add property"
            onClick={closeAddProperty}
          >
            <div
              className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#b28b00]">
                    Agent Property Network
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">
                    Add Property
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Create a draft property under your authorized agent account.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeAddProperty}
                  disabled={creatingProperty}
                  className="rounded-full px-3 py-2 text-xl font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Close add property"
                >
                  ×
                </button>
              </div>

              <div className="space-y-5 p-5">
                {createPropertyError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {createPropertyError}
                  </div>
                )}

                {createPropertySuccess && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    {createPropertySuccess}
                  </div>
                )}

                {propertyTypesError && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
                    {propertyTypesError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">
                      Property Title *
                    </span>
                    <input
                      type="text"
                      value={newProperty.title}
                      onChange={(event) =>
                        setNewProperty((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      placeholder="e.g. 4 Bedroom Detached Duplex"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#facc15] focus:ring-2 focus:ring-[#facc15]/20"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">
                      Property Owner *
                    </span>
                    <select
                      value={newProperty.ownerId}
                      onChange={(event) =>
                        setNewProperty((current) => ({
                          ...current,
                          ownerId: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#facc15] focus:ring-2 focus:ring-[#facc15]/20"
                    >
                      <option value="">Select owner</option>
                      {landlords.map((landlord) => {
                        const name =
                          [landlord.firstName, landlord.lastName]
                            .filter(Boolean)
                            .join(" ") ||
                          landlord.email ||
                          "Property Owner";

                        return (
                          <option key={landlord.id} value={landlord.id}>
                            {name}
                            {landlord.email ? ` — ${landlord.email}` : ""}
                          </option>
                        );
                      })}
                    </select>

                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      {landlords.length === 0 ? (
                        <p className="text-[11px] text-amber-600">
                          No authorized property owners are currently available in your network.
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400">
                          Select an existing owner or create a new owner account.
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={openCreateOwner}
                        disabled={creatingProperty}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 transition hover:border-[#facc15] hover:bg-[#facc15]/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="text-sm leading-none">+</span>
                        Create New Owner
                      </button>
                    </div>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">
                      Property Type *
                    </span>
                    <select
                      value={newProperty.propertyTypeId}
                      onChange={(event) =>
                        setNewProperty((current) => ({
                          ...current,
                          propertyTypeId: event.target.value,
                        }))
                      }
                      disabled={propertyTypesLoading}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#facc15] focus:ring-2 focus:ring-[#facc15]/20 disabled:bg-slate-50"
                    >
                      <option value="">
                        {propertyTypesLoading
                          ? "Loading property types..."
                          : "Select property type"}
                      </option>
                      {propertyTypes.map((propertyType) => (
                        <option
                          key={propertyType.id}
                          value={propertyType.id}
                        >
                          {propertyType.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">
                      Listing Type *
                    </span>
                    <select
                      value={newProperty.listingType}
                      onChange={(event) =>
                        setNewProperty((current) => ({
                          ...current,
                          listingType: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#facc15] focus:ring-2 focus:ring-[#facc15]/20"
                    >
                      <option value="SALE">Sale</option>
                      <option value="RENT">Rent</option>
                      <option value="SHORTLET">Shortlet</option>
                      <option value="LEASE">Lease</option>
                    </select>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">
                      Currency
                    </span>
                    <select
                      value={newProperty.currency}
                      onChange={(event) =>
                        setNewProperty((current) => ({
                          ...current,
                          currency: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#facc15] focus:ring-2 focus:ring-[#facc15]/20"
                    >
                      <option value="NGN">NGN</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="BTC">BTC</option>
                      <option value="ETH">ETH</option>
                      <option value="USDT">USDT</option>
                    </select>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">
                      Price *
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={newProperty.price}
                      onChange={(event) =>
                        setNewProperty((current) => ({
                          ...current,
                          price: event.target.value,
                        }))
                      }
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#facc15] focus:ring-2 focus:ring-[#facc15]/20"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">
                      Bedrooms
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={newProperty.bedrooms}
                      onChange={(event) =>
                        setNewProperty((current) => ({
                          ...current,
                          bedrooms: event.target.value,
                        }))
                      }
                      placeholder="Optional"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#facc15] focus:ring-2 focus:ring-[#facc15]/20"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">
                      Bathrooms
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={newProperty.bathrooms}
                      onChange={(event) =>
                        setNewProperty((current) => ({
                          ...current,
                          bathrooms: event.target.value,
                        }))
                      }
                      placeholder="Optional"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#facc15] focus:ring-2 focus:ring-[#facc15]/20"
                    />
                  </label>

                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">
                      Description
                    </span>
                    <textarea
                      rows={4}
                      value={newProperty.description}
                      onChange={(event) =>
                        setNewProperty((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Describe the property..."
                      className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#facc15] focus:ring-2 focus:ring-[#facc15]/20"
                    />
                  </label>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeAddProperty}
                    disabled={creatingProperty}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => {
  if (!newProperty.ownerId) {
    alert("Select an owner first.");
    return;
  }

  window.location.href =
    `/dashboard/owner/properties/new?workflow=normal&ownerId=${encodeURIComponent(newProperty.ownerId)}`;
}}
                    disabled={
                      creatingProperty ||
                      propertyTypesLoading ||
                      !newProperty.ownerId
                    }
                    className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creatingProperty
                      ? "Creating..."
                      : "Create Draft Property"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


        {(selectedProperty || propertyDetailLoading || propertyDetailError) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Property details"
          onClick={closePropertyDetails}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Agent Property Network
                </p>
                <h2 className="truncate text-lg font-bold text-slate-900">
                  {selectedProperty?.title || "Property Details"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closePropertyDetails}
                className="rounded-full px-3 py-2 text-xl font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close property details"
              >
                ×
              </button>
            </div>

            <div className="p-5">
              {propertyDetailLoading && !selectedProperty ? (
                <div className="flex min-h-48 items-center justify-center text-sm font-semibold text-slate-500">
                  Loading property details...
                </div>
              ) : propertyDetailError ? (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                  <p className="text-sm font-bold text-red-700">
                    {propertyDetailError}
                  </p>

                  {propertyDetailId && (
                    <button
                      type="button"
                      onClick={() => loadPropertyDetails(propertyDetailId)}
                      className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"
                    >
                      Retry
                    </button>
                  )}
                </div>
              ) : selectedProperty ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase text-slate-600">
                      {selectedProperty.status}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase text-slate-600">
                      {selectedProperty.listingType}
                    </span>

                    {selectedProperty.verified && (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase text-emerald-700">
                        Verified
                      </span>
                    )}

                    {selectedProperty.propertyCode && (
                      <span className="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-500">
                        {selectedProperty.propertyCode}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Property Type
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {selectedProperty.propertyType?.name || "—"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Price
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {selectedProperty.currency || "NGN"}{" "}
                        {Number(selectedProperty.price).toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Bedrooms
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {selectedProperty.bedrooms ?? "—"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Bathrooms
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {selectedProperty.bathrooms ?? "—"}
                      </p>
                    </div>
                  </div>

                  {selectedProperty.address && (
                    <section>
                      <h3 className="text-sm font-bold text-slate-900">
                        Location
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {[
                          selectedProperty.address.addressLine1,
                          selectedProperty.address.addressLine2,
                          selectedProperty.address.city?.name,
                          selectedProperty.address.state?.name,
                          selectedProperty.address.country?.name,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </section>
                  )}

                  {selectedProperty.description && (
                    <section>
                      <h3 className="text-sm font-bold text-slate-900">
                        Description
                      </h3>

                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                        {selectedProperty.description}
                      </p>
                    </section>
                  )}

                  {selectedProperty.amenities &&
                    selectedProperty.amenities.length > 0 && (
                      <section>
                        <h3 className="text-sm font-bold text-slate-900">
                          Amenities
                        </h3>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedProperty.amenities.map((item) => (
                            <span
                              key={item.id}
                              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
                            >
                              {item.amenity?.name || "Amenity"}
                            </span>
                          ))}
                        </div>
                      </section>
                    )}

                  <section className="rounded-xl border border-slate-100 bg-[#fafaf8] p-4">
                    <h3 className="text-sm font-bold text-slate-900">
                      Property Owner
                    </h3>

                    <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p>
                        <span className="font-semibold text-slate-400">
                          Name:
                        </span>{" "}
                        {[
                          selectedProperty.owner?.firstName,
                          selectedProperty.owner?.lastName,
                        ]
                          .filter(Boolean)
                          .join(" ") ||
                          selectedProperty.owner?.email ||
                          "—"}
                      </p>

                      <p>
                        <span className="font-semibold text-slate-400">
                          Email:
                        </span>{" "}
                        {selectedProperty.owner?.email || "—"}
                      </p>

                      <p>
                        <span className="font-semibold text-slate-400">
                          Phone:
                        </span>{" "}
                        {selectedProperty.owner?.phoneNumber || "—"}
                      </p>

                      <p>
                        <span className="font-semibold text-slate-400">
                          Account:
                        </span>{" "}
                        {selectedProperty.owner?.isActive
                          ? "Active"
                          : "Inactive"}
                      </p>
                    </div>
                  </section>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-5 pb-8 pt-6 sm:px-6 lg:px-8">

        {/* Agent Network header */}
        <header className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#FACC15] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#111827]">
                  Agent Network
                </span>
                {agentProfile?.organization?.name && (
                  <span className="truncate rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold text-slate-600">
                    {agentProfile.organization.name}
                  </span>
                )}
              </div>

              <h1 className="mt-3 truncate text-2xl font-normal tracking-tight text-slate-900">
                Welcome, {firstName}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Your workspace for properties, inspections and LandVaultX.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={loadDashboard}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-gray-50"
              >
                Refresh
              </button>
              <UserButton />
            </div>
          </div>

          <nav className="dashboard-section-navigation flex gap-1 overflow-x-auto border-t border-slate-200 bg-white px-3 py-2">
            {[
              ["Overview", "#overview"],
              ["Property Network", "#property-network"],
              ["Invite Agents", "#referrals"],
              ["Payouts", "#payouts"],
              ["LandVaultX", "#landvault"],
              ["Inspections", "#inspections"],
              ["Move-in / Handover", "/dashboard/agent/move-in"],
              ["Account", "#account"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                {label}
              </a>
            ))}
          </nav>
        </header>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Agent Network overview */}
        <section id="overview" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
          <StatCard
            label="Awaiting Verification"
            value={stats.awaitingVerification}
            detail="Ready for agent review"
          />

          <StatCard
            label="Due Diligence"
            value={stats.underDueDiligence}
            detail="Currently being verified"
          />

          <StatCard
            label="Agent Approved"
            value={stats.agentApproved}
            detail="Approved by your review"
          />

          <StatCard
            label="Admin Review"
            value={stats.adminReview}
            detail="Submitted to administration"
          />

          <StatCard
            label="Inspections"
            value={upcomingInspections.length}
            detail={`${stats.completedInspections} completed`}
          />
        </section>

        <section
          id="referrals"
          className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b28b00]">
                Agent invitations
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                Grow your Agent network
              </h2>
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                Share your invitation link with people who want to register as
                Aviritech Agents.
              </p>
              {referralCode && (
                <p className="mt-2 text-xs text-slate-500">
                  Your referral code:{" "}
                  <span className="font-bold tracking-wider text-slate-800">
                    {referralCode}
                  </span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={copyAgentReferralLink}
              disabled={!referralCode}
              className="shrink-0 rounded-xl bg-[#facc15] px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-[#eab308] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {referralCode ? "Copy Agent invitation link" : "Invitation link unavailable"}
            </button>
          </div>
          {shareMessage && (
            <p role="status" className="mt-3 text-xs font-medium text-slate-600">
              {shareMessage}
            </p>
          )}
        </section>

        <section
          id="payouts"
          className="mt-5 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b28b00]">
                Agent finance
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                Payout details and earnings
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Maintain your receiving bank account and review eligible unpaid earnings.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadPayoutInfo()}
              disabled={payoutLoading}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {payoutLoading ? "Refreshing..." : "Refresh earnings"}
            </button>
          </div>

          {payoutError && (
            <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {payoutError}
            </p>
          )}
          {payoutNotice && (
            <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              {payoutNotice}
            </p>
          )}

          <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <form
              onSubmit={savePayoutBankDetails}
              className="rounded-xl border border-slate-200 p-4"
            >
              <h3 className="font-bold text-slate-900">Receiving bank account</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                These details belong to your agent account and will be used for manually processed payouts.
              </p>

              <div className="mt-4 space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Bank name
                  <input
                    value={payoutBank.bankName}
                    onChange={(event) => setPayoutBank((current) => ({ ...current, bankName: event.target.value }))}
                    required
                    maxLength={100}
                    autoComplete="off"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"
                    placeholder="e.g. Access Bank"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Bank code
                  <input
                    value={payoutBank.bankCode}
                    onChange={(event) => setPayoutBank((current) => ({ ...current, bankCode: event.target.value }))}
                    required
                    maxLength={30}
                    autoComplete="off"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"
                    placeholder="Bank code"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Account name
                  <input
                    value={payoutBank.accountName}
                    onChange={(event) => setPayoutBank((current) => ({ ...current, accountName: event.target.value }))}
                    required
                    maxLength={150}
                    autoComplete="off"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"
                    placeholder="Name registered with the bank"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  10-digit account number
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    value={payoutBank.accountNumber}
                    onChange={(event) => setPayoutBank((current) => ({
                      ...current,
                      accountNumber: event.target.value.replace(/\D/g, "").slice(0, 10),
                    }))}
                    required
                    autoComplete="off"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal"
                    placeholder="0123456789"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={payoutSaving || payoutLoading}
                className="mt-4 w-full rounded-xl bg-[#FACC15] px-4 py-3 text-sm font-bold text-slate-950 hover:bg-yellow-400 disabled:opacity-50"
              >
                {payoutSaving ? "Saving..." : "Save bank details"}
              </button>
            </form>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-slate-900">Eligible unpaid commissions</h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                    {payoutEarnings.commissions.length}
                  </span>
                </div>
                {payoutLoading ? (
                  <p className="mt-3 text-sm text-slate-500">Loading eligible commissions...</p>
                ) : payoutEarnings.commissions.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No eligible unpaid commissions recorded.</p>
                ) : (
                  <div className="mt-3 divide-y divide-slate-100">
                    {payoutEarnings.commissions.map((earning) => (
                      <div key={earning.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {(earning.source || "COMMISSION").replaceAll("_", " ")}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {earning.paymentReference} · {new Date(earning.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-slate-900">
                          {new Intl.NumberFormat("en-NG", {
                            style: "currency",
                            currency: earning.currency,
                            maximumFractionDigits: 2,
                          }).format(Number(earning.amount))}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-slate-900">Referral rewards</h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                    {payoutEarnings.referralRewards.length}
                  </span>
                </div>
                {payoutLoading ? (
                  <p className="mt-3 text-sm text-slate-500">Loading referral rewards...</p>
                ) : payoutEarnings.referralRewards.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No eligible unpaid referral rewards recorded.</p>
                ) : (
                  <div className="mt-3 divide-y divide-slate-100">
                    {payoutEarnings.referralRewards.map((earning) => (
                      <div key={earning.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            Referral reward · {earning.percentage ?? "—"}%
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {earning.paymentReference} · {new Date(earning.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-slate-900">
                          {new Intl.NumberFormat("en-NG", {
                            style: "currency",
                            currency: earning.currency,
                            maximumFractionDigits: 2,
                          }).format(Number(earning.amount))}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs leading-5 text-slate-500">
                These are eligible unpaid records, not a confirmed weekly payout. Payment is processed separately by Aviritech after review and independent transfer verification.
              </p>
            </div>
          </div>
        </section>

        {/* Network capability strip */}
        <section
          id="property-network"
          className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_0.85fr]"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#b28b00]">
                  Property Network
                </p>
                <h2 className="mt-1 text-lg font-bold">
                  Your agent workspace
                </h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                  Your assigned properties, landlord relationships and tenant
                  relationships are connected directly to your Agent Network
                  workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={openAddProperty}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#facc15] px-4 py-2.5 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-[#f5c518] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="text-base leading-none">+</span>
                Add Property
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-[#fafaf8] p-4">
                <p className="text-xs font-semibold text-slate-400">
                  Assigned Properties
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-800">
                  {agentProperties.length}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Properties assigned to you
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-[#fafaf8] p-4">
                <p className="text-xs font-semibold text-slate-400">
                  Landlords
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-800">
                  {landlords.length}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Property owners in your network
                </p>
              </div>



              <div className="rounded-xl border border-slate-100 bg-[#fafaf8] p-4">
                <p className="text-xs font-semibold text-slate-400">
                  Active Tenancies
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-800">
                  {activeTenancies}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Leases currently marked active
                </p>
                <Link
                  href="/dashboard/agent/move-in"
                  className="mt-3 inline-flex text-xs font-semibold text-[#1A3C6E] hover:underline"
                >
                  View move-in records
                </Link>
              </div>
            </div>


            <div className="mt-5 rounded-xl border border-slate-100 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#b28b00]">
                    Property Owners
                  </p>
                  <h3 className="mt-1 text-sm font-bold text-slate-800">
                    Landlords in your network
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Owners connected to properties assigned to your agent account.
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {landlords.length}
                </span>
              </div>

              {landlords.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                  <p className="text-sm font-semibold text-slate-600">
                    No property owners in your network yet.
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Owners will appear here when they are connected to your assigned properties.
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {landlords.map((landlord) => {
                    const landlordName =
                      [landlord.firstName, landlord.lastName]
                        .filter(Boolean)
                        .join(" ") ||
                      landlord.email ||
                      "Property Owner";

                    return (
                      <div
                        key={landlord.id}
                        className="rounded-xl border border-slate-100 bg-[#fafaf8] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-800">
                              {landlordName}
                            </p>

                            {landlord.email && (
                              <p className="mt-1 truncate text-xs text-slate-500">
                                {landlord.email}
                              </p>
                            )}

                            {landlord.phoneNumber && (
                              <p className="mt-1 text-xs text-slate-500">
                                {landlord.phoneNumber}
                              </p>
                            )}
                          </div>

                          {landlord.isVerified && (
                            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                              Verified
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>


            <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Assigned Properties
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Properties currently assigned to your agent account.
                  </p>
                </div>

                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
                  {agentProperties.length}
                </span>
              </div>

              {agentProperties.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
                  <p className="text-sm font-semibold text-slate-600">
                    No properties assigned yet
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Properties assigned to you will appear here.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {agentProperties.slice(0, 8).map((property) => {
                    const ownerName =
                      [
                        property.owner?.firstName,
                        property.owner?.lastName,
                      ]
                        .filter(Boolean)
                        .join(" ") ||
                      property.owner?.email ||
                      "Property owner";

                    const numericPrice = Number(property.price);

                    const priceLabel = Number.isFinite(numericPrice)
                      ? `${property.currency || "NGN"} ${numericPrice.toLocaleString()}`
                      : `${property.currency || "NGN"} ${String(property.price)}`;

                    return (
                      <div
                        key={property.id}
                        className="rounded-xl border border-white bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-800">
                              {property.title}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {property.propertyCode || property.id}
                            </p>
                          </div>

                          <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                            {property.status}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-3">
                          <div>
                            <span className="font-semibold text-slate-400">
                              Listing
                            </span>
                            <p className="mt-0.5 font-semibold text-slate-700">
                              {property.listingType}
                            </p>
                          </div>

                          <div>
                            <span className="font-semibold text-slate-400">
                              Owner
                            </span>
                            <p className="mt-0.5 truncate font-semibold text-slate-700">
                              {ownerName}
                            </p>
                          </div>

                          <div>
                            <span className="font-semibold text-slate-400">
                              Price
                            </span>
                            <p className="mt-0.5 font-semibold text-slate-700">
                              {priceLabel}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => copyPropertyShareLink(property.id)}
                            disabled={shareLoadingId === property.id}
                            className="rounded-lg border border-[#e4bd18] bg-[#fff9dc] px-3 py-2 text-xs font-bold text-slate-800 transition hover:bg-[#fff1a8] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {shareLoadingId === property.id
                              ? "Preparing link..."
                              : "Copy Share Link"}
                          </button>
                          <button
                            type="button"
                            onClick={() => loadPropertyDetails(property.id)}
                            disabled={
                              propertyDetailLoading &&
                              propertyDetailId === property.id
                            }
                            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {propertyDetailLoading &&
                            propertyDetailId === property.id
                              ? "Loading..."
                              : "View Details"}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {agentProperties.length > 8 && (
                    <p className="pt-1 text-center text-xs text-slate-400">
                      Showing 8 of {agentProperties.length} assigned
                      properties.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-5">
                <p className="text-xs font-semibold text-slate-400">
                  Opportunities
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  Coming soon
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Opportunity management will appear here when its API is
                  connected.
                </p>
              </div>

              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-5">
                <p className="text-xs font-semibold text-slate-400">
                  Leads
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  Coming soon
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Lead management will appear here when its API is connected.
                </p>
              </div>
            </div>
          </div>

          <div
            id="account"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
                        {/* AGENT_TIER_GOVERNANCE_CARD_V1 */}
                        <AgentClearanceStatusCard />

            <div className="mt-6 border-t border-slate-100 pt-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-bold tracking-tight text-slate-950">
                  Agent Account
                </p>
                <h2 className="mt-1 text-lg font-bold">
                  Profile & verification
                </h2>
              </div>

              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                  agentProfile?.isVerified
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {agentProfile?.isVerified ? "Verified" : "Verification pending"}
              </span>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Agent</span>
                <span className="font-semibold text-slate-700">
                  {[agentProfile?.firstName, agentProfile?.lastName]
                    .filter(Boolean)
                    .join(" ") || firstName}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Organization</span>
                <span className="font-semibold text-slate-700">
                  {agentProfile?.organization?.name || "—"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Account</span>
                <span className="font-semibold text-emerald-700">
                  {agentProfile?.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* LandVaultX summary */}
        <section id="landvault" className="mt-6 overflow-hidden rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b28b00]">
                LandVaultX
              </p>

              <h2 className="mt-1 text-lg font-bold leading-tight sm:text-xl">
                Verification workload
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Track every assigned land asset through verification,
                administration and blockchain certification.
              </p>
            </div>

            <div className="shrink-0 text-sm font-medium text-slate-500">
              {landVaults.length} assigned asset
              {landVaults.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 lg:grid-cols-4">
            <PipelineCard
              label="Awaiting verification"
              value={stats.awaitingVerification}
              tone="amber"
            />
            <PipelineCard
              label="Under due diligence"
              value={stats.underDueDiligence}
              tone="blue"
            />
            <PipelineCard
              label="Agent approved"
              value={stats.agentApproved}
              tone="green"
            />
            <PipelineCard
              label="Agent rejected"
              value={stats.agentRejected}
              tone="red"
            />
            <PipelineCard
              label="Submitted to admin"
              value={stats.adminReview}
              tone="amber"
            />
            <PipelineCard
              label="Admin approved"
              value={stats.adminApproved}
              tone="green"
            />
            <PipelineCard
              label="Blockchain anchored"
              value={stats.blockchainAnchored}
              tone="blue"
            />
            <PipelineCard
              label="Certified"
              value={stats.certified}
              tone="green"
            />
          </div>

          <a
            href="/dashboard/agent/land-vaults"
            className="mt-4 flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:mt-5 sm:inline-flex sm:w-auto"
          >
            Open LandVault Dashboard
            <span className="ml-2" aria-hidden="true">
              →
            </span>
          </a>
          <a
            href="/dashboard/agent/aero"
            className="mt-3 flex w-full items-center justify-center rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-yellow-100 sm:mt-3 sm:inline-flex sm:w-auto sm:ml-2"
          >
            Open Aero Drone Workspace
            <span className="ml-2" aria-hidden="true">→</span>
          </a>
        </section>

        {/* Main two-column workspace */}
        <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          {/* LandVault portfolio */}
          <div className="rounded-2xl border border-black/5 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-950">LandVault portfolio</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Assigned verification and certification workload
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {recentLandVaults.length} shown
              </span>
            </div>

            {recentLandVaults.length === 0 ? (
              <EmptyState
                title="No LandVault assignments"
                description="Assigned LandVault verification work will appear here."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {recentLandVaults.map((vault) => (
                  <LandVaultRow
                    key={vault.id}
                    vault={vault}
                    onTransition={transitionLandVault}
                    updating={updatingLandVault === vault.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Upcoming inspections */}
          <div id="inspections" className="rounded-2xl border border-black/5 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-950">Upcoming inspections</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Your assigned property inspections
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {upcomingInspections.length}
              </span>
            </div>

            {upcomingInspections.length === 0 ? (
              <EmptyState
                title="No upcoming inspections"
                description="Assigned inspections will appear here."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {paginatedUpcomingInspections.map((inspection) => (
                  <div key={inspection.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">
                          {inspection.property.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {inspection.property.address?.addressLine1 ||
                            "Address unavailable"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass(
                          inspection.status,
                        )}`}
                      >
                        {formatStatus(inspection.status)}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-slate-400">Customer</p>
                        <p className="mt-1 font-medium text-slate-700">
                          {getCustomerName(inspection)}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-400">Scheduled</p>
                        <p className="mt-1 font-medium text-slate-700">
                          {formatDateTime(inspection.scheduledAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {inspection.status === "PENDING" && (
                        <>
                          <button
                            type="button"
                            disabled={updatingInspection === inspection.id}
                            onClick={() =>
                              updateInspection(inspection.id, "CONFIRMED")
                            }
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {updatingInspection === inspection.id
                              ? "Processing..."
                              : "Accept inspection"}
                          </button>

                          <button
                            type="button"
                            disabled={updatingInspection === inspection.id}
                            onClick={() => {
                              const reason = window.prompt(
                                "Why are you rejecting this inspection?",
                              );
                              if (reason === null) return;

                              updateInspection(
                                inspection.id,
                                "REJECTED",
                                reason.trim() || "Rejected by assigned agent",
                              );
                            }}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {inspection.status === "CONFIRMED" && (
                        <>
                          <button
                            type="button"
                            disabled={updatingInspection === inspection.id}
                            onClick={() =>
                              updateInspection(inspection.id, "COMPLETED")
                            }
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Complete
                          </button>

                          <button
                            type="button"
                            disabled={updatingInspection === inspection.id}
                            onClick={() =>
                              updateInspection(inspection.id, "CANCELLED")
                            }
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {inspectionTotalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                <p className="text-xs text-slate-500">
                  Page {inspectionPage} of {inspectionTotalPages}
                  {" · "}
                  {upcomingInspections.length} inspections
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={inspectionPage <= 1}
                    onClick={() =>
                      setInspectionPage((page) => Math.max(1, page - 1))
                    }
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={inspectionPage >= inspectionTotalPages}
                    onClick={() =>
                      setInspectionPage((page) =>
                        Math.min(inspectionTotalPages, page + 1),
                      )
                    }
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Validation pipeline */}
        <section className="mt-6 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b28b00]">
              Validation pipeline
            </p>
            <h2 className="mt-1 text-xl font-bold">
              LandVault lifecycle
            </h2>
          </div>

          <div className="mt-5 grid gap-2 overflow-x-auto md:grid-cols-8">
            {[
              ["Owner submitted", stats.awaitingVerification],
              ["Agent validating", stats.underDueDiligence],
              ["Agent approved", stats.agentApproved],
              ["Admin review", stats.adminReview],
              ["Admin approved", stats.adminApproved],
              ["Blockchain", stats.blockchainAnchored],
              ["Certified", stats.certified],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="min-w-[130px] rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <p className="text-2xl font-bold text-slate-900">
                  {value}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Recent activity */}
        <section className="mt-6 rounded-2xl border border-black/5 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-bold tracking-tight text-slate-950">Recent LandVault activity</h2>
            <p className="mt-1 text-xs text-slate-500">
              Latest verification events from your assigned portfolio
            </p>
          </div>

          {landVaults.every(
            (vault) => !vault.verificationEvents?.length,
          ) ? (
            <EmptyState
              title="No verification events yet"
              description="LandVault activity will appear as verification progresses."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {landVaults
                .flatMap((vault) =>
                  (vault.verificationEvents ?? []).map((event) => ({
                    ...event,
                    vault,
                  })),
                )
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
                )
                .slice(0, 8)
                .map((event) => (
                  <div
                    key={`${event.vault.id}-${event.id}`}
                    className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">
                          {event.vault.vaultCode}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass(
                            event.status,
                          )}`}
                        >
                          {formatStatus(event.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {event.description ||
                          formatStatus(event.type)}
                      </p>
                    </div>

                    <p className="text-xs text-slate-400">
                      {formatDateTime(event.createdAt)}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </section>

        {/* Footer summary */}
        <footer className="dashboard-shell-footer mt-6 grid gap-4 rounded-2xl border border-transparent p-4 pb-8 sm:grid-cols-3">
          <SummaryItem
            label="Assigned assets"
            value={landVaults.length}
          />
          <SummaryItem
            label="Rejected"
            value={stats.agentRejected + stats.adminRejected}
          />
          <SummaryItem
            label="Certified"
            value={stats.certified}
          />
        </footer>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

function PipelineCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "blue" | "green" | "red";
}) {
  const classes = {
    amber: "border-amber-100 bg-amber-50",
    blue: "border-blue-100 bg-blue-50",
    green: "border-emerald-100 bg-emerald-50",
    red: "border-red-100 bg-red-50",
  };

  return (
    <div className={`rounded-xl border p-4 ${classes[tone]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-600">
        {label}
      </p>
    </div>
  );
}

function LandVaultRow({
  vault,
  onTransition,
  updating,
}: {
  vault: LandVault;
  onTransition: (
    id: string,
    toStatus: AgentLandVaultTransition,
  ) => Promise<void>;
  updating: boolean;
}) {
  const propertyName =
    vault.property.title ||
    vault.property.propertyCode ||
    "Land property";

  const location = [
    vault.property.address?.city,
    vault.property.address?.state,
  ]
    .filter(Boolean)
    .join(", ");

  let actionButtons: React.ReactNode = null;

  switch (vault.status) {
    case "DUE_DILIGENCE_PENDING":
      actionButtons = (
        <button
          type="button"
          disabled={updating}
          onClick={() =>
            onTransition(vault.id, "UNDER_DUE_DILIGENCE")
          }
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {updating ? "Updating..." : "Start due diligence"}
        </button>
      );
      break;

    case "UNDER_DUE_DILIGENCE":
      actionButtons = (
        <>
          <button
            type="button"
            disabled={updating}
            onClick={() =>
              onTransition(vault.id, "AGENT_APPROVED")
            }
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updating ? "Submitting..." : "Approve & submit"}
          </button>

          <button
            type="button"
            disabled={updating}
            onClick={() =>
              onTransition(vault.id, "AGENT_REJECTED")
            }
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reject
          </button>
        </>
      );
      break;

    case "AGENT_REJECTED":
      actionButtons = (
        <button
          type="button"
          disabled={updating}
          onClick={() =>
            onTransition(vault.id, "DUE_DILIGENCE_PENDING")
          }
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {updating ? "Updating..." : "Return to due diligence"}
        </button>
      );
      break;

    case "AGENT_APPROVED":
      /*
       * The backend treats AGENT_APPROVED as the audit milestone and
       * atomically advances the successful approval request to ADMIN_REVIEW.
       * Do not expose a second client-side submission action.
       */
      actionButtons = (
        <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
          Submitted to admin
        </span>
      );
      break;
  }

  return (
    <div className="p-5 transition hover:bg-slate-50/70">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{vault.vaultCode}</span>

            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClass(
                vault.status,
              )}`}
            >
              {formatStatus(vault.status)}
            </span>
          </div>

          <h3 className="mt-2 truncate font-medium text-slate-800">
            {propertyName}
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            {location || "Location unavailable"}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            Stage:{" "}
            <span className="font-medium text-slate-600">
              {getLandVaultStage(vault)}
            </span>
            {" • "}
            Updated {formatDate(vault.updatedAt)}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actionButtons}

          <Link
            href={`/dashboard/agent/land-vaults/${vault.id}`}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Open verification
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
        —
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
