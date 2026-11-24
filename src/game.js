(()=>{'use strict';
const $=id=>document.getElementById(id), canvas=$('battlefield'), ctx=canvas.getContext('2d');
const W=760,H=775,COLS=6,ROWS=7,SX=94,SY=89,OX=104,OY=108;
const roster=window.AUTOCHEST_CHARACTERS;
if(!roster)throw new Error('Character roster not loaded. Check src/characters.js');
const TYPES=roster.HEROES, ENEMY=TYPES; // One hero registry for both teams
if(Object.keys(TYPES).length===0)throw Error('No heroes loaded; check character script order');
// Art is rendered as <img> in the UI, PNG model images in Canvas, GIF models in a DOM overlay.
const imageCache=new Map();
const gifNodes=new Map(),gifLayer=$('animatedSprites');
const gifDrawList=[];
const isGif=src=>/\.gif(?:[?#]|$)/i.test(src||'');
const assetFor=(data,slot='idle')=>data.images?.[slot]||data.images?.idle||data.portrait;
function getPng(src){
 if(!src||isGif(src))return null;
 if(!imageCache.has(src)){const im=new Image();im.decoding='async';im.src=src;imageCache.set(src,im)}
 return imageCache.get(src);
}
// Load only models currently on the field, instead of eagerly decoding 100+ heroes.
const portraitTag=(data,slot='art')=>`<img class="hero-portrait" src="${assetFor(data,slot)}" alt="" draggable="false" loading="lazy" decoding="async">`;
function syncGifSprites(entries){
 const visible=new Set();
 for(const entry of entries){
  visible.add(entry.key);
  let node=gifNodes.get(entry.key);
  if(!node){node=document.createElement('img');node.className='animated-sprite';node.alt='';node.draggable=false;node.decoding='async';gifLayer.append(node);gifNodes.set(entry.key,node)}
  if(node.getAttribute('src')!==entry.src)node.setAttribute('src',entry.src);
  node.style.left=(entry.x/W*100)+'%';node.style.top=(entry.y/H*100)+'%';
  node.style.width=(entry.w/W*100)+'%';node.style.height=(entry.h/H*100)+'%';
  node.style.transform=`translateX(-50%) scaleX(${entry.face}) rotate(${entry.rotation}rad)`;
  node.style.opacity=String(entry.opacity);
  node.style.filter=entry.flash?'brightness(1.55)':'';
  node.style.zIndex=String(Math.floor(entry.y));
 }
 for(const [key,node] of gifNodes){if(!visible.has(key)){node.remove();gifNodes.delete(key)}}
}

let wave=1,gold=12,wins=0,units=[],shop=[],selected=null,uid=1,phase='prep',speed=1,combat=[],bullets=[],fx=[],floaters=[],timeLeft=0,roundResult='',elapsed=0,shake=0,bgtime=0,last=0,messages=[],combatCount=0;
let gesture=null,hoverCell=null,toastTimer=null;const landings=new Map();
const rand=(a,b)=>Math.random()*(b-a)+a,ri=n=>Math.floor(Math.random()*n),clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),pos=(c,r)=>({x:OX+c*SX,y:OY+r*SY});
const money=n=>`${n} G`;const limit=()=>Math.min(8,4+Math.floor((wave-1)/3));
function addLog(s){messages.unshift(s);messages=messages.slice(0,6);$('log').innerHTML=messages.map(x=>'<div>'+x+'</div>').join('')}
function newUnit(kind,board=false,col=-1,row=-1,lv=1){return{id:uid++,kind,board,col,row,lv}}
function roll(free=false){if(phase!=='prep')return;if(!free){if(gold<2)return;gold-=2;}let keys=Object.keys(TYPES),weights=keys.map(k=>TYPES[k].cost===1?4:TYPES[k].cost===2?3:2);let pool=keys.flatMap((k,i)=>Array(weights[i]).fill(k));shop=Array.from({length:4},()=>pool[ri(pool.length)]);renderUI()}
function refreshCount(){return units.filter(u=>u.board).length}
function purchase(i){if(phase!=='prep'||!shop[i])return;let kind=shop[i],t=TYPES[kind];if(gold<t.cost){setTip('🪙 เงินไม่พอสำหรับยูนิตนี้');return}if(units.filter(u=>!u.board).length>=9){setTip('ม้านั่งเต็มแล้ว ย้ายยูนิตลงสนามก่อน');return}gold-=t.cost;let u=newUnit(kind);units.push(u);selected=u.id;shop[i]=null;fuse(kind);renderUI();if(inspection?.kind===kind&&!modal.hidden){inspection.unitId=selected;inspection.shopIndex=null;renderHeroModal()}addLog('รับสมัคร '+t.e+' '+t.name+' แล้ว');toast('✦ รับสมัคร '+t.name+' แล้ว');const b=$('bench').querySelector(`[data-unit="${selected}"]`);if(b)b.classList.add('recent-purchase')}
function fuse(kind){let changed=true;while(changed){changed=false;for(let lv=1;lv<=2;lv++){let matches=units.filter(u=>u.kind===kind&&u.lv===lv);if(matches.length>=3){let keep=matches.find(u=>u.board)||matches[0];for(let kill of matches.filter(x=>x!==keep).slice(0,2))units=units.filter(u=>u.id!==kill.id);keep.lv++;selected=keep.id;changed=true;burst(keep.board?pos(keep.col,keep.row).x:380,keep.board?pos(keep.col,keep.row).y:700,'#ffde8b',22);addLog('⭐ '+TYPES[kind].name+' อัปเกรดเป็น '+keep.lv+' ดาว!');break}}}}
function setTip(s){$('tip').textContent=s}
function toast(message,warning=false){const el=$('toast');el.textContent=message;el.className='toast show'+(warning?' warn':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.className='toast'},2100)}
function snapFeedback(u){const p=pos(u.col,u.row);landings.set(u.id,bgtime+.52);waveFX(p.x,p.y,'#8affd9',75);burst(p.x,p.y,'#98ffe6',12)}
function rejectDrop(message){setTip(message);toast(message,true)}
function place(c,r){
 if(phase!=='prep')return false;
 if(r<4||c<0||c>=COLS||r>=ROWS){rejectDrop('ช่องนี้เป็นเขตศัตรู • วางฮีโร่ได้เฉพาะ 3 แถวล่าง');return false}
 const s=units.find(u=>u.id===selected),old=units.find(u=>u.board&&u.col===c&&u.row===r);
 if(!s){rejectDrop('เลือกฮีโร่จากม้านั่งหรือจากบนสนามก่อนนะ');return false}
 if(old&&old.id===s.id){renderUI();return true}
 if(old){
   if(s.board){const oc=s.col,or=s.row;s.col=c;s.row=r;old.col=oc;old.row=or;snapFeedback(old)}
   else{old.board=false;old.col=-1;old.row=-1;s.board=true;s.col=c;s.row=r}
   snapFeedback(s);toast('✦ สลับตำแหน่งทีมแล้ว');
 }else{
   if(!s.board&&refreshCount()>=limit()){rejectDrop('สนามเต็มแล้ว • เพิ่มจำนวนทีมเมื่อผ่านเวฟถัดไป');return false}
   s.board=true;s.col=c;s.row=r;snapFeedback(s);toast('✦ จัดวาง '+TYPES[s.kind].name+' สำเร็จ');
 }
 renderUI();return true
}
function removeSelected(){
 if(phase!=='prep')return false;
 const u=units.find(u=>u.id===selected);
 if(!u||!u.board)return false;
 if(units.filter(u=>!u.board).length>=9){rejectDrop('ม้านั่งสำรองเต็มแล้ว');return false}
 u.board=false;u.col=-1;u.row=-1;toast('↩ เก็บ '+TYPES[u.kind].name+' กลับม้านั่ง');renderUI();return true
}

const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let inspection=null,lastModalFocus=null,holdTimer=null;
const CODEX_PAGE_SIZE=12;
let codexState={query:'',team:'all',cost:'all',owned:false,page:0};
const modal=$('heroModal'), modalBody=$('heroModalContent');
function skillDetails(t){
  const hits=t.triggerEvery||4;
  switch(t.effect){
   case 'slash': return ['โจมตีเป้าหมายหลักแรง 200% ของ ATK พร้อมเอฟเฟกต์คลื่นดาบ','สามารถติดคริติคอลตามอัตราของฮีโร่ได้'];
   case 'chain': return ['โจมตีเชื่อมต่อศัตรูใกล้เคียง '+(t.chainTargets||3)+' เป้าหมาย','แต่ละเป้าหมายได้รับ '+Math.round((t.chainPower||1.12)*100)+'% ATK (แทนการโจมตีปกติครั้งนั้น)'];
   case 'triple': return ['ยิงเป้าหมายหลักแรง 200% ATK และยิงเสริมอีก 2 นัด นัดละ 85% ATK','กระสุนเสริมเลือกเป้าหมายอื่นได้ และคำนวณคริเป็นรายนัด'];
   case 'shield': return ['ได้รับโล่เท่ากับ 30% ของ HP สูงสุด','โจมตีเป้าหมายหลักแรง 200% ATK'];
   case 'blink': return ['เคลื่อนที่ฉับพลันไปใกล้เป้าหมาย','โจมตี 200% ATK ตามด้วยการโจมตีเสริม 50% ATK'];
   case 'slam': return ['โจมตีพื้นที่รอบเป้าหมายในรัศมี 140 หน่วย','ศัตรูที่อยู่ในพื้นที่ได้รับ 180% ATK ต่อเป้าหมาย'];
   default: return ['โจมตีและใช้ทักษะอัตโนมัติตามระบบต่อสู้'];
  }
}

function filteredCodex(){
 const q=codexState.query.trim().toLocaleLowerCase();
 const owned=new Set(units.map(u=>u.kind));
 return Object.values(TYPES).filter(h=>{
  if(codexState.team!=='all'&&h.team!==codexState.team)return false;
  if(codexState.cost!=='all'&&h.cost!==Number(codexState.cost))return false;
  if(codexState.owned&&!owned.has(h.id))return false;
  if(!q)return true;
  return [h.id,h.name,h.subtitle,h.team,h.skill,...(h.traits||[])].join(' ').toLocaleLowerCase().includes(q);
 }).sort((a,b)=>a.cost-b.cost||a.name.localeCompare(b.name,'th'));
}
function renderCodexResults(){
 if(modal.hidden||!inspection)return;
 const target=$('heroRosterGrid'),counter=$('heroRosterMeta'),previous=$('heroRosterPrev'),next=$('heroRosterNext');
 if(!target||!counter||!previous||!next)return;
 const all=filteredCodex();
 const pages=Math.max(1,Math.ceil(all.length/CODEX_PAGE_SIZE));
 codexState.page=Math.max(0,Math.min(codexState.page,pages-1));
 const start=codexState.page*CODEX_PAGE_SIZE;
 const subset=all.slice(start,start+CODEX_PAGE_SIZE);
 const owned=new Set(units.map(u=>u.kind));
 target.innerHTML=subset.map(h=>
  '<button type="button" class="hero-roster-pick'+(h.id===inspection.kind?' selected':'')+'" data-modal-hero="'+escapeHtml(h.id)+'" aria-label="ดู '+escapeHtml(h.name)+'" title="'+escapeHtml(h.name)+'">'+
    '<img src="'+escapeHtml(assetFor(h,'art'))+'" alt="" loading="lazy" decoding="async">'+
    '<span>'+escapeHtml(h.name)+'</span>'+
    (owned.has(h.id)?'<small>★ มีแล้ว</small>':'<small>'+escapeHtml(h.cost)+' Gold</small>')+
  '</button>'
 ).join('')||'<div class="hero-roster-empty">ไม่พบฮีโร่ที่ตรงกับเงื่อนไข ลองเปลี่ยนคำค้นหรือประเภทนะ</div>';
 counter.textContent=all.length+' / '+Object.keys(TYPES).length+' ตัว · หน้า '+(codexState.page+1)+' / '+pages;
 previous.disabled=codexState.page<=0;
 next.disabled=codexState.page>=pages-1;
}

function openHero(kind,unitId=null,shopIndex=null,fighter=null){
 if(!TYPES[kind])return;
 if(modal.hidden)codexState={query:'',team:'all',cost:'all',owned:false,page:0};
 lastModalFocus=modal.hidden?document.activeElement:lastModalFocus;
 inspection={kind,unitId,shopIndex,fighter};
 modal.hidden=false;
 renderHeroModal();
 $('closeHeroModal').focus();
}
function closeHero(){
 if(modal.hidden)return;
 modal.hidden=true;inspection=null;
 if(lastModalFocus?.isConnected&&lastModalFocus.focus)lastModalFocus.focus();
 lastModalFocus=null;
}
function renderHeroModal(){
 if(!inspection||modal.hidden)return;
 const {kind,unitId,fighter}=inspection,t=TYPES[kind];
 if(!t){closeHero();return}
 const u=unitId!=null?units.find(v=>v.id===unitId):null;
 const level=u?.lv||fighter?.lv||1;
 const hpMult=level===3?2.8:level===2?1.72:1,atkMult=level===3?2.25:level===2?1.5:1;
 const hp=fighter?fighter.maxHp:t.hp*hpMult,atk=fighter?fighter.atk:t.dmg*atkMult;
 const entry=phase==='prep'?shop.findIndex(x=>x===kind):-1;
 const purchasable=entry>=0&&gold>=t.cost&&units.filter(v=>!v.board).length<9;
 const canShop=entry>=0;
 const selectedPosition=u?'ฮีโร่ที่มี · '+level+' ดาว':fighter?'ศัตรู · เวฟ '+wave:canShop?'อยู่ในร้านค้า':'ข้อมูลพื้นฐาน · 1 ดาว';
 const skillLines=skillDetails(t).map(s=>'<li>'+escapeHtml(s)+'</li>').join('');
 const stats=[
  ['HP',Math.round(hp).toLocaleString('en-US')],['ATK',Math.round(atk).toLocaleString('en-US')],
  ['โจมตีทุก',t.cool.toFixed(2)+' วิ'],['โจมตี/วินาที',(1/t.cool).toFixed(2)],
  ['ระยะโจมตี',t.range.toFixed(2)+' ช่อง'],['ความเร็วเดิน',String(t.move)],
  ['คริติคอล',Math.round((t.critChance||0)*100)+'%'],
  ['ดาเมจคริ',t.critChance?'×'+(t.critDamage||1.5).toFixed(2):'—']
 ].map(([k,v])=>'<div class="hero-detail-stat"><small>'+escapeHtml(k)+'</small><strong>'+escapeHtml(v)+'</strong></div>').join('');
 const purchaseMarkup=canShop?
  '<button class="hero-modal-buy" data-modal-buy="'+entry+'" type="button" '+(purchasable?'':'disabled')+'>✦ ซื้อ '+t.name+' — '+t.cost+' G</button>':
  '<span class="hero-modal-note">'+(u?'มีฮีโร่ตัวนี้แล้ว':'ดูข้อมูลได้ทุกเวลา')+'</span>';
 const teamChoices=['all','นักรบ','เวท','ยิงไกล','ป้องกัน'].map(k=>
   '<option value="'+escapeHtml(k)+'"'+(codexState.team===k?' selected':'')+'>'+(k==='all'?'ทุกสาย':escapeHtml(k))+'</option>').join('');
 const costChoices=['all','1','2','3'].map(k=>
   '<option value="'+k+'"'+(codexState.cost===k?' selected':'')+'>'+(k==='all'?'ทุกราคา':k+' Gold')+'</option>').join('');
 modalBody.innerHTML='<div class="hero-modal-eyebrow">✦ HERO INTELLIGENCE / '+escapeHtml((t.cost===3?'EPIC':t.cost===2?'RARE':'COMMON'))+'</div>'+
  '<div class="hero-modal-heading"><h2 id="heroModalTitle">'+escapeHtml(t.name)+'</h2><span>'+escapeHtml(t.subtitle||'')+'</span></div>'+
  '<div class="hero-modal-top">'+
   '<div class="hero-modal-art" style="--hero-accent:'+escapeHtml(t.col||'#79e6dc')+'">'+portraitTag(t,'art')+'</div>'+
   '<div class="hero-modal-info"><div class="hero-modal-tags"><span>'+escapeHtml(t.team)+'</span><span>'+escapeHtml(selectedPosition)+'</span>'+
    (t.traits||[]).map(x=>'<span>'+escapeHtml(x)+'</span>').join('')+'</div>'+
    '<div class="hero-modal-stats">'+stats+'</div>'+
   '</div></div>'+
  '<section class="hero-skill-panel"><div class="hero-modal-eyebrow">AUTO SKILL / อัตโนมัติ</div>'+
   '<h3>⚔ '+escapeHtml(t.skill||'สกิลประจำตัว')+'</h3>'+
   '<div class="skill-trigger">ใช้ทุก '+escapeHtml(t.triggerEvery||4)+' การโจมตี</div><ul>'+skillLines+'</ul>'+
   '<p>ความเสียหายคำนวณจาก ATK ปัจจุบันของตัวละคร และปรับตามดาวหรือสเกลฝ่ายศัตรู</p></section>'+
   '<div class="hero-modal-footer">'+purchaseMarkup+
    '<span class="hero-modal-note">แตะตัวอื่นในแถวล่างเพื่อเปรียบเทียบได้เลย</span></div>'+
   '<div class="hero-roster-label">📖 สารานุกรมฮีโร่ · ค้นหาได้ทุกตัว</div>'+
   '<div class="hero-codex-controls">'+
     '<label class="hero-codex-search"><span>ค้นหา</span><input type="search" data-codex-search placeholder="ชื่อฮีโร่ / สกิล / คุณสมบัติ" value="'+escapeHtml(codexState.query)+'" autocomplete="off"></label>'+
     '<label><span>สายอาชีพ</span><select data-codex-team>'+teamChoices+'</select></label>'+
     '<label><span>ราคา</span><select data-codex-cost>'+costChoices+'</select></label>'+
     '<label class="hero-codex-owned"><input type="checkbox" data-codex-owned '+(codexState.owned?'checked':'')+'> เฉพาะที่มี</label>'+
   '</div>'+
   '<div id="heroRosterGrid" class="hero-roster-strip"></div>'+
   '<div class="hero-roster-pagination"><button id="heroRosterPrev" type="button" data-codex-nav="-1" aria-label="หน้าก่อนหน้า">‹ ก่อนหน้า</button>'+
     '<span id="heroRosterMeta" aria-live="polite"></span>'+
     '<button id="heroRosterNext" type="button" data-codex-nav="1" aria-label="หน้าถัดไป">ถัดไป ›</button></div>';
 renderCodexResults();
}
function clearHold(){if(holdTimer!==null){clearTimeout(holdTimer);holdTimer=null}}
function openCodex(){openHero(inspection?.kind||'asuna')}

function renderInspector(){
 const target=$('unitDetails'),u=units.find(v=>v.id===selected);
 if(!u){target.innerHTML='<div class="no-selection">✦ แตะฮีโร่ในสนามหรือบนม้านั่งเพื่อดูข้อมูล</div>';return}
 const t=TYPES[u.kind],mult=u.lv===3?2.8:u.lv===2?1.72:1,damage=u.lv===3?2.25:u.lv===2?1.5:1;
 target.innerHTML=`<div class="inspector-row"><div class="inspector-avatar" style="--avatar:${t.col}">${portraitTag(t)}</div><div class="inspector-content"><strong>${t.name}</strong><span>${t.subtitle} • ${t.team}${t.traits?.length?' • '+t.traits.join(' + '):''} • ${u.board?'กำลังประจำสนาม':'ม้านั่งสำรอง'}</span><span class="inspector-stars">${'★'.repeat(u.lv)}${'☆'.repeat(3-u.lv)}</span></div></div><div class="inspector-stats"><div><small>HP</small><b>${Math.round(t.hp*mult)}</b></div><div><small>ATK</small><b>${Math.round(t.dmg*damage)}</b></div><div><small>RANGE</small><b>${t.range.toFixed(1)}</b></div></div>${t.critChance?`<div class="inspector-skill">⚡ โจมตี ${(1/t.cool).toFixed(2)} ครั้ง/วิ · 🎯 CRIT ${Math.round(t.critChance*100)}% · 💥 ×${t.critDamage.toFixed(2)}</div>`:''}<div class="inspector-skill">✦ สกิลอัตโนมัติ: <b>${t.skill}</b></div><button class="unit-details-more" data-inspect-owned="${u.id}" type="button">ⓘ ดูสเตตัสและสกิลทั้งหมด</button>`;
}
function renderUI(){
 $('gold').textContent=gold;$('wave').textContent=wave;$('record').textContent=wins;
 $('battleClock').textContent=String(wave).padStart(2,'0');$('unitCount').textContent=refreshCount()+' / '+limit();
 $('speedInfo').textContent='×'+speed;$('combatInfo').textContent=phase==='prep'?'พร้อมรบ':phase==='battle'?'กำลังสู้':roundResult;
 $('squadFill').style.width=Math.min(100,refreshCount()/limit()*100)+'%';
 $('phaseLabel').textContent=phase==='prep'?'◈ เตรียมจัดทัพ':phase==='battle'?'⚔️ กำลังต่อสู้อัตโนมัติ':roundResult.includes('ชนะ')?'✦ VICTORY!':'◈ DEFEAT';
 $('phaseSub').textContent=phase==='prep'?'ลากตัวละครลงสนาม หรือแตะเลือกเพื่อวาง':phase==='battle'?'ฮีโร่ของคุณเลือกเป้าหมายและใช้สกิลเอง':roundResult;
 $('startBtn').innerHTML=phase==='prep'?'<span class="button-symbol">⚔</span><span>เริ่มการต่อสู้</span><small>▶</small>':phase==='battle'?'<span>⚔ กำลังต่อสู้…</span>':'<span class="button-symbol">◉</span><span>ไปเวฟถัดไป</span><small>▶</small>';
 $('startBtn').disabled=phase==='battle'||(phase==='prep'&&refreshCount()===0);
 $('speedBtn').textContent='⏩ ×'+(speed===1?'2':'1');$('rollBtn').disabled=phase!=='prep'||gold<2;
 $('removeBtn').disabled=phase!=='prep'||!units.some(u=>u.id===selected&&u.board);
 $('benchN').textContent=units.filter(u=>!u.board).length+' / 9';
 $('prepHint').innerHTML=phase==='prep'?'<span class="live-dot"></span> ลากฮีโร่เพื่อวาง • ลากกลับม้านั่งเพื่อเก็บ':phase==='battle'?'<span class="live-dot"></span> ระบบต่อสู้ทำงานแบบอัตโนมัติ':'<span class="live-dot"></span> รับรางวัลแล้ว • เตรียมรอบใหม่';
 $('boardTooltip').textContent=phase==='prep'?'✦ ลากยูนิตมาวางหรือแตะช่องบนสนาม':phase==='battle'?'✦ ฮีโร่กำลังต่อสู้โดยอัตโนมัติ':'✦ กดไปเวฟถัดไปเพื่อจัดทีมใหม่';
 $('shop').innerHTML=shop.map((kind,i)=>{
   if(!kind)return '<div class="shopitem sold">✓ รับสมัครแล้ว</div>';
   const t=TYPES[kind],label=t.cost===3?'EPIC':t.cost===2?'RARE':'COMMON';
   return `<div class="shopitem rarity-r${t.cost}"><button class="shop-preview" data-inspect-shop="${i}" type="button" aria-label="ดูข้อมูล ${t.name} ก่อนซื้อ"><div class="card-top"><span class="rarity-label">✦ ${label}</span><span class="price">◈ ${t.cost} G</span></div><div class="card-main"><div class="card-art" style="--unit-color:${t.col}">${portraitTag(t)}</div><div class="card-info"><strong>${t.name}</strong><small>${t.traits?.length?t.traits.join(' + '):t.team}</small><small>${t.skill}</small></div></div><span class="shop-inspect-tag">ⓘ แตะเพื่อดูสกิล</span></button><button class="buy-chip shop-buy" data-shop="${i}" type="button" aria-label="ซื้อ ${t.name} ราคา ${t.cost} Gold" ${phase!=='prep'||gold<t.cost||units.filter(u=>!u.board).length>=9?'disabled':''}>✦ ซื้อ ${t.name} · ${t.cost} G</button></div>`;
 }).join('');
 const reserve=units.filter(u=>!u.board);
 $('bench').innerHTML=Array.from({length:9},(_,i)=>{
   const u=reserve[i];if(!u)return '<div class="bench-empty" aria-hidden="true"></div>';
   return `<button class="benchitem ${selected===u.id?'active':''}" data-unit="${u.id}" aria-label="${TYPES[u.kind].name} ${u.lv} ดาว กดค้างเพื่อลาก" title="${TYPES[u.kind].name} · ลากลงสนาม"><span class="bench-face">${portraitTag(TYPES[u.kind],'idle')}</span><span class="bench-stars">${'★'.repeat(u.lv)}</span></button>`;
 }).join('');
 const counts={};units.filter(u=>u.board).forEach(u=>counts[TYPES[u.kind].team]=(counts[TYPES[u.kind].team]||0)+1);
 const traits={นักรบ:'⚔️',เวท:'🔮',ยิงไกล:'🏹',ป้องกัน:'🛡️'};
 $('synergies').innerHTML=Object.keys(traits).map(n=>`<div class="trait ${(counts[n]||0)>=2?'on':''}"><span>${traits[n]} ${n}</span><b>${counts[n]||0} / 2 ${(counts[n]||0)>=2?'✦':''}</b></div>`).join('');
 renderInspector()
}

const ENEMY_SCALING=Object.freeze({
 hpBase:0.62,hpPerWave:0.13,atkBase:0.69,atkPerWave:0.10,
 model:0.94,bossHp:2.4,bossAtk:1.4,bossModel:1.65
});
let encounterWave=-1,encounterPlan=[];
function genEnemies(){
 if(encounterWave===wave && encounterPlan.length)return encounterPlan.map(u=>({...u}));
 const bosses=wave%3===0;
 const tier=Math.min(3,1+Math.floor((wave-1)/2));
 const eligible=Object.keys(TYPES).filter(k=>TYPES[k].cost<=tier);
 if(!eligible.length)throw Error('No eligible heroes for wave '+wave);
 const count=Math.min(8,bosses?2+Math.floor(wave/3):3+Math.floor(wave/2));
 const arr=[];
 if(bosses){
  const top=eligible.filter(k=>TYPES[k].cost===tier);
  const pool=top.length?top:eligible;
  arr.push({kind:pool[ri(pool.length)],side:'enemy',col:2,row:0,lv:1,boss:true});
 }
 const slots=[[0,1],[2,1],[4,1],[1,2],[3,2],[5,2],[0,2],[4,2]];
 const countRegular=bosses?Math.max(2,count-1):count;
 for(let i=0;i<countRegular;i++){
  const [col,row]=slots[i];
  arr.push({kind:eligible[ri(eligible.length)],side:'enemy',col,row,lv:1,boss:false});
 }
 encounterWave=wave;encounterPlan=arr;
 return arr.map(u=>({...u}));
}
function makeFighter(base,side,index){
 const t=TYPES[base.kind],p=pos(base.col,base.row);
 if(!t)throw Error('Unknown hero '+base.kind);
 const isBoss=side==='enemy'&&!!base.boss;
 const lvscale=side==='ally'?(base.lv===3?2.8:base.lv===2?1.72:1):1;
 const allyAttack=base.lv===3?2.25:base.lv===2?1.5:1;
 const hpScale=side==='enemy'?
  (ENEMY_SCALING.hpBase+(wave-1)*ENEMY_SCALING.hpPerWave)*(isBoss?ENEMY_SCALING.bossHp:1):lvscale;
 const atkScale=side==='enemy'?
  (ENEMY_SCALING.atkBase+(wave-1)*ENEMY_SCALING.atkPerWave)*(isBoss?ENEMY_SCALING.bossAtk:1):allyAttack;
 return {
  id:base.id||'e'+index,kind:base.kind,side,lv:base.lv||1,x:p.x,y:p.y,vx:0,vy:0,
  hp:t.hp*hpScale,maxHp:t.hp*hpScale,atk:t.dmg*atkScale,
  range:t.range,cool:t.cool,move:t.move,cooldown:rand(0,.5),
  attacks:0,shield:0,hitFlash:0,face:side==='ally'?-1:1,
  team:t.team||'',size:isBoss?32:20,isBoss,
  visualScale:side==='enemy'?(isBoss?ENEMY_SCALING.bossModel:ENEMY_SCALING.model):1,
  alive:true,anim:'idle',animUntil:0,motion:0,moving:false
 };
}
function startBattle(){if(phase==='result'){wave++;phase='prep';roundResult='';roll(true);selected=null;renderUI();addLog('🌊 เวฟ '+wave+' เริ่มเตรียมทีม');return}if(phase!=='prep'||!refreshCount())return;
let enemies=genEnemies();combat=units.filter(u=>u.board).map((u,i)=>makeFighter(u,'ally',i)).concat(enemies.map((u,i)=>makeFighter(u,'enemy',i)));bullets=[];floaters=[];fx=[];timeLeft=38;combatCount=0;phase='battle';roundResult='';addLog('⚔️ เริ่มเวฟ '+wave+(wave%3===0?' • BOSS!':''));renderUI()}
function endBattle(win){if(phase!=='battle')return;phase='result';if(win){wins++;let reward=5+Math.min(10,Math.floor(wave/2));gold+=reward;roundResult='ชนะ! รับ '+reward+' G';addLog('🏆 ชนะเวฟ '+wave+'! ได้รับ '+reward+' G');setTip('🎉 ชนะแล้ว! กดปุ่มเวฟถัดไปเพื่อซื้อยูนิตและปรับทีม')}else{gold+=3;roundResult='พ่ายแพ้ • รับชดเชย 3 G';addLog('💔 แพ้เวฟ '+wave+' • รับ 3 G');setTip('ยังมีโอกาสแก้มือ! กดปุ่มด้านบนเพื่อไปเวฟถัดไป (หรือปรับทีม)')}
selected=null;renderUI()}
function dmg(target,amount,x,y,crit=false){if(!target.alive)return;let shieldHit=Math.min(target.shield||0,amount);target.shield-=shieldHit;let dealt=amount-shieldHit;target.hp-=dealt;target.hitFlash=.17;floaters.push({x:x??target.x,y:(y??target.y)-30,v:Math.round(amount),color:crit?'#ffe083':target.side==='ally'?'#ff8d98':'#fff4c8',t:0,life:.9});burst(target.x,target.y,target.side==='ally'?'#ff8d98':'#9bf4ff',5);if(target.hp<=0){target.alive=false;burst(target.x,target.y,ENEMY[target.kind]?.col||TYPES[target.kind]?.col||'#ffc475',24);shake=Math.max(shake,.1)}}
// Resolve critical hits when damage is dealt. Existing heroes retain their original damage.
function damageWithCrit(attacker,target,baseDamage){
 const data=(attacker.side==='ally'?TYPES:ENEMY)[attacker.kind];
 const critical=Number(data?.critChance||0)>0&&Math.random()<data.critChance;
 dmg(target,critical?baseDamage*(data.critDamage||1.5):baseDamage,undefined,undefined,critical);
 if(critical){
  floaters.push({x:target.x,y:target.y-54,v:'CRIT!',color:'#ffe990',t:0,life:.74});
  burst(target.x,target.y,'#fff0ae',9);
  waveFX(target.x,target.y,'#f9d36f',48);
 }
 return critical;
}
function burst(x,y,color,n=12){for(let i=0;i<n;i++){let a=rand(0,Math.PI*2),v=rand(25,150);fx.push({kind:'dot',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.23,.7),total:.7,color,size:rand(2,6)})}}
function waveFX(x,y,color,size=95){fx.push({kind:'ring',x,y,r:10,max:size,life:.45,total:.45,color})}
function findTarget(u){let pool=combat.filter(o=>o.alive&&o.side!==u.side);if(!pool.length)return null;pool.sort((a,b)=>dist(a,u)-dist(b,u));return pool[0]}
function attack(u,target){u.cooldown=u.cool;u.attacks++;u.hitFlash=.09;u.anim='attack';const spriteData=(u.side==='ally'?TYPES:ENEMY)[u.kind];u.animUntil=bgtime+(spriteData.visual?.attackMs ? spriteData.visual.attackMs/1000 : isGif(assetFor(spriteData,'attack')) ? .7 : .27);let heavy=false,mul=1;
const effect=spriteData.effect||'';
const trigger=spriteData.triggerEvery||4;
if(u.attacks%trigger===0){heavy=true;mul=2;if(u.side==='ally')combatCount++;special(u,target)}
if(heavy&&['chain','slam'].includes(effect))return;
if(u.range>=1.8){bullets.push({owner:u,from:u.side,x:u.x,y:u.y,tx:target.x,ty:target.y,target,life:1.6,speed:effect==='triple'?450:340,damage:u.atk*mul,color:TYPES[u.kind]?.col||'#fa8d9b',size:heavy?10:7});if(heavy&&effect==='triple'){for(let i=0;i<2;i++){let extra=combat.filter(o=>o.alive&&o.side!==u.side).sort((a,b)=>dist(a,u)-dist(b,u))[i+1]||target;bullets.push({owner:u,from:u.side,x:u.x,y:u.y,target:extra,life:1.6,speed:430,damage:u.atk*.85,color:'#b4ffe5',size:5})}}}
else{damageWithCrit(u,target,u.atk*mul);fx.push({kind:'slash',x:target.x,y:target.y,a:rand(-.8,.8),life:.26,total:.26,color:u.side==='ally'?'#a9f8e8':'#ffa4b5'});if(heavy&&effect==='blink'){damageWithCrit(u,target,u.atk*.5);waveFX(target.x,target.y,'#ff8dc8',42)}}}
function special(u,target){u.anim='skill';u.animUntil=bgtime+.65;let enemy=combat.filter(o=>o.alive&&o.side!==u.side),effect=(u.side==='ally'?TYPES[u.kind]:ENEMY[u.kind])?.effect;if(effect==='slam'){
let cx=target.x,cy=target.y;fx.push({kind:'hammer',x:cx,y:cy,life:.65,total:.65,color:u.isBoss?'#ff9d73':'#ffc773'});waveFX(cx,cy,'#ffc773',135);shake=.22;enemy.filter(o=>Math.hypot(o.x-cx,o.y-cy)<140).forEach(o=>dmg(o,u.atk*1.8,o.x,o.y,true));}
else if(effect==='chain'){
const cfg=TYPES[u.kind],around=enemy.sort((a,b)=>dist(a,target)-dist(b,target)).slice(0,cfg.chainTargets||3);around.forEach((o,i)=>{fx.push({kind:'lightning',x1:i===0?u.x:around[i-1].x,y1:i===0?u.y:around[i-1].y,x2:o.x,y2:o.y,life:.4,total:.4,color:cfg.col||'#cfacff'});dmg(o,u.atk*(cfg.chainPower||1.12),o.x,o.y,true)});shake=.09;}
else if(effect==='shield'){u.shield+=u.maxHp*.30;waveFX(u.x,u.y,'#fbe1a2',76);floaters.push({x:u.x,y:u.y-27,v:'🛡 +SHIELD',color:'#ffde9b',t:0,life:1})}
else if(effect==='blink'){u.x=target.x+rand(-27,27);u.y=target.y+rand(-16,16);burst(u.x,u.y,'#f879c3',17)}
else if(effect==='slash'){waveFX(u.x,u.y,'#7bdeff',60)}}
function update(dt){bgtime+=dt;shake=Math.max(0,shake-dt);for(let v of fx){v.life-=dt;if(v.kind==='dot'){v.x+=v.vx*dt;v.y+=v.vy*dt;v.vx*=.95;v.vy*=.95}}fx=fx.filter(x=>x.life>0);for(let f of floaters){f.t+=dt;f.y-=32*dt}floaters=floaters.filter(x=>x.t<x.life);
if(phase!=='battle')return;let t=dt*speed;timeLeft-=t;let allies=combat.filter(u=>u.alive&&u.side==='ally'),enemies=combat.filter(u=>u.alive&&u.side==='enemy');if(!allies.length||!enemies.length){endBattle(!!allies.length);return}if(timeLeft<0){let ap=allies.reduce((s,u)=>s+u.hp/u.maxHp,0),ep=enemies.reduce((s,u)=>s+u.hp/u.maxHp,0);endBattle(ap>=ep);return}
for(let u of combat){if(!u.alive)continue;u.hitFlash=Math.max(0,u.hitFlash-t);u.cooldown-=t;let target=findTarget(u);if(!target)continue;let d=dist(u,target),r=u.range*SX;if(d>r){let dirx=(target.x-u.x)/d,diry=(target.y-u.y)/d;let step=Math.min((d-r)*.63,u.move*t);u.x=clamp(u.x+dirx*step,42,W-42);u.y=clamp(u.y+diry*step,62,H-57);u.face=dirx>=0?1:-1;u.moving=true;u.motion+=t*8}else{u.moving=false;if(u.cooldown<=0)attack(u,target)}}
for(let b of bullets){b.life-=t;if(!b.target.alive){b.life=0;continue}let d=dist(b,b.target),step=b.speed*t;if(d<step+9){if(b.owner)damageWithCrit(b.owner,b.target,b.damage);else dmg(b.target,b.damage,b.target.x,b.target.y);waveFX(b.target.x,b.target.y,b.color,25);b.life=0}else{b.x+=(b.target.x-b.x)/d*step;b.y+=(b.target.y-b.y)/d*step}}bullets=bullets.filter(b=>b.life>0)}
const rrect=(x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r)};
function tile(x,y,w,h,r,fill,stroke){rrect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}}
function circle(x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,2*Math.PI);ctx.fillStyle=color;ctx.fill()}
function text(s,x,y,font='16px Kanit',color='#fff',align='center'){ctx.font=font;ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(s,x,y)}
function drawBg(){let grd=ctx.createLinearGradient(0,0,0,H);grd.addColorStop(0,'#122d48');grd.addColorStop(.45,'#143853');grd.addColorStop(1,'#0e304b');ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
for(let i=0;i<12;i++){let x=((i*183+51)%W),y=(i*127+65)%H,alpha=.13+.11*Math.sin(bgtime*1.3+i);circle(x,y,2+(i%3),`rgba(160,224,255,${alpha})`)}
let glow=ctx.createRadialGradient(380,340,30,380,340,430);glow.addColorStop(0,'#3664862e');glow.addColorStop(1,'#09182e00');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
ctx.strokeStyle='#5fb3d319';ctx.lineWidth=2;for(let i=0;i<6;i++){ctx.beginPath();ctx.arc(380,385,180+i*43,.05,3.1);ctx.stroke()}
for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){let p=pos(c,r);let friendly=r>=4,enemy=r<=2;tile(p.x-42,p.y-37,84,74,11,friendly?'#3985bb1a':enemy?'#c3547417':'#d6edff0b',friendly?'#6dd9ee49':enemy?'#ffa0a036':'#78c3d522');if(friendly){ctx.fillStyle='#4fbbff12';ctx.fillRect(p.x-33,p.y-28,66,56)}}
if(phase==='prep'&&hoverCell){
 const c=hoverCell.c,r=hoverCell.r,p=pos(c,r),valid=r>=4&&r<ROWS&&c>=0&&c<COLS;
 ctx.save();ctx.shadowBlur=22;ctx.shadowColor=valid?'#6cffe4':'#ff6e86';
 tile(p.x-42,p.y-37,84,74,12,valid?'#61e9d34c':'#f0626b30',valid?'#adffde':'#ff9da6');
 ctx.strokeStyle=valid?'#aaffdf':'#ff8c9f';ctx.lineWidth=3;ctx.strokeRect(p.x-36,p.y-31,72,62);ctx.restore();
 }
 ctx.fillStyle='#64ffda16';ctx.fillRect(23,OY+3.5*SY,714,4);/* Arena zone labels are HTML overlays for responsive readability. */
