export type ProductVariant = {
  id: string;
  name: string;
  color: string;
  swatch: string;
  theme: string;
  word: string;
  images: string[];
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  category: string;
  categorySlug: string;
  price: number;
  compareAt?: number;
  rating: number;
  reviewCount: number;
  badge?: string;
  description: string;
  features: string[];
  sizes: string[];
  variants: ProductVariant[];
  shipping: {
    discount: string;
    package: string;
    delivery: string;
    estimation: string;
  };
};

const img = (path: string) =>
  `https://cdn11.bigcommerce.com/s-09242/images/stencil/1280x1280/${path}`;

const catImg = (path: string) =>
  `https://store-09242.mybigcommerce.com/product_images/${path}`;

const uploaded = (path: string) =>
  `https://cdn11.bigcommerce.com/s-09242/product_images/uploaded_images/${path}`;

export const categories = [
  {
    name: "Wetsuits",
    slug: "wetsuits",
    image: catImg("Wetsuit%202021.jpg"),
  },
  {
    name: "Impact Vests",
    slug: "vests",
    image: catImg("Vests%202022.jpg"),
  },
  {
    name: "Gloves",
    slug: "gloves",
    image: catImg("Gloves_Jet_Ski_Cover.jpg"),
  },
  {
    name: "Boots & Shoes",
    slug: "boots",
    image: catImg("Boots%20V2.jpg"),
  },
  {
    name: "Goggles",
    slug: "goggles",
    image: catImg("Goggles%202022.jpg"),
  },
  {
    name: "Rashguards",
    slug: "rashguards",
    image: catImg("Rashguard%202021.jpg"),
  },
  {
    name: "PWC Covers",
    slug: "covers",
    image: uploaded("6-covers.jpg"),
  },
  {
    name: "Protection",
    slug: "protection",
    image: uploaded("10-protection.jpg"),
  },
];

export const collections = [
  {
    name: "Race Vests",
    slug: "vests",
    image: img("products/2478/30660/25452GW-1__34114.1775847866.JPG"),
    cta: "Shop Now",
  },
  {
    name: "Wetsuits",
    slug: "wetsuits",
    image: catImg("Wetsuit%202021.jpg"),
    cta: "Shop Now",
  },
  {
    name: "Ride Gear",
    slug: "gloves",
    image: catImg("Gloves_Jet_Ski_Cover.jpg"),
    cta: "Shop Now",
  },
  {
    name: "Apparel",
    slug: "rashguards",
    image: catImg("Rashguard%202021.jpg"),
    cta: "Shop Now",
  },
];

