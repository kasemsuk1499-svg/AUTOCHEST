/* Mamon — SSR VTuber physical mid-range fighter. */
window.AUTOCHEST_CHARACTERS.registerHero({
 id:'mamon',name:'มาม่อน',subtitle:'Squirrel VTuber • นักไลฟ์สายป่วน',faction:'vtuber',
 team:'นักรบ',damageType:'physical',role:'FIGHTER / AOE / ANTI-HEAL',traits:['ตีหมู่','ลดการฟื้นฟู','วีทูปเบอร์'],cost:3,
 hp:860,dmg:148,range:2.5,melee:true,cool:1.12,move:102,critChance:.12,critDamage:1.6,
 skill:'Nutty Live Smash!',effect:'slam',triggerEvery:4,skillPower:2.6,slamRadius:180,slamTargets:4,
 cleave:{power:.55,radius:88},debuff:{healDown:.45,duration:4},
 passive:{name:'Streamer Tempo',bonusVsHealDown:.25},
 starUpgrades:[
  {star:2,label:'สกิล 300% ATK · ลดฟื้นฟู 55%',patch:{skillPower:3,debuff:{healDown:.55}}},
  {star:3,label:'โจมตีสะสมเร็วขึ้น 1 ครั้ง · ลดฟื้นฟู 5 วินาที',patch:{triggerEvery:3,debuff:{duration:5}}},
  {star:4,label:'ตีหมู่ 75% ATK · ดาเมจต่อเป้าหมายติดลดฮีล +35%',patch:{cleave:{power:.75},passive:{bonusVsHealDown:.35}}},
  {star:5,label:'สกิล 370% ATK · ลดฟื้นฟู 75% · SPD +20% 4 วินาที',patch:{skillPower:3.7,debuff:{healDown:.75},passive:{skillSpeedUp:.20,skillSpeedSeconds:4}}}
 ],
 col:'#78c850',e:'🐿️',portrait:'./assets/heroes/mamon/art.png',
 images:{art:'./assets/heroes/mamon/art.png',idle:'./assets/heroes/mamon/idle.png',attack:'./assets/heroes/mamon/attack.png'},
 visual:{scale:1,walkBob:6,skillGlow:1,attackMs:360}
});
