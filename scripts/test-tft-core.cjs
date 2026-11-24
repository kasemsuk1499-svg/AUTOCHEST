#!/usr/bin/env node
// AUTOCHEST TFT-inspired solo strategy regression checks (Node, no browser required).
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const context=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(path.join(root,'src/tft-core.js'),'utf8'),context);
const R=context.window.AUTOCHEST_TFT;
assert(R,'TFT core must register itself');
const heroes={a:{cost:1,team:'นักรบ'},b:{cost:1,team:'ป้องกัน'},c:{cost:2,team:'นักรบ'},d:{cost:2,team:'ยิงไกล'},e:{cost:3,team:'ยิงไกล'},f:{cost:3,team:'เวท'}};
const run=R.newRun();
assert.equal(run.level,3);assert.equal(run.hp,100);assert.equal(run.xp,0);
assert.equal(R.xpRemaining(run),6);assert.equal(R.nextLevelCost(run),8);
assert.equal(R.addXP(run,4),0);
assert.equal(R.xpRemaining(run),2);assert.equal(R.nextLevelCost(run),4);
assert.equal(R.addXP(run,2),1);assert.equal(run.level,4);assert.equal(run.xp,0);
const quick=R.newRun();const instantPrice=R.nextLevelCost(quick);
assert.equal(instantPrice,8);
assert.equal(R.addXP(quick,instantPrice),1);
assert.equal(quick.level,4);assert.equal(quick.xp,2);
assert.equal(R.nextLevelCost(quick),8);
for(let i=0;i<200;i++)R.addXP(run,4);
assert.equal(run.level,8);assert.equal(run.xp,0);
assert.equal(R.nextLevelCost(run),0);assert.equal(R.xpRemaining(run),0);
assert.equal(R.addXP(run,100),0);
assert.equal(R.interest(0),0);assert.equal(R.interest(29),2);assert.equal(R.interest(999),5);
const sample=R.rollShop(heroes,3,()=>0.01);
assert.equal(sample.length,5);
assert(sample.every(x=>heroes[x].cost===1));
const rare=R.rollShop(heroes,8,()=>0.99);
assert(rare.every(x=>heroes[x].cost===3));
for(let lvl=3;lvl<=8;lvl++){
 const list=R.rollShop(heroes,lvl);
 assert.equal(list.length,5);
 assert(list.every(id=>heroes[id]),'Shop must only use registered characters');
}
const e=R.newRun();
const first=R.settleRound(e,{win:true,wave:1,gold:12,survivors:0});
assert.equal(first.income,7);assert.equal(first.bank,1);
assert.equal(e.hp,100);assert.equal(e.winsInRow,1);assert.equal(e.xp,2);
const second=R.settleRound(e,{win:true,wave:2,gold:19,survivors:0});
assert.equal(second.streak,1);
const third=R.settleRound(e,{win:false,wave:3,gold:0,survivors:2});
assert.equal(e.lossesInRow,1);assert.equal(e.winsInRow,0);assert.equal(third.lostHP,5);assert.equal(e.hp,95);
const noDuplicates=[{kind:'a',board:true},{kind:'a',board:true},{kind:'c',board:true},{kind:'d',board:false}];
const count=R.traitCounts(noDuplicates,heroes);
assert.equal(count['นักรบ'],2,'Two distinct champions trigger a trait');
const duplicates=R.traitCounts([{kind:'a',board:true},{kind:'a',board:true}],heroes);
assert.equal(duplicates['นักรบ'],1,'Duplicate copies must not count as two traits');
const fighters=[{side:'ally',team:'นักรบ',atk:100,cool:1,maxHp:100,hp:100},
 {side:'enemy',team:'นักรบ',atk:100,cool:1,maxHp:100,hp:100}];
R.applyTraits(fighters,noDuplicates,heroes);
assert(Math.abs(fighters[0].atk-115)<1e-8);
assert.equal(fighters[1].atk,100,'Enemy side must not benefit from player traits');
const tankUnits=[{kind:'b',board:true},{kind:'b',board:true},{kind:'a',board:false}];
assert.equal(R.traitCounts(tankUnits,heroes)['ป้องกัน'],1);
const terminal=R.newRun();let rounds=0;
while(terminal.hp>0&&rounds<100){rounds++;R.settleRound(terminal,{win:false,wave:rounds,gold:0,survivors:3})}
assert.equal(terminal.hp,0);assert(rounds<100);
console.log('✅ TFT solo rules: levels, interest, 5-slot rarity shop, win/loss HP, streaks, unique traits and game over');
