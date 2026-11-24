# ✦ AUTOCHEST IDLE — SAO Adventure

A standalone, fan-made **Sword Art Online idle RPG prototype** with gameplay inspired by Seven Knights Idle Adventure (7K Idle), but with original UI, balancing, stage logic and progression. It does **not** clone or host Seven Knights Idle Adventure. No payments, paid pulls or server account services.

**Play:** https://kasemsuk1499-svg.github.io/AUTOCHEST/

## Gameplay (v0.15.1)

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

- `index.html` — Idle RPG entry point (v0.15.1)
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

## v0.15.1 — Walk around like an idle adventure

The field now has an animated traveling phase and moving SAO enemies. Instead of a stationary emoji monster, a **shadow copy of one of our seven SAO heroes** is spawned from the same character data, idle/attack PNG or GIF artwork, attack range, cooldown, and skill effect. Bosses are large, aura-marked cost-3 SAO heroes. Stage scaling is still based on `idle-core.js`, so this changes the look and combat behavior without requiring a second enemy asset pack.

**Controls**
- **🏃 AUTO WALK ON:** entire party runs across scrolling scenery between encounters and chases enemies into individual attack ranges on its own.
- **🕹️ MANUAL WALK:** toggles off auto travel/chase. Hold **WASD / arrow keys** or the **four-way D-pad** on the battlefield to walk the whole party manually. When enabled, your party still attacks and uses skills automatically when in range; enemies still approach.
- Holding a direction while Auto Walk is ON temporarily overrides the party's auto movement. Release to resume AI.
- Combat and scene movement honor the ×1/×2 speed button.
- Existing saved games remain compatible; preference is saved in the same browser localStorage slot.

**Verified in live headless Chrome:** v0.15.1 boots with all 7 heroes; MANUAL stops auto walking, KeyD moves the party visibly (31% → 54% battlefield X), AUTO resumes, and the enemy Kirito uses `assets/heroes/kirito/idle.png` and moves toward the party. Zero JavaScript runtime exceptions.

This is a simplified two-dimensional field with responsive camera/parallax and auto fights, not the original Seven Knights Idle source or maps.

## v0.16.0 — Rush battles and the Hero Inspector

- The idle field now spawns **overlapping groups of SAO hero shadows** rather than isolated one-by-one targets. Every shadow independently chases and attacks using its own registered hero sprites and class range. Normal enemy cap is **3** at stages 1–5, **4** at stages 6–10, and **5** from stage 11 onward.
- Each defeat grants Gold and Hero EXP immediately and advances the kill counter (up to the boss unlock requirement). New enemies approach while previous ones remain alive. When ready, the auto-boss starts after the current pack has been cleared; manual boss activation interrupts the pack. The boss is fought alone.
- **Skill Inspector restored:** Tap the **ⓘ** overlay on any hero card, use the **ดูสกิลทั้งหมด** button in character details, or click/tap any allied or enemy hero in the arena. Locked heroes can also be inspected. Current HP/ATK, attack speed, range, crit, skill trigger and effect are shown.
- Inspector descriptions reflect actual **Idle** calculations: 170% ATK on allied offensive skills vs 165% for enemy offensive skills, 30% HP allied shield vs 23% enemy shield, and the configured Death Gun stealth + ambush. Multi-target visual skill variants still deal single-target damage in Idle v0.16.
- Gameplay pauses while the skill detail dialog is open; close with X, Escape, or outside click.
- Live Chrome validation confirmed all 7 hero cards, Death Gun stealth description, allied and enemy hero skill panels, simultaneous rushing enemies, movement/progression to stage 2 and **zero runtime JavaScript exceptions**.

## v0.17.1 — original board + discoverable progression

