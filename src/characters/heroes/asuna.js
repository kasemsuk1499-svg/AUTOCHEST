/* Asuna — fast rapier attacker with critical hits. */
window.AUTOCHEST_CHARACTERS.registerHero({
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
