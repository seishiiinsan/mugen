import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getIsAdmin } from "@/lib/data";
import { ChevronLeftIcon } from "@/app/(app)/_components/icons";
import { AdminNav } from "./_components/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Invisible to everyone but the admin account.
  if (!(await getIsAdmin())) notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-accent/10 px-2 py-1 text-sm font-bold text-accent">
              Admin
            </span>
          </div>
          <AdminNav />
          <Link
            href="/matchs"
            className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            <ChevronLeftIcon className="size-4" />
            Retour à l&apos;app
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
