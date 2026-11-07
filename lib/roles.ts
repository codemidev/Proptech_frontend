import { Home, Users, User as UserIcon, Wrench, Package, type LucideIcon } from "lucide-react";

export type RoleOption = {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const roleOptions: RoleOption[] = [
  {
    value: "PROPERTY_OWNER",
    label: "Landlord",
    description: "Manage your properties and tenants effortlessly",
    icon: Home,
  },
  {
    value: "TENANT",
    label: "Tenant",
    description: "Find and manage your rental home",
    icon: UserIcon,
  },
  {
    value: "AGENT",
    label: "Agent",
    description: "List and manage tenancy for your clients",
    icon: Users,
  },
  {
    value: "VENDOR",
    label: "Vendor",
    description: "Provide products and property services",
    icon: Package,
  },
  {
    value: "TECHNICIAN",
    label: "Technician",
    description: "Provide technical and maintenance services",
    icon: Wrench,
  },
];
