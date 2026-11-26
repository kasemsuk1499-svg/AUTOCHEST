/* AUTOCHEST IDLE v0.14 — autonomous stage combat and SAO progression. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const HEROES=window.AUTOCHEST_CHARACTERS?.HEROES;
const CORE=window.AUTOCHEST_IDLE_CORE;
const combatHero=actor=>actor?.side==='ally'?CORE.heroAtStars(HEROES[actor?.id],actor.progress?.stars||1):CORE.enemyHero(HEROES[actor?.id],actor?.stars||1,!!actor?.boss);
const TFT=window.AUTOCHEST_TFT_COMBAT;
const VFX=window.AUTOCHEST_VFX;
if(!TFT)throw Error('TFT combat module missing: src/idle-tft-combat.js');
if(!HEROES||!CORE)throw Error('Character and Idle Core modules must be loaded before idle-game.js');
const IDS=Object.keys(HEROES);
const rarityOrder=()=>[...IDS].sort((a,b)=>HEROES[b].cost-HEROES[a].cost);
const attackTypeLabel=h=>CORE.damageType(h)==='magic'?'MATK':'PATK';
const attackTypeName=h=>CORE.damageType(h)==='magic'?'เวทมนตร์':'กายภาพ';
const attackTypeMark=h=>'<span class="hero-damage-type '+CORE.damageType(h)+'" title="'+attackTypeName(h)+'">'+(CORE.damageType(h)==='magic'?'✦':'⚔')+'</span>';
const isTankHero=h=>h.team==='ป้องกัน'||!!h.guard;
const isSupportHero=h=>!!(h.support?.healHp||h.support?.reviveHp||h.support?.attackUp||h.support?.physicalAttackUp||h.support?.magicAttackUp||h.support?.speedUp||/SUPPORT|HEALER|REVIVER/i.test(h.role||''));
const roleMark=h=>isTankHero(h)?'<span class="hero-role-type tank" title="ป้องกัน" aria-label="ป้องกัน">⛨</span>':isSupportHero(h)?'<span class="hero-role-type support" title="ซัพพอร์ต" aria-label="ซัพพอร์ต">✚</span>':attackTypeMark(h);
const heroNameMarks=h=>'<span class="hero-type-marks">'+roleMark(h)+'</span><span class="hero-name-text">'+escapeText(h.name)+'</span>';
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
const run=()=>CORE.activeRun(state),night=()=>state.mode==='nightmare';
 const costumeAssets=new Map();
 const costumeKey=(id,c)=>id+'/'+c;
 const costumeImages=(id,c)=>costumeAssets.get(costumeKey(id,c));
 function heroImages(id,side='ally'){
  const c=state.costumes?.[id]?.equipped;
  return side==='ally'&&c&&CORE.ownsCostume(state,HEROES,id,c)&&costumeImages(id,c)||HEROES[id].images;
 }
 function probeCostumeImage(base){
  return new Promise(resolve=>{
   const tryImage=ext=>{const img=new Image();img.onload=()=>resolve(base+'.'+ext);img.onerror=()=>ext==='png'?tryImage('gif'):resolve(null);img.src=base+'.'+ext;};
   tryImage('png');
  });
 }
 function syncCostumeSprites(id){
  for(const actor of fighters)if(actor.id===id)pose(actor,actor.attackUntil>stageClock);
 }
 async function loadCostumeAssets(){
  await Promise.all(IDS.flatMap(id=>CORE.costumeDefs(HEROES,id).map(async def=>{
   const folder='./assets/heroes/'+id+'/costumes/'+def.id+'/';
   const [art,idle,attack]=await Promise.all(['art','idle','attack'].map(slot=>probeCostumeImage(folder+slot)));
   costumeAssets.set(costumeKey(id,def.id),art&&idle&&attack?{art,idle,attack}:null);
   syncCostumeSprites(id);
  })));
  renderPanels();
  if(skillView&&!$('skillModal').hidden&&skillView.source!=='enemy')openSkill(skillView.id,skillView.source,skillView.unit);
 }
 function costumeHtml(id){
  const defs=CORE.costumeDefs(HEROES,id);if(!defs.length)return '';
  const current=state.costumes?.[id]?.equipped||'',owned=!!state.owned[id];
  return '<section class="costume-section"><h3>👗 คอสตูม</h3><div class="costume-grid">'+
   [{id:'',name:'ชุดดั้งเดิม'},...defs].map(def=>{
    const images=def.id?costumeImages(id,def.id):HEROES[id].images;
    const has=owned&&(!def.id||CORE.ownsCostume(state,HEROES,id,def.id)),active=has&&current===def.id&&!!images;
    const status=!images?(costumeAssets.has(costumeKey(id,def.id))?'รอไฟล์รูป':'กำลังตรวจรูป'):!has?'🔒 ยังไม่ได้เป็นเจ้าของ':active?'✓ สวมใส่อยู่':def.id?'สวมใส่':'ถอดคอสตูม';
    return '<div class="costume-item'+(active?' active':'')+'">'+(images?'<img loading="lazy" src="'+escapeText(images.art)+'" alt="">':'<div class="costume-placeholder">👗</div>')+
     '<strong>'+escapeText(def.name||def.id)+'</strong><button type="button" class="control-btn" data-costume-hero="'+id+'" data-costume-id="'+escapeText(def.id)+'"'+(!images||!has||active?' disabled':'')+'>'+status+'</button></div>';
   }).join('')+'</div><small>เปลี่ยนรูปลักษณ์เท่านั้น · ไม่เปลี่ยนค่าสเตตัส</small></section>';
 }
 let skillView=null;
 function selectCostume(id,c){
  if(c&&!costumeImages(id,c)||!CORE.equipCostume(state,HEROES,id,c))return;
  syncCostumeSprites(id);save();renderPanels();
  if(skillView&&!$('skillModal').hidden)openSkill(skillView.id,skillView.source,skillView.unit);
  toast(c?'👗 สวมคอสตูมแล้ว':'👗 กลับชุดดั้งเดิมแล้ว');
 }

let dungeon=null,dungeonTierKey='';
const dungeonName=kind=>kind==='gold'?'ดันเจี้ยนทอง':'ดันเจี้ยน EXP';
const floorResetGift=!!loaded&&loaded.version===1&&Number(loaded.floorResetEvent||0)<CORE.FLOOR_RESET_EVENT;
let suppressSave=false;
if(loaded){
 const offlineStage=floorResetGift?Math.max(1,Number(loaded.stage)||1):CORE.battleStage(state);
 const newLoot=CORE.offlineLoot(Number(loaded.lastSaved)||Date.now(),Date.now(),offlineStage,state.offlineTicketMinutes,floorResetGift?'normal':state.mode);
 state.offlineTicketMinutes=newLoot.ticketRemainder;
 state.offlineBank.rubies+=newLoot.rubies;
 state.offlineBank.tickets+=newLoot.tickets;
 state.offlineBank.minutes+=newLoot.minutes;
 state.offlineBank.gold+=newLoot.gold;
 state.offlineBank.exp+=newLoot.exp;
}
let pending=state.offlineBank;
let selected=state.squad[0]||Object.keys(state.owned)[0]||IDS[0];
let skillReturnFocus=null,managementPanel=null,managementFocus=null;
let summonBusy=false,summonTimer=0,lastSummon=null;
let trial=null,trialContext=null,trialReturnFocus=null;
let formationMode=false,shots=[],fireTrails=[];
let allyRevives=new Map(),fallenEnemies=[];
let bossTime=0,combat=null,enemies=[],fighters=[],stageClock=0,respawn=1.8,waveCount=0,travel=0,travelDistance=0,encounters=0,lastFrame=0,lastSave=0,lastHUD=0,toastTimer=0;
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
const battleStage=()=>CORE.battleStage(state),farming=()=>CORE.farming(state);
let farmRecords={},farmRecordKey='',farmWave=null,farmElapsed=0,farmOptionKey='';
function farmSignature(){
 return JSON.stringify([state.mode,state.squad.map(id=>[id,state.owned[id]?.level,state.owned[id]?.stars,state.placements[id]])]);
}
function syncFarmRecords(){
 const key=farmSignature();if(key!==farmRecordKey){farmRecords={};farmRecordKey=key;}
}
function finishFarmWave(){
 if(!farmWave)return;
 const sample=farmWave;farmWave=null;syncFarmRecords();
 if(sample.key!==farmRecordKey)return;
 CORE.recordFarmWave(farmRecords,sample.stage,Math.max(.1,farmElapsed),sample.kills,state.mode);
 if(state.farmMode==='smart'){
  const next=CORE.smartFarmStage(state,farmRecords);
  if(next!==battleStage()){state.farmStages[state.mode]=next;log('✦ Smart Farm → ด่าน '+next);}
 }
}
function renderFarmControls(){
 const mode=$('farmMode'),stage=$('farmStage'),goal=$('farmGoal');if(!mode||!stage||!goal)return;
 syncFarmRecords();
 const max=CORE.farmMaxStage(state),key=state.mode+':'+max;
 if(key!==farmOptionKey){stage.replaceChildren(...Array.from({length:max},(_,i)=>new Option('ด่าน '+(i+1),String(i+1))));farmOptionKey=key;}
 mode.value=state.farmMode;stage.value=String(CORE.clampFarmStage(state,state.farmStages[state.mode]));goal.value=state.farmGoal;
 mode.disabled=!!dungeon;stage.disabled=!!dungeon||state.farmMode!=='manual';goal.disabled=!!dungeon||state.farmMode!=='smart';
 const s=battleStage(),r=farmRecords[s],rates=CORE.farmRates(r);
 if($('farmQuickSummary'))$('farmQuickSummary').textContent=dungeon?'ดันเจี้ยน · '+(dungeon.kind==='gold'?'Gold':'EXP'):state.farmMode==='smart'?'Smart Farm · ด่าน '+s:state.farmMode==='manual'?'ล็อกฟาร์ม · ด่าน '+s:'ดันด่าน · AUTO FARM';
 $('farmStatus').textContent=(farming()?'ฟาร์มด่าน '+s+' · ด่านหลัก '+run().stage+' · ไม่ท้าบอส':'ดันด่าน '+run().stage)+' · '+(state.farmMode==='smart'?'ประเมินจากเวฟจริง':'ไม่เสียค่าเข้า');
 $('farmRates').textContent=rates?'ต่อชั่วโมง (ประมาณจาก '+r.waves+' เวฟ): '+fmt(rates.gold)+' G · '+fmt(rates.exp)+' EXP · '+fmt(rates.rubies)+' 💎 · '+rates.tickets.toFixed(1)+' 🎟':'ยังไม่มีตัวอย่าง · รอจบเวฟแรก';
}
const enemyLimit=()=>CORE.waveSize(battleStage());
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
 const base=HEROES[foe.id],isRanged=TFT.isRanged(base);
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
 const image=heroImages(actor.id,actor.side)[attack?'attack':'idle'];
 if(actor.sprite!==image){actor.img.src=image;actor.sprite=image}
}
// Translate on the compositor instead of restarting a 280ms CSS transition each frame.
let arenaSize={width:0,height:0};
function refreshArenaSize(){
 const arena=$('stageViewport');
 arenaSize={width:arena.clientWidth,height:arena.clientHeight};
 for(const actor of [...fighters,...enemies])position(actor);
 for(const shot of shots)positionShot(shot);
 for(const f of fireTrails)positionFireTrail(f);
}
function setArenaPosition(node,x,y,angle=null){
 if(!node)return;
 const px=x*arenaSize.width/100,py=y*arenaSize.height/100;
 const transform='translate3d('+px.toFixed(2)+'px,'+py.toFixed(2)+'px,0) translate(-50%,-50%)'+(angle===null?'':' rotate('+angle+'rad)');
 if(node.style.transform!==transform)node.style.transform=transform;
}
function setShotVisualPosition(node,x,y,angle){
 if(!node)return;
 const offset=VFX?.visualOffset({offsetX:Number(node.dataset.fxOffsetX)||0,offsetY:Number(node.dataset.fxOffsetY)||0},arenaSize)||{x:0,y:0};
 setArenaPosition(node,x+offset.x*100/Math.max(1,arenaSize.width),y+offset.y*100/Math.max(1,arenaSize.height),angle+(Number(node.dataset.fxRotation)||0)*Math.PI/180);
}
function positionShot(shot){const angle=shot.pierce?Math.atan2(shot.pierce.dy*arenaSize.height/TFT.H,shot.pierce.dx*arenaSize.width/TFT.W):shot.target?Math.atan2((shot.target.y-shot.y)*arenaSize.height,(shot.target.x-shot.x)*arenaSize.width):null;setShotVisualPosition(shot.node,shot.x,shot.y,angle||0)}
function position(actor){
 if(!actor?.node)return;
 setArenaPosition(actor.node,actor.x,actor.y);
 actor.node.classList.toggle('walking',!!actor.walking&&actor.attackUntil<=stageClock);
 actor.node.classList.toggle('frozen',actor.hp>0&&TFT.isFrozen(actor,stageClock));
 actor.node.classList.toggle('explosion-casting',actor.hp>0&&!!actor.castUntil&&!actor.exhausted);
 actor.node.classList.toggle('explosion-exhausted',actor.hp>0&&!!actor.exhausted);
 actor.node.classList.toggle('cloaked',actor.cloakUntil>stageClock);
 actor.node.classList.toggle('immortal',TFT.isImmortal(actor,stageClock));
 actor.node.classList.toggle('guard-shield',actor.hp>0&&(actor.shield||0)>0);
 actor.node.classList.toggle('taunting',actor.hp>0&&(actor.tauntUntil||0)>stageClock);
 actor.node.classList.toggle('heal-down',actor.hp>0&&TFT.debuffValue(actor,'healDown',stageClock)>0);
 actor.node.classList.toggle('weakened',actor.hp>0&&TFT.debuffValue(actor,'attackDown',stageClock)>0);
 actor.node.classList.toggle('vulnerable',actor.hp>0&&TFT.debuffValue(actor,'vulnerability',stageClock)>0);
 actor.node.classList.toggle('support-buffed',actor.hp>0&&(TFT.attackBuff(actor,stageClock)>0||TFT.debuffValue(actor,'speedUp',stageClock)>0));
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
 if(studioMode||suppressSave){lastSave=performance.now();return}
 // Do not let an already open tab overwrite a newly rerolled account.
 const stored=safe(()=>JSON.parse(localStorage.getItem(CORE.KEY)),null);
 if(stored?.version===1&&(stored.accountEpoch||'')!==state.accountEpoch){
  suppressSave=true;location.reload();return;
 }
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
 const tags=CORE.teamSynergies(state,HEROES);return state.squad.map(id=>CORE.teamHeroStats(state,HEROES,id,state.owned[id],tags)).filter(Boolean);
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
 const theme=CORE.floorNumber(stage)-1,key=dungeon?'dungeon:'+dungeon.kind:state.mode+':'+theme;
 if(key===stageBackgroundTheme)return;
 stageBackgroundTheme=key;
 const arena=$('stageViewport'),src=dungeon?'./assets/backgrounds/dungeon-'+dungeon.kind+'.png':night()?'./assets/backgrounds/nightmare-floor-'+String(theme+1).padStart(2,'0')+'.png':STAGE_BACKGROUNDS[theme]||('./assets/backgrounds/floor-'+String(theme+1).padStart(2,'0')+'.png');
 arena.classList.toggle('nightmare-arena',!dungeon&&night());
 arena.classList.toggle('gold-dungeon',dungeon?.kind==='gold');arena.classList.toggle('exp-dungeon',dungeon?.kind==='exp');
 // Restore the existing CSS background while the next image is loading or absent.
 arena.style.removeProperty('background-image');
 arena.style.removeProperty('background-size');
 arena.style.removeProperty('background-position');
 arena.style.removeProperty('background-repeat');
 if(!src)return;
 const img=new Image();
 img.onload=()=>{
  if(stageBackgroundTheme!==key)return;
  arena.style.backgroundImage='url('+JSON.stringify(src)+')';
  arena.style.backgroundSize='cover';
  arena.style.backgroundPosition='center';
  arena.style.backgroundRepeat='no-repeat';
 };
 img.src=src;
}
function renderDungeonControls(){
 const type=$('dungeonType'),tier=$('dungeonTier');if(!type||!tier)return;
 const tiers=CORE.dungeonTiers(state,HEROES),key=tiers.map(t=>t.stage+':'+t.unlocked).join('|');
 if(key!==dungeonTierKey){
  const previous=Number(tier.value);tier.replaceChildren(...tiers.map(t=>{const o=new Option('ระดับ '+t.tier+' · '+(t.unlocked?'ผ่าน Normal '+t.stage:'🔒 ผ่าน Normal '+t.stage),String(t.stage));o.disabled=!t.unlocked;return o}));
  tier.value=String(tiers.find(t=>t.stage===previous&&t.unlocked)?.stage||tiers.filter(t=>t.unlocked).at(-1)?.stage||tiers[0]?.stage||5);
  dungeonTierKey=key;
 }
 const kind=type.value,stage=Number(tier.value);
 $('dungeonRemaining').textContent='💎 '+fmt(CORE.DUNGEON_ENTRY_COST)+' / รอบ';
 $('dungeonRepeat').checked=state.dungeonRepeat;
 $('dungeonReward').textContent='ชนะรับ '+fmt(CORE.dungeonReward(kind,stage))+' '+(kind==='gold'?'Gold':'EXP')+' · ค่าเข้า '+fmt(CORE.DUNGEON_ENTRY_COST)+' 💎'+(state.rubies<CORE.DUNGEON_ENTRY_COST?' · รูบี้ไม่พอ':'');
 $('enterDungeonBtn').disabled=!!dungeon||!CORE.canEnterDungeon(state,kind,stage,HEROES);
 type.disabled=tier.disabled=!!dungeon;
 $('dungeonReward').textContent=dungeon?'ชนะ '+dungeon.wins+' รอบ · รับสะสม '+fmt(dungeon.earned)+' '+(dungeon.kind==='gold'?'Gold':'EXP')+' · จ่าย '+fmt(dungeon.spent)+' 💎 · '+(state.dungeonRepeat?'AUTO REPEAT ON':'จบแล้วกลับด่านหลัก'):$('dungeonReward').textContent;
}
function updateResources(){
 $('goldValue').textContent=fmt(state.gold);
 $('expValue').textContent=fmt(state.heroExp);
 $('rubyValue').textContent=fmt(state.rubies);
 $('ticketValue').textContent=fmt(state.tickets);
 $('teamPower').textContent=fmt(CORE.power(state,HEROES));
 const p=run(),stage=battleStage(),bossCount=night()?CORE.nightmareBossCount(stage):1;
 $('stageName').textContent=(night()?'☾ NIGHTMARE · ':'')+CORE.stageName(stage);
 updateStageBackground(stage);
 $('stageNumber').textContent=fmt(stage)+' / '+fmt(CORE.maxStage(HEROES));
 if($('floorProgress'))$('floorProgress').textContent=(night()?'NM FLOOR ':'FLOOR ')+CORE.floorNumber(stage)+' / '+CORE.floorCount(HEROES);
 const floorBoss=HEROES[CORE.floorBossId(stage,HEROES)];
 if($('floorBossName'))$('floorBossName').textContent=floorBoss?'👑 '+floorBoss.name+' · '+'★'.repeat(CORE.bossStars(stage))+(night()?' · บอส '+bossCount+' ตัว':''):'ยังไม่มีบอสประจำชั้น';
 $('bestStage').textContent=String(p.stage).padStart(2,'0');
 $('normalModeBtn').textContent='NORMAL · '+state.stage;
 $('nightmareModeBtn').textContent=CORE.nightmareUnlocked(state)?'☾ NIGHTMARE · '+state.nightmare.stage:'🔒 NIGHTMARE · ผ่าน Normal 5';
 $('normalModeBtn').classList.toggle('selected',!dungeon&&!night());$('nightmareModeBtn').classList.toggle('selected',!dungeon&&night());
 $('nightmareModeBtn').disabled=!CORE.nightmareUnlocked(state);
 const need=CORE.killsNeeded(p.stage);
 $('killCounter').textContent=p.kills+' / '+need;
 $('killFill').style.width=Math.min(100,p.kills/need*100)+'%';
 $('teamCount').textContent=state.squad.length+' / '+CORE.maxSquad(state.stage);
 $('ownedCount').textContent=Object.keys(state.owned).length+' / '+IDS.length;
 $('autoBossBtn').textContent=state.autoBoss?'🔄 AUTO BOSS ON':'⏸ AUTO BOSS OFF';
 $('autoBossBtn').classList.toggle('selected',state.autoBoss);
 refreshFormationControls();
 const floorComplete=!CORE.canChallengeStage(p,HEROES);
 $('challengeBtn').disabled=floorComplete||!!combat?.boss||p.kills<need;
 $('challengeBtn').textContent=floorComplete?'🏆 ถึงขอบเขตชั้นปัจจุบัน · ฟาร์มต่อ':combat?.boss?'👑 บอสเหลือ '+enemies.length+' ตัว':p.kills<need?'👑 ปลดล็อกบอส '+p.kills+'/'+need:night()?'👑 ท้าบอส '+bossCount+' ตัว!':'👑 ท้าทาย '+(floorBoss?.name||'บอส')+'!';
 $('bossTimer').hidden=!combat?.boss;
 $('fightLabel').classList.toggle('boss-mode',!!combat?.boss);
 $('fightLabel').textContent=combat?.boss?'BOSS BATTLE':combat?'WAVE '+waveCount:'WAVE READY';
 if(combat?.boss){$('bossCountdown').textContent=Math.max(0,Math.ceil(bossTime))}
 const farm=CORE.farmReward(stage,state.mode);
 $('farmGain').textContent='+'+fmt(farm.gold)+' G / +'+fmt(farm.exp)+' EXP / +'+fmt(farm.rubies)+' 💎 · 🎟 '+state.farmTicketKills+'/'+CORE.ECONOMY.killsPerTicket;
 $('autoBossBtn').disabled=!!dungeon||farming();
  if(farming()&&!dungeon){$('autoBossBtn').textContent='🔒 AUTO BOSS OFF · FARM';$('autoBossBtn').classList.remove('selected');$('challengeBtn').disabled=true;$('challengeBtn').textContent='🪙 โหมดฟาร์ม · ไม่ท้าบอส';$('killCounter').textContent=p.kills+' / '+need+' · ด่านหลัก';}
 $('farmGainLabel').textContent=dungeon?'รางวัลเมื่อชนะ':'รางวัลต่อศัตรู';
 if(dungeon){
  $('stageName').textContent=dungeonName(dungeon.kind);
  $('stageNumber').textContent='ระดับ '+dungeon.tier;
  $('floorProgress').textContent='RESOURCE DUNGEON';
  $('floorBossName').textContent='👑 ผู้พิทักษ์ · ความยากแบบผ่อนปรน';
  $('bestStage').textContent=String(state.stage).padStart(2,'0');
  $('killCounter').textContent='0 / 1';
  $('killFill').style.width=Math.max(0,Math.min(100,(1-(combat?.hp||0)/Math.max(1,combat?.maxHp||1))*100))+'%';
  $('challengeBtn').disabled=false;$('challengeBtn').textContent='↩ ออกจากดันเจี้ยน';
  $('fightLabel').textContent='DUNGEON';
  $('farmGain').textContent='+'+fmt(CORE.dungeonReward(dungeon.kind,dungeon.stage))+' '+(dungeon.kind==='gold'?'Gold':'EXP');
 }
 renderDungeonControls();renderFarmControls();updateSummonWallet();
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
function synergyEffect(t){
 if(t.special)return t.special;
 return [['hp','HP'],['atk','ATK ทุกประเภท'],['physicalAtk','PATK'],['magicAtk','MATK'],['dotDamage','DMG ต่อเนื่อง'],['healPower','ฟื้นฟูทั้งทีม'],['antiHealPower','พลังลดฟื้นฟูทั้งทีม'],['speed','ความเร็วโจมตี'],['crit','CRIT']].filter(([k])=>t[k]).map(([k,label])=>label+' +'+Math.round(t[k]*100)+(k==='crit'?' จุด%':'%')).join(' · ');
}
function renderSynergies(){
 const box=$('teamSynergies');if(!box)return;
 const tags=CORE.teamSynergies(state,HEROES),active=tags.filter(t=>t.active);
 $('synergyCount').textContent=active.length+' แท็กทำงาน';
 box.innerHTML=tags.sort((a,b)=>Number(!!b.active)-Number(!!a.active)||b.members.length-a.members.length).map(t=>{
  const target=t.next?.count||t.active?.count||t.tiers[0].count;
  return '<div class="synergy-row '+(t.active?'synergy-active':'')+'"><div class="synergy-line"><strong>'+t.icon+' '+escapeText(t.name)+'</strong><b>'+t.members.length+'/'+target+(t.active?' ✓':'')+'</b></div>'+
   '<div class="synergy-effect">'+(t.active?escapeText(synergyEffect(t.active)):'ยังไม่ทำงาน')+'</div>'+
   '<div class="synergy-tier-line">'+t.tiers.map(x=>'<span class="'+(t.active?.count===x.count?'reached':'')+'">'+x.count+' ตัว · '+escapeText(synergyEffect(x))+'</span>').join('')+'</div>'+
   '<div class="synergy-members">'+t.available.map(id=>'<span class="'+(t.members.includes(id)?'deployed':'')+'" title="'+escapeText(HEROES[id].name)+'"><img loading="lazy" src="'+heroImages(id).art+'" alt="'+escapeText(HEROES[id].name)+'"></span>').join('')+'</div>'+
   (t.next?'<small>ขาดอีก '+(t.next.count-t.members.length)+' ตัวสำหรับขั้นถัดไป</small>':'<small>ครบขั้นสูงสุด</small>')+'</div>';
 }).join('');
}
function renderTeam(){
 renderSynergies();
 const magic=state.squad.filter(id=>CORE.damageType(HEROES[id])==='magic').length;
 $('teamDamageMix').innerHTML='<span class="physical">⚔ กายภาพ '+(state.squad.length-magic)+'</span><span class="magic">✦ เวท '+magic+'</span>';
 $('teamSlots').innerHTML=Array.from({length:CORE.maxSquad(state.stage)},(_,i)=>{
  const id=state.squad[i];
  if(!id)return '<button type="button" class="team-slot empty" data-slot="empty" aria-label="ช่องทีมว่าง">＋<small>ว่าง</small></button>';
  const t=HEROES[id],p=state.owned[id],ready=readyUpgrade(id);
  return '<button type="button" class="team-slot '+(selected===id?'active ':'')+
   (ready?'is-upgrade-ready ':'')+
   rarityClass(t)+
   '" data-slot="'+id+'" aria-label="เลือก '+escapeText(t.name)+' เลเวล '+p.level+' '+p.stars+' ดาว">'+
   '<span class="team-level">'+(CORE.isMaxHero(p)?'MAX':'Lv.'+p.level)+'</span>'+rarityBadge(t)+
   '<img loading="lazy" src="'+heroImages(id).idle+'" alt="">'+
   '<strong title="'+escapeText(t.name)+'">'+heroNameMarks(t)+'</strong>'+
   '<span class="team-stars" title="'+p.stars+' ดาว'+(p.stars>=CORE.MAX_STARS?' · MAX':'')+'">'+'★'.repeat(p.stars)+'</span>'+
   '<span class="team-ready" title="เสริมแกร่งได้แล้ว">⬆</span></button>';
 }).join('');
}
const heroPageSize=24;
let heroPage=0, favoritesOnly=false;
function filterHeroes(ids,prefix){
 const q=($('filterQuery'+prefix)?.value||'').trim().toLocaleLowerCase();
 const damageType=$('filterDamage'+prefix)?.value||'',tier=$('filterTier'+prefix)?.value||'',role=$('filterRole'+prefix)?.value||'',tag=$('filterTag'+prefix)?.value||'',status=$('filterStatus'+prefix)?.value||'',sort=$('filterSort'+prefix)?.value||'rarity';
 const tags=CORE.teamSynergies(state,HEROES);
 const memberTags=id=>tags.filter(t=>t.available.includes(id));
 const faction=id=>HEROES[id].faction||(id==='artoria'?'fate':['aqua','megumin'].includes(id)?'konosuba':['asuna','kirito','sinon','lisbeth','deathgun','heathcliff','silica'].includes(id)?'sao':'');
 return ids.filter(id=>{
  if(prefix==='Collection'&&favoritesOnly&&!state.favorites.includes(id))return false;
  const h=HEROES[id],p=state.owned[id],mt=memberTags(id);
  const hay=[id,h.name,h.subtitle,h.role,h.team,h.rarity,attackTypeLabel(h),attackTypeName(h),faction(id),h.faction==='celestial_beast'?'สัตว์สวรรค์':'',...(h.traits||[]),...mt.map(t=>t.name)].join(' ').toLocaleLowerCase();
  return (!q||q.split(/\s+/).every(x=>hay.includes(x)))&&(!damageType||CORE.damageType(h)===damageType)&&(!tier||h.rarity===tier)&&(!role||h.team===role)&&(!tag||faction(id)===tag||mt.some(t=>t.id===tag))&&(!status||(status==='owned'&&p)||(status==='locked'&&!p)||(status==='ready'&&readyUpgrade(id))||(status==='max'&&CORE.isMaxHero(p))||(status==='unfinished'&&p&&!CORE.isMaxHero(p))||(status==='team'&&state.squad.includes(id)));
 }).sort((a,b)=>{
  const pa=state.owned[a],pb=state.owned[b];
  if(prefix==='Collection'||prefix==='Upgrade'){const fav=Number(state.favorites.includes(b))-Number(state.favorites.includes(a));if(fav)return fav;}
  if(sort==='name')return HEROES[a].name.localeCompare(HEROES[b].name,'th');
  if(sort==='level')return (pb?.level||0)-(pa?.level||0)||HEROES[b].cost-HEROES[a].cost;
  if(sort==='stars')return (pb?.stars||0)-(pa?.stars||0)||HEROES[b].cost-HEROES[a].cost;
  if(sort==='ready')return Number(readyUpgrade(b))-Number(readyUpgrade(a))||HEROES[b].cost-HEROES[a].cost;
  return HEROES[b].cost-HEROES[a].cost;
 });
}
function createHeroFilters(prefix,host,mode,refresh){
 const tags=CORE.teamSynergies(state,HEROES),tagOptions=new Map([['sao','Sword Art Online'],['konosuba','KonoSuba'],['fate','Fate'],['celestial_beast','🦊 สัตว์สวรรค์']]);
 for(const t of tags)if(!tagOptions.has(t.id))tagOptions.set(t.id,t.name);
 for(const h of Object.values(HEROES))if(h.faction&&!tagOptions.has(h.faction))tagOptions.set(h.faction,h.faction);
 const opt=(items)=>items.map(([v,n])=>'<option value="'+escapeText(v)+'">'+escapeText(n)+'</option>').join('');
 const select=(id,label,items)=>'<select id="'+id+prefix+'" aria-label="'+label+'">'+opt(items)+'</select>';
 const root=el('div',{class:'hero-filter-bar'});
 root.innerHTML='<div class="hero-search-line"><input type="search" id="filterQuery'+prefix+'" placeholder="🔎 ค้นหาชื่อ / ID / แท็ก" aria-label="ค้นหาฮีโร่"><button type="button" class="filter-clear">ล้าง</button></div><div class="hero-filter-grid">'+
  select('filterTier','ระดับ',[['','ทุกเทียร์'],...['UR','SSR','SR','R'].map(x=>[x,x])])+
  select('filterDamage','ประเภทพลังโจมตี',[['','ทุกประเภท ATK'],['physical','⚔ กายภาพ'],['magic','✦ เวทมนตร์']])+
  select('filterRole','อาชีพ',[['','ทุกอาชีพ'],...['นักรบ','เวท','ยิงไกล','ป้องกัน'].map(x=>[x,x])])+
  select('filterTag','แท็ก',[['','ทุกแท็ก'],...tagOptions])+
  (mode==='collection'?select('filterStatus','สถานะ',[['','ทุกสถานะ'],['owned','มีแล้ว'],['locked','ยังไม่มี'],['ready','พร้อมอัป'],['unfinished','ยังไม่ MAX'],['max','MAX'],['team','ในทีม']]):'')+
  select('filterSort','เรียงลำดับ',[['rarity','เทียร์สูงก่อน'],['name','ชื่อ A–Z / ก–ฮ'],['level','เลเวลสูงก่อน'],['stars','ดาวสูงก่อน'],['ready','พร้อมอัปก่อน']])+
  '</div><small id="filterCount'+prefix+'" class="hero-filter-count"></small>';
 host.before(root);
 root.addEventListener('input',e=>{if(e.target.matches('input,select'))refresh()});
 root.querySelector('.filter-clear').addEventListener('click',()=>{root.querySelector('input').value='';for(const n of root.querySelectorAll('select'))n.selectedIndex=0;refresh()});
}
function renderHeroes(){
 const ids=filterHeroes(IDS,'Collection'),pages=Math.max(1,Math.ceil(ids.length/heroPageSize));
 const favBtn=$('heroFavoritesToggle');if(favBtn){favBtn.setAttribute('aria-pressed',String(favoritesOnly));favBtn.textContent='★ ตัวโปรด ('+state.favorites.length+')';}
 heroPage=Math.min(heroPage,pages-1);
 if($('filterCountCollection'))$('filterCountCollection').textContent='พบ '+ids.length+' / '+IDS.length+' ตัว';
 const nav=$('heroPageNav');if(nav){nav.hidden=pages<=1;$('heroPageLabel').textContent=(heroPage+1)+' / '+pages;$('heroPrevPage').disabled=heroPage===0;$('heroNextPage').disabled=heroPage>=pages-1;}
 $('heroList').innerHTML=ids.slice(heroPage*heroPageSize,(heroPage+1)*heroPageSize).map(id=>{
  const t=HEROES[id],p=state.owned[id],ready=readyUpgrade(id);
  return '<div class="hero-entry"><button type="button" class="hero-card '+(!p?'locked ':'')+
   (selected===id?'active ':'')+(ready?'is-upgrade-ready ':'')+rarityClass(t)+'" data-hero="'+id+'">'+rarityBadge(t)+
   '<img loading="lazy" src="'+heroImages(id).art+'" alt="">'+
   '<strong>'+heroNameMarks(t)+'</strong>'+
   '<span class="collection-level">'+(p?(CORE.isMaxHero(p)?'✓ MAX':'LEVEL '+p.level+(p.level>=CORE.MAX_LEVEL?' MAX':'')):'🔒 ไม่ได้ปลดล็อก')+'</span>'+
   '<span class="collection-stars">'+(p?'★'.repeat(p.stars)+'☆'.repeat(CORE.MAX_STARS-p.stars)+(p.stars>=CORE.MAX_STARS?' MAX':''):'☆☆☆☆☆')+'</span>'+
   '<span class="collection-ready" title="เสริมแกร่งได้">⬆ อัปได้</span></button>'+
   '<button type="button" class="hero-info-btn" data-skill-hero="'+id+'" aria-label="ดูสกิล '+escapeText(t.name)+'">ⓘ</button>'+
   '<button type="button" class="hero-favorite-btn '+(state.favorites.includes(id)?'is-favorite':'')+'" data-favorite-hero="'+id+'" aria-pressed="'+state.favorites.includes(id)+'" title="'+(state.favorites.includes(id)?'นำออกจากตัวโปรด':'ตั้งเป็นตัวโปรด')+'" aria-label="ตัวโปรด '+escapeText(t.name)+'">'+(state.favorites.includes(id)?'★':'☆')+'</button></div>';
 }).join('')||'<p class="hero-filter-empty">ไม่พบฮีโร่ที่ตรงกับตัวกรอง</p>';
}
function renderSelected(){
 const id=selected,hero=HEROES[id],p=state.owned[id],box=$('heroDetails');
 if(!hero){box.textContent='แตะฮีโร่ในทีมเพื่อดูข้อมูล';return}
 if(!p){
  box.innerHTML='<div class="upgrade-hero-header"><img src="'+heroImages(id).art+'" alt=""><div>'+
   '<h4>'+escapeText(hero.name)+' '+rarityBadge(hero)+'</h4><span class="upgrade-lock">🔒 ยังไม่ได้อัญเชิญ</span>'+
   '<p>'+escapeText(hero.subtitle||'')+'</p></div></div>'+
   '<div class="upgrade-empty">ปลดล็อกโดยอัญเชิญฮีโร่จากกาชาด้านล่าง เพื่อเริ่มอัปเลเวลและดาว</div>'+
   starUpgradeHtml(hero,1)+'<button type="button" id="openSkillBtn" class="inspect-skill-btn">ⓘ ดูสกิลฮีโร่คนนี้</button>';
  return;
 }
 const tags=CORE.teamSynergies(state,HEROES),stats=CORE.teamHeroStats(state,HEROES,id,p,tags),nextLv=p.level<CORE.MAX_LEVEL?
  CORE.teamHeroStats(state,HEROES,id,{level:p.level+1,stars:p.stars},tags):stats;
 const nextStar=p.stars<CORE.MAX_STARS?
  CORE.teamHeroStats(state,HEROES,id,{level:p.level,stars:p.stars+1},tags):stats;
 const activeTags=tags.filter(t=>t.active&&t.members.includes(id));
 const atMax=p.level>=CORE.MAX_LEVEL,atStarMax=p.stars>=CORE.MAX_STARS;
 const cost=CORE.levelCost(p.level),starNeed=CORE.shardsNeeded(p.stars),starGold=CORE.ascendCost(p.stars);
 const lvGood=canLevel(id),starGood=canStar(id),batch=levelBatch(id,5);
 const inTeam=state.squad.includes(id),full=state.squad.length>=CORE.maxSquad(state.stage);
 const lvPct=Math.round((p.level-1)/(CORE.MAX_LEVEL-1)*100);
 const starPct=atStarMax?100:Math.min(100,Math.round(p.shards/starNeed*100));
 const shardMissing=Math.max(0,starNeed-p.shards);
 box.innerHTML='<div class="upgrade-hero-header"><img src="'+heroImages(id).art+'" alt=""><div class="upgrade-identity">'+
  '<span class="upgrade-kicker">HERO PROGRESSION</span><h4>'+escapeText(hero.name)+' '+rarityBadge(hero)+'</h4>'+
  '<p>'+escapeText(hero.team)+' · '+attackTypeName(hero)+' · '+escapeText(hero.skill)+'</p>'+
  '<div class="upgrade-badges"><span>Lv.'+p.level+' / '+CORE.MAX_LEVEL+'</span>'+
  '<span class="gold-stars">'+'★'.repeat(p.stars)+'☆'.repeat(CORE.MAX_STARS-p.stars)+'</span>'+
  (inTeam?'<span class="equipped-tag">⚔️ ในทีม</span>':'<span class="reserve-tag">สำรอง</span>')+'</div>'+
  '</div></div>'+
  (activeTags.length?'<div class="hero-synergy-note">✦ โบนัสแท็ก: '+activeTags.map(t=>escapeText(t.name+' ('+synergyEffect(t.active)+')')).join(' · ')+'</div>':'')+
  '<div class="detail-stats upgrade-stat-row"><div><small>❤️ HP</small><strong>'+fmt(stats.hp)+'</strong></div>'+
  '<div><small>'+attackTypeLabel(hero)+'</small><strong>'+fmt(stats.atk)+'</strong></div>'+
  '<div><small>🎯 CRIT</small><strong>'+Math.round(stats.crit*100)+'%</strong></div></div>'+
  (atMax?'<div class="upgrade-max-notice">✓ LEVEL MAX · Lv.'+CORE.MAX_LEVEL+'</div>':'<section class="upgrade-step">'+
   '<div class="upgrade-step-heading"><div><span class="step-num">1</span><strong>เพิ่มเลเวล</strong></div>'+
   '<span class="upgrade-current">Lv.'+p.level+' / '+CORE.MAX_LEVEL+'</span></div>'+
   '<div class="upgrade-progress"><i style="width:'+lvPct+'%"></i></div>'+
   '<p class="upgrade-benefit">'+(atMax?'🏅 เลเวลสูงสุดแล้ว':
     'เลเวลถัดไป: HP <b>+'+fmt(nextLv.hp-stats.hp)+'</b> · '+attackTypeLabel(hero)+' <b>+'+fmt(nextLv.atk-stats.atk)+'</b>')+'</p>'+
   (atMax?'<div class="upgrade-max-notice">✅ เลเวลสูงสุดแล้ว</div>':
   '<div class="upgrade-materials"><span id="levelGoldStatus" class="'+(state.gold>=cost.gold?'enough':'missing')+'">🪙 Gold '+fmt(state.gold)+' / '+fmt(cost.gold)+'</span>'+
   '<span id="levelExpStatus" class="'+(state.heroExp>=cost.exp?'enough':'missing')+'">🔹 EXP '+fmt(state.heroExp)+' / '+fmt(cost.exp)+'</span></div>'+
   '<p id="levelResourceHint" class="upgrade-hint">'+(lvGood?'✅ วัตถุดิบครบ เพิ่มเลเวลได้เลย':
     'ต้องการ '+neededMaterials(cost.gold,state.gold,'Gold')+' และ '+neededMaterials(cost.exp,state.heroExp,'EXP'))+'</p>')+
   '<div class="upgrade-action-row"><button type="button" id="levelHeroBtn" class="upgrade-primary"'+(!lvGood?' disabled':'')+'>'+
   (atMax?'LEVEL MAX':'⬆ อัปเลเวล +1')+'</button>'+
   '<button type="button" id="levelFiveBtn" class="upgrade-secondary"'+(!batch.count?' disabled':'')+'>'+
   (atMax?'MAX':'อัปต่อเนื่อง ×'+batch.count+'/5')+'</button></div>'+
  '</section>')+
  (atStarMax?'<div class="upgrade-max-notice">✓ STAR MAX · ★★★★★</div>':'<section class="upgrade-step star-step">'+
   '<div class="upgrade-step-heading"><div><span class="step-num">2</span><strong>เพิ่มดาวฮีโร่</strong></div>'+
   '<span class="upgrade-current gold-stars">'+'★'.repeat(p.stars)+'☆'.repeat(CORE.MAX_STARS-p.stars)+'</span></div>'+
   '<div class="upgrade-progress star-progress"><i style="width:'+starPct+'%"></i></div>'+
   '<p class="upgrade-benefit">'+(atStarMax?'🌟 ดาวสูงสุดแล้ว':
     'ดาวถัดไป: HP <b>+'+fmt(nextStar.hp-stats.hp)+'</b> · '+attackTypeLabel(hero)+' <b>+'+fmt(nextStar.atk-stats.atk)+'</b>')+'</p>'+
   starUpgradeHtml(hero,p.stars)+
   (atStarMax?'<div class="upgrade-max-notice">✅ ครบ 5 ดาวแล้ว</div>':
    '<div class="upgrade-materials"><span id="starShardStatus" class="'+(p.shards>=starNeed?'enough':'missing')+'">🧩 ชิ้นส่วน '+fmt(p.shards)+' / '+fmt(starNeed)+'</span>'+
    '<span id="starGoldStatus" class="'+(state.gold>=starGold?'enough':'missing')+'">🪙 Gold '+fmt(state.gold)+' / '+fmt(starGold)+'</span></div>'+
    '<p id="rankResourceHint" class="upgrade-hint">'+(starGood?'✅ ชิ้นส่วนครบ เพิ่มดาวได้เลย':
     shardMissing?'ยังขาดชิ้นส่วน '+shardMissing+' ชิ้น — อัญเชิญตัวซ้ำเพื่อสะสม':'ขาด Gold '+fmt(Math.max(0,starGold-state.gold)))+'</p>')+
   '<button type="button" id="rankHeroBtn" class="star-upgrade-button"'+(!starGood?' disabled':'')+'>'+
   (atStarMax?'★ ดาวสูงสุด':'⭐ เพิ่มเป็น '+(p.stars+1)+' ดาว')+'</button>'+
  '</section>')+
  '<div class="upgrade-footer-actions"><button type="button" id="deployHeroBtn" class="deploy-action"'+'>'+
   (inTeam?'↩ ถอนเข้าตัวสำรอง':full?'↔️ ลากทับฮีโร่ในทีม':'⚔️ เพิ่มเข้าทีม')+'</button>'+
   '<button type="button" id="openSkillBtn" class="inspect-skill-btn">ⓘ ดูสกิลทั้งหมด</button></div>'+costumeHtml(id);
}
function starPerkLabel(step){
 let label=step.label;
 if(step.patch?.triggerEvery)label=label.replace(/ทุก\s*\d+\s*ครั้ง/g,'ทุก '+CORE.skillAttackCount(step.patch)+' ครั้ง');
 if(step.patch?.castSeconds)label=label.replace(/ร่าย(เวท)?\s*[\d.]+\s*วินาที/g,(_,v)=>'ร่าย'+(v||'')+' '+CORE.explosionCastSeconds(step.patch)+' วินาที');
 if(step.patch?.passive?.explosionRestSeconds)label=label.replace(/พัก\s*[\d.]+\s*วินาที/g,'พัก '+CORE.explosionRestSeconds(step.patch.passive.explosionRestSeconds)+' วินาที');
 return label;
}
function starUpgradeHtml(hero,stars=1){
 if(!hero.starUpgrades?.length)return '';
 return '<div class="star-perks"><strong>✦ STAR AWAKENING · โบนัสสะสม</strong>'+hero.starUpgrades.map(step=>'<div class="star-perk '+(stars>=step.star?'unlocked':'locked-perk')+'"><b>'+step.star+'★</b><span>'+escapeText(starPerkLabel(step))+'</span><small>'+(stars>=step.star?'✓':'🔒')+'</small></div>').join('')+'</div>';
}
function skillDescription(t,enemy=false){
 const n=CORE.skillAttackCount(t),lines=['โจมตีปกติ 100% ATK เมื่อเป้าหมายอยู่ในระยะ TFT จริง • มีโอกาสคริติคอล'];
 switch(t.effect){
  case 'explosion':
   lines[0]='เริ่มร่ายเวทเมื่อเข้าสู่การต่อสู้โดยอัตโนมัติ';
   lines.push('ร่าย '+CORE.explosionCastSeconds(t)+' วินาที · ระเบิดศัตรูทั้งหมด '+Math.round(t.skillPower*100)+'% ATK · ร่ายไม่สำเร็จหากตายก่อนครบเวลา');
   lines.push('พาสซีฟ — '+t.passive.name+': หลังระเบิดหมดแรง ไม่โจมตีหรือเดินอีกจนจบเวฟ/บอส แต่ยังถูกโจมตีได้');
   lines.push('แท็กพิเศษ KonoSuba: เมื่อคาซึมะและอควาฝั่งเดียวกันยังมีชีวิต จะพัก 4 วินาที (3.5 วินาทีเมื่อคาซึมะ 5★) แล้วร่าย Explosion ซ้ำได้ไม่จำกัดครั้ง · หากสมาชิกตายระหว่างร่ายซ้ำจะหยุดร่าย');
   break;
  case 'dot':
   lines.push('ทุก '+n+' การโจมตี: โจมตีศัตรูสูงสุด '+t.passive.dotTargets+' ตัว ตัวละ '+Math.round(t.skillPower*100)+'% ATK และติดคำสาป '+Math.round(t.passive.dotPower*100)+'% ATK ทุก 1 วินาที นาน '+t.passive.dotTicks+' วินาที · DOT ไม่คริติคอล · '+(t.passive.dotStack?'คำสาปซ้อนทับได้ แต่ละชั้นนับเวลาและแช่แข็งเมื่อครบแยกกัน':'คำสาปจากผู้ร่ายเดิมอัปเดตพลังโดยไม่ซ้อนหรือรีเซ็ตจำนวนครั้ง')+' · ทำงานจนครบแม้ผู้ร่ายตาย (ภายในเวฟเดิม)');
   if(t.passive.dotPierceShield)lines.push('DOT ทะลุโล่โดยตรง แต่ไม่ทะลุอมตะ');
   if(t.passive.dotFreezeSeconds)lines.push('เมื่อ DOT ครั้งสุดท้ายโดนเป้าหมายที่ยังมีชีวิต: แช่แข็ง '+t.passive.dotFreezeSeconds+' วินาที หยุดเดิน โจมตี และพักเวลาร่ายสกิล · ไม่ทะลุอมตะ');
   break;
  case 'slash':
   lines.push('ทุก '+n+' การโจมตี: โจมตีเป้าหมายเดียว '+Math.round((t.skillPower||2)*100)+'% ATK'+(t.skillGuaranteedCrit?' · ติดคริติคอลแน่นอน':' พร้อมเอฟเฟกต์วงพลัง'));
   break;
  case 'blink':
   lines.push('ทุก '+n+' การโจมตี: เคลื่อนฉับไวเข้าหาเป้าหมาย ฟัน 200% ATK และตามด้วยโจมตีอีก 50% ATK');
   break;
  case 'firetrail':
    lines.push('ทุก '+n+' การโจมตี: ปล่อยนกเพลิงบินตรงจนสุดขอบสนาม ทำดาเมจ '+Math.round(t.skillPower*100)+'% MATK ครั้งเดียวต่อศัตรูที่บินผ่าน · โล่ป้องกันได้');
    lines.push('ทิ้งทางไฟกว้าง '+t.fireTrail.widthCells+' ช่อง: เผาศัตรูที่ยืนบนไฟทุก 1 วินาที '+(t.fireTrail.hpRate*100).toFixed(1)+'% ของ HP สูงสุดต่อทางไฟ · ไม่คริติคอล · โล่และอมตะป้องกันได้ · มีผลกับบอส');
    lines.push('ไฟแต่ละช่วงอยู่ '+t.fireTrail.duration+' วินาทีหลังนกบินผ่าน แล้วค่อยจางจากต้นทางไปปลายทาง · ทางไฟต่างครั้งซ้อนดาเมจได้ · นกและทางไฟอยู่ต่อแม้ผู้ร่ายตายจนจบอายุหรือจบเวฟ');
    break;
   case 'pierce':
    lines.push('ทุก '+n+' การโจมตี: '+(t.range<1.8?'ฟันปล่อยลำแสงศักดิ์สิทธิ์':'ยิงทะลวง')+'เป็นเส้นตรงจนถึงขอบสนาม ทำดาเมจ '+Math.round((t.skillPower||2.4)*100)+'% ATK ต่อศัตรูทุกตัวในแนว (โดนครั้งเดียวต่อตัว) · '+(t.pierceShield===false?'โล่ป้องกันได้':'ไม่สนโล่ป้องกัน')+' · ไม่ทะลุอมตะ');
   break;
  case 'triple':
   lines.push('ทุก '+n+' การโจมตี: ยิงกระสุนหลักแรง 200% ATK และกระสุนรองอีก 2 นัด นัดละ 85% ATK (เลือกเป้าหมายอื่นได้)');
   break;
  case 'heal':
   lines.push('ทุก '+n+' การโจมตี: ฟื้น HP ให้สมาชิกที่มีเปอร์เซ็นต์ HP ต่ำสุด '+t.support.healTargets+' คน คนละ '+Math.round(t.support.healHp*100)+'% ของ HP สูงสุด'+(t.support.reviveHp?'':' · ไม่ชุบชีวิต'));
   if(t.support.reviveHp)lines.push('ชุบชีวิตเพื่อนที่ตาย 1 คน (HP สูงสุดมากที่สุดก่อน) ด้วย HP '+Math.round(t.support.reviveHp*100)+'% และอมตะ '+t.support.reviveImmortalSeconds+' วินาที · '+t.support.reviveLimit+' ครั้งต่อเวฟหรือบอสต่อผู้ร่าย · เป้าหมายถูกเพื่อนชุบได้ครั้งเดียว');
   if(t.support.damageTargets)lines.push('โจมตีเวทศัตรูสูงสุด '+t.support.damageTargets+' ตัว ตัวละ '+Math.round(t.skillPower*100)+'% ATK');
   if(t.support.attackUp||t.support.physicalAttackUp||t.support.magicAttackUp||t.support.speedUp)lines.push('บัฟทีม: '+[['attackUp','พลังโจมตีทุกประเภท'],['physicalAttackUp','PATK'],['magicAttackUp','MATK'],['speedUp','ความเร็วโจมตี']].filter(([k])=>t.support[k]).map(([k,label])=>label+' +'+Math.round(t.support[k]*100)+'%').join(' · ')+' นาน '+t.support.duration+' วินาที · รีเฟรชเวลา ไม่สะสมความแรง');
   break;
  case 'chain':
   lines.push('ทุก '+n+' การโจมตี: ปล่อยกระแสพลังใส่ศัตรูสูงสุด '+(t.chainTargets||3)+' ตัว แรงนัดละ '+Math.round((t.chainPower||1.12)*100)+'% ATK');
   break;
  case 'slam':
   lines.push('ทุก '+n+' การโจมตี: โจมตีหมู่รัศมี '+(t.slamRadius||140)+' พิกเซลของสนาม'+(t.slamTargets?' สูงสุด '+t.slamTargets+' ตัว':'')+' แรง '+Math.round((t.skillPower||1.8)*100)+'% ATK ต่อเป้าหมาย');
   if(t.debuff)lines.push('ศัตรูที่รอดจากการโจมตี: '+[['attackDown','พลังโจมตีลด'],['vulnerability','ได้รับดาเมจเพิ่ม'],['healDown','ลดฟื้นฟู HP']].filter(([k])=>t.debuff[k]).map(([k,label])=>label+' '+Math.round(t.debuff[k]*100)+'%').join(' · ')+' นาน '+t.debuff.duration+' วินาที · รีเฟรชเวลา ไม่สะสมความแรง'+(t.debuff.healDown?' · มีผลต่อฮีลและดูดเลือด ไม่ลด HP ตอนคืนชีพ':''));
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
 if(t.effect!=='explosion')lines.push('สกิลมีช่วงเว้นอย่างน้อย '+CORE.SKILL_MIN_INTERVAL+' วินาทีหลังใช้ครั้งก่อน · หากโจมตีครบแล้วจะเก็บความพร้อมไว้จนใช้ได้');
 if(t.cleave)lines.push('โจมตีปกติ: ฟันศัตรูอื่นรอบเป้าหมายในรัศมี '+t.cleave.radius+' px คนละ '+Math.round(t.cleave.power*100)+'% ATK');
 if(t.passive?.bonusVsHealDown)lines.push('พาสซีฟ — '+t.passive.name+': ดาเมจต่อศัตรูที่ติดลดฟื้นฟู +'+Math.round(t.passive.bonusVsHealDown*100)+'%');
 if(t.passive?.skillSpeedUp)lines.push('หลังใช้สกิล: ความเร็วโจมตี +'+Math.round(t.passive.skillSpeedUp*100)+'% นาน '+t.passive.skillSpeedSeconds+' วินาที');
 if(t.passive?.lifesteal)lines.push('ดูดเลือด '+Math.round(t.passive.lifesteal*100)+'% จาก HP ที่ทำให้ศัตรูเสียจริง รวม DOT ไม่รวมโล่');
 if(t.passive?.magicGuard)lines.push('พาสซีฟ — '+t.passive.name+': รับแทน '+Math.round(t.passive.magicGuard*100)+'% ของดาเมจที่เพื่อนสายเวทได้รับ ไม่ว่าดาเมจมาจากสายใด · ไม่รับแทนตนเอง · โล่ของผู้ปกป้องรับได้ · เลือกผู้ปกป้องที่มีอัตราสูงสุดหนึ่งคน · ไม่ส่งต่อซ้ำ');
 if(t.passive?.bossMultiplier)lines.push('พาสซีฟ — '+t.passive.name+': ดาเมจทุกชนิดต่อบอส ×'+t.passive.bossMultiplier+' ก่อนคริติคอลและการป้องกัน');
 if(t.passive?.healOnAttack)lines.push('พาสซีฟ — '+t.passive.name+': เมื่อโจมตีปกติ ฟื้น HP ให้สมาชิกที่บาดเจ็บหนักที่สุด (ตามเปอร์เซ็นต์ HP) เท่ากับ '+Math.round(t.passive.healOnAttack*100)+'% ของ ATK พื้นฐานในการต่อสู้ของตนเอง');
 if(t.passive?.damageReduction)lines.push('พาสซีฟ — '+t.passive.name+': ลดความเสียหายที่ได้รับ '+Math.round(t.passive.damageReduction*100)+'% ตลอดการต่อสู้ ก่อนคำนวณโล่');
 if(t.passive?.focusCritStep)lines.push('พาสซีฟ — '+t.passive.name+': โจมตีเป้าหมายเดิมต่อเนื่องเพิ่มโอกาสคริติคอล '+Math.round(t.passive.focusCritStep*100)+' จุดเปอร์เซ็นต์ต่อครั้ง (สูงสุด +'+Math.round(t.passive.focusCritMax*100)+' จุดเปอร์เซ็นต์) · รีเซ็ตเมื่อเปลี่ยนเป้าหมาย');
 if(t.passive?.explosionImmune)lines.push('พาสซีฟ — '+t.passive.name+': ไม่ได้รับความเสียหายจาก EXPLOSION ทุกครั้ง');
 if(t.passive?.skillImmortalSeconds)lines.push('เมื่อใช้สกิล: เป็นอมตะ '+t.passive.skillImmortalSeconds+' วินาที');
 if(t.passive?.aquaReviveHp)lines.push('เมื่อ HP เหลือ 0 และอควาฝั่งเดียวกันยังมีชีวิต: คืนชีพ HP '+Math.round(t.passive.aquaReviveHp*100)+'% พร้อมอมตะ '+t.passive.aquaImmortalSeconds+' วินาที · ไม่จำกัดครั้ง · ไม่ใช้โควตาชุบชีวิตของอควา');
 if(t.passive?.explosionRestSeconds)lines.push('แท็กพิเศษ: เมื่อคาซึมะ อควา และเมกุมินยังมีชีวิตครบ เมกุมินพัก '+CORE.explosionRestSeconds(t.passive.explosionRestSeconds)+' วินาทีแล้วร่าย EXPLOSION ซ้ำได้ไม่จำกัดครั้ง');
 if(t.passive?.finalFlameSeconds)lines.push('พาสซีฟ — '+t.passive.name+': ตายครั้งแรก คืนชีพ HP '+Math.round(t.passive.reviveHp*100)+'% · ตายครั้งที่สอง คืนชีพ HP 1 และอมตะ '+t.passive.finalFlameSeconds+' วินาที (โจมตี/ใช้สกิลได้ตามปกติ แต่ไม่รับฮีล) จากนั้นตายถาวรในเวฟ/บอสนี้ ไม่สามารถชุบซ้ำได้');
 else if(t.passive?.reviveHp)lines.push('พาสซีฟ — '+t.passive.name+': เมื่อ HP เหลือ 0 คืนชีพด้วย HP '+Math.round(t.passive.reviveHp*100)+'% และเป็นอมตะ '+t.passive.immortalSeconds+' วินาที (ไม่รับดาเมจ) · '+(t.passive.reviveLimit||1)+' ครั้งต่อเวฟหรือบอส');
 if(t.globalRange)lines.push('🎯 ระยะยิงทั่วสนาม: ยิงได้จากทุกมุมโดยไม่ต้องเดินเข้าหาเป้าหมาย · ถอยเมื่อศัตรูประชิด');
 else if(Number(t.range)>=1.8)lines.push('🎯 ยิงไกล: กระสุนเดินทางตามเป้าหมายและคำนวณดาเมจเมื่อกระสุนถึง; พยายามรักษาระยะเมื่อศัตรูประชิด');
 else lines.push('⚔️ ประชิด: วิ่งเข้าโจมตีตามระยะของสนาม TFT');
 return lines.map(line=>line.replace(/\bATK\b/g,attackTypeLabel(t)));
}
function openSkill(id,source='hero',unit=null){
 const base=HEROES[id],modal=$('skillModal');if(!base||!modal)return;
 skillView={id,source,unit};
 const enemy=source==='enemy',progress=enemy?null:state.owned[id];
 const active=enemy?(unit||enemies.find(x=>x.id===id)):null;
 const stars=enemy?(active?.stars||1):(progress?.stars||1),h=enemy?CORE.enemyHero(base,stars,!!active?.boss):CORE.heroAtStars(base,stars),stat=enemy?CORE.stats(base,{level:1,stars}):CORE.teamHeroStats(state,HEROES,id,progress||{level:1,stars});
 const stats=[
  ['HP',fmt(active?active.maxHp:stat.hp)],
  [attackTypeLabel(h),fmt(active?active.atk:stat.atk)],
  ['โจมตีทุก',Number(active?active.delay:stat.cool).toFixed(2)+' วินาที'],
  ['ระยะโจมตี',h.globalRange?'ทั่วสนาม':Number(h.range).toFixed(2)+' ช่อง'],
  ['ความเร็วเดิน',String(h.move)],
  ['โอกาสคริ',Math.round((active?active.crit:stat.crit)*100)+'%'],
  ['ความแรงคริ','×'+Number(h.critDamage||1.5).toFixed(2)],
  ...(!enemy&&stat.dotDamage>0&&(h.passive?.dotPower||h.fireTrail)?[['โบนัส DOT','+'+Math.round(stat.dotDamage*100)+'%']]:[]),
  ['ความถี่สกิล',h.effect==='explosion'?'ร่าย '+CORE.explosionCastSeconds(h)+' วินาที':'ทุก '+CORE.skillAttackCount(h)+' ครั้ง · เว้น ≥ '+CORE.SKILL_MIN_INTERVAL+'s']
 ];
 const label=enemy?(active?.boss?'👑 บอสประจำชั้น · '+'★'.repeat(stars):'👹 ฮีโร่เงาศัตรู · '+'★'.repeat(stars))+' · Lv.'+(active?.level||1)+' · ด่าน '+(dungeon?.stage||battleStage()):progress?
  '⭐ Lv.'+progress.level+' · '+progress.stars+' ดาว':'🔒 ยังไม่อัญเชิญ · ค่าสถานะพื้นฐาน';
 $('skillModalTitle').textContent=h.name+' — '+h.skill;
 $('skillModalContent').innerHTML=
  '<div class="skill-modal-layout"><div class="skill-portrait"><img loading="lazy" src="'+escapeText(enemy?h.images.art:heroImages(id).art)+'" alt="'+escapeText(h.name)+'"></div>'+
  '<div class="skill-modal-main"><div class="skill-status">'+escapeText(label)+'</div><h3>'+escapeText(h.name)+'</h3>'+
  '<p>'+escapeText(h.subtitle||'')+'</p><div class="skill-tags">'+rarityBadge(h)+'<span>'+escapeText(h.role||h.team)+'</span>'+
  (h.traits||[]).map(x=>'<span>'+escapeText(x)+'</span>').join('')+(h.faction==='celestial_beast'&&!CORE.teamSynergies(state,HEROES).some(t=>t.id==='celestial_beast')?'<span>🦊 สัตว์สวรรค์</span>':'')+CORE.teamSynergies(state,HEROES).filter(t=>t.available.includes(id)).map(t=>'<span>'+escapeText(t.icon+' '+t.name)+(!enemy&&t.active&&t.members.includes(id)?' ✓':'')+'</span>').join('')+'</div>'+
  '<div class="skill-stats">'+stats.map(([k,v])=>'<div><small>'+escapeText(k)+'</small><strong>'+escapeText(v)+'</strong></div>').join('')+
  '</div></div></div><section class="skill-ability"><small>⚔ AUTO SKILL · IDLE MODE</small>'+
  '<h3>✨ '+escapeText(h.skill)+'</h3><ul>'+
  skillDescription(h,enemy).map(x=>'<li>'+escapeText(x)+'</li>').join('')+'</ul>'+
  '<p class="skill-mode-note">ใช้กติกาต่อสู้ TFT เดิม ผสมระบบฟาร์มและกาชาแบบ Idle · เลเวลและดาวอิงค่าปัจจุบัน</p></section>'+starUpgradeHtml(base,stars)+(enemy?'':costumeHtml(id));
 $('skillModalContent').insertAdjacentHTML('beforeend','<button type="button" class="trial-entry" data-trial-hero="'+id+'">▶ ทดลองฮีโร่ฟรี</button>');
 skillReturnFocus=modal.hidden?document.activeElement:skillReturnFocus;
 modal.hidden=false;$('closeSkillBtn').focus();
}
function closeSkill(){
 const modal=$('skillModal');if(modal.hidden)return;
 modal.hidden=true;skillView=null;
 if(skillReturnFocus?.isConnected&&skillReturnFocus.focus)skillReturnFocus.focus();
 skillReturnFocus=null;
}
function renderQuest(){
 let task;
 if(dungeon)task='✦ '+dungeonName(dungeon.kind)+' · ชนะผู้พิทักษ์เพื่อรับทรัพยากร · ไม่กระทบด่านหลัก';
 else if(farming())task='🪙 ฟาร์มด่าน '+battleStage()+' · ความคืบหน้าด่านหลัก '+run().stage+' ไม่เปลี่ยน';
 else if(night())task='☾ NIGHTMARE · รางวัลฟาร์ม ×2 · บอส '+CORE.nightmareBossCount(run().stage)+' ตัว · ความคืบหน้าแยกจาก Normal';
 else if(state.stage<5)task='ผ่านด่าน <b>5</b> เพื่อปลดล็อกช่องทีมที่ 5';
 else if(state.stage<12)task='ผ่านด่าน <b>12</b> เพื่อปลดล็อกช่องทีมที่ 6';
 else if(state.stage<20)task='ผ่านด่าน <b>20</b> เพื่อปลดล็อกช่องทีมที่ 7';
 else if(!CORE.canChallengeStage(state,HEROES))task='🏆 ถึงขอบเขตชั้นปัจจุบันแล้ว · ฟาร์มและสะสมดาวระหว่างรอชั้นใหม่';
 else task='พิชิตด่าน <b>'+Math.min(state.stage+5,CORE.maxStage(HEROES))+'</b> และสะสมดาวฮีโร่';
 const extra=!farming()&&run().bossRetryWaves?' · ฟาร์มอีก '+run().bossRetryWaves+' เวฟก่อนลองบอสใหม่':'';
 $('guideQuest').innerHTML='✧ '+task+'<br><small>เวฟเป็นชุด • Auto ฟาร์ม • แพ้บอสไม่ตกด่าน'+extra+'</small>';
}
function renderPanels(){
 renderGrid();updateResources();renderTeam();renderHeroes();renderSelected();renderQuest();
 refreshUpgradePicker();
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
 const stat=CORE.teamHeroStats(state,HEROES,id),old=actor.maxHp;
 actor.hp=actor.finalFlameUntil?1:Math.max(1,Math.round(actor.hp/old*stat.hp));
 actor.maxHp=stat.hp;actor.atk=stat.atk;actor.dotDamage=stat.dotDamage||0;actor.cool=stat.cool;actor.progress=state.owned[id];
 actor.crit=stat.crit;actor.critDamage=stat.critDamage;
 const stars=actor.node?.querySelector('.mini-stars');
 if(stars)stars.textContent='★'.repeat(state.owned[id].stars)+' · Lv.'+state.owned[id].level;
 if(actor.hpbar)actor.hpbar.style.width=actor.hp/actor.maxHp*100+'%';
}
function movePastMax(){
 if(!CORE.isMaxHero(state.owned[selected])||managementPanel?.id!=='panel-upgrade')return;
 const next=filterHeroes(IDS.filter(id=>state.owned[id]&&!CORE.isMaxHero(state.owned[id])),'Upgrade')[0];
 if(next){choose(next);refreshUpgradePicker();}
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
 movePastMax();
}
function rankUp(){
 const before=CORE.power(state,HEROES);
 if(!CORE.ascend(state,selected)){toast('ยังขาดชิ้นส่วนหรือ Gold สำหรับเพิ่มดาว');return}
 applyLiveHeroStats(selected);renderPanels();save();
 toast('⭐ '+HEROES[selected].name+' '+state.owned[selected].stars+' ดาว! พลังทีม +'+
  fmt(Math.max(0,CORE.power(state,HEROES)-before)));
 movePastMax();
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
 if($('universalShardValue'))$('universalShardValue').textContent=fmt(state.universalShards);
 if($('exchangeShardValue'))$('exchangeShardValue').textContent=fmt(state.universalShards);
 for(const [count,button,costId] of [[1,'summonOneBtn','summonOneCost'],[10,'summonTenBtn','summonTenCost'],[100,'summonHundredBtn','summonHundredCost']]){
  const cost=CORE.summonCost(state,count);
  $(costId).textContent=summonCostLabel(cost);
  $(button).disabled=summonBusy||state.rubies<cost.rubies;
 }
 $('summonLastBtn').hidden=!lastSummon;
 if($('exchangeDetails')?.open)renderExchange();
}
let exchangeRenderKey='';
function renderExchange(){
 const box=$('exchangeList');if(!box)return;
 $('exchangeShardValue').textContent=fmt(state.universalShards);
 const all=IDS.filter(id=>CORE.exchangeOffer(state,HEROES,id)),ids=filterHeroes(all,'Exchange');
 if($('filterCountExchange'))$('filterCountExchange').textContent='พบ '+ids.length+' / '+all.length+' ตัว';
 const key=JSON.stringify([state.universalShards,ids.map(id=>[id,CORE.exchangeOffer(state,HEROES,id)])]);
 if(exchangeRenderKey===key)return;exchangeRenderKey=key;
 box.innerHTML=ids.length?ids.map(id=>{
  const h=HEROES[id],offer=CORE.exchangeOffer(state,HEROES,id);
  return '<div class="exchange-row"><img loading="lazy" src="'+h.images.art+'" alt=""><div><strong>'+escapeText(h.name)+' '+rarityBadge(h)+'</strong><small>'+(offer.kind==='unlock'?'ปลดล็อกฮีโร่ใหม่':'แลกชิ้นส่วนฮีโร่ ×'+offer.amount)+'</small></div><button type="button" class="control-btn" data-exchange-hero="'+id+'"'+(state.universalShards<offer.cost?' disabled':'')+'>🧩 '+fmt(offer.cost)+'</button></div>';
 }).join(''):'<p class="hero-filter-empty">ไม่พบฮีโร่ที่แลกได้ตามตัวกรอง</p>';
}
const summonPageSize=12;
let summonPage=0;
function summonPageData(odds,filtered,page){
 const rates=new Map(odds.map(o=>[o.id,o.rate]));
 const ids=filtered.filter(id=>rates.has(id));
 const pages=Math.max(1,Math.ceil(ids.length/summonPageSize));
 const current=Math.max(0,Math.min(page,pages-1));
 return {ids,pages,current,visible:ids.slice(current*summonPageSize,(current+1)*summonPageSize),rates};
}
function renderSummonPool(){
 const odds=CORE.summonOdds(HEROES);
 const p=summonPageData(odds,filterHeroes(odds.map(o=>o.id),'Summon'),summonPage);
 summonPage=p.current;
 $('summonPoolCount').textContent=odds.length;
 $('filterCountSummon').textContent='พบ '+p.ids.length+' / '+odds.length+' ตัว · ตัวกรองไม่เปลี่ยนอัตราสุ่ม';
 $('summonPageNav').hidden=p.pages<=1;
 $('summonPageLabel').textContent=(p.current+1)+' / '+p.pages;
 $('summonPrevPage').disabled=p.current===0;
 $('summonNextPage').disabled=p.current>=p.pages-1;
 $('summonPool').innerHTML=p.visible.map(id=>{const h=HEROES[id];return '<button type="button" class="summon-pool-hero tier-'+h.cost+' '+rarityClass(h)+'" data-trial-hero="'+id+'" aria-label="ทดลอง '+escapeText(h.name)+'">'+rarityBadge(h)+'<img loading="lazy" src="'+h.images.art+'" alt=""><span>'+escapeText(h.name)+'</span><small>▶ ทดลอง</small></button>'}).join('')||'<p class="hero-filter-empty">ไม่พบฮีโร่ที่ตรงกับตัวกรอง</p>';
 const totals=Object.create(null);for(const {id,rate} of odds){const tier=HEROES[id].rarity;totals[tier]=(totals[tier]||0)+rate}
 $('summonTierRates').innerHTML=['UR','SSR','SR','R'].filter(t=>totals[t]>0).map(t=>'<span class="rarity-badge rarity-'+t.toLowerCase()+'">'+t+' '+(totals[t]*100).toFixed(0)+'%</span>').join('');
 $('summonRates').innerHTML=p.visible.map(id=>'<div><span>'+rarityBadge(HEROES[id])+' '+escapeText(HEROES[id].name)+'</span><b>'+ (p.rates.get(id)*100).toFixed(2)+'%</b></div>').join('')||'<p class="hero-filter-empty">ไม่มีรายการที่ตรงกับตัวกรอง</p>';
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
 const fresh=rewards.filter(x=>x.isNew).length,shards=rewards.reduce((sum,x)=>sum+x.shards,0),universal=rewards.reduce((sum,x)=>sum+(x.universal||0),0);
 $('summonBanner').hidden=true;$('summonReveal').hidden=true;$('summonOutcome').hidden=false;
 $('summonSummary').textContent='ฮีโร่ใหม่ '+fresh+' คน · ชิ้นส่วน '+shards+' · เศษรวม '+universal;
 $('summonResults').classList.toggle('single',count===1);
 $('summonResults').innerHTML=rewards.map((reward,i)=>{
  const h=HEROES[reward.id];
  return '<article class="summon-result-card tier-'+h.cost+' '+rarityClass(h)+(reward.isNew?' new-hero':'')+'" style="--delay:'+Math.min(i*65,550)+'ms">'+
   '<div class="summon-result-art">'+rarityBadge(h)+'<img loading="lazy" src="'+h.images.art+'" alt="'+escapeText(h.name)+'"><span class="result-tag">'+(reward.isNew?'NEW':reward.universal?'ครบเศษ 5★ · +'+fmt(reward.universal)+' เศษรวม':'+1 ชิ้นส่วน')+'</span></div>'+
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
   '<div>🔹 HERO EXP<strong>+'+fmt(pending.exp)+'</strong></div>'+
   '<div>💎 RUBIES<strong>+'+fmt(pending.rubies)+'</strong></div>'+
   '<div>🎟️ TICKETS<strong>+'+fmt(pending.tickets)+'</strong></div>';
 $('claimOfflineBtn').disabled=pending.minutes===0;
}
function closeOffline(){$('rewardModal').hidden=true}
function claimOffline(){
 if(pending.minutes<=0)return;
 state.gold+=pending.gold;state.heroExp+=pending.exp;state.rubies+=pending.rubies;state.tickets+=pending.tickets;
 const earned={...pending};
 state.offlineBank={minutes:0,gold:0,exp:0,rubies:0,tickets:0};pending=state.offlineBank;
 closeOffline();renderPanels();save();
 toast('📦 ออฟไลน์ +'+fmt(earned.gold)+' G / +'+fmt(earned.exp)+' EXP / +'+fmt(earned.rubies)+' 💎 / +'+fmt(earned.tickets)+' 🎟');
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
// Use the shield creator's artwork at the protected unit, even if the creator has left combat.
 function shieldEffect(target,source=target.shieldSource){
  visualEffect('shield',{id:source||target.id,x:target.x,y:target.y});
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
 node.style.width=size*spec.scaleX+'px';node.style.height=size*spec.scaleY+'px';node.dataset.fxRotation=String(spec.rotation);node.dataset.fxOffsetX=String(spec.offsetX);node.dataset.fxOffsetY=String(spec.offsetY);VFX.paint(node,spec,spec.frames>1&&!spec.src.endsWith('/combat-atlas.svg'));VFX.animateLifetime(node,spec,true);return true;
}
function ring(x,y,cloak=false){
 const node=el('span',{class:cloak?'fx-cloak':'fx-ring'});
 node.style.left=x+'%';node.style.top=y+'%';
 addTransientFx(node,850);
}
function clearFx(){for(const node of Array.from($('fxLayer').children))if(!node.classList.contains('fx-number')&&!node.classList.contains('image-vfx'))node.remove()}
function buildFighters(preserve=false){
 const previous=new Map(preserve?fighters.map(f=>[f.id,f]):[]),tags=CORE.teamSynergies(state,HEROES);
 fighters=state.squad.filter(id=>state.owned[id]).map((id,i)=>{
  const stat=CORE.teamHeroStats(state,HEROES,id,state.owned[id],tags);
  const place=state.placements?.[id]||CORE.defaultCells[i],point=boardPoint(place.col,place.row);
  const old=previous.get(id);
  const revive=allyRevives.get(id);
  const finalFlameUntil=old?.finalFlameUntil||revive?.finalFlameUntil||0,finalFlameSpent=!!(old?.finalFlameSpent||revive?.finalFlameSpent);
   const hp=finalFlameSpent?0:finalFlameUntil?1:old?Math.max(0,Math.min(stat.hp,Math.round(old.hp/Math.max(1,old.maxHp)*stat.hp))):stat.hp;
  return {id,side:'ally',damageType:CORE.damageType(HEROES[id]),x:point.x,y:point.y,startX:point.x,move:HEROES[id].move,
   hp,maxHp:stat.hp,atk:stat.atk,dotDamage:stat.dotDamage||0,cool:stat.cool,remaining:old?.remaining??i*.12,
   castUntil:old?.castUntil||0,exhausted:!!old?.exhausted,explosionCount:old?.explosionCount||0,explosionReadyAt:old?.explosionReadyAt||0,attacks:old?.attacks||0,nextSkillAt:old?.nextSkillAt||0,shield:old?.shield||0,shieldSource:old?.shield>0?old.shieldSource||null:null,tauntUntil:old?.tauntUntil||0,
   attackDown:old?.attackDown||null,vulnerability:old?.vulnerability||null,healDown:old?.healDown||null,
   dots:old?.dots||[],freezeUntil:old?.freezeUntil||0,attackUp:old?.attackUp||null,physicalAttackUp:old?.physicalAttackUp||null,magicAttackUp:old?.magicAttackUp||null,speedUp:old?.speedUp||null,
   focusTarget:old?.focusTarget||null,focusHits:old?.focusHits||0,
   crit:stat.crit,critDamage:stat.critDamage,
   cloakUntil:old?.cloakUntil||0,ambush:old?.ambush||false,
   reviveUsed:!!revive,reviveCount:Math.max(old?.reviveCount||0,revive?.count||0,revive?1:0),finalFlameUntil,finalFlameSpent,supportRevives:old?.supportRevives||0,revivedByAlly:!!old?.revivedByAlly,immortalUntil:Math.max(old?.immortalUntil||0,revive?.until||0),
   attackUntil:0,alive:hp>0&&(!old||old.alive),walking:false,progress:state.owned[id]};
 });
 const layer=$('heroLayer');layer.replaceChildren();
 for(const hero of fighters){
  const base=HEROES[hero.id],node=el('div',{class:'fighter party-fighter'});
  node.dataset.inspectId=hero.id;node.dataset.inspectSide='ally';
  node.tabIndex=0;node.setAttribute('role','button');node.setAttribute('aria-label','ดูสกิล '+base.name);
  node.style.left=hero.x+'%';node.style.top=hero.y+'%';
  node.innerHTML='<span class="mini-stars">'+'★'.repeat(hero.progress.stars)+' · Lv.'+hero.progress.level+'</span>'+
   '<img src="'+heroImages(hero.id).idle+'" alt="">'+
   '<div class="mini-hp"><i></i></div><span class="fighter-name">'+escapeText(base.name)+'</span>';
  layer.appendChild(node);hero.node=node;hero.img=node.querySelector('img');
  hero.hpbar=node.querySelector('.mini-hp i');hero.sprite=heroImages(hero.id).idle;
  hero.hpbar.style.width=Math.max(0,hero.hp/hero.maxHp*100)+'%';
  position(hero);
  if(!hero.alive)node.style.opacity='.2';
 }
}
function beginTravel(seconds=1.6){
 bossTime=0;combat=null;enemies=[];fallenEnemies=[];respawn=seconds;travel=0;allyRevives.clear();farmWave=null;farmElapsed=0;
 clearTftShots();
 $('monsterLayer').replaceChildren();clearFx();buildFighters();travelScene();
 $('battleMessage').textContent=!farming()&&run().bossRetryWaves?
  '🪙 ฟาร์มด่าน '+run().stage+' • อีก '+run().bossRetryWaves+' เวฟจะท้าบอสใหม่':
  '♟️ เตรียมรับเวฟ '+(waveCount+1)+'...';
 renderQuest();updateResources();
}
function spawnMonster(boss=false,cell=null,quiet=false,forcedId=null){
 if(boss&&!dungeon&&!CORE.canChallengeStage(run(),HEROES))return;
 if(!boss&&enemies.length>=enemyLimit())return;
 // Prevent multiple one-shot Explosion casters in the same normal wave.
 const excluded=!boss&&enemies.some(e=>HEROES[e.id]?.effect==='explosion')?IDS.filter(id=>HEROES[id].effect==='explosion'):[];
 const stage=dungeon?.stage||battleStage(),id=forcedId||(boss?CORE.floorBossId(stage,HEROES):CORE.pickEnemyId(stage,HEROES,Math.random,excluded));
 if(!id)return;
 if(!boss)encounters++;
 const stat=CORE.enemyStats(HEROES[id],stage,boss,dungeon?'normal':state.mode,night()&&!boss?CORE.nightmareStars(stage):1);
 if(dungeon){stat.hp=Math.max(1,Math.round(stat.hp*.45));stat.atk=Math.max(1,Math.round(stat.atk*.5));stat.stars=1;}
 const hero=CORE.enemyHero(HEROES[id],stat.stars,boss),hp=stat.hp;
 const entry=cell?boardPoint(cell[0],cell[1]):
  boardPoint(boss?2:(encounters+2)%GRID_COLS,boss?1:encounters%3);
 const foe={id,side:'enemy',damageType:CORE.damageType(hero),boss,stars:stat.stars,level:stat.level,hp,maxHp:hp,atk:stat.atk,
  remaining:.65+Math.random()*.35,delay:stat.delay,move:hero.move,
  shield:0,attacks:0,crit:stat.crit,critDamage:stat.critDamage,
  cloakUntil:0,ambush:false,attackUntil:0,walking:false,alive:true,
  timeout:boss?35:0,x:entry.x,y:entry.y,strideSeed:encounters};
 const node=el('div',{class:'fighter enemy-unit'+(boss?' boss-unit':'')});
 node.dataset.inspectId=id;node.dataset.inspectSide='enemy';
 node.tabIndex=0;node.setAttribute('role','button');
 node.setAttribute('aria-label','ดูสกิลศัตรู '+hero.name);
 node.innerHTML='<span class="mini-stars">'+(boss?'👑 '+'★'.repeat(stat.stars):night()?'⚔ '+'★'.repeat(stat.stars):'⚔')+' · Lv.'+stat.level+'</span>'+
  '<img src="'+hero.images.idle+'" alt="">'+
  '<div class="mini-hp enemy-hp"><i></i></div>'+
  '<span class="fighter-name">'+(boss?'👑 ':'⚔ เงา')+escapeText(hero.name)+'</span>';
 $('monsterLayer').appendChild(node);
 foe.node=node;foe.img=node.querySelector('img');foe.bar=node.querySelector('.enemy-hp i');
 foe.sprite=hero.images.idle;
 enemies.push(foe);combat=enemies[0];
 position(foe);travelScene();
 if(!quiet){
  $('battleMessage').textContent=boss?'👑 บอส '+hero.name+' '+ '★'.repeat(stat.stars)+' ปรากฏตัว!':
   '⚔️ เวฟ '+waveCount+' · ศัตรู '+enemies.length+' ตัว';
  updateResources();
 }
}
function spawnBossEncounter(){
 if(farming()||!CORE.canChallengeStage(run(),HEROES))return;
  enemies=[];fallenEnemies=[];$('monsterLayer').replaceChildren();clearTftShots();
 const stage=run().stage,ids=night()?CORE.nightmareBossIds(stage,HEROES):[CORE.floorBossId(stage,HEROES)];
 const cells=ids.length===1?[[2,1]]:ids.length===2?[[1,1],[4,1]]:[[1,1],[3,0],[4,2]];
 bossTime=night()?55:35;
 ids.forEach((id,i)=>spawnMonster(true,cells[i],true,id));
 $('battleMessage').textContent='👑 '+(night()?'NIGHTMARE · บอส '+ids.length+' ตัว':HEROES[ids[0]].name)+' · '+'★'.repeat(CORE.bossStars(stage));
 updateResources();
}
function spawnWave(){
 if(combat||enemies.length)return;
 waveCount++;
  syncFarmRecords();farmWave={key:farmRecordKey,stage:battleStage(),kills:0};
  const count=enemyLimit(),shift=waveCount%2;
 for(let i=0;i<count;i++)spawnMonster(false,waveSlots[(i+shift)%waveSlots.length],true);
 $('battleMessage').textContent='⚔️ เวฟ '+waveCount+' • ศัตรู '+count+' ตัวพร้อมกัน';
 log('⚔️ เวฟ '+waveCount+' · ศัตรู '+count+' ตัว');
 updateResources();
}
function resetCombat(){beginTravel(.8)}
function victoryBoss(){
 if(dungeon){finishDungeon(true);return;}
 const p=run();if(farming()||!CORE.canChallengeStage(p,HEROES)){beginTravel(1.5);return;}
 const reward=CORE.bossReward(p.stage,state.mode);
 state.gold+=reward.gold;state.heroExp+=reward.exp;
 state.rubies+=reward.rubies;state.tickets+=reward.tickets;p.bossWins++;
 log('🏆 ผ่าน '+(night()?'Nightmare ':'')+'ด่าน '+p.stage+'! +'+fmt(reward.gold)+' G / +'+fmt(reward.rubies)+' 💎 / +'+fmt(reward.tickets)+' 🎟');
 CORE.clearStage(p,HEROES);waveCount=0;save();
 const complete=!CORE.canChallengeStage(p,HEROES);
 beginTravel(1.5);
 renderPanels();toast(complete?'🏆 พิชิตครบทุกชั้น! ฟาร์มต่อได้จนกว่าจะมีชั้นใหม่':'🏆 ผ่านบอส! ด่าน '+p.stage+' • ได้ Rubies และตั๋ว!');
}
function failBoss(){
 if(dungeon){finishDungeon(false);return;}
 const stage=run().stage;
 CORE.bossDefeated(run());
 log('💥 ยังไม่ชนะบอสด่าน '+stage+' · ฟาร์มอีก 3 เวฟแล้ว AUTO จะลองใหม่');
 beginTravel(1.1);save();
 toast('💪 แพ้บอสแต่ยังอยู่ด่าน '+stage+' · Auto ฟาร์ม Gold/EXP ต่อ!');
}
function defeatMonster(foe){
 if(!foe||!enemies.includes(foe))return;
 if(foe.boss){
  if(!fallenEnemies.includes(foe))fallenEnemies.push(foe);
  enemies=enemies.filter(x=>x!==foe);foe.node?.remove();combat=enemies[0]||null;
  if(!combat){victoryBoss();return;}
  $('battleMessage').textContent='👑 บอสเหลือ '+enemies.length+' ตัว';updateResources();return;
 }
 // A revived enemy never pays out its loot twice.
 if(!foe.rewarded){
  foe.rewarded=true;
  const reward=CORE.awardFarmKill(state,farmWave?.stage||battleStage());
   if(farmWave)farmWave.kills++;
   const p=run();if(!farming())p.kills=Math.min(CORE.killsNeeded(p.stage),p.kills+1);
  if(reward.tickets){log('🎟️ ฟาร์มครบ '+CORE.ECONOMY.killsPerTicket+' ตัว! ได้ตั๋วสุ่ม +'+reward.tickets);save();}
 }
 if(!fallenEnemies.includes(foe))fallenEnemies.push(foe);
 enemies=enemies.filter(x=>x!==foe);foe.node?.remove();
 combat=enemies[0]||null;
 if(!combat){
  // Only spawn a fresh group AFTER the entire wave is defeated.
  if(!farming())CORE.waveCleared(run());
   finishFarmWave();beginTravel(.95);save();
 }else{
  $('battleMessage').textContent='⚔️ เวฟ '+waveCount+' · เหลือ '+enemies.length+' ตัว';
  updateResources();
 }
}
function pickEnemy(f){return TFT.findTarget(f,enemies,stageClock)}
function targetHero(enemy){return TFT.findTarget(enemy,fighters,stageClock)}
// TFT-style shared damage pipeline. No damage is applied to ranged targets until the bullet lands.
function vtuberTeamBonus(actor){
  const ids=actor.side==='ally'&&!trialContext?state.squad:(actor.side==='ally'?fighters:[...enemies,...fallenEnemies]).map(u=>u.id);
  return CORE.vtuberBonus(ids,HEROES);
 }
 function tftDamage(attacker,target,power,bonusCrit=0,forcedCrit=false,pierceShield=false,visual='hit',dot=false){
 if(!target||target.hp<=0||target.alive===false)return false;
 if(TFT.isImmortal(target,stageClock)){statusFx(target,'immune','อมตะ · 0');return false}
 const hero=combatHero(attacker)||{};
 if(TFT.blocksExplosion(hero,combatHero(target))){statusFx(target,'immune','กัน EXPLOSION · 0');return false}
 const chance=Math.min(1,Math.max(0,(attacker.crit||0)+bonusCrit));
 const critical=!dot&&(forcedCrit||(chance>0&&Math.random()<chance));
 const raw=TFT.incomingDamage(power*TFT.healDownDamageMultiplier(hero,target,stageClock)*TFT.bossDamageMultiplier(hero,target)*TFT.outgoingMultiplier(attacker,stageClock)*TFT.vulnerabilityMultiplier(target,stageClock)*(critical?(attacker.critDamage||hero.critDamage||1.5):1),combatHero(target));
 const split=TFT.splitMagicDamage(target,target.side==='ally'?fighters:enemies,combatHero,stageClock,raw);
 const shieldSource=target.shieldSource;
  const hit=TFT.resolveDamage(target,split.target,pierceShield);
 let transferred=null;
 if(split.guard&&split.redirected){
  const guardShieldSource=split.guard.shieldSource;
   transferred=TFT.resolveDamage(split.guard,split.redirected,pierceShield);
  position(split.guard);statusFx(split.guard,'magicGuard','ปกป้องเวท');
  if(transferred.damage)unitFx(split.guard,'รับแทน −'+fmt(transferred.damage),'damage');
  if(transferred.absorbed){unitFx(split.guard,'โล่ −'+fmt(transferred.absorbed),'shield');shieldEffect(split.guard,guardShieldSource)}
   else visualEffect('shield',split.guard);
 }
 const {damage,absorbed}=hit;
 if(hero.passive?.lifesteal&&attacker.alive!==false&&attacker.hp>0){
  const drain=(damage+(transferred?.damage||0))*hero.passive.lifesteal;
  if(drain>0)showHealing(TFT.healWeakest([attacker],1,()=>drain,stageClock,vtuberTeamBonus(attacker).healPower),attacker);
 }
 position(target);
 if(damage>0){unitFx(target,(dot?'DOT ':critical?'CRIT ':'')+'−'+fmt(damage),'damage',critical);if(visual)visualEffect(visual,attacker,target.x,target.y,critical?1.18:1)}
 if(absorbed>0){unitFx(target,'โล่ −'+fmt(absorbed),'shield',false);shieldEffect(target,shieldSource)}
 if(!damage&&!absorbed)statusFx(target,'zero','0');
 if(critical)ring(target.x,target.y);
 if(transferred)finishDamage(split.guard);
 finishDamage(target);return true;
}
function finishDamage(target){
 const bar=target.side==='enemy'?target.bar:target.hpbar;
 if(bar)bar.style.width=Math.max(0,target.hp/target.maxHp*100)+'%';
 if(target.hp===0){
  target.dots=[];target.freezeUntil=0;target.healDown=null;
  const linked=TFT.linkedRevive(target,combatHero(target),target.side==='ally'?fighters:enemies,stageClock);
  if(linked||TFT.tryRevive(target,combatHero(target),stageClock,target.side==='ally'?(allyRevives.get(target.id)?.count||0):0)){
   if(target.side==='ally'&&!linked)allyRevives.set(target.id,{until:target.immortalUntil,count:target.reviveCount,finalFlameUntil:target.finalFlameUntil||0});
   if(bar)bar.style.width=target.hp/target.maxHp*100+'%';
   position(target);visualEffect('revive',target);unitFx(target,target.finalFlameUntil?'🔥 เพลิงสุดท้าย · อมตะ 10 วิ':'คืนชีพ +'+fmt(target.hp),'heal');if(TFT.isImmortal(target,stageClock))statusFx(target,'revive','อมตะ');
   if(!trialContext)log('✦ '+HEROES[target.id].name+' คืนชีพ!');return true;
  }
  target.alive=false;
  if(trialContext){if(target.node)target.node.style.opacity='.22'}
  else if(target.side==='enemy')defeatMonster(target);
  else if(target.node)target.node.style.opacity='.2';
 }
 return true;
}
function advanceFinalFlames(){
 for(const u of [...fighters,...enemies]){
  if(!TFT.expireFinalFlame(u,stageClock))continue;
  if(u.side==='ally')allyRevives.set(u.id,{until:0,count:u.reviveCount,finalFlameUntil:0,finalFlameSpent:true});
  position(u);unitFx(u,'🔥 เพลิงสุดท้ายดับ','status');finishDamage(u);
  if(!trialContext&&!combat)return;
 }
}
function advanceDots(){
 const units=[...fighters,...enemies];
 for(const target of units){
  if(target.hp<=0||target.alive===false)continue;
  for(const hit of TFT.dueDots(target,stageClock)){
   if(target.hp<=0||target.alive===false)break;
   // A curse retains its original caster even after death or removal from the enemy list.
   const source=hit.source;
   if(!source)continue;
   const landed=tftDamage(source,target,hit.power,0,false,hit.pierceShield===true,'dot',true);
   if(landed&&TFT.applyFreeze(target,hit.freezeSeconds,stageClock)){position(target);visualEffect('freeze',source,target.x,target.y);statusFx(target,'freeze','❄ แช่แข็ง');if(trialContext)trialContext.note='ทดสอบสำเร็จ · คำสาปครบและแช่แข็งแล้ว';}
   if(!trialContext&&!combat)return;
  }
 }
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
  setShotVisualPosition(node,attacker.x,attacker.y,angle);
  effectLayer().appendChild(node);
 }
 shots.push({
  owner:attacker,side:attacker.side,x:attacker.x,y:attacker.y,target,
  life:HEROES[attacker.id].globalRange?3.5:1.8,speed:HEROES[attacker.id].projectileSpeed||(HEROES[attacker.id].effect==='triple'?450:340),
  power:attacker.atk*mult,bonusCrit,execute,color:palette,node,visual:heavy?'skillHit':'hit'
 });
}
function fireLayer(){
  const arena=$(trialContext?'trialArena':'stageViewport');
  let node=arena.querySelector('.fire-ground-layer');
  if(!node){node=el('div',{class:'fire-ground-layer'});arena.appendChild(node)}
  return node;
 }
 function positionFireTrail(f){
  const b=TFT.fireBounds(f,stageClock),node=f.node;
  if(!node)return;
  if(!b.active){node.style.display='none';return}
  node.style.display='';
  const sx=arenaSize.width/TFT.W,sy=arenaSize.height/TFT.H,dx=f.dx*sx,dy=f.dy*sy;
  const mid=(b.head+b.tail)/2,len=(b.head-b.tail)*Math.hypot(dx,dy);
  const width=f.width*sx*sy/Math.max(1e-6,Math.hypot(dx,dy));
  node.style.left=(f.x+f.dx*mid)*sx+'px';node.style.top=(f.y+f.dy*mid)*sy+'px';
  node.style.width=len+'px';node.style.height=width+'px';
  node.style.transform='translate(-50%,-50%) rotate('+Math.atan2(dy,dx)+'rad)';
  const fade=Math.min(len,Math.max(0,(stageClock-f.started-(f.duration-1.25))*f.speed-b.tail)*Math.hypot(dx,dy));
  const startAlpha=b.tail>0?0:Math.max(0,1-Math.max(0,stageClock-f.started-(f.duration-1.25))/1.25);
  const endAlpha=Math.max(0,Math.min(1,startAlpha+(len/Math.max(1e-6,1.25*f.speed*Math.hypot(dx,dy)))));
  node.style.maskImage='linear-gradient(to right,rgba(0,0,0,'+startAlpha+') 0px,rgba(0,0,0,'+(fade>=len?endAlpha:1)+') '+fade.toFixed(1)+'px,rgba(0,0,0,'+(fade>=len?endAlpha:1)+') 100%)';
  node.style.webkitMaskImage=node.style.maskImage;
 }
 function addFireTrail(attacker,ray,hero,speed){
  const f=TFT.makeFireTrail(ray,hero.fireTrail,speed,stageClock,attacker.dotDamage||0);
  f.owner=attacker;f.side=attacker.side;
  const node=el('div',{class:'fire-ground-strip '+(f.side==='enemy'?'hostile-fire':'ally-fire')});
  const art=el('span',{class:'fire-ground-art'}),spec=VFX?.getSpec(HEROES[attacker.id],'groundFire');
  if(spec)VFX.paint(art,{...spec,delayMs:0,loopFrames:true},true);
  node.appendChild(art);f.node=node;node.style.display='none';fireLayer().appendChild(node);fireTrails.push(f);return f;
 }
 function clearFireTrails(){for(const f of fireTrails)f.node?.remove();fireTrails=[]}
 function advanceFireTrails(){
  for(const f of fireTrails.slice()){
   if(!fireTrails.includes(f))return;
   for(const hit of TFT.fireTicks(f,stageClock,f.side==='ally'?enemies:fighters)){
    if(!fireTrails.includes(f))return;
    if(hit.target.hp>0&&hit.target.alive!==false)tftDamage(f.owner,hit.target,hit.power,0,false,false,null,true);
    if(!trialContext&&!combat)return;
   }
   if(TFT.fireBounds(f,stageClock).expired){f.node?.remove();fireTrails=fireTrails.filter(x=>x!==f)}
   else positionFireTrail(f);
  }
 }
 function tftPiercingShot(attacker,target){
 const hero=combatHero(attacker),p=TFT.makePierce(attacker,target);
 // The beam endpoints come from the same logical ray as the collision system.
 const end={x:(p.x+p.dx*p.limit)*100/TFT.W,y:(p.y+p.dy*p.limit)*100/TFT.H};
 let node=null;
 if(hero.fireTrail||!beamEffect(attacker,end,true)){
  node=el('span',{class:'tft-bullet heavy piercing-bullet'});
  node.style.setProperty('--bullet-color',hero.col||'#82d0c7');
  node.style.setProperty('--shot-angle',Math.atan2(p.dy,p.dx)+'rad');
  imageProjectile(node,attacker,true);
  const angle=Math.atan2((end.y-attacker.y)*arenaSize.height,(end.x-attacker.x)*arenaSize.width);
  setShotVisualPosition(node,attacker.x,attacker.y,angle);
  effectLayer().appendChild(node);
 }
 const speed=hero.projectileSpeed||950,fire=hero.fireTrail?addFireTrail(attacker,p,hero,speed):null;
 shots.push({owner:attacker,side:attacker.side,x:attacker.x,y:attacker.y,pierce:p,fire,
  speed,radius:hero.pierceRadius||36,power:attacker.atk*(hero.skillPower||2.4),pierceShield:hero.pierceShield!==false,node});
}
function clearTftShots(){
 for(const b of shots)if(b.node)b.node.remove();
 shots=[];clearFireTrails();
}
function advanceTftShots(t){
 if(!shots.length)return;
 const batch=shots.slice(),finished=new Set();
 for(const bullet of batch){
  if(!shots.includes(bullet))break; // a boss victory or full enemy clear reset the encounter
  if(bullet.pierce){
   const targets=bullet.side==='ally'?enemies:fighters;
   const result=TFT.advancePierce(bullet,t,targets);
   if(bullet.fire){if(!bullet.fire.head) {bullet.fire.started=stageClock-t;bullet.fire.nextTick=bullet.fire.started+1}bullet.fire.head=bullet.pierce.distance;}
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
 actor.castUntil=stageClock+CORE.explosionCastSeconds(hero);actor.walking=false;position(actor);
 visualEffect('cast',actor);unitFx(actor,'ร่าย EXPLOSION!','status');
 if(trialContext)trialContext.note='กำลังร่าย EXPLOSION!';return true;
}
function advanceExplosion(actor,auto=false){
 const hero=combatHero(actor);
 if(hero?.effect!=='explosion')return false;
 if(!actor.alive||actor.hp<=0){actor.castUntil=0;return true}
 const party=()=>TFT.explosionParty(actor,actor.side==='ally'?fighters:enemies,combatHero);
 if(actor.exhausted){
  if(auto&&party()&&stageClock>= (actor.explosionReadyAt||0)&&(actor.side==='ally'?enemies:fighters).some(e=>e.hp>0&&e.alive!==false)){actor.exhausted=false;startExplosion(actor);}
  return true;
 }
 if(actor.castUntil&&actor.explosionCount&&!party()){actor.castUntil=0;actor.exhausted=true;position(actor);return true}
 if(!actor.castUntil){const targets=actor.side==='ally'?enemies:fighters;if(auto&&targets.some(e=>e.hp>0&&e.alive!==false))startExplosion(actor);return !!auto}
 if(stageClock+1e-9<actor.castUntil){actor.walking=false;position(actor);return true}
 actor.castUntil=0;actor.exhausted=true;actor.explosionCount=(actor.explosionCount||0)+1;actor.explosionReadyAt=stageClock+CORE.explosionRestSeconds(party()?.rest||2);actor.walking=false;pose(actor,false);position(actor);
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
  case 'dot':{
   const targets=foes().sort((a,b)=>TFT.pxDist(a,target)-TFT.pxDist(b,target)).slice(0,hero.passive.dotTargets);
   for(const e of targets){
    if(!trialContext&&!combat)break;
    if(tftDamage(attacker,e,attacker.atk*hero.skillPower,0,false,false,'skillHit')&&TFT.applyDot(e,attacker,{...hero.passive,dotPower:hero.passive.dotPower*(1+(attacker.dotDamage||0))},stageClock)){
     visualEffect('debuff',attacker,e.x,e.y);statusFx(e,'dot','คำสาป');
    }
   }
   return true;
  }
  case 'explosion':return startExplosion(attacker);
  case 'heal':{
   const allies=attacker.side==='ally'?fighters:enemies;
   const result=TFT.applySupport(allies,hero.support,stageClock,vtuberTeamBonus(attacker).healPower);
   showHealing(result.healed,attacker);
   if(hero.support.attackUp||hero.support.physicalAttackUp||hero.support.magicAttackUp||hero.support.speedUp)for(const u of result.units){const attack=TFT.attackBuff(u,stageClock),speed=TFT.debuffValue(u,'speedUp',stageClock);if(!attack&&!speed)continue;position(u);visualEffect('buff',attacker,u.x,u.y,.85);unitFx(u,[attack?attackTypeLabel(HEROES[u.id])+' +'+Math.round(attack*100)+'%':'',speed?'SPD +'+Math.round(speed*100)+'%':''].filter(Boolean).join(' · '),'buff')}
   if(hero.support.reviveHp){
    const candidates=attacker.side==='ally'||trialContext?allies:fallenEnemies;
    const revived=TFT.reviveAlly(attacker,candidates,hero.support,stageClock);
    if(revived){
     if(revived.side==='enemy'&&!trialContext){
      fallenEnemies=fallenEnemies.filter(u=>u!==revived);enemies.push(revived);$('monsterLayer').appendChild(revived.node);
     }
     if(revived.node)revived.node.style.opacity='1';
     const bar=revived.side==='enemy'?revived.bar:revived.hpbar;
     if(bar)bar.style.width=revived.hp/revived.maxHp*100+'%';
     pose(revived,false);position(revived);visualEffect('revive',attacker,revived.x,revived.y,1.3);unitFx(revived,'ชุบชีวิต +'+fmt(revived.hp),'heal');statusFx(revived,'revive','อมตะ');
    }
   }
   if(hero.support.damageTargets){
    const targets=foes().sort((a,b)=>TFT.pxDist(a,target)-TFT.pxDist(b,target)).slice(0,hero.support.damageTargets);
    for(const e of targets)tftDamage(attacker,e,attacker.atk*hero.skillPower,0,false,false,'skillHit');
   }
   ring(attacker.x,attacker.y);return true;
  }
  case 'firetrail':
   case 'pierce':
    tftPiercingShot(attacker,target);return true;
  case 'slam':{
   const nearby=foes().filter(x=>TFT.pxDist(x,target)<=(hero.slamRadius||140)).sort((a,b)=>TFT.pxDist(a,target)-TFT.pxDist(b,target)).slice(0,hero.slamTargets||Infinity);
   visualEffect('area',attacker,target.x,target.y,1.3);
   for(const e of nearby){
    const landed=tftDamage(attacker,e,attacker.atk*(hero.skillPower||1.8),0,false,false,null);
    if(landed&&hero.debuff&&TFT.applyDebuff(e,TFT.boostedDebuff(hero.debuff,vtuberTeamBonus(attacker).antiHealPower),stageClock)){
     const labels=[['attackDown','ATK −'],['vulnerability','DMG +'],['healDown','ฮีล −']].filter(([k])=>hero.debuff[k]).map(([k,label])=>label+Math.round(TFT.debuffValue(e,k,stageClock)*100)+'%');
     position(e);visualEffect('debuff',attacker,e.x,e.y,.75);unitFx(e,labels.join(' · '),'debuff');
    }
   }
   if(hero.passive?.skillSpeedUp&&attacker.hp>0&&attacker.alive!==false){
    attacker.speedUp={amount:Math.max(TFT.debuffValue(attacker,'speedUp',stageClock),hero.passive.skillSpeedUp),until:Math.max(attacker.speedUp?.until||0,stageClock+hero.passive.skillSpeedSeconds)};
    position(attacker);visualEffect('buff',attacker);unitFx(attacker,'SPD +'+Math.round(attacker.speedUp.amount*100)+'%','buff');
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
     if(u.shield>0&&u.shieldSource===attacker.id)shieldEffect(u);
      if(gained>0)unitFx(u,'โล่ +'+fmt(gained),'shield');
    }
    statusFx(attacker,'taunt','ยั่วยุ');
    return true;
   }
   const gain=Math.round(attacker.maxHp*.30);
   attacker.shield=(attacker.shield||0)+gain;attacker.shieldSource=attacker.id;
    shieldEffect(attacker);unitFx(attacker,'โล่ +'+fmt(gain),'shield');
   break;
  case 'blink':
   attacker.x=Math.max(5.5,Math.min(94.5,target.x+(Math.random()-.5)*5));
   attacker.y=Math.max(8,Math.min(92,target.y+(Math.random()-.5)*4));
   position(attacker);ring(attacker.x,attacker.y);
   break;
  case 'slash':
   if(hero.passive?.skillImmortalSeconds){attacker.immortalUntil=Math.max(attacker.immortalUntil||0,stageClock+hero.passive.skillImmortalSeconds);position(attacker);visualEffect('buff',attacker);statusFx(attacker,'immune','อมตะ');}
   break;
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
 node.style.setProperty('--strike-duration',260+'ms');
 node.classList.remove('burst');
 requestAnimationFrame(()=>{
  if(node.isConnected&&attacker.attackUntil>(scene?scene.clock:stageClock))node.classList.add('burst');
 });
}
function tftAttack(attacker,target,forceSkill=false){
 if(!target||target.hp<=0||attacker.exhausted||attacker.castUntil||TFT.isFrozen(attacker,stageClock))return;
 const hero=combatHero(attacker),effect=hero.effect||'';
 const ambush=attacker.ambush&&attacker.cloakUntil<=stageClock;
 if(ambush)attacker.ambush=false;
 const special=CORE.consumeSkillAttack(attacker,hero,stageClock,forceSkill);
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
  showHealing(TFT.healWeakest(allies,1,()=>attacker.atk*hero.passive.healOnAttack,stageClock,vtuberTeamBonus(attacker).healPower),attacker);
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
 const elapsed=Math.max(0,Math.min(.08,dt)),t=elapsed;
  if(!dungeon&&!combat?.boss)farmElapsed+=elapsed;
  stageClock+=t;
 if(!combat){
  respawn-=t;
  if(respawn<=0){
   if(dungeon)spawnDungeonBoss();
   else if(!farming()&&CORE.nextEncounter({...run(),autoBoss:state.autoBoss},HEROES)==='boss')spawnBossEncounter();
   else spawnWave();
  }
  return;
 }
 if(combat.boss){
  bossTime-=t;
  if(bossTime<=0){failBoss();return}
 }
 if(state.farmMode==='smart'&&farmWave&&farmElapsed>=60){finishFarmWave();beginTravel(1.2);save();return;}
  advanceFinalFlames();if(!combat)return;
  advanceDots();if(!combat)return;
  for(const f of fighters){
  if(!f.alive)continue;
  if(TFT.isFrozen(f,stageClock)){f.walking=false;if(f.castUntil)f.castUntil+=t;position(f);continue;}
  if(advanceExplosion(f,true)){if(!combat)return;continue}
  f.remaining-=t;
  if(f.attackUntil<stageClock&&f.sprite!==heroImages(f.id).idle){
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
  if(TFT.isFrozen(foe,stageClock)){foe.walking=false;if(foe.castUntil)foe.castUntil+=t;position(foe);continue;}
  if(advanceExplosion(foe,true)){if(!combat)return;continue}
  if(foe.attackUntil<stageClock&&foe.sprite!==HEROES[foe.id].images.idle){
   pose(foe,false);foe.node.classList.remove('burst');
  }
  const target=targetHero(foe);
  foe.remaining-=t;
  if(target){
   const close=TFT.pursue(foe,target,combatHero(foe),t,'enemy').inRange;
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
 advanceFireTrails();if(!combat)return;
 if(!fighters.some(f=>f.alive&&!f.exhausted)&&!shots.some(q=>q.side==='ally')&&!fireTrails.some(f=>f.side==='ally')&&!enemies.some(u=>u.hp>0&&u.alive!==false&&(u.dots||[]).some(d=>d.left>0&&d.source?.side==='ally'))){
  if(combat?.boss){failBoss();return}
  log('💔 ทีมฟื้นตัวก่อนต้านมอนระลอกใหม่');finishFarmWave();beginTravel(1.2);save();return;
 }
 for(const f of fighters){
  f.hpbar.style.width=Math.max(0,f.hp/f.maxHp*100)+'%';
  f.node.style.opacity=f.alive?'1':'.2';
 }
 $('bossTimer').hidden=!combat?.boss;
 if(combat?.boss)$('bossCountdown').textContent=Math.ceil(bossTime);
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
 const live={fighters,enemies,shots,fireTrails,stageClock,arenaSize,allyRevives};
 trialContext=scene;fighters=scene.fighters;enemies=scene.enemies;shots=scene.shots;fireTrails=scene.fireTrails;
 stageClock=scene.clock;arenaSize=scene.size;allyRevives=scene.revives;
 try{return fn()}finally{
  scene.clock=stageClock;scene.shots=shots;scene.fireTrails=fireTrails;
  ({fighters,enemies,shots,fireTrails,stageClock,arenaSize,allyRevives}=live);trialContext=null;
 }
}
function trialUnit(id,side,x,y,hp,maxHp,label,stars=1){
 const progress={level:1,stars},h=HEROES[id],st=h?CORE.stats(h,progress):{atk:100,cool:1,crit:0,critDamage:1};
 const actor={id,side,damageType:CORE.damageType(h),x,y,hp,maxHp,progress,atk:st.atk,cool:st.cool,crit:st.crit,critDamage:st.critDamage,alive:true,shield:0,attacks:0,attackUntil:0,cloakUntil:0,ambush:false,walking:false,label};
 const node=el('div',{class:'fighter '+(side==='enemy'?'enemy-unit trial-dummy':'party-fighter')});
 node.innerHTML='<span class="mini-stars">'+(side==='enemy'?'DUMMY':'Lv.1 '+'★'.repeat(stars))+'</span>'+
 (h?'<img src="'+heroImages(id,side).idle+'" alt="">':'<div class="dummy-icon">◎</div>')+
 '<div class="mini-hp"><i></i></div><span class="fighter-name">'+escapeText(label||h.name)+'</span><span class="trial-values"></span>';
 $('trialUnits').appendChild(node);actor.node=node;actor.img=node.querySelector('img');actor.sprite=h?heroImages(id,side).idle:undefined;
 actor.hpbar=actor.bar=node.querySelector('.mini-hp i');actor.values=node.querySelector('.trial-values');
 return actor;
}
function resetTrial(){
 if($('trialModal').hidden)return;
 const id=$('trialHero').value,stars=Number($('trialStars').value)||1,h=CORE.heroAtStars(HEROES[id],stars),bossTrial=$('trialCount').value==='boss',count=bossTrial?1:Number($('trialCount').value),st=CORE.stats(HEROES[id],{level:1,stars}),arena=$('trialArena');
 $('trialUnits').replaceChildren();$('trialFx').replaceChildren();$('trialArena').querySelector('.fire-ground-layer')?.replaceChildren();$('trialLog').replaceChildren();
 trial={id,clock:0,size:{width:arena.clientWidth,height:arena.clientHeight},fighters:[],enemies:[],shots:[],fireTrails:[],revives:new Map(),events:[],queue:[],active:null,nextAt:0,lastLog:'',note:'พร้อมทดลอง'};
 trial.hero=trialUnit(id,'ally',50,78,st.hp,st.hp,undefined,stars);
 trial.fighters.push(trial.hero);
 if(h.passive?.magicGuard){const max=CORE.stats(HEROES.aqua,{level:1,stars:1}).hp;trial.fighters.push(trialUnit('aqua','ally',25,82,max,max,HEROES.aqua.name));}
 if(h.passive?.aquaReviveHp){const max=CORE.stats(HEROES.aqua,{level:1,stars:1}).hp;trial.fighters.push(trialUnit('aqua','ally',25,82,max,max,HEROES.aqua.name));}
 // Support targets start wounded; tanks can demonstrate ally shields.
 if(h.support||h.guard){
  for(const [other,x,ratio] of (h.support?.healTargets>=3?[['kirito',20,.33],['asuna',80,.55],['heathcliff',30,.65]]:[['kirito',22,.33],['asuna',78,.55]])){
   const max=CORE.stats(HEROES[other],{level:1,stars:1}).hp;
   trial.fighters.push(trialUnit(other,'ally',x,82,Math.round(max*(h.support?ratio:1)),max,HEROES[other].name));
  }
 }
 const cells=h.debuff?.healDown?[[50,42],[50,34],[59,42],[41,42],[50,25]]:h.cleave?[[50,42],[50,27],[66,37],[25,25],[80,20]]:(h.effect==='pierce'||h.effect==='firetrail')?[[50,42],[50,25],[50,10],[24,30],[76,30]]:[[50,38],[33,32],[67,32],[18,15],[82,15]];
 for(let i=0;i<count;i++){const [x,y]=cells[i];const dummy=trialUnit('__dummy','enemy',x,y,bossTrial?12000:3000,bossTrial?12000:3000,bossTrial?'👑 หุ่นบอส':'หุ่น '+(i+1));dummy.boss=bossTrial;trial.enemies.push(dummy)}
 $('trialSkillName').innerHTML=rarityBadge(h)+' '+escapeText(h.skill);
 $('trialStats').textContent='HP '+fmt(st.hp)+' · '+attackTypeLabel(h)+' '+fmt(st.atk)+' · '+(h.globalRange?'ทั่วสนาม':h.range+' ช่อง');
 $('trialPassive').disabled=!(h.passive||h.guard||h.fireTrail||h.effect==='cloakshot');
 $('trialPassive').textContent=h.fireTrail?'ทดสอบทางไฟซ้อน':h.debuff?.healDown?'ทดสอบตัดฮีล':h.passive?.magicGuard?'ทดสอบรับดาเมจแทน':h.effect==='explosion'?'ทดลองหมดแรง':h.passive?.reviveHp?'ทดสอบคืนชีพตัวเอง':h.support?.reviveHp?'ทดสอบชุบเพื่อน':h.passive?.aquaReviveHp?'ทดสอบคืนชีพ':h.passive?.focusCritStep?'ทดสอบคริต่อเนื่อง':h.passive?.healOnAttack?'ทดสอบฮีลปกติ':h.guard?'ทดสอบยั่วยุ':h.effect==='cloakshot'?'ทดสอบซุ่มยิง':h.passive?.damageReduction?'ทดสอบลดดาเมจ':'ทดลองพาสซีฟ';
 withTrial(renderTrial);
}
// Keep the whole delayed skill sequence visible in Hero Trial.
function trialDotProgress(scene,clock){
 const living=scene.enemies.filter(u=>u.hp>0&&u.alive!==false);
 const pending=living.flatMap(u=>(u.dots||[]).filter(d=>d.source.side==='ally'&&d.source.id===scene.hero.id));
 const frozen=living.filter(u=>TFT.isFrozen(u,clock));
 const left=Math.max(0,...pending.map(d=>d.left));
 const seconds=Math.max(0,...frozen.map(u=>u.freezeUntil-clock));
 return {pending:pending.length,frozen:frozen.length,left,seconds,busy:pending.length>0||frozen.length>0};
}
function renderTrial(){
 for(const u of [...fighters,...enemies]){
  position(u);u.hpbar.style.width=u.hp/u.maxHp*100+'%';
  const dotLeft=u.hp>0?Math.max(0,...(u.dots||[]).map(d=>d.left)):0;
  const frozen=u.hp>0&&TFT.isFrozen(u,stageClock);
  const antiHeal=TFT.debuffValue(u,'healDown',stageClock),burn=fireTrails.filter(f=>f.side!==u.side&&TFT.fireContains(f,u,stageClock)).length;
  const value=fmt(u.hp)+' / '+fmt(u.maxHp)+(u.finalFlameUntil?' · 🔥 อมตะ '+Math.max(0,u.finalFlameUntil-stageClock).toFixed(1)+'s':'')+(burn?' · 🔥 ×'+burn:'')+(antiHeal?' · ฮีล −'+Math.round(antiHeal*100)+'%':'')+(u.shield?' · โล่ '+fmt(u.shield):'')+(frozen?' · ❄ '+(Math.ceil((u.freezeUntil-stageClock)*10)/10).toFixed(1)+'s':dotLeft?' · DOT '+dotLeft+' ครั้ง':'');
  if(u.values.textContent!==value)u.values.textContent=value;
 }
 const scene=trialContext;
 const progress=trialDotProgress(scene,stageClock);
 const busy=!!scene.error||!!scene.hero.castUntil||!!scene.active||scene.queue.length>0||shots.length>0||stageClock<scene.nextAt||progress.busy;
 $('trialNormal').disabled=busy||!scene.hero.alive||!!scene.hero.exhausted;
 $('trialSkill').disabled=busy||!scene.hero.alive||!!scene.hero.exhausted;
 $('trialHit').disabled=busy||!scene.hero.alive||!!scene.hero.exhausted;
 const h=combatHero(scene.hero);
 $('trialPassive').disabled=busy||!scene.hero.alive||!!scene.hero.exhausted||!(h.passive||h.guard||h.fireTrail||h.effect==='cloakshot');
 if($('trialRevive')){$('trialRevive').hidden=!h.passive?.finalFlameSeconds;$('trialRevive').disabled=busy||!scene.hero.alive||!!scene.hero.finalFlameUntil;$('trialRevive').textContent='🔥 ทดสอบคืนชีพ '+(scene.hero.reviveCount||0)+'/2';}
 $('trialNote').textContent=scene.hero.finalFlameSpent?'🔥 เพลิงสุดท้ายดับ · ตายถาวร':scene.hero.finalFlameUntil?'🔥 อมตะ '+Math.max(0,scene.hero.finalFlameUntil-stageClock).toFixed(1)+' วินาที · โจมตีและใช้สกิลได้':fireTrails.length?'🔥 ทางไฟ '+fireTrails.length+' เส้น · ซ้อนทับได้ · จางตามแนวบิน':progress.frozen?'❄ แช่แข็ง '+progress.frozen+' เป้าหมาย · เหลือ '+(Math.ceil(progress.seconds*10)/10).toFixed(1)+' วินาที':progress.pending?'คำสาปกำลังทำงาน · เหลือ '+progress.left+' ครั้งก่อนจบ'+(h.passive?.dotFreezeSeconds?'และแช่แข็ง':''):scene.note;
 const key=JSON.stringify(scene.events);
 if(scene.lastLog!==key){
  scene.lastLog=key;$('trialLog').innerHTML=scene.events.map(e=>'<div class="trial-event '+e.kind+'"><span>'+escapeText(e.name)+'</span><b>'+escapeText(e.label)+'</b></div>').join('');
 }
}
function queueTrial(mode){
 if(!trial||trial.hero.exhausted||trial.hero.castUntil||trial.error||trial.active||trial.queue.length||trial.shots.length||trial.clock<trial.nextAt||trialDotProgress(trial,trial.clock).busy)return;
 const h=combatHero(trial.hero);
 if(mode==='reviveTest'&&h.passive?.finalFlameSeconds){trial.queue=Array(Math.max(1,2-(trial.hero.reviveCount||0))).fill('lethal');}
 else if(mode==='passive'){
  if(h.effect==='explosion')trial.queue=['skill'];
  else if(h.passive?.reviveHp&&h.support?.reviveHp)trial.queue=['lethal','hit'];
  else if(h.support?.reviveHp){
   const fallen=trial.fighters.find(u=>u!==trial.hero&&u.alive&&!u.revivedByAlly);
   if(!fallen||(trial.hero.supportRevives||0)>=h.support.reviveLimit){trial.note='ใช้สิทธิ์ชุบชีวิตครบแล้ว · รีเซ็ตสนามเพื่อทดลองอีกครั้ง';withTrial(renderTrial);return;}
   fallen.hp=0;fallen.alive=false;fallen.node.style.opacity='.2';trial.queue=['skill'];
  }
  else if(h.fireTrail)trial.queue=['skill','skill'];
  else if(h.debuff?.healDown)trial.queue=['skill','healTest'];
  else if(h.passive?.magicGuard)trial.queue=['protect'];
  else if(h.passive?.aquaReviveHp)trial.queue=['lethal'];
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
  advanceFinalFlames();advanceTftShots(t);advanceDots();advanceFireTrails();
  if(TFT.isFrozen(actor,stageClock)){actor.walking=false;if(actor.castUntil)actor.castUntil+=t;renderTrial();return;}
  if(actor.castUntil){advanceExplosion(actor,false);renderTrial();return}
  if(!scene.active&&scene.queue.length&&stageClock>=scene.nextAt&&!shots.length)scene.active=scene.queue.shift();
  if(scene.active){
   const cmd=scene.active,target=enemies.find(u=>u.hp>0);
   if(cmd==='healTest'){
     if(target){const blocked=TFT.debuffValue(target,'healDown',stageClock);const result=TFT.healWeakest([target],1,()=>Math.min(400,target.maxHp-target.hp),stageClock);
      showHealing(result,target);scene.note='ทดลองฟื้นฟู · ลดฮีล '+Math.round(blocked*100)+'%';}
     scene.active=null;scene.nextAt=stageClock+.3;
    }else if(['hit','lethal','taunt','protect'].includes(cmd)){
    const dummy=target||enemies[0],victim=cmd==='protect'?fighters.find(u=>u!==actor&&u.damageType==='magic'&&u.hp>0):cmd==='taunt'?TFT.findTarget(dummy,fighters,stageClock):actor;
    if(victim&&victim.alive){
     if(cmd==='taunt')scene.note='AI เลือกเป้าหมาย: '+HEROES[victim.id].name;
     const power=cmd==='lethal'?Math.ceil((victim.hp+victim.shield+1)/(1-(combatHero(victim)?.passive?.damageReduction||0))):100;
     tftDamage(dummy,victim,power);
     if(cmd==='protect')scene.note='ทดลองให้เพื่อนเวทรับดาเมจ 100 หน่วย';
     else if(cmd!=='taunt')scene.note=cmd==='lethal'?'ทดลองรับดาเมจจน HP เหลือ 0':'รับการโจมตีพื้นฐาน 100 หน่วย';
    }
    scene.active=null;scene.nextAt=stageClock+.55;
   }else if(!target||!actor.alive){
    scene.active=null;scene.queue=[];scene.note='รีเซ็ตสนามเพื่อทดลองใหม่';
   }else if(actor.cloakUntil<=stageClock){
    const close=TFT.pursue(actor,target,h,t,'ally').inRange;
    if(close){
     actor.walking=false;
     actor.attacks=0;
     tftAttack(actor,target,cmd==='skill');
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
 for(const id of ['trialNormal','trialSkill','trialPassive','trialHit','trialRevive'])if($(id))$(id).disabled=true;
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
 trial=null;$('trialModal').hidden=true;$('trialUnits').replaceChildren();$('trialFx').replaceChildren();$('trialArena').querySelector('.fire-ground-layer')?.replaceChildren();
 if(trialReturnFocus?.isConnected)trialReturnFocus.focus();trialReturnFocus=null;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-trial-hero]');if(b){e.preventDefault();openTrial(b.dataset.trialHero)}});
$('trialHero').addEventListener('change',resetTrial);$('trialCount').addEventListener('change',resetTrial);$('trialStars').addEventListener('change',resetTrial);
$('trialReset').addEventListener('click',resetTrial);$('trialClose').addEventListener('click',closeTrial);$('trialOverlay').addEventListener('click',closeTrial);
for(const [id,mode] of [['trialNormal','normal'],['trialSkill','skill'],['trialPassive','passive'],['trialHit','hit'],['trialRevive','reviveTest']])$(id)?.addEventListener('click',()=>queueTrial(mode));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('trialModal').hidden){e.preventDefault();e.stopImmediatePropagation();closeTrial()}});
if(typeof ResizeObserver==='function')new ResizeObserver(()=>{if(trial){trial.size={width:$('trialArena').clientWidth,height:$('trialArena').clientHeight};withTrial(()=>{renderTrial();for(const shot of shots)positionShot(shot);for(const f of fireTrails)positionFireTrail(f)})}}).observe($('trialArena'));
function refreshUpgradePicker(){
 const picker=$('upgradePicker');if(!picker)return;
 const all=IDS.filter(id=>state.owned[id]&&!CORE.isMaxHero(state.owned[id])),eligible=filterHeroes(all,'Upgrade');
 if($('filterCountUpgrade'))$('filterCountUpgrade').textContent='พบ '+eligible.length+' / '+all.length+' ตัวที่ยังไม่ MAX';
 const ids=eligible.includes(selected)?eligible:[selected,...eligible].filter(id=>HEROES[id]);
 picker.innerHTML=ids.map(id=>'<option value="'+id+'"'+(id===selected?' selected':'')+'>'+HEROES[id].rarity+' · '+(state.favorites.includes(id)?'★ ':'')+escapeText(HEROES[id].name)+(CORE.isMaxHero(state.owned[id])?' · MAX':state.owned[id]?' · Lv.'+state.owned[id].level:' · ล็อก')+'</option>').join('');
 picker.disabled=!eligible.length;
}
function searchUpgrade(){
 const eligible=filterHeroes(IDS.filter(id=>state.owned[id]&&!CORE.isMaxHero(state.owned[id])),'Upgrade');
 if(eligible.length&&!eligible.includes(selected))choose(eligible[0]);
 refreshUpgradePicker();
 $('heroDetails').hidden=!eligible.length;
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
 if(name==='upgrade'){const eligible=filterHeroes(IDS.filter(id=>state.owned[id]&&!CORE.isMaxHero(state.owned[id])),'Upgrade');if(eligible.length&&!eligible.includes(selected))choose(eligible[0]);$('heroDetails').hidden=false;renderSelected();refreshUpgradePicker()}
 if(name==='summon'){renderSummonPool();if(!summonBusy)showSummonBanner();updateSummonWallet()}
 next.hidden=false;document.body.classList.add('management-open');
 next.querySelector('.panel-close').focus();
}
const picker=el('select',{id:'upgradePicker','aria-label':'เลือกฮีโร่ที่จะเสริมแกร่ง'});
$('heroDetails').before(picker);
createHeroFilters('Collection',$('heroList'),'collection',()=>{heroPage=0;renderHeroes()});
$('heroFavoritesToggle').addEventListener('click',()=>{favoritesOnly=!favoritesOnly;heroPage=0;renderHeroes()});
createHeroFilters('Upgrade',picker,'upgrade',searchUpgrade);
createHeroFilters('Exchange',$('exchangeList'),'exchange',renderExchange);
createHeroFilters('Summon',$('summonPool'),'summon',()=>{summonPage=0;renderSummonPool()});
$('summonPrevPage').addEventListener('click',()=>{summonPage--;renderSummonPool()});
$('summonNextPage').addEventListener('click',()=>{summonPage++;renderSummonPool()});
$('heroPrevPage').addEventListener('click',()=>{heroPage=Math.max(0,heroPage-1);renderHeroes()});
$('heroNextPage').addEventListener('click',()=>{heroPage++;renderHeroes()});
picker.addEventListener('change',()=>{choose(picker.value);refreshUpgradePicker()});
document.querySelectorAll('[data-open-panel]').forEach(button=>button.addEventListener('click',()=>openManagement(button.dataset.openPanel,button)));
const collectionDisclosure=$('collectionDisclosure'),collectionShortcut=$('collectionShortcut');
if(collectionDisclosure&&collectionShortcut){
 collectionDisclosure.addEventListener('toggle',()=>collectionShortcut.setAttribute('aria-expanded',String(collectionDisclosure.open)));
 collectionShortcut.addEventListener('click',()=>{
  collectionDisclosure.open=true;collectionShortcut.setAttribute('aria-expanded','true');
  collectionDisclosure.scrollIntoView({block:'nearest',behavior:'auto'});
 });
}
document.querySelectorAll('[data-close-panel]').forEach(button=>button.addEventListener('click',closeManagement));
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!trial&&managementPanel&&$('skillModal').hidden&&$('rewardModal').hidden){e.preventDefault();closeManagement()}
});
$('heroList').addEventListener('click',e=>{
 const favorite=e.target.closest('[data-favorite-hero]');
 if(favorite){const id=favorite.dataset.favoriteHero;if(!HEROES[id])return;const was=state.favorites.includes(id);state.favorites=was?state.favorites.filter(x=>x!==id):[...state.favorites,id];save();renderHeroes();refreshUpgradePicker();toast(was?'☆ นำออกจากตัวโปรดแล้ว':'★ ตั้ง '+HEROES[id].name+' เป็นตัวโปรดแล้ว');return;}
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
  openSkill(n.dataset.inspectId,n.dataset.inspectSide==='enemy'?'enemy':'hero',enemies.find(u=>u.node===n));
 });
 layer.addEventListener('keydown',e=>{
  if(e.key!=='Enter'&&e.key!==' ')return;
  const n=e.target.closest('[data-inspect-id]');if(!n)return;
  e.preventDefault();openSkill(n.dataset.inspectId,n.dataset.inspectSide==='enemy'?'enemy':'hero',enemies.find(u=>u.node===n));
 });
}
for(const host of [$('heroDetails'),$('skillModalContent')])host.addEventListener('click',e=>{
 const b=e.target.closest('[data-costume-hero]');if(b&&!b.disabled)selectCostume(b.dataset.costumeHero,b.dataset.costumeId);
});
$('closeSkillBtn').addEventListener('click',closeSkill);
$('skillModal').querySelector('.modal-overlay').addEventListener('click',closeSkill);
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!trial&&!$('skillModal').hidden){e.preventDefault();closeSkill()}
});
$('autoTeamBtn').addEventListener('click',autoTeam);
$('exchangeDetails').addEventListener('toggle',()=>{if($('exchangeDetails').open)renderExchange()});
$('exchangeList').addEventListener('click',e=>{
 const btn=e.target.closest('[data-exchange-hero]');if(!btn||summonBusy)return;
 const id=btn.dataset.exchangeHero,offer=CORE.exchangeOffer(state,HEROES,id);
 if(!offer||state.universalShards<offer.cost)return;
 if(!window.confirm('ใช้เศษรวม '+offer.cost+' ชิ้น เพื่อ '+(offer.kind==='unlock'?'ปลดล็อก ':'แลกชิ้นส่วน ×'+offer.amount+' ของ ')+HEROES[id].name+'?'))return;
 const result=CORE.exchangeHero(state,HEROES,id);if(!result)return;
 save();renderPanels();renderExchange();toast('🧩 แลก '+HEROES[id].name+' สำเร็จ');
});
$('summonOneBtn').addEventListener('click',()=>summon(1));
$('summonTenBtn').addEventListener('click',()=>summon(10));
$('summonHundredBtn').addEventListener('click',()=>summon(100));
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
$('farmMode').addEventListener('change',()=>{
 if(dungeon||studioMode)return;
 state.farmMode=$('farmMode').value;
 if(farming())state.farmStages[state.mode]=CORE.farmMaxStage(state);
 syncFarmRecords();if(state.farmMode==='smart')state.farmStages[state.mode]=CORE.smartFarmStage(state,farmRecords);
 waveCount=0;beginTravel(.8);renderPanels();save();
});
$('farmStage').addEventListener('change',()=>{
 if(dungeon||state.farmMode!=='manual')return;
 state.farmStages[state.mode]=CORE.clampFarmStage(state,Number($('farmStage').value));
 waveCount=0;beginTravel(.8);renderPanels();save();
});
$('farmGoal').addEventListener('change',()=>{
 if(dungeon||state.farmMode!=='smart')return;
 state.farmGoal=$('farmGoal').value;state.farmStages[state.mode]=CORE.smartFarmStage(state,farmRecords);
 waveCount=0;beginTravel(.8);renderPanels();save();
});
$('autoBossBtn').addEventListener('click',()=>{
 if(farming()||dungeon)return;
 state.autoBoss=!state.autoBoss;updateResources();save();
 toast(state.autoBoss?'🔄 เรียกบอสอัตโนมัติ ON':'⏸ เรียกบอสอัตโนมัติ OFF');
});
function enterDungeon(){
 if(studioMode||dungeon)return;
 const kind=$('dungeonType').value,stage=Number($('dungeonTier').value);
 if(!CORE.canEnterDungeon(state,kind,stage,HEROES))return;
 const tier=CORE.dungeonTiers(state,HEROES).find(t=>t.stage===stage).tier;
 dungeon={kind,stage,tier,wins:0,earned:0,spent:0,paid:false};formationMode=false;state.autoBattle=true;
 beginTravel(.2);spawnDungeonBoss();save();if(managementPanel?.id==='panel-dungeon')closeManagement();
}
function spawnDungeonBoss(){
 if(!dungeon||combat||enemies.length)return;
 if(!CORE.payDungeonEntry(state,dungeon.kind,dungeon.stage,HEROES)){
  dungeon=null;beginTravel(.8);renderPanels();save();toast('💎 รูบี้ไม่พอ · หยุดฟาร์มดันเจี้ยน');return;
 }
 dungeon.paid=true;dungeon.spent+=CORE.DUNGEON_ENTRY_COST;save();
 bossTime=45;spawnMonster(true,[2,1],true,dungeon.kind==='gold'?'asuna':'sinon');
 $('battleMessage').textContent='✦ '+dungeonName(dungeon.kind)+' · ระดับ '+dungeon.tier+' · รอบ '+(dungeon.wins+1);updateResources();
}
function finishDungeon(success,cancel=false){
 const d=dungeon;if(!d)return;
 dungeon=null;
 const amount=success&&d.paid?CORE.claimDungeon(state,d.kind,d.stage,HEROES):0;d.paid=false;
 if(amount&&state.dungeonRepeat&&CORE.canEnterDungeon(state,d.kind,d.stage,HEROES)){d.wins++;d.earned+=amount;dungeon=d;log('🏆 '+dungeonName(d.kind)+' รอบ '+d.wins+' · +'+fmt(amount));save();beginTravel(.8);$('battleMessage').textContent='✦ ชนะรอบ '+d.wins+' · เตรียมฟาร์มรอบต่อไป';return;}
 const message=amount?'🏆 '+dungeonName(d.kind)+' สำเร็จ! +'+fmt(amount)+' '+(d.kind==='gold'?'Gold':'EXP')+(state.dungeonRepeat&&state.rubies<CORE.DUNGEON_ENTRY_COST?' · รูบี้ไม่พอรอบถัดไป':''):cancel?'ออกจากดันเจี้ยน · ไม่คืนค่าเข้ารอบที่เริ่มแล้ว':success?'รางวัลไม่พร้อมใช้งาน · กลับด่านหลัก':'ดันเจี้ยนยังไม่ผ่าน · หยุดฟาร์ม ลองระดับที่ง่ายลงได้';
 log(message);save();beginTravel(.8);renderPanels();toast(message);
}
$('dungeonRepeat').addEventListener('change',()=>{state.dungeonRepeat=$('dungeonRepeat').checked;renderDungeonControls();save();});
$('dungeonType').addEventListener('change',renderDungeonControls);
$('dungeonTier').addEventListener('change',renderDungeonControls);
$('enterDungeonBtn').addEventListener('click',enterDungeon);
function switchMode(mode){
 if(studioMode||mode==='nightmare'&&!CORE.nightmareUnlocked(state))return;
 if(dungeon){if(!confirm('ออกจากดันเจี้ยน? ไม่คืนค่าเข้ารอบที่เริ่มแล้ว'))return;finishDungeon(false,true);}
 if(state.mode===mode)return;
 state.mode=mode;syncFarmRecords();if(state.farmMode==='smart')state.farmStages[state.mode]=CORE.farmMaxStage(state);waveCount=0;beginTravel(.8);renderPanels();save();
 toast(mode==='nightmare'?'☾ Nightmare · ฟาร์ม ×2':'กลับสู่ Normal');
}
$('normalModeBtn').addEventListener('click',()=>switchMode('normal'));
$('nightmareModeBtn').addEventListener('click',()=>switchMode('nightmare'));
$('challengeBtn').addEventListener('click',()=>{
 if(dungeon){if(confirm('ออกจากดันเจี้ยน? รางวัลที่รับแล้วไม่หาย แต่ไม่คืนค่าเข้ารอบที่เริ่มแล้ว'))finishDungeon(false,true);return;}
 const p=run();if(farming()||!CORE.canChallengeStage(p,HEROES)||p.kills<CORE.killsNeeded(p.stage)||combat?.boss)return;
 p.bossRetryWaves=0;
 beginTravel(.2);spawnBossEncounter();updateResources();save();
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
  dragGhost.innerHTML='<img src="'+heroImages(drag.id).idle+'" alt=""><span>'+escapeText(HEROES[drag.id].name)+'</span>';
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
$('resetAccountBtn')?.addEventListener('click',()=>{
 if(studioMode)return;
 if(!window.confirm('รีไอดีและเริ่มใหม่ทั้งหมด? ตัวละคร เลเวล ดาว ทรัพยากร และความคืบหน้าเดิมจะถูกลบถาวร ไอดีใหม่จะได้รับตั๋วสุ่ม 100 ใบ'))return;
 if(!window.confirm('ยืนยันลบเซฟในเบราว์เซอร์นี้ถาวร และเริ่มไอดีใหม่?'))return;
 const fresh=CORE.initial();
 fresh.accountEpoch=String(Date.now())+'-'+Math.random().toString(36).slice(2);
 try{
  localStorage.setItem(CORE.KEY,JSON.stringify(fresh));
 }catch(error){toast('ไม่สามารถบันทึกไอดีใหม่ได้ · เซฟเดิมยังไม่ถูกลบ');return;}
 suppressSave=true;location.reload();
});
window.addEventListener('storage',e=>{
 if(studioMode||e.key!==CORE.KEY||!e.newValue)return;
 const other=safe(()=>JSON.parse(e.newValue),null);
 if(other?.version===1&&(other.accountEpoch||'')!==state.accountEpoch){suppressSave=true;location.reload();}
});
$('offlineBtn').addEventListener('click',()=>{if(managementPanel?.id==='panel-guide')closeManagement();openOffline()});
$('claimOfflineBtn').addEventListener('click',claimOffline);
$('closeOfflineBtn').addEventListener('click',closeOffline);
$('rewardModal').querySelector('.modal-overlay').addEventListener('click',closeOffline);
window.addEventListener('beforeunload',save);
document.addEventListener('visibilitychange',()=>{if(document.hidden){save();lastFrame=0;}});
renderPanels();log('✨ สนาม AUTOCHEST 6×7 พร้อมสู้แบบ Idle แล้ว');
beginTravel(1.8);save();
if(floorResetGift&&!studioMode){log('🎁 อัปเดตชั้นใหม่: กลับด่าน 1 · ตั๋วสุ่ม +100 ใบ');toast('🎁 ตั๋วสุ่ม +100 ใบ! ตัวละครและทรัพยากรเดิมยังอยู่ครบ');}
window.__AUTOCHEST_IDLE_READY__=true;
if(pending.minutes>0)openOffline();
refreshArenaSize();
if(typeof ResizeObserver==='function')new ResizeObserver(refreshArenaSize).observe($('stageViewport'));
else window.addEventListener('resize',refreshArenaSize);
if(VFX){VFX.preload(HEROES);VFX.loadPublished().then(()=>VFX.preload(HEROES))}
if(studioMode){document.body.classList.add('studio-trial-mode');openTrial(studioTrialId)}
// Decode sprites before their first attack so changing pose is not a network stall.
for(const hero of Object.values(HEROES))for(const url of new Set([hero.images.idle,hero.images.attack])){const img=new Image();img.src=url;img.decode?.().catch(()=>{});}
loadCostumeAssets().catch(error=>console.warn('Costume asset check:',error));
requestAnimationFrame(frame);
})();
