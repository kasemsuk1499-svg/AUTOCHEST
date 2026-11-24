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
assert(main.includes('const GRID_COLS=6,GRID_ROWS=7,ALLY_START_ROW=4'),'Original 6x7 tactical board is required');
assert(main.includes('function moveHeroToCell(id,col,row)'),'Interactive hero deployment is required');
assert(main.includes('function defenderApproach(actor,target,t)'),'Allied fighters must hold their deployment half');
assert(main.includes('function invaderApproach(foe,target,t)'),'Enemy rush and active ranged strafing required');
assert(main.includes('function invaderPatrol(foe,t)'),'Enemies must move even if no target is visible');
assert(main.includes('const close=invaderApproach(foe,target,t)'),'Enemy movement logic must execute every frame');
assert(main.includes('const close=defenderApproach(f,target,t)'),'Defending team should not rush into enemy spawns');
assert(main.includes('function renderGrid()'),'Original board grid render is required');
assert(main.includes('function refreshUpgradeAvailability()'),'Live upgrade affordance must reflect rewards');
assert(main.includes('function applyLiveHeroStats(id)'),'Level/star gains must affect live combat');
assert(main.includes('function levelBatch(id,maximum=5)'),'Bulk-level preview must match affordable levels');
for(const key of ['id="boardGrid"','id="upgradeReadyCount"','id="heroDetails"'])
 assert(html.includes(key),'Missing tactical/upgrade HUD '+key);
assert(main.includes('collection-level')&&main.includes('collection-stars'),'Hero roster must display level and stars');
assert(main.includes('levelGoldStatus')&&main.includes('starShardStatus'),'Upgrade materials must show progress');
assert(main.includes('const enemyLimit=()'),'Regular enemies must have a bounded crowd size');
assert(main.includes('function pickEnemy(f)'),'Each ally must select an enemy individually');
assert(main.includes('function defeatMonster(foe)'),'Defeat must remove the individual enemy');
assert(main.includes('function openSkill(id,source='+'\'hero\''),'Skill inspector entrypoint is required');
assert(main.includes('function skillDescription(t,enemy=false)'),'Describe actual Idle combat skills');
assert(html.includes('id="skillModal"')&&html.includes('id="closeSkillBtn"'),'Skill modal controls required');
assert(main.includes('data-skill-hero'),'Hero skill card buttons must exist');
assert(main.includes('data-inspect-id'),'Battle units must support inspector interaction');

assert(!main.includes('monsterIcons'),'Emoji monsters should no longer be used');
assert(!html.includes('id="walkPad"'),'Grid mode should not show obsolete walking D-pad');

new Function(main);
console.log('✅ Idle release: script order, version matching, UI elements and JS parsing');
