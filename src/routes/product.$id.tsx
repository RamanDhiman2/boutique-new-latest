import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  Heart,
  Mail,
  Loader2,
  ShieldCheck,
  Scissors,
  Truck,
  Sparkles,
  Check,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { categories, gbp, products as staticProducts, waLink } from "@/lib/catalog";
import { productsQueryOptions, useAllProductsQuery } from "@/lib/catalogService";
import { useCart } from "@/lib/cart";
import { ProductCard } from "@/components/site/ProductCard";
import { useReveal } from "@/components/site/Chrome";
import { SiteBreadcrumb } from "@/components/site/SiteBreadcrumb";
import { WhatsAppIcon } from "@/components/site/WhatsAppButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { sendContactEmail } from "@/lib/email";
import { ProductReviews } from "@/components/site/ProductReviews";

export const Route = createFileRoute("/product/$id")({
  loader: async ({ params, context }) => {
    // Live product list (price, sold out, photos managed in the admin panel)
    const list = await context.queryClient.ensureQueryData(productsQueryOptions);
    const product = list.find((p) => p.id === params.id);
    if (!product) throw notFound();
    return { product };
  },
  // Fresh page state (selected photo, form) when moving between products
  remountDeps: ({ params }) => params,
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `${loaderData.product.name} — SohniMutiyaar By CC` },
            { name: "description", content: loaderData.product.description },
            { property: "og:title", content: loaderData.product.name },
            { property: "og:description", content: loaderData.product.description },
          ],
        }
      : { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] },
  component: ProductPage,
});

function parseProductSpecs(description: string, colour: string, categoryName: string) {
  const lines = description
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const specs: Array<{ label: string; value: string }> = [];

  for (const line of lines) {
    const clean = line.replace(/^[•*–-]\s*/, "");
    if (clean.includes(":") && !clean.toLowerCase().startsWith("product details")) {
      const [label, ...valParts] = clean.split(":");
      const value = valParts.join(":").trim();
      if (label && value) {
        specs.push({ label: label.trim(), value });
      }
    }
  }

  // Ensure core attributes are presented
  if (!specs.some((s) => s.label.toLowerCase().includes("colour"))) {
    specs.unshift({ label: "Colour", value: colour });
  }
  if (
    !specs.some(
      (s) => s.label.toLowerCase().includes("category") || s.label.toLowerCase().includes("style"),
    )
  ) {
    specs.push({ label: "Style / Category", value: categoryName });
  }
  specs.push({ label: "Care Instructions", value: "Dry Clean Only" });
  specs.push({ label: "Tailoring Type", value: "Made to Measure & Custom Sized" });

  return specs;
}

