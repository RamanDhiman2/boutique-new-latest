import { useQuery } from "@tanstack/react-query";
import { supabase, type OrderRecord, type ProductReviewRecord } from "./supabase";
import { useAuth } from "./auth";

/**
 * Admin access is decided by the database (public.admin_users via is_admin()).
 * Every admin read/write below goes through a SECURITY DEFINER function that
 * re-checks is_admin(), so hiding the UI is a convenience, not the protection.
 */

export type AdminOrder = OrderRecord & { customer_email?: string | null };

export const ADMIN_ORDER_STATUSES = ["processing", "shipped", "delivered", "cancelled"] as const;
export type AdminOrderStatus = (typeof ADMIN_ORDER_STATUSES)[number];

export const ADMIN_STATUS_LABELS: Record<string, string> = {
  processing: "In production",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  pending: "Order placed",
};

export function useIsAdmin() {
  const { user, loading } = useAuth();
  const query = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_admin", {});
      if (error) return false;
      return data === true;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return {
    isAdmin: query.data === true,
    isLoading: loading || (!!user && query.isLoading),
  };
}

function unwrap<T>(res: { data?: unknown; error?: { message?: string } | null }): T {
  if (res.error) {
    throw new Error(res.error.message || "Request failed");
  }
  return res.data as T;
}

export async function fetchAdminOrders(includeUnpaid = false): Promise<AdminOrder[]> {
  const res = await supabase.rpc("admin_list_orders", { p_include_unpaid: includeUnpaid });
  const data = unwrap<AdminOrder[] | null>(res);
  return Array.isArray(data) ? data : [];
}

export async function updateAdminOrder(params: {
  orderId: string;
  status: AdminOrderStatus;
  carrier?: string;
  trackingNumber?: string;
  cancellationReason?: string;
}) {
  const res = await supabase.rpc("admin_update_order", {
    p_order_id: params.orderId,
    p_status: params.status,
    p_carrier: params.carrier ?? null,
    p_tracking_number: params.trackingNumber ?? null,
    p_cancellation_reason: params.cancellationReason ?? null,
  });
  unwrap(res);
}

export async function fetchAllReviews(): Promise<ProductReviewRecord[]> {
  const res = await supabase
    .from("product_reviews")
    .select("*")
    .order("created_at", { ascending: false });
  const data = unwrap<ProductReviewRecord[] | null>(res);
  return Array.isArray(data) ? data : [];
}

export async function deleteReview(reviewId: string) {
  const res = await supabase.rpc("admin_delete_review", { p_review_id: reviewId });
  unwrap(res);
}

/** Paid orders only (abandoned checkouts are unpaid). */
export function isPaidOrder(order: OrderRecord) {
  return ["captured", "refunded"].includes((order.payment_status || "").toLowerCase());
}
