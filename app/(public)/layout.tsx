import type { ReactNode } from "react";
import { PublicNav } from "./_components/nav";
import { PublicFooter } from "./_components/footer";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicNav />
      <main className="flex flex-1 flex-col">{children}</main>
      <PublicFooter />
    </div>
  );
}
