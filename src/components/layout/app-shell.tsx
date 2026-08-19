"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileSearch, Library, LayoutDashboard, Upload } from "lucide-react";
import type { User } from "@/generated/prisma/client";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/submit", label: "New submission", icon: Upload },
  { href: "/submissions", label: "Submissions", icon: FileSearch },
  { href: "/repository", label: "Repository", icon: Library },
];

export function AppShell({
  user,
  users,
  children,
}: {
  user: User;
  users: User[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-[var(--border)] bg-[var(--sidebar)] lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col px-4 py-5">
          <Link href="/" className="group mb-8 block px-2">
            <div className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--brand-strong)] transition-transform duration-300 group-hover:-translate-y-0.5">
              Originality
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Similarity & originality reports
            </p>
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-[var(--brand-soft)] font-medium text-[var(--brand-strong)]"
                      : "text-[var(--foreground)]/80 hover:bg-[var(--surface-2)]",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 border-t border-[var(--border)] pt-4">
            <RoleSwitcher current={user} users={users} />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--background)_88%,transparent)] px-5 py-3 backdrop-blur-md md:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
              Workspace
            </p>
            <p className="font-medium">{user.name ?? user.email}</p>
          </div>
          <div className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs text-[var(--muted)]">
            {user.role}
          </div>
        </header>
        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
