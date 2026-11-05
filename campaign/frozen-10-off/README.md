# Frozen menu · 10% off — Instagram campaign

Paid Instagram creative announcing **10% off the entire Frozen & Ready to Cook
menu until 30 November 2026**. Nothing here touches the website.

## The files — `out/`

| File | What it is |
|---|---|
| `01-feed-post-1080x1350.png` | The main feed post, 4:5. Works alone as the paid ad. |
| `02-carousel-slide-2-1080x1350.png` | Optional second slide: the twenty dishes, grouped by how they are sold. |
| `03-story-1080x1920.png` | The Story, re-composed for 9:16, with Instagram's top and bottom zones left clear. |
| `04-mobile-preview.png` | The three at phone size, in an Instagram-style frame. |
| `*@2x.png` | The same artwork at double resolution, if a sharper upload is wanted. |

## The concept — "The freezer list"

Twenty dish names ARE the appetite appeal. The post is set like a menu card on
the brand's dark ground: the Fraunces headline, the full frozen menu flowing
in the display italic with gold dots between dishes, and one gold stamp —
the kind pressed onto a box — carrying the offer. It stops the scroll on
contrast (the brightest gold circle on the darkest brown in the palette),
reads in two seconds (10% OFF in the stamp, "the entire frozen menu · until 30
November" twice), and sells on the food itself: béchamel, lasagna, kofta,
goulash, hawawshi, read out loud.

Everything is the website's own: Fraunces and Karla, the palette from
`tailwind.config.ts` (ink `#2A1809`/`#3B2310`, creams `#FBF1E4`–`#EBD7B4`,
gold `#A87E2E`/`#C79A3F`), the logo, the gold corner brackets, the pill
button. No homepage layout is copied, no colour or font introduced.

### Why no food photograph

The site's twelve real photographs are of event buffets, sliders, finger food
and desserts. None shows a frozen dish. By the brief's rules nothing was
generated, bought, or borrowed from another product, so the post is
typography-led, and slide 2 lists the real products with their real portions.
The one honest overlap is a chicken shish skewer in an event photograph; it was
left out rather than pass off a buffet shot as a frozen tray.

**Missing, if a photographed version is wanted later:** a tray shot of the
béchamel, lasagna or goulash, and a shot of the kofta or kobeba — frozen or
freshly cooked, on the brand's white dishes, in daylight.

### Three directions were built and compared

| | Concept | Verdict |
|---|---|---|
| A — The freezer list | Dark ground, menu as typography, gold stamp | **Chosen.** Strongest brand voice, best contrast on a phone, the food does the selling. |
| B — The menu as an object | Cream ground, the real website page as a tilted phone card | Honest, but reads as an app ad, and full prices beside a discount confuse. |
| C — The split poster | Huge "10%" on brown over a two-column list on cream | Bold and clear, but the most generic of the three and the list did not fit. |

## Caption

> Good things come frozen. ❄️
>
> Béchamel, lasagna, goulash, kofta, kobeba, hawawshi — twenty dishes made in
> our kitchen, frozen the same day, and cooked in yours when you want them.
>
> The entire frozen menu is 10% off until 30 November.
>
> Order on the website — link in bio. Delivery or pickup.
>
> #TheDiine #FrozenMenu #ReadyToCook #CairoFood #HomeCooked

Shorter, for the Story sticker: **10% off the whole frozen menu · until 30 Nov · tap to order**

## One thing the website does not do yet

There is no discount on the website: the frozen dishes show their full price
and the 10% has to be taken off by the business when the order is confirmed.
Either apply it by hand on each frozen order until 30 November, or ask for a
promotion to be built so the website prices it automatically.

## Rebuilding

    cd campaign/frozen-10-off/src
    node render.cjs feed.html   1080 1350 ../out/01-feed-post-1080x1350.png
    node render.cjs slide2.html 1080 1350 ../out/02-carousel-slide-2-1080x1350.png
    node render.cjs story.html  1080 1920 ../out/03-story-1080x1920.png

`shared.css` holds the brand tokens; `fonts/` holds the site's Google Fonts
files; `src/menu-phone.png` is a real capture of the frozen menu page, kept
for direction B.
