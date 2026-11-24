/** AUTOCHEST roster registry. Character data lives in individual files. */
(function(){'use strict';
 const HEROES=Object.create(null);
 function registerHero(unit){
  const list=HEROES;
  if(!unit||typeof unit.id!=='string'||!/^[a-z0-9_]+$/.test(unit.id))throw Error('Invalid character id');
  if(list[unit.id])throw Error('Duplicate character id '+unit.id);
  if(!unit.name||!unit.portrait)throw Error('Missing character art/name: '+unit.id);
  // Every asset slot accepts PNG or animated GIF. Allow local project paths only.
  const validAsset=p=>typeof p==='string'&&/^\.\/assets\/heroes\/[a-z0-9_-]+\/[a-zA-Z0-9_-]+\.(?:png|gif)$/i.test(p);
  const images={art:unit.images?.art||unit.portrait,idle:unit.images?.idle||unit.portrait,attack:unit.images?.attack||unit.images?.idle||unit.portrait};
  if(!validAsset(unit.portrait)||Object.values(images).some(p=>!validAsset(p)))throw Error('Use local PNG/GIF images for '+unit.id);
  if(unit.visual?.attackMs!==undefined && !(Number.isFinite(unit.visual.attackMs)&&unit.visual.attackMs>=100&&unit.visual.attackMs<=5000))throw Error('attackMs must be 100-5000ms');
  if(unit.critChance!==undefined&&(!Number.isFinite(unit.critChance)||unit.critChance<0||unit.critChance>1))throw Error('Invalid critChance for '+unit.id);
  if(unit.critDamage!==undefined&&(!Number.isFinite(unit.critDamage)||unit.critDamage<1||unit.critDamage>5))throw Error('Invalid critDamage for '+unit.id);
  if(unit.traits!==undefined&&(!Array.isArray(unit.traits)||unit.traits.some(t=>typeof t!=='string'||!t.trim())))throw Error('Invalid traits for '+unit.id);
  if(unit.effect==='cloakshot'){
    for(const key of ['cloakDuration','cloakShotMultiplier','cloakCritBonus','executeThreshold','executeMultiplier'])
      if(!Number.isFinite(unit[key]))throw Error('Missing/invalid cloakshot '+key+' for '+unit.id);
    if(unit.cloakDuration<0.5||unit.cloakDuration>8||unit.cloakShotMultiplier<1||unit.cloakShotMultiplier>5||
       unit.cloakCritBonus<0||unit.cloakCritBonus>1||unit.executeThreshold<0||unit.executeThreshold>1||
       unit.executeMultiplier<1||unit.executeMultiplier>3)throw Error('Invalid cloakshot effect configuration for '+unit.id);
  }
  for(const key of ['hp','dmg','range','cool','move'])if(!(Number.isFinite(unit[key])&&unit[key]>0))throw Error('Invalid '+key+' for '+unit.id);
  if(!['นักรบ','เวท','ยิงไกล','ป้องกัน'].includes(unit.team)||!['slash','chain','triple','shield','blink','slam','cloakshot','pierce','heal','explosion'].includes(unit.effect)||!Number.isInteger(unit.triggerEvery)||unit.triggerEvery<=0)throw Error('Invalid hero class/skill: '+unit.id);
  if(unit.effect==='explosion'&&(!(unit.castSeconds>=1&&unit.castSeconds<=10)||!(unit.skillPower>0&&unit.skillPower<=20)))throw Error('Invalid explosion configuration');
  // Rarity tier is independent of upgrade stars and summon probability.
  if(![1,2,3,4].includes(unit.cost))throw Error('Invalid rarity tier for '+unit.id);
  const rarity=['','R','SR','SSR','UR'][unit.cost];
  list[unit.id]=Object.freeze({...unit,rarity,images:Object.freeze(images)});
 }
 window.AUTOCHEST_CHARACTERS={HEROES,registerHero};
})();
