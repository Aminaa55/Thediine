/**
 * The Diine — initial catalogue.
 *
 * Source of truth: the Full Buffet Menu PDF plus the confirmed price list.
 * Prices here are in EGP exactly as supplied; the seeder converts to piastres.
 *
 * RULES APPLIED (nothing invented):
 *  - `price` set        -> single-price product.
 *  - `variants` set     -> priced variants; the product itself has no price.
 *  - `options`          -> required choices. Every choice is +0 EGP, per the
 *                          instruction that included accompaniments don't add cost.
 *                          A group with `pick` asks for a set ("choose two buns")
 *                          rather than one; finger food packages use this.
 *  - `unit`             -> the portion, exactly as the business supplied it:
 *                          "Serves 5", "1 kg / serves 5", "25 pieces". Shown
 *                          to the customer on the dish. Where a portion differs
 *                          by size it lives in the VARIANT name instead, since
 *                          a variant has no unit of its own.
 *  - `allergens`        -> tagged ONLY from ingredients named in the menu text.
 *                          Gluten and egg are under-tagged on purpose: they need
 *                          recipe knowledge, not menu wording. All tags land
 *                          unreviewed and must be checked before launch.
 *  - `note`             -> something still unresolved, surfaced in admin.
 *  - `eventPricing`     -> an EXCEPTION to the shared event ladder. Absent
 *                          everywhere for now: every dish follows the shared
 *                          guest-count ladder until the business says a
 *                          particular dish scales differently. Prices below are
 *                          NORMAL ORDER prices and are never rewritten by it.
 */

export type Choice = { name: string };
/**
 * A choice the customer makes on a dish.
 *
 * Without `pick` it is one required choice from the list, as every main-course
 * accompaniment is. With `pick` the customer chooses a set: `{ min: 2, max: 2 }`
 * is "choose two", `{ min: 1, max: 3 }` is "choose up to three". Every choice
 * is +0 EGP either way; the price is the dish's own.
 */
export type OptionGroup = { name: string; choices: string[]; pick?: { min: number; max: number } };
export type Variant = { name: string; price: number };

/**
 * A dish that does not follow the shared event ladder.
 *
 * `enabled: false`  -> events pay the normal menu price for this dish.
 * `tiers`           -> this dish's own guest bands, REPLACING the shared
 *                      ladder. Give each band either a `multiplier` (2.5 means
 *                      2.5x the normal price) or a flat `price` in EGP.
 */
export type SeedEventPricing = {
  enabled?: boolean;
  note?: string;
  tiers?: { minGuests: number; maxGuests: number; multiplier?: number; price?: number }[];
};

export type SeedProduct = {
  slug: string;
  name: string;
  /** Which sections of its category it appears under. May be more than one. */
  groups?: string[];
  description?: string;
  /** The NORMAL ORDER price, in EGP. Event prices are derived, never stored here. */
  price?: number;
  /** The portion, as supplied. Never invented. */
  unit?: string;
  variants?: Variant[];
  options?: OptionGroup[];
  allergens?: string[];
  note?: string;
  eventPricing?: SeedEventPricing;
};

export type SeedCategory = {
  slug: string;
  name: string;
  /** Sections inside this category, in display order. Absent means one list. */
  groups?: string[];
  products: SeedProduct[];
};

export const ALLERGENS = [
  { slug: "nuts", name: "Nuts" },
  { slug: "seafood", name: "Seafood / shellfish" },
  { slug: "fish", name: "Fish" },
  { slug: "dairy", name: "Dairy" },
  { slug: "gluten", name: "Gluten" },
  { slug: "egg", name: "Egg" },
  { slug: "sesame", name: "Sesame" },
  { slug: "soy", name: "Soy" },
];

// Accompaniment sets reused across several main courses.
const RICE_3 = [
  "Mixed rice, almonds & raisins",
  "Basmati rice, almonds & raisins",
  "Grilled vegetables",
];
const SAUCE_4 = [
  "Mushroom & rosemary sauce",
  "Coffee sauce",
  "Pepper sauce",
  "Prunes sauce",
];
const SIDE_2 = ["Potato purée", "Grilled vegetables"];

