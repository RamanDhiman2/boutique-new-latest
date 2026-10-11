import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { products, gbp, waLink } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { supabase, type OrderRecord, type OrderItemRecord } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Copy,
  Check,
  Search,
  ExternalLink,
  MessageCircle,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  CreditCard,
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

interface OrderHistoryViewProps {
  orders: OrderRecord[];
  onOrderCancelled?: () => void;
}

export function OrderHistoryView({ orders, onOrderCancelled }: OrderHistoryViewProps) {
  const { add } = useCart();
  const navigate = useNavigate();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "delivered" | "cancelled">("all");
  const [expandedTrackingId, setExpandedTrackingId] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Cancellation modal state
  const [cancelModalOrder, setCancelModalOrder] = useState<OrderRecord | null>(null);
  const [cancellationReason, setCancellationReason] = useState("Ordered by mistake");
  const [isCancelling, setIsCancelling] = useState(false);

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
        const prod = products.find((p) => p.id === item.product_id);
        const name = prod?.name || item.product_id;
        return name.toLowerCase().includes(q) || item.size.toLowerCase().includes(q);
      });

      return orderMatches || itemMatches;
    });
  }, [orders, statusFilter, searchQuery]);

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: orders.length,
      active: orders.filter((o) => !["cancelled", "delivered"].includes(o.status.toLowerCase())).length,
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
    const prod = products.find((p) => p.id === item.product_id);
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
      doc.text("By Charming Chic · Luxury Indian Fashion & Tailoring", 14, 28);
      doc.text("Email: Charminngchic@gmail.com | WhatsApp: +44 7393 070421", 14, 33);

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
      doc.text(`Payment: ${(order.payment_status || "PAID").toUpperCase()}`, 196, 38, { align: "right" });

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
        const prod = products.find((p) => p.id === it.product_id);
        const name = prod?.name || it.product_id;
        return [
          name,
          it.size || "Custom",
          String(it.quantity),
          `£${Number(it.price).toFixed(2)}`,
          `£${(Number(it.price) * it.quantity).toFixed(2)}`,
        ];
      });

      autoTable(doc, {
        startY: 92,
        head: [["Item Description", "Size", "Qty", "Unit Price", "Total Amount"]],
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
          0: { cellWidth: 85 },
          1: { cellWidth: 25 },
          2: { cellWidth: 15, halign: "center" },
          3: { cellWidth: 30, halign: "right" },
          4: { cellWidth: 30, halign: "right" },
        },
        foot: [
          ["", "", "", "Subtotal:", `£${Number(order.total_amount).toFixed(2)}`],
          ["", "", "", "Shipping:", "FREE / Inclusive"],
          ["", "", "", "Grand Total:", `£${Number(order.total_amount).toFixed(2)}`],
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
        finalY + 15
      );

      doc.save(`Invoice_SohniMutiyaar_#${orderShortId}.pdf`);
      toast.success("Invoice PDF downloaded successfully");
    } catch (err) {
      console.error("PDF Export error:", err);
      toast.error("Failed to generate PDF invoice");
    }
  };

  // Render Visual Amazon / Flipkart Style Stepper
  const renderTrackingStepper = (order: OrderRecord) => {
    const s = order.status.toLowerCase();
    const isCancelled = s === "cancelled";

    if (isCancelled) {
      return (
        <div className="p-4 bg-red-50/60 border border-red-200/80 rounded-md text-red-900 flex items-start gap-3 mt-4">
          <XCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-semibold block text-sm">Order Cancelled</span>
            <span>
              {order.cancellation_reason
                ? `Reason: "${order.cancellation_reason}". `
                : "This order has been cancelled. "}
              If payment was captured, refund processing will appear on your original payment card.
            </span>
          </div>
        </div>
      );
    }

    // Step definitions
    const steps = [
      {
        id: "placed",
        title: "Order Confirmed",
        description: "Payment verified & order booked",
        icon: CheckCircle2,
      },
      {
        id: "production",
        title: "Artisan Handwork & Tailoring",
        description: "Fabric cut & bespoke stitching in progress",
        icon: Sparkles,
      },
      {
        id: "shipped",
        title: "Dispatched / Shipped",
        description: order.carrier ? `Handed to ${order.carrier}` : "Quality checked & dispatched",
        icon: Truck,
      },
      {
        id: "delivered",
        title: "Delivered",
        description: "Handed over to customer",
        icon: Package,
      },
    ];

    let currentStep = 0;
    if (s === "processing" || s === "confirmed") currentStep = 1;
    if (s === "shipped") currentStep = 2;
    if (s === "delivered") currentStep = 3;

    return (
      <div className="mt-5 pt-4 border-t border-black/10 bg-muted/20 p-5 rounded-md">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Fulfillment Tracking
          </span>
          {order.tracking_number && (
            <span className="text-xs font-mono bg-white border border-black/10 px-2 py-0.5 rounded">
              Tracking #: {order.tracking_number}
            </span>
          )}
        </div>

        {/* Stepper Progress */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {steps.map((st, idx) => {
            const isDone = idx <= currentStep;
            const isCurrent = idx === currentStep;
            const Icon = st.icon;

            return (
              <div key={st.id} className="flex md:flex-col items-start md:items-center text-left md:text-center gap-3 md:gap-2">
                <div
                  className={`size-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                    isDone
                      ? "bg-[#6B2C3A] text-white border-[#6B2C3A] shadow-xs"
                      : "bg-white text-muted-foreground border-black/15"
                  } ${isCurrent ? "ring-4 ring-[#6B2C3A]/20" : ""}`}
                >
                  <Icon className="size-4" />
                </div>
                <div className="flex-1">
                  <div className={`text-xs font-semibold ${isDone ? "text-foreground" : "text-muted-foreground"}`}>
                    {st.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    {st.description}
                  </div>
                  {isCurrent && (
                    <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-[#6B2C3A] bg-[#6B2C3A]/10 px-1.5 py-0.5 rounded">
                      Current Stage
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Amazon / Flipkart Search & Filter Bar */}
      <div className="bg-white p-4 md:p-5 rounded-md border border-black/10 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID or Item name..."
              className="w-full pl-10 pr-4 py-2 text-xs md:text-sm rounded-sm border border-black/15 focus:outline-none focus:border-[#6B2C3A] focus:ring-1 focus:ring-[#6B2C3A]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          {/* WhatsApp Support Button */}
          <a
            href={waLink("Hi Sohni Mutiyaar By CC, I have a question regarding my orders.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-semibold rounded-sm transition-colors shrink-0 shadow-xs uppercase tracking-wider"
          >
            <MessageCircle className="size-4" />
            <span>Order Support</span>
          </a>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-black/5 pb-2 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-sm transition-colors whitespace-nowrap ${
              statusFilter === "all"
                ? "bg-[#6B2C3A] text-white font-semibold shadow-xs"
                : "text-muted-foreground hover:bg-black/5"
            }`}
          >
            All Orders ({counts.all})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-sm transition-colors whitespace-nowrap ${
              statusFilter === "active"
                ? "bg-[#6B2C3A] text-white font-semibold shadow-xs"
                : "text-muted-foreground hover:bg-black/5"
            }`}
          >
            In Progress ({counts.active})
          </button>
          <button
            onClick={() => setStatusFilter("delivered")}
            className={`px-3 py-1.5 rounded-sm transition-colors whitespace-nowrap ${
              statusFilter === "delivered"
                ? "bg-[#6B2C3A] text-white font-semibold shadow-xs"
                : "text-muted-foreground hover:bg-black/5"
            }`}
          >
            Delivered ({counts.delivered})
          </button>
          <button
            onClick={() => setStatusFilter("cancelled")}
            className={`px-3 py-1.5 rounded-sm transition-colors whitespace-nowrap ${
              statusFilter === "cancelled"
                ? "bg-[#6B2C3A] text-white font-semibold shadow-xs"
                : "text-muted-foreground hover:bg-black/5"
            }`}
          >
            Cancelled ({counts.cancelled})
          </button>
        </div>
      </div>

      {/* 2. Order List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-md border border-black/10 space-y-3">
          <Package className="size-10 text-muted-foreground/50 mx-auto" />
          <h3 className="font-serif text-lg">No orders found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery
              ? `We couldn't find any orders matching "${searchQuery}". Try searching with another term.`
              : "You do not have any orders in this category."}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="mt-2 text-xs text-[#6B2C3A] underline underline-offset-4"
            >
              Reset search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => {
            const shortId = order.id.slice(0, 8);
            const isTrackingOpen = expandedTrackingId === order.id;
            const addr = order.shipping_address as any;
            const isCancellable = ["pending", "processing"].includes(order.status.toLowerCase());

            const orderDate = new Date(order.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <div
                key={order.id}
                className="bg-white rounded-md border border-black/10 shadow-xs overflow-hidden transition-all hover:border-black/20"
              >
                {/* AMAZON/FLIPKART STYLE CARD HEADER */}
                <div className="bg-[#F8F8F6] px-4 md:px-6 py-3.5 border-b border-black/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-[#1A1A1A]">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                      Order Placed
                    </span>
                    <span className="font-medium">{orderDate}</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                      Total
                    </span>
                    <span className="font-bold text-sm">£{Number(order.total_amount).toFixed(2)}</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                      Ship To
                    </span>
                    <span className="font-medium text-foreground truncate block">
                      {addr?.full_name || "Customer on file"}
                    </span>
                  </div>

                  <div className="flex flex-col items-start sm:items-end justify-center">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                      Order #{shortId}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <button
                        onClick={() => handleCopyId(order.id)}
                        className="inline-flex items-center gap-1 text-[11px] text-[#6B2C3A] hover:underline"
                        title="Copy full Order ID"
                      >
                        {copiedOrderId === order.id ? (
                          <>
                            <Check className="size-3 text-emerald-600" />
                            <span className="text-emerald-600 font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" />
                            <span>Copy ID</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* STATUS & BADGES STRIP */}
                <div className="px-4 md:px-6 pt-4 pb-2 flex flex-wrap items-center justify-between gap-3 border-b border-black/5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Payment Status Badge */}
                    {order.payment_status === "captured" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="size-3 text-emerald-600" /> Paid
                      </span>
                    ) : order.payment_status === "failed" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                        <XCircle className="size-3 text-red-600" /> Payment Failed
                      </span>
                    ) : order.payment_status === "refunded" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                        Refunded
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="size-3 text-amber-600" /> Payment Pending
                      </span>
                    )}

                    {/* Fulfillment Status Badge */}
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        order.status === "cancelled"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : order.status === "delivered"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : order.status === "shipped"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-[#6B2C3A]/10 text-[#6B2C3A] border-[#6B2C3A]/20"
                      }`}
                    >
                      {order.status === "processing"
                        ? "In Production"
                        : order.status === "pending"
                        ? "Order Placed"
                        : order.status}
                    </span>
                  </div>

                  {/* Estimated Delivery Note */}
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    <span>
                      {order.status === "delivered"
                        ? "Delivered successfully"
                        : order.status === "cancelled"
                        ? "Order inactive"
                        : "Estimated Delivery: 7-10 Working Days"}
                    </span>
                  </div>
                </div>

                {/* ITEMS LIST (Amazon / Flipkart Style Item Rows) */}
                <div className="p-4 md:p-6 divide-y divide-black/5">
                  {(order.order_items || []).map((item) => {
                    const prod = products.find((p) => p.id === item.product_id);
                    const itemImage = prod?.images?.[0] || "";
                    const itemName = prod?.name || item.product_id;

                    return (
                      <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex gap-4 items-center">
                          {/* Item Thumbnail */}
                          <div className="size-20 shrink-0 bg-muted rounded-sm overflow-hidden border border-black/10">
                            {itemImage ? (
                              <img
                                src={itemImage}
                                alt={itemName}
                                className="size-full object-cover object-top"
                              />
                            ) : (
                              <div className="size-full flex items-center justify-center text-muted-foreground">
                                <Package className="size-6" />
                              </div>
                            )}
                          </div>

                          {/* Item Details */}
                          <div className="space-y-1">
                            <Link
                              to="/product/$id"
                              params={{ id: item.product_id }}
                              className="font-serif text-base md:text-lg hover:text-[#6B2C3A] transition-colors leading-tight line-clamp-1"
                            >
                              {itemName}
                            </Link>

                            <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                              <span>Size: <strong className="text-foreground">{item.size || "Custom"}</strong></span>
                              <span>•</span>
                              <span>Qty: <strong className="text-foreground">{item.quantity}</strong></span>
                              {prod?.colour && (
                                <>
                                  <span>•</span>
                                  <span>Colour: {prod.colour}</span>
                                </>
                              )}
                            </div>

                            <div className="text-xs font-semibold text-foreground pt-0.5">
                              £{Number(item.price).toFixed(2)} each
                            </div>
                          </div>
                        </div>

                        {/* Item Quick Actions */}
                        <div className="flex sm:flex-col gap-2 w-full sm:w-auto shrink-0 justify-end">
                          <button
                            onClick={() => handleBuyAgain(item)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-sm bg-foreground text-background hover:bg-black text-[11px] font-semibold uppercase tracking-wider transition-colors"
                          >
                            <RotateCcw className="size-3" />
                            <span>Buy Again</span>
                          </button>

                          <Link
                            to="/product/$id"
                            params={{ id: item.product_id }}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-sm border border-black/15 hover:border-black/30 text-[11px] font-medium text-foreground transition-colors"
                          >
                            <span>View Item</span>
                            <ExternalLink className="size-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* COLLAPSIBLE TRACKING STEPPER */}
                {isTrackingOpen && (
                  <div className="px-4 md:px-6 pb-6 animate-rise">
                    {renderTrackingStepper(order)}
                  </div>
                )}

                {/* BOTTOM ACTION BAR */}
                <div className="bg-[#FAF9F6] px-4 md:px-6 py-3.5 border-t border-black/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                  {/* Track Order Toggle */}
                  <button
                    onClick={() => setExpandedTrackingId(isTrackingOpen ? null : order.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-black/20 hover:border-black/40 bg-white rounded-sm font-semibold uppercase tracking-wider text-[11px] text-foreground transition-all shadow-xs"
                  >
                    <span>{isTrackingOpen ? "Hide Tracking" : "Track Order"}</span>
                    {isTrackingOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  </button>

                  {/* Right Side Buttons */}
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Invoice Download */}
                    <button
                      onClick={() => handleExportInvoice(order)}
                      className="inline-flex items-center gap-1 text-[#6B2C3A] hover:underline font-semibold"
                    >
                      <Download className="size-3.5" />
                      <span>Invoice (PDF)</span>
                    </button>

                    {/* WhatsApp Help */}
                    <a
                      href={waLink(
                        `Hi Sohni Mutiyaar, I need help with my Order #${shortId} placed on ${orderDate}. Total: £${order.total_amount}.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-semibold"
                    >
                      <MessageCircle className="size-3.5" />
                      <span>Need Help?</span>
                    </a>

                    {/* Cancel Order */}
                    {isCancellable && (
                      <button
                        onClick={() => {
                          setCancelModalOrder(order);
                          setCancellationReason("Ordered by mistake");
                        }}
                        className="text-destructive hover:underline font-semibold"
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
              Are you sure you want to cancel this order? Once cancelled, our tailoring team will halt production.
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
                <option value="Need to change bespoke measurements / size">Need to change bespoke measurements / size</option>
                <option value="Delivery timeframe too long">Delivery timeframe too long</option>
                <option value="Need to change shipping address">Need to change shipping address</option>
                <option value="Found a different design">Found a different design</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="bg-amber-50 p-3 rounded text-[11px] text-amber-900 border border-amber-200">
              If payment has already been verified and captured, a full refund will automatically be credited to your original payment method.
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
