/* ลิซเบธ: provisional stats and skills; art slots await your PNG/GIF. */
window.AUTOCHEST_CHARACTERS.registerHero({
 starUpgrades:[
  {
    "star": 2,
    "label": "ค้อนสะท้าน 160% → 220% ATK",
    "patch": {
      "skillPower": 2.2
    }
  },
  {
    "star": 3,
    "label": "ลด ATK ศัตรู 35% · รับดาเมจเพิ่ม 30% นาน 4 วินาที",
    "patch": {
      "debuff": {
        "attackDown": 0.35,
        "vulnerability": 0.3,
        "duration": 4
      }
    }
  },
  {
    "star": 4,
    "label": "ลดดาเมจที่ได้รับ 30%",
    "patch": {
      "passive": {
        "damageReduction": 0.3
      }
    }
  },
  {
    "star": 5,
    "label": "ค้อนสะท้าน 300% ATK · ลด ATK 45% / รับดาเมจเพิ่ม 40% นาน 5 วินาที",
    "patch": {
      "skillPower": 3,
      "debuff": {
        "attackDown": 0.45,
        "vulnerability": 0.4,
        "duration": 5
      }
    }
  }
],

  "id": "lisbeth",
  "name": "ลิซเบธ",
  "subtitle": "Battle Smith • แทงก์สนับสนุน",
  "team": "ป้องกัน",
  "role": "SUPPORT TANK",
  "traits": [
    "ดาเมจหมู่",
    "ลดพลังโจมตี",
    "เพิ่มดาเมจที่ศัตรูได้รับ"
  ],
  "cost": 1,
  "hp": 1050,
  "dmg": 50,
  "range": 1.05,
  "cool": 1.2,
  "move": 78,
  "skill": "ค้อนสะท้าน",
  "effect": "slam",
  "triggerEvery": 3,
  "skillPower": 1.6,
  "slamRadius": 190,
  "debuff": {"attackDown":0.25,"vulnerability":0.20,"duration":3},
  "passive": {"name":"เกราะช่างตีเหล็ก","damageReduction":0.15},
  "col": "#f6a2b8",
  "e": "✦",
  "portrait": "./assets/heroes/lisbeth/art.png",
  "images": {
    "art": "./assets/heroes/lisbeth/art.png",
    "idle": "./assets/heroes/lisbeth/idle.png",
    "attack": "./assets/heroes/lisbeth/attack.png"
  },
  "visual": {
    "scale": 1,
    "walkBob": 6,
    "skillGlow": 1,
    "attackMs": 340
  }
});
