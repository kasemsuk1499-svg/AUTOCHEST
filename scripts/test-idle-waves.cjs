#!/usr/bin/env node
// Deterministic regression for auto-idle wave farming and same-stage boss retries.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),context=vm.createContext({window:{},Date,Math});
vm.runInContext(fs.readFileSync(path.join(root,'src/idle-core.js'),'utf8'),context);
const CORE=context.window.AUTOCHEST_IDLE_CORE;
assert(CORE,'Idle core not loaded');
assert.equal(CORE.waveSize(1),3);
assert.equal(CORE.waveSize(5),3);
assert.equal(CORE.waveSize(6),4);
assert.equal(CORE.waveSize(11),5);
assert.equal(CORE.waveSize(100),5);
const team={asuna:{},kirito:{},silica:{}},state=CORE.initial();
assert.equal(CORE.nextEncounter(state),'wave','Start with a normal wave');
state.kills=CORE.killsNeeded(state.stage);
assert.equal(CORE.nextEncounter(state),'boss','An eligible auto team should enter boss');
const stageBefore=state.stage,goldBefore=state.gold,expBefore=state.heroExp;
CORE.bossDefeated(state);
assert.equal(state.stage,stageBefore,'Losing a boss must not demote the stage');
assert.equal(state.autoBoss,true,'Losing a boss must not disable auto progression');
assert.equal(CORE.nextEncounter(state),'wave','Failure must trigger farm waves');
assert.equal(state.bossRetryWaves,3);
for(let round=1;round<=3;round++){
 const loot=CORE.farmReward(state.stage);
 // Each defeated monster in the finite wave pays out, even if boss is uncleared.
 for(let i=0;i<CORE.waveSize(state.stage);i++){
  state.gold+=loot.gold;state.heroExp+=loot.exp;
 }
 assert.equal(CORE.waveCleared(state),3-round,'Exactly one farm wave consumed');
 assert.equal(CORE.nextEncounter(state),round<3?'wave':'boss');
}
assert(state.gold>goldBefore&&state.heroExp>expBefore,'Idle farm needs meaningful resources');
assert.equal(state.stage,stageBefore);
CORE.bossDefeated(state);
state.autoBoss=false;
assert.equal(CORE.nextEncounter(state),'wave','Manual boss off means farm forever');
for(let i=0;i<4;i++)CORE.waveCleared(state);
assert.equal(CORE.nextEncounter(state),'wave');
const copy=CORE.normalized(JSON.parse(JSON.stringify(state)),team);
assert.equal(copy.stage,stageBefore);
assert.equal(copy.bossRetryWaves,0);
state.bossRetryWaves=2;
assert.equal(CORE.normalized(JSON.parse(JSON.stringify(state)),team).bossRetryWaves,2,
 'Pending farm wave count must persist across browser refresh');
console.log('✅ Wave Idle: finite 3–5 enemies, automatic boss, failed boss farm same stage, 3-wave retry, save/load');
