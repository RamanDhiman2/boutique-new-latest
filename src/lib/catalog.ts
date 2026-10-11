import {
  product1Images,
  product2Images,
  product3Images,
  product4Images,
  product5Images,
  product6Images,
  product7Images,
  product8Images,
  product9Images,
  product10Images,
  product11Images,
  product12Images,
  product13Images,
  featuredHeroImage,
  featuredBridalBanner,
  featuredOccasionBanner,
  featuredDailyBanner,
  featuredThreadBanner,
  featuredMirrorBanner,
  featuredAariBanner,
  featuredHandBanner,
} from "./productImages";

export const heroImage = featuredHeroImage;

export const CONTACT_EMAIL = "Charminngchic@gmail.com";
export const WHATSAPP_NUMBER = "447393070421";

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
  {
    slug: "bridal",
    name: "Bridal",
    tagline: "For your most unforgettable moments",
    description:
      "Exquisite bridal outfits with rich embroidery, heirloom detailing and made-to-measure tailoring.",
    image: featuredBridalBanner,
  },
  {
    slug: "shop-by-occasion",
    name: "Shop by Occasion",
    tagline: "Weddings, festivals & celebrations",
    description:
      "Mehndi, sangeet, Eid, Diwali, parties and receptions — dressed beautifully for every celebration.",
    image: featuredOccasionBanner,
  },
  {
    slug: "daily-wear",
    name: "Daily Wear",
    tagline: "Everyday elegance",
    description:
      "Comfortable, graceful suit salwars and kurtas designed for effortless everyday style.",
    image: featuredDailyBanner,
  },
  {
    slug: "thread-work",
    name: "Thread Work",
    tagline: "Colour, stitch by stitch",
    description:
      "Intricate thread embroidery with carefully selected colours and traditional craftsmanship.",
    image: featuredThreadBanner,
  },
  {
    slug: "mirror-work",
    name: "Mirror Work",
    tagline: "Light-catching heritage",
    description: "Hand-set mirrors framed in fine embroidery — festive, luminous and timeless.",
    image: featuredMirrorBanner,
  },
  {
    slug: "aari-work",
    name: "Aari Work",
    tagline: "Fine chain-stitch artistry",
    description: "Delicate Aari embroidery with beads, sequins and precise hand-guided detail.",
    image: featuredAariBanner,
  },
  {
    slug: "hand-work",
    name: "Hand Work",
    tagline: "Made slowly, by hand",
    description: "Pearls, zari and hand embroidery — every piece carries the touch of the artisan.",
    image: featuredHandBanner,
  },
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
const S_BRIDAL = ["Custom", "S", "M", "L", "XL"];

