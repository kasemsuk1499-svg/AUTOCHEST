/* TFT combat motion and projectiles for Idle (adapted from original src/game.js). */
(function(){'use strict';
 const W=760,H=775,SX=94;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const pxDist=(a,b)=>Math.hypot((a.x-b.x)*W/100,(a.y-b.y)*H/100);
 const attackRange=hero=>Math.max(40,Number(hero.range||1)*SX);
 const isRanged=hero=>Number(hero.range)>=1.8;
 function pursue(actor,target,hero,dt,side='ally'){
  if(!actor||!target||!hero||!Number.isFinite(dt))return {inRange:false,moved:false};
  const dx=(target.x-actor.x)*W/100,dy=(target.y-actor.y)*H/100,d=Math.hypot(dx,dy);
  const range=attackRange(hero),ranged=isRanged(hero);
  const engage=side==='enemy'&&ranged?Math.min(range,Math.max(165,range*.72)):range;
  const safe=ranged?Math.min(140,Math.max(96,range*.32)):0;
  const maxStep=Math.max(0,Number(hero.move)||80)*Math.max(0,dt);
  let step=0,mode='hold';
  if(d>engage+3){step=Math.min(d-engage+3,maxStep);mode='approach'}
  else if(ranged&&d<safe-8&&d>.01){step=-Math.min(safe-d,maxStep*.80);mode='retreat'}
  if(Math.abs(step)>.03&&d>.01){
   const x=clamp(actor.x+dx/d*step/W*100,5.5,94.5);
   const y=clamp(actor.y+dy/d*step/H*100,8,92);
   actor.walking=Math.hypot((x-actor.x)*W/100,(y-actor.y)*H/100)>.10;
   actor.x=x;actor.y=y;
  }else actor.walking=false;
  const after=pxDist(actor,target);
  return {inRange:after<=range+3,moved:actor.walking,mode,distance:after,range};
 }
 function findTarget(actor,others,clock){
  let best=null,bestDist=Infinity;
  for(const u of others){
   if(!u||u.hp<=0||u.alive===false||(u.cloakUntil||0)>clock)continue;
   const d=pxDist(actor,u);
   if(d<bestDist){best=u;bestDist=d}
  }
  return best;
 }
 function advanceShot(shot,dt){
  if(!shot.target||shot.target.hp<=0||shot.target.alive===false)return {hit:false,expired:true};
  shot.life-=dt;if(shot.life<=0)return {hit:false,expired:true};
  const d=pxDist(shot,shot.target),step=Math.max(0,shot.speed||340)*Math.max(0,dt);
  if(d<=step+9)return {hit:true,expired:true};
  if(d>0){shot.x+=(shot.target.x-shot.x)*step/d;shot.y+=(shot.target.y-shot.y)*step/d}
  return {hit:false,expired:false};
 }
 // Generic resurrection passive: resolve lethal damage before death or loot.
 function tryRevive(actor,hero,clock,alreadyUsed=false){
  const p=hero?.passive;
  if(!actor||actor.hp>0||alreadyUsed||actor.reviveUsed||!(p?.reviveHp>0))return false;
  actor.reviveUsed=true;
  actor.hp=Math.max(1,Math.round(actor.maxHp*Math.min(1,p.reviveHp)));
  actor.alive=true;actor.immortalUntil=clock+Math.max(0,p.immortalSeconds||0);
  return true;
 }
 const isImmortal=(actor,clock)=>(actor?.immortalUntil||0)>clock;
 window.AUTOCHEST_TFT_COMBAT=Object.freeze({W,H,SX,pxDist,attackRange,isRanged,pursue,findTarget,advanceShot,tryRevive,isImmortal});
})();
