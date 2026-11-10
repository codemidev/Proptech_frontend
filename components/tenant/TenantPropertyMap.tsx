"use client";

import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

type Props = {
  latitude: number;
  longitude: number;
};

const propertyPin = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 28px;
      height: 28px;
      border-radius: 9999px;
      background: #facc15;
      border: 4px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,.3);
    "></div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export default function TenantPropertyMap({
  latitude,
  longitude,
}: Props) {
  const position: [number, number] = [latitude, longitude];

  return (
    <MapContainer
      center={position}
      zoom={15}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      touchZoom={false}
      keyboard={false}
      className="h-64 w-full"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position} icon={propertyPin} />
    </MapContainer>
  );
}
