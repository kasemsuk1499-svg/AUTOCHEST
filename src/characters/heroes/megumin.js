/* Megumin — production art, idle and attack sprites. */
window.AUTOCHEST_CHARACTERS.registerHero({
 starUpgrades:[
  {
    "star": 2,
    "label": "Explosion 1,800% ATK",
    "patch": {
      "skillPower": 18
    }
  },
  {
    "star": 3,
    "label": "ร่ายเวท 8 วินาที",
    "patch": {
      "castSeconds": 8
    }
  },
  {
    "star": 4,
    "label": "Explosion 2,200% ATK",
    "patch": {
      "skillPower": 22
    }
  },
  {
    "star": 5,
    "label": "Explosion 2,800% ATK · ร่าย 7 วินาที",
    "patch": {
      "skillPower": 28,
      "castSeconds": 7
    }
  }
],
id:'megumin',name:'เมกุมิน',subtitle:'KonoSuba • Arch Wizard',team:'เวท',role:'AOE BURST',traits:['ระเบิดทั่วสนาม','ร่ายเวทตามระดับดาว','ครั้งเดียวต่อเวฟ'],cost:4,hp:380,dmg:180,range:12,globalRange:true,cool:2.2,move:80,critChance:.05,critDamage:1.5,skill:'EXPLOSION!',effect:'explosion',triggerEvery:2,castSeconds:9,skillPower:15,passive:{name:'One Explosion Per Day',exhaustAfterCast:true},col:'#ff6941',e:'💥',portrait:'./assets/heroes/megumin/art.png',images:{art:'./assets/heroes/megumin/art.png',idle:'./assets/heroes/megumin/idle.png',attack:'./assets/heroes/megumin/attack.png'},visual:{attackMs:400,fx:{cast:{src:'./assets/effects/megumin/cast.svg',size:260,ms:3000},area:{src:'./assets/effects/megumin/explosion.svg',size:400,ms:1500},aftermath:{src:'./assets/effects/megumin/aftermath.svg',size:400,ms:3000}}}});