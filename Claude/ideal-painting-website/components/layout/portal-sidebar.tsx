"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const portalLinks = [
  { label: "Dashboard", href: "/portal" },
  { label: "Proposal", href: "/portal/proposal" },
  { label: "Scope of Work", href: "/portal/scope" },
  { label: "Schedule", href: "/portal/schedule" },
  { label: "Colors", href: "/portal/colors" },
  { label: "Documents", href: "/portal/documents" },
  { label: "Photos", href: "/portal/photos" },
];

export function PortalSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="w-64 bg-surface-container-low min-h-screen p-6 flex flex-col shrink-0">
      <Link
        href="/"
        className="font-headline text-lg font-bold text-primary tracking-tight"
      >
        IDEAL PAINTING
      </Link>
      <p className="font-body text-xs text-on-surface-variant mt-1">
        Client Portal
      </p>

      <nav className="mt-8 flex flex-col gap-1 flex-1">
        {portalLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "font-headline text-sm px-3 py-2 rounded-md transition-colors",
              pathname === link.href
                ? "bg-primary-fixed text-primary font-semibold"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-2 mt-auto">
        <Link
          href="/admin"
          className="font-headline text-sm text-secondary font-medium hover:text-primary transition-colors"
        >
          Admin CMS
        </Link>
        <button
          onClick={handleSignOut}
          className="font-headline text-sm text-on-surface-variant hover:text-error transition-colors text-left"
        >
          Sign Out
        </button>
        <Link
          href="/"
          className="font-headline text-sm text-on-surface-variant hover:text-primary transition-colors"
        >
          &larr; Back to site
        </Link>
      </div>
    </aside>
  );
}
