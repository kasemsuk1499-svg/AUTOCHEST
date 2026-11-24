/* Studio: drafts are private to this tab; publishing requires repository write permission. */
(()=>{'use strict';
const $=id=>document.getElementById(id),H=window.AUTOCHEST_CHARACTERS.HEROES,V=window.AUTOCHEST_VFX;
const repo='kasemsuk1499-svg/AUTOCHEST',base='https://api.github.com/repos/'+repo,manifestPath='assets/effects/published.json',draftKey='AUTOCHEST_VFX_DRAFT';
const labels={hit:'โจมตีปกติ · ตอนโดน',skillHit:'สกิล · ตอนโดน',projectile:'กระสุนปกติ',skillProjectile:'กระสุนสกิล',area:'กระแทกวงกว้าง',heal:'ฟื้นฟู HP',buff:'บัฟทีม',debuff:'ดีบัฟศัตรู',shield:'โล่',revive:'คืนชีพ',cloak:'พรางตัว',cast:'วงเวทขณะร่าย',aftermath:'ควันหลังระเบิด'};
let file=null,dataURL='',ext='',busy=false,sequence=0,sheet=null,pick='start',loop=false,loopTimer=0;
const status=(id,msg,error=false)=>{$(id).textContent=msg;$(id).classList.toggle('error',error)};
function eventsFor(h){
 const ranged=Number(h.range)>=1.8,events=['hit'];
 if(h.effect==='explosion')return ['hit','projectile','cast','area','aftermath'];
 const direct=!['heal','shield','slam','chain'].includes(h.effect);
 if(direct)events.push('skillHit');
 if(ranged)events.push('projectile');
 if(ranged&&direct)events.push('skillProjectile');
 if(h.effect==='slam')events.push('area','debuff');
 if(h.effect==='heal'||h.support||h.passive?.healOnAttack)events.push('heal','buff');
 if(h.effect==='shield'||h.guard)events.push('shield');
 if(h.passive?.reviveHp)events.push('revive');
 if(h.effect==='cloakshot')events.push('cloak');
 return events;
}
function selectHero(){
 const h=H[$('hero').value];$('portrait').src=h.images.art;$('previewUnit').src=h.images.idle;$('heroName').textContent=h.rarity+' · '+h.name;$('heroSkill').textContent=h.skill;
 const prior=$('event').value;$('event').replaceChildren(...eventsFor(h).map(event=>new Option(labels[event],event)));if(eventsFor(h).includes(prior))$('event').value=prior;
 selectEvent();
}
function selectEvent(){
 const event=$('event').value;const notes={skillHit:'ใช้กับสกิลที่สร้างดาเมจโดยตรง ไม่ใช่สกิลฮีล/โล่/กระแทกวงกว้าง',skillProjectile:'ใช้กับกระสุนสกิลที่เดินทางไปยังเป้าหมาย',heal:'แสดงที่พันธมิตรที่ได้รับการฮีลจริง',area:'แสดงตรงเป้าหมายของค้อน',revive:'แสดงเมื่อฮีโร่คืนชีพ',shield:'แสดงเมื่อได้รับหรือถูกตีโล่'};
 $('eventHint').textContent=notes[event]||'แสดงเมื่อกลไกนี้ทำงานจริงในสนาม';
 if(!dataURL){const s=V.getSpec(H[$('hero').value],event);if(s)for(const key of ['size','ms','cols','rows','frames','row','col'])$(key).value=s[key]}
 invalidate();play();
}
function num(id,min,max){const n=Number($(id).value);if(!Number.isInteger(n)||n<min||n>max)throw Error(id+' ต้องอยู่ระหว่าง '+min+'–'+max);return n}
function settings(src){
 const cols=num('cols',1,32),rows=num('rows',1,32),row=num('row',0,rows-1),col=num('col',0,cols-1),frames=num('frames',1,cols*(rows-row)-col);
 if(dataURL&&(ext==='gif'||ext==='webp')&&(cols!==1||rows!==1||frames!==1))throw Error('GIF / WebP ให้ใช้ 1 คอลัมน์ 1 แถว 1 เฟรม');
 return {src,cols,rows,row,col,frames,size:num('size',16,400),ms:num('ms',80,3000)};
}
function validDraft(){return !!(file&&dataURL&&!busy)}
function sync(){let v=validDraft();for(const id of ['trialBtn','exportBtn'])$(id).disabled=!v;$('publishBtn').disabled=!v||!$('token').value.trim();}
function invalidate(){if(!$('trialPanel').hidden)closeTrial();sync()}
function play(){
 clearTimeout(loopTimer);
 const node=$('previewFx');node.getAnimations?.().forEach(a=>a.cancel());
 try{
  const spec=dataURL?settings(dataURL):V.getSpec(H[$('hero').value],$('event').value);
  if(!spec)return;
  const size=Math.min(spec.size,$('previewFx').parentElement.clientWidth-12,290);
  node.style.width=size+'px';node.style.height=size+'px';node.style.opacity='1';V.paint(node,spec,true);
  if(node.animate)node.animate([{opacity:1},{opacity:1,offset:.8},{opacity:.35}],{duration:spec.ms,fill:'forwards'});
  status('previewStatus',dataURL?'ภาพร่าง • '+spec.frames+' ช่องภาพ · '+spec.ms+' ms':'เอฟเฟกต์ที่ใช้งานอยู่');
  if(loop)loopTimer=setTimeout(play,spec.ms+120);
 }catch(e){status('previewStatus',e.message,true)}
}
function readData(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result));r.onerror=()=>rej(Error('อ่านไฟล์ไม่สำเร็จ'));r.readAsDataURL(f)})}
function applyGrid(c,r,start=0,end=c*r-1){
 if(!sheet)return;
 c=Math.max(1,Math.min(32,c));r=Math.max(1,Math.min(32,r));
 start=Math.max(0,Math.min(c*r-1,start));end=Math.max(start,Math.min(c*r-1,end));
 $('cols').value=c;$('rows').value=r;$('row').value=Math.floor(start/c);$('col').value=start%c;$('frames').value=end-start+1;
 drawGrid();invalidate();play();
}
function drawGrid(){
 if(!sheet)return;
 try{
  const spec=settings(dataURL),{cols:c,rows:r,row,col,frames}=spec,start=row*c+col,end=start+frames-1;
  $('shownCols').textContent=c;$('shownRows').textContent=r;
  $('sheetGrid').style.gridTemplateColumns='repeat('+c+',minmax(0,1fr))';$('sheetGrid').style.gridTemplateRows='repeat('+r+',minmax(0,1fr))';
  $('frameHint').textContent='ช่อง '+(start+1)+'–'+(end+1)+' / '+c*r+' · '+frames+' เฟรม · '+(sheet.width/c).toFixed(1)+' × '+(sheet.height/r).toFixed(1)+' px ต่อช่อง · คลิกเลือก'+(pick==='start'?'เฟรมแรก':'เฟรมสุดท้าย');
  const grid=document.createDocumentFragment();
  for(let i=0;i<c*r;i++){const b=document.createElement('button');b.type='button';b.textContent=i+1;b.className=(i>=start&&i<=end?'used ':'')+(i===start||i===end?'edge':'');b.setAttribute('aria-label','เฟรม '+(i+1));b.onclick=()=>{if(pick==='start'){pick='end';applyGrid(c,r,i,Math.max(i,end))}else{pick='start';applyGrid(c,r,Math.min(start,i),i)}};grid.append(b)}
  $('sheetGrid').replaceChildren(grid);
  $('pickStart').setAttribute('aria-pressed',String(pick==='start'));$('pickEnd').setAttribute('aria-pressed',String(pick==='end'));
 }catch(e){$('frameHint').textContent=e.message}
}
function suggest(img){
 const canvas=document.createElement('canvas'),scale=Math.min(1,640/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,canvas.width,canvas.height);
 return window.AUTOCHEST_SHEET.analyze(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height,img.naturalWidth,img.naturalHeight);
}
function prepareSheet(img){
 sheet=null;$('sheetHelper').hidden=true;$('sheetAdvanced').open=false;
 if(ext!=='png')return;
 sheet={width:img.naturalWidth,height:img.naturalHeight};pick='start';$('sheetHelper').hidden=false;$('sheetImage').src=dataURL;
 $('sheetBoard').style.maxWidth=Math.min(460,360*sheet.width/sheet.height)+'px';
 let choices=[];try{choices=suggest(img)}catch(_){}
 $('sheetGuess').textContent=choices.length?'ระบบคาดว่า '+choices[0].cols+' คอลัมน์ × '+choices[0].rows+' แถว — ตรวจเส้นแบ่งก่อนใช้':'ยังแยกช่องไม่ได้แน่ชัด · เริ่มจากภาพเดียว หรือปรับตารางด้วย + / −';
 $('sheetChoices').replaceChildren(...[...choices,{cols:1,rows:1,row:0,col:0,frames:1}].map(v=>{const b=document.createElement('button');b.type='button';b.textContent=v.cols===1&&v.rows===1?'ภาพเดียว':v.cols+' × '+v.rows+' · '+v.frames+' เฟรม';b.onclick=()=>{const start=v.row*v.cols+v.col;applyGrid(v.cols,v.rows,start,start+v.frames-1)};return b}));
 const v=choices[0]||{cols:1,rows:1,row:0,col:0,frames:1};const start=v.row*v.cols+v.col;applyGrid(v.cols,v.rows,start,start+v.frames-1);
}
async function loadFile(){
 const seq=++sequence;file=null;dataURL='';ext='';sheet=null;$('sheetHelper').hidden=true;invalidate();
 const f=$('asset').files[0];if(!f){status('fileInfo','');play();return}
 try{
  if(f.size>1.5*1024*1024)throw Error('ไฟล์ใหญ่เกิน 1.5 MB');
  const b=new Uint8Array(await f.slice(0,12).arrayBuffer());let type=b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71?'png':String.fromCharCode(...b.slice(0,3))==='GIF'?'gif':String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP'?'webp':'';
  if(!type)throw Error('รองรับเฉพาะ PNG, GIF และ WebP');
  let url=await readData(f);url='data:image/'+type+';base64,'+url.split(',')[1];
  const img=new Image();img.src=url;await img.decode();
  if(img.naturalWidth*img.naturalHeight>16000000)throw Error('ความละเอียดภาพสูงเกิน 16 ล้านพิกเซล');
  if(seq!==sequence)return;file=f;dataURL=url;ext=type;for(const key of ['cols','rows','frames'])$(key).value=1;$('row').value=0;$('col').value=0;
  status('fileInfo',f.name+' · '+Math.ceil(f.size/1024)+' KB · '+img.naturalWidth+'×'+img.naturalHeight);
  prepareSheet(img);sync();play();
 }catch(e){if(seq!==sequence)return;status('fileInfo',e.message,true);sync()}
}
function draft(){if(!validDraft())throw Error('เลือกภาพก่อน');return {hero:$('hero').value,event:$('event').value,spec:settings(dataURL)}}
function openTrial(){try{const d=draft();sessionStorage.setItem(draftKey,JSON.stringify(d));$('trialPanel').hidden=false;$('trialFrame').src='./index.html?studioTrial='+encodeURIComponent(d.hero)+'&v=0.20.0';$('trialPanel').scrollIntoView({block:'start',behavior:'smooth'})}catch(e){status('previewStatus',e.message,true)}}
function closeTrial(){$('trialFrame').src='about:blank';$('trialPanel').hidden=true;try{sessionStorage.removeItem(draftKey)}catch(_){}}
function exportDraft(){try{const d=draft(),url=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='vfx-'+d.hero+'-'+d.event+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){status('publishStatus',e.message,true)}}
async function api(token,path,method='GET',body){
 const r=await fetch(base+path,{method,redirect:'error',cache:'no-store',headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await r.json();if(!r.ok)throw Error('GitHub HTTP '+r.status+(r.status===401?' — token ไม่ถูกต้องหรือหมดอายุ':r.status===403?' — ตรวจสิทธิ์ Contents: Read and write':r.status===422?' — branch อาจมีการอัปเดตพร้อมกัน ให้ลองใหม่':''));return data;
}
async function publish(){
 if(busy)return;let token=$('token').value.trim();if(!token)return;
 let d;try{d=draft()}catch(e){status('publishStatus',e.message,true);return}
 if(!confirm('เผยแพร่ '+H[d.hero].name+' / '+labels[d.event]+' ให้ผู้เล่นทุกคน?'))return;
 busy=true;$('token').value='';$('commitLink').hidden=true;sync();$('asset').disabled=true;$('hero').disabled=true;$('event').disabled=true;
 try{
  status('publishStatus','กำลังตรวจสิทธิ์และอ่านเวอร์ชันล่าสุด...');
  const ref=await api(token,'/git/ref/heads/main'),parent=ref.object.sha;
  const old=await api(token,'/git/commits/'+parent);
  const manifest=await api(token,'/contents/'+manifestPath+'?ref='+parent);
  const decoded=new TextDecoder().decode(Uint8Array.from(atob(manifest.content.replace(/\s/g,'')),c=>c.charCodeAt(0)));
  const config=JSON.parse(decoded);if(config.version!==1||!config.heroes||Array.isArray(config.heroes))throw Error('รูปแบบ manifest ไม่ถูกต้อง');
  status('publishStatus','กำลังอัปโหลดภาพ...');
  const blob=await api(token,'/git/blobs','POST',{content:d.spec.src.split(',')[1],encoding:'base64'});
  const path='assets/effects/'+d.hero+'/'+d.event+'-'+blob.sha.slice(0,12)+'.'+ext;
  config.heroes[d.hero]={...(config.heroes[d.hero]||{}),[d.event]:{...d.spec,src:'./'+path}};
  const tree=await api(token,'/git/trees','POST',{base_tree:old.tree.sha,tree:[{path,mode:'100644',type:'blob',sha:blob.sha},{path:manifestPath,mode:'100644',type:'blob',content:JSON.stringify(config,null,2)+'\n'}]});
  const commit=await api(token,'/git/commits','POST',{message:'VFX Studio: '+d.hero+' / '+d.event,tree:tree.sha,parents:[parent]});
  await api(token,'/git/refs/heads/main','PATCH',{sha:commit.sha,force:false});
  $('commitLink').href='https://github.com/'+repo+'/commit/'+commit.sha;$('commitLink').hidden=false;
  status('publishStatus','เผยแพร่ commit สำเร็จ! ผู้เล่นจะได้รับภาพใหม่เมื่อ GitHub Pages เผยแพร่และรีเฟรชเกม');
 }catch(e){status('publishStatus',e.message+' — ยังไม่ยืนยันว่าเผยแพร่สำเร็จ',true)}finally{token='';busy=false;$('asset').disabled=false;$('hero').disabled=false;$('event').disabled=false;sync()}
}
$('hero').replaceChildren(...Object.values(H).map(h=>new Option(h.rarity+' · '+h.name,h.id)));
$('hero').addEventListener('change',selectHero);$('event').addEventListener('change',selectEvent);$('asset').addEventListener('change',loadFile);
for(const id of ['size','ms','cols','rows','frames','row','col'])$(id).addEventListener('change',()=>{drawGrid();invalidate();play()});
for(const [id,dc,dr] of [['lessCols',-1,0],['moreCols',1,0],['lessRows',0,-1],['moreRows',0,1]])$(id).onclick=()=>applyGrid(Math.max(1,Math.min(32,Number($('cols').value)+dc)),Math.max(1,Math.min(32,Number($('rows').value)+dr)));
$('pickStart').onclick=()=>{pick='start';drawGrid()};$('pickEnd').onclick=()=>{pick='end';drawGrid()};$('allFrames').onclick=()=>applyGrid(Number($('cols').value),Number($('rows').value));
$('loopBtn').onclick=()=>{loop=!loop;$('loopBtn').setAttribute('aria-pressed',String(loop));$('loopBtn').textContent=loop?'⏸ หยุดวน':'↻ เล่นวน';play()};
$('playBtn').onclick=play;$('trialBtn').onclick=openTrial;$('closeTrial').onclick=closeTrial;$('exportBtn').onclick=exportDraft;$('token').oninput=sync;$('forgetToken').onclick=()=>{$('token').value='';sync()};$('publishBtn').onclick=publish;
window.addEventListener('pagehide',()=>{try{sessionStorage.removeItem(draftKey)}catch(_){}});
V.loadPublished().then(()=>{if(!file)selectEvent()});selectHero();sync();
})();