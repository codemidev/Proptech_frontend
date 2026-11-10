"use client";

import { useRef, useState, type ChangeEvent } from "react";
import type { GetToken } from "@/lib/api";
import { apiFetch, resolveMediaUrl } from "@/lib/api";

type MediaItem = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  type?: string;
  caption?: string | null;
  isFeatured?: boolean;
};

type PropertyImagesProps = {
  propertyId: string;
  media: MediaItem[];
  getToken: GetToken;
  onChange: () => void;
};

type UploadResponse = {
  success: boolean;
  data: MediaItem;
};

export function PropertyImages({
  propertyId,
  media = [],
  getToken,
  onChange,
}: PropertyImagesProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function uploadFiles(files: File[], type: "IMAGE" | "VIDEO") {
    if (files.length === 0) return;

    setUploading(true);
    setError("");
    let uploadedCount = 0;

    try {
      for (const [index, file] of files.entries()) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);

        const hasFeaturedImage = media.some(
          (item) => !item.type || item.type === "IMAGE",
        );

        const shouldFeature =
          type === "IMAGE" &&
          !hasFeaturedImage &&
          index === 0;

        formData.append("isFeatured", String(shouldFeature));

        await apiFetch<UploadResponse>(
          `/api/v1/properties/${propertyId}/media`,
          getToken,
          {
            method: "POST",
            body: formData,
          },
        );

        uploadedCount += 1;
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload property media",
      );
    } finally {
      if (uploadedCount > 0) onChange();
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  }

  function handleImagesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    void uploadFiles(files, "IMAGE");
  }

  function handleVideoSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    void uploadFiles(files.slice(0, 1), "VIDEO");
  }

  async function handleDelete(mediaId: string) {
    setError("");

    try {
      await apiFetch(
        `/api/v1/properties/${propertyId}/media/${mediaId}`,
        getToken,
        { method: "DELETE" },
      );
      onChange();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to remove media",
      );
    }
  }

  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-medium text-[var(--foreground)]">
        Property photos and video
      </p>

      <div className="flex flex-wrap gap-3">
        {media.map((item) => {
          const isVideo = item.type === "VIDEO";

          return (
            <div
              key={item.id}
              className="relative h-24 w-24 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]"
            >
              {isVideo ? (
                <video
                  src={resolveMediaUrl(item.url)}
                  muted
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveMediaUrl(item.thumbnailUrl ?? item.url)}
                  alt={item.caption ?? "Property photo"}
                  className="h-full w-full object-cover"
                />
              )}

              {isVideo && (
                <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] text-white">
                  VIDEO
                </span>
              )}

              {item.isFeatured && (
                <span className="absolute left-1 top-1 rounded bg-yellow-400 px-1.5 py-0.5 text-[10px] font-semibold text-black">
                  FEATURED
                </span>
              )}

              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                aria-label={`Remove ${isVideo ? "video" : "photo"}`}
                disabled={uploading}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-sm text-white disabled:opacity-50"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "+ Add photos"}
        </button>

        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] disabled:opacity-50"
        >
          + Add short video
        </button>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={handleImagesSelected}
        className="hidden"
      />

      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={handleVideoSelected}
        className="hidden"
      />

      <p className="mt-2 text-xs text-[var(--muted-foreground)]">
        Add multiple photos and one short property video. Maximum upload size: 100 MB per file.
      </p>

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
