import { createFileRoute, Link } from "@tanstack/react-router";
import { categories, productsIn } from "@/lib/catalog";
import { useCategoriesQuery } from "@/lib/catalogService";
import { useReveal, PageHeader } from "@/components/site/Chrome";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";
import { ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/collections/")({
  head: () => ({
    meta: [
      { title: "Our Collections — SohniMutiyaar By CC" },
      {
        name: "description",
        content:
          "Explore the complete range of handcrafted Indian fashion categories: Bridal, Occasion, Daily Wear, Thread Work, Mirror Work, Aari Work, and Hand Work.",
      },
      { property: "og:title", content: "Our Collections — SohniMutiyaar By CC" },
      {
        property: "og:description",
        content: "Explore handcrafted Indian boutique collections and embroidery styles.",
      },
    ],
  }),
  component: CollectionsIndexPage,
});

function CollectionsIndexPage() {
  const { data: categoriesList = categories } = useCategoriesQuery();
  useReveal();

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Top Banner / Breadcrumb */}
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6">
        <SiteBreadcrumb items={[{ label: "Collections" }]} />
      </div>

      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-10 pt-2 sm:pt-4">
        <PageHeader
          eyebrow="Sohni Mutiyaar Curations"
          title="Our Collections"
          text="Discover Indian craftsmanship, vibrant heritage colours, and contemporary boutique silhouettes tailored made-to-measure."
        />

        {/* Categories Grid (Exclusively Categories - No Individual Products) */}
        <div className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8 lg:gap-10">
          {categoriesList.map((c, index) => {
            const count = productsIn(c.slug).length;
            const isFeatured = index === 0; // Bridal as featured luxury card

            return (
              <Link
                key={c.slug}
                to="/collections/$slug"
                params={{ slug: c.slug }}
                className={`group relative flex flex-col justify-end overflow-hidden rounded-sm border border-black/10 bg-black transition-all duration-500 hover:shadow-2xl hover:border-gold/40 ${
                  isFeatured ? "md:col-span-2 lg:col-span-2 min-h-[360px] sm:min-h-[460px] md:min-h-[540px]" : "min-h-[300px] sm:min-h-[380px] lg:min-h-[420px]"
                }`}
              >
                {/* Background Category Image */}
                <img
                  src={c.image}
                  alt={c.name}
                  loading={index < 2 ? "eager" : "lazy"}
                  className="absolute inset-0 size-full object-cover object-top opacity-85 transition-transform duration-1000 ease-out group-hover:scale-105 group-hover:opacity-95"
                />

                {/* Dark Luxury Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent transition-opacity duration-300 group-hover:via-black/35" />

                {/* Top Badge */}
                <div className="absolute top-3.5 left-3.5 sm:top-5 sm:left-5 z-10 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-white">
                    <Sparkles className="size-3 text-gold" />
                    {c.slug === "sold-out"
                      ? `${count} Archived Designs`
                      : count > 0
                        ? `${count} Pieces`
                        : "Curated Edit"}
                  </span>
                </div>

                {/* Content Box */}
                <div className="relative z-10 p-4 sm:p-6 md:p-8 flex flex-col justify-end text-white">
                  <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-gold font-medium mb-1 sm:mb-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                    {c.tagline}
                  </span>

                  <h2 className={`font-serif tracking-tight text-white mb-2 sm:mb-3 transition-transform duration-300 group-hover:translate-x-1 ${
                    isFeatured ? "text-2xl sm:text-3xl md:text-5xl" : "text-xl sm:text-2xl md:text-3xl"
                  }`}>
                    {c.name}
                  </h2>

                  <p className="text-xs sm:text-sm text-white/80 line-clamp-2 max-w-xl leading-relaxed mb-4 sm:mb-6 font-light">
                    {c.description}
                  </p>

                  <div className="inline-flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-widest font-semibold text-white/90 group-hover:text-gold transition-colors">
                    <span>
                      {c.slug === "sold-out"
                        ? "View Archived Pieces"
                        : "Explore Collection"}
                    </span>
                    <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
