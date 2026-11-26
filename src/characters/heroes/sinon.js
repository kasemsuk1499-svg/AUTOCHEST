/* ชิน่อน: provisional stats and skills; art slots await your PNG/GIF. */
window.AUTOCHEST_CHARACTERS.registerHero({
 starUpgrades:[
  {
    "star": 2,
    "label": "กระสุนพิฆาต 320% → 400% ATK",
    "patch": {
      "skillPower": 4
    }
  },
  {
    "star": 3,
    "label": "โอกาสคริติคอล 45%",
    "patch": {
      "critChance": 0.45
    }
  },
  {
    "star": 4,
    "label": "ใช้สกิลทุก 5 ครั้ง · รัศมีทะลวง 60 px",
    "patch": {
      "triggerEvery": 2,
      "pierceRadius": 60
    }
  },
  {
    "star": 5,
    "label": "กระสุนพิฆาต 550% ATK · CRIT DMG 250%",
    "patch": {
      "skillPower": 5.5,
      "critDamage": 2.5
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
  "dmg": 165,
  "range": 12,
  "cool": 1.3,
  "move": 87,
  "critChance": 0.30,
  "critDamage": 1.95,
  "skill": "กระสุนพิฆาต",
  "effect": "pierce",
  "skillPower": 3.2,
  "pierceRadius": 48,
  "projectileSpeed": 950,
  "triggerEvery": 3,
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
