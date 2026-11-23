/** AUTOCHEST roster registry. Character data lives in individual files. */
(function(){'use strict';
 const HEROES=Object.create(null),ENEMIES=Object.create(null);
 function register(list,unit,enemy){
  if(!unit||typeof unit.id!=='string'||!/^[a-z0-9_]+$/.test(unit.id))throw Error('Invalid character id');
  if(list[unit.id])throw Error('Duplicate character id '+unit.id);
  if(!unit.name||!unit.portrait)throw Error('Missing character art/name: '+unit.id);
  for(const key of ['hp','dmg','range','cool','move'])if(!(Number.isFinite(unit[key])&&unit[key]>0))throw Error('Invalid '+key+' for '+unit.id);
  if(!enemy&&(!['นักรบ','เวท','ยิงไกล','ป้องกัน'].includes(unit.team)||!['slash','chain','triple','shield','blink','slam'].includes(unit.effect)||!Number.isInteger(unit.triggerEvery)||unit.triggerEvery<=0))throw Error('Invalid hero class/skill: '+unit.id);
  list[unit.id]=Object.freeze({...unit});
 }
 window.AUTOCHEST_CHARACTERS={HEROES,ENEMIES,registerHero:u=>register(HEROES,u,false),registerEnemy:u=>register(ENEMIES,u,true)};
})();
