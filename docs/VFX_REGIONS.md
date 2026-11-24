# VFX regions (v0.20.3)
Combat controls geometry; Studio publishes artwork and appearance only.
- Default point slot: size in reference px, scaleX/scaleY 0.1–5 and rotation -180..180 degrees.
- Beam: declare visual.layout.{projectile|skillProjectile} = "beam" in the hero file. Pierce skillProjectile defaults to beam, from caster to the exact ray endpoint. Ordinary ranged beam goes to the launch target. Thickness 4–300 reference px; horizontal source or vertical top-to-bottom source. Length and angle come from the combat hook, never the upload. Damage, shield bypass, and collision radius remain unchanged.
- Field: declare visual.layout.{area|aftermath|other event} = "field"; a visualEffect call fills arena, with independent width/height multipliers.
- Published or draft src, sheet grid, start row/column, frame count, duration, and appearance parameters override artwork only; a manifest mode cannot override slotLayout. Old entries default to 1x scales, zero rotation, 48px beam thickness, horizontal.
- Hero Trial uses the same runtime. Visual duration is independent of swept projectile damage timing. Do not change hit logic when updating an image.