// --- finger food --------------------------------------------------------------
// The finger food menu (pages 10–14 of the menu as supplied) lists what can go
// in a package but carries no prices: a package is priced as a whole, for a
// guest count. These are the pools a package chooses from, section by section,
// exactly as the pages name them. Smoked salmon and shrimps appear only in the
// 60,000 EGP package, so they are offered only there.
const BUNS = [
  "Mini burger",
  "Mini fried chicken",
  "Mini turkey & cheddar with apples",
  "Blue cheese with walnuts",
];
const BUNS_WITH_SEAFOOD = [...BUNS, "Mini smoked salmon"];
const STICKS = [
  "Chicken balls stuffed with mozzarella & grapes",
  "Mini shish with honey mustard glaze",
  "Slices of cordon bleu",
  "Mozzarella with cherry tomatoes",
];
const STICKS_WITH_SEAFOOD = [...STICKS, "Shrimps with pineapple"];
const CUPS = [
  "Chicken shawerma",
  "Meat shawerma",
  "Mushroom with caramelised onions",
  "Eggplant with onions, coloured pepper & parsley",
  "Vine leaves with special yogurt dip",
];
// Named in the packages; their own menu page (12) was not supplied.
const KOBEBA_AND_HAWAWSHI = ["Mini kobeba", "Mombar balls", "Mini hawawshi"];
const MINI_BITE_FILLINGS = [
  "Basterma with Kiri",
  "Blue cheese with Kiri",
  "Hot dog",
  "White cheese with mint",
];
const DESSERT_BITES_AND_CUPS = [
  "Mini profiteroles",
  "Mini Nutella brownies",
  "Mini cakes with fondant glaze",
  "Mini baklawa with Nutella or nuts",
  "Mini chocolate chip cookies",
  "Mini cheesecake",
  "Mini batata crème brûlée",
  "Mini tiramisu",
];

/**
 * Finger food is sold by the kilo, by the piece, or as a package for a guest
 * count. None of it follows the event ladder: for an event the customer orders
 * more kilos, or the package sized for the table, rather than a scaled tray.
 */
const FROZEN_FOR_EVENTS: SeedEventPricing = {
  enabled: false,
  note: "Sold frozen, by the tray or the piece, so it costs the same at an event as in a normal order — the customer orders more trays.",
};

const FLAT_FOR_EVENTS: SeedEventPricing = {
  enabled: false,
  note: "Finger food is ordered by the kilo, by the piece or as a package, so it costs the same at an event as in a normal order.",
};


