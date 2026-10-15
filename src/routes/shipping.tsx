import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/Chrome";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";

export const Route = createFileRoute("/shipping")({
  head: () => ({
    meta: [
      { title: "Worldwide Shipping — SohniMutiyaar By CC" },
      {
        name: "description",
        content: "Delivery and custom order information.",
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
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-4 pb-20">
      <SiteBreadcrumb items={[{ label: "Worldwide Shipping" }]} />
      <PageHeader eyebrow="Customer Care" title="Worldwide Shipping" />
      <div className="divide-y border-y">
        {items.map(([t, d]) => (
          <div key={t} className="py-6 sm:py-8">
            <h2 className="text-2xl sm:text-3xl font-serif">{t}</h2>
            <p className="mt-2 sm:mt-3 text-sm sm:text-base text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 sm:mt-12 p-5 sm:p-8 bg-secondary/30 rounded border text-center">
        <h3 className="text-xl sm:text-2xl font-serif mb-2">Have questions about shipping?</h3>
        <p className="text-muted-foreground mb-6 text-xs sm:text-sm">
          Our team is here to assist you with order tracking, custom delivery timelines, or general
          enquiries.
        </p>
        <Link to="/contact" className="btn-primary inline-flex items-center justify-center w-full sm:w-auto">
          Contact Us via Email
        </Link>
      </div>
    </div>
  );
}
