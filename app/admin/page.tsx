import { getAdminReports } from "@/lib/data";
import { ReportsKanban } from "./_components/reports-kanban";

export default async function AdminReportsPage() {
  const reports = await getAdminReports();
  return <ReportsKanban reports={reports} />;
}
