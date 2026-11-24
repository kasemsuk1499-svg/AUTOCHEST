/* AUTOCHEST TFT-inspired solo strategy rules: data/economy independent of rendering. */
(function(){'use strict';
 const MAX_LEVEL=8,XP_NEEDED={3:6,4:10,5:18,6:26,7:38};
 const ODDS={3:[77,20,3],4:[66,28,6],5:[55,34,11],6:[45,39,16],7:[36,41,23],8:[28,42,30]};
 const newRun=()=>({level:3,xp:0,hp:100,winsInRow:0,lossesInRow:0,shopLocked:false});
 const interest=gold=>Math.min(5,Math.max(0,Math.floor(gold/10)));
 function addXP(run,amount){
  let levels=0;if(run.level>=MAX_LEVEL)return 0;
  run.xp+=amount;
  while(run.level<MAX_LEVEL&&run.xp>=XP_NEEDED[run.level]){
   run.xp-=XP_NEEDED[run.level];run.level++;levels++;
  }
  if(run.level>=MAX_LEVEL)run.xp=0;
  return levels;
 }
 function rollShop(heroes,level,rng=Math.random){
  const pools={1:[],2:[],3:[]};
  for(const [id,v] of Object.entries(heroes))if(pools[v.cost])pools[v.cost].push(id);
  const chance=ODDS[level]||ODDS[8],all=Object.keys(heroes);
  if(!all.length)return [];
  return Array.from({length:5},()=>{
   const n=rng()*100,rarity=n<chance[0]?1:n<chance[0]+chance[1]?2:3;
   const pool=pools[rarity].length?pools[rarity]:all;
   return pool[Math.min(pool.length-1,Math.floor(rng()*pool.length))];
  });
 }
 function settleRound(run,{win,wave,gold,survivors}){
  if(win){run.winsInRow++;run.lossesInRow=0}
  else{run.lossesInRow++;run.winsInRow=0}
  const streakCount=Math.max(run.winsInRow,run.lossesInRow);
  const streak=streakCount>=4?2:streakCount>=2?1:0;
  const bank=interest(gold),income=5+bank+(win?1:0)+streak;
  const lostHP=win?0:3+survivors+Math.floor((wave-1)/4);
  run.hp=Math.max(0,run.hp-lostHP);
  const levels=addXP(run,2);
  return {income,lostHP,bank,streak,levels,gameover:run.hp===0};
 }
 function traitCounts(units,heroes){
  const count={};const distinct=new Set(units.filter(u=>u.board).map(u=>u.kind));
  for(const id of distinct){const team=heroes[id]?.team;if(team)count[team]=(count[team]||0)+1}
  return count;
 }
 function applyTraits(fighters,units,heroes){
  const counts=traitCounts(units,heroes);
  for(const u of fighters){
   if(u.side!=='ally')continue;
   if(u.team==='นักรบ'&&(counts['นักรบ']||0)>=2)u.atk*=1.15;
   if(u.team==='เวท'&&(counts['เวท']||0)>=2)u.atk*=1.2;
   if(u.team==='ยิงไกล'&&(counts['ยิงไกล']||0)>=2)u.cool*=.85;
   if(u.team==='ป้องกัน'&&(counts['ป้องกัน']||0)>=2){u.maxHp*=1.2;u.hp*=1.2}
  }
  return counts;
 }
 window.AUTOCHEST_TFT=Object.freeze({MAX_LEVEL,XP_NEEDED,ODDS,newRun,interest,addXP,rollShop,settleRound,traitCounts,applyTraits});
})();
