/* ซิลิก้า: provisional stats and skills; art slots await your PNG/GIF. */
window.AUTOCHEST_CHARACTERS.registerHero({
  "id": "silica",
  "name": "ซิลิก้า",
  "subtitle": "Dragon Tamer • พีน่าผู้เยียวยา",
  "team": "เวท",
  "role": "HEALER SUPPORT",
  "traits": [
    "ฮีล",
    "บัฟทีม",
    "ระยะกลาง"
  ],
  "cost": 1,
  "hp": 520,
  "dmg": 42,
  "range": 2.5,
  "cool": 1.1,
  "move": 98,
  "skill": "ลมหายใจแห่งชีวิต",
  "effect": "heal",
  "triggerEvery": 3,
  "support": {"healTargets":2,"healHp":0.22,"attackUp":0.15,"speedUp":0.15,"duration":4},
  "passive": {"name":"สายใยแห่งพีน่า","healOnAttack":0.4},
  "col": "#f3b4cf",
  "e": "✦",
  "portrait": "./assets/heroes/silica/art.png",
  "images": {
    "art": "./assets/heroes/silica/art.png",
    "idle": "./assets/heroes/silica/idle.png",
    "attack": "./assets/heroes/silica/attack.png"
  },
  "visual": {
    "scale": 1,
    "walkBob": 6,
    "skillGlow": 1,
    "attackMs": 340
  }
});
