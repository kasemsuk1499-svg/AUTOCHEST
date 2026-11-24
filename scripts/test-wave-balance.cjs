#!/usr/bin/env node
// Wave balance contract: enemy count, tiers, scaling caps and boss cadence.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'src/game.js'),'utf8');
const from=src.indexOf('const ENEMY_SCALING=Object.freeze('),to=src.indexOf('function startBattle(){',from);
assert(from>=0&&to>from,'Combat balance definitions must be available');
const sample={
 lisbeth:{id:'lisbeth',cost:1,hp:730,dmg:62,range:1.05,cool:1.38,move:78,team:'ป้องกัน'},
 silica:{id:'silica',cost:1,hp:375,dmg:65,range:2.72,cool:1.25,move:98,team:'เวท'},
 kirito:{id:'kirito',cost:2,hp:630,dmg:92,range:1.07,cool:0.84,move:117,team:'นักรบ'},
 sinon:{id:'sinon',cost:2,hp:410,dmg:98,range:3.85,cool:1.52,move:87,team:'ยิงไกล'},
 deathgun:{id:'deathgun',cost:3,hp:430,dmg:118,range:4.7,cool:1.28,move:82,team:'ยิงไกล'},
 heathcliff:{id:'heathcliff',cost:3,hp:990,dmg:67,range:1.05,cool:1.36,move:66,team:'ป้องกัน'},
 asuna:{id:'asuna',cost:3,hp:470,dmg:66,range:1.08,cool:0.58,move:140,team:'นักรบ'}
};
const create=new Function('TYPES','wave','pos','ri','rand',
  src.slice(from,to)+'return {ENEMY_SCALING,enemyWavePower,genEnemies,makeFighter}');
for(let wave=1;wave<=40;wave++){
 const test=create(sample,wave,(col,row)=>({x:104+col*94,y:108+row*89}),n=>0,(a,b)=>(a+b)/2);
 const units=test.genEnemies();
 const expected=Math.min(6,2+Math.floor((wave-1)/3));
 assert.equal(units.length,expected,'enemy count at wave '+wave);
 assert.equal(units.filter(u=>u.boss).length,wave%3===0?1:0,'boss cadence '+wave);
 assert.equal(new Set(units.map(u=>u.col+','+u.row)).size,expected,'unique slots '+wave);
 const tier=Math.min(3,1+Math.floor((wave-1)/2));
 for(const [index,u] of units.entries()){
  assert(sample[u.kind],'Hero must be a shared roster entry');
  assert(sample[u.kind].cost<=tier,'Price tier '+wave);
  const f=test.makeFighter(u,'enemy',index),s=sample[u.kind],power=test.enemyWavePower(wave);
  const hp=s.hp*power.hp*(u.boss?1.8:1);
  const atk=s.dmg*power.atk*(u.boss?1.12:1);
  assert(Math.abs(f.hp-hp)<0.000001,'HP scaling '+wave);
  assert(Math.abs(f.atk-atk)<0.000001,'ATK scaling '+wave);
  assert(f.range===s.range&&f.cool===s.cool,'Do not alter enemy hero skills '+wave);
 }
 assert(units.map(u=>u.kind).join(',')===test.genEnemies().map(u=>u.kind).join(','),
   'Stable preview roster '+wave);
 assert(test.enemyWavePower(wave).hp<=1.45+1e-9,'HP cap '+wave);
 assert(test.enemyWavePower(wave).atk<=1.2+1e-9,'ATK cap '+wave);
}
console.log('✅ 40 waves: casual enemy count, capped HP/ATK, shared hero skills, boss cadence and placements');
