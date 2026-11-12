"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoadingScreen } from "@/components/shell/LoadingScreen";

const CONFIGURED_API_URL = process.env.NEXT_PUBLIC_API_URL?.trim() || "";

function getApiUrl() {
  if (CONFIGURED_API_URL) return CONFIGURED_API_URL.replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location.port === "3000") {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return "";
}

export default function AcceptOwnerInvitationPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!isLoaded || started.current) return;
    started.current = true;

    const invitationUrl =
      window.location.pathname + window.location.search;
    const token = new URLSearchParams(window.location.search).get("token");

    if (!token || token.length < 20 || token.length > 500) {
      setError("This invitation link is invalid or incomplete.");
      return;
    }

    if (!isSignedIn) {
      router.replace(
        `/sign-in?redirect_url=${encodeURIComponent(invitationUrl)}`,
      );
      return;
    }

    async function accept() {
      try {
        const sessionToken = await getToken();
        if (!sessionToken) throw new Error("Your session has expired. Please sign in again.");

        const headers = {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        };

        const identityResponse = await fetch(
          `${getApiUrl()}/api/v1/auth/identity`,
          { method: "POST", headers },
        );
        const identityData = await identityResponse.json();

        if (!identityResponse.ok) {
          throw new Error(
            identityData?.error?.message ||
            identityData?.message ||
            "Unable to verify your account identity.",
          );
        }

        const response = await fetch(
          `${getApiUrl()}/api/v1/agents/owner/invitations/accept`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ token }),
          },
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error?.message ||
            data?.message ||
            "Unable to accept this invitation.",
          );
        }

        setFinished(true);
        router.replace("/dashboard");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Invitation acceptance failed.",
        );
      }
    }

    void accept();
  }, [getToken, isLoaded, isSignedIn, router]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 text-neutral-900">
        <div className="w-full max-w-md rounded-2xl border border-black/10 p-6">
          <h1 className="text-xl font-bold">Invitation could not be accepted</h1>
          <p className="mt-3 text-sm text-status-danger-fg">{error}</p>
          <Link
            href="/dashboard"
            className="mt-5 inline-block text-sm font-semibold underline"
          >
            Return to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <LoadingScreen
      message={finished ? "Invitation accepted. Opening your dashboard..." : "Verifying and accepting your owner invitation..."}
    />
  );
}
