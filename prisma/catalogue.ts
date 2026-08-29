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
 *  - `unit`             -> deliberately ABSENT everywhere. Selling units
 *                          (tray size, weight, piece count) were not supplied
 *                          and are not guessed. Admin fills them in.
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
export type OptionGroup = { name: string; choices: string[] };
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
  description?: string;
  /** The NORMAL ORDER price, in EGP. Event prices are derived, never stored here. */
  price?: number;
  variants?: Variant[];
  options?: OptionGroup[];
  allergens?: string[];
  note?: string;
  eventPricing?: SeedEventPricing;
};

export type SeedCategory = {
  slug: string;
  name: string;
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

const UNIT_NOTE = "Selling unit not yet supplied.";

export const CATALOGUE: SeedCategory[] = [
  {
    slug: "main-courses",
    name: "Main Courses",
    products: [
      {
        slug: "stuffed-pigeons",
        name: "Stuffed Pigeons",
        price: 1250,
        allergens: ["nuts"],
        options: [
          {
            name: "Stuffing",
            choices: ["Freek, raisins & nuts", "Rice, raisins & nuts"],
          },
        ],
        note: UNIT_NOTE,
      },
      {
        slug: "stuffed-chicken-lesan-asfour",
        name: "Stuffed Chicken with Lesan Asfour",
        price: 1400,
        note: UNIT_NOTE,
      },
      {
        slug: "egyptian-fattah-moza",
        name: "Egyptian Fattah with Moza",
        price: 1850,
        note: UNIT_NOTE,
      },
      {
        slug: "lebanese-fattah-chicken",
        name: "Lebanese Fattah with Chicken",
        description:
          "With chicken and yogurt, served with basmati rice, almonds & fried Lebanese bread.",
        price: 1350,
        allergens: ["nuts", "dairy", "gluten"],
        note: UNIT_NOTE,
      },
      {
        slug: "sweet-sour-shrimps",
        name: "Sweet & Sour Shrimps",
        price: 1650,
        allergens: ["seafood"],
        options: [
          { name: "Served with", choices: ["Basmati rice", "Noodles with vegetables"] },
        ],
        note: UNIT_NOTE,
      },
      {
        slug: "sweet-sour-chicken",
        name: "Sweet & Sour Chicken",
        price: 1300,
        options: [
          { name: "Served with", choices: ["Basmati rice", "Noodles with vegetables"] },
        ],
        note: UNIT_NOTE,
      },
      {
        slug: "roast-fakhda",
        name: "Roast Fakhda",
        price: 3750,
        allergens: ["nuts"],
        options: [{ name: "Served with", choices: RICE_3 }],
        note: UNIT_NOTE,
      },
      {
        slug: "roast-turkey",
        name: "Roast Turkey",
        price: 4500,
        allergens: ["nuts"],
        options: [{ name: "Served with", choices: RICE_3 }],
        note: `${UNIT_NOTE} Confirm this is distinct from Roast Turkey Breasts.`,
      },
      {
        slug: "roast-salmon-side",
        name: "Roast Salmon Side",
        price: 2700,
        allergens: ["fish", "nuts"],
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
        note: UNIT_NOTE,
      },
      {
        slug: "grilled-shrimps",
        name: "Grilled Shrimps",
        price: 2400,
        allergens: ["seafood", "nuts"],
        options: [
          {
            name: "Served with",
            choices: ["Noodles", "Basmati rice, almonds", "Grilled vegetables"],
          },
        ],
        note: UNIT_NOTE,
      },
      {
        slug: "duck-shanks",
        name: "Duck Shanks",
        price: 2100,
        allergens: ["nuts"],
        options: [
          {
            name: "Served with",
            choices: [
              "Freek & vegetables, almonds",
              "Sha'reya, almonds & cranberries",
            ],
          },
        ],
        note: UNIT_NOTE,
      },
      {
        slug: "filet-meat",
        name: "Filet Meat",
        price: 2400,
        options: [
          { name: "Sauce", choices: SAUCE_4 },
          { name: "Served with", choices: SIDE_2 },
        ],
        note: UNIT_NOTE,
      },
      {
        slug: "roast-beef",
        name: "Roast Beef",
        price: 2300,
        options: [
          { name: "Sauce", choices: SAUCE_4 },
          { name: "Served with", choices: SIDE_2 },
        ],
        note: UNIT_NOTE,
      },
      {
        slug: "roast-turkey-breasts",
        name: "Roast Turkey Breasts",
        description: "With special brown sauce.",
        price: 2000,
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
        note: `${UNIT_NOTE} Confirm this is distinct from Roast Turkey.`,
      },
      {
        slug: "grilled-kofta-mini-chicken-shish",
        name: "Grilled Kofta with Mini Chicken Shish",
        price: 1750,
        allergens: ["nuts"],
        options: [
          {
            name: "Served with",
            choices: ["Basmati rice & almonds", "Potato wedges"],
          },
        ],
        note: UNIT_NOTE,
      },
      {
        slug: "swedish-meatballs",
        name: "Swedish Meatballs",
        description: "Served with jasmine rice.",
        price: 1450,
        note: UNIT_NOTE,
      },
      {
        slug: "chicken-breast-mushroom-mozzarella",
        name: "Chicken Breast stuffed with Mushroom & Mozzarella in Creamy Spinach White Sauce",
        price: 1500,
        allergens: ["dairy"],
        note: UNIT_NOTE,
      },
      {
        slug: "lemon-butter-chicken",
        name: "Lemon & Butter Chicken",
        description: "Served with basmati rice.",
        price: 1350,
        allergens: ["dairy"],
        note: UNIT_NOTE,
      },
      {
        slug: "tagine-meammar-pigeon-fillet",
        name: "Tagine Meammar with Pigeon Fillet",
        price: 1500,
        note: UNIT_NOTE,
      },
      {
        slug: "sharkasia",
        name: "Sharkasia",
        description: "Served with chicken, Egyptian rice & walnuts.",
        price: 1500,
        allergens: ["nuts"],
        note: UNIT_NOTE,
      },
      {
        slug: "heart-kidneys-shareya",
        name: "Heart & Kidneys with Sha'reya",
        description: "Served with sha'reya & almonds.",
        price: 1300,
        allergens: ["nuts"],
        note: UNIT_NOTE,
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
        price: 750,
        allergens: ["dairy"],
        note: `${UNIT_NOTE} Full sambousek filling list still outstanding — the PDF ended in "..".`,
      },
      {
        slug: "sambousek-white-cheese-mint",
        name: "Sambousek with White Cheese & Mint",
        price: 650,
        allergens: ["dairy"],
        note: `${UNIT_NOTE} Full sambousek filling list still outstanding.`,
      },
      {
        slug: "mahshi",
        name: "Mahshi",
        description:
          "Eggplant, zucchini, pepper, onion, potatoes, tomatoes.",
        price: 800,
        note: `${UNIT_NOTE} UNRESOLVED: does the customer choose one vegetable, several, or is it always a mixed assortment?`,
      },
      {
        slug: "noodles",
        name: "Noodles",
        variants: [
          { name: "With vegetables", price: 650 },
          { name: "With chicken", price: 800 },
          { name: "With shrimps", price: 1050 },
        ],
        allergens: ["seafood"],
        note: `${UNIT_NOTE} Seafood applies to the shrimps variant only — allergens are currently held per product, not per variant, so the warning shows on all three.`,
      },
      {
        slug: "spring-rolls",
        name: "Spring Rolls",
        variants: [
          { name: "Plain", price: 600 },
          { name: "With chicken", price: 750 },
          { name: "With shrimps", price: 950 },
        ],
        allergens: ["seafood"],
        note: `${UNIT_NOTE} Seafood applies to the shrimps variant only.`,
      },
      { slug: "basmati-rice", name: "Basmati Rice", price: 600, note: UNIT_NOTE },
      { slug: "coconut-rice", name: "Coconut Rice", price: 700, note: UNIT_NOTE },
      {
        slug: "cream-spinach-chicken",
        name: "Cream Spinach with Chicken",
        price: 800,
        allergens: ["dairy"],
        note: UNIT_NOTE,
      },
      {
        slug: "eggplant-rolls-avocado-mozzarella",
        name: "Eggplant Rolls stuffed with Avocado & Mozzarella in Pink Sauce",
        price: 850,
        allergens: ["dairy"],
        note: UNIT_NOTE,
      },
      {
        slug: "mushroom-saute",
        name: "Mushroom Sauté with Caramelized Onions & Parsley",
        price: 750,
        note: UNIT_NOTE,
      },
      {
        slug: "rokak-minced-meat",
        name: "Rokak with Minced Meat",
        price: 900,
        note: `${UNIT_NOTE}`,
      },
      {
        slug: "rokak-cones",
        name: "Rokak Cones with Minced Meat, Mozzarella & Tomatoes",
        price: 950,
        allergens: ["dairy"],
        note: `${UNIT_NOTE}`,
      },
      {
        slug: "lasagna",
        name: "Lasagna",
        price: 1000,
        allergens: ["dairy", "gluten"],
        note: UNIT_NOTE,
      },
      { slug: "negresco", name: "Negresco", price: 950, note: UNIT_NOTE },
      { slug: "vine-leaves", name: "Vine Leaves", price: 750, note: UNIT_NOTE },
      {
        slug: "potato-gratin",
        name: "Potato Gratin",
        price: 700,
        allergens: ["dairy"],
        note: UNIT_NOTE,
      },
      { slug: "kobeba", name: "Kobeba", price: 800, note: UNIT_NOTE },
      { slug: "mombar-pops", name: "Mombar Pops", price: 850, note: UNIT_NOTE },
      { slug: "hawawshi", name: "Hawawshi", price: 850, note: UNIT_NOTE },
    ],
  },
  {
    slug: "salads",
    name: "Salads",
    products: [
      {
        slug: "mushroom-rocca-salad",
        name: "Fresh Mushroom Rocca Salad with Cherry Tomatoes, Apples & Caramelized Walnuts",
        price: 650,
        allergens: ["nuts"],
        note: UNIT_NOTE,
      },
      {
        slug: "caesar-salad",
        name: "Caesar Salad with Avocado, Apples, Chicken & Caramelized Walnuts",
        price: 750,
        allergens: ["nuts"],
        note: `${UNIT_NOTE} The PDF also listed "cappouci" here; it is absent from the confirmed price list. Confirm whether it was removed.`,
      },
      {
        slug: "eggplant-salad",
        name: "Eggplant Salad with Pomegranate & Almonds",
        price: 650,
        allergens: ["nuts"],
        note: `${UNIT_NOTE} The PDF also listed "colored pepper" here; absent from the confirmed list. Confirm.`,
      },
      {
        slug: "blue-cheese-salad",
        name: "Blue Cheese Salad with Cherry Tomatoes, Apples & Caramelized Walnuts",
        price: 750,
        allergens: ["nuts", "dairy"],
        note: `${UNIT_NOTE} The PDF also listed "cappouci" here. Confirm.`,
      },
      { slug: "fattoush", name: "Fattoush", price: 550, note: UNIT_NOTE },
      {
        slug: "tahini",
        name: "Tahini",
        price: 400,
        allergens: ["sesame"],
        note: UNIT_NOTE,
      },
      { slug: "baba-ganoush", name: "Baba Ganoush", price: 450, note: UNIT_NOTE },
      { slug: "coleslaw", name: "Coleslaw", price: 450, note: UNIT_NOTE },
    ],
  },
  {
    slug: "desserts",
    name: "Desserts",
    products: [
      {
        slug: "tiramisu",
        name: "Tiramisu — Big Bowl",
        price: 1400,
        allergens: ["dairy"],
        note: `${UNIT_NOTE} Is "Big Bowl" a size, with other sizes to follow?`,
      },
      { slug: "batata-gratin", name: "Batata Gratin", price: 1050, note: UNIT_NOTE },
      {
        slug: "batata-creme-brulee",
        name: "Batata with Crème Brûlée",
        price: 1250,
        allergens: ["dairy"],
        note: UNIT_NOTE,
      },
      {
        slug: "kunafa-cream",
        name: "Kunafa with Cream",
        price: 1100,
        allergens: ["dairy"],
        note: `${UNIT_NOTE}`,
      },
      { slug: "cinnabon-cake", name: "Cinnabon Cake", price: 1250, note: UNIT_NOTE },
      {
        slug: "lotus-cinnabons-12",
        name: "12 Lotus Cinnabons",
        price: 1350,
        note: "Quantity (12 pieces) is stated in the name — confirm it as the selling unit.",
      },
      { slug: "chocolate-cake", name: "Chocolate Cake", price: 1350, note: UNIT_NOTE },
      {
        slug: "golden-basbousa-cake",
        name: "Golden Basbousa Cake",
        price: 1050,
        note: UNIT_NOTE,
      },
      {
        slug: "cheesecake-creme-brulee",
        name: "Cheesecake Crème Brûlée",
        price: 1450,
        allergens: ["dairy"],
        note: UNIT_NOTE,
      },
      {
        slug: "cheesecake-maltesers",
        name: "Cheesecake Maltesers",
        price: 1450,
        allergens: ["dairy"],
        note: UNIT_NOTE,
      },
      {
        slug: "cheesecake-oreo",
        name: "Cheesecake Oreo",
        price: 1350,
        allergens: ["dairy"],
        note: UNIT_NOTE,
      },
      {
        slug: "san-sebastian-cheesecake",
        name: "San Sebastián Cheesecake",
        price: 1450,
        allergens: ["dairy"],
        note: UNIT_NOTE,
      },
      { slug: "honey-cake", name: "Honey Cake", price: 1300, note: UNIT_NOTE },
      { slug: "lotus-brownies", name: "Lotus Brownies", price: 1100, note: UNIT_NOTE },
      {
        slug: "om-ali-creme-brulee",
        name: "Om Ali with Crème Brûlée",
        price: 1150,
        allergens: ["dairy"],
        note: UNIT_NOTE,
      },
      {
        slug: "tres-leches",
        name: "Tres Leches",
        variants: [
          { name: "Caramel", price: 1300 },
          { name: "Mango", price: 1400 },
        ],
        allergens: ["dairy"],
        note: UNIT_NOTE,
      },
      {
        slug: "profiteroles-caramel-custard",
        name: "Profiteroles with Caramel Custard, Croquant & Chocolate Sauce",
        price: 1300,
        allergens: ["dairy"],
        note: UNIT_NOTE,
      },
      {
        slug: "profiteroles-kunafa-pistachio",
        name: "Profiteroles with Kunafa & Pistachio Sauce",
        price: 1450,
        allergens: ["nuts", "dairy"],
        note: UNIT_NOTE,
      },
      {
        slug: "mini-bites-baklava-nutella",
        name: "Mini Bites Baklava with Nutella",
        price: 1200,
        allergens: ["nuts"],
        note: UNIT_NOTE,
      },
      {
        slug: "mini-bites-baklava-lotus",
        name: "Mini Bites Baklava with Lotus",
        price: 1150,
        note: UNIT_NOTE,
      },
      {
        slug: "mini-bites-baklava-hazelnut",
        name: "Mini Bites Baklava with Hazelnut",
        price: 1250,
        allergens: ["nuts"],
        note: UNIT_NOTE,
      },
      {
        slug: "mini-baklava-kunafa",
        name: "Mini Baklava with Kunafa",
        price: 1150,
        note: `${UNIT_NOTE} Named "Mini" rather than "Mini Bites" — same family, or a different product?`,
      },
      {
        slug: "bonbon-chocolate-box-pistachio-kunafa",
        name: "Bonbon Chocolate Box stuffed with Pistachio Kunafa",
        price: 1450,
        allergens: ["nuts"],
        note: UNIT_NOTE,
      },
      {
        slug: "cheesecake-creme-brulee-blueberries",
        name: "Cheesecake Crème Brûlée with Blueberries",
        price: 1550,
        allergens: ["dairy"],
        note: UNIT_NOTE,
      },
    ],
  },
];