if(phase==='battle'){let t=Math.ceil(timeLeft);tile(W/2-48,50,96,28,14,'#071c35b8','#407b9c99');text(`⏱ ${t}s`,W/2,70,'600 16px Kanit','#ffdb98')}}
function drawCharacter(u){
 const x=u.x,y=u.y,side=u.side||'ally',data=(side==='ally'?TYPES:ENEMY)[u.kind];
 if(!data)return;
 const moving=phase==='battle'&&u.moving;
 const active=bgtime<(u.animUntil||0),action=active?u.anim:'idle';
 const source=assetFor(data,(action==='attack'||action==='skill')?'attack':'idle');
 const animated=isGif(source), im=animated?null:getPng(source);
 const landing=phase==='prep'?(landings.get(u.id)||0)-bgtime:0;
 let hop=moving?-Math.abs(Math.sin((u.motion||0)*1.2))*(data.visual?.walkBob||7):Math.sin(bgtime*2.4+(typeof u.id==='number'?u.id:0))*(-1.6);
 if(landing>0){const p=1-landing/.52;hop-=Math.abs(Math.sin(p*Math.PI))*20}
 const lunge=action==='attack'?Math.sin(Math.max(0,1-(u.animUntil-bgtime)/.27)*Math.PI)*12:0;
 const casting=action==='skill';
 ctx.save();ctx.translate(x,y+hop);
 const boss=!!(u.isBoss||u.boss);
 if(phase==='prep'&&u.id===selected){ctx.strokeStyle='#91ffe9';ctx.lineWidth=3;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(0,7,38,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}
 ctx.fillStyle='#06101c9e';ctx.beginPath();ctx.ellipse(0,29,boss?42:29,boss?12:8,0,0,Math.PI*2);ctx.fill();
 const col=data.col;circle(0,0,boss?44:32,col+'1a');
 if(casting){ctx.strokeStyle=col;ctx.lineWidth=3;ctx.shadowColor=col;ctx.shadowBlur=22;ctx.beginPath();ctx.arc(0,-6,boss?50:41,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0}
 ctx.translate((u.face||1)*lunge,-(casting?8:0));
 if(u.hitFlash>0)ctx.filter='brightness(1.55)';
 const size=(data.visual?.scale||1)*(u.visualScale||(side==='enemy'?(boss?ENEMY_SCALING.bossModel:ENEMY_SCALING.model):1));ctx.scale(size*(u.face===-1?-1:1),size);
 if(moving)ctx.rotate(Math.sin((u.motion||0)*1.2)*.055);
 if(action==='attack')ctx.rotate(Math.sin(bgtime*25)*.08);
 if(animated){
  // An actual GIF <img> sits over the board, so its frames keep playing in every browser.
  const scale=size,offset=(u.face||1)*lunge;
  gifDrawList.push({key:`${side}:${u.id}`,src:source,x:x+offset,y:y+hop-(casting?8:0)-76*scale,w:94*scale,h:109*scale,face:u.face===-1?-1:1,rotation:moving?Math.sin((u.motion||0)*1.2)*.055:action==='attack'?Math.sin(bgtime*25)*.08:0,opacity:ctx.globalAlpha,flash:u.hitFlash>0});
 } else if(im&&im.complete&&im.naturalWidth)ctx.drawImage(im,-47,-76,94,109);
 else {circle(0,-9,25,col);text(data.name.substring(0,2),0,-5,'700 13px Kanit','#fff')}
 ctx.restore();
 // HUD remains anchored to the board cell, not to the animation offsets.
 const max=u.maxHp||data.hp,hp=u.hp??max,p=hp/max;
 if(!(phase==='prep'&&side==='enemy')){tile(x-28,y-62,56,7,3,'#07172aca');tile(x-28,y-62,56*clamp(p,0,1),7,3,side==='ally'?'#6aebbb':'#ff8e9c')}
 if(u.shield){ctx.fillStyle='#9dd7ff';ctx.fillRect(x-28,y-65,56*clamp(u.shield/max,0,1),2)}
 if(phase==='prep'&&side==='ally'){text(data.name,x,y+54,'600 13px Kanit','#e3f7ff');if(u.lv>1)text('★'.repeat(u.lv),x,y-69,'15px sans-serif','#ffe49d')}
}

function draw(){gifDrawList.length=0;ctx.save();if(shake>0){ctx.translate(rand(-3,3)*shake*4,rand(-3,3)*shake*4)}drawBg();if(phase==='prep'){
let e=genGhostEnemies();e.forEach(o=>{let p=pos(o.col,o.row);ctx.save();ctx.globalAlpha=.50;drawCharacter({...o,...p,side:'enemy',id:'preview:'+o.kind+o.col,hp:1,maxHp:1,face:1});ctx.restore()});text('✦ DEPLOY YOUR TEAM ✦',380,438,'700 16px Rajdhani','#97eee0c0');
for(let u of units.filter(u=>u.board)){let t=TYPES[u.kind],p=pos(u.col,u.row);ctx.save();if(gesture?.dragging&&gesture.sourceId===u.id)ctx.globalAlpha=.22;drawCharacter({...u,...p,side:'ally',hp:t.hp,maxHp:t.hp,size:20,shield:0,hitFlash:0});ctx.restore()}}
else{let all=combat.filter(u=>u.alive).sort((a,b)=>a.y-b.y);all.forEach(drawCharacter);for(let b of bullets){circle(b.x,b.y,b.size,b.color);circle(b.x,b.y,b.size+6,b.color+'33')}}
for(let f of fx){ctx.save();ctx.globalAlpha=clamp(f.life/f.total,0,1);if(f.kind==='dot'){circle(f.x,f.y,f.size,f.color)}else if(f.kind==='ring'){ctx.beginPath();ctx.arc(f.x,f.y,f.max*(1-f.life/f.total),0,2*Math.PI);ctx.lineWidth=5;ctx.strokeStyle=f.color;ctx.stroke()}else if(f.kind==='slash'){ctx.translate(f.x,f.y);ctx.rotate(f.a);ctx.beginPath();ctx.moveTo(-31,-20);ctx.quadraticCurveTo(8,0,32,25);ctx.strokeStyle=f.color;ctx.lineWidth=8;ctx.stroke()}else if(f.kind==='lightning'){ctx.strokeStyle=f.color;ctx.lineWidth=6;ctx.shadowColor=f.color;ctx.shadowBlur=18;ctx.beginPath();ctx.moveTo(f.x1,f.y1);for(let i=1;i<6;i++){let t=i/6;ctx.lineTo(f.x1+(f.x2-f.x1)*t+Math.sin(bgtime*20+i*6)*9,f.y1+(f.y2-f.y1)*t+Math.cos(bgtime*30+i*3)*9)}ctx.lineTo(f.x2,f.y2);ctx.stroke()}else if(f.kind==='hammer'){let progress=1-f.life/f.total;ctx.save();ctx.translate(f.x,f.y-40*(1-progress));ctx.rotate(-.6*progress);tile(-62,-29,124,58,12,'#e4e7f3','#698c9e');for(let j=-40;j<=40;j+=20){ctx.strokeStyle='#586575';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(j,-29);ctx.lineTo(j,29);ctx.stroke()}tile(-6,20,12,80,3,'#ad8865');ctx.restore()}ctx.restore()}
for(let f of floaters){ctx.globalAlpha=clamp(1-f.t/f.life,0,1);text(typeof f.v==='number'?f.v.toLocaleString():f.v,f.x,f.y,typeof f.v==='number'?'700 22px Kanit':'700 18px Kanit',f.color)}ctx.globalAlpha=1;
if(phase==='result'){ctx.fillStyle='#061426c9';ctx.fillRect(0,270,W,210);text(roundResult.includes('ชนะ')?'🏆 VICTORY!':'💔 DEFEAT',W/2,345,'700 42px Kanit',roundResult.includes('ชนะ')?'#8ef0d5':'#ff9fa6');text(roundResult,W/2,395,'500 22px Kanit','#fff1db');text('กด “ไปเวฟต่อไป” เพื่อจัดทีมอีกครั้ง',W/2,434,'16px Kanit','#c3ddf5')}
ctx.restore();syncGifSprites(gifDrawList)}
function genGhostEnemies(){return genEnemies().filter((u,i)=>u.boss||i<3).slice(0,4)}
function loop(now){let dt=clamp((now-last)/1000||0,0,.04);last=now;update(dt);draw();requestAnimationFrame(loop)}
// Pointer input: tap to select, hold/drag to place or swap. Works with mouse, pen and touch.
const ghost=$('dragGhost'),benchDrop=$('benchDrop');
function pointerBoard(e){const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*W/rect.width,y=(e.clientY-rect.top)*H/rect.height;return{inside:x>=0&&x<W&&y>=0&&y<H,x,y,c:Math.round((x-OX)/SX),r:Math.round((y-OY)/SY)}}
function tileAt(e){const p=pointerBoard(e);if(!p.inside||p.c<0||p.c>=COLS||p.r<0||p.r>=ROWS)return null;return p}
function boardHero(p){if(!p||p.r<4)return null;return units.find(u=>u.board&&u.col===p.c&&u.row===p.r)||null}
function rectContains(el,x,y){const rect=el.getBoundingClientRect();return x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom}
function startPointer(e,sourceZone,id){if(phase!=='prep'||e.button!==0||gesture)return;if(sourceZone==='bench'&&!id)return;
 gesture={pointerId:e.pointerId,sourceZone,sourceId:id??null,originX:e.clientX,originY:e.clientY,dragging:false};
 if(sourceZone==='board'&&id){selected=id;renderUI()}
 if(id!=null){
   clearHold();
   const pointer=e.pointerId,sourceId=id;
   holdTimer=setTimeout(()=>{
     if(gesture&&gesture.pointerId===pointer&&!gesture.dragging&&gesture.sourceId===sourceId){
       const current=units.find(u=>u.id===sourceId);
       finishGesture();
       if(current)openHero(current.kind,current.id);
     }
   },540);
 }
 if(e.currentTarget.setPointerCapture)try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_e){}
}
function startDrag(e){clearHold();const u=units.find(u=>u.id===gesture.sourceId);if(!u)return;
 gesture.dragging=true;selected=u.id;ghost.innerHTML=`<span class="ghost-face">${portraitTag(TYPES[u.kind],'idle')}</span><span class="ghost-stars">${'★'.repeat(u.lv)}</span><span class="ghost-name">${TYPES[u.kind].name}</span>`;
 ghost.className='drag-ghost show';document.body.classList.add('dragging-game');renderUI();moveGhost(e)
}
function moveGhost(e){ghost.style.left=e.clientX+'px';ghost.style.top=(e.clientY-15)+'px';const p=tileAt(e);hoverCell=p?{c:p.c,r:p.r}:null;
 const valid=hoverCell&&hoverCell.r>=4;
 ghost.classList.toggle('invalid',!!hoverCell&&!valid);
 benchDrop.classList.toggle('drop-target',gesture?.sourceZone==='board'&&rectContains(benchDrop,e.clientX,e.clientY));
}
function finishGesture(){clearHold();gesture=null;hoverCell=null;ghost.className='drag-ghost';ghost.textContent='';document.body.classList.remove('dragging-game');benchDrop.classList.remove('drop-target')}
canvas.addEventListener('pointerdown',e=>{
 if(!modal.hidden)return;
 if(phase!=='prep'){
   const pt=pointerBoard(e);
   const nearest=combat.filter(u=>u.alive).sort((a,b)=>Math.hypot(a.x-pt.x,a.y-pt.y)-Math.hypot(b.x-pt.x,b.y-pt.y))[0];
   if(nearest&&Math.hypot(nearest.x-pt.x,nearest.y-pt.y)<53)openHero(nearest.kind,null,null,nearest);
   return;
 }
 const p=tileAt(e),u=boardHero(p);startPointer(e,'board',u?.id||null);if(u){const point=pos(u.col,u.row);waveFX(point.x,point.y,'#a0fce6',48)}e.preventDefault()});
$('bench').addEventListener('pointerdown',e=>{
 const b=e.target.closest('[data-unit]');if(!b)return;
 const u=units.find(x=>x.id===Number(b.dataset.unit));if(!u)return;
 if(phase!=='prep'){openHero(u.kind,u.id);return}
 startPointer(e,'bench',u.id);e.preventDefault();
});
window.addEventListener('pointermove',e=>{
 if(gesture&&gesture.pointerId===e.pointerId){
   if(!gesture.dragging&&gesture.sourceId&&Math.hypot(e.clientX-gesture.originX,e.clientY-gesture.originY)>9)startDrag(e);
   if(gesture.dragging){moveGhost(e);e.preventDefault()}
 }else if(phase==='prep'&&e.target===canvas){const p=tileAt(e);hoverCell=p?{c:p.c,r:p.r}:null}
});
canvas.addEventListener('pointerleave',()=>{if(!gesture?.dragging)hoverCell=null});
window.addEventListener('pointerup',e=>{
 if(!gesture||gesture.pointerId!==e.pointerId)return;
 const current=gesture,p=tileAt(e),onBench=rectContains(benchDrop,e.clientX,e.clientY);
 if(current.dragging){
   selected=current.sourceId;
   if(p){if(p.r>=4)place(p.c,p.r);else rejectDrop('วางฮีโร่ได้เฉพาะฝั่งเราเท่านั้น')}
   else if(current.sourceZone==='board'&&onBench)removeSelected();
   else rejectDrop('ปล่อยฮีโร่บนสนามฝั่งเรา หรือม้านั่งสำรอง');
 }else if(current.sourceZone==='bench'&&current.sourceId){
   selected=current.sourceId;renderUI();setTip('✦ ลากยูนิตไปยังสนาม หรือแตะช่องที่ต้องการวาง');
   const button=$('bench').querySelector(`[data-unit="${selected}"]`);if(button)button.classList.add('tap-burst')
 }else if(p){
   const u=boardHero(p);if(u){selected=u.id;renderUI();setTip('✦ เลือก '+TYPES[u.kind].name+' แล้ว • ลากเพื่อย้ายตำแหน่ง')}
   else if(p.r>=4)place(p.c,p.r);
   else rejectDrop('ตรงนั้นเป็นเขตศัตรูนะ!')
 }
 finishGesture()
});
window.addEventListener('pointercancel',()=>finishGesture());
window.addEventListener('blur',()=>finishGesture());
// Keyboard activation for the reserve bench buttons.
$('bench').addEventListener('click',e=>{if(e.detail!==0)return;const b=e.target.closest('[data-unit]');if(!b)return;const u=units.find(v=>v.id===Number(b.dataset.unit));if(!u)return;if(phase==='prep'){selected=u.id;renderUI()}else openHero(u.kind,u.id)});
$('shop').addEventListener('click',e=>{
 const inspect=e.target.closest('[data-inspect-shop]');
 if(inspect){const index=Number(inspect.dataset.inspectShop);if(shop[index])openHero(shop[index],null,index);return}
 const buy=e.target.closest('[data-shop]');if(buy)purchase(Number(buy.dataset.shop));
});
$('unitDetails').addEventListener('click',e=>{const b=e.target.closest('[data-inspect-owned]');if(!b)return;const u=units.find(v=>v.id===Number(b.dataset.inspectOwned));if(u)openHero(u.kind,u.id)});
$('heroCodexBtn').addEventListener('click',openCodex);
$('closeHeroModal').addEventListener('click',closeHero);
modal.addEventListener('click',e=>{if(e.target.closest('[data-close-hero]'))closeHero()});
modalBody.addEventListener('input',e=>{
 if(e.target.matches('[data-codex-search]')){
  codexState.query=e.target.value;codexState.page=0;renderCodexResults();
 }
});
modalBody.addEventListener('change',e=>{
 if(e.target.matches('[data-codex-team]'))codexState.team=e.target.value;
 else if(e.target.matches('[data-codex-cost]'))codexState.cost=e.target.value;
 else if(e.target.matches('[data-codex-owned]'))codexState.owned=e.target.checked;
 else return;
 codexState.page=0;renderCodexResults();
});
modalBody.addEventListener('click',e=>{
 const direction=e.target.closest('[data-codex-nav]');
 if(direction){
  codexState.page+=Number(direction.dataset.codexNav);
  renderCodexResults();return;
 }
 const choose=e.target.closest('[data-modal-hero]');
 if(choose){const kind=choose.dataset.modalHero;const owned=units.find(u=>u.kind===kind);openHero(kind,owned?.id||null);return}
 const buy=e.target.closest('[data-modal-buy]');
 if(buy){purchase(Number(buy.dataset.modalBuy));if(inspection&&!modal.hidden)renderHeroModal()}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden){e.preventDefault();closeHero()}});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
