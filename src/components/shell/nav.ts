export type NavItem = {
  href: string;
  label: string;
  icon: "verify" | "circle" | "requests" | "safety";
};

export const shellNav: NavItem[] = [
  { href: "/", label: "Verify", icon: "verify" },
  { href: "/circle", label: "Circle", icon: "circle" },
];
