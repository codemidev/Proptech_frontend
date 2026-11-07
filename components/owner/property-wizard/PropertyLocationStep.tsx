"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
const PropertyLocationMap = dynamic(
  () => import("./PropertyLocationMap"),
  {
    ssr: false,
  },
);


import type { GetToken } from "@/lib/api";
import { apiFetch } from "@/lib/api";
import type {
  City,
  Country,
  District,
  Estate,
  LocalGovernment,
  PropertyWizardData,
  State,
} from "./types";

type Props = {
  value: PropertyWizardData;
  getToken: GetToken;
  onChange: (patch: Partial<PropertyWizardData>) => void;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
};


type SelectFieldOption = {
  id: string;
  name: string;
};

type SelectFieldProps<T extends SelectFieldOption> = {
  label: string;
  value: string;
  options: T[];
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

function SelectField<T extends SelectFieldOption>({
  label,
  value,
  options,
  placeholder,
  disabled = false,
  onChange,
}: SelectFieldProps<T>) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </span>

      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}


export function PropertyLocationStep({
  value,
  getToken,
  onChange,
}: Props) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [lgas, setLgas] = useState<LocalGovernment[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [estates, setEstates] = useState<Estate[]>([]);
  const [newEstateName, setNewEstateName] = useState("");
  const [newEstateDescription, setNewEstateDescription] =
    useState("");
  const [creatingEstate, setCreatingEstate] = useState(false);
  const [estateError, setEstateError] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCountries() {
      try {
        setLoading(true);
        setError("");

        const response =
          await apiFetch<ApiResponse<Country[]>>(
            "/api/v1/locations/countries",
            getToken,
          );

        if (!cancelled) {
          setCountries(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load countries",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCountries();

    return () => {
      cancelled = true;
    };
  }, [getToken]);

  useEffect(() => {
    if (!value.countryId) return;

    let cancelled = false;

    async function loadStates() {
      try {
        const response =
          await apiFetch<ApiResponse<State[]>>(
            `/api/v1/locations/states?countryId=${encodeURIComponent(value.countryId)}`,
            getToken,
          );

        if (!cancelled) {
          setStates(response.data);
        }
      } catch {
        if (!cancelled) {
          setStates([]);
        }
      }
    }

    void loadStates();

    return () => {
      cancelled = true;
    };
  }, [value.countryId, getToken]);

  useEffect(() => {
    if (!value.stateId) return;

    let cancelled = false;

    async function loadLocations() {
      try {
        const [lgaResponse, cityResponse] =
          await Promise.all([
            apiFetch<ApiResponse<LocalGovernment[]>>(
              `/api/v1/locations/local-governments?stateId=${encodeURIComponent(value.stateId)}`,
              getToken,
            ),
            apiFetch<ApiResponse<City[]>>(
              `/api/v1/locations/cities?stateId=${encodeURIComponent(value.stateId)}`,
              getToken,
            ),
          ]);

        if (!cancelled) {
          setLgas(lgaResponse.data);
          setCities(cityResponse.data);
        }
      } catch {
        if (!cancelled) {
          setLgas([]);
          setCities([]);
        }
      }
    }

    void loadLocations();

    return () => {
      cancelled = true;
    };
  }, [value.stateId, getToken]);

  useEffect(() => {
    if (!value.localGovernmentId) return;

    let cancelled = false;

    async function loadDistricts() {
      try {
        const response =
          await apiFetch<ApiResponse<District[]>>(
            `/api/v1/locations/districts?localGovernmentId=${encodeURIComponent(value.localGovernmentId)}`,
            getToken,
          );

        if (!cancelled) {
          setDistricts(response.data);
        }
      } catch {
        if (!cancelled) {
          setDistricts([]);
        }
      }
    }

    void loadDistricts();

    return () => {
      cancelled = true;
    };
  }, [value.localGovernmentId, getToken]);

  useEffect(() => {
    if (!value.districtId) return;

    let cancelled = false;

    async function loadEstates() {
      try {
        const response =
          await apiFetch<ApiResponse<Estate[]>>(
            `/api/v1/locations/estates?districtId=${encodeURIComponent(value.districtId)}`,
            getToken,
          );

        if (!cancelled) {
          setEstates(response.data);
        }
      } catch {
        if (!cancelled) {
          setEstates([]);
        }
      }
    }

    void loadEstates();

    return () => {
      cancelled = true;
    };
  }, [value.districtId, getToken]);

  async function createEstate() {
    const name = newEstateName.trim();

    if (!value.districtId) {
      setEstateError(
        "Select a district before creating an estate.",
      );
      return;
    }

    if (!name) {
      setEstateError("Enter the estate name.");
      return;
    }

    try {
      setCreatingEstate(true);
      setEstateError("");

      const response =
        await apiFetch<ApiResponse<Estate>>(
          "/api/v1/locations/estates",
          getToken,
          {
            method: "POST",
            body: JSON.stringify({
              districtId: value.districtId,
              name,
              description:
                newEstateDescription.trim() || null,
            }),
          },
        );

      const estate = response.data;

      setEstates((current) => [
        ...current,
        estate,
      ].sort((a, b) =>
        a.name.localeCompare(b.name),
      ));

      onChange({
        estateId: estate.id,
        estateName: estate.name,
      });

      setNewEstateName("");
      setNewEstateDescription("");
    } catch (error) {
      setEstateError(
        error instanceof Error
          ? error.message
          : "Unable to create estate.",
      );
    } finally {
      setCreatingEstate(false);
    }
  }

  // When editing an existing property, the API gives us location IDs.
  // Resolve those IDs to the human-readable names once the option lists load.
  useEffect(() => {
    const patch: Partial<PropertyWizardData> = {};

    if (value.countryId) {
      const country = countries.find(
        (item) => item.id === value.countryId,
      );
      if (country && value.countryName !== country.name) {
        patch.countryName = country.name;
      }
    }

    if (value.stateId) {
      const state = states.find(
        (item) => item.id === value.stateId,
      );
      if (state && value.stateName !== state.name) {
        patch.stateName = state.name;
      }
    }

    if (value.localGovernmentId) {
      const lga = lgas.find(
        (item) => item.id === value.localGovernmentId,
      );
      if (
        lga &&
        value.localGovernmentName !== lga.name
      ) {
        patch.localGovernmentName = lga.name;
      }
    }

    if (value.cityId) {
      const city = cities.find(
        (item) => item.id === value.cityId,
      );
      if (city && value.cityName !== city.name) {
        patch.cityName = city.name;
      }
    }

    if (value.districtId) {
      const district = districts.find(
        (item) => item.id === value.districtId,
      );
      if (
        district &&
        value.districtName !== district.name
      ) {
        patch.districtName = district.name;
      }
    }

    if (value.estateId) {
      const estate = estates.find(
        (item) => item.id === value.estateId,
      );
      if (
        estate &&
        value.estateName !== estate.name
      ) {
        patch.estateName = estate.name;
      }
    }

    if (Object.keys(patch).length > 0) {
      onChange(patch);
    }
  }, [
    countries,
    states,
    lgas,
    cities,
    districts,
    estates,
    value.countryId,
    value.countryName,
    value.stateId,
    value.stateName,
    value.localGovernmentId,
    value.localGovernmentName,
    value.cityId,
    value.cityName,
    value.districtId,
    value.districtName,
    value.estateId,
    value.estateName,
    onChange,
  ]);

  function selectCountry(countryId: string) {
    setStates([]);
    setLgas([]);
    setCities([]);
    setDistricts([]);
    setEstates([]);
    const country = countries.find((item) => item.id === countryId);

    onChange({
      countryId,
      countryName: country?.name ?? "",
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
    });
  }

  function selectState(stateId: string) {
    setLgas([]);
    setCities([]);
    setDistricts([]);
    setEstates([]);
    const state = states.find((item) => item.id === stateId);

    onChange({
      stateId,
      stateName: state?.name ?? "",
      localGovernmentId: "",
      localGovernmentName: "",
      cityId: "",
      cityName: "",
      districtId: "",
      districtName: "",
      estateId: "",
      estateName: "",
    });
  }

  const filteredCities = value.localGovernmentId
    ? cities.filter(
        (city) => city.localGovernmentId === value.localGovernmentId,
      )
    : cities;

  function selectCity(cityId: string) {
    setDistricts([]);
    setEstates([]);
    const city = filteredCities.find((item) => item.id === cityId);

    onChange({
      cityId,
      cityName: city?.name ?? "",
      ...(city?.localGovernmentId
        ? {
            localGovernmentId: city.localGovernmentId,
            localGovernmentName:
              lgas.find((item) => item.id === city.localGovernmentId)?.name ?? "",
          }
        : {}),
      districtId: "",
      districtName: "",
      estateId: "",
      estateName: "",
    });
  }

  function selectDistrict(districtId: string) {
    setEstates([]);
    const district = districts.find((item) => item.id === districtId);

    onChange({
      districtId,
      districtName: district?.name ?? "",
      estateId: "",
      estateName: "",
    });
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Location
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Tell buyers where the property is located and pinpoint it on the map.
        </p>
      </div>

      <div className="space-y-7">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">
            Administrative location
          </h2>

          {loading ? (
            <div className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
              Loading locations...
            </div>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <SelectField
                label="Country"
                value={value.countryId}
                options={countries}
                placeholder="Select country"
                onChange={selectCountry}
              />

              <SelectField
                label="State"
                value={value.stateId}
                disabled={!value.countryId}
                options={states}
                placeholder="Select state"
                onChange={selectState}
              />

              <SelectField
                label="Local government"
                value={value.localGovernmentId}
                disabled={!value.stateId}
                options={lgas}
                placeholder="Select LGA"
                onChange={(localGovernmentId) => {
                  setDistricts([]);
                  setEstates([]);
                  const lga = lgas.find(
                    (item) => item.id === localGovernmentId,
                  );

                  const selectedCity = cities.find(
                    (city) => city.id === value.cityId,
                  );

                  const keepCity =
                    !!selectedCity &&
                    selectedCity.localGovernmentId === localGovernmentId;

                  onChange({
                    localGovernmentId,
                    localGovernmentName: lga?.name ?? "",
                    ...(keepCity
                      ? {}
                      : {
                          cityId: "",
                          cityName: "",
                        }),
                    districtId: "",
                    districtName: "",
                    estateId: "",
                    estateName: "",
                  });
                }}
              />

              <SelectField
                label="City"
                value={value.cityId}
                disabled={!value.stateId}
                options={filteredCities}
                placeholder={
                  value.localGovernmentId
                    ? "Select city"
                    : "Select city (or select LGA to filter)"
                }
                onChange={selectCity}
              />

              <SelectField
                label="District"
                value={value.districtId}
                disabled={!value.localGovernmentId}
                options={districts}
                placeholder="Select district"
                onChange={selectDistrict}
              />

              <SelectField
                label="Estate"
                value={value.estateId}
                disabled={!value.districtId}
                options={estates}
                placeholder="Select estate"
                onChange={(estateId) => {
                  const estate = estates.find(
                    (item) => item.id === estateId,
                  );

                  onChange({
                    estateId,
                    estateName: estate?.name ?? "",
                  });
                }}
              />

              <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Can&apos;t find your estate?
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Create the estate and it will be selected automatically.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={newEstateName}
                    disabled={!value.districtId || creatingEstate}
                    onChange={(event) =>
                      setNewEstateName(event.target.value)
                    }
                    placeholder="Estate name"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />

                  <input
                    value={newEstateDescription}
                    disabled={!value.districtId || creatingEstate}
                    onChange={(event) =>
                      setNewEstateDescription(
                        event.target.value,
                      )
                    }
                    placeholder="Description (optional)"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </div>

                {estateError && (
                  <p className="mt-2 text-xs text-red-600">
                    {estateError}
                  </p>
                )}

                <button
                  type="button"
                  disabled={
                    !value.districtId ||
                    !newEstateName.trim() ||
                    creatingEstate
                  }
                  onClick={() => void createEstate()}
                  className="mt-3 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingEstate
                    ? "Creating estate..."
                    : "Create estate"}
                </button>
              </div>

              <div className="sm:col-span-2">
                <div className="mb-4 mt-2 border-t border-slate-100 pt-5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Building
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Enter the building that this property belongs to.
                    This building will be used for the BIM model in Step 7.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Building name
                    </span>
                    <input
                      value={value.buildingName}
                      onChange={(event) =>
                        onChange({
                          buildingName: event.target.value,
                        })
                      }
                      placeholder="e.g. Block A"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Number of floors
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={value.buildingFloors}
                      onChange={(event) =>
                        onChange({
                          buildingFloors: event.target.value,
                        })
                      }
                      placeholder="e.g. 2"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                    />
                  </label>
                </div>

                {!value.estateId && value.buildingName.trim() && (
                  <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
                    Select an estate before creating this building.
                  </p>
                )}
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Address line 1
              </span>
              <input
                value={value.addressLine1}
                onChange={(event) =>
                  onChange({
                    addressLine1: event.target.value,
                  })
                }
                placeholder="Street address"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Address line 2
              </span>
              <input
                value={value.addressLine2}
                onChange={(event) =>
                  onChange({
                    addressLine2: event.target.value,
                  })
                }
                placeholder="Apartment, suite, etc."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Postal code
              </span>
              <input
                value={value.postalCode}
                onChange={(event) =>
                  onChange({
                    postalCode: event.target.value,
                  })
                }
                placeholder="Optional"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Landmark
              </span>
              <input
                value={value.landmark}
                onChange={(event) =>
                  onChange({
                    landmark: event.target.value,
                  })
                }
                placeholder="Nearby landmark"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
              />
            </label>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <h2 className="text-base font-semibold text-slate-900">
              Pin the property
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Click the map to place the exact property location.
            </p>
          </div>

          <div className="h-[420px]">
            <PropertyLocationMap
              latitude={value.latitude}
              longitude={value.longitude}
              onChange={(latitude, longitude) =>
                onChange({
                  latitude,
                  longitude,
                })
              }
            />
          </div>

          <div className="grid gap-4 border-t border-slate-100 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Latitude
              </p>
              <p className="mt-1 font-mono text-sm text-slate-900">
                {value.latitude?.toFixed(8) ?? "Not selected"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Longitude
              </p>
              <p className="mt-1 font-mono text-sm text-slate-900">
                {value.longitude?.toFixed(8) ?? "Not selected"}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
