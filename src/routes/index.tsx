import { createFileRoute, Link } from "@tanstack/react-router";
import { Globe, Instagram, Loader2, Mail, Ruler, Scissors, Sparkles, Star } from "lucide-react";
import { useState } from "react";
import { categories, heroImage, productsIn, products } from "@/lib/catalog";
import { ProductCard } from "@/components/site/ProductCard";
import { useReveal } from "@/components/site/Chrome";
import { sendNewsletterSubscription, isEmailJSConfigured } from "@/lib/email";
import { toast } from "sonner";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  product1Images,
  product2Images,
  product4Images,
  product6Images,
  product7Images,
  product13Images,
} from "@/lib/productImages";

const INSTAGRAM_URL = "https://www.instagram.com/sohnimutiyaarofficial_?xtok=MWRxbTBram5uZG9udg==";
const TIKTOK_URL = "https://www.tiktok.com/@sohnimutiyaarofficial_?_r=1&_t=ZN-9ANTri79OHm";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
  </svg>
);

const socialFeedPosts = [
  {
    image: product1Images[1],
    title: "Zardozi Bridal Velvet Lehanga",
    platform: "instagram" as const,
    url: INSTAGRAM_URL,
    altUrl: TIKTOK_URL,
  },
  {
    image: product2Images[0],
    title: "Raw Silk Heavy Bridal Suit",
    platform: "tiktok" as const,
    url: TIKTOK_URL,
    altUrl: INSTAGRAM_URL,
  },
  {
    image: product4Images[0],
    title: "Silk Chanderi Navy Blue Suit",
    platform: "instagram" as const,
    url: INSTAGRAM_URL,
    altUrl: TIKTOK_URL,
  },
  {
    image: product6Images[0],
    title: "Olive Green Raw Silk Zardozi Suit",
    platform: "tiktok" as const,
    url: TIKTOK_URL,
    altUrl: INSTAGRAM_URL,
  },
  {
    image: product7Images[0],
    title: "Velvet Peacock Blue Kurti & Palazzo",
    platform: "instagram" as const,
    url: INSTAGRAM_URL,
    altUrl: TIKTOK_URL,
  },
  {
    image: product13Images[0],
    title: "Royal Ivory & Gold Raw Silk Suit",
    platform: "tiktok" as const,
    url: TIKTOK_URL,
    altUrl: INSTAGRAM_URL,
  },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SohniMutiyaar By CC — Tradition, Tailored Your Way" },
      {
        name: "description",
        content:
          "Indian bridal, occasion & daily wear with thread, mirror, Aari and hand work. Custom designs, made to measure.",
      },
      { property: "og:title", content: "SohniMutiyaar By CC — Tradition, Tailored Your Way" },
      {
        property: "og:description",
        content: "Indian craftsmanship, modern elegance, made for you.",
      },
    ],
  }),
  component: Home,
});

const journey = [
  ["Choose Your Style", "Browse our collections or share your inspiration."],
  ["Choose Your Details", "Choose fabric, colour, embroidery and finishing details."],
  ["Share Your Measurements", "Use our simple online measurement form."],
  ["Discuss Your Design", "We talk it through with you via email or consultation."],
  ["Confirm Your Order", "Approve the final design and pricing."],
  ["We Create Your Outfit", "Crafted with care by our artisans."],
  ["Worldwide Delivery", "Delivered to your door, wherever you are."],
];

const reviews = [
  [
    "Priya, London",
    "My bridal suit was beyond anything I imagined. The handwork is breathtaking and the fit was perfect.",
  ],
  [
    "Harleen, Toronto",
    "Ordered from Canada — so personal, so easy, and it arrived beautifully packed.",
  ],
  [
    "Simran, Birmingham",
    "The mirror work outfit I wore to my cousin's sangeet got so many compliments. Truly charminng chic.",
  ],
  [
    "Aisha, Dubai",
    "Absolutely in love with the thread work! The attention to detail is truly incredible.",
  ],
  [
    "Kiran, Sydney",
    "The custom design process was so smooth. My outfit feels so unique and beautifully made.",
  ],
];

