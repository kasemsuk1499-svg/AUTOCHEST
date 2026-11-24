#!/usr/bin/env node
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const src=[...html.matchAll(/<script defer src="([^"]+)"><\/script>/g)].map(x=>x[1]);
assert.equal(src.length,10,'One registry + seven SAO heroes + idle core + idle game');
const versions=src.map(u=>new URL(u,'https://example.test/').searchParams.get('v'));
assert(versions.every(x=>x===versions[0]),'Use one version for all scripts');
assert(html.includes('src/idle-style.css?v='+versions[0]),'Styles must match JS release');
assert(src[src.length-2].includes('idle-core.js')&&src[src.length-1].includes('idle-game.js'),'Correct load order');
assert(!src.some(u=>u.endsWith('/game.js')),'Do not load old TFT battle engine');
for(const id of ['goldValue','heroList','teamSlots','heroDetails','monsterLayer','stageNumber','challengeBtn','summonTenBtn','claimOfflineBtn'])
 assert(html.includes('id="'+id+'"'),'Missing interface '+id);
const main=fs.readFileSync(path.join(root,'src/idle-game.js'),'utf8');
assert(main.includes('window.__AUTOCHEST_IDLE_READY__=true'),'Ready flag after successful boot');
assert(main.includes('function moveTo(actor,target,r,dt)'),'Proximity-based walking must be implemented');
assert(main.includes('function enemyAttack(enemy,target)'),'Enemy heroes should be able to attack and use skills');
assert(main.includes('const bosses=IDS.filter(id=>HEROES[id].cost===3)'),'Boss pool must come from SAO roster');
assert(main.includes('const hero=HEROES[id],stat=CORE.monster'),'Enemies must reuse SAO hero configs');
assert(main.includes("class:'fighter enemy-unit'"),'Enemy character must render as a hero sprite');
assert(main.includes('function moveManually(t)'),'Manual party movement must work');
assert(main.includes('WALK_BUTTONS'),'WASD and D-pad control state is required');
assert(!main.includes('monsterIcons'),'Emoji monsters should no longer be used');
for(const key of ['autoWalkBtn','walkPad','data-walk="up"','data-walk="down"','data-walk="left"','data-walk="right"'])
 assert(html.includes(key),'Missing manual control '+key);

new Function(main);
console.log('✅ Idle release: script order, version matching, UI elements and JS parsing');
