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
