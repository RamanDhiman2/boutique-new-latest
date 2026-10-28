import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import {
  DEFAULT_SITE_SETTINGS,
  getSiteSettings,
  setSiteSettings,
  type SiteSettings,
} from "./siteSettingsStore";

export type PageSeo = { path: string; title: string; description: string; noindex: boolean };

const SETTINGS_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: PromiseLike<T>, fallback: T): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), SETTINGS_TIMEOUT_MS)),
  ]);
}

const pick = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;

export function mapSettingsRow(row: Record<string, unknown> | null | undefined): SiteSettings {
  const d = DEFAULT_SITE_SETTINGS;
  if (!row) return d;
  return {
    siteName: pick(row["site_name"], d.siteName),
    tagline: pick(row["tagline"], d.tagline),
    defaultTitle: pick(row["default_title"], d.defaultTitle),
    defaultDescription: pick(row["default_description"], d.defaultDescription),
    ogImageUrl: pick(row["og_image_url"], d.ogImageUrl),
    contactEmail: pick(row["contact_email"], d.contactEmail),
    whatsappNumber: pick(row["whatsapp_number"], d.whatsappNumber).replace(/\D/g, ""),
    instagramUrl: pick(row["instagram_url"], d.instagramUrl),
    tiktokUrl: pick(row["tiktok_url"], d.tiktokUrl),
    announcementText: pick(row["announcement_text"], d.announcementText),
  };
}

/** Site settings from Supabase; defaults when the table is missing or unreachable. */
export async function fetchSiteSettings(): Promise<SiteSettings> {
  try {
    const res = (await withTimeout(supabase.from("site_settings").select("*"), {
      data: null,
      error: { message: "timeout" },
    } as { data: unknown; error: unknown })) as { data: unknown; error: unknown };
    const rows = Array.isArray(res.data) ? (res.data as Record<string, unknown>[]) : [];
    const settings = res.error ? DEFAULT_SITE_SETTINGS : mapSettingsRow(rows[0]);
    setSiteSettings(settings);
    return settings;
  } catch {
    return getSiteSettings();
  }
}

export async function fetchPageSeo(): Promise<PageSeo[]> {
  try {
    const res = (await withTimeout(supabase.from("page_seo").select("*"), {
      data: [],
      error: null,
    } as { data: unknown; error: unknown })) as { data: unknown; error: unknown };
    if (res.error || !Array.isArray(res.data)) return [];
    return (res.data as Record<string, unknown>[]).map((r) => ({
      path: String(r["path"]),
      title: typeof r["title"] === "string" ? r["title"] : "",
      description: typeof r["description"] === "string" ? r["description"] : "",
      noindex: r["noindex"] === true,
    }));
  } catch {
    return [];
  }
}

export const siteSettingsQueryOptions = {
  queryKey: ["site-settings"] as const,
  queryFn: fetchSiteSettings,
  staleTime: 1000 * 60 * 5,
};

export const pageSeoQueryOptions = {
  queryKey: ["page-seo"] as const,
  queryFn: fetchPageSeo,
  staleTime: 1000 * 60 * 5,
};

export function useSiteSettings(): SiteSettings {
  const { data } = useQuery({ ...siteSettingsQueryOptions, placeholderData: getSiteSettings() });
  return data ?? getSiteSettings();
}

export function usePageSeo(): PageSeo[] {
  const { data } = useQuery(pageSeoQueryOptions);
  return data ?? [];
}
