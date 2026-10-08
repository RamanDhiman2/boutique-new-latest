import { createFileRoute, Link } from "@tanstack/react-router";
import { Globe, Instagram, MessageCircle, Ruler, Scissors, Sparkles, Star } from "lucide-react";
import { useState } from "react";
import { categories, heroImage, productsIn, products, waLink } from "@/lib/catalog";
import { ProductCard } from "@/components/site/ProductCard";
import { useReveal } from "@/components/site/Chrome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SohniMutiyaar By CC — Tradition, Tailored Your Way" },
      { name: "description", content: "Indian bridal, occasion & daily wear with thread, mirror, Aari and hand work. Custom designs, made to measure. UK based, worldwide shipping." },
      { property: "og:title", content: "SohniMutiyaar By CC — Tradition, Tailored Your Way" },
      { property: "og:description", content: "Indian craftsmanship, modern elegance, made for you. UK based, shipping worldwide." },
    ],
  }),
  component: Home,
});

const journey = [
  ["Choose Your Style", "Browse our collections or share your inspiration."],
  ["Choose Your Details", "Choose fabric, colour, embroidery and finishing details."],
  ["Share Your Measurements", "Use our simple online measurement form."],
  ["Discuss Your Design", "We talk it through with you on WhatsApp."],
  ["Confirm Your Order", "Approve the final design and pricing."],
  ["We Create Your Outfit", "Crafted with care by our artisans."],
  ["Worldwide Delivery", "Delivered to your door, wherever you are."],
];

const reviews = [
  ["Priya, London", "My bridal suit was beyond anything I imagined. The handwork is breathtaking and the fit was perfect."],
  ["Harleen, Toronto", "Ordered from Canada via WhatsApp — so personal, so easy, and it arrived beautifully packed."],
  ["Simran, Birmingham", "The mirror work outfit I wore to my cousin's sangeet got so many compliments. Truly charming chic."],
];

