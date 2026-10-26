# Gallery scroll synchronization — 2026-10-26

The camera, pin compensation and horizontal rail now read the same subpixel Lenis scroll value during a single R3F frame. The camera samples it at priority -2; the gallery applies its clamped displacement at priority -1. GSAP still handles card entrances and tab transitions. A separate ScrollTrigger scrub no longer controls the pin, avoiding mismatched frame updates and browser scroll rounding.

Validation: production build passed. Chromium wheel-scroll review at 1600x1000 measured 855px horizontal travel, zero vertical pin drift and zero reverse movement, with no page errors. Screenshot: `.local-backups/gallery-smooth-2026-10-26/verified.png`. This verifies motion coordinates, not a hardware frame-rate guarantee.

Run `node scripts/check-gallery-smooth.mjs` with the Vite server on port 5173 to repeat the review.

## Selective rollback

Pre-fix files are in `.local-backups/gallery-smooth-2026-10-26/`:
- `main.tsx` maps to `src/main.tsx`.
- `Gallery.tsx` maps to `src/scene/Gallery.tsx`.

Compare before restoring to preserve any later changes. No assets or dependencies changed for this fix.

Earlier full snapshots remain in `.local-backups/wireframe-2026-10-26-before/` and `.local-backups/interactive-2026-10-26-before/`; use their matching paths selectively rather than overwriting later work wholesale.
