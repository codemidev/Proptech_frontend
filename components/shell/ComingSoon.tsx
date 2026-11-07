import { Sparkles } from "lucide-react";

type ComingSoonProps = {
  title: string;
  description: string;
};

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-8 py-24 text-center">
      <div className="rounded-full bg-brand-yellow/20 p-4">
        <Sparkles size={28} className="text-brand-yellow-dark" />
      </div>

      <h2 className="text-lg font-semibold">{title}</h2>

      <p className="max-w-xs text-sm text-black/50">{description}</p>
    </div>
  );
}
