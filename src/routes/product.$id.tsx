import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, MessageCircle, Ruler } from "lucide-react";
import { toast } from "sonner";
import { categories, gbp, products, productsIn, waLink } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { ProductCard } from "@/components/site/ProductCard";
import { useReveal } from "@/components/site/Chrome";

export const Route = createFileRoute("/product/$id")({
  loader: ({ params }) => {
    const product = products.find((p) => p.id === params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `${loaderData.product.name} — SohniMutiyaar By CC` },
            { name: "description", content: loaderData.product.description },
            { property: "og:title", content: loaderData.product.name },
            { property: "og:description", content: loaderData.product.description },
          ],
        }
      : { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] },
  component: ProductPage,
});

function ProductPage() {
  const { product: p } = Route.useLoaderData();
  const [size, setSize] = useState(p.sizes[0]);
  const { add, toggleWish, wishlist } = useCart();
  const cat = categories.find((c) => c.slug === p.category)!;
  useReveal();
  return (
    <div className="mx-auto max-w-[1500px] px-5 lg:px-10 pt-10">
      <div className="eyebrow !text-[0.6rem] text-muted-foreground mb-8">
        <Link to="/">Home</Link> / <Link to="/collections/$slug" params={{ slug: cat.slug }}>{cat.name}</Link> / {p.name}
      </div>
      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-12">
        <div className="flex lg:grid lg:grid-cols-2 gap-3 overflow-x-auto snap-x">
          {p.images.map((src, i) => (
            <img key={i} src={src} alt={p.name} className="snap-center shrink-0 w-[85%] lg:w-full aspect-[3/4] object-cover" />
          ))}
        </div>
        <div className="lg:sticky lg:top-40 self-start animate-rise">
          {p.customisable && <div className="eyebrow text-primary">Customisation available</div>}
          <h1 className="mt-3 text-5xl">{p.name}</h1>
          <div className="mt-3 text-xl">{gbp(p.price)}</div>
          <p className="mt-6 text-muted-foreground leading-relaxed">{p.description}</p>
          <div className="mt-8 eyebrow !text-[0.62rem]">Colour — <span className="text-muted-foreground normal-case tracking-normal text-sm">{p.colour}</span></div>
          <div className="mt-6 eyebrow !text-[0.62rem]">Size</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {p.sizes.map((s) => (
              <button key={s} onClick={() => setSize(s)} className={`min-w-12 px-3 py-2 border text-sm ${size === s ? "bg-foreground text-background border-foreground" : ""}`}>{s}</button>
            ))}
          </div>
          {size === "Custom" && (
            <Link to="/measurements" className="mt-3 inline-flex items-center gap-2 text-sm text-primary underline"><Ruler className="size-4" /> Submit your measurements</Link>
          )}
          <div className="mt-8 flex gap-3">
            <button onClick={() => { add(p.id, size); toast.success(`${p.name} added to your bag`); }} className="btn-primary flex-1">Add to Bag</button>
            <button onClick={() => toggleWish(p.id)} aria-label="Wishlist" className="border px-4"><Heart className={`size-5 ${wishlist.includes(p.id) ? "fill-primary text-primary" : ""}`} /></button>
          </div>
          <a href={waLink(`Hi SohniMutiyaar By CC, I'm interested in ${p.name}. Please can you provide more information?`)} target="_blank" rel="noreferrer" className="mt-3 w-full inline-flex items-center justify-center gap-2 py-4 bg-whatsapp text-primary-foreground eyebrow !text-[0.68rem]">
            <MessageCircle className="size-4" /> Order via WhatsApp
          </a>
          <div className="mt-10 divide-y border-y text-sm">
            {[
              ["Craftsmanship", "Each piece is finished by hand by skilled artisans. Slight variations are part of its handmade beauty."],
              ["Customisation", "Colours, sleeve length, neckline and fit can be adjusted. Message us on WhatsApp to discuss."],
              ["Shipping", "UK based, shipping worldwide. Delivery times are confirmed at order."],
            ].map(([t, d]) => (
              <details key={t} className="py-4"><summary className="cursor-pointer eyebrow !text-[0.62rem]">{t}</summary><p className="mt-3 text-muted-foreground">{d}</p></details>
            ))}
          </div>
        </div>
      </div>
      <h2 className="text-4xl mt-28 mb-10">You may also love</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-12">
        {[...productsIn(p.category), ...products].filter((x, i, a) => x.id !== p.id && a.indexOf(x) === i).slice(0, 4).map((x) => <ProductCard key={x.id} p={x} />)}
      </div>
    </div>
  );
}
