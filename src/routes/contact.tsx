import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MessageCircle, Instagram, Mail } from "lucide-react";
import { waLink } from "@/lib/catalog";
import { PageHeader } from "@/components/site/Chrome";

// Custom TikTok SVG since lucide-react doesn't include it natively
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/>
  </svg>
);

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — SohniMutiyaar By CC" },
      { name: "description", content: "Get in touch about orders, custom designs and bridal consultations." },
      { property: "og:title", content: "Contact — SohniMutiyaar By CC" },
      { property: "og:description", content: "Chat with us on WhatsApp or send a message." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [sent, setSent] = useState(false);
  return (
    <div className="mx-auto max-w-5xl px-5 pb-20">
      <PageHeader eyebrow="We'd love to hear from you" title="Contact Us" text="For orders, custom designs or bridal consultations, the quickest way to reach us is WhatsApp." />
      <div className="grid md:grid-cols-2 gap-16">
        <div className="space-y-8">
          <div>
            <a href={waLink()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 py-4 px-8 bg-whatsapp hover:bg-whatsapp/90 transition-colors text-primary-foreground eyebrow !text-[0.68rem] rounded-sm shadow-sm">
              <MessageCircle className="size-4" /> Chat on WhatsApp
            </a>
          </div>
          
          <div>
            <div className="eyebrow text-primary mb-2">Email Us</div>
            <a href="mailto:Charminngchic@gmail.com" className="inline-flex items-center gap-2 font-serif text-2xl hover:text-primary transition-colors">
              <Mail className="size-6" /> Charminngchic@gmail.com
            </a>
          </div>

          <div>
            <div className="eyebrow text-primary mb-2">Based in</div>
            <p className="font-serif text-xl">United Kingdom · Shipping worldwide</p>
          </div>

          <div className="pt-4">
            <div className="eyebrow text-primary mb-4">Follow Us</div>
            <div className="flex gap-4">
              <a href="#" className="p-3 bg-secondary hover:bg-secondary/80 transition-colors rounded-full" aria-label="Instagram">
                <Instagram className="size-5" />
              </a>
              <a href="#" className="p-3 bg-secondary hover:bg-secondary/80 transition-colors rounded-full" aria-label="TikTok">
                <TikTokIcon className="size-5" />
              </a>
            </div>
          </div>
        </div>
        
        <div>
          {sent ? <p className="font-serif text-3xl text-primary">Thank you — we'll be in touch shortly.</p> : (
            <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-6 bg-secondary/30 p-8 rounded-sm border">
              <h3 className="font-serif text-2xl mb-6">Send an Enquiry</h3>
              <input required placeholder="Name" className="field" />
              <input required type="email" placeholder="Email" className="field" />
              <textarea required rows={4} placeholder="Your message" className="field" />
              <button className="btn-primary w-full">Send Message</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
