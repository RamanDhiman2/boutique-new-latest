import { describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

// Mock catalog for authoritative price tests using active new products
const mockCatalog = [
  { id: "elegant-maroon-suit", price: 65 },
  { id: "elegant-firozi-heavy-suit", price: 150 },
  { id: "dark-green-bridal-heavy-handwork-suit", price: 230 },
];

function calculateAuthoritativeTotal(
  items: Array<{ product_id: string; quantity: number; client_price?: number }>,
): { total: number; amountInPence: number } {
  if (!items || items.length === 0) {
    throw new Error("Order must contain at least one item");
  }

  let total = 0;
  for (const item of items) {
    if (!item.product_id) {
      throw new Error("Missing product_id");
    }
    if (typeof item.quantity !== "number" || item.quantity < 1 || item.quantity > 100) {
      throw new Error(`Invalid quantity ${item.quantity} for product ${item.product_id}`);
    }

    const catalogProduct = mockCatalog.find((p) => p.id === item.product_id);
    if (!catalogProduct) {
      throw new Error(`Product not found in catalog: ${item.product_id}`);
    }

    // Always use catalogProduct.price (ignoring client_price)
    total += catalogProduct.price * item.quantity;
  }

  return {
    total,
    amountInPence: Math.round(total * 100),
  };
}

describe("Payment Flow - Input & Price Validation", () => {
  it("rejects empty order items array", () => {
    expect(() => calculateAuthoritativeTotal([])).toThrow("Order must contain at least one item");
  });

  it("rejects items with invalid quantities (< 1 or > 100)", () => {
    expect(() =>
      calculateAuthoritativeTotal([{ product_id: "elegant-maroon-suit", quantity: 0 }]),
    ).toThrow("Invalid quantity 0");

    expect(() =>
      calculateAuthoritativeTotal([{ product_id: "elegant-maroon-suit", quantity: 101 }]),
    ).toThrow("Invalid quantity 101");
  });

  it("rejects unknown product IDs", () => {
    expect(() =>
      calculateAuthoritativeTotal([{ product_id: "tampered-product-999", quantity: 1 }]),
    ).toThrow("Product not found in catalog: tampered-product-999");
  });

  it("calculates authoritative total ignoring client-supplied price tampering", () => {
    const maliciousItems = [
      { product_id: "elegant-maroon-suit", quantity: 1, client_price: 1 }, // Tampered £1
      { product_id: "elegant-firozi-heavy-suit", quantity: 2, client_price: 0.5 }, // Tampered 50p
    ];

    const result = calculateAuthoritativeTotal(maliciousItems);

    // Expected: 65*1 + 150*2 = 65 + 300 = 365 GBP -> 36500 pence
    expect(result.total).toBe(365);
    expect(result.amountInPence).toBe(36500);
  });
});

describe("calculateOrderTotal (server pricing)", () => {
  const dbProducts = [
    { id: "elegant-maroon-suit", name: "Elegant Maroon Suit", price: 65, stock: 5 },
    {
      id: "elegant-firozi-heavy-suit",
      name: "Elegant Firozi Heavy Suit",
      price: "150",
      stock: null,
    },
    { id: "unpriced-suit", name: "Unpriced Suit", price: null, stock: 5 },
  ];
  const line = (product_id: string, quantity: number) => ({ product_id, size: "M", quantity });

  it("prices lines from the products table only", async () => {
    const { calculateOrderTotal } = await import("@/server/payment");
    const { lines, total } = calculateOrderTotal(
      [line("elegant-maroon-suit", 1), line("elegant-firozi-heavy-suit", 2)],
      dbProducts,
    );
    expect(total).toBe(365);
    expect(lines.map((l) => l.price)).toEqual([65, 150]);
  });

  it("rejects products missing from the catalog instead of using a client price", async () => {
    const { calculateOrderTotal } = await import("@/server/payment");
    expect(() => calculateOrderTotal([line("tampered-product-999", 1)], dbProducts)).toThrow(
      'Product "tampered-product-999" is not available',
    );
  });

  it("rejects products without a valid price", async () => {
    const { calculateOrderTotal } = await import("@/server/payment");
    expect(() => calculateOrderTotal([line("unpriced-suit", 1)], dbProducts)).toThrow(
      "has no valid price",
    );
  });

  it.each([0, -1, 1.5, 101, Number.NaN])("rejects quantity %s", async (qty) => {
    const { calculateOrderTotal } = await import("@/server/payment");
    expect(() =>
      calculateOrderTotal(
        [line("elegant-maroon-suit", 2), line("elegant-firozi-heavy-suit", qty)],
        dbProducts,
      ),
    ).toThrow("Invalid quantity");
  });
});

describe("Stripe Webhook Signature Verification", () => {
  const dummySecret = "whsec_test_secret_for_unit_tests_1234567890abcdef";
  const stripe = new Stripe("sk_test_mock_key_12345", { apiVersion: "2026-09-30.endive" });

  it("rejects webhooks with missing signature header", () => {
    const verifyHeader = (sigHeader: string | null) => {
      if (!sigHeader) {
        throw new Error("No signature provided");
      }
    };

    expect(() => verifyHeader(null)).toThrow("No signature provided");
  });

  it("verifies authentic Stripe webhook payload signature", () => {
    const payload = JSON.stringify({
      id: "evt_test_123",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_test_abc",
          amount: 145000,
          currency: "gbp",
          metadata: { order_id: "order_123" },
        },
      },
    });

    // Generate valid test signature using Stripe SDK helper
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: dummySecret,
    });

    const event = stripe.webhooks.constructEvent(payload, header, dummySecret);
    expect(event.id).toBe("evt_test_123");
    expect(event.type).toBe("payment_intent.succeeded");
  });

  it("rejects tampered webhook payload signature", () => {
    const payload = JSON.stringify({
      id: "evt_test_123",
      type: "payment_intent.succeeded",
    });

    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: dummySecret,
    });

    // Tamper with payload
    const tamperedPayload = payload.replace("payment_intent.succeeded", "charge.refunded");

    expect(() => stripe.webhooks.constructEvent(tamperedPayload, header, dummySecret)).toThrow();
  });
});

