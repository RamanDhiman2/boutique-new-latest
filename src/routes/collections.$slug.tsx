import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { categories, productsIn } from "@/lib/catalog";
import { ProductCard } from "@/components/site/ProductCard";
import { useReveal } from "@/components/site/Chrome";

export const Route = createFileRoute("/collections/$slug")({
  loader: ({ params }) => {
    const category = categories.find((c) => c.slug === params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `${loaderData.category.name} — SohniMutiyaar By CC` },
            { name: "description", content: loaderData.category.description },
            { property: "og:title", content: `${loaderData.category.name} — SohniMutiyaar By CC` },
            { property: "og:description", content: loaderData.category.description },
          ],
        }
      : { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] },
  component: CollectionPage,
});

function CollectionPage() {
  const { category } = Route.useLoaderData();
  const [sort, setSort] = useState("featured");
  const [custom, setCustom] = useState(false);
  let list = productsIn(category.slug).filter((p) => !custom || p.customisable);
  if (sort === "low") list = [...list].sort((a, b) => a.price - b.price);
  if (sort === "high") list = [...list].sort((a, b) => b.price - a.price);
  useReveal();
  return (
    <>
      <section className="relative h-[52vh] min-h-[380px] overflow-hidden">
        <img src={category.image} alt={category.name} className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-ink/45" />
        <div className="relative h-full flex flex-col items-center justify-center text-center text-ink-foreground px-5 animate-rise">
          <div className="eyebrow text-gold">{category.tagline}</div>
          <h1 className="mt-4 text-6xl md:text-7xl">{category.name}</h1>
          <p className="mt-5 max-w-xl opacity-85">{category.description}</p>
        </div>
      </section>
      <div className="mx-auto max-w-[1500px] px-5 lg:px-10 py-8 flex flex-wrap justify-between gap-4 border-b">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} className="accent-primary" /> Customisable only</label>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-transparent text-sm eyebrow">
          <option value="featured">Featured</option>
          <option value="low">Price: Low to High</option>
          <option value="high">Price: High to Low</option>
        </select>
      </div>
      <div key={sort + custom} className="mx-auto max-w-[1500px] px-5 lg:px-10 pt-12 grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-12">
        {list.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </>
  );
}
