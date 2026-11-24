/* Death Gun: stealth sniper — art/idle/attack remain replaceable PNG/GIF slots. */
window.AUTOCHEST_CHARACTERS.registerHero({
 starUpgrades:[
  {
    "star": 2,
    "label": "ซุ่มยิง 170% → 220% ATK",
    "patch": {
      "cloakShotMultiplier": 2.2
    }
  },
  {
    "star": 3,
    "label": "พรางตัว 3 วินาที · โอกาสคริซุ่มยิง +60 จุดเปอร์เซ็นต์",
    "patch": {
      "cloakDuration": 3,
      "cloakCritBonus": 0.6
    }
  },
  {
    "star": 4,
    "label": "ใช้สกิลทุก 3 ครั้ง · Execute เมื่อ HP ต่ำกว่า 50%",
    "patch": {
      "triggerEvery": 3,
      "executeThreshold": 0.5
    }
  },
  {
    "star": 5,
    "label": "ซุ่มยิง 300% ATK · Execute ดาเมจ ×1.5",
    "patch": {
      "cloakShotMultiplier": 3,
      "executeMultiplier": 1.5
    }
  }
],

 id:'deathgun', name:'เดธกัน', subtitle:'สไนเปอร์มรณะ • พรางตัว',
 team:'ยิงไกล', traits:['พรางตา','สไนเปอร์','คริติคอล'], cost:3,
 hp:430, dmg:118, range:4.7, cool:1.28, move:82,
 critChance:0.28, critDamage:2.0,
 skill:'พรางมรณะ', effect:'cloakshot', triggerEvery:4,
 cloakDuration:2.0,cloakShotMultiplier:1.70,cloakCritBonus:0.50,
 executeThreshold:0.35,executeMultiplier:1.20,
 col:'#8f6b86',e:'✦',
 portrait:'./assets/heroes/deathgun/art.png',
 images:{
   art:'./assets/heroes/deathgun/art.png',
   idle:'./assets/heroes/deathgun/idle.png',
   attack:'./assets/heroes/deathgun/attack.png'
 },
 visual:{scale:1,walkBob:5,skillGlow:1.15,attackMs:390}
});
