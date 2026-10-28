import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  EXPORT_DATASETS,
  downloadFile,
  fetchExportData,
  rowsToCsv,
  type ExportDataset,
} from "@/lib/admin";

const today = () => new Date().toISOString().slice(0, 10);

/** Download the shop's data as CSV (Excel/Sheets) or JSON (developers, other systems). */
export function AdminExport() {
  const [busy, setBusy] = useState<string | null>(null);

  const exportOne = async (dataset: ExportDataset, format: "csv" | "json") => {
    setBusy(`${dataset}-${format}`);
    try {
      const rows = await fetchExportData(dataset);
      if (format === "csv") {
        downloadFile(
          `sohnimutiyaar-${dataset}-${today()}.csv`,
          rowsToCsv(rows),
          "text/csv;charset=utf-8",
        );
      } else {
        downloadFile(
          `sohnimutiyaar-${dataset}-${today()}.json`,
          JSON.stringify(rows, null, 2),
          "application/json",
        );
      }
      toast.success(`${rows.length} ${dataset} exported`);
    } catch (err) {
      toast.error((err as Error).message || "Export failed");
    } finally {
      setBusy(null);
    }
  };

  const exportEverything = async () => {
    setBusy("all");
    try {
      const entries = await Promise.all(
        EXPORT_DATASETS.map(async (d) => [d.id, await fetchExportData(d.id)] as const),
      );
      const backup = {
        exported_at: new Date().toISOString(),
        source: "SohniMutiyaar By CC (Supabase)",
        ...Object.fromEntries(entries),
      };
      downloadFile(
        `sohnimutiyaar-backup-${today()}.json`,
        JSON.stringify(backup, null, 2),
        "application/json",
      );
      toast.success("Full backup downloaded");
    } catch (err) {
      toast.error((err as Error).message || "Backup failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="bg-white border border-black/10 rounded-md">
      <header className="px-5 sm:px-6 py-4 border-b border-black/5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl">Backup & export</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Keep a copy of your data, or move it to another website. CSV opens in Excel / Google
            Sheets.
          </p>
        </div>
        <button
          type="button"
          onClick={exportEverything}
          disabled={busy !== null}
          className="btn-primary !py-2 !px-4 !text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {busy === "all" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          Download everything (JSON)
        </button>
      </header>
      <ul className="divide-y divide-black/5">
        {EXPORT_DATASETS.map((d) => (
          <li
            key={d.id}
            className="px-5 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{d.label}</p>
              <p className="text-xs text-muted-foreground">{d.hint}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {(["csv", "json"] as const).map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => exportOne(d.id, format)}
                  disabled={busy !== null}
                  className="px-3 py-1.5 text-xs border border-black/15 rounded-sm hover:border-black/30 disabled:opacity-50 inline-flex items-center gap-1 uppercase"
                >
                  {busy === `${d.id}-${format}` && <Loader2 className="size-3 animate-spin" />}
                  {format}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <p className="px-5 sm:px-6 py-3 border-t border-black/5 text-[11px] text-muted-foreground">
        Passwords are never exported (they are stored encrypted by Supabase). Product photos stay in
        Supabase Storage; their links are included in the products export.
      </p>
    </section>
  );
}
