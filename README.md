# The Diine — Catering Website & Order Management System

Website and order management for The Diine, a home-catering business in Egypt.
Replaces manual order-taking over Instagram DMs.

## Status

**Customer site complete, admin under way.** Homepage, menu, product pages, the
four-step event journey, the cart and both checkouts work against the real
catalogue, with event food priced by guest count. Admin covers the day's work:
orders, statuses, payment verification and the kitchen list. Menu management,
settings and analytics are next.

| | |
|---|---|
| [`docs/spec.html`](docs/spec.html) | **Product specification (rev 3)** — source of truth for scope and business rules |
| [`docs/plan.html`](docs/plan.html) | Original plan — still current for stack, costs and build phases |
| [`docs/source-menu-full-buffet.pdf`](docs/source-menu-full-buffet.pdf) | Menu as supplied (image-only, no text layer) |
| [`prisma/schema.prisma`](prisma/schema.prisma) | Data model |
| [`prisma/catalogue.ts`](prisma/catalogue.ts) | The menu as data — readable, reviewable |
| [`src/app`](src/app) | Customer website — home, menu, product, cart, checkout |
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

## Checkout

Two checkouts, never one. A customer holding both a regular order and an event
request sends them separately and gets **two records with two order numbers**;
neither ever merges into the other.

| | Normal order | Event request |
|---|---|---|
| Page | `/checkout` | `/checkout/event` (step four of the event journey) |
| Number | `TD-260829-01` | `EV-260829-01` |
| Written as | `NEW` | `REQUESTED` — a request, never an instant booking |
| Asks | delivery or pickup, date, time, serving setup, name, mobile, optional email, address and area for delivery, payment method | serving setup, name, mobile, optional email, payment method |
| Reviews | every line, subtotal, delivery | occasion, date, time, guests, venue, dishes, food subtotal, the quote-only extras |

The **48-hour notice** and the **three-orders-a-day limit (pickup included)** are
enforced twice: in the browser as you type, and again inside the transaction that
writes the order, where the day's orders are re-counted so two people cannot both
take the last slot. Full days come back to the browser as unavailable, with the
reason. An event request is not counted against the normal daily limit.

Delivery areas and their fees are **configurable and unpopulated**. Until they are
supplied a delivery order records its fee as *unknown* — not zero — the total says
"before the delivery fee", and the customer is told it is confirmed when we call.
Add areas and the fee is charged, the area becomes required, and the wording
disappears on its own.

Time slots work the same way: a list when `TimeSlot` rows exist, a plain time
field until then.

### Payment

Payment status is **independent of order status** everywhere. A delivered order
can be unpaid; confirming a payment never moves an order along.

| Method | At checkout | Payment status when placed |
|---|---|---|
| Cash | Reads "Cash on delivery" or "Payment on pickup", following the fulfilment | `UNPAID` |
| InstaPay | Shows the transfer details and says plainly that choosing it does **not** mean the money arrived; takes an optional transfer reference | `AWAITING_VERIFICATION` |
| Card | **Paused.** Not shown to customers at all — see below | — |

`AWAITING_VERIFICATION → PAID` is a **manual** step. Nothing automatic ever marks
an InstaPay order paid: someone checks the transfer arrived and confirms it. The
transitions live in [`src/lib/payments.ts`](src/lib/payments.ts), which is
deliberately **not** a server action — nothing a customer's browser can reach may
mark an order paid. The admin dashboard calls it in the next phase.

The InstaPay account details are the `instapay_account_details` setting, empty
until supplied and editable from admin — never in the source. **No card details
are collected or stored anywhere.** When card is switched on it goes through a
payment provider, and only the provider's reference is recorded.

The confirmation page is reached by an unguessable token rather than the order
number, so nobody can read someone else's order by counting upwards.

### Card payments — Paymob (paused)

Card is **switched off and hidden**. It does not appear at checkout, not even as
"coming soon", and **no Paymob environment variable is needed for the site to
run**. The integration below is built, tested and untouched, waiting behind one
switch: `CARD_PAYMENTS_PAUSED` in [`src/lib/paymob.ts`](src/lib/paymob.ts). Set it
to `false`, supply the keys, and card comes back exactly as described here.

**The site never sees a card.** Card payments use Paymob's **hosted** Unified
Checkout: the customer is sent to Paymob's own page to enter their card, and the
only things ever stored here are Paymob's own references. No card number, expiry
or CVV touches this site, this server or this database.

The flow:

1. the order is written first, `UNPAID`, so nothing is lost if the payment fails;
2. an *intention* is created with Paymob for that order's exact total, taken from
   the order we just wrote — never from the browser;
3. the customer is redirected to Paymob's hosted checkout;
4. Paymob reports the outcome **twice** — a server-to-server webhook and a signed
   redirect back — and **both are verified by HMAC-SHA512** before anything
   changes.

`POST /api/paymob/webhook` is the authority; `GET /api/paymob/return` handles the
customer coming back and runs the identical verification, so the confirmation page
is right immediately and the flow can be tested before the site has a public URL.
Either way the same four checks must pass before an order is marked paid:

1. the signature verifies (constant-time comparison);
2. the reference matches an order we are expecting to be paid;
3. the amount settled **equals the order's own total**;
4. the transaction is a clean success — not pending, errored, voided or refunded.

