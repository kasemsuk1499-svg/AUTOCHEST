# SAO Hero Data Format — AUTOCHEST v0.9

One character file per hero, one image folder per hero, and the **same files are used for allies and enemies**.

| ID | Name | Class | Cost | Skill | Effect |
|---|---|---|---:|---|---|
| asuna | อาสึนะ | นักรบ | 3 | แฟลชสไตรค์ | slash |
| kirito | คิริโตะ | นักรบ | 2 | ดาบคู่ทะลวง | slash |
| sinon | ชิน่อน | ยิงไกล | 2 | กระสุนพิฆาต | triple |
| lisbeth | ลิซเบธ | ป้องกัน | 1 | ค้อนสะท้าน | slam |
| deathgun | เดธกัน | นักรบ | 3 | เงาพิฆาต | blink |
| heathcliff | ฮีทคลิฟฟ์ | ป้องกัน | 3 | ปราการไร้พ่าย | shield |
| silica | ซิลิก้า | เวท | 1 | ลมหายใจพีน่า | chain |

## Asset slots — files to upload
Create/replace these files inside `assets/heroes/<id>/`:
- `art.png`: character illustration for shop and inspector
- `idle.png`: chibi standing/walking model
- `attack.png`: chibi attack pose

All three accept `.png` or `.gif`. For GIF upload the GIF then change the corresponding path in `src/characters/heroes/<id>.js`. User-provided artwork is not generated or replaced automatically.

The 6 new characters use **temporary PNG placeholders**, not authentic anime artwork. Asuna keeps the existing artwork. Replacing placeholder PNGs with the same filenames requires no code changes.

## Code structure
Each file uses `window.AUTOCHEST_CHARACTERS.registerHero({id,name,subtitle,team,cost,hp,dmg,range,cool,move,skill,effect,triggerEvery,col,portrait,images,visual})`.

Optional fields: `critChance` 0..1; `critDamage` multiplier; `traits` descriptive UI labels; `chainTargets`, `chainPower` apply to `chain` effect.

- `cost`: 1/2/3 Gold tiers
- `cool`: seconds between basic attacks; smaller is faster
- `triggerEvery`: every N attacks triggers special effect
- `visual.attackMs`: model attack sprite exposure, 100–5000 ms
- `visual.scale`: hero model scale
- All skills and stars are handled by shared combat engine in `src/game.js`
- Adding future hero: register file in `index.html` before `src/game.js`
- All new heroes also become eligible enemies according to tier/wave progression

The initial kits of Kirito, Sinon, Lisbeth, Death Gun, Heathcliff and Silica are provisional, for future adjustment.
