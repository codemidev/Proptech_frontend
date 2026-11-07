"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/shell/LoadingScreen";
import { Button } from "@/components/ui/Button";
import { RoleOptionCard } from "@/components/auth/RoleOptionCard";
import { roleOptions } from "@/lib/roles";

const CONFIGURED_API_URL =
  process.env.NEXT_PUBLIC_API_URL?.trim() || "";

function resolveApiBaseUrl(): string {
  if (CONFIGURED_API_URL) {
    return CONFIGURED_API_URL.replace(/\/+$/, "");
  }

  if (typeof window === "undefined") {
    return "http://127.0.0.1:5000";
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port;

  // Direct Next.js development server.
  if (port === "3000") {
    return `${protocol}//${hostname}:5000`;
  }

  // Nginx/public front door.
  return "";
}

const API_URL = resolveApiBaseUrl();

export default function ProvisionPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  const [needsRole, setNeedsRole] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function provision(selectedRole: string, orgId: string) {
    setError(null);
    setSubmitting(true);

    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Authentication token unavailable");
      }

      const response = await fetch(`${API_URL}/api/v1/auth/provision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: selectedRole,
          ...(orgId ? { organizationId: orgId } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || data?.message || `Provisioning failed: ${response.status}`,
        );
      }

      sessionStorage.removeItem("signup_role");
      sessionStorage.removeItem("signup_organization_id");

      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create your application account",
      );
      setSubmitting(false);
      setNeedsRole(true);
    }
  }

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    const storedRole = sessionStorage.getItem("signup_role");
    const storedOrgId = sessionStorage.getItem("signup_organization_id") ?? "";

    if (storedRole) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      provision(storedRole, storedOrgId);
    } else {
      setNeedsRole(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, router]);

  if (needsRole) {
    return (
      <main className="flex min-h-screen flex-col bg-white px-4 py-10 text-neutral-900 [color-scheme:light] sm:px-6">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-xl font-bold">Choose Your Role</h1>
          <p className="mt-1 text-sm text-neutral-600">
            You&apos;re signed in — select how you&apos;ll use the platform to finish
            setting up your account.
          </p>

          <div className="mt-6 space-y-3" role="group" aria-label="Account role">
            {roleOptions.map((item) => (
              <RoleOptionCard
                key={item.value}
                option={item}
                selected={role === item.value}
                onSelect={setRole}
              />
            ))}
          </div>

          <div className="mt-4">
            <label htmlFor="organizationId" className="mb-1 block text-xs font-medium text-black/60">
              Organization ID (optional)
            </label>
            <input
              id="organizationId"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              placeholder="Leave blank to join Aviritech"
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-500 focus:border-brand-yellow"
            />
          </div>

          {error && <p className="mt-3 text-sm text-status-danger-fg">{error}</p>}

          <Button
            className="mt-5"
            disabled={!role || submitting}
            onClick={() => role && provision(role, organizationId.trim())}
          >
            {submitting ? "Setting up..." : "Continue"}
          </Button>
        </div>
      </main>
    );
  }

  return <LoadingScreen message="Setting up your account..." />;
}
