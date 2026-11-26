# Artoria Costume 01 — EPIC

Price: 100,000 Rubies. Own Artoria first, buy once, then equip or remove freely. All three image slots must load before purchase. Put `art.png`, `idle.png`, `attack.png` here; each may be GIF instead (PNG takes precedence). Reload after publishing.

## Optional costume-specific VFX

Place files in the `vfx/` subfolder and add an `fx` map to this costume definition in `src/characters/heroes/artoria.js`. Example:

```js
{id:'costume_01',name:'คอสตูม 01',rarity:'EPIC',price:100000,
 fx:{skillProjectile:{file:'excalibur.gif',thickness:145,airtimeMs:1100},
     skillHit:{file:'impact.png',size:125,ms:380},
     cleave:{file:'cleave.gif',size:200,ms:380}}}
```

Supported VFX files: GIF, PNG, SVG, WebP. Existing slot geometry and timing are inherited unless overridden; sprite sheet fields may also be set. Missing custom VFX falls back to original. The costume never changes damage or collision logic. Only the equipped player costume changes its VFX. Enemies keep their original assets.

For another costume, create a sibling directory with a unique ID and register it in the hero's `costumes` array. Use `price` for purchasable costumes, `unlock:'hero'` for free ones, or grant through the ownership API. Original art is untouched.
