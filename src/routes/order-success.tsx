import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, ShieldCheck, AlertCircle } from "lucide-react";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { gbp, products } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { useEffect, useRef } from "react";
import { sendOrderNotificationEmail } from "@/lib/email";

export const Route = createFileRoute("/order-success")({
  validateSearch: (search: Record<string, unknown>): { order_id?: string | undefined; redirect_status?: string | undefined } => {
    return {
      order_id: typeof search["order_id"] === "string" ? search["order_id"] : undefined,
      redirect_status: typeof search["redirect_status"] === "string" ? search["redirect_status"] : undefined,
    };
  },
  component: OrderSuccessPage,
});

function OrderSuccessPage() {
  const { order_id } = Route.useSearch();
  const { clear } = useCart();
  const notificationDispatchedRef = useRef<boolean>(false);

  useEffect(() => {
    if (order_id) {
      clear();
    }
  }, [order_id, clear]);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-verification", order_id],
    queryFn: async () => {
      if (!order_id) return null;
      const { data, error } = await supabase
        .from("orders")
        .select("id, user_id, status, payment_status, total_amount, shipping_address, payment_provider_id, created_at, order_items(id, product_id, size, quantity, price)")
        .eq("id", order_id);

      if (error || !data) {
        return null;
      }
      const record = Array.isArray(data) ? (data[0] as any) : (data as any);
      return record ?? null;
    },
    enabled: Boolean(order_id),
    // Auto-poll every 2.5 seconds until payment is captured by the authoritative Stripe webhook
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3000;
      return data.payment_status === "captured" || data.payment_status === "failed" ? false : 2500;
    },
  });

  const isCaptured = order?.payment_status === "captured";
  const isFailed = order?.payment_status === "failed";

  // Dispatch EmailJS order notification ONLY when payment is authoritatively captured
  // and deduplicate to ensure only one email is ever sent per order
  useEffect(() => {
    if (!order || !isCaptured || !order_id) return;

    const storageKey = `order_notif_sent_${order_id}`;
    if (notificationDispatchedRef.current || localStorage.getItem(storageKey) === "true") {
      return;
    }

    // Mark in-memory immediately to prevent race conditions during rapid re-renders
    notificationDispatchedRef.current = true;

    async function dispatchNotification() {
      try {
        const { data: authData } = await supabase.auth.getSession();
        const user = authData?.session?.user;

        const shipping = (order.shipping_address as any) || {};

        // Resolve customer details from auth profile or order shipping snapshot
        const meta = user?.user_metadata as Record<string, any> | undefined;
        const customerName =
          meta?.["full_name"] ||
          meta?.["name"] ||
          shipping.full_name ||
          "Customer";
        const customerEmail =
          user?.email ||
          meta?.["email"] ||
          shipping.email ||
          "";
        const customerPhone =
          user?.phone ||
          meta?.["phone"] ||
          shipping.phone ||
          "";

        // Map order items with catalog names
        const rawItems = Array.isArray(order.order_items) ? order.order_items : [];
        const mappedItems = rawItems.map((item: any) => {
          const matchedProduct = products.find((p) => p.id === item.product_id);
          return {
            product_id: item.product_id,
            product_name: matchedProduct?.name || item.product_id,
            size: item.size || "Standard",
            quantity: Number(item.quantity) || 1,
            price: Number(item.price) || 0,
          };
        });

        await sendOrderNotificationEmail({
          order_id: order.id,
          order_date: new Date(order.created_at || Date.now()).toLocaleString("en-GB", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
          order_status: order.status || "processing",
          payment_status: "captured",
          payment_method: "Stripe Online Payment (Card)",
          currency: "GBP",
          total_amount: Number(order.total_amount) || 0,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          shipping_name: shipping.full_name || customerName,
          shipping_phone: shipping.phone || customerPhone,
          shipping_street: shipping.street || "",
          shipping_apartment: shipping.apartment || undefined,
          shipping_city: shipping.city || "",
          shipping_state: shipping.state || "",
          shipping_zip: shipping.zip || "",
          shipping_country: shipping.country || "United Kingdom",
          items: mappedItems,
        });

        // Mark permanently in client storage to prevent duplicate on page reload
        localStorage.setItem(storageKey, "true");
        console.log(`[Order Notification] Successfully sent email notification for Order #${order.id}`);
      } catch (err: any) {
        console.warn("[Order Notification] Failed to dispatch email notification:", err?.message || err);
        // Do not block or disrupt customer experience if email service has issues
      }
    }

    dispatchNotification();
  }, [order, isCaptured, order_id]);

  return (
    <div className="mx-auto max-w-5xl px-5 pt-4 pb-20">
      <SiteBreadcrumb
        items={[{ label: "Checkout", to: "/checkout" }, { label: "Order Confirmation" }]}
      />
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-5 text-center mt-6">
        {isCaptured ? (
          <>
            <CheckCircle2 className="size-20 text-emerald-600 mb-6" />
            <h1 className="text-4xl md:text-5xl mb-3 font-serif">Payment Verified & Order Confirmed!</h1>
            <p className="text-muted-foreground text-lg max-w-lg mb-6">
              Thank you for shopping with Sohni Mutiyaar. Your payment has been securely authorized and captured via Stripe. Your bespoke couture order is now in production.
            </p>
          </>
        ) : isFailed ? (
          <>
            <AlertCircle className="size-20 text-red-600 mb-6" />
            <h1 className="text-4xl md:text-5xl mb-3 font-serif">Payment Authorization Failed</h1>
            <p className="text-muted-foreground text-lg max-w-lg mb-6">
              Your payment could not be captured by the gateway. No funds were debited. Please return to checkout to retry with a valid payment card.
            </p>
          </>
        ) : (
          <>
            <Clock className="size-20 text-amber-600 mb-6 animate-pulse" />
            <h1 className="text-4xl md:text-5xl mb-3 font-serif">Payment Processing...</h1>
            <p className="text-muted-foreground text-lg max-w-lg mb-6">
              Your payment has been submitted securely to Stripe. We are awaiting authoritative confirmation from the payment gateway to finalize your order. This page updates automatically.
            </p>
          </>
        )}

        {order_id && (
          <div className="mb-8 w-full max-w-md p-5 bg-card border border-border/60 rounded-sm text-left shadow-xs">
            <div className="flex items-center justify-between border-b pb-3 mb-3 text-xs tracking-wider uppercase text-muted-foreground">
              <span>Order Reference</span>
              <span className="font-mono text-foreground font-semibold">#{order_id.slice(0, 8)}</span>
            </div>

            {order?.total_amount != null && (
              <div className="flex items-center justify-between text-sm py-1">
                <span className="text-muted-foreground">{isCaptured ? "Total Paid" : "Order Total"}</span>
                <span className="font-semibold text-foreground">{gbp(order.total_amount)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm py-1 pt-2">
              <span className="text-muted-foreground">Payment Status</span>
              {isCaptured ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <ShieldCheck className="size-3.5" />
                  Verified & Captured
                </span>
              ) : isFailed ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                  <AlertCircle className="size-3.5" />
                  Payment Failed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  <Clock className="size-3.5 animate-spin" />
                  Verifying with Gateway...
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm justify-center">
          {isFailed ? (
            <Link to="/checkout" className="btn-primary w-full text-center">
              Return to Checkout
            </Link>
          ) : (
            <>
              <Link to="/profile" className="btn-primary w-full sm:w-auto text-center">
                View Order History
              </Link>
              <Link to="/shop" className="btn-outline w-full sm:w-auto text-center">
                Continue Shopping
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
