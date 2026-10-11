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
    "The mirror work outfit I wore to my cousin's sangeet got so many compliments. Truly charming chic.",
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
      <section className="relative h-[88vh] min-h-[560px] overflow-hidden">
        <img
          src={heroImage}
          alt="Sohni Mutiyaar Bespoke Luxury Indian Bridal Wear"
          width={1536}
          height={1024}
          className="absolute inset-0 size-full object-cover object-[center_20%] lg:object-[center_25%] scale-105 animate-[rise_2s_ease_both]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/75 via-ink/30 to-transparent" />
        <div className="relative mx-auto max-w-[1500px] h-full px-5 lg:px-10 flex items-center">
          <div className="max-w-xl text-ink-foreground animate-rise">
            <div className="eyebrow text-gold">Charming Chic · UK</div>
            <h1 className="mt-5 text-6xl md:text-8xl leading-[0.95]">
              Tradition, <em className="text-gold">Tailored</em> Your Way.
            </h1>
            <p className="mt-7 text-base md:text-lg opacity-85 leading-relaxed">
              Indian fashion beautifully crafted with intricate handwork, embroidery and
              personalised details — for everyday elegance, special occasions and unforgettable
              bridal moments.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/collections" className="btn-primary">
                Shop Collection
              </Link>
              <Link to="/custom-designs" className="btn-outline">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
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
                <div className="absolute bottom-0 p-5 text-ink-foreground">
                  <h3 className={i === 0 ? "text-5xl" : "text-2xl md:text-3xl"}>{c.name}</h3>
                  <div className="eyebrow !text-[0.58rem] mt-2 opacity-80 group-hover:text-gold transition-colors">
                    Shop now →
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </Section>

      {/* New */}
      <Section eyebrow="New & Noteworthy" title="Discover our latest designs.">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-12">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </Section>

      {/* Bridal feature */}
      <section className="bg-primary text-primary-foreground my-24">
        <div className="mx-auto max-w-[1500px] grid md:grid-cols-2">
          <img
            src={categories[0]!.image}
            alt="Bridal"
            loading="lazy"
            className="w-full h-full max-h-[760px] object-cover reveal"
          />
          <div className="p-10 md:p-20 flex flex-col justify-center reveal">
            <div className="eyebrow text-gold">The Bridal Edit</div>
            <h2 className="mt-5 text-5xl md:text-6xl">For the moment you'll remember forever.</h2>
            <p className="mt-6 opacity-80 leading-relaxed">
              Heirloom embroidery, rich fabrics and a fit made only for you. Every bridal outfit is
              personally designed with you from first sketch to final stitch.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/collections/$slug" params={{ slug: "bridal" }} className="btn-outline">
                Explore Bridal
              </Link>
              <Link to="/contact" className="btn-outline">
                Bridal Consultation
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Made for you */}
      <section className="bg-secondary py-24 mt-24">
        <div className="mx-auto max-w-4xl px-5 lg:px-10 text-center flex flex-col items-center">
          <div className="reveal flex flex-col items-center">
            <div className="eyebrow text-primary">Made For You</div>
            <h2 className="mt-5 text-5xl md:text-6xl">
              Your design. Your measurements. <em className="text-primary">Your story.</em>
            </h2>
            <p className="mt-6 text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Choose your preferred design, fabric, colour, embroidery and finishing details. We
              create personalised Indian outfits around your style and measurements.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link to="/custom-designs" className="btn-primary">
                Start Your Custom Design
              </Link>
              <Link to="/measurements" className="btn-outline">
                <Ruler className="size-4" /> Measurement Form
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Shipping & features */}
      <section className="mx-auto max-w-[1500px] px-5 lg:px-10 py-24 grid md:grid-cols-4 gap-10 text-center">
        {[
          [Globe, "Worldwide Shipping", "Delivered directly to your door, wherever you are."],
          [Scissors, "Made to Measure", "Outfits tailored to your exact measurements."],
          [Sparkles, "Artisan Handwork", "Thread, mirror, Aari and hand embroidery."],
          [Mail, "Online Support", "Personal, dedicated consultations via email and message."],
        ].map(([Icon, t, d]) => {
          const I = Icon as typeof Globe;
          return (
            <div key={t as string} className="reveal">
              <I className="size-7 mx-auto text-primary" strokeWidth={1} />
              <div className="mt-4 font-serif text-2xl">{t as string}</div>
              <p className="mt-2 text-sm text-muted-foreground">{d as string}</p>
            </div>
          );
        })}
      </section>

      {/* Reviews */}
      <Section eyebrow="Loved Worldwide" title="Words from our brides & clients">
        <Carousel className="w-full">
          <CarouselContent className="-ml-4">
            {reviews.map(([n, q]) => (
              <CarouselItem key={n} className="pl-4 md:basis-1/2 lg:basis-1/3">
                <figure className="reveal bg-card border p-10 h-full">
                  <div className="flex gap-1 text-gold">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="size-3.5 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-6 font-serif text-2xl leading-snug">“{q}”</blockquote>
                  <figcaption className="mt-6 eyebrow text-muted-foreground">{n}</figcaption>
                </figure>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex justify-center gap-4 mt-8">
            <CarouselPrevious className="static translate-y-0" />
            <CarouselNext className="static translate-y-0" />
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
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border/80 bg-background hover:bg-[#E1306C]/10 hover:border-[#E1306C]/50 hover:text-[#E1306C] text-xs font-semibold tracking-wider transition-all shadow-xs cursor-pointer"
            >
              <Instagram className="size-4 text-[#E1306C]" />
              <span>Instagram</span>
            </a>
            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border/80 bg-background hover:bg-foreground/10 hover:border-foreground/50 text-xs font-semibold tracking-wider transition-all shadow-xs cursor-pointer"
            >
              <TikTokIcon className="size-4" />
              <span>TikTok</span>
            </a>
          </div>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
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
    <section className="mx-auto max-w-[1500px] px-5 lg:px-10 pt-24">
      <div className="flex flex-wrap items-end justify-between gap-6 mb-10 reveal">
        <div className="max-w-2xl">
          <div className="eyebrow text-primary">{eyebrow}</div>
          <h2 className="mt-3 text-4xl md:text-5xl">{title}</h2>
          {text && <p className="mt-4 text-muted-foreground">{text}</p>}
        </div>
        {action}
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
    <section className="mx-auto max-w-2xl px-5 pt-28 text-center reveal">
      <div className="eyebrow text-primary">The SohniMutiyaar Circle</div>
      <h2 className="mt-4 text-4xl md:text-5xl">New collections, first.</h2>
      <p className="mt-4 text-muted-foreground">
        Be the first to know about new arrivals, bridal edits and exclusive offers.
      </p>
      {done ? (
        <div className="mt-8 space-y-3 animate-rise">
          <p className="font-serif text-2xl text-primary">Thank you — welcome to the circle.</p>
          <p className="text-xs text-muted-foreground">
            We will send our curated bridal edits and announcements directly to your inbox.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubscribe} className="mt-8 flex flex-col sm:flex-row gap-3">
          <input
            required
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="field flex-1"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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
