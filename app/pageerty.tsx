"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";

const listingTypeNavLinks = [
  { label: "Buy", href: "/properties?listingType=SALE" },
  { label: "Rent", href: "/properties?listingType=RENT" },
  { label: "Shortlet", href: "/properties?listingType=SHORTLET" },
];

const categories = [
  {
    name: "Homes",
    description: "Apartments, houses and duplexes",
    href: "/properties?category=RESIDENTIAL",
  },
  {
    name: "Land",
    description: "Undeveloped land and plots",
    href: "/properties?category=LAND",
  },
  {
    name: "Commercial",
    description: "Offices, shops and retail space",
    href: "/properties?category=COMMERCIAL",
  },
  {
    name: "Shortlets",
    description: "Short-stay furnished properties",
    href: "/properties?listingType=SHORTLET",
  },
];

const trustPoints = [
  "Verified Properties",
  "Document Verification",
  "Secure Transactions",
  "Digital Property Records",
];

const steps = ["Search", "Inspect", "Verify", "Transact"];

const roleCards = [
  {
    title: "Find a Property",
    description: "Browse verified homes, land and commercial listings",
    href: "/properties",
    cta: "Browse Properties",
  },
  {
    title: "List a Property",
    description: "Reach verified tenants and buyers as a landlord",
    href: "/sign-up",
    cta: "Get Started",
  },
  {
    title: "Become an Agent",
    description: "Manage inspections and tenancies for your clients",
    href: "/sign-up",
    cta: "Get Started",
  },
  {
    title: "Real Estate Company",
    description: "Manage your portfolio under one organization",
    href: "/sign-up",
    cta: "Get Started",
  },
];

export default function Home() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const [heroListingType, setHeroListingType] = useState("SALE");
  const [heroSearch, setHeroSearch] = useState("");

  function handleHeroSearch(event: FormEvent) {
    event.preventDefault();

    const params = new URLSearchParams({ listingType: heroListingType });
    if (heroSearch.trim()) params.set("search", heroSearch.trim());

    router.push(`/properties?${params.toString()}`);
  }

  return (
    <main className="min-h-screen bg-white text-black">
      {/* HEADER */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 bg-white px-8 py-5">
        <Link href="/" className="text-2xl font-bold">
          Aviritech<span className="text-brand-yellow-dark">PropTech</span>
        </Link>

        <nav className="hidden gap-8 text-sm font-medium md:flex">
          {listingTypeNavLinks.map((link) => (
            <Link key={link.label} href={link.href} className="hover:text-brand-yellow-dark">
              {link.label}
            </Link>
          ))}
          <Link href="/properties?category=LAND" className="hover:text-brand-yellow-dark">
            Land
          </Link>
          <Link href="/properties?category=COMMERCIAL" className="hover:text-brand-yellow-dark">
            Commercial
          </Link>
        </nav>

        <div className="flex gap-3">
          {isSignedIn ? (
            <Link href="/dashboard" className="rounded-full bg-brand-yellow px-5 py-2 font-semibold text-black">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="rounded-full border border-black/10 px-5 py-2">
                Login
              </Link>
              <Link href="/sign-up" className="rounded-full bg-brand-yellow px-5 py-2 font-semibold text-black">
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* HERO */}
      <section className="relative bg-navy px-8 py-24 text-white">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-5xl font-bold leading-tight md:text-6xl">
            Find verified properties
            <br />
            you can trust
          </h1>

          <p className="mt-6 text-lg text-white/70">
            Discover homes, land and commercial properties with verified
            documentation and secure transactions.
          </p>

          <form
            onSubmit={handleHeroSearch}
            className="mt-12 grid gap-4 rounded-2xl bg-white p-5 text-black shadow-xl md:grid-cols-4"
          >
            <select
              value={heroListingType}
              onChange={(e) => setHeroListingType(e.target.value)}
              className="rounded-lg border border-black/10 p-3"
            >
              <option value="SALE">Buy</option>
              <option value="RENT">Rent</option>
              <option value="SHORTLET">Shortlet</option>
            </select>

            <div className="relative md:col-span-2">
              <SearchIcon
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30"
              />
              <input
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                placeholder="Search by title or property code"
                className="w-full rounded-lg border border-black/10 p-3 pl-10"
              />
            </div>

            <button
              type="submit"
              className="rounded-lg bg-brand-yellow font-bold text-black transition hover:bg-brand-yellow-dark"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="px-8 py-20">
        <h2 className="text-center text-3xl font-bold">Explore Properties</h2>

        <div className="mt-10 grid gap-6 md:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={category.href}
              className="rounded-2xl border border-black/10 p-8 shadow-sm transition hover:border-brand-yellow hover:shadow-lg"
            >
              <h3 className="text-xl font-bold">{category.name}</h3>
              <p className="mt-3 text-gray-600">{category.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* TRUST */}
      <section className="bg-gray-100 px-8 py-20">
        <h2 className="text-center text-3xl font-bold">Smart Trust™</h2>

        <div className="mt-10 grid gap-6 md:grid-cols-4">
          {trustPoints.map((item) => (
            <div key={item} className="rounded-xl bg-white p-6 text-center">
              <div className="text-3xl text-brand-yellow-dark">✓</div>
              <h3 className="mt-3 font-semibold">{item}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-8 py-20">
        <h2 className="text-center text-3xl font-bold">How It Works</h2>

        <div className="mt-10 flex flex-wrap justify-center gap-10">
          {steps.map((step, index) => (
            <div key={step} className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-yellow font-bold text-black">
                {index + 1}
              </div>
              <p className="mt-3 font-semibold">{step}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ROLE SECTION */}
      <section className="bg-navy px-8 py-20 text-white">
        <h2 className="text-center text-3xl font-bold">What brings you here?</h2>

        <div className="mt-10 grid gap-6 md:grid-cols-4">
          {roleCards.map((role) => (
            <div key={role.title} className="rounded-xl border border-white/15 p-6">
              <h3 className="text-xl font-bold">{role.title}</h3>
              <p className="mt-2 text-sm text-white/60">{role.description}</p>
              <Link
                href={role.href}
                className="mt-5 inline-block rounded-lg bg-brand-yellow px-4 py-2 font-semibold text-black"
              >
                {role.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-black/5 px-8 py-12">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 md:flex-row md:justify-between">
          <div>
            <div className="text-xl font-bold">
              Aviritech<span className="text-brand-yellow-dark">PropTech</span>
            </div>
            <p className="mt-2 max-w-xs text-sm text-gray-500">
              A modern digital property platform for Nigeria and beyond.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-10 gap-y-4 text-sm">
            <div>
              <p className="mb-2 font-semibold text-gray-900">Explore</p>
              <div className="flex flex-col gap-2 text-gray-500">
                <Link href="/properties?listingType=SALE" className="hover:text-black">Buy</Link>
                <Link href="/properties?listingType=RENT" className="hover:text-black">Rent</Link>
                <Link href="/properties?listingType=SHORTLET" className="hover:text-black">Shortlet</Link>
                <Link href="/properties" className="hover:text-black">All Properties</Link>
              </div>
            </div>

            <div>
              <p className="mb-2 font-semibold text-gray-900">Account</p>
              <div className="flex flex-col gap-2 text-gray-500">
                <Link href="/sign-in" className="hover:text-black">Login</Link>
                <Link href="/sign-up" className="hover:text-black">Get Started</Link>
              </div>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-5xl border-t border-black/5 pt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Aviritech PropTech
        </p>
      </footer>
    </main>
  );
}
