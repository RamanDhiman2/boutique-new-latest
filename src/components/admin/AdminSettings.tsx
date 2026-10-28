import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, ImagePlus, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { deletePageSeo, savePageSeo, saveSiteSettings, uploadProductImage } from "@/lib/admin";
import { usePageSeo, useSiteSettings, type PageSeo } from "@/lib/siteSettings";
import { setSiteSettings, type SiteSettings } from "@/lib/siteSettingsStore";
import { AdminExport } from "./AdminExport";

// Public pages whose search title/description can be customised
const SEO_PAGES: { path: string; label: string }[] = [
  { path: "/", label: "Home" },
  { path: "/shop", label: "Shop all" },
  { path: "/collections", label: "Collections" },
  { path: "/custom-designs", label: "Custom designs" },
  { path: "/measurements", label: "Measurements" },
  { path: "/about", label: "About" },
  { path: "/contact", label: "Contact" },
  { path: "/shipping", label: "Shipping" },
  { path: "/refund-policy", label: "Refund policy" },
  { path: "/privacy-policy", label: "Privacy policy" },
  { path: "/terms-of-service", label: "Terms of service" },
];

const inputClass =
  "w-full border border-black/15 px-3 py-2 text-sm rounded-sm bg-white focus:outline-none focus:border-[#6B2C3A]";

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function CharCount({ value, ideal }: { value: string; ideal: number }) {
  const over = value.length > ideal;
  return (
    <span className={`text-[11px] ${over ? "text-amber-700" : "text-muted-foreground"}`}>
      {value.length}/{ideal}
    </span>
  );
}

/** ISO string → value for <input type="datetime-local"> in local time */
function toLocalInput(value: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminSettings() {
  const queryClient = useQueryClient();
  const saved = useSiteSettings();
  const pageSeo = usePageSeo();

  const [form, setForm] = useState<SiteSettings>(saved);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const set =
    (key: keyof SiteSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const isDirty = (Object.keys(form) as (keyof SiteSettings)[]).some((k) => form[k] !== saved[k]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSiteSettings(form);
      setSiteSettings({ ...form, whatsappNumber: form.whatsappNumber.replace(/\D/g, "") });
      await queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Settings saved");
    } catch (err) {
      toast.error((err as Error).message || "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleImage = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductImage("site", file);
      setForm((f) => ({ ...f, ogImageUrl: url }));
      toast.success("Image uploaded. Save to apply it.");
    } catch (err) {
      toast.error((err as Error).message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Maintenance mode */}
      <section
        className={`border rounded-md p-5 sm:p-6 space-y-4 ${
          form.maintenanceEnabled ? "bg-amber-50 border-amber-300" : "bg-white border-black/10"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl">Maintenance mode</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customers see a "We'll be back soon" page and cannot place orders. You (admin) still
              see the full site.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.maintenanceEnabled}
            aria-label="Maintenance mode"
            onClick={() => setForm((f) => ({ ...f, maintenanceEnabled: !f.maintenanceEnabled }))}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              form.maintenanceEnabled ? "bg-amber-600" : "bg-black/20"
            }`}
          >
            <span
              className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
                form.maintenanceEnabled ? "translate-x-[22px]" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
        <Field id="s-mmsg" label="Message for customers">
          <textarea
            id="s-mmsg"
            rows={3}
            value={form.maintenanceMessage}
            onChange={set("maintenanceMessage")}
            className={`${inputClass} resize-y`}
          />
        </Field>
        <Field id="s-muntil" label="Back by (optional)" hint="Shown on the maintenance page">
          <input
            id="s-muntil"
            type="datetime-local"
            value={toLocalInput(form.maintenanceUntil)}
            onChange={(e) => setForm((f) => ({ ...f, maintenanceUntil: e.target.value }))}
            className={`${inputClass} sm:max-w-xs`}
          />
        </Field>
        {form.maintenanceEnabled !== saved.maintenanceEnabled && (
          <p className="text-xs font-medium text-amber-800">
            Press "Save settings" to {form.maintenanceEnabled ? "close" : "reopen"} the shop.
          </p>
        )}
      </section>

      {/* Store details */}
      <section className="bg-white border border-black/10 rounded-md p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="font-serif text-xl">Store details</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Shown in the header, footer, contact pages and invoices.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="s-name" label="Store name">
            <input
              id="s-name"
              value={form.siteName}
              onChange={set("siteName")}
              className={inputClass}
            />
          </Field>
          <Field id="s-tagline" label="Tagline">
            <input
              id="s-tagline"
              value={form.tagline}
              onChange={set("tagline")}
              className={inputClass}
            />
          </Field>
          <Field id="s-email" label="Contact email">
            <input
              id="s-email"
              type="email"
              value={form.contactEmail}
              onChange={set("contactEmail")}
              className={inputClass}
            />
          </Field>
          <Field id="s-wa" label="WhatsApp number" hint="With country code, e.g. 447393070421">
            <input
              id="s-wa"
              inputMode="tel"
              value={form.whatsappNumber}
              onChange={set("whatsappNumber")}
              className={inputClass}
            />
          </Field>
          <Field id="s-ig" label="Instagram link">
            <input
              id="s-ig"
              value={form.instagramUrl}
              onChange={set("instagramUrl")}
              className={inputClass}
            />
          </Field>
          <Field id="s-tt" label="TikTok link">
            <input
              id="s-tt"
              value={form.tiktokUrl}
              onChange={set("tiktokUrl")}
              className={inputClass}
            />
          </Field>
        </div>
        <Field id="s-ann" label="Announcement bar" hint="The line at the very top of every page">
          <input
            id="s-ann"
            value={form.announcementText}
            onChange={set("announcementText")}
            className={inputClass}
          />
        </Field>
      </section>

      {/* SEO defaults */}
      <section className="bg-white border border-black/10 rounded-md p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="font-serif text-xl">Search & sharing</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Used for Google results and link previews when a page has no title of its own.
          </p>
        </div>
        <Field id="s-title" label="Default page title">
          <input
            id="s-title"
            value={form.defaultTitle}
            onChange={set("defaultTitle")}
            className={inputClass}
          />
          <div className="text-right mt-1">
            <CharCount value={form.defaultTitle} ideal={60} />
          </div>
        </Field>
        <Field id="s-desc" label="Default description">
          <textarea
            id="s-desc"
            rows={3}
            value={form.defaultDescription}
            onChange={set("defaultDescription")}
            className={`${inputClass} resize-y`}
          />
          <div className="text-right mt-1">
            <CharCount value={form.defaultDescription} ideal={160} />
          </div>
        </Field>

        <div>
          <span className="block text-xs font-medium mb-1.5">Share image</span>
          <div className="flex items-center gap-4">
            <div className="w-40 aspect-[1.91/1] bg-muted rounded-sm overflow-hidden border border-black/10 shrink-0">
              {form.ogImageUrl && (
                <img src={form.ogImageUrl} alt="" className="size-full object-contain bg-white" />
              )}
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-xs text-[#6B2C3A] inline-flex items-center gap-1 hover:underline disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="size-3.5" />
                )}
                {uploading ? "Uploading..." : "Upload image"}
              </button>
              <p className="text-[11px] text-muted-foreground">
                Best size 1200 × 630. Used when pages are shared.
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImage(e.target.files)}
            />
          </div>
        </div>

        {/* Google-style preview */}
        <div className="border border-black/10 rounded-md p-4 bg-[#FAF9F6]">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            Google preview
          </p>
          <p className="text-xs text-emerald-800 truncate">charminngchic.com</p>
          <p className="text-[#1a0dab] text-base leading-snug truncate">
            {form.siteName} — {form.tagline}
          </p>
          <p className="text-xs text-[#4d5156] line-clamp-2 mt-0.5">{form.defaultDescription}</p>
        </div>
      </section>

      <div className="sticky bottom-3 z-10 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || saving || uploading}
          className="btn-primary !py-2.5 !px-6 !text-xs shadow-md disabled:opacity-50 inline-flex items-center gap-2"
        >
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          {saving ? "Saving..." : "Save settings"}
        </button>
      </div>

      {/* Per-page SEO */}
      <section className="bg-white border border-black/10 rounded-md">
        <header className="px-5 sm:px-6 py-4 border-b border-black/5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-xl">Page titles for Google</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Leave blank to use the built-in title. Product and collection pages use their own
              names.
            </p>
          </div>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[#6B2C3A] inline-flex items-center gap-1 hover:underline"
          >
            View sitemap <ExternalLink className="size-3" />
          </a>
        </header>
        <ul className="divide-y divide-black/5">
          {SEO_PAGES.map((page) => (
            <PageSeoRow
              key={page.path}
              page={page}
              existing={pageSeo.find((p) => p.path === page.path)}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ["page-seo"] })}
            />
          ))}
        </ul>
      </section>

      <AdminExport />
    </div>
  );
}

