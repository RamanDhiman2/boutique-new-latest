import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Ruler } from "lucide-react";
import { categories, waLink } from "@/lib/catalog";
import { PageHeader } from "@/components/site/Chrome";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";
import { WhatsAppIcon } from "@/components/site/WhatsAppButton";

export const Route = createFileRoute("/custom-designs")({
  head: () => ({
    meta: [
      { title: "Custom Designs — SohniMutiyaar By CC" },
      {
        name: "description",
        content:
          "Personalised, made-to-measure Indian outfits. Choose design, fabric, colour and embroidery.",
      },
      { property: "og:title", content: "Custom Designs — SohniMutiyaar By CC" },
      { property: "og:description", content: "Your design, your measurements, your story." },
    ],
  }),
  component: Custom,
});

const options = [
  "Custom colours",
  "Fabric selection",
  "Embroidery choices",
  "Neckline & sleeve styles",
  "Made-to-measure fit",
  "Matching dupattas",
];
const steps = [
  "Choose Your Style",
  "Choose Your Details",
  "Share Your Measurements",
  "Discuss Your Design",
  "Confirm Your Order",
  "We Create Your Outfit",
  "Worldwide Delivery",
];

function Custom() {
  return (
    <div className="mx-auto max-w-[1500px] px-5 lg:px-10 pt-4">
      <SiteBreadcrumb items={[{ label: "Custom Designs" }]} />
      <PageHeader
        eyebrow="Made For You"
        title="Your design. Your measurements. Your story."
        text="Choose your preferred design, fabric, colour, embroidery and finishing details. We create personalised Indian outfits designed around your style and measurements."
      />
      <div className="flex flex-wrap justify-center gap-3">
        <a
          href={waLink("Hi SohniMutiyaar By CC, I'd like to discuss a custom design outfit.")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 py-3 px-6 bg-[#25D366] hover:bg-[#20ba59] text-white eyebrow !text-[0.68rem] rounded-sm transition-colors shadow-sm"
        >
          <WhatsAppIcon className="size-4" /> Discuss on WhatsApp
        </a>
        <Link to="/contact" className="btn-primary inline-flex items-center gap-2">
          <Mail className="size-4" /> Enquire via Email
        </Link>
        <Link to="/measurements" className="btn-outline">
          <Ruler className="size-4" /> Measurement Form
        </Link>
      </div>
      <div className="grid md:grid-cols-3 gap-3 mt-20">
        {categories.slice(3, 6).map((c) => (
          <img
            key={c.slug}
            src={c.image}
            alt={c.name}
            loading="lazy"
            className="aspect-[3/4] object-cover w-full"
          />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-16 mt-24">
        <div>
          <h2 className="text-4xl">What you can personalise</h2>
          <ul className="mt-8 divide-y border-y">
            {options.map((o) => (
              <li key={o} className="py-4 font-serif text-2xl">
                {o}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-4xl">Your custom order journey</h2>
          <ol className="mt-8 space-y-5">
            {steps.map((s, i) => (
              <li key={s} className="flex gap-5 items-baseline">
                <span className="font-serif text-3xl text-primary w-10">0{i + 1}</span>
                <span className="font-serif text-2xl">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
