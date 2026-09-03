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
      },
      {
        slug: "mini-hawawshi",
        name: "Mini Hawawshi",
        price: 500,
        allergens: ["gluten"],
        unit: "20 pieces",
      },
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
