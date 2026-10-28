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
import { useCategoriesQuery } from "@/lib/catalogService";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useSiteSettings } from "@/lib/siteSettings";

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
  const siteSettings = useSiteSettings();
  const { count, wishlist } = useCart();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: navCategories = categories } = useCategoriesQuery();

  // Close drawer on resize to desktop (>= 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className="bg-primary text-primary-foreground text-center py-1.5 sm:py-2 px-3 eyebrow !text-[0.58rem] sm:!text-[0.62rem] truncate sm:whitespace-normal">
        {siteSettings.announcementText}
      </div>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-10 h-16 sm:h-20 lg:h-24 flex items-center justify-between gap-2 sm:gap-4">
          <button 
            className="lg:hidden p-2 -ml-2 rounded-md hover:bg-muted/80 transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]" 
            onClick={() => setOpen(true)} 
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <Link to="/" className="flex items-center shrink-0">
            <img
              src="/Maroon and Gold Monogram Fashion Logo.png"
              alt="SohniMutiyaar By CC"
              className="h-10 sm:h-14 lg:h-20 w-auto max-w-[150px] sm:max-w-[210px] lg:max-w-none object-contain transition-all"
            />
          </Link>

          <nav className="hidden lg:flex items-center justify-center gap-7 eyebrow !text-[0.66rem] flex-1">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-primary" }}
            >
              Home
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 hover:text-primary transition-colors focus:outline-none">
                CATEGORIES <ChevronDown className="size-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-52 bg-background p-1.5 shadow-lg">
                <DropdownMenuItem asChild className="border-b border-border/60 pb-2 mb-1">
                  <Link
                    to="/collections"
                    className="w-full cursor-pointer uppercase text-xs font-bold tracking-wider text-primary flex items-center justify-between"
                  >
                    <span>All Collections</span>
                    <span>→</span>
                  </Link>
                </DropdownMenuItem>
                {navCategories.map((c) => (
                  <DropdownMenuItem key={c.slug} asChild>
                    <Link
                      to="/collections/$slug"
                      params={{ slug: c.slug }}
                      className="w-full cursor-pointer uppercase text-xs tracking-wider"
                    >
                      {c.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/shop" activeProps={{ className: "text-primary" }}>
              Shop All
            </Link>
            <Link to="/custom-designs" activeProps={{ className: "text-primary" }}>
              Custom Designs
            </Link>
            <Link to="/measurements" activeProps={{ className: "text-primary" }}>
              Measurements
            </Link>
            <Link to="/about" activeProps={{ className: "text-primary" }}>
              About
            </Link>
            <Link to="/contact" activeProps={{ className: "text-primary" }}>
              Contact
            </Link>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link 
              to="/shop" 
              aria-label="Search" 
              className="hidden sm:flex size-10 items-center justify-center rounded-full hover:bg-muted/80 transition-colors"
            >
              <Search className="size-[18px]" />
            </Link>
            <Link
              to={user ? "/profile" : "/login"}
              aria-label="Account"
              className="hidden sm:flex size-10 items-center justify-center rounded-full hover:bg-muted/80 transition-colors"
            >
              <User className="size-[18px]" />
            </Link>
            <Link 
              to="/bag" 
              aria-label="Wishlist" 
              className="relative size-10 flex items-center justify-center rounded-full hover:bg-muted/80 transition-colors"
            >
              <Heart className="size-[18px]" />
              {wishlist.length > 0 && <Dot n={wishlist.length} />}
            </Link>
            <Link 
              to="/bag" 
              aria-label="Shopping bag" 
              className="relative size-10 flex items-center justify-center rounded-full hover:bg-muted/80 transition-colors"
            >
              <ShoppingBag className="size-[18px]" />
              {count > 0 && <Dot n={count} />}
            </Link>
          </div>
        </div>
      </header>
      {open && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setOpen(false)}
        >
          <div 
            className="fixed inset-y-0 left-0 w-full max-w-sm bg-background shadow-2xl flex flex-col overflow-y-auto animate-rise"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border/60">
              <Link to="/" onClick={() => setOpen(false)} className="flex items-center">
                <img
                  src="/Maroon and Gold Monogram Fashion Logo.png"
                  alt="SohniMutiyaar By CC"
                  className="h-10 w-auto object-contain"
                />
              </Link>
              <button 
                onClick={() => setOpen(false)} 
                aria-label="Close menu"
                className="size-11 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
            
            <nav className="flex-1 flex flex-col gap-4 px-6 py-6 font-serif text-2xl">
              <Link to="/" onClick={() => setOpen(false)} className="hover:text-primary transition-colors py-1">
                Home
              </Link>
              
              <div className="pt-2 pb-1 border-t border-border/40">
                <div className="eyebrow text-primary text-[0.68rem] tracking-widest mb-3">
                  Collections
                </div>
                <Link 
                  to="/collections" 
                  onClick={() => setOpen(false)} 
                  className="block text-primary text-lg italic hover:underline mb-3"
                >
                  All Collections →
                </Link>
                <div className="flex flex-col gap-3 pl-3 text-xl text-foreground/80">
                  {navCategories.map((c) => (
                    <Link 
                      key={c.slug} 
                      to="/collections/$slug" 
                      params={{ slug: c.slug }}
                      onClick={() => setOpen(false)}
                      className="hover:text-primary transition-colors py-0.5"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-3 border-t border-border/40">
                <Link to="/shop" onClick={() => setOpen(false)} className="hover:text-primary transition-colors py-1">
                  Shop All
                </Link>
                <Link to="/custom-designs" onClick={() => setOpen(false)} className="hover:text-primary transition-colors py-1">
                  Custom Designs
                </Link>
                <Link to="/measurements" onClick={() => setOpen(false)} className="hover:text-primary transition-colors py-1">
                  Measurements
                </Link>
                <Link to="/about" onClick={() => setOpen(false)} className="hover:text-primary transition-colors py-1">
                  About Us
                </Link>
                <Link to="/contact" onClick={() => setOpen(false)} className="hover:text-primary transition-colors py-1">
                  Contact
                </Link>
              </div>

              <div className="mt-auto pt-6 border-t border-border/60 flex flex-col gap-3 font-sans text-sm">
                <Link 
                  to={user ? "/profile" : "/login"} 
                  onClick={() => setOpen(false)} 
                  className="flex items-center gap-3 py-2 text-foreground/90 font-medium"
                >
                  <User className="size-4 text-primary" />
                  <span>{user ? "My Account" : "Sign In / Register"}</span>
                </Link>
                <Link 
                  to="/bag" 
                  onClick={() => setOpen(false)} 
                  className="flex items-center gap-3 py-2 text-foreground/90 font-medium"
                >
                  <ShoppingBag className="size-4 text-primary" />
                  <span>Shopping Bag ({count})</span>
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

const Dot = ({ n }: { n: number }) => (
  <span className="absolute -top-1 -right-1 size-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold grid place-items-center shadow-xs">
    {n}
  </span>
);

export function Footer() {
  const siteSettings = useSiteSettings();
  return (
    <footer className="bg-ink text-ink-foreground mt-16 sm:mt-20 lg:mt-24">
      <div className="mx-auto max-w-[1500px] px-5 sm:px-6 lg:px-10 py-12 sm:py-16 lg:py-20 grid gap-8 sm:gap-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2 lg:col-span-1">
          <Link to="/" className="inline-block bg-background p-2.5 sm:p-3 rounded-lg shadow-md mb-2">
            <img
              src="/Maroon and Gold Monogram Fashion Logo.png"
              alt="SohniMutiyaar By CC"
              className="h-14 sm:h-16 lg:h-20 w-auto object-contain"
            />
          </Link>
          <p className="mt-4 text-sm opacity-70 max-w-sm">Where Tradition Meets Modern Elegance.</p>
        </div>
        <Col title="Shop">
          {categories.map((c) => (
            <Link key={c.slug} to="/collections/$slug" params={{ slug: c.slug }} className="hover:text-gold transition-colors py-0.5">
              {c.name}
            </Link>
          ))}
        </Col>
        <Col title="Policies">
          <Link to="/privacy-policy" className="hover:text-gold transition-colors py-0.5">Privacy Policy</Link>
          <Link to="/terms-of-service" className="hover:text-gold transition-colors py-0.5">Terms of Service</Link>
          <Link to="/refund-policy" className="hover:text-gold transition-colors py-0.5">Refund Policy</Link>
        </Col>
        <Col title="Customer Care">
          <Link to="/contact" className="hover:text-gold transition-colors py-0.5">Contact Us</Link>
          <Link to="/shipping" className="hover:text-gold transition-colors py-0.5">Worldwide Shipping</Link>
          <Link to="/measurements" className="hover:text-gold transition-colors py-0.5">Measurements Guide</Link>
        </Col>
        <Col title="Connect">
          <Link to="/about" className="hover:text-gold transition-colors py-0.5">Our Story</Link>
          <a
            href={siteSettings.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-gold transition-colors py-0.5"
          >
            Instagram
          </a>
          <a
            href={siteSettings.tiktokUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-gold transition-colors py-0.5"
          >
            TikTok
          </a>
        </Col>
      </div>
      <div
        className="border-t border-ink-foreground/10 py-6 text-center eyebrow !text-[0.6rem] opacity-60 px-4"
        suppressHydrationWarning
      >
        © {new Date().getFullYear()} SohniMutiyaar By CC · Charminng Chic
      </div>
    </footer>
  );
}

function Col({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow text-gold mb-4 sm:mb-5">{title}</div>
      <div className="flex flex-col gap-2.5 text-sm opacity-80">{children}</div>
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
    <section className="mx-auto max-w-3xl px-4 sm:px-6 pt-10 sm:pt-16 lg:pt-20 pb-8 sm:pb-12 lg:pb-14 text-center animate-rise">
      <div className="eyebrow text-primary text-[0.65rem] sm:text-[0.7rem]">{eyebrow}</div>
      <h1 className="mt-3 sm:mt-4 text-3xl sm:text-4xl md:text-5xl lg:text-6xl break-words leading-tight">{title}</h1>
      {text && <p className="mt-4 sm:mt-6 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">{text}</p>}
    </section>
  );
}
