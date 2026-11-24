/* Death Gun: stealth sniper — art/idle/attack remain replaceable PNG/GIF slots. */
window.AUTOCHEST_CHARACTERS.registerHero({
 id:'deathgun', name:'เดธกัน', subtitle:'สไนเปอร์มรณะ • พรางตัว',
 team:'ยิงไกล', traits:['พรางตา','สไนเปอร์','คริติคอล'], cost:3,
 hp:430, dmg:118, range:4.7, cool:1.28, move:82,
 critChance:0.28, critDamage:2.0,
 skill:'พรางมรณะ', effect:'cloakshot', triggerEvery:4,
 cloakDuration:2.0,cloakShotMultiplier:1.70,cloakCritBonus:0.50,
 executeThreshold:0.35,executeMultiplier:1.20,
 col:'#8f6b86',e:'✦',
 portrait:'./assets/heroes/deathgun/art.png',
 images:{
   art:'./assets/heroes/deathgun/art.png',
   idle:'./assets/heroes/deathgun/idle.png',
   attack:'./assets/heroes/deathgun/attack.png'
 },
 visual:{scale:1,walkBob:5,skillGlow:1.15,attackMs:390}
});
