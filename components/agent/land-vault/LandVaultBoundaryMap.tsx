"use client";

import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { useEffect } from "react";
import type { LatLngExpression } from "leaflet";

export type BoundaryPoint = {
  latitude: number;
  longitude: number;
};

function MapClick({
  onAddPoint,
}: {
  onAddPoint: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      onAddPoint(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function FitPoints({ points }: { points: BoundaryPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const bounds = points.map(
      (point): [number, number] => [point.latitude, point.longitude],
    );
    if (bounds.length === 1) {
      map.setView(bounds[0], 17);
    } else {
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 18 });
    }
  }, [map, points]);

  return null;
}

export default function LandVaultBoundaryMap({
  points,
  ownerCoordinates,
  onAddPoint,
  editable,
}: {
  points: BoundaryPoint[];
  ownerCoordinates: BoundaryPoint[];
  onAddPoint: (latitude: number, longitude: number) => void;
  editable: boolean;
}) {
  const center: LatLngExpression =
    points.length > 0
      ? [points[0].latitude, points[0].longitude]
      : ownerCoordinates.length > 0
        ? [ownerCoordinates[0].latitude, ownerCoordinates[0].longitude]
        : [4.8156, 7.0498];

  const agentPositions = points.map(
    (point) => [point.latitude, point.longitude] as LatLngExpression,
  );

  const ownerPositions = ownerCoordinates.map(
    (point) => [point.latitude, point.longitude] as LatLngExpression,
  );

  return (
    <MapContainer
      center={center}
      zoom={15}
      scrollWheelZoom
      className="h-full min-h-[340px] w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitPoints points={points.length ? points : ownerCoordinates} />

      {editable && <MapClick onAddPoint={onAddPoint} />}

      {ownerPositions.map((position, index) => (
        <CircleMarker
          key={`owner-${index}`}
          center={position}
          radius={7}
          pathOptions={{
            color: "#2563eb",
            fillColor: "#60a5fa",
            fillOpacity: 0.9,
            weight: 2,
          }}
        />
      ))}

      {agentPositions.length >= 2 && (
        <Polyline
          positions={agentPositions}
          pathOptions={{ color: "#d97706", weight: 3, dashArray: "7 6" }}
        />
      )}

      {agentPositions.length >= 3 && (
        <Polygon
          positions={agentPositions}
          pathOptions={{
            color: "#b45309",
            fillColor: "#facc15",
            fillOpacity: 0.2,
            weight: 3,
          }}
        />
      )}

      {agentPositions.map((position, index) => (
        <CircleMarker
          key={`agent-${index}`}
          center={position}
          radius={index === 0 ? 8 : 6}
          pathOptions={{
            color: "#92400e",
            fillColor: "#facc15",
            fillOpacity: 1,
            weight: 2,
          }}
        />
      ))}
    </MapContainer>
  );
}
