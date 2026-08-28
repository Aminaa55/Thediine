# The Diine — Catering Website & Order Management System

Website and order management for The Diine, a home-catering business in Egypt.
Replaces manual order-taking over Instagram DMs.

## Status

**Foundations.** The specification is agreed and the data layer is built, verified
and seeded with the real catalogue. The customer website and admin dashboard are
the next phase.

| | |
|---|---|
| [`docs/spec.html`](docs/spec.html) | **Product specification (rev 3)** — source of truth for scope and business rules |
| [`docs/plan.html`](docs/plan.html) | Original plan — still current for stack, costs and build phases |
| [`docs/source-menu-full-buffet.pdf`](docs/source-menu-full-buffet.pdf) | Menu as supplied (image-only, no text layer) |
| [`prisma/schema.prisma`](prisma/schema.prisma) | Data model |
| [`prisma/catalogue.ts`](prisma/catalogue.ts) | The menu as data — readable, reviewable |

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

Serving setup (returnable or disposable) is chosen on every order. Payment is
recorded, never processed: cash and InstaPay live, card structured but off.
InstaPay verification is separate from order confirmation, and payment status is
independent of order status. Customers cannot self-cancel. English at launch,
with an Arabic field on every name and description.

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

Items still open are listed in section 10 of the spec.

## Running it locally

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL
npm run db:push               # create the tables
npm run db:seed               # load the catalogue
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