A repeated callback is harmless: an order already paid is not paid again. Every
callback is recorded in `PaymentEvent` — verified or forged, applied or not —
with the reason, so there is always a record of what arrived.

**Nothing here can move an order's status.** A paid order is not a confirmed one.

**Test mode is enforced, not assumed.** `PAYMOB_MODE` must be set to `live`
deliberately; anything else means test. A live-looking key while in test mode is
refused outright, checkout shows a **Test mode** badge on the card option with a
plain warning, and the mode is recorded on every order so a test payment can
never be mistaken for a real one.

Card only appears to customers when a provider is fully configured **and** the
`payment_card_enabled` setting is not `"false"`. Missing any one credential and it
falls back to "Coming soon" on its own.

Credentials live in the environment and **never** in the repository — see
[`.env.example`](.env.example) for the names. `PAYMOB_SECRET_KEY` and
`PAYMOB_HMAC_SECRET` are server-only and are never sent to a browser; the build
was checked to confirm none of them reach the client bundle.

## Admin

At `/admin`, behind a password. Never indexed, and the customer chrome stands
down inside it.

| Screen | What it is for |
|---|---|
| **Today** | What is waiting on someone — event requests, payments to verify, new orders — and what is going out today |
| **Orders** | Every order, filtered by type, status, payment status or date, and searchable by number, name or mobile. Filters live in the address, so a view is a link |
| **Order** | Everything about one order, and everything that can be done to it |
| **Kitchen** | What to cook on a day, totalled by dish |

**Order status and payment status are separate panels, on purpose.** Moving an
order along never touches the money, and confirming a payment never moves the
order. Confirming an InstaPay transfer is the manual step the whole payment
design rests on: someone looks at the transfer, sees the money, and says so.

An order only moves along a path it is allowed to take — a pickup order is never
sent "out for delivery" — and the server refuses an illegal jump even if asked
directly. Every move is written into the order's history with who made it.

**Accepting an event request** is where a request becomes a booking, so it is
also where the day is decided: *block the day* closes that date to normal orders,
*keep the day open* leaves them coming. Nothing else in the system blocks a date.

**Cancelling** shows the terms first, records the reason, whether it was inside
the free window, and the late-cancellation charge. The charge is **calculated and
recorded, never collected** — there is no deposit and no card on file, so it is a
note for the conversation that follows.

**The kitchen list** totals the same dish across orders, because that is how it
is cooked, and still lists every order underneath so a special instruction is
never lost inside an aggregate. Only confirmed work appears: an event request
nobody has accepted is not something the kitchen should be cooking.

### Getting in

Admin needs `ADMIN_SESSION_SECRET` (any long random string) and an account:

```bash
npm run admin:create -- "Your Name" you@example.com 'a long password'
```

Passwords are stored as a scrypt hash with a per-password salt — never in plain
text, never reversible, never logged. The session is a signed cookie carrying
only an id and an expiry. Without the secret nobody can sign in, and the customer
site is unaffected.

Each page checks for itself rather than trusting the layout: a layout renders
around a page, it does not stand in front of it. Every action re-checks too,
because a server action is a public endpoint.

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
  Checkout works without them and says the fee is still to be confirmed.
- **InstaPay account details** — the setting exists and is empty. Nothing about
  the account is written into the source.
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
  a subtotal — with the event request as its own section beside it.
- **Two checkouts**, one per order type, each writing its own record with its own
  order number, and a confirmation page that states order status and payment
  status separately.
- **An admin dashboard** for the day's work — see above.

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

## Deploying

The first deployment sets the database up by itself. Vercel runs the
`vercel-build` script, which does four things in order:

```
prisma generate        # the database client
prisma db push         # create any missing tables
tsx prisma/bootstrap.ts  # add any missing data
next build             # build the site
```

`prisma db push` is used WITHOUT `--accept-data-loss`, so it will refuse and fail
the deployment rather than drop a column that holds data.

### The bootstrap only ever adds

[`prisma/bootstrap.ts`](prisma/bootstrap.ts) fills an empty database with the
menu, the categories, the prices, the product options, the allergens, the event
pricing ladder, the settings and the photograph records. It **never updates,
never deletes and never overwrites**, so running it again — on every redeploy —
does nothing at all once the database is set up:

- the menu cannot be duplicated;
- a price, a setting or a caption edited in admin is not reverted;
- a dish added in admin is left alone;
- no real order, order line, customer or payment is touched;
- **no test orders, customers or payments are ever created.**

It is deliberately not the same thing as `npm run db:seed`. The development seed
syncs a local database to `catalogue.ts` by replacing each product's variants and
options wholesale — which gives them new ids and would unpick the link from a
real order that referenced one. That is fine on a laptop and unacceptable on a
live database, which is why deployment has its own path.

The photographs themselves are files in [`public/gallery`](public/gallery) and
ship with the site; the bootstrap only creates the rows that place them.

## Running it locally

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL
npm run db:push               # create the tables
npm run db:seed               # load the catalogue
npm run dev                   # http://localhost:3000
```

`npm run db:seed` syncs a LOCAL database to `catalogue.ts`. It never overwrites a
setting you have edited, but it does replace each product's variants and options,
so it is for development only — a deployed database is set up by
`npm run db:bootstrap`, which only ever adds what is missing.

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
