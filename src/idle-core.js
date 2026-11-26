/* AUTOCHEST Idle Adventure rules — standalone, deterministic state helpers. */
(function(){'use strict';
 const KEY='AUTOCHEST_SAO_IDLE_V1';
 const MAX_LEVEL=100,MAX_STARS=5,OFFLINE_CAP_MS=8*60*60*1000;
 const FLOOR_RESET_EVENT=1,START_TICKETS=100,DUNGEON_REWARD_MULT=10,DUNGEON_ENTRY_COST=1000;
 const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
 const number=(n,fallback=0)=>Number.isFinite(Number(n))?Number(n):fallback;
 const initial=()=>({
  version:1,floorResetEvent:FLOOR_RESET_EVENT,accountEpoch:'',mode:'normal',nightmare:{stage:1,clearedStage:0,kills:0,bossRetryWaves:0,bossWins:0},stage:1,clearedStage:0,kills:0,bossRetryWaves:0,gold:3000,heroExp:1800,rubies:1200,tickets:START_TICKETS,universalShards:0,
  farmMode:'push',farmGoal:'gold',farmStages:{normal:1,nightmare:1},dungeonRepeat:true,favorites:[],squad:['asuna','kirito','silica'],owned:{
   asuna:{level:1,stars:1,shards:0},
   kirito:{level:1,stars:1,shards:0},
   silica:{level:1,stars:1,shards:0}
  },placements:{asuna:{col:2,row:6},kirito:{col:3,row:6},silica:{col:1,row:5}},autoBoss:true,autoWalk:true,autoBattle:true,speed:1,bossWins:0,totalSummons:0,farmTicketKills:0,offlineTicketMinutes:0,offlineBank:{minutes:0,gold:0,exp:0,rubies:0,tickets:0},lastSaved:Date.now()
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
 const STAGES_PER_FLOOR=5;
 const floorNumber=stage=>Math.ceil(Math.max(1,stage)/STAGES_PER_FLOOR);
 const bossStars=stage=>(Math.max(1,Math.floor(number(stage,1)))-1)%STAGES_PER_FLOOR+1;
 const floorCount=(roster=window.AUTOCHEST_CHARACTERS?.HEROES)=>Math.max(1,Object.keys(roster||{}).length);
 const maxStage=roster=>floorCount(roster)*STAGES_PER_FLOOR;
 // Preserve the original nine floors even if the hero script order is changed.
 // Register new heroes at the end of the loaded roster to append their floors.
 const ORIGINAL_FLOOR_BOSSES=['asuna','kirito','sinon','lisbeth','deathgun','heathcliff','silica','megumin','artoria'];
 function floorOrder(roster=window.AUTOCHEST_CHARACTERS?.HEROES){
  const ids=Object.keys(roster||{});
  return [...ORIGINAL_FLOOR_BOSSES.filter(id=>ids.includes(id)),...ids.filter(id=>!ORIGINAL_FLOOR_BOSSES.includes(id))];
 }
 function floorBossId(stage,roster){
  return floorOrder(roster)[floorNumber(stage)-1]||null;
 }
 // Normal enemies unlock cumulatively. Rates are per spawn, not per wave.
 function enemySpawnRates(stage,roster,excluded=[]){
  const pool=floorOrder(roster).slice(0,floorNumber(stage));
  const n=pool.length;
  const weighted=pool.map((id,i)=>({id,weight:n===1?1:n===2?.5:i===n-1?.5:i===n-2?.3:.2/(n-2)}));
  const available=weighted.filter(x=>!excluded.includes(x.id));
  const total=available.reduce((sum,x)=>sum+x.weight,0);
  return total?available.map(x=>({id:x.id,rate:x.weight/total})):[];
 }
 function pickEnemyId(stage,roster,rng=Math.random,excluded=[]){
  const rates=enemySpawnRates(stage,roster,excluded);
  if(!rates.length)return null;
  let roll=rng();
  for(const {id,rate} of rates){roll-=rate;if(roll<0)return id;}
  return rates[rates.length-1].id;
 }
 const nightmareUnlocked=state=>state.stage>=6||state.clearedStage>=5;
 const activeRun=state=>state.mode==='nightmare'?state.nightmare:state;
 const farmMaxStage=(state,mode=state.mode)=>{const r=mode==='nightmare'?state.nightmare:state;return Math.max(1,Math.min(r.stage,r.clearedStage||1));};
 const clampFarmStage=(state,stage,mode=state.mode)=>Math.floor(clamp(number(stage,1),1,farmMaxStage(state,mode)));
 const farming=state=>['manual','smart'].includes(state.farmMode);
 const battleStage=state=>farming(state)?clampFarmStage(state,state.farmStages?.[state.mode]):activeRun(state).stage;
 const FARM_GOALS=['gold','exp','rubies','tickets'];
 function farmRates(r){
  if(!(r?.seconds>0))return null;
  return Object.fromEntries(FARM_GOALS.map(k=>[k,(r[k]||0)*3600/r.seconds]));
 }
 function recordFarmWave(records,stage,seconds,kills,mode='normal'){
  if(!(seconds>0)||!Number.isFinite(seconds))return;
  const n=Math.max(0,Math.floor(number(kills,0))),r=farmReward(stage,mode);
  const old=records[stage]||{waves:0,seconds:0,gold:0,exp:0,rubies:0,tickets:0};
  const f=old.waves>=6?.8:1;
  records[stage]={waves:Math.min(6,old.waves+1),seconds:old.seconds*f+seconds,
   gold:old.gold*f+n*r.gold,exp:old.exp*f+n*r.exp,rubies:old.rubies*f+n*r.rubies,
   tickets:old.tickets*f+n*(mode==='nightmare'?2:1)/ECONOMY.killsPerTicket};
 }
 function smartFarmStage(state,records){
  const max=farmMaxStage(state),goal=FARM_GOALS.includes(state.farmGoal)?state.farmGoal:'gold';
  const current=clampFarmStage(state,state.farmStages?.[state.mode]);
  const coarse=[max,Math.ceil(max*.75),Math.ceil(max*.5),Math.ceil(max*.25),1];
  const measured=Object.keys(records).map(Number).filter(n=>n>=1&&n<=max&&records[n].waves>=2)
   .sort((a,b)=>(farmRates(records[b])?.[goal]||0)-(farmRates(records[a])?.[goal]||0)||b-a);
  const best=measured[0]||current;
  const candidates=[...new Set([...coarse,...[best-3,best-1,best+1,best+3].filter(n=>n>=1&&n<=max)])];
  if(candidates.includes(current)&&(records[current]?.waves||0)<2)return current;
  return candidates.find(n=>(records[n]?.waves||0)<2)||best;
 }
 const nightmareBossCount=stage=>floorNumber(stage)>=4?3:2;
 function nightmareStars(stage,rng=Math.random){
  const max=Math.min(5,floorNumber(stage)+1);
  return 1+Math.min(max-1,Math.floor(Math.max(0,Math.min(.999999,rng()))*max));
 }
 function nightmareBossIds(stage,roster,rng=Math.random){
  const main=floorBossId(stage,roster);if(!main)return [];
  const result=[main],count=nightmareBossCount(stage);
  const pool=floorOrder(roster).slice(0,floorNumber(stage));
  while(result.length<count){
   const eligible=pool.filter(id=>roster[id].effect!=='explosion'||!result.some(x=>roster[x].effect==='explosion'));
   const unused=eligible.filter(id=>!result.includes(id));
   const choices=unused.length?unused:eligible;
   if(!choices.length)break;
   result.push(choices[Math.min(choices.length-1,Math.max(0,Math.floor(rng()*choices.length)))]);
  }
  return result;
 }
 const canChallengeStage=(state,roster)=>state.stage<=maxStage(roster)&&(state.clearedStage||0)<state.stage;
 const nextEncounter=(state,roster)=>state.autoBoss&&canChallengeStage(state,roster)&&state.kills>=killsNeeded(state.stage)&&state.bossRetryWaves===0?'boss':'wave';
 function clearStage(state,roster){
  if(!canChallengeStage(state,roster))return false;
  state.clearedStage=state.stage;
  if(state.stage<maxStage(roster))state.stage++;
  state.kills=0;state.bossRetryWaves=0;
  return true;
 }
 const bossDefeated=state=>{state.bossRetryWaves=3;};
 const waveCleared=state=>{
  if(state.bossRetryWaves>0)state.bossRetryWaves--;
  return state.bossRetryWaves;
 };
 const stageName=stage=>['ทุ่งหญ้าแห่งการเริ่มต้น','ป่าแห่งความทรงจำ','หุบเขาเหล็ก','วิหารรัตติกาล','ปราสาทลอยฟ้า'][floorNumber(stage)-1]||('ชั้นที่ '+floorNumber(stage));
 const levelCost=level=>({gold:Math.round(75*Math.pow(level,1.35)),exp:Math.round(32*Math.pow(level,1.25))});
 const shardsNeeded=stars=>stars>=MAX_STARS?0:stars===1?3:stars===2?6:stars===3?10:15;
 const shardsToMax=stars=>{let total=0;for(let n=stars;n<MAX_STARS;n++)total+=shardsNeeded(n);return total;};
 const ascendCost=stars=>250*stars*stars;
 function normalized(raw,roster){
  if(!raw||typeof raw!=='object'||raw.version!==1)return initial();
  const state=initial(),ids=Object.keys(roster);
  state.accountEpoch=typeof raw.accountEpoch==='string'?raw.accountEpoch:'';
  for(const key of ['stage','kills','gold','heroExp','rubies','tickets','bossWins','totalSummons','universalShards'])
   state[key]=Math.floor(clamp(number(raw[key],key==='tickets'?10:state[key]),0,1e12));
  const resetFloor=number(raw.floorResetEvent,0)<FLOOR_RESET_EVENT;
  if(resetFloor){state.tickets+=100;state.stage=1;state.kills=0;state.bossWins=0;}
  state.stage=Math.max(1,state.stage);
  // Old saves keep their stage. Only a previously cleared final stage advances
  // automatically when a newly registered hero extends the published floors.
  state.clearedStage=resetFloor?0:Math.max(state.stage-1,Math.floor(clamp(number(raw.clearedStage,0),0,state.stage)));
  const resumeNext=state.clearedStage===state.stage&&state.stage<maxStage(roster);
  if(resumeNext){state.stage++;state.kills=0;}
  state.kills=clamp(state.kills,0,killsNeeded(state.stage));
  state.bossRetryWaves=resetFloor||resumeNext?0:Math.floor(clamp(number(raw.bossRetryWaves,0),0,3));
  const nr=raw.nightmare;
  if(nr&&typeof nr==='object'&&!resetFloor){
   const p=state.nightmare;
   p.stage=Math.floor(clamp(number(nr.stage,1),1,maxStage(roster)));
   p.clearedStage=Math.max(p.stage-1,Math.floor(clamp(number(nr.clearedStage,0),0,p.stage)));
   const advance=p.clearedStage===p.stage&&p.stage<maxStage(roster);
   if(advance)p.stage++;
   p.kills=advance?0:Math.floor(clamp(number(nr.kills,0),0,killsNeeded(p.stage)));
   p.bossRetryWaves=advance?0:Math.floor(clamp(number(nr.bossRetryWaves,0),0,3));
   p.bossWins=Math.floor(clamp(number(nr.bossWins,0),0,1e12));
  }
  state.mode=raw.mode==='nightmare'&&nightmareUnlocked(state)?'nightmare':'normal';
  state.dungeonRepeat=raw.dungeonRepeat!==false;
  state.farmMode=!resetFloor&&['push','manual','smart'].includes(raw.farmMode)?raw.farmMode:'push';
  state.farmGoal=FARM_GOALS.includes(raw.farmGoal)?raw.farmGoal:'gold';
  for(const mode of ['normal','nightmare'])state.farmStages[mode]=clampFarmStage(state,resetFloor?1:raw.farmStages?.[mode]??farmMaxStage(state,mode),mode);
  state.autoBoss=raw.autoBoss!==false;
  state.autoWalk=raw.autoWalk!==false;
  state.autoBattle=raw.autoBattle!==false;
  state.speed=1; // Legacy accelerated saves migrate to normal battle speed.
  state.lastSaved=clamp(number(raw.lastSaved,Date.now()),0,Date.now());
  state.farmTicketKills=Math.floor(clamp(number(raw.farmTicketKills,0),0,19));
  state.offlineTicketMinutes=Math.floor(clamp(number(raw.offlineTicketMinutes,0),0,29));
  if(raw.offlineBank&&typeof raw.offlineBank==='object'){
   for(const key of ['minutes','gold','exp','rubies','tickets'])
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
  state.favorites=Array.isArray(raw.favorites)?[...new Set(raw.favorites)].filter(id=>typeof id==='string'&&Object.hasOwn(roster,id)):[];
  state.squad=Array.isArray(raw.squad)?[...new Set(raw.squad)].filter(id=>state.owned[id]&&roster[id]).slice(0,maxSquad(state.stage)):[];
  if(!state.squad.length)state.squad=Object.keys(state.owned).slice(0,maxSquad(state.stage));
  fillPlacements(state,raw.placements);
  for(const id of Object.keys(state.owned))convertMaxShards(state,id,roster[id]);
  return state;
 }
 // Skill cadence is separate from normal attack speed and VFX timing.
 const SKILL_MIN_INTERVAL=5;
 const skillAttackCount=hero=>Math.max(1,Math.floor(number(hero?.triggerEvery,4)))+3;
 const explosionCastSeconds=hero=>Math.max(1,number(hero?.castSeconds,5))+1;
 const explosionRestSeconds=rest=>Math.max(0,number(rest,2))+2;
 function consumeSkillAttack(actor,hero,clock,force=false){
  const need=skillAttackCount(hero);
  actor.attacks=Math.min(need,(actor.attacks||0)+1);
  if(!force&&(actor.attacks<need||clock+1e-9<(actor.nextSkillAt||0)))return false;
  actor.attacks=0;actor.nextSkillAt=clock+SKILL_MIN_INTERVAL;return true;
 }
 const starCache=new WeakMap();
 const starKeys=new Set(['skillPower','triggerEvery','critChance','critDamage','cool','castSeconds','cloakDuration','cloakShotMultiplier','cloakCritBonus','executeThreshold','executeMultiplier','pierceRadius','slamRadius','passive','support','guard','debuff','cleave','fireTrail']);
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
 // Deployed unique heroes activate only the highest reached threshold per tag.
 const factions={asuna:'sao',kirito:'sao',sinon:'sao',lisbeth:'sao',deathgun:'sao',heathcliff:'sao',silica:'sao',megumin:'konosuba',aqua:'konosuba',artoria:'fate'};
 const factionOf=h=>h.faction||factions[h.id];
 const damageType=h=>h?.damageType||(h?.team==='เวท'?'magic':'physical');
 const VTUBER_TIERS=[{count:2,healPower:.20,antiHealPower:.20},{count:3,healPower:.35,antiHealPower:.35},{count:5,healPower:.55,antiHealPower:.55}];
 function vtuberBonus(ids,roster){
  const count=[...new Set(ids)].filter(id=>roster[id]&&factionOf({...roster[id],id})==='vtuber').length;
  return VTUBER_TIERS.filter(t=>t.count<=count).at(-1)||{healPower:0,antiHealPower:0};
 }
 const synergyDefs=[
  {id:'sao',name:'Sword Art Online',icon:'⚔️',match:h=>factionOf(h)==='sao',tiers:[{count:3,hp:.05,atk:.05},{count:5,hp:.10,atk:.10},{count:7,hp:.16,atk:.16}]},
  {id:'konosuba',name:'KonoSuba',icon:'💥',match:h=>factionOf(h)==='konosuba',tiers:[{count:2,hp:.10,atk:.10}]},
  {id:'konosuba_trio',name:'ปาร์ตี้มหาวิบัติ',icon:'🍀',match:h=>['kazuma','aqua','megumin'].includes(h.id),tiers:[{count:3,special:'อควา + คาซึมะ + เมกุมินมีชีวิตครบ: EXPLOSION ซ้ำได้'}]},
  {id:'vtuber',name:'วีทูปเบอร์',icon:'🎤',match:h=>factionOf(h)==='vtuber',tiers:VTUBER_TIERS,showFuture:true},
  {id:'celestial_beast',name:'สัตว์สวรรค์',icon:'🦊',match:h=>factionOf(h)==='celestial_beast',showFuture:true,tiers:[{count:2,dotDamage:.15},{count:3,dotDamage:.25},{count:5,dotDamage:.40},{count:7,dotDamage:.55}]},
  {id:'fate',name:'Fate',icon:'👑',match:h=>factionOf(h)==='fate',tiers:[{count:2,hp:.10,atk:.10}]},
  {id:'duo',name:'คู่ดาบแห่ง Aincrad',icon:'💞',match:h=>h.id==='asuna'||h.id==='kirito',tiers:[{count:2,speed:.08}]},
  {id:'warrior',name:'นักรบ',icon:'🗡️',match:h=>h.team==='นักรบ',tiers:[{count:2,speed:.10},{count:3,speed:.18}]},
  {id:'mage',name:'พลังเวท',icon:'🔮',match:h=>damageType(h)==='magic',tiers:[{count:2,magicAtk:.10},{count:3,magicAtk:.18},{count:5,magicAtk:.25},{count:7,magicAtk:.35}]},
  {id:'physical',name:'พลังกายภาพ',icon:'⚔️',match:h=>damageType(h)==='physical',tiers:[{count:2,physicalAtk:.10},{count:3,physicalAtk:.18},{count:5,physicalAtk:.25},{count:7,physicalAtk:.35}]},
  {id:'ranged',name:'ยิงไกล',icon:'🎯',match:h=>h.team==='ยิงไกล',tiers:[{count:2,crit:.10},{count:3,crit:.18}]},
  {id:'tank',name:'ป้องกัน',icon:'🛡️',match:h=>h.team==='ป้องกัน',tiers:[{count:2,hp:.18},{count:3,hp:.28}]}
 ];
 function teamSynergies(state,roster){
  const ids=[...new Set(state.squad)].filter(id=>state.owned[id]&&roster[id]);
  return synergyDefs.map(def=>{
   const available=Object.keys(roster).filter(id=>def.match({...roster[id],id}));
   const tiers=def.showFuture&&available.length?def.tiers:def.tiers.filter(t=>t.count<=available.length);
   const members=ids.filter(id=>available.includes(id));
   const active=tiers.filter(t=>t.count<=members.length).at(-1)||null;
   const next=tiers.find(t=>t.count>members.length)||null;
   return {...def,available,members,tiers,active,next};
  }).filter(tag=>tag.tiers.length);
 }
 function synergyBonus(id,tags){
  const bonus={hp:0,atk:0,physicalAtk:0,magicAtk:0,dotDamage:0,speed:0,crit:0};
  for(const tag of tags)if(tag.active&&tag.members.includes(id))
   for(const key of Object.keys(bonus))bonus[key]+=tag.active[key]||0;
  return bonus;
 }
 function teamHeroStats(state,roster,id,progress=state.owned[id],tags=teamSynergies(state,roster)){
  const s=stats(roster[id],progress);if(!s)return null;
  const b=synergyBonus(id,tags);
  return {...s,dotDamage:b.dotDamage,hp:Math.round(s.hp*(1+b.hp)),atk:Math.round(s.atk*(1+b.atk+(damageType(roster[id])==='magic'?b.magicAtk:b.physicalAtk))),cool:Math.max(.28,s.cool/(1+b.speed)),crit:Math.min(1,s.crit+b.crit)};
 }
 function power(state,roster){
  const tags=teamSynergies(state,roster);
  return state.squad.reduce((sum,id)=>{
   const base=stats(roster[id],state.owned[id]),s=teamHeroStats(state,roster,id,state.owned[id],tags);
   if(!s||!base)return sum;
   const critRatio=(1+s.crit*(s.critDamage-1))/(1+base.crit*(base.critDamage-1));
   return sum+Math.round(s.atk*10*base.cool/s.cool*critRatio+s.hp*.3);
  },0);
 }
 // Fixed endgame budget, independent of roster size. Rebalance only when hero power ceiling rises.
 const ENDGAME_STAGE=50,ENDGAME_CAP_STAGE=70;
 const ENDGAME_BOSS_HP=160000,ENDGAME_BOSS_ATK=1500;
 const ENDGAME_BOSS_HP_CAP=200000,ENDGAME_BOSS_ATK_CAP=3500;
 function monster(stage,boss=false){
  const n=clamp(Math.floor(number(stage,1))-1,0,ENDGAME_CAP_STAGE-1);
  const early=Math.min(n,19),late=Math.max(0,Math.min(n,ENDGAME_STAGE-1)-19),t=late/(ENDGAME_STAGE-20);
  const endgame=clamp((n-(ENDGAME_STAGE-1))/(ENDGAME_CAP_STAGE-ENDGAME_STAGE),0,1);
  const hpGrowth=Math.pow(1.145,early)*Math.pow(ENDGAME_BOSS_HP/(1100*Math.pow(1.145,19)),t)*(1+endgame*(ENDGAME_BOSS_HP_CAP/ENDGAME_BOSS_HP-1));
  const atkGrowth=Math.pow(1.098,early)*Math.pow(ENDGAME_BOSS_ATK/(55*Math.pow(1.098,19)),t)*(1+endgame*(ENDGAME_BOSS_ATK_CAP/ENDGAME_BOSS_ATK-1));
  const hp=Math.round((boss?1100:175)*hpGrowth);
  const atk=Math.round((boss?55:15)*atkGrowth);
  return {hp,atk,delay:boss?1.45:2.15};
 }
 // Boss stars primarily unlock skills; avoid multiplying the exponential stage curve by full player stat growth.
 function enemyHero(hero,stars=1,boss=false){
  const h=heroAtStars(hero,stars);
  if(!h||!boss||!h.support)return h;
  // Bosses have huge HP pools; percent healing must not stall the 35-second encounter.
  return {...h,support:{...h.support,healHp:Math.min(h.support.healHp||0,.10)}};
 }
 function enemyStats(hero,stage,boss=false,mode='normal',randomStars=1){
  const night=mode==='nightmare',stars=boss?bossStars(stage):night?clamp(Math.floor(randomStars),1,MAX_STARS):1,h=enemyHero(hero,stars,boss),base=monster(stage,boss);
  const hpScale=night?(boss?1.35/nightmareBossCount(stage):1.15):1,atkScale=night?(boss?1.30/nightmareBossCount(stage):1.10):1;
  return {stars,hp:Math.max(1,Math.round(base.hp*clamp(.8+hero.hp/3000,.8,1.3)*(1+(stars-1)*.03)*hpScale)),
   atk:Math.round(base.atk*clamp(.9+hero.dmg/900,.9,1.1)*(1+(stars-1)*.02)*atkScale),
   delay:Math.max(.75,h.cool*1.2),crit:h.critChance||.05,critDamage:h.critDamage||1.5};
 }
 // Economy balance: speed up levelling without devaluing duplicate hero shards.
 const ECONOMY=Object.freeze({farm:3,boss:3,offline:5,bossRubies:3,killsPerTicket:20,offlineMinutesPerTicket:30});
 function farmReward(stage,mode='normal'){
  const mult=mode==='nightmare'?2:1;
  return {gold:Math.round((28+stage*8)*ECONOMY.farm*mult),exp:Math.round((18+stage*5)*ECONOMY.farm*mult),rubies:(3+floorNumber(stage))*mult};
 }
 function bossReward(stage,mode='normal'){
  const mult=mode==='nightmare'?2:1;
  return {gold:Math.round((420+stage*110)*ECONOMY.boss*mult),exp:Math.round((280+stage*70)*ECONOMY.boss*mult),
   rubies:Math.round((75+stage*8)*ECONOMY.bossRubies*mult),tickets:(stage%STAGES_PER_FLOOR===0?5:3)*mult};
 }
 // Daily resource trials share the account's roster, not its stage progression.
 function dungeonTiers(state,roster){
  return [5,...Array.from({length:Math.floor(maxStage(roster)/10)},(_,i)=>(i+1)*10)].filter(stage=>stage<=maxStage(roster)).map((stage,i)=>({stage,tier:i+1,unlocked:state.clearedStage>=stage}));
 }
 function dungeonReward(kind,stage){
  if(!['gold','exp'].includes(kind))return 0;
  return Math.round(bossReward(stage,'normal')[kind]*DUNGEON_REWARD_MULT);
 }
 function dungeonUnlocked(state,kind,stage,roster){
  return ['gold','exp'].includes(kind)&&dungeonTiers(state,roster).some(t=>t.stage===stage&&t.unlocked);
 }
 function canEnterDungeon(state,kind,stage,roster){
  return dungeonUnlocked(state,kind,stage,roster)&&state.rubies>=DUNGEON_ENTRY_COST;
 }
 function payDungeonEntry(state,kind,stage,roster){
  if(!canEnterDungeon(state,kind,stage,roster))return false;
  state.rubies-=DUNGEON_ENTRY_COST;return true;
 }
 function claimDungeon(state,kind,stage,roster,now=Date.now()){
  if(!dungeonUnlocked(state,kind,stage,roster))return 0;
  const amount=dungeonReward(kind,stage);
  if(kind==='gold')state.gold+=amount;else state.heroExp+=amount;
  return amount;
 }
 function offlineLoot(lastSaved,now,stage,carry=0,mode='normal'){
  const mult=mode==='nightmare'?2:1;
  const ms=clamp(now-lastSaved,0,OFFLINE_CAP_MS);
  const mins=Math.floor(ms/60000);
  const total=Math.max(0,Math.min(ECONOMY.offlineMinutesPerTicket-1,Math.floor(number(carry,0))))+mins*mult;
  return {minutes:mins,gold:mins*(24+stage*6)*ECONOMY.offline*mult,exp:mins*(14+stage*4)*ECONOMY.offline*mult,
   rubies:mins*(4+floorNumber(stage))*mult,tickets:Math.floor(total/ECONOMY.offlineMinutesPerTicket),ticketRemainder:total%ECONOMY.offlineMinutesPerTicket};
 }
 function awardFarmKill(state,stage=battleStage(state)){
  const reward=farmReward(stage,state.mode);
  state.gold+=reward.gold;state.heroExp+=reward.exp;state.rubies+=reward.rubies;
  const kills=(state.farmTicketKills||0)+(state.mode==='nightmare'?2:1);
  const tickets=Math.floor(kills/ECONOMY.killsPerTicket);
  state.farmTicketKills=kills%ECONOMY.killsPerTicket;state.tickets+=tickets;
  return {...reward,tickets};
 }
 function spendLevel(state,id){
  const h=state.owned[id];if(!h||h.level>=MAX_LEVEL)return false;
  const cost=levelCost(h.level);if(state.gold<cost.gold||state.heroExp<cost.exp)return false;
  state.gold-=cost.gold;state.heroExp-=cost.exp;h.level++;return true;
 }
 const isMaxHero=p=>!!p&&p.level>=MAX_LEVEL&&p.stars>=MAX_STARS;
 // Overflow currency is a long-term targeted reward, not a cheap replacement for summons.
 const shardExchangeRate=hero=>[0,3,6,15,40][hero?.cost]||0;
 const heroExchangeCost=hero=>shardExchangeRate(hero)*10;
 const universalShardYield=hero=>[0,1,2,5,20][hero?.cost]||1;
 function convertMaxShards(state,id,hero=window.AUTOCHEST_CHARACTERS?.HEROES?.[id]){
  const p=state.owned[id];if(!p)return 0;
  const n=Math.max(0,p.shards-shardsToMax(p.stars));
  const gained=n*universalShardYield(hero);
  if(n){state.universalShards=(state.universalShards||0)+gained;p.shards-=n;}return gained;
 }
 function exchangeOffer(state,roster,id){
  const hero=roster[id],rate=shardExchangeRate(hero),p=state.owned[id];
  if(!rate||p?.stars>=MAX_STARS)return null;
  if(!p)return {kind:'unlock',amount:1,cost:heroExchangeCost(hero)};
  const missing=Math.max(0,shardsNeeded(p.stars)-p.shards);
  if(!missing)return null;
  const amount=Math.min(missing,Math.floor((state.universalShards||0)/rate));
  return {kind:'shards',amount:Math.max(1,amount),cost:Math.max(1,amount)*rate,rate};
 }
 function exchangeHero(state,roster,id){
  const offer=exchangeOffer(state,roster,id);
  if(!offer||state.universalShards<offer.cost)return null;
  state.universalShards-=offer.cost;
  if(offer.kind==='unlock')state.owned[id]={level:1,stars:1,shards:0};
  else state.owned[id].shards+=offer.amount;
  return offer;
 }
 function ascend(state,id){
  const h=state.owned[id];if(!h||h.stars>=MAX_STARS)return false;
  const need=shardsNeeded(h.stars),cost=ascendCost(h.stars);
  if(h.shards<need||state.gold<cost)return false;
  h.shards-=need;state.gold-=cost;h.stars++;convertMaxShards(state,id);return true;
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
   let universal=0;
   if(isNew)state.owned[id]={level:1,stars:1,shards:0};
   else {state.owned[id].shards++;universal=convertMaxShards(state,id,roster[id]);}
   rewards.push({id,isNew,shards:isNew||universal?0:1,universal});state.totalSummons++;
  }
  return {count,cost,rewards};
 }
 function draw(state,roster,count,rng=Math.random){
  return drawDetailed(state,roster,count,rng)?.rewards.map(u=>u.id)||null;
 }
 window.AUTOCHEST_IDLE_CORE=Object.freeze({KEY,MAX_LEVEL,MAX_STARS,OFFLINE_CAP_MS,FLOOR_RESET_EVENT,START_TICKETS,ECONOMY,DUNGEON_REWARD_MULT,DUNGEON_ENTRY_COST,dungeonTiers,dungeonReward,canEnterDungeon,payDungeonEntry,claimDungeon,
  initial,maxSquad,defaultCells,fillPlacements,killsNeeded,waveSize,nextEncounter,bossDefeated,waveCleared,stageName,STAGES_PER_FLOOR,floorNumber,bossStars,floorCount,maxStage,floorBossId,nightmareUnlocked,activeRun,nightmareBossCount,nightmareStars,nightmareBossIds,enemySpawnRates,pickEnemyId,canChallengeStage,clearStage,levelCost,shardsNeeded,shardsToMax,ascendCost,
  normalized,farmMaxStage,clampFarmStage,farming,battleStage,FARM_GOALS,farmRates,recordFarmWave,smartFarmStage,heroAtStars,damageType,SKILL_MIN_INTERVAL,skillAttackCount,consumeSkillAttack,explosionCastSeconds,explosionRestSeconds,stats,teamSynergies,synergyBonus,vtuberBonus,teamHeroStats,power,monster,enemyHero,enemyStats,farmReward,awardFarmKill,bossReward,offlineLoot,spendLevel,ascend,isMaxHero,convertMaxShards,universalShardYield,shardExchangeRate,heroExchangeCost,exchangeOffer,exchangeHero,draw,summonCost,summonOdds,drawDetailed});
})();
