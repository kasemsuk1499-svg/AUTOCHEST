/* AUTOCHEST IDLE v0.14 — autonomous stage combat and SAO progression. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const HEROES=window.AUTOCHEST_CHARACTERS?.HEROES;
const CORE=window.AUTOCHEST_IDLE_CORE;
if(!HEROES||!CORE)throw Error('Character and Idle Core modules must be loaded before idle-game.js');
const IDS=Object.keys(HEROES);
if(!IDS.length)throw Error('No SAO heroes registered');
const safe=(fn,alternative)=>{try{return fn()}catch(_){return alternative}};
const fmt=v=>Math.floor(v).toLocaleString('en-US');
const escapeText=v=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let loaded=safe(()=>JSON.parse(localStorage.getItem(CORE.KEY)),null);
let state=CORE.normalized(loaded,HEROES);
let pending=loaded?CORE.offlineLoot(Number(loaded.lastSaved)||Date.now(),Date.now(),state.stage):{minutes:0,gold:0,exp:0};
let selected=state.squad[0]||Object.keys(state.owned)[0]||IDS[0];
let combat=null,fighters=[],stageClock=0,respawn=.1,lastFrame=0,lastSave=0,lastHUD=0,toastTimer=0;
let logLines=['✦ เริ่มการผจญภัย SAO IDLE แล้ว!'];
const slots=[[20,71],[28,52],[19,35],[35,76],[34,28],[42,48],[42,67]];
const monsterIcons=['👾','🦇','🐺','👹','🦂','👻'];
const bossIcons=['🐲','👹','🦖','🦁','👿'];
const el=(tag,attrs={},inner='')=>{
 const node=document.createElement(tag);
 for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));
 if(inner)node.innerHTML=inner;
 return node;
};
function save(){
 state.lastSaved=Date.now();
 safe(()=>localStorage.setItem(CORE.KEY,JSON.stringify(state)),null);
 lastSave=performance.now();
}
function log(msg){
 logLines.unshift(msg);logLines=logLines.slice(0,3);
 $('battleLog').textContent=logLines.join('   ·   ');
}
function toast(msg){
 const n=$('toast');n.textContent=msg;n.classList.add('show');
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.classList.remove('show'),2300);
}
function teamStats(){
 return state.squad.map(id=>CORE.stats(HEROES[id],state.owned[id])).filter(Boolean);
}
function updateResources(){
 $('goldValue').textContent=fmt(state.gold);
 $('expValue').textContent=fmt(state.heroExp);
 $('rubyValue').textContent=fmt(state.rubies);
 $('ticketValue').textContent=fmt(state.tickets);
 $('teamPower').textContent=fmt(CORE.power(state,HEROES));
 $('stageName').textContent=CORE.stageName(state.stage);
 $('stageNumber').textContent=fmt(state.stage);
 $('bestStage').textContent=String(state.stage).padStart(2,'0');
 const need=CORE.killsNeeded(state.stage);
 $('killCounter').textContent=state.kills+' / '+need;
 $('killFill').style.width=Math.min(100,state.kills/need*100)+'%';
 $('teamCount').textContent=state.squad.length+' / '+CORE.maxSquad(state.stage);
 $('ownedCount').textContent=Object.keys(state.owned).length+' / '+IDS.length;
 $('autoBossBtn').textContent=state.autoBoss?'🔄 AUTO BOSS ON':'⏸ AUTO BOSS OFF';
 $('autoBossBtn').classList.toggle('selected',state.autoBoss);
 $('speedBtn').textContent='⏩ ×'+state.speed;
 $('challengeBtn').disabled=!!combat?.boss||state.kills<need;
 $('challengeBtn').textContent=combat?.boss?'👑 กำลังต่อสู้กับบอส':state.kills<need?'👑 ปลดล็อกบอส '+state.kills+'/'+need:'👑 ท้าทายบอส!';
 $('bossTimer').hidden=!combat?.boss;
 $('fightLabel').classList.toggle('boss-mode',!!combat?.boss);
 $('fightLabel').textContent=combat?.boss?'BOSS BATTLE':'AUTO FARM';
 if(combat?.boss){$('bossCountdown').textContent=Math.max(0,Math.ceil(combat.timeout))}
 const farm=CORE.farmReward(state.stage);
 $('farmGain').textContent='มอนสเตอร์ +'+fmt(farm.gold)+' G / +'+fmt(farm.exp)+' EXP';
 $('summonOneBtn').disabled=state.tickets<1&&state.rubies<120;
 $('summonTenBtn').disabled=state.rubies<Math.max(0,10-state.tickets)*120;
}
function renderTeam(){
 $('teamSlots').innerHTML=Array.from({length:CORE.maxSquad(state.stage)},(_,i)=>{
  const id=state.squad[i];
  if(!id)return '<button type="button" class="team-slot empty" data-slot="empty" aria-label="ช่องทีมว่าง">＋</button>';
  const hero=HEROES[id];
  return '<button type="button" class="team-slot '+(selected===id?'active':'')+'" data-slot="'+id+'">'+
   '<img loading="lazy" src="'+hero.images.idle+'" alt="">'+
   '<strong>'+escapeText(hero.name)+'</strong></button>';
 }).join('');
}
function renderHeroes(){
 $('heroList').innerHTML=IDS.map(id=>{
  const hero=HEROES[id],owned=state.owned[id];
  return '<button type="button" class="hero-card '+(!owned?'locked ':'')+(selected===id?'active':'')+'" data-hero="'+id+'">'+
  '<img loading="lazy" src="'+hero.portrait+'" alt="">'+
  '<strong>'+escapeText(hero.name)+'</strong>'+
  '<small>'+(owned?'Lv.'+owned.level: 'ยังไม่พบ')+'</small>'+
  '<div class="starline">'+(owned?'★'.repeat(owned.stars):'✦')+'</div></button>';
 }).join('');
}
function renderSelected(){
 const id=selected,hero=HEROES[id],prog=state.owned[id];
 const box=$('heroDetails');
 if(!hero){box.textContent='เลือกฮีโร่เพื่อดูข้อมูล';return}
 if(!prog){
  box.innerHTML='<div class="detail-hero"><img src="'+hero.portrait+'" alt=""><div><h4>'+escapeText(hero.name)+'</h4>'+
   '<p>'+escapeText(hero.subtitle)+'</p><p>🔒 ยังไม่ได้อัญเชิญ</p><p>ใช้กาชาเพื่อปลดล็อกฮีโร่คนนี้</p></div></div>';
  return;
 }
 const stats=CORE.stats(hero,prog),cost=CORE.levelCost(prog.level),
  shardNeed=CORE.shardsNeeded(prog.stars),rankCost=CORE.ascendCost(prog.stars);
 const isIn=state.squad.includes(id);
 const atCap=state.squad.length>=CORE.maxSquad(state.stage);
 box.innerHTML='<div class="detail-hero"><img src="'+hero.portrait+'" alt=""><div>'+
  '<h4>'+escapeText(hero.name)+'</h4><p>'+escapeText(hero.subtitle)+'</p>'+
  '<p>⚔️ '+escapeText(hero.team)+' · Lv.'+prog.level+'</p>'+
  '<div class="stars">'+'★'.repeat(prog.stars)+'☆'.repeat(CORE.MAX_STARS-prog.stars)+'</div>'+
  '<p>ชิ้นส่วน '+prog.shards+' / '+shardNeed+'</p></div></div>'+
  '<div class="detail-stats"><div><small>HP</small><strong>'+fmt(stats.hp)+'</strong></div>'+
  '<div><small>ATK</small><strong>'+fmt(stats.atk)+'</strong></div>'+
  '<div><small>CRIT</small><strong>'+Math.round(stats.crit*100)+'%</strong></div></div>'+
  '<p class="detail-skill">✨ สกิลอัตโนมัติ: <b>'+escapeText(hero.skill)+'</b></p>'+
  '<div class="detail-actions">'+
  '<button id="levelHeroBtn" '+(prog.level>=CORE.MAX_LEVEL||state.gold<cost.gold||state.heroExp<cost.exp?'disabled':'')+'>'+
   (prog.level>=CORE.MAX_LEVEL?'LEVEL MAX':'⬆ อัป Lv. · '+fmt(cost.gold)+' G / '+fmt(cost.exp)+' XP')+'</button>'+
  '<button id="rankHeroBtn" '+(prog.stars>=CORE.MAX_STARS||prog.shards<shardNeed||state.gold<rankCost?'disabled':'')+'>'+
   (prog.stars>=CORE.MAX_STARS?'★ MAX STARS':'⭐ เพิ่มดาว · '+shardNeed+' ชิ้น / '+fmt(rankCost)+' G')+'</button>'+
  '<button id="deployHeroBtn" class="featured" '+(!isIn&&atCap?'disabled':'')+'>'+
   (isIn?'↩ ถอนจากทีม':'⚔️ เพิ่มเข้าทีม')+'</button>'+
  '<button id="levelFiveBtn" '+(prog.level>=CORE.MAX_LEVEL||state.gold<cost.gold||state.heroExp<cost.exp?'disabled':'')+'>'+
   '⬆ อัปต่อเนื่อง ×5</button></div>';
}
function renderQuest(){
 let task;
 if(state.stage<5)task='ผ่านด่าน <b>5</b> เพื่อปลดล็อกช่องทีมที่ 5';
 else if(state.stage<12)task='ผ่านด่าน <b>12</b> เพื่อปลดล็อกช่องทีมที่ 6';
 else if(state.stage<20)task='ผ่านด่าน <b>20</b> เพื่อปลดล็อกช่องทีมที่ 7';
 else task='พิชิตด่าน <b>'+(state.stage+5)+'</b> และสะสมดาวฮีโร่';
 $('guideQuest').innerHTML='✧ '+task+'<br><small>กำจัดมอนสเตอร์ให้ครบ แล้วเรียกบอสเพื่อผ่านด่าน</small>';
}
function renderPanels(){
 updateResources();renderTeam();renderHeroes();renderSelected();renderQuest();
}
function choose(id){
 if(!HEROES[id])return;
 selected=id;renderTeam();renderHeroes();renderSelected();
}
function upgrade(count=1){
 if(!state.owned[selected])return;
 let n=0;for(let i=0;i<count;i++)if(CORE.spendLevel(state,selected))n++;else break;
 if(!n){toast('🪙 Gold หรือ Hero EXP ยังไม่พอ');return}
 renderPanels();save();toast('⬆ '+HEROES[selected].name+' เพิ่ม '+n+' เลเวล!');
}
function rankUp(){
 if(!CORE.ascend(state,selected)){toast('ต้องการชิ้นส่วนและ Gold เพิ่มนะ');return}
 renderPanels();save();toast('⭐ '+HEROES[selected].name+' เพิ่มดาวแล้ว!');
}
function toggleHero(){
 const id=selected;if(!state.owned[id])return;
 if(state.squad.includes(id)){
  if(state.squad.length<=1){toast('ต้องมีฮีโร่ในทีมอย่างน้อย 1 คน');return}
  state.squad=state.squad.filter(x=>x!==id);
 }else{
  if(state.squad.length>=CORE.maxSquad(state.stage)){toast('ช่องทีมเต็มแล้ว ผ่านด่านเพื่อเพิ่มช่องได้จ้า');return}
  state.squad.push(id);
 }
 resetCombat();renderPanels();save();
}
function autoTeam(){
 const owned=Object.keys(state.owned);
 const ranked=owned.sort((a,b)=>{
  const aTeam=HEROES[a].team==='ป้องกัน'?1:0,bTeam=HEROES[b].team==='ป้องกัน'?1:0;
  if(aTeam!==bTeam)return bTeam-aTeam;
  const x=CORE.stats(HEROES[a],state.owned[a]),y=CORE.stats(HEROES[b],state.owned[b]);
  return y.atk*10+y.hp/4-(x.atk*10+x.hp/4);
 });
 state.squad=ranked.slice(0,CORE.maxSquad(state.stage));
 resetCombat();renderPanels();save();toast('✦ จัดทีมให้แล้ว!');
}
function summon(count){
 const before=new Set(Object.keys(state.owned));
 const heroes=CORE.draw(state,HEROES,count);
 if(!heroes){toast('🎟️ ตั๋วหรือ Rubies ไม่พอ');return}
 $('summonResults').innerHTML=heroes.map(id=>'<span class="summon-result '+(!before.has(id)?'new':'')+'">'+
  escapeText(HEROES[id].name)+(!before.has(id)?' ✨ NEW':' +1 ชิ้น')+'</span>').join('');
 const fresh=heroes.filter(id=>!before.has(id)).length;
 renderPanels();save();toast('✨ อัญเชิญ '+count+' ครั้ง! ได้ฮีโร่ใหม่ '+fresh+' คน');
}
function openOffline(){
 $('rewardModal').hidden=false;
 $('offlineTime').textContent=pending.minutes>0?
  'ออกผจญภัยระหว่างออฟไลน์ '+Math.floor(pending.minutes/60)+' ชม. '+pending.minutes%60+' นาที (สูงสุด 8 ชั่วโมง)':
  'ยังไม่มีรางวัลออฟไลน์สะสม กลับมาเล่นใหม่หลังจากผ่านไปสักพักนะ';
 $('offlineResources').innerHTML='<div>🪙 GOLD<strong>+'+fmt(pending.gold)+'</strong></div>'+
   '<div>🔹 HERO EXP<strong>+'+fmt(pending.exp)+'</strong></div>';
 $('claimOfflineBtn').disabled=pending.minutes===0;
}
function closeOffline(){$('rewardModal').hidden=true}
function claimOffline(){
 if(pending.minutes<=0)return;
 state.gold+=pending.gold;state.heroExp+=pending.exp;
 const earned=pending;pending={minutes:0,gold:0,exp:0};
 closeOffline();renderPanels();save();
 toast('📦 รับรางวัลออฟไลน์ +'+fmt(earned.gold)+' G และ +'+fmt(earned.exp)+' EXP');
}
function spawnFx(label,x,y,critical=false){
 const fx=el('span',{class:'fx-number'+(critical?' critical':'')},escapeText(label));
 fx.style.left=x+'%';fx.style.top=y+'%';
 $('fxLayer').appendChild(fx);setTimeout(()=>fx.remove(),850);
}
function projectile(x1,y1,x2,y2,color='#c6f7ff'){
 const node=el('span',{class:'fx-bolt'});
 node.style.left=x1+'%';node.style.top=y1+'%';node.style.color=color;
 const rect=$('stageViewport').getBoundingClientRect();
 node.style.setProperty('--dx',(x2-x1)*rect.width/100+'px');
 node.style.setProperty('--dy',(y2-y1)*rect.height/100+'px');
 $('fxLayer').appendChild(node);setTimeout(()=>node.remove(),360);
}
function ring(x,y,cloak=false){
 const node=el('span',{class:cloak?'fx-cloak':'fx-ring'});
 node.style.left=x+'%';node.style.top=y+'%';
 $('fxLayer').appendChild(node);setTimeout(()=>node.remove(),850);
}
function clearFx(){$('fxLayer').replaceChildren()}
function buildFighters(){
 fighters=state.squad.filter(id=>state.owned[id]).map((id,i)=>{
  const stat=CORE.stats(HEROES[id],state.owned[id]),point=slots[i]||slots[0];
  return {id,x:point[0],y:point[1],hp:stat.hp,maxHp:stat.hp,atk:stat.atk,cool:stat.cool,remaining:i*.12,
   attacks:0,shield:0,crit:stat.crit,critDamage:stat.critDamage,cloakUntil:0,ambush:false,attackUntil:0,
   alive:true,progress:state.owned[id]};
 });
 const layer=$('heroLayer');layer.replaceChildren();
 for(const hero of fighters){
  const base=HEROES[hero.id],node=el('div',{class:'fighter'});
  node.style.left=hero.x+'%';node.style.top=hero.y+'%';
  node.innerHTML='<span class="mini-stars">'+'★'.repeat(hero.progress.stars)+'</span>'+
   '<img src="'+base.images.idle+'" alt="">'+
   '<div class="mini-hp"><i></i></div><span class="fighter-name">'+escapeText(base.name)+'</span>';
  layer.appendChild(node);hero.node=node;hero.img=node.querySelector('img');
  hero.hpbar=node.querySelector('.mini-hp i');hero.sprite=base.images.idle;
 }
}
function spawnMonster(boss=false){
 const def=CORE.monster(state.stage,boss);
 const icon=boss?bossIcons[(state.stage-1)%bossIcons.length]:monsterIcons[(state.kills+state.stage-1)%monsterIcons.length];
 combat={boss,hp:def.hp,maxHp:def.hp,atk:def.atk,remaining:def.delay,delay:def.delay,
  timeout:boss?35:0,x:boss?72:75,y:boss?52:58,icon};
 buildFighters();
 const layer=$('monsterLayer');layer.innerHTML='<div class="enemy-figure '+(boss?'boss':'')+'" style="left:'+combat.x+'%;top:'+combat.y+'%">'+
  '<span class="monster-icon">'+icon+'</span><strong>'+(boss?'👑 บอสแห่งด่าน '+state.stage:'มอนสเตอร์ Lv.'+state.stage)+'</strong>'+
  '<div class="enemy-hp"><i></i></div></div>';
 combat.bar=layer.querySelector('.enemy-hp i');
 $('battleMessage').textContent=boss?'👑 บอสปรากฏตัว!':'⚔️ กำลังฟาร์มมอนสเตอร์...';
 updateResources();
}
function resetCombat(){
 combat=null;fighters=[];respawn=.2;
 $('heroLayer').replaceChildren();$('monsterLayer').replaceChildren();clearFx();
}
function victoryBoss(){
 const reward=CORE.bossReward(state.stage);
 state.gold+=reward.gold;state.heroExp+=reward.exp;
 state.rubies+=reward.rubies;state.tickets+=reward.tickets;state.bossWins++;
 log('🏆 ผ่านด่าน '+state.stage+'! +'+fmt(reward.gold)+' G และ +'+fmt(reward.rubies)+' 💎');
 state.stage++;state.kills=0;save();
 $('battleMessage').textContent='🏆 ผ่านบอส! เข้าสู่ด่าน '+state.stage;
 respawn=1.1;combat=null;fighters=[];
 $('monsterLayer').replaceChildren();
 renderPanels();toast('🏆 ผ่านบอส! ด่าน '+state.stage+' • ได้ Rubies และตั๋ว!');
}
function failBoss(){
 log('💥 บอสแข็งแกร่งเกินไป! อัปเกรดฮีโร่แล้วลองอีกครั้ง');
 $('battleMessage').textContent='💥 บอสยังไม่ผ่าน • ฟาร์มต่อเพื่อเสริมพลัง';
 state.autoBoss=false;combat=null;respawn=1.6;
 $('monsterLayer').replaceChildren();updateResources();save();
 toast('💥 ยังโค่นบอสไม่ได้! อัปเลเวลแล้วท้าทายใหม่ได้');
}
function defeatMonster(){
 if(!combat)return;
 if(combat.boss){victoryBoss();return}
 const loot=CORE.farmReward(state.stage);
 state.gold+=loot.gold;state.heroExp+=loot.exp;
 state.kills=Math.min(CORE.killsNeeded(state.stage),state.kills+1);
 combat=null;respawn=.5;
 $('monsterLayer').replaceChildren();
 if(state.kills>=CORE.killsNeeded(state.stage)){
  $('battleMessage').textContent='👑 บอสพร้อมแล้ว!';
  if(state.autoBoss)respawn=.9;
 }
 updateResources();
}
function hitHero(enemy,target){
 const shield=Math.min(target.shield,enemy.atk);
 target.shield-=shield;
 const damage=Math.max(0,enemy.atk-shield);
 target.hp=Math.max(0,target.hp-damage);
 if(target.hp<=0)target.alive=false;
 spawnFx('-'+fmt(damage),target.x,target.y-23);
 projectile(enemy.x,enemy.y,target.x,target.y,'#ffc2a5');
}
function heroAttack(hero){
 if(!combat||combat.hp<=0)return;
 const base=HEROES[hero.id],effect=base.effect;
 const wasAmbush=hero.ambush&&stageClock>=hero.cloakUntil;
 if(wasAmbush)hero.ambush=false;
 hero.attacks++;
 let mult=wasAmbush?(base.cloakShotMultiplier||1.7):1;
 const special=hero.attacks%(base.triggerEvery||4)===0;
 if(special){
  if(effect==='slash'||effect==='blink')mult*=1.75;
  else if(effect==='triple')mult*=1.8;
  else if(effect==='chain')mult*=1.7;
  else if(effect==='slam')mult*=1.8;
  else if(effect==='shield'){
   hero.shield+=Math.round(hero.maxHp*.3);
   ring(hero.x,hero.y);spawnFx('🛡 SHIELD',hero.x,hero.y-20);
  }else if(effect==='cloakshot'){
   hero.cloakUntil=stageClock+(base.cloakDuration||2);
   hero.ambush=true;ring(hero.x,hero.y,true);
  }
 }
 const bonusCrit=wasAmbush?(base.cloakCritBonus||0):0;
 const crit=Math.random()<Math.min(1,hero.crit+bonusCrit);
 let damage=hero.atk*mult*(crit?hero.critDamage:1);
 if(wasAmbush&&combat.hp/combat.maxHp<(base.executeThreshold||.35))damage*=base.executeMultiplier||1.2;
 damage=Math.round(damage);
 combat.hp=Math.max(0,combat.hp-damage);
 hero.attackUntil=stageClock+.27;
 if(hero.img){hero.img.src=base.images.attack;hero.sprite=base.images.attack;
  hero.node.classList.remove('burst');void hero.node.offsetWidth;hero.node.classList.add('burst');}
 spawnFx((crit?'CRIT ':'')+fmt(damage),combat.x+(Math.random()-.5)*9,combat.y-30,crit);
 if(base.range>=1.8)projectile(hero.x,hero.y,combat.x,combat.y,base.col||'#c6f7ff');
 else if(special)ring(combat.x,combat.y);
}
function tick(dt){
 if($('rewardModal').hidden===false)return; // No fighting while offline claim is onscreen
 const t=Math.min(.08,dt)*state.speed;
 stageClock+=t;
 if(!combat){
  respawn-=t;
  if(respawn<=0){
   const ready=state.kills>=CORE.killsNeeded(state.stage);
   spawnMonster(ready&&state.autoBoss);
   if(!state.squad.length){resetCombat();respawn=2}
  }
  return;
 }
 if(combat.boss){
  combat.timeout-=t;
  if(combat.timeout<=0){failBoss();return}
 }
 for(const f of fighters){
  if(!f.alive)continue;
  f.remaining-=t;
  if(f.attackUntil<stageClock&&f.img&&f.sprite!==HEROES[f.id].images.idle){
   f.sprite=HEROES[f.id].images.idle;f.img.src=f.sprite;f.node.classList.remove('burst');
  }
  f.node.classList.toggle('cloaked',f.cloakUntil>stageClock);
  if(f.remaining<=0&&combat.hp>0&&f.cloakUntil<=stageClock){
   heroAttack(f);
   f.remaining+=f.cool;
   if(f.remaining<-.5)f.remaining=0;
  }
 }
 if(combat.hp<=0){defeatMonster();return}
 combat.remaining-=t;
 if(combat.remaining<=0){
  const targets=fighters.filter(f=>f.alive&&f.cloakUntil<=stageClock);
  const first=targets.find(x=>HEROES[x.id].team==='ป้องกัน')||targets[0];
  if(first)hitHero(combat,first);
  combat.remaining+=combat.delay;
 }
 if(!fighters.some(f=>f.alive)){
  if(combat.boss){failBoss();return}
  log('💔 ทีมพักฟื้นชั่วครู่ แล้วออกล่าใหม่');
  resetCombat();respawn=1.5;return;
 }
 if(combat.bar)combat.bar.style.width=Math.max(0,combat.hp/combat.maxHp*100)+'%';
 for(const f of fighters){
  if(f.hpbar)f.hpbar.style.width=Math.max(0,f.hp/f.maxHp*100)+'%';
  f.node.style.opacity=f.alive?'1':'.2';
 }
 $('bossTimer').hidden=!combat.boss;
 if(combat.boss)$('bossCountdown').textContent=Math.ceil(combat.timeout);
}
function frame(now){
 if(!lastFrame)lastFrame=now;
 tick((now-lastFrame)/1000);lastFrame=now;
 if(now-lastHUD>340){updateResources();lastHUD=now}
 if(now-lastSave>6000){save()}
 requestAnimationFrame(frame);
}
$('heroList').addEventListener('click',e=>{const n=e.target.closest('[data-hero]');if(n)choose(n.dataset.hero)});
$('teamSlots').addEventListener('click',e=>{
 const n=e.target.closest('[data-slot]');if(!n)return;
 if(n.dataset.slot==='empty'){toast('เลือกฮีโร่ด้านล่าง แล้วกดเพิ่มเข้าทีมนะ');return}
 choose(n.dataset.slot);
});
$('heroDetails').addEventListener('click',e=>{
 if(e.target.closest('#levelHeroBtn'))upgrade();
 else if(e.target.closest('#levelFiveBtn'))upgrade(5);
 else if(e.target.closest('#rankHeroBtn'))rankUp();
 else if(e.target.closest('#deployHeroBtn'))toggleHero();
});
$('autoTeamBtn').addEventListener('click',autoTeam);
$('summonOneBtn').addEventListener('click',()=>summon(1));
$('summonTenBtn').addEventListener('click',()=>summon(10));
$('autoBossBtn').addEventListener('click',()=>{
 state.autoBoss=!state.autoBoss;updateResources();save();
 toast(state.autoBoss?'🔄 เรียกบอสอัตโนมัติ ON':'⏸ เรียกบอสอัตโนมัติ OFF');
});
$('challengeBtn').addEventListener('click',()=>{
 if(state.kills<CORE.killsNeeded(state.stage)||combat?.boss)return;
 resetCombat();respawn=0;spawnMonster(true);updateResources();
});
$('speedBtn').addEventListener('click',()=>{
 state.speed=state.speed===1?2:1;updateResources();save();
 toast('⏩ ความเร็วต่อสู้ ×'+state.speed);
});
$('offlineBtn').addEventListener('click',openOffline);
$('claimOfflineBtn').addEventListener('click',claimOffline);
$('closeOfflineBtn').addEventListener('click',closeOffline);
$('rewardModal').querySelector('.modal-overlay').addEventListener('click',closeOffline);
window.addEventListener('beforeunload',save);
document.addEventListener('visibilitychange',()=>{if(document.hidden){save();lastFrame=0;}});
renderPanels();log('✨ ทีม SAO พร้อมฟาร์มอัตโนมัติแล้ว');
save();
window.__AUTOCHEST_IDLE_READY__=true;
if(pending.minutes>0)openOffline();
requestAnimationFrame(frame);
})();
