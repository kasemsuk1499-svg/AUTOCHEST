/* Aqua — KonoSuba, SSR offensive healer and resurrection support. */
window.AUTOCHEST_CHARACTERS.registerHero({
 id:'aqua',name:'อควา',subtitle:'KonoSuba • Goddess of Water',
 team:'เวท',role:'MAGIC DPS / HEALER / REVIVER',
 traits:['เวทหมู่','ฮีลทีม','ชุบชีวิตเพื่อน'],cost:3,
 hp:760,dmg:155,range:4.2,cool:1.15,move:98,critChance:.12,critDamage:1.6,
 skill:'Sacred Water — Resurrection',effect:'heal',triggerEvery:4,skillPower:3.2,
 support:{healTargets:3,healHp:.30,attackUp:0,speedUp:0,duration:0,damageTargets:3,reviveHp:.45,reviveLimit:1,reviveImmortalSeconds:1.5},
 passive:{name:'Blessing of the Water Goddess',healOnAttack:.65},
 starUpgrades:[
  {star:2,label:'เวท 400% ATK · ฮีล 38% HP',patch:{skillPower:4,support:{healHp:.38}}},
  {star:3,label:'ชุบ HP 65% · อมตะ 2 วินาที',patch:{support:{reviveHp:.65,reviveImmortalSeconds:2}}},
  {star:4,label:'ใช้สกิลทุก 3 ครั้ง · โจมตี 4 / ฮีล 4 เป้าหมาย',patch:{triggerEvery:3,support:{damageTargets:4,healTargets:4}}},
  {star:5,label:'เวท 550% ATK · ฮีล 50% · ชุบเพื่อน HP 100% + อมตะ 3 วินาที · คืนชีพตนเอง HP 100% + อมตะ 3 วินาที (1 ครั้ง/การต่อสู้)',patch:{skillPower:5.5,support:{healHp:.5,reviveHp:1,reviveImmortalSeconds:3},passive:{healOnAttack:1,reviveHp:1,immortalSeconds:3}}}
 ],
 col:'#75dfff',e:'💧',portrait:'./assets/heroes/aqua/art.png',
 images:{art:'./assets/heroes/aqua/art.png',idle:'./assets/heroes/aqua/idle.png',attack:'./assets/heroes/aqua/attack.png'},
 visual:{scale:1,walkBob:6,skillGlow:1,attackMs:440}
});
