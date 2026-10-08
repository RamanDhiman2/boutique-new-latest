import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, X } from "lucide-react";
import { gbp, products, waLink } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { PageHeader } from "@/components/site/Chrome";
import { ProductCard } from "@/components/site/ProductCard";

export const Route = createFileRoute("/bag")({
  head: () => ({
    meta: [
      { title: "Your Bag — SohniMutiyaar By CC" },
      { name: "description", content: "Review your bag and wishlist, then order securely via WhatsApp." },
      { property: "og:title", content: "Your Bag — SohniMutiyaar By CC" },
      { property: "og:description", content: "Your selected SohniMutiyaar pieces." },
    ],
  }),
  component: Bag,
});

function Bag() {
  const { lines, total, remove, wishlist } = useCart();
  const msg = `Hi SohniMutiyaar By CC, I'd like to order:\n${lines.map((l) => `• ${l.product.name} (${l.size}) x${l.qty}`).join("\n")}\nTotal: ${gbp(total)}`;
  return (
    <div className="mx-auto max-w-5xl px-5">
      <PageHeader eyebrow="Shopping Bag" title="Your Bag" />
      {lines.length === 0 ? (
        <div className="text-center"><p className="text-muted-foreground">Your bag is empty.</p><Link to="/shop" className="btn-primary mt-8">Shop Collection</Link></div>
      ) : (
        <div className="grid md:grid-cols-[1fr_320px] gap-12">
          <ul className="divide-y border-y">
            {lines.map((l) => (
              <li key={l.id + l.size} className="py-5 flex gap-5">
                <img src={l.product.images[0]} alt="" className="w-24 aspect-[3/4] object-cover" />
                <div className="flex-1">
                  <Link to="/product/$id" params={{ id: l.id }} className="font-serif text-2xl">{l.product.name}</Link>
                  <div className="text-sm text-muted-foreground">Size {l.size} · Qty {l.qty}</div>
                  <div className="mt-2">{gbp(l.product.price * l.qty)}</div>
                </div>
                <button onClick={() => remove(l.id, l.size)} aria-label="Remove"><X className="size-4" /></button>
              </li>
            ))}
          </ul>
          <div className="bg-secondary p-8 self-start">
            <div className="flex justify-between font-serif text-2xl"><span>Subtotal</span><span>{gbp(total)}</span></div>
            <p className="text-xs text-muted-foreground mt-2">Shipping calculated at confirmation. Worldwide delivery available.</p>
            <a href={waLink(msg)} target="_blank" rel="noreferrer" className="mt-6 w-full inline-flex items-center justify-center gap-2 py-4 bg-whatsapp text-primary-foreground eyebrow !text-[0.68rem]"><MessageCircle className="size-4" /> Checkout via WhatsApp</a>
          </div>
        </div>
      )}
      {wishlist.length > 0 && (
        <>
          <h2 className="text-4xl mt-24 mb-10">Your Wishlist</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-12">
            {products.filter((p) => wishlist.includes(p.id)).map((p) => <div key={p.id} className="[&_.reveal]:opacity-100 [&_.reveal]:transform-none"><ProductCard p={p} /></div>)}
          </div>
        </>
      )}
    </div>
  );
}
