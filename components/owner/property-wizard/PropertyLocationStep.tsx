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
            { cache: "no-store" },
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

    if (Object.keys(patch).length > 0) {
      onChange(patch);
    }
  }, [
    countries,
    states,
    lgas,
    cities,
    value.countryId,
    value.countryName,
    value.stateId,
    value.stateName,
    value.localGovernmentId,
    value.localGovernmentName,
    value.cityId,
    value.cityName,
    onChange,
  ]);

  function selectCountry(countryId: string) {
    setStates([]);
    setLgas([]);
    setCities([]);
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
        (city) =>
          !city.localGovernmentId ||
          city.localGovernmentId === value.localGovernmentId,
      )
    : cities;

  function selectCity(cityId: string) {
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
                disabled={!value.localGovernmentId}
                options={filteredCities}
                placeholder="Select city"
                onChange={selectCity}
              />

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  District <span className="text-red-600">*</span>
                </span>
                <input
                  required
                  maxLength={200}
                  value={value.districtName}
                  onChange={(event) =>
                    onChange({
                      districtName: event.target.value,
                      districtId: "",
                      estateName: "",
                      estateId: "",
                    })
                  }
                  placeholder="Enter district or neighbourhood"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Estate <span className="text-red-600">*</span>
                </span>
                <input
                  required
                  maxLength={200}
                  value={value.estateName}
                  onChange={(event) =>
                    onChange({
                      estateName: event.target.value,
                      estateId: "",
                    })
                  }
                  placeholder="Enter estate name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                />
              </label>

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