function AccordionItem({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-[#e2d9d0] py-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left group cursor-pointer focus:outline-none"
        aria-expanded={isOpen}
      >
        <span className="text-[0.72rem] tracking-[0.2em] font-medium uppercase text-foreground/90 flex items-center gap-2 group-hover:text-primary transition-colors">
          <span
            className={`text-[0.6rem] transition-transform duration-200 inline-block text-muted-foreground ${isOpen ? "rotate-180" : ""}`}
          >
            ▼
          </span>
          {title}
        </span>
        <ChevronDown
          className={`size-4 text-muted-foreground/80 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="mt-3.5 text-xs text-muted-foreground leading-relaxed pl-4 border-l border-primary/30 animate-in fade-in-50 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

function ProductPage() {
  const { product: p } = Route.useLoaderData();
  const { data: products = staticProducts } = useAllProductsQuery();
  const [activeImage, setActiveImage] = useState(0);
  const { add, toggleWish, wishlist } = useCart();
  const cat = categories.find((c) => c.slug === p.category) || categories[0]!;
  useReveal();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Extract clean story text (before "Product Details:")
  const mainStory = p.description.split(/Product Details:/i)[0]?.trim() || p.description;
  const specifications = parseProductSpecs(p.description, p.colour, cat.name);

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendContactEmail({
        name: name.trim(),
        email: email.trim(),
        subject: `Enquiry for ${p.name} (Colour: ${p.colour})`,
        message: message.trim(),
      });
      toast.success("Enquiry sent! We will get back to you shortly.");
      setModalOpen(false);
      setName("");
      setEmail("");
      setMessage("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send enquiry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 pb-16 sm:pb-20">
      <SiteBreadcrumb
        className="mb-4 sm:mb-6"
        items={[
          { label: "Shop", to: "/shop" },
          { label: cat.name, to: "/collections/$slug", params: { slug: cat.slug } },
          { label: p.name },
        ]}
      />

      <div className="grid lg:grid-cols-[1.2fr_1fr] xl:grid-cols-[1.25fr_1fr] gap-8 lg:gap-14 xl:gap-16">
        {/* Gallery Section */}
        <div className="flex flex-col-reverse lg:flex-row gap-3 sm:gap-4">
          <div className="flex lg:flex-col gap-2 sm:gap-3 overflow-x-auto w-full lg:w-24 shrink-0 pb-1 lg:pb-0 no-scrollbar">
            {p.images.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveImage(i)}
                className={`shrink-0 rounded-xs overflow-hidden border transition-all ${
                  activeImage === i
                    ? "ring-2 ring-primary ring-offset-1 border-primary"
                    : "opacity-75 hover:opacity-100 border-border/60"
                }`}
              >
                <img
                  src={src}
                  alt={`${p.name} view ${i + 1}`}
                  className="w-14 sm:w-16 lg:w-full aspect-[3/4] object-cover object-[center_20%]"
                />
              </button>
            ))}
          </div>
          <div className="flex-1 bg-muted/15 rounded-xs overflow-hidden border border-border/50">
            <img
              src={p.images[activeImage]}
              alt={p.name}
              className="w-full aspect-[3/4] object-cover object-[center_20%] transition-all duration-300"
            />
          </div>
        </div>

        {/* Product Details & Ordering Section */}
        <div className="lg:sticky lg:top-28 self-start animate-rise">
          <div className="flex flex-wrap items-center gap-2">
            {p.soldOut && (
              <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-[#1A1A1A] text-white text-[0.6rem] sm:text-[0.62rem] tracking-wider uppercase font-semibold border border-white/20">
                Sold Out
              </div>
            )}
            {p.isUpcoming && (
              <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-primary/10 text-primary text-[0.6rem] sm:text-[0.62rem] tracking-wider uppercase font-semibold border border-primary/20">
                <Sparkles className="size-3" /> Upcoming Release · Coming Soon
              </div>
            )}
            {p.customisable && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[0.6rem] sm:text-[0.62rem] tracking-wider uppercase font-medium">
                <Sparkles className="size-3" /> Customisation Available
              </div>
            )}
          </div>

          <h1 className="mt-2.5 sm:mt-3 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif text-foreground leading-tight break-words">
            {p.name}
          </h1>

          <div className="mt-2.5 sm:mt-3 flex items-baseline gap-3 flex-wrap">
            <span className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground">
              {gbp(p.price)}
            </span>
            {p.soldOut ? (
              <span className="text-xs font-semibold text-destructive uppercase tracking-wider bg-destructive/10 px-2 py-0.5 rounded">
                Currently Sold Out
              </span>
            ) : p.isUpcoming ? (
              <span className="text-xs font-semibold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded">
                Preview Only · In Artisan Production
              </span>
            ) : (
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Inclusive of all taxes · Made to order
              </span>
            )}
          </div>

          {/* Quick Overview Badges (Amazon/Flipkart Style Trust Badges) */}
          <div className="mt-5 sm:mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 p-2.5 sm:p-3.5 bg-card border border-border/70 rounded-xs text-center">
            <div className="flex flex-col items-center justify-center p-1 sm:p-1.5">
              <Scissors className="size-4 text-primary mb-1" />
              <span className="text-[0.62rem] sm:text-[0.65rem] font-medium text-foreground">
                Made to Measure
              </span>
              <span className="text-[0.55rem] sm:text-[0.58rem] text-muted-foreground">
                Tailored for you
              </span>
            </div>
            <div className="flex flex-col items-center justify-center p-1 sm:p-1.5">
              <Sparkles className="size-4 text-primary mb-1" />
              <span className="text-[0.62rem] sm:text-[0.65rem] font-medium text-foreground">
                Artisan Handwork
              </span>
              <span className="text-[0.55rem] sm:text-[0.58rem] text-muted-foreground">
                Original embroidery
              </span>
            </div>
            <div className="flex flex-col items-center justify-center p-1 sm:p-1.5">
              <Truck className="size-4 text-primary mb-1" />
              <span className="text-[0.62rem] sm:text-[0.65rem] font-medium text-foreground">
                Worldwide Delivery
              </span>
              <span className="text-[0.55rem] sm:text-[0.58rem] text-muted-foreground">
                Direct to your door
              </span>
            </div>
            <div className="flex flex-col items-center justify-center p-1 sm:p-1.5">
              <ShieldCheck className="size-4 text-primary mb-1" />
              <span className="text-[0.62rem] sm:text-[0.65rem] font-medium text-foreground">
                Secure Checkout
              </span>
              <span className="text-[0.55rem] sm:text-[0.58rem] text-muted-foreground">
                Encrypted processing
              </span>
            </div>
          </div>

          {/* Main Description */}
          <div className="mt-6 text-sm text-muted-foreground leading-relaxed">{mainStory}</div>

          {/* Colour Info */}
          <div className="mt-6 pt-5 border-t border-border/60 flex items-center gap-2 text-xs">
            <span className="font-semibold uppercase tracking-wider text-foreground">Colour:</span>
            <span className="text-muted-foreground">{p.colour}</span>
          </div>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex gap-3">
            {p.soldOut ? (
              <button
                disabled
                aria-disabled="true"
                className="flex-1 py-4 text-xs tracking-widest uppercase font-semibold flex items-center justify-center gap-2 bg-muted text-muted-foreground border border-border cursor-not-allowed select-none"
              >
                Sold Out
              </button>
            ) : p.isUpcoming ? (
              <a
                href={waLink(
                  `Hi SohniMutiyaar By CC, I'd like to pre-register/enquire about the upcoming design: ${p.name} (${gbp(p.price)}).`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex-1 py-4 text-xs tracking-widest uppercase font-semibold flex items-center justify-center gap-2"
              >
                <Sparkles className="size-4" /> Pre-Order Enquiry
              </a>
            ) : (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  add(p.id, "Custom");
                  toast.success(`${p.name} added to your bag`);
                }}
                className="btn-primary flex-1 py-4 text-xs tracking-widest uppercase font-semibold flex items-center justify-center gap-2"
              >
                Add to Bag
              </button>
            )}
            <button
              onClick={(e) => {
                e.preventDefault();
                toggleWish(p.id);
              }}
              aria-label="Wishlist"
              className="border border-border/80 px-4 hover:border-foreground transition-colors rounded-xs flex items-center justify-center"
            >
              <Heart
                className={`size-5 ${wishlist.includes(p.id) ? "fill-primary text-primary" : "text-muted-foreground"}`}
              />
            </button>
          </div>

          {p.soldOut && (
            <div className="mt-3 p-3 bg-muted/60 border border-border rounded-xs text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground uppercase tracking-wider mr-1.5">
                Notice:
              </span>
              <span>
                This piece is currently sold out. You can still enquire below on WhatsApp or Email
                for made-to-measure custom recreation.
              </span>
            </div>
          )}

          {p.isUpcoming && (
            <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-xs text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground uppercase tracking-wider mr-1.5">
                Upcoming Preview:
              </span>
              <span>
                This design is part of our upcoming festive/bridal collection in active atelier
                production. Enquire below on WhatsApp or Email for pre-orders and advance size
                reservation.
              </span>
            </div>
          )}

          {/* Enquiry CTAs */}
          <div className="mt-3 flex flex-col sm:flex-row gap-2.5">
            <a
              href={waLink(
                p.soldOut
                  ? `Hi SohniMutiyaar By CC, I saw that ${p.name} (${gbp(p.price)}) is marked as sold out. I would like to enquire if it can be recreated or custom-tailored for me.`
                  : p.isUpcoming
                    ? `Hi SohniMutiyaar By CC, I would like to enquire about pre-ordering the upcoming ${p.name} (${gbp(p.price)}). Colour: ${p.colour}.`
                    : `Hi SohniMutiyaar By CC, I'd like to enquire about ${p.name} (${gbp(p.price)}). Colour: ${p.colour}.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-4 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-semibold tracking-wider uppercase transition-colors rounded-xs shadow-xs"
            >
              <WhatsAppIcon className="size-4 text-white" /> Enquire on WhatsApp
            </a>
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
              <DialogTrigger asChild>
                <button className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-4 bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold tracking-wider uppercase transition-colors rounded-xs cursor-pointer">
                  <Mail className="size-4" /> Email Us
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Enquire About {p.name}</DialogTitle>
                  <DialogDescription>
                    Fill in your details and our tailoring team will get back to you with custom
                    options.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleEmailSubmit} className="space-y-4 mt-4">
                  <div>
                    <label className="text-xs uppercase tracking-wider mb-1 font-medium block">
                      Name *
                    </label>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                      className="field w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider mb-1 font-medium block">
                      Email *
                    </label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="field w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider mb-1 font-medium block">
                      Message *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={loading}
                      placeholder={`I'm interested in ${p.name}...`}
                      className="field w-full resize-y"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full flex justify-center items-center gap-2 py-3"
                  >
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    Send Enquiry
                  </button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Amazon / Flipkart Style Product Specifications Table */}
          <div className="mt-8 border border-border/80 rounded-xs overflow-hidden bg-card/60 shadow-2xs">
            <div className="bg-muted/70 px-4 py-2.5 border-b border-border/70 font-semibold text-xs uppercase tracking-wider text-foreground flex items-center justify-between">
              <span>Product Specifications</span>
              <span className="text-[0.65rem] text-muted-foreground font-normal">
                Authentic Details
              </span>
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-border/60">
                {specifications.map((s, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                    <td className="py-2.5 px-4 font-medium text-muted-foreground w-2/5 border-r border-border/40">
                      {s.label}
                    </td>
                    <td className="py-2.5 px-4 text-foreground font-normal">{s.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expandable Accordion Options (Exactly as requested in Screenshot) */}
          <div className="mt-8 border-b border-[#e2d9d0]">
            <AccordionItem title="SIZING & MEASUREMENTS" defaultOpen={true}>
              <p>
                Whether you select a standard size or provide custom measurements, your details are
                sent directly to our master tailors to ensure a perfect fit. Sizing can also be
                finalized through your Enquiry.
              </p>
              <div className="mt-2.5">
                <Link
                  to="/measurements"
                  className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  → Fill out our Measurement Form
                </Link>
              </div>
            </AccordionItem>

            <AccordionItem title="MATERIALS">
              <p>
                Each piece is finished by hand by skilled artisans. Slight variations are part of
                its handmade beauty.
              </p>
            </AccordionItem>

            <AccordionItem title="CUSTOMISATION">
              <p>
                Colours, sleeve length, neckline and fit can be adjusted. Contact us via email to
                discuss.
              </p>
            </AccordionItem>

            <AccordionItem title="SHIPPING">
              <p>Delivery times are confirmed at order.</p>
            </AccordionItem>
          </div>
        </div>
      </div>

      {/* Customer Reviews & Ratings Section */}
      <ProductReviews productId={p.id} productName={p.name} />

      {/* You May Also Love Carousel / Grid */}
      <h2 className="text-3xl md:text-4xl font-serif mt-24 mb-8">You may also love</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-12">
        {[...products.filter((x) => x.category === p.category), ...products]
          .filter((x, i, a) => x.id !== p.id && a.indexOf(x) === i)
          .slice(0, 4)
          .map((x) => (
            <ProductCard key={x.id} p={x} />
          ))}
      </div>
    </div>
  );
}
