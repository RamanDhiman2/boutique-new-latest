import { useQuery } from "@tanstack/react-query";
import { supabase, type OrderRecord, type ProductReviewRecord } from "./supabase";
import { useAuth } from "./auth";
import { fetchProductsFromSupabase } from "./catalogService";
import type { Product } from "./catalog";

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

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export const PRODUCT_SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "Custom"];
const PRODUCT_IMAGE_BUCKET = "product-images";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export type ProductInput = {
  id?: string;
  name: string;
  price: number;
  colour: string;
  category: string;
  description: string;
  sizes: string[];
  customisable: boolean;
  isUpcoming: boolean;
  soldOut: boolean;
  isActive: boolean;
  /** null keeps the built-in photos for catalogue products */
  images: string[] | null;
};

/** All products, including hidden ones (admin RLS policy). */
export async function fetchAdminProducts(): Promise<Product[]> {
  return fetchProductsFromSupabase(undefined, { includeInactive: true });
}

export async function fetchAdminCategories(): Promise<{ slug: string; name: string }[]> {
  const res = await supabase
    .from("categories")
    .select("*")
    .order("display_order", { ascending: true });
  const data = unwrap<{ slug: string; name: string }[] | null>(res);
  return Array.isArray(data) ? data.map((c) => ({ slug: c.slug, name: c.name })) : [];
}

export function slugifyProductName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export async function saveProduct(input: ProductInput, existingIds: string[]): Promise<string> {
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Please enter a product name");
  if (!Number.isFinite(input.price) || input.price <= 0)
    throw new Error("Please enter a price above £0");
  if (!input.category) throw new Error("Please choose a category");

  const row: Record<string, unknown> = {
    name,
    price: Math.round(input.price * 100) / 100,
    colour: input.colour.trim() || null,
    category: input.category,
    description: input.description.trim() || null,
    sizes: input.sizes.length ? input.sizes : ["Custom"],
    customisable: input.customisable,
    is_upcoming: input.isUpcoming,
    is_sold_out: input.soldOut,
    is_active: input.isActive,
    updated_at: new Date().toISOString(),
  };
  if (input.images !== null) row["images"] = input.images;

  if (input.id) {
    const res = await supabase.from("products").update(row).eq("id", input.id);
    unwrap(res);
    return input.id;
  }

  // New product: readable, unique id used in the product URL
  const base = slugifyProductName(name) || "product";
  let id = base;
  for (let n = 2; existingIds.includes(id); n++) id = `${base}-${n}`;

  const res = await supabase
    .from("products")
    .insert({ id, ...row, images: input.images ?? [], stock: 100 })
    .select()
    .single();
  unwrap(res);
  return id;
}

export async function deleteProduct(productId: string) {
  const res = await supabase.rpc("admin_delete_product", { p_product_id: productId });
  unwrap(res);
}

export async function uploadProductImage(productKey: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image`);
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name} is larger than 8 MB`);

  const ext =
    (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${productKey}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bucket = supabase.storage.from(PRODUCT_IMAGE_BUCKET);
  const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message || "Upload failed");
  return bucket.getPublicUrl(path).data.publicUrl;
}
