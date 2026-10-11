import emailjs from "@emailjs/browser";

export interface ContactEmailPayload {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export interface EmailJSConfig {
  serviceId: string | undefined;
  templateId: string | undefined;
  publicKey: string | undefined;
}

/**
 * Reads Vite environment variables for EmailJS configuration.
 */
export function getEmailJSConfig(): EmailJSConfig {
  return {
    serviceId: import.meta.env["VITE_EMAILJS_SERVICE_ID"],
    templateId: import.meta.env["VITE_EMAILJS_TEMPLATE_ID"],
    publicKey: import.meta.env["VITE_EMAILJS_PUBLIC_KEY"],
  };
}

/**
 * Checks whether all required EmailJS environment variables are configured.
 */
export function isEmailJSConfigured(): boolean {
  const { serviceId, templateId, publicKey } = getEmailJSConfig();
  return Boolean(serviceId && templateId && publicKey);
}

/**
 * Sends customer Contact Us enquiry email via EmailJS using the official SDK.
 * Matches template parameters: name, email, subject, message, and reply_to.
 */
export async function sendContactEmail(payload: ContactEmailPayload) {
  const { serviceId, templateId, publicKey } = getEmailJSConfig();

  if (!serviceId || !templateId || !publicKey) {
    const missing: string[] = [];
    if (!serviceId) missing.push("VITE_EMAILJS_SERVICE_ID");
    if (!templateId) missing.push("VITE_EMAILJS_TEMPLATE_ID");
    if (!publicKey) missing.push("VITE_EMAILJS_PUBLIC_KEY");

    throw new Error(
      `EmailJS configuration is missing: ${missing.join(", ")}. Please configure these environment variables.`,
    );
  }

  const trimmedName = payload.name.trim();
  const trimmedEmail = payload.email.trim();
  const trimmedSubject = payload.subject?.trim() || `New Website Enquiry from ${trimmedName}`;
  const trimmedMessage = payload.message.trim();

  // Template parameters matching user's EmailJS template:
  // - name: {{name}}
  // - email: {{email}}
  // - subject: {{subject}}
  // - message: {{message}}
  // - reply_to: {{reply_to}} (maps to customer email for direct reply in Gmail)
  const templateParams: Record<string, string> = {
    name: trimmedName,
    email: trimmedEmail,
    reply_to: trimmedEmail,
    subject: trimmedSubject,
    message: trimmedMessage,
  };

  const response = await emailjs.send(serviceId, templateId, templateParams, publicKey);
  return response;
}

/**
 * Sends a notification when a user subscribes to the newsletter on the homepage.
 * Reuses the EmailJS template with customer email as reply-to.
 */
export async function sendNewsletterSubscription(subscriberEmail: string) {
  return sendContactEmail({
    name: "Newsletter Subscriber",
    email: subscriberEmail,
    subject: `New Newsletter Subscription: ${subscriberEmail.trim()}`,
    message: `A new customer has subscribed to The SohniMutiyaar Circle newsletter list: ${subscriberEmail.trim()}`,
  });
}

export interface OrderNotificationData {
  order_id: string;
  order_date: string;
  order_status: string;
  payment_status: string;
  payment_method: string;
  currency: string;
  total_amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_street: string;
  shipping_apartment?: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  shipping_country: string;
  items: Array<{
    product_id: string;
    product_name: string;
    size: string;
    quantity: number;
    price: number;
  }>;
}

/**
 * Builds a clear, professional plain text and HTML representation of all order details.
 */
export function formatOrderNotificationBody(data: OrderNotificationData): string {
  const itemsText = data.items
    .map(
      (item, idx) =>
        `  ${idx + 1}. ${item.product_name} (ID: ${item.product_id})\n` +
        `     Size: ${item.size} | Qty: ${item.quantity} | Unit Price: £${item.price.toFixed(2)} | Subtotal: £${(item.price * item.quantity).toFixed(2)}`
    )
    .join("\n\n");

  const fullShipping = [
    data.shipping_street,
    data.shipping_apartment,
    `${data.shipping_city}, ${data.shipping_state} ${data.shipping_zip}`,
    data.shipping_country,
  ]
    .filter(Boolean)
    .join("\n  ");

  return [
    `═══════════════════════════════════════════════════════════`,
    `🛍️ NEW VERIFIED ORDER RECEIVED — ORDER #${data.order_id}`,
    `═══════════════════════════════════════════════════════════`,
    ``,
    `1. ORDER SUMMARY`,
    `  • Order ID: #${data.order_id}`,
    `  • Order Date: ${data.order_date}`,
    `  • Order Status: ${data.order_status.toUpperCase()}`,
    `  • Payment Status: ${data.payment_status.toUpperCase()} (Verified)`,
    `  • Payment Method: ${data.payment_method}`,
    `  • Currency: ${data.currency.toUpperCase()}`,
    `  • Final Total: £${data.total_amount.toFixed(2)}`,
    ``,
    `2. CUSTOMER INFORMATION`,
    `  • Name: ${data.customer_name}`,
    `  • Email: ${data.customer_email}`,
    `  • Phone: ${data.customer_phone || "Not provided"}`,
    ``,
    `3. SHIPPING DESTINATION`,
    `  • Recipient: ${data.shipping_name}`,
    `  • Phone: ${data.shipping_phone || "Not provided"}`,
    `  • Address:\n  ${fullShipping}`,
    ``,
    `4. ORDERED PRODUCTS (${data.items.length} item${data.items.length > 1 ? "s" : ""})`,
    `${itemsText}`,
    ``,
    `5. FINANCIAL BREAKDOWN`,
    `  • Subtotal: £${data.total_amount.toFixed(2)}`,
    `  • Shipping: £0.00 (Standard Delivery)`,
    `  • Discounts: £0.00`,
    `  • TOTAL CHARGED: £${data.total_amount.toFixed(2)}`,
    `═══════════════════════════════════════════════════════════`,
  ].join("\n");
}

/**
 * Sends complete order and customer details to the store owner via existing EmailJS setup.
 * Reuses VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY.
 * Maps:
 * - name: Customer Name
 * - email: Customer Email (for reply_to)
 * - subject: "New Order Received — Order #<id>"
 * - message: Formatted complete order, items, shipping and payment breakdown
 * Plus direct template variables (order_id, total, etc.) for templates that bind individual keys.
 */
export async function sendOrderNotificationEmail(data: OrderNotificationData) {
  const { serviceId, templateId, publicKey } = getEmailJSConfig();

  if (!serviceId || !templateId || !publicKey) {
    const missing: string[] = [];
    if (!serviceId) missing.push("VITE_EMAILJS_SERVICE_ID");
    if (!templateId) missing.push("VITE_EMAILJS_TEMPLATE_ID");
    if (!publicKey) missing.push("VITE_EMAILJS_PUBLIC_KEY");

    throw new Error(
      `EmailJS configuration is missing: ${missing.join(", ")}. Please configure these environment variables.`,
    );
  }

  const subject = `New Order Received — Order #${data.order_id.slice(0, 8)}`;
  const formattedMessage = formatOrderNotificationBody(data);

  // Template parameters provide both the standard Contact Us template variables
  // (name, email, reply_to, subject, message) and discrete order variables
  // (order_id, order_total, customer_name, customer_email, shipping_address, items_summary)
  // guaranteeing 100% compatibility with any EmailJS template configuration.
  const templateParams: Record<string, string> = {
    name: data.customer_name || data.shipping_name || "Customer",
    email: data.customer_email,
    reply_to: data.customer_email,
    subject: subject,
    message: formattedMessage,

    // Discrete order variables
    order_id: data.order_id,
    order_date: data.order_date,
    order_status: data.order_status,
    payment_status: data.payment_status,
    payment_method: data.payment_method,
    order_total: `£${data.total_amount.toFixed(2)}`,
    customer_name: data.customer_name,
    customer_email: data.customer_email,
    customer_phone: data.customer_phone || "",
    shipping_name: data.shipping_name,
    shipping_phone: data.shipping_phone || "",
    shipping_address: [
      data.shipping_street,
      data.shipping_apartment,
      `${data.shipping_city}, ${data.shipping_state} ${data.shipping_zip}`,
      data.shipping_country,
    ]
      .filter(Boolean)
      .join(", "),
    items_count: String(data.items.length),
  };

  const response = await emailjs.send(serviceId, templateId, templateParams, publicKey);
  return response;
}

export interface ReviewNotificationData {
  product_id: string;
  product_name: string;
  author_name: string;
  rating: number;
  title: string;
  comment: string;
  reviewer_email?: string | undefined;
  verified_purchase?: boolean | undefined;
}

/**
 * Builds a clean, professional formatted notification for a newly submitted product review.
 */
export function formatReviewNotificationBody(data: ReviewNotificationData): string {
  const starsVisual = "★".repeat(Math.max(1, Math.min(5, data.rating))) + "☆".repeat(Math.max(0, 5 - data.rating));

  return [
    `═══════════════════════════════════════════════════════════`,
    `⭐ NEW CUSTOMER REVIEW RECEIVED — ${data.product_name.toUpperCase()}`,
    `═══════════════════════════════════════════════════════════`,
    ``,
    `1. PRODUCT DETAILS`,
    `  • Product: ${data.product_name}`,
    `  • Product ID: ${data.product_id}`,
    ``,
    `2. REVIEWER INFORMATION`,
    `  • Customer Name: ${data.author_name}`,
    `  • Email: ${data.reviewer_email || "Not logged in (Guest review)"}`,
    `  • Status: ${data.verified_purchase !== false ? "Verified Client" : "Client"}`,
    ``,
    `3. REVIEW CONTENT`,
    `  • Rating: ${data.rating} / 5 Stars (${starsVisual})`,
    `  • Title: "${data.title || "Customer Review"}"`,
    `  • Feedback:`,
    `    "${data.comment}"`,
    ``,
    `  • Submitted At: ${new Date().toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    })}`,
    `═══════════════════════════════════════════════════════════`,
  ].join("\n");
}

/**
 * Sends newly submitted customer product review notification to store owner/admin via EmailJS.
 * Compatible with existing EmailJS template variables (name, email, reply_to, subject, message)
 * and provides discrete review parameters (product_name, rating, review_title, review_comment).
 */
export async function sendProductReviewNotificationEmail(data: ReviewNotificationData) {
  const { serviceId, templateId, publicKey } = getEmailJSConfig();

  if (!serviceId || !templateId || !publicKey) {
    const missing: string[] = [];
    if (!serviceId) missing.push("VITE_EMAILJS_SERVICE_ID");
    if (!templateId) missing.push("VITE_EMAILJS_TEMPLATE_ID");
    if (!publicKey) missing.push("VITE_EMAILJS_PUBLIC_KEY");

    throw new Error(
      `EmailJS configuration is missing: ${missing.join(", ")}. Please configure these environment variables.`,
    );
  }

  const subject = `New Review (${data.rating}★) for ${data.product_name} by ${data.author_name}`;
  const formattedMessage = formatReviewNotificationBody(data);
  const senderEmail = data.reviewer_email || "review-notification@sohnimutiyaar.co.uk";

  const templateParams: Record<string, string> = {
    name: data.author_name,
    email: senderEmail,
    reply_to: senderEmail,
    subject: subject,
    message: formattedMessage,

    // Discrete review variables
    product_name: data.product_name,
    product_id: data.product_id,
    rating: `${data.rating} out of 5 stars`,
    review_title: data.title || "Customer Review",
    review_comment: data.comment,
    author_name: data.author_name,
  };

  const response = await emailjs.send(serviceId, templateId, templateParams, publicKey);
  return response;
}

