/* Itachi Uchiha — UR physical main carry. */
window.AUTOCHEST_CHARACTERS.registerHero({
 id:'itachi',name:'อิทาจิ',subtitle:'Naruto • อุจิวะ อิทาจิ',faction:'naruto',
 team:'นักรบ',damageType:'physical',role:'MAIN DPS / CRITICAL / SEAL',
 traits:['เนตรวงแหวนสะสม','อ่านจันทรา','ดาบโทสึกะ','ผนึกคืนชีพ 5★','Naruto'],cost:4,
 hp:1050,dmg:195,range:2.5,melee:true,cool:.85,move:112,critChance:.25,critDamage:1.75,
 skill:'ซูซาโนะโอะ • ดาบโทสึกะ',effect:'totsuka',triggerEvery:3,skillPower:4.5,slamRadius:180,
 passive:{name:'เนตรวงแหวนกระจกเงาหมื่นบุปผา',sharinganMax:5,sharinganAtk:.06,sharinganCrit:.05,tsukuyomiSeconds:1.5,totsukaTargets:3},
 starBaseLabel:'เนตรวงแหวน 5 ชั้น · อ่านจันทรา 1.5 วิ · ดาบโทสึกะ 225% PATK ×2 ฮิต (วินาที 2 และ 3) สูงสุด 3 เป้าหมาย',
 starUpgrades:[
  {star:2,label:'ดาบโทสึกะ 275% PATK ×2 · CRIT DMG 200%',patch:{skillPower:5.5,critDamage:2}},
  {star:3,label:'เนตรวงแหวนต่อชั้น PATK +8% / CRIT +7 จุด% · อ่านจันทรา 2 วิ',patch:{passive:{sharinganAtk:.08,sharinganCrit:.07,tsukuyomiSeconds:2}}},
  {star:4,label:'ดาบโทสึกะทุก 5 ครั้ง · สูงสุด 5 เป้าหมาย',patch:{triggerEvery:2,passive:{totsukaTargets:5}}},
  {star:5,label:'ดาบโทสึกะ 325% PATK ×2 · CRIT DMG 250% · สังหารด้วยสกิลแล้วผนึกคืนชีพ',patch:{skillPower:6.5,critDamage:2.5,passive:{totsukaSeal:true}}}
 ],
 col:'#c84853',e:'🔴',portrait:'./assets/heroes/itachi/art.png',
 images:{art:'./assets/heroes/itachi/art.png',idle:'./assets/heroes/itachi/idle.png',attack:'./assets/heroes/itachi/attack.png'},
 visual:{scale:1,walkBob:5,skillGlow:1,attackMs:440}
});
