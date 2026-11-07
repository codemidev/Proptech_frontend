"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import PropertiesPreview from "./properties-preview";

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>Smart Property</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Smart Property</h1>

      {!isSignedIn ? (
        <p>
          <Link href="/sign-in">Sign in</Link> to view properties.
        </p>
      ) : (
        <>
          <UserButton />
          <PropertiesPreview />
        </>
      )}
    </main>
  );
}