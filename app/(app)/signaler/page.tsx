import { redirect } from "next/navigation";
import { getCurrentUser, getMyReports } from "@/lib/data";
import { InfoIcon } from "../_components/icons";
import { MyReports } from "./_components/my-reports";
import { ReportForm } from "./report-form";

export default async function SignalerPage() {
  const [me, reports] = await Promise.all([getCurrentUser(), getMyReports()]);
  if (!me) redirect("/login");

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
          <InfoIcon className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Signaler un problème
          </h1>
          <p className="text-sm text-muted">
            Un bug, une idée ? Dis-nous tout — ça nous aide à améliorer Mugen.
          </p>
        </div>
      </header>

      <div className="rounded-xl border border-border bg-surface p-5">
        <ReportForm />
      </div>

      {reports.length > 0 && <MyReports reports={reports} />}
    </section>
  );
}
