/* AUTOCHEST IDLE v0.14 — autonomous stage combat and SAO progression. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const HEROES=window.AUTOCHEST_CHARACTERS?.HEROES;
const CORE=window.AUTOCHEST_IDLE_CORE;
const combatHero=actor=>CORE.heroAtStars(HEROES[actor?.id],actor?.side==='ally'?(actor.progress?.stars||1):1);
const TFT=window.AUTOCHEST_TFT_COMBAT;
const VFX=window.AUTOCHEST_VFX;
if(!TFT)throw Error('TFT combat module missing: src/idle-tft-combat.js');
if(!HEROES||!CORE)throw Error('Character and Idle Core modules must be loaded before idle-game.js');
const IDS=Object.keys(HEROES);
const rarityOrder=()=>[...IDS].sort((a,b)=>HEROES[b].cost-HEROES[a].cost);
const rarityClass=h=>'rarity-'+h.rarity.toLowerCase();
const rarityBadge=h=>'<span class="rarity-badge '+rarityClass(h)+'">'+h.rarity+'</span>';
if(!IDS.length)throw Error('No SAO heroes registered');
const safe=(fn,alternative)=>{try{return fn()}catch(_){return alternative}};
const fmt=v=>Math.floor(v).toLocaleString('en-US');
const escapeText=v=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const studioTrialId=new URLSearchParams(location.search).get('studioTrial');
const studioMode=!!studioTrialId&&!!HEROES[studioTrialId];
let loaded=studioMode?null:safe(()=>JSON.parse(localStorage.getItem(CORE.KEY)),null);
let state=CORE.normalized(loaded,HEROES);
if(loaded){
 const newLoot=CORE.offlineLoot(Number(loaded.lastSaved)||Date.now(),Date.now(),state.stage);
 state.offlineBank.minutes+=newLoot.minutes;
 state.offlineBank.gold+=newLoot.gold;
 state.offlineBank.exp+=newLoot.exp;
}
let pending=state.offlineBank;
let selected=state.squad[0]||Object.keys(state.owned)[0]||IDS[0];
let skillReturnFocus=null,managementPanel=null,managementFocus=null;
let summonBusy=false,summonTimer=0,lastSummon=null;
let trial=null,trialContext=null,trialReturnFocus=null;
let formationMode=false,shots=[];
let allyRevives=new Map();
let combat=null,enemies=[],fighters=[],stageClock=0,respawn=1.8,waveCount=0,travel=0,travelDistance=0,encounters=0,lastFrame=0,lastSave=0,lastHUD=0,toastTimer=0;
let logLines=['✦ เริ่มการผจญภัย SAO IDLE แล้ว!'];
const GRID_COLS=6,GRID_ROWS=7,ALLY_START_ROW=4;
const boardPoint=(col,row)=>({x:(col+.5)*100/GRID_COLS,y:(row+.5)*100/GRID_ROWS});
const friendlyCell=(col,row)=>Number.isInteger(col)&&Number.isInteger(row)&&
  col>=0&&col<GRID_COLS&&row>=ALLY_START_ROW&&row<GRID_ROWS;
const cellAtClient=(clientX,clientY)=>{
 const r=$('boardGrid').getBoundingClientRect();
 const col=Math.floor((clientX-r.left)/r.width*GRID_COLS);
 const row=Math.floor((clientY-r.top)/r.height*GRID_ROWS);
 return friendlyCell(col,row)?{col,row}:null;
};
let boardGesture=null,ignoreInspectUntil=0,dragGhost=null,dropHighlight=null;
// Hero-shaped enemies share art and skills with the player's SAO roster.
// Normal enemies unlock with their assigned floor, including former boss-only heroes.
// Floor bosses use the whole registered roster, including boss-only heroes.
const enemyLimit=()=>CORE.waveSize(state.stage);
const waveSlots=[[1,0],[4,0],[2,1],[0,1],[5,1]]; // finite TFT wave formation
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
// Translate on the compositor instead of restarting a 280ms CSS transition each frame.
let arenaSize={width:0,height:0};
function refreshArenaSize(){
 const arena=$('stageViewport');
 arenaSize={width:arena.clientWidth,height:arena.clientHeight};
 for(const actor of [...fighters,...enemies])position(actor);
 for(const shot of shots)positionShot(shot);
}
function setArenaPosition(node,x,y,angle=null){
 if(!node)return;
 const px=x*arenaSize.width/100,py=y*arenaSize.height/100;
 const transform='translate3d('+px.toFixed(2)+'px,'+py.toFixed(2)+'px,0) translate(-50%,-50%)'+(angle===null?'':' rotate('+angle+'rad)');
 if(node.style.transform!==transform)node.style.transform=transform;
}
function positionShot(shot){const angle=shot.pierce?Math.atan2(shot.pierce.dy*arenaSize.height/TFT.H,shot.pierce.dx*arenaSize.width/TFT.W):shot.target?Math.atan2((shot.target.y-shot.y)*arenaSize.height,(shot.target.x-shot.x)*arenaSize.width):null;setArenaPosition(shot.node,shot.x,shot.y,(angle||0)+(Number(shot.node?.dataset.fxRotation)||0)*Math.PI/180)}
function position(actor){
 if(!actor?.node)return;
 setArenaPosition(actor.node,actor.x,actor.y);
 actor.node.classList.toggle('walking',!!actor.walking&&actor.attackUntil<=stageClock);
 actor.node.classList.toggle('explosion-casting',actor.hp>0&&!!actor.castUntil&&!actor.exhausted);
 actor.node.classList.toggle('explosion-exhausted',actor.hp>0&&!!actor.exhausted);
 actor.node.classList.toggle('cloaked',actor.cloakUntil>stageClock);
 actor.node.classList.toggle('immortal',TFT.isImmortal(actor,stageClock));
 actor.node.classList.toggle('guard-shield',actor.hp>0&&(actor.shield||0)>0);
 actor.node.classList.toggle('taunting',actor.hp>0&&(actor.tauntUntil||0)>stageClock);
 actor.node.classList.toggle('weakened',actor.hp>0&&TFT.debuffValue(actor,'attackDown',stageClock)>0);
 actor.node.classList.toggle('vulnerable',actor.hp>0&&TFT.debuffValue(actor,'vulnerability',stageClock)>0);
 actor.node.classList.toggle('support-buffed',actor.hp>0&&(TFT.debuffValue(actor,'attackUp',stageClock)>0||TFT.debuffValue(actor,'speedUp',stageClock)>0));
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
 if(studioMode){lastSave=performance.now();return}
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
// Stage backgrounds: upload matching PNG files under assets/backgrounds.
const STAGE_BACKGROUNDS=[
 './assets/backgrounds/grassland.png',
 './assets/backgrounds/forest.png',
 './assets/backgrounds/iron-valley.png',
 './assets/backgrounds/night-temple.png',
 './assets/backgrounds/sky-castle.png'
];
let stageBackgroundTheme=-1;
function updateStageBackground(stage){
 const theme=CORE.floorNumber(stage)-1;
 if(theme===stageBackgroundTheme)return;
 stageBackgroundTheme=theme;
 const arena=$('stageViewport'),src=STAGE_BACKGROUNDS[theme]||('./assets/backgrounds/floor-'+String(theme+1).padStart(2,'0')+'.png');
 // Restore the existing CSS background while the next image is loading or absent.
 arena.style.removeProperty('background-image');
 arena.style.removeProperty('background-size');
 arena.style.removeProperty('background-position');
 arena.style.removeProperty('background-repeat');
 if(!src)return;
 const img=new Image();
 img.onload=()=>{
  if(stageBackgroundTheme!==theme)return;
  arena.style.backgroundImage='url('+JSON.stringify(src)+')';
  arena.style.backgroundSize='cover';
  arena.style.backgroundPosition='center';
  arena.style.backgroundRepeat='no-repeat';
 };
 img.src=src;
}
function updateResources(){
 $('goldValue').textContent=fmt(state.gold);
 $('expValue').textContent=fmt(state.heroExp);
 $('rubyValue').textContent=fmt(state.rubies);
 $('ticketValue').textContent=fmt(state.tickets);
 $('teamPower').textContent=fmt(CORE.power(state,HEROES));
 $('stageName').textContent=CORE.stageName(state.stage);
 updateStageBackground(state.stage);
 $('stageNumber').textContent=fmt(state.stage)+' / '+fmt(CORE.maxStage(HEROES));
 if($('floorProgress'))$('floorProgress').textContent='FLOOR '+CORE.floorNumber(state.stage)+' / '+CORE.floorCount(HEROES);
 const floorBoss=HEROES[CORE.floorBossId(state.stage,HEROES)];
 if($('floorBossName'))$('floorBossName').textContent=floorBoss?'👑 บอสประจำชั้น: '+floorBoss.name:'ยังไม่มีบอสประจำชั้น';
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
 const floorComplete=!CORE.canChallengeStage(state,HEROES);
 $('challengeBtn').disabled=floorComplete||!!combat?.boss||state.kills<need;
 $('challengeBtn').textContent=floorComplete?'🏆 ถึงขอบเขตชั้นปัจจุบัน · ฟาร์มต่อ':combat?.boss?'👑 กำลังต่อสู้กับบอส':state.kills<need?'👑 ปลดล็อกบอส '+state.kills+'/'+need:'👑 ท้าทาย '+(floorBoss?.name||'บอส')+'!';
 $('bossTimer').hidden=!combat?.boss;
 $('fightLabel').classList.toggle('boss-mode',!!combat?.boss);
 $('fightLabel').textContent=combat?.boss?'BOSS BATTLE':combat?'WAVE '+waveCount:'WAVE READY';
 if(combat?.boss){$('bossCountdown').textContent=Math.max(0,Math.ceil(combat.timeout))}
 const farm=CORE.farmReward(state.stage);
 $('farmGain').textContent='ศัตรูที่ชนะ +'+fmt(farm.gold)+' G / +'+fmt(farm.exp)+' EXP';
 updateSummonWallet();
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
 const editing=formationMode||!!boardGesture?.active;
 label.textContent=editing?'♟️ พักต่อสู้ชั่วคราว · ปล่อยฮีโร่เพื่อจัดทีม':state.autoBattle?'⚔️ TFT Auto กำลังต่อสู้ · ลากจัดทีมได้เลย':'⏸ ปิด Auto · ยังลากจัดทีมได้';
 label.classList.toggle('editing',editing);
 $('stageViewport').classList.toggle('formation-active',editing);
 const hint=$('swapHelp');
 if(hint)hint.textContent='ลากฮีโร่จากคลังหรือทีมลงสนาม · ลากทับตัวเดิมเพื่อสลับ';
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
 selected=newId;
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
   rarityClass(t)+
   '" data-slot="'+id+'" aria-label="เลือก '+escapeText(t.name)+' เลเวล '+p.level+' '+p.stars+' ดาว">'+
   '<span class="team-level">Lv.'+p.level+'</span>'+rarityBadge(t)+
   '<img loading="lazy" src="'+t.images.idle+'" alt="">'+
   '<strong>'+escapeText(t.name)+'</strong>'+
   '<span class="team-stars">'+'★'.repeat(p.stars)+'</span>'+
   '<span class="team-ready" title="เสริมแกร่งได้แล้ว">⬆</span></button>';
 }).join('');
}
function renderHeroes(){
 $('heroList').innerHTML=rarityOrder().map(id=>{
  const t=HEROES[id],p=state.owned[id],ready=readyUpgrade(id);
  return '<div class="hero-entry"><button type="button" class="hero-card '+(!p?'locked ':'')+
   (selected===id?'active ':'')+(ready?'is-upgrade-ready ':'')+rarityClass(t)+'" data-hero="'+id+'">'+rarityBadge(t)+
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
   '<h4>'+escapeText(hero.name)+' '+rarityBadge(hero)+'</h4><span class="upgrade-lock">🔒 ยังไม่ได้อัญเชิญ</span>'+
   '<p>'+escapeText(hero.subtitle||'')+'</p></div></div>'+
   '<div class="upgrade-empty">ปลดล็อกโดยอัญเชิญฮีโร่จากกาชาด้านล่าง เพื่อเริ่มอัปเลเวลและดาว</div>'+
   starUpgradeHtml(hero,1)+'<button type="button" id="openSkillBtn" class="inspect-skill-btn">ⓘ ดูสกิลฮีโร่คนนี้</button>';
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
  '<span class="upgrade-kicker">HERO PROGRESSION</span><h4>'+escapeText(hero.name)+' '+rarityBadge(hero)+'</h4>'+
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
   starUpgradeHtml(hero,p.stars)+
   (atStarMax?'<div class="upgrade-max-notice">✅ ครบ 5 ดาวแล้ว</div>':
    '<div class="upgrade-materials"><span id="starShardStatus" class="'+(p.shards>=starNeed?'enough':'missing')+'">🧩 ชิ้นส่วน '+fmt(p.shards)+' / '+fmt(starNeed)+'</span>'+
    '<span id="starGoldStatus" class="'+(state.gold>=starGold?'enough':'missing')+'">🪙 Gold '+fmt(state.gold)+' / '+fmt(starGold)+'</span></div>'+
    '<p id="rankResourceHint" class="upgrade-hint">'+(starGood?'✅ ชิ้นส่วนครบ เพิ่มดาวได้เลย':
     shardMissing?'ยังขาดชิ้นส่วน '+shardMissing+' ชิ้น — อัญเชิญตัวซ้ำเพื่อสะสม':'ขาด Gold '+fmt(Math.max(0,starGold-state.gold)))+'</p>')+
   '<button type="button" id="rankHeroBtn" class="star-upgrade-button"'+(!starGood?' disabled':'')+'>'+
   (atStarMax?'★ ดาวสูงสุด':'⭐ เพิ่มเป็น '+(p.stars+1)+' ดาว')+'</button>'+
  '</section>'+
  '<div class="upgrade-footer-actions"><button type="button" id="deployHeroBtn" class="deploy-action"'+'>'+
   (inTeam?'↩ ถอนเข้าตัวสำรอง':full?'↔️ ลากทับฮีโร่ในทีม':'⚔️ เพิ่มเข้าทีม')+'</button>'+
   '<button type="button" id="openSkillBtn" class="inspect-skill-btn">ⓘ ดูสกิลทั้งหมด</button></div>';
}
function starUpgradeHtml(hero,stars=1){
 if(!hero.starUpgrades?.length)return '';
 return '<div class="star-perks"><strong>✦ STAR AWAKENING · โบนัสสะสม</strong>'+hero.starUpgrades.map(step=>'<div class="star-perk '+(stars>=step.star?'unlocked':'locked-perk')+'"><b>'+step.star+'★</b><span>'+escapeText(step.label)+'</span><small>'+(stars>=step.star?'✓':'🔒')+'</small></div>').join('')+'</div>';
}
function skillDescription(t,enemy=false){
 const n=t.triggerEvery||4,lines=['โจมตีปกติ 100% ATK เมื่อเป้าหมายอยู่ในระยะ TFT จริง • มีโอกาสคริติคอล'];
 switch(t.effect){
  case 'explosion':
   lines[0]='เริ่มร่ายเวทเมื่อเข้าสู่การต่อสู้โดยอัตโนมัติ';
   lines.push('ร่าย '+t.castSeconds+' วินาที · ระเบิดศัตรูทั้งหมด '+Math.round(t.skillPower*100)+'% ATK · ร่ายไม่สำเร็จหากตายก่อนครบเวลา');
   lines.push('พาสซีฟ — '+t.passive.name+': หลังระเบิดหมดแรง ไม่โจมตีหรือเดินอีกจนจบเวฟ/บอส แต่ยังถูกโจมตีได้');
   break;
  case 'slash':
   lines.push('ทุก '+n+' การโจมตี: โจมตีเป้าหมายเดียว '+Math.round((t.skillPower||2)*100)+'% ATK'+(t.skillGuaranteedCrit?' · ติดคริติคอลแน่นอน':' พร้อมเอฟเฟกต์วงพลัง'));
   break;
  case 'blink':
   lines.push('ทุก '+n+' การโจมตี: เคลื่อนฉับไวเข้าหาเป้าหมาย ฟัน 200% ATK และตามด้วยโจมตีอีก 50% ATK');
   break;
  case 'pierce':
   lines.push('ทุก '+n+' การโจมตี: '+(t.range<1.8?'ฟันปล่อยลำแสงศักดิ์สิทธิ์':'ยิงทะลวง')+'เป็นเส้นตรงจนถึงขอบสนาม ทำดาเมจ '+Math.round((t.skillPower||2.4)*100)+'% ATK ต่อศัตรูทุกตัวในแนว (โดนครั้งเดียวต่อตัว) · '+(t.pierceShield===false?'โล่ป้องกันได้':'ไม่สนโล่ป้องกัน')+' · ไม่ทะลุอมตะ');
   break;
  case 'triple':
   lines.push('ทุก '+n+' การโจมตี: ยิงกระสุนหลักแรง 200% ATK และกระสุนรองอีก 2 นัด นัดละ 85% ATK (เลือกเป้าหมายอื่นได้)');
   break;
  case 'heal':
   lines.push('ทุก '+n+' การโจมตี: ฟื้น HP ให้สมาชิกที่มีเปอร์เซ็นต์ HP ต่ำสุด '+t.support.healTargets+' คน คนละ '+Math.round(t.support.healHp*100)+'% ของ HP สูงสุด · ไม่ชุบชีวิต');
   lines.push('เพิ่ม ATK '+Math.round(t.support.attackUp*100)+'% และความเร็วโจมตี '+Math.round(t.support.speedUp*100)+'% ให้ทีมที่ยังมีชีวิตทั้งหมด '+t.support.duration+' วินาที · รีเฟรชเวลา ไม่สะสมความแรง · ไม่สร้างดาเมจ');
   break;
  case 'chain':
   lines.push('ทุก '+n+' การโจมตี: ปล่อยกระแสพลังใส่ศัตรูสูงสุด '+(t.chainTargets||3)+' ตัว แรงนัดละ '+Math.round((t.chainPower||1.12)*100)+'% ATK');
   break;
  case 'slam':
   lines.push('ทุก '+n+' การโจมตี: ทุบโจมตีพื้นที่รัศมี '+(t.slamRadius||140)+' พิกเซลของสนาม แรง '+Math.round((t.skillPower||1.8)*100)+'% ATK ต่อเป้าหมาย');
   if(t.debuff)lines.push('ศัตรูที่รอดจากการโจมตีติดดีบัฟ: พลังโจมตีลด '+Math.round(t.debuff.attackDown*100)+'% และได้รับดาเมจเพิ่ม '+Math.round(t.debuff.vulnerability*100)+'% นาน '+t.debuff.duration+' วินาที · รีเฟรชเวลา ไม่สะสมความแรง');
   break;
  case 'shield':
   if(t.guard)lines.push('ทุก '+n+' การโจมตี: สร้างโล่ตนเอง '+Math.round(t.guard.selfShield*100)+'% ของ HP สูงสุด และให้พันธมิตรที่ยังมีชีวิตทุกคนโล่ '+Math.round(t.guard.allyShield*100)+'% ของ HP สูงสุดของแต่ละคน · ยั่วยุศัตรูทั่วสนาม '+t.guard.tauntSeconds+' วินาที · ไม่สร้างดาเมจ · โล่รีเฟรช ไม่สะสมทับ');
   else lines.push('ทุก '+n+' การโจมตี: เพิ่มโล่ป้องกัน 30% ของ HP สูงสุด และโจมตีปกติแบบหนัก 200% ATK');
   break;
  case 'cloakshot':
   lines.push('ทุก '+n+' การโจมตี: พรางตัว '+(t.cloakDuration||2).toFixed(1)+' วินาที ศัตรูจะไม่เลือกเป็นเป้าหมายใหม่');
   lines.push('การโจมตีแรกหลังหมดพราง '+Math.round((t.cloakShotMultiplier||1.7)*100)+'% ATK และโอกาสคริเพิ่ม +'+Math.round((t.cloakCritBonus||.5)*100)+' จุดเปอร์เซ็นต์');
   lines.push('เป้าหมาย HP ต่ำกว่า '+Math.round((t.executeThreshold||.35)*100)+'%: เพิ่มดาเมจอีก '+Math.round(((t.executeMultiplier||1.2)-1)*100)+'%');
   break;
  default:lines.push('ทุก '+n+' การโจมตี: ใช้สกิลตามข้อมูลฮีโร่');
 }
 if(t.cleave)lines.push('โจมตีปกติ: ฟันศัตรูอื่นรอบเป้าหมายในรัศมี '+t.cleave.radius+' px คนละ '+Math.round(t.cleave.power*100)+'% ATK');
 if(t.passive?.bossMultiplier)lines.push('พาสซีฟ — '+t.passive.name+': ดาเมจทุกชนิดต่อบอส ×'+t.passive.bossMultiplier+' ก่อนคริติคอลและการป้องกัน');
 if(t.passive?.healOnAttack)lines.push('พาสซีฟ — '+t.passive.name+': เมื่อโจมตีปกติ ฟื้น HP ให้สมาชิกที่บาดเจ็บหนักที่สุด (ตามเปอร์เซ็นต์ HP) เท่ากับ '+Math.round(t.passive.healOnAttack*100)+'% ของ ATK พื้นฐานในการต่อสู้ของตนเอง');
 if(t.passive?.damageReduction)lines.push('พาสซีฟ — '+t.passive.name+': ลดความเสียหายที่ได้รับ '+Math.round(t.passive.damageReduction*100)+'% ตลอดการต่อสู้ ก่อนคำนวณโล่');
 if(t.passive?.focusCritStep)lines.push('พาสซีฟ — '+t.passive.name+': โจมตีเป้าหมายเดิมต่อเนื่องเพิ่มโอกาสคริติคอล '+Math.round(t.passive.focusCritStep*100)+' จุดเปอร์เซ็นต์ต่อครั้ง (สูงสุด +'+Math.round(t.passive.focusCritMax*100)+' จุดเปอร์เซ็นต์) · รีเซ็ตเมื่อเปลี่ยนเป้าหมาย');
 if(t.passive?.reviveHp)lines.push('พาสซีฟ — '+t.passive.name+': เมื่อ HP เหลือ 0 คืนชีพด้วย HP '+Math.round(t.passive.reviveHp*100)+'% และเป็นอมตะ '+t.passive.immortalSeconds+' วินาที (ไม่รับดาเมจ) · 1 ครั้งต่อเวฟหรือบอส');
 if(t.globalRange)lines.push('🎯 ระยะยิงทั่วสนาม: ยิงได้จากทุกมุมโดยไม่ต้องเดินเข้าหาเป้าหมาย · ถอยเมื่อศัตรูประชิด');
 else if(Number(t.range)>=1.8)lines.push('🎯 ยิงไกล: กระสุนเดินทางตามเป้าหมายและคำนวณดาเมจเมื่อกระสุนถึง; พยายามรักษาระยะเมื่อศัตรูประชิด');
 else lines.push('⚔️ ประชิด: วิ่งเข้าโจมตีตามระยะของสนาม TFT');
 return lines;
}
function openSkill(id,source='hero',unit=null){
 const base=HEROES[id],modal=$('skillModal');if(!base||!modal)return;
 const enemy=source==='enemy',progress=enemy?null:state.owned[id],h=CORE.heroAtStars(base,progress?.stars||1),stat=CORE.stats(base,progress||{level:1,stars:1});
 const active=enemy?(unit||enemies.find(x=>x.id===id)):null;
 const stats=[
  ['HP',fmt(active?active.maxHp:stat.hp)],
  ['ATK',fmt(active?active.atk:stat.atk)],
  ['โจมตีทุก',Number(active?active.delay:stat.cool).toFixed(2)+' วินาที'],
  ['ระยะโจมตี',h.globalRange?'ทั่วสนาม':Number(h.range).toFixed(2)+' ช่อง'],
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
  '<p>'+escapeText(h.subtitle||'')+'</p><div class="skill-tags">'+rarityBadge(h)+'<span>'+escapeText(h.role||h.team)+'</span>'+
  (h.traits||[]).map(x=>'<span>'+escapeText(x)+'</span>').join('')+'</div>'+
  '<div class="skill-stats">'+stats.map(([k,v])=>'<div><small>'+escapeText(k)+'</small><strong>'+escapeText(v)+'</strong></div>').join('')+
  '</div></div></div><section class="skill-ability"><small>⚔ AUTO SKILL · IDLE MODE</small>'+
  '<h3>✨ '+escapeText(h.skill)+'</h3><ul>'+
  skillDescription(h,enemy).map(x=>'<li>'+escapeText(x)+'</li>').join('')+'</ul>'+
  '<p class="skill-mode-note">ใช้กติกาต่อสู้ TFT เดิม ผสมระบบฟาร์มและกาชาแบบ Idle · เลเวลและดาวอิงค่าปัจจุบัน</p></section>'+starUpgradeHtml(base,progress?.stars||1);
 $('skillModalContent').insertAdjacentHTML('beforeend','<button type="button" class="trial-entry" data-trial-hero="'+id+'">▶ ทดลองฮีโร่ฟรี</button>');
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
 else if(!CORE.canChallengeStage(state,HEROES))task='🏆 ถึงขอบเขตชั้นปัจจุบันแล้ว · ฟาร์มและสะสมดาวระหว่างรอชั้นใหม่';
 else task='พิชิตด่าน <b>'+Math.min(state.stage+5,CORE.maxStage(HEROES))+'</b> และสะสมดาวฮีโร่';
 const extra=state.bossRetryWaves?' · ฟาร์มอีก '+state.bossRetryWaves+' เวฟก่อนลองบอสใหม่':'';
 $('guideQuest').innerHTML='✧ '+task+'<br><small>เวฟเป็นชุด • Auto ฟาร์ม • แพ้บอสไม่ตกด่าน'+extra+'</small>';
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
 if(mobileShortcut){mobileShortcut.textContent=ready.length?String(ready.length):'';mobileShortcut.hidden=!ready.length;}
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
 actor.maxHp=stat.hp;actor.atk=stat.atk;actor.cool=stat.cool;actor.progress=state.owned[id];
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
function heroAtCell(cell){
 return cell&&state.squad.find(id=>state.placements[id]?.col===cell.col&&state.placements[id]?.row===cell.row);
}
function addToSquad(id,cell=null){
 if(!state.owned[id]||state.squad.includes(id))return false;
 if(state.squad.length>=CORE.maxSquad(state.stage)){
  toast('ทีมเต็ม · ลาก '+HEROES[id].name+' ทับตัวในทีมเพื่อสลับ');return false;
 }
 if(cell&&(!friendlyCell(cell.col,cell.row)||heroAtCell(cell)))return false;
 state.squad.push(id);selected=id;
 if(cell)state.placements[id]={...cell};
 CORE.fillPlacements(state,state.placements);
 syncFormationRoster();toast('⚔️ เพิ่ม '+HEROES[id].name+' ลงทีมแล้ว');return true;
}
function removeFromSquad(id){
 if(!state.squad.includes(id))return false;
 if(state.squad.length<=1){toast('ต้องมีฮีโร่ในทีมอย่างน้อย 1 คน');return false}
 state.squad=state.squad.filter(x=>x!==id);
 delete state.placements[id];selected=id;
 CORE.fillPlacements(state,state.placements);
 syncFormationRoster();toast('↩ '+HEROES[id].name+' กลับเป็นตัวสำรอง');return true;
}
function toggleHero(){
 return state.squad.includes(selected)?removeFromSquad(selected):addToSquad(selected);
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
function summonCostLabel(cost){
 return [cost.tickets?'🎟 '+fmt(cost.tickets):'',cost.rubies?'💎 '+fmt(cost.rubies):''].filter(Boolean).join(' + ');
}
function updateSummonWallet(){
 $('summonTickets').textContent=fmt(state.tickets);$('summonRubies').textContent=fmt(state.rubies);
 for(const [count,button,costId] of [[1,'summonOneBtn','summonOneCost'],[10,'summonTenBtn','summonTenCost']]){
  const cost=CORE.summonCost(state,count);
  $(costId).textContent=summonCostLabel(cost);
  $(button).disabled=summonBusy||state.rubies<cost.rubies;
 }
 $('summonLastBtn').hidden=!lastSummon;
}
function renderSummonPool(){
 const odds=CORE.summonOdds(HEROES).sort((a,b)=>HEROES[b.id].cost-HEROES[a.id].cost);
 $('summonPoolCount').textContent=odds.length;
 $('summonPool').innerHTML=odds.map(({id})=>{const h=HEROES[id];return '<button type="button" class="summon-pool-hero tier-'+h.cost+' '+rarityClass(h)+'" data-trial-hero="'+id+'" aria-label="ทดลอง '+escapeText(h.name)+'">'+rarityBadge(h)+'<img src="'+h.images.art+'" alt=""><span>'+escapeText(h.name)+'</span><small>▶ ทดลอง</small></button>'}).join('');
 const totals=Object.create(null);for(const {id,rate} of odds){const tier=HEROES[id].rarity;totals[tier]=(totals[tier]||0)+rate}
 $('summonTierRates').innerHTML=['UR','SSR','SR','R'].filter(t=>totals[t]>0).map(t=>'<span class="rarity-badge rarity-'+t.toLowerCase()+'">'+t+' '+(totals[t]*100).toFixed(0)+'%</span>').join('');
 $('summonRates').innerHTML=odds.map(({id,rate})=>'<div><span>'+rarityBadge(HEROES[id])+' '+escapeText(HEROES[id].name)+'</span><b>'+ (rate*100).toFixed(2)+'%</b></div>').join('');
}
function showSummonBanner(){
 if(summonBusy)return;
 $('summonBanner').hidden=false;$('summonReveal').hidden=true;$('summonOutcome').hidden=true;
 updateSummonWallet();
}
function showSummonOutcome(){
 if(!lastSummon)return;
 clearTimeout(summonTimer);summonBusy=false;
 const {count,cost,rewards}=lastSummon;
 const fresh=rewards.filter(x=>x.isNew).length,shards=rewards.reduce((sum,x)=>sum+x.shards,0);
 $('summonBanner').hidden=true;$('summonReveal').hidden=true;$('summonOutcome').hidden=false;
 $('summonSummary').textContent='ฮีโร่ใหม่ '+fresh+' คน · ชิ้นส่วน '+shards+' ชิ้น';
 $('summonResults').classList.toggle('single',count===1);
 $('summonResults').innerHTML=rewards.map((reward,i)=>{
  const h=HEROES[reward.id];
  return '<article class="summon-result-card tier-'+h.cost+' '+rarityClass(h)+(reward.isNew?' new-hero':'')+'" style="--delay:'+Math.min(i*65,550)+'ms">'+
   '<div class="summon-result-art">'+rarityBadge(h)+'<img src="'+h.images.art+'" alt="'+escapeText(h.name)+'"><span class="result-tag">'+(reward.isNew?'NEW':'+1 ชิ้นส่วน')+'</span></div>'+
   '<strong>'+escapeText(h.name)+'</strong><small>'+escapeText(h.role||h.team)+'</small></article>';
 }).join('');
 $('summonReceipt').textContent='ใช้ '+summonCostLabel(cost)+' · อัญเชิญ '+count+' ครั้ง';
 updateSummonWallet();
}
function summon(count){
 if(summonBusy||$('summonBanner').hidden)return;
 const receipt=CORE.drawDetailed(state,HEROES,count);
 if(!receipt){toast('ตั๋วหรือ Rubies ไม่พอ');return}
 summonBusy=true;lastSummon=receipt;
 // Commit rewards before animation so closing or skipping cannot reroll the result.
 save();renderPanels();
 const ur=receipt.rewards.some(x=>HEROES[x.id].rarity==='UR');
 $('summonReveal').classList.toggle('ur-reveal',ur);
 $('summonRevealTitle').textContent=ur?'✦ ULTRA RARE · UR ✦':'กำลังอัญเชิญ...';
 $('summonBanner').hidden=true;$('summonOutcome').hidden=true;$('summonReveal').hidden=false;
 clearTimeout(summonTimer);summonTimer=setTimeout(showSummonOutcome,matchMedia('(prefers-reduced-motion: reduce)').matches?0:ur?2100:850);
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
// Keep the effect layer bounded during long idle farming sessions.
const MAX_VISUAL_EFFECTS=70,MAX_ACTIVE_SHOTS=36;
const fxLanes=new WeakMap();
function effectLayer(){return $(trialContext?'trialFx':'fxLayer')}
function addTransientFx(node,duration){
 const layer=effectLayer();
 if(layer.childElementCount>=MAX_VISUAL_EFFECTS){
  // Prioritize actual combat numbers; remove the oldest decorative effect first.
  const old=layer.querySelector('.image-vfx,.fx-ring,.fx-cloak,.fx-bolt');
  if(old)old.remove();
  else if(node.classList.contains('fx-number'))layer.querySelector('.fx-number')?.remove();
  else return;
 }
 layer.appendChild(node);setTimeout(()=>node.remove(),duration);
}
function spawnFx(label,x,y,critical=false,kind='status',lane=0){
 const fx=el('span',{class:'fx-number fx-'+kind+(critical?' critical':'')},escapeText(label));
 fx.style.left=Math.max(7,Math.min(93,x))+'%';
 fx.style.top=Math.max(arenaSize.height?Math.min(24,6600/arenaSize.height):12,Math.min(92,y))+'%';
 fx.style.setProperty('--fx-x',[-18,18,0,-32,32][lane%5]+'px');
 fx.style.setProperty('--fx-y',(-22-Math.floor(lane%5/2)*13)+'px');
 addTransientFx(fx,1050);
}
function unitFx(actor,label,kind='status',critical=false){
 if(trialContext){const name=HEROES[actor.id]?.name||actor.label||'หุ่นฝึก';trialContext.events.unshift({name,label,kind});trialContext.events.length=Math.min(6,trialContext.events.length)}
 const now=performance.now(),prev=fxLanes.get(actor);
 const lane=prev&&now-prev.at<360?(prev.lane+1)%5:0;
 fxLanes.set(actor,{at:now,lane});
 spawnFx(label,actor.x,actor.y,critical,kind,lane);
}
function statusFx(actor,key,label){
 const now=performance.now(),map=actor.fxStatusTimes||(actor.fxStatusTimes={});
 if(map[key]!==undefined&&now-map[key]<420)return;
 map[key]=now;unitFx(actor,label,'status');
}
function projectile(x1,y1,x2,y2,color='#c6f7ff'){
 const node=el('span',{class:'fx-bolt'});
 node.style.left=x1+'%';node.style.top=y1+'%';node.style.color=color;
 node.style.setProperty('--dx',(x2-x1)*arenaSize.width/100+'px');
 node.style.setProperty('--dy',(y2-y1)*arenaSize.height/100+'px');
 addTransientFx(node,360);
}
function renderVfxRegion(spec,from,to=null,scale=1){
 if(!spec)return;
 const node=el('span',{class:'image-vfx'+(spec.mode==='beam'?' beam-vfx':'')});
 const region=VFX.geometry(spec,arenaSize,from,to,scale);
 const time=VFX.lifetime(spec);node.style.setProperty('--vfx-duration',time.visible+'ms');node.style.setProperty('--vfx-delay',time.delayMs+'ms');
 VFX.placeRegion(node,spec,region);VFX.animateLifetime(node,spec);addTransientFx(node,time.total);
}
function visualEffect(event,actor,x=actor.x,y=actor.y,scale=1){
 const spec=VFX?.getSpec(HEROES[actor.id],event);if(!spec)return;
 renderVfxRegion(spec,spec.mode==='beam'?actor:{x,y},spec.mode==='beam'?{x,y}:null,scale);
}
function beamEffect(actor,target,special=false){
 const spec=VFX?.getSpec(HEROES[actor.id],special?'skillProjectile':'projectile');
 if(spec?.mode!=='beam')return false;
 renderVfxRegion(spec,actor,target);return true;
}
function imageProjectile(node,actor,special=false){
 const spec=VFX?.getSpec(HEROES[actor.id],special?'skillProjectile':'projectile');if(!spec)return false;
 node.classList.add('image-projectile');
 const size=(spec.src.endsWith('/combat-atlas.svg')?(special?58:36):spec.size)*Math.min(1,arenaSize.width/540);
 node.style.width=size*spec.scaleX+'px';node.style.height=size*spec.scaleY+'px';node.dataset.fxRotation=String(spec.rotation);VFX.paint(node,spec,spec.frames>1&&!spec.src.endsWith('/combat-atlas.svg'));VFX.animateLifetime(node,spec,true);return true;
}
function ring(x,y,cloak=false){
 const node=el('span',{class:cloak?'fx-cloak':'fx-ring'});
 node.style.left=x+'%';node.style.top=y+'%';
 addTransientFx(node,850);
}
function clearFx(){for(const node of Array.from($('fxLayer').children))if(!node.classList.contains('fx-number')&&!node.classList.contains('image-vfx'))node.remove()}
function buildFighters(preserve=false){
 const previous=new Map(preserve?fighters.map(f=>[f.id,f]):[]);
 fighters=state.squad.filter(id=>state.owned[id]).map((id,i)=>{
  const stat=CORE.stats(HEROES[id],state.owned[id]);
  const place=state.placements?.[id]||CORE.defaultCells[i],point=boardPoint(place.col,place.row);
  const old=previous.get(id);
  const revive=allyRevives.get(id);
  const hp=old?Math.max(0,Math.min(stat.hp,Math.round(old.hp/Math.max(1,old.maxHp)*stat.hp))):stat.hp;
  return {id,side:'ally',x:point.x,y:point.y,startX:point.x,move:HEROES[id].move,
   hp,maxHp:stat.hp,atk:stat.atk,cool:stat.cool,remaining:old?.remaining??i*.12,
   castUntil:old?.castUntil||0,exhausted:!!old?.exhausted,attacks:old?.attacks||0,shield:old?.shield||0,tauntUntil:old?.tauntUntil||0,
   attackDown:old?.attackDown||null,vulnerability:old?.vulnerability||null,
   attackUp:old?.attackUp||null,speedUp:old?.speedUp||null,
   focusTarget:old?.focusTarget||null,focusHits:old?.focusHits||0,
   crit:stat.crit,critDamage:stat.critDamage,
   cloakUntil:old?.cloakUntil||0,ambush:old?.ambush||false,
   reviveUsed:!!revive,immortalUntil:revive?.until||0,
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
  position(hero);
  if(!hero.alive)node.style.opacity='.2';
 }
}
function beginTravel(seconds=1.6){
 combat=null;enemies=[];respawn=seconds;travel=0;allyRevives.clear();
 clearTftShots();
 $('monsterLayer').replaceChildren();clearFx();buildFighters();travelScene();
 $('battleMessage').textContent=state.bossRetryWaves?
  '🪙 ฟาร์มด่าน '+state.stage+' • อีก '+state.bossRetryWaves+' เวฟจะท้าบอสใหม่':
  '♟️ เตรียมรับเวฟ '+(waveCount+1)+'...';
 renderQuest();updateResources();
}
function spawnMonster(boss=false,cell=null,quiet=false){
 if(boss&&!CORE.canChallengeStage(state,HEROES))return;
 if(boss){enemies=[];$('monsterLayer').replaceChildren();clearTftShots()}
 else if(enemies.length>=enemyLimit())return;
 // Prevent multiple one-shot Explosion casters in the same normal wave.
 const excluded=!boss&&enemies.some(e=>HEROES[e.id]?.effect==='explosion')?IDS.filter(id=>HEROES[id].effect==='explosion'):[];
 const id=boss?CORE.floorBossId(state.stage,HEROES):CORE.pickEnemyId(state.stage,HEROES,Math.random,excluded);
 if(!id)return;
 if(!boss)encounters++;
 const hero=HEROES[id],stat=CORE.monster(state.stage,boss);
 const hp=Math.max(1,Math.round(stat.hp*(.8+hero.hp/3000)));
 const entry=cell?boardPoint(cell[0],cell[1]):
  boardPoint(boss?2:(encounters+2)%GRID_COLS,boss?1:encounters%3);
 const foe={id,side:'enemy',boss,hp,maxHp:hp,atk:Math.round(stat.atk*(.9+hero.dmg/900)),
  remaining:.65+Math.random()*.35,delay:Math.max(.75,hero.cool*1.2),move:hero.move,
  shield:0,attacks:0,crit:hero.critChance||.05,critDamage:hero.critDamage||1.5,
  cloakUntil:0,ambush:false,attackUntil:0,walking:false,alive:true,
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
 if(!quiet){
  $('battleMessage').textContent=boss?'👑 บอส '+hero.name+' ปรากฏตัว!':
   '⚔️ เวฟ '+waveCount+' · ศัตรู '+enemies.length+' ตัว';
  updateResources();
 }
}
function spawnWave(){
 if(combat||enemies.length)return;
 waveCount++;
 const count=enemyLimit(),shift=waveCount%2;
 for(let i=0;i<count;i++)spawnMonster(false,waveSlots[(i+shift)%waveSlots.length],true);
 $('battleMessage').textContent='⚔️ เวฟ '+waveCount+' • ศัตรู '+count+' ตัวพร้อมกัน';
 log('⚔️ เวฟ '+waveCount+' · ศัตรู '+count+' ตัว');
 updateResources();
}
function resetCombat(){beginTravel(.8)}
function victoryBoss(){
 if(!CORE.canChallengeStage(state,HEROES)){beginTravel(1.5);return;}
 const reward=CORE.bossReward(state.stage);
 state.gold+=reward.gold;state.heroExp+=reward.exp;
 state.rubies+=reward.rubies;state.tickets+=reward.tickets;state.bossWins++;
 log('🏆 ผ่านด่าน '+state.stage+'! +'+fmt(reward.gold)+' G และ +'+fmt(reward.rubies)+' 💎');
 CORE.clearStage(state,HEROES);waveCount=0;save();
 const complete=!CORE.canChallengeStage(state,HEROES);
 beginTravel(1.5);
 renderPanels();toast(complete?'🏆 พิชิตครบทุกชั้น! ฟาร์มต่อได้จนกว่าจะมีชั้นใหม่':'🏆 ผ่านบอส! ด่าน '+state.stage+' • ได้ Rubies และตั๋ว!');
}
function failBoss(){
 const stage=state.stage;
 CORE.bossDefeated(state);
 log('💥 ยังไม่ชนะบอสด่าน '+stage+' · ฟาร์มอีก 3 เวฟแล้ว AUTO จะลองใหม่');
 beginTravel(1.1);save();
 toast('💪 แพ้บอสแต่ยังอยู่ด่าน '+stage+' · Auto ฟาร์ม Gold/EXP ต่อ!');
}
function defeatMonster(foe){
 if(!foe||!enemies.includes(foe))return;
 if(foe.boss){victoryBoss();return}
 const reward=CORE.farmReward(state.stage);
 state.gold+=reward.gold;state.heroExp+=reward.exp;
 state.kills=Math.min(CORE.killsNeeded(state.stage),state.kills+1);
 enemies=enemies.filter(x=>x!==foe);foe.node?.remove();
 combat=enemies[0]||null;
 if(!combat){
  // Only spawn a fresh group AFTER the entire wave is defeated.
  CORE.waveCleared(state);
  beginTravel(.95);save();
 }else{
  $('battleMessage').textContent='⚔️ เวฟ '+waveCount+' · เหลือ '+enemies.length+' ตัว';
  updateResources();
 }
}
function pickEnemy(f){return TFT.findTarget(f,enemies,stageClock)}
function targetHero(enemy){return TFT.findTarget(enemy,fighters,stageClock)}
// TFT-style shared damage pipeline. No damage is applied to ranged targets until the bullet lands.
function tftDamage(attacker,target,power,bonusCrit=0,forcedCrit=false,pierceShield=false,visual='hit'){
 if(!target||target.hp<=0||target.alive===false)return false;
 if(TFT.isImmortal(target,stageClock)){statusFx(target,'immune','อมตะ · 0');return false}
 const hero=combatHero(attacker)||{};
 const chance=Math.min(1,Math.max(0,(attacker.crit||0)+bonusCrit));
 const critical=forcedCrit||(chance>0&&Math.random()<chance);
 const raw=TFT.incomingDamage(power*TFT.bossDamageMultiplier(hero,target)*TFT.outgoingMultiplier(attacker,stageClock)*TFT.vulnerabilityMultiplier(target,stageClock)*(critical?(attacker.critDamage||hero.critDamage||1.5):1),combatHero(target));
 const {damage,absorbed}=TFT.resolveDamage(target,raw,pierceShield);
 position(target);
 if(damage>0){unitFx(target,(critical?'CRIT ':'')+'−'+fmt(damage),'damage',critical);if(visual)visualEffect(visual,attacker,target.x,target.y,critical?1.18:1)}
 if(absorbed>0){unitFx(target,'โล่ −'+fmt(absorbed),'shield',false);visualEffect('shield',target)}
 if(!damage&&!absorbed)statusFx(target,'zero','0');
 if(critical)ring(target.x,target.y);
 const bar=target.side==='enemy'?target.bar:target.hpbar;
 if(bar)bar.style.width=Math.max(0,target.hp/target.maxHp*100)+'%';
 if(target.hp===0){
  if(TFT.tryRevive(target,combatHero(target),stageClock,target.side==='ally'&&allyRevives.has(target.id))){
   if(target.side==='ally')allyRevives.set(target.id,{until:target.immortalUntil});
   if(bar)bar.style.width=target.hp/target.maxHp*100+'%';
   position(target);visualEffect('revive',target);unitFx(target,'คืนชีพ +'+fmt(target.hp),'heal');statusFx(target,'revive','อมตะ');
   if(!trialContext)log('✦ '+HEROES[target.id].name+' คืนชีพ!');return true;
  }
  target.alive=false;
  if(trialContext){if(target.node)target.node.style.opacity='.22'}
  else if(target.side==='enemy')defeatMonster(target);
  else if(target.node)target.node.style.opacity='.2';
 }
 return true;
}
function tftShot(attacker,target,mult=1,bonusCrit=0,execute=false,heavy=false,color){
 if(!target||target.hp<=0)return;
 if(shots.length>=MAX_ACTIVE_SHOTS){
  const h=combatHero(attacker);
  const executeMult=execute&&target.hp/target.maxHp<(h.executeThreshold||.35)?h.executeMultiplier||1.2:1;
  tftDamage(attacker,target,attacker.atk*mult*executeMult,bonusCrit);
  return;
 }
 const palette=color||HEROES[attacker.id].col||'#c3f7ff';
 let node=null;
 if(!beamEffect(attacker,target,heavy)){
  node=el('span',{class:'tft-bullet'+(heavy?' heavy':'')});
  node.style.setProperty('--bullet-color',palette);imageProjectile(node,attacker,heavy);
  const angle=Math.atan2((target.y-attacker.y)*arenaSize.height,(target.x-attacker.x)*arenaSize.width);
  setArenaPosition(node,attacker.x,attacker.y,angle+(Number(node.dataset.fxRotation)||0)*Math.PI/180);
  effectLayer().appendChild(node);
 }
 shots.push({
  owner:attacker,side:attacker.side,x:attacker.x,y:attacker.y,target,
  life:HEROES[attacker.id].globalRange?3.5:1.8,speed:HEROES[attacker.id].projectileSpeed||(HEROES[attacker.id].effect==='triple'?450:340),
  power:attacker.atk*mult,bonusCrit,execute,color:palette,node,visual:heavy?'skillHit':'hit'
 });
}
function tftPiercingShot(attacker,target){
 const hero=combatHero(attacker),p=TFT.makePierce(attacker,target);
 // The beam endpoints come from the same logical ray as the collision system.
 const end={x:(p.x+p.dx*p.limit)*100/TFT.W,y:(p.y+p.dy*p.limit)*100/TFT.H};
 let node=null;
 if(!beamEffect(attacker,end,true)){
  node=el('span',{class:'tft-bullet heavy piercing-bullet'});
  node.style.setProperty('--bullet-color',hero.col||'#82d0c7');
  node.style.setProperty('--shot-angle',Math.atan2(p.dy,p.dx)+'rad');
  imageProjectile(node,attacker,true);
  const angle=Math.atan2((end.y-attacker.y)*arenaSize.height,(end.x-attacker.x)*arenaSize.width);
  setArenaPosition(node,attacker.x,attacker.y,angle+(Number(node.dataset.fxRotation)||0)*Math.PI/180);
  effectLayer().appendChild(node);
 }
 shots.push({owner:attacker,side:attacker.side,x:attacker.x,y:attacker.y,pierce:p,
  speed:hero.projectileSpeed||950,radius:hero.pierceRadius||36,power:attacker.atk*(hero.skillPower||2.4),pierceShield:hero.pierceShield!==false,node});
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
  if(bullet.pierce){
   const targets=bullet.side==='ally'?enemies:fighters;
   const result=TFT.advancePierce(bullet,t,targets);
   for(const target of result.hits){
    if(!shots.includes(bullet))break;
    tftDamage(bullet.owner,target,bullet.power,0,false,bullet.pierceShield!==false,'skillHit');
    if(target.hp>0)ring(target.x,target.y);
   }
   if(result.expired){finished.add(bullet);bullet.node?.remove()}
   else if(bullet.node)positionShot(bullet);
   continue;
  }
  const r=TFT.advanceShot(bullet,t);
  if(r.expired){
   finished.add(bullet);bullet.node?.remove();
   if(r.hit){
    let mul=1;
    const h=combatHero(bullet.owner);
    if(bullet.execute&&bullet.target.hp/bullet.target.maxHp<(h.executeThreshold||.35))
     mul=h.executeMultiplier||1.2;
    tftDamage(bullet.owner,bullet.target,bullet.power*mul,bullet.bonusCrit,false,false,bullet.visual||'hit');
    if(bullet.target.hp>0)ring(bullet.target.x,bullet.target.y);
   }
  }else if(bullet.node){
   positionShot(bullet);
  }
 }
 shots=shots.filter(x=>!finished.has(x));
}
function showHealing(results,source){
 for(const {unit:u,healed} of results){
  if(healed<=0)continue;
  const bar=u.side==='enemy'?u.bar:u.hpbar;
  if(bar)bar.style.width=u.hp/u.maxHp*100+'%';
  unitFx(u,'+'+fmt(healed)+' HP','heal');visualEffect('heal',source||u,u.x,u.y);
  if(u.node){u.node.classList.remove('healing-pulse');const node=u.node;requestAnimationFrame(()=>{if(node.isConnected)node.classList.add('healing-pulse')})}
 }
}
function startExplosion(actor){
 const hero=combatHero(actor);
 if(!actor.alive||actor.hp<=0||actor.castUntil||actor.exhausted)return false;
 actor.castUntil=stageClock+hero.castSeconds;actor.walking=false;position(actor);
 visualEffect('cast',actor);unitFx(actor,'ร่าย EXPLOSION!','status');
 if(trialContext)trialContext.note='กำลังร่าย EXPLOSION!';return true;
}
function advanceExplosion(actor,auto=false){
 const hero=combatHero(actor);
 if(hero?.effect!=='explosion')return false;
 if(!actor.alive||actor.hp<=0){actor.castUntil=0;return true}
 if(actor.exhausted)return true;
 if(!actor.castUntil){const targets=actor.side==='ally'?enemies:fighters;if(auto&&targets.some(e=>e.hp>0&&e.alive!==false))startExplosion(actor);return !!auto}
 if(stageClock+1e-9<actor.castUntil){actor.walking=false;position(actor);return true}
 actor.castUntil=0;actor.exhausted=true;actor.walking=false;pose(actor,false);position(actor);
 visualEffect('aftermath',actor,50,50,2.4);visualEffect('area',actor,50,50,2.4);
 unitFx(actor,'EXPLOSION!','status');
 const foes=(actor.side==='ally'?enemies:fighters).filter(e=>e.hp>0&&e.alive!==false);
 for(const target of foes)tftDamage(actor,target,actor.atk*hero.skillPower,0,false,false,null);
 if(trialContext)trialContext.note='EXPLOSION! สำเร็จ · หมดแรงจนจบการต่อสู้';
 return true;
}
function tftSkill(attacker,target){
 const hero=combatHero(attacker),effect=hero.effect;
 const foes=()=>attacker.side==='ally'?enemies.filter(x=>x.hp>0):fighters.filter(x=>x.alive);
 switch(effect){
  case 'explosion':return startExplosion(attacker);
  case 'heal':{
   const allies=attacker.side==='ally'?fighters:enemies;
   const result=TFT.applySupport(allies,hero.support,stageClock);
   showHealing(result.healed,attacker);
   for(const u of result.units){position(u);visualEffect('buff',attacker,u.x,u.y,.85);unitFx(u,'ATK +'+Math.round(TFT.debuffValue(u,'attackUp',stageClock)*100)+'% · SPD +'+Math.round(TFT.debuffValue(u,'speedUp',stageClock)*100)+'%','buff')}
   ring(attacker.x,attacker.y);return true;
  }
  case 'pierce':
   tftPiercingShot(attacker,target);return true;
  case 'slam':{
   const nearby=foes().filter(x=>TFT.pxDist(x,target)<=(hero.slamRadius||140));
   visualEffect('area',attacker,target.x,target.y,1.3);
   for(const e of nearby){
    const landed=tftDamage(attacker,e,attacker.atk*(hero.skillPower||1.8),0,false,false,null);
    if(landed&&hero.debuff&&TFT.applyDebuff(e,hero.debuff,stageClock)){
     position(e);visualEffect('debuff',attacker,e.x,e.y,.75);unitFx(e,'ATK −'+Math.round(TFT.debuffValue(e,'attackDown',stageClock)*100)+'% · DMG +'+Math.round(TFT.debuffValue(e,'vulnerability',stageClock)*100)+'%','debuff');
    }
   }
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
   if(hero.guard){
    const allies=attacker.side==='ally'?fighters:enemies;
    const before=new Map(allies.map(u=>[u,u.shield||0]));
    for(const u of TFT.applyGuard(attacker,allies,hero,stageClock)){
     position(u);const gained=Math.round(u.shield-(before.get(u)||0));
     if(gained>0){visualEffect('shield',attacker,u.x,u.y);unitFx(u,'โล่ +'+fmt(gained),'shield')}
    }
    statusFx(attacker,'taunt','ยั่วยุ');
    return true;
   }
   const gain=Math.round(attacker.maxHp*.30);
   attacker.shield=(attacker.shield||0)+gain;
   visualEffect('shield',attacker);unitFx(attacker,'โล่ +'+fmt(gain),'shield');
   break;
  case 'blink':
   attacker.x=Math.max(5.5,Math.min(94.5,target.x+(Math.random()-.5)*5));
   attacker.y=Math.max(8,Math.min(92,target.y+(Math.random()-.5)*4));
   position(attacker);ring(attacker.x,attacker.y);
   break;
  case 'slash':break;
  case 'cloakshot':
   attacker.cloakUntil=stageClock+(hero.cloakDuration||2);
   attacker.ambush=true;
   visualEffect('cloak',attacker);
   statusFx(attacker,'cloak','พรางตัว');
   break;
 }
 return false;
}
// Avoid synchronous offsetWidth reads on every hit: that forced a full layout reflow.
function playAttackAnimation(attacker){
 const node=attacker.node;
 if(!node)return;
 const scene=trialContext;
 node.style.setProperty('--strike-duration',Math.max(90,260/(scene?1:state.speed))+'ms');
 node.classList.remove('burst');
 requestAnimationFrame(()=>{
  if(node.isConnected&&attacker.attackUntil>(scene?scene.clock:stageClock))node.classList.add('burst');
 });
}
function tftAttack(attacker,target){
 if(!target||target.hp<=0||attacker.exhausted||attacker.castUntil)return;
 const hero=combatHero(attacker),effect=hero.effect||'';
 const ambush=attacker.ambush&&attacker.cloakUntil<=stageClock;
 if(ambush)attacker.ambush=false;
 attacker.attacks++;
 const special=attacker.attacks%(hero.triggerEvery||4)===0;
 let mul=ambush?(hero.cloakShotMultiplier||1.7):1;
 if(special){
  if(effect!=='cloakshot')mul*=hero.skillPower||2;
  if(tftSkill(attacker,target)){
   attacker.attackUntil=stageClock+(hero.visual?.attackMs||360)/1000;
   pose(attacker,true);
   playAttackAnimation(attacker);
   return;
  }
 }
 if(!special&&hero.passive?.healOnAttack){
  const allies=attacker.side==='ally'?fighters:enemies;
  showHealing(TFT.healWeakest(allies,1,()=>attacker.atk*hero.passive.healOnAttack),attacker);
 }
 const bonusCrit=(ambush?(hero.cloakCritBonus||0):0)+TFT.focusCritBonus(attacker,target,hero);
 attacker.attackUntil=stageClock+(hero.visual?.attackMs||300)/1000;
 pose(attacker,true);
 playAttackAnimation(attacker);
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
  const extra=!special&&hero.cleave?TFT.cleaveTargets(target,attacker.side==='ally'?enemies:fighters,hero.cleave.radius):[];
  if(!special&&hero.cleave)visualEffect('cleave',attacker,target.x,target.y);
  tftDamage(attacker,target,attacker.atk*actual,bonusCrit,!!(special&&hero.skillGuaranteedCrit),false,special?'skillHit':'hit');
  for(const u of extra)tftDamage(attacker,u,attacker.atk*hero.cleave.power,0,false,false,null);
  if(special&&effect==='blink'&&target.hp>0)tftDamage(attacker,target,attacker.atk*.5);
 }
}
function enemyAttack(enemy,target){tftAttack(enemy,target)}
function heroAttack(hero,target){tftAttack(hero,target)}
function tick(dt){
 if(trial||!$('rewardModal').hidden||!$('skillModal').hidden||formationMode||boardGesture?.active||!state.autoBattle)return;
 const t=Math.max(0,Math.min(.08,dt))*state.speed;
 stageClock+=t;
 if(!combat){
  respawn-=t;
  if(respawn<=0){
   if(CORE.nextEncounter(state,HEROES)==='boss')spawnMonster(true);
   else spawnWave();
  }
  return;
 }
 if(combat.boss){
  combat.timeout-=t;
  if(combat.timeout<=0){failBoss();return}
 }
 for(const f of fighters){
  if(!f.alive)continue;
  if(advanceExplosion(f,true)){if(!combat)return;continue}
  f.remaining-=t;
  if(f.attackUntil<stageClock&&f.sprite!==HEROES[f.id].images.idle){
   pose(f,false);f.node.classList.remove('burst');
  }
  const target=pickEnemy(f);
  if(!target){f.walking=false;position(f);continue}
  const close=TFT.pursue(f,target,combatHero(f),t,'ally').inRange;
  position(f);
  if(close&&f.remaining<=0&&f.cloakUntil<=stageClock){
   heroAttack(f,target);
   f.remaining=Math.max(.06,f.remaining+TFT.attackInterval(f,f.cool,stageClock));
   if(!combat)return;
  }
 }
 for(const foe of enemies.slice()){
  if(foe.hp<=0)continue;
  if(advanceExplosion(foe,true)){if(!combat)return;continue}
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
    foe.remaining=Math.max(.06,foe.remaining+TFT.attackInterval(foe,foe.delay,stageClock));
   }
  }else{foe.walking=false;position(foe)}
  foe.bar.style.width=foe.hp/foe.maxHp*100+'%';
 }
 advanceTftShots(t);
 if(!combat)return;
 if(!fighters.some(f=>f.alive&&!f.exhausted)&&!shots.some(q=>q.side==='ally')){
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
 const dt=(now-lastFrame)/1000;
 if(trial){try{if(!trial.error)tickTrial(dt)}catch(error){console.error('Hero Trial:',error);recoverTrial(error)}}else if(!studioMode)tick(dt);lastFrame=now;
 if(now-lastHUD>340){updateResources();lastHUD=now}
 if(now-lastSave>6000){save()}
 requestAnimationFrame(frame);
}
// Trial shares the real attack/skill/shot code, but every mutable battle variable
// used by it is scoped to a disposable scene and restored synchronously.
function withTrial(fn){
 const scene=trial;if(!scene)return;
 const live={fighters,enemies,shots,stageClock,arenaSize,allyRevives};
 trialContext=scene;fighters=scene.fighters;enemies=scene.enemies;shots=scene.shots;
 stageClock=scene.clock;arenaSize=scene.size;allyRevives=scene.revives;
 try{return fn()}finally{
  scene.clock=stageClock;scene.shots=shots;
  ({fighters,enemies,shots,stageClock,arenaSize,allyRevives}=live);trialContext=null;
 }
}
function trialUnit(id,side,x,y,hp,maxHp,label,stars=1){
 const progress={level:1,stars},h=HEROES[id],st=h?CORE.stats(h,progress):{atk:100,cool:1,crit:0,critDamage:1};
 const actor={id,side,x,y,hp,maxHp,progress,atk:st.atk,cool:st.cool,crit:st.crit,critDamage:st.critDamage,alive:true,shield:0,attacks:0,attackUntil:0,cloakUntil:0,ambush:false,walking:false,label};
 const node=el('div',{class:'fighter '+(side==='enemy'?'enemy-unit trial-dummy':'party-fighter')});
 node.innerHTML='<span class="mini-stars">'+(side==='enemy'?'DUMMY':'Lv.1 '+'★'.repeat(stars))+'</span>'+
 (h?'<img src="'+h.images.idle+'" alt="">':'<div class="dummy-icon">◎</div>')+
 '<div class="mini-hp"><i></i></div><span class="fighter-name">'+escapeText(label||h.name)+'</span><span class="trial-values"></span>';
 $('trialUnits').appendChild(node);actor.node=node;actor.img=node.querySelector('img');actor.sprite=h?.images.idle;
 actor.hpbar=actor.bar=node.querySelector('.mini-hp i');actor.values=node.querySelector('.trial-values');
 return actor;
}
function resetTrial(){
 if($('trialModal').hidden)return;
 const id=$('trialHero').value,stars=Number($('trialStars').value)||1,h=CORE.heroAtStars(HEROES[id],stars),bossTrial=$('trialCount').value==='boss',count=bossTrial?1:Number($('trialCount').value),st=CORE.stats(HEROES[id],{level:1,stars}),arena=$('trialArena');
 $('trialUnits').replaceChildren();$('trialFx').replaceChildren();$('trialLog').replaceChildren();
 trial={id,clock:0,size:{width:arena.clientWidth,height:arena.clientHeight},fighters:[],enemies:[],shots:[],revives:new Map(),events:[],queue:[],active:null,nextAt:0,lastLog:'',note:'พร้อมทดลอง'};
 trial.hero=trialUnit(id,'ally',50,78,st.hp,st.hp,undefined,stars);
 trial.fighters.push(trial.hero);
 // Support targets start wounded; tanks can demonstrate ally shields.
 if(h.support||h.guard){
  for(const [other,x,ratio] of (h.support?.healTargets>=3?[['kirito',20,.33],['asuna',80,.55],['heathcliff',30,.65]]:[['kirito',22,.33],['asuna',78,.55]])){
   const max=CORE.stats(HEROES[other],{level:1,stars:1}).hp;
   trial.fighters.push(trialUnit(other,'ally',x,82,Math.round(max*(h.support?ratio:1)),max,HEROES[other].name));
  }
 }
 const cells=h.cleave?[[50,42],[50,27],[66,37],[25,25],[80,20]]:h.effect==='pierce'?[[50,42],[50,25],[50,10],[24,30],[76,30]]:[[50,38],[33,32],[67,32],[18,15],[82,15]];
 for(let i=0;i<count;i++){const [x,y]=cells[i];const dummy=trialUnit('__dummy','enemy',x,y,bossTrial?12000:3000,bossTrial?12000:3000,bossTrial?'👑 หุ่นบอส':'หุ่น '+(i+1));dummy.boss=bossTrial;trial.enemies.push(dummy)}
 $('trialSkillName').innerHTML=rarityBadge(h)+' '+escapeText(h.skill);
 $('trialStats').textContent='HP '+fmt(st.hp)+' · ATK '+fmt(st.atk)+' · '+(h.globalRange?'ทั่วสนาม':h.range+' ช่อง');
 $('trialPassive').disabled=!(h.passive||h.guard||h.effect==='cloakshot');
 $('trialPassive').textContent=h.effect==='explosion'?'ทดลองหมดแรง':h.passive?.reviveHp?'ทดสอบคืนชีพ':h.passive?.focusCritStep?'ทดสอบคริต่อเนื่อง':h.passive?.healOnAttack?'ทดสอบฮีลปกติ':h.guard?'ทดสอบยั่วยุ':h.effect==='cloakshot'?'ทดสอบซุ่มยิง':h.passive?.damageReduction?'ทดสอบลดดาเมจ':'ทดลองพาสซีฟ';
 withTrial(renderTrial);
}
function renderTrial(){
 for(const u of [...fighters,...enemies]){
  position(u);u.hpbar.style.width=u.hp/u.maxHp*100+'%';
  const value=fmt(u.hp)+' / '+fmt(u.maxHp)+(u.shield?' · โล่ '+fmt(u.shield):'');
  if(u.values.textContent!==value)u.values.textContent=value;
 }
 const scene=trialContext;
 const busy=!!scene.error||!!scene.hero.castUntil||!!scene.active||scene.queue.length>0||shots.length>0||stageClock<scene.nextAt;
 $('trialNormal').disabled=busy||!scene.hero.alive||!!scene.hero.exhausted;
 $('trialSkill').disabled=busy||!scene.hero.alive||!!scene.hero.exhausted;
 $('trialHit').disabled=busy||!scene.hero.alive||!!scene.hero.exhausted;
 const h=combatHero(scene.hero);
 $('trialPassive').disabled=busy||!scene.hero.alive||!!scene.hero.exhausted||!(h.passive||h.guard||h.effect==='cloakshot');
 $('trialNote').textContent=scene.note;
 const key=JSON.stringify(scene.events);
 if(scene.lastLog!==key){
  scene.lastLog=key;$('trialLog').innerHTML=scene.events.map(e=>'<div class="trial-event '+e.kind+'"><span>'+escapeText(e.name)+'</span><b>'+escapeText(e.label)+'</b></div>').join('');
 }
}
function queueTrial(mode){
 if(!trial||trial.hero.exhausted||trial.hero.castUntil||trial.error||trial.active||trial.queue.length||trial.shots.length||trial.clock<trial.nextAt)return;
 const h=combatHero(trial.hero);
 if(mode==='passive'){
  if(h.effect==='explosion')trial.queue=['skill'];
  else if(h.passive?.reviveHp)trial.queue=['lethal','hit'];
  else if(h.passive?.focusCritStep)trial.queue=Array(5).fill('normal');
  else if(h.guard)trial.queue=['skill','taunt'];
  else if(h.effect==='cloakshot')trial.queue=['skill','ambush'];
  else if(h.passive?.healOnAttack)trial.queue=['normal'];
  else trial.queue=['hit'];
 }else trial.queue=[mode];
 trial.note='กำลังทดลอง...';trial.deadline=trial.clock+12;
 withTrial(renderTrial);
}
function tickTrial(dt){
 withTrial(()=>{
  const scene=trialContext,actor=scene.hero,h=combatHero(actor),t=Math.max(0,Math.min(.08,dt));
  stageClock+=t;
  if(scene.deadline&&stageClock>scene.deadline&&(scene.active||scene.queue.length||shots.length)){
   scene.active=null;scene.queue=[];clearTftShots();scene.nextAt=stageClock;scene.deadline=0;
   scene.note='การทดลองใช้เวลานานเกินไป · กดลองใหม่หรือรีเซ็ตสนาม';actor.walking=false;renderTrial();return;
  }
  if(actor.attackUntil<=stageClock){pose(actor,false);actor.node.classList.remove('burst')}
  advanceTftShots(t);
  if(actor.castUntil){advanceExplosion(actor,false);renderTrial();return}
  if(!scene.active&&scene.queue.length&&stageClock>=scene.nextAt&&!shots.length)scene.active=scene.queue.shift();
  if(scene.active){
   const cmd=scene.active,target=enemies.find(u=>u.hp>0);
   if(['hit','lethal','taunt'].includes(cmd)){
    const dummy=target||enemies[0],victim=cmd==='taunt'?TFT.findTarget(dummy,fighters,stageClock):actor;
    if(victim&&victim.alive){
     if(cmd==='taunt')scene.note='AI เลือกเป้าหมาย: '+HEROES[victim.id].name;
     const power=cmd==='lethal'?Math.ceil((victim.hp+victim.shield+1)/(1-(combatHero(victim)?.passive?.damageReduction||0))):100;
     tftDamage(dummy,victim,power);
     if(cmd!=='taunt')scene.note=cmd==='lethal'?'ทดลองรับดาเมจจน HP เหลือ 0':'รับการโจมตีพื้นฐาน 100 หน่วย';
    }
    scene.active=null;scene.nextAt=stageClock+.55;
   }else if(!target||!actor.alive){
    scene.active=null;scene.queue=[];scene.note='รีเซ็ตสนามเพื่อทดลองใหม่';
   }else if(actor.cloakUntil<=stageClock){
    const close=TFT.pursue(actor,target,h,t,'ally').inRange;
    if(close){
     actor.walking=false;
     actor.attacks=cmd==='skill'?(h.triggerEvery||4)-1:0;
     tftAttack(actor,target);
     if(h.passive?.focusCritStep)scene.note='โอกาสคริติคอลปกติ '+Math.round((actor.crit+Math.min(h.passive.focusCritMax,(actor.focusHits||0)*h.passive.focusCritStep))*100)+'%';
     else scene.note=cmd==='skill'?'ใช้ '+h.skill:cmd==='ambush'?'โจมตีหลังหมดพรางตัว':'โจมตีปกติ';
     scene.active=null;scene.nextAt=stageClock+Math.max(.3,h.cool);
     if(h.effect==='cloakshot'&&cmd==='skill'&&scene.queue[0]==='ambush')scene.nextAt=Math.max(scene.nextAt,actor.cloakUntil);
    }
   }
  }
  renderTrial();
 });
}
function recoverTrial(error){
 if(!trial)return;
 trial.error=true;trial.active=null;trial.queue=[];trial.shots=[];trial.nextAt=trial.clock;trial.deadline=0;
 $('trialFx').replaceChildren();
 trial.note='เกิดข้อผิดพลาดในการทดลอง · กดรีเซ็ตสนามเพื่อเริ่มใหม่';
 $('trialNote').textContent=trial.note;
 for(const id of ['trialNormal','trialSkill','trialPassive','trialHit'])$(id).disabled=true;
}
function openTrial(id){
 if(!HEROES[id]||trial)return;
 trialReturnFocus=document.activeElement;
 $('trialHero').innerHTML=IDS.map(id=>'<option value="'+id+'">'+HEROES[id].rarity+' · '+escapeText(HEROES[id].name)+'</option>').join('');
 $('trialHero').value=id;$('trialStars').value='1';$('trialModal').hidden=false;resetTrial();$('trialClose').focus();
}
function closeTrial(){
 if($('trialModal').hidden)return;
 if(studioMode){resetTrial();return}
 trial=null;$('trialModal').hidden=true;$('trialUnits').replaceChildren();$('trialFx').replaceChildren();
 if(trialReturnFocus?.isConnected)trialReturnFocus.focus();trialReturnFocus=null;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-trial-hero]');if(b){e.preventDefault();openTrial(b.dataset.trialHero)}});
$('trialHero').addEventListener('change',resetTrial);$('trialCount').addEventListener('change',resetTrial);$('trialStars').addEventListener('change',resetTrial);
$('trialReset').addEventListener('click',resetTrial);$('trialClose').addEventListener('click',closeTrial);$('trialOverlay').addEventListener('click',closeTrial);
for(const [id,mode] of [['trialNormal','normal'],['trialSkill','skill'],['trialPassive','passive'],['trialHit','hit']])$(id).addEventListener('click',()=>queueTrial(mode));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('trialModal').hidden){e.preventDefault();e.stopImmediatePropagation();closeTrial()}});
if(typeof ResizeObserver==='function')new ResizeObserver(()=>{if(trial){trial.size={width:$('trialArena').clientWidth,height:$('trialArena').clientHeight};withTrial(()=>{renderTrial();for(const shot of shots)positionShot(shot)})}}).observe($('trialArena'));
function refreshUpgradePicker(){
 const picker=$('upgradePicker');if(!picker)return;
 picker.innerHTML=IDS.map(id=>'<option value="'+id+'"'+(id===selected?' selected':'')+'>'+HEROES[id].rarity+' · '+escapeText(HEROES[id].name)+(state.owned[id]?' · Lv.'+state.owned[id].level:' · ล็อก')+'</option>').join('');
}
function closeManagement(){
 if(!managementPanel)return;
 managementPanel.hidden=true;managementPanel=null;
 document.body.classList.remove('management-open');
 if(managementFocus?.isConnected)managementFocus.focus();managementFocus=null;
}
function openManagement(name,button){
 const next=$('panel-'+name);if(!next)return;
 if(managementPanel)managementPanel.hidden=true;
 managementPanel=next;managementFocus=button;
 if(name==='upgrade'){renderSelected();refreshUpgradePicker()}
 if(name==='summon'){renderSummonPool();if(!summonBusy)showSummonBanner();updateSummonWallet()}
 next.hidden=false;document.body.classList.add('management-open');
 next.querySelector('.panel-close').focus();
}
const picker=el('select',{id:'upgradePicker','aria-label':'เลือกฮีโร่ที่จะเสริมแกร่ง'});
$('heroDetails').before(picker);
picker.addEventListener('change',()=>{choose(picker.value);refreshUpgradePicker()});
document.querySelectorAll('[data-open-panel]').forEach(button=>button.addEventListener('click',()=>openManagement(button.dataset.openPanel,button)));
document.querySelectorAll('[data-close-panel]').forEach(button=>button.addEventListener('click',closeManagement));
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!trial&&managementPanel&&$('skillModal').hidden&&$('rewardModal').hidden){e.preventDefault();closeManagement()}
});
$('heroList').addEventListener('click',e=>{
 const info=e.target.closest('[data-skill-hero]');
 if(info){choose(info.dataset.skillHero);openSkill(info.dataset.skillHero);return}
 const hero=e.target.closest('[data-hero]');
 if(hero){const id=hero.dataset.hero;choose(id);if(state.owned[id]&&!state.squad.includes(id))addToSquad(id);}
});
$('teamSlots').addEventListener('click',e=>{
 const n=e.target.closest('[data-slot]');if(!n)return;
 if(n.dataset.slot==='empty'){
  if(state.owned[selected]&&!state.squad.includes(selected))toggleHero();
  else toast('แตะฮีโร่ในคลังเพื่อลงทีมอัตโนมัติ หรือใช้การลาก');
  return;
 }
 const target=n.dataset.slot;
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
 if(e.key==='Escape'&&!trial&&!$('skillModal').hidden){e.preventDefault();closeSkill()}
});
$('autoTeamBtn').addEventListener('click',autoTeam);
$('summonOneBtn').addEventListener('click',()=>summon(1));
$('summonTenBtn').addEventListener('click',()=>summon(10));
$('summonSkipBtn').addEventListener('click',showSummonOutcome);
$('summonBackBtn').addEventListener('click',showSummonBanner);
$('summonLastBtn').addEventListener('click',showSummonOutcome);
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
 if(!CORE.canChallengeStage(state,HEROES)||state.kills<CORE.killsNeeded(state.stage)||combat?.boss)return;
 state.bossRetryWaves=0;
 beginTravel(.2);spawnMonster(true);updateResources();save();
});
$('speedBtn').addEventListener('click',()=>{
 state.speed=state.speed===1?2:1;updateResources();save();
 toast('⏩ ความเร็วต่อสู้ ×'+state.speed);
});
// Direct mouse/touch drag from collection, team card or arena; pause only during drag.
$('boardGrid').addEventListener('click',e=>{
 const tile=e.target.closest('[data-col][data-row]');
 if(tile&&state.squad.includes(selected))moveHeroToCell(selected,Number(tile.dataset.col),Number(tile.dataset.row));
});
function dragSource(node){
 const ally=node.closest('#heroLayer [data-inspect-id]');
 if(ally)return {id:ally.dataset.inspectId,origin:'board'};
 const team=node.closest('#teamSlots [data-slot]');
 if(team&&team.dataset.slot!=='empty')return {id:team.dataset.slot,origin:'team'};
 const card=node.closest('#heroList [data-hero]');
 if(card)return {id:card.dataset.hero,origin:'collection'};
 return null;
}
function dropTarget(x,y){
 const node=document.elementFromPoint(x,y);
 if(!node)return null;
 if(node.closest('#benchDrop'))return {kind:'bench',node:$('benchDrop')};
 const team=node.closest('#teamSlots [data-slot]');
 if(team)return {kind:'team',id:team.dataset.slot,node:team};
 const ally=node.closest('#heroLayer [data-inspect-id]');
 if(ally){const id=ally.dataset.inspectId;return {kind:'cell',cell:state.placements[id],id,node:ally}}
 const grid=$('boardGrid').getBoundingClientRect();
 if(x>=grid.left&&x<grid.right&&y>=grid.top&&y<grid.bottom){
  const cell=cellAtClient(x,y);
  if(cell)return {kind:'cell',cell,id:heroAtCell(cell),node:$('boardGrid').querySelector('[data-col="'+cell.col+'"][data-row="'+cell.row+'"]')};
 }
 const card=node.closest('#heroList [data-hero]');
 if(card&&state.owned[card.dataset.hero])return {kind:'collection',id:card.dataset.hero,node:card};
 return null;
}
function applyDrop(drag,target){
 if(!target)return false;
 const id=drag.id,inTeam=state.squad.includes(id),other=target.id;
 if(other===id)return false;
 if(target.kind==='bench')return inTeam&&removeFromSquad(id);
 if(target.kind==='collection'){
  return inTeam&&drag.origin!=='collection'&&!state.squad.includes(other)&&swapSquadMember(id,other);
 }
 if(target.kind==='team'&&other==='empty')return !inTeam&&addToSquad(id);
 if(other&&state.squad.includes(other)){
  if(!inTeam)return swapSquadMember(other,id);
  const cell=state.placements[other];return !!cell&&moveHeroToCell(id,cell.col,cell.row);
 }
 if(target.kind==='cell'&&target.cell){
  return inTeam?moveHeroToCell(id,target.cell.col,target.cell.row):addToSquad(id,target.cell);
 }
 return false;
}
function highlightDrop(target){
 if(dropHighlight!==target?.node){
  dropHighlight?.classList.remove('drag-target');dropHighlight=target?.node||null;
  dropHighlight?.classList.add('drag-target');
 }
}
function finishDrag(e,cancel=false){
 const drag=boardGesture;
 if(!drag||e.pointerId!==drag.pointerId)return;
 if(drag.active){
  const target=cancel?null:dropTarget(e.clientX,e.clientY);
  ignoreInspectUntil=performance.now()+350;
  highlightDrop(null);dragGhost?.remove();dragGhost=null;
  document.body.classList.remove('hero-dragging');
  boardGesture=null;
  if(target)applyDrop(drag,target);
  refreshFormationControls();
 }else boardGesture=null;
}
document.addEventListener('pointerdown',e=>{
 if(boardGesture||!e.isPrimary||e.button!==0||e.target.closest('[data-skill-hero]'))return;
 const source=dragSource(e.target);
 if(source&&state.owned[source.id])boardGesture={...source,x:e.clientX,y:e.clientY,pointerId:e.pointerId,active:false};
});
window.addEventListener('pointermove',e=>{
 const drag=boardGesture;
 if(!drag||e.pointerId!==drag.pointerId)return;
 if(!drag.active){
  if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<8)return;
  drag.active=true;document.body.classList.add('hero-dragging');
  dragGhost=el('div',{class:'hero-drag-ghost','aria-hidden':'true'});
  dragGhost.innerHTML='<img src="'+HEROES[drag.id].images.idle+'" alt=""><span>'+escapeText(HEROES[drag.id].name)+'</span>';
  document.body.appendChild(dragGhost);refreshFormationControls();
 }
 e.preventDefault();dragGhost.style.left=e.clientX+'px';dragGhost.style.top=e.clientY+'px';
 highlightDrop(dropTarget(e.clientX,e.clientY));
},{passive:false});
window.addEventListener('pointerup',e=>finishDrag(e));
window.addEventListener('pointercancel',e=>finishDrag(e,true));
window.addEventListener('blur',()=>{if(boardGesture)finishDrag({pointerId:boardGesture.pointerId},true)});
document.addEventListener('dragstart',e=>{if(dragSource(e.target))e.preventDefault()});
document.addEventListener('click',e=>{
 if(performance.now()<ignoreInspectUntil&&(dragSource(e.target)||e.target.closest('#boardGrid,#teamSlots,#benchDrop'))){
  e.preventDefault();e.stopImmediatePropagation();
 }
},true);
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
refreshArenaSize();
if(typeof ResizeObserver==='function')new ResizeObserver(refreshArenaSize).observe($('stageViewport'));
else window.addEventListener('resize',refreshArenaSize);
if(VFX){VFX.preload(HEROES);VFX.loadPublished().then(()=>VFX.preload(HEROES))}
if(studioMode){document.body.classList.add('studio-trial-mode');openTrial(studioTrialId)}
// Decode sprites before their first attack so changing pose is not a network stall.
for(const hero of Object.values(HEROES))for(const url of new Set([hero.images.idle,hero.images.attack])){const img=new Image();img.src=url;img.decode?.().catch(()=>{});}
requestAnimationFrame(frame);
})();
