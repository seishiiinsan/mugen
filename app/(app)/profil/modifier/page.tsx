import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data";
import { ChevronLeftIcon } from "../../_components/icons";
import { ProfileForm } from "./profile-form";

export default async function EditProfilePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  return (
    <section className="space-y-5">
      <Link
        href="/profil"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeftIcon className="size-4" />
        Profil
      </Link>

      <h1 className="text-xl font-semibold tracking-tight">
        Modifier le profil
      </h1>

      <ProfileForm initialUsername={me.username} initialAvatar={me.avatarUrl} />
    </section>
  );
}
