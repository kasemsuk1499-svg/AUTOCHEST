# ✦ AUTOCHEST IDLE — SAO Adventure

A standalone, fan-made **Sword Art Online idle RPG prototype** with gameplay inspired by Seven Knights Idle Adventure (7K Idle), but with original UI, balancing, stage logic and progression. It does **not** clone or host Seven Knights Idle Adventure. No payments, paid pulls or server account services.

**Play:** https://kasemsuk1499-svg.github.io/AUTOCHEST/

## Gameplay (v0.14.1)

1. **Idle auto-hunt:** Asuna, Kirito, Silica and other SAO characters automatically battle field monsters. Receive Gold and Hero EXP every kill.
2. **Stage / Boss:** Defeat 6+ mobs to unlock that stage's boss. Enable Auto Boss or trigger manually. Winning the timed boss battle opens the next stage and grants Rubies, tickets, EXP, and Gold. If it fails, farm and upgrade then retry.
3. **Build your SAO team:** Begin with Asuna, Kirito, Silica. Equip/unequip unlocked heroes or use auto-formation; unlock 5th team slot at stage 5, 6th at stage 12, and 7th at stage 20.
4. **Hero leveling:** Spend Gold + Hero EXP to increase a selected hero's level; ×5 quick upgrades available. Max level 100.
5. **Hero summon:** Use summon tickets first, otherwise 120 in-game Rubies per draw. Summon x1/x10 to unlock any of seven heroes. Repeated copies grant fragments.
6. **Awakening stars:** Spend duplicate fragments and Gold to increase hero star rank (max ★★★★★).
7. **Real time & offline rewards:** Fight automatically while the webpage is active; when you return after absence, claim Gold/EXP calculated from the elapsed time (max 8 hours). Unclaimed offline rewards remain saved across reloads.
8. **Save / resume:** Auto-saves progression locally in the browser's `localStorage`, every few seconds and when leaving. Different devices/browsers do **not** synchronize.
9. **Auto boss / Speed:** Toggle auto boss and select ×1/×2 battle speed. The combat engine supports shared SAO hero PNG/GIF assets.

### Current SAO roster

| ID | Name | Role |
|---|---|---|
| asuna | อาสึนะ | Fast slash / critical |
| kirito | คิริโตะ | Dual swords |
| silica | ซิลิก้า | Dragon-chain magic |
| lisbeth | ลิซเบธ | Hammer area attack |
| sinon | ชิน่อน | Sniper / multishot |
| deathgun | เดธกัน | Long-range sniper, 2-second stealth, ambush critical |
| heathcliff | ฮีทคลิฟฟ์ | Shield defender |

Hero data: `src/characters/heroes/*.js` — images: `assets/heroes/<id>/{art.png,idle.png,attack.png}`. PNG and GIF are supported in hero fields. Individual hero images and skills remain adjustable.

## Files

- `index.html` — **new** Idle RPG entry point (v0.14.1)
- `src/idle-style.css` — responsive Idle RPG presentation
- `src/idle-core.js` — game economy, stage rules, XP, summon, offline rewards
- `src/idle-game.js` — UI, boss battles, autoplay combat, hero skills, save/load
- `idle-preview.html` — separate preview of the Idle RPG
- `legacy-tft.html` — original TFT-inspired autobattler preserved for comparison
- `src/game.js` / `src/tft-core.js` / `src/styles.css` — preserved code for legacy TFT mode

## Tests

```bash
node scripts/test-idle-core.cjs
node scripts/test-idle-release.cjs
```

Chrome headless preview playtest performed on 2026-11-24 with UI actions (10x summon, upgrade hero, auto formation, offline modal, speed ×2) and autonomous progress from stage 1 to stage 4; zero runtime JavaScript exceptions.

### Scope / next steps

This release implements the core idle gameplay, **not** the entire Seven Knights Idle system. Future features could include more hero varieties, real equipment, a main quest chain, daily dungeons, party formations, additional status effects and polished boss animations. It does not provide multiplayer, offline server simulation, cross-device syncing, or an exact recreation of 7K Idle.
