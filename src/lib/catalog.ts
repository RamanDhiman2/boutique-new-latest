import hero from "@/assets/hero.jpg";
import bridal from "@/assets/bridal.jpg";
import occasion from "@/assets/occasion.jpg";
import daily from "@/assets/daily.jpg";
import thread from "@/assets/thread.jpg";
import mirror from "@/assets/mirror.jpg";
import aari from "@/assets/aari.jpg";
import hand from "@/assets/hand.jpg";

export const heroImage = hero;

export const WHATSAPP_NUMBER = "4477393070421";
export const waLink = (msg = "Hi SohniMutiyaar By CC, I'd like to enquire about an outfit.") =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;

export type Category = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  image: string;
};

export const categories: Category[] = [
  { slug: "bridal", name: "Bridal", tagline: "For your most unforgettable moments", description: "Exquisite bridal outfits with rich embroidery, heirloom detailing and made-to-measure tailoring.", image: bridal },
  { slug: "shop-by-occasion", name: "Shop by Occasion", tagline: "Weddings, festivals & celebrations", description: "Mehndi, sangeet, Eid, Diwali, parties and receptions — dressed beautifully for every celebration.", image: occasion },
  { slug: "daily-wear", name: "Daily Wear", tagline: "Everyday elegance", description: "Comfortable, graceful suit salwars and kurtas designed for effortless everyday style.", image: daily },
  { slug: "thread-work", name: "Thread Work", tagline: "Colour, stitch by stitch", description: "Intricate thread embroidery with carefully selected colours and traditional craftsmanship.", image: thread },
  { slug: "mirror-work", name: "Mirror Work", tagline: "Light-catching heritage", description: "Hand-set mirrors framed in fine embroidery — festive, luminous and timeless.", image: mirror },
  { slug: "aari-work", name: "Aari Work", tagline: "Fine chain-stitch artistry", description: "Delicate Aari embroidery with beads, sequins and precise hand-guided detail.", image: aari },
  { slug: "hand-work", name: "Hand Work", tagline: "Made slowly, by hand", description: "Pearls, zari and hand embroidery — every piece carries the touch of the artisan.", image: hand },
];

export type Product = {
  id: string;
  name: string;
  price: number;
  colour: string;
  category: string;
  images: string[];
  sizes: string[];
  customisable: boolean;
  description: string;
};

const S = ["XS", "S", "M", "L", "XL", "Custom"];
const img = (c: string) => categories.find((x) => x.slug === c)!.image;

export const products: Product[] = [
  { id: "noor-bridal-lehenga", name: "Noor Bridal Lehenga", price: 1450, colour: "Crimson & Gold", category: "bridal", images: [bridal, aari], sizes: ["Custom"], customisable: true, description: "A heirloom-worthy bridal lehenga with dense zardozi and Aari detailing, finished with a sheer embroidered dupatta." },
  { id: "rani-bridal-suit", name: "Rani Bridal Suit", price: 890, colour: "Wine", category: "bridal", images: [hero, mirror], sizes: S, customisable: true, description: "A regal bridal suit salwar in deep wine with gold handwork and a scalloped net dupatta." },
  { id: "zoya-anarkali", name: "Zoya Anarkali", price: 340, colour: "Plum", category: "shop-by-occasion", images: [occasion, thread], sizes: S, customisable: true, description: "A flowing silk anarkali with gold-embroidered yoke and border — made for festive evenings." },
  { id: "meher-occasion-suit", name: "Meher Occasion Suit", price: 295, colour: "Burgundy", category: "shop-by-occasion", images: [hero, aari], sizes: S, customisable: true, description: "A straight-cut suit with all-over buti work and a richly bordered organza dupatta." },
  { id: "gulab-cotton-kurta", name: "Gulab Cotton Kurta Set", price: 95, colour: "Blush Pink", category: "daily-wear", images: [daily, hand], sizes: S, customisable: false, description: "A breathable cotton kurta and trouser set with tonal neckline embroidery." },
  { id: "saba-daily-suit", name: "Saba Daily Suit", price: 120, colour: "Ivory", category: "daily-wear", images: [daily, aari], sizes: S, customisable: true, description: "Soft, easy and refined — an everyday suit salwar with delicate thread detailing." },
  { id: "phulkari-dupatta-suit", name: "Phulkari Thread Suit", price: 260, colour: "Maroon Multi", category: "thread-work", images: [thread, hero], sizes: S, customisable: true, description: "Vibrant floral thread embroidery on rich maroon, inspired by Punjabi phulkari." },
  { id: "kesar-thread-kurta", name: "Kesar Thread Kurta", price: 180, colour: "Saffron", category: "thread-work", images: [thread, daily], sizes: S, customisable: true, description: "A statement kurta with dense multi-colour thread work at the yoke and sleeves." },
  { id: "sheesha-suit", name: "Sheesha Mirror Suit", price: 310, colour: "Plum & Gold", category: "mirror-work", images: [mirror, occasion], sizes: S, customisable: true, description: "Hand-set mirrors encircled by pearl-white embroidery for a luminous festive finish." },
  { id: "chandni-mirror-dupatta", name: "Chandni Mirror Set", price: 275, colour: "Wine", category: "mirror-work", images: [mirror, hero], sizes: S, customisable: true, description: "A mirror-work set that catches every light, with a matching embellished dupatta." },
  { id: "moti-aari-suit", name: "Moti Aari Suit", price: 360, colour: "Ivory & Champagne", category: "aari-work", images: [aari, daily], sizes: S, customisable: true, description: "Fine Aari chain-stitch florals with pearl and sequin clusters on ivory silk." },
  { id: "heer-aari-anarkali", name: "Heer Aari Anarkali", price: 420, colour: "Champagne", category: "aari-work", images: [aari, occasion], sizes: S, customisable: true, description: "A graceful anarkali with an Aari-embroidered bodice and scalloped hem." },
  { id: "gulnar-handwork-suit", name: "Gulnar Handwork Suit", price: 390, colour: "Soft Blush", category: "hand-work", images: [hand, daily], sizes: S, customisable: true, description: "Pearls, zari and hand embroidery on blush silk — crafted slowly over many days." },
  { id: "inaya-hand-embroidered", name: "Inaya Hand-Embroidered Set", price: 340, colour: "Rose", category: "hand-work", images: [hand, aari], sizes: S, customisable: true, description: "Hand-embroidered florals with delicate beading for an heirloom finish." },
];

export const productsIn = (slug: string) => products.filter((p) => p.category === slug);
export const gbp = (n: number) => `£${n.toLocaleString("en-GB")}`;
