import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/Chrome";

export const Route = createFileRoute("/shipping")({
  head: () => ({
    meta: [
      { title: "Worldwide Shipping & Returns — SohniMutiyaar By CC" },
      { name: "description", content: "UK based, shipping worldwide. Delivery, returns and custom order information." },
      { property: "og:title", content: "Worldwide Shipping — SohniMutiyaar By CC" },
      { property: "og:description", content: "From the UK to your door, wherever you are." },
    ],
  }),
  component: Shipping,
});

function Shipping() {
  const items = [
    ["UK Delivery", "Ready-to-ship pieces are dispatched from the UK with tracked delivery."],
    ["International Delivery", "We ship worldwide. Delivery times and costs are confirmed when your order is placed. Customs duties may apply in your country."],
    ["Custom & Made-to-Measure", "Personalised outfits are made especially for you; timelines are agreed during your design consultation."],
    ["Returns & Exchanges", "Ready-to-ship items may be returned in original condition — contact us first. Custom and made-to-measure pieces cannot be returned unless faulty."],
  ];
  return (
    <div className="mx-auto max-w-3xl px-5">
      <PageHeader eyebrow="Customer Care" title="Worldwide Shipping" />
      <div className="divide-y border-y">
        {items.map(([t, d]) => <div key={t} className="py-8"><h2 className="text-3xl">{t}</h2><p className="mt-3 text-muted-foreground">{d}</p></div>)}
      </div>
    </div>
  );
}
