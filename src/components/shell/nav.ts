export type NavItem = {
  href: string;
  label: string;
  icon: "verify" | "circle" | "requests" | "safety";
};

export const shellNav: NavItem[] = [
  { href: "/", label: "Verify", icon: "verify" },
  { href: "/circle", label: "Circle", icon: "circle" },
  { href: "/requests", label: "Requests", icon: "requests" },
  { href: "/safety", label: "Safety", icon: "safety" },
];
