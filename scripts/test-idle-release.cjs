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
new Function(main);
console.log('✅ Idle release: script order, version matching, UI elements and JS parsing');
