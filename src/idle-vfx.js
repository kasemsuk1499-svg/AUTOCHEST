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
 const generic={hit:'impact',skillHit:'impact',projectile:'bullet',skillProjectile:'bullet',area:'hammer',heal:'heal',shield:'shield',revive:'revive',buff:'buff',debuff:'debuff',cloak:'cloak'};
 function getSpec(hero,event){
  const key=hero?.visual?.fx?.[event]??defaults[hero?.id]?.[event]??generic[event];
  if(key===false)return null;
  const raw=typeof key==='string'?specs[key]:key;
  if(!raw||typeof raw.src!=='string'||!/^\.\/assets\/effects\/[a-z0-9_/-]+\.(svg|png|webp|gif)$/i.test(raw.src))return null;
  const cols=Math.max(1,Math.min(32,Math.floor(raw.cols||1))),rows=Math.max(1,Math.min(32,Math.floor(raw.rows||1)));
  const row=Math.max(0,Math.min(rows-1,Math.floor(raw.row||0))),frames=Math.max(1,Math.min(cols,Math.floor(raw.frames||cols)));
  return {src:raw.src,cols,rows,row,frames,size:Math.max(16,Math.min(400,Number(raw.size)||100)),ms:Math.max(80,Math.min(3000,Number(raw.ms)||440))};
 }
 function paint(node,spec,animate=true){
  node.style.backgroundImage='url("'+spec.src+'")';
  node.style.backgroundSize=(spec.cols*100)+'% '+(spec.rows*100)+'%';
  node.style.backgroundRepeat='no-repeat';
  const y=spec.rows>1?spec.row/(spec.rows-1)*100:0;
  const pos=i=>(spec.cols>1?i/(spec.cols-1)*100:0)+'% '+y+'%';
  node.style.backgroundPosition=pos(0);
  if(animate&&spec.frames>1&&node.animate&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
   const frames=Array.from({length:spec.frames+1},(_,i)=>({backgroundPosition:pos(Math.min(i,spec.frames-1)),offset:i/spec.frames,easing:'steps(1,end)'}));
   node.animate(frames,{duration:spec.ms,fill:'forwards'});
  }
 }
 function preload(heroes){
  const urls=new Set([atlas]);
  for(const hero of Object.values(heroes))for(const event of Object.keys(generic)){const s=getSpec(hero,event);if(s)urls.add(s.src)}
  for(const url of urls){const img=new Image();img.src=url;img.decode?.().catch(()=>{});}
 }
 window.AUTOCHEST_VFX=Object.freeze({getSpec,paint,preload});
})();
