import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { categories as staticCategories, products as staticProducts } from "@/lib/catalog";
import { useCategoriesQuery, useAllProductsQuery } from "@/lib/catalogService";
import { ProductCard } from "@/components/site/ProductCard";
import { PageHeader, useReveal } from "@/components/site/Chrome";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop All — SohniMutiyaar By CC" },
      {
        name: "description",
        content:
          "Shop the full SohniMutiyaar By CC collection of Indian bridal, occasion and daily wear.",
      },
      { property: "og:title", content: "Shop All — SohniMutiyaar By CC" },
      {
        property: "og:description",
        content: "Indian bridal, occasion and daily wear with artisan handwork.",
      },
    ],
  }),
  component: Shop,
});

function Shop() {
  const [q, setQ] = useState("");
  const { data: categories = staticCategories } = useCategoriesQuery();
  const { data: products = staticProducts } = useAllProductsQuery();

  const list = products.filter((p) =>
    `${p.name} ${p.colour} ${p.category} ${p.soldOut ? "sold out" : ""} ${p.isUpcoming ? "upcoming coming soon" : ""}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  useReveal();
  return (
    <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-10 pt-4">
      <SiteBreadcrumb items={[{ label: "Shop All" }]} />
      <PageHeader eyebrow="The Collection" title="Shop All" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, colour or craft…"
        className="field max-w-xl mx-auto block text-center text-sm sm:text-base"
      />
      <div className="flex flex-wrap justify-center gap-2.5 sm:gap-5 mt-6 sm:mt-8 eyebrow !text-[0.62rem] sm:!text-[0.68rem] px-2">
        {categories.map((c) => (
          <Link
            key={c.slug}
            to="/collections/$slug"
            params={{ slug: c.slug }}
            className="hover:text-primary transition-colors py-1 px-1.5"
          >
            {c.name}
          </Link>
        ))}
      </div>
      <div key={q} className="pt-8 sm:pt-14 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 sm:gap-x-5 gap-y-8 sm:gap-y-12">
        {list.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
      {list.length === 0 && (
        <p className="text-center text-muted-foreground py-20">No pieces match your search.</p>
      )}
    </div>
  );
}
