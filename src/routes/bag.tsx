import { createFileRoute, Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { gbp, products } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { PageHeader } from "@/components/site/Chrome";
import { ProductCard } from "@/components/site/ProductCard";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";

export const Route = createFileRoute("/bag")({
  head: () => ({
    meta: [
      { title: "Your Bag — SohniMutiyaar By CC" },
      {
        name: "description",
        content: "Review your bag and wishlist, then proceed to secure checkout.",
      },
      { property: "og:title", content: "Your Bag — SohniMutiyaar By CC" },
      { property: "og:description", content: "Your selected SohniMutiyaar pieces." },
    ],
  }),
  component: Bag,
});

function Bag() {
  const {
    lines,
    total,
    checkoutTotal,
    checkoutLines,
    updateQty,
    remove,
    toggleSelect,
    selectAll,
    wishlist,
  } = useCart();

  const allSelected = lines.length > 0 && lines.every((l) => l.selected);

  return (
    <div className="mx-auto max-w-5xl px-5 pt-4">
      <SiteBreadcrumb items={[{ label: "Shopping Bag" }]} />
      <PageHeader eyebrow="Shopping Bag" title="Your Bag" />
      {lines.length === 0 ? (
        <div className="text-center">
          <p className="text-muted-foreground">Your bag is empty.</p>
          <Link to="/shop" className="btn-primary mt-8">
            Shop Collection
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-[1fr_350px] gap-12">
          <div>
            <div className="flex items-center gap-3 pb-4 border-b">
              <input
                type="checkbox"
                className="size-4"
                checked={allSelected}
                onChange={(e) => selectAll(e.target.checked)}
              />
              <span className="text-sm font-medium">Select All Items</span>
            </div>
            <ul className="divide-y">
              {lines.map((l) => (
                <li key={l.id + l.size} className="py-6 flex gap-6 items-center">
                  <input
                    type="checkbox"
                    className="size-4 shrink-0"
                    checked={l.selected ?? true}
                    onChange={() => toggleSelect(l.id, l.size)}
                  />
                  <img
                    src={l.product.images[0]}
                    alt=""
                    className="w-24 aspect-[3/4] object-cover"
                  />
                  <div className="flex-1 flex flex-col justify-between self-stretch py-1">
                    <div>
                      <div className="flex justify-between items-start">
                        <Link
                          to="/product/$id"
                          params={{ id: l.id }}
                          className="font-serif text-2xl hover:text-primary transition-colors"
                        >
                          {l.product.name}
                        </Link>
                        <button
                          onClick={() => remove(l.id, l.size)}
                          aria-label="Remove"
                          className="p-1 hover:text-destructive"
                        >
                          <X className="size-5" />
                        </button>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Size: {l.size}</div>
                      <div className="mt-2 text-lg">{gbp(l.product.price)}</div>
                    </div>
                    <div className="flex justify-between items-end mt-4">
                      <div className="flex items-center border border-input rounded-sm">
                        <button
                          onClick={() => updateQty(l.id, l.size, l.qty - 1)}
                          className="px-3 py-1 hover:bg-muted"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 text-sm">{l.qty}</span>
                        <button
                          onClick={() => updateQty(l.id, l.size, l.qty + 1)}
                          className="px-3 py-1 hover:bg-muted"
                        >
                          +
                        </button>
                      </div>
                      <div className="font-medium text-lg">
                        Total: {gbp(l.product.price * l.qty)}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-secondary/50 p-8 self-start border rounded-sm">
            <h3 className="font-serif text-2xl mb-6">Order Summary</h3>
            <div className="text-sm mb-4 text-muted-foreground">
              Selected Items: {checkoutLines.length}
            </div>
            <div className="flex justify-between mb-4">
              <span>Subtotal</span>
              <span>{gbp(checkoutTotal)}</span>
            </div>
            <div className="flex justify-between mb-6 pb-6 border-b">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="flex justify-between font-serif text-2xl mb-8">
              <span>Total</span>
              <span>{gbp(checkoutTotal)}</span>
            </div>
            <Link
              to="/checkout"
              className={`w-full inline-flex items-center justify-center gap-2 py-4 bg-foreground text-background uppercase tracking-widest text-xs font-semibold ${checkoutLines.length === 0 ? "opacity-50 pointer-events-none" : "hover:bg-foreground/90 transition-colors"}`}
            >
              Proceed to Checkout
            </Link>
          </div>
        </div>
      )}
      {wishlist.length > 0 && (
        <>
          <h2 className="text-4xl mt-24 mb-10">Your Wishlist</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-12">
            {products
              .filter((p) => wishlist.includes(p.id))
              .map((p) => (
                <div key={p.id} className="[&_.reveal]:opacity-100 [&_.reveal]:transform-none">
                  <ProductCard p={p} />
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
