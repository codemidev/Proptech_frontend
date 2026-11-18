import { redirect } from "next/navigation";

/**
 * Keep the owner dashboard's legacy Marketplace destination working while
 * routing visitors to the canonical public property marketplace.
 */
export default function MarketplacePage() {
  redirect("/properties");
}