- Restores the original **6-column × 7-row AUTOCHEST grid** as the actual Idle combat field, with editable squad placement on the **bottom 3 rows**. Click a team hero and an allied board tile to place it, or drag a deployed fighter onto a new tile. Placements persist with the existing Idle save.
- The original auto battler layout is preserved while maintaining ongoing rush waves, stage progression, heroes, spells, summoning, and offline gold/EXP.
- Moves the **hero enhancement dashboard directly below team formation**: level/star badges, real-time HP/ATK, stat gains at the next level/star, shard progress bars, live Gold/EXP costs, missing resource messages, and prominent +1 / up-to-5 level / Star buttons.
- Both formation slots and collection cards show **Lv, Stars, and an upgrade-ready mark**. Buttons automatically become enabled when monster rewards make upgrades affordable. Newly leveled/starred heroes gain combat stats immediately without having to restart a run.
- Improves narrow-screen layout with 2-column currency resources, 6 fully visible board columns (no side scrolling), and a **mobile shortcut to the upgrade panel**, including a live number of upgrade-ready heroes. All scripts and CSS share version `0.17.1`.
- Tests: original grid 42 cells/18 allied cells, click deployment and saved coordinates, level +1 reflected on formation cards, star 1→2 with shard cost and visible output, hero inspector and no Chrome JavaScript exceptions.

## v0.17.2 — enemy AI rush fix

- The allied team now stays on its own side of the original fixed **6×7** board while it auto-attacks. This prevents allied melee heroes from racing into enemy spawn rows and intercepting enemies before they can charge.
- Enemy heroes actually **run out of the spawn lanes and approach the allied frontline**. Ranged/sniper types must reach an engagement line before camping and will **strafe between attacks**. Melee pursuers keep chasing into attack range. Both pause very briefly during their attack animation.
- If all defenders are temporarily invisible (e.g. Death Gun cloak), attackers continue moving toward the last known front line to avoid freezing in place.
- Bosses use the same pursuing AI. Movement and attacks still obey the ×1/×2 speed option. Existing saves, star/level progress, and manual tile deployment are unaffected.

## v0.18.1 — TFT Combat × Idle Progression (current)

The user-facing mode is a hybrid: **classic AUTOCHEST / TFT board combat**, with **Idle-style economy and automated progression**.

- **TFT combat rules:** On the original 6×7 tactical board, units use the original TFT pixel-based range/attack movement (94 px per combat column), targeted tracking projectiles (damage on impact), melee vs ranged roles, retreat/kiting for vulnerable backline shooters, and automatic attack/skill cooldowns. Hero effects restored from the TFT version: multi-shot (Sinon), chain magic (Silica), area hammer (Lisbeth), blink slash, shield and Death Gun stealth ambush.
- **Battle AUTO:** Toggle **⚔️ AUTO ON/OFF** under the battlefield or in Team controls. Auto defaults to ON; it handles fights, loot and boss advancement. When OFF, game combat does not advance.
- **Edit during play:** Press **♟️ จัดทัพ / วางตัว** under the battlefield (or **จัดทัพ** on the team card) to pause battle. Click a unit in the team then choose a friendly square on the bottom three rows; drag a deployed fighter to a new tile; occupied tiles swap positions. Press **จัดทัพเสร็จ** to resume the same encounter.
- **Bench and full-team swapping:** Summon additional heroes with the Idle ticket/ruby system. When the team is full, select an owned reserve in the collection while editing and click the team member you want to replace. The incoming reserve takes that teammate's placement. Current enemies and survivors' combat state are retained.
- **Auto lineup:** The auto-team button selects stronger owned heroes and places defenders in the front row, melee units in the middle and ranged attackers at the rear. Individual levels, stars, hero skills and formation tiles remain visible and saved.
- **Idle economy unchanged:** Gold and Hero EXP from kills; rubies/tickets from stage bosses; idle summons for new heroes and duplicate shards; level-up and star ranks; offline claim rewards; save key `AUTOCHEST_SAO_IDLE_V1` and previous user progress remain compatible.
- **Skills dialog:** Describes actual TFT effects and projectile mechanics, not the former simplified single-target Idle skills.

### Tests

```sh
node scripts/test-idle-core.cjs
node scripts/test-idle-tft-combat.cjs
node scripts/test-idle-release.cjs
```

Browser regression: Classic 42-cell board, formation pause/drag and saved placement, AUTO OFF/ON, live reserve swap (Sinon replacing Kirito on the same tile), auto lineup (Heathcliff/Lisbeth front, Death Gun back), tracked bullets and successful Idle Gold farm / stage advancement; no runtime JavaScript exceptions.
