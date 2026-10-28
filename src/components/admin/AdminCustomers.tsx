import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ban, Loader2, Mail, Phone, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { gbp } from "@/lib/catalog";
import {
  fetchCustomers,
  setCustomerBlocked,
  type AdminCustomer,
  type AdminOrder,
} from "@/lib/admin";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Filter = "all" | "buyers" | "blocked";

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";

export function AdminCustomers({
  orders,
  onOpenOrder,
}: {
  orders: AdminOrder[];
  onOpenOrder: () => void;
}) {
  const customersQuery = useQuery({ queryKey: ["admin-customers"], queryFn: fetchCustomers });
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const customers = useMemo(() => customersQuery.data ?? [], [customersQuery.data]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      if (filter === "buyers" && Number(c.order_count) === 0) return false;
      if (filter === "blocked" && !c.is_blocked) return false;
      if (!q) return true;
      return [c.email, c.full_name, c.phone].some((v) => v?.toLowerCase().includes(q));
    });
  }, [customers, filter, query]);

  const counts = {
    all: customers.length,
    buyers: customers.filter((c) => Number(c.order_count) > 0).length,
    blocked: customers.filter((c) => c.is_blocked).length,
  };

  const selected = customers.find((c) => c.id === selectedId) || null;

  if (customersQuery.isLoading) {
    return (
      <div className="py-20 flex justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (customersQuery.isError) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 rounded-md text-sm text-red-800">
        Could not load customers: {(customersQuery.error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(
            [
              { id: "all", label: "All accounts" },
              { id: "buyers", label: "Have ordered" },
              { id: "blocked", label: "Blocked" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-colors ${
                filter === f.id
                  ? "bg-[#6B2C3A] text-white border-[#6B2C3A]"
                  : "bg-white border-black/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label} <span className="opacity-70">({counts[f.id]})</span>
            </button>
          ))}
        </div>
        <div className="relative lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, email or phone"
            aria-label="Search customers"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-sm border border-black/15 bg-white focus:outline-none focus:border-[#6B2C3A]"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="bg-white border border-black/10 rounded-md py-16 text-center text-sm text-muted-foreground">
          {customers.length === 0 ? "No customer accounts yet." : "No customers match."}
        </div>
      ) : (
        <div className="bg-white border border-black/10 rounded-md overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_120px_80px_110px_110px] gap-3 px-5 py-3 bg-[#FAF9F6] text-[11px] uppercase tracking-wider text-muted-foreground">
            <span>Customer</span>
            <span>Joined</span>
            <span className="text-right">Orders</span>
            <span className="text-right">Spent</span>
            <span className="text-right">Last order</span>
          </div>
          <ul className="divide-y divide-black/5">
            {visible.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setSelectedId(c.id)}
                  className="w-full text-left grid grid-cols-[1fr_auto] md:grid-cols-[1fr_120px_80px_110px_110px] gap-3 items-center px-4 md:px-5 py-3 hover:bg-black/[0.02]"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-medium truncate">
                      {c.full_name || c.email || "Unnamed"}
                      {c.is_admin && (
                        <ShieldCheck
                          className="size-3.5 text-[#6B2C3A] shrink-0"
                          aria-label="Admin"
                        />
                      )}
                      {c.is_blocked && (
                        <span className="text-[10px] uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 px-1.5 rounded-full">
                          Blocked
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-muted-foreground truncate">{c.email}</span>
                  </span>
                  <span className="hidden md:block text-xs text-muted-foreground">
                    {formatDate(c.created_at)}
                  </span>
                  <span className="text-sm text-right tabular-nums">
                    {Number(c.order_count)}
                    <span className="md:hidden text-xs text-muted-foreground"> orders</span>
                  </span>
                  <span className="hidden md:block text-sm text-right tabular-nums">
                    {gbp(Number(c.total_spent))}
                  </span>
                  <span className="hidden md:block text-xs text-right text-muted-foreground">
                    {formatDate(c.last_order_at)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
          {selected && (
            <CustomerDetail
              key={selected.id}
              customer={selected}
              orders={orders.filter((o) => o.user_id === selected.id)}
              onChanged={() => customersQuery.refetch()}
              onOpenOrder={onOpenOrder}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CustomerDetail({
  customer,
  orders,
  onChanged,
  onOpenOrder,
}: {
  customer: AdminCustomer;
  orders: AdminOrder[];
  onChanged: () => void;
  onOpenOrder: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const toggleBlock = async () => {
    const next = !customer.is_blocked;
    const ok = window.confirm(
      next
        ? `Block ${customer.email}? They will be signed out and cannot sign in or place orders until unblocked.`
        : `Unblock ${customer.email}? They will be able to sign in again.`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      await setCustomerBlocked(customer.id, next);
      toast.success(next ? "Customer blocked" : "Customer unblocked");
      onChanged();
    } catch (err) {
      toast.error((err as Error).message || "Could not update customer");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-black/5 text-left">
        <SheetTitle className="font-serif text-2xl font-normal pr-8">
          {customer.full_name || customer.email || "Customer"}
        </SheetTitle>
        <SheetDescription className="text-xs">
          Joined {formatDate(customer.created_at)} · last sign-in{" "}
          {formatDate(customer.last_sign_in_at)}
        </SheetDescription>
      </SheetHeader>

      <div className="px-6 py-5 space-y-6 flex-1">
        <section className="space-y-1.5">
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="text-sm text-[#6B2C3A] hover:underline flex items-center gap-1.5 break-all"
            >
              <Mail className="size-3.5 shrink-0" />
              {customer.email}
            </a>
          )}
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="text-sm text-[#6B2C3A] hover:underline flex items-center gap-1.5"
            >
              <Phone className="size-3.5 shrink-0" />
              {customer.phone}
            </a>
          )}
        </section>

        <section className="grid grid-cols-3 gap-2">
          {[
            { label: "Orders", value: String(Number(customer.order_count)) },
            { label: "Total spent", value: gbp(Number(customer.total_spent)) },
            { label: "Last order", value: formatDate(customer.last_order_at) },
          ].map((s) => (
            <div key={s.label} className="bg-[#FAF9F6] border border-black/5 rounded-md p-3">
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
              <p className="text-sm font-medium mt-0.5 tabular-nums">{s.value}</p>
            </div>
          ))}
        </section>

        <section>
          <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            Order history
          </h3>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No paid orders.</p>
          ) : (
            <ul className="divide-y divide-black/5 border-y border-black/5">
              {orders.map((o) => (
                <li key={o.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <span>
                    #{o.id.slice(0, 8).toUpperCase()}
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      · {formatDate(o.created_at)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground capitalize">{o.status}</span>
                    <span className="tabular-nums">{gbp(Number(o.total_amount))}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {orders.length > 0 && (
            <button onClick={onOpenOrder} className="mt-2 text-xs text-[#6B2C3A] hover:underline">
              Manage in Orders
            </button>
          )}
        </section>

        {!customer.is_admin && (
          <section className="pt-2 border-t border-black/5">
            <button
              onClick={toggleBlock}
              disabled={busy}
              className={`inline-flex items-center gap-1.5 text-xs disabled:opacity-50 ${
                customer.is_blocked
                  ? "text-[#6B2C3A] hover:underline"
                  : "text-destructive/80 hover:text-destructive"
              }`}
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Ban className="size-3.5" />}
              {customer.is_blocked ? "Unblock customer" : "Block customer"}
            </button>
            <p className="text-[11px] text-muted-foreground mt-1">
              Blocking stops sign-in and new orders. Past orders stay as they are.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
