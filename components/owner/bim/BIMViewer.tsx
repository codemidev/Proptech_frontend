/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import * as THREE from "three";
import * as OBC from "@thatopen/components";

import { resolveMediaUrl } from "@/lib/api";

type BIMViewerProps = {
  fileUrl: string;
  modelName?: string;
  version?: number;
};

export default function BIMViewer({
  fileUrl,
  modelName = "BIM Model",
  version,
}: BIMViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [status, setStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");

  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;

    const container = containerRef.current;

    if (!container || !fileUrl) {
      return;
    }

    let components: OBC.Components | null = null;
    let world: any = null;
    let fragments: any = null;
    let model: any = null;

    const cleanup = async () => {
      try {
        if (model && fragments?.core) {
          try {
            fragments.core.disposeModel(model);
          } catch {
            // Some library versions clean models during component disposal.
          }
        }

        if (components) {
          components.dispose();
        }
      } catch {
        // Viewer cleanup must never break the property wizard.
      }

      if (container) {
        container.replaceChildren();
      }
    };

    async function load() {
      try {
        setStatus("loading");
        setError("");

        components = new OBC.Components();

        const worlds = components.get(OBC.Worlds);

        world = worlds.create<
          OBC.SimpleScene,
          OBC.SimpleCamera,
          OBC.SimpleRenderer
        >();

        const scene = new OBC.SimpleScene(components);
        scene.setup();
        scene.three.background = new THREE.Color(0xf8fafc);
        world.scene = scene;

        const renderer = new OBC.SimpleRenderer(
          components,
          container!,
        );

        world.renderer = renderer;

        const camera = new OBC.SimpleCamera(
          components,
        );

        world.camera = camera;

        components.init();

        const fragmentsManager =
          components.get(OBC.FragmentsManager);

        const workerUrl =
          await OBC.FragmentsManager.getWorker();

        if (disposed) {
          await cleanup();
          return;
        }

        fragmentsManager.init(workerUrl);
        fragments = fragmentsManager;

        camera.controls.addEventListener(
          "update",
          () => {
            fragmentsManager.core.update();
          },
        );

        fragmentsManager.list.onItemSet.add(
          ({ value: fragmentModel }: any) => {
            fragmentModel.useCamera(
              camera.three,
            );

            scene.three.add(
              fragmentModel.object,
            );

            void fragmentsManager.core.update(true);
          },
        );

        const ifcLoader =
          components.get(OBC.IfcLoader);

        await ifcLoader.setup({
          autoSetWasm: true,
        });

        if (disposed) {
          await cleanup();
          return;
        }

        const url = resolveMediaUrl(fileUrl);

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `Unable to load IFC file (${response.status})`,
          );
        }

        const buffer =
          await response.arrayBuffer();

        if (!buffer.byteLength) {
          throw new Error(
            "The IFC file is empty.",
          );
        }

        if (disposed) {
          await cleanup();
          return;
        }

        model = await ifcLoader.load(
          new Uint8Array(buffer),
          true,
          `bim-${version ?? Date.now()}`,
        );

        if (disposed) {
          await cleanup();
          return;
        }

        scene.three.add(model.object);

        await fragmentsManager.core.update(
          true,
        );

        camera.controls.setLookAt(
          10,
          10,
          10,
          0,
          0,
          0,
          false,
        );

        setStatus("ready");
      } catch (err) {
        console.error(
          "[BIMViewer] IFC viewer error:",
          err,
        );

        if (!disposed) {
          setStatus("error");
          setError(
            err instanceof Error
              ? err.message
              : "Unable to render this IFC model.",
          );
        }
      }
    }

    void load();

    return () => {
      disposed = true;
      void cleanup();
    };
  }, [fileUrl, version]);

  return (
    <div className="relative h-[480px] w-full overflow-hidden bg-slate-950">
      <div
        ref={containerRef}
        className="absolute inset-0"
      />

      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90">
          <div className="rounded-xl bg-white px-5 py-4 text-center shadow-lg">
            <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
            <p className="text-sm font-semibold text-slate-900">
              Loading {modelName}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Preparing IFC 3D model...
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/95 p-6">
          <div className="max-w-md rounded-xl bg-white p-5 shadow-lg">
            <p className="font-semibold text-red-700">
              BIM viewer could not load this model
            </p>

            <p className="mt-2 text-sm text-slate-600">
              {error}
            </p>

            <p className="mt-3 text-xs text-slate-500">
              The original IFC file remains stored and can
              be processed again later.
            </p>
          </div>
        </div>
      )}

      {status === "ready" && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-white/90 px-3 py-2 text-xs shadow">
          <span className="font-semibold text-slate-900">
            {modelName}
          </span>

          {version != null && (
            <span className="ml-2 text-slate-500">
              v{version}
            </span>
          )}

          <span className="ml-3 text-slate-500">
            Drag to orbit · Scroll to zoom · Right-drag to pan
          </span>
        </div>
      )}
    </div>
  );
}
