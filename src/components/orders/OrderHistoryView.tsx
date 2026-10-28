import { useState, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { gbp, waLink } from "@/lib/catalog";
import { useProductLookup } from "@/lib/catalogService";
import { useCart } from "@/lib/cart";
import { supabase, type OrderRecord, type OrderItemRecord } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Package,
  Truck,
  CheckCircle2,
  Download,
  Copy,
  Check,
  Search,
  MessageCircle,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Calendar,
  Sparkles,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatWhatsappNumber, getSiteSettings } from "@/lib/siteSettingsStore";

interface OrderHistoryViewProps {
  orders: OrderRecord[];
  onOrderCancelled?: () => void;
}

export function OrderHistoryView({ orders: allOrders, onOrderCancelled }: OrderHistoryViewProps) {
  const findProduct = useProductLookup();
  const { add } = useCart();
  const navigate = useNavigate();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "delivered" | "cancelled">(
    "all",
  );
  const [expandedTrackingId, setExpandedTrackingId] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Cancellation modal state
  const [cancelModalOrder, setCancelModalOrder] = useState<OrderRecord | null>(null);
  const [cancellationReason, setCancellationReason] = useState("Ordered by mistake");
  const [isCancelling, setIsCancelling] = useState(false);

  // Every checkout visit creates an unpaid order; only show orders that were paid
  // (or refunded), plus very recent unpaid ones whose payment may still be confirming.
  const orders = useMemo(() => {
    const now = Date.now();
    return allOrders.filter((o) => {
      const p = (o.payment_status || "").toLowerCase();
      if (p === "captured" || p === "refunded") return true;
      const ageMs = now - new Date(o.created_at).getTime();
      return p === "unpaid" && o.status.toLowerCase() !== "cancelled" && ageMs < 60 * 60 * 1000;
    });
  }, [allOrders]);

  // Filtered orders computation
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Status Filter
      const s = order.status.toLowerCase();
      if (statusFilter === "active") {
        if (s === "cancelled" || s === "delivered") return false;
      } else if (statusFilter === "delivered") {
        if (s !== "delivered") return false;
      } else if (statusFilter === "cancelled") {
        if (s !== "cancelled") return false;
      }

      // 2. Search Query (matches order id, product title, size)
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      const orderMatches = order.id.toLowerCase().includes(q);
      const itemMatches = order.order_items?.some((item) => {
        const prod = findProduct(item.product_id);
        const name = prod?.name || item.product_id;
        return name.toLowerCase().includes(q);
      });

      return orderMatches || itemMatches;
    });
  }, [orders, statusFilter, searchQuery, findProduct]);

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: orders.length,
      active: orders.filter((o) => !["cancelled", "delivered"].includes(o.status.toLowerCase()))
        .length,
      delivered: orders.filter((o) => o.status.toLowerCase() === "delivered").length,
      cancelled: orders.filter((o) => o.status.toLowerCase() === "cancelled").length,
    };
  }, [orders]);

  // Copy order ID helper
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedOrderId(id);
    toast.success("Order ID copied to clipboard");
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  // Buy Again handler
  const handleBuyAgain = (item: OrderItemRecord) => {
    const prod = findProduct(item.product_id);
    if (prod?.soldOut) {
      toast.error(`${prod.name} is currently sold out and cannot be reordered.`);
      return;
    }
    add(item.product_id, item.size || "Custom");
    toast.success(`Added ${prod?.name || item.product_id} to your bag`);
    navigate({ to: "/bag" });
  };

  // Cancellation Execution
  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;
    setIsCancelling(true);

    try {
      // Attempt cancel with reason RPC first, fall back to base cancel RPC if migration not yet applied
      const { error: reasonError } = await supabase.rpc("cancel_order_with_reason", {
        order_id: cancelModalOrder.id,
        p_reason: cancellationReason,
      });

      if (reasonError) {
        // Fallback to base cancel_order_secure
        const { error: baseError } = await supabase.rpc("cancel_order_secure", {
          order_id: cancelModalOrder.id,
        });
        if (baseError) throw baseError;
      }

      toast.success("Order cancelled successfully");
      setCancelModalOrder(null);
      if (onOrderCancelled) onOrderCancelled();
    } catch (err: any) {
      console.error("Cancel order error:", err);
      toast.error(err.message || "Failed to cancel order");
    } finally {
      setIsCancelling(false);
    }
  };

  // Professional PDF Invoice Generation
  const handleExportInvoice = (order: OrderRecord) => {
    try {
      const doc = new jsPDF();
      const orderShortId = order.id.slice(0, 8).toUpperCase();
      const orderDate = new Date(order.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      // Brand Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(107, 44, 58); // #6B2C3A brand color
      doc.text("SOHNI MUTIYAAR", 14, 22);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("By Charminng Chic · Luxury Indian Fashion & Tailoring", 14, 28);
      doc.text(
        `Email: ${getSiteSettings().contactEmail} | WhatsApp: ${formatWhatsappNumber(getSiteSettings().whatsappNumber)}`,
        14,
        33,
      );

      // Invoice Title & Meta
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(26, 26, 26);
      doc.text("TAX INVOICE / ORDER RECEIPT", 140, 22, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`Order ID: #${orderShortId}`, 196, 28, { align: "right" });
      doc.text(`Date: ${orderDate}`, 196, 33, { align: "right" });
      doc.text(`Payment: ${(order.payment_status || "PAID").toUpperCase()}`, 196, 38, {
        align: "right",
      });

      // Horizontal Divider
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(14, 44, 196, 44);

      // Shipping & Customer Information Box
      const addr = order.shipping_address as any;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(26, 26, 26);
      doc.text("DELIVERED TO:", 14, 52);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      if (addr && addr.full_name) {
        doc.text(String(addr.full_name || ""), 14, 58);
        doc.text(String(addr.street || ""), 14, 63);
        if (addr.apartment) doc.text(String(addr.apartment), 14, 68);
        const cityLine = `${addr.city || ""}, ${addr.state || ""} ${addr.zip || ""}`.trim();
        doc.text(cityLine, 14, addr.apartment ? 73 : 68);
        doc.text(String(addr.country || ""), 14, addr.apartment ? 78 : 73);
        if (addr.phone) doc.text(`Phone: ${addr.phone}`, 14, addr.apartment ? 83 : 78);
      } else {
        doc.text("Customer Address on file", 14, 58);
      }

      // Order Items Table
      const tableRows = (order.order_items || []).map((it) => {
        const prod = findProduct(it.product_id);
        const name = prod?.name || it.product_id;
        return [
          name,
          String(it.quantity),
          `£${Number(it.price).toFixed(2)}`,
          `£${(Number(it.price) * it.quantity).toFixed(2)}`,
        ];
      });

      autoTable(doc, {
        startY: 92,
        head: [["Item Description", "Qty", "Unit Price", "Total Amount"]],
        body: tableRows,
        theme: "striped",
        headStyles: {
          fillColor: [107, 44, 58],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [40, 40, 40],
        },
        columnStyles: {
          0: { cellWidth: 107 },
          1: { cellWidth: 15, halign: "center" },
          2: { cellWidth: 30, halign: "right" },
          3: { cellWidth: 30, halign: "right" },
        },
        foot: [
          ["", "", "Subtotal:", `£${Number(order.total_amount).toFixed(2)}`],
          ["", "", "Shipping:", "FREE / Inclusive"],
          ["", "", "Grand Total:", `£${Number(order.total_amount).toFixed(2)}`],
        ],
        footStyles: {
          fontSize: 9,
          fontStyle: "bold",
          textColor: [26, 26, 26],
          fillColor: [248, 248, 248],
          halign: "right",
        },
      });

      // Footer notice
      const finalY = (doc as any).lastAutoTable?.finalY || 180;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        "Thank you for shopping with Sohni Mutiyaar. Each outfit is crafted with artisan handwork tailored to your grace.",
        14,
        finalY + 15,
      );

      doc.save(`Invoice_SohniMutiyaar_#${orderShortId}.pdf`);
      toast.success("Invoice PDF downloaded successfully");
    } catch (err) {
      console.error("PDF Export error:", err);
      toast.error("Failed to generate PDF invoice");
    }
  };

  // Combined, customer-friendly status for an order
  const getOrderStatus = (order: OrderRecord) => {
    const s = order.status.toLowerCase();
    const p = (order.payment_status || "").toLowerCase();
    if (s === "cancelled")
      return { label: "Cancelled", tone: "bg-red-50 text-red-700 border-red-200" };
    if (p === "refunded")
      return { label: "Refunded", tone: "bg-purple-50 text-purple-700 border-purple-200" };
    if (p === "failed")
      return { label: "Payment failed", tone: "bg-red-50 text-red-700 border-red-200" };
    if (p !== "captured")
      return { label: "Confirming payment", tone: "bg-amber-50 text-amber-800 border-amber-200" };
    if (s === "delivered")
      return { label: "Delivered", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (s === "shipped")
      return { label: "Shipped", tone: "bg-blue-50 text-blue-700 border-blue-200" };
    return { label: "In production", tone: "bg-[#6B2C3A]/5 text-[#6B2C3A] border-[#6B2C3A]/20" };
  };

  const getDeliveryNote = (order: OrderRecord) => {
    const s = order.status.toLowerCase();
    if (s === "cancelled") {
      return order.cancellation_reason
        ? `Cancelled · ${order.cancellation_reason}`
        : "This order was cancelled";
    }
    if (s === "delivered") return "Delivered";
    if (s === "shipped") {
      const via = order.carrier ? `Shipped via ${order.carrier}` : "Shipped";
      return order.tracking_number ? `${via} · Tracking ${order.tracking_number}` : via;
    }
    if (order.payment_status !== "captured") return "We're confirming your payment with Stripe";
    return "Estimated delivery: 7–10 working days";
  };

  // Compact fulfilment tracker
  const renderTrackingStepper = (order: OrderRecord) => {
    const s = order.status.toLowerCase();
    const steps = [
      { id: "placed", title: "Confirmed", icon: CheckCircle2 },
      { id: "production", title: "Tailoring", icon: Sparkles },
      { id: "shipped", title: "Shipped", icon: Truck },
      { id: "delivered", title: "Delivered", icon: Package },
    ];

    let currentStep = 0;
    if (s === "processing" || s === "confirmed") currentStep = 1;
    if (s === "shipped") currentStep = 2;
    if (s === "delivered") currentStep = 3;

    return (
      <ol className="grid grid-cols-4 gap-2">
        {steps.map((st, idx) => {
          const isDone = idx <= currentStep;
          const Icon = st.icon;
          return (
            <li key={st.id} className="relative flex flex-col items-center text-center gap-1.5">
              {idx > 0 && (
                <span
                  aria-hidden
                  className={`absolute top-4 right-1/2 w-full h-px ${
                    isDone ? "bg-[#6B2C3A]" : "bg-black/15"
                  }`}
                />
              )}
              <span
                className={`relative z-10 size-8 rounded-full flex items-center justify-center border ${
                  isDone
                    ? "bg-[#6B2C3A] text-white border-[#6B2C3A]"
                    : "bg-white text-muted-foreground border-black/15"
                } ${idx === currentStep ? "ring-4 ring-[#6B2C3A]/15" : ""}`}
              >
                <Icon className="size-3.5" />
              </span>
              <span
                className={`text-[11px] leading-tight ${
                  isDone ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {st.title}
              </span>
            </li>
          );
        })}
      </ol>
    );
  };

  const filterTabs = [
    { id: "all", label: "All", count: counts.all },
    { id: "active", label: "In progress", count: counts.active },
    { id: "delivered", label: "Delivered", count: counts.delivered },
    { id: "cancelled", label: "Cancelled", count: counts.cancelled },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Filter tabs + search */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 border-b border-black/10">
        <div
          className="flex gap-5 overflow-x-auto text-sm -mb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
        >
          {filterTabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={statusFilter === t.id}
              onClick={() => setStatusFilter(t.id)}
              className={`pb-2.5 whitespace-nowrap border-b-2 transition-colors ${
                statusFilter === t.id
                  ? "border-[#6B2C3A] text-[#6B2C3A] font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label} <span className="text-xs opacity-70">({t.count})</span>
            </button>
          ))}
        </div>

        <div className="relative md:w-64 mb-2.5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders"
            aria-label="Search orders by order number or item"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-sm border border-black/15 bg-white focus:outline-none focus:border-[#6B2C3A]"
          />
        </div>
      </div>

      {/* Order list */}
      {filteredOrders.length === 0 ? (
        <div className="py-14 text-center space-y-3">
          <Package className="size-9 text-muted-foreground/40 mx-auto" />
          <h3 className="font-serif text-xl">
            {orders.length === 0 ? "No orders yet" : "No orders found"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            {searchQuery
              ? `Nothing matches "${searchQuery}".`
              : orders.length === 0
                ? "When you place an order, it will appear here."
                : "You have no orders in this category."}
          </p>
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-[#6B2C3A] underline underline-offset-4"
            >
              Clear search
            </button>
          ) : (
            orders.length === 0 && (
              <Link to="/shop" className="btn-primary !py-2 !px-5 !text-xs inline-block">
                Start shopping
              </Link>
            )
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {filteredOrders.map((order) => {
            const shortId = order.id.slice(0, 8).toUpperCase();
            const isTrackingOpen = expandedTrackingId === order.id;
            const isCancelled = order.status.toLowerCase() === "cancelled";
            const isPaid = order.payment_status === "captured";
            const isCancellable = ["pending", "processing"].includes(order.status.toLowerCase());
            const status = getOrderStatus(order);
            const items = order.order_items || [];
            const itemCount = items.reduce((n, it) => n + (Number(it.quantity) || 0), 0);

            const orderDate = new Date(order.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <article
                key={order.id}
                className="bg-white rounded-md border border-black/10 overflow-hidden"
              >
                {/* Header: order number, date, status */}
                <header className="flex flex-wrap items-start justify-between gap-3 px-4 sm:px-6 pt-5 pb-4">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-serif text-lg sm:text-xl leading-none">
                        Order #{shortId}
                      </h3>
                      <button
                        onClick={() => handleCopyId(order.id)}
                        className="text-muted-foreground hover:text-[#6B2C3A] p-1"
                        aria-label="Copy full order ID"
                        title="Copy full order ID"
                      >
                        {copiedOrderId === order.id ? (
                          <Check className="size-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Placed {orderDate} · {itemCount} {itemCount === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${status.tone}`}
                  >
                    {status.label}
                  </span>
                </header>

                {/* Items */}
                <ul className="px-4 sm:px-6 divide-y divide-black/5 border-t border-black/5">
                  {items.map((item) => {
                    const prod = findProduct(item.product_id);
                    const itemImage = prod?.images?.[0] || "";
                    const itemName = prod?.name || item.product_id;

                    return (
                      <li key={item.id} className="py-4 flex gap-4">
                        <Link
                          to="/product/$id"
                          params={{ id: item.product_id }}
                          className="w-16 h-20 sm:w-[72px] sm:h-24 shrink-0 bg-muted rounded-sm overflow-hidden"
                        >
                          {itemImage ? (
                            <img
                              src={itemImage}
                              alt={itemName}
                              className="size-full object-cover object-top"
                            />
                          ) : (
                            <span className="size-full flex items-center justify-center text-muted-foreground">
                              <Package className="size-5" />
                            </span>
                          )}
                        </Link>

                        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4">
                          <div className="min-w-0">
                            <Link
                              to="/product/$id"
                              params={{ id: item.product_id }}
                              className="font-serif text-base sm:text-lg leading-snug hover:text-[#6B2C3A] transition-colors line-clamp-2"
                            >
                              {itemName}
                            </Link>
                            <p className="text-xs text-muted-foreground mt-1">
                              Qty {item.quantity}
                              {prod?.colour ? ` · ${prod.colour}` : ""}
                            </p>
                            {!isCancelled && (
                              <button
                                onClick={() => handleBuyAgain(item)}
                                className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#6B2C3A] hover:underline underline-offset-4"
                              >
                                <RotateCcw className="size-3" />
                                Buy again
                              </button>
                            )}
                          </div>
                          <div className="text-sm font-medium sm:text-right whitespace-nowrap">
                            {gbp(Number(item.price) * Number(item.quantity))}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Tracking (expanded) */}
                {isTrackingOpen && (
                  <div className="px-4 sm:px-6 py-5 border-t border-black/5 animate-rise">
                    {renderTrackingStepper(order)}
                  </div>
                )}

                {/* Footer: total, delivery note, actions */}
                <footer className="bg-[#FAF9F6] border-t border-black/10 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-sm">
                      Total{" "}
                      <span className="font-semibold ml-1">{gbp(Number(order.total_amount))}</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="size-3.5 shrink-0" />
                      <span>{getDeliveryNote(order)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium">
                    {isPaid && !isCancelled && (
                      <button
                        onClick={() => setExpandedTrackingId(isTrackingOpen ? null : order.id)}
                        aria-expanded={isTrackingOpen}
                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-black/20 hover:border-black/40 bg-white rounded-sm"
                      >
                        {isTrackingOpen ? "Hide tracking" : "Track order"}
                        {isTrackingOpen ? (
                          <ChevronUp className="size-3.5" />
                        ) : (
                          <ChevronDown className="size-3.5" />
                        )}
                      </button>
                    )}
                    {isPaid && (
                      <button
                        onClick={() => handleExportInvoice(order)}
                        className="inline-flex items-center gap-1 text-[#6B2C3A] hover:underline underline-offset-4"
                      >
                        <Download className="size-3.5" />
                        Invoice
                      </button>
                    )}
                    <a
                      href={waLink(
                        `Hi Sohni Mutiyaar, I need help with my Order #${shortId} placed on ${orderDate}. Total: ${gbp(Number(order.total_amount))}.`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-foreground hover:underline underline-offset-4"
                    >
                      <MessageCircle className="size-3.5" />
                      Help
                    </a>
                    {isCancellable && (
                      <button
                        onClick={() => {
                          setCancelModalOrder(order);
                          setCancellationReason("Ordered by mistake");
                        }}
                        className="text-destructive hover:underline underline-offset-4"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {orders.length > 0 && (
        <p className="text-xs text-muted-foreground text-center pt-1">
          Questions about an order?{" "}
          <a
            href={waLink("Hi Sohni Mutiyaar By CC, I have a question regarding my orders.")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6B2C3A] underline underline-offset-4"
          >
            Message us on WhatsApp
          </a>
        </p>
      )}

      {/* 3. CANCELLATION DIALOG MODAL */}
      <Dialog open={!!cancelModalOrder} onOpenChange={(open) => !open && setCancelModalOrder(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Cancel Order #{cancelModalOrder?.id.slice(0, 8)}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
              Are you sure you want to cancel this order? Once cancelled, our tailoring team will
              halt production.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Reason for Cancellation
              </label>
              <select
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full p-2.5 text-xs rounded-sm border border-black/20 focus:outline-none focus:border-[#6B2C3A]"
              >
                <option value="Ordered by mistake">Ordered by mistake</option>
                <option value="Need to change bespoke measurements / size">
                  Need to change bespoke measurements / size
                </option>
                <option value="Delivery timeframe too long">Delivery timeframe too long</option>
                <option value="Need to change shipping address">
                  Need to change shipping address
                </option>
                <option value="Found a different design">Found a different design</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="bg-amber-50 p-3 rounded text-[11px] text-amber-900 border border-amber-200">
              If payment has already been verified and captured, a full refund will automatically be
              credited to your original payment method.
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setCancelModalOrder(null)}
              className="px-4 py-2 text-xs border border-black/15 rounded-sm hover:bg-black/5 font-medium"
            >
              Keep Order
            </button>
            <button
              type="button"
              disabled={isCancelling}
              onClick={handleConfirmCancel}
              className="px-4 py-2 text-xs bg-destructive text-white rounded-sm hover:bg-destructive/90 font-semibold"
            >
              {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
