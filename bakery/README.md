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

## Ordering and checkout

The three delivery rules sit directly above the basket, where a customer reads
them before choosing:

- Minimum 48 hours notice is required for all orders.
- Delivery is available within Cairo only.
- Delivery fee varies depending on location.

There is no pickup option and no address or phone number anywhere on the page.

Basket → **Continue to delivery details** → checkout form → receipt.

Checkout collects full name, mobile, delivery address, area, preferred delivery
date and optional notes. The date input's `min` is set from
`SETTINGS.minNoticeHours`, so dates inside the 48-hour window cannot be picked,
and the same rule is re-checked on submit.

The receipt shows items and quantities, subtotal, **Delivery fee: To be
confirmed**, total before delivery, the customer's details and the delivery
date. No delivery fee is ever invented.

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
bakery never sees it. Until `ownerEmail` or `orderEndpoint` is filled in, no
order actually reaches you. One line changes that.

## Still needed

Black Olive Sourdough description · the two image files · an email address or
form endpoint for orders · storage/care wording if that section should return.
