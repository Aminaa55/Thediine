# The Diine — Catering Website & Order Management System

Website and order management for The Diine, a home-catering business in Egypt.
Replaces manual order-taking over Instagram DMs.

## Status

**Customer experience revised through the cart.** Homepage, menu, product pages,
the four-step event journey and the cart all work against the real catalogue,
with event food priced by guest count. Checkout and the admin dashboard are the
next phases.

| | |
|---|---|
| [`docs/spec.html`](docs/spec.html) | **Product specification (rev 3)** — source of truth for scope and business rules |
| [`docs/plan.html`](docs/plan.html) | Original plan — still current for stack, costs and build phases |
| [`docs/source-menu-full-buffet.pdf`](docs/source-menu-full-buffet.pdf) | Menu as supplied (image-only, no text layer) |
| [`prisma/schema.prisma`](prisma/schema.prisma) | Data model |
| [`prisma/catalogue.ts`](prisma/catalogue.ts) | The menu as data — readable, reviewable |
| [`src/app`](src/app) | Customer website — home, menu, product, cart |
| [`preview/index.html`](preview/index.html) | Static clickable preview of the site, for review before deployment |

## The catalogue

À la carte. Every dish is an individual product; there is no buffet package.

| Category | Products | Price rows |
|---|---:|---:|
| Main Courses | 21 | 21 |
| Side Dishes | 19 | 23 |
| Salads | 8 | 8 |
| Desserts | 24 | 25 |
| **Total** | **72** | **77** |

Noodles, Spring Rolls and Tres Leches are single products with priced variants.
Eleven main courses carry required accompaniment choices; all cost 0 EGP, per
instruction. Verified end to end against a real PostgreSQL instance.

## Confirmed business rules

| | Normal | Event |
|---|---|---|
| Minimum notice | 48h, via a daily cut-off | 5 days |
| Daily capacity | 3 orders (pickup included) | manual confirm; Block Day / Keep Day Open |
| Free cancellation until | 24h before | 48h before |
| Late cancellation | 20%, calculated and recorded | 20%, calculated and recorded |
| Minimum order value | none | none |

Event food is **priced by guest count**, separately from normal orders — see
below. Events take a maximum of **100 guests**, enforced by the shared validator used by
both the browser and the server, and backed by the editable `event_max_guests`
setting. A normal order and an event request can exist **at the same time** in one cart,
as separate sections with separate rules — they never merge, and each checks out
under its own terms. Serving setup (returnable or disposable) is chosen on every
order. Payment is
recorded, never processed: cash and InstaPay live, card structured but off.
InstaPay verification is separate from order confirmation, and payment status is
independent of order status. Customers cannot self-cancel. English at launch,
with an Arabic field on every name and description.

## Event pricing

An event portion of a dish is cooked for the whole guest list, so it does not
cost what the same dish costs in a normal order. **Normal orders always use the
stored menu price and are never touched by any of this.**

The shared ladder, as supplied by the business:

| Guests | Multiplier | | Guests | Multiplier |
|---|---|---|---|---|
| 1–10 | 1× | | 51–60 | 3.5× |
| 11–20 | 1.5× | | 61–70 | 4× |
| 21–30 | 2× | | 71–80 | 4.5× |
| 31–40 | 2.5× | | 81–90 | 5× |
| 41–50 | 3× | | 91–100 | 5.5× |

It is **not** hard-coded into any dish. It lives in `EventPriceTier`, one row per
band, editable from admin — so every dish can be repriced at once. Each product
then carries:

| Field | Meaning |
|---|---|
| `basePrice` / variant `price` | The normal order price. Never derived. |
| `eventPricingEnabled` | On by default. Off means events pay the normal price. |
| `eventTiers` | This dish's own bands, **replacing** the shared ladder for it. |
| `eventPricingNote` | Why this dish scales the way it does. Admin-only. |

A product's own bands replace the shared ladder rather than merging with it — a
partial ladder would leave guest counts silently unpriced. Each band carries
either a multiplier or a flat price, so a dish whose ingredient cost does not
scale smoothly can be given real figures instead of a factor.

