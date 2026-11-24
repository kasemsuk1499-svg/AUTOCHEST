#!/usr/bin/env node
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script defer src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const context=vm.createContext({window:{},console});
for(const s of scripts.filter(x=>x!=='./src/game.js')){
 const file=path.resolve(root,s);
 if(!fs.existsSync(file))throw Error('Missing script '+s);
 vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}
const reg=context.window.AUTOCHEST_CHARACTERS;
const hero=Object.values(reg.HEROES);
if(hero.length!==7)throw Error('Expected 7 SAO heroes');
const expected=['asuna','kirito','sinon','lisbeth','deathgun','heathcliff','silica'];
if(expected.some(id=>!reg.HEROES[id])||Object.keys(reg.HEROES).some(id=>!expected.includes(id)))throw Error('Unexpected hero roster');
if(scripts.some(s=>s.includes('/enemies/')))throw Error('Separate enemy files must not be loaded');
for(const c of hero){
 const picture=path.resolve(root,c.portrait);
 if(!fs.existsSync(picture))throw Error('Missing art '+picture);
 if(fs.statSync(picture).size<100)throw Error('Empty art '+picture);
 for(const slot of ['art','idle','attack']){
  const src=c.images?.[slot];
  if(!src)throw Error('Missing '+slot+' slot for '+c.id);
  const file=path.resolve(root,src);
  if(!fs.existsSync(file))throw Error('Missing '+slot+' asset: '+src);
  if(fs.statSync(file).size<100)throw Error('Empty '+slot+' asset: '+src);
 }
 /* User-provided PNG/GIF portraits do not require editable SVG source files. */
}
const asuna=reg.HEROES.asuna;
if(!asuna||asuna.critChance!==.35||asuna.critDamage!==1.9||asuna.cool!==.58)throw Error('Asuna speed/crit build missing');
console.log('✅ SAO roster: '+hero.length+' heroes; 7 complete art/idle/attack sets; same assets for ally and enemy');
