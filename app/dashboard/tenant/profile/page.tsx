"use client";

import { useEffect, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { LogOut, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TopAppBar } from "@/components/shell/TopAppBar";
import { LoadingScreen } from "@/components/shell/LoadingScreen";

type CurrentUserResponse = {
  success: boolean;
  data: {
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
      avatar: string | null;
      phoneNumber: string | null;
      status: string;
      isVerified: boolean;
      isActive: boolean;
    };
  };
};

export default function ProfilePage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();

  const [user, setUser] = useState<CurrentUserResponse["data"]["user"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    let active = true;

    const loadProfile = async () => {
      try {
        const response = await apiFetch<CurrentUserResponse>("/api/v1/me", getToken);
        if (active) setUser(response.data.user);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load your profile.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, getToken, router]);

  if (!isLoaded || loading) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  const fullName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ") || "Tenant";

  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "U";

  return (
    <>
      <TopAppBar title="Profile" />

      <main className="mx-auto max-w-lg space-y-5 px-5 py-6 pb-28">
        {error ? (
          <section role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">Unable to load your profile</p>
            <p className="mt-1 break-words text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="mt-3 text-sm font-semibold text-red-700 underline"
            >
              Try again
            </button>
          </section>
        ) : user ? (
          <>
            <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy text-xl font-semibold text-white">
                  {user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                  ) : initials}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-[#111827]">{fullName}</h2>
                  <p className="mt-1 truncate text-sm text-[#667085]">{user.email}</p>
                  <span className="mt-2 inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                    {user.isActive ? "Active account" : "Inactive account"}
                  </span>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
              <h3 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-[#111827]">
                Personal information
              </h3>

              <div className="divide-y divide-gray-100">
                <div className="flex items-center gap-3 px-4 py-4">
                  <UserRound size={18} className="shrink-0 text-[#667085]" />
                  <div className="min-w-0">
                    <p className="text-xs text-[#667085]">Full name</p>
                    <p className="mt-1 break-words text-sm font-medium text-[#111827]">{fullName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-4">
                  <Mail size={18} className="shrink-0 text-[#667085]" />
                  <div className="min-w-0">
                    <p className="text-xs text-[#667085]">Email address</p>
                    <p className="mt-1 break-all text-sm font-medium text-[#111827]">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-4">
                  <Phone size={18} className="shrink-0 text-[#667085]" />
                  <div className="min-w-0">
                    <p className="text-xs text-[#667085]">Phone number</p>
                    <p className="mt-1 text-sm font-medium text-[#111827]">{user.phoneNumber || "Not provided"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-4">
                  <ShieldCheck size={18} className="shrink-0 text-[#667085]" />
                  <div className="min-w-0">
                    <p className="text-xs text-[#667085]">Account verification</p>
                    <p className="mt-1 text-sm font-medium text-[#111827]">
                      {user.isVerified ? "Verified" : "Verification pending"}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : null}

        <button
          type="button"
          onClick={() => void signOut({ redirectUrl: "/sign-in" })}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50"
        >
          <LogOut size={17} />
          Sign out of your account
        </button>
      </main>
    </>
  );
}
