/* Artoria Pendragon (Saber) — Fate. Game-original boss/farm specialist. */
window.AUTOCHEST_CHARACTERS.registerHero({
 starUpgrades:[
  {
    "star": 2,
    "label": "Excalibur 650% ATK",
    "patch": {
      "skillPower": 6.5
    }
  },
  {
    "star": 3,
    "label": "ดาเมจบอส ×2.5 · ฟันหมู่ 130% ATK",
    "patch": {
      "passive": {
        "bossMultiplier": 2.5
      },
      "cleave": {
        "power": 1.3
      }
    }
  },
  {
    "star": 4,
    "label": "ใช้ Excalibur ทุก 3 ครั้ง",
    "patch": {
      "triggerEvery": 3
    }
  },
  {
    "star": 5,
    "label": "Excalibur 900% ATK · ดาเมจบอส ×3 · ฟันหมู่ 160% ATK",
    "patch": {
      "skillPower": 9,
      "passive": {
        "bossMultiplier": 3
      },
      "cleave": {
        "power": 1.6
      }
    }
  }
],

 costumes:[{id:'costume_01',name:'เมดผู้พิทักษ์บัลลังก์',rarity:'EPIC',price:100000}],
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
