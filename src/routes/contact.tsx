import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/catalog";
import { PageHeader } from "@/components/site/Chrome";

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
    <div className="mx-auto max-w-5xl px-5">
      <PageHeader eyebrow="We'd love to hear from you" title="Contact Us" text="For orders, custom designs or bridal consultations, the quickest way to reach us is WhatsApp." />
      <div className="grid md:grid-cols-2 gap-16">
        <div className="space-y-6">
          <a href={waLink()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 py-4 px-8 bg-whatsapp text-primary-foreground eyebrow !text-[0.68rem]"><MessageCircle className="size-4" /> Chat on WhatsApp</a>
          <div><div className="eyebrow text-primary">WhatsApp</div><p className="font-serif text-2xl mt-1">+44 7739 3070421</p></div>
          <div><div className="eyebrow text-primary">Based in</div><p className="font-serif text-2xl mt-1">United Kingdom · Shipping worldwide</p></div>
        </div>
        {sent ? <p className="font-serif text-3xl text-primary">Thank you — we'll be in touch shortly.</p> : (
          <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-6">
            <input required placeholder="Name" className="field" />
            <input required type="email" placeholder="Email" className="field" />
            <textarea required rows={4} placeholder="Your message" className="field" />
            <button className="btn-primary">Send Message</button>
          </form>
        )}
      </div>
    </div>
  );
}
