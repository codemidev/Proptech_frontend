import Image from "next/image";

type LoadingScreenProps = {
  message?: string;
};

export function LoadingScreen({
  message = "All your property needs in one secure platform",
}: LoadingScreenProps) {
  return (
    <main data-app-loading="true" className="flex min-h-screen flex-col items-center justify-center gap-3 bg-black px-8 text-center text-white">
      <Image
        src="/brand/aviritech-logo.svg"
        alt="Aviritech PropTech"
        width={132}
        height={48}
        priority
        className="h-auto w-[58px] sm:w-[66px] object-contain"
      />

      <h1 className="text-2xl font-bold">Aviritech PropTech</h1>

      <p className="text-sm text-white/60">{message}</p>
      <span className="mt-2 h-1 w-10 animate-pulse rounded-full bg-brand-yellow" />
    </main>
  );
}
