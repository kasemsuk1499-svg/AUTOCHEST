/* ซิลิก้า: provisional stats and skills; art slots await your PNG/GIF. */
window.AUTOCHEST_CHARACTERS.registerHero({
 starUpgrades:[
  {
    "star": 2,
    "label": "ฮีล 22% → 30% HP สูงสุด",
    "patch": {
      "support": {
        "healHp": 0.3
      }
    }
  },
  {
    "star": 3,
    "label": "บัฟ ATK/SPD 25% นาน 5 วินาที",
    "patch": {
      "support": {
        "attackUp": 0.25,
        "speedUp": 0.25,
        "duration": 5
      }
    }
  },
  {
    "star": 4,
    "label": "ฮีล 3 เป้าหมาย · ตีปกติฮีล 70% ATK",
    "patch": {
      "support": {
        "healTargets": 3
      },
      "passive": {
        "healOnAttack": 0.7
      }
    }
  },
  {
    "star": 5,
    "label": "ฮีล 40% HP · บัฟ ATK/SPD 35% นาน 6 วินาที",
    "patch": {
      "support": {
        "healHp": 0.4,
        "attackUp": 0.35,
        "speedUp": 0.35,
        "duration": 6
      }
    }
  }
],

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
