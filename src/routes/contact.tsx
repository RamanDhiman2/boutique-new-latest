import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Instagram, Loader2, Mail } from "lucide-react";
import { PageHeader } from "@/components/site/Chrome";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";
import { WhatsAppIcon } from "@/components/site/WhatsAppButton";
import { waLink } from "@/lib/catalog";
import { sendContactEmail, isEmailJSConfigured } from "@/lib/email";
import { toast } from "sonner";

// Custom TikTok SVG since lucide-react doesn't include it natively
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
  </svg>
);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — SohniMutiyaar By CC" },
      {
        name: "description",
        content:
          "Get in touch with us via email for orders, custom designs and bridal consultations.",
      },
      { property: "og:title", content: "Contact — SohniMutiyaar By CC" },
      {
        property: "og:description",
        content: "Get in touch with us via email or send an enquiry message.",
      },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    // 1. Validate required fields
    if (!trimmedName) {
      toast.error("Please enter your name.");
      return;
    }

    if (!trimmedEmail) {
      toast.error("Please enter your email address.");
      return;
    }

    // 2. Validate email format
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      toast.error("Please enter a valid email address (e.g. name@example.com).");
      return;
    }

    if (!trimmedMessage) {
      toast.error("Please enter your enquiry message.");
      return;
    }

    // 3. Prevent duplicate submissions
    setLoading(true);

    try {
      // 4. Send using EmailJS SDK
      await sendContactEmail({
        name: trimmedName,
        email: trimmedEmail,
        subject: subject.trim(),
        message: trimmedMessage,
      });

      // 5. Show success & clear form
      setSent(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setErrorMessage(null);
      toast.success("Enquiry sent! We will get in touch with you shortly.");
    } catch (err: unknown) {
      // 6. Handle failure: preserve entered customer data & display error
      const msg =
        err instanceof Error
          ? err.message
          : "We were unable to send your enquiry. Please check your internet connection or email us directly.";
      setErrorMessage(msg);
      toast.error("Failed to send enquiry. Your message has been preserved below.");
    } finally {
      // 7. Restore submit button state
      setLoading(false);
    }
  };

  const configured = isEmailJSConfigured();

  return (
    <div className="mx-auto max-w-5xl px-5 pt-4 pb-20">
      <SiteBreadcrumb items={[{ label: "Contact Us" }]} />
      <PageHeader
        eyebrow="We'd love to hear from you"
        title="Contact Us"
        text="For orders, custom designs or bridal consultations, send an enquiry below or email us directly."
      />

      <div className="grid md:grid-cols-2 gap-16">
        <div className="space-y-8">
          <div>
            <div className="eyebrow text-primary mb-2">WhatsApp Enquiry</div>
            <a
              href={waLink("Hi SohniMutiyaar By CC, I'd like to enquire about an outfit.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 py-3 px-6 bg-[#25D366] hover:bg-[#20ba59] text-white font-medium text-xs uppercase tracking-wider rounded-sm shadow-sm transition-colors"
            >
              <WhatsAppIcon className="size-5" /> Chat on WhatsApp
            </a>
            <p className="text-sm text-muted-foreground mt-2">
              Instant responses for custom designs, styling advice, and bridal orders.
            </p>
          </div>

          <div>
            <div className="eyebrow text-primary mb-2">Email Us Directly</div>
            <a
              href="mailto:Charminngchic@gmail.com"
              className="inline-flex items-center gap-2 font-serif text-2xl hover:text-primary transition-colors"
            >
              <Mail className="size-6 text-primary" /> Charminngchic@gmail.com
            </a>
            <p className="text-sm text-muted-foreground mt-2">
              Our team typically responds within 24 hours to assist with orders and custom
              requirements.
            </p>
          </div>

          <div className="pt-2">
            <div className="eyebrow text-primary mb-4">Follow Us</div>
            <div className="flex gap-4">
              <a
                href="#"
                className="p-3 bg-secondary hover:bg-secondary/80 transition-colors rounded-full"
                aria-label="Instagram"
              >
                <Instagram className="size-5" />
              </a>
              <a
                href="#"
                className="p-3 bg-secondary hover:bg-secondary/80 transition-colors rounded-full"
                aria-label="TikTok"
              >
                <TikTokIcon className="size-5" />
              </a>
            </div>
          </div>
        </div>

        <div>
          {sent ? (
            <div className="bg-secondary/30 p-8 rounded-sm border space-y-4 animate-rise">
              <div className="flex items-center gap-3 text-primary">
                <CheckCircle2 className="size-8" />
                <h3 className="font-serif text-3xl">Enquiry Received</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Thank you for reaching out. Your enquiry has been sent to our Gmail inbox. We will
                review your message and get back to you shortly.
              </p>
              <button type="button" onClick={() => setSent(false)} className="btn-outline mt-4">
                Send Another Message
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-5 bg-secondary/30 p-8 rounded-sm border"
            >
              <div>
                <h3 className="font-serif text-2xl">Send an Enquiry</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Fill in the details below and we will send your message directly to our inbox.
                </p>
              </div>

              {!configured && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs rounded-sm">
                  <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <span>
                    EmailJS environment keys are awaiting configuration in <code>.env</code>.
                  </span>
                </div>
              )}

              {errorMessage && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-sm">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="contact-name"
                  className="block text-xs uppercase tracking-wider mb-1 font-medium"
                >
                  Your Name <span className="text-primary">*</span>
                </label>
                <input
                  id="contact-name"
                  name="name"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="field w-full"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-email"
                  className="block text-xs uppercase tracking-wider mb-1 font-medium"
                >
                  Your Email <span className="text-primary">*</span>
                </label>
                <input
                  id="contact-email"
                  name="email"
                  required
                  type="email"
                  placeholder="e.g. priya@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="field w-full"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-subject"
                  className="block text-xs uppercase tracking-wider mb-1 font-medium"
                >
                  Subject{" "}
                  <span className="text-muted-foreground text-[10px] lowercase">(optional)</span>
                </label>
                <input
                  id="contact-subject"
                  name="subject"
                  placeholder="e.g. Bridal Consultation / Custom Outfit / Order Query"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={loading}
                  className="field w-full"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-xs uppercase tracking-wider mb-1 font-medium"
                >
                  Your Message <span className="text-primary">*</span>
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={4}
                  placeholder="Tell us about the outfit, custom requirements, dates or sizes..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={loading}
                  className="field w-full resize-y"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Sending Enquiry...</span>
                  </>
                ) : (
                  <span>Send Message</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
