/* Asuna — fast rapier attacker with critical hits. */
window.AUTOCHEST_CHARACTERS.registerHero({
 starUpgrades:[
  {
    "star": 2,
    "label": "Flash Strike 240% → 300% ATK",
    "patch": {
      "skillPower": 3
    }
  },
  {
    "star": 3,
    "label": "คริติคอลสะสม +8 จุดเปอร์เซ็นต์/ครั้ง สูงสุด 32%",
    "patch": {
      "passive": {
        "focusCritStep": 0.08,
        "focusCritMax": 0.32
      }
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
    "label": "Flash Strike 400% ATK · CRIT DMG 260%",
    "patch": {
      "skillPower": 4,
      "critDamage": 2.6
    }
  }
],

 id:'asuna', name:'อาสึนะ', subtitle:'The Flash • ดูเอลลิสต์เรเปียร์',
 team:'นักรบ', role:'DUELIST', traits:['โจมตีเร็ว','คริติคอล','เป้าหมายเดียว'], cost:3,
 hp:470, dmg:74, range:1.08, cool:0.44, move:165,
 critChance:0.45, critDamage:2.10,
 skill:'แฟลชสไตรค์', effect:'slash', triggerEvery:4,
 skillPower:2.4, skillGuaranteedCrit:true,
 passive:{name:'ประกายแสงต่อเนื่อง',focusCritStep:0.05,focusCritMax:0.20},
 col:'#ff9ab6', e:'✦',
 portrait:'./assets/heroes/asuna/art.png',
 images:{
  art:'./assets/heroes/asuna/art.png',
  idle:'./assets/heroes/asuna/idle.png',
  attack:'./assets/heroes/asuna/attack.png'
 },
 visual:{scale:1,walkBob:7,skillGlow:1.2,attackMs:220}
});
