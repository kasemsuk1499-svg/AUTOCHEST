/* AUTOCHEST IDLE v0.14 — autonomous stage combat and SAO progression. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const HEROES=window.AUTOCHEST_CHARACTERS?.HEROES;
const CORE=window.AUTOCHEST_IDLE_CORE;
const TFT=window.AUTOCHEST_TFT_COMBAT;
if(!TFT)throw Error('TFT combat module missing: src/idle-tft-combat.js');
if(!HEROES||!CORE)throw Error('Character and Idle Core modules must be loaded before idle-game.js');
const IDS=Object.keys(HEROES);
if(!IDS.length)throw Error('No SAO heroes registered');
const safe=(fn,alternative)=>{try{return fn()}catch(_){return alternative}};
const fmt=v=>Math.floor(v).toLocaleString('en-US');
const escapeText=v=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let loaded=safe(()=>JSON.parse(localStorage.getItem(CORE.KEY)),null);
let state=CORE.normalized(loaded,HEROES);
if(loaded){
 const newLoot=CORE.offlineLoot(Number(loaded.lastSaved)||Date.now(),Date.now(),state.stage);
 state.offlineBank.minutes+=newLoot.minutes;
 state.offlineBank.gold+=newLoot.gold;
 state.offlineBank.exp+=newLoot.exp;
}
let pending=state.offlineBank;
let selected=state.squad[0]||Object.keys(state.owned)[0]||IDS[0];
let skillReturnFocus=null;
let formationMode=false,shots=[];
let combat=null,enemies=[],fighters=[],stageClock=0,respawn=1.8,spawnCooldown=0,travel=0,travelDistance=0,encounters=0,lastFrame=0,lastSave=0,lastHUD=0,toastTimer=0;
let logLines=['✦ เริ่มการผจญภัย SAO IDLE แล้ว!'];
const GRID_COLS=6,GRID_ROWS=7,ALLY_START_ROW=4;
const boardPoint=(col,row)=>({x:(col+.5)*100/GRID_COLS,y:(row+.5)*100/GRID_ROWS});
const friendlyCell=(col,row)=>Number.isInteger(col)&&Number.isInteger(row)&&
  col>=0&&col<GRID_COLS&&row>=ALLY_START_ROW&&row<GRID_ROWS;
const cellAtClient=(clientX,clientY)=>{
 const r=$('stageViewport').getBoundingClientRect();
 const col=Math.floor((clientX-r.left)/r.width*GRID_COLS);
 const row=Math.floor((clientY-r.top)/r.height*GRID_ROWS);
 return friendlyCell(col,row)?{col,row}:null;
};
let boardGesture=null,ignoreInspectUntil=0;
// Hero-shaped enemies share art and skills with the player's SAO roster.
const bosses=IDS.filter(id=>HEROES[id].cost===3);
const enemyLimit=()=>Math.min(5,3+Math.floor((state.stage-1)/5));
const enemyInterval=()=>Math.max(.68,1.05-(state.stage-1)*.022);
const near=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*.65);
const reach=id=>Math.min(41,Math.max(10,HEROES[id].range*8.1+2));
function moveTo(actor,target,r,dt){
 const dx=target.x-actor.x,dy=(target.y-actor.y)*.65,d=Math.hypot(dx,dy);
 if(d<=r+.3){actor.walking=false;return true}
 const step=Math.min(d-r+.4,Math.max(0,(actor.move||80)*dt*.20));
 if(d>0.01){actor.x+=dx/d*step;actor.y+=(dy/d*step)/.65}
 actor.x=Math.max(5,Math.min(95,actor.x));
 actor.y=Math.max(5,Math.min(95,actor.y));
 actor.walking=step>.04;
 return false;
}

// On the original 6x7 board the defending team stays on its own half.
// This lets attackers advance into the battlefield instead of being intercepted at spawn.
const DEFENDER_FRONT_Y=(ALLY_START_ROW+.07)*100/GRID_ROWS; // just inside allied territory
const INVADER_FRONT_Y=(ALLY_START_ROW-.42)*100/GRID_ROWS;   // move past enemy spawn lanes
function defenderApproach(actor,target,t){
 const x=actor.x,y=actor.y;
 if(near(actor,target)>reach(actor.id)+.3)moveTo(actor,target,reach(actor.id),t);
 actor.y=Math.max(DEFENDER_FRONT_Y,actor.y);
 actor.walking=Math.hypot(actor.x-x,actor.y-y)>.045;
 return near(actor,target)<=reach(actor.id)+.3;
}
// Enemy melee units rush to the actual target. Ranged units must first approach
// the front line instead of camping at a spawn tile, then strafe while shooting.
function invaderApproach(foe,target,t){
 const base=HEROES[foe.id],isRanged=base.range>=1.8;
 const x=foe.x,y=foe.y;
 const r=reach(foe.id);
 const advancing=foe.y<INVADER_FRONT_Y&&target.y>foe.y+6;
 if(advancing){
  const goal={x:Math.max(9,Math.min(91,target.x)),y:Math.min(INVADER_FRONT_Y+3,target.y-6)};
  moveTo(foe,goal,1.5,t);
 }else{
  const closerRange=isRanged?Math.min(r,23):r;
  moveTo(foe,target,closerRange,t);
  if(isRanged&&near(foe,target)<=closerRange+.35){
   // Active strafing gives ranged attackers visible motion between shots.
   const phase=foe.strideSeed||0;
   const desired=Math.max(12,Math.min(88,target.x+Math.sin(stageClock*1.25+phase*1.8)*8));
   const drift=Math.max(-foe.move*t*.035,Math.min(foe.move*t*.035,desired-foe.x));
   foe.x=Math.max(6,Math.min(94,foe.x+drift));
  }
 }
 foe.walking=Math.hypot(foe.x-x,foe.y-y)>.035;
 // Stop movement briefly for the attack pose, then resume pursuit.
 if(foe.attackUntil>stageClock)foe.walking=false;
 return near(foe,target)<=r+.3;
}
function invaderPatrol(foe,t){
 // If every allied hero is cloaked, search toward the last known frontline.
 const fallback={x:50,y:DEFENDER_FRONT_Y+3};
 if(foe.y<INVADER_FRONT_Y)moveTo(foe,fallback,3,t);
 else foe.walking=false;
}
function pose(actor,attack){
 if(!actor.img)return;
 const image=HEROES[actor.id].images[attack?'attack':'idle'];
 if(actor.sprite!==image){actor.img.src=image;actor.sprite=image}
}
function position(actor){
 if(!actor?.node)return;
 actor.node.style.left=actor.x+'%';actor.node.style.top=actor.y+'%';
 actor.node.classList.toggle('walking',!!actor.walking);
 actor.node.classList.toggle('cloaked',actor.cloakUntil>stageClock);
}
// The original AUTOCHEST board is fixed. Movement happens within its 6x7 cells.
function travelScene(){
 $('stageViewport').classList.remove('travelling');
}
function renderGrid(){
 const selectedCell=state.placements?.[selected];
 $('boardGrid').innerHTML=Array.from({length:GRID_ROWS},(_,row)=>
  Array.from({length:GRID_COLS},(_,col)=>{
   const ally=row>=ALLY_START_ROW,enemy=row<=2;
   const occupied=state.squad.find(id=>state.placements?.[id]?.col===col&&state.placements?.[id]?.row===row);
   const current=selectedCell?.col===col&&selectedCell?.row===row;
   const cls='board-cell '+(ally?'ally-cell':enemy?'enemy-cell':'mid-cell')+
    (occupied?' occupied-cell':'')+(current?' selected-cell':'');
   return ally?'<button type="button" class="'+cls+'" data-col="'+col+'" data-row="'+row+
    '" aria-label="ช่องทีม คอลัมน์ '+(col+1)+' แถว '+(row-3)+'">'+
    (current?'<span class="board-selected-marker">✦</span>':'')+'</button>':
    '<div class="'+cls+'" aria-hidden="true"></div>';
  }).join('')).join('');
}
function moveHeroToCell(id,col,row){
 if(!state.squad.includes(id)||!friendlyCell(col,row))return false;
 const current=state.placements[id];
 if(current?.col===col&&current?.row===row)return false;
 const swapping=state.squad.find(other=>other!==id&&state.placements[other]?.col===col&&state.placements[other]?.row===row);
 if(swapping&&current)state.placements[swapping]={...current};
 state.placements[id]={col,row};
 for(const unit of fighters){
  const p=state.placements[unit.id];if(!p)continue;
  const target=boardPoint(p.col,p.row);
  if(unit.id===id||unit.id===swapping){
   unit.x=target.x;unit.y=target.y;unit.startX=target.x;
   unit.walking=false;position(unit);
  }
 }
 selected=id;renderGrid();renderTeam();renderHeroes();renderSelected();save();
 toast('♟️ วาง '+HEROES[id].name+' ที่ช่อง '+(col+1)+' / '+(row-3));
 return true;
}
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
 refreshFormationControls();
 $('challengeBtn').disabled=!!combat?.boss||state.kills<need;
 $('challengeBtn').textContent=combat?.boss?'👑 กำลังต่อสู้กับบอส':state.kills<need?'👑 ปลดล็อกบอส '+state.kills+'/'+need:'👑 ท้าทายบอส!';
 $('bossTimer').hidden=!combat?.boss;
 $('fightLabel').classList.toggle('boss-mode',!!combat?.boss);
 $('fightLabel').textContent=combat?.boss?'BOSS BATTLE':combat?'HERO BATTLE':'EXPLORING';
 if(combat?.boss){$('bossCountdown').textContent=Math.max(0,Math.ceil(combat.timeout))}
 const farm=CORE.farmReward(state.stage);
 $('farmGain').textContent='ศัตรูที่ชนะ +'+fmt(farm.gold)+' G / +'+fmt(farm.exp)+' EXP';
 $('summonOneBtn').disabled=state.tickets<1&&state.rubies<120;
 $('summonTenBtn').disabled=state.rubies<Math.max(0,10-state.tickets)*120;
 refreshUpgradeAvailability();
}
function refreshFormationControls(){
 const form=$('formationBtn'),auto=$('autoBattleBtn'),label=$('formationStatus');
 if(!form||!auto||!label)return;
 form.textContent=formationMode?'✅ จัดทัพเสร็จ · เล่นต่อ':'♟️ จัดทัพ (พักการต่อสู้)';
 form.classList.toggle('active',formationMode);
 form.setAttribute('aria-pressed',String(formationMode));
 auto.textContent=state.autoBattle?'⚔️ AUTO ON':'⏸ AUTO OFF';
 const quickFormation=$('formationQuickBtn'),quickAuto=$('autoQuickBtn');
 if(quickFormation){
  quickFormation.textContent=formationMode?'✅ จัดทัพเสร็จ · สู้ต่อ':'♟️ จัดทัพ / วางตัว';
  quickFormation.classList.toggle('editing',formationMode);
  quickFormation.setAttribute('aria-pressed',String(formationMode));
 }
 if(quickAuto){
  quickAuto.textContent=state.autoBattle?'⚔️ AUTO ON':'⏸ AUTO OFF';
  quickAuto.classList.toggle('off',!state.autoBattle);
  quickAuto.setAttribute('aria-pressed',String(state.autoBattle));
 }
 auto.classList.toggle('off',!state.autoBattle);
 auto.setAttribute('aria-pressed',String(state.autoBattle));
 const reserve=state.owned[selected]&&!state.squad.includes(selected);
 const full=state.squad.length>=CORE.maxSquad(state.stage);
 label.textContent=formationMode?(reserve&&full?
  '🟡 เลือกตัวสำรองอยู่ · แตะสมาชิกในทีมเพื่อสลับ':
  '♟️ พักต่อสู้ · วางตัวใน 3 แถวล่าง / ลากย้าย / สลับตัวสำรองได้'):
  state.autoBattle?'⚔️ TFT Auto กำลังต่อสู้':'⏸ ปิด Auto · กดเปิดเพื่อเล่นต่อ';
 label.classList.toggle('editing',formationMode);
 $('stageViewport').classList.toggle('formation-active',formationMode);
 const hint=$('swapHelp');
 if(hint)hint.textContent=reserve&&full?'↔️ เลือก '+HEROES[selected].name+' แล้วแตะสมาชิกบนแถบทีมเพื่อแทนที่':
  '♟️ แตะตัวในทีมและแตะช่อง 3 แถวล่าง / ลากเพื่อย้ายตำแหน่ง';
}
function setFormationMode(value){
 formationMode=!!value;
 if(formationMode){
  for(const f of fighters){
   const slot=state.placements?.[f.id];if(!slot)continue;
   const place=boardPoint(slot.col,slot.row);
   f.x=place.x;f.y=place.y;f.walking=false;
   f.attackUntil=0;pose(f,false);position(f);
  }
  toast('♟️ พักการต่อสู้ชั่วคราว · จัดทัพได้เลย');
 }else toast(state.autoBattle?'⚔️ TFT Auto ต่อสู้ต่อแล้ว':'⏸ Auto ยังปิดอยู่');
 refreshFormationControls();renderTeam();
}
function syncFormationRoster(){
 buildFighters(true);renderPanels();save();
}
function swapSquadMember(oldId,newId){
 if(!state.owned[newId]||state.squad.includes(newId)||!state.squad.includes(oldId))return false;
 const index=state.squad.indexOf(oldId),slot=state.placements[oldId];
 state.squad[index]=newId;
 if(slot)state.placements[newId]={...slot};
 delete state.placements[oldId];
 CORE.fillPlacements(state,state.placements);
 syncFormationRoster();
 toast('↔️ สลับ '+HEROES[oldId].name+' → '+HEROES[newId].name);
 return true;
}
function canLevel(id){
 const p=state.owned[id];if(!p||p.level>=CORE.MAX_LEVEL)return false;
 const need=CORE.levelCost(p.level);
 return state.gold>=need.gold&&state.heroExp>=need.exp;
}
function canStar(id){
 const p=state.owned[id];return !!p&&p.stars<CORE.MAX_STARS&&
  p.shards>=CORE.shardsNeeded(p.stars)&&state.gold>=CORE.ascendCost(p.stars);
}
function readyUpgrade(id){return canLevel(id)||canStar(id)}
function levelBatch(id,maximum=5){
 const p=state.owned[id];if(!p)return {count:0,gold:0,exp:0};
 let gold=state.gold,exp=state.heroExp,paidGold=0,paidExp=0,lvl=p.level,count=0;
 while(count<maximum&&lvl<CORE.MAX_LEVEL){
  const cost=CORE.levelCost(lvl);
  if(gold<cost.gold||exp<cost.exp)break;
  gold-=cost.gold;exp-=cost.exp;paidGold+=cost.gold;paidExp+=cost.exp;lvl++;count++;
 }
 return {count,gold:paidGold,exp:paidExp};
}
function neededMaterials(price,have,label){return have>=price?'✓ '+label+' พร้อม':'ขาด '+fmt(price-have)+' '+label}
function renderTeam(){
 $('teamSlots').innerHTML=Array.from({length:CORE.maxSquad(state.stage)},(_,i)=>{
  const id=state.squad[i];
  if(!id)return '<button type="button" class="team-slot empty" data-slot="empty" aria-label="ช่องทีมว่าง">＋<small>ว่าง</small></button>';
  const t=HEROES[id],p=state.owned[id],ready=readyUpgrade(id);
  return '<button type="button" class="team-slot '+(selected===id?'active ':'')+
   (ready?'is-upgrade-ready ':'')+
   (formationMode&&state.owned[selected]&&!state.squad.includes(selected)?'swap-target':'')+
   '" data-slot="'+id+'" aria-label="เลือก '+escapeText(t.name)+' เลเวล '+p.level+' '+p.stars+' ดาว">'+
   '<span class="team-level">Lv.'+p.level+'</span>'+
   '<img loading="lazy" src="'+t.images.idle+'" alt="">'+
   '<strong>'+escapeText(t.name)+'</strong>'+
   '<span class="team-stars">'+'★'.repeat(p.stars)+'</span>'+
   '<span class="team-ready" title="เสริมแกร่งได้แล้ว">⬆</span></button>';
 }).join('');
}
function renderHeroes(){
 $('heroList').innerHTML=IDS.map(id=>{
  const t=HEROES[id],p=state.owned[id],ready=readyUpgrade(id);
  return '<div class="hero-entry"><button type="button" class="hero-card '+(!p?'locked ':'')+
   (selected===id?'active ':'')+(ready?'is-upgrade-ready':'')+'" data-hero="'+id+'">'+
   '<img loading="lazy" src="'+t.portrait+'" alt="">'+
   '<strong>'+escapeText(t.name)+'</strong>'+
   '<span class="collection-level">'+(p?'LEVEL '+p.level:'🔒 ไม่ได้ปลดล็อก')+'</span>'+
   '<span class="collection-stars">'+(p?'★'.repeat(p.stars)+'☆'.repeat(CORE.MAX_STARS-p.stars):'☆☆☆☆☆')+'</span>'+
   '<span class="collection-ready" title="เสริมแกร่งได้">⬆ อัปได้</span></button>'+
   '<button type="button" class="hero-info-btn" data-skill-hero="'+id+'" aria-label="ดูสกิล '+escapeText(t.name)+'">ⓘ</button></div>';
 }).join('');
}
function renderSelected(){
 const id=selected,hero=HEROES[id],p=state.owned[id],box=$('heroDetails');
 if(!hero){box.textContent='แตะฮีโร่ในทีมเพื่อดูข้อมูล';return}
 if(!p){
  box.innerHTML='<div class="upgrade-hero-header"><img src="'+hero.portrait+'" alt=""><div>'+
   '<h4>'+escapeText(hero.name)+'</h4><span class="upgrade-lock">🔒 ยังไม่ได้อัญเชิญ</span>'+
   '<p>'+escapeText(hero.subtitle||'')+'</p></div></div>'+
   '<div class="upgrade-empty">ปลดล็อกโดยอัญเชิญฮีโร่จากกาชาด้านล่าง เพื่อเริ่มอัปเลเวลและดาว</div>'+
   '<button type="button" id="openSkillBtn" class="inspect-skill-btn">ⓘ ดูสกิลฮีโร่คนนี้</button>';
  return;
 }
 const stats=CORE.stats(hero,p),nextLv=p.level<CORE.MAX_LEVEL?
  CORE.stats(hero,{level:p.level+1,stars:p.stars}):stats;
 const nextStar=p.stars<CORE.MAX_STARS?
  CORE.stats(hero,{level:p.level,stars:p.stars+1}):stats;
 const atMax=p.level>=CORE.MAX_LEVEL,atStarMax=p.stars>=CORE.MAX_STARS;
 const cost=CORE.levelCost(p.level),starNeed=CORE.shardsNeeded(p.stars),starGold=CORE.ascendCost(p.stars);
 const lvGood=canLevel(id),starGood=canStar(id),batch=levelBatch(id,5);
 const inTeam=state.squad.includes(id),full=state.squad.length>=CORE.maxSquad(state.stage);
 const lvPct=Math.round((p.level-1)/(CORE.MAX_LEVEL-1)*100);
 const starPct=atStarMax?100:Math.min(100,Math.round(p.shards/starNeed*100));
 const shardMissing=Math.max(0,starNeed-p.shards);
 box.innerHTML='<div class="upgrade-hero-header"><img src="'+hero.portrait+'" alt=""><div class="upgrade-identity">'+
  '<span class="upgrade-kicker">HERO PROGRESSION</span><h4>'+escapeText(hero.name)+'</h4>'+
  '<p>'+escapeText(hero.team)+' · '+escapeText(hero.skill)+'</p>'+
  '<div class="upgrade-badges"><span>Lv.'+p.level+' / '+CORE.MAX_LEVEL+'</span>'+
  '<span class="gold-stars">'+'★'.repeat(p.stars)+'☆'.repeat(CORE.MAX_STARS-p.stars)+'</span>'+
  (inTeam?'<span class="equipped-tag">⚔️ ในทีม</span>':'<span class="reserve-tag">สำรอง</span>')+'</div>'+
  '</div></div>'+
  '<div class="detail-stats upgrade-stat-row"><div><small>❤️ HP</small><strong>'+fmt(stats.hp)+'</strong></div>'+
  '<div><small>⚔️ ATK</small><strong>'+fmt(stats.atk)+'</strong></div>'+
  '<div><small>🎯 CRIT</small><strong>'+Math.round(stats.crit*100)+'%</strong></div></div>'+
  '<section class="upgrade-step">'+
   '<div class="upgrade-step-heading"><div><span class="step-num">1</span><strong>เพิ่มเลเวล</strong></div>'+
   '<span class="upgrade-current">Lv.'+p.level+' / '+CORE.MAX_LEVEL+'</span></div>'+
   '<div class="upgrade-progress"><i style="width:'+lvPct+'%"></i></div>'+
   '<p class="upgrade-benefit">'+(atMax?'🏅 เลเวลสูงสุดแล้ว':
     'เลเวลถัดไป: HP <b>+'+fmt(nextLv.hp-stats.hp)+'</b> · ATK <b>+'+fmt(nextLv.atk-stats.atk)+'</b>')+'</p>'+
   (atMax?'<div class="upgrade-max-notice">✅ เลเวลสูงสุดแล้ว</div>':
   '<div class="upgrade-materials"><span id="levelGoldStatus" class="'+(state.gold>=cost.gold?'enough':'missing')+'">🪙 Gold '+fmt(state.gold)+' / '+fmt(cost.gold)+'</span>'+
   '<span id="levelExpStatus" class="'+(state.heroExp>=cost.exp?'enough':'missing')+'">🔹 EXP '+fmt(state.heroExp)+' / '+fmt(cost.exp)+'</span></div>'+
   '<p id="levelResourceHint" class="upgrade-hint">'+(lvGood?'✅ วัตถุดิบครบ เพิ่มเลเวลได้เลย':
     'ต้องการ '+neededMaterials(cost.gold,state.gold,'Gold')+' และ '+neededMaterials(cost.exp,state.heroExp,'EXP'))+'</p>')+
   '<div class="upgrade-action-row"><button type="button" id="levelHeroBtn" class="upgrade-primary"'+(!lvGood?' disabled':'')+'>'+
   (atMax?'LEVEL MAX':'⬆ อัปเลเวล +1')+'</button>'+
   '<button type="button" id="levelFiveBtn" class="upgrade-secondary"'+(!batch.count?' disabled':'')+'>'+
   (atMax?'MAX':'อัปต่อเนื่อง ×'+batch.count+'/5')+'</button></div>'+
  '</section>'+
  '<section class="upgrade-step star-step">'+
   '<div class="upgrade-step-heading"><div><span class="step-num">2</span><strong>เพิ่มดาวฮีโร่</strong></div>'+
   '<span class="upgrade-current gold-stars">'+'★'.repeat(p.stars)+'☆'.repeat(CORE.MAX_STARS-p.stars)+'</span></div>'+
   '<div class="upgrade-progress star-progress"><i style="width:'+starPct+'%"></i></div>'+
   '<p class="upgrade-benefit">'+(atStarMax?'🌟 ดาวสูงสุดแล้ว':
     'ดาวถัดไป: HP <b>+'+fmt(nextStar.hp-stats.hp)+'</b> · ATK <b>+'+fmt(nextStar.atk-stats.atk)+'</b>')+'</p>'+
   (atStarMax?'<div class="upgrade-max-notice">✅ ครบ 5 ดาวแล้ว</div>':
    '<div class="upgrade-materials"><span id="starShardStatus" class="'+(p.shards>=starNeed?'enough':'missing')+'">🧩 ชิ้นส่วน '+fmt(p.shards)+' / '+fmt(starNeed)+'</span>'+
    '<span id="starGoldStatus" class="'+(state.gold>=starGold?'enough':'missing')+'">🪙 Gold '+fmt(state.gold)+' / '+fmt(starGold)+'</span></div>'+
    '<p id="rankResourceHint" class="upgrade-hint">'+(starGood?'✅ ชิ้นส่วนครบ เพิ่มดาวได้เลย':
     shardMissing?'ยังขาดชิ้นส่วน '+shardMissing+' ชิ้น — อัญเชิญตัวซ้ำเพื่อสะสม':'ขาด Gold '+fmt(Math.max(0,starGold-state.gold)))+'</p>')+
   '<button type="button" id="rankHeroBtn" class="star-upgrade-button"'+(!starGood?' disabled':'')+'>'+
   (atStarMax?'★ ดาวสูงสุด':'⭐ เพิ่มเป็น '+(p.stars+1)+' ดาว')+'</button>'+
  '</section>'+
  '<div class="upgrade-footer-actions"><button type="button" id="deployHeroBtn" class="deploy-action"'+'>'+
   (inTeam?'↩ ถอนฮีโร่ออกจากทีม':full?'↔️ เลือกสมาชิกในทีมเพื่อสลับ':'⚔️ เพิ่มเข้าทีม')+'</button>'+
   '<button type="button" id="openSkillBtn" class="inspect-skill-btn">ⓘ ดูสกิลทั้งหมด</button></div>';
}
function skillDescription(t,enemy=false){
 const n=t.triggerEvery||4,lines=['โจมตีปกติ 100% ATK เมื่อเป้าหมายอยู่ในระยะ TFT จริง • มีโอกาสคริติคอล'];
 switch(t.effect){
  case 'slash':
   lines.push('ทุก '+n+' การโจมตี: ฟันหนัก 200% ATK พร้อมเอฟเฟกต์วงพลัง');
   break;
  case 'blink':
   lines.push('ทุก '+n+' การโจมตี: เคลื่อนฉับไวเข้าหาเป้าหมาย ฟัน 200% ATK และตามด้วยโจมตีอีก 50% ATK');
   break;
  case 'triple':
   lines.push('ทุก '+n+' การโจมตี: ยิงกระสุนหลักแรง 200% ATK และกระสุนรองอีก 2 นัด นัดละ 85% ATK (เลือกเป้าหมายอื่นได้)');
   break;
  case 'chain':
   lines.push('ทุก '+n+' การโจมตี: ปล่อยกระแสพลังใส่ศัตรูสูงสุด '+(t.chainTargets||3)+' ตัว แรงนัดละ '+Math.round((t.chainPower||1.12)*100)+'% ATK');
   break;
  case 'slam':
   lines.push('ทุก '+n+' การโจมตี: ทุบโจมตีพื้นที่รัศมี 140 พิกเซลของสนาม แรง 180% ATK ต่อเป้าหมาย');
   break;
  case 'shield':
   lines.push('ทุก '+n+' การโจมตี: เพิ่มโล่ป้องกัน 30% ของ HP สูงสุด และโจมตีปกติแบบหนัก 200% ATK');
   break;
  case 'cloakshot':
   lines.push('ทุก '+n+' การโจมตี: พรางตัว '+(t.cloakDuration||2).toFixed(1)+' วินาที ศัตรูจะไม่เลือกเป็นเป้าหมายใหม่');
   lines.push('การโจมตีแรกหลังหมดพราง '+Math.round((t.cloakShotMultiplier||1.7)*100)+'% ATK และโอกาสคริเพิ่ม +'+Math.round((t.cloakCritBonus||.5)*100)+' จุดเปอร์เซ็นต์');
   lines.push('เป้าหมาย HP ต่ำกว่า '+Math.round((t.executeThreshold||.35)*100)+'%: เพิ่มดาเมจอีก '+Math.round(((t.executeMultiplier||1.2)-1)*100)+'%');
   break;
  default:lines.push('ทุก '+n+' การโจมตี: ใช้สกิลตามข้อมูลฮีโร่');
 }
 if(Number(t.range)>=1.8)lines.push('🎯 ยิงไกล: กระสุนเดินทางตามเป้าหมายและคำนวณดาเมจเมื่อกระสุนถึง; พยายามรักษาระยะเมื่อศัตรูประชิด');
 else lines.push('⚔️ ประชิด: วิ่งเข้าโจมตีตามระยะของสนาม TFT');
 return lines;
}
function openSkill(id,source='hero',unit=null){
 const h=HEROES[id],modal=$('skillModal');if(!h||!modal)return;
 const enemy=source==='enemy',progress=state.owned[id],stat=CORE.stats(h,progress||{level:1,stars:1});
 const active=enemy?(unit||enemies.find(x=>x.id===id)):null;
 const stats=[
  ['HP',fmt(active?active.maxHp:stat.hp)],
  ['ATK',fmt(active?active.atk:stat.atk)],
  ['โจมตีทุก',Number(active?active.delay:stat.cool).toFixed(2)+' วินาที'],
  ['ระยะโจมตี',Number(h.range).toFixed(2)+' ช่อง'],
  ['ความเร็วเดิน',String(h.move)],
  ['โอกาสคริ',Math.round((active?active.crit:stat.crit)*100)+'%'],
  ['ความแรงคริ','×'+Number(h.critDamage||1.5).toFixed(2)],
  ['ความถี่สกิล','ทุก '+(h.triggerEvery||4)+' ครั้ง']
 ];
 const label=enemy?'👹 ฮีโร่เงาศัตรู · ด่าน '+state.stage:progress?
  '⭐ Lv.'+progress.level+' · '+progress.stars+' ดาว':'🔒 ยังไม่อัญเชิญ · ค่าสถานะพื้นฐาน';
 $('skillModalTitle').textContent=h.name+' — '+h.skill;
 $('skillModalContent').innerHTML=
  '<div class="skill-modal-layout"><div class="skill-portrait"><img loading="lazy" src="'+escapeText(h.images.art||h.portrait)+'" alt="'+escapeText(h.name)+'"></div>'+
  '<div class="skill-modal-main"><div class="skill-status">'+escapeText(label)+'</div><h3>'+escapeText(h.name)+'</h3>'+
  '<p>'+escapeText(h.subtitle||'')+'</p><div class="skill-tags"><span>'+escapeText(h.team)+'</span>'+
  (h.traits||[]).map(x=>'<span>'+escapeText(x)+'</span>').join('')+'</div>'+
  '<div class="skill-stats">'+stats.map(([k,v])=>'<div><small>'+escapeText(k)+'</small><strong>'+escapeText(v)+'</strong></div>').join('')+
  '</div></div></div><section class="skill-ability"><small>⚔ AUTO SKILL · IDLE MODE</small>'+
  '<h3>✨ '+escapeText(h.skill)+'</h3><ul>'+
  skillDescription(h,enemy).map(x=>'<li>'+escapeText(x)+'</li>').join('')+'</ul>'+
  '<p class="skill-mode-note">ใช้กติกาต่อสู้ TFT เดิม ผสมระบบฟาร์มและกาชาแบบ Idle · เลเวลและดาวอิงค่าปัจจุบัน</p></section>';
 skillReturnFocus=modal.hidden?document.activeElement:skillReturnFocus;
 modal.hidden=false;$('closeSkillBtn').focus();
}
function closeSkill(){
 const modal=$('skillModal');if(modal.hidden)return;
 modal.hidden=true;
 if(skillReturnFocus?.isConnected&&skillReturnFocus.focus)skillReturnFocus.focus();
 skillReturnFocus=null;
}
function renderQuest(){
 let task;
 if(state.stage<5)task='ผ่านด่าน <b>5</b> เพื่อปลดล็อกช่องทีมที่ 5';
 else if(state.stage<12)task='ผ่านด่าน <b>12</b> เพื่อปลดล็อกช่องทีมที่ 6';
 else if(state.stage<20)task='ผ่านด่าน <b>20</b> เพื่อปลดล็อกช่องทีมที่ 7';
 else task='พิชิตด่าน <b>'+(state.stage+5)+'</b> และสะสมดาวฮีโร่';
 $('guideQuest').innerHTML='✧ '+task+'<br><small>กำจัดฮีโร่เงาที่วิ่งบุกมาเพื่อปลดล็อกบอส</small>';
}
function renderPanels(){
 renderGrid();updateResources();renderTeam();renderHeroes();renderSelected();renderQuest();
}
function choose(id){
 if(!HEROES[id])return;
 selected=id;renderGrid();renderTeam();renderHeroes();renderSelected();refreshFormationControls();
}
function refreshUpgradeAvailability(){
 const ready=Object.keys(state.owned).filter(id=>readyUpgrade(id));
 const summary=$('upgradeReadyCount');
 if(summary)summary.textContent=ready.length?'พร้อมอัป '+ready.length+' ตัว':'ยังอัปไม่ได้';
 const mobileShortcut=$('upgradeShortcutReady');
 if(mobileShortcut)mobileShortcut.textContent=ready.length?'พร้อมอัป '+ready.length+' ตัว':'ดูเลเวล / ดาว';
 for(const n of $('teamSlots').querySelectorAll('[data-slot]')){
  const id=n.dataset.slot;
  if(id!=='empty')n.classList.toggle('is-upgrade-ready',readyUpgrade(id));
 }
 for(const n of $('heroList').querySelectorAll('[data-hero]')){
  n.classList.toggle('is-upgrade-ready',readyUpgrade(n.dataset.hero));
 }
 const p=state.owned[selected];
 if(!p)return;
 const c=CORE.levelCost(p.level),need=CORE.shardsNeeded(p.stars),starCost=CORE.ascendCost(p.stars);
 const lv=canLevel(selected),star=canStar(selected),batch=levelBatch(selected,5);
 const btn=$('levelHeroBtn'),five=$('levelFiveBtn'),rank=$('rankHeroBtn');
 if(btn)btn.disabled=!lv;
 if(five){five.disabled=!batch.count;five.textContent=p.level>=CORE.MAX_LEVEL?'MAX':'อัปต่อเนื่อง ×'+batch.count+'/5'}
 if(rank)rank.disabled=!star;
 const update=(id,good,message)=>{
  const node=$(id);if(!node)return;
  node.textContent=message;node.classList.toggle('enough',good);node.classList.toggle('missing',!good);
 };
 if(p.level<CORE.MAX_LEVEL){
  update('levelGoldStatus',state.gold>=c.gold,'🪙 Gold '+fmt(state.gold)+' / '+fmt(c.gold));
  update('levelExpStatus',state.heroExp>=c.exp,'🔹 EXP '+fmt(state.heroExp)+' / '+fmt(c.exp));
  if($('levelResourceHint'))$('levelResourceHint').textContent=lv?'✅ วัตถุดิบครบ กดเพิ่มเลเวลได้เลย':
   'ยังขาด '+[state.gold<c.gold?fmt(c.gold-state.gold)+' Gold':null,
               state.heroExp<c.exp?fmt(c.exp-state.heroExp)+' EXP':null].filter(Boolean).join(' และ ');
 }
 if(p.stars<CORE.MAX_STARS){
  update('starShardStatus',p.shards>=need,'🧩 ชิ้นส่วน '+fmt(p.shards)+' / '+fmt(need));
  update('starGoldStatus',state.gold>=starCost,'🪙 Gold '+fmt(state.gold)+' / '+fmt(starCost));
  if($('rankResourceHint'))$('rankResourceHint').textContent=star?'✅ ชิ้นส่วนครบ กดเพิ่มดาวได้เลย':
   'ยังขาด '+[p.shards<need?fmt(need-p.shards)+' ชิ้นส่วน (อัญเชิญตัวซ้ำ)':null,
              state.gold<starCost?fmt(starCost-state.gold)+' Gold':null].filter(Boolean).join(' และ ');
 }
}
function applyLiveHeroStats(id){
 const actor=fighters.find(f=>f.id===id&&f.alive);
 if(!actor)return;
 const stat=CORE.stats(HEROES[id],state.owned[id]),old=actor.maxHp;
 actor.hp=Math.max(1,Math.round(actor.hp/old*stat.hp));
 actor.maxHp=stat.hp;actor.atk=stat.atk;actor.cool=stat.cool;
 actor.crit=stat.crit;actor.critDamage=stat.critDamage;
 const stars=actor.node?.querySelector('.mini-stars');
 if(stars)stars.textContent='★'.repeat(state.owned[id].stars)+' · Lv.'+state.owned[id].level;
 if(actor.hpbar)actor.hpbar.style.width=actor.hp/actor.maxHp*100+'%';
}
function upgrade(count=1){
 if(!state.owned[selected])return;
 const before=CORE.power(state,HEROES);
 let n=0;for(let i=0;i<count;i++)if(CORE.spendLevel(state,selected))n++;else break;
 if(!n){toast('🪙 Gold หรือ Hero EXP ยังไม่พอ');return}
 applyLiveHeroStats(selected);
 renderPanels();save();
 toast('⬆ '+HEROES[selected].name+' Lv.'+state.owned[selected].level+
  ' • พลังทีม +'+fmt(Math.max(0,CORE.power(state,HEROES)-before)));
}
function rankUp(){
 const before=CORE.power(state,HEROES);
 if(!CORE.ascend(state,selected)){toast('ยังขาดชิ้นส่วนหรือ Gold สำหรับเพิ่มดาว');return}
 applyLiveHeroStats(selected);renderPanels();save();
 toast('⭐ '+HEROES[selected].name+' '+state.owned[selected].stars+' ดาว! พลังทีม +'+
  fmt(Math.max(0,CORE.power(state,HEROES)-before)));
}
function toggleHero(){
 const id=selected;if(!state.owned[id])return;
 if(state.squad.includes(id)){
  if(state.squad.length<=1){toast('ต้องมีฮีโร่ในทีมอย่างน้อย 1 คน');return}
  state.squad=state.squad.filter(x=>x!==id);
 }else{
  if(state.squad.length>=CORE.maxSquad(state.stage)){
   if(!formationMode)setFormationMode(true);
   renderTeam();toast('↔️ ทีมเต็ม · แตะสมาชิกทีมที่จะให้ '+HEROES[id].name+' ลงแทน');
   return;
  }
  state.squad.push(id);
 }
 CORE.fillPlacements(state,state.placements);
 syncFormationRoster();
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
 const front=[[2,4],[3,4],[1,4],[4,4],[0,4],[5,4]];
 const mid=[[2,5],[3,5],[1,5],[4,5],[0,5],[5,5]];
 const back=[[2,6],[3,6],[1,6],[4,6],[0,6],[5,6]];
 const occupied=new Set();state.placements={};
 const order=[...state.squad].sort((a,b)=>{
  const priority=id=>HEROES[id].team==='ป้องกัน'?0:TFT.isRanged(HEROES[id])?2:1;
  return priority(a)-priority(b);
 });
 for(const id of order){
  const h=HEROES[id],options=h.team==='ป้องกัน'?[...front,...mid,...back]:
    TFT.isRanged(h)?[...back,...mid,...front]:[...mid,...front,...back];
  const c=options.find(([col,row])=>!occupied.has(col+':'+row));
  if(c){state.placements[id]={col:c[0],row:c[1]};occupied.add(c.join(':'))}
 }
 CORE.fillPlacements(state,state.placements);
 syncFormationRoster();toast('♟️ จัดทีม TFT · แทงก์หน้า / ตัวประชิดกลาง / สไนเปอร์หลัง!');
}
function summon(count){
 const before=new Set(Object.keys(state.owned));
 const heroes=CORE.draw(state,HEROES,count);
 if(!heroes){toast('🎟️ ตั๋วหรือ Rubies ไม่พอ');return}
 $('summonResults').innerHTML=heroes.map(id=>'<span class="summon-result '+(!before.has(id)?'new':'')+'">'+
  escapeText(HEROES[id].name)+(!before.has(id)?' ✨ NEW':' +1 ชิ้น')+'</span>').join('');
 const fresh=new Set(heroes.filter(id=>!before.has(id))).size;
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
 const earned={...pending};
 state.offlineBank={minutes:0,gold:0,exp:0};pending=state.offlineBank;
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
function buildFighters(preserve=false){
 const previous=new Map(preserve?fighters.map(f=>[f.id,f]):[]);
 fighters=state.squad.filter(id=>state.owned[id]).map((id,i)=>{
  const stat=CORE.stats(HEROES[id],state.owned[id]);
  const place=state.placements?.[id]||CORE.defaultCells[i],point=boardPoint(place.col,place.row);
  const old=previous.get(id);
  const hp=old?Math.max(0,Math.min(stat.hp,Math.round(old.hp/Math.max(1,old.maxHp)*stat.hp))):stat.hp;
  return {id,side:'ally',x:point.x,y:point.y,startX:point.x,move:HEROES[id].move,
   hp,maxHp:stat.hp,atk:stat.atk,cool:stat.cool,remaining:old?.remaining??i*.12,
   attacks:old?.attacks||0,shield:old?.shield||0,
   crit:stat.crit,critDamage:stat.critDamage,
   cloakUntil:old?.cloakUntil||0,ambush:old?.ambush||false,
   attackUntil:0,alive:old?old.alive&&hp>0:true,walking:false,progress:state.owned[id]};
 });
 const layer=$('heroLayer');layer.replaceChildren();
 for(const hero of fighters){
  const base=HEROES[hero.id],node=el('div',{class:'fighter party-fighter'});
  node.dataset.inspectId=hero.id;node.dataset.inspectSide='ally';
  node.tabIndex=0;node.setAttribute('role','button');node.setAttribute('aria-label','ดูสกิล '+base.name);
  node.style.left=hero.x+'%';node.style.top=hero.y+'%';
  node.innerHTML='<span class="mini-stars">'+'★'.repeat(hero.progress.stars)+' · Lv.'+hero.progress.level+'</span>'+
   '<img src="'+base.images.idle+'" alt="">'+
   '<div class="mini-hp"><i></i></div><span class="fighter-name">'+escapeText(base.name)+'</span>';
  layer.appendChild(node);hero.node=node;hero.img=node.querySelector('img');
  hero.hpbar=node.querySelector('.mini-hp i');hero.sprite=base.images.idle;
  hero.hpbar.style.width=Math.max(0,hero.hp/hero.maxHp*100)+'%';
  if(!hero.alive)node.style.opacity='.2';
 }
}
function beginTravel(seconds=1.6){
 combat=null;enemies=[];spawnCooldown=0;respawn=seconds;travel=0;
 clearTftShots();
 $('monsterLayer').replaceChildren();clearFx();buildFighters();travelScene();
 $('battleMessage').textContent='♟️ ตั้งรับศัตรูระลอกถัดไป...';
 updateResources();
}
function spawnMonster(boss=false){
 if(boss){enemies=[];$('monsterLayer').replaceChildren()}
 else if(enemies.length>=enemyLimit())return;
 const id=boss&&bosses.length?bosses[Math.floor((state.stage-1)/3)%bosses.length]:
   IDS[(state.stage+state.kills+encounters++)%IDS.length];
 const hero=HEROES[id],stat=CORE.monster(state.stage,boss);
 const hp=Math.max(1,Math.round(stat.hp*(.8+hero.hp/3000)));
 const entry=boardPoint(boss?2:(encounters+2)%GRID_COLS,boss?1:(encounters%3));
 const foe={id,side:'enemy',boss,hp,maxHp:hp,atk:Math.round(stat.atk*(.9+hero.dmg/900)),
  remaining:.65+Math.random()*.35,delay:Math.max(.75,hero.cool*1.2),move:hero.move,
  shield:0,attacks:0,crit:hero.critChance||.05,critDamage:hero.critDamage||1.5,
  cloakUntil:0,ambush:false,attackUntil:0,walking:true,alive:true,
  timeout:boss?35:0,x:entry.x,y:entry.y,strideSeed:encounters};
 const node=el('div',{class:'fighter enemy-unit'+(boss?' boss-unit':'')});
 node.dataset.inspectId=id;node.dataset.inspectSide='enemy';
 node.tabIndex=0;node.setAttribute('role','button');
 node.setAttribute('aria-label','ดูสกิลศัตรู '+hero.name);
 node.innerHTML='<span class="mini-stars">'+(boss?'👑 BOSS':'⚔ ENEMY')+'</span>'+
  '<img src="'+hero.images.idle+'" alt="">'+
  '<div class="mini-hp enemy-hp"><i></i></div>'+
  '<span class="fighter-name">'+(boss?'👑 ':'⚔ เงา')+escapeText(hero.name)+'</span>';
 $('monsterLayer').appendChild(node);
 foe.node=node;foe.img=node.querySelector('img');foe.bar=node.querySelector('.enemy-hp i');
 foe.sprite=hero.images.idle;
 enemies.push(foe);combat=enemies[0];
 position(foe);travelScene();
 spawnCooldown=enemies.length===1?.14:enemyInterval();
 $('battleMessage').textContent=boss?'👑 บอส '+hero.name+' ปรากฏตัว!':
  '⚔️ ฮีโร่เงาบุกมา '+enemies.length+' / '+enemyLimit();
 updateResources();
}
function resetCombat(){beginTravel(.8)}
function victoryBoss(){
 const reward=CORE.bossReward(state.stage);
 state.gold+=reward.gold;state.heroExp+=reward.exp;
 state.rubies+=reward.rubies;state.tickets+=reward.tickets;state.bossWins++;
 log('🏆 ผ่านด่าน '+state.stage+'! +'+fmt(reward.gold)+' G และ +'+fmt(reward.rubies)+' 💎');
 state.stage++;state.kills=0;save();
 $('battleMessage').textContent='🏆 ผ่านบอส! เข้าสู่ด่าน '+state.stage;
 beginTravel(1.5);
 renderPanels();toast('🏆 ผ่านบอส! ด่าน '+state.stage+' • ได้ Rubies และตั๋ว!');
}
function failBoss(){
 log('💥 บอสแข็งแกร่งเกินไป! อัปเกรดฮีโร่แล้วลองอีกครั้ง');
 $('battleMessage').textContent='💥 บอสยังไม่ผ่าน • ฟาร์มต่อเพื่อเสริมพลัง';
 state.autoBoss=false;beginTravel(1.7);updateResources();save();
 toast('💥 ยังโค่นบอสไม่ได้! อัปเลเวลแล้วท้าทายใหม่ได้');
}
function defeatMonster(foe){
 if(!foe||!enemies.includes(foe))return;
 if(foe.boss){victoryBoss();return}
 const reward=CORE.farmReward(state.stage);
 state.gold+=reward.gold;state.heroExp+=reward.exp;
 state.kills=Math.min(CORE.killsNeeded(state.stage),state.kills+1);
 enemies=enemies.filter(x=>x!==foe);foe.node?.remove();
 combat=enemies[0]||null;
 if(!combat)beginTravel(state.autoBoss&&state.kills>=CORE.killsNeeded(state.stage)?.65:.38);
 else spawnCooldown=Math.min(spawnCooldown,.17);
 updateResources();
}
function pickEnemy(f){return TFT.findTarget(f,enemies,stageClock)}
function targetHero(enemy){return TFT.findTarget(enemy,fighters,stageClock)}
// TFT-style shared damage pipeline. No damage is applied to ranged targets until the bullet lands.
function tftDamage(attacker,target,power,bonusCrit=0,forcedCrit=false){
 if(!target||target.hp<=0||target.alive===false)return false;
 const hero=HEROES[attacker.id];
 const chance=Math.min(1,Math.max(0,(attacker.crit||0)+bonusCrit));
 const critical=forcedCrit||(chance>0&&Math.random()<chance);
 const raw=power*(critical?(attacker.critDamage||hero.critDamage||1.5):1);
 const absorbed=Math.min(target.shield||0,raw);
 target.shield=Math.max(0,(target.shield||0)-absorbed);
 const damage=Math.max(0,Math.round(raw-absorbed));
 target.hp=Math.max(0,target.hp-damage);
 spawnFx((critical?'CRIT ':'')+'-'+fmt(damage),target.x+(Math.random()-.5)*5,target.y-21,critical);
 if(critical)ring(target.x,target.y);
 const bar=target.side==='enemy'?target.bar:target.hpbar;
 if(bar)bar.style.width=Math.max(0,target.hp/target.maxHp*100)+'%';
 if(target.hp===0){
  target.alive=false;
  if(target.side==='enemy')defeatMonster(target);
  else if(target.node)target.node.style.opacity='.2';
 }
 return true;
}
function tftShot(attacker,target,mult=1,bonusCrit=0,execute=false,heavy=false,color){
 if(!target||target.hp<=0)return;
 const palette=color||HEROES[attacker.id].col||'#c3f7ff';
 const node=el('span',{class:'tft-bullet'+(heavy?' heavy':'')});
 node.style.left=attacker.x+'%';node.style.top=attacker.y+'%';
 node.style.setProperty('--bullet-color',palette);
 $('fxLayer').appendChild(node);
 shots.push({
  owner:attacker,side:attacker.side,x:attacker.x,y:attacker.y,target,
  life:1.8,speed:HEROES[attacker.id].effect==='triple'?450:340,
  power:attacker.atk*mult,bonusCrit,execute,color:palette,node
 });
}
function clearTftShots(){
 for(const b of shots)if(b.node)b.node.remove();
 shots=[];
}
function advanceTftShots(t){
 if(!shots.length)return;
 const batch=shots.slice(),finished=new Set();
 for(const bullet of batch){
  if(!shots.includes(bullet))break; // a boss victory or full enemy clear reset the encounter
  const r=TFT.advanceShot(bullet,t);
  if(r.expired){
   finished.add(bullet);bullet.node?.remove();
   if(r.hit){
    let mul=1;
    const h=HEROES[bullet.owner.id];
    if(bullet.execute&&bullet.target.hp/bullet.target.maxHp<(h.executeThreshold||.35))
     mul=h.executeMultiplier||1.2;
    tftDamage(bullet.owner,bullet.target,bullet.power*mul,bullet.bonusCrit);
    if(bullet.target.hp>0)ring(bullet.target.x,bullet.target.y);
   }
  }else if(bullet.node){
   bullet.node.style.left=bullet.x+'%';bullet.node.style.top=bullet.y+'%';
  }
 }
 shots=shots.filter(x=>!finished.has(x));
}
function tftSkill(attacker,target){
 const hero=HEROES[attacker.id],effect=hero.effect;
 const foes=()=>attacker.side==='ally'?enemies.filter(x=>x.hp>0):fighters.filter(x=>x.alive);
 switch(effect){
  case 'slam':{
   const nearby=foes().filter(x=>TFT.pxDist(x,target)<140);
   ring(target.x,target.y);
   for(const e of nearby)tftDamage(attacker,e,attacker.atk*1.8,0,false);
   return true;
  }
  case 'chain':{
   const sorted=foes().sort((a,b)=>TFT.pxDist(a,target)-TFT.pxDist(b,target))
    .slice(0,hero.chainTargets||3);
   let prev=attacker;
   for(const e of sorted){
    projectile(prev.x,prev.y,e.x,e.y,hero.col||'#cfa9f8');
    tftDamage(attacker,e,attacker.atk*(hero.chainPower||1.12),0,false);
    prev=e;
   }
   return true;
  }
  case 'shield':
   attacker.shield+=attacker.maxHp*.30;
   ring(attacker.x,attacker.y);
   spawnFx('🛡 +SHIELD',attacker.x,attacker.y-20);
   break;
  case 'blink':
   attacker.x=Math.max(5.5,Math.min(94.5,target.x+(Math.random()-.5)*5));
   attacker.y=Math.max(8,Math.min(92,target.y+(Math.random()-.5)*4));
   position(attacker);ring(attacker.x,attacker.y);
   break;
  case 'slash':ring(attacker.x,attacker.y);break;
  case 'cloakshot':
   attacker.cloakUntil=stageClock+(hero.cloakDuration||2);
   attacker.ambush=true;
   ring(attacker.x,attacker.y,true);
   spawnFx('พรางตัว',attacker.x,attacker.y-18);
   break;
 }
 return false;
}
function tftAttack(attacker,target){
 if(!target||target.hp<=0)return;
 const hero=HEROES[attacker.id],effect=hero.effect||'';
 const ambush=attacker.ambush&&attacker.cloakUntil<=stageClock;
 if(ambush)attacker.ambush=false;
 attacker.attacks++;
 const special=attacker.attacks%(hero.triggerEvery||4)===0;
 let mul=ambush?(hero.cloakShotMultiplier||1.7):1;
 if(special){
  if(effect!=='cloakshot')mul*=2;
  if(tftSkill(attacker,target)){
   attacker.attackUntil=stageClock+(hero.visual?.attackMs||360)/1000;
   pose(attacker,true);
   if(attacker.node){attacker.node.classList.remove('burst');void attacker.node.offsetWidth;attacker.node.classList.add('burst')}
   return;
  }
 }
 const bonusCrit=ambush?(hero.cloakCritBonus||0):0;
 attacker.attackUntil=stageClock+(hero.visual?.attackMs||300)/1000;
 pose(attacker,true);
 attacker.node?.classList.remove('burst');
 if(attacker.node){void attacker.node.offsetWidth;attacker.node.classList.add('burst')}
 if(TFT.isRanged(hero)){
  tftShot(attacker,target,mul,bonusCrit,ambush,special||ambush);
  if(special&&effect==='triple'){
   const extra=(attacker.side==='ally'?enemies:fighters)
    .filter(x=>x.hp>0&&x.alive!==false&&x!==target)
    .sort((a,b)=>TFT.pxDist(a,attacker)-TFT.pxDist(b,attacker));
   for(let i=0;i<2;i++){
    const second=extra[i]||target;
    tftShot(attacker,second,.85,0,false,false,'#b4ffe5');
   }
  }
 }else{
  let actual=mul;
  if(ambush&&target.hp/target.maxHp<(hero.executeThreshold||.35))
   actual*=hero.executeMultiplier||1.2;
  tftDamage(attacker,target,attacker.atk*actual,bonusCrit);
  if(special&&effect==='blink'&&target.hp>0)tftDamage(attacker,target,attacker.atk*.5);
 }
}
function enemyAttack(enemy,target){tftAttack(enemy,target)}
function heroAttack(hero,target){tftAttack(hero,target)}
function tick(dt){
 if(!$('rewardModal').hidden||!$('skillModal').hidden||formationMode||!state.autoBattle)return;
 const t=Math.max(0,Math.min(.08,dt))*state.speed;
 stageClock+=t;
 if(!combat){
  respawn-=t;
  if(respawn<=0)spawnMonster(state.kills>=CORE.killsNeeded(state.stage)&&state.autoBoss);
  return;
 }
 if(combat.boss){
  combat.timeout-=t;
  if(combat.timeout<=0){failBoss();return}
 }else{
  spawnCooldown-=t;
  if(spawnCooldown<=0&&enemies.length<enemyLimit()&&(state.kills<CORE.killsNeeded(state.stage)||!state.autoBoss))spawnMonster(false);
 }
 for(const f of fighters){
  if(!f.alive)continue;
  f.remaining-=t;
  if(f.attackUntil<stageClock&&f.sprite!==HEROES[f.id].images.idle){
   pose(f,false);f.node.classList.remove('burst');
  }
  const target=pickEnemy(f);
  if(!target){f.walking=false;position(f);continue}
  const close=TFT.pursue(f,target,HEROES[f.id],t,'ally').inRange;
  position(f);
  if(close&&f.remaining<=0&&f.cloakUntil<=stageClock){
   heroAttack(f,target);
   f.remaining=Math.max(.06,f.remaining+f.cool);
   if(!combat)return;
  }
 }
 for(const foe of enemies.slice()){
  if(foe.hp<=0)continue;
  if(foe.attackUntil<stageClock&&foe.sprite!==HEROES[foe.id].images.idle){
   pose(foe,false);foe.node.classList.remove('burst');
  }
  const target=targetHero(foe);
  foe.remaining-=t;
  if(target){
   const close=TFT.pursue(foe,target,HEROES[foe.id],t,'enemy').inRange;
   position(foe);
   if(close&&foe.remaining<=0&&foe.cloakUntil<=stageClock){
    enemyAttack(foe,target);
    foe.remaining=Math.max(.06,foe.remaining+foe.delay);
   }
  }else{foe.walking=false;position(foe)}
  foe.bar.style.width=foe.hp/foe.maxHp*100+'%';
 }
 advanceTftShots(t);
 if(!combat)return;
 if(!fighters.some(f=>f.alive)){
  if(combat?.boss){failBoss();return}
  log('💔 ทีมฟื้นตัวก่อนต้านมอนระลอกใหม่');beginTravel(1.2);return;
 }
 for(const f of fighters){
  f.hpbar.style.width=Math.max(0,f.hp/f.maxHp*100)+'%';
  f.node.style.opacity=f.alive?'1':'.2';
 }
 $('bossTimer').hidden=!combat?.boss;
 if(combat?.boss)$('bossCountdown').textContent=Math.ceil(combat.timeout);
}
function frame(now){
 if(!lastFrame)lastFrame=now;
 tick((now-lastFrame)/1000);lastFrame=now;
 if(now-lastHUD>340){updateResources();lastHUD=now}
 if(now-lastSave>6000){save()}
 requestAnimationFrame(frame);
}
$('heroList').addEventListener('click',e=>{
 const info=e.target.closest('[data-skill-hero]');
 if(info){choose(info.dataset.skillHero);openSkill(info.dataset.skillHero);return}
 const hero=e.target.closest('[data-hero]');
 if(hero)choose(hero.dataset.hero);
});
$('teamSlots').addEventListener('click',e=>{
 const n=e.target.closest('[data-slot]');if(!n)return;
 if(n.dataset.slot==='empty'){
  if(state.owned[selected]&&!state.squad.includes(selected))toggleHero();
  else toast('เลือกฮีโร่จากคลังแล้วกดเพิ่มเข้าทีมได้เลย');
  return;
 }
 const target=n.dataset.slot;
 if(formationMode&&state.owned[selected]&&!state.squad.includes(selected)){
  const newId=selected;if(swapSquadMember(target,newId))choose(newId);return;
 }
 choose(target);
});
$('heroDetails').addEventListener('click',e=>{
 if(e.target.closest('#openSkillBtn'))openSkill(selected);
 else if(e.target.closest('#levelHeroBtn'))upgrade();
 else if(e.target.closest('#levelFiveBtn'))upgrade(5);
 else if(e.target.closest('#rankHeroBtn'))rankUp();
 else if(e.target.closest('#deployHeroBtn'))toggleHero();
});
for(const layerId of ['heroLayer','monsterLayer']){
 const layer=$(layerId);
 layer.addEventListener('click',e=>{
  const n=e.target.closest('[data-inspect-id]');if(!n||performance.now()<ignoreInspectUntil)return;
  if(formationMode&&n.dataset.inspectSide==='ally'){choose(n.dataset.inspectId);return}
  selected=n.dataset.inspectSide==='ally'?n.dataset.inspectId:selected;
  openSkill(n.dataset.inspectId,n.dataset.inspectSide==='enemy'?'enemy':'hero');
 });
 layer.addEventListener('keydown',e=>{
  if(e.key!=='Enter'&&e.key!==' ')return;
  const n=e.target.closest('[data-inspect-id]');if(!n)return;
  e.preventDefault();openSkill(n.dataset.inspectId,n.dataset.inspectSide==='enemy'?'enemy':'hero');
 });
}
$('closeSkillBtn').addEventListener('click',closeSkill);
$('skillModal').querySelector('.modal-overlay').addEventListener('click',closeSkill);
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!$('skillModal').hidden){e.preventDefault();closeSkill()}
});
$('autoTeamBtn').addEventListener('click',autoTeam);
$('summonOneBtn').addEventListener('click',()=>summon(1));
$('summonTenBtn').addEventListener('click',()=>summon(10));
function toggleAutoBattle(){
 state.autoBattle=!state.autoBattle;save();refreshFormationControls();
 toast(state.autoBattle?'⚔️ TFT Auto ON · สู้ต่อเนื่อง':'⏸ AUTO OFF · หยุดต่อสู้');
}
$('formationBtn').addEventListener('click',()=>setFormationMode(!formationMode));
$('formationQuickBtn').addEventListener('click',()=>setFormationMode(!formationMode));
$('autoBattleBtn').addEventListener('click',toggleAutoBattle);
$('autoQuickBtn').addEventListener('click',toggleAutoBattle);
$('autoBossBtn').addEventListener('click',()=>{
 state.autoBoss=!state.autoBoss;updateResources();save();
 toast(state.autoBoss?'🔄 เรียกบอสอัตโนมัติ ON':'⏸ เรียกบอสอัตโนมัติ OFF');
});
$('challengeBtn').addEventListener('click',()=>{
 if(state.kills<CORE.killsNeeded(state.stage)||combat?.boss)return;
 beginTravel(.2);spawnMonster(true);updateResources();
});
$('speedBtn').addEventListener('click',()=>{
 state.speed=state.speed===1?2:1;updateResources();save();
 toast('⏩ ความเร็วต่อสู้ ×'+state.speed);
});
// Select a teammate in the roster or on the board, then click a friendly tile to deploy.
$('boardGrid').addEventListener('click',e=>{
 const tile=e.target.closest('[data-col][data-row]');
 if(tile&&state.squad.includes(selected))
  moveHeroToCell(selected,Number(tile.dataset.col),Number(tile.dataset.row));
 else if(tile)toast('♟️ เลือกฮีโร่ที่อยู่ในทีมก่อนวางลงช่องนะ');
});
// Mouse and touch drag of a deployed character to a friendly tile.
$('heroLayer').addEventListener('pointerdown',e=>{
 const actor=e.target.closest('[data-inspect-id]');
 if(actor)boardGesture={id:actor.dataset.inspectId,x:e.clientX,y:e.clientY};
});
window.addEventListener('pointerup',e=>{
 const drag=boardGesture;boardGesture=null;
 if(!drag||Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<12)return;
 ignoreInspectUntil=performance.now()+380;
 const target=cellAtClient(e.clientX,e.clientY);
 if(target)moveHeroToCell(drag.id,target.col,target.row);
});
$('offlineBtn').addEventListener('click',openOffline);
$('claimOfflineBtn').addEventListener('click',claimOffline);
$('closeOfflineBtn').addEventListener('click',closeOffline);
$('rewardModal').querySelector('.modal-overlay').addEventListener('click',closeOffline);
window.addEventListener('beforeunload',save);
document.addEventListener('visibilitychange',()=>{if(document.hidden){save();lastFrame=0;}});
renderPanels();log('✨ สนาม AUTOCHEST 6×7 พร้อมสู้แบบ Idle แล้ว');
beginTravel(1.8);save();
window.__AUTOCHEST_IDLE_READY__=true;
if(pending.minutes>0)openOffline();
requestAnimationFrame(frame);
})();
