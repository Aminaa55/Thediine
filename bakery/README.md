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

- Minimum 48 hours notice is required for all orders.
- Delivery is available within Cairo only.
- Delivery fee varies depending on location.

There is no pickup option and no address or phone number anywhere on the page.

Basket → **Continue to delivery details** → checkout form → `confirm.html`.

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

The customer lands on `confirm.html`, which shows the order as
**Received · awaiting confirmation**. Submitting an order never marks it
confirmed — only the bakery does that, once it has spoken to the customer.

A prominent **Confirm on WhatsApp** button opens a click-to-chat link to the
bakery's number with the message already written from the real order: order
number, customer name, products and quantities, requested delivery date, area,
and a request to confirm the order and the delivery fee. The customer only
presses send.

This is a plain `wa.me` link. There is no WhatsApp Business API, no provider
account and no per-message cost.

Set `whatsappNumber` in `config.js`, in full international form, digits only
(`201001234567`). While it is empty the button stays visibly disabled and says
what is missing, rather than opening a broken chat.

The order is saved the moment it is submitted, whether or not the customer ever
presses the button.

### Where orders go

Every placed order is built as a complete record and written to
`localStorage` under `cozyloaf.orders`, then sent onward according to
`SETTINGS` at the top of the script:

| Setting | Effect |
|---|---|
| `ownerEmail` | Opens the customer's email app with the whole order written out |
| `orderEndpoint` + `accessKey` | POSTs the order as JSON — orders arrive in the inbox by themselves (web3forms.com, free) |
| neither set | The order is saved in that browser only and the receipt says so |

**`localStorage` is not an order book.** It is per-browser, per-device, and the
bakery never sees it. And the WhatsApp button only tells you about an order if
the customer actually presses it — some will not.

So `orderEndpoint` is worth setting even with WhatsApp in place. It needs no
domain: web3forms.com sends from its own servers to whatever inbox you name, so
a plain Gmail address is enough. That gives you a record of every order,
pressed button or not.

### Customer email, later

`config.js` has a `customerEmail` block, off by default. Sending mail *as the
brand* needs a domain you own. When there is one, turn it on and wire a sending
service — the templates are already in `emails/`, every order already carries
`customer.email`, and nothing else needs rewriting.

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
