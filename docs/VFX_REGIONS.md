# VFX regions (v0.20.3)
Combat controls geometry; Studio publishes artwork and appearance only.
- Default point slot: size in reference px, scaleX/scaleY 0.1–5 and rotation -180..180 degrees.
- Beam: declare visual.layout.{projectile|skillProjectile} = "beam" in the hero file. Pierce skillProjectile defaults to beam, from caster to the exact ray endpoint. Ordinary ranged beam goes to the launch target. Thickness 4–300 reference px; horizontal source or vertical top-to-bottom source. Length and angle come from the combat hook, never the upload. Damage, shield bypass, and collision radius remain unchanged.
- Field: declare visual.layout.{area|aftermath|other event} = "field"; a visualEffect call fills arena, with independent width/height multipliers.
- Published or draft src, sheet grid, start row/column, frame count, duration, and appearance parameters override artwork only; a manifest mode cannot override slotLayout. Old entries default to 1x scales, zero rotation, 48px beam thickness, horizontal.
- Hero Trial uses the same runtime. Visual duration is independent of swept projectile damage timing. Do not change hit logic when updating an image.

## Airtime (v0.20.4)
- ms = time for one sprite-sheet cycle (80–3000 ms).
- delayMs = wait from the existing combat event before showing (0–5000 ms).
- airtimeMs = visible duration (0–10000 ms); zero preserves old behavior (ms for point/beam/field, flight for moving projectiles).
- loopFrames = repeat sprite-sheet frames until the region is removed; otherwise hold the final frame. Animated GIF/WebP retain native timing.
- Moving projectiles are always removed when their physical flight ends; explicit airtime can hide them earlier, not delay impact or persist a shot after impact. Regions are removed after delay + airtime. Studio preview uses region timing; Hero Trial shows actual flight limits.
- All values affect appearance only and are stored with the published artwork. Existing manifests remain valid.

## Artoria v0.20.5
Artoria uses the shared pierce/beam slot, plus a separate `cleave` event for normal attacks around the target. Boss damage multiplier is calculated in the shared damage pipeline, independent of artwork and VFX timing. Hero Trial supports a boss dummy.
