import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/Chrome";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";

export const Route = createFileRoute("/shipping")({
  head: () => ({
    meta: [
      { title: "Worldwide Shipping & Returns — SohniMutiyaar By CC" },
      {
        name: "description",
        content: "Delivery, returns and custom order information.",
      },
      { property: "og:title", content: "Worldwide Shipping — SohniMutiyaar By CC" },
      { property: "og:description", content: "Delivered to your door, wherever you are." },
    ],
  }),
  component: Shipping,
});

function Shipping() {
  const items = [
    ["UK Delivery", "Ready-to-ship pieces are dispatched from the UK with tracked delivery."],
    [
      "International Delivery",
      "We ship worldwide. Delivery times and costs are confirmed when your order is placed. Customs duties may apply in your country.",
    ],
    [
      "Custom & Made-to-Measure",
      "Personalised outfits are made especially for you; timelines are agreed during your design consultation.",
    ],
    [
      "Returns & Exchanges",
      "Ready-to-ship items may be returned in original condition — contact us first. Custom and made-to-measure pieces cannot be returned unless faulty.",
    ],
  ];
  return (
    <div className="mx-auto max-w-3xl px-5 pt-4 pb-20">
      <SiteBreadcrumb items={[{ label: "Shipping & Returns" }]} />
      <PageHeader eyebrow="Customer Care" title="Worldwide Shipping" />
      <div className="divide-y border-y">
        {items.map(([t, d]) => (
          <div key={t} className="py-8">
            <h2 className="text-3xl">{t}</h2>
            <p className="mt-3 text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 p-8 bg-secondary/30 rounded border text-center">
        <h3 className="text-2xl font-serif mb-2">Have questions about shipping or returns?</h3>
        <p className="text-muted-foreground mb-6 text-sm">
          Our team is here to assist you with order tracking, custom delivery timelines, or general
          enquiries.
        </p>
        <Link to="/contact" className="btn-primary inline-block">
          Contact Us via Email
        </Link>
      </div>
    </div>
  );
}
