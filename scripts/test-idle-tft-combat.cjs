#!/usr/bin/env node
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),ctx=vm.createContext({window:{},Math});
vm.runInContext(fs.readFileSync(path.join(root,'src/idle-tft-combat.js'),'utf8'),ctx);
const R=ctx.window.AUTOCHEST_TFT_COMBAT;
assert(R,'TFT combat rules must load');
assert.equal(R.W,760);assert.equal(R.H,775);assert.equal(R.SX,94);
assert.equal(R.attackRange({range:1}),94);
assert.equal(R.attackRange({range:4.7}),441.8);
const target={x:50,y:78,hp:100};
const melee={x:40,y:12,walking:false};
let engaged=false;
for(let i=0;i<1000;i++){const v=R.pursue(melee,target,{range:1.05,move:78},1/60,'enemy');if(v.inRange){engaged=true;break}}
assert(engaged,'Melee hero should reach a target instead of sticking near range boundary');
const ranged={x:50,y:8,walking:false},sniper={range:4.7,move:82};
let advanced=false;
for(let i=0;i<250;i++){
 const prev=ranged.y;const v=R.pursue(ranged,target,sniper,1/60,'enemy');
 if(ranged.y>prev)advanced=true;
 if(v.inRange&&!v.moved)break;
}
assert(advanced,'Ranged attackers must advance from far enemy spawn');
assert(R.pxDist(ranged,target)>140,'A sniper must not chase into melee');
const backline={x:50,y:75,walking:false},foe={x:51,y:76,hp:100};
R.pursue(backline,foe,sniper,1/10,'ally');
assert(backline.y<75,'Sniper should retreat when threatened at point blank');
const q=R.findTarget({x:20,y:20},[
 {x:21,y:21,hp:50,cloakUntil:10},
 {x:26,y:25,hp:50,cloakUntil:0}
],5);
assert.equal(q.x,26,'Cloaked units cannot be targeted');
const shot={x:10,y:10,target:{x:80,y:80,hp:100},speed:350,life:3};
let hit=false;
for(let i=0;i<180;i++){let v=R.advanceShot(shot,1/60);if(v.hit){hit=true;break}}
assert(hit,'TFT projectile must reach its moving target');
const dead={x:1,y:1,target:{x:10,y:10,hp:0},speed:300,life:2};
assert.equal(R.advanceShot(dead,1/60).hit,false,'Projectiles must not hit defeated targets');
console.log('✅ TFT combat: pixel ranges, anti-stuck melee, ranged kiting, targeting, projectiles');
