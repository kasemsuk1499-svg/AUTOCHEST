/* TFT combat motion and projectiles for Idle (adapted from original src/game.js). */
(function(){'use strict';
 const W=760,H=775,SX=94;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const pxDist=(a,b)=>Math.hypot((a.x-b.x)*W/100,(a.y-b.y)*H/100);
 const attackRange=hero=>hero.globalRange?Math.hypot(W,H)+1:Math.max(40,Number(hero.range||1)*SX);
 const isRanged=hero=>Number(hero.range)>=1.8;
 function pursue(actor,target,hero,dt,side='ally'){
  if(!actor||!target||!hero||!Number.isFinite(dt))return {inRange:false,moved:false};
  const dx=(target.x-actor.x)*W/100,dy=(target.y-actor.y)*H/100,d=Math.hypot(dx,dy);
  const range=attackRange(hero),ranged=isRanged(hero);
  const engage=side==='enemy'&&ranged&&!hero.globalRange?Math.min(range,Math.max(165,range*.72)):range;
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
 // Focus stacks are tied to the actual target object, not its character ID.
 function focusCritBonus(actor,target,hero){
  const p=hero?.passive;
  if(!(p?.focusCritStep>0))return 0;
  if(actor.focusTarget!==target){actor.focusTarget=target;actor.focusHits=0}
  else actor.focusHits=Math.min(Math.ceil(p.focusCritMax/p.focusCritStep), (actor.focusHits||0)+1);
  return Math.min(p.focusCritMax,actor.focusHits*p.focusCritStep);
 }
 // Straight piercing shot in physical board coordinates, with swept collision.
 function makePierce(actor,target){
  const x=actor.x*W/100,y=actor.y*H/100;
  let dx=(target.x-actor.x)*W/100,dy=(target.y-actor.y)*H/100;
  let len=Math.hypot(dx,dy);
  if(len<.001){dx=0;dy=actor.side==='enemy'?1:-1;len=1}
  dx/=len;dy/=len;
  const limit=Math.min(dx>0?(W-x)/dx:dx<0?-x/dx:Infinity,dy>0?(H-y)/dy:dy<0?-y/dy:Infinity);
  return {x,y,dx,dy,distance:0,limit:Math.max(0,limit),hitSet:new Set()};
 }
 function advancePierce(shot,dt,targets){
  const p=shot.pierce,start=p.distance,end=Math.min(p.limit,start+Math.max(0,shot.speed*dt));
  const hits=[];
  for(const u of targets){
   if(!u||u.hp<=0||u.alive===false||p.hitSet.has(u))continue;
   const dx=u.x*W/100-p.x,dy=u.y*H/100-p.y,along=dx*p.dx+dy*p.dy,across=Math.abs(dx*p.dy-dy*p.dx);
   if(along<0||across>shot.radius)continue;
   const offset=Math.sqrt(Math.max(0,shot.radius**2-across**2));
   if(along+offset<start||along-offset>end)continue;
   hits.push({u,along});p.hitSet.add(u);
  }
  hits.sort((a,b)=>a.along-b.along);p.distance=end;
  shot.x=(p.x+p.dx*end)*100/W;shot.y=(p.y+p.dy*end)*100/H;
  return {hits:hits.map(h=>h.u),expired:end>=p.limit};
 }
 window.AUTOCHEST_TFT_COMBAT=Object.freeze({W,H,SX,pxDist,attackRange,isRanged,pursue,findTarget,advanceShot,tryRevive,isImmortal,focusCritBonus,makePierce,advancePierce});
})();