function Home() {
  useReveal();
  return (
    <>
      {/* Hero */}
      <section className="relative h-[82vh] min-h-[500px] sm:min-h-[560px] md:h-[88vh] overflow-hidden">
        <img
          src={heroImage}
          alt="Sohni Mutiyaar Bespoke Luxury Indian Bridal Wear"
          width={1536}
          height={1024}
          className="absolute inset-0 size-full object-cover object-[center_20%] lg:object-[center_25%] scale-105 animate-[rise_2s_ease_both]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/40 to-transparent" />
        <div className="relative mx-auto max-w-[1500px] h-full px-4 sm:px-6 lg:px-10 flex items-center">
          <div className="max-w-xl text-ink-foreground animate-rise">
            <div className="eyebrow text-gold text-[0.65rem] sm:text-[0.7rem]">Charminng Chic · UK</div>
            <h1 className="mt-3 sm:mt-5 text-4xl min-[400px]:text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.02] sm:leading-[0.95] break-words">
              Tradition, <em className="text-gold">Tailored</em> Your Way.
            </h1>
            <p className="mt-4 sm:mt-7 text-sm sm:text-base md:text-lg opacity-85 leading-relaxed max-w-lg">
              Indian fashion beautifully crafted with intricate handwork, embroidery and
              personalised details — for everyday elegance, special occasions and unforgettable
              bridal moments.
            </p>
            <div className="mt-6 sm:mt-9 flex flex-col min-[420px]:flex-row gap-3 w-full sm:w-auto">
              <Link to="/collections" className="btn-primary text-center">
                Shop Collection
              </Link>
              <Link to="/custom-designs" className="btn-outline text-center">
                Create Your Custom Outfit
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <Section
        eyebrow="Explore SohniMutiyaar"
        title="Discover craftsmanship, colour and contemporary Indian elegance."
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
          {categories
            .filter((c) => !["daily-wear", "mirror-work", "sold-out"].includes(c.slug))
            .map((c, i) => (
              <Link
                key={c.slug}
                to="/collections/$slug"
                params={{ slug: c.slug }}
                className={`group relative overflow-hidden reveal ${i === 0 ? "col-span-2 md:row-span-2 aspect-[4/5] md:aspect-auto" : "aspect-[3/4]"}`}
              >
                <img
                  src={c.image}
                  alt={c.name}
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover transition-transform duration-[1.5s] group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-transparent" />
                <div className="absolute bottom-0 p-3 sm:p-5 text-ink-foreground">
                  <h3 className={i === 0 ? "text-2xl sm:text-4xl md:text-5xl leading-tight" : "text-lg sm:text-2xl md:text-3xl leading-tight"}>{c.name}</h3>
                  <div className="eyebrow !text-[0.55rem] sm:!text-[0.58rem] mt-1.5 sm:mt-2 opacity-80 group-hover:text-gold transition-colors">
                    Shop now →
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </Section>

      {/* New */}
      <Section eyebrow="New & Noteworthy" title="Discover our latest designs.">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 sm:gap-x-5 gap-y-8 sm:gap-y-12">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </Section>

      {/* Bridal feature */}
      <section className="bg-primary text-primary-foreground my-14 sm:my-20 lg:my-24">
        <div className="mx-auto max-w-[1500px] grid md:grid-cols-2 items-center">
          <img
            src={categories[0]!.image}
            alt="Bridal"
            loading="lazy"
            className="w-full h-full min-h-[300px] sm:min-h-[420px] max-h-[760px] object-cover reveal"
          />
          <div className="p-6 sm:p-10 md:p-16 lg:p-20 flex flex-col justify-center reveal">
            <div className="eyebrow text-gold text-[0.65rem] sm:text-[0.7rem]">The Bridal Edit</div>
            <h2 className="mt-3 sm:mt-5 text-3xl sm:text-4xl md:text-5xl lg:text-6xl break-words leading-tight">
              For the moment you'll remember forever.
            </h2>
            <p className="mt-4 sm:mt-6 text-sm sm:text-base opacity-85 leading-relaxed">
              Heirloom embroidery, rich fabrics and a fit made only for you. Every bridal outfit is
              personally designed with you from first sketch to final stitch.
            </p>
            <div className="mt-6 sm:mt-9 flex flex-col min-[420px]:flex-row gap-3">
              <Link to="/collections/$slug" params={{ slug: "bridal" }} className="btn-outline text-center">
                Explore Bridal
              </Link>
              <Link to="/contact" className="btn-outline text-center">
                Bridal Consultation
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Made for you */}
      <section className="bg-secondary py-14 sm:py-20 lg:py-24 mt-14 sm:mt-20 lg:mt-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-10 text-center flex flex-col items-center">
          <div className="reveal flex flex-col items-center w-full">
            <div className="eyebrow text-primary text-[0.65rem] sm:text-[0.7rem]">Made For You</div>
            <h2 className="mt-3 sm:mt-5 text-3xl sm:text-4xl md:text-5xl lg:text-6xl break-words leading-tight">
              Your design. Your measurements. <em className="text-primary">Your story.</em>
            </h2>
            <p className="mt-4 sm:mt-6 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Choose your preferred design, fabric, colour, embroidery and finishing details. We
              create personalised Indian outfits around your style and measurements.
            </p>
            <div className="mt-6 sm:mt-9 flex flex-col min-[420px]:flex-row justify-center gap-3 w-full sm:w-auto">
              <Link to="/custom-designs" className="btn-primary text-center">
                Start Your Custom Design
              </Link>
              <Link to="/measurements" className="btn-outline text-center">
                <Ruler className="size-4" /> Measurement Form
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Shipping & features */}
      <section className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-10 py-14 sm:py-20 lg:py-24 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-10 text-center">
        {[
          [Globe, "Worldwide Shipping", "Delivered directly to your door, wherever you are."],
          [Scissors, "Made to Measure", "Outfits tailored to your exact measurements."],
          [Sparkles, "Artisan Handwork", "Thread, mirror, Aari and hand embroidery."],
          [Mail, "Online Support", "Personal, dedicated consultations via email and message."],
        ].map(([Icon, t, d]) => {
          const I = Icon as typeof Globe;
          return (
            <div key={t as string} className="reveal p-2 sm:p-4">
              <I className="size-6 sm:size-7 mx-auto text-primary" strokeWidth={1} />
              <div className="mt-3 sm:mt-4 font-serif text-lg sm:text-2xl leading-snug">{t as string}</div>
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">{d as string}</p>
            </div>
          );
        })}
      </section>

      {/* Reviews */}
      <Section eyebrow="Loved Worldwide" title="Words from our brides & clients">
        <Carousel className="w-full">
          <CarouselContent className="-ml-3 sm:-ml-4">
            {reviews.map(([n, q]) => (
              <CarouselItem key={n} className="pl-3 sm:pl-4 sm:basis-1/2 lg:basis-1/3">
                <figure className="reveal bg-card border p-6 sm:p-8 lg:p-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex gap-1 text-gold">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="size-3.5 fill-current" />
                      ))}
                    </div>
                    <blockquote className="mt-4 sm:mt-6 font-serif text-lg sm:text-xl md:text-2xl leading-snug">“{q}”</blockquote>
                  </div>
                  <figcaption className="mt-6 eyebrow text-muted-foreground text-[0.62rem] sm:text-[0.68rem]">{n}</figcaption>
                </figure>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex justify-center gap-4 mt-6 sm:mt-8">
            <CarouselPrevious className="static translate-y-0 size-10" />
            <CarouselNext className="static translate-y-0 size-10" />
          </div>
        </Carousel>
      </Section>

      {/* Social */}
      <Section
        eyebrow="@sohnimutiyaarbycc"
        title="Follow along on Instagram & TikTok"
        text="Discover daily styling inspirations, behind-the-scenes bespoke tailoring, and latest design reveals."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full border border-border/80 bg-background hover:bg-[#E1306C]/10 hover:border-[#E1306C]/50 hover:text-[#E1306C] text-xs font-semibold tracking-wider transition-all shadow-xs cursor-pointer min-h-[40px]"
            >
              <Instagram className="size-4 text-[#E1306C]" />
              <span>Instagram</span>
            </a>
            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full border border-border/80 bg-background hover:bg-foreground/10 hover:border-foreground/50 text-xs font-semibold tracking-wider transition-all shadow-xs cursor-pointer min-h-[40px]"
            >
              <TikTokIcon className="size-4" />
              <span>TikTok</span>
            </a>
          </div>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 sm:gap-3">
          {socialFeedPosts.map((post, i) => (
            <div
              key={i}
              className="group relative aspect-square overflow-hidden rounded-xs border border-border/60 reveal bg-muted/20"
            >
              <img
                src={post.image}
                alt={post.title}
                loading="lazy"
                className="size-full object-cover transition-transform duration-700 group-hover:scale-110"
              />

              {/* Corner Platform Badge */}
              <div className="absolute top-2.5 right-2.5 z-10">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.62rem] font-medium tracking-wide shadow-xs backdrop-blur-md ${
                    post.platform === "instagram"
                      ? "bg-black/70 text-white border border-white/10"
                      : "bg-black/85 text-white border border-white/20"
                  }`}
                >
                  {post.platform === "instagram" ? (
                    <Instagram className="size-3 text-[#E1306C]" />
                  ) : (
                    <TikTokIcon className="size-3 text-white" />
                  )}
                  <span className="capitalize">{post.platform}</span>
                </span>
              </div>

              {/* Hover overlay with dual links */}
              <div className="absolute inset-0 z-20 flex flex-col justify-end p-3 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                <p className="text-[0.68rem] text-ink-foreground font-medium line-clamp-1 mb-2">
                  {post.title}
                </p>
                <div className="flex items-center gap-1.5">
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 bg-white/95 hover:bg-white text-ink text-[0.62rem] font-semibold tracking-wider uppercase rounded-xs transition-colors"
                  >
                    {post.platform === "instagram" ? (
                      <>
                        <Instagram className="size-3 text-[#E1306C]" /> Open
                      </>
                    ) : (
                      <>
                        <TikTokIcon className="size-3 text-ink" /> Watch
                      </>
                    )}
                  </a>
                  <a
                    href={post.altUrl}
                    target="_blank"
                    rel="noreferrer"
                    title={post.platform === "instagram" ? "View on TikTok" : "View on Instagram"}
                    className="size-7 inline-flex items-center justify-center bg-black/60 hover:bg-black/90 text-white rounded-xs transition-colors border border-white/20"
                  >
                    {post.platform === "instagram" ? (
                      <TikTokIcon className="size-3 text-white" />
                    ) : (
                      <Instagram className="size-3 text-white" />
                    )}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Newsletter />
    </>
  );
}

function Section({
  eyebrow,
  title,
  text,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-10 pt-14 sm:pt-20 lg:pt-24">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 mb-8 sm:mb-10 reveal">
        <div className="max-w-2xl">
          <div className="eyebrow text-primary text-[0.65rem] sm:text-[0.7rem]">{eyebrow}</div>
          <h2 className="mt-2 sm:mt-3 text-2xl sm:text-3xl md:text-4xl lg:text-5xl break-words leading-tight">{title}</h2>
          {text && <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">{text}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function Newsletter() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      if (isEmailJSConfigured()) {
        await sendNewsletterSubscription(trimmed);
      }
      setDone(true);
      setEmail("");
      toast.success("Thank you! You have joined The SohniMutiyaar Circle.");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Could not send subscription. Please try again later.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl px-4 sm:px-6 pt-16 sm:pt-22 lg:pt-28 pb-10 text-center reveal">
      <div className="eyebrow text-primary text-[0.65rem] sm:text-[0.7rem]">The SohniMutiyaar Circle</div>
      <h2 className="mt-3 sm:mt-4 text-2xl sm:text-3xl md:text-4xl lg:text-5xl break-words leading-tight">New collections, first.</h2>
      <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
        Be the first to know about new arrivals, bridal edits and exclusive offers.
      </p>
      {done ? (
        <div className="mt-6 sm:mt-8 space-y-2 animate-rise">
          <p className="font-serif text-xl sm:text-2xl text-primary">Thank you — welcome to the circle.</p>
          <p className="text-xs text-muted-foreground">
            We will send our curated bridal edits and announcements directly to your inbox.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubscribe} className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            required
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="field flex-1 text-center sm:text-left"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Subscribing...</span>
              </>
            ) : (
              <span>Subscribe</span>
            )}
          </button>
        </form>
      )}
    </section>
  );
}
