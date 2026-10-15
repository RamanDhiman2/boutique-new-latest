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
          <span className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 bg-[#1A1A1A]/90 text-white px-2 sm:px-2.5 py-0.5 sm:py-1 text-[0.52rem] sm:text-[0.55rem] tracking-[0.2em] uppercase font-semibold border border-white/20 shadow-xs">
            Sold Out
          </span>
        ) : p.isUpcoming ? (
          <span className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 bg-primary/95 text-primary-foreground px-2 sm:px-2.5 py-0.5 sm:py-1 text-[0.52rem] sm:text-[0.55rem] tracking-[0.2em] uppercase font-semibold border border-white/20 shadow-xs flex items-center gap-1">
            <Sparkles className="size-2.5" /> Coming Soon
          </span>
        ) : p.customisable ? (
          <span className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 bg-background/90 px-1.5 sm:px-2 py-0.5 sm:py-1 eyebrow !text-[0.52rem] sm:!text-[0.55rem] !tracking-[0.2em]">
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
          className="absolute top-2.5 sm:top-3 right-2.5 sm:right-3 size-10 min-w-[40px] min-h-[40px] grid place-items-center rounded-full bg-background/90 hover:bg-background transition-colors shadow-xs"
        >
          <Heart className={`size-4 ${wished ? "fill-primary text-primary" : ""}`} />
        </button>
        <div className="absolute inset-x-2.5 sm:inset-x-3 bottom-2.5 sm:bottom-3 grid grid-cols-2 gap-1.5 sm:gap-2 translate-y-3 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <Link
            to="/product/$id"
            params={{ id: p.id }}
            className="bg-background/95 py-2 sm:py-2.5 text-center eyebrow !text-[0.55rem] sm:!text-[0.58rem] hover:bg-background transition-colors"
          >
            Quick view
          </Link>
          {p.soldOut ? (
            <span className="bg-muted text-muted-foreground py-2 sm:py-2.5 text-center eyebrow !text-[0.55rem] sm:!text-[0.58rem] cursor-not-allowed select-none">
              Sold Out
            </span>
          ) : p.isUpcoming ? (
            <Link
              to="/product/$id"
              params={{ id: p.id }}
              className="bg-primary text-primary-foreground py-2 sm:py-2.5 text-center eyebrow !text-[0.55rem] sm:!text-[0.58rem] hover:bg-primary/90 transition-colors"
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
              className="bg-primary text-primary-foreground py-2 sm:py-2.5 eyebrow !text-[0.55rem] sm:!text-[0.58rem] hover:bg-primary/90 transition-colors"
            >
              Add to bag
            </button>
          )}
        </div>
      </div>
      <div className="pt-3 sm:pt-4 flex justify-between items-start gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <Link
            to="/product/$id"
            params={{ id: p.id }}
            className="font-serif text-base sm:text-lg lg:text-xl leading-snug hover:text-primary transition-colors block line-clamp-2"
          >
            {p.name}
          </Link>
        </div>
        <div className="text-xs sm:text-sm text-right shrink-0">
          <div className="font-medium">{gbp(p.price)}</div>
          {p.soldOut ? (
            <div className="text-[9px] sm:text-[10px] text-destructive uppercase tracking-wider font-semibold">
              Sold Out
            </div>
          ) : p.isUpcoming ? (
            <div className="text-[9px] sm:text-[10px] text-primary uppercase tracking-wider font-semibold">
              Upcoming
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
