import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Menu, Search, ShoppingBag, User, X, MessageCircle } from "lucide-react";
import { categories, waLink } from "@/lib/catalog";
import { useCart } from "@/lib/cart";

export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal:not(.in)");
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
}

export function Header() {
  const { count, wishlist } = useCart();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="bg-primary text-primary-foreground text-center py-2 eyebrow !text-[0.62rem]">
        UK Based • Worldwide Shipping • Custom Designs Available
      </div>
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b">
        <div className="mx-auto max-w-[1500px] px-5 lg:px-10 h-20 flex items-center justify-between gap-4">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="size-5" /></button>
          <Link to="/" className="text-center leading-none">
            <div className="font-serif text-2xl lg:text-[1.7rem] tracking-wide">SohniMutiyaar <span className="italic text-primary">By CC</span></div>
            <div className="eyebrow !text-[0.55rem] text-muted-foreground mt-1">Charming Chic</div>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/shop" aria-label="Search" className="hidden sm:block"><Search className="size-[18px]" /></Link>
            <Link to="/contact" aria-label="Account" className="hidden sm:block"><User className="size-[18px]" /></Link>
            <Link to="/bag" aria-label="Wishlist" className="relative"><Heart className="size-[18px]" />{wishlist.length > 0 && <Dot n={wishlist.length} />}</Link>
            <Link to="/bag" aria-label="Shopping bag" className="relative"><ShoppingBag className="size-[18px]" />{count > 0 && <Dot n={count} />}</Link>
            <Link to="/custom-designs" className="hidden xl:inline-flex btn-primary !py-3 !px-5">Custom Design</Link>
          </div>
        </div>
        <nav className="hidden lg:flex justify-center gap-7 pb-4 eyebrow !text-[0.66rem]">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "text-primary" }}>Home</Link>
          {categories.map((c) => (
            <Link key={c.slug} to="/collections/$slug" params={{ slug: c.slug }} activeProps={{ className: "text-primary" }} className="hover:text-primary transition-colors">{c.name}</Link>
          ))}
          <Link to="/custom-designs" activeProps={{ className: "text-primary" }}>Custom Designs</Link>
          <Link to="/about" activeProps={{ className: "text-primary" }}>About</Link>
          <Link to="/contact" activeProps={{ className: "text-primary" }}>Contact</Link>
        </nav>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 bg-background animate-rise overflow-y-auto">
          <div className="flex justify-end p-5"><button onClick={() => setOpen(false)} aria-label="Close menu"><X /></button></div>
          <nav className="flex flex-col gap-5 px-8 pb-10 font-serif text-3xl" onClick={() => setOpen(false)}>
            <Link to="/">Home</Link>
            {categories.map((c) => <Link key={c.slug} to="/collections/$slug" params={{ slug: c.slug }}>{c.name}</Link>)}
            <Link to="/custom-designs" className="italic text-primary">Custom Designs</Link>
            <Link to="/measurements">Measurements</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </nav>
        </div>
      )}
    </>
  );
}

const Dot = ({ n }: { n: number }) => (
  <span className="absolute -top-2 -right-2 size-4 rounded-full bg-primary text-primary-foreground text-[9px] grid place-items-center">{n}</span>
);

export function WhatsAppFab() {
  return (
    <a href={waLink()} target="_blank" rel="noreferrer" className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-whatsapp text-primary-foreground pl-4 pr-5 py-3 shadow-lg eyebrow !text-[0.62rem] hover:scale-105 transition-transform">
      <MessageCircle className="size-5" /> Chat with us
    </a>
  );
}

export function Footer() {
  return (
    <footer className="bg-ink text-ink-foreground mt-24">
      <div className="mx-auto max-w-[1500px] px-5 lg:px-10 py-20 grid gap-12 md:grid-cols-5">
        <div className="md:col-span-1">
          <div className="font-serif text-3xl">SohniMutiyaar <span className="italic text-gold">By CC</span></div>
          <p className="mt-4 text-sm opacity-70">Where Tradition Meets Modern Elegance. UK based, shipping worldwide.</p>
        </div>
        <Col title="Shop">{categories.map((c) => <Link key={c.slug} to="/collections/$slug" params={{ slug: c.slug }}>{c.name}</Link>)}</Col>
        <Col title="Custom">
          <Link to="/custom-designs">Custom Designs</Link>
          <Link to="/measurements">Measurement Form</Link>
          <a href={waLink()} target="_blank" rel="noreferrer">Order via WhatsApp</a>
        </Col>
        <Col title="Customer Care">
          <Link to="/contact">Contact Us</Link>
          <Link to="/shipping">Worldwide Shipping</Link>
          <Link to="/shipping">Returns & Exchanges</Link>
        </Col>
        <Col title="About">
          <Link to="/about">Our Story</Link>
          <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
          <a href="https://tiktok.com" target="_blank" rel="noreferrer">TikTok</a>
        </Col>
      </div>
      <div className="border-t border-ink-foreground/10 py-6 text-center eyebrow !text-[0.6rem] opacity-60">
        © {new Date().getFullYear()} SohniMutiyaar By CC · Charming Chic · United Kingdom
      </div>
    </footer>
  );
}

function Col({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow text-gold mb-5">{title}</div>
      <div className="flex flex-col gap-3 text-sm opacity-80">{children}</div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <section className="mx-auto max-w-3xl px-5 pt-20 pb-14 text-center animate-rise">
      <div className="eyebrow text-primary">{eyebrow}</div>
      <h1 className="mt-4 text-5xl md:text-6xl">{title}</h1>
      {text && <p className="mt-6 text-muted-foreground leading-relaxed">{text}</p>}
    </section>
  );
}
