"use client";

import {
  MapContainer,
  Marker,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";

const defaultCenter: [number, number] = [
  4.8156,
  7.0498,
];

function LocationMarker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      onChange(
        event.latlng.lat,
        event.latlng.lng,
      );
    },
  });

  if (
    latitude === null ||
    longitude === null
  ) {
    return null;
  }

  return (
    <Marker
      position={[latitude, longitude]}
      icon={L.divIcon({
        className: "",
        html: `
          <div style="
            width: 28px;
            height: 28px;
            border-radius: 9999px;
            background: #facc15;
            border: 4px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,.25);
          "></div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })}
    />
  );
}


export default function PropertyLocationMap({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
}) {
  return (
    <MapContainer
      center={
        latitude !== null && longitude !== null
          ? [latitude, longitude]
          : defaultCenter
      }
      zoom={12}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <LocationMarker
        latitude={latitude}
        longitude={longitude}
        onChange={onChange}
      />
    </MapContainer>
  );
}
