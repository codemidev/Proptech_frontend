"use client";

import { useEffect, useMemo } from "react";
import proj4 from "proj4";
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

type SurveyPoint = {
  pointOrder: number;
  beaconId: string;
  easting: number;
  northing: number;
};

type LatLngPoint = {
  pointOrder: number;
  beaconId: string;
  latitude: number;
  longitude: number;
};

function getWgs84UtmDefinition(coordinateSystem: string | null) {
  if (!coordinateSystem) return null;

  const normalized = coordinateSystem.trim();

  const utmMatch = normalized.match(
    /^WGS84\s*\/\s*UTM\s+ZONE\s+(\d{1,2})([NS])$/i,
  );

  const epsgMatch = normalized.match(/^EPSG:(326\d{2}|327\d{2})$/i);

  let zone: number;
  let south: boolean;

  if (utmMatch) {
    zone = Number(utmMatch[1]);
    south = utmMatch[2]?.toUpperCase() === "S";
  } else if (epsgMatch) {
    const code = epsgMatch[1]!;
    zone = Number(code.slice(-2));
    south = code.startsWith("327");
  } else {
    return null;
  }

  if (!Number.isInteger(zone) || zone < 1 || zone > 60) return null;

  return `+proj=utm +zone=${zone} ${south ? "+south " : ""}+datum=WGS84 +units=m +no_defs +type=crs`;
}

function FitSurveyBounds({ points }: { points: LatLngPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    const bounds = points.map(
      (point): [number, number] => [point.latitude, point.longitude],
    );

    if (bounds.length === 1) {
      map.setView(bounds[0], 18);
    } else {
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 19 });
    }
  }, [map, points]);

  return null;
}

export default function SurveyParcelMap({
  points,
  coordinateSystem,
  units,
}: {
  points: SurveyPoint[];
  coordinateSystem: string | null;
  units: string | null;
}) {
  const projection = getWgs84UtmDefinition(coordinateSystem);
  const metreUnits = Boolean(
    units && /^(metres?|meters?)$/i.test(units.trim()),
  );

  const geographicPoints = useMemo<LatLngPoint[]>(() => {
    if (!projection || !metreUnits) return [];

    return points.flatMap((point) => {
      try {
        const [longitude, latitude] = proj4(
          projection,
          "EPSG:4326",
          [point.easting, point.northing],
        );

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          return [];
        }

        return [{
          pointOrder: point.pointOrder,
          beaconId: point.beaconId,
          latitude,
          longitude,
        }];
      } catch {
        return [];
      }
    });
  }, [points, projection, metreUnits]);

  if (!projection || !metreUnits) {
    return (
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Geographic preview unavailable</p>
        <p className="mt-1 text-xs leading-5">
          The extracted coordinates are retained for review, but a map preview
          requires an explicitly identified WGS 84 UTM zone (or supported WGS 84
          UTM EPSG code) and meter units. Minna datum and ambiguous coordinate
          systems must be verified before conversion.
        </p>
      </div>
    );
  }

  if (geographicPoints.length < 3) {
    return (
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        At least three valid converted survey points are required to preview a parcel boundary.
      </div>
    );
  }

  const positions = geographicPoints.map(
    (point): [number, number] => [point.latitude, point.longitude],
  );

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">
            Survey parcel preview
          </h4>
          <p className="text-xs text-slate-500">
            {geographicPoints.length} converted beacon points · {coordinateSystem}
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
          Preliminary · Not certified
        </span>
      </div>

      <div className="h-[360px] w-full">
        <MapContainer
          center={positions[0]!}
          zoom={17}
          scrollWheelZoom
          className="h-full min-h-[360px] w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitSurveyBounds points={geographicPoints} />

          <Polygon
            positions={positions}
            pathOptions={{
              color: "#a16207",
              weight: 2,
              fillColor: "#facc15",
              fillOpacity: 0.2,
            }}
          />

          <Polyline
            positions={[...positions, positions[0]!]}
            pathOptions={{
              color: "#d97706",
              weight: 4,
              dashArray: "10 8",
              className: "landvault-survey-animated-boundary",
            }}
          />

          {geographicPoints.map((point, index) => (
            <CircleMarker
              key={`${point.pointOrder}-${point.beaconId}`}
              center={[point.latitude, point.longitude]}
              radius={index === 0 ? 9 : 7}
              pathOptions={{
                color: "#78350f",
                weight: 2,
                fillColor: "#facc15",
                fillOpacity: 1,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>Point {point.pointOrder}</strong>
                  <br />
                  Beacon: {point.beaconId}
                  <br />
                  Latitude: {point.latitude.toFixed(7)}
                  <br />
                  Longitude: {point.longitude.toFixed(7)}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <style jsx global>{`
        .landvault-survey-animated-boundary {
          animation: landvault-survey-dash 18s linear infinite;
        }

        @keyframes landvault-survey-dash {
          to {
            stroke-dashoffset: -180;
          }
        }
      `}</style>

      <p className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
        This is a visualization of OCR-extracted coordinates, not a cadastral
        survey validation or ownership certification. Verify the source survey
        and coordinate reference system with a qualified surveyor.
      </p>
    </section>
  );
}
