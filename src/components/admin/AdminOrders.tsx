import { useMemo, useState } from "react";
import { Search, Loader2, Copy, Mail, Phone, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { products, gbp } from "@/lib/catalog";
import {
  ADMIN_ORDER_STATUSES,
  ADMIN_STATUS_LABELS,
  updateAdminOrder,
  type AdminOrder,
  type AdminOrderStatus,
} from "@/lib/admin";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface AdminOrdersProps {
  orders: AdminOrder[];
  onChanged: () => void;
}

type Filter = "all" | "processing" | "shipped" | "delivered" | "cancelled";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "processing", label: "In production" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

const STATUS_TONE: Record<string, string> = {
  processing: "bg-[#6B2C3A]/5 text-[#6B2C3A] border-[#6B2C3A]/20",
  pending: "bg-[#6B2C3A]/5 text-[#6B2C3A] border-[#6B2C3A]/20",
  shipped: "bg-blue-50 text-blue-700 border-blue-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const CARRIERS = ["Royal Mail", "DPD", "Evri", "Parcelforce", "DHL", "UPS", "FedEx"];

type Address = Partial<{
  full_name: string;
  street: string;
  apartment: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
}>;

const shortId = (id: string) => id.slice(0, 8).toUpperCase();
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function StatusPill({ order }: { order: AdminOrder }) {
  const refunded = order.payment_status === "refunded";
  return (
    <span
      className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap ${
        refunded
          ? "bg-purple-50 text-purple-700 border-purple-200"
          : STATUS_TONE[order.status] || STATUS_TONE["processing"]
      }`}
    >
      {refunded ? "Refunded" : ADMIN_STATUS_LABELS[order.status] || order.status}
    </span>
  );
}

export function AdminOrders({ orders, onChanged }: AdminOrdersProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: orders.length,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const o of orders) {
      const s = (o.status === "pending" ? "processing" : o.status) as Filter;
      if (s in c) c[s] += 1;
    }
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      const s = o.status === "pending" ? "processing" : o.status;
      if (filter !== "all" && s !== filter) return false;
      if (!q) return true;
      const addr = (o.shipping_address || {}) as Address;
      return [o.id, addr.full_name, addr.phone, addr.zip, o.customer_email, o.tracking_number]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [orders, filter, query]);

  const selected = orders.find((o) => o.id === selectedId) || null;

  return (
    <div className="space-y-4">
      {/* Filters + search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
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
            placeholder="Order #, name, email, postcode"
            aria-label="Search orders"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-sm border border-black/15 bg-white focus:outline-none focus:border-[#6B2C3A]"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="bg-white border border-black/10 rounded-md py-16 text-center text-sm text-muted-foreground">
          {orders.length === 0 ? "No paid orders yet." : "No orders match."}
        </div>
      ) : (
        <div className="bg-white border border-black/10 rounded-md overflow-hidden">
          {/* Desktop table */}
          <table className="w-full text-sm hidden md:table">
            <thead className="bg-[#FAF9F6] text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-5 py-3">Order</th>
                <th className="text-left font-medium px-3 py-3">Customer</th>
                <th className="text-left font-medium px-3 py-3">Items</th>
                <th className="text-right font-medium px-3 py-3">Total</th>
                <th className="text-left font-medium px-3 py-3">Status</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {visible.map((o) => {
                const addr = (o.shipping_address || {}) as Address;
                const itemCount = (o.order_items || []).reduce(
                  (n, it) => n + Number(it.quantity || 0),
                  0,
                );
                return (
                  <tr
                    key={o.id}
                    onClick={() => setSelectedId(o.id)}
                    className="cursor-pointer hover:bg-black/[0.02]"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-medium">#{shortId(o.id)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(o.created_at)}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 max-w-[220px]">
                      <div className="truncate">{addr.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {o.customer_email || addr.phone}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-muted-foreground">{itemCount}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums">
                      {gbp(Number(o.total_amount))}
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusPill order={o} />
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <ChevronRight className="size-4 text-muted-foreground inline" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile list */}
          <ul className="md:hidden divide-y divide-black/5">
            {visible.map((o) => {
              const addr = (o.shipping_address || {}) as Address;
              return (
                <li key={o.id}>
                  <button
                    onClick={() => setSelectedId(o.id)}
                    className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">#{shortId(o.id)}</span>
                        <StatusPill order={o} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {addr.full_name || o.customer_email} · {formatDate(o.created_at)}
                      </p>
                    </div>
                    <span className="text-sm tabular-nums shrink-0">
                      {gbp(Number(o.total_amount))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
          {selected && (
            <OrderDetail
              key={selected.id}
              order={selected}
              onSaved={() => {
                onChanged();
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function OrderDetail({ order, onSaved }: { order: AdminOrder; onSaved: () => void }) {
  const addr = (order.shipping_address || {}) as Address;
  const initialStatus = (
    ADMIN_ORDER_STATUSES.includes(order.status as AdminOrderStatus) ? order.status : "processing"
  ) as AdminOrderStatus;

  const [status, setStatus] = useState<AdminOrderStatus>(initialStatus);
  const [carrier, setCarrier] = useState(order.carrier || "");
  const [tracking, setTracking] = useState(order.tracking_number || "");
  const [reason, setReason] = useState(order.cancellation_reason || "");
  // The form is keyed by order id, so background refetches never wipe unsaved edits
  const [saving, setSaving] = useState(false);

  const isDirty =
    status !== initialStatus ||
    carrier !== (order.carrier || "") ||
    tracking !== (order.tracking_number || "") ||
    (status === "cancelled" && reason !== (order.cancellation_reason || ""));

  const handleSave = async () => {
    if (status === "cancelled" && initialStatus !== "cancelled") {
      const ok = window.confirm(
        "Cancel this order? The customer will see it as cancelled. Refund the payment separately in Stripe if needed.",
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      await updateAdminOrder({
        orderId: order.id,
        status,
        carrier,
        trackingNumber: tracking,
        cancellationReason: reason,
      });
      toast.success(`Order #${shortId(order.id)} updated`);
      onSaved();
    } catch (err) {
      toast.error((err as Error).message || "Could not update order");
    } finally {
      setSaving(false);
    }
  };

  const fullAddress = [
    addr.street,
    addr.apartment,
    [addr.city, addr.state].filter(Boolean).join(", "),
    addr.zip,
    addr.country,
  ]
    .filter(Boolean)
    .join("\n");

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <div className="flex flex-col min-h-full">
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-black/5 text-left">
        <div className="flex items-center gap-2 pr-8">
          <SheetTitle className="font-serif text-2xl font-normal">
            Order #{shortId(order.id)}
          </SheetTitle>
          <button
            onClick={() => copy(order.id, "Order ID")}
            className="text-muted-foreground hover:text-[#6B2C3A] p-1"
            aria-label="Copy full order ID"
          >
            <Copy className="size-3.5" />
          </button>
        </div>
        <SheetDescription className="text-xs flex items-center gap-2 flex-wrap">
          <span>
            {new Date(order.created_at).toLocaleString("en-GB", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
          <StatusPill order={order} />
          {order.payment_status === "captured" && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
              Paid
            </span>
          )}
        </SheetDescription>
      </SheetHeader>

      <div className="px-6 py-5 space-y-6 flex-1">
        {/* Items */}
        <section>
          <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Items</h3>
          <ul className="divide-y divide-black/5 border-y border-black/5">
            {(order.order_items || []).map((it) => {
              const prod = products.find((p) => p.id === it.product_id);
              return (
                <li key={it.id} className="py-3 flex gap-3">
                  <div className="w-12 h-16 shrink-0 bg-muted rounded-sm overflow-hidden">
                    {prod?.images?.[0] && (
                      <img
                        src={prod.images[0]}
                        alt=""
                        className="size-full object-cover object-top"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">{prod?.name || it.product_id}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Size {it.size || "Custom"} · Qty {it.quantity}
                    </p>
                  </div>
                  <p className="text-sm tabular-nums">
                    {gbp(Number(it.price) * Number(it.quantity))}
                  </p>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-between text-sm pt-3">
            <span className="text-muted-foreground">Total charged</span>
            <span className="font-semibold tabular-nums">{gbp(Number(order.total_amount))}</span>
          </div>
        </section>

        {/* Customer + address */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
              Customer
            </h3>
            <p className="text-sm font-medium">{addr.full_name || "—"}</p>
            {order.customer_email && (
              <a
                href={`mailto:${order.customer_email}`}
                className="text-xs text-[#6B2C3A] hover:underline inline-flex items-center gap-1 mt-1 break-all"
              >
                <Mail className="size-3 shrink-0" />
                {order.customer_email}
              </a>
            )}
            {addr.phone && (
              <a
                href={`tel:${addr.phone}`}
                className="text-xs text-[#6B2C3A] hover:underline flex items-center gap-1 mt-1"
              >
                <Phone className="size-3 shrink-0" />
                {addr.phone}
              </a>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Ship to
              </h3>
              {fullAddress && (
                <button
                  onClick={() => copy(`${addr.full_name || ""}\n${fullAddress}`, "Address")}
                  className="text-[11px] text-[#6B2C3A] hover:underline inline-flex items-center gap-1"
                >
                  <Copy className="size-3" />
                  Copy
                </button>
              )}
            </div>
            <p className="text-sm whitespace-pre-line text-muted-foreground leading-relaxed">
              {fullAddress || "No address snapshot"}
            </p>
          </div>
        </section>

        {/* Fulfilment */}
        <section className="bg-[#FAF9F6] border border-black/5 rounded-md p-4 space-y-4">
          <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Update order
          </h3>

          <div>
            <label className="block text-xs font-medium mb-1.5">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {ADMIN_ORDER_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`px-3 py-2 text-xs rounded-sm border transition-colors ${
                    status === s
                      ? s === "cancelled"
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-[#6B2C3A] text-white border-[#6B2C3A]"
                      : "bg-white border-black/15 hover:border-black/30"
                  }`}
                >
                  {ADMIN_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {(status === "shipped" || status === "delivered" || carrier || tracking) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="carrier" className="block text-xs font-medium mb-1.5">
                  Carrier
                </label>
                <input
                  id="carrier"
                  list="carrier-options"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="e.g. Royal Mail"
                  className="w-full border border-black/15 px-3 py-2 text-sm rounded-sm bg-white focus:outline-none focus:border-[#6B2C3A]"
                />
                <datalist id="carrier-options">
                  {CARRIERS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label htmlFor="tracking" className="block text-xs font-medium mb-1.5">
                  Tracking number
                </label>
                <input
                  id="tracking"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="Optional"
                  className="w-full border border-black/15 px-3 py-2 text-sm rounded-sm bg-white focus:outline-none focus:border-[#6B2C3A]"
                />
              </div>
            </div>
          )}

          {status === "cancelled" && (
            <div>
              <label htmlFor="reason" className="block text-xs font-medium mb-1.5">
                Cancellation reason (shown to customer)
              </label>
              <input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Cancelled at customer's request"
                className="w-full border border-black/15 px-3 py-2 text-sm rounded-sm bg-white focus:outline-none focus:border-[#6B2C3A]"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Cancelling here does not refund the payment. Refund it from the Stripe dashboard.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="btn-primary !py-2.5 !px-5 !text-xs w-full disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {saving ? "Saving..." : "Save changes"}
          </button>
        </section>

        {order.status === "cancelled" && order.cancellation_reason && (
          <p className="text-xs text-muted-foreground">
            Cancellation reason:{" "}
            <span className="text-foreground">{order.cancellation_reason}</span>
          </p>
        )}
      </div>
    </div>
  );
}
