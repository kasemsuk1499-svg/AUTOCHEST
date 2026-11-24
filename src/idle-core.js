/* AUTOCHEST Idle Adventure rules — standalone, deterministic state helpers. */
(function(){'use strict';
 const KEY='AUTOCHEST_SAO_IDLE_V1';
 const MAX_LEVEL=100,MAX_STARS=5,OFFLINE_CAP_MS=8*60*60*1000;
 const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
 const number=(n,fallback=0)=>Number.isFinite(Number(n))?Number(n):fallback;
 const initial=()=>({
  version:1,stage:1,kills:0,bossRetryWaves:0,gold:3000,heroExp:1800,rubies:1200,tickets:10,
  squad:['asuna','kirito','silica'],owned:{
   asuna:{level:1,stars:1,shards:0},
   kirito:{level:1,stars:1,shards:0},
   silica:{level:1,stars:1,shards:0}
  },placements:{asuna:{col:2,row:6},kirito:{col:3,row:6},silica:{col:1,row:5}},autoBoss:true,autoWalk:true,autoBattle:true,speed:1,bossWins:0,totalSummons:0,offlineBank:{minutes:0,gold:0,exp:0},lastSaved:Date.now()
 });
 const maxSquad=stage=>stage>=20?7:stage>=12?6:stage>=5?5:4;
 // Same 6x7 board as the original AUTOCHEST (friendly deployment: rows 4-6).
 const defaultCells=[[2,6],[3,6],[1,5],[4,5],[2,4],[3,4],[0,6]].map(([col,row])=>({col,row}));
 const allFriendlyCells=Array.from({length:3},(_,i)=>4+i)
   .flatMap(row=>Array.from({length:6},(_,col)=>({col,row})));
 function fillPlacements(state,saved){
  const placements={},occupied=new Set();
  // Reserve all valid saved positions first; an added or repaired unit must not displace others.
  for(const id of state.squad){
   const pos=saved&&saved[id],key=pos&&pos.col+':'+pos.row;
   const valid=pos&&Number.isInteger(pos.col)&&pos.col>=0&&pos.col<6&&
    Number.isInteger(pos.row)&&pos.row>=4&&pos.row<=6&&!occupied.has(key);
   if(valid){placements[id]={col:pos.col,row:pos.row};occupied.add(key)}
  }
  for(const [i,id] of state.squad.entries()){
   if(placements[id])continue;
   const preferred=defaultCells[i],cell=preferred&&!occupied.has(preferred.col+':'+preferred.row)?
    preferred:allFriendlyCells.find(p=>!occupied.has(p.col+':'+p.row));
   if(cell){placements[id]={col:cell.col,row:cell.row};occupied.add(cell.col+':'+cell.row)}
  }
  state.placements=placements;
  return placements;
 }
 const killsNeeded=stage=>6+Math.floor((stage-1)/5);
 // Waves are finite TFT encounters. The battle loop may not stream extra enemies mid-wave.
 const waveSize=stage=>Math.min(5,3+Math.floor((Math.max(1,stage)-1)/5));
 const nextEncounter=state=>state.autoBoss&&state.kills>=killsNeeded(state.stage)&&state.bossRetryWaves===0?'boss':'wave';
 const bossDefeated=state=>{state.bossRetryWaves=3;};
 const waveCleared=state=>{
  if(state.bossRetryWaves>0)state.bossRetryWaves--;
  return state.bossRetryWaves;
 };
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
  state.bossRetryWaves=Math.floor(clamp(number(raw.bossRetryWaves,0),0,3));
  state.autoBoss=raw.autoBoss!==false;
  state.autoWalk=raw.autoWalk!==false;
  state.autoBattle=raw.autoBattle!==false;
  state.speed=raw.speed===2?2:1;
  state.lastSaved=clamp(number(raw.lastSaved,Date.now()),0,Date.now());
  if(raw.offlineBank&&typeof raw.offlineBank==='object'){
   for(const key of ['minutes','gold','exp'])
    state.offlineBank[key]=Math.floor(clamp(number(raw.offlineBank[key],0),0,1e12));
  }
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
  fillPlacements(state,raw.placements);
  return state;
 }
 const starCache=new WeakMap();
 const starKeys=new Set(['skillPower','triggerEvery','critChance','critDamage','cool','castSeconds','cloakDuration','cloakShotMultiplier','cloakCritBonus','executeThreshold','executeMultiplier','pierceRadius','slamRadius','passive','support','guard','debuff','cleave']);
 function heroAtStars(hero,stars=1){
  if(!hero)return hero;
  const n=clamp(Math.floor(number(stars,1)),1,MAX_STARS);
  if(n===1||!Array.isArray(hero.starUpgrades))return hero;
  let byStar=starCache.get(hero);if(!byStar){byStar=new Map();starCache.set(hero,byStar)}
  if(byStar.has(n))return byStar.get(n);
  const result={...hero};
  for(const step of [...hero.starUpgrades].sort((a,b)=>a.star-b.star)){
   if(step.star<2||step.star>n)continue;
   for(const [key,value] of Object.entries(step.patch||{})){
    if(!starKeys.has(key))continue;
    if(value&&typeof value==='object'&&!Array.isArray(value))result[key]=Object.freeze({...result[key],...value});
    else if(Number.isFinite(value))result[key]=value;
   }
  }
  const out=Object.freeze(result);byStar.set(n,out);return out;
 }
 function stats(hero,progress){
  if(!hero||!progress)return null;
  const level=Math.max(1,progress.level),star=clamp(Math.floor(number(progress.stars,1)),1,MAX_STARS);
  hero=heroAtStars(hero,star);
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
 function summonCost(state,count){
  const tickets=Math.min(count,Math.max(0,Math.floor(state.tickets||0)));
  return {tickets,rubies:(count-tickets)*120};
 }
 function summonOdds(roster){
  // Fixed rarity buckets. Split each bucket evenly among its current heroes.
  // If a bucket is absent, normalize only the populated buckets.
  const tierRates={1:.55,2:.30,3:.14,4:.01};
  const entries=Object.entries(roster).filter(([,h])=>tierRates[h.cost]>0);
  const counts={};for(const [,h] of entries)counts[h.cost]=(counts[h.cost]||0)+1;
  const total=Object.keys(counts).reduce((sum,t)=>sum+tierRates[t],0);
  return entries.map(([id,h])=>({id,rate:tierRates[h.cost]/total/counts[h.cost]}));
 }
 function drawDetailed(state,roster,count,rng=Math.random){
  if(!Number.isInteger(count)||count<=0||count>10)return null;
  const cost=summonCost(state,count),odds=summonOdds(roster);
  if(state.rubies<cost.rubies||!odds.length)return null;
  const rewards=[];
  state.tickets-=cost.tickets;state.rubies-=cost.rubies;
  for(let i=0;i<count;i++){
   let roll=clamp(rng(),0,.999999999999),id=odds[odds.length-1].id;
   for(const entry of odds){if(roll<entry.rate){id=entry.id;break}roll-=entry.rate;}
   const isNew=!state.owned[id];
   if(isNew)state.owned[id]={level:1,stars:1,shards:0};
   else state.owned[id].shards++;
   rewards.push({id,isNew,shards:isNew?0:1});state.totalSummons++;
  }
  return {count,cost,rewards};
 }
 function draw(state,roster,count,rng=Math.random){
  return drawDetailed(state,roster,count,rng)?.rewards.map(u=>u.id)||null;
 }
 window.AUTOCHEST_IDLE_CORE=Object.freeze({KEY,MAX_LEVEL,MAX_STARS,OFFLINE_CAP_MS,
  initial,maxSquad,defaultCells,fillPlacements,killsNeeded,waveSize,nextEncounter,bossDefeated,waveCleared,stageName,levelCost,shardsNeeded,ascendCost,
  normalized,heroAtStars,stats,power,monster,farmReward,bossReward,offlineLoot,spendLevel,ascend,draw,summonCost,summonOdds,drawDetailed});
})();
