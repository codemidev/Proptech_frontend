"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export default function PropertiesPreview() {
  const { getToken } = useAuth();
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const data = await apiFetch("/api/v1/properties", token);
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, [getToken]);

  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;
  if (!result) return <p>Loading properties…</p>;

  return <pre>{JSON.stringify(result, null, 2)}</pre>;
}