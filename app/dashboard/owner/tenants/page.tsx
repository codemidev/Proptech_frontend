import { redirect } from "next/navigation";

export default function OwnerTenantsRedirectPage() {
  redirect("/dashboard/owner/tenant-applications");
}
