import { getAdminPlayers } from "@/lib/data";
import { PlayersAdmin } from "../_components/players-admin";

export default async function AdminPlayersPage() {
  const players = await getAdminPlayers();
  return <PlayersAdmin players={players} />;
}