No dish has been given an exception. All 72 follow the shared ladder until the
business says a particular dish scales differently.

Multipliers are integers (`multiplierBp`, 10000 = 1×) and prices stay in
piastres, so no event price is ever computed through a float. `src/lib/event-pricing.ts`
holds the arithmetic and is used by both the browser and the server: the menu
recalculates instantly when the guest count changes, and `resolveCart` recomputes
the same figures server-side, which is what a customer is actually charged.

Table décor, event setup and serving staff stay **quote-only** and are never in
the food subtotal.

### Still to confirm about event pricing

- Whether the ladder is right for every dish, or which dishes need their own
  bands. Desserts and dishes with expensive ingredients are the likely first
  exceptions.
- What one event "unit" is. The multiplier scales the price of one line; what a
  1× portion physically is remains the unanswered selling-unit question, and a
  customer adding two of a dish gets two scaled portions.
- Whether an event under ten guests should really pay the normal price (1×), or
  carry a minimum.

## Assets

The official logo (`public/brand/`) and four real photographs (`public/gallery/`)
are in place, supplied by the business. The logo is used exactly as given —
never recreated or redrawn — with its flat background keyed out so it sits on any
cream. The photographs are seeded as `GalleryImage` rows with alt text, captions
and ordering, all editable from admin. Our Work hides itself entirely when there
are no images, so a customer never sees an empty frame.

## Deliberately absent

Nothing has been invented to fill a gap.

- **Selling units** — no product has one. Tray sizes, weights and piece counts
  were never supplied, so the field is empty and flagged in admin.
- **Cut-off time, InstaPay details, serving-setup policy** — settings exist with
  empty values rather than made-up defaults.
- **Allergens** — 50 tags, pre-tagged only from ingredients named in the menu
  text, every one marked unreviewed. Gluten and egg are under-tagged on purpose:
  they need recipe knowledge, not menu wording.
- **Delivery areas, fees, time slots, working days** — tables exist, unpopulated.
- **Per-dish event scaling** — the structure is there, no dish has been given an
  exception, because none has been supplied.

Items still open are listed in section 10 of the spec.

## What the website does

- **Homepage** with the two paths: *Order from The Diine* and *Plan an Event*.
- **Menu** across all four categories, with a sticky category strip, plus a page
  per category.
- **Product pages** with required choices, priced variants, allergens, quantity,
  special instructions and Add to Cart. Price updates live; Add to Cart stays
  locked until every required choice is answered.
- **Cart** showing each line's chosen options, editable quantities, removal and
  a subtotal.

Every dish, price, choice and category comes from the database. Nothing about the
menu is written into the interface, so admin edits appear on the site immediately.

**Missing information is omitted, never shown as a placeholder.** Selling units and
serving sizes are absent from the catalogue, so the customer simply does not see
them — no "TBD" reaches a customer.

**Product photography** is not yet supplied. Each dish shows a branded placeholder
derived from its name; setting `Product.imageUrl` replaces it with a photograph
with no code change.

**The cart stores references, not prices.** Only ids and quantities go into the
browser; every name and price is resolved from the database each time the cart is
shown, so a stale cart can never display an old price.

## Running it locally

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL
npm run db:push               # create the tables
npm run db:seed               # load the catalogue
npm run dev                   # http://localhost:3000
```

`npm run db:seed` is idempotent — products are matched on slug, so re-running
updates rather than duplicates, and never overwrites a setting you have edited.

## Notes on the data model

- **Money is integer piastres.** 1,250 EGP is stored as `125000`. This removes a
  class of rounding error from order totals; prices are entered in pounds.
- **Orders snapshot themselves.** Dish names, prices and chosen options are
  copied onto the order when it is placed, so editing the menu never rewrites
  order history.
- **Order status and payment status are separate fields.** A delivered order can
  be unpaid.
- **Inventory is modelled but has no screens.** `Ingredient`, `RecipeItem` and
  `StockMovement` exist so recipe-based stock deduction can be added later
  without altering anything else.