function Home() {
  useReveal();
  const craft = categories.slice(1);
  return (
    <>
      {/* Hero */}
      <section className="relative h-[88vh] min-h-[560px] overflow-hidden">
        <img src={heroImage} alt="Burgundy embroidered suit salwar" width={1536} height={1024} className="absolute inset-0 size-full object-cover object-[60%_center] scale-105 animate-[rise_2s_ease_both]" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/75 via-ink/30 to-transparent" />
        <div className="relative mx-auto max-w-[1500px] h-full px-5 lg:px-10 flex items-center">
          <div className="max-w-xl text-ink-foreground animate-rise">
            <div className="eyebrow text-gold">Charming Chic · UK</div>
            <h1 className="mt-5 text-6xl md:text-8xl leading-[0.95]">Tradition, <em className="text-gold">Tailored</em> Your Way.</h1>
            <p className="mt-7 text-base md:text-lg opacity-85 leading-relaxed">
              Indian fashion beautifully crafted with intricate handwork, embroidery and personalised details — for everyday elegance, special occasions and unforgettable bridal moments.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-primary">Shop Collection</Link>
              <Link to="/custom-designs" className="btn-outline">Create Your Custom Outfit</Link>
            </div>
            <div className="mt-6 eyebrow !text-[0.6rem] opacity-70">UK Based • Worldwide Shipping</div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <Section eyebrow="Explore SohniMutiyaar" title="Discover craftsmanship, colour and contemporary Indian elegance.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {categories.map((c, i) => (
            <Link key={c.slug} to="/collections/$slug" params={{ slug: c.slug }}
              className={`group relative overflow-hidden reveal ${i === 0 ? "col-span-2 md:row-span-2 aspect-[4/5] md:aspect-auto" : "aspect-[3/4]"}`}>
              <img src={c.image} alt={c.name} loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-[1.5s] group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-transparent" />
              <div className="absolute bottom-0 p-5 text-ink-foreground">
                <h3 className={i === 0 ? "text-5xl" : "text-2xl md:text-3xl"}>{c.name}</h3>
                <div className="eyebrow !text-[0.58rem] mt-2 opacity-80 group-hover:text-gold transition-colors">Shop now →</div>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* New */}
      <Section eyebrow="New & Noteworthy" title="Discover our latest designs.">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-12">
          {[products[2]!, products[8]!, products[10]!, products[12]!].map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </Section>

      {/* Bridal feature */}
      <section className="bg-primary text-primary-foreground my-24">
        <div className="mx-auto max-w-[1500px] grid md:grid-cols-2">
          <img src={categories[0]!.image} alt="Bridal" loading="lazy" className="w-full h-full max-h-[760px] object-cover reveal" />
          <div className="p-10 md:p-20 flex flex-col justify-center reveal">
            <div className="eyebrow text-gold">The Bridal Edit</div>
            <h2 className="mt-5 text-5xl md:text-6xl">For the moment you'll remember forever.</h2>
            <p className="mt-6 opacity-80 leading-relaxed">Heirloom embroidery, rich fabrics and a fit made only for you. Every bridal outfit is personally designed with you from first sketch to final stitch.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/collections/$slug" params={{ slug: "bridal" }} className="btn-outline">Explore Bridal</Link>
              <a href={waLink("Hi SohniMutiyaar By CC, I'd like to book a bridal consultation.")} target="_blank" rel="noreferrer" className="btn-outline">Bridal Consultation</a>
            </div>
          </div>
        </div>
      </section>

      {/* Category rows */}
      {craft.map((c, i) => (
        <Section key={c.slug} eyebrow={c.tagline} title={c.name} text={c.description}
          action={<Link to="/collections/$slug" params={{ slug: c.slug }} className="eyebrow border-b border-foreground pb-1">View all</Link>}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-12">
            <Link to="/collections/$slug" params={{ slug: c.slug }} className={`group relative overflow-hidden aspect-[3/4] col-span-2 reveal ${i % 2 ? "lg:order-last" : ""}`}>
              <img src={c.image} alt={c.name} loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-[1.5s] group-hover:scale-105" />
            </Link>
            {productsIn(c.slug).map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </Section>
      ))}

      {/* Made for you */}
      <section className="bg-secondary py-24 mt-24">
        <div className="mx-auto max-w-[1500px] px-5 lg:px-10 grid lg:grid-cols-2 gap-16 items-center">
          <div className="reveal">
            <div className="eyebrow text-primary">Made For You</div>
            <h2 className="mt-5 text-5xl md:text-6xl">Your design. Your measurements. <em className="text-primary">Your story.</em></h2>
            <p className="mt-6 text-muted-foreground leading-relaxed">Choose your preferred design, fabric, colour, embroidery and finishing details. We create personalised Indian outfits around your style and measurements.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/custom-designs" className="btn-primary">Start Your Custom Design</Link>
              <Link to="/measurements" className="btn-outline"><Ruler className="size-4" /> Measurement Form</Link>
            </div>
          </div>
          <ol className="grid sm:grid-cols-2 gap-x-10 gap-y-8">
            {journey.map(([t, d], i) => (
              <li key={t} className="reveal border-t border-primary/30 pt-4">
                <div className="font-serif text-3xl text-primary">0{i + 1}</div>
                <div className="mt-1 font-serif text-xl">{t}</div>
                <p className="text-sm text-muted-foreground mt-1">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Shipping & features */}
      <section className="mx-auto max-w-[1500px] px-5 lg:px-10 py-24 grid md:grid-cols-4 gap-10 text-center">
        {[
          [Globe, "Worldwide Shipping", "From the UK to your door, wherever you are."],
          [Scissors, "Made to Measure", "Outfits tailored to your exact measurements."],
          [Sparkles, "Artisan Handwork", "Thread, mirror, Aari and hand embroidery."],
          [MessageCircle, "WhatsApp Ordering", "Personal, easy ordering with our team."],
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
        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map(([n, q]) => (
            <figure key={n} className="reveal bg-card border p-10">
              <div className="flex gap-1 text-gold">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="size-3.5 fill-current" />)}</div>
              <blockquote className="mt-6 font-serif text-2xl leading-snug">“{q}”</blockquote>
              <figcaption className="mt-6 eyebrow text-muted-foreground">{n}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      {/* Social */}
      <Section eyebrow="@sohnimutiyaarbycc" title="Follow along on Instagram & TikTok">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {categories.slice(1).map((c) => (
            <a key={c.slug} href="https://instagram.com" target="_blank" rel="noreferrer" className="group relative aspect-square overflow-hidden reveal">
              <img src={c.image} alt="" loading="lazy" className="size-full object-cover transition-transform duration-1000 group-hover:scale-110" />
              <div className="absolute inset-0 grid place-items-center bg-ink/0 group-hover:bg-ink/40 transition-colors">
                <Instagram className="size-6 text-ink-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          ))}
        </div>
      </Section>

      <Newsletter />
    </>
  );
}

function Section({ eyebrow, title, text, action, children }: { eyebrow: string; title: string; text?: string; action?: React.ReactNode; children: React.ReactNode }) {
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
  const [done, setDone] = useState(false);
  return (
    <section className="mx-auto max-w-2xl px-5 pt-28 text-center reveal">
      <div className="eyebrow text-primary">The SohniMutiyaar Circle</div>
      <h2 className="mt-4 text-4xl md:text-5xl">New collections, first.</h2>
      <p className="mt-4 text-muted-foreground">Be the first to know about new arrivals, bridal edits and exclusive offers.</p>
      {done ? (
        <p className="mt-8 font-serif text-2xl text-primary">Thank you — welcome to the circle.</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setDone(true); }} className="mt-8 flex gap-3">
          <input required type="email" placeholder="Your email address" className="field flex-1" />
          <button className="btn-primary">Subscribe</button>
        </form>
      )}
    </section>
  );
}
