import { createFileRoute, Link } from "@tanstack/react-router";
import { categories, heroImage } from "@/lib/catalog";
import { PageHeader } from "@/components/site/Chrome";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Our Story — SohniMutiyaar By CC" },
      {
        name: "description",
        content: "An Indian fashion label blending heritage craftsmanship with modern elegance.",
      },
      { property: "og:title", content: "Our Story — SohniMutiyaar By CC" },
      {
        property: "og:description",
        content: "Indian heritage, modern fashion, luxury craftsmanship.",
      },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="mx-auto max-w-[1500px] px-5 lg:px-10 pt-4 pb-20">
      <SiteBreadcrumb items={[{ label: "About Us" }]} />
      <PageHeader eyebrow="Charming Chic" title="Where Tradition Meets Modern Elegance" />
      <img
        src={heroImage}
        alt="SohniMutiyaar By CC"
        className="w-full max-h-[620px] object-cover"
      />
      <div className="grid md:grid-cols-2 gap-16 mt-20 items-center">
        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <p className="font-serif text-3xl text-foreground leading-snug">
            SohniMutiyaar By CC was born from a love of Indian craftsmanship and the women who wear
            it.
          </p>
          <p>
            We design Indian modern and traditional fashion — from easy daily wear to unforgettable
            bridal outfits — celebrating thread work, mirror work, Aari work and hand embroidery.
          </p>
          <p>
            Every piece can be personalised and made to measure, because we believe beautiful
            clothing should be made for you. We bring heritage craft directly to your door.
          </p>
          <div className="pt-4 flex flex-wrap gap-4">
            <Link to="/contact" className="btn-primary">
              Contact Us via Email
            </Link>
            <Link to="/custom-designs" className="btn-outline">
              Explore Custom Designs
            </Link>
          </div>
        </div>
        <img
          src={categories[6]!.image}
          alt="Hand embroidery"
          loading="lazy"
          className="w-full aspect-[4/5] object-cover"
        />
      </div>
    </div>
  );
}
