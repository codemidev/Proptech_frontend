export type PropertyType = {
  id: string;
  name: string;
  category: string;
  description: string | null;
};

export type Amenity = {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
};

export type Feature = {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
};

export type Country = {
  id: string;
  name: string;
  isoCode: string;
  phoneCode: string | null;
};

export type State = {
  id: string;
  countryId: string;
  name: string;
  code: string | null;
};

export type LocalGovernment = {
  id: string;
  stateId: string;
  name: string;
};

export type City = {
  id: string;
  stateId: string;
  localGovernmentId: string | null;
  name: string;
};

export type District = {
  id: string;
  cityId: string | null;
  name: string;
};

export type Estate = {
  id: string;
  districtId: string;
  name: string;
  description: string | null;
};

export type PropertyMedia = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
};

export type PropertyWizardData = {
  propertyId: string | null;
  buildingId: string;
  buildingName: string;
  buildingFloors: string;

  propertyTypeId: string;
  propertyTypeName: string;
  propertyTypeCategory: string;

  title: string;
  description: string;
  listingType: "SALE" | "RENT" | "SHORTLET" | "LEASE";

  price: string;
  serviceCharge: string;
  cautionFee: string;
  agencyFee: string;
  legalFee: string;
  currency: "NGN" | "USD" | "EUR" | "GBP" | "BTC" | "ETH" | "USDT";

  bedrooms: string;
  bathrooms: string;
  toilets: string;
  kitchens: string;
  parkingSpaces: string;
  floors: string;
  yearBuilt: string;
  landSize: string;
  buildingSize: string;
  measurementUnit: string;
  parcelNumber: string;

  amenityIds: string[];
  featureIds: string[];

  countryId: string;
  countryName: string;
  stateId: string;
  stateName: string;
  localGovernmentId: string;
  localGovernmentName: string;
  cityId: string;
  cityName: string;
  districtId: string;
  districtName: string;
  estateId: string;
  estateName: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  postalCode: string;

  latitude: number | null;
  longitude: number | null;
};

export const initialPropertyWizardData: PropertyWizardData = {
  propertyId: null,
  buildingId: "",
  buildingName: "",
  buildingFloors: "",

  propertyTypeId: "",
  propertyTypeName: "",
  propertyTypeCategory: "",

  title: "",
  description: "",
  listingType: "SALE",

  price: "",
  serviceCharge: "",
  cautionFee: "",
  agencyFee: "",
  legalFee: "",
  currency: "NGN",

  bedrooms: "",
  bathrooms: "",
  toilets: "",
  kitchens: "",
  parkingSpaces: "",
  floors: "",
  yearBuilt: "",
  landSize: "",
  buildingSize: "",
  measurementUnit: "sqm",
  parcelNumber: "",

  amenityIds: [],
  featureIds: [],

  countryId: "",
  countryName: "",
  stateId: "",
  stateName: "",
  localGovernmentId: "",
  localGovernmentName: "",
  cityId: "",
  cityName: "",
  districtId: "",
  districtName: "",
  estateId: "",
  estateName: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  postalCode: "",

  latitude: null,
  longitude: null,
};

export type WizardStep = {
  id: number;
  title: string;
  description: string;
};
