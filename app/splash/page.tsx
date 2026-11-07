"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { LoadingScreen } from "@/components/shell/LoadingScreen";

export default function SplashPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    const timer = setTimeout(() => {
      router.replace(isSignedIn ? "/dashboard" : "/onboarding");
    }, 1400);

    return () => clearTimeout(timer);
  }, [isLoaded, isSignedIn, router]);

  return <LoadingScreen />;
}
