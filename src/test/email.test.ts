import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendContactEmail, isEmailJSConfigured, getEmailJSConfig } from "@/lib/email";
import emailjs from "@emailjs/browser";

vi.mock("@emailjs/browser", () => ({
  default: {
    send: vi.fn(),
  },
}));

describe("EmailJS Service Integration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("identifies unconfigured state when environment variables are missing", () => {
    delete process.env["VITE_EMAILJS_SERVICE_ID"];
    delete process.env["VITE_EMAILJS_TEMPLATE_ID"];
    delete process.env["VITE_EMAILJS_PUBLIC_KEY"];
    delete (import.meta.env as any)["VITE_EMAILJS_SERVICE_ID"];
    delete (import.meta.env as any)["VITE_EMAILJS_TEMPLATE_ID"];
    delete (import.meta.env as any)["VITE_EMAILJS_PUBLIC_KEY"];

    expect(isEmailJSConfigured()).toBe(false);
  });

  it("throws a descriptive error when required env vars are missing upon send", async () => {
    delete process.env["VITE_EMAILJS_SERVICE_ID"];
    delete (import.meta.env as any)["VITE_EMAILJS_SERVICE_ID"];


    await expect(
      sendContactEmail({
        name: "Test User",
        email: "test@example.com",
        message: "Hello world",
      }),
    ).rejects.toThrow(/EmailJS configuration is missing/i);
  });

  it("sends contact enquiry with correct template parameters when configured", async () => {
    process.env["VITE_EMAILJS_SERVICE_ID"] = "service_test123";
    process.env["VITE_EMAILJS_TEMPLATE_ID"] = "template_test456";
    process.env["VITE_EMAILJS_PUBLIC_KEY"] = "public_test789";
    import.meta.env["VITE_EMAILJS_SERVICE_ID"] = "service_test123";
    import.meta.env["VITE_EMAILJS_TEMPLATE_ID"] = "template_test456";
    import.meta.env["VITE_EMAILJS_PUBLIC_KEY"] = "public_test789";

    const mockedSend = vi.mocked(emailjs.send).mockResolvedValueOnce({
      status: 200,
      text: "OK",
    });

    const res = await sendContactEmail({
      name: "Priya Sharma",
      email: "priya@example.com",
      subject: "Bridal Consultation",
      message: "I would like to inquire about a bridal lehenga.",
    });

    expect(mockedSend).toHaveBeenCalledTimes(1);
    expect(mockedSend).toHaveBeenCalledWith(
      "service_test123",
      "template_test456",
      {
        name: "Priya Sharma",
        email: "priya@example.com",
        reply_to: "priya@example.com",
        subject: "Bridal Consultation",
        message: "I would like to inquire about a bridal lehenga.",
      },
      "public_test789",
    );

    expect(res.status).toBe(200);
  });

  it("generates default subject when not provided", async () => {
    process.env["VITE_EMAILJS_SERVICE_ID"] = "service_test123";
    process.env["VITE_EMAILJS_TEMPLATE_ID"] = "template_test456";
    process.env["VITE_EMAILJS_PUBLIC_KEY"] = "public_test789";
    import.meta.env["VITE_EMAILJS_SERVICE_ID"] = "service_test123";
    import.meta.env["VITE_EMAILJS_TEMPLATE_ID"] = "template_test456";
    import.meta.env["VITE_EMAILJS_PUBLIC_KEY"] = "public_test789";

    const mockedSend = vi.mocked(emailjs.send).mockResolvedValueOnce({
      status: 200,
      text: "OK",
    });

    await sendContactEmail({
      name: "Harleen Kaur",
      email: "harleen@example.com",
      message: "Inquiry about custom stitching.",
    });

    expect(mockedSend).toHaveBeenCalledWith(
      "service_test123",
      "template_test456",
      expect.objectContaining({
        name: "Harleen Kaur",
        email: "harleen@example.com",
        subject: "New Website Enquiry from Harleen Kaur",
        message: "Inquiry about custom stitching.",
      }),
      "public_test789",
    );
  });

  it("sends complete order notification email with all customer, shipping, and product items", async () => {
    process.env["VITE_EMAILJS_SERVICE_ID"] = "service_order_test";
    process.env["VITE_EMAILJS_TEMPLATE_ID"] = "template_order_test";
    process.env["VITE_EMAILJS_PUBLIC_KEY"] = "public_order_test";
    import.meta.env["VITE_EMAILJS_SERVICE_ID"] = "service_order_test";
    import.meta.env["VITE_EMAILJS_TEMPLATE_ID"] = "template_order_test";
    import.meta.env["VITE_EMAILJS_PUBLIC_KEY"] = "public_order_test";

    const mockedSend = vi.mocked(emailjs.send).mockResolvedValueOnce({
      status: 200,
      text: "OK",
    });

    const { sendOrderNotificationEmail } = await import("@/lib/email");

    const orderData = {
      order_id: "ord_12345678-abcd-ef01-2345-6789abcdef01",
      order_date: "11 Oct 2026, 21:00",
      order_status: "processing",
      payment_status: "captured",
      payment_method: "Stripe Online Payment (Card)",
      currency: "GBP",
      total_amount: 128.0,
      customer_name: "Gurpreet Singh",
      customer_email: "gurpreet@example.com",
      customer_phone: "+447911123456",
      shipping_name: "Gurpreet Singh",
      shipping_phone: "+447911123456",
      shipping_street: "123 Oxford Street",
      shipping_apartment: "Suite 4B",
      shipping_city: "London",
      shipping_state: "Greater London",
      shipping_zip: "W1D 1BS",
      shipping_country: "United Kingdom",
      items: [
        {
          product_id: "elegant-maroon-suit",
          product_name: "Elegant Maroon Suit",
          size: "Medium",
          quantity: 1,
          price: 65.0,
        },
        {
          product_id: "elegant-purple-georgette-suit",
          product_name: "Elegant Purple Viscose Georgette Suit",
          size: "Large",
          quantity: 1,
          price: 63.0,
        },
      ],
    };

    const res = await sendOrderNotificationEmail(orderData);

    expect(mockedSend).toHaveBeenCalledTimes(1);
    expect(mockedSend).toHaveBeenCalledWith(
      "service_order_test",
      "template_order_test",
      expect.objectContaining({
        order_id: "ord_12345678-abcd-ef01-2345-6789abcdef01",
        order_total: "£128.00",
        customer_name: "Gurpreet Singh",
        customer_email: "gurpreet@example.com",
        customer_phone: "+447911123456",
        shipping_name: "Gurpreet Singh",
        shipping_phone: "+447911123456",
        items_count: "2",
        subject: "New Order Received — Order #ord_1234",
        message: expect.stringContaining("Elegant Maroon Suit"),
      }),
      "public_order_test",
    );
    expect(res.status).toBe(200);
  });

  it("sends product review notification email to admin via EmailJS", async () => {
    process.env["VITE_EMAILJS_SERVICE_ID"] = "service_review_test";
    process.env["VITE_EMAILJS_TEMPLATE_ID"] = "template_review_test";
    process.env["VITE_EMAILJS_PUBLIC_KEY"] = "public_review_test";
    import.meta.env["VITE_EMAILJS_SERVICE_ID"] = "service_review_test";
    import.meta.env["VITE_EMAILJS_TEMPLATE_ID"] = "template_review_test";
    import.meta.env["VITE_EMAILJS_PUBLIC_KEY"] = "public_review_test";

    const mockedSend = vi.mocked(emailjs.send).mockResolvedValueOnce({
      status: 200,
      text: "OK",
    });

    const { sendProductReviewNotificationEmail } = await import("@/lib/email");

    const reviewData = {
      product_id: "elegant-maroon-suit",
      product_name: "Elegant Maroon Suit",
      author_name: "Raman Dhiman",
      rating: 4,
      title: "product review",
      comment: "awesome product",
      reviewer_email: "raman@example.com",
      verified_purchase: true,
    };

    const res = await sendProductReviewNotificationEmail(reviewData);

    expect(mockedSend).toHaveBeenCalledTimes(1);
    expect(mockedSend).toHaveBeenCalledWith(
      "service_review_test",
      "template_review_test",
      expect.objectContaining({
        product_name: "Elegant Maroon Suit",
        product_id: "elegant-maroon-suit",
        rating: "4 out of 5 stars",
        review_title: "product review",
        review_comment: "awesome product",
        author_name: "Raman Dhiman",
        email: "raman@example.com",
        subject: "New Review (4★) for Elegant Maroon Suit by Raman Dhiman",
        message: expect.stringContaining("awesome product"),
      }),
      "public_review_test",
    );
    expect(res.status).toBe(200);
  });
});


