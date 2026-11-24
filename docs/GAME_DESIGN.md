# AUTOCHEST — Game Design v0.9

## Gameplay loop
1. Buy SAO heroes from four-slot shop, inspect skills/stats
2. Deploy up to 4 allied units initially, expands to 8; 9 reserve slots
3. PvE auto battle with movement, basic attacks, auto skills and crit damage
4. Collect gold; combine 3 duplicate same-star heroes to upgrade stars
5. Boss every 3 rounds

## SAO-only cast
Asuna, Kirito, Sinon, Lisbeth, Death Gun, Heathcliff and Silica (7 total).
No original characters remain in the active repository. Six new characters use temporary replaceable PNG art/idle/attack placeholder images.

## Shared models
Allies and enemies use the same hero registry and artwork in `assets/heroes/<id>/`.
Enemy HP, ATK and model size scale by wave; boss applies a further multiplier to an existing hero.
Animation uses still PNG or GIF for each art/idle/attack slot.

## Gallery
Hero Codex supports search, team filter, price filter, owned-only filter and pagination (12 results per page), with lazy character art. Long-press or inspect button opens individual stats/skill details before and after purchase.

## Planned
Replace placeholders with user-supplied artwork and refine SAO-specific skills and balance one character at a time.
