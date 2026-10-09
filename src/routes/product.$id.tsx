import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Mail, Ruler } from "lucide-react";
import { toast } from "sonner";
import { categories, gbp, products, productsIn, waLink } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { ProductCard } from "@/components/site/ProductCard";
import { useReveal } from "@/components/site/Chrome";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";
import { WhatsAppIcon } from "@/components/site/WhatsAppButton";

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
  const [size, setSize] = useState(p.sizes[0] ?? "Custom");
  const { add, toggleWish, wishlist } = useCart();
  const cat = categories.find((c) => c.slug === p.category)!;
  useReveal();
  return (
    <div className="mx-auto max-w-[1500px] px-5 lg:px-10 pt-6">
      <SiteBreadcrumb
        className="mb-6"
        items={[
          { label: "Shop", to: "/shop" },
          { label: cat.name, to: "/collections/$slug", params: { slug: cat.slug } },
          { label: p.name },
        ]}
      />
      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-12">
        <div className="flex lg:grid lg:grid-cols-2 gap-3 overflow-x-auto snap-x">
          {p.images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={p.name}
              className="snap-center shrink-0 w-[85%] lg:w-full aspect-[3/4] object-cover"
            />
          ))}
        </div>
        <div className="lg:sticky lg:top-40 self-start animate-rise">
          {p.customisable && <div className="eyebrow text-primary">Customisation available</div>}
          <h1 className="mt-3 text-5xl">{p.name}</h1>
          <div className="mt-3 text-xl">{gbp(p.price)}</div>
          <p className="mt-6 text-muted-foreground leading-relaxed">{p.description}</p>
          <div className="mt-8 eyebrow !text-[0.62rem]">
            Colour —{" "}
            <span className="text-muted-foreground normal-case tracking-normal text-sm">
              {p.colour}
            </span>
          </div>

          <div className="mt-6">
            <Link
              to="/measurements"
              className="w-full inline-flex items-center justify-center gap-2 py-3 border border-foreground hover:bg-foreground hover:text-background transition-colors eyebrow !text-[0.68rem]"
            >
              <Ruler className="size-4" /> Submit your measurements
            </Link>
          </div>

          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="eyebrow !text-[0.62rem]">Select Size</span>
              {size === "Custom" && (
                <span className="text-xs text-primary font-medium">Made to your measurements</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {p.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`px-3.5 py-1.5 text-xs uppercase tracking-wider border rounded-sm transition-colors ${
                    size === s
                      ? "border-primary bg-primary text-primary-foreground font-medium"
                      : "border-border hover:border-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => {
                add(p.id, size);
                toast.success(`${p.name} added to your bag`);
              }}
              className="btn-primary flex-1"
            >
              Add to Bag
            </button>
            <button onClick={() => toggleWish(p.id)} aria-label="Wishlist" className="border px-4">
              <Heart
                className={`size-5 ${wishlist.includes(p.id) ? "fill-primary text-primary" : ""}`}
              />
            </button>
          </div>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <a
              href={waLink(`Hi SohniMutiyaar By CC, I'd like to enquire about ${p.name} (${gbp(p.price)}).`)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-4 bg-[#25D366] hover:bg-[#20ba59] text-white eyebrow !text-[0.68rem] transition-colors rounded-sm shadow-sm"
            >
              <WhatsAppIcon className="size-4 text-white" /> Enquire on WhatsApp
            </a>
            <Link
              to="/contact"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-4 bg-secondary hover:bg-secondary/80 text-foreground border eyebrow !text-[0.68rem] transition-colors rounded-sm"
            >
              <Mail className="size-4" /> Email Us
            </Link>
          </div>
          <div className="mt-10 divide-y border-y text-sm">
            {[
              [
                "Sizing & Measurements",
                "Whether you select a standard size or provide custom measurements, your details are sent directly to our master tailors to ensure a perfect fit. Sizing can also be finalized through your Enquiry.",
              ],
              [
                "Craftsmanship",
                "Each piece is finished by hand by skilled artisans. Slight variations are part of its handmade beauty.",
              ],
              [
                "Customisation",
                "Colours, sleeve length, neckline and fit can be adjusted. Contact us via email to discuss.",
              ],
              ["Shipping", "Delivery times are confirmed at order."],
            ].map(([t, d]) => (
              <details key={t} className="py-4">
                <summary className="cursor-pointer eyebrow !text-[0.62rem]">{t}</summary>
                <p className="mt-3 text-muted-foreground">{d}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
      <h2 className="text-4xl mt-28 mb-10">You may also love</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-12">
        {[...productsIn(p.category), ...products]
          .filter((x, i, a) => x.id !== p.id && a.indexOf(x) === i)
          .slice(0, 4)
          .map((x) => (
            <ProductCard key={x.id} p={x} />
          ))}
      </div>
    </div>
  );
}
