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

    expect(isEmailJSConfigured()).toBe(false);
  });

  it("throws a descriptive error when required env vars are missing upon send", async () => {
    delete process.env["VITE_EMAILJS_SERVICE_ID"];

    await expect(
      sendContactEmail({
        name: "Test User",
        email: "test@example.com",
        message: "Hello world",
      }),
    ).rejects.toThrow(/EmailJS configuration is missing/i);
  });

  it("sends contact enquiry with correct template parameters when configured", async () => {
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
});
