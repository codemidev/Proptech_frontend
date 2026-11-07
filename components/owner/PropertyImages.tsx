"use client";

import { useRef, useState, type ChangeEvent } from "react";
import type { GetToken } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/api";

type MediaItem = { id: string; url: string; thumbnailUrl: string | null };

type PropertyImagesProps = {
  propertyId: string;
  media: MediaItem[];
  getToken: GetToken;
  onChange: () => void;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function PropertyImages({
  propertyId,
  media = [],
  getToken,
  onChange,
}: PropertyImagesProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token unavailable");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "IMAGE");
      formData.append("isFeatured", media.length === 0 ? "true" : "false");

      const response = await fetch(
        `${API_URL}/api/v1/properties/${propertyId}/media`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || data?.message || "Upload failed");
      }

      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(mediaId: string) {
    setError("");

    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token unavailable");

      const response = await fetch(
        `${API_URL}/api/v1/properties/${propertyId}/media/${mediaId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || data?.message || "Delete failed");
      }

      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove image");
    }
  }

  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-medium text-gray-700">Photos</p>

      <div className="flex flex-wrap gap-2">
        {media.map((item) => (
          <div key={item.id} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveMediaUrl(item.thumbnailUrl ?? item.url)}
              alt=""
              className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
            />
            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              aria-label="Remove image"
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white"
            >
              ×
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 disabled:opacity-50"
        >
          {uploading ? "..." : "+ Add"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelected}
          className="hidden"
        />
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
