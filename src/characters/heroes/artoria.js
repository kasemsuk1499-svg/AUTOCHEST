/* Artoria Pendragon (Saber) — Fate. Game-original boss/farm specialist. */
window.AUTOCHEST_CHARACTERS.registerHero({
 id:'artoria',name:'อาเธอเรีย',subtitle:'Fate • King of Knights',team:'นักรบ',role:'BOSS SLAYER / FARMER',
 traits:['ฟันหมู่ทุกครั้ง','ดาเมจบอส x2','Excalibur ทะลุสนาม'],cost:3,playerOnly:true,
 hp:950,dmg:120,range:1.12,cool:.8,move:120,critChance:.18,critDamage:1.7,
 skill:'Excalibur — Sword of Promised Victory',effect:'pierce',triggerEvery:4,skillPower:5,
 pierceRadius:110,pierceShield:false,projectileSpeed:1800,
 cleave:{radius:190,power:1},passive:{name:'Avalon & Mana Burst',damageReduction:.20,bossMultiplier:2},
 col:'#f4d272',e:'⚔',portrait:'./assets/heroes/artoria/art.png',
 images:{art:'./assets/heroes/artoria/art.png',idle:'./assets/heroes/artoria/idle.png',attack:'./assets/heroes/artoria/attack.png'},
 visual:{scale:1,walkBob:6,skillGlow:1,attackMs:500,layout:{skillProjectile:'beam'},
 fx:{hit:'slashGold',cleave:{src:'./assets/effects/artoria/cleave.svg',size:200,ms:380},skillProjectile:{src:'./assets/effects/artoria/excalibur.svg',size:120,thickness:145,ms:850,airtimeMs:1100},skillHit:{src:'./assets/effects/artoria/impact.svg',size:125,ms:380}}}
});
