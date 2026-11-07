"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Droplet,
  Zap,
  Wind,
  Hammer,
  Paintbrush,
  Bug,
  CheckCircle2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TopAppBar } from "@/components/shell/TopAppBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type LeaseResponse = {
  success: boolean;
  data: {
    property: { id: string; title: string };
  } | null;
};

type CreatedRequest = {
  id: string;
  title: string;
  category: string | null;
  priority: string;
  createdAt: string;
  property: { id: string; title: string };
};

const categories = [
  { value: "Plumbing", icon: Droplet },
  { value: "Electrical", icon: Zap },
  { value: "AC/Cooling", icon: Wind },
  { value: "Carpentry", icon: Hammer },
  { value: "Painting", icon: Paintbrush },
  { value: "Pest Control", icon: Bug },
];

const priorities = [
  { value: "HIGH", label: "Urgent" },
  { value: "MEDIUM", label: "Normal" },
  { value: "LOW", label: "Low" },
] as const;

type Step = "category" | "details" | "submitted";

export default function NewMaintenanceRequestPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("category");
  const [property, setProperty] = useState<{ id: string; title: string } | null>(null);
  const [loadingLease, setLoadingLease] = useState(true);

  const [category, setCategory] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<(typeof priorities)[number]["value"]>("MEDIUM");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedRequest | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    const loadLease = async () => {
      try {
        const res = await apiFetch<LeaseResponse>("/api/v1/leases/me", getToken);
        setProperty(res.data?.property ?? null);
      } finally {
        setLoadingLease(false);
      }
    };

    loadLease();
  }, [isLoaded, isSignedIn, getToken, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!property) return;

    setError(null);
    setSubmitting(true);

    try {
      const res = await apiFetch<{ success: boolean; data: CreatedRequest }>(
        "/api/v1/maintenance-requests",
        getToken,
        {
          method: "POST",
          body: JSON.stringify({
            propertyId: property.id,
            title,
            description: description || undefined,
            category: category ?? undefined,
            priority,
          }),
        },
      );

      setCreated(res.data);
      setStep("submitted");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to submit your request",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingLease) {
    return (
      <>
        <TopAppBar title="New Request" />
        <p className="px-4 py-8 text-center text-sm text-black/40">Loading...</p>
      </>
    );
  }

  if (!property) {
    return (
      <>
        <TopAppBar title="New Request" />
        <div className="px-4 py-12 text-center">
          <p className="font-semibold">No active rental found</p>
          <p className="mt-1 text-sm text-black/50">
            You need an active rental to submit a maintenance request.
          </p>
        </div>
      </>
    );
  }

  if (step === "submitted" && created) {
    return (
      <>
        <TopAppBar title="Request Submitted" />
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <div className="rounded-full bg-status-success-bg p-4">
            <CheckCircle2 size={32} className="text-status-success-fg" />
          </div>

          <h2 className="text-lg font-semibold">Request Submitted!</h2>

          <Card className="w-full max-w-sm p-4 text-left text-sm">
            <div className="flex justify-between py-1">
              <span className="text-black/50">Ticket ID</span>
              <span className="font-medium">{created.id.slice(0, 12).toUpperCase()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-black/50">Category</span>
              <span className="font-medium">{created.category ?? "—"}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-black/50">Property</span>
              <span className="font-medium">{created.property.title}</span>
            </div>
          </Card>

          <p className="max-w-xs text-sm text-black/50">
            A technician will be assigned to your request. You can track
            progress from the Maintenance tab.
          </p>

          <Link href="/dashboard/tenant/maintenance" className="w-full max-w-sm">
            <Button>Back to Requests</Button>
          </Link>
        </div>
      </>
    );
  }

  if (step === "category") {
    return (
      <>
        <TopAppBar title="New Request" />
        <div className="mx-auto max-w-lg px-4 py-4">
          <p className="text-xs font-medium text-black/50">SELECT PROPERTY</p>
          <Card className="mt-1.5 p-3 text-sm font-medium">{property.title}</Card>

          <p className="mt-5 text-xs font-medium text-black/50">SELECT CATEGORY</p>
          <div className="mt-1.5 grid grid-cols-2 gap-3">
            {categories.map((item) => {
              const Icon = item.icon;
              const selected = category === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setCategory(item.value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 ${
                    selected
                      ? "border-brand-yellow bg-brand-yellow/10"
                      : "border-black/10 bg-white"
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-sm font-medium">{item.value}</span>
                </button>
              );
            })}
          </div>

          <Button
            className="mt-6"
            disabled={!category}
            onClick={() => setStep("details")}
          >
            Continue
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <TopAppBar title="Describe Issue" onBack={() => setStep("category")} />
      <div className="mx-auto max-w-lg px-4 py-4">
        <span className="inline-flex rounded-full bg-brand-yellow/20 px-3 py-1 text-xs font-semibold">
          {category} Request
        </span>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-black/60">
              Issue title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Leaking Kitchen Faucet"
              required
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-brand-yellow"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-black/60">
              Describe the problem
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Add any details that will help a technician diagnose the issue"
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-brand-yellow"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-black/60">
              Priority level
            </label>
            <div className="flex gap-2">
              {priorities.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPriority(item.value)}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-medium ${
                    priority === item.value
                      ? "border-brand-yellow bg-brand-yellow/10"
                      : "border-black/10 bg-white text-black/60"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-status-danger-fg">{error}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </form>
      </div>
    </>
  );
}
