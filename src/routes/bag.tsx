import { createFileRoute, Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { gbp, products } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { PageHeader, useReveal } from "@/components/site/Chrome";
import { ProductCard } from "@/components/site/ProductCard";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";

export const Route = createFileRoute("/bag")({
  head: () => ({
    meta: [
      { title: "Your Bag — SohniMutiyaar By CC" },
      {
        name: "description",
        content: "Review your bag and wishlist, then send your order enquiry to our team.",
      },
      { property: "og:title", content: "Your Bag — SohniMutiyaar By CC" },
      { property: "og:description", content: "Your selected SohniMutiyaar pieces." },
    ],
  }),
  component: Bag,
});

function Bag() {
  useReveal();
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
          <Link to="/collections" className="btn-primary mt-8">
            Shop Collection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px] lg:grid-cols-[minmax(0,1fr)_350px] gap-8 lg:gap-12">
          <div className="min-w-0">
            <div className="flex items-center gap-3 pb-4 border-b">
              <input
                type="checkbox"
                className="size-4 rounded-xs accent-primary cursor-pointer"
                checked={allSelected}
                onChange={(e) => selectAll(e.target.checked)}
              />
              <span className="text-sm font-medium">Select All Items</span>
            </div>
            <ul className="divide-y divide-border/60">
              {lines.map((l) => (
                <li key={l.id + l.size} className={`py-4 sm:py-6 flex flex-col min-[480px]:flex-row gap-3 sm:gap-6 items-start min-[480px]:items-center ${l.product.soldOut || l.product.isUpcoming ? "opacity-75" : ""}`}>
                  <div className="flex items-center gap-3 w-full min-[480px]:w-auto">
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 rounded-xs accent-primary cursor-pointer"
                      disabled={l.product.soldOut || l.product.isUpcoming}
                      checked={!l.product.soldOut && !l.product.isUpcoming && (l.selected ?? true)}
                      onChange={() => !l.product.soldOut && !l.product.isUpcoming && toggleSelect(l.id, l.size)}
                    />
                    <img
                      src={l.product.images[0]}
                      alt=""
                      className="w-16 sm:w-24 aspect-[3/4] object-cover rounded-xs border border-border/50 shrink-0"
                    />
                    <div className="min-[480px]:hidden flex-1 min-w-0">
                      <Link
                        to="/product/$id"
                        params={{ id: l.id }}
                        className="font-serif text-lg hover:text-primary transition-colors block truncate"
                      >
                        {l.product.name}
                      </Link>
                      <div className="text-sm font-medium mt-1">{gbp(l.product.price)}</div>
                    </div>
                  </div>
                  <div className="flex-1 w-full min-[480px]:w-auto flex flex-col justify-between self-stretch py-1">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div className="hidden min-[480px]:flex items-center gap-2 flex-wrap">
                          <Link
                            to="/product/$id"
                            params={{ id: l.id }}
                            className="font-serif text-xl sm:text-2xl hover:text-primary transition-colors"
                          >
                            {l.product.name}
                          </Link>
                          {l.product.soldOut && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">
                              Sold Out
                            </span>
                          )}
                          {l.product.isUpcoming && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                              Upcoming Preview
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => remove(l.id, l.size)}
                          aria-label="Remove item"
                          className="p-1.5 -mr-1.5 hover:text-destructive min-h-[40px] min-w-[40px] flex items-center justify-center ml-auto"
                        >
                          <X className="size-4 sm:size-5" />
                        </button>
                      </div>
                      <div className="hidden min-[480px]:block mt-2 text-lg font-medium">{gbp(l.product.price)}</div>
                    </div>
                    <div className="flex justify-between items-center mt-3 sm:mt-4 pt-2 border-t min-[480px]:border-t-0 border-border/40">
                      <div className="flex items-center border border-input rounded-sm bg-background">
                        <button
                          onClick={() => updateQty(l.id, l.size, l.qty - 1)}
                          aria-label="Decrease quantity"
                          className="px-3 py-1.5 hover:bg-muted min-h-[36px] min-w-[36px] flex items-center justify-center font-medium"
                        >
                          -
                        </button>
                        <span className="px-3 py-1.5 text-xs sm:text-sm font-semibold">{l.qty}</span>
                        <button
                          onClick={() => updateQty(l.id, l.size, l.qty + 1)}
                          aria-label="Increase quantity"
                          className="px-3 py-1.5 hover:bg-muted min-h-[36px] min-w-[36px] flex items-center justify-center font-medium"
                        >
                          +
                        </button>
                      </div>
                      <div className="font-semibold text-sm sm:text-lg">
                        Total: {gbp(l.product.price * l.qty)}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-secondary/50 p-5 sm:p-8 self-start border rounded-sm">
            <h3 className="font-serif text-xl sm:text-2xl mb-4 sm:mb-6">Order Summary</h3>
            <div className="text-xs sm:text-sm mb-4 text-muted-foreground">
              Selected Items: {checkoutLines.length}
            </div>
            <div className="flex justify-between mb-4">
              <span>Subtotal</span>
              <span>{gbp(checkoutTotal)}</span>
            </div>
            <div className="flex justify-between mb-6 pb-6 border-b">
              <span>Shipping</span>
              <span>Confirmed with our team</span>
            </div>
            <div className="flex justify-between font-serif text-2xl mb-8">
              <span>Total</span>
              <span>{gbp(checkoutTotal)}</span>
            </div>
            <Link
              to="/checkout"
              className={`w-full inline-flex items-center justify-center gap-2 py-4 bg-foreground text-background uppercase tracking-widest text-xs font-semibold ${checkoutLines.length === 0 ? "opacity-50 pointer-events-none" : "hover:bg-foreground/90 transition-colors"}`}
            >
              Send Order Enquiry
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
                <div key={p.id}>
                  <ProductCard p={p} disableReveal />
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
