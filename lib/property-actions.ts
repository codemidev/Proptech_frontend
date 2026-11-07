/**
 * Centralized property-card actions and routes.
 *
 * Keep business rules here so individual property cards do not
 * duplicate listing-type logic or construct URLs manually.
 */

export type PropertyListingType =
  | "SALE"
  | "RENT"
  | "SHORTLET"
  | "LEASE";

export type PropertyAction =
  | "edit"
  | "maintenance"
  | "utilities"
  | "iot";

export type PropertyActionAvailability = Record<
  PropertyAction,
  boolean
>;

/**
 * Which actions are available for each listing type.
 *
 * SALE:
 *   Edit + Maintenance
 *
 * RENT / SHORTLET / LEASE:
 *   Edit + Maintenance + Utilities & Bills + IoT
 */
export const PROPERTY_ACTIONS: Record<
  PropertyListingType,
  PropertyActionAvailability
> = {
  SALE: {
    edit: true,
    maintenance: true,
    utilities: false,
    iot: false,
  },

  RENT: {
    edit: true,
    maintenance: true,
    utilities: true,
    iot: true,
  },

  SHORTLET: {
    edit: true,
    maintenance: true,
    utilities: true,
    iot: true,
  },

  LEASE: {
    edit: true,
    maintenance: true,
    utilities: true,
    iot: true,
  },
} as const;

export const PROPERTY_ACTION_META: Record<
  PropertyAction,
  {
    label: string;
    shortLabel: string;
  }
> = {
  edit: {
    label: "Edit",
    shortLabel: "Edit",
  },

  maintenance: {
    label: "Maintenance",
    shortLabel: "Maintenance",
  },

  utilities: {
    label: "Utilities & Bills",
    shortLabel: "Utilities",
  },

  iot: {
    label: "IoT",
    shortLabel: "IoT",
  },

};

/**
 * Every property action must have a corresponding owner route.
 *
 * Using Record<PropertyAction, ...> means TypeScript will fail
 * compilation if a new PropertyAction is added without a route.
 */
export const ownerPropertyRoutes: Record<
  PropertyAction,
  (propertyId: string) => string
> = {
  edit: (propertyId: string) =>
    `/dashboard/owner/properties/${encodeURIComponent(propertyId)}/edit`,

  maintenance: (propertyId: string) =>
    `/dashboard/owner/maintenance?propertyId=${encodeURIComponent(propertyId)}`,

  utilities: (propertyId: string) =>
    `/dashboard/owner/properties/${encodeURIComponent(propertyId)}/utilities`,

  iot: (propertyId: string) =>
    `/dashboard/owner/properties/${encodeURIComponent(propertyId)}/iot`,

} as const;

export function isPropertyListingType(
  value: string,
): value is PropertyListingType {
  return (
    value === "SALE" ||
    value === "RENT" ||
    value === "SHORTLET" ||
    value === "LEASE"
  );
}

export function isPropertyActionAvailable(
  listingType: string,
  action: PropertyAction,
): boolean {
  if (!isPropertyListingType(listingType)) {
    return false;
  }

  return PROPERTY_ACTIONS[listingType][action];
}

export function getPropertyActions(
  listingType: string,
): PropertyAction[] {
  if (!isPropertyListingType(listingType)) {
    return [];
  }

  const availability = PROPERTY_ACTIONS[listingType];

  return (Object.keys(availability) as PropertyAction[]).filter(
    (action) => availability[action],
  );
}