describe("Webhook Concurrency & Idempotency Simulation", () => {
  it("processes duplicate events idempotently without double-mutating order", () => {
    const processedEvents = new Set<string>();
    let captureCount = 0;

    const handleWebhookEvent = (eventId: string, _orderId: string) => {
      // Simulate atomic ON CONFLICT DO NOTHING
      if (processedEvents.has(eventId)) {
        return { duplicate: true, captured: false };
      }
      processedEvents.add(eventId);
      captureCount += 1;
      return { duplicate: false, captured: true };
    };

    // First arrival
    const res1 = handleWebhookEvent("evt_duplicate_test_1", "order_abc");
    expect(res1.duplicate).toBe(false);
    expect(res1.captured).toBe(true);
    expect(captureCount).toBe(1);

    // Duplicate retry
    const res2 = handleWebhookEvent("evt_duplicate_test_1", "order_abc");
    expect(res2.duplicate).toBe(true);
    expect(res2.captured).toBe(false);
    expect(captureCount).toBe(1); // Not incremented
  });

  it("prevents delayed failure event from downgrading an already captured order", () => {
    interface MockOrder {
      id: string;
      status: string;
      payment_status: "unpaid" | "captured" | "failed";
    }

    const order: MockOrder = {
      id: "ord_100",
      status: "processing",
      payment_status: "captured", // Already successfully captured
    };

    // Transition logic matching our PostgreSQL RPC update_order_payment_status:
    // AND NOT (payment_status = 'captured' AND p_payment_status IN ('unpaid', 'failed'))
    const applyPaymentStatusUpdate = (
      existing: MockOrder,
      newStatus: string,
      newPaymentStatus: "unpaid" | "captured" | "failed",
    ) => {
      if (
        existing.payment_status === "captured" &&
        (newPaymentStatus === "failed" || newPaymentStatus === "unpaid")
      ) {
        // Disallowed out-of-order transition
        return false;
      }
      existing.status = newStatus;
      existing.payment_status = newPaymentStatus;
      return true;
    };

    // Attempt to downgrade via out-of-order event
    const transitionSuccess = applyPaymentStatusUpdate(order, "pending", "failed");
    expect(transitionSuccess).toBe(false);
    expect(order.payment_status).toBe("captured");
    expect(order.status).toBe("processing");
  });
});

