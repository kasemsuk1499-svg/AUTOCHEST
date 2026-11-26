/* Maruko — UR magic drain tank. */
window.AUTOCHEST_CHARACTERS.registerHero({
 costumes:[{id:'costume_01',name:'คิซึเนะบุปผาแรกผลิ',rarity:'LEGENDARY',price:500000}],
 id:'maruko',name:'มารุโกะ',subtitle:'Enchanting Fox',faction:'celestial_beast',
 team:'ป้องกัน',damageType:'magic',role:'TANK / DOT / LIFESTEAL',
 traits:['คำสาปซ้อนทับทะลุโล่','แช่แข็งเมื่อคำสาปครบ','ดูดเลือด','รับดาเมจแทนเพื่อนสายเวท'],cost:4,
 hp:1450,dmg:125,range:2.5,cool:1.25,move:95,critChance:.08,critDamage:1.5,
 skill:'Foxfire Covenant',effect:'dot',triggerEvery:4,skillPower:.9,
 passive:{name:'พันธสัญญาจิ้งจอก',dotStack:true,dotTargets:3,dotPower:.55,dotTicks:5,dotPierceShield:true,dotFreezeSeconds:2,lifesteal:.25,magicGuard:.35},
 starUpgrades:[
  {star:2,label:'DOT 70% MATK ต่อวินาที · ดูดเลือด 30%',patch:{passive:{dotPower:.70,lifesteal:.30}}},
  {star:3,label:'รับดาเมจแทนเพื่อนเวท 45% · DOT 6 วินาที',patch:{passive:{magicGuard:.45,dotTicks:6}}},
  {star:4,label:'ใช้สกิลทุก 3 ครั้ง (ก่อนปรับความถี่รวม) · คำสาป 4 เป้าหมาย · ดูดเลือด 40%',patch:{triggerEvery:3,passive:{dotTargets:4,lifesteal:.40}}},
  {star:5,label:'ใช้สกิลทุก 2 ครั้ง (ก่อนปรับความถี่รวม) · โจมตี 150% MATK · DOT 90% MATK ต่อวินาที · ดูดเลือด 50% · รับดาเมจแทน 60%',patch:{triggerEvery:2,skillPower:1.5,passive:{dotPower:.90,lifesteal:.50,magicGuard:.60}}}
 ],
 col:'#dc8cff',e:'🦊',portrait:'./assets/heroes/maruko/art.png',
 images:{art:'./assets/heroes/maruko/art.png',idle:'./assets/heroes/maruko/idle.png',attack:'./assets/heroes/maruko/attack.png'},
 visual:{scale:1,walkBob:5,skillGlow:1,attackMs:440}
});
