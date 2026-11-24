/* Asuna — fast rapier attacker with critical hits. */
window.AUTOCHEST_CHARACTERS.registerHero({
 id:'asuna', name:'อาสึนะ', subtitle:'ประกายแสง • เรเปียร์สายว่องไว',
 team:'นักรบ', traits:['ว่องไว','คริติคอล'], cost:3,
 hp:470, dmg:66, range:1.08, cool:0.58, move:140,
 critChance:0.35, critDamage:1.90,
 skill:'แฟลชสไตรค์', effect:'slash', triggerEvery:3,
 col:'#ff9ab6', e:'✦',
 portrait:'./assets/heroes/asuna/art.png',
 images:{
  art:'./assets/heroes/asuna/art.png',
  idle:'./assets/heroes/asuna/idle.png',
  attack:'./assets/heroes/asuna/attack.png'
 },
 visual:{scale:1,walkBob:7,skillGlow:1.2,attackMs:260}
});
