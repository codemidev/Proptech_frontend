import { redirect } from "next/navigation";

/**
 * Owner maintenance tools are attached to each owned property so that
 * service selection always has the correct property context.
 * Reuse that established workspace rather than introducing a second,
 * disconnected maintenance workflow.
 */
export default function OwnerMaintenancePage() {
  redirect("/dashboard/owner/properties");
}
