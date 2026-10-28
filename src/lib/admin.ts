import { useQuery } from "@tanstack/react-query";
import { supabase, type OrderRecord, type ProductReviewRecord } from "./supabase";
import { useAuth } from "./auth";
import { fetchProductsFromSupabase } from "./catalogService";
import type { Product } from "./catalog";
import type { SiteSettings } from "./siteSettingsStore";
import type { PageSeo } from "./siteSettings";

/**
 * Admin access is decided by the database (public.admin_users via is_admin()).
 * Every admin read/write below goes through a SECURITY DEFINER function that
 * re-checks is_admin(), so hiding the UI is a convenience, not the protection.
 */

export type AdminOrder = OrderRecord & {
  customer_email?: string | null;
  refunded_amount?: number | null;
  refunded_at?: string | null;
  dispute_status?: string | null;
  admin_notes?: string | null;
};

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

// ---------------------------------------------------------------------------
// Site settings & page SEO
// ---------------------------------------------------------------------------

export async function saveSiteSettings(settings: SiteSettings) {
  const row = {
    site_name: settings.siteName.trim(),
    tagline: settings.tagline.trim(),
    default_title: settings.defaultTitle.trim(),
    default_description: settings.defaultDescription.trim(),
    og_image_url: settings.ogImageUrl.trim(),
    contact_email: settings.contactEmail.trim(),
    whatsapp_number: settings.whatsappNumber.replace(/\D/g, ""),
    instagram_url: settings.instagramUrl.trim(),
    tiktok_url: settings.tiktokUrl.trim(),
    announcement_text: settings.announcementText.trim(),
    updated_at: new Date().toISOString(),
  };
  if (!row.site_name) throw new Error("Store name is required");
  if (!/^\S+@\S+\.\S+$/.test(row.contact_email))
    throw new Error("Please enter a valid contact email");
  if (row.whatsapp_number.length < 8)
    throw new Error("Please enter the WhatsApp number with country code");

  const res = await supabase.from("site_settings").update(row).eq("id", 1).select();
  const updated = unwrap<unknown>(res);
  const hasRow = Array.isArray(updated) ? updated.length > 0 : Boolean(updated);
  if (!hasRow) {
    unwrap(
      await supabase
        .from("site_settings")
        .insert({ id: 1, ...row })
        .select()
        .single(),
    );
  }
}

export async function savePageSeo(entry: PageSeo) {
  const row = {
    title: entry.title.trim() || null,
    description: entry.description.trim() || null,
    noindex: entry.noindex,
    updated_at: new Date().toISOString(),
  };
  const res = await supabase.from("page_seo").update(row).eq("path", entry.path).select();
  const updated = unwrap<unknown>(res);
  const hasRow = Array.isArray(updated) ? updated.length > 0 : Boolean(updated);
  if (!hasRow) {
    unwrap(
      await supabase
        .from("page_seo")
        .insert({ path: entry.path, ...row })
        .select()
        .single(),
    );
  }
}

export async function deletePageSeo(path: string) {
  unwrap(await supabase.from("page_seo").delete().eq("path", path));
}

// ---------------------------------------------------------------------------
// Payments, refunds, customers (admin-actions edge function), notes, addresses
// ---------------------------------------------------------------------------

async function adminAction<T>(body: Record<string, unknown>): Promise<T> {
  const res = await supabase.functions.invoke("admin-actions", { body });
  // Edge function errors carry the JSON body in error.context
  if (res.error) {
    let message = res.error.message || "Request failed";
    const ctx = (res.error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const payload = await ctx.json();
        if (payload?.error) message = payload.error;
      } catch {
        // keep the generic message
      }
    }
    throw new Error(message);
  }
  const data = res.data as (T & { error?: string }) | null;
  if (data && typeof data === "object" && "error" in data && data.error)
    throw new Error(data.error);
  return data as T;
}

export type PaymentDetails = {
  payment_intent_id: string;
  status: string;
  amount: number;
  currency: string;
  created: string;
  amount_refunded: number;
  card_brand: string | null;
  card_last4: string | null;
  wallet: string | null;
  receipt_url: string | null;
  disputed: boolean;
  dashboard_url: string;
};

export function fetchPaymentDetails(orderId: string) {
  return adminAction<PaymentDetails>({ action: "payment_details", order_id: orderId });
}

export function refundOrder(orderId: string, amount: number | null, reason: string) {
  return adminAction<{ ok: true; refunded_amount: number; fully_refunded: boolean }>({
    action: "refund",
    order_id: orderId,
    amount,
    reason,
  });
}

export async function setOrderNote(orderId: string, note: string) {
  unwrap(await supabase.rpc("admin_set_order_note", { p_order_id: orderId, p_note: note }));
}

export async function updateOrderAddress(orderId: string, address: Record<string, string>) {
  unwrap(
    await supabase.rpc("admin_update_order_address", { p_order_id: orderId, p_address: address }),
  );
}

export type AdminCustomer = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_blocked: boolean;
  is_admin: boolean;
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
};

export async function fetchCustomers(): Promise<AdminCustomer[]> {
  const data = unwrap<AdminCustomer[] | null>(await supabase.rpc("admin_list_customers", {}));
  return Array.isArray(data) ? data : [];
}

export function setCustomerBlocked(userId: string, blocked: boolean) {
  return adminAction<{ ok: true; blocked: boolean }>({
    action: "set_blocked",
    user_id: userId,
    blocked,
  });
}

export async function updateReview(params: {
  id: string;
  rating: number;
  title: string;
  comment: string;
  adminReply: string;
}) {
  unwrap(
    await supabase.rpc("admin_update_review", {
      p_review_id: params.id,
      p_rating: params.rating,
      p_title: params.title,
      p_comment: params.comment,
      p_admin_reply: params.adminReply,
    }),
  );
}

export async function addStoreReview(params: {
  productId: string;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
}) {
  unwrap(
    await supabase.rpc("admin_add_review", {
      p_product_id: params.productId,
      p_author_name: params.authorName,
      p_rating: params.rating,
      p_title: params.title,
      p_comment: params.comment,
    }),
  );
}

/** Orders as a CSV file (opens in Excel / Google Sheets). */
export function ordersToCsv(orders: AdminOrder[], productName: (id: string) => string): string {
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    // Quote everything; neutralise spreadsheet formulas
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const header = [
    "Order",
    "Date",
    "Status",
    "Payment",
    "Total (GBP)",
    "Refunded (GBP)",
    "Customer",
    "Email",
    "Phone",
    "Address",
    "Postcode",
    "Country",
    "Items",
    "Carrier",
    "Tracking",
    "Admin notes",
  ];
  const rows = orders.map((o) => {
    const a = (o.shipping_address || {}) as Record<string, string | undefined>;
    return [
      o.id.slice(0, 8).toUpperCase(),
      new Date(o.created_at).toISOString().slice(0, 16).replace("T", " "),
      o.status,
      o.payment_status,
      Number(o.total_amount).toFixed(2),
      Number(o.refunded_amount || 0).toFixed(2),
      a["full_name"],
      o.customer_email,
      a["phone"],
      [a["street"], a["apartment"], a["city"], a["state"]].filter(Boolean).join(", "),
      a["zip"],
      a["country"],
      (o.order_items || []).map((it) => `${productName(it.product_id)} x${it.quantity}`).join("; "),
      o.carrier,
      o.tracking_number,
      o.admin_notes,
    ].map(cell);
  });
  return [header.map(cell), ...rows].map((r) => r.join(",")).join("\r\n");
}
