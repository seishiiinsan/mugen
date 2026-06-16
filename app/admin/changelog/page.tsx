import { getAdminChangelog } from "@/lib/data";
import { ChangelogManager } from "../_components/changelog-manager";

export default async function AdminChangelogPage() {
  const entries = await getAdminChangelog();
  return <ChangelogManager entries={entries} />;
}
