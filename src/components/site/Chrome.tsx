import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Menu, Search, ShoppingBag, User, X, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { categories } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";

export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal:not(.in)");
    const io = new IntersectionObserver(
      (es) =>
        es.forEach(
          (e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target)),
        ),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export function Header() {
  const { count, wishlist } = useCart();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="bg-primary text-primary-foreground text-center py-2 eyebrow !text-[0.62rem]">
        Custom Designs Available • Made to Measure Elegance
      </div>
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b">
        <div className="mx-auto max-w-[1500px] px-5 lg:px-10 h-24 flex items-center justify-between gap-4">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <Link to="/" className="flex items-center">
            <img
              src="/Maroon and Gold Monogram Fashion Logo.png"
              alt="SohniMutiyaar By CC"
              className="h-20 w-auto object-contain"
            />
          </Link>

          <nav className="hidden lg:flex items-center justify-center gap-7 eyebrow !text-[0.66rem] flex-1">
            <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "text-primary" }}>
              Home
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 hover:text-primary transition-colors focus:outline-none">
                CATEGORIES <ChevronDown className="size-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48 bg-background">
                {categories.map((c) => (
                  <DropdownMenuItem key={c.slug} asChild>
                    <Link to="/collections/$slug" params={{ slug: c.slug }} className="w-full cursor-pointer uppercase text-xs tracking-wider">
                      {c.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/shop" activeProps={{ className: "text-primary" }}>
              Shop All
            </Link>
            <Link to="/about" activeProps={{ className: "text-primary" }}>
              About
            </Link>
            <Link to="/contact" activeProps={{ className: "text-primary" }}>
              Contact
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/shop" aria-label="Search" className="hidden sm:block">
              <Search className="size-[18px]" />
            </Link>
            <Link
              to={user ? "/profile" : "/login"}
              aria-label="Account"
              className="hidden sm:block"
            >
              <User className="size-[18px]" />
            </Link>
            <Link to="/bag" aria-label="Wishlist" className="relative">
              <Heart className="size-[18px]" />
              {wishlist.length > 0 && <Dot n={wishlist.length} />}
            </Link>
            <Link to="/bag" aria-label="Shopping bag" className="relative">
              <ShoppingBag className="size-[18px]" />
              {count > 0 && <Dot n={count} />}
            </Link>
          </div>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 bg-background animate-rise overflow-y-auto">
          <div className="flex justify-end p-5">
            <button onClick={() => setOpen(false)} aria-label="Close menu">
              <X />
            </button>
          </div>
          <nav
            className="flex flex-col gap-5 px-8 pb-10 font-serif text-3xl"
            onClick={() => setOpen(false)}
          >
            <Link to="/">Home</Link>
            <div className="text-primary text-xl italic mt-2">Categories</div>
            <div className="flex flex-col gap-4 pl-4 text-2xl">
              {categories.map((c) => (
                <Link key={c.slug} to="/collections/$slug" params={{ slug: c.slug }}>
                  {c.name}
                </Link>
              ))}
            </div>
            <Link to="/shop">Shop All</Link>
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
  <span className="absolute -top-2 -right-2 size-4 rounded-full bg-primary text-primary-foreground text-[9px] grid place-items-center">
    {n}
  </span>
);

export function Footer() {
  return (
    <footer className="bg-ink text-ink-foreground mt-24">
      <div className="mx-auto max-w-[1500px] px-5 lg:px-10 py-20 grid gap-12 md:grid-cols-5">
        <div className="md:col-span-1">
          <Link to="/" className="inline-block bg-background p-3 rounded-lg shadow-md mb-2">
            <img
              src="/Maroon and Gold Monogram Fashion Logo.png"
              alt="SohniMutiyaar By CC"
              className="h-20 w-auto object-contain"
            />
          </Link>
          <p className="mt-4 text-sm opacity-70">Where Tradition Meets Modern Elegance.</p>
        </div>
        <Col title="Shop">
          {categories.map((c) => (
            <Link key={c.slug} to="/collections/$slug" params={{ slug: c.slug }}>
              {c.name}
            </Link>
          ))}
        </Col>
        <Col title="Policies">
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms-of-service">Terms of Service</Link>
          <Link to="/refund-policy">Refund Policy</Link>
        </Col>
        <Col title="Customer Care">
          <Link to="/contact">Contact Us</Link>
          <Link to="/shipping">Worldwide Shipping</Link>
          <Link to="/shipping">Returns & Exchanges</Link>
        </Col>
        <Col title="About">
          <Link to="/about">Our Story</Link>
          <a href="https://www.instagram.com/sohnimutiyaarofficial_?xtok=MWRxbTBram5uZG9udg==" target="_blank" rel="noreferrer">
            Instagram
          </a>
          <a href="https://www.tiktok.com/@sohnimutiyaarofficial_?_r=1&_t=ZN-9ANTri79OHm" target="_blank" rel="noreferrer">
            TikTok
          </a>
        </Col>
      </div>
      <div
        className="border-t border-ink-foreground/10 py-6 text-center eyebrow !text-[0.6rem] opacity-60"
        suppressHydrationWarning
      >
        © {new Date().getFullYear()} SohniMutiyaar By CC · Charming Chic
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

export function PageHeader({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text?: string;
}) {
  return (
    <section className="mx-auto max-w-3xl px-5 pt-20 pb-14 text-center animate-rise">
      <div className="eyebrow text-primary">{eyebrow}</div>
      <h1 className="mt-4 text-5xl md:text-6xl">{title}</h1>
      {text && <p className="mt-6 text-muted-foreground leading-relaxed">{text}</p>}
    </section>
  );
}
