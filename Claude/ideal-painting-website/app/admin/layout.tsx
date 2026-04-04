import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const adminLinks = [
  { label: "Images", href: "/admin/images" },
  { label: "Articles", href: "/admin/articles" },
  { label: "Gallery", href: "/admin/gallery" },
  { label: "Proposals", href: "/admin/proposals" },
  { label: "Settings", href: "/admin/settings" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Debug: if you're getting redirected, check the console
  if (error) {
    console.error("Admin layout profile query error:", error.message);
  }
  console.log("Admin check — user:", user.id, "profile:", profile, "role:", profile?.role);

  if (!profile || profile.role !== "admin") redirect("/portal");

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-primary min-h-screen p-6 flex flex-col shrink-0">
        <Link
          href="/admin/images"
          className="font-headline text-lg font-bold text-on-primary tracking-tight"
        >
          CMS
        </Link>
        <p className="font-body text-xs text-primary-fixed-dim mt-1">
          Ideal Painting Admin
        </p>

        <nav className="mt-8 flex flex-col gap-1 flex-1">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-headline text-sm px-3 py-2 rounded-md text-on-primary/70 hover:bg-on-primary/10 hover:text-on-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-2 mt-auto">
          <Link
            href="/portal"
            className="font-headline text-sm text-on-primary/50 hover:text-on-primary transition-colors"
          >
            Portal
          </Link>
          <Link
            href="/"
            className="font-headline text-sm text-on-primary/50 hover:text-on-primary transition-colors"
          >
            View Site
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-8 bg-surface">{children}</main>
    </div>
  );
}