function PageSeoRow({
  page,
  existing,
  onSaved,
}: {
  page: { path: string; label: string };
  existing: PageSeo | undefined;
  onSaved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [noindex, setNoindex] = useState(existing?.noindex ?? false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await savePageSeo({ path: page.path, title, description, noindex });
      await onSaved();
      toast.success(`${page.label} saved`);
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message || "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      await deletePageSeo(page.path);
      setTitle("");
      setDescription("");
      setNoindex(false);
      await onSaved();
      toast.success(`${page.label} reset to default`);
    } catch (err) {
      toast.error((err as Error).message || "Could not reset");
    } finally {
      setBusy(false);
    }
  };

  const customised = Boolean(
    existing && (existing.title || existing.description || existing.noindex),
  );

  return (
    <li className="px-5 sm:px-6 py-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <span className="min-w-0">
          <span className="text-sm font-medium">{page.label}</span>
          <span className="text-xs text-muted-foreground ml-2">{page.path}</span>
        </span>
        <span className="text-[11px] shrink-0">
          {customised ? (
            <span className="text-[#6B2C3A] font-medium">Custom</span>
          ) : (
            <span className="text-muted-foreground">Default</span>
          )}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div>
            <div className="flex justify-between">
              <label htmlFor={`t-${page.path}`} className="text-xs font-medium">
                Title
              </label>
              <CharCount value={title} ideal={60} />
            </div>
            <input
              id={`t-${page.path}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </div>
          <div>
            <div className="flex justify-between">
              <label htmlFor={`d-${page.path}`} className="text-xs font-medium">
                Description
              </label>
              <CharCount value={description} ideal={160} />
            </div>
            <textarea
              id={`d-${page.path}`}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} mt-1 resize-y`}
            />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={noindex}
              onChange={(e) => setNoindex(e.target.checked)}
            />
            Hide this page from Google
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-50"
            >
              Save
            </button>
            {customised && (
              <button
                type="button"
                onClick={reset}
                disabled={busy}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <RotateCcw className="size-3" />
                Reset to default
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