export const products: Product[] = [
  {
    id: "elegant-maroon-suit",
    name: "Elegant Maroon Suit",
    price: 65,
    colour: "Maroon",
    category: "shop-by-occasion",
    images: product1Images,
    sizes: S,
    customisable: true,
    description:
      "An elegant maroon suit crafted from beautiful viscose organza fabric, featuring intricate machine work and a matching viscose organza dupatta. Perfect for adding grace and elegance to your special occasions.\n\nProduct Details:\n• Suit Fabric: Viscose Organza\n• Dupatta Fabric: Viscose Organza\n• Work: Beautiful Machine Embroidery\n• Finishing: Neat & Fine Workmanship",
  },
  {
    id: "elegant-purple-georgette-suit",
    name: "Elegant Purple Viscose Georgette Suit",
    price: 63,
    colour: "Purple",
    category: "aari-work",
    images: product2Images,
    sizes: S,
    customisable: true,
    description:
      "A beautifully designed purple suit crafted from soft viscose georgette, paired with a comfortable salwar and a pure tabby-lines dupatta. The suit features elegant Ari work, while the dupatta is finished with beautiful lace on all four sides—perfect for festive occasions and special events.\n\nProduct Details:\n• Suit & Salwar Fabric: Viscose Georgette\n• Dupatta Fabric: Pure Tabby Lines\n• Work: Elegant Ari Work on the Suit\n• Dupatta Detail: Lace on all four sides\n• Finishing: Neat and fine workmanship",
  },
  {
    id: "elegant-yellow-cream-suit",
    name: "Elegant Yellow & Cream Suit",
    price: 65,
    colour: "Yellow & Cream",
    category: "thread-work",
    images: product3Images,
    sizes: S,
    customisable: true,
    description:
      "A beautifully designed suit featuring a yellow georgette shirt, paired with a cream viscose organza salwar and dupatta. The outfit is enhanced with elegant golden seed bead and thread machine work, along with lace detailing on all four sides of the dupatta.\n\nProduct Details:\n• Shirt Fabric: Georgette\n• Salwar Fabric: Viscose Organza\n• Dupatta Fabric: Viscose Organza\n• Colours: Yellow shirt with cream salwar and dupatta\n• Work: Golden seed bead and thread machine work\n• Dupatta Detail: Lace on all four sides\n• Finishing: Neat and fine workmanship",
  },
  {
    id: "elegant-firozi-heavy-suit",
    name: "Elegant Firozi Heavy Suit",
    price: 150,
    colour: "Firozi",
    category: "hand-work",
    images: product4Images,
    sizes: S_BRIDAL,
    customisable: true,
    description:
      "A beautifully crafted heavy suit featuring a satin organza shirt, paired with a viscose organza dupatta. The outfit is enhanced with detailed handwork and elegant patchwork, making it perfect for weddings and other special occasions. The dupatta is finished with beautiful handwork on all four sides.\n\nProduct Details:\n• Shirt Fabric: Satin Organza\n• Dupatta Fabric: Viscose Organza\n• Colour: Firozi\n• Work: Full Handwork and Patchwork\n• Dupatta Detail: Handwork on all four sides\n• Style: Heavy and elegant occasion wear\n• Finishing: Neat and fine workmanship",
  },
  {
    id: "crepe-mix-match-printed-suit",
    name: "Crepe Mix & Match Printed Suit",
    price: 80,
    colour: "Multi-Colour Print",
    category: "daily-wear",
    images: product5Images,
    sizes: S,
    customisable: true,
    description:
      "A stylish crepe fabric suit featuring beautiful mix-and-match prints, designed to create a unique and elegant look. The dupatta is made from soft viscose chiffon and finished with delicate lace on all four sides, adding a graceful touch to the outfit.\n\nProduct Details:\n• Suit Fabric: Crepe\n• Design: Mix-and-match prints\n• Dupatta Fabric: Viscose Chiffon\n• Dupatta Detail: Lace on all four sides\n• Style: Elegant and versatile\n• Finishing: Neat and fine workmanship",
  },
  {
    id: "royal-navy-blue-green-suit",
    name: "Royal Navy Blue & Green Suit",
    price: 120,
    colour: "Royal Navy Blue & Green",
    category: "shop-by-occasion",
    images: product6Images,
    sizes: S,
    customisable: true,
    description:
      "A stunning royal navy blue and green suit featuring beautiful handwork embroidery, paired with a stylish tie-and-dye dupatta. The suit and salwar are made from satin organza fabric, creating an elegant and luxurious look for special occasions.\n\nProduct Details:\n• Suit Fabric: Satin Organza\n• Salwar Fabric: Satin Organza\n• Dupatta: Tie-and-Dye Organza\n• Work: Handwork Embroidery\n• Colours: Royal Navy Blue & Green\n• Finishing: Neat and fine workmanship",
  },
  {
    id: "baby-pink-mehroon-touch-suit",
    name: "Baby Pink Suit with Mehroon Touch",
    price: 170,
    colour: "Baby Pink with Mehroon Touch",
    category: "hand-work",
    images: product7Images,
    sizes: S_BRIDAL,
    customisable: true,
    description:
      "A beautiful baby pink satin suit featuring delicate hand embroidery with elegant mehroon accents and white pearl detailing. The all-over pink fabric creates a soft, graceful, and luxurious look, perfect for special occasions.\n\nProduct Details:\n• Suit Fabric: Satin\n• Colour: Baby Pink with Mehroon Touch\n• Work: Hand Embroidery\n• Detailing: White Pearl Work\n• Design: All-over Embroidery\n• Finishing: Neat and fine workmanship",
  },
  {
    id: "dark-purple-heavy-handwork-suit",
    name: "Dark Purple Suit with Heavy Handwork",
    price: 120,
    colour: "Dark Purple",
    category: "shop-by-occasion",
    images: product8Images,
    sizes: S,
    customisable: true,
    description:
      "A stunning dark purple suit featuring exquisite heavy handwork on the suit, dupatta, and salwar. Designed with rich detailing and elegant craftsmanship, this outfit is perfect for weddings, festive celebrations, and special occasions.\n\nProduct Details:\n• Colour: Dark Purple (Available in 20 beautiful shades)\n• Work: Heavy Handwork\n• Work Placement: Suit, Dupatta, and Salwar\n• Finishing: Neat and fine workmanship",
  },
  {
    id: "bottle-green-heavy-handwork-suit",
    name: "Bottle Green Suit with Heavy Handwork",
    price: 140,
    colour: "Bottle Green",
    category: "hand-work",
    images: product9Images,
    sizes: S,
    customisable: true,
    description:
      "A luxurious bottle green suit featuring exquisite heavy hand embroidery, crafted with elegant detailing for a rich and graceful look. Perfect for weddings, festive celebrations, and special occasions.\n\nProduct Details:\n• Colour: Bottle Green\n• Suit Fabric: Pure Kamal Crepe\n• Salwar Fabric: Pure Kamal Crepe\n• Dupatta Fabric: Chinon\n• Work: Heavy Hand Embroidery\n• Finishing: Neat and fine workmanship",
  },
  {
    id: "coffee-brown-cream-salwar-suit",
    name: "Coffee Brown Suit with Cream Salwar",
    price: 60,
    colour: "Coffee Brown & Cream",
    category: "daily-wear",
    images: product10Images,
    sizes: S,
    customisable: true,
    description:
      "A stylish coffee brown suit paired with a cream salwar and a beautiful tie-dye dupatta. Designed with a comfortable fit and neat finishing, this outfit is perfect for casual outings, gatherings, and everyday elegance.\n\nProduct Details:\n• Suit Colour: Coffee Brown\n• Salwar Colour: Cream\n• Dupatta: Tie-Dye Dupatta\n• Style: Comfortable and Elegant\n• Finishing: Neat and Fine Workmanship",
  },
  {
    id: "all-over-black-heavy-handwork-suit",
    name: "All-Over Black Suit with Heavy Handwork",
    price: 199,
    colour: "Black",
    category: "shop-by-occasion",
    images: product11Images,
    sizes: S,
    customisable: true,
    description:
      "An elegant all-over black suit crafted from premium crepe fabric and beautifully enhanced with heavy handwork. Designed with attention to detail and neat finishing, this outfit is perfect for weddings, parties, festive occasions, and special events.\n\nProduct Details:\n• Suit Colour: Black\n• Fabric: Premium Crepe\n• Work: Heavy Handwork\n• Style: Elegant and Luxurious\n• Finishing: Neat and Fine Workmanship",
  },
  {
    id: "dark-green-bridal-heavy-handwork-suit",
    name: "Dark Green Bridal Suit with Heavy Handwork",
    price: 230,
    colour: "Dark Green",
    category: "bridal",
    images: product12Images,
    sizes: S_BRIDAL,
    customisable: true,
    description:
      "A stunning dark green suit featuring luxurious heavy handwork, specially designed for Jaago nights, bridal wear, weddings, and other special occasions. Its elegant detailing and neat finishing create a rich and graceful look.\n\nProduct Details:\n• Suit Colour: Dark Green\n• Work: Heavy Handwork\n• Style: Bridal and Festive Wear\n• Perfect For: Jaago Night, Weddings, and Special Events\n• Finishing: Neat and Fine Workmanship",
  },
  {
    id: "firozi-banarsi-heavy-golden-suit",
    name: "Firozi Banarsi Suit with Heavy Golden Work",
    price: 199,
    colour: "Firozi",
    category: "bridal",
    images: product13Images,
    sizes: S_BRIDAL,
    customisable: true,
    description:
      "A beautiful firozi suit crafted from luxurious Banarsi fabric, featuring elegant heavy golden work. Its rich design and neat finishing make it perfect for bridal wear, weddings, Jaago nights, and special occasions.\n\nProduct Details:\n• Suit Colour: Firozi\n• Fabric: Premium Banarsi\n• Work: Heavy Golden Work\n• Style: Bridal and Festive Wear\n• Perfect For: Weddings, Jaago Nights, and Special Events\n• Finishing: Neat and Fine Workmanship",
  },
];

export const productsIn = (slug: string) => products.filter((p) => p.category === slug);
export const gbp = (n: number) => `£${n.toLocaleString("en-GB")}`;
