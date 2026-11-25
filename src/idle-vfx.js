/* Image-based combat effects. Presentation only; never calculates damage. */
(function(){'use strict';
 const atlas='./assets/effects/combat-atlas.svg';
 const rows=['slashGold','slashBlue','hammer','shield','heal','cloak','bullet','darkBullet','revive','impact','debuff','buff'];
 const specs=Object.fromEntries(rows.map((name,row)=>[name,{src:atlas,cols:4,rows:12,row,frames:4,size: name==='hammer'?180:name==='shield'||name==='heal'||name==='revive'?122:105,ms:440}]));
 const defaults={
  asuna:{hit:'slashGold',skillHit:'slashGold'},
  kirito:{hit:'slashBlue',skillHit:'slashBlue',revive:'revive'},
  sinon:{projectile:'bullet',skillProjectile:'bullet',hit:'impact',skillHit:'impact'},
  heathcliff:{hit:'impact',shield:'shield'},
  lisbeth:{hit:'impact',area:'hammer',debuff:'debuff'},
  silica:{projectile:'bullet',heal:'heal',buff:'buff',hit:'impact'},
  deathgun:{projectile:'darkBullet',skillProjectile:'darkBullet',hit:'impact',cloak:'cloak',skillHit:'impact'}
 };
 const generic={freeze:'shield',dot:'debuff',hit:'impact',skillHit:'impact',projectile:'bullet',skillProjectile:'bullet',area:'hammer',heal:'heal',shield:'shield',revive:'revive',buff:'buff',debuff:'debuff',cloak:'cloak',cast:'buff',aftermath:'impact',cleave:'slashGold',groundFire:false};
 let published={},draft=null;
 const studioMode=new URLSearchParams(window.location?.search||'').has('studioTrial');
 if(studioMode){try{draft=JSON.parse(sessionStorage.getItem('AUTOCHEST_VFX_DRAFT')||'null')}catch(_){}}
 async function loadPublished(){try{const response=await fetch('./assets/effects/published.json',{cache:'no-cache'});if(response.ok){const data=await response.json();if(data.version===1&&data.heroes&&typeof data.heroes==='object')published=data.heroes}}catch(_){}}
 // The game owns slot geometry. Uploaded art can tune appearance, never hit detection.
 function slotLayout(hero,event){
  const mode=hero?.visual?.layout?.[event];
  if(['point','beam','field'].includes(mode))return mode;
  return hero?.effect==='pierce'&&event==='skillProjectile'?'beam':'point';
 }
 const bounded=(value,fallback,min,max)=>Number.isFinite(Number(value))&&value!==null&&value!==''?Math.max(min,Math.min(max,Number(value))):fallback;
 function appearance(raw,mode='point'){
  return {mode,scaleX:bounded(raw.scaleX,1,.1,5),scaleY:bounded(raw.scaleY,1,.1,5),rotation:bounded(raw.rotation,0,-180,180),
   offsetX:bounded(raw.offsetX,0,-540,540),offsetY:bounded(raw.offsetY,0,-540,540),
   thickness:bounded(raw.thickness,48,4,300),orientation:raw.orientation==='vertical'?'vertical':'horizontal'};
 }
 // Backward compatible: zero airtime means playback duration for regions,
 // and natural flight lifetime for travelling projectiles.
 function timing(raw){
  return {delayMs:Math.round(bounded(raw.delayMs,0,0,5000)),airtimeMs:Math.round(bounded(raw.airtimeMs,0,0,10000)),loopFrames:raw.loopFrames===true};
 }
 function lifetime(spec,moving=false){
  const t=timing(spec),visible=t.airtimeMs||(moving?0:spec.ms);
  return {...t,visible,total:t.delayMs+visible};
 }
 function animateLifetime(node,spec,moving=false){
  const t=lifetime(spec,moving);
  if(!node.animate){
   if(t.delayMs){node.style.opacity='0';setTimeout(()=>{if(node.isConnected)node.style.opacity='1'},t.delayMs)}
   if(t.visible)setTimeout(()=>{if(node.isConnected)node.style.opacity='0'},t.total);
   return t;
  }
  if(!t.visible){
   if(t.delayMs)node.animate([{opacity:0},{opacity:1}],{duration:1,delay:t.delayMs,fill:'both'});
   return t;
  }
  node.animate([{opacity:0,offset:0},{opacity:1,offset:.001},{opacity:1,offset:.85},{opacity:0,offset:1}],
   {duration:t.visible,delay:t.delayMs,fill:'both'});
  return t;
 }
 function rayEnd(from,to){
  const dx=to.x-from.x,dy=to.y-from.y;
  if(Math.hypot(dx,dy)<.0001)return {x:from.x,y:from.y};
  const t=Math.min(dx>0?(100-from.x)/dx:dx<0?-from.x/dx:Infinity,dy>0?(100-from.y)/dy:dy<0?-from.y/dy:Infinity);
  return {x:from.x+dx*Math.max(0,t),y:from.y+dy*Math.max(0,t)};
 }
 // Screen-axis offsets are authored in reference pixels at a 540px arena width.
 function visualOffset(spec,area){const factor=Math.min(1.1,Math.max(1,area.width)/540);return {x:bounded(spec?.offsetX,0,-540,540)*factor,y:bounded(spec?.offsetY,0,-540,540)*factor};}
 function geometry(spec,area,from,to,scale=1){
  const w=Math.max(1,area.width),h=Math.max(1,area.height),factor=Math.min(1.1,w/540)*scale;
  const sx=from.x*w/100,sy=from.y*h/100,offset=visualOffset(spec,area);
  if(spec.mode==='beam'&&to){
   const ex=to.x*w/100,ey=to.y*h/100,dx=ex-sx,dy=ey-sy;
   return {left:(sx+ex)/2+offset.x,top:(sy+ey)/2+offset.y,width:Math.max(1,Math.hypot(dx,dy)),height:spec.thickness*factor,angle:Math.atan2(dy,dx)*180/Math.PI};
  }
  if(spec.mode==='field')return {left:w/2+offset.x,top:h/2+offset.y,width:w*spec.scaleX,height:h*spec.scaleY,angle:spec.rotation};
  return {left:sx+offset.x,top:sy+offset.y,width:spec.size*factor*spec.scaleX,height:spec.size*factor*spec.scaleY,angle:spec.rotation};
 }
 function placeRegion(node,spec,region){
  node.style.left=region.left+'px';node.style.top=region.top+'px';node.style.width=region.width+'px';node.style.height=region.height+'px';
  node.style.setProperty('--vfx-angle',region.angle+'deg');
  // The frame painter lives inside the region, so vertical source art can be rotated
  // without rotating the actual beam path or stretching its collision geometry.
  const art=node.ownerDocument.createElement('span');art.style.position='absolute';art.style.left='50%';art.style.top='50%';art.style.pointerEvents='none';
  const vertical=spec.mode==='beam'&&spec.orientation==='vertical';
  art.style.width=(vertical?region.height:region.width)+'px';art.style.height=(vertical?region.width:region.height)+'px';
  art.style.transform='translate(-50%,-50%)'+(vertical?' rotate(-90deg)':'');
  node.replaceChildren(art);paint(art,spec,true);return art;
 }
 function getSpec(hero,event){
  const override=studioMode&&draft?.hero===hero?.id&&draft?.event===event?draft.spec:null;
  const key=override??published[hero?.id]?.[event]??hero?.visual?.fx?.[event]??defaults[hero?.id]?.[event]??generic[event];
  if(key===false)return null;
  const raw=typeof key==='string'?specs[key]:key;
  if(!raw||typeof raw.src!=='string'||!(/^\.\/assets\/effects\/[a-z0-9_/-]+\.(svg|png|webp|gif)$/i.test(raw.src)||(override===raw&&/^data:image\/(png|gif|webp);base64,[a-z0-9+/=]+$/i.test(raw.src))))return null;
  const cols=Math.max(1,Math.min(32,Math.floor(raw.cols||1))),rows=Math.max(1,Math.min(32,Math.floor(raw.rows||1)));
  const row=Math.max(0,Math.min(rows-1,Math.floor(raw.row||0))),col=Math.max(0,Math.min(cols-1,Math.floor(raw.col||0))),frames=Math.max(1,Math.min((rows-row)*cols-col,Math.floor(raw.frames||cols)));
  return {src:raw.src,cols,rows,row,col,frames,size:Math.max(16,Math.min(400,Number(raw.size)||100)),ms:Math.max(80,Math.min(3000,Number(raw.ms)||440)),...appearance(raw,slotLayout(hero,event)),...timing(raw)};
 }
 function paint(node,spec,animate=true){
  node.style.backgroundImage='url("'+spec.src+'")';
  node.style.backgroundSize=(spec.cols*100)+'% '+(spec.rows*100)+'%';
  node.style.backgroundRepeat='no-repeat';
  const pos=i=>{const j=i+(spec.col||0),x=j%spec.cols,y=spec.row+Math.floor(j/spec.cols);return (spec.cols>1?x/(spec.cols-1)*100:0)+'% '+(spec.rows>1?y/(spec.rows-1)*100:0)+'%'};
  node.style.backgroundPosition=pos(0);
  if(animate&&spec.frames>1&&node.animate&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
   const frames=Array.from({length:spec.frames+1},(_,i)=>({backgroundPosition:pos(Math.min(i,spec.frames-1)),offset:i/spec.frames,easing:'steps(1,end)'}));
   const t=timing(spec);node.animate(frames,{duration:spec.ms,delay:t.delayMs,iterations:t.loopFrames?Infinity:1,fill:'both'});
  }
 }
 function preload(heroes){
  const urls=new Set([atlas]);
  for(const hero of Object.values(heroes))for(const event of Object.keys(generic)){const s=getSpec(hero,event);if(s)urls.add(s.src)}
  for(const url of urls){const img=new Image();img.src=url;img.decode?.().catch(()=>{});}
 }
 window.AUTOCHEST_VFX=Object.freeze({getSpec,paint,preload,loadPublished,slotLayout,appearance,rayEnd,visualOffset,geometry,placeRegion,timing,lifetime,animateLifetime});
})();
