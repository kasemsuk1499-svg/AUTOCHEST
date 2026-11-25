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
  return {inRange:after<=range+3.05,moved:actor.walking,mode,distance:after,range};
 }
 function findTarget(actor,others,clock){
  let best=null,bestDist=Infinity,taunter=null,tauntDist=Infinity;
  for(const u of others){
   if(!u||u.hp<=0||u.alive===false||(u.cloakUntil||0)>clock)continue;
   const d=pxDist(actor,u);
   if((u.tauntUntil||0)>clock&&d<tauntDist){taunter=u;tauntDist=d}
   if(d<bestDist){best=u;bestDist=d}
  }
  return taunter||best;
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
 // A caster can resurrect a fallen ally only a limited number of times per encounter.
 function reviveAlly(caster,allies,config,clock){
  if(!caster||caster.hp<=0||caster.alive===false||!(config?.reviveHp>0)||!(config?.reviveLimit>0)||(caster.supportRevives||0)>=config.reviveLimit)return null;
  const target=allies.filter(u=>u&&u!==caster&&u.side===caster.side&&u.hp<=0&&u.alive===false&&!u.revivedByAlly&&u.maxHp>0)
   .sort((a,b)=>b.maxHp-a.maxHp)[0];
  if(!target)return null;
  caster.supportRevives=(caster.supportRevives||0)+1;
  target.revivedByAlly=true;target.hp=Math.max(1,Math.round(target.maxHp*clamp(config.reviveHp,0,1)));
  target.alive=true;target.immortalUntil=clock+Math.max(0,config.reviveImmortalSeconds||0);
  target.shield=0;target.shieldSource=null;target.castUntil=0;target.cloakUntil=0;target.ambush=false;target.walking=false;
  target.attackDown=null;target.vulnerability=null;target.remaining=.5;
  return target;
 }
 const livingHero=(allies,id,side)=>allies.find(u=>u.id===id&&u.side===side&&u.alive!==false&&u.hp>0);
 function linkedRevive(actor,hero,allies,clock){
  const p=hero?.passive;
  if(!actor||actor.hp>0||!(p?.aquaReviveHp>0)||!livingHero(allies,'aqua',actor.side))return false;
  actor.hp=Math.max(1,Math.round(actor.maxHp*Math.min(1,p.aquaReviveHp)));
  actor.alive=true;actor.immortalUntil=clock+Math.max(0,p.aquaImmortalSeconds||0);
  actor.shield=0;actor.shieldSource=null;actor.attackDown=null;actor.vulnerability=null;actor.remaining=.5;
  return true;
 }
 function explosionParty(actor,allies,heroFor){
  if(actor?.id!=='megumin'||actor.hp<=0||actor.alive===false)return null;
  const kazuma=livingHero(allies,'kazuma',actor.side),aqua=livingHero(allies,'aqua',actor.side);
  if(!kazuma||!aqua)return null;
  const rest=heroFor(kazuma)?.passive?.explosionRestSeconds;
  return rest>0?{rest}:null;
 }
 const blocksExplosion=(attackerHero,targetHero)=>attackerHero?.effect==='explosion'&&targetHero?.passive?.explosionImmune===true;
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
 // Shields refresh rather than stack indefinitely; all living teammates receive protection.
 function applyGuard(actor,allies,hero,clock){
  const g=hero?.guard;if(!g||actor.hp<=0)return [];
  const protectedUnits=[];
  for(const u of new Set([actor,...allies])){
   if(!u||u.hp<=0||u.alive===false)continue;
   const amount=Math.round(u.maxHp*(u===actor?g.selfShield:g.allyShield));
   if(amount>0&&amount>=(u.shield||0))u.shieldSource=actor.id||hero.id||null;
   u.shield=Math.max(u.shield||0,amount);protectedUnits.push(u);
  }
  actor.tauntUntil=clock+g.tauntSeconds;
  return protectedUnits;
 }
 const bossDamageMultiplier=(hero,target)=>target?.boss===true?Math.max(1,hero?.passive?.bossMultiplier||1):1;
 const cleaveTargets=(target,others,radius)=>others.filter(u=>u!==target&&u.hp>0&&u.alive!==false&&pxDist(u,target)<=radius);
 const incomingDamage=(raw,hero)=>Math.max(0,raw*(1-clamp(hero?.passive?.damageReduction||0,0,.95)));
 // Timed debuffs refresh; overlapping applications retain the strongest active amount.
 function applyDebuff(target,config,clock){
  if(!target||target.hp<=0||target.alive===false||!config)return false;
  for(const k of ['attackDown','vulnerability']){
   const amount=clamp(config[k]||0,0,.95);if(!amount)continue;
   const prev=target[k],until=clock+config.duration;
   target[k]={amount:Math.max(prev?.until>clock?prev.amount:0,amount),until:Math.max(prev?.until||0,until)};
  }
  return true;
 }
 const debuffValue=(actor,key,clock)=>actor?.[key]?.until>clock?actor[key].amount:0;
 const attackBuff=(actor,clock)=>debuffValue(actor,'attackUp',clock)+debuffValue(actor,actor?.damageType==='magic'?'magicAttackUp':'physicalAttackUp',clock);
 const outgoingMultiplier=(actor,clock)=>(1-debuffValue(actor,'attackDown',clock))*(1+attackBuff(actor,clock));
 const attackInterval=(actor,base,clock)=>base/(1+debuffValue(actor,'speedUp',clock));
 const vulnerabilityMultiplier=(actor,clock)=>1+debuffValue(actor,'vulnerability',clock);
 // Healing only affects living units; priority is lowest percentage HP.
 function healWeakest(allies,count,amount){
  const units=[...new Set(allies)].filter(u=>u&&u.alive!==false&&u.hp>0&&u.maxHp>u.hp)
   .sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp).slice(0,count);
  return units.map(u=>{
   const healed=Math.min(u.maxHp-u.hp,Math.max(0,Math.round(amount(u))));
   u.hp+=healed;return {unit:u,healed};
  });
 }
 function applySupport(allies,config,clock){
  const units=[...new Set(allies)].filter(u=>u&&u.hp>0&&u.alive!==false);
  const healed=healWeakest(units,config.healTargets,u=>u.maxHp*config.healHp);
  for(const u of units)for(const k of ['attackUp','physicalAttackUp','magicAttackUp','speedUp']){
   if(k==='physicalAttackUp'&&u.damageType==='magic'||k==='magicAttackUp'&&u.damageType!=='magic')continue;
   const amount=clamp(config[k]||0,0,1);if(!amount)continue;
   const prev=u[k];u[k]={amount:Math.max(prev?.until>clock?prev.amount:0,amount),until:Math.max(prev?.until||0,clock+config.duration)};
  }
  return {healed,units};
 }
 // DOT is a per-source curse, refreshed rather than stacked by the same caster.
 function applyDot(target,source,p,clock){
  if(!target||target.hp<=0||target.alive===false||!(p?.dotPower>0)||!(p?.dotTicks>0))return false;
  const same=d=>d.source===source||(source.side==='ally'&&d.source.side==='ally'&&d.source.id===source.id);
  const existing=(target.dots||[]).find(same);
  const config={source,power:source.atk*p.dotPower,pierceShield:p.dotPierceShield===true,freezeSeconds:Math.max(0,p.dotFreezeSeconds||0)};
  // A reapplication updates damage without postponing completion of the active curse.
  if(existing){Object.assign(existing,config);return true;}
  (target.dots||(target.dots=[])).push({...config,left:Math.min(30,Math.floor(p.dotTicks)),next:clock+1});return true;
 }
 function dueDots(target,clock){
  const due=[];
  for(const dot of target.dots||[])while(dot.left>0&&dot.next<=clock+1e-9){dot.left--;due.push({source:dot.source,power:dot.power,pierceShield:dot.pierceShield,freezeSeconds:dot.left===0?dot.freezeSeconds:0});dot.next++;}
  if(target.dots)target.dots=target.dots.filter(d=>d.left>0);
  return due;
 }
 const isFrozen=(actor,clock)=>(actor?.freezeUntil||0)>clock;
 function applyFreeze(target,seconds,clock){
  if(!target||target.hp<=0||target.alive===false||isImmortal(target,clock)||!(seconds>0))return false;
  target.freezeUntil=Math.max(target.freezeUntil||0,clock+seconds);target.walking=false;return true;
 }
 // Split after original target mitigation; transferred damage never redirects again.
 function splitMagicDamage(target,allies,heroFor,clock,raw){
  const total=Math.max(0,Math.round(raw));
  if(target.damageType!=='magic'||!total)return {target:total,guard:null,redirected:0};
  const eligible=allies.filter(u=>u!==target&&u.side===target.side&&u.alive!==false&&u.hp>0&&!isImmortal(u,clock)&&heroFor(u)?.passive?.magicGuard>0)
   .sort((a,b)=>heroFor(b).passive.magicGuard-heroFor(a).passive.magicGuard||b.hp-a.hp);
  const guard=eligible[0]||null,redirected=guard?Math.round(total*clamp(heroFor(guard).passive.magicGuard,0,.95)):0;
  return {target:total-redirected,guard,redirected};
 }
 // One integer damage transaction supplies both HP/shield state and combat text.
 function resolveDamage(target,raw,pierceShield=false){
  const total=Math.max(0,Math.round(raw)),hpBefore=Math.max(0,Math.round(target.hp||0));
  const shieldBefore=Math.max(0,Math.round(target.shield||0));
  const absorbed=pierceShield?0:Math.min(shieldBefore,total);
  const damage=Math.min(hpBefore,total-absorbed);
  target.shield=shieldBefore-absorbed;target.hp=hpBefore-damage;
  if(!target.shield)target.shieldSource=null;
  return {damage,absorbed,total};
 }
 window.AUTOCHEST_TFT_COMBAT=Object.freeze({W,H,SX,pxDist,attackRange,isRanged,pursue,findTarget,advanceShot,tryRevive,reviveAlly,livingHero,linkedRevive,explosionParty,blocksExplosion,isImmortal,focusCritBonus,makePierce,advancePierce,applyGuard,incomingDamage,bossDamageMultiplier,cleaveTargets,applyDebuff,debuffValue,attackBuff,outgoingMultiplier,vulnerabilityMultiplier,attackInterval,healWeakest,applySupport,applyDot,dueDots,isFrozen,applyFreeze,splitMagicDamage,resolveDamage});
})();