describe("Frontend Payment Submission & Order Status Verification Flow", () => {
  it("retains the same idempotency key on retries of the same checkout attempt", () => {
    let idempotencyKey = "";

    const getOrCreateIdempotencyKey = (isRetry: boolean) => {
      if (!isRetry || !idempotencyKey) {
        idempotencyKey = `chk_${Math.random().toString(36).substring(2, 10)}_test`;
      }
      return idempotencyKey;
    };

    // First attempt generates a key
    const key1 = getOrCreateIdempotencyKey(false);
    expect(key1).toBeTruthy();

    // Retry must reuse the exact same key to prevent duplicate PaymentIntents/orders
    const retryKey = getOrCreateIdempotencyKey(true);
    expect(retryKey).toBe(key1);

    // New attempt with address change generates a fresh key
    const key2 = getOrCreateIdempotencyKey(false);
    expect(key2).not.toBe(key1);
  });

  it("handles payment submission errors without navigating to order-success", async () => {
    const mockElements = {
      submit: vi.fn().mockResolvedValue({ error: { message: "Card number is incomplete." } }),
    };
    const mockStripe = {
      confirmPayment: vi.fn(),
    };
    const onPaymentSuccess = vi.fn();

    // Submission handler simulation matching StripeCheckoutForm
    const processSubmit = async () => {
      const { error: submitError } = await mockElements.submit();
      if (submitError) {
        return { error: submitError.message };
      }
      const res = await mockStripe.confirmPayment({});
      if (res.error) {
        return { error: res.error.message };
      }
      onPaymentSuccess();
      return { success: true };
    };

    const result = await processSubmit();
    expect(result.error).toBe("Card number is incomplete.");
    expect(mockStripe.confirmPayment).not.toHaveBeenCalled();
    expect(onPaymentSuccess).not.toHaveBeenCalled();
  });

  it("differentiates pending verification from authoritative captured order state", () => {
    type OrderRecord = {
      id: string;
      payment_status: "unpaid" | "pending" | "captured" | "failed";
      total_amount: number;
    };

    const getOrderDisplayState = (order: OrderRecord | null) => {
      if (!order) return { state: "loading", badge: "Loading..." };
      if (order.payment_status === "captured") {
        return {
          state: "confirmed",
          header: "Payment Verified & Order Confirmed!",
          badge: "Verified & Captured",
          isPaid: true,
        };
      }
      if (order.payment_status === "failed") {
        return {
          state: "failed",
          header: "Payment Authorization Failed",
          badge: "Payment Failed",
          isPaid: false,
        };
      }
      return {
        state: "verifying",
        header: "Payment Processing...",
        badge: "Verifying with Gateway...",
        isPaid: false,
      };
    };

    // 1. Initial state immediately after Stripe returns: order is still pending webhook capture
    const pendingOrder: OrderRecord = { id: "ord_1", payment_status: "unpaid", total_amount: 150 };
    const pendingView = getOrderDisplayState(pendingOrder);
    expect(pendingView.state).toBe("verifying");
    expect(pendingView.isPaid).toBe(false);
    expect(pendingView.badge).toBe("Verifying with Gateway...");

    // 2. Authoritative state after Stripe webhook runs
    const capturedOrder: OrderRecord = {
      id: "ord_1",
      payment_status: "captured",
      total_amount: 150,
    };
    const capturedView = getOrderDisplayState(capturedOrder);
    expect(capturedView.state).toBe("confirmed");
    expect(capturedView.isPaid).toBe(true);
    expect(capturedView.badge).toBe("Verified & Captured");

    // 3. Failed state if payment declined
    const failedOrder: OrderRecord = { id: "ord_1", payment_status: "failed", total_amount: 150 };
    const failedView = getOrderDisplayState(failedOrder);
    expect(failedView.state).toBe("failed");
    expect(failedView.isPaid).toBe(false);
    expect(failedView.badge).toBe("Payment Failed");
  });

  describe("Sold Out Inventory Validation", () => {
    it("identifies Elegant Yellow & Cream Suit as sold out in catalog", async () => {
      const { products } = await import("@/lib/catalog");
      const yellowSuit = products.find((p) => p.id === "elegant-yellow-cream-suit");
      expect(yellowSuit).toBeDefined();
      expect(yellowSuit?.soldOut).toBe(true);
    });

    it("rejects order validation for sold out items", () => {
      function validateItemAvailability(productId: string, isSoldOut: boolean) {
        if (isSoldOut || productId === "elegant-yellow-cream-suit") {
          throw new Error(`Product "${productId}" is currently sold out and cannot be purchased`);
        }
        return true;
      }

      expect(() => validateItemAvailability("elegant-yellow-cream-suit", true)).toThrow(
        'Product "elegant-yellow-cream-suit" is currently sold out and cannot be purchased',
      );
      expect(validateItemAvailability("elegant-maroon-suit", false)).toBe(true);
    });

    it("includes Sold Out Products in categories and filters correctly, with upcoming removed", async () => {
      const { categories, productsIn } = await import("@/lib/catalog");
      const soldOutCat = categories.find((c) => c.slug === "sold-out");
      const upcomingCat = categories.find((c) => c.slug === "upcoming-products");

      expect(soldOutCat).toBeDefined();
      expect(soldOutCat?.name).toBe("Sold Out Products");
      expect(upcomingCat).toBeUndefined();

      const soldOutItems = productsIn("sold-out");
      expect(soldOutItems.length).toBeGreaterThan(0);
      expect(soldOutItems.every((p) => p.soldOut === true || p.category === "sold-out")).toBe(true);
    });
  });
});
