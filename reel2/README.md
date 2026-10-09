# Draft 2 — the camera-journey reel

Draft 1 was built as a sequence of shots that showed and hid themselves. That
is why it played like a slideshow. This one is not a sequence at all.

`reel2.html` builds a single CSS-3D room. Every object — real website
screenshot, real dish card, real photograph, every word — is placed once at a
fixed point `(x, y, z)` and never moves again. A single virtual camera flies
through that room for 12 seconds, and `seek(t)` only ever writes the camera's
transform. Overlap, parallax, off-screen entrances, things growing past the
edge of the canvas: all of it falls out of the geometry rather than being
animated shot by shot.

The camera reverses exactly twice in the whole film: the pull-back at 0.8s and
the rocket-back at 9.3s. Everything else is one continuous forward flight.

Three rules keep it honest:

- **`vis()` / the spent rule.** Once the camera has overtaken something it
  stays gone, even when the camera later reverses, so the pull-back reveals
  what is ahead rather than colliding with what is behind.
- **`scroll()` clamps.** Every screenshot is 2796px tall; scrolling past that
  used to leave a blank cream wall filling the frame.
- **`FOG` and the brightness falloff.** Distance darkens, and the air clears
  for the pull-back so the reveal is lit rather than lost.

## Rendering

    node reel2/render.mjs            # 360x640 @ 12fps preview, ~22 seconds
    node reel2/render.mjs --final    # 1080x1920 @ 30fps, only on request

The preview path uses `zoom` rather than `transform: scale()` on the stage.
With `transform` Chromium rasterises every 3D layer at full 1080p size no
matter how small the viewport is, which is what made the first attempts take
minutes per hundred frames; `zoom` changes the layout size itself, so the
whole room is rasterised small. Removing `will-change` from the objects
mattered for the same reason.

ffmpeg comes from `imageio-ffmpeg`; the build Playwright ships is stripped of
the image2 demuxer and cannot read a frame sequence.

## What is real

Every screen in `shots/` is a screenshot of the live site. Every photograph in
`food/` is the business's own. Every dish name, serving size and price on the
cards is copied from `prisma/catalogue.ts`. `logo.png` is the real logo file.
Nothing here is generated, approximated or invented.
