/* คิริโตะ: provisional stats and skills; art slots await your PNG/GIF. */
window.AUTOCHEST_CHARACTERS.registerHero({
 starUpgrades:[
  {
    "star": 2,
    "label": "ดาบคู่ 200% → 260% ATK",
    "patch": {
      "skillPower": 2.6
    }
  },
  {
    "star": 3,
    "label": "คืนชีพ HP 75% · อมตะ 4 วินาที",
    "patch": {
      "passive": {
        "reviveHp": 0.75,
        "immortalSeconds": 4
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
    "label": "ดาบคู่ 350% ATK · คืนชีพ HP 100% · อมตะ 5 วินาที",
    "patch": {
      "skillPower": 3.5,
      "passive": {
        "reviveHp": 1,
        "immortalSeconds": 5
      }
    }
  }
],

  "id": "kirito",
  "name": "คิริโตะ",
  "subtitle": "ไฟต์เตอร์ • นักดาบดำผู้ไม่ยอมตาย",
  "team": "นักรบ",
  "traits": [
    "ดาบคู่",
    "คืนชีพ",
    "อมตะ"
  ],
  "cost": 2,
  "hp": 820,
  "dmg": 88,
  "range": 1.07,
  "cool": 0.84,
  "move": 117,
  "critChance": 0.18,
  "critDamage": 1.6,
  "skill": "ดาบคู่ทะลวง",
  "passive": {"name":"เจตจำนงนักดาบดำ","reviveHp":0.5,"immortalSeconds":3},
  "effect": "slash",
  "triggerEvery": 3,
  "col": "#8893b7",
  "e": "✦",
  "portrait": "./assets/heroes/kirito/art.png",
  "images": {
    "art": "./assets/heroes/kirito/art.png",
    "idle": "./assets/heroes/kirito/idle.png",
    "attack": "./assets/heroes/kirito/attack.png"
  },
  "visual": {
    "scale": 1,
    "walkBob": 6,
    "skillGlow": 1,
    "attackMs": 340
  }
});
