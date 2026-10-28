import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { products, type Product } from "./catalog";

type Line = { id: string; size: string; qty: number; selected?: boolean };
type Ctx = {
  lines: (Line & { product: Product })[];
  wishlist: string[];
  count: number;
  total: number;
  checkoutLines: (Line & { product: Product })[];
  checkoutTotal: number;
  add: (id: string, size: string) => void;
  updateQty: (id: string, size: string, qty: number) => void;
  remove: (id: string, size: string) => void;
  removeLines: (items: { id: string; size: string }[]) => void;
  toggleSelect: (id: string, size: string) => void;
  selectAll: (select: boolean) => void;
  toggleWish: (id: string) => void;
  clear: () => void;
};

const CartCtx = createContext<Ctx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      setLines(JSON.parse(localStorage.getItem("sm-bag") || "[]"));
      setWishlist(JSON.parse(localStorage.getItem("sm-wish") || "[]"));
    } catch {
      // ignore storage parsing error
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("sm-bag", JSON.stringify(lines));
    localStorage.setItem("sm-wish", JSON.stringify(wishlist));
  }, [lines, wishlist, loaded]);

  const full = lines
    .map((l) => ({
      ...l,
      selected: l.selected ?? true,
      product: products.find((p) => p.id === l.id)!,
    }))
    .filter((l) => l.product);

  const checkoutLines = full.filter(
    (l) => l.selected && !l.product.soldOut && !l.product.isUpcoming,
  );

  // Actions only use state setters, so they are created once and keep stable identities
  // (safe to use as effect dependencies).
  const actions = useMemo(
    () => ({
      add: (id: string, size: string) => {
        const prod = products.find((p) => p.id === id);
        if (prod?.soldOut || prod?.isUpcoming) return;

        setLines((ls) => {
          const f = ls.find((l) => l.id === id && l.size === size);
          return f
            ? ls.map((l) => (l === f ? { ...l, qty: l.qty + 1 } : l))
            : [...ls, { id, size, qty: 1, selected: true }];
        });
      },
      updateQty: (id: string, size: string, qty: number) =>
        setLines((ls) =>
          ls.map((l) => (l.id === id && l.size === size ? { ...l, qty: Math.max(1, qty) } : l)),
        ),
      remove: (id: string, size: string) =>
        setLines((ls) => ls.filter((l) => !(l.id === id && l.size === size))),
      removeLines: (items: { id: string; size: string }[]) =>
        setLines((ls) =>
          ls.filter((l) => !items.some((it) => it.id === l.id && it.size === l.size)),
        ),
      toggleSelect: (id: string, size: string) =>
        setLines((ls) =>
          ls.map((l) =>
            l.id === id && l.size === size ? { ...l, selected: !(l.selected ?? true) } : l,
          ),
        ),
      selectAll: (select: boolean) => setLines((ls) => ls.map((l) => ({ ...l, selected: select }))),
      toggleWish: (id: string) =>
        setWishlist((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id])),
      clear: () => {
        setLines([]);
        setWishlist([]);
      },
    }),
    [],
  );

  const value: Ctx = {
    lines: full,
    wishlist,
    count: full.reduce((a, l) => a + l.qty, 0),
    total: full.reduce((a, l) => a + l.qty * l.product.price, 0),
    checkoutLines,
    checkoutTotal: checkoutLines.reduce((a, l) => a + l.qty * l.product.price, 0),
    ...actions,
  };
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside provider");
  return c;
};
