#!/usr/bin/env node
/* Check that all scripts share a cache-busting release and startup diagnostics exist. */
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sources=[...html.matchAll(/<script defer src="([^"]+)"><\/script>/g)].map(x=>x[1]);
assert.equal(sources.length,10,'Expected character registry, 7 heroes, economy and game scripts');
const versions=sources.map(src=>new URL(src,'https://example.test/').searchParams.get('v'));
assert(versions.every(v=>v&&v===versions[0]),'All scripts must have same release version');
assert(html.includes('src/styles.css?v='+versions[0]),'Styles must use same release version');
assert(html.includes('id="bootError"')&&html.includes('id="bootReloadBtn"'),'Require visible recovery banner');
const game=fs.readFileSync(path.join(root,'src/game.js'),'utf8');
assert(game.includes('reset();window.__AUTOCHEST_READY__=true;requestAnimationFrame(loop)'),'Boot ready flag must be set after successful reset');
console.log('✅ Release '+versions[0]+': all JS/CSS cache busting paths and boot recovery checks passed');
