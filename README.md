# AUTOCHEST — SAO Character Roster v0.9 ⚔️

Single-player Chibi Auto Battler fan prototype. All characters use one roster for allies, enemies and boss variants.

## Playable roster (7)
- **อาสึนะ (Asuna)** — นักรบ ราคา 3; โจมตีเร็ว / คริ 35%, ใช้รูปที่ผู้เล่นอัปโหลดไว้แล้ว
- **คิริโตะ (Kirito)** — นักรบ ราคา 2; ดาบคู่ โจมตีเร็ว
- **ชิน่อน (Sinon)** — ยิงไกล ราคา 2; สไนเปอร์ คริ
- **ลิซเบธ (Lisbeth)** — ป้องกัน ราคา 1; ค้อนโจมตีเป็นบริเวณ
- **เดธกัน (Death Gun)** — นักรบ ราคา 3; ลอบสังหารว่องไว + คริ
- **ฮีทคลิฟฟ์ (Heathcliff)** — ป้องกัน ราคา 3; ตั้งโล่และความทนทาน
- **ซิลิก้า (Silica)** — เวท ราคา 1; พีน่า / โจมตีเชื่อมต่อหลายเป้าหมาย

สกิลและค่าสเตตัสของทั้ง 6 ตัวใหม่เป็น **ต้นแบบชั่วคราว** สำหรับทดสอบ ไม่ใช่ชุดสกิลสุดท้าย

## Add your own PNG / GIF
โฟลเดอร์ภาพทั้ง 6 ตัวใหม่มี **placeholder PNG รูป ?** ทั้งสามสถานะ เตรียมไว้ให้เล่นได้ก่อนใส่ภาพจริง:

```text
assets/heroes/kirito/{art.png,idle.png,attack.png}
assets/heroes/sinon/{art.png,idle.png,attack.png}
assets/heroes/lisbeth/{art.png,idle.png,attack.png}
assets/heroes/deathgun/{art.png,idle.png,attack.png}
assets/heroes/heathcliff/{art.png,idle.png,attack.png}
assets/heroes/silica/{art.png,idle.png,attack.png}
assets/heroes/asuna/{art.png,idle.png,attack.png}  (real images preserved)
```

อัปโหลดภาพ PNG ชื่อเดิมทับ placeholder ได้ทันที โดยไม่ต้องแก้โค้ด หากใช้ GIF ให้เพิ่มไฟล์ `art.gif`, `idle.gif` หรือ `attack.gif` แล้วแก้ path ในไฟล์ JS รายตัวให้เป็น .gif; ทั้งสามช่องรองรับ PNG/GIF

## Game mechanics
- ซื้อจากร้าน, ลากตัวลงสนาม, รวมฮีโร่เหมือนกัน 3 ตัวเพิ่มดาว, PvE waves, บอสทุก 3 เวฟ
- ศัตรูใช้ภาพและสกิลเดียวกับฮีโร่ เพียงคูณค่าสเตตัสและสเกลโมเดลตามเวฟ
- สารานุกรมค้นหา, กรองสาย/ราคา, เฉพาะฮีโร่ที่มี, แสดง 12 ตัวต่อหน้า
- กดดูสเตตัส/สกิลก่อนซื้อหรือหลังซื้อได้ตลอด ไม่ต้องจ่าย Gold เพื่อเปิดดู
- เริ่มต้นด้วย **ลิซเบธและซิลิก้า** บนสนาม และ **คิริโตะ** สำรอง

## Verify
`node scripts/verify-roster.cjs` และ `node scripts/test-gif-contract.cjs`

```text
index.html
src/game.js
src/characters.js
src/characters/heroes/{asuna,kirito,sinon,lisbeth,deathgun,heathcliff,silica}.js
assets/heroes/<id>/{art.png,idle.png,attack.png}
src/styles.css
docs/CHARACTER_SYSTEM.md
docs/GAME_DESIGN.md
```

Old original characters were removed from active roster and repository files. They can still be restored from Git history if needed.

## v0.10 — Death Gun: Stealth Sniper (finalized kit)

- สาย **ยิงไกล / สไนเปอร์พรางตัว** ราคา 3 G; HP 430, ATK 118, ระยะ **4.7 ช่อง**, ยิงทุก 1.28 วิ, เดินเร็ว 82
- คริ 28%; ดาเมจคริ ×2.0
- ทุก 4 การโจมตีเข้าสู่พรางตัว 2 วิ; ไม่ถูก AI เลือกเป็นเป้าหมายใหม่ และงดยิงระหว่างพราง (ยังเคลื่อนที่ได้)
- นัดแรกหลังพราง: ยิง **170% ATK**, โอกาสคริเพิ่ม **+50 จุดเปอร์เซ็นต์** (รวม 78%)
- หากเป้าหมาย HP ต่ำกว่า 35% เมื่อกระสุนกระทบ ดาเมจเพิ่ม 20%
- กระสุนที่เล็งไว้ก่อนเริ่มพรางยังยิงโดนได้; การพรางป้องกันการล็อกเป้าหมาย **ใหม่** เท่านั้น
- ทั้งฮีโร่ฝั่งเราและศัตรูใช้สกิลเดียวกัน และยังรองรับ PNG/GIF Art, Idle, Attack

