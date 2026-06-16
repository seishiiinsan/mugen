import { redirect } from "next/navigation";
import { getCurrentUser, getMyReports } from "@/lib/data";
import { formatDate } from "@/lib/ui/format";
import { REPORT_CATEGORY_META, REPORT_STATUS_META } from "@/lib/ui/reports";
import { InfoIcon } from "../_components/icons";
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

      {reports.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
            Mes signalements
          </h2>
          <ul className="space-y-2.5">
            {reports.map((r) => {
              const cat = REPORT_CATEGORY_META[r.category];
              const status = REPORT_STATUS_META[r.status];
              return (
                <li
                  key={r.id}
                  className="rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cat.chip}`}
                        >
                          {cat.label}
                        </span>
                        <span className="text-xs text-faint">
                          {formatDate(r.createdAt)}
                        </span>
                      </div>
                      <div className="mt-1.5 text-sm font-semibold">
                        {r.title}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted">
                        {r.message}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${status.chip}`}
                    >
                      {status.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
