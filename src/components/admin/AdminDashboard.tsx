import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { gbp } from "@/lib/catalog";
import { ADMIN_STATUS_LABELS, type AdminOrder } from "@/lib/admin";

interface AdminDashboardProps {
  orders: AdminOrder[];
  onOpenOrders: () => void;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Revenue counts paid orders that were not cancelled or refunded. */
function countsAsSale(o: AdminOrder) {
  return o.payment_status === "captured" && o.status !== "cancelled";
}

export function AdminDashboard({ orders, onOpenOrders }: AdminDashboardProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const weekAgo = today - 6 * 86400000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const sales = orders.filter(countsAsSale);
    const sum = (list: AdminOrder[]) => list.reduce((n, o) => n + Number(o.total_amount || 0), 0);
    const since = (t: number) => sales.filter((o) => new Date(o.created_at).getTime() >= t);

    const todayOrders = since(today);
    const weekOrders = since(weekAgo);
    const monthOrders = since(monthStart);

    return {
      today: { count: todayOrders.length, revenue: sum(todayOrders) },
      week: { count: weekOrders.length, revenue: sum(weekOrders) },
      month: { count: monthOrders.length, revenue: sum(monthOrders) },
      allTime: { count: sales.length, revenue: sum(sales) },
      toMake: sales
        .filter((o) => o.status === "processing" || o.status === "pending")
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      shipped: sales.filter((o) => o.status === "shipped").length,
    };
  }, [orders]);

  const tiles = [
    { label: "Today", value: gbp(stats.today.revenue), sub: plural(stats.today.count, "order") },
    {
      label: "Last 7 days",
      value: gbp(stats.week.revenue),
      sub: plural(stats.week.count, "order"),
    },
    {
      label: "This month",
      value: gbp(stats.month.revenue),
      sub: plural(stats.month.count, "order"),
    },
    {
      label: "All time",
      value: gbp(stats.allTime.revenue),
      sub: plural(stats.allTime.count, "order"),
    },
  ];

  const recent = orders.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Sales tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {tiles.map((t) => (
          <div key={t.label} className="bg-white border border-black/10 rounded-md p-4 sm:p-5">
            <p className="text-xs text-muted-foreground">{t.label}</p>
            <p className="text-xl sm:text-2xl font-medium mt-1 tabular-nums">{t.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Needs action */}
        <section className="bg-white border border-black/10 rounded-md">
          <header className="flex items-center justify-between px-5 py-4 border-b border-black/5">
            <div>
              <h2 className="font-serif text-xl">To make & ship</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stats.toMake.length} in production · {stats.shipped} shipped, awaiting delivery
              </p>
            </div>
            <button
              onClick={onOpenOrders}
              className="text-xs text-[#6B2C3A] hover:underline underline-offset-4"
            >
              Manage
            </button>
          </header>
          {stats.toMake.length === 0 ? (
            <p className="px-5 py-10 text-sm text-center text-muted-foreground">
              Nothing waiting. All caught up.
            </p>
          ) : (
            <ul className="divide-y divide-black/5">
              {stats.toMake.slice(0, 6).map((o) => {
                const days = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 86400000);
                return (
                  <li key={o.id}>
                    <button
                      onClick={onOpenOrders}
                      className="w-full px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-black/[0.02]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">#{o.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {(o.shipping_address as { full_name?: string } | undefined)?.full_name ||
                            o.customer_email}{" "}
                          · {plural(o.order_items?.length || 0, "item")}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm tabular-nums">{gbp(Number(o.total_amount))}</p>
                        <p
                          className={`text-[11px] ${days >= 7 ? "text-red-700 font-medium" : "text-muted-foreground"}`}
                        >
                          {days === 0 ? "Today" : `${days}d ago`}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Recent orders */}
        <section className="bg-white border border-black/10 rounded-md">
          <header className="flex items-center justify-between px-5 py-4 border-b border-black/5">
            <h2 className="font-serif text-xl">Recent orders</h2>
            <button
              onClick={onOpenOrders}
              className="text-xs text-[#6B2C3A] hover:underline underline-offset-4"
            >
              View all
            </button>
          </header>
          {recent.length === 0 ? (
            <p className="px-5 py-10 text-sm text-center text-muted-foreground">
              No paid orders yet.
            </p>
          ) : (
            <ul className="divide-y divide-black/5">
              {recent.map((o) => (
                <li key={o.id}>
                  <button
                    onClick={onOpenOrders}
                    className="w-full px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-black/[0.02]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">#{o.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        · {ADMIN_STATUS_LABELS[o.status] || o.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm tabular-nums">{gbp(Number(o.total_amount))}</span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
