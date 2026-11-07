import { describe, expect, it } from "vitest";

import {
  PROPERTY_ACTIONS,
  PROPERTY_ACTION_META,
  getPropertyActions,
  isPropertyActionAvailable,
  isPropertyListingType,
  ownerPropertyRoutes,
} from "../property-actions";

describe("property action availability", () => {
  it("allows only edit and maintenance for SALE", () => {
    expect(getPropertyActions("SALE")).toEqual([
      "edit",
      "maintenance",
    ]);
  });

  it("allows all management actions for RENT", () => {
    expect(getPropertyActions("RENT")).toEqual([
      "edit",
      "maintenance",
      "utilities",
      "iot",
    ]);
  });

  it("allows all management actions for SHORTLET", () => {
    expect(getPropertyActions("SHORTLET")).toEqual([
      "edit",
      "maintenance",
      "utilities",
      "iot",
    ]);
  });

  it("allows all management actions for LEASE", () => {
    expect(getPropertyActions("LEASE")).toEqual([
      "edit",
      "maintenance",
      "utilities",
      "iot",
    ]);
  });

  it("rejects unknown listing types", () => {
    expect(getPropertyActions("LAND")).toEqual([]);
    expect(getPropertyActions("UNKNOWN")).toEqual([]);
    expect(isPropertyActionAvailable("UNKNOWN", "edit")).toBe(false);
  });

  it("provides runtime listing-type validation", () => {
    expect(isPropertyListingType("SALE")).toBe(true);
    expect(isPropertyListingType("RENT")).toBe(true);
    expect(isPropertyListingType("SHORTLET")).toBe(true);
    expect(isPropertyListingType("LEASE")).toBe(true);
    expect(isPropertyListingType("LAND")).toBe(false);
  });
});

describe("property action map", () => {
  it("keeps SALE restricted to edit and maintenance", () => {
    expect(PROPERTY_ACTIONS.SALE.edit).toBe(true);
    expect(PROPERTY_ACTIONS.SALE.maintenance).toBe(true);
    expect(PROPERTY_ACTIONS.SALE.utilities).toBe(false);
    expect(PROPERTY_ACTIONS.SALE.iot).toBe(false);
  });

  it("enables operational actions for rental-style listings", () => {
    for (const listingType of [
      "RENT",
      "SHORTLET",
      "LEASE",
    ] as const) {
      expect(PROPERTY_ACTIONS[listingType].edit).toBe(true);
      expect(PROPERTY_ACTIONS[listingType].maintenance).toBe(true);
      expect(PROPERTY_ACTIONS[listingType].utilities).toBe(true);
      expect(PROPERTY_ACTIONS[listingType].iot).toBe(true);
    }
  });
});

describe("property action metadata", () => {
  it("defines display metadata for every action", () => {
    expect(PROPERTY_ACTION_META.edit.label).toBe("Edit");
    expect(PROPERTY_ACTION_META.maintenance.label).toBe(
      "Maintenance",
    );
    expect(PROPERTY_ACTION_META.utilities.label).toBe(
      "Utilities & Bills",
    );
    expect(PROPERTY_ACTION_META.iot.label).toBe("IoT");
  });
});

describe("owner property routes", () => {
  const propertyId = "property-123";

  it("maps edit to the owner property editor", () => {
    expect(ownerPropertyRoutes.edit(propertyId)).toBe(
      "/dashboard/owner/properties/property-123/edit",
    );
  });

  it("maps maintenance to the owner maintenance page", () => {
    expect(ownerPropertyRoutes.maintenance(propertyId)).toBe(
      "/dashboard/owner/maintenance?propertyId=property-123",
    );
  });

  it("maps utilities to the property utilities page", () => {
    expect(ownerPropertyRoutes.utilities(propertyId)).toBe(
      "/dashboard/owner/properties/property-123/utilities",
    );
  });

  it("maps IoT to the property IoT page", () => {
    expect(ownerPropertyRoutes.iot(propertyId)).toBe(
      "/dashboard/owner/properties/property-123/iot",
    );
  });

  it("encodes property IDs in query-string routes", () => {
    expect(
      ownerPropertyRoutes.maintenance("property/123"),
    ).toBe(
      "/dashboard/owner/maintenance?propertyId=property%2F123",
    );
  });
});
