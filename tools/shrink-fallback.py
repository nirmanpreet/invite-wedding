#!/usr/bin/env python3
"""
Shrink the WebP fallback PNG.

anand-karaj-crop-fallback.png is only ever fetched by a browser with no
WebP support, so it is the least valuable byte on the whole site - and it
was the largest: 943 KB, four times the WebP it stands in for, and 3.7x
wider than the 800px the page actually renders it at.

Two passes, because one is not enough:

  1. Re-encode as an indexed (palette) PNG. The artwork is flat-shaded
     vector art - a 256-colour palette is visually lossless on it and is
     roughly a quarter of the bytes of RGBA.
  2. If it is still over the budget, drop the palette to 128 colours.

The alpha channel is preserved as a separate tRNS entry, which is what
lets the art sit on the parchment instead of in a white box.

This replaces tools/shrink-fallback.mjs, which read a file that no longer
exists (anand-karaj-crop.png) and so could not run at all.

Run: python tools/shrink-fallback.py
"""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "img", "anand-karaj-crop-fallback.png")
BUDGET_KB = 300


def kb(n):
    return n / 1024.0


def attempt(src, dst, colors):
    im = Image.open(src).convert("RGBA")
    # FASTOCTREE keeps the alpha ramp smooth; without an alpha mask the
    # glow behind the canopy bands visibly.
    q = im.quantize(colors=colors, method=Image.FASTOCTREE)
    q.save(dst, format="PNG", optimize=True, bits=8 if colors > 16 else 4)
    return os.path.getsize(dst)


def main():
    before = os.path.getsize(SRC)
    print("  before : %.0f KB  %s" % (kb(before), Image.open(SRC).size))

    tmp = SRC + ".tmp"
    best = None
    for colors in (256, 128, 64):
        size = attempt(SRC, tmp, colors)
        print("  %3d colours -> %.0f KB" % (colors, kb(size)))
        best = (size, colors)
        if size <= BUDGET_KB * 1024:
            break

    size, colors = best
    if size >= before:
        print("  no gain - keeping the original")
        os.remove(tmp)
        return 0

    os.replace(tmp, SRC)
    after = os.path.getsize(SRC)
    print("  after  : %.0f KB  (%d colours, %.0f%% smaller)"
          % (kb(after), colors, 100.0 * (before - after) / before))
    if after > BUDGET_KB * 1024:
        print("  WARNING: still over the %d KB budget" % BUDGET_KB, file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())