/* ฮีทคลิฟฟ์: provisional stats and skills; art slots await your PNG/GIF. */
window.AUTOCHEST_CHARACTERS.registerHero({
 starUpgrades:[
  {
    "star": 2,
    "label": "โล่ตนเอง 50% HP · ทีม 18% HP",
    "patch": {
      "guard": {
        "selfShield": 0.5,
        "allyShield": 0.18
      }
    }
  },
  {
    "star": 3,
    "label": "ลดดาเมจ 35% · ยั่วยุ 4 วินาที",
    "patch": {
      "passive": {
        "damageReduction": 0.35
      },
      "guard": {
        "tauntSeconds": 4
      }
    }
  },
  {
    "star": 4,
    "label": "ใช้สกิลทุก 2 ครั้ง",
    "patch": {
      "triggerEvery": 2
    }
  },
  {
    "star": 5,
    "label": "โล่ตนเอง 65% HP · ทีม 28% HP · ลดดาเมจ 45%",
    "patch": {
      "guard": {
        "selfShield": 0.65,
        "allyShield": 0.28
      },
      "passive": {
        "damageReduction": 0.45
      }
    }
  }
],

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
