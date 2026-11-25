/* Qingmei — UR celestial phoenix, persistent stacking ground fire. */
window.AUTOCHEST_CHARACTERS.registerHero({
 id:'qingmei',name:'ชิงเหมย',subtitle:'Celestial Flame Phoenix',faction:'celestial_beast',
 team:'เวท',damageType:'magic',role:'MAGE / GROUND DOT',traits:['นกเพลิงทะลุแนว','ทางไฟ 3 ช่อง','เผาไหม้ตาม HP สูงสุด','ทางไฟซ้อนกันได้'],cost:4,
 hp:920,dmg:160,range:4.1,cool:1.08,move:96,critChance:.10,critDamage:1.6,
 skill:'Phoenix — Celestial Inferno',effect:'firetrail',triggerEvery:2,skillPower:2.2,projectileSpeed:620,pierceRadius:58,pierceShield:false,
 fireTrail:{hpRate:.012,duration:6,widthCells:3},
 starUpgrades:[
  {star:2,label:'นกเพลิง 260% MATK · เผาไหม้ 1.4% HP สูงสุด/วิ',patch:{skillPower:2.6,fireTrail:{hpRate:.014}}},
  {star:3,label:'เผาไหม้ 1.6% HP สูงสุด/วิ · นกเพลิง 300% MATK',patch:{skillPower:3,fireTrail:{hpRate:.016}}},
  {star:4,label:'สะสมโจมตีก่อนใช้สกิลลดลง 1 ครั้ง · เผาไหม้ 1.8%/วิ',patch:{triggerEvery:1,fireTrail:{hpRate:.018}}},
  {star:5,label:'นกเพลิง 350% MATK · เผาไหม้ 2% HP สูงสุด/วิ',patch:{skillPower:3.5,fireTrail:{hpRate:.02}}}
 ],
 col:'#ff8751',e:'🔥',portrait:'./assets/heroes/qingmei/art.png',
 images:{art:'./assets/heroes/qingmei/art.png',idle:'./assets/heroes/qingmei/idle.png',attack:'./assets/heroes/qingmei/attack.png'},
 visual:{scale:1.02,walkBob:5,skillGlow:1,attackMs:440,
  fx:{skillProjectile:{src:'./assets/effects/qingmei/phoenix.svg',cols:1,rows:1,frames:1,size:155,ms:600},groundFire:{src:'./assets/effects/qingmei/fire-ground.svg',cols:1,rows:1,frames:1,size:170,ms:600},dot:'impact'}}
});
