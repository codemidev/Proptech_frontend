"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { LoadingScreen } from "@/components/shell/LoadingScreen";

type Role = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
};

type MeResponse = {
  success: boolean;
  data: {
    user: {
      id: string;
      clerkId: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      avatar: string | null;
      phoneNumber: string | null;
      status: string;
      isVerified: boolean;
      isActive: boolean;
      organizationId: string | null;
    };
    roles: Role[];
    primaryRole: string | null;
  };
};

export default function DashboardEntry() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    const loadDashboard = async () => {
      try {
        const response = await apiFetch<MeResponse>(
          "/api/v1/me",
          getToken,
        );

        const role = response.data.primaryRole;

        switch (role) {
          case "SUPER_ADMIN":
            router.replace("/dashboard/super-admin");
            break;

          case "ADMIN":
            router.replace("/dashboard/admin");
            break;

          case "PROPERTY_OWNER":
            router.replace("/dashboard/owner");
            break;

          case "AGENT":
            router.replace("/dashboard/agent");
            break;

          case "TENANT":
            router.replace("/dashboard/tenant");
            break;

          case "VENDOR":
            router.replace("/dashboard/vendor");
            break;

          case "TECHNICIAN":
            router.replace("/dashboard/technician");
            break;

          default:
            setError(
              "Your PropTech account does not have an assigned role.",
            );
            setLoading(false);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to load your PropTech account.";

        if (message === "Application user not found") {
          router.replace("/auth/provision");
          return;
        }

        console.error(err);
        setError(message);
        setLoading(false);
      }
    };

    loadDashboard();
  }, [isLoaded, isSignedIn, getToken, router]);

  if (!isLoaded || loading) {
    return <LoadingScreen message="Loading your workspace..." />;
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold">
            Unable to load dashboard
          </h1>

          <p className="mt-3 text-gray-400">
            {error}
          </p>

          <p className="mt-4 text-sm text-gray-500">
            Signed in as {user?.primaryEmailAddress?.emailAddress}
          </p>
        </div>
      </main>
    );
  }

  return null;
}