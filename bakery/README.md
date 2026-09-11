# The Cozy Loaf — customer homepage

One self-contained HTML file. No build step, no server, no database.

## Palette

| | |
|---|---|
| Espresso `#542916` | All text, every outline and shadow; the marquee band; the footer |
| Porcelain blue `#88B8CE` | Hero ground, the basket, social section |
| Golden yellow `#F1C166` | Nav, ordering section, price badges |
| Terracotta `#A13A1E` | Ticker, buttons, price sticker, errors |
| Milky off-white `#FEFAF0` | Page ground and the breathing space between loud sections |
| Olive `#B79858` | Detail only — the outlined numerals. Never a ground. |

## Typography

**Fraunces** (wonk axis open) for display, **Figtree** for everything practical,
**Caveat** only for the ✎ editor notes.

## Pages

| | |
|---|---|
| `index.html` | The shop — hero, loaves, ordering, checkout |
| `confirm.html` | Order confirmation. A separate page, reached only by placing an order |
| `emails/customer-confirmation.html` | Customer email template |
| `emails/owner-notification.html` | Owner email template |
| `config.js` | Every setting the site has — WhatsApp number, products, prices, rules. Shared by both pages. |
| `build-preview.py` | Folds both pages into one file, for review surfaces that host a single page. Does not affect the live site. |

## Ordering and checkout

The three delivery rules sit directly above the basket, where a customer reads
them before choosing:

- Your order will be delivered within 48 hours.
- Delivery fee will be confirmed separately.

No delivery fee is calculated anywhere on the site. There is no pickup option,
and no bakery address or phone number appears on the page.

Basket → **Continue to delivery details** → `confirm.html`.

Checkout collects full name, mobile, email, delivery address and area. There is
no delivery date: every order is delivered within 48 hours, and the site says so
on the ordering page, in checkout, on the confirmation page and in the customer
email.

**Area is a dropdown**, not free text, built from `deliveryAreas` in
`config.js` — 34 areas grouped by part of the city so the list stays scannable.
That list is the site's statement of where the bakery delivers. Delivery address
stays a separate required field for street, building and apartment.

Checkout collects full name, mobile, **email**, delivery address, area,
preferred delivery date and optional notes. The date input's `min` is set from
`SETTINGS.minNoticeHours`, so dates inside the 48-hour window cannot be picked,
and the same rule is re-checked on submit.

On submit the basket empties and the customer lands on `confirm.html`, which
shows the order number, loaves and quantities, subtotal, **Delivery fee: To be
confirmed**, name, address, area and requested delivery date — and carries no
quantity controls, add-to-basket buttons or editable fields at all. "Order
again" always starts a fresh basket. No delivery fee is ever invented.

The order travels between the two pages in `sessionStorage`, keyed by its
reference, which the URL names. Opening `confirm.html` directly shows a plain
"we could not find that order" state.

### After the order is placed

The customer lands on `confirm.html` and is finished — nothing more is asked of
them. The page shows the order number, "Your order will be delivered within 48
hours", the loaves and quantities, subtotal, delivery fee to be confirmed,
total before delivery, name, address and area, and a single **Back to home**
button.

Nothing technical ever appears there. If a notification fails to reach the
bakery, that is logged to the console for a developer and the customer, who has
successfully placed an order and can do nothing about it, sees a normal
confirmation.

### Where orders go

Every placed order is built as a complete record and written to
`localStorage` under `cozyloaf.orders`, then sent onward according to
`SETTINGS` at the top of the script:

| Setting | Effect |
|---|---|
| `ownerEmail` | Opens the customer's email app with the whole order written out |
| `orderEndpoint` + `accessKey` | POSTs the order as JSON — orders arrive in the inbox by themselves (web3forms.com, free) |
| neither set | The order is saved in that browser only and the receipt says so |

**`localStorage` is not an order book.** It lives in the customer's own browser,
on that one device. The bakery cannot see it, cannot query it, and a customer on
a different phone has a different store entirely. It exists so an order is never
lost between the two pages — it is not storage the business can rely on.

**No notification is wired up yet.** Until `orderEndpoint` points somewhere, an
order is captured and the customer is confirmed, but nobody is told. Both email
templates are ready in `emails/`; what remains is choosing a sending service.

## Email templates

Both live in `emails/` as table-layout HTML with inline styles and the brand
colours. Fraunces and Figtree do not render in most mail clients, so Georgia
takes the display role and Arial the text role.

Merge fields are `{{double_braced}}` so any sending service can fill them.
The customer template says the delivery fee is still to be confirmed and never
implies a final total.

**Nothing sends them yet** — see the notes above on `SETTINGS`.

## Still needed

Black Olive Sourdough description · the two image files · an email address or
form endpoint for orders · storage/care wording if that section should return.
