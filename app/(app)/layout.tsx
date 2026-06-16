import { getCurrentUser } from "@/lib/data";
import { Nav } from "./_components/nav";
import { ProfileAvatar } from "./_components/profile-avatar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <Nav />
          </div>

          <ProfileAvatar
            username={user?.username ?? "?"}
            avatarUrl={user?.avatarUrl}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5">
        {children}
      </main>
    </div>
  );
}
