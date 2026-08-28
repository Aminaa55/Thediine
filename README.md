# The Diine — Catering Website & Order Management System

Website and order management for The Diine, a home-catering business in Egypt.
Replaces manual order-taking over Instagram DMs.

## Status

**Customer experience revised through the cart.** Homepage, menu, product pages,
the five-step event journey and the cart all work against the real catalogue.
Checkout and the admin dashboard are the next phases.

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

Events take a maximum of **100 guests**, enforced by the shared validator used by
both the browser and the server, and backed by the editable `event_max_guests`
setting. Serving setup (returnable or disposable) is chosen on every order. Payment is
recorded, never processed: cash and InstaPay live, card structured but off.
InstaPay verification is separate from order confirmation, and payment status is
independent of order status. Customers cannot self-cancel. English at launch,
with an Arabic field on every name and description.

## Deliberately absent

Nothing has been invented to fill a gap.

- **The logo** — never recreated, redrawn or approximated. `LOGO_SRC` in
  `src/lib/brand.ts` is null until the real asset is supplied; until then the
  header and footer show the name set in the brand typeface.
- **Our Work photographs** — the section and `GalleryImage` model exist and the
  section hides itself entirely when there are none, so no empty frames reach a
  customer.
- **Selling units** — no product has one. Tray sizes, weights and piece counts
  were never supplied, so the field is empty and flagged in admin.
- **Cut-off time, InstaPay details, serving-setup policy** — settings exist with
  empty values rather than made-up defaults.
- **Allergens** — 50 tags, pre-tagged only from ingredients named in the menu
  text, every one marked unreviewed. Gluten and egg are under-tagged on purpose:
  they need recipe knowledge, not menu wording.
- **Delivery areas, fees, time slots, working days** — tables exist, unpopulated.

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
