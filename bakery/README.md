# The Cozy Loaf — customer site

A single self-contained page. One HTML file, no build step, no server, no
database. Open `index.html` in a browser and it works.

## What it does

- Shows the two loaves with their real baking figures (hydration, flour blend,
  ferment times) and prices.
- Works out the next open bake days from the schedule, and counts down to the
  order cut-off.
- Takes an order: loaves and quantities, bake day, collection time, name, phone,
  email and notes.
- **Emails the completed order to the owner** and shows the customer a
  reference and a summary of what happens next.

No payment is taken and there is no admin side — the owner's inbox is the
order book.

## Editing it

Everything you would want to change lives in the `BAKERY` object at the top of
the `<script>` block near the bottom of `index.html`. Nothing below that object
needs touching.

| What to change | Where |
|---|---|
| Bakery name, tagline, currency | `name`, `tagline`, `eyebrow`, `currency` |
| Address, phone, email, Instagram, map link | `ownerEmail`, `phone`, `phoneDisplay`, `address`, `mapUrl`, `instagram` |
| The two loaves — names, prices, descriptions, specs | `loaves` |
| Take a loaf off sale for a bake | set that loaf's `soldOut: true` |
| Bake days and cut-off | `bakeDays`, `cutoffDays`, `cutoffHour` |
| Collection times | `pickupSlots` |
| Batch-size note, collection hours, the four steps | `capacityNote`, `hours`, `steps` |

`bakeDays` uses `0` for Sunday through `6` for Saturday, so `[3, 6]` is Wednesday
and Saturday. Add a third number and a third bake day appears everywhere —
the countdown, the date list and the order form all follow.

## Getting the order emails

Out of the box (`orderEndpoint: ""`), pressing **Place order** opens the
customer's own email app with the whole order already written out and addressed
to `ownerEmail`. They press send. This needs no sign-up and works today, but it
depends on the customer having email set up on their device.

For orders to land in the inbox by themselves:

1. Sign up at [web3forms.com](https://web3forms.com) — free, and it just relays
   form submissions to an email address.
2. Give it the owner's address; they email back an access key.
3. In `index.html`, set `accessKey` to that key and
   `orderEndpoint` to `"https://api.web3forms.com/submit"`.

A [Formspree](https://formspree.io) endpoint works too: put the
`https://formspree.io/f/xxxxxxx` URL in `orderEndpoint` and leave `accessKey`
empty. If the send ever fails, the page falls back to the email app and shows
the customer their order text so nothing is lost.

## The two images

The logo and the hero photograph live in `assets/` — see
[`assets/README.md`](assets/README.md) for the two filenames the page expects.
Both are optional: if a file is not there, the page hides that slot cleanly
instead of showing a broken image.

## Putting it online

It is one static file, so anywhere will host it free:

- **Netlify / Vercel** — drag the `bakery` folder onto the dashboard.
- **GitHub Pages** — enable Pages on this repo and point it at `/bakery`.
- **Any web host** — upload `index.html`.

Then point the domain at it.

## Notes

- The page follows the visitor's light or dark setting.
- Fonts come from Google Fonts; if they fail to load the page falls back to
  system faces and still reads correctly.
- The palette is taken from the logo — ivory ground, terracotta, sage and a
  blush accent — and holds together in dark mode too.
- Addresses, phone numbers, loaf names and prices in the file are still
  placeholders. Replace them before going live.
