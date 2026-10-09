import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { categories, products } from "@/lib/catalog";
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
  const list = products.filter((p) =>
    `${p.name} ${p.colour} ${p.category}`.toLowerCase().includes(q.toLowerCase()),
  );
  useReveal();
  return (
    <div className="mx-auto max-w-[1500px] px-5 lg:px-10 pt-4">
      <SiteBreadcrumb items={[{ label: "Shop All" }]} />
      <PageHeader eyebrow="The Collection" title="Shop All" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, colour or craft…"
        className="field max-w-xl mx-auto block text-center"
      />
      <div className="flex flex-wrap justify-center gap-5 mt-8 eyebrow !text-[0.62rem]">
        {categories.map((c) => (
          <Link
            key={c.slug}
            to="/collections/$slug"
            params={{ slug: c.slug }}
            className="hover:text-primary"
          >
            {c.name}
          </Link>
        ))}
      </div>
      <div key={q} className="pt-14 grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-12">
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
