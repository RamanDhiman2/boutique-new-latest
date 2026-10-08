import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { gbp, type Product } from "@/lib/catalog";
import { useCart } from "@/lib/cart";

export function ProductCard({ p }: { p: Product }) {
  const { toggleWish, wishlist, add } = useCart();
  const wished = wishlist.includes(p.id);
  return (
    <div className="group reveal">
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        <Link to="/product/$id" params={{ id: p.id }}>
          <img src={p.images[0]} alt={p.name} loading="lazy" className="absolute inset-0 size-full object-cover transition-all duration-[1.2s] group-hover:scale-105 group-hover:opacity-0" />
          <img src={p.images[1] ?? p.images[0]} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-0 transition-all duration-[1.2s] group-hover:opacity-100 scale-105 group-hover:scale-100" />
        </Link>
        {p.customisable && <span className="absolute top-3 left-3 bg-background/90 px-2 py-1 eyebrow !text-[0.55rem] !tracking-[0.2em]">Customisable</span>}
        <button onClick={() => toggleWish(p.id)} aria-label="Wishlist" className="absolute top-3 right-3 size-9 grid place-items-center rounded-full bg-background/90">
          <Heart className={`size-4 ${wished ? "fill-primary text-primary" : ""}`} />
        </button>
        <div className="absolute inset-x-3 bottom-3 grid grid-cols-2 gap-2 translate-y-3 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <Link to="/product/$id" params={{ id: p.id }} className="bg-background/95 py-2.5 text-center eyebrow !text-[0.58rem]">Quick view</Link>
          <button onClick={() => { add(p.id, p.sizes[0]); toast.success(`${p.name} added to your bag`); }} className="bg-primary text-primary-foreground py-2.5 eyebrow !text-[0.58rem]">Add to bag</button>
        </div>
      </div>
      <div className="pt-4 flex justify-between gap-3">
        <div>
          <Link to="/product/$id" params={{ id: p.id }} className="font-serif text-xl leading-tight">{p.name}</Link>
          <div className="text-xs text-muted-foreground mt-1">{p.colour} · {p.sizes.join(" ")}</div>
        </div>
        <div className="text-sm">{gbp(p.price)}</div>
      </div>
    </div>
  );
}
