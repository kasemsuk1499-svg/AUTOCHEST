/* AUTOCHEST Idle Adventure rules — standalone, deterministic state helpers. */
(function(){'use strict';
 const KEY='AUTOCHEST_SAO_IDLE_V1';
 const MAX_LEVEL=100,MAX_STARS=5,OFFLINE_CAP_MS=8*60*60*1000;
 const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
 const number=(n,fallback=0)=>Number.isFinite(Number(n))?Number(n):fallback;
 const initial=()=>({
  version:1,stage:1,kills:0,gold:3000,heroExp:1800,rubies:1200,tickets:10,
  squad:['asuna','kirito','silica'],owned:{
   asuna:{level:1,stars:1,shards:0},
   kirito:{level:1,stars:1,shards:0},
   silica:{level:1,stars:1,shards:0}
  },autoBoss:true,speed:1,bossWins:0,totalSummons:0,lastSaved:Date.now()
 });
 const maxSquad=stage=>stage>=20?7:stage>=12?6:stage>=5?5:4;
 const killsNeeded=stage=>6+Math.floor((stage-1)/5);
 const stageName=stage=>['ทุ่งหญ้าแห่งการเริ่มต้น','ป่าแห่งความทรงจำ','หุบเขาเหล็ก','วิหารรัตติกาล','ปราสาทลอยฟ้า'][Math.floor((stage-1)/5)%5];
 const levelCost=level=>({gold:Math.round(75*Math.pow(level,1.35)),exp:Math.round(32*Math.pow(level,1.25))});
 const shardsNeeded=stars=>stars>=MAX_STARS?0:stars===1?3:stars===2?6:stars===3?10:15;
 const ascendCost=stars=>250*stars*stars;
 function normalized(raw,roster){
  if(!raw||typeof raw!=='object'||raw.version!==1)return initial();
  const state=initial(),ids=Object.keys(roster);
  for(const key of ['stage','kills','gold','heroExp','rubies','tickets','bossWins','totalSummons'])
   state[key]=Math.floor(clamp(number(raw[key],state[key]),0,1e12));
  state.stage=Math.max(1,state.stage);
  state.kills=clamp(state.kills,0,killsNeeded(state.stage));
  state.autoBoss=raw.autoBoss!==false;
  state.speed=raw.speed===2?2:1;
  state.lastSaved=clamp(number(raw.lastSaved,Date.now()),0,Date.now());
  state.owned={};
  if(raw.owned&&typeof raw.owned==='object')for(const id of ids){
   const hero=raw.owned[id];if(!hero||typeof hero!=='object')continue;
   state.owned[id]={level:Math.floor(clamp(number(hero.level,1),1,MAX_LEVEL)),
    stars:Math.floor(clamp(number(hero.stars,1),1,MAX_STARS)),
    shards:Math.floor(clamp(number(hero.shards,0),0,999999))};
  }
  // Avoid a damaged save leaving the player with no usable team.
  if(!Object.keys(state.owned).length){
   for(const id of ['asuna','kirito','silica'].filter(id=>roster[id]))
    state.owned[id]={level:1,stars:1,shards:0};
  }
  state.squad=Array.isArray(raw.squad)?[...new Set(raw.squad)].filter(id=>state.owned[id]&&roster[id]).slice(0,maxSquad(state.stage)):[];
  if(!state.squad.length)state.squad=Object.keys(state.owned).slice(0,maxSquad(state.stage));
  return state;
 }
 function stats(hero,progress){
  if(!hero||!progress)return null;
  const level=Math.max(1,progress.level),star=Math.max(1,progress.stars);
  return {
   hp:Math.round(hero.hp*(1+(level-1)*.11)*(1+(star-1)*.32)),
   atk:Math.round(hero.dmg*(1+(level-1)*.09)*(1+(star-1)*.26)),
   cool:Math.max(.28,hero.cool),range:hero.range,crit:hero.critChance||.05,
   critDamage:hero.critDamage||1.5
  };
 }
 function power(state,roster){
  return state.squad.reduce((sum,id)=>{
   const s=stats(roster[id],state.owned[id]);return sum+(s?Math.round(s.atk*10+s.hp*.3):0);
  },0);
 }
 function monster(stage,boss=false){
  const n=stage-1;
  const hp=Math.round((boss?1100:175)*Math.pow(1.145,n));
  const atk=Math.round((boss?55:15)*Math.pow(1.098,n));
  return {hp,atk,delay:boss?1.45:2.15};
 }
 function farmReward(stage){
  return {gold:Math.round(28+stage*8),exp:Math.round(18+stage*5)};
 }
 function bossReward(stage){
  return {gold:Math.round(420+stage*110),exp:Math.round(280+stage*70),
   rubies:Math.round(75+stage*8),tickets:stage%3===0?2:1};
 }
 function offlineLoot(lastSaved,now,stage){
  const ms=clamp(now-lastSaved,0,OFFLINE_CAP_MS);
  const mins=Math.floor(ms/60000);
  return {minutes:mins,gold:mins*(24+stage*6),exp:mins*(14+stage*4)};
 }
 function spendLevel(state,id){
  const h=state.owned[id];if(!h||h.level>=MAX_LEVEL)return false;
  const cost=levelCost(h.level);if(state.gold<cost.gold||state.heroExp<cost.exp)return false;
  state.gold-=cost.gold;state.heroExp-=cost.exp;h.level++;return true;
 }
 function ascend(state,id){
  const h=state.owned[id];if(!h||h.stars>=MAX_STARS)return false;
  const need=shardsNeeded(h.stars),cost=ascendCost(h.stars);
  if(h.shards<need||state.gold<cost)return false;
  h.shards-=need;state.gold-=cost;h.stars++;return true;
 }
 function draw(state,roster,count,rng=Math.random){
  if(!Number.isInteger(count)||count<=0||count>10)return null;
  const need= Math.max(0,count-state.tickets)*120;
  if(state.rubies<need)return null;
  const options=Object.entries(roster),pool=options.flatMap(([id,hero])=>
   Array(hero.cost===1?6:hero.cost===2?3:1).fill(id));
  if(!pool.length)return null;
  const rewards=[];
  for(let i=0;i<count;i++){
   if(state.tickets>0)state.tickets--;else state.rubies-=120;
   const id=pool[Math.min(pool.length-1,Math.floor(clamp(rng(),0,.999999)*pool.length))];
   if(state.owned[id])state.owned[id].shards++;
   else state.owned[id]={level:1,stars:1,shards:0};
   rewards.push(id);state.totalSummons++;
  }
  return rewards;
 }
 window.AUTOCHEST_IDLE_CORE=Object.freeze({KEY,MAX_LEVEL,MAX_STARS,OFFLINE_CAP_MS,
  initial,maxSquad,killsNeeded,stageName,levelCost,shardsNeeded,ascendCost,
  normalized,stats,power,monster,farmReward,bossReward,offlineLoot,spendLevel,ascend,draw});
})();
