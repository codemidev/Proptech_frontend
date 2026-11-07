import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ResetSuccessPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 py-10 text-center">
      <div className="rounded-full bg-status-success-bg p-4">
        <CheckCircle2 size={32} className="text-status-success-fg" />
      </div>

      <h1 className="text-xl font-bold">Password Updated Successfully</h1>
      <p className="max-w-xs text-sm text-black/50">
        You can now log in using your new password.
      </p>

      <Link href="/dashboard" className="w-full max-w-sm">
        <Button>Continue</Button>
      </Link>
    </main>
  );
}
