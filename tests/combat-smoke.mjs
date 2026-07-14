import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
let source = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
if (!source) throw new Error('找不到游戏脚本');

source = source.replace(/\}\)\(\);\s*$/, `
  globalThis.__game = {
    update,
    get state(){ return {running,paused,choiceOpen,inWave,spawnQueue,towers,enemies,shots,floaters,pads,route,mods,types}; },
    setState(next){
      if ('running' in next) running=next.running;
      if ('paused' in next) paused=next.paused;
      if ('choiceOpen' in next) choiceOpen=next.choiceOpen;
      if ('inWave' in next) inWave=next.inWave;
      if ('spawnQueue' in next) spawnQueue=next.spawnQueue;
      if ('towers' in next) towers=next.towers;
      if ('enemies' in next) enemies=next.enemies;
      if ('shots' in next) shots=next.shots;
      if ('floaters' in next) floaters=next.floaters;
    }
  };
})();`);

class ClassList {
  values = new Set(['hidden']);
  add(...names){ names.forEach(name => this.values.add(name)); }
  remove(...names){ names.forEach(name => this.values.delete(name)); }
  toggle(name, force){
    if (force === undefined) force = !this.values.has(name);
    force ? this.values.add(name) : this.values.delete(name);
    return force;
  }
  contains(name){ return this.values.has(name); }
}

function element(id=''){
  const child = {textContent:''};
  return {
    id, textContent:'', innerHTML:'', hidden:false, disabled:false, dataset:{},
    className:'', classList:new ClassList(),
    style:{setProperty(){}},
    addEventListener(){}, querySelector(){return child;}, click(){this.onclick?.();},
    appendChild(){}, setPointerCapture(){},
    getBoundingClientRect(){return {left:0,top:0,width:960,height:560};}
  };
}

const elements = new Map();
const getElement = id => {
  if (!elements.has(id)) elements.set(id, element(id));
  return elements.get(id);
};
const canvas = getElement('game');
const context = new Proxy({}, {get(target, key){
  if (key === 'createLinearGradient') return () => ({addColorStop(){}});
  if (!(key in target)) target[key] = () => {};
  return target[key];
}, set(target,key,value){target[key]=value;return true;}});
canvas.getContext = () => context;

const difficultyButtons = ['story','normal','hard'].map(value => {
  const node = element(); node.dataset.difficulty=value; return node;
});
const document = {
  hidden:false,
  getElementById:getElement,
  createElement:() => element(),
  querySelectorAll:selector => selector === '[data-difficulty]' ? difficultyButtons : [],
  addEventListener(){}
};

let now = 0;
const sandbox = {
  console, document, navigator:{}, location:{protocol:'file:'}, devicePixelRatio:1,
  performance:{now:()=>now}, localStorage:{getItem:()=>null,setItem(){}},
  requestAnimationFrame(){}, addEventListener(){}, clearTimeout(){},
  setTimeout(){return 0;}, Math
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, {filename:'index.html'});

getElement('startBtn').click();
const game = sandbox.__game;
const pad = game.state.pads[0];
const roadY = game.state.route[0][1];
for (const [index,type] of ['弓','枪','术','鼓','弩','刀'].entries()) {
  const enemy = {id:900+index,kind:'兵',x:pad.x,y:roadY,seg:0,t:.09,hp:200,maxHp:200,speed:0,r:13,boss:false,armor:0,reward:1,slow:1,slowT:0,abilityT:0,dead:false};
  const tower = {id:910+index,pad:0,type,level:1,cd:0,pop:0,attackAnim:0};
  game.setState({running:true,paused:false,choiceOpen:false,inWave:true,spawnQueue:0,towers:[tower],enemies:[enemy],shots:[],floaters:[]});

  for (let frame=0;frame<60 && enemy.hp===200;frame++) {
    now += 1000/60;
    game.update(1/60);
  }

  assert.ok(enemy.hp < 200, `${type}兵命中后应扣血，实际生命值 ${enemy.hp}`);
  assert.ok(game.state.floaters.some(item => /^−\d+/.test(item.text)), `${type}兵命中后应显示伤害数字`);
}
console.log('combat-smoke: ok (六类一阶兵种均可命中扣血)');