export const products: Product[] = [
  {
    id: "rs-25p",
    slug: "rs-25p-fade-impact-vest",
    name: "RS-25P Fade Side Entry Impact Vest",
    shortName: "RS-25P Fade Vest",
    category: "Ride Gear",
    categorySlug: "vests",
    price: 102.89,
    rating: 4.8,
    reviewCount: 50,
    badge: "25th Anniversary",
    description:
      "Jettribe 25th Anniversary Edition RS-25 Side Entry Impact Race Vest. Updated style and enhanced features make this vest excellent for closed course racing, offshore endurance racing, and recreation PWC riding. Built-in high-density EVA compression molded chest plate offers more protection than traditional life vests.",
    features: [
      "Pre-Molded Front and Back Foam for a contoured, flexible fit",
      "High-Density EVA Chest Plate for superior impact protection",
      "SGS Buoyancy Rated to meet or exceed USCG standards",
      "420 Denier Honey Comb Weave for extreme outer durability",
      "Customizable Back Plate for Name and Race Number",
      "3-Point Strap Reinforcements with heavy-duty bar tacks",
    ],
    sizes: ["XXS", "S/M", "L/XL", "XXL/XXXL"],
    shipping: {
      discount: "Free ship $400+",
      package: "Race-ready pack",
      delivery: "3–5 working days",
      estimation: "Ships from CA",
    },
    variants: [
      {
        id: "green-white",
        name: "Green / White",
        color: "Green",
        swatch: "#2F9E44",
        theme: "#1F8A3A",
        word: "RACE",
        images: [
          img("products/2478/30660/25452GW-1__34114.1775847866.JPG"),
          img("products/2478/30666/25452GW-7__76747.1775847880.JPG"),
          img("products/2478/30661/25452GW-2__67269.1775847866.JPG"),
          img("products/2478/30663/25452GW-6__29063.1775847884.JPG"),
        ],
      },
      {
        id: "deep-red-white",
        name: "Deep Red / White",
        color: "Red",
        swatch: "#C41E3A",
        theme: "#C2185B",
        word: "BOLD",
        images: [
          img("products/2477/30677/25452RW-1__53051.1775848820.JPG"),
          img("products/2477/30678/25452RW-2__48435.1775848807.JPG"),
        ],
      },
      {
        id: "pink-aqua",
        name: "Pink / Aqua",
        color: "Pink",
        swatch: "#E85A9B",
        theme: "#D81B60",
        word: "HYPE",
        images: [
          img("products/2474/30683/25452PA-1__50908.1775849232.JPG"),
        ],
      },
      {
        id: "orange-aqua",
        name: "Orange / Pale Aqua",
        color: "Orange",
        swatch: "#F07820",
        theme: "#E85D04",
        word: "RIDE",
        images: [
          img("products/2475/30668/25452OA-1__02393.1775848281.JPG"),
        ],
      },
      {
        id: "white-aqua",
        name: "White / Pale Aqua",
        color: "Aqua",
        swatch: "#2EC4B6",
        theme: "#0D9488",
        word: "SURF",
        images: [
          img("products/2476/30416/AD6V1673__22083.1775501114.JPG"),
          img("products/2476/30415/AD6V1686__39743.1775501111.JPG"),
        ],
      },
    ],
  },
  {
    id: "ur-20-orange",
    slug: "ur-20-jtr-fade-vest-orange",
    name: "UR-20 JTR Series Fade Vest",
    shortName: "UR-20 Fade Vest",
    category: "Ride Gear",
    categorySlug: "vests",
    price: 102.89,
    rating: 4.7,
    reviewCount: 34,
    badge: "New",
    description:
      "UR-20 JTR Series Fade Vest built for PWC riders who want bold fade graphics with race-ready flotation and impact structure.",
    features: [
      "Side-entry competition fit",
      "Fade graphic panels",
      "Reinforced strap system",
      "USCG-oriented flotation design",
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    shipping: {
      discount: "Free ship $400+",
      package: "Standard pack",
      delivery: "3–5 working days",
      estimation: "Ships from CA",
    },
    variants: [
      {
        id: "orange-pale-aqua",
        name: "Orange / Pale Aqua",
        color: "Orange",
        swatch: "#F07820",
        theme: "#E85D04",
        word: "RIDE",
        images: [
          "https://cdn11.bigcommerce.com/s-09242/images/stencil/1280x1280/products/2487/30794/IMGL0468__33793.1778170695.JPG",
          "https://cdn11.bigcommerce.com/s-09242/images/stencil/1280x1280/products/2487/30589/IMGL0469__16197.1775806251.JPG",
        ],
      },
    ],
  },
  {
    id: "uscg-orange-blue",
    slug: "uscg-jtr-vest-orange-blue",
    name: "USCG JTR Series Vest | Orange / Blue",
    shortName: "USCG JTR Vest",
    category: "Ride Gear",
    categorySlug: "vests",
    price: 97.49,
    rating: 4.9,
    reviewCount: 62,
    badge: "USCG Approved",
    description:
      "Coast Guard approved CGA Type 3 side-entry jet ski vest for riders who need certified flotation with Jettribe race styling.",
    features: [
      "USCG / CGA Type 3 approved",
      "Side-entry design",
      "Durable outer shell",
      "Secure strap system",
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    shipping: {
      discount: "Free ship $400+",
      package: "Standard pack",
      delivery: "3–5 working days",
      estimation: "Ships from CA",
    },
    variants: [
      {
        id: "orange-blue",
        name: "Orange / Blue",
        color: "Orange",
        swatch: "#E85D04",
        theme: "#E85D04",
        word: "RACE",
        images: [
          "https://cdn11.bigcommerce.com/s-09242/images/stencil/1280x1280/products/2392/30237/JTR_USCG_UR20_VESTS_BLUE_ORANGE_front3__59826.1773767339.jpg",
          "https://cdn11.bigcommerce.com/s-09242/images/stencil/1280x1280/products/2392/30238/JTR_USCG_UR20_VESTS_BLUE_ORANGE_front2__05684.1773767339.jpg",
        ],
      },
      {
        id: "black",
        name: "Black",
        color: "Black",
        swatch: "#1A1A1A",
        theme: "#1F2937",
        word: "DARK",
        images: [
          "https://cdn11.bigcommerce.com/s-09242/images/stencil/1280x1280/products/2390/30176/JTR_USCG_UR20_VESTS_Black_Front1__48936.1777700780.jpg",
          "https://cdn11.bigcommerce.com/s-09242/images/stencil/1280x1280/products/2390/30179/JTR_USCG_UR20_VESTS_Black_back__47294.1772231713.jpg",
        ],
      },
      {
        id: "pink-aqua",
        name: "Pink / Aqua",
        color: "Pink",
        swatch: "#E85A9B",
        theme: "#DB2777",
        word: "HYPE",
        images: [
          "https://cdn11.bigcommerce.com/s-09242/images/stencil/1280x1280/products/2389/30159/JTR_USCG_UR20_VESTS_Pink_Aqua_Front2__63314.1772230463.jpg",
          "https://cdn11.bigcommerce.com/s-09242/images/stencil/1280x1280/products/2389/30156/JTR_USCG_UR20_VESTS_Pink_Aqua_back__21217.1772230462.jpg",
        ],
      },
      {
        id: "aqua-red",
        name: "Aqua / Red",
        color: "Aqua",
        swatch: "#2EC4B6",
        theme: "#0D9488",
        word: "SURF",
        images: [
          "https://cdn11.bigcommerce.com/s-09242/images/stencil/1280x1280/products/2387/30165/JTR_USCG_UR20_VESTS_Aqua_Red_Front1__57330.1772231007.jpg",
          "https://cdn11.bigcommerce.com/s-09242/images/stencil/1280x1280/products/2387/30169/JTR_USCG_UR20_VESTS_Aqua_Red_back__01517.1772231014.jpg",
        ],
      },
    ],
  },
  {
    id: "rashguard-black",
    slug: "jtr-hooded-rashguard-black-grey",
    name: "JTR Series Hooded Rashguard",
    shortName: "Hooded Rashguard",
    category: "Apparel",
    categorySlug: "rashguards",
    price: 35.99,
    rating: 4.6,
    reviewCount: 28,
    description:
      "UV protection, breathable and quick-drying. Constructed for lightweight stretch and easy movement for PWC riding and water activities. Flatlock stitching, thumb holes, unisex fit.",
    features: [
      "UV Protection long sleeve",
      "4-Way Stretch poly lycra",
      "Breathable and quick-drying",
      "Built-in thumb holes",
      "Sublimation Gas-Fusion Graphics",
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    shipping: {
      discount: "Free ship $400+",
      package: "Soft pack",
      delivery: "2–4 working days",
      estimation: "Ships from CA",
    },
    variants: [
      {
        id: "black-grey",
        name: "Black / Grey",
        color: "Black",
        swatch: "#2B2B2B",
        theme: "#374151",
        word: "GEAR",
        images: [catImg("Rashguard%202021.jpg")],
      },
    ],
  },
  {
    id: "beach-towel",
    slug: "beach-towel-extra-large",
    name: "Beach Towel | Extra Large 73 Inch | Soft Microfiber",
    shortName: "Beach Towel XL",
    category: "Accessories",
    categorySlug: "accessories",
    price: 26.29,
    rating: 4.5,
    reviewCount: 18,
    badge: "New",
    description:
      "Extra-large soft microfiber beach towel designed for the dock, trailer, and shoreline after a hard ride.",
    features: [
      "73 inch oversized format",
      "Soft microfiber hand-feel",
      "Quick drying",
      "Jettribe graphic designs",
    ],
    sizes: ["One Size"],
    shipping: {
      discount: "Free ship $400+",
      package: "Compact fold",
      delivery: "2–4 working days",
      estimation: "Ships from CA",
    },
    variants: [
      {
        id: "design-a",
        name: "Design A",
        color: "Multi",
        swatch: "#1B4965",
        theme: "#1D4E89",
        word: "WAVE",
        images: [
          "https://cdn11.bigcommerce.com/s-09242/images/stencil/1280x1280/products/2497/30855/JTA_25378A_towel_square__11989.1779382231.jpg",
        ],
      },
      {
        id: "design-b",
        name: "Design B",
        color: "Multi",
        swatch: "#D83232",
        theme: "#B91C1C",
        word: "DOCK",
        images: [
          "https://cdn11.bigcommerce.com/s-09242/images/stencil/1280x1280/products/2498/30837/JTA_25378B_towel_crop__17123.1779308949.jpg",
        ],
      },
    ],
  },
  {
    id: "rs-16-black",
    slug: "rs-16-side-entry-black-vest",
    name: "RS-16 Side-Entry Black Life Vest",
    shortName: "RS-16 Comp Vest",
    category: "Ride Gear",
    categorySlug: "vests",
    price: 89.99,
    compareAt: 109.99,
    rating: 4.7,
    reviewCount: 41,
    description:
      "Competition race vest with impact chest protection and side-entry fit for closed-course and recreational PWC riding.",
    features: [
      "Impact chest protection",
      "Side-entry race fit",
      "Durable competition shell",
      "Secure buckle and strap layout",
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    shipping: {
      discount: "Free ship $400+",
      package: "Race pack",
      delivery: "3–5 working days",
      estimation: "Ships from CA",
    },
    variants: [
      {
        id: "black",
        name: "Black",
        color: "Black",
        swatch: "#111111",
        theme: "#111827",
        word: "COMP",
        images: [
          "https://cdn11.bigcommerce.com/s-09242/images/stencil/1280x1280/products/261/23841/jettribe-rs-16-side-entry-black-life-vest-or-impact-chest-protection-or-comp-race-vest__46970.1729841969.jpg",
          "https://cdn11.bigcommerce.com/s-09242/images/stencil/1280x1280/products/261/24496/jettribe-rs-16-side-entry-black-life-vest-or-impact-chest-protection-or-comp-race-vest__63455.1729841969.jpg",
        ],
      },
    ],
  },
];

export const bestsellers = products.slice(0, 4);

export const relatedProducts = products.slice(1, 5);

export const testimonials = [
  {
    quote:
      "I am very happy with the excellent support from Jettribe.",
    name: "Yohei Yamamoto",
    rating: 5,
  },
  {
    quote:
      "I'm loving the color combination and how everything comes together.",
    name: "Michael Bernhardt",
    rating: 5,
  },
  {
    quote:
      "The suits are really sharp and great quality. You really can't get better than this!",
    name: "Derek Corell",
    rating: 5,
  },
  {
    quote:
      "You went above and beyond. The gear looks and feels amazing.",
    name: "Jonathan K Espey",
    rating: 5,
  },
];

export const heroImage =
  "https://cdn11.bigcommerce.com/s-09242/images/stencil/original/carousel/2131/banner_2.jpg?c=2";

export const promoImage =
  "https://cdn11.bigcommerce.com/s-09242/images/stencil/1280x1280/products/2478/30660/25452GW-1__34114.1775847866.JPG";

export const saleImage =
  "https://cdn11.bigcommerce.com/s-09242/images/stencil/1280x1280/products/2392/30237/JTR_USCG_UR20_VESTS_BLUE_ORANGE_front3__59826.1773767339.jpg";

export const newsletterImage = catImg("Rashguard%202021.jpg");

export function getProductBySlug(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(slug: string) {
  return products.filter((p) => p.categorySlug === slug);
}
