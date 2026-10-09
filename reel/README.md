# The Reel

A 14-second vertical ad (1080x1920, 30fps) for the website.

Everything in it is real: the screens are screenshots of this app running
against the real catalogue, and the photographs are The Diine's own. No food
imagery is generated, and no price, dish or screen is invented.

## Editing it

`reel.html` is the whole film. It draws a single frame for a given time:

    window.seek(t)      // t in seconds, 0 .. 14

Nothing animates on a clock, so every frame is reproducible. Open the file in a
browser and call `seek()` from the console to scrub.

The timeline lives in one function. Each beat is a `if (t >= a && t < b)` block
with its own easing. `P(t, from, to, easing)` gives eased progress, `lerp`
interpolates, `vblur` is motion blur shaped by speed (zero at rest), and
`breathe` is the slow drift that keeps a held shot from going dead.

## Rendering

Draft first. Always.

    node render.mjs --draft   # 360x640, 12fps, JPEG  -- about 20 seconds
    ffmpeg -framerate 12 -i draft/d%04d.jpg \
           -c:v libx264 -pix_fmt yuv420p -crf 26 draft.mp4

    node render.mjs           # 1080x1920, 30fps, PNG -- about 4 minutes
    ffmpeg -framerate 30 -i frames/f%04d.png \
           -c:v libx264 -pix_fmt yuv420p -crf 18 final.mp4

Both walk the same `seek()` timeline, so a draft shows the real choreography --
only the pixels are cheap. Judge the cut on a draft and spend the four minutes
once, at the end.

A final frame is a 2.07-megapixel lossless PNG; a draft frame is 230k pixels of
JPEG. That is roughly 570 ms a frame against 70 ms, over 420 frames instead of
168 -- about eleven times quicker end to end.

Rendering is deterministic: nothing animates on a clock, so the same input
always gives the same film.

## Re-shooting the screens

`shots/` holds screenshots of the real site at 430x932 @3x. To refresh them,
run the app locally and re-capture; the film picks up the new files with no
other change.
