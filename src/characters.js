/** AUTOCHEST roster registry. Character data lives in individual files. */
(function(){'use strict';
 const HEROES=Object.create(null),ENEMIES=Object.create(null);
 function register(list,unit,enemy){
  if(!unit||typeof unit.id!=='string'||!/^[a-z0-9_]+$/.test(unit.id))throw Error('Invalid character id');
  if(list[unit.id])throw Error('Duplicate character id '+unit.id);
  if(!unit.name||!unit.portrait)throw Error('Missing character art/name: '+unit.id);
  // Every asset slot accepts PNG or animated GIF. Allow local project paths only.
  const validAsset=p=>typeof p==='string'&&/^\.\/assets\/(?:heroes|enemies)\/[a-z0-9_-]+\/[a-zA-Z0-9_-]+\.(?:png|gif)$/i.test(p);
  const images={art:unit.images?.art||unit.portrait,idle:unit.images?.idle||unit.portrait,attack:unit.images?.attack||unit.images?.idle||unit.portrait};
  if(!validAsset(unit.portrait)||Object.values(images).some(p=>!validAsset(p)))throw Error('Use local PNG/GIF images for '+unit.id);
  if(unit.visual?.attackMs!==undefined && !(Number.isFinite(unit.visual.attackMs)&&unit.visual.attackMs>=100&&unit.visual.attackMs<=5000))throw Error('attackMs must be 100-5000ms');
  if(unit.critChance!==undefined&&(!Number.isFinite(unit.critChance)||unit.critChance<0||unit.critChance>1))throw Error('Invalid critChance for '+unit.id);
  if(unit.critDamage!==undefined&&(!Number.isFinite(unit.critDamage)||unit.critDamage<1||unit.critDamage>5))throw Error('Invalid critDamage for '+unit.id);
  if(unit.traits!==undefined&&(!Array.isArray(unit.traits)||unit.traits.some(t=>typeof t!=='string'||!t.trim())))throw Error('Invalid traits for '+unit.id);
  for(const key of ['hp','dmg','range','cool','move'])if(!(Number.isFinite(unit[key])&&unit[key]>0))throw Error('Invalid '+key+' for '+unit.id);
  if(!enemy&&(!['นักรบ','เวท','ยิงไกล','ป้องกัน'].includes(unit.team)||!['slash','chain','triple','shield','blink','slam'].includes(unit.effect)||!Number.isInteger(unit.triggerEvery)||unit.triggerEvery<=0))throw Error('Invalid hero class/skill: '+unit.id);
  list[unit.id]=Object.freeze({...unit,images:Object.freeze(images)});
 }
 window.AUTOCHEST_CHARACTERS={HEROES,ENEMIES,registerHero:u=>register(HEROES,u,false),registerEnemy:u=>register(ENEMIES,u,true)};
})();
