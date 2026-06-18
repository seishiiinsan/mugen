import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getMyGroups, getPublicGroups } from "@/lib/data";
import { ChevronLeftIcon, GroupsIcon } from "../_components/icons";
import { GroupForms } from "./_components/group-forms";

export default async function GroupesPage() {
  const [me, groups, publicGroups] = await Promise.all([
    getCurrentUser(),
    getMyGroups(),
    getPublicGroups(),
  ]);
  if (!me) redirect("/login");

  return (
    <section>
      <header className="mb-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
            <GroupsIcon className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Groupes</h1>
            <p className="text-sm text-muted">
              Affrontez vos amis sur les points du classement mensuel.
            </p>
          </div>
        </div>
      </header>

      <GroupForms publicGroups={publicGroups} />

      <h2 className="mb-2 mt-7 text-xs font-medium uppercase tracking-wide text-faint">
        Mes groupes
      </h2>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
          Vous n&apos;êtes encore dans aucun groupe. Créez-en un ou rejoignez
          celui d&apos;un ami.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/groupes/${g.id}`}
                className="press flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                  {g.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{g.name}</span>
                    {g.ownerId === me.id && (
                      <span className="shrink-0 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted">
                        admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-faint">
                    {g.memberCount} membre{g.memberCount > 1 ? "s" : ""} · code{" "}
                    <span className="font-mono tracking-wider">
                      {g.inviteCode}
                    </span>
                  </p>
                </div>
                <ChevronLeftIcon className="size-4 shrink-0 rotate-180 text-faint" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