## v0.11 — Fixed the combat AI standing idle at attack range

- Corrected floating-point asymptotic movement that could stop just **outside** attack range forever (even when a hero looks close enough).
- Combat accepts a **3-pixel** range tolerance and moves into firing range in finite steps.
- When every enemy is cloaked, heroes stop the walking animation and resume pursuing when a target becomes visible again.
- Stealth duration now advances with combat speed (including ×2 mode).
- Characters face the target before attacking. Verified long-range and melee units in regression scenarios.

## v0.12 — Casual PvE balance (ปรับมอนให้น่าเล่นขึ้น)

ลดจำนวนและความแข็งแกร่งของศัตรู โดยไม่เปลี่ยนสกิล/ระยะยิง/ภาพของฮีโร่ฝั่งเรา:

| ค่า | เดิม | ใหม่ |
|---|---:|---:|
| HP ศัตรูเวฟ 1 | ×0.62 | ×0.55 |
| ATK ศัตรูเวฟ 1 | ×0.69 | ×0.56 |
| HP เพิ่มต่อเวฟ | +0.13 | +0.07 (สูงสุด ×1.45) |
| ATK เพิ่มต่อเวฟ | +0.10 | +0.05 (สูงสุด ×1.20) |
| HP บอส (คูณค่าศัตรูเวฟนั้น) | ×2.4 | ×1.80 |
| ATK บอส (คูณค่าศัตรูเวฟนั้น) | ×1.40 | ×1.12 |
| จำนวนมอนเวฟ 1 / 3 / 6 / 9 | 3 / 3 / 4 / 5 | 2 / 2 / 3 / 4 |
| จำนวนมอนสูงสุด | 8 | 6 |

บอสยังเกิดทุก 3 เวฟและตัวใหญ่เท่าเดิม แต่ลูกน้องจะสุ่มตัวระดับ Common/ราคา 1 ได้บ่อยขึ้น ไม่รุมตัวราคา 3 จำนวนมากตั้งแต่เวฟ 5 ค่าปรับทั้งหมดอยู่ที่ `ENEMY_SCALING` ใน `src/game.js` และมีสคริปต์ทดสอบ `node scripts/test-wave-balance.cjs`

## v0.13 — TFT-inspired SOLO systems (Phase 1)

- 100 HP player health, losing rounds subtract HP; run ends at 0 HP (restart available)
- Level 3 start / max 8, team size = level. Passive +2 XP per round, buy +4 XP for 4 G. XP thresholds 3→4=6, 4→5=10, 5→6=18, 6→7=26, 7→8=38
- 5-card shop, level-weighted rarity for cost 1/2/3, reroll 2 G, shop lock between rounds
- End-of-round Gold: +5 base, +1 interest per saved 10 Gold (max +5), +1 on win, streak bonus +1 from 2 consecutive results / +2 from 4+
- Sell heroes at cost ×3^(stars−1) when preparing; keep 3-copy automatic star combining
- Real class synergy from 2 **distinct** deployed champions: Warrior ATK +15%, Mage ATK +20%, Ranged attack cooldown ×0.85, Defender HP +20%. Only one mage exists yet, so its tier is future-ready
- Keep SAO art, battle effects, boss every third wave, previous enemy balance, inspector and GIF support
- **Not implemented yet:** timed planning, hex board, loot/item crafting, augments, carousel or PvP. This is our own single-player strategy mode, not a one-to-one TFT reproduction

Test solo strategy rules: `node scripts/test-tft-core.cjs`

## v0.13.1 — Clear XP purchases and one-click leveling

Previously a single +4 XP purchase at Level 3 did not increase level immediately because 6 XP is needed, making leveling appear broken. Two options are now displayed:
- **ซื้อ +4 XP (4 G):** accumulates XP; a clear hint shows how many XP remain until the next level.
- **อัปเลเวลทันที:** spends the minimum whole +4 XP purchases needed to reach the next level in one click, with the exact Gold cost shown. At 0/6 XP on Level 3, it costs 8 G and leaves 2/10 XP after upgrading to Level 4.
Both buttons work in planning, battle, and result phases; deployment remains preparation-only. Both disable when Gold is insufficient, the player reaches Level 8, or the run has ended.

## v0.13.2 — Avoid blank screens caused by mixed cached releases

- All deferred gameplay scripts and the stylesheet carry the same release query version (`?v=0.13.2`), forcing browsers to download a compatible JS/CSS set when the HTML updates instead of mixing old and new files.
- Early startup diagnostics show a visible, user-friendly error banner and a cache-busting **โหลดเกมเวอร์ชันใหม่** button if startup fails. No more silent blank arena/shop/bench.
- After successful `reset()` the game explicitly marks `window.__AUTOCHEST_READY__=true`.
- Do not assume GitHub Pages deployment or browser cache has updated until the HTML version changes. For stale HTML, use Ctrl+F5 or the provided reload button when visible.
