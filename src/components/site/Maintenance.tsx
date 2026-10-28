import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Mail, Wrench } from "lucide-react";
import { useSiteSettings } from "@/lib/siteSettings";
import { useIsAdmin } from "@/lib/admin";
import { waLink } from "@/lib/catalog";
import { WhatsAppIcon } from "@/components/site/WhatsAppButton";

// Pages that stay reachable during maintenance so the owner can sign in
const OPEN_PATHS = ["/login", "/auth/callback"];

const LOGO = "/Maroon%20and%20Gold%20Monogram%20Fashion%20Logo.png";

/**
 * While maintenance mode is on (Admin → Settings), customers see a "back soon"
 * page instead of the shop. Admins keep the full site, with a reminder banner.
 * Checkout is also blocked in the database, so no orders can slip through.
 */
export function MaintenanceGate({ children }: { children: ReactNode }) {
  const settings = useSiteSettings();
  const { isAdmin, isLoading } = useIsAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!settings.maintenanceEnabled) return <>{children}</>;

  if (isAdmin) {
    return (
      <>
        <div className="bg-amber-500 text-black text-center text-xs py-1.5 px-3">
          Maintenance mode is ON — customers see the maintenance page.{" "}
          <Link to="/admin" search={{ tab: "settings" }} className="underline font-medium">
            Turn it off
          </Link>
        </div>
        {children}
      </>
    );
  }

  if (OPEN_PATHS.some((p) => pathname.startsWith(p))) return <>{children}</>;

  // Avoid flashing the maintenance page to an admin whose check is still loading
  if (isLoading) return <div className="min-h-screen bg-background" />;

  return <MaintenancePage />;
}

function MaintenancePage() {
  const settings = useSiteSettings();
  const until = settings.maintenanceUntil ? new Date(settings.maintenanceUntil) : null;
  const showUntil = until && !Number.isNaN(until.getTime()) && until.getTime() > Date.now();

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-5 py-16">
      <div className="max-w-md w-full text-center">
        <img src={LOGO} alt={settings.siteName} className="w-40 sm:w-48 mx-auto mb-8" />
        <div className="inline-flex items-center justify-center size-12 rounded-full bg-primary/10 text-primary mb-5">
          <Wrench className="size-5" />
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl">We'll be back soon</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mt-4 whitespace-pre-line">
          {settings.maintenanceMessage}
        </p>
        {showUntil && (
          <p className="text-xs uppercase tracking-wider text-primary mt-5">
            Expected back{" "}
            {until.toLocaleString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
        <div className="mt-8 flex flex-col min-[400px]:flex-row gap-3 justify-center">
          <a
            href={waLink(
              "Hi SohniMutiyaar By CC, I have a question while the website is being updated.",
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            <WhatsAppIcon className="size-4" />
            WhatsApp us
          </a>
          <a
            href={`mailto:${settings.contactEmail}`}
            className="btn-outline inline-flex items-center justify-center gap-2"
          >
            <Mail className="size-4" />
            Email us
          </a>
        </div>
      </div>
    </main>
  );
}
