import { Link } from "@tanstack/react-router";
import { Heart, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { gbp, type Product } from "@/lib/catalog";
import { useCart } from "@/lib/cart";

export function ProductCard({ p, disableReveal }: { p: Product; disableReveal?: boolean }) {
  const { toggleWish, wishlist, add } = useCart();
  const wished = wishlist.includes(p.id);
  return (
    <div className={`group ${disableReveal ? "" : "reveal"}`}>
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        <Link to="/product/$id" params={{ id: p.id }}>
          <img
            src={p.images[0]}
            alt={p.name}
            loading="lazy"
            className="absolute inset-0 size-full object-cover object-[center_20%] transition-all duration-[1.2s] group-hover:scale-105 group-hover:opacity-0"
          />
          <img
            src={p.images[1] ?? p.images[0]}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover object-[center_20%] opacity-0 transition-all duration-[1.2s] group-hover:opacity-100 scale-105 group-hover:scale-100"
          />
        </Link>
        {p.soldOut ? (
          <span className="absolute top-3 left-3 bg-[#1A1A1A]/90 text-white px-2.5 py-1 text-[0.55rem] tracking-[0.2em] uppercase font-semibold border border-white/20 shadow-xs">
            Sold Out
          </span>
        ) : p.isUpcoming ? (
          <span className="absolute top-3 left-3 bg-primary/95 text-primary-foreground px-2.5 py-1 text-[0.55rem] tracking-[0.2em] uppercase font-semibold border border-white/20 shadow-xs flex items-center gap-1">
            <Sparkles className="size-2.5" /> Coming Soon
          </span>
        ) : p.customisable ? (
          <span className="absolute top-3 left-3 bg-background/90 px-2 py-1 eyebrow !text-[0.55rem] !tracking-[0.2em]">
            Customisable
          </span>
        ) : null}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWish(p.id);
          }}
          aria-label="Wishlist"
          className="absolute top-3 right-3 size-9 grid place-items-center rounded-full bg-background/90"
        >
          <Heart className={`size-4 ${wished ? "fill-primary text-primary" : ""}`} />
        </button>
        <div className="absolute inset-x-3 bottom-3 grid grid-cols-2 gap-2 translate-y-3 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <Link
            to="/product/$id"
            params={{ id: p.id }}
            className="bg-background/95 py-2.5 text-center eyebrow !text-[0.58rem]"
          >
            Quick view
          </Link>
          {p.soldOut ? (
            <span className="bg-muted text-muted-foreground py-2.5 text-center eyebrow !text-[0.58rem] cursor-not-allowed select-none">
              Sold Out
            </span>
          ) : p.isUpcoming ? (
            <Link
              to="/product/$id"
              params={{ id: p.id }}
              className="bg-primary text-primary-foreground py-2.5 text-center eyebrow !text-[0.58rem]"
            >
              Preview
            </Link>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                add(p.id, p.sizes[0] ?? "Custom");
                toast.success(`${p.name} added to your bag`);
              }}
              className="bg-primary text-primary-foreground py-2.5 eyebrow !text-[0.58rem]"
            >
              Add to bag
            </button>
          )}
        </div>
      </div>
      <div className="pt-4 flex justify-between gap-3">
        <div>
          <Link
            to="/product/$id"
            params={{ id: p.id }}
            className="font-serif text-xl leading-tight"
          >
            {p.name}
          </Link>
        </div>
        <div className="text-sm text-right">
          <div>{gbp(p.price)}</div>
          {p.soldOut ? (
            <div className="text-[10px] text-destructive uppercase tracking-wider font-semibold">
              Sold Out
            </div>
          ) : p.isUpcoming ? (
            <div className="text-[10px] text-primary uppercase tracking-wider font-semibold">
              Upcoming
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
