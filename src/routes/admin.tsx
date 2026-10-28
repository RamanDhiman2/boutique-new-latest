import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Package,
  MessageSquare,
  Loader2,
  ShieldAlert,
  ArrowLeft,
  Shirt,
  Settings,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fetchAdminOrders, useIsAdmin } from "@/lib/admin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminOrders } from "@/components/admin/AdminOrders";
import { AdminReviews } from "@/components/admin/AdminReviews";
import { AdminProducts } from "@/components/admin/AdminProducts";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { AdminCustomers } from "@/components/admin/AdminCustomers";

type AdminTab = "dashboard" | "orders" | "products" | "customers" | "reviews" | "settings";

export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>): { tab?: AdminTab } => {
    const tab = search["tab"];
    return tab === "orders" ||
      tab === "products" ||
      tab === "customers" ||
      tab === "reviews" ||
      tab === "settings" ||
      tab === "dashboard"
      ? { tab }
      : {};
  },
  head: () => ({
    meta: [
      { title: "Admin — SohniMutiyaar By CC" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

const TABS: { id: AdminTab; label: string; icon: typeof Package }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: Package },
  { id: "products", label: "Products", icon: Shirt },
  { id: "customers", label: "Customers", icon: Users },
  { id: "reviews", label: "Reviews", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: Settings },
];

function AdminPage() {
  const { user, loading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { tab = "dashboard" } = Route.useSearch();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  const ordersQuery = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => fetchAdminOrders(false),
    enabled: isAdmin,
    refetchInterval: 60 * 1000,
  });

  if (loading || adminLoading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 gap-3">
        <ShieldAlert className="size-10 text-muted-foreground/50" />
        <h1 className="font-serif text-2xl">Admins only</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          This account ({user.email}) does not have access to the admin panel.
        </p>
        <Link to="/" className="btn-outline !py-2 !px-5 !text-xs mt-2">
          Back to shop
        </Link>
      </div>
    );
  }

  const orders = ordersQuery.data ?? [];

  return (
    <div className="mx-auto max-w-[1300px] px-4 sm:px-6 lg:px-10 pt-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#6B2C3A] font-medium">
            Admin panel
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl mt-1">SohniMutiyaar By CC</h1>
        </div>
        <Link
          to="/profile"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to my account
        </Link>
      </div>

      <nav
        aria-label="Admin sections"
        className="flex gap-6 border-b border-black/10 mb-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => navigate({ to: "/admin", search: { tab: t.id } })}
              aria-current={isActive ? "page" : undefined}
              className={`-mb-px pb-3 inline-flex items-center gap-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? "border-[#6B2C3A] text-[#6B2C3A] font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </nav>

      {ordersQuery.isError && tab !== "reviews" && tab !== "products" && tab !== "settings" ? (
        <div className="p-6 border border-red-200 bg-red-50 rounded-md text-sm text-red-800">
          Could not load orders: {(ordersQuery.error as Error).message}
        </div>
      ) : ordersQuery.isLoading && tab !== "reviews" && tab !== "products" && tab !== "settings" ? (
        <div className="py-20 flex justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : tab === "dashboard" ? (
        <AdminDashboard
          orders={orders}
          onOpenOrders={() => navigate({ to: "/admin", search: { tab: "orders" } })}
        />
      ) : tab === "orders" ? (
        <AdminOrders orders={orders} onChanged={() => ordersQuery.refetch()} />
      ) : tab === "products" ? (
        <AdminProducts />
      ) : tab === "settings" ? (
        <AdminSettings />
      ) : tab === "customers" ? (
        <AdminCustomers
          orders={orders}
          onOpenOrder={() => navigate({ to: "/admin", search: { tab: "orders" } })}
        />
      ) : (
        <AdminReviews />
      )}
    </div>
  );
}
