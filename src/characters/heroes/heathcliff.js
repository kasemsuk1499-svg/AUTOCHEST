/* ฮีทคลิฟฟ์: provisional stats and skills; art slots await your PNG/GIF. */
window.AUTOCHEST_CHARACTERS.registerHero({
  "id": "heathcliff",
  "name": "ฮีทคลิฟฟ์",
  "subtitle": "Holy Shield • ปราการเหล็กแห่งทีม",
  "team": "ป้องกัน",
  "role": "TANK",
  "traits": [
    "สร้างโล่",
    "ยั่วยุ",
    "ลดความเสียหาย"
  ],
  "cost": 3,
  "hp": 1350,
  "dmg": 18,
  "range": 1.05,
  "cool": 1.4,
  "move": 72,
  "skill": "ปราการไร้พ่าย",
  "critChance": 0.05,
  "critDamage": 1.5,
  "guard": {"selfShield":0.4,"allyShield":0.12,"tauntSeconds":3},
  "passive": {"name":"โล่ศักดิ์สิทธิ์","damageReduction":0.25},
  "effect": "shield",
  "triggerEvery": 3,
  "col": "#f0c47b",
  "e": "✦",
  "portrait": "./assets/heroes/heathcliff/art.png",
  "images": {
    "art": "./assets/heroes/heathcliff/art.png",
    "idle": "./assets/heroes/heathcliff/idle.png",
    "attack": "./assets/heroes/heathcliff/attack.png"
  },
  "visual": {
    "scale": 1.07,
    "walkBob": 4,
    "skillGlow": 1,
    "attackMs": 340
  }
});
