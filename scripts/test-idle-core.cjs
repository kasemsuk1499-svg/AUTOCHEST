#!/usr/bin/env node
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),ctx=vm.createContext({window:{},Date,Math});
vm.runInContext(fs.readFileSync(path.join(root,'src/idle-core.js'),'utf8'),ctx);
const R=ctx.window.AUTOCHEST_IDLE_CORE;
assert(R,'Core should expose AUTOCHEST_IDLE_CORE');
const roster={
 asuna:{cost:3,hp:470,dmg:66,cool:.58},kirito:{cost:2,hp:630,dmg:92,cool:.84},
 silica:{cost:1,hp:375,dmg:65,cool:1.25},lisbeth:{cost:1,hp:730,dmg:62,cool:1.38},
 sinon:{cost:2,hp:410,dmg:98,cool:1.52},deathgun:{cost:3,hp:430,dmg:118,cool:1.28},
 heathcliff:{cost:3,hp:990,dmg:67,cool:1.36}
};
const run=R.initial();
assert.equal(run.stage,1);assert.equal(run.gold,3000);
assert.equal(run.squad.length,3);assert.equal(R.maxSquad(1),4);
assert.equal(R.maxSquad(5),5);assert.equal(R.maxSquad(12),6);assert.equal(R.maxSquad(20),7);
assert.equal(R.killsNeeded(1),6);
const asuna=R.stats(roster.asuna,run.owned.asuna);
assert.equal(asuna.hp,470);assert.equal(asuna.atk,66);
assert(R.power(run,roster)>0);
const farm=R.farmReward(1),boss=R.bossReward(1);
assert(farm.gold>0&&farm.exp>0&&boss.rubies>0);
assert(R.monster(2,true).hp>R.monster(2,false).hp);
assert(R.monster(8,false).hp>R.monster(1,false).hp);
const before=run.gold,exp=run.heroExp;
assert(R.spendLevel(run,'asuna'));assert.equal(run.owned.asuna.level,2);
assert(run.gold<before&&run.heroExp<exp);
assert(!R.spendLevel(run,'unregistered'));
const gems=run.rubies;
const summons=R.draw(run,roster,10,()=>.999);
assert.equal(summons.length,10);assert.equal(run.tickets,0);assert.equal(run.rubies,gems);
assert.equal(run.owned.heathcliff.shards,9,'First summon unlocks, subsequent draws yield shards');
const offline=R.offlineLoot(Date.now()-12*60*60*1000,Date.now(),10);
assert.equal(offline.minutes,480);assert(offline.gold>0&&offline.exp>0);
const noOffline=R.offlineLoot(Date.now(),Date.now(),1);
assert.equal(noOffline.minutes,0);
run.offlineBank={minutes:55,gold:1320,exp:800};
const copy=R.normalized(JSON.parse(JSON.stringify(run)),roster);
assert.equal(copy.offlineBank.gold,1320);
assert.equal(copy.offlineBank.minutes,55);
assert.equal(copy.squad.length,3);
assert.equal(copy.owned.asuna.level,2);
assert.equal(copy.totalSummons,10);
const invalid=R.normalized({version:1,stage:-4,gold:-100,owned:{hack:{level:300}},squad:['hack']},roster);
assert.equal(invalid.stage,1);assert.equal(invalid.gold,0);
assert(!invalid.owned.hack);
const max=R.initial();max.owned.asuna.stars=5;
assert.equal(R.shardsNeeded(5),0);assert.equal(R.ascend(max,'asuna'),false);
const rank=R.initial();rank.owned.asuna.shards=3;
assert.equal(R.ascend(rank,'asuna'),true);assert.equal(rank.owned.asuna.stars,2);
console.log('✅ Idle Core: stage growth, combat stats, summons, upgrades, stars, save data and offline rewards');