$('bench').addEventListener('contextmenu',e=>e.preventDefault());
$('startBtn').addEventListener('click',()=>{finishGesture();startBattle()});
$('speedBtn').addEventListener('click',()=>{speed=speed===1?2:1;renderUI();toast('⏩ ความเร็ว ×'+speed)});
$('rollBtn').addEventListener('click',()=>{roll(false);toast('⟳ เปลี่ยนฮีโร่ในร้านแล้ว')});
$('removeBtn').addEventListener('click',removeSelected);
$('restartBtn').addEventListener('click',()=>{if(!confirm('เริ่มเกมใหม่ทั้งหมดหรือไม่?'))return;reset()});
function reset(){closeHero();finishGesture();landings.clear();encounterWave=-1;encounterPlan=[];wave=1;gold=12;wins=0;units=[newUnit('lisbeth',true,2,5),newUnit('silica',true,3,5),newUnit('kirito')];selected=units[2].id;phase='prep';roundResult='';speed=1;combat=[];fx=[];bullets=[];floaters=[];messages=[];roll(true);addLog('✨ ยินดีต้อนรับสู่ AUTOCHEST');setTip('💡 มีคิริโตะบนม้านั่งให้แล้ว! เลือกและวางลงสนามสีฟ้าได้เลย');renderUI()}
reset();requestAnimationFrame(loop)
})();
