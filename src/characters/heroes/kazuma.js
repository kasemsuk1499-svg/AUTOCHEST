/* Kazuma — SR survival / KonoSuba party enabler. */
window.AUTOCHEST_CHARACTERS.registerHero({
 id:'kazuma',name:'คาซึมะ',subtitle:'KonoSuba • Adventurer',faction:'konosuba',
 team:'เวท',damageType:'magic',role:'SURVIVAL / PARTY SUPPORT',traits:['อมตะ','กัน Explosion','คืนชีพเมื่อมีอควา','ปลดล็อก Explosion ซ้ำ'],cost:2,
 hp:900,dmg:35,range:1.15,cool:1.25,move:105,critChance:.08,critDamage:1.5,
 skill:'Survival Instinct',effect:'slash',triggerEvery:4,skillPower:1.2,
 passive:{name:'ชีวิตต้องรอด!',explosionImmune:true,skillImmortalSeconds:1.5,aquaReviveHp:.35,aquaImmortalSeconds:1.5,explosionRestSeconds:2},
 starUpgrades:[
  {star:2,label:'อมตะจากสกิล 2 วินาที · คืนชีพ HP 45%',patch:{passive:{skillImmortalSeconds:2,aquaReviveHp:.45}}},
  {star:3,label:'คืนชีพ HP 55% · อมตะหลังคืนชีพ 2 วินาที',patch:{passive:{aquaReviveHp:.55,aquaImmortalSeconds:2}}},
  {star:4,label:'ใช้สกิลทุก 3 ครั้ง · อมตะจากสกิล 2.5 วินาที',patch:{triggerEvery:3,passive:{skillImmortalSeconds:2.5}}},
  {star:5,label:'คืนชีพ HP 75% · อมตะหลังคืนชีพ 2.5 วินาที · เมกุมินพัก 1.5 วินาที',patch:{passive:{aquaReviveHp:.75,aquaImmortalSeconds:2.5,explosionRestSeconds:1.5}}}
 ],
 col:'#7bbd82',e:'🍀',portrait:'./assets/heroes/kazuma/art.png',
 images:{art:'./assets/heroes/kazuma/art.png',idle:'./assets/heroes/kazuma/idle.png',attack:'./assets/heroes/kazuma/attack.png'},
 visual:{scale:1,walkBob:6,skillGlow:1,attackMs:380}
});
