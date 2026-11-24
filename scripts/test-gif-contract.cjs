#!/usr/bin/env node
// Regression test: Every art/idle/attack slot supports both PNG and GIF; invalid paths are rejected.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..');
const context=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(path.join(root,'src/characters.js'),'utf8'),context);
const r=context.window.AUTOCHEST_CHARACTERS;
const base={id:'premium_demo',name:'Test Premium',portrait:'./assets/heroes/knight/character.png',team:'นักรบ',hp:100,dmg:25,range:1,cool:1,move:100,effect:'slash',triggerEvery:4,images:{art:'./assets/heroes/knight/art.gif',idle:'./assets/heroes/knight/idle.gif',attack:'./assets/heroes/knight/attack.gif'},visual:{attackMs:900}};
r.registerHero(base);
assert.equal(r.HEROES.premium_demo.images.art,base.images.art);
assert.equal(r.HEROES.premium_demo.images.idle,base.images.idle);
assert.equal(r.HEROES.premium_demo.images.attack,base.images.attack);
assert.equal(r.HEROES.premium_demo.visual.attackMs,900);
r.registerEnemy({id:'gif_enemy',name:'GIF Enemy',portrait:'./assets/enemies/slime/character.png',hp:100,dmg:20,range:1,cool:1,move:10,images:{art:'./assets/enemies/slime/art.gif',idle:'./assets/enemies/slime/idle.png',attack:'./assets/enemies/slime/attack.gif'}});
assert.equal(r.ENEMIES.gif_enemy.images.attack,'./assets/enemies/slime/attack.gif');
assert.throws(()=>r.registerHero({...base,id:'unsafe',images:{art:'https://evil.test/a.gif'}}),/PNG\/GIF/);
assert.throws(()=>r.registerHero({...base,id:'bad_ms',visual:{attackMs:-1}}),/attackMs/);
r.registerHero({...base,id:'legacy',images:undefined});
assert.equal(r.HEROES.legacy.images.idle,base.portrait);
console.log('✅ Contract test: art, idle, attack accept PNG/GIF and fallbacks are intact');
