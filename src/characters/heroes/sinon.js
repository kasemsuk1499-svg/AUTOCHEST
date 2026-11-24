/* ชิน่อน: provisional stats and skills; art slots await your PNG/GIF. */
window.AUTOCHEST_CHARACTERS.registerHero({
 starUpgrades:[
  {
    "star": 2,
    "label": "กระสุนพิฆาต 240% → 320% ATK",
    "patch": {
      "skillPower": 3.2
    }
  },
  {
    "star": 3,
    "label": "โอกาสคริติคอล 40%",
    "patch": {
      "critChance": 0.4
    }
  },
  {
    "star": 4,
    "label": "ใช้สกิลทุก 3 ครั้ง",
    "patch": {
      "triggerEvery": 3
    }
  },
  {
    "star": 5,
    "label": "กระสุนพิฆาต 450% ATK · CRIT DMG 240%",
    "patch": {
      "skillPower": 4.5,
      "critDamage": 2.4
    }
  }
],

  "id": "sinon",
  "name": "ชิน่อน",
  "subtitle": "Hecate II • สไนเปอร์ยิงทะลุสนาม",
  "team": "ยิงไกล",
  "role": "SNIPER",
  "globalRange": true,
  "traits": [
    "สไนเปอร์",
    "ยิงทั่วสนาม",
    "กระสุนทะลวงโล่"
  ],
  "cost": 2,
  "hp": 410,
  "dmg": 145,
  "range": 12,
  "cool": 1.65,
  "move": 87,
  "critChance": 0.25,
  "critDamage": 1.85,
  "skill": "กระสุนพิฆาต",
  "effect": "pierce",
  "skillPower": 2.4,
  "pierceRadius": 36,
  "projectileSpeed": 950,
  "triggerEvery": 4,
  "col": "#82d0c7",
  "e": "✦",
  "portrait": "./assets/heroes/sinon/art.png",
  "images": {
    "art": "./assets/heroes/sinon/art.png",
    "idle": "./assets/heroes/sinon/idle.png",
    "attack": "./assets/heroes/sinon/attack.png"
  },
  "visual": {
    "scale": 1,
    "walkBob": 6,
    "skillGlow": 1,
    "attackMs": 340,
    "layout": {"skillProjectile":"beam"},
    "fx": {"skillProjectile":{"src":"./assets/effects/sinon/beam.svg","size":100,"thickness":48,"ms":650}}
  }
});