export const CATALOGUE: SeedCategory[] = [
  {
    slug: "main-courses",
    name: "Main Courses",
    groups: ["Meat", "Poultry", "Seafood"],
    products: [
      {
        slug: "stuffed-pigeons",
        groups: ["Poultry"],
        name: "Stuffed Pigeons",
        price: 2000,
        unit: "3 pairs / 6 pigeons",
        allergens: ["nuts", "gluten"],
        options: [
          {
            name: "Stuffing",
            choices: ["Freek, raisins & nuts", "Rice, raisins & nuts"],
          },
        ],
      },
      {
        slug: "stuffed-chicken-lesan-asfour",
        groups: ["Poultry"],
        name: "Stuffed Chicken with Lesan Asfour",
        price: 650,
        allergens: ["gluten"],
        unit: "Serves 2",
      },
      {
        slug: "egyptian-fattah-moza",
        groups: ["Meat"],
        name: "Egyptian Fattah with Moza",
        price: 2200,
        allergens: ["gluten"],
        unit: "Serves 5",
      },
      {
        slug: "lebanese-fattah-chicken",
        groups: ["Poultry"],
        name: "Lebanese Fattah with Chicken",
        description:
          "With chicken and yogurt, served with basmati rice, almonds & fried Lebanese bread.",
        price: 2000,
        unit: "Serves 5",
        allergens: ["nuts", "dairy", "gluten"],
      },
      {
        slug: "sweet-sour-shrimps",
        groups: ["Seafood"],
        name: "Sweet & Sour Shrimps",
        price: 3000,
        unit: "1 kg / serves 5",
        allergens: ["seafood", "gluten", "soy"],
        options: [
          { name: "Served with", choices: ["Basmati rice", "Noodles with vegetables"] },
        ],
      },
      {
        slug: "sweet-sour-chicken",
        groups: ["Poultry"],
        name: "Sweet & Sour Chicken",
        price: 1000,
        allergens: ["gluten", "soy"],
        unit: "1 kg / serves 5",
        options: [
          { name: "Served with", choices: ["Basmati rice", "Noodles with vegetables"] },
        ],
      },
      {
        slug: "roast-fakhda",
        groups: ["Meat"],
        name: "Roast Fakhda",
        price: 6500,
        unit: "Serves 10–12",
        allergens: ["nuts"],
        options: [{ name: "Served with", choices: RICE_3 }],
      },
      {
        slug: "roast-turkey",
        groups: ["Poultry"],
        name: "Roast Turkey",
        price: 6500,
        unit: "Serves 10–12",
        allergens: ["nuts"],
        options: [{ name: "Served with", choices: RICE_3 }],
        note: "Confirm this is distinct from Roast Turkey Breasts.",
      },
      {
        slug: "roast-salmon-side",
        groups: ["Seafood"],
        name: "Roast Salmon Side",
        price: 3800,
        unit: "Serves 10–12",
        allergens: ["nuts", "fish", "dairy"],
        options: [
          {
            name: "Served with",
            choices: [
              "Mixed rice, almonds & cranberries",
              "Coconut basmati rice",
              "Grilled vegetables",
              "Creamy spinach",
            ],
          },
        ],
      },
      {
        slug: "grilled-shrimps",
        groups: ["Seafood"],
        name: "Grilled Shrimps",
        price: 3000,
        unit: "Serves 5",
        allergens: ["nuts", "seafood", "gluten"],
        options: [
          {
            name: "Served with",
            choices: ["Noodles", "Basmati rice, almonds", "Grilled vegetables"],
          },
        ],
      },
      {
        slug: "duck-shanks",
        groups: ["Poultry"],
        name: "Duck Shanks",
        price: 4500,
        unit: "Serves 6–8",
        allergens: ["nuts", "gluten"],
        options: [
          {
            name: "Served with",
            choices: [
              "Freek & vegetables, almonds",
              "Sha'reya, almonds & cranberries",
            ],
          },
        ],
      },
      {
        slug: "filet-meat",
        groups: ["Meat"],
        name: "Fillet Meat",
        price: 3500,
        allergens: ["dairy"],
        unit: "Serves 5",
        options: [
          { name: "Sauce", choices: SAUCE_4 },
          { name: "Served with", choices: SIDE_2 },
        ],
      },
      {
        slug: "roast-beef",
        groups: ["Meat"],
        name: "Roast Beef",
        price: 3000,
        allergens: ["dairy"],
        unit: "Serves 6–8",
        options: [
          { name: "Sauce", choices: SAUCE_4 },
          { name: "Served with", choices: SIDE_2 },
        ],
      },
      {
        slug: "roast-turkey-breasts",
        groups: ["Poultry"],
        name: "Roast Turkey Breasts",
        description: "With special brown sauce.",
        price: 4000,
        unit: "Serves 8–10",
        allergens: ["nuts"],
        options: [
          {
            name: "Served with",
            choices: [
              "Mixed rice, almonds & raisins",
              "Basmati rice, almonds",
              "Grilled vegetables",
            ],
          },
        ],
        note: "Confirm this is distinct from Roast Turkey.",
      },
      {
        slug: "grilled-kofta-mini-chicken-shish",
        groups: ["Meat", "Poultry"],
        name: "Grilled Kofta with Mini Chicken Shish",
        price: 5000,
        unit: "Serves 10",
        allergens: ["nuts"],
        options: [
          {
            name: "Served with",
            choices: ["Basmati rice & almonds", "Potato wedges"],
          },
        ],
      },
      {
        slug: "swedish-meatballs",
        groups: ["Meat"],
        name: "Swedish Meatballs",
        description: "Served with jasmine rice.",
        price: 1500,
        allergens: ["dairy", "gluten"],
        unit: "Serves 5",
      },
      {
        slug: "chicken-breast-mushroom-mozzarella",
        groups: ["Poultry"],
        name: "Chicken Breast stuffed with Mushroom & Mozzarella in Creamy Spinach White Sauce",
        price: 1500,
        unit: "Serves 5",
        allergens: ["dairy"],
      },
      {
        slug: "lemon-butter-chicken",
        groups: ["Poultry"],
        name: "Lemon & Butter Chicken",
        description: "Served with basmati rice.",
        price: 1300,
        unit: "Serves 5",
        allergens: ["dairy"],
      },
      {
        slug: "tagine-meammar-pigeon-fillet",
        groups: ["Poultry"],
        name: "Tagine Meammar with Pigeon Fillet",
        price: 3000,
        allergens: ["dairy"],
        unit: "Serves 6–8",
      },
      {
        slug: "sharkasia",
        groups: ["Poultry"],
        name: "Sharkasia",
        description: "Served with chicken, Egyptian rice & walnuts.",
        price: 3000,
        unit: "Serves 6–8",
        allergens: ["nuts", "gluten"],
      },
      {
        slug: "heart-kidneys-shareya",
        groups: ["Meat"],
        name: "Heart & Kidneys with Sha'reya",
        description: "Served with sha'reya & almonds.",
        price: 2500,
        unit: "Serves 6–8",
        allergens: ["nuts", "gluten"],
      },
    ],
  },
  {
    slug: "side-dishes",
    name: "Side Dishes",
    products: [
      {
        slug: "sambousek-minced-meat-mozzarella",
        name: "Sambousek with Minced Meat & Mozzarella",
        price: 400,
        unit: "25 pieces",
        allergens: ["dairy", "gluten"],
        note: 'Full sambousek filling list still outstanding — the PDF ended in "..".',
      },
      {
        slug: "sambousek-white-cheese-mint",
        name: "Sambousek with White Cheese & Mint",
        price: 250,
        unit: "25 pieces",
        allergens: ["dairy", "gluten"],
        note: "Full sambousek filling list still outstanding.",
      },
      {
        slug: "mahshi",
        name: "Mahshi",
        description: "Eggplant, zucchini, pepper, onion, potatoes, tomatoes.",
        unit: "1 kg / serves 5",
        variants: [
          { name: "Warak 3enab", price: 600 },
          { name: "Kromb", price: 450 },
          { name: "Mixed — eggplant, green pepper, zucchini & tomato", price: 450 },
          { name: "Onion", price: 450 },
          { name: "Stuffed potato with minced meat", price: 700 },
        ],
      },
      {
        slug: "noodles",
        name: "Noodles",
        unit: "500 g",
        variants: [
          { name: "With vegetables", price: 650 },
          { name: "With chicken", price: 800 },
          { name: "With shrimps", price: 1500 },
        ],
        allergens: ["seafood", "gluten", "egg"],
        note: "Seafood applies to the shrimps variant only — allergens are currently held per product, not per variant, so the warning shows on all three.",
      },
      {
        slug: "spring-rolls",
        name: "Spring Rolls",
        unit: "20 pieces",
        variants: [
          { name: "Plain", price: 500 },
          { name: "With chicken", price: 750 },
          { name: "With shrimps", price: 1000 },
        ],
        allergens: ["seafood", "gluten"],
        note: "Seafood applies to the shrimps variant only.",
      },
      { slug: "basmati-rice", name: "Basmati Rice", price: 500, unit: "1 kg" },
      { slug: "coconut-rice", name: "Coconut Rice", price: 500, unit: "1 kg" },
      {
        slug: "cream-spinach-chicken",
        name: "Cream Spinach with Chicken",
        variants: [
          { name: "Medium — 300 g chicken, serves 4–5", price: 800 },
          { name: "Large — 500 g chicken, serves 6–8", price: 1200 },
        ],
        allergens: ["dairy"],
      },
      {
        slug: "eggplant-rolls-avocado-mozzarella",
        name: "Eggplant Rolls stuffed with Avocado & Mozzarella in Pink Sauce",
        price: 1000,
        unit: "Serves 5",
        allergens: ["dairy"],
      },
      {
        slug: "mushroom-saute",
        name: "Mushroom Sauté with Caramelized Onions & Parsley",
        price: 800,
        allergens: ["dairy"],
        unit: "Serves 4–5",
      },
      {
        slug: "rokak-minced-meat",
        name: "Rokak with Minced Meat",
        // "no ghee" read as "no milk — ghee". Ghee is a milk fat and is
        // declarable as dairy, so the tag stands either way it was meant.
        price: 1000,
        allergens: ["dairy", "gluten"],
        unit: "Serves 6–8",
      },
      {
        slug: "rokak-cones",
        name: "Rokak Cones with Minced Meat, Mozzarella & Tomatoes",
        price: 1200,
        unit: "Serves 6–8",
        allergens: ["dairy", "gluten"],
      },
      {
        slug: "lasagna",
        name: "Lasagna",
        variants: [
          { name: "Medium — serves 4–5", price: 1000 },
          { name: "Large — serves 6–8", price: 1400 },
        ],
        allergens: ["dairy", "gluten", "egg"],
      },
      {
        slug: "negresco",
        name: "Negresco",
        variants: [
          { name: "Medium — serves 4–5", price: 800 },
          { name: "Large — serves 6–8", price: 1100 },
        ],
        allergens: ["dairy", "gluten"],
      },
      {
        slug: "potato-gratin",
        name: "Potato Gratin",
        price: 800,
        unit: "Serves 6–8",
        allergens: ["dairy"],
      },
      {
        slug: "kobeba",
        name: "Kobeba",
        price: 900,
        allergens: ["gluten"],
        unit: "1 kg / approx. 20–21 pieces",
      },
      {
        slug: "mombar-pops",
        name: "Mombar Pops",
        price: 600,
        unit: "Serves 6–8",
      },
      {
        slug: "hawawshi",
        name: "Hawawshi",
        price: 1200,
        allergens: ["gluten"],
        unit: "6 pieces",
        note: "Finger Food lists Hawawshi too, 6 pieces at 800. Confirm which price stands.",
      },
      {
        slug: "mini-hawawshi",
        name: "Mini Hawawshi",
        price: 500,
        allergens: ["gluten"],
        unit: "20 pieces",
        note: "Finger Food lists Mini Hawawshi too, 35–40 pieces at 850. Confirm both should stay.",
      },
    ],
  },
  {
    slug: "finger-food",
    name: "Finger Food",
    groups: ["By the kilo & by the piece", "Packages"],
    products: [
      // --- by the kilo & by the piece --------------------------------------
      {
        slug: "mixed-mini-bites",
        groups: ["By the kilo & by the piece"],
        name: "Mixed Mini Bites",
        description: "Basterma, blue cheese and white cheese, mixed.",
        price: 700,
        unit: "1 kg",
        allergens: ["dairy", "gluten"],
        eventPricing: FLAT_FOR_EVENTS,
      },
      {
        slug: "mini-pizza",
        groups: ["By the kilo & by the piece"],
        name: "Mini Pizza",
        price: 550,
        unit: "1 kg",
        options: [{ name: "Topping", choices: ["Mixed cheese", "Hot dog", "Tuna"] }],
        allergens: ["dairy", "gluten", "fish"],
        note: 'Supplied as "mini pizza with mixed cheese/hotdog/tuna (1 kilo) 550". Read as one topping per kilo; if a kilo is a mix of all three, drop the choice. Fish applies to the tuna topping only.',
        eventPricing: FLAT_FOR_EVENTS,
      },
      {
        slug: "mini-fried-chicken-balls",
        groups: ["By the kilo & by the piece"],
        name: "Mini Fried Chicken Balls with Mozzarella & Cherry Tomatoes",
        price: 850,
        unit: "1 kg",
        allergens: ["dairy", "gluten"],
        eventPricing: FLAT_FOR_EVENTS,
      },
      {
        slug: "salty-profiteroles",
        groups: ["By the kilo & by the piece"],
        name: "Salty Profiteroles",
        unit: "25 pieces",
        variants: [
          { name: "White cheese, mint & apples", price: 400 },
          { name: "Blue cheese & walnuts", price: 600 },
          { name: "Tuna, onions & pickles", price: 600 },
        ],
        allergens: ["dairy", "gluten", "egg", "nuts", "fish"],
        note: "Nuts apply to the walnut filling and fish to the tuna filling only — allergens are held per product, not per filling, so all show on every filling.",
        eventPricing: FLAT_FOR_EVENTS,
      },
      {
        slug: "hawawshi-triangles",
        groups: ["By the kilo & by the piece"],
        name: "Hawawshi",
        description: "Each one cut into triangles.",
        price: 800,
        unit: "6 pieces",
        allergens: ["gluten"],
        note: "Side Dishes also sells Hawawshi, 6 pieces at 1,200. The finger food list supplied says 6 at 800, cut in triangles. Confirm which price stands, or whether these are two different dishes.",
        eventPricing: FLAT_FOR_EVENTS,
      },
      {
        slug: "mini-hawawshi-finger-food",
        groups: ["By the kilo & by the piece"],
        name: "Mini Hawawshi",
        price: 850,
        unit: "35–40 pieces",
        allergens: ["gluten"],
        note: "Side Dishes also sells Mini Hawawshi, 20 pieces at 500. The finger food list supplied says 35–40 pieces at 850. Confirm both should stay.",
        eventPricing: FLAT_FOR_EVENTS,
      },
      {
        slug: "sambousak-finger-food",
        groups: ["By the kilo & by the piece"],
        name: "Sambousak",
        unit: "20 pieces",
        variants: [
          { name: "White cheese & mint", price: 200 },
          { name: "Minced meat & parsley", price: 400 },
          { name: "Triple cheese — mozzarella, cream cheese & cheddar", price: 400 },
        ],
        allergens: ["dairy", "gluten"],
        note: "Side Dishes also sells sambousek at 25 pieces (white cheese & mint 250, minced meat & mozzarella 400). This is the finger food list as supplied, at 20 pieces. Confirm whether both should stay.",
        eventPricing: FLAT_FOR_EVENTS,
      },
      {
        slug: "mini-soiree-buns",
        groups: ["By the kilo & by the piece"],
        name: "Mini Soirée Buns",
        description: "Mini buns for soirée sandwiches.",
        unit: "20 buns",
        variants: [
          { name: "Chicken burger", price: 400 },
          { name: "Beef burger", price: 600 },
          { name: "Grilled kofta", price: 600 },
          { name: "Smoked turkey & cheddar", price: 550 },
          { name: "Chicken pané", price: 400 },
          { name: "Hot dog", price: 450 },
        ],
        allergens: ["dairy", "gluten"],
        note: "Dairy applies to the smoked turkey & cheddar filling only.",
        eventPricing: FLAT_FOR_EVENTS,
      },
      {
        slug: "chicken-shawerma-kilo",
        groups: ["By the kilo & by the piece"],
        name: "Chicken Shawerma",
        description: "Makes 15–17 mini sandwiches.",
        price: 1000,
        unit: "1 kg",
        allergens: ["gluten"],
        eventPricing: FLAT_FOR_EVENTS,
      },

      // --- packages --------------------------------------------------------
      // Each package is the selection the business supplied, with the sections
      // it lists opened up to the finger food pool: the customer chooses the
      // same NUMBER per section as the package carries. What the package lists
      // in full for a section is always in and is said in the description.
      {
        slug: "finger-food-package-50",
        groups: ["Packages"],
        name: "Finger Food Package for 50 Guests",
        description:
          "Savoury finger food for 50 guests, 6–8 pieces each. Choose two buns, two sticks, two cups and two from the kobeba & hawawshi, and pick the filling for the mini bites.",
        price: 20000,
        unit: "For 50 guests",
        options: [
          { name: "Buns", choices: BUNS, pick: { min: 2, max: 2 } },
          { name: "Sticks", choices: STICKS, pick: { min: 2, max: 2 } },
          { name: "Cups", choices: CUPS, pick: { min: 2, max: 2 } },
          { name: "Kobeba & hawawshi", choices: KOBEBA_AND_HAWAWSHI, pick: { min: 2, max: 2 } },
          { name: "Mini bites filling", choices: MINI_BITE_FILLINGS },
        ],
        note: "Allergens depend on what is chosen, so none are tagged on the package itself.",
        eventPricing: FLAT_FOR_EVENTS,
      },
      {
        slug: "finger-food-package-70",
        groups: ["Packages"],
        name: "Finger Food Package for 70 Guests",
        description:
          "Savoury and sweet finger food for 70 guests: 6–8 savoury pieces and 3–5 desserts each. Choose three buns, two sticks, one cup and three desserts. Always in: mini kobeba, mombar balls, mini hawawshi, and mini bites in all four fillings — basterma with Kiri, blue cheese with Kiri, hot dog, and white cheese with mint.",
        price: 50000,
        unit: "For 70 guests",
        options: [
          { name: "Buns", choices: BUNS, pick: { min: 3, max: 3 } },
          { name: "Sticks", choices: STICKS, pick: { min: 2, max: 2 } },
          { name: "Cups", choices: CUPS },
          { name: "Desserts", choices: DESSERT_BITES_AND_CUPS, pick: { min: 3, max: 3 } },
        ],
        note: "Allergens depend on what is chosen, so none are tagged on the package itself.",
        eventPricing: FLAT_FOR_EVENTS,
      },
      {
        slug: "finger-food-package-70-seafood",
        groups: ["Packages"],
        name: "Finger Food Package for 70 Guests, with Seafood",
        description:
          "Savoury and sweet finger food for 70 guests, with smoked salmon and shrimps on the menu: 6–8 savoury pieces and 3–5 desserts each. Choose three buns, three sticks, one cup, two from the kobeba & hawawshi, and four desserts. Always in: mini bites in all four fillings — basterma with Kiri, blue cheese with Kiri, hot dog, and white cheese with mint.",
        price: 60000,
        unit: "For 70 guests",
        options: [
          { name: "Buns", choices: BUNS_WITH_SEAFOOD, pick: { min: 3, max: 3 } },
          { name: "Sticks", choices: STICKS_WITH_SEAFOOD, pick: { min: 3, max: 3 } },
          { name: "Cups", choices: CUPS },
          { name: "Kobeba & hawawshi", choices: KOBEBA_AND_HAWAWSHI, pick: { min: 2, max: 2 } },
          { name: "Desserts", choices: DESSERT_BITES_AND_CUPS, pick: { min: 4, max: 4 } },
        ],
        allergens: ["seafood", "fish"],
        note: "Seafood and fish apply to the smoked salmon and shrimp choices; everything else depends on what is chosen.",
        eventPricing: FLAT_FOR_EVENTS,
      },
    ],
  },
  {
    // The Arabic "أكل جاهز على التسوية" list, translated. Sold frozen, for the
    // customer to cook. Prices as supplied; portions as the owner gave them
    // afterwards — big trays, kilos, and 3 pairs of pigeon.
    // Sambousak and vegetable spring rolls are on the list without a price
    // and are left out until one is given.
    slug: "frozen-ready-to-cook",
    name: "Frozen & Ready to Cook",
    products: [
      { slug: "frozen-macaroni-bechamel", name: "Macaroni Béchamel", price: 1000, unit: "Big tray", allergens: ["dairy", "gluten"], eventPricing: FROZEN_FOR_EVENTS },
      { slug: "frozen-lasagna-minced-meat", name: "Lasagna with Minced Meat", price: 1200, unit: "Big tray", allergens: ["dairy", "gluten", "egg"], eventPricing: FROZEN_FOR_EVENTS },
      { slug: "frozen-negresco", name: "Negresco", price: 900, unit: "Big tray", allergens: ["dairy", "gluten"], eventPricing: FROZEN_FOR_EVENTS },
      { slug: "frozen-cannelloni", name: "Cannelloni", price: 900, unit: "Big tray", allergens: ["dairy", "gluten"], eventPricing: FROZEN_FOR_EVENTS },
      { slug: "frozen-creamy-spinach-chicken", name: "Creamy Spinach with Chicken", price: 900, unit: "Big tray", allergens: ["dairy"], eventPricing: FROZEN_FOR_EVENTS },
      { slug: "frozen-artichoke-mushroom-rose", name: "Artichoke & Mushroom in Rosé Sauce", price: 800, unit: "Big tray", allergens: ["dairy"], eventPricing: FROZEN_FOR_EVENTS },
      { slug: "frozen-grilled-beef-kofta", name: "Grilled Beef Kofta", price: 900, unit: "1 kg", eventPricing: FROZEN_FOR_EVENTS },
      { slug: "frozen-beef-kofta-pane", name: "Beef Kofta Pané", description: "Breaded.", price: 850, unit: "1 kg", allergens: ["gluten"], eventPricing: FROZEN_FOR_EVENTS },
      { slug: "frozen-kofta-dawood-basha", name: "Kofta Dawood Basha", price: 850, unit: "1 kg", eventPricing: FROZEN_FOR_EVENTS },
      { slug: "frozen-marinated-chicken-shish", name: "Marinated Chicken Breast Shish", price: 650, unit: "1 kg", eventPricing: FROZEN_FOR_EVENTS },
      {
        slug: "frozen-chicken-pane-strips",
        name: "Chicken Pané or Strips",
        price: 650, unit: "1 kg",
        options: [{ name: "Cut", choices: ["Pané", "Strips"] }],
        allergens: ["gluten"],
        note: 'Supplied as "فراخ بانيه/ستربس 650" — read as one price, the customer choosing the cut.',
        eventPricing: FROZEN_FOR_EVENTS,
      },
      { slug: "frozen-chicken-kofta-mozzarella", name: "Chicken Kofta with Mozzarella", price: 800, unit: "1 kg", allergens: ["dairy"], eventPricing: FROZEN_FOR_EVENTS },
      { slug: "frozen-stuffed-pigeon", name: "Stuffed Pigeon", price: 900, unit: "3 pairs", note: "The Arabic list said 600; the owner gave 900 for 3 pairs when supplying portions. 900 is used — confirm.", eventPricing: FROZEN_FOR_EVENTS },
      { slug: "frozen-cheese-goulash-tray", name: "Cheese Goulash Tray", price: 750, unit: "Big tray", allergens: ["dairy", "gluten"], eventPricing: FROZEN_FOR_EVENTS },
      { slug: "frozen-minced-meat-goulash-tray", name: "Minced Meat Goulash Tray", price: 850, unit: "Big tray", allergens: ["gluten"], eventPricing: FROZEN_FOR_EVENTS },
      { slug: "frozen-roqaq-minced-meat-mozzarella", name: "Roqaq with Minced Meat & Mozzarella", price: 900, unit: "6 pieces", allergens: ["dairy", "gluten"], eventPricing: FROZEN_FOR_EVENTS },
      { slug: "frozen-goulash-white-cheese-mint", name: "Goulash with White Cheese & Mint", price: 350, unit: "20 pieces", allergens: ["dairy", "gluten"], eventPricing: FROZEN_FOR_EVENTS },
      { slug: "frozen-kobeba", name: "Kobeba", price: 850, unit: "1 kg", allergens: ["gluten"], eventPricing: FROZEN_FOR_EVENTS },
      { slug: "frozen-hawawshi", name: "Hawawshi", price: 800, unit: "6 pieces", allergens: ["gluten"], eventPricing: FROZEN_FOR_EVENTS },
      { slug: "frozen-mombar", name: "Mombar", price: 500, unit: "1 kg", eventPricing: FROZEN_FOR_EVENTS },
    ],
  },
  {
    slug: "salads",
    name: "Salads",
    products: [
      {
        slug: "mushroom-rocca-salad",
        name: "Fresh Mushroom Rocca Salad with Cherry Tomatoes, Apples & Caramelized Walnuts",
        price: 1000,
        unit: "Serves 10",
        allergens: ["nuts"],
      },
      {
        slug: "caesar-salad",
        name: "Caesar Salad with Avocado, Apples, Chicken & Caramelized Walnuts",
        price: 1000,
        unit: "Serves 10",
        allergens: ["nuts", "dairy", "gluten", "egg"],
        note: 'The PDF also listed "cappouci" here; it is absent from the confirmed price list. Confirm whether it was removed.',
      },
      {
        slug: "eggplant-salad",
        name: "Eggplant Salad with Pomegranate & Almonds",
        price: 1000,
        unit: "Serves 10",
        allergens: ["nuts"],
        note: 'The PDF also listed "colored pepper" here; absent from the confirmed list. Confirm.',
      },
      {
        slug: "blue-cheese-salad",
        name: "Blue Cheese Salad with Cherry Tomatoes, Apples & Caramelized Walnuts",
        price: 1000,
        unit: "Serves 10",
        allergens: ["nuts", "dairy"],
        note: 'The PDF also listed "cappouci" here. Confirm.',
      },
      {
        slug: "fattoush",
        name: "Fattoush",
        price: 1000,
        allergens: ["gluten"],
        unit: "Serves 10",
      },
      {
        slug: "tahini",
        name: "Tahini",
        price: 400,
        unit: "Serves 10",
        allergens: ["sesame"],
      },
      {
        slug: "baba-ganoush",
        name: "Baba Ganoush",
        price: 400,
        allergens: ["sesame"],
        unit: "Serves 10",
      },
      {
        slug: "coleslaw",
        name: "Coleslaw",
        price: 400,
        allergens: ["dairy", "egg"],
        unit: "Serves 10",
      },
    ],
  },
  {
    slug: "desserts",
    name: "Desserts",
    products: [
      {
        slug: "tiramisu",
        name: "Tiramisu — Big Bowl",
        price: 1200,
        unit: "Serves 6–8",
        allergens: ["dairy", "gluten", "egg"],
      },
      {
        slug: "batata-gratin",
        name: "Batata Gratin",
        price: 1000,
        allergens: ["dairy"],
        unit: "Serves 6–8",
      },
      {
        slug: "batata-creme-brulee",
        name: "Batata with Crème Brûlée",
        price: 1200,
        unit: "Serves 6–8",
        allergens: ["dairy", "egg"],
      },
      {
        slug: "kunafa-cream",
        name: "Kunafa with Cream",
        price: 700,
        unit: "Serves 6–8",
        allergens: ["dairy", "gluten"],
      },
      {
        slug: "cinnabon-cake",
        name: "Cinnabon Cake",
        price: 800,
        allergens: ["dairy", "gluten", "egg"],
        unit: "Serves 6–8",
      },
      {
        slug: "chocolate-cake",
        name: "Chocolate Cake",
        price: 700,
        allergens: ["dairy", "gluten", "egg"],
        unit: "Serves 6–8",
      },
      {
        slug: "golden-basbousa-cake",
        name: "Golden Basbousa Cake",
        price: 700,
        allergens: ["dairy", "gluten"],
        unit: "Serves 6–8",
      },
      {
        slug: "cheesecake-creme-brulee",
        name: "Cheesecake Crème Brûlée",
        price: 1300,
        unit: "Serves 6–8",
        allergens: ["dairy", "gluten", "egg"],
      },
      {
        slug: "cheesecake-maltesers",
        name: "Cheesecake Maltesers",
        price: 1300,
        unit: "Serves 6–8",
        allergens: ["dairy", "gluten", "egg"],
      },
      {
        slug: "cheesecake-oreo",
        name: "Cheesecake Oreo",
        price: 1300,
        unit: "Serves 6–8",
        allergens: ["dairy", "gluten", "egg"],
      },
      {
        slug: "san-sebastian-cheesecake",
        name: "San Sebastián Cheesecake",
        price: 1300,
        unit: "Serves 6–8",
        allergens: ["dairy", "gluten", "egg"],
      },
      {
        slug: "honey-cake",
        name: "Honey Cake",
        price: 1200,
        allergens: ["dairy", "gluten", "egg"],
        unit: "Serves 6–8",
      },
      {
        slug: "nutella-brownies",
        name: "Nutella Brownies",
        price: 800,
        unit: "24 pieces",
        allergens: ["nuts", "dairy", "gluten", "egg"],
      },
      {
        slug: "om-ali-creme-brulee",
        name: "Om Ali with Crème Brûlée",
        price: 1150,
        unit: "Serves 5",
        allergens: ["dairy", "gluten", "egg"],
      },
      {
        slug: "om-ali",
        name: "Om Ali",
        price: 800,
        allergens: ["dairy", "gluten"],
        unit: "Serves 5",
      },
      {
        slug: "creme-brulee",
        name: "Crème Brûlée",
        price: 800,
        unit: "Serves 5",
        allergens: ["dairy", "egg"],
      },
      {
        slug: "tres-leches",
        name: "Tres Leches",
        unit: "Serves 5",
        variants: [
          { name: "Caramel", price: 1000 },
          { name: "Mango", price: 1000 },
        ],
        allergens: ["dairy", "gluten", "egg"],
      },
      {
        slug: "profiteroles-caramel-custard",
        name: "Profiteroles with Caramel Custard, Croquant & Chocolate Sauce",
        price: 1100,
        unit: "25–30 pieces",
        allergens: ["nuts", "dairy", "gluten", "egg"],
      },
      {
        slug: "mini-bites-baklava-nutella",
        name: "Mini Bites Baklava with Nutella",
        price: 900,
        unit: "30 pieces",
        allergens: ["nuts", "dairy", "gluten"],
      },
      {
        slug: "mini-bites-baklava-hazelnut",
        name: "Mini Bites Baklava with Hazelnut",
        price: 1250,
        unit: "30 pieces",
        allergens: ["nuts", "dairy", "gluten"],
      },
      {
        slug: "mini-baklava-kunafa",
        name: "Mini Baklava with Kunafa Drizzled with Caramel",
        price: 900,
        allergens: ["nuts", "dairy", "gluten"],
        unit: "30 pieces",
      },
      {
        slug: "cheesecake-creme-brulee-blueberries",
        name: "Cheesecake Crème Brûlée with Blueberries",
        price: 1500,
        unit: "Serves 6–8",
        allergens: ["dairy", "gluten", "egg"],
      },
    ],
  },
];
