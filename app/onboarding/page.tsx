"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const slides = [
  {
    title: "Find Your Perfect Home Effortlessly",
    description:
      "Browse verified properties from trusted landlords and agents in minutes.",
  },
  {
    title: "Everything Your Home Needs",
    description:
      "Pay utility bills, book inspections, and connect with trusted professionals in one secure platform.",
  },
  {
    title: "A Better Experience for Everyone",
    description:
      "Whether you are a landlord, tenant or agent, we've built one platform that works for all.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);

  const goToSignUp = () => router.push("/sign-up");

  const handleNext = () => {
    if (index === slides.length - 1) {
      goToSignUp();
      return;
    }

    setIndex((current) => current + 1);
  };

  const slide = slides[index];

  return (
    <main className="flex min-h-screen flex-col bg-white px-6 py-10">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={goToSignUp}
          className="text-sm font-medium text-black/50"
        >
          Skip
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="h-56 w-full max-w-xs rounded-2xl bg-navy/5" />

        <h2 className="text-xl font-bold">{slide.title}</h2>
        <p className="max-w-xs text-sm text-black/50">{slide.description}</p>
      </div>

      <div className="flex items-center justify-center gap-1.5 pb-6">
        {slides.map((_, dotIndex) => (
          <span
            key={dotIndex}
            className={`h-1.5 rounded-full transition-all ${
              dotIndex === index ? "w-5 bg-brand-yellow" : "w-1.5 bg-black/15"
            }`}
          />
        ))}
      </div>

      <Button onClick={handleNext}>
        {index === slides.length - 1 ? "Get Started" : "Next"}
      </Button>
    </main>
  );
}
