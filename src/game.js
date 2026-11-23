(()=>{'use strict';
const $=id=>document.getElementById(id), canvas=$('battlefield'), ctx=canvas.getContext('2d');
const W=760,H=775,COLS=6,ROWS=7,SX=94,SY=89,OX=104,OY=108;
const TYPES={
 knight:{name:'อัศวิน',e:'⚔️',cost:1,hp:680,dmg:56,range:1.07,cool:1.10,move:95,team:'นักรบ',col:'#62d3ff',skill:'ฟันดาบ'},
 mage:{name:'จอมเวท',e:'🔮',cost:2,hp:415,dmg:87,range:2.95,cool:1.62,move:81,team:'เวท',col:'#c18aff',skill:'สายฟ้าลูกโซ่'},
 archer:{name:'มือปืน',e:'🏹',cost:1,hp:450,dmg:63,range:3.38,cool:1.04,move:87,team:'ยิงไกล',col:'#81edb0',skill:'กระสุนสามนัด'},
 tank:{name:'ผู้พิทักษ์',e:'🛡️',cost:2,hp:1100,dmg:45,range:1.04,cool:1.33,move:70,team:'ป้องกัน',col:'#ffcc7e',skill:'โล่คุ้มกัน'},
 assassin:{name:'นินจา',e:'🗡️',cost:2,hp:435,dmg:99,range:1.02,cool:.88,move:125,team:'นักรบ',col:'#ff80bd',skill:'เงาพริบตา'},
 thunder:{name:'เทพสายฟ้า',e:'⚡',cost:3,hp:510,dmg:111,range:3.05,cool:1.49,move:84,team:'เวท',col:'#b9dcff',skill:'สายฟ้าพิพากษา'},
 hammer:{name:'ขุนค้อน',e:'🔨',cost:3,hp:830,dmg:76,range:1.08,cool:1.35,move:84,team:'ป้องกัน',col:'#ff9c87',skill:'ค้อนยักษ์ทุบสนาม'}
};
const ENEMY={slime:{name:'สไลม์',e:'👾',hp:280,dmg:41,range:1.06,cool:1.25,move:76,col:'#e48ac8'},crab:{name:'ปูเกราะ',e:'🦀',hp:580,dmg:49,range:1.02,cool:1.42,move:67,col:'#ffae75'},ghost:{name:'วิญญาณ',e:'👻',hp:370,dmg:61,range:2.5,cool:1.78,move:78,col:'#7f93fa'},boss:{name:'ราชาปลายักษ์',e:'🐟',hp:2800,dmg:100,range:1.28,cool:1.7,move:56,col:'#ffb85f'}};
let wave=1,gold=12,wins=0,units=[],shop=[],selected=null,uid=1,phase='prep',speed=1,combat=[],bullets=[],fx=[],floaters=[],timeLeft=0,roundResult='',elapsed=0,shake=0,bgtime=0,last=0,messages=[],combatCount=0;
let gesture=null,hoverCell=null,toastTimer=null;const landings=new Map();
const rand=(a,b)=>Math.random()*(b-a)+a,ri=n=>Math.floor(Math.random()*n),clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),pos=(c,r)=>({x:OX+c*SX,y:OY+r*SY});
const money=n=>`${n} G`;const limit=()=>Math.min(8,4+Math.floor((wave-1)/3));
function addLog(s){messages.unshift(s);messages=messages.slice(0,6);$('log').innerHTML=messages.map(x=>'<div>'+x+'</div>').join('')}
function newUnit(kind,board=false,col=-1,row=-1,lv=1){return{id:uid++,kind,board,col,row,lv}}
function roll(free=false){if(phase!=='prep')return;if(!free){if(gold<2)return;gold-=2;}let keys=Object.keys(TYPES),weights=keys.map(k=>TYPES[k].cost===1?4:TYPES[k].cost===2?3:2);let pool=keys.flatMap((k,i)=>Array(weights[i]).fill(k));shop=Array.from({length:4},()=>pool[ri(pool.length)]);renderUI()}
function refreshCount(){return units.filter(u=>u.board).length}
function purchase(i){if(phase!=='prep'||!shop[i])return;let kind=shop[i],t=TYPES[kind];if(gold<t.cost){setTip('🪙 เงินไม่พอสำหรับยูนิตนี้');return}if(units.filter(u=>!u.board).length>=9){setTip('ม้านั่งเต็มแล้ว ย้ายยูนิตลงสนามก่อน');return}gold-=t.cost;let u=newUnit(kind);units.push(u);selected=u.id;shop[i]=null;fuse(kind);renderUI();addLog('รับสมัคร '+t.e+' '+t.name+' แล้ว');toast('✦ รับสมัคร '+t.name+' แล้ว');const b=$('bench').querySelector(`[data-unit="${selected}"]`);if(b)b.classList.add('recent-purchase')}
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
function renderInspector(){
 const target=$('unitDetails'),u=units.find(v=>v.id===selected);
 if(!u){target.innerHTML='<div class="no-selection">✦ แตะฮีโร่ในสนามหรือบนม้านั่งเพื่อดูข้อมูล</div>';return}
 const t=TYPES[u.kind],mult=u.lv===3?2.8:u.lv===2?1.72:1,damage=u.lv===3?2.25:u.lv===2?1.5:1;
 target.innerHTML=`<div class="inspector-row"><div class="inspector-avatar" style="--avatar:${t.col}">${t.e}</div><div class="inspector-content"><strong>${t.name}</strong><span>${t.team} • ${u.board?'กำลังประจำสนาม':'ม้านั่งสำรอง'}</span><span class="inspector-stars">${'★'.repeat(u.lv)}${'☆'.repeat(3-u.lv)}</span></div></div><div class="inspector-stats"><div><small>HP</small><b>${Math.round(t.hp*mult)}</b></div><div><small>ATK</small><b>${Math.round(t.dmg*damage)}</b></div><div><small>RANGE</small><b>${t.range.toFixed(1)}</b></div></div><div class="inspector-skill">✦ สกิลอัตโนมัติ: <b>${t.skill}</b></div>`;
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
   if(!kind)return '<button class="shopitem sold" disabled>✓ รับสมัครแล้ว</button>';
   const t=TYPES[kind],label=t.cost===3?'EPIC':t.cost===2?'RARE':'COMMON';
   return `<button class="shopitem rarity-r${t.cost}" data-shop="${i}" aria-label="ซื้อ ${t.name} ราคา ${t.cost} Gold" ${phase!=='prep'||gold<t.cost?'disabled':''}><div class="card-top"><span class="rarity-label">✦ ${label}</span><span class="price">◈ ${t.cost} G</span></div><div class="card-main"><div class="card-art" style="--unit-color:${t.col}"><span>${t.e}</span></div><div class="card-info"><strong>${t.name}</strong><small>${t.team}</small><small>${t.skill}</small></div></div><span class="buy-chip">+ รับสมัครฮีโร่</span></button>`;
 }).join('');
 const reserve=units.filter(u=>!u.board);
 $('bench').innerHTML=Array.from({length:9},(_,i)=>{
   const u=reserve[i];if(!u)return '<div class="bench-empty" aria-hidden="true"></div>';
   return `<button class="benchitem ${selected===u.id?'active':''}" data-unit="${u.id}" aria-label="${TYPES[u.kind].name} ${u.lv} ดาว กดค้างเพื่อลาก" title="${TYPES[u.kind].name} · ลากลงสนาม"><span class="bench-face">${TYPES[u.kind].e}</span><span class="bench-stars">${'★'.repeat(u.lv)}</span></button>`;
 }).join('');
 const counts={};units.filter(u=>u.board).forEach(u=>counts[TYPES[u.kind].team]=(counts[TYPES[u.kind].team]||0)+1);
 const traits={นักรบ:'⚔️',เวท:'🔮',ยิงไกล:'🏹',ป้องกัน:'🛡️'};
 $('synergies').innerHTML=Object.keys(traits).map(n=>`<div class="trait ${(counts[n]||0)>=2?'on':''}"><span>${traits[n]} ${n}</span><b>${counts[n]||0} / 2 ${(counts[n]||0)>=2?'✦':''}</b></div>`).join('');
 renderInspector()
}
function genEnemies(){let arr=[];let level=wave;let bosses=wave%3===0;let count=bosses?Math.min(5,2+Math.floor(wave/3)):Math.min(9,3+Math.floor(wave/2));let keys=bosses?['crab','ghost','slime']:['slime','slime','crab',...(wave>2?['ghost']:[])];for(let i=0;i<count;i++){let kind=keys[ri(keys.length)];arr.push({kind,side:'enemy',col:i%6,row:Math.floor(i/6),lv:1})}if(bosses)arr.push({kind:'boss',side:'enemy',col:2,row:0,lv:1});return arr}
function makeFighter(base,side,index){let t=side==='ally'?TYPES[base.kind]:ENEMY[base.kind],p=pos(base.col,base.row),scale=side==='enemy'?(1+(wave-1)*.23):1,lvscale=side==='ally'?(base.lv===3?2.8:base.lv===2?1.72:1):1;
return{id:base.id||'e'+index,kind:base.kind,side,lv:base.lv||1,x:p.x,y:p.y,vx:0,vy:0,hp:t.hp*scale*lvscale,maxHp:t.hp*scale*lvscale,atk:t.dmg*scale*(side==='ally'?(base.lv===3?2.25:base.lv===2?1.5:1):1),range:t.range,cool:t.cool,move:t.move,cooldown:rand(0,.5),attacks:0,shield:0,hitFlash:0,face:side==='ally'?-1:1,team:t.team||'',size:base.kind==='boss'?32:20,alive:true}}
function startBattle(){if(phase==='result'){wave++;phase='prep';roundResult='';roll(true);selected=null;renderUI();addLog('🌊 เวฟ '+wave+' เริ่มเตรียมทีม');return}if(phase!=='prep'||!refreshCount())return;
let enemies=genEnemies();combat=units.filter(u=>u.board).map((u,i)=>makeFighter(u,'ally',i)).concat(enemies.map((u,i)=>makeFighter(u,'enemy',i)));bullets=[];floaters=[];fx=[];timeLeft=38;combatCount=0;phase='battle';roundResult='';addLog('⚔️ เริ่มเวฟ '+wave+(wave%3===0?' • BOSS!':''));renderUI()}
function endBattle(win){if(phase!=='battle')return;phase='result';if(win){wins++;let reward=5+Math.min(10,Math.floor(wave/2));gold+=reward;roundResult='ชนะ! รับ '+reward+' G';addLog('🏆 ชนะเวฟ '+wave+'! ได้รับ '+reward+' G');setTip('🎉 ชนะแล้ว! กดปุ่มเวฟถัดไปเพื่อซื้อยูนิตและปรับทีม')}else{gold+=3;roundResult='พ่ายแพ้ • รับชดเชย 3 G';addLog('💔 แพ้เวฟ '+wave+' • รับ 3 G');setTip('ยังมีโอกาสแก้มือ! กดปุ่มด้านบนเพื่อไปเวฟถัดไป (หรือปรับทีม)')}
selected=null;renderUI()}
function dmg(target,amount,x,y,crit=false){if(!target.alive)return;let shieldHit=Math.min(target.shield||0,amount);target.shield-=shieldHit;let dealt=amount-shieldHit;target.hp-=dealt;target.hitFlash=.17;floaters.push({x:x??target.x,y:(y??target.y)-30,v:Math.round(amount),color:crit?'#ffe083':target.side==='ally'?'#ff8d98':'#fff4c8',t:0,life:.9});burst(target.x,target.y,target.side==='ally'?'#ff8d98':'#9bf4ff',5);if(target.hp<=0){target.alive=false;burst(target.x,target.y,ENEMY[target.kind]?.col||TYPES[target.kind]?.col||'#ffc475',24);shake=Math.max(shake,.1)}}
function burst(x,y,color,n=12){for(let i=0;i<n;i++){let a=rand(0,Math.PI*2),v=rand(25,150);fx.push({kind:'dot',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.23,.7),total:.7,color,size:rand(2,6)})}}
function waveFX(x,y,color,size=95){fx.push({kind:'ring',x,y,r:10,max:size,life:.45,total:.45,color})}
function findTarget(u){let pool=combat.filter(o=>o.alive&&o.side!==u.side);if(!pool.length)return null;pool.sort((a,b)=>dist(a,u)-dist(b,u));return pool[0]}
function attack(u,target){u.cooldown=u.cool;u.attacks++;u.hitFlash=.09;let heavy=false,mul=1;if(u.side==='ally'){
const kinds={mage:3,thunder:3,hammer:3,archer:3,assassin:4,tank:4,knight:4};if(u.attacks%(kinds[u.kind]||4)===0){heavy=true;mul=2.0;combatCount++;special(u,target)}
} else if(u.kind==='boss'&&u.attacks%3===0){heavy=true;mul=1.75;special(u,target)};
if(heavy&&['mage','thunder','hammer','boss'].includes(u.kind))return;
if(u.range>=1.8){bullets.push({from:u.side,x:u.x,y:u.y,tx:target.x,ty:target.y,target,life:1.6,speed:u.kind==='archer'?450:340,damage:u.atk*mul,color:TYPES[u.kind]?.col||'#fa8d9b',size:heavy?10:7});if(heavy&&u.kind==='archer'){for(let i=0;i<2;i++){let extra=combat.filter(o=>o.alive&&o.side!==u.side).sort((a,b)=>dist(a,u)-dist(b,u))[i+1]||target;bullets.push({from:u.side,x:u.x,y:u.y,target:extra,life:1.6,speed:430,damage:u.atk*.85,color:'#b4ffe5',size:5})}}}
else{dmg(target,u.atk*mul);fx.push({kind:'slash',x:target.x,y:target.y,a:rand(-.8,.8),life:.26,total:.26,color:u.side==='ally'?'#a9f8e8':'#ffa4b5'});if(heavy&&u.kind==='assassin'){dmg(target,u.atk*.5);waveFX(target.x,target.y,'#ff8dc8',42)}}}
function special(u,target){let enemy=combat.filter(o=>o.alive&&o.side!==u.side);if(u.kind==='hammer'||u.kind==='boss'){
let cx=target.x,cy=target.y;fx.push({kind:'hammer',x:cx,y:cy,life:.65,total:.65,color:u.kind==='boss'?'#ff9d73':'#ffc773'});waveFX(cx,cy,'#ffc773',135);shake=.22;enemy.filter(o=>Math.hypot(o.x-cx,o.y-cy)<140).forEach(o=>dmg(o,u.atk*(u.kind==='boss'?1.6:1.8),o.x,o.y,true));}
else if(u.kind==='mage'||u.kind==='thunder'){
let around=enemy.sort((a,b)=>dist(a,target)-dist(b,target)).slice(0,u.kind==='thunder'?4:3);around.forEach((o,i)=>{fx.push({kind:'lightning',x1:i===0?u.x:around[i-1].x,y1:i===0?u.y:around[i-1].y,x2:o.x,y2:o.y,life:.4,total:.4,color:u.kind==='thunder'?'#f3f6ff':'#cfacff'});dmg(o,u.atk*(u.kind==='thunder'?1.25:1.12),o.x,o.y,true)});shake=.09;}
else if(u.kind==='tank'){u.shield+=u.maxHp*.30;waveFX(u.x,u.y,'#fbe1a2',76);floaters.push({x:u.x,y:u.y-27,v:'🛡 +SHIELD',color:'#ffde9b',t:0,life:1})}
else if(u.kind==='assassin'){u.x=target.x+rand(-27,27);u.y=target.y+rand(-16,16);burst(u.x,u.y,'#f879c3',17)}
else if(u.kind==='knight'){waveFX(u.x,u.y,'#7bdeff',60)}}
function update(dt){bgtime+=dt;shake=Math.max(0,shake-dt);for(let v of fx){v.life-=dt;if(v.kind==='dot'){v.x+=v.vx*dt;v.y+=v.vy*dt;v.vx*=.95;v.vy*=.95}}fx=fx.filter(x=>x.life>0);for(let f of floaters){f.t+=dt;f.y-=32*dt}floaters=floaters.filter(x=>x.t<x.life);
if(phase!=='battle')return;let t=dt*speed;timeLeft-=t;let allies=combat.filter(u=>u.alive&&u.side==='ally'),enemies=combat.filter(u=>u.alive&&u.side==='enemy');if(!allies.length||!enemies.length){endBattle(!!allies.length);return}if(timeLeft<0){let ap=allies.reduce((s,u)=>s+u.hp/u.maxHp,0),ep=enemies.reduce((s,u)=>s+u.hp/u.maxHp,0);endBattle(ap>=ep);return}
for(let u of combat){if(!u.alive)continue;u.hitFlash=Math.max(0,u.hitFlash-t);u.cooldown-=t;let target=findTarget(u);if(!target)continue;let d=dist(u,target),r=u.range*SX;if(d>r){let dirx=(target.x-u.x)/d,diry=(target.y-u.y)/d;let step=Math.min((d-r)*.63,u.move*t);u.x=clamp(u.x+dirx*step,42,W-42);u.y=clamp(u.y+diry*step,62,H-57);u.face=dirx>=0?1:-1}else if(u.cooldown<=0){attack(u,target)}}
for(let b of bullets){b.life-=t;if(!b.target.alive){b.life=0;continue}let d=dist(b,b.target),step=b.speed*t;if(d<step+9){dmg(b.target,b.damage,b.target.x,b.target.y);waveFX(b.target.x,b.target.y,b.color,25);b.life=0}else{b.x+=(b.target.x-b.x)/d*step;b.y+=(b.target.y-b.y)/d*step}}bullets=bullets.filter(b=>b.life>0)}
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
function drawCharacter(u){let x=u.x,y=u.y;ctx.save();if(u.hitFlash>0)ctx.filter='brightness(1.6)';let size=u.size||20;ctx.translate(x,y);if(phase==='prep'){const remaining=landings.get(u.id)-bgtime;if(remaining>0){const progress=1-remaining/.52;const hop=-Math.abs(Math.sin(progress*Math.PI))*21;ctx.translate(0,hop);ctx.scale(1+Math.sin(progress*Math.PI)*.15,1+Math.sin(progress*Math.PI)*.15)}else if(u.id===selected)ctx.translate(0,Math.sin(bgtime*3)*-2)}if(phase==='prep'&&u.id===selected){ctx.strokeStyle='#91ffe9';ctx.lineWidth=3;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(0,4,39,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}
ctx.fillStyle='#050f19ad';ctx.beginPath();ctx.ellipse(0,22,size+10,9,0,0,Math.PI*2);ctx.fill();let col=(u.side==='enemy'?ENEMY[u.kind]:TYPES[u.kind]).col;
// glow and chibi body
circle(0,0,size+16,col+'1b');ctx.strokeStyle=col+'66';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,6,size+10,size+9,0,0,7);ctx.stroke();
if(u.kind==='boss'){
ctx.fillStyle='#ea9e4e';ctx.beginPath();ctx.ellipse(0,0,43,31,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffd38a';ctx.beginPath();ctx.ellipse(9,3,30,20,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#1c3545';circle(-9,-6,4,'#183847');circle(17,-6,4,'#183847');text('♛',0,-31,'31px serif','#ffe3a4')
}else if(u.side==='enemy'){
circle(0,6,size+6,col);circle(-8,2,4,'#21324a');circle(8,2,4,'#21324a');circle(-9,1,1.6,'white');circle(7,1,1.6,'white');if(u.kind==='crab')text('✣',0,-15,'24px serif','#ffe9ae');if(u.kind==='ghost')text('✧',0,-19,'22px serif','#d5c5ff');
}else{
ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(0,11,size,23,0,0,Math.PI*2);ctx.fill();circle(0,-12,22,'#ffe0cb');ctx.fillStyle=u.kind==='mage'?'#b18aff':u.kind==='thunder'?'#e7ecff':u.kind==='assassin'?'#414162':u.kind==='tank'?'#eccf91':'#6f87ad';ctx.beginPath();ctx.arc(0,-16,22,Math.PI,Math.PI*2);ctx.lineTo(22,-13);ctx.quadraticCurveTo(8,-20,0,-23);ctx.quadraticCurveTo(-10,-14,-22,-12);ctx.closePath();ctx.fill();circle(-8,-9,3.5,'#263750');circle(8,-9,3.5,'#263750');circle(-9,-10,1.4,'white');circle(7,-10,1.4,'white');ctx.strokeStyle='#b37681';ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(0,-4,4,.1,Math.PI-.1);ctx.stroke();text(TYPES[u.kind].e,27,12,'26px serif');
if(u.lv>=2){text('★'.repeat(u.lv-1),0,-41,'16px serif','#fff2aa')}}
ctx.restore();let p=u.hp/u.maxHp;tile(x-26,y-51,52,6,3,'#061528c9');tile(x-26,y-51,52*clamp(p,0,1),6,3,u.side==='ally'?'#6aebbb':'#ff8e9c');if(u.shield){ctx.fillStyle='#9dd7ff';ctx.fillRect(x-26,y-55,52*clamp(u.shield/u.maxHp,0,1),2)}
if(phase==='prep'){let t=TYPES[u.kind];text(t.name,x,y+52,'500 13px Kanit','#def3ff');if(u.lv>1)text('★'.repeat(u.lv),x,y-59,'15px sans-serif','#ffe49d')}}
function draw(){ctx.save();if(shake>0){ctx.translate(rand(-3,3)*shake*4,rand(-3,3)*shake*4)}drawBg();if(phase==='prep'){
let e=genGhostEnemies();e.forEach(o=>{let p=pos(o.col,o.row);ctx.save();ctx.globalAlpha=.55;circle(p.x,p.y,20,ENEMY[o.kind].col+'aa');text(ENEMY[o.kind].e,p.x,p.y+10,'28px serif');ctx.restore()});text('✦ DEPLOY YOUR TEAM ✦',380,438,'700 16px Rajdhani','#97eee0c0');
for(let u of units.filter(u=>u.board)){let t=TYPES[u.kind],p=pos(u.col,u.row);ctx.save();if(gesture?.dragging&&gesture.sourceId===u.id)ctx.globalAlpha=.22;drawCharacter({...u,...p,side:'ally',hp:t.hp,maxHp:t.hp,size:20,shield:0,hitFlash:0});ctx.restore()}}
else{let all=combat.filter(u=>u.alive).sort((a,b)=>a.y-b.y);all.forEach(drawCharacter);for(let b of bullets){circle(b.x,b.y,b.size,b.color);circle(b.x,b.y,b.size+6,b.color+'33')}}
for(let f of fx){ctx.save();ctx.globalAlpha=clamp(f.life/f.total,0,1);if(f.kind==='dot'){circle(f.x,f.y,f.size,f.color)}else if(f.kind==='ring'){ctx.beginPath();ctx.arc(f.x,f.y,f.max*(1-f.life/f.total),0,2*Math.PI);ctx.lineWidth=5;ctx.strokeStyle=f.color;ctx.stroke()}else if(f.kind==='slash'){ctx.translate(f.x,f.y);ctx.rotate(f.a);ctx.beginPath();ctx.moveTo(-31,-20);ctx.quadraticCurveTo(8,0,32,25);ctx.strokeStyle=f.color;ctx.lineWidth=8;ctx.stroke()}else if(f.kind==='lightning'){ctx.strokeStyle=f.color;ctx.lineWidth=6;ctx.shadowColor=f.color;ctx.shadowBlur=18;ctx.beginPath();ctx.moveTo(f.x1,f.y1);for(let i=1;i<6;i++){let t=i/6;ctx.lineTo(f.x1+(f.x2-f.x1)*t+Math.sin(bgtime*20+i*6)*9,f.y1+(f.y2-f.y1)*t+Math.cos(bgtime*30+i*3)*9)}ctx.lineTo(f.x2,f.y2);ctx.stroke()}else if(f.kind==='hammer'){let progress=1-f.life/f.total;ctx.save();ctx.translate(f.x,f.y-40*(1-progress));ctx.rotate(-.6*progress);tile(-62,-29,124,58,12,'#e4e7f3','#698c9e');for(let j=-40;j<=40;j+=20){ctx.strokeStyle='#586575';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(j,-29);ctx.lineTo(j,29);ctx.stroke()}tile(-6,20,12,80,3,'#ad8865');ctx.restore()}ctx.restore()}
for(let f of floaters){ctx.globalAlpha=clamp(1-f.t/f.life,0,1);text(typeof f.v==='number'?f.v.toLocaleString():f.v,f.x,f.y,typeof f.v==='number'?'700 22px Kanit':'700 18px Kanit',f.color)}ctx.globalAlpha=1;
if(phase==='result'){ctx.fillStyle='#061426c9';ctx.fillRect(0,270,W,210);text(roundResult.includes('ชนะ')?'🏆 VICTORY!':'💔 DEFEAT',W/2,345,'700 42px Kanit',roundResult.includes('ชนะ')?'#8ef0d5':'#ff9fa6');text(roundResult,W/2,395,'500 22px Kanit','#fff1db');text('กด “ไปเวฟต่อไป” เพื่อจัดทีมอีกครั้ง',W/2,434,'16px Kanit','#c3ddf5')}
ctx.restore()}
function genGhostEnemies(){return wave%3===0?[{kind:'boss',col:2,row:0},{kind:'slime',col:1,row:1},{kind:'crab',col:4,row:1}]:[{kind:'slime',col:1,row:0},{kind:'slime',col:4,row:0},{kind:'crab',col:2,row:1}]}
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
 if(e.currentTarget.setPointerCapture)try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_e){}
}
function startDrag(e){const u=units.find(u=>u.id===gesture.sourceId);if(!u)return;
 gesture.dragging=true;selected=u.id;ghost.innerHTML=`<span class="ghost-face">${TYPES[u.kind].e}</span><span class="ghost-stars">${'★'.repeat(u.lv)}</span><span class="ghost-name">${TYPES[u.kind].name}</span>`;
 ghost.className='drag-ghost show';document.body.classList.add('dragging-game');renderUI();moveGhost(e)
}
function moveGhost(e){ghost.style.left=e.clientX+'px';ghost.style.top=(e.clientY-15)+'px';const p=tileAt(e);hoverCell=p?{c:p.c,r:p.r}:null;
 const valid=hoverCell&&hoverCell.r>=4;
 ghost.classList.toggle('invalid',!!hoverCell&&!valid);
 benchDrop.classList.toggle('drop-target',gesture?.sourceZone==='board'&&rectContains(benchDrop,e.clientX,e.clientY));
}
function finishGesture(){gesture=null;hoverCell=null;ghost.className='drag-ghost';ghost.textContent='';document.body.classList.remove('dragging-game');benchDrop.classList.remove('drop-target')}
canvas.addEventListener('pointerdown',e=>{if(phase!=='prep')return;const p=tileAt(e),u=boardHero(p);startPointer(e,'board',u?.id||null);if(u){const point=pos(u.col,u.row);waveFX(point.x,point.y,'#a0fce6',48)}e.preventDefault()});
$('bench').addEventListener('pointerdown',e=>{const b=e.target.closest('[data-unit]');if(!b||phase!=='prep')return;startPointer(e,'bench',Number(b.dataset.unit));e.preventDefault()});
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
$('bench').addEventListener('click',e=>{if(e.detail!==0)return;const b=e.target.closest('[data-unit]');if(b&&phase==='prep'){selected=Number(b.dataset.unit);renderUI()}});
$('shop').addEventListener('click',e=>{const b=e.target.closest('[data-shop]');if(b)purchase(+b.dataset.shop)});
$('startBtn').addEventListener('click',()=>{finishGesture();startBattle()});
$('speedBtn').addEventListener('click',()=>{speed=speed===1?2:1;renderUI();toast('⏩ ความเร็ว ×'+speed)});
$('rollBtn').addEventListener('click',()=>{roll(false);toast('⟳ เปลี่ยนฮีโร่ในร้านแล้ว')});
$('removeBtn').addEventListener('click',removeSelected);
$('restartBtn').addEventListener('click',()=>{if(!confirm('เริ่มเกมใหม่ทั้งหมดหรือไม่?'))return;reset()});
function reset(){finishGesture();landings.clear();wave=1;gold=12;wins=0;units=[newUnit('knight',true,2,5),newUnit('mage',true,3,5),newUnit('archer')];selected=units[2].id;phase='prep';roundResult='';speed=1;combat=[];fx=[];bullets=[];floaters=[];messages=[];roll(true);addLog('✨ ยินดีต้อนรับสู่ AUTOCHEST');setTip('💡 มีมือปืนบนม้านั่งให้แล้ว! เลือกและวางลงสนามสีฟ้าได้เลย');renderUI()}
reset();requestAnimationFrame(loop)
})();
