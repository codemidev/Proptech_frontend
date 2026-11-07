"use client";

import type { GetToken } from "@/lib/api";
import { PropertyImages } from "@/components/owner/PropertyImages";
import type {
  PropertyMedia,
  PropertyWizardData,
} from "./types";

type Props = {
  value: PropertyWizardData;
  media: PropertyMedia[];
  getToken: GetToken;
  onMediaChange: () => Promise<void> | void;
};

export function PropertyMediaStep({
  value,
  media,
  getToken,
  onMediaChange,
}: Props) {
  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Property media
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Upload clear, high-quality photos. The first uploaded photo is used as the featured image.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        {value.propertyId ? (
          <PropertyImages
            propertyId={value.propertyId}
            media={media}
            getToken={getToken}
            onChange={onMediaChange}
          />
        ) : (
          <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
            Save the property information before uploading photos.
          </div>
        )}

        <div className="mt-6 rounded-xl bg-yellow-50 p-4">
          <p className="text-sm font-semibold text-slate-900">
            Photo guidance
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-600">
            <li>Use clear, well-lit images.</li>
            <li>Show the exterior and important rooms.</li>
            <li>Avoid blurry or heavily edited photos.</li>
            <li>Make sure you have the right to publish the images.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
