/* Minato Namikaze — SSR physical assassin, Flying Raijin. */
window.AUTOCHEST_CHARACTERS.registerHero({
 id:'minato',name:'มินาโตะ',subtitle:'Naruto • ประกายแสงสีเหลืองแห่งโคโนฮะ',faction:'naruto',
 team:'นักรบ',damageType:'physical',role:'ASSASSIN / DASH / EVASION',traits:['ลอบสังหาร','แดช','หลบหลีก','Naruto'],cost:3,
 hp:760,dmg:156,range:1.1,melee:true,cool:.82,move:145,critChance:.18,critDamage:1.7,
 skill:'เทพอัสนีเหิน • กระสุนวงจักร',effect:'dash',triggerEvery:3,skillPower:3.2,
 passive:{name:'ประกายแสงสีเหลือง',dodgeChance:.25},
 starUpgrades:[
  {star:2,label:'หลบหลีก 30% · สกิล 350% PATK',patch:{skillPower:3.5,passive:{dodgeChance:.30}}},
  {star:3,label:'หลบหลีก 35% · CRIT 25%',patch:{critChance:.25,passive:{dodgeChance:.35}}},
  {star:4,label:'ใช้สกิลทุก 5 ครั้ง · สกิล 400% PATK',patch:{triggerEvery:2,skillPower:4}},
  {star:5,label:'หลบหลีก 45% · สกิล 460% PATK · CRIT DMG ×2',patch:{skillPower:4.6,critDamage:2,passive:{dodgeChance:.45}}}
 ],
 col:'#ffe05d',e:'⚡',portrait:'./assets/heroes/minato/art.png',
 images:{art:'./assets/heroes/minato/art.png',idle:'./assets/heroes/minato/idle.png',attack:'./assets/heroes/minato/attack.png'},
 visual:{scale:1,walkBob:6,skillGlow:1,attackMs:320}
});
