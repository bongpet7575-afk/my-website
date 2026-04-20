// ── LOADER ──
window.addEventListener('load',()=>{const l=document.getElementById('loader');l.style.opacity='0';setTimeout(()=>l.style.display='none',500);});

// ── SOUND ──
function playSound(id){try{const a=document.getElementById(id);if(a){a.currentTime=0;a.volume=0.4;a.play().catch(()=>{});}}catch(e){}}

// ── NOTIFY ──
function notify(msg,color='var(--gold)'){
  const n=document.getElementById('notification');
  n.textContent=msg;n.style.color=color;n.style.display='block';
  clearTimeout(n._t);n._t=setTimeout(()=>n.style.display='none',3000);
}

// ── DUNGEON STATE ──
let currentStage = null;
let dungeonWave = 0;
let dungeonMonstersLeft = 0;
let dungeonQueue = [];

// ── TUTORIAL MODE ──
const TUTORIAL_CONFIG = {
  enabled: true,
  levelThreshold: 3,
  damageMultiplier: 1.5,
  enemyDamageMultiplier: 0.6,
  enemyHPMultiplier: 0.7,
  hints: { firstCombat: true, firstMagic: false, firstDefend: false, firstFlee: false }
};
function isTutorialActive(){ return TUTORIAL_CONFIG.enabled && state.level <= TUTORIAL_CONFIG.levelThreshold; }
function applyTutorialScaling(enemy){
  if(!isTutorialActive()) return enemy;
  enemy.hp    = Math.floor(enemy.hp    * TUTORIAL_CONFIG.enemyHPMultiplier);
  enemy.maxHp = Math.floor(enemy.maxHp * TUTORIAL_CONFIG.enemyHPMultiplier);
  enemy.atk   = Math.floor(enemy.atk   * TUTORIAL_CONFIG.enemyDamageMultiplier);
  return enemy;
}
function getTutorialDamageBonus(){ return isTutorialActive() ? TUTORIAL_CONFIG.damageMultiplier : 1; }
function showTutorialHint(hintType){
  if(!isTutorialActive()||!TUTORIAL_CONFIG.hints[hintType])return;
  const hints={
    firstCombat:"💡 TIP: Click 'Attack' to deal damage!",
    firstMagic:"💡 TIP: You can use 'Magic' to deal extra damage! It costs MP.",
    firstDefend:"💡 TIP: Use 'Defend' to reduce incoming damage!",
    firstFlee:"💡 TIP: You can 'Flee' from combat if you're losing!"
  };
  if(hints[hintType]){ addCombatLog(hints[hintType],'info'); TUTORIAL_CONFIG.hints[hintType]=false; }
}
function exitTutorialMode(){ TUTORIAL_CONFIG.enabled=false; addLog('📚 Tutorial Mode disabled!','gold'); notify('Tutorial Mode disabled!','var(--gold)'); }
function updateTutorialStatus(){
  const el=document.getElementById('tutorial-indicator');
  if(!el)return;
  el.innerHTML=isTutorialActive()?`<div style="padding:8px;background:rgba(100,200,255,0.2);border:1px solid #64c8ff;border-radius:4px;font-size:0.8em;color:#64c8ff;">📚 Tutorial Mode (Lv.${state.level}/${TUTORIAL_CONFIG.levelThreshold})<button onclick="exitTutorialMode()" style="margin-left:8px;padding:2px 6px;font-size:0.75em;">Exit</button></div>`:'';
}

// ── PARTICLES ──
function spawnParticles(x,y,color='#f0c040',count=12){
  for(let i=0;i<count;i++){
    const p=document.createElement('div');p.className='particle';
    const angle=Math.random()*360,dist=Math.random()*80+30;
    const tx=Math.cos(angle*Math.PI/180)*dist+'px',ty=Math.sin(angle*Math.PI/180)*dist+'px';
    p.style.cssText=`left:${x}px;top:${y}px;width:${Math.random()*6+3}px;height:${Math.random()*6+3}px;background:${color};--tx:${tx};--ty:${ty};animation-duration:${Math.random()*0.5+0.5}s;`;
    document.body.appendChild(p);setTimeout(()=>p.remove(),1000);
  }
}
function showLevelUpEffect(){
  const div=document.createElement('div');div.className='levelup-text';div.textContent='⭐ LEVEL UP! ⭐';
  document.body.appendChild(div);setTimeout(()=>div.remove(),2000);
  spawnParticles(window.innerWidth/2,window.innerHeight/2,'#f0c040',20);
}
function showCritEffect(){
  const div=document.createElement('div');div.className='crit-text';div.textContent='💥 CRITICAL HIT!';
  document.body.appendChild(div);setTimeout(()=>div.remove(),800);
}

// ── RARITY ──
const RARITY={
  legendary:{label:'Legendary',color:'var(--legendary)',chance:0.013,mult:3.1},
  epic:{label:'Epic',color:'var(--epic)',chance:0.028,mult:2.6},
  rare:{label:'Rare',color:'var(--rare)',chance:0.058,mult:2.1},
  uncommon:{label:'Uncommon',color:'var(--uncommon)',chance:0.35,mult:1.5},
  normal:{label:'Normal',color:'#cccccc',chance:1,mult:1},
};
function rollRarity(isBoss=false){
  const r=Math.random();
  if(isBoss){ if(r<0.015)return'legendary'; if(r<0.040)return'epic'; if(r<0.070)return'rare'; return'uncommon'; }
  else { if(r<0.05)return'rare'; if(r<0.20)return'uncommon'; return'normal'; }
}

const enemies = {
  goblinScout: {
    name: "👹 Goblin Scout",
    emoji: "👹",
    level: 28,
    hp: 56000,
    maxHp: 56000,
    attack: 1240,
    armor: 320,
    dodge: 8,       // percentage
    hit: 85,        // percentage
    crit: 12,       // percentage
  },
  // ... other enemies
};

// ── STATE ──
const state={
  // Identity (set on login/register)
  character_id: null,
  user_id: null,

  // Active debuffs (cleared after combat)
  activeDebuffs:{ maxHpReduction:0, webTrapped:0, rageTimer:0 },

  // Bonus tracking
  classBonuses:{ strMult:0,agiMult:0,intMult:0,staMult:0,hitMult:0,critMult:0,dodgeMult:0,hpRegenMult:0,maxHpMult:0,maxMpMult:0,mpRegenMult:0,armorMult:0,mpMult:0,lifeStealMult:0,attackPowerMult:0,hpMult:0 },
  talentBonuses:{ strMult:0,agiMult:0,intMult:0,staMult:0,hitMult:0,critMult:0,dodgeMult:0,hpRegenMult:0,mpRegenMult:0,armorMult:0,mpMult:0,lifeStealMult:0,attackPowerMult:0,maxHpMult:0,hpMult:0 },

  // Equipment bonuses
  equipStr:0,equipStrMult:0,equipAgi:0,equipAgiMult:0,equipInt:0,equipIntMult:0,
  equipSta:0,equipStaMult:0,equipMaxHpMult:0,equipMaxMpMult:0,equipMaxMp:0,equipMaxHp:0,
  equipArmor:0,equipArmorMult:0,equipCrit:0,equipDodge:0,equipDodgeMult:0,
  equipLifeSteal:0,equipLifeStealMult:1.0,equipAttackPower:0,equipAttackPowerMult:0,
  equipHpRegen:0,equipHpRegenMult:0,equipMpRegen:0,equipMpRegenMult:0,equipHit:0,equipHitMult:0,

  // Core
  name:'',level:1,xp:0,xpNext:2000,maxLevel:100,
  hp:100,maxHp:100,mp:50,maxMp:50,
  gold:0,goldMult:1.0,difficulty:'normal',

  // Primary base stats
  baseStr:5,baseAgi:5,baseInt:5,baseSta:5,baseArmor:5,
  baseHit:2,baseCrit:0.1,baseDodge:2,baseHpRegen:20,baseLifeSteal:0.01,baseAttackPower:10,

  // Stat multipliers (starts at 1.0)
  strMult:1.0,agiMult:1.0,intMult:1.0,staMult:1.0,armorMult:1.0,
  maxHpMult:1.0,hpRegenMult:1.0,maxMpMult:1.0,mpMult:1.0,
  critMult:1.0,dodgeMult:1.0,mpRegenMult:1.0,hitMult:1.0,
  lifeStealMult:1.0,attackPowerMult:1.0,
  skillStrMult:1.0,skillStaMult:1.0,skillMaxHp:1.0,skillArmorMult:1.0,

  // Effective stats (calculated by calcStats)
  str:5,agi:5,int:5,sta:5,armor:0,
  hit:0,crit:0,dodge:0,lifeSteal:0,attackPower:0,
  hpRegen:0,manaRegen:0,

  // Inventory / Equipment
  inventory:[],
  equipped:{ weapon:null,armor:null,helmet:null,boots:null,ring:null,amulet:null },

  // Progression
  class:null,talentPoints:0,unlockedTalents:[],talentUnlockedFlags:{},
  skills:[],skillCooldowns:{},

  // Flags
  defending:false,manaShield:false,usedUndying:false,battleCryActive:false,

  // UI state
  currentScene:'town',invTab:'equipment',shopTab:'equipment',
  autoSell:{ normal:false,uncommon:false,rare:false,epic:false },

  // Quests
  quests:{
    kill1:{text:'🗡️ Defeat your first enemy',done:false},
    gold50:{text:'💰 Earn 50 gold',done:false},
    level5:{text:'⭐ Reach Level 5',done:false},
    level10:{text:'🏆 Reach Level 10',done:false},
    boss:{text:'🐉 Defeat a Boss',done:false},
    class:{text:'✨ Choose a Class',done:false},
    talent:{text:'🌟 Unlock a Talent',done:false},
    equip:{text:'🛡️ Equip an item',done:false},
    legendary:{text:'🔱 Find a Legendary item',done:false},
    craft:{text:'⚗️ Craft an item',done:false},
    level50:{text:'👑 Reach Level 50',done:false},
    level100:{text:'🌟 Reach Max Level 100',done:false},
  }
};

// ── DIFFICULTY ──
const DIFFICULTY={
  normal:{ label:'Normal',icon:'⚔️',color:'#cccccc',levelReq:0,hpMult:1,atkMult:1,armorMult:1,hitMul:1,dodgeMult:1,goldMult:1,xpMult:1,rarityBonus:0,legendaryChance:0.0001 },
  hard:{   label:'Hard',  icon:'🔥',color:'#ff8800',levelReq:40,hpMult:4,atkMult:4,armorMult:10,hitMul:10,dodgeMult:10,goldMult:1.5,xpMult:1.5,rarityBonus:0,legendaryChance:0.0002 },
  hell:{   label:'Hell',  icon:'💀',color:'#ff2222',levelReq:80,hpMult:8,atkMult:8,armorMult:20,hitMul:20,dodgeMult:20,goldMult:2,xpMult:2,rarityBonus:1,legendaryChance:0.0003 },
};
function setDifficulty(diff){
  const d=DIFFICULTY[diff];
  if(state.level<d.levelReq){ notify(`⚠️ Need Level ${d.levelReq} for ${d.label} mode!`,'var(--red)'); return; }
  state.difficulty=diff;
  ['normal','hard','hell'].forEach(k=>{
    const btn=document.getElementById(`diff-btn-${k}`);if(!btn)return;
    btn.style.opacity=k===diff?'1':'0.4';btn.style.transform=k===diff?'scale(1.08)':'scale(1)';
  });
  notify(`${d.icon} ${d.label} Mode activated!`,d.color);
  addLog(`${d.icon} Difficulty set to ${d.label}!`,'gold');
}

// ── CALC STATS ──
function calcStats(){
  const strMult      = state.strMult      + (state.classBonuses.strMult     ||0) + (state.talentBonuses.strMult     ||0) + (state.equipStrMult || 0);
  const agiMult      = state.agiMult      + (state.classBonuses.agiMult     ||0) + (state.talentBonuses.agiMult     ||0) + (state.equipAgiMult || 0);
  const intMult      = state.intMult      + (state.classBonuses.intMult     ||0) + (state.talentBonuses.intMult     ||0) + (state.equipIntMult || 0);
  const staMult      = state.staMult      + (state.classBonuses.staMult     ||0) + (state.talentBonuses.staMult     ||0) + (state.equipStaMult || 0);
  const atkpMult     = state.attackPowerMult + (state.classBonuses.attackPowerMult||0) + (state.talentBonuses.attackPowerMult||0) + (state.equipAttackPowerMult || 0);
  const armorMult    = state.armorMult    + (state.classBonuses.armorMult   ||0) + (state.talentBonuses.armorMult   ||0) + (state.equipAmorMult || 0);
  const critMult     = state.critMult     + (state.classBonuses.critMult    ||0) + (state.talentBonuses.critMult    ||0);
  const dodgeMult    = state.dodgeMult    + (state.classBonuses.dodgeMult   ||0) + (state.talentBonuses.dodgeMult   ||0) + (state.equipDodgeMult || 0);
  const hitMult      = state.hitMult      + (state.classBonuses.hitMult     ||0) + (state.talentBonuses.hitMult     ||0) + (state.equipHitMult || 0);
  const mpMult       = state.mpMult       + (state.classBonuses.mpMult      ||0) + (state.talentBonuses.mpMult      ||0) + (state.equipMpMult || 0);
  const hpRegenMult  = state.hpRegenMult  + (state.classBonuses.hpRegenMult ||0) + (state.talentBonuses.hpRegenMult ||0) + (state.equipHpRenMult || 0);
  const mpRegenMult  = state.mpRegenMult  + (state.classBonuses.mpRegenMult ||0) + (state.talentBonuses.mpRegenMult ||0) + (state.equipMpRegenMult || 0);

  state.str = Math.floor(state.baseStr * strMult) + (state.equipStr||0) + (state.talentBonuses.baseStr||0);
  state.agi = Math.floor(state.baseAgi * agiMult) + (state.equipAgi||0) + (state.talentBonuses.baseAgi||0);
  state.int = Math.floor(state.baseInt * intMult) + (state.equipInt||0) + (state.talentBonuses.baseInt||0);
  state.sta = Math.floor(state.baseSta * staMult) + (state.equipSta||0) + (state.talentBonuses.baseSta||0);
  state.attackPower = Math.floor(
  (state.str * 4 + state.int * 3 + state.level * 15) * atkpMult
) + (state.equipAttackPower||0) + (state.talentBonuses.baseAttackPower||0);
  state.maxHp = Math.floor(
  100 + (state.str * 20) + (state.sta * 30) + (state.level * 80)
) + (state.equipMaxHp||0);
  state.armor = Math.floor(
  ((state.agi * 8 + state.baseArmor + state.level * 10 + (state.talentBonuses.baseArmor||0)) * armorMult)
) + (state.equipArmor||0);
  state.crit         = Math.floor(((state.agi*0.0005+state.baseCrit)*critMult) + (state.equipCrit||0) + (state.talentBonuses.baseCrit||0));
  state.dodge        = Math.floor(((state.agi*1.9+state.baseDodge)*dodgeMult) + (state.equipDodge||0) + (state.talentBonuses.baseDodge||0));
  state.hit          = Math.floor(((state.agi*5.3+state.baseHit)*hitMult) + (state.equipHit||0) + (state.talentBonuses.baseHit||0));
  state.maxMp        = Math.floor((50+state.int*3)*mpMult) + (state.equipMaxMp||0);
  state.manaRegen    = Math.floor((0.5+state.int*1.5)*mpRegenMult) + (state.equipMpRegen||0);
  state.hpRegen      = Math.floor((state.sta*0.5+state.baseHpRegen+(state.talentBonuses.baseHpRegen||0))*hpRegenMult) + (state.equipHpRegen||0);
  state.lifeSteal    = (state.baseLifeSteal*state.lifeStealMult) + (state.equipLifeSteal||0);
  state.hp = Math.min(state.hp, state.maxHp);
  state.mp = Math.min(state.mp, state.maxMp);
}

// ── CLASSES ──
const CLASSES={
  warrior:{name:'Warrior',icon:'⚔️',desc:'A mighty melee fighter. +10% STR bonus.',
    bonuses:{strMult:0.10,staMult:0.10},skills:['power_strike','battle_cry','last_stand'],
    trees:{
      dps:{name:'🗡️ DPS',talents:[
        {id:'berserker',name:'Berserker Rage',desc:'10% CRIT per rank',cost:5,ranks:10,effect:()=>{state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+1;}},
        {id:'cleave',name:'Brute Force',desc:'20% CRIT per rank',cost:10,ranks:5,effect:()=>{state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+2;}},
        {id:'execute',name:'Killing Blow',desc:'30% CRIT per rank',cost:20,ranks:3,effect:()=>{state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+3;}},
      ]},
      tank:{name:'🛡️ Tank',talents:[
        {id:'iron_skin',name:'Iron Skin',desc:'10% ARMOR per rank',cost:5,ranks:10,effect:()=>{state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.1;}},
        {id:'fortress',name:'Iron Fortress',desc:'20% ARMOR per rank',cost:10,ranks:5,effect:()=>{state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.2;}},
        {id:'shield_wall',name:'Hardened Skin',desc:'30% ARMOR per rank',cost:20,ranks:3,effect:()=>{state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.3;}},
      ]},
      heal:{name:'💚 Self Heal',talents:[
        {id:'second_wind',name:'Tough Body',desc:'10% HP regen per rank',cost:5,ranks:10,effect:()=>{state.talentBonuses.hpRegenMult=(state.talentBonuses.hpRegenMult||0)+0.1;}},
        {id:'undying',name:'Endurance',desc:'20% HP regen per rank',cost:10,ranks:5,effect:()=>{state.talentBonuses.hpRegenMult=(state.talentBonuses.hpRegenMult||0)+0.2;}},
        {id:'regeneration',name:'Vitality',desc:'30% HP regen per rank',cost:20,ranks:3,effect:()=>{state.talentBonuses.hpRegenMult=(state.talentBonuses.hpRegenMult||0)+0.3;}},
      ]}
    }
  },
  mage:{name:'Mage',icon:'🔮',desc:'A powerful spellcaster. +10% INT bonus.',
    bonuses:{intMult:0.10,mpMult:0.05},skills:['fireball','ice_lance','mana_shield'],
    trees:{
      fire:{name:'🔥 Fire',talents:[
        {id:'fire_mastery',name:'Fire Mastery',desc:'1% CRIT per rank',cost:5,ranks:5,effect:()=>{state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+1;}},
        {id:'ignite',name:'Burning Mind',desc:'2% CRIT per rank',cost:10,ranks:5,effect:()=>{state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+2;}},
        {id:'meteor',name:'Arcane Intellect',desc:'3% CRIT per rank',cost:20,ranks:3,effect:()=>{state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+3;}},
      ]},
      ice:{name:'❄️ Ice',talents:[
        {id:'frost',name:'Frost Barrier',desc:'1% AR per rank',cost:5,ranks:10,effect:()=>{state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.1;}},
        {id:'ice_armor',name:'Ice Armor',desc:'2% DODGE per rank',cost:10,ranks:5,effect:()=>{state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.2;}},
        {id:'blizzard',name:'Ice Mind',desc:'3% DODGE per rank',cost:20,ranks:3,effect:()=>{state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.3;}},
      ]},
      arcane:{name:'✨ Arcane',talents:[
        {id:'mana_regen',name:'Mana Pool',desc:'1% MP regen per rank',cost:5,ranks:10,effect:()=>{state.talentBonuses.mpRegenMult=(state.talentBonuses.mpRegenMult||0)+0.1;}},
        {id:'spell_power',name:'Spellcraft',desc:'2% MP regen per rank',cost:10,ranks:5,effect:()=>{state.talentBonuses.mpRegenMult=(state.talentBonuses.mpRegenMult||0)+0.2;}},
        {id:'arcane_surge',name:'Arcane Mastery',desc:'3% MP regen per rank',cost:20,ranks:3,effect:()=>{state.talentBonuses.mpRegenMult=(state.talentBonuses.mpRegenMult||0)+0.3;}},
      ]}
    }
  },
  rogue:{name:'Rogue',icon:'🗡️',desc:'A cunning assassin. +20% AGI',
    bonuses:{agiMult:0.2,goldMult:1.0},skills:['backstab','poison_blade','shadow_step'],
    trees:{
      assassination:{name:'☠️ Assassin',talents:[
        {id:'crit',name:'Precision',desc:'1% CRIT per rank',cost:5,ranks:10,effect:()=>{state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+1;}},
        {id:'ambush',name:'Swift Strike',desc:'2% CRIT per rank',cost:10,ranks:5,effect:()=>{state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+2;}},
        {id:'death_mark',name:'Lethal Focus',desc:'3% CRIT per rank',cost:20,ranks:3,effect:()=>{state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+2;}},
      ]},
      subtlety:{name:'🌑 Subtlety',talents:[
        {id:'evasion',name:'Agility',desc:'1% DODGE per rank',cost:5,ranks:10,effect:()=>{state.talentBonuses.dodgeMult=(state.talentBonuses.dodgeMult||0)+0.1;}},
        {id:'smoke_bomb',name:'Nimble Feet',desc:'2% DODGE per rank',cost:10,ranks:5,effect:()=>{state.talentBonuses.dodgeMult=(state.talentBonuses.dodgeMult||0)+0.2;}},
        {id:'vanish',name:'Shadow Reflex',desc:'3% DODGE per rank',cost:20,ranks:3,effect:()=>{state.talentBonuses.dodgeMult=(state.talentBonuses.dodgeMult||0)+0.3;}},
      ]},
      poison:{name:'🐍 Poison',talents:[
        {id:'venom',name:'Toxic Edge',desc:'1% HP regen per rank',cost:5,ranks:10,effect:()=>{state.talentBonuses.mpRegenMult=(state.talentBonuses.mpRegenMult||0)+0.1;}},
        {id:'cripple',name:'Predator',desc:'2% HP regen per rank',cost:10,ranks:5,effect:()=>{state.talentBonuses.mpRegenMult=(state.talentBonuses.mpRegenMult||0)+0.2;}},
        {id:'plague',name:'Virulence',desc:'3% HP regen per rank',cost:20,ranks:3,effect:()=>{state.talentBonuses.hpRegenMult=(state.talentBonuses.hpRegenMult||0)+0.3;}},
      ]}
    }
  }
};

// ── SKILLS ──
const SKILLS={
  power_strike:{name:'Power Strike',icon:'💥',mp:()=>Math.floor(state.maxMp*0.10),cd:1,use:(e)=>{
    const d=Math.floor(state.attackPower*2.2);e.hp-=d;addCombatLog(`💥 Power Strike! ${d} dmg!`,'good');playSound('snd-attack');animateAttack(true,d,false);return d;}},
  battle_cry:{name:'Battle Cry',icon:'📯',mp:()=>Math.floor(state.maxMp*0.15),cd:5,use:(e)=>{
    if(state.battleCryActive){addCombatLog(`📯 Battle Cry already active!`,'info');return 0;}
    state.battleCryActive=true;state.strMult*=2.5;state.armorMult*=2.4;state.hitMult*=1.5;
    addCombatLog(`📯 Battle Cry! +50% STR, +40% ARMOR!`,'good');playSound('snd-magic');calcStats();return 0;}},
  last_stand:{name:'Last Stand',icon:'🛡️',mp:()=>Math.floor(state.maxMp*0.20),cd:1,use:(e)=>{
    const h=Math.floor(state.maxHp*0.15);state.hp=Math.min(state.maxHp,state.hp+h);
    addCombatLog(`🛡️ Last Stand! +${h} HP!`,'good');playSound('snd-heal');spawnDmgFloat(`+${h}HP`,false,'heal-float');calcStats();return 0;}},
  fireball:{name:'Fireball',icon:'🔥',mp:()=>Math.floor(state.maxMp*0.12),cd:1,use:(e)=>{
    const d=Math.floor(state.int*6+Math.random()*state.int*2);e.hp-=d;addCombatLog(`🔥 Fireball! ${d} dmg!`,'good');playSound('snd-magic');animateAttack(true,d,false);return d;}},
  ice_lance:{name:'Ice Lance',icon:'❄️',mp:()=>Math.floor(state.maxMp*0.10),cd:2,use:(e)=>{
    const d=Math.floor(state.int*4.5);e.hp-=d;e.frozen=true;
    addCombatLog(`❄️ Ice Lance! ${d} dmg — Frozen!`,'info');playSound('snd-magic');animateAttack(true,d,false);return d;}},
  mana_shield:{name:'Mana Shield',icon:'🔮',mp:()=>Math.floor(state.maxMp*0.25),cd:4,use:(e)=>{
    state.manaShield=true;addCombatLog(`🔮 Mana Shield active!`,'info');playSound('snd-heal');return 0;}},
  backstab:{name:'Backstab',icon:'🗡️',mp:()=>Math.floor(state.maxMp*0.08),cd:1,use:(e)=>{
    const d=Math.floor(state.attackPower*1.5+state.agi*3);e.hp-=d;addCombatLog(`🗡️ Backstab! ${d} dmg!`,'good');playSound('snd-attack');animateAttack(true,d,false);return d;}},
  poison_blade:{name:'Poison Blade',icon:'🐍',mp:()=>Math.floor(state.maxMp*0.12),cd:2,use:(e)=>{
    const stacks=5,tick=Math.floor(state.agi*1.8+state.attackPower*1.3);
    e.poisoned=(e.poisoned||0)+stacks;e.poisonDmg=tick;
    addCombatLog(`🐍 Poisoned! ${tick} dmg/tick for ${stacks} turns!`,'good');playSound('snd-magic');return 0;}},
  shadow_step:{name:'Shadow Step',icon:'🌑',mp:()=>Math.floor(state.maxMp*0.15),cd:3,use:(e)=>{
    const d=Math.floor(state.attackPower*2.0+state.agi*4);e.hp-=d;addCombatLog(`🌑 Shadow Step! ${d} dmg!`,'purple');playSound('snd-magic');animateAttack(true,d,false);return d;}},
};

function spawnAbilityFloat(text,color='#ffffff'){
  const div=document.createElement('div');
  div.style.cssText=`position:fixed;top:35%;left:50%;transform:translate(-50%,-50%);font-family:'Cinzel',serif;font-size:1.6em;font-weight:700;color:${color};text-shadow:0 0 20px ${color};pointer-events:none;z-index:9999;animation:critFlash 1s ease forwards;white-space:nowrap;`;
  div.textContent=text;document.body.appendChild(div);setTimeout(()=>div.remove(),1000);
}

// ── SWITCH MAIN SCENE ──
function switchMainScene(scene){
  document.querySelectorAll('.main-scene').forEach(s=>s.style.display='none');
  document.getElementById(`main-scene-${scene}`).style.display='block';
  ['char','adv','town'].forEach(s=>document.getElementById(`nav-${s}`).classList.remove('active'));
  document.getElementById(`nav-${scene}`).classList.add('active');
  if(scene==='adv')loadScene(state.currentScene||'town');
  if(scene==='town')renderShop();
}

const MONSTER_TEMPLATES = {
  // Stage 1 — Level 1-9 — atk ~player lvl1 ATK (80), HP takes ~15 hits
  young_wolf:      {id:'young_wolf',     name:'🐺 Young Wolf',      icon:'wolf',    hp:1200,   atk:60,    armor:40,   hit:80,   dodge:50,   xp:800,   gold:[300,600]},
  forest_wolf:     {id:'forest_wolf',    name:'🐺 Forest Wolf',     icon:'wolf',    hp:1800,   atk:120,    armor:100,   hit:160,  dodge:130,   xp:1200,  gold:[500,1000]},
  shadow_wolf:     {id:'shadow_wolf',    name:'🐺 Shadow Wolf',     icon:'wolf',    hp:2400,   atk:240,   armor:200,   hit:220,  dodge:190,   xp:1600,  gold:[800,1400]},
  dire_wolf:       {id:'dire_wolf',      name:'🐺 Dire Wolf',       icon:'wolf',    hp:3200,   atk:400,   armor:380,  hit:350,  dodge:250,  xp:2000,  gold:[1000,1800]},

  // Stage 2 — Level 10-19 — player ATK ~290, HP ~1730
  cave_spider:     {id:'cave_spider',    name:'🕷️ Cave Spider',     icon:'spider',  hp:8000,   atk:2200,   armor:2000,  hit:1200,  dodge:800,  xp:2400,  gold:[1200,2000]},
  venom_spider:    {id:'venom_spider',   name:'🕷️ Venom Spider',    icon:'spider',  hp:12000,  atk:2800,   armor:2600,  hit:1800,  dodge:1000,  xp:3000,  gold:[1600,2600]},
  giant_spider:    {id:'giant_spider',   name:'🕷️ Giant Spider',    icon:'spider',  hp:18000,  atk:3400,   armor:3200,  hit:2000,  dodge:1600,  xp:3700,  gold:[2000,3200]},
  queen_spider:    {id:'queen_spider',   name:'🕷️ Queen Spider',    icon:'spider',  hp:26000,  atk:4200,   armor:4000,  hit:2500,  dodge:1900,  xp:4500,  gold:[2500,4000]},

  // Stage 3 — Level 20-29 — player ATK ~620, HP ~3580
  goblin_scout:    {id:'goblin_scout',   name:'👹 Goblin Scout',    icon:'goblin',  hp:40000,  atk:4800,   armor:3000,  hit:2000,  dodge:1000,  xp:5400,  gold:[3000,4800]},
  goblin_warrior:  {id:'goblin_warrior', name:'👹 Goblin Warrior',  icon:'goblin',  hp:60000,  atk:5800,   armor:4200,  hit:3500,  dodge:2800,  xp:6500,  gold:[3800,5800]},
  goblin_shaman:   {id:'goblin_shaman',  name:'👹 Goblin Shaman',   icon:'goblin',  hp:85000,  atk:7000,   armor:5000,  hit:4000,  dodge:3000,  xp:7800,  gold:[4600,7000]},
  goblin_elite:    {id:'goblin_elite',   name:'👹 Goblin Elite',    icon:'goblin',  hp:120000, atk:8600,   armor:6400,  hit:5500, dodge:4800,  xp:9400,  gold:[5600,8400]},

  // Stage 4 — Level 30-39 — player ATK ~1050, HP ~6280
  skeleton_archer: {id:'skeleton_archer',name:'💀 Skeleton Archer', icon:'skeleton',hp:160000, atk:10000,  armor:8000, hit:6500, dodge:5000, xp:11000, gold:[6600,10000]},
  skeleton_warrior:{id:'skeleton_warrior',name:'💀 Skeleton Warrior',icon:'skeleton',hp:220000, atk:12000,  armor:10800, hit:8000, dodge:6000, xp:13200, gold:[8000,12000]},
  skeleton_mage:   {id:'skeleton_mage',  name:'💀 Skeleton Mage',   icon:'skeleton',hp:300000, atk:14500,  armor:12700, hit:10200, dodge:9500, xp:15800, gold:[9600,14400]},
  skeleton_knight: {id:'skeleton_knight',name:'💀 Skeleton Knight', icon:'skeleton',hp:420000, atk:17500,  armor:14100, hit:12000, dodge:10500, xp:19000, gold:[11600,17400]},

  // Stage 5 — Level 40-49 — player ATK ~1580, HP ~9780
  orc_grunt:       {id:'orc_grunt',      name:'👊 Orc Grunt',       icon:'orc',     hp:560000, atk:20000,  armor:17000, hit:15000, dodge:12000, xp:22800, gold:[14000,21000]},
  orc_warrior:     {id:'orc_warrior',    name:'👊 Orc Warrior',     icon:'orc',     hp:760000, atk:24000,  armor:21000, hit:18000, dodge:13000, xp:27400, gold:[16800,25200]},
  orc_shaman:      {id:'orc_shaman',     name:'👊 Orc Shaman',      icon:'orc',     hp:1000000,atk:29000,  armor:24000, hit:20000, dodge:17000, xp:32800, gold:[20200,30200]},
  orc_berserker:   {id:'orc_berserker',  name:'👊 Orc Berserker',   icon:'orc',     hp:1400000,atk:35000,  armor:29000, hit:22000, dodge:19000, xp:39400, gold:[24200,36400]},

  // Stage 6 — Level 50-59 — player ATK ~2210, HP ~14080
  vampire_thrall:  {id:'vampire_thrall', name:'🧛 Vampire Thrall',  icon:'vampire', hp:1800000,atk:42000,  armor:35000, hit:26000, dodge:22000, xp:47200, gold:[29000,43600]},
  vampire_hunter:  {id:'vampire_hunter', name:'🧛 Vampire Hunter',  icon:'vampire', hp:2400000,atk:50000,  armor:40000, hit:30000, dodge:25000, xp:56800, gold:[35000,52400]},
  vampire_noble:   {id:'vampire_noble',  name:'🧛 Vampire Noble',   icon:'vampire', hp:3200000,atk:60000,  armor:50000, hit:40000, dodge:30000, xp:68200, gold:[42000,63000]},
  vampire_elder:   {id:'vampire_elder',  name:'🧛 Vampire Elder',   icon:'vampire', hp:4200000,atk:72000,  armor:60000,hit:48000, dodge:38200, xp:81800, gold:[50400,75600]},

  // Stage 7 — Level 60-69 — player ATK ~2940, HP ~19180
  cave_troll:      {id:'cave_troll',     name:'👾 Cave Troll',      icon:'troll',   hp:5500000,atk:85000,  armor:66000,hit:40500,dodge:30500, xp:98200, gold:[60500,90800]},
  rock_troll:      {id:'rock_troll',     name:'👾 Rock Troll',      icon:'troll',   hp:7200000,atk:100000, armor:84500,hit:62500,dodge:45000,xp:117800,gold:[72600,109000]},
  frost_troll:     {id:'frost_troll',    name:'👾 Frost Troll',     icon:'troll',   hp:9500000,atk:120000, armor:97500,hit:75000,dodge:55000,xp:141400,gold:[87200,130800]},
  war_troll:       {id:'war_troll',      name:'👾 War Troll',       icon:'troll',   hp:12500000,atk:145000,armor:111000,hit:80000,dodge:70500,xp:169600,gold:[104600,157000]},

  // Stage 8 — Level 70-79 — player ATK ~3770, HP ~25080
  demon_scout:     {id:'demon_scout',    name:'😈 Demon Scout',     icon:'demon',   hp:16000000,atk:170000,armor:140000,hit:121000,dodge:87000,xp:203600,gold:[125600,188400]},
  demon_warrior:   {id:'demon_warrior',  name:'😈 Demon Warrior',   icon:'demon',   hp:21000000,atk:200000,armor:170000,hit:125000,dodge:99000,xp:244400,gold:[150800,226200]},
  demon_mage:      {id:'demon_mage',     name:'😈 Demon Mage',      icon:'demon',   hp:27000000,atk:240000,armor:206000,hit:160000,dodge:124000,xp:293200,gold:[181000,271400]},
  demon_knight:    {id:'demon_knight',   name:'😈 Demon Knight',    icon:'demon',   hp:35000000,atk:290000,armor:223000,hit:186000,dodge:169000,xp:351800,gold:[217200,325800]},

  // Stage 9 — Level 80-89 — player ATK ~4700, HP ~31780
  shadow_wraith:   {id:'shadow_wraith',  name:'🌑 Shadow Wraith',   icon:'werewolf',hp:44000000,atk:340000,armor:310000,hit:220000,dodge:190000,xp:422200,gold:[260600,391000]},
  shadow_knight:   {id:'shadow_knight',  name:'🌑 Shadow Knight',   icon:'werewolf',hp:56000000,atk:400000,armor:360000,hit:280000,dodge:220000,xp:506600,gold:[312800,469200]},
  shadow_mage:     {id:'shadow_mage',    name:'🌑 Shadow Mage',     icon:'werewolf',hp:70000000,atk:470000,armor:411000,hit:340000,dodge:267000,xp:608000,gold:[375400,563000]},
  shadow_lord:     {id:'shadow_lord',    name:'🌑 Shadow Lord',     icon:'werewolf',hp:88000000,atk:550000,armor:503000,hit:409000,dodge:305000,xp:729600,gold:[450500,675800]},

  // Stage 10 — Level 90-100 — player ATK ~5730, HP ~39280
  eternal_guard:   {id:'eternal_guard',  name:'🌟 Eternal Guard',   icon:'phoenix', hp:110000000,atk:640000,armor:556000, hit:380000, dodge:334000,xp:875600, gold:[540600,811000]},
  eternal_warrior: {id:'eternal_warrior',name:'🌟 Eternal Warrior', icon:'phoenix', hp:140000000,atk:750000,armor:612000,hit:444000, dodge:375000,xp:1050800,gold:[648800,973200]},
  eternal_mage:    {id:'eternal_mage',   name:'🌟 Eternal Mage',    icon:'phoenix', hp:175000000,atk:880000,armor:730000,hit:511000,dodge:458000,xp:1261000,gold:[778600,1168000]},
  eternal_champion:{id:'eternal_champion',name:'🌟 Eternal Champion',icon:'phoenix',hp:220000000,atk:1040000,armor:852000,hit:613000,dodge:504000,xp:1513000,gold:[934400,1401600]},
};

// ── STAGES ──
const STAGES=[
  {id:1, name:'🐺 Wolf Mountain',    levelReq:1,  monsters:['young_wolf','forest_wolf','shadow_wolf','dire_wolf'],                   bossId:'stage_boss_1'},
  {id:2, name:'🕷️ Spider Cavern',    levelReq:10, monsters:['cave_spider','venom_spider','giant_spider','queen_spider'],             bossId:'stage_boss_2'},
  {id:3, name:'👹 Goblin Fortress',  levelReq:20, monsters:['goblin_scout','goblin_warrior','goblin_shaman','goblin_elite'],         bossId:'stage_boss_3'},
  {id:4, name:'💀 Skeleton Crypt',   levelReq:30, monsters:['skeleton_archer','skeleton_warrior','skeleton_mage','skeleton_knight'], bossId:'stage_boss_4'},
  {id:5, name:'👊 Orc Stronghold',   levelReq:40, monsters:['orc_grunt','orc_warrior','orc_shaman','orc_berserker'],                 bossId:'stage_boss_5'},
  {id:6, name:'🧛 Vampire Castle',   levelReq:50, monsters:['vampire_thrall','vampire_hunter','vampire_noble','vampire_elder'],      bossId:'stage_boss_6'},
  {id:7, name:'👾 Troll Caves',      levelReq:60, monsters:['cave_troll','rock_troll','frost_troll','war_troll'],                    bossId:'stage_boss_7'},
  {id:8, name:'😈 Demon Citadel',    levelReq:70, monsters:['demon_scout','demon_warrior','demon_mage','demon_knight'],              bossId:'stage_boss_8'},
  {id:9, name:'🌑 Shadow Realm',     levelReq:80, monsters:['shadow_wraith','shadow_knight','shadow_mage','shadow_lord'],            bossId:'stage_boss_9'},
  {id:10,name:'🌟 Eternal Kingdom',  levelReq:90, monsters:['eternal_guard','eternal_warrior','eternal_mage','eternal_champion'],    bossId:'stage_boss_10'},
];

// ── STAGE BOSSES ──
const STAGE_BOSSES={
  // Boss 1 — after Stage 1 (player ~Lv9, ATK ~260, HP ~1580)
  stage_boss_1:{id:'stage_boss_1',name:'🐺 Wolf King',icon:'🐺',
    hp:18000,atk:500,armor:400,hit:600,dodge:400,xp:4000,gold:[3000,6000],
    ability:{name:'PACK HOWL!',color:'#ffdd00',triggerEvery:3,effect:(e)=>{
      const d=Math.floor(e.atk*0.5);state.hp=Math.max(1,state.hp-d);
      spawnAbilityFloat('🐺 PACK HOWL!','#ffdd00');
      addCombatLog(`🐺 Wolf King howls! Pack attacks for ${d}!`,'bad');
      animateAttack(false,d,false);}},
    cs:{title:'Wolf King',req:'Required: Stage 1 Clear',text:'The mighty Wolf King rises from the pack!'}},

  // Boss 2 — after Stage 2 (player ~Lv19, ATK ~560, HP ~3380)
  stage_boss_2:{id:'stage_boss_2',name:'🕷️ Spider Queen',icon:'🕷️',
    hp:120000,atk:8600,armor:6600,hit:5500,dodge:4600,xp:8000,gold:[8000,16000],
    ability:{name:'WEB TRAP!',color:'#44ff44',triggerEvery:3,effect:(e)=>{
      state.webTrapped=2;
      spawnAbilityFloat('🕸️ WEB TRAP!','#44ff44');
      addCombatLog(`🕸️ Spider Queen webs you! Dodge 0 for 2 turns!`,'bad');}},
    cs:{title:'Spider Queen',req:'Required: Stage 2 Clear',text:'From the depths of her web kingdom, the Spider Queen descends!'}},

  // Boss 3 — after Stage 3 (player ~Lv29, ATK ~940, HP ~6080)
  stage_boss_3:{id:'stage_boss_3',name:'👹 Goblin Warlord',icon:'👹',
    hp:480000,atk:13200,armor:10500,hit:12000,dodge:10200,xp:16000,gold:[15000,28000],
    ability:{name:'GOLD STEAL!',color:'#f0c040',triggerEvery:3,effect:(e)=>{
      const s=Math.floor(state.gold*0.10);state.gold=Math.max(0,state.gold-s);
      spawnAbilityFloat('💰 GOLD STEAL!','#f0c040');
      addCombatLog(`💰 Goblin Warlord steals ${s} gold!`,'bad');}},
    cs:{title:'Goblin Warlord',req:'Required: Stage 3 Clear',text:'The Goblin Warlord commands an army of thieves!'}},

  // Boss 4 — after Stage 4 (player ~Lv39, ATK ~1460, HP ~9480)
  stage_boss_4:{id:'stage_boss_4',name:'💀 Skeleton Lord',icon:'💀',
    hp:1800000,atk:29500,armor:22500,hit:18500,dodge:16500,xp:21000,gold:[30000,55000],
    ability:{name:'DEATH CURSE!',color:'#aa44ff',triggerEvery:3,effect:(e)=>{
      const r=Math.floor(state.maxHp*0.05);
      state.activeDebuffs.maxHpReduction+=r;
      state.equipMaxHp=(state.equipMaxHp||0)-r;
      spawnAbilityFloat('💀 DEATH CURSE!','#aa44ff');
      addCombatLog(`💀 Death Curse! Max HP -${r}!`,'bad');
      calcStats();}},
    cs:{title:'Skeleton Lord',req:'Required: Stage 4 Clear',text:'The Skeleton Lord rises from his eternal tomb!'}},

  // Boss 5 — after Stage 5 (player ~Lv49, ATK ~2090, HP ~13880)
  stage_boss_5:{id:'stage_boss_5',name:'👊 Orc Chieftain',icon:'👊',
    hp:6000000,atk:63000,armor:53000,hit:46000,dodge:33000,xp:42000,gold:[60000,110000],
    ability:{name:'BERSERKER RAGE!',color:'#ff8800',triggerEvery:5,effect:(e)=>{
      currentEnemy.atk=Math.floor(currentEnemy.atk*2);
      currentEnemy.rageTimer=3;
      spawnAbilityFloat('👊 BERSERKER RAGE!','#ff8800');
      addCombatLog(`👊 Orc Chieftain berserk! ATK doubled!`,'bad');}},
    cs:{title:'Orc Chieftain',req:'Required: Stage 5 Clear',text:'The Orc Chieftain is the strongest warrior alive!'}},

  // Boss 6 — after Stage 6 (player ~Lv59, ATK ~2820, HP ~19480)
  stage_boss_6:{id:'stage_boss_6',name:'🧛 Vampire Lord',icon:'🧛',
    hp:18000000,atk:120000,armor:96000,hit:72000,dodge:56000,xp:80000,gold:[110000,200000],
    ability:{name:'LIFE DRAIN!',color:'#ff2244',triggerEvery:3,effect:(e)=>{
      const h=Math.floor(currentEnemy.atk*0.2);
      currentEnemy.hp=Math.min(currentEnemy.maxHp,currentEnemy.hp+h);
      spawnAbilityFloat('🧛 LIFE DRAIN!','#ff2244');
      addCombatLog(`🧛 Vampire Lord drains life! +${h} HP!`,'bad');
      updateEnemyBar();}},
    cs:{title:'Vampire Lord',req:'Required: Stage 6 Clear',text:'The Vampire Lord rules the night!'}},

  // Boss 7 — after Stage 7 (player ~Lv69, ATK ~3650, HP ~26180)
  stage_boss_7:{id:'stage_boss_7',name:'👾 Troll King',icon:'👾',
    hp:55000000,atk:222000,armor:156000,hit:125000,dodge:92000,xp:160000,gold:[200000,380000],
    ability:{name:'REGENERATION!',color:'#00ff88',triggerEvery:2,effect:(e)=>{
      const h=Math.floor(currentEnemy.maxHp*0.03);
      currentEnemy.hp=Math.min(currentEnemy.maxHp,currentEnemy.hp+h);
      spawnAbilityFloat('👾 REGENERATION!','#00ff88');
      addCombatLog(`👾 Troll King regenerates ${h} HP!`,'bad');
      updateEnemyBar();}},
    cs:{title:'Troll King',req:'Required: Stage 7 Clear',text:'The Troll King cannot be killed!'}},

  // Boss 8 — after Stage 8 (player ~Lv79, ATK ~4580, HP ~33980)
  stage_boss_8:{id:'stage_boss_8',name:'😈 Demon Prince',icon:'😈',
    hp:160000000,atk:405000,armor:255000,hit:160000,dodge:135000,xp:300000,gold:[380000,700000],
    ability:{name:'HELLFIRE!',color:'#ff4400',triggerEvery:3,effect:(e)=>{
      const d=Math.floor(currentEnemy.atk*0.8);
      state.hp=Math.max(1,state.hp-d);
      spawnAbilityFloat('😈 HELLFIRE!','#ff4400');
      addCombatLog(`😈 Hellfire! ${d} true damage — armor ignored!`,'bad');
      animateAttack(false,d,false);}},
    cs:{title:'Demon Prince',req:'Required: Stage 8 Clear',text:'The Demon Prince wields hellfire that melts through any armor!'}},

  // Boss 9 — after Stage 9 (player ~Lv89, ATK ~5660, HP ~43280)
  stage_boss_9:{id:'stage_boss_9',name:'🌑 Shadow Emperor',icon:'🌑',
    hp:450000000,atk:810000,armor:500000,hit:460000,dodge:210000,xp:600000,gold:[700000,1300000],
    ability:{name:'PHASE SHIFT!',color:'#4488ff',triggerEvery:3,effect:(e)=>{
      currentEnemy.phaseShifted=true;
      spawnAbilityFloat('🌑 PHASE SHIFT!','#4488ff');
      addCombatLog(`🌑 Shadow Emperor phases out! Next attack misses!`,'bad');}},
    cs:{title:'Shadow Emperor',req:'Required: Stage 9 Clear',text:'The Shadow Emperor exists between dimensions!'}},

  // Boss 10 — FINAL BOSS (player ~Lv99, ATK ~6790, HP ~53580)
  stage_boss_10:{id:'stage_boss_10',name:'🌟 Eternal King',icon:'🌟',
    hp:1200000000,atk:1400000,armor:1060000,hit:800000,dodge:400000,xp:1000000,gold:[1500000,3000000],
    ability:{name:'ALL POWERS!',color:'#ffffff',triggerEvery:2,effect:(e)=>{
      const d=Math.floor(currentEnemy.atk*0.6);
      state.hp=Math.max(1,state.hp-d);
      spawnAbilityFloat('🌟 ETERNAL POWER!','#ffffff');
      addCombatLog(`🌟 Eternal King unleashes power! ${d} damage!`,'bad');
      animateAttack(false,d,false);}},
    cs:{title:'Eternal King',req:'Required: Stage 10 — FINAL BOSS',text:'The Eternal King combines ALL the powers of every boss!'}},
};

function scaleMonster(templateId,stageLevel){
  const tmpl=MONSTER_TEMPLATES[templateId];if(!tmpl)return null;
  const diff=DIFFICULTY[state.difficulty||'normal'];
  const stageScale=1+(stageLevel-1)*0.3;
  return{...tmpl,hp:Math.floor(tmpl.hp*stageScale*diff.hpMult),maxHp:Math.floor(tmpl.hp*stageScale*diff.hpMult),atk:Math.floor(tmpl.atk*stageScale*diff.atkMult),armor:Math.floor(tmpl.armor*stageScale),hit:Math.floor(tmpl.hit*stageScale),dodge:Math.floor(tmpl.dodge*stageScale),xp:Math.floor(tmpl.xp*diff.xpMult),gold:[Math.floor(tmpl.gold[0]*diff.goldMult),Math.floor(tmpl.gold[1]*diff.goldMult)],poisoned:0,frozen:false,boss:false,_xpMult:1,_goldMult:1};
}

// ── DUNGEON FLOW ──
function enterDungeon(stageId){
  const stage=STAGES.find(s=>s.id===stageId);if(!stage)return;
  if(state.level<stage.levelReq){notify(`⚠️ Need Level ${stage.levelReq} to enter ${stage.name}!`,'var(--red)');return;}
  currentStage=stage;dungeonWave=0;dungeonQueue=[];
  addLog(`⚔️ Entering ${stage.name}!`,'gold');notify(`⚔️ ${stage.name} — Prepare!`,'var(--gold)');
  document.getElementById('choices-box').style.display='none';
  document.getElementById('story-content').innerHTML=`<div class="scene-title">${stage.name}</div><p style="color:#aaa;">Three waves of monsters await... then the boss!</p><p style="color:var(--gold);margin-top:8px;">⚔️ Wave 1 incoming!</p>`;
  startNextWave();
}
function showWaveAnnouncement(text,color){
  const div=document.createElement('div');
  div.style.cssText=`position:fixed;top:45%;left:50%;transform:translate(-50%,-50%);font-family:'Cinzel',serif;font-size:2em;font-weight:700;color:${color};text-shadow:0 0 30px ${color};pointer-events:none;z-index:9999;animation:levelUpFlash 2s ease forwards;white-space:nowrap;`;
  div.textContent=text;document.body.appendChild(div);setTimeout(()=>div.remove(),2000);
}
function spawnNextDungeonMonster(){
  if(!currentStage||dungeonQueue.length===0)return;
  const nextId=dungeonQueue.shift();
  if(nextId==='BOSS'){triggerStageBoss(currentStage.bossId);return;}
  const monster=scaleMonster(nextId,currentStage.id);if(!monster)return;
  currentEnemy=monster;startCombatWith(currentEnemy);
  clearInterval(autoFightTimer);
  autoFightTimer=setInterval(()=>{if(!currentEnemy){clearInterval(autoFightTimer);return;}autoFightStep();},1000);
}
function startNextWave(){
  if(!currentStage)return;
  dungeonWave++;
  if(dungeonWave===1){
    dungeonQueue=[currentStage.monsters[0]];showWaveAnnouncement('⚔️ WAVE 1','#f0c040');
  } else if(dungeonWave===2){
    const c=Math.floor(Math.random()*5)+3;
    dungeonQueue=Array.from({length:c},()=>currentStage.monsters[Math.floor(Math.random()*currentStage.monsters.length)]);
    showWaveAnnouncement(`⚔️ WAVE 2 — ${c} enemies!`,'#ff8800');
  } else if(dungeonWave===3){
    const c=Math.floor(Math.random()*5)+3;
    dungeonQueue=Array.from({length:c},()=>currentStage.monsters[Math.floor(Math.random()*currentStage.monsters.length)]);
    showWaveAnnouncement(`⚔️ WAVE 3 — ${c} enemies!`,'#ff4444');
  } else if(dungeonWave===4){
    dungeonQueue=['BOSS'];showWaveAnnouncement('💀 BOSS INCOMING!','#ff0000');
  } else {
    dungeonComplete();return;
  }
  dungeonMonstersLeft=dungeonQueue.length;
  setTimeout(()=>spawnNextDungeonMonster(),2500);
}
function triggerStageBoss(bossId){
  const boss=STAGE_BOSSES[bossId];if(!boss)return;
  pendingBossId=bossId;
  document.getElementById('boss-icon').textContent=boss.icon;
  document.getElementById('boss-cs-name').textContent=boss.cs.title;
  document.getElementById('boss-cs-req').textContent=boss.cs.req;
  document.getElementById('boss-cs-text').textContent=boss.cs.text;
  document.getElementById('boss-cutscene').style.display='block';
  playSound('snd-boss');
}
function startBossFight(){
  if(currentStage){startStageBossFight();return;}
  document.getElementById('boss-cutscene').style.display='none';
}
function startStageBossFight(){
  document.getElementById('boss-cutscene').style.display='none';
  if(!pendingBossId)return;
  const boss=STAGE_BOSSES[pendingBossId];if(!boss)return;
  const diff=DIFFICULTY[state.difficulty||'normal'];
  const stageLevel=currentStage?currentStage.id:1;
  const stageScale=1+(stageLevel-1)*0.4;
  const prefix=state.difficulty==='hell'?'💀 Hell ':state.difficulty==='hard'?'🔥 Hard ':'';
  currentEnemy={...boss,name:prefix+boss.name,hp:Math.floor(boss.hp*stageScale*diff.hpMult),maxHp:Math.floor(boss.hp*stageScale*diff.hpMult),atk:Math.floor(boss.atk*stageScale*diff.atkMult),armor:Math.floor(boss.armor*stageScale),hit:Math.floor(boss.hit*stageScale),dodge:Math.floor(boss.dodge*stageScale),xp:Math.floor(boss.xp*diff.xpMult),gold:[Math.floor(boss.gold[0]*diff.goldMult),Math.floor(boss.gold[1]*diff.goldMult)],poisoned:0,frozen:false,boss:true,abilityTurn:0,_xpMult:1,_goldMult:1};
  startCombatWith(currentEnemy);
  clearInterval(autoFightTimer);
  autoFightTimer=setInterval(()=>{if(!currentEnemy){clearInterval(autoFightTimer);return;}autoFightStep();},1000);
}
function dungeonComplete(){
  const stageId=currentStage.id;
  currentStage=null;dungeonWave=0;dungeonQueue=[];
  addLog('🏆 Dungeon Complete!','legendary');notify('🏆 Dungeon Complete!','var(--gold)');
  dropTreasureBox(stageId);
  document.getElementById('story-content').innerHTML=`<div class="scene-title">🏆 Dungeon Complete!</div><p style="color:var(--gold);margin-bottom:8px;">All enemies defeated!</p><p style="color:#aaa;">A treasure chest has been added to your inventory!</p>`;
  const box=document.getElementById('choices-box');box.innerHTML='';box.style.display='flex';
  const btn=document.createElement('button');btn.className='choice-btn fade-in';btn.innerHTML='🏘️ Return to Town';btn.onclick=()=>loadScene('town');box.appendChild(btn);
  updateUI();renderInventory();
}

// ── SCENES ──
const SCENES={
  town:{title:'🏘️ Town Square',text:'You stand in the peaceful town square. Choose a dungeon to enter or visit the shop!',
    choices:[
      {text:'🐺 Wolf Mountain (Lv 1+)',   next:'dungeon_1'},
      {text:'🕷️ Spider Cavern (Lv 10+)',  next:'dungeon_2'},
      {text:'👹 Goblin Fortress (Lv 20+)',next:'dungeon_3'},
      {text:'💀 Skeleton Crypt (Lv 30+)', next:'dungeon_4'},
      {text:'👊 Orc Stronghold (Lv 40+)', next:'dungeon_5'},
      {text:'🧛 Vampire Castle (Lv 50+)', next:'dungeon_6'},
      {text:'👾 Troll Caves (Lv 60+)',    next:'dungeon_7'},
      {text:'😈 Demon Citadel (Lv 70+)',  next:'dungeon_8'},
      {text:'🌑 Shadow Realm (Lv 80+)',   next:'dungeon_9'},
      {text:'🌟 Eternal Kingdom (Lv 90+)',next:'dungeon_10'},
      {text:'🏪 Shop', action:()=>{ switchMainScene('town'); switchTownPanel('shop', document.querySelector('.town-tab:nth-child(2)')); }},
      {text:'⛪ Inn (+50% HP and MP, 5g)',       next:'inn'},
      {text:'👤 Character', action:()=>{ switchMainScene('char'); }},
    ]},
  dungeon_1:{title:'🐺 Wolf Mountain',text:'The howling mountain awaits.',choices:[{text:'⚔️ Enter Dungeon',next:'enter_dungeon',stageId:1},{text:'🏘️ Town',next:'town'}]},
  dungeon_2:{title:'🕷️ Spider Cavern',text:'Dark webs cover every surface.',choices:[{text:'⚔️ Enter Dungeon',next:'enter_dungeon',stageId:2},{text:'🏘️ Town',next:'town'}]},
  dungeon_3:{title:'👹 Goblin Fortress',text:'The fortress stinks of greed.',choices:[{text:'⚔️ Enter Dungeon',next:'enter_dungeon',stageId:3},{text:'🏘️ Town',next:'town'}]},
  dungeon_4:{title:'💀 Skeleton Crypt',text:'Ancient bones rattle in the darkness.',choices:[{text:'⚔️ Enter Dungeon',next:'enter_dungeon',stageId:4},{text:'🏘️ Town',next:'town'}]},
  dungeon_5:{title:'👊 Orc Stronghold',text:'War drums echo through the stronghold.',choices:[{text:'⚔️ Enter Dungeon',next:'enter_dungeon',stageId:5},{text:'🏘️ Town',next:'town'}]},
  dungeon_6:{title:'🧛 Vampire Castle',text:'The castle is cold as death.',choices:[{text:'⚔️ Enter Dungeon',next:'enter_dungeon',stageId:6},{text:'🏘️ Town',next:'town'}]},
  dungeon_7:{title:'👾 Troll Caves',text:'The cave floor shakes with each step.',choices:[{text:'⚔️ Enter Dungeon',next:'enter_dungeon',stageId:7},{text:'🏘️ Town',next:'town'}]},
  dungeon_8:{title:'😈 Demon Citadel',text:'Hellfire burns eternally here.',choices:[{text:'⚔️ Enter Dungeon',next:'enter_dungeon',stageId:8},{text:'🏘️ Town',next:'town'}]},
  dungeon_9:{title:'🌑 Shadow Realm',text:'Reality bends here.',choices:[{text:'⚔️ Enter Dungeon',next:'enter_dungeon',stageId:9},{text:'🏘️ Town',next:'town'}]},
  dungeon_10:{title:'🌟 Eternal Kingdom',text:'The final challenge.',choices:[{text:'⚔️ Enter Dungeon',next:'enter_dungeon',stageId:10},{text:'🏘️ Town',next:'town'}]},
  inn:{title:'⛪ The Rusty Flagon Inn',text:'You rest comfortably.',
    action:()=>{
      if(state.gold>=5){
        state.gold-=5;
        const hh=Math.floor(state.maxHp*0.5),mh=Math.floor(state.maxMp*0.5);
        state.hp=Math.min(state.maxHp,state.hp+hh);state.mp=Math.min(state.maxMp,state.mp+mh);
        addLog(`Rested: +${formatNumber(hh)} HP, +${formatNumber(mh)} MP. Cost 5g.`,'good');playSound('snd-heal');
      } else { addLog('Need 5 gold to rest!','bad'); }
      updateUI();
    },
    choices:[{text:'🏘️ Return to Town',next:'town'}]},
};

// ── SHOP ITEMS ──
const SHOP_EQUIP=[
  {id:'s1',name:'⚔️ Iron Sword',price:200,slot:'weapon',rarity:'normal',stats:{str:20,lifeSteal:0.05,hit:15,crit:0.1}},
  {id:'s2',name:'⚔️ Steel Sword',price:500,slot:'weapon',rarity:'uncommon',levelReq:10,stats:{str:45,lifeSteal:0.06,hit:25,crit:0.2}},
  {id:'s5',name:'🛡️ Wooden Shield',price:200,slot:'armor',rarity:'normal',stats:{sta:15,armor:25,hpRegen:25,dodge:0.2}},
  {id:'s6',name:'🛡️ Chain Mail',price:400,slot:'armor',rarity:'uncommon',levelReq:10,stats:{sta:25,armor:55,hpRegen:50,dodge:0.5}},
  {id:'s9',name:'👢 Leather Boots',price:220,slot:'boots',rarity:'normal',stats:{agi:15,crit:0.1}},
  {id:'s10',name:'👢 Swift Treads',price:550,slot:'boots',rarity:'uncommon',levelReq:10,stats:{agi:30,dodge:0.2}},
  {id:'s13',name:'💍 Copper Band',price:350,slot:'ring',rarity:'normal',stats:{str:10,int:10,crit:0.10}},
  {id:'s14',name:'💍 Silver Seal',price:550,slot:'ring',rarity:'uncommon',levelReq:10,stats:{str:25,int:25,crit:0.20}},
  {id:'s17',name:'⛑️ Iron Helm',price:280,slot:'helmet',rarity:'normal',stats:{armor:25,int:10,crit:0.10}},
  {id:'s18',name:'⛑️ Steel Visor',price:580,slot:'helmet',rarity:'uncommon',levelReq:10,stats:{armor:55,int:25,crit:0.20}},
  {id:'s21',name:'📿 Novice Pendant',price:250,slot:'amulet',rarity:'normal',stats:{int:15,maxMp:150,crit:0.10}},
  {id:'s22',name:'📿 Mage Talisman',price:550,slot:'amulet',rarity:'uncommon',levelReq:10,stats:{int:35,maxMp:350,crit:0.20}},
];
const SHOP_CONS=[
  {id:'c1',name:'❤️ Health Potion',price:100,rarity:'normal',effect:'hp',val:400},
  {id:'c2',name:'❤️ Mega Potion',price:220,rarity:'uncommon',effect:'hp',val:2000},
  {id:'c3',name:'💧 Mana Potion',price:80,rarity:'normal',effect:'mp',val:300},
  {id:'c4',name:'💧 Mana Flask',price:180,rarity:'uncommon',effect:'mp',val:6000},
  {id:'c5',name:'✨ Elixir',price:400,rarity:'rare',effect:'both',val:10000},
];

// ── COMBAT VARS ──
let autoFightOn=false,autoFightEnemyId=null,autoFightTimer=null;
let currentEnemy=null,pendingBossId=null;
let currentInvTab='equipment',currentShopTab='equipment';
let autoSkillSlots=[null,null,null],autoSkillIndex=0;

// ── ANIMATIONS ──
function animateAttack(isPlayer,dmg,isCrit){
  if(isPlayer){
    const a=document.getElementById('char-avatar');a.classList.remove('attacking');void a.offsetWidth;a.classList.add('attacking');setTimeout(()=>a.classList.remove('attacking'),500);
    const e=document.getElementById('arena-enemy');e.classList.remove('enemy-shake','enemy-hit');void e.offsetWidth;e.classList.add('enemy-shake');setTimeout(()=>e.classList.remove('enemy-shake'),500);
  } else {
    const p=document.getElementById('arena-player');p.classList.remove('enemy-shake');void p.offsetWidth;p.classList.add('enemy-shake');setTimeout(()=>p.classList.remove('enemy-shake'),400);
    const c=document.getElementById('char-avatar');c.classList.add('hit');setTimeout(()=>c.classList.remove('hit'),400);
  }
  spawnDmgFloat(isCrit?`💥${dmg}!`:String(dmg),!isPlayer,isCrit?'crit-dmg':isPlayer?'enemy-dmg':'player-dmg');
}
function spawnDmgFloat(text,onEnemy,cls=''){
  const arena=document.getElementById('arena');if(!arena)return;
  const rect=arena.getBoundingClientRect();
  const div=document.createElement('div');div.className=`dmg-float ${cls}`;div.textContent=text;
  const rx=Math.floor(Math.random()*40)-20,ry=Math.floor(Math.random()*30)-15;
  div.style.left=(onEnemy?rect.right-80:rect.left+30)+rx+'px';
  div.style.top=(rect.top+rect.height/2-20)+ry+'px';
  document.body.appendChild(div);setTimeout(()=>div.remove(),950);
}

// ── AUTH: REGISTER ──
async function registerUser(){
  const email=document.getElementById('auth-email').value.trim();
  const password=document.getElementById('auth-password').value.trim();
  const name=document.getElementById('name-input').value.trim();
  const msg=document.getElementById('auth-msg');
  if(!email||!password||!name){msg.textContent='Please fill in all fields!';return;}

  try {
    const{data:authData,error:authError}=await dbClient.auth.signUp({email,password});
    if(authError){msg.textContent='❌ '+authError.message;return;}

    const{data:signInData,error:signInError}=await dbClient.auth.signInWithPassword({email,password});
    if(signInError){msg.textContent='❌ '+signInError.message;return;}

    const userId=signInData.user.id;

    const{data:character,error:charError}=await dbClient.from('characters').insert({
      user_id:userId,name,level:1,exp:0,gold:1550,class:null,
      health:100,max_health:100,mana:50,max_mana:50,
      inventory:[],current_scene:'town',unlocked_talents:[],talent_points:0,
      difficulty:'normal',inv_tab:'equipment',shop_tab:'equipment',
      equipped:{weapon:null,armor:null,helmet:null,boots:null,ring:null,amulet:null},
      skills:[],skill_cooldowns:{},quests:state.quests,auto_sell:{normal:false,uncommon:false},
      active_debuffs:{maxHpReduction:0,webTrapped:0,rageTimer:0},
      talent_unlocked_flags:{},
      stats:{
        baseStr:5,baseAgi:5,baseInt:5,baseSta:5,baseArmor:5,baseHit:2,baseCrit:0.1,
        baseDodge:2,baseHpRegen:20,baseLifeSteal:0.01,baseAttackPower:10,
        strMult:1.0,agiMult:1.0,intMult:1.0,staMult:1.0,armorMult:1.0,
        maxHpMult:1.0,hpRegenMult:1.0,maxMpMult:1.0,mpMult:1.0,critMult:1.0,
        dodgeMult:1.0,mpRegenMult:1.0,hitMult:1.0,lifeStealMult:1.0,attackPowerMult:1.0,
        classBonuses:{strMult:0,agiMult:0,intMult:0,staMult:0,hitMult:0,critMult:0,dodgeMult:0,hpRegenMult:0,mpRegenMult:0,armorMult:0,mpMult:0,lifeStealMult:0,attackPowerMult:0,maxHpMult:0},
        talentBonuses:{strMult:0,agiMult:0,intMult:0,staMult:0,hitMult:0,critMult:0,dodgeMult:0,hpRegenMult:0,mpRegenMult:0,armorMult:0,mpMult:0,lifeStealMult:0,attackPowerMult:0,maxHpMult:0},
      }
    }).select().single();
    if(charError)throw charError;

    // Sync to state via supabase-sync.js (loaded after game.js)
    if(typeof syncCharacterToState==='function') syncCharacterToState(character);
    addLog('💰 You start with 1550g! Reach level 10 to choose your class.','gold');
    msg.style.color='#44ff44';msg.textContent='✅ Registered! Starting game...';
    setTimeout(()=>{ showGame(); loadScene('town'); if(typeof initializeSupabaseSync==='function') initializeSupabaseSync(); },1000);

  } catch(error){ msg.textContent='❌ Registration failed: '+error.message; console.error('Register error:',error); }
}

// ── AUTH: LOGIN ──
async function loginUser(){
  const email=document.getElementById('auth-email').value.trim();
  const password=document.getElementById('auth-password').value.trim();
  const msg=document.getElementById('auth-msg');
  if(!email||!password){msg.textContent='Please enter email and password!';return;}

  try {
    const{data,error}=await dbClient.auth.signInWithPassword({email,password});
    if(error){msg.textContent='❌ '+error.message;return;}

    msg.textContent='⠋ Loading characters...';

    // Fetch ALL characters for this user → show select screen
    const{data:characters,error:charError}=await dbClient
      .from('characters').select('*').eq('user_id',data.user.id)
      .order('updated_at',{ascending:false});

    if(charError||!characters||!characters.length){
      msg.textContent='❌ No character found. Please register first.';
      await dbClient.auth.signOut();return;
    }

    msg.style.color='#44ff44';msg.textContent='✅ Logged in! Choose your character.';
    showCharacterSelect(characters);

  } catch(error){ msg.textContent='❌ Login failed: '+error.message; console.error('Login error:',error); }
}

// ── CHARACTER SELECT ──
function showCharacterSelect(characters) {
  document.getElementById('auth-screen').style.display = 'none';

  let screen = document.getElementById('char-select-screen');
  if (!screen) {
    screen = document.createElement('div');
    screen.id = 'char-select-screen';
    screen.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:1000;background:rgba(0,0,0,0.85);';
    document.body.appendChild(screen);
  }

  const characterCards = characters.map(c => {
    const cls = c.class
      ? ({ warrior: '⚔️ Warrior', mage: '🔮 Mage', rogue: '🗡️ Rogue' }[c.class] || c.class)
      : 'No Class';
    const inv = (c.inventory || []).length;
    const lastSeen = c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '—';

    // ✅ Template literal — c.id is properly interpolated
    return `
      <div 
        onclick="selectCharacterAndPlay('${c.id}')"
        style="background:rgba(255,255,255,0.03);border:1px solid rgba(200,160,40,0.2);border-radius:10px;padding:14px 16px;cursor:pointer;"
        onmouseover="this.style.borderColor='var(--gold)'"
        onmouseout="this.style.borderColor='rgba(200,160,40,0.2)'"
      >
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-family:Cinzel,serif;color:var(--gold);font-size:1em;font-weight:600;">${c.name}</div>
            <div style="font-size:.78em;color:#888;margin-top:2px;">${cls} · Lv.${c.level} · 💰${(c.gold || 0).toLocaleString()}g</div>
          </div>
          <div style="text-align:right;font-size:.72em;color:#555;">
            <div>${inv} items</div>
            <div>${lastSeen}</div>
          </div>
        </div>
      </div>`;
  }).join('');

  screen.innerHTML = `
    <div style="background:#0a0a1a;border:1px solid rgba(200,160,40,0.3);border-radius:16px;padding:32px 28px;min-width:340px;max-width:480px;width:90%;box-shadow:0 0 60px rgba(200,160,40,0.08);">
      <div style="font-family:Cinzel,serif;font-size:1.3em;color:var(--gold);text-align:center;margin-bottom:4px;letter-spacing:2px;">SELECT CHARACTER</div>
      <div style="font-size:.78em;color:#666;text-align:center;margin-bottom:20px;">Choose your hero to continue</div>
      <div id="char-select-list" style="display:flex;flex-direction:column;gap:10px;max-height:400px;overflow-y:auto;">
        ${characterCards}
      </div>
      <div style="margin-top:16px;text-align:center;">
        <button 
          onclick="document.getElementById('char-select-screen').remove();document.getElementById('auth-screen').style.display='flex';"
          style="background:transparent;border:1px solid #333;border-radius:8px;color:#666;font-size:.8em;padding:8px 20px;cursor:pointer;">
          ← Back
        </button>
      </div>
    </div>`;
}

async function selectCharacterAndPlay(characterId){
  const screen=document.getElementById('char-select-screen');
  if(screen) screen.remove();
  
  try {
    // ✅ Add proper error checking BEFORE using the data
    const{data:character, error}=await dbClient
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single();
    
    if(error) {
      console.error('Supabase error:', error);
      notify('❌ Failed to load character: ' + error.message, 'var(--red)');
      return;
    }
    
    if(!character) {
      notify('❌ Character not found', 'var(--red)');
      return;
    }
    
    // ✅ Verify character data is valid before syncing
    if(!character.id || !character.name) {
      console.error('Invalid character data:', character);
      notify('❌ Character data is corrupted', 'var(--red)');
      return;
    }
    
    // ✅ Now safely sync
    if(typeof syncCharacterToState==='function') {
      syncCharacterToState(character);
    } else {
      console.warn('syncCharacterToState not loaded yet');
      notify('❌ Game initialization failed', 'var(--red)');
      return;
    }
    
    showGame();
    loadScene(state.currentScene || 'town');
    
    if(typeof initializeSupabaseSync==='function') {
      initializeSupabaseSync();
    }
    
    checkAndSettleAuctions();
    addLog(`☁️ Welcome back ${state.name}! (Lv.${state.level})`, 'gold');
    
  } catch(e) {
    console.error('Character load error:', e);
    notify('❌ Load failed: ' + e.message, 'var(--red)');
  }
}

// ── AUTH: LOGOUT ──
async function logoutUser(){
  try {
    await savePlayerToSupabase();
  } catch(e){ console.warn('Save on logout failed:',e); }
  cleanupSupabaseSync();
  await dbClient.auth.signOut();
  location.reload();
}

// ── SHOW GAME ──
function startGame(){
  const n=document.getElementById('name-input').value.trim();
  if(!n){alert('Please enter your name!');return;}
  state.name=n;showGame();loadScene('town');addLog(`${n} begins their adventure!`,'info');fetchLeaderboard();
}
function showGame(){
  document.getElementById('name-screen').style.display='none';
  document.getElementById('game-wrapper').style.display='block';
  document.getElementById('bottom-nav').style.display='flex';
  document.getElementById('top-btns').style.display='flex';
  document.getElementById('char-name').textContent=state.name;
  document.getElementById('arena-player').innerHTML='<img src="warrior.jpg" style="width:50px;height:50px;object-fit:cover;border-radius:8px;border:2px solid var(--dark-gold);">';
  document.getElementById('arena-player-label').textContent=state.name;
  loadAutoSellUI();calcStats();updateUI();renderShop();renderQuests();
  renderInventory();renderSkillBar();renderEquipSlots();fetchLeaderboard();
  setDifficulty(state.difficulty||'normal');
  switchMainScene('adv');
}

// ── LOAD SCENE ──
function loadScene(sceneId){
  if(sceneId==='boss_fight')return;
  const scene=SCENES[sceneId];if(!scene)return;
  state.currentScene=sceneId;
  if(scene.action)scene.action();
  document.getElementById('story-content').innerHTML=`<div class="scene-title">${scene.title}</div><p>${scene.text}</p>`;
  document.getElementById('combat-box').style.display='none';
  const box=document.getElementById('choices-box');box.innerHTML='';box.style.display='flex';
  scene.choices.forEach(c=>{
    const btn=document.createElement('button');btn.className='choice-btn fade-in';btn.innerHTML=c.text;
    if(c.action)btn.onclick=()=>c.action();
else if(c.enemy)btn.onclick=()=>startCombat(c.enemy,false);
else if(c.bossId)btn.onclick=()=>triggerBoss(c.bossId);
else if(c.next==='enter_dungeon')btn.onclick=()=>enterDungeon(c.stageId);
else btn.onclick=()=>loadScene(c.next);
    box.appendChild(btn);
  });
  updateUI();updateAutoFightBtn();
}

function renderEnemyStatPanel(enemy) {
  return `
    <div class="enemy-stat-panel">
      <div class="enemy-stat-header">
        <span class="enemy-name">${enemy.name}</span>
        <span class="enemy-level">Lv. ${enemy.level}</span>
      </div>

      <!-- HP Bar -->
      <div class="stat-row hp-row">
        <span class="stat-label">❤️ HP</span>
        <div class="hp-bar-wrapper">
          <div class="hp-bar" style="width: ${(enemy.hp / enemy.maxHp) * 100}%"></div>
        </div>
        <span class="stat-value">${enemy.hp.toLocaleString()} / ${enemy.maxHp.toLocaleString()}</span>
      </div>

      <!-- Combat Stats Grid -->
      <div class="enemy-stats-grid">
        <div class="stat-item">
          <span class="stat-icon">⚔️</span>
          <span class="stat-name">ATK</span>
          <span class="stat-val">${enemy.attack}</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">🛡️</span>
          <span class="stat-name">ARM</span>
          <span class="stat-val">${enemy.armor}</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">💨</span>
          <span class="stat-name">DODGE</span>
          <span class="stat-val">${enemy.dodge}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">🎯</span>
          <span class="stat-name">HIT</span>
          <span class="stat-val">${enemy.hit}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">💥</span>
          <span class="stat-name">CRIT</span>
          <span class="stat-val">${enemy.crit}%</span>
        </div>
      </div>
    </div>
  `;
}

// ── AUTO FIGHT ──
function toggleAutoFight(){
  if(currentStage){
    autoFightOn=false;clearInterval(autoFightTimer);autoFightTimer=null;
    currentStage=null;dungeonWave=0;dungeonQueue=[];currentEnemy=null;
    document.getElementById('combat-box').style.display='none';
    document.getElementById('choices-box').style.display='flex';
    stopAutoFight();addLog('⏹️ Left the dungeon!','info');notify('⏹️ Dungeon abandoned!','#888');loadScene('town');return;
  }
  if(!autoFightEnemyId){notify('⚠️ Defeat an enemy first!','var(--red)');return;}
  autoFightOn=!autoFightOn;updateAutoFightBtn();
  if(autoFightOn){ addLog('⚡ Auto Fight ON!','gold');notify('⚡ Auto Fight activated!','var(--gold)');startAutoFight(); }
  else { stopAutoFight();addLog('⏹️ Auto Fight OFF.','info');notify('⏹️ Auto Fight stopped.','#888');document.getElementById('combat-box').style.display='none';document.getElementById('choices-box').style.display='flex'; }
}
function updateAutoFightBtn(){
  const btn=document.getElementById('auto-fight-btn');if(!btn)return;
  if(currentStage){
    btn.textContent='🚪 Leave Dungeon';btn.style.background='linear-gradient(135deg,#6a0000,#aa2222)';btn.style.display='inline-block';return;
  }
  btn.textContent=autoFightOn?'⏹️ Stop Auto':'⚡ Auto Fight';
  btn.style.background=autoFightOn?'linear-gradient(135deg,#6a0000,#aa2222)':'linear-gradient(135deg,#005500,#00aa44)';
  btn.style.display=(autoFightEnemyId&&!currentEnemy)?'inline-block':'none';
}
function startAutoFight(){
  if(!autoFightOn||!autoFightEnemyId)return;
  startCombat(autoFightEnemyId,false);
  autoFightTimer=setInterval(()=>{if(!autoFightOn||!currentEnemy){clearInterval(autoFightTimer);return;}autoFightStep();},1000);
}
function stopAutoFight(){
  autoFightOn=false;clearInterval(autoFightTimer);autoFightTimer=null;updateAutoFightBtn();
}

function autoFightStep(){
  if(!currentEnemy)return;
  // Player attacks
  const eDodge=Math.max(0,(currentEnemy.dodge||0)-state.hit)/100;
  if(Math.random()<eDodge){ addCombatLog(`💨 ${currentEnemy.name} dodged!`,'bad'); }
  else {
    let dmg=calculateAttackDamage(state.attackPower, currentEnemy.armor);
    let isCrit=false;
    if(Math.random()<state.crit/100){dmg=Math.floor(dmg*2);isCrit=true;}
    if(state.unlockedTalents.includes('berserker')&&state.hp<state.maxHp*.5)dmg=Math.floor(dmg*1.35);
    if(state.unlockedTalents.includes('death_mark'))dmg=Math.floor(dmg*1.5);
    if(isCrit)showCritEffect();
    currentEnemy.hp-=dmg;
    const ls=state.lifeSteal||0;
    if(ls>0){const h=Math.floor(dmg*ls);if(h>0){state.hp=Math.min(state.maxHp,state.hp+h);addCombatLog(`🩸 Life Steal +${h} HP!`,'good');spawnDmgFloat(`🩸+${h}`,false,'heal-float');}}
    useNextAutoSkill(currentEnemy);
    addCombatLog(`⚔️ ${isCrit?'💥CRIT! ':''}Auto: ${dmg} dmg!`,isCrit?'gold':'good');
    animateAttack(true,dmg,isCrit);
  }
  if(currentEnemy.hp<=0){currentEnemy.hp=0;updateEnemyBar();clearInterval(autoFightTimer);autoFightTimer=null;endCombat(true);return;}
  Object.keys(state.skillCooldowns).forEach(k=>{if(state.skillCooldowns[k]>0)state.skillCooldowns[k]--;});
  if(state.hpRegen>0){const r=Math.floor(state.hpRegen);if(r>0&&state.hp<state.maxHp){state.hp=Math.min(state.maxHp,state.hp+r);addCombatLog(`💚 Regen +${r} HP`,'good');}}
  if(state.manaRegen>0){const r=Math.floor(state.manaRegen);if(r>0&&state.mp<state.maxMp){state.mp=Math.min(state.maxMp,state.mp+r);addCombatLog(`💙 Mana Regen +${r} MP`,'info');}}
  // Boss ability
  if(currentEnemy.boss&&currentEnemy.ability){
    currentEnemy.abilityTurn=(currentEnemy.abilityTurn||0)+1;
    if(currentEnemy.abilityTurn>=currentEnemy.ability.triggerEvery){currentEnemy.abilityTurn=0;currentEnemy.ability.effect(currentEnemy);}
  }
  // Enemy attacks
  if(currentEnemy.frozen){currentEnemy.frozen=false;addCombatLog(`${currentEnemy.name} is frozen!`,'info');}
  else {
    const dodge=state.webTrapped>0?0:state.dodge;
    if(state.webTrapped>0)state.webTrapped--;
    if(currentEnemy.phaseShifted){currentEnemy.phaseShifted=false;addCombatLog(`🌑 ${currentEnemy.name} phases back!`,'info');}
    else {
      const pDodge=Math.max(0,dodge-(currentEnemy.hit||0))/100;
      let eDmg=calculateEnemyAttackDamage(currentEnemy.atk, state.armor);
      if(state.defending)eDmg=Math.floor(eDmg/2);
      if(Math.random()<pDodge){addCombatLog('💨 You dodged!','good');eDmg=0;}
      state.hp-=eDmg;
      if(eDmg>0){addCombatLog(`${currentEnemy.name} hits you for ${eDmg}!`,'bad');animateAttack(false,eDmg,false);}
    }
  }
  if(currentEnemy.rageTimer>0){currentEnemy.rageTimer--;if(currentEnemy.rageTimer===0){currentEnemy.atk=Math.floor(currentEnemy.atk/2);addCombatLog(`👊 ${currentEnemy.name} calms down!`,'info');}}
  if(currentEnemy.poisoned>0){const pd=currentEnemy.poisonDmg||Math.floor(state.agi*0.8+state.attackPower*0.3);currentEnemy.hp-=pd;currentEnemy.poisoned--;addCombatLog(`🐍 Poison deals ${pd}!`,'good');spawnDmgFloat(`🐍${pd}`,true,'enemy-dmg');}
  if(state.hp<=0){
    state.hp=0;updateUI();clearInterval(autoFightTimer);autoFightTimer=null;
    currentStage=null;dungeonWave=0;dungeonQueue=[];
    addLog('💀 You died!','bad');notify('💀 You died!','var(--red)');endCombat(false);return;
  }
  updateEnemyBar();updateUI();
}

// ── END COMBAT ── (fixed: no more double gold/XP)
function endCombat(won){
  const es=document.getElementById('enemy-stats');if(es)es.style.display='none';
  if(!currentEnemy)return;

  // Clear boss debuffs
  if(state.activeDebuffs.maxHpReduction>0){state.equipMaxHp=(state.equipMaxHp||0)+state.activeDebuffs.maxHpReduction;state.activeDebuffs.maxHpReduction=0;}
  state.activeDebuffs.webTrapped=0;state.activeDebuffs.rageTimer=0;state.webTrapped=0;
  if(currentEnemy.rageTimer>0)currentEnemy.atk=Math.floor(currentEnemy.atk/2);

  state.usedUndying=false;state.skillCooldowns={};state.battleCryActive=false;

  // Reset ONLY temporary combat multipliers (never touch classBonuses or talentBonuses)
  state.strMult=1.0;state.agiMult=1.0;state.intMult=1.0;state.staMult=1.0;
  state.armorMult=1.0;state.critMult=1.0;state.dodgeMult=1.0;state.hpRegenMult=1.0;
  state.mpRegenMult=1.0;state.hitMult=1.0;state.mpMult=1.0;state.attackPowerMult=1.0;

  // Reapply permanent class bonuses
  if(state.class){
    const c=CLASSES[state.class];
    Object.entries(c.bonuses).forEach(([k,v])=>{ if(k in state)state[k]=1.0+v; });
  }
  // Reapply permanent talent bonuses
  Object.keys(state.talentBonuses).forEach(k=>{
    if(k in state&&k.includes('Mult'))state[k]+=state.talentBonuses[k];
  });
  calcStats();

  const wasBoss=currentEnemy.boss;
  const defeatedId=currentEnemy.id;

  if(won){
    // ── REWARDS (runs exactly ONCE) ──
    if(defeatedId&&!wasBoss) autoFightEnemyId=defeatedId;

    const baseGold=currentEnemy.gold&&Array.isArray(currentEnemy.gold)?currentEnemy.gold:[50,150];
    const goldMult=Number(currentEnemy._goldMult)||1;
    const xpMult=Number(currentEnemy._xpMult)||1;
    const g=Math.floor((Math.random()*(baseGold[1]-baseGold[0])+baseGold[0])*goldMult);
    const xp=Math.floor(currentEnemy.xp*xpMult);
    state.gold+=g;state.xp+=xp;
    addLog(`Defeated ${currentEnemy.name}! +${xp} XP, +${g} Gold`,'good');

    if(currentEnemy.loot){
      currentEnemy.loot().forEach(item=>{
        addToInventory(item);
        addLog(`Loot: ${item.name} [${RARITY[item.rarity]?.label||'Normal'}]`,item.rarity==='legendary'?'legendary':item.rarity==='epic'?'epic':'gold');
        if(item.rarity==='legendary')state.quests.legendary.done=true;
      });
    }
    if(wasBoss)state.quests.boss.done=true;
    state.quests.kill1.done=true;
    if(state.gold>=50)state.quests.gold50.done=true;
    autoSellAfterCombat();
    // Mat drop — only works inside dungeons (currentStage tells us which stage)
    if(currentStage) rollMatDrop(currentStage.id, wasBoss);
    checkLevelUp();
    renderQuests();

    // Clear enemy AFTER rewards
    currentEnemy=null;
    document.getElementById('combat-box').style.display='none';

    // Dungeon flow
    if(currentStage){
      if(wasBoss){ dungeonComplete(); }
      else if(dungeonQueue.length>0){ setTimeout(()=>spawnNextDungeonMonster(),1200); }
      else { setTimeout(()=>startNextWave(),1500); }
    } else if(autoFightOn){
      // Auto fight continues — next fight starts via startAutoFight loop
    }

  } else {
    currentEnemy=null;
    document.getElementById('combat-box').style.display='none';
    loadScene('town');
  }

  updateUI();renderSkillBar();updateAutoFightBtn();
}

// ── AUTO SKILL SLOTS ──
function dropSkillToSlot(event,slotIndex){const skillId=event.dataTransfer.getData('skillId');if(!skillId||!SKILLS[skillId])return;autoSkillSlots[slotIndex]=skillId;renderAutoSlots();}
function clearSlot(slotIndex){autoSkillSlots[slotIndex]=null;renderAutoSlots();}
function renderAutoSlots(){
  autoSkillSlots.forEach((skillId,i)=>{
    const content=document.getElementById(`auto-slot-content-${i}`);const slot=document.getElementById(`auto-slot-${i}`);if(!content||!slot)return;
    if(skillId&&SKILLS[skillId]){const sk=SKILLS[skillId];content.innerHTML=sk.icon;content.style.borderColor='var(--gold)';slot.querySelector('.skill-lbl').textContent=sk.name;}
    else{content.innerHTML='➕';content.style.borderColor='';slot.querySelector('.skill-lbl').textContent=`Slot ${i+1}`;}
  });
}
function useNextAutoSkill(enemy){
  const filled=autoSkillSlots.map((id,i)=>({id,i})).filter(s=>s.id!==null);if(!filled.length)return false;
  const slot=filled[autoSkillIndex%filled.length];autoSkillIndex++;
  const skillId=slot.id;if(!skillId||!SKILLS[skillId])return false;
  const sk=SKILLS[skillId],cd=state.skillCooldowns[skillId]||0,mpCost=typeof sk.mp==='function'?sk.mp():sk.mp;
  if(cd>0){addCombatLog(`⏳ ${sk.name} on cooldown (${cd})`,'info');return false;}
  if(state.mp<mpCost){addCombatLog(`💙 Not enough MP for ${sk.name}!`,'bad');return false;}
  state.mp-=mpCost;state.skillCooldowns[skillId]=sk.cd;sk.use(enemy);
  spawnAbilityFloat(`${sk.icon} ${sk.name}!`,'#f0c040');return true;
}

// ══════════════════════════════════════════
// ARENA SYSTEM
// ══════════════════════════════════════════

const ARENA_TITLES = [
  { title:'Rookie',   min:0,    color:'#cccccc' },
  { title:'Fighter',  min:1000, color:'#22c55e' },
  { title:'Warrior',  min:1500, color:'#3b82f6' },
  { title:'Champion', min:2000, color:'#a855f7' },
  { title:'Legend',   min:2500, color:'#ff9900' },
  { title:'Eternal',  min:3000, color:'#ff2244' },
];

const TOURNAMENT_SIZE = 8; // must be power of 2

const DAILY_REWARDS = {
  1: { gold: 50000,  title:'🏆 Tournament Champion' },
  2: { gold: 25000,  title:'🥈 Tournament Runner-up' },
  3: { gold: 12000,  title:'🥉 Tournament Third Place' },
  4: { gold: 6000,   title:null },
  participation: { gold: 1000, title:null },
};

// ── GET ARENA TITLE FROM POINTS ──
function getArenaTitle(points) {
  for(let i=ARENA_TITLES.length-1;i>=0;i--){
    if(points>=ARENA_TITLES[i].min) return ARENA_TITLES[i];
  }
  return ARENA_TITLES[0];
}

// ── SIMULATE BATTLE BETWEEN TWO SNAPSHOTS ──
function simulateBattle(attacker, defender) {
  const log = [];
  let aHp = attacker.maxHp;
  let dHp = defender.maxHp;
  let turn = 0;
  const MAX_TURNS = 50;

  while(aHp > 0 && dHp > 0 && turn < MAX_TURNS) {
    turn++;

    // Attacker hits defender
    const aDodge = Math.max(0, (defender.dodge||0) - (attacker.hit||0)) / 100;
    if(Math.random() < aDodge) {
      log.push(`Turn ${turn}: ${attacker.name} missed! ${defender.name} dodged.`);
    } else {
      const aReduction = Math.min(0.85, (defender.armor||0) / ((defender.armor||0) + 80000));
      let aDmg = Math.max(1, Math.floor((attacker.attackPower * (0.95 + Math.random()*0.1)) * (1 - aReduction)));
      // Crit check
      if(Math.random() < (attacker.crit||0) / 100) {
        aDmg = Math.floor(aDmg * 2);
        log.push(`Turn ${turn}: ${attacker.name} CRITS ${defender.name} for ${formatNumber(aDmg)}!`);
      } else {
        log.push(`Turn ${turn}: ${attacker.name} hits ${defender.name} for ${formatNumber(aDmg)}.`);
      }
      dHp -= aDmg;
      // Lifesteal
      if(attacker.lifeSteal > 0) aHp = Math.min(attacker.maxHp, aHp + Math.floor(aDmg * attacker.lifeSteal));
    }
    if(dHp <= 0) break;

    // Defender hits attacker
    const dDodge = Math.max(0, (attacker.dodge||0) - (defender.hit||0)) / 100;
    if(Math.random() < dDodge) {
      log.push(`Turn ${turn}: ${defender.name} missed! ${attacker.name} dodged.`);
    } else {
      const dReduction = Math.min(0.85, (attacker.armor||0) / ((attacker.armor||0) + 80000));
      let dDmg = Math.max(1, Math.floor((defender.attackPower * (0.95 + Math.random()*0.1)) * (1 - dReduction)));
      if(Math.random() < (defender.crit||0) / 100) {
        dDmg = Math.floor(dDmg * 2);
        log.push(`Turn ${turn}: ${defender.name} CRITS ${attacker.name} for ${formatNumber(dDmg)}!`);
      } else {
        log.push(`Turn ${turn}: ${defender.name} hits ${attacker.name} for ${formatNumber(dDmg)}.`);
      }
      aHp -= dDmg;
      if(defender.lifeSteal > 0) dHp = Math.min(defender.maxHp, dHp + Math.floor(dDmg * defender.lifeSteal));
    }
  }

  // Determine winner
  let winnerId, reason;
  if(aHp > dHp) {
    winnerId = attacker.character_id;
    reason = turn >= MAX_TURNS ? `${attacker.name} wins by HP advantage after ${MAX_TURNS} turns!` : `${attacker.name} wins!`;
  } else {
    winnerId = defender.character_id;
    reason = turn >= MAX_TURNS ? `${defender.name} wins by HP advantage after ${MAX_TURNS} turns!` : `${defender.name} wins!`;
  }
  log.push(`⚔️ RESULT: ${reason}`);

  return { winnerId, log, turns: turn, attackerHpLeft: Math.max(0, aHp), defenderHpLeft: Math.max(0, dHp) };
}

// ── SNAPSHOT CURRENT PLAYER STATS ──
function getPlayerSnapshot() {
  return {
    character_id: state.character_id,
    name: state.name,
    level: state.level,
    class: state.class,
    attackPower: state.attackPower,
    maxHp: state.maxHp,
    armor: state.armor,
    hit: state.hit,
    dodge: state.dodge,
    crit: state.crit,
    lifeSteal: state.lifeSteal,
    arena_points: state.arena_points || 1000,
  };
}

// ── REGISTER FOR TOURNAMENT ──
async function registerForTournament() {
  if(!state.character_id) { notify('Must be logged in!', 'var(--red)'); return; }

  try {
    // Find open tournament or create one
    let { data: tournament } = await dbClient
      .from('arena_tournaments')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if(!tournament) {
      // Create new tournament
      const startsAt = new Date();
      startsAt.setHours(startsAt.getHours() + 1);
      const endsAt = new Date(startsAt);
      endsAt.setHours(endsAt.getHours() + 24);

      const { data: newT } = await dbClient.from('arena_tournaments').insert({
        status: 'open',
        bracket: [],
        round: 0,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      }).select().single();
      tournament = newT;
    }

    // Check if already registered
    const { data: existing } = await dbClient
      .from('arena_registrations')
      .select('id')
      .eq('tournament_id', tournament.id)
      .eq('character_id', state.character_id)
      .single();

    if(existing) { notify('Already registered!', 'var(--gold)'); return; }

    // Register
    await dbClient.from('arena_registrations').insert({
      tournament_id: tournament.id,
      character_id: state.character_id,
    });

    addLog(`⚔️ Registered for tournament! Waiting for ${TOURNAMENT_SIZE} players.`, 'gold');
    notify('⚔️ Registered for Arena Tournament!', 'var(--gold)');
    renderArena();

    // Auto-start if enough players
    const { count } = await dbClient
      .from('arena_registrations')
      .select('*', { count: 'exact' })
      .eq('tournament_id', tournament.id);

    if(count >= TOURNAMENT_SIZE) await startTournament(tournament.id);

  } catch(e) { notify('Registration failed: ' + e.message, 'var(--red)'); console.error(e); }
}

// ── START TOURNAMENT ──
async function startTournament(tournamentId) {
  try {
    // Get all registrations with character snapshots
    const { data: regs } = await dbClient
      .from('arena_registrations')
      .select('character_id')
      .eq('tournament_id', tournamentId)
      .limit(TOURNAMENT_SIZE);

    const charIds = regs.map(r => r.character_id);
    const { data: chars } = await dbClient
      .from('characters')
      .select('id, name, level, class, stats, arena_points')
      .in('id', charIds);

    // Build snapshots
    const snapshots = chars.map(c => {
      const s = c.stats || {};
      return {
        character_id: c.id,
        name: c.name,
        level: c.level,
        class: c.class,
        attackPower: s.attackPower || 100,
        maxHp: s.maxHp || 1000,
        armor: s.armor || 0,
        hit: s.hit || 0,
        dodge: s.dodge || 0,
        crit: s.crit || 0,
        lifeSteal: s.lifeSteal || 0,
        arena_points: c.arena_points || 1000,
      };
    });

    // Shuffle and create bracket
    const shuffled = snapshots.sort(() => Math.random() - 0.5);
    const bracket = [];
    for(let i = 0; i < shuffled.length; i += 2) {
      bracket.push({
        round: 1,
        player1: shuffled[i],
        player2: shuffled[i+1] || null,
        winner: null,
      });
    }

    await dbClient.from('arena_tournaments').update({
      status: 'in_progress',
      bracket: bracket,
      round: 1,
    }).eq('id', tournamentId);

    await runTournamentRound(tournamentId, bracket, 1);
  } catch(e) { console.error('Start tournament error:', e); }
}

// ── RUN A TOURNAMENT ROUND ──
async function runTournamentRound(tournamentId, bracket, round) {
  try {
    const roundMatches = bracket.filter(m => m.round === round);
    const nextBracket = [...bracket];
    const winners = [];

    for(const match of roundMatches) {
      if(!match.player2) {
        // Bye — player1 advances automatically
        match.winner = match.player1;
        winners.push(match.player1);
        continue;
      }

      const result = simulateBattle(match.player1, match.player2);
      match.winner = result.winnerId === match.player1.character_id ? match.player1 : match.player2;
      match.battleLog = result.log;
      match.turns = result.turns;
      winners.push(match.winner);

      // Save battle record
      await dbClient.from('arena_battles').insert({
        attacker_id: match.player1.character_id,
        defender_id: match.player2.character_id,
        winner_id: result.winnerId,
        attacker_snapshot: match.player1,
        defender_snapshot: match.player2,
        battle_log: result.log,
        points_change: 25,
      });

      // Update arena points
      const loserId = result.winnerId === match.player1.character_id
        ? match.player2.character_id : match.player1.character_id;
      await dbClient.from('characters')
        .update({ arena_wins: dbClient.rpc('increment', { x: 1 }) })
        .eq('id', result.winnerId);
      // Points: winner +25, loser -15
      const { data: winChar } = await dbClient.from('characters').select('arena_points').eq('id', result.winnerId).single();
      const { data: loseChar } = await dbClient.from('characters').select('arena_points').eq('id', loserId).single();
      if(winChar) await dbClient.from('characters').update({ arena_points: (winChar.arena_points||1000) + 25 }).eq('id', result.winnerId);
      if(loseChar) await dbClient.from('characters').update({ arena_points: Math.max(0,(loseChar.arena_points||1000) - 15) }).eq('id', loserId);
    }

    // Check if tournament is over
    if(winners.length === 1) {
      await finalizeTournament(tournamentId, nextBracket, winners[0]);
      return;
    }

    // Create next round matches
    const nextRound = round + 1;
    for(let i = 0; i < winners.length; i += 2) {
      nextBracket.push({
        round: nextRound,
        player1: winners[i],
        player2: winners[i+1] || null,
        winner: null,
      });
    }

    await dbClient.from('arena_tournaments').update({
      bracket: nextBracket,
      round: nextRound,
    }).eq('id', tournamentId);

    await runTournamentRound(tournamentId, nextBracket, nextRound);
  } catch(e) { console.error('Run round error:', e); }
}

// ── FINALIZE TOURNAMENT ──
async function finalizeTournament(tournamentId, bracket, champion) {
  try {
    // Get top 4 from bracket
    const { data: regs } = await dbClient
      .from('arena_registrations')
      .select('character_id')
      .eq('tournament_id', tournamentId);

    // Give participation gold to all
    for(const reg of regs) {
      const { data: c } = await dbClient.from('characters').select('gold').eq('id', reg.character_id).single();
      if(c) await dbClient.from('characters').update({ gold: c.gold + DAILY_REWARDS.participation.gold }).eq('id', reg.character_id);
    }

    // Give champion rewards
    const { data: champ } = await dbClient.from('characters').select('gold, arena_points').eq('id', champion.character_id).single();
    if(champ) {
      await dbClient.from('characters').update({
        gold: champ.gold + DAILY_REWARDS[1].gold,
        arena_points: (champ.arena_points||1000) + 100,
        arena_title: DAILY_REWARDS[1].title,
      }).eq('id', champion.character_id);
    }

    await dbClient.from('arena_tournaments').update({
      status: 'completed',
      bracket: bracket,
      winner_id: champion.character_id,
    }).eq('id', tournamentId);

    addLog(`🏆 Tournament complete! Champion: ${champion.name}!`, 'legendary');
    notify(`🏆 ${champion.name} wins the tournament!`, 'var(--gold)');

    // Refresh if current player is champion
    if(champion.character_id === state.character_id) {
      state.gold += DAILY_REWARDS[1].gold;
      state.arena_points = (state.arena_points||1000) + 100;
      updateUI();
      notify(`🏆 You are the Champion! +${formatNumber(DAILY_REWARDS[1].gold)}g!`, 'var(--gold)');
    }

    renderArena();
  } catch(e) { console.error('Finalize tournament error:', e); }
}

// ── RENDER ARENA UI ──
async function renderArena() {
  const container = document.getElementById('arena-content');
  if(!container) return;

  container.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:20px;">Loading...</div>';

  try {
    // Get player arena stats
    const { data: me } = await dbClient
      .from('characters')
      .select('arena_points, arena_title, arena_wins, arena_losses')
      .eq('id', state.character_id)
      .single();

    const points = me?.arena_points || 1000;
    const titleInfo = getArenaTitle(points);
    const wins = me?.arena_wins || 0;
    const losses = me?.arena_losses || 0;

    // Get current open tournament
    const { data: tournament } = await dbClient
      .from('arena_tournaments')
      .select('*')
      .in('status', ['open','in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get registration count
    let regCount = 0;
    let isRegistered = false;
    if(tournament) {
      const { count } = await dbClient
        .from('arena_registrations')
        .select('*', { count: 'exact' })
        .eq('tournament_id', tournament.id);
      regCount = count || 0;

      const { data: myReg } = await dbClient
        .from('arena_registrations')
        .select('id')
        .eq('tournament_id', tournament.id)
        .eq('character_id', state.character_id)
        .single();
      isRegistered = !!myReg;
    }

    // Get recent battles
    const { data: battles } = await dbClient
      .from('arena_battles')
      .select('*')
      .or(`attacker_id.eq.${state.character_id},defender_id.eq.${state.character_id}`)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get top players
    const { data: topPlayers } = await dbClient
      .from('characters')
      .select('name, class, level, arena_points, arena_title')
      .order('arena_points', { ascending: false })
      .limit(10);

    container.innerHTML = `
      <!-- Player Arena Card -->
      <div class="char-panel" style="margin-bottom:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div>
            <div style="font-family:var(--font-title);font-size:1em;color:${titleInfo.color};">${titleInfo.title}</div>
            <div style="font-size:.78em;color:var(--text-dim);">${points} Arena Points</div>
          </div>
          <div style="text-align:right;font-size:.78em;">
            <div style="color:var(--green);">W: ${wins}</div>
            <div style="color:var(--red);">L: ${losses}</div>
          </div>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${Math.min(100,(points/3000)*100)}%;background:${titleInfo.color};border-radius:3px;transition:width .3s;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.65em;color:var(--text-dim);margin-top:3px;">
          <span>0</span><span>Fighter 1000</span><span>Champion 2000</span><span>Eternal 3000</span>
        </div>
      </div>

      <!-- Tournament Status -->
      <div class="char-panel" style="margin-bottom:12px;">
        <div class="panel-title">⚔️ Tournament</div>
        ${tournament ? `
          <div style="font-size:.82em;margin-bottom:10px;">
            <div style="color:${tournament.status==='open'?'var(--green)':'var(--gold)'};">
              ${tournament.status==='open'?'🟢 Open — Accepting Players':'🟡 In Progress'}
            </div>
            <div style="color:var(--text-dim);margin-top:4px;">
              Players: ${regCount}/${TOURNAMENT_SIZE}
              ${tournament.status==='open'?`<div style="height:4px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden;margin-top:4px;"><div style="height:100%;width:${(regCount/TOURNAMENT_SIZE)*100}%;background:var(--gold);border-radius:2px;"></div></div>`:''}
            </div>
          </div>
          ${tournament.status==='open' && !isRegistered ?
            `<button class="start-btn" onclick="registerForTournament()" style="width:100%;padding:10px;">⚔️ Join Tournament (+1,000g participation)</button>` :
            tournament.status==='open' && isRegistered ?
            `<div style="text-align:center;color:var(--green);font-size:.82em;padding:8px;">✅ Registered! Waiting for more players...</div>` :
            `<button class="start-btn" onclick="viewBracket()" style="width:100%;padding:10px;">📊 View Bracket</button>`
          }
        ` : `
          <div style="text-align:center;color:var(--text-dim);font-size:.82em;padding:8px 0 12px;">No active tournament</div>
          <button class="start-btn" onclick="registerForTournament()" style="width:100%;padding:10px;">⚔️ Start New Tournament</button>
        `}
        <div style="margin-top:8px;font-size:.72em;color:var(--text-dim);">
          🏆 1st: +50,000g &nbsp; 🥈 2nd: +25,000g &nbsp; 🥉 3rd: +12,000g &nbsp; All: +1,000g
        </div>
      </div>

      <!-- Recent Battles -->
      ${battles && battles.length ? `
        <div class="char-panel" style="margin-bottom:12px;">
          <div class="panel-title">Recent Battles</div>
          ${battles.map(b => {
            const isWinner = b.winner_id === state.character_id;
            const opponent = b.attacker_id === state.character_id ? b.defender_snapshot : b.attacker_snapshot;
            return `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:.78em;">
              <span style="color:${isWinner?'var(--green)':'var(--red)'};">${isWinner?'WIN':'LOSS'}</span>
              <span>vs ${opponent?.name||'Unknown'} (Lv.${opponent?.level||'?'})</span>
              <span style="color:${isWinner?'var(--green)':'var(--red)'};">${isWinner?'+25':'-15'} pts</span>
              <button onclick="viewBattleLog('${b.id}')" style="background:transparent;border:1px solid var(--border);border-radius:4px;color:var(--text-dim);font-size:.7em;padding:2px 8px;cursor:pointer;">Log</button>
            </div>`;
          }).join('')}
        </div>
      ` : ''}

      <!-- Top Players -->
      <div class="char-panel">
        <div class="panel-title">🏆 Arena Rankings</div>
        ${topPlayers ? topPlayers.map((p,i) => {
          const t = getArenaTitle(p.arena_points||1000);
          return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:.78em;">
            <span style="width:20px;color:var(--text-dim);">${i+1}</span>
            <span style="flex:1;font-family:var(--font-title);font-size:.85em;">${p.name}</span>
            <span style="color:var(--text-dim);">Lv.${p.level}</span>
            <span style="color:${t.color};font-size:.75em;">${t.title}</span>
            <span style="color:var(--gold);font-family:var(--font-title);font-size:.8em;">${p.arena_points||1000}</span>
          </div>`;
        }).join('') : ''}
      </div>`;

  } catch(e) { container.innerHTML = '<div style="text-align:center;color:var(--red);padding:20px;">Failed to load arena.</div>'; console.error(e); }
}

// ── VIEW BATTLE LOG ──
async function viewBattleLog(battleId) {
  const { data: battle } = await dbClient.from('arena_battles').select('*').eq('id', battleId).single();
  if(!battle) return;

  const log = battle.battle_log || [];
  const popup = document.getElementById('item-popup');
  document.getElementById('item-popup-content').innerHTML = `
    <div style="font-family:var(--font-title);color:var(--gold);margin-bottom:12px;font-size:.9em;">⚔️ Battle Log</div>
    <div style="max-height:300px;overflow-y:auto;font-size:.75em;line-height:1.9;color:var(--text);">
      ${log.map(l => `<div style="border-bottom:1px solid rgba(255,255,255,0.04);padding:2px 0;">${l}</div>`).join('')}
    </div>
    <div style="text-align:center;margin-top:12px;">
      <button class="start-btn" onclick="closeItemPopup()">✖ Close</button>
    </div>`;
  popup.style.display = 'flex';
}

// ── VIEW BRACKET ──
async function viewBracket() {
  const { data: tournament } = await dbClient
    .from('arena_tournaments')
    .select('*')
    .in('status', ['open','in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if(!tournament) return;
  const bracket = tournament.bracket || [];
  const rounds = [...new Set(bracket.map(m => m.round))].sort();

  document.getElementById('item-popup-content').innerHTML = `
    <div style="font-family:var(--font-title);color:var(--gold);margin-bottom:12px;font-size:.9em;">📊 Tournament Bracket</div>
    <div style="max-height:380px;overflow-y:auto;">
      ${rounds.map(r => `
        <div style="margin-bottom:12px;">
          <div style="font-family:var(--font-title);font-size:.72em;color:var(--text-dim);letter-spacing:2px;margin-bottom:6px;">ROUND ${r}</div>
          ${bracket.filter(m=>m.round===r).map(m=>`
            <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:6px;padding:8px;margin-bottom:6px;font-size:.78em;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="color:${m.winner?.character_id===m.player1?.character_id?'var(--green)':'var(--text)'};">${m.player1?.name||'TBD'}</span>
                <span style="color:var(--text-dim);font-size:.7em;">VS</span>
                <span style="color:${m.winner?.character_id===m.player2?.character_id?'var(--green)':'var(--text)'};">${m.player2?.name||'BYE'}</span>
              </div>
              ${m.winner?`<div style="text-align:center;color:var(--gold);font-size:.7em;margin-top:4px;">Winner: ${m.winner.name}</div>`:''}
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
    <div style="text-align:center;margin-top:8px;">
      <button class="start-btn" onclick="closeItemPopup()">✖ Close</button>
    </div>`;
  document.getElementById('item-popup').style.display = 'flex';
}

// ===== ENEMY STATS DISPLAY MANAGER =====

const enemyStatsPanel = document.getElementById('enemy-stats-panel');
const enemyStats = {
  name: document.getElementById('enemy-stats-name'),
  level: document.getElementById('enemy-stats-level'),
  hpBar: document.getElementById('enemy-hp-bar'),
  hpValue: document.getElementById('enemy-hp-value'),
  atk: document.getElementById('enemy-atk-value'),
  arm: document.getElementById('enemy-arm-value'),
  dodge: document.getElementById('enemy-dodge-value'),
  hit: document.getElementById('enemy-hit-value'),
  crit: document.getElementById('enemy-crit-value')
};

/**
 * Show enemy stats panel when combat starts
 */
function showEnemyStats(enemy) {
  if (!enemy) {
    enemyStatsPanel.style.display = 'none';
    return;
  }

  // Populate stats
  enemyStats.name.textContent = enemy.name;
  enemyStats.level.textContent = `Lv. ${enemy.level || '?'}`;
  enemyStats.atk.textContent = enemy.atk || 0;
  enemyStats.arm.textContent = enemy.armor || 0;
  enemyStats.dodge.textContent = `${enemy.dodge || 0}%`;
  enemyStats.hit.textContent = `${enemy.hit || 0}%`;
  enemyStats.crit.textContent = `${enemy.crit || 0}%`;

  // Update HP
  updateEnemyHP(enemy.hp, enemy.maxHp);

  // Show panel
  enemyStatsPanel.style.display = 'block';
}

/**
 * Update enemy HP bar and value
 */
function updateEnemyHP(currentHp, maxHp) {
  if (!enemyStats.hpBar || !enemyStats.hpValue) return;

  const percentage = (currentHp / maxHp) * 100;
  enemyStats.hpBar.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
  enemyStats.hpValue.textContent = `${Math.floor(currentHp)} / ${Math.floor(maxHp)}`;
}

/**
 * Hide enemy stats panel
 */
function hideEnemyStats() {
  enemyStatsPanel.style.display = 'none';
}

// ── COMBAT ──
function startCombat(enemyId,isBoss){
  const tmpl=MONSTER_TEMPLATES[enemyId];if(!tmpl)return;
  const diff=DIFFICULTY[state.difficulty||'normal'];
  const scale=(1+Math.max(0,(state.level-1))*0.3)*diff.hpMult;
  const atkScale=(1+Math.max(0,(state.level-1))*0.3)*diff.atkMult;
  const armorScale=(1+Math.max(0,(state.level-1))*0.3)*diff.armorMult;
  const hitScale=(1+Math.max(0,(state.level-1))*0.3)*diff.hitMult;
  const dodgeScale=(1+Math.max(0,(state.level-1))*0.3)*diff.dodgeMult;
  const prefix=state.difficulty==='hell'?'💀 Hell ':state.difficulty==='hard'?'🔥 Hard ':'';
  currentEnemy={...tmpl,name:prefix+tmpl.name,hp:Math.floor(tmpl.hp*scale),maxHp:Math.floor(tmpl.hp*scale),atk:Math.floor(tmpl.atk*atkScale),armor:tmpl.armor,hit:Math.floor((tmpl.hit||0)*5),dodge:Math.floor((tmpl.dodge||0)*5),poisoned:0,frozen:false,crippled:0,boss:false,_xpMult:diff.xpMult,_goldMult:diff.goldMult};
  currentEnemy=applyTutorialScaling(currentEnemy);
  startCombatWith(currentEnemy);
  if(isTutorialActive()){addCombatLog('📚 TUTORIAL MODE: Enemies are weaker!','info');showTutorialHint('firstCombat');}
  const combatArea = document.getElementById('combat-area'); // your existing combat container
  combatArea.insertAdjacentHTML('afterbegin', renderEnemyStatPanel(enemy));

  // Store current enemy reference for HP updates
  window.currentEnemy = enemy;
}
function startCombatWith(enemy){
  autoSkillIndex=0;
  document.getElementById('enemy-hp-val').textContent=formatNumber(enemy.hp);
  document.getElementById('enemy-hp-max').textContent=formatNumber(enemy.maxHp);
  const el=document.getElementById('arena-enemy');
  if(enemy.icon&&!enemy.icon.includes(' ')&&enemy.icon.length<20){el.innerHTML=`<img src="${enemy.icon}.jpg" style="width:50px;height:50px;object-fit:cover;border-radius:8px;border:2px solid var(--red);">`;}
  else{el.textContent=enemy.icon;}
  document.getElementById('arena-enemy-label').textContent=enemy.name;
  document.getElementById('arena-enemy-hp').style.width='100%';
  document.getElementById('combat-log').innerHTML='';
  document.getElementById('combat-box').style.display='block';
  document.getElementById('choices-box').style.display='none';

  // Enemy stats under their HP bar
  const es=document.getElementById('enemy-stats');
  if(es){
    es.style.display='block';
    es.innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 6px;font-size:.65em;">
        <span style="color:var(--text-dim);">⚔️ ATK <strong style="color:var(--red)">${formatNumber(enemy.atk)}</strong></span>
        <span style="color:var(--text-dim);">🛡️ ARM <strong style="color:var(--text)">${formatNumber(enemy.armor||0)}</strong></span>
        <span style="color:var(--text-dim);">🎯 HIT <strong style="color:var(--text)">${formatNumber(enemy.hit||0)}</strong></span>
        <span style="color:var(--text-dim);">💨 DDG <strong style="color:var(--text)">${formatNumber(enemy.dodge||0)}</strong></span>
        ${enemy.ability?`<span style="color:var(--red);grid-column:span 2;">⚡ ${enemy.ability.name}</span>`:''}
      </div>`;
  }

  document.getElementById('story-content').innerHTML=`
    <div class="scene-title">⚔️ Combat!</div>
    <p><strong style="color:var(--red)">${enemy.name}</strong> appears!${enemy.boss?'<span style="color:var(--gold);margin-left:6px;">⚠️ BOSS BATTLE!</span>':''}</p>`;

  document.getElementById('arena-player').innerHTML='<img src="warrior.jpg" style="width:50px;height:50px;object-fit:cover;border-radius:8px;border:2px solid var(--dark-gold);">';
  updateAutoFightBtn();
}

function combatAction(action) {
  if (!currentEnemy) return;

  // Player action handling
  if (action === 'attack') {
    showTutorialHint('firstCombat');
    handlePlayerAttack();
  } else if (action === 'magic') {
    showTutorialHint('firstMagic');
    handlePlayerMagic();
  } else if (action === 'defend') {
    showTutorialHint('firstDefend');
    state.defending = true;
    addCombatLog('🛡️ Bracing for impact!', 'info');
  } else if (action === 'flee') {
    showTutorialHint('firstFlee');
    handleFlee();
  }

  // Check if enemy is dead
  if (currentEnemy && currentEnemy.hp <= 0) {
    currentEnemy.hp = 0;
    updateEnemyBar();
    endCombat(true);
    return;
  }

  // Apply player regeneration
  applyPlayerRegeneration();

  // Enemy turn (if alive)
  if (currentEnemy && currentEnemy.hp > 0) {
    handleEnemyTurn();
  }

  // Check if player is dead
  if (state.hp <= 0) {
    state.hp = 0;
    updateUI();
    endCombat(false);
    return;
  }

  // Update UI
  updateEnemyBar();
  updateUI();
}

// ============================================
// PLAYER ATTACK HANDLER
// ============================================
function handlePlayerAttack() {
  // Check dodge
  const enemyDodgeChance = calculateDodgeChance(currentEnemy.dodge, state.hit);
  if (Math.random() < enemyDodgeChance) {
    addCombatLog(`💨 ${currentEnemy.name} dodged!`, 'bad');
    playSound('snd-attack');
    state.defending = false;
    return;
  }

  // Calculate base damage
  let damage = calculateAttackDamage(state.attackPower, currentEnemy.armor);

  // Apply tutorial bonus
  const tutBonus = getTutorialDamageBonus();
  damage = Math.floor(damage * tutBonus);

  // Apply berserker talent (low HP bonus)
  if (state.unlockedTalents.includes('berserker') && state.hp < state.maxHp * 0.5) {
    damage = Math.floor(damage * 1.35);
  }

  // Check for critical hit
  let isCrit = false;
  if (Math.random() < state.crit / 100) {
    damage = Math.floor(damage * 2);
    isCrit = true;
    showCritEffect();
  }

  // Apply death mark talent
  if (state.unlockedTalents.includes('death_mark')) {
    damage = Math.floor(damage * 1.5);
  }

  // Apply venom talent
  if (state.unlockedTalents.includes('venom')) {
    currentEnemy.poisoned = (currentEnemy.poisoned || 0) + 1;
  }

  // Deal damage to enemy
  currentEnemy.hp -= damage;

  // Apply life steal
  applyLifeSteal(damage);

  // Log and animate
  addCombatLog(
    `⚔️ ${isCrit ? '💥CRIT! ' : ''}You hit for ${damage}!`,
    isCrit ? 'gold' : 'good'
  );
  playSound('snd-attack');
  animateAttack(true, damage, isCrit);

  state.defending = false;
}

// ============================================
// PLAYER MAGIC HANDLER
// ============================================
function handlePlayerMagic() {
  const magicCost = 10;
  if (state.mp < magicCost) {
    addCombatLog('❌ Not enough MP!', 'bad');
    return;
  }

  // Calculate magic damage (INT-based)
  let damage = calculateMagicDamage(state.int);

  // Apply spell power talent
  if (state.unlockedTalents.includes('spell_power')) {
    damage = Math.floor(damage * 1.3);
  }

  // Apply fire mastery talent
  if (state.unlockedTalents.includes('fire_mastery')) {
    damage = Math.floor(damage * 1.2);
  }

  // Deal damage and consume mana
  currentEnemy.hp -= damage;
  state.mp -= magicCost;

  addCombatLog(`✨ Magic hits for ${damage}! (-${magicCost} MP)`, 'info');
  playSound('snd-magic');
  animateAttack(true, damage, false);

  state.defending = false;
}

// ============================================
// FLEE HANDLER
// ============================================
function handleFlee() {
  let fleeChance = 0.35; // Base flee chance

  // Smoke bomb talent gives high flee chance
  if (state.unlockedTalents.includes('smoke_bomb')) {
    fleeChance = 0.99;
  }
  // Agility vs enemy armor (higher agility = better flee)
  else if (state.agi > currentEnemy.armor) {
    fleeChance = 0.7;
  }

  if (Math.random() < fleeChance) {
    addLog('Fled from battle!', 'bad');
    currentEnemy = null;
    document.getElementById('combat-box').style.display = 'none';
    loadScene('town');
    return;
  }

  addCombatLog('❌ Failed to flee!', 'bad');
  state.defending = false;
}

// ============================================
// DAMAGE CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate physical attack damage using armor scaling
 * Formula: damage * (100 / (100 + armor))
 */
function calculateAttackDamage(attackPower, enemyArmor) {
  const variance = Math.floor(Math.random() * attackPower * 0.1);
  const baseDamage = attackPower + variance;
  const reduction = Math.min(0.85, enemyArmor / (enemyArmor + 80000));
  return Math.max(1, Math.floor(baseDamage * (1 - reduction)));
}

/**
 * Calculate magic damage (INT-based)
 */
function calculateMagicDamage(intelligence) {
  const baseVariance = Math.floor(Math.random() * 10); // 0-10 variance
  return Math.max(1, intelligence * 2 + baseVariance);
}

/**
 * Calculate dodge chance
 * Dodge is reduced by player's hit chance
 */
function calculateDodgeChance(enemyDodge, playerHit) {
  const netDodge = Math.max(0, enemyDodge - playerHit);
  return netDodge / 100;
}

/**
 * Apply life steal effect
 */
function applyLifeSteal(damageDealt) {
  const lifeStealPercent = state.lifeSteal || 0;
  if (lifeStealPercent > 0) {
    const healAmount = Math.floor(damageDealt * (lifeStealPercent / 100));
    if (healAmount > 0) {
      state.hp = Math.min(state.maxHp, state.hp + healAmount);
      addCombatLog(`🩸 Life Steal heals ${healAmount} HP!`, 'good');
      spawnDmgFloat(`🩸+${healAmount}`, false, 'heal-float');
    }
  }
}

// ============================================
// ENEMY TURN HANDLER
// ============================================
function handleEnemyTurn() {
  // Check if enemy is frozen
  if (currentEnemy.frozen) {
    currentEnemy.frozen = false;
    addCombatLog(`${currentEnemy.name} is frozen!`, 'info');
    return;
  }

  // Calculate enemy dodge chance (player trying to dodge enemy attack)
  const playerDodgeChance = calculateDodgeChance(state.dodge, currentEnemy.hit);
  if (Math.random() < playerDodgeChance) {
    addCombatLog('💨 You dodged!', 'good');
    return; // No damage taken
  }

  // Calculate enemy damage
  let enemyDamage = calculateEnemyAttackDamage(currentEnemy.atk, state.armor);

  // Apply tutorial difficulty modifier
  if (isTutorialActive()) {
    enemyDamage = Math.floor(enemyDamage * TUTORIAL_CONFIG.enemyDamageMultiplier);
  }

  // Apply defending reduction
  if (state.defending) {
    const defenseReduction = state.unlockedTalents.includes('fortress') ? 4 : 2;
    enemyDamage = Math.floor(enemyDamage / defenseReduction);
  }

  // Apply shield wall talent
  if (state.unlockedTalents.includes('shield_wall')) {
    enemyDamage = Math.floor(enemyDamage * 0.9);
  }

  // Apply mana shield (absorbs hit)
  if (state.manaShield) {
    state.manaShield = false;
    addCombatLog('🔮 Mana Shield absorbed!', 'info');
    enemyDamage = 0;
  }

  // Deal damage to player
  state.hp -= enemyDamage;

  if (enemyDamage > 0) {
    addCombatLog(`${currentEnemy.name} hits you for ${enemyDamage}!`, 'bad');
    animateAttack(false, enemyDamage, false);
  }

  // Apply poison damage
  if (currentEnemy.poisoned > 0) {
    const poisonDamage = 8;
    currentEnemy.hp -= poisonDamage;
    currentEnemy.poisoned--;
    addCombatLog(`🐍 Poison deals ${poisonDamage}!`, 'good');
  }

  // Check for undying talent (survive lethal blow)
  if (state.hp <= 0 && state.unlockedTalents.includes('undying') && !state.usedUndying) {
    state.hp = 1;
    state.usedUndying = true;
    addCombatLog('💪 Undying Will! Survived!', 'gold');
  }
}

/**
 * Calculate enemy attack damage using armor scaling
 */
function calculateEnemyAttackDamage(enemyAttack, playerArmor) {
  const variance = Math.floor(Math.random() * enemyAttack * 0.1);
  const baseDamage = enemyAttack + variance;
  const reduction = Math.min(0.85, playerArmor / (playerArmor + 80000));
  return Math.max(1, Math.floor(baseDamage * (1 - reduction)));
}

// ============================================
// PLAYER REGENERATION
// ============================================
function applyPlayerRegeneration() {
  // HP Regen
  if (state.hpRegen > 0) {
    const regenAmount = Math.floor(state.hpRegen);
    if (regenAmount > 0 && state.hp < state.maxHp) {
      state.hp = Math.min(state.maxHp, state.hp + regenAmount);
      addCombatLog(`💚 Regen +${regenAmount} HP`, 'good');
    }
  }

  // Mana Regen
  if (state.manaRegen > 0) {
    const regenAmount = Math.floor(state.manaRegen);
    if (regenAmount > 0 && state.mp < state.maxMp) {
      state.mp = Math.min(state.maxMp, state.mp + regenAmount);
      addCombatLog(`💙 Mana Regen +${regenAmount} MP`, 'info');
    }
  }

  // Skill cooldown reduction
  Object.keys(state.skillCooldowns).forEach(k => {
    if (state.skillCooldowns[k] > 0) {
      state.skillCooldowns[k]--;
    }
  });
}




function useSkillInCombat(skillId){
  if(!currentEnemy)return;
  const sk=SKILLS[skillId];if(!sk)return;
  const cd=state.skillCooldowns[skillId]||0,mpCost=typeof sk.mp==='function'?sk.mp():sk.mp;
  if(cd>0){addCombatLog(`${sk.name} on cooldown! (${cd})`,'bad');return;}
  if(state.mp<mpCost){addCombatLog(`Not enough MP for ${sk.name}!`,'bad');return;}
  state.mp-=mpCost;state.skillCooldowns[skillId]=sk.cd;sk.use(currentEnemy);
  spawnAbilityFloat(`${sk.icon} ${sk.name}!`,'#f0c040');
  Object.keys(state.skillCooldowns).forEach(k=>{if(k!==skillId&&state.skillCooldowns[k]>0)state.skillCooldowns[k]--;});
  if(currentEnemy&&currentEnemy.hp<=0){currentEnemy.hp=0;updateEnemyBar();clearInterval(autoFightTimer);autoFightTimer=null;endCombat(true);return;}
  if(currentEnemy&&currentEnemy.hp>0){
    const pDodge=Math.max(0,state.dodge-(currentEnemy.hit||0))/100;
    let eDmg=Math.max(1,currentEnemy.atk+Math.floor(Math.random()*6)-Math.floor(state.armor/10));
    if(state.manaShield){state.manaShield=false;addCombatLog('🔮 Mana Shield absorbed!','info');eDmg=0;}
    if(Math.random()<pDodge){addCombatLog('💨 You dodged!','good');eDmg=0;}
    state.hp-=eDmg;
    if(eDmg>0){addCombatLog(`${currentEnemy.name} retaliates: ${eDmg}!`,'bad');animateAttack(false,eDmg,false);}
    if(state.hp<=0){state.hp=0;updateUI();endCombat(false);return;}
  }
  updateEnemyBar();updateUI();renderSkillBar();
}

function addCombatLog(msg,type=''){
  msg=msg.replace(/(\d+)/g,(m)=>formatNumber(parseInt(m)));
  const b=document.getElementById('combat-log'),d=document.createElement('div');
  d.className=`log-entry ${type?'log-'+type:''}`;d.textContent=msg;b.appendChild(d);b.scrollTop=b.scrollHeight;
}
function updateEnemyBar(){
  if(!currentEnemy)return;
  const p=Math.max(0,(currentEnemy.hp/currentEnemy.maxHp)*100);
  document.getElementById('arena-enemy-hp').style.width=p+'%';
  document.getElementById('enemy-hp-val').textContent=Math.max(0,currentEnemy.hp);
}

// ── ITEM HELPERS ──
const SLOT_ICONS={weapon:'⚔️',armor:'🛡️',helmet:'⛑️',boots:'👢',ring:'💍',amulet:'📿'};
const EQUIP_PREFIXES={legendary:['Divine','Mythic','Godforged','Ancient','Eternal','Celestial'],epic:['Heroic','Valiant','Exalted','Magnificent','Radiant'],rare:['Polished','Reinforced','Enchanted','Gleaming'],uncommon:['Sturdy','Sharpened','Improved','Sturdy'],normal:['Iron','Wooden','Basic','Simple']};
const EQUIP_NAMES={weapon:['Blade','Sword','Axe','Spear','Dagger','Staff','Bow'],armor:['Plate','Chainmail','Robe','Leather','Cuirass'],helmet:['Helm','Crown','Hood','Circlet','Visor'],boots:['Greaves','Sabatons','Boots','Treads'],ring:['Band','Seal','Loop','Signet'],amulet:['Pendant','Amulet','Talisman','Necklace']};
const EQUIP_STATS={weapon:{str:[15,35],lifeSteal:[0.01,0.02],crit:[0.01,0.05]},armor:{armor:[25,55],sta:[15,35],maxHp:[2000,3000],hpRegen:[25,75],dodge:[10,20]},helmet:{armor:[35,65],int:[15,35],hit:[10,20],dodge:[5,15]},boots:{agi:[15,35],dodge:[10,20]},ring:{str:[15,35],int:[15,35],agi:[15,35],sta:[15,35]},amulet:{strMult:[0.5,0.9],agiMult:[0.5,0.9],intMult:[0.5,0.9],staMult:[0.5,0.9],maxHpMult:[0.5,0.9],hitMult:[0.5,0.9],attackPowerMult:[0.5,0.9],dodgeMult:[0.5,0.9]}};
function mkEquipDrop(slot,rarity,stageId=1){
  rarity=applyRarityBonus(rarity);
  const mult=RARITY[rarity].mult;
  const prefix=EQUIP_PREFIXES[rarity][Math.floor(Math.random()*EQUIP_PREFIXES[rarity].length)];
  const suffix=EQUIP_NAMES[slot][Math.floor(Math.random()*EQUIP_NAMES[slot].length)];
  const stats={};
  Object.entries(EQUIP_STATS[slot]).forEach(([k,[mn,mx]])=>{const raw=(Math.random()*(mx-mn)+mn)*mult;stats[k]=mx<1?Math.round(raw*1000)/1000:Math.round(raw);});
  return{uid:genUid(),name:`${SLOT_ICONS[slot]} ${prefix} ${suffix}`,category:'equipment',slot,rarity,stats,equipped:false,
  levelReq:(stageId-1)*10,
  sellPrice:Math.round(50*mult*(state.level||1)*.10)};
}
function mkMat(name,rarity,sellPrice){return{uid:genUid(),name,category:'material',rarity,sellPrice,stackable:true,qty:1};}
function mkCons(name,rarity,sellPrice,hpVal){return{uid:genUid(),name,category:'consumable',rarity,sellPrice,stackable:true,qty:1,effect:'hp',val:hpVal};}
function genUid(){return Date.now()+Math.random();}
function applyRarityBonus(rarity){
  const order=['normal','uncommon','rare','epic','legendary'];
  const bonus=(DIFFICULTY[state.difficulty||'normal'].rarityBonus)||0;
  return order[Math.min(order.length-1,order.indexOf(rarity)+bonus)];
}

// ── MAT TABLES (2 mats per stage: common + rare) ──
const STAGE_MATS = {
  1:  { common:{name:'🪶 Wolf Fang',      rarity:'normal'},   rare:{name:'🐺 Alpha Pelt',      rarity:'uncommon'} },
  2:  { common:{name:'🕸️ Spider Silk',    rarity:'normal'},   rare:{name:'🕷️ Venom Gland',     rarity:'uncommon'} },
  3:  { common:{name:'🪓 Goblin Scrap',   rarity:'uncommon'}, rare:{name:'👹 Warlord Crest',   rarity:'rare'}     },
  4:  { common:{name:'💀 Bone Shard',     rarity:'uncommon'}, rare:{name:'💀 Death Essence',   rarity:'rare'}     },
  5:  { common:{name:'🪨 Stone Core',     rarity:'uncommon'}, rare:{name:'👊 Chieftain Brand', rarity:'rare'}     },
  6:  { common:{name:'🩸 Blood Vial',     rarity:'rare'},     rare:{name:'🧛 Vampire Fang',    rarity:'epic'}     },
  7:  { common:{name:'💎 Troll Gem',      rarity:'rare'},     rare:{name:'👾 Troll Heart',      rarity:'epic'}     },
  8:  { common:{name:'😈 Demon Horn',     rarity:'rare'},     rare:{name:'🔥 Hellfire Core',   rarity:'epic'}     },
  9:  { common:{name:'🌑 Void Crystal',   rarity:'epic'},     rare:{name:'🌑 Shadow Essence',  rarity:'epic'}     },
  10: { common:{name:'🌟 Eternal Shard',  rarity:'epic'},     rare:{name:'👑 Eternal Crown',   rarity:'legendary'} },
};

// Drop chance: common 25%, rare 8%. Boss: common 100%, rare 50%.
function rollMatDrop(stageId, isBoss=false) {
  const mats = STAGE_MATS[stageId]; if (!mats) return;
  if (isBoss || Math.random() < 0.25) {
    const mat = mkMat(mats.common.name, mats.common.rarity, 50 * stageId);
    addToInventory(mat);
    addLog(`🧪 ${mat.name} dropped!`, 'info');
  }
  if (isBoss ? Math.random() < 0.50 : Math.random() < 0.08) {
    const mat = mkMat(mats.rare.name, mats.rare.rarity, 200 * stageId);
    addToInventory(mat);
    addLog(`🧪 ${mat.name} dropped!`, 'gold');
  }
}

// ── CRAFTING ──
// All results have guaranteed high stats — better than random drops of same rarity.
const CRAFTING = [
  // ── STAGE 1-2 MATS → Rare weapons/armor ──
  {
    id:'craft_wolf_blade',
    result:{name:'⚔️ Wolfstrike Blade',slot:'weapon',rarity:'rare',levelReq:20,
      stats:{str:280,strMul:0.5,crit:8,lifeSteal:0.15,hitMult:0.15},category:'equipment'},
    req:[{name:'🪶 Wolf Fang',qty:50},{name:'🐺 Alpha Pelt',qty:10}],
    desc:'A blade carved from the Alpha\'s fangs. Guaranteed crit and lifesteal.'
  },
  {
    id:'craft_wolf_armor',
    result:{name:'🛡️ Wolfstrike Armor',slot:'armor',rarity:'rare',levelReq:20,
      stats:{armor:280,sta:150,maxHp:1550,hpRegen:330,dodge:50,staMul:0.15,dodgeMult:0.1},category:'equipment'},
    req:[{name:'🪶 Wolf Fang',qty:50},{name:'🐺 Alpha Pelt',qty:10}],
    desc:'An armor crafted from the Alpha\'s pelt. Guaranteed survival.'
  },
  {
    id:'craft_wolf_boot',
    result:{name:'👢 Wolfstrike Boots',slot:'boots',rarity:'rare',levelReq:20,
      stats:{armor:280,agi:150,maxHp:1550,hpRegen:330,dodge:50,agiMul:0.15,dodgeMult:0.1},category:'equipment'},
    req:[{name:'🪶 Wolf Fang',qty:50},{name:'🐺 Alpha Pelt',qty:10}],
    desc:'A pair of boots crafted from the Alpha\'s pelt. Guaranteed agility.'
  },
  {
    id:'craft_silk_blade',
    result:{name:'⚔️ Spiderweave Blade',slot:'weapon',rarity:'rare',levelReq:30,
      stats:{str:1500,attackPower:3300,strMult:0.5,hitMult:0.15,crit:0.5},category:'equipment'},
    req:[{name:'🕸️ Spider Silk',qty:50},{name:'🕷️ Venom Gland',qty:20}],
    desc:'A blade crafted from spider silk — light but incredibly sharp.'
  },
  {
    id:'craft_silk_armor',
    result:{name:'🛡️ Spiderweave Armor',slot:'armor',rarity:'rare',levelReq:30,
      stats:{armor:2080,sta:1500,maxHp:15500,hpRegen:3300,dodge:500,staMul:0.5,dodgeMult:0.15},category:'equipment'},
    req:[{name:'🕸️ Spider Silk',qty:50},{name:'🕷️ Venom Gland',qty:20}],
    desc:'Woven from spider silk — light but incredibly resilient.'
  },
  {
    id:'craft_silk_boot',
    result:{name:'� Spiderweave Boots',slot:'boots',rarity:'rare',levelReq:30,
      stats:{armor:2080,agi:1500,maxHp:15500,hpRegen:3300,dodge:500,agiMul:0.5,dodgeMult:0.15},category:'equipment'},
    req:[{name:'🕸️ Spider Silk',qty:50},{name:'🕷️ Venom Gland',qty:20}],
    desc:'Woven from spider silk — light but incredibly resilient.'
  },
  // ── STAGE 3-4 MATS → Epic weapons/armor/helmet ──
  {
    id:'craft_goblin_axe',
    result:{name:'⚔️ Warlord Cleaver',slot:'weapon',rarity:'epic',levelReq:40,
      stats:{str:2220,attackPower:5800,strMult:0.55,hitMult:0.5,crit:1.5},category:'equipment'},
    req:[{name:'🪓 Goblin Scrap',qty:50},{name:'👹 Warlord Crest',qty:20}],
    desc:'Forged from Goblin war-steel. Comes with a permanent STR multiplier.'
  },
  {
    id:'craft_goblin_armor',
    result:{name:'🛡️ Warlord Armor',slot:'armor',rarity:'epic',levelReq:40,
      stats:{armor:2220,sta:2000,maxHp:25500,hpRegen:5300,dodge:1000,staMul:0.7,dodgeMult:0.3},category:'equipment'},
    req:[{name:'🪓 Goblin Scrap',qty:50},{name:'👹 Warlord Crest',qty:20}],
    desc:'Forged from Goblin war-steel. Comes with a permanent STR multiplier.'
  },
  {
    id:'craft_goblin_boots',
    result:{name:'👢 Warlord Boots',slot:'boots',rarity:'epic',levelReq:40,
      stats:{armor:2220,agi:2000,maxHp:25500,hpRegen:5300,dodge:1000,agiMul:0.7,dodgeMult:0.3},category:'equipment'},
    req:[{name:'🪓 Goblin Scrap',qty:50},{name:'👹 Warlord Crest',qty:20}],
    desc:'Forged from Goblin war-steel. Comes with a permanent AGI multiplier.'
  },
  {
    id:'craft_death_helm',
    result:{name:'⛑️ Death Knight Helm',slot:'helmet',rarity:'epic',levelReq:50,
      stats:{armor:6800,int:3200,hit:1800,dodgeMult:0.25},category:'equipment'},
    req:[{name:'💀 Bone Shard',qty:4},{name:'💀 Death Essence',qty:2}],
    desc:'Forged from cursed bone. Boosts dodge permanently.'
  },
  // ── STAGE 5-6 MATS → Epic boots/ring + Legendary weapon ──
  {
    id:'craft_stone_ring',
    result:{name:'💍 Warlord Signet',slot:'ring',rarity:'epic',levelReq:60,
      stats:{str:3800,sta:3800,agi:3800,int:3800},category:'equipment'},
    req:[{name:'🪨 Stone Core',qty:50},{name:'👊 Chieftain Brand',qty:20}],
    desc:'The Orc Chieftain\'s ring — balanced power across all stats.'
  },
  {
    id:'craft_vampire_amulet',
    result:{name:'📿 Blood Pact Amulet',slot:'amulet',rarity:'legendary',levelReq:70,
      stats:{strMult:2.35,agiMult:2.35,lifeSteal:0.5,maxHpMult:2.5},category:'equipment'},
    req:[{name:'🩸 Blood Vial',qty:4},{name:'🧛 Vampire Fang',qty:2}],
    desc:'A pact sealed in vampire blood. Massive lifesteal and stat multipliers.'
  },
  // ── STAGE 7-8 MATS → Legendary armor/weapon ──
  {
    id:'craft_troll_plate',
    result:{name:'🛡️ Trollhide Plate',slot:'armor',rarity:'legendary',levelReq:80,
      stats:{armor:12000,sta:6000,maxHp:80000,armorMult:2.5,hpRegenMult:2.5},category:'equipment'},
    req:[{name:'💎 Troll Gem',qty:50},{name:'👾 Troll Heart',qty:20}],
    desc:'Practically indestructible. The ultimate tank chest piece.'
  },
  {
    id:'craft_hellfire_sword',
    result:{name:'⚔️ Hellfire Greatsword',slot:'weapon',rarity:'legendary',levelReq:90,
      stats:{str:9000,attackPower:4000,strMult:3.5,crit:5},category:'equipment'},
    req:[{name:'😈 Demon Horn',qty:50},{name:'🔥 Hellfire Core',qty:20}],
    desc:'Forged in the Demon Citadel. The most powerful weapon in the mid-game.'
  },
  // ── STAGE 9-10 MATS → Legendary endgame gear ──
  {
    id:'craft_void_boots',
    result:{name:'👢 Void Walker Boots',slot:'boots',rarity:'legendary',levelReq:95,
      stats:{agi:8000,dodge:4000,agiMult:5.45,dodgeMult:5.4},category:'equipment'},
    req:[{name:'🌑 Void Crystal',qty:50},{name:'🌑 Shadow Essence',qty:20}],
    desc:'Step between shadows. Best-in-slot boots for agility builds.'
  },
  {
    id:'craft_eternal_ring',
    result:{name:'💍 Eternal Dominion Ring',slot:'ring',rarity:'legendary',levelReq:100,
      stats:{str:10000,agi:10000,int:10000,sta:10000,strMult:8.5,agiMult:8.5,intMult:8.5,staMult:8.5},category:'equipment'},
    req:[{name:'🌟 Eternal Shard',qty:50},{name:'👑 Eternal Crown',qty:20}],
    desc:'The ultimate ring. Requires Stage 10 mats. Best-in-slot for any build.'
  },
];

// ── TREASURE CHEST ──
const TREASURE_TABLES={
  1:{rolls:2,tier:'normal'},  2:{rolls:2,tier:'uncommon'},
  3:{rolls:3,tier:'uncommon'},4:{rolls:3,tier:'rare'},
  5:{rolls:3,tier:'rare'},    6:{rolls:4,tier:'epic'},
  7:{rolls:4,tier:'epic'},    8:{rolls:4,tier:'epic'},
  9:{rolls:5,tier:'legendary'},10:{rolls:5,tier:'legendary'}
};

function rollTreasureRarity(tier){
  const r=Math.random();
  switch(tier){
    case'normal':   return r<0.25?'uncommon':'normal';
    case'uncommon': return r<0.25?'rare':'uncommon';
    case'rare':     return r<0.25?'epic':'rare';
    case'epic':     return r<0.08?'legendary':'epic';
    case'legendary':return r<0.15?'legendary':'epic';  // 15% legendary from Stage 9-10 boxes
    default:        return'normal';
  }
}
function dropTreasureBox(stageId){
  const names={1:'📦 Worn Chest',2:'📦 Wooden Chest',3:'📦 Iron Chest',4:'📦 Steel Chest',
    5:'📦 Golden Chest',6:'📦 Enchanted Chest',7:'📦 Ancient Chest',
    8:'📦 Demonic Chest',9:'📦 Shadow Chest',10:'📦 Eternal Chest'};
  const box={uid:genUid(),name:names[stageId]||'📦 Mystery Chest',category:'consumable',
    rarity:stageId<=2?'normal':stageId<=4?'uncommon':stageId<=6?'rare':stageId<=8?'epic':'legendary',
    effect:'treasure',stageId,difficulty:state.difficulty||'normal',stackable:false,qty:1,sellPrice:1000*stageId};
  addToInventory(box);
  addLog(`📦 ${box.name} added to inventory!`,'legendary');
  notify(`📦 ${box.name} dropped!`,'var(--gold)');
  playSound('snd-levelup');
}
function openTreasureBox(box){
  const stageId=box.stageId||1, table=TREASURE_TABLES[stageId]; if(!table)return;
  const diff=DIFFICULTY[box.difficulty||'normal'];
  const slots=['weapon','armor','helmet','boots','ring','amulet'];
  const items=[];
  // Equipment rolls
  for(let i=0;i<table.rolls;i++){
    let rarity=rollTreasureRarity(table.tier);
    const slot=slots[Math.floor(Math.random()*slots.length)];
    const item=mkEquipDrop(slot,rarity,stageId); addToInventory(item); items.push(item);
    if(item.rarity==='legendary') state.quests.legendary.done=true;
  }
  // Bonus mat drops from chest (2-3 mats matching stage)
  const matCount = 2 + Math.floor(Math.random()*2);
  for(let i=0;i<matCount;i++) rollMatDrop(stageId, false);

  const bonusGold=Math.floor(1000*stageId*diff.goldMult); state.gold+=bonusGold;
  notify(`📦 Chest opened! ${items.length} items + mats found!`,'var(--gold)');
  addLog(`📦 ${box.name} opened!`,'legendary');
  items.forEach(item=>addLog(`  ${item.name} [${(RARITY[item.rarity]||RARITY.normal).label}]`,
    item.rarity==='legendary'?'legendary':item.rarity==='epic'?'epic':'gold'));
  addLog(`💰 +${formatNumber(bonusGold)} Gold!`,'gold');
  playSound('snd-levelup');
  spawnParticles(window.innerWidth/2,window.innerHeight/2,'#f0c040',20);
  renderInventory(); updateUI(); renderQuests();
}

// ── LEVEL UP ──
function checkLevelUp(){
  while(state.xp>=state.xpNext&&state.level<state.maxLevel){
    state.xp-=state.xpNext;state.level++;
    state.xpNext=Math.floor(state.level*100*50.00);
    state.baseStr+=3;state.baseAgi+=3;state.baseInt+=3;state.baseSta+=3;state.talentPoints+=5;
    calcStats();state.hp=state.maxHp;state.mp=state.maxMp;
    document.getElementById('char-level').textContent=`Level ${state.level} / 100`;
    addLog(`🎉 LEVEL UP! Level ${state.level}! +5 Talent Points!`,'gold');
    playSound('snd-levelup');showLevelUpEffect();notify(`🎉 Level Up! Now Level ${state.level}!`,'var(--gold)');
    if(state.level>=5)state.quests.level5.done=true;
    if(state.level>=10){state.quests.level10.done=true;if(!state.class)showClassSelection();checkTalentUnlocks();}
    if(state.level>=50)state.quests.level50.done=true;
    if(state.level>=100)state.quests.level100.done=true;
    if(state.class)document.getElementById('talent-btn').style.display='inline-block';
    updateTalentBtn();
  }
  if(state.level>=state.maxLevel){addLog('🌟 MAX LEVEL!','legendary');state.xp=0;}
}
function checkTalentUnlocks(){
  if(!state.class)return;
  const c=CLASSES[state.class];
  Object.entries(c.trees).forEach(([treeId,tree])=>{
    tree.talents.forEach(talent=>{
      const flagKey=`${state.class}_${talent.id}`;
      if(!state.talentUnlockedFlags[flagKey]){
        state.talentUnlockedFlags[flagKey]=true;
        state.unlockedTalents.push(talent.id);
        talent.effect();addLog(`🌟 Unlocked: ${talent.name}!`,'purple');
      }
    });
  });
}

// ── CLASS ──
function showClassSelection(){
  const grid=document.getElementById('class-grid');
  grid.innerHTML=Object.entries(CLASSES).map(([id,c])=>`
    <div class="class-card" onclick="selectClass('${id}')">
      <div class="class-icon">${c.icon}</div><div class="class-name">${c.name}</div>
      <div class="class-desc">${c.desc}</div>
      ${Object.entries(c.bonuses).map(([k,v])=>`<div class="class-stat"><span>${k.replace('Mult','').toUpperCase()}</span><span>+${Math.round(v*100)}%</span></div>`).join('')}
    </div>`).join('');
  document.getElementById('class-screen').style.display='block';
}
function selectClass(classId){
  const c=CLASSES[classId];state.class=classId;state.quests.class.done=true;
  Object.entries(c.bonuses).forEach(([k,v])=>{state.classBonuses[k]=v;state[k]=(state[k]||1)+v;});
  state.skills=c.skills;
  document.getElementById('char-class').textContent=`${c.icon} ${c.name}`;
  document.getElementById('arena-player').innerHTML='<img src="warrior.jpg" style="width:50px;height:50px;object-fit:cover;border-radius:8px;border:2px solid var(--dark-gold);">';
  document.getElementById('class-screen').style.display='none';
  document.getElementById('talent-btn').style.display='inline-block';
  Object.entries(c.trees).forEach(([treeId,tree])=>{tree.talents.forEach(talent=>{state.talentUnlockedFlags[`${classId}_${talent.id}`]=false;});});
  addLog(`🎉 You are now a ${c.name}!`,'purple');playSound('snd-levelup');updateUI();renderSkillBar();renderQuests();
}

// ── TALENTS ──
function openTalents(){
  if(!state.class){addLog('Choose a class first!','bad');return;}
  const c=CLASSES[state.class];
  document.getElementById('talent-title').textContent=`${c.icon} ${c.name} Talent Tree`;
  document.getElementById('talent-pts-val').textContent=state.talentPoints;
  document.getElementById('tree-grid').innerHTML=Object.entries(c.trees).map(([tid,tree])=>`
    <div class="tree-col"><div class="tree-name">${tree.name}</div>
    ${tree.talents.map(t=>{
      const rank=state.unlockedTalents.filter(u=>u===t.id).length,maxed=rank>=t.ranks,locked=state.talentPoints<t.cost&&rank===0;
      return `<div class="talent-node ${maxed?'unlocked':locked?'locked':''}" onclick="unlockTalent('${t.id}','${tid}')">
        <span class="talent-node-rank">${rank}/${t.ranks}</span>
        <div class="talent-node-name">${t.name}</div>
        <div class="talent-node-desc">${t.desc}</div>
        <div class="talent-node-cost">Cost: ${t.cost}pt ${maxed?'✅':''}</div>
      </div>`;}).join('')}</div>`).join('');
  document.getElementById('talent-screen').style.display='block';
}
function unlockTalent(talentId,treeId){
  const c=CLASSES[state.class],tree=c.trees[treeId],talent=tree.talents.find(t=>t.id===talentId);if(!talent)return;
  const rank=state.unlockedTalents.filter(u=>u===talentId).length;
  if(rank>=talent.ranks){addLog(`${talent.name} already maxed!`,'bad');return;}
  if(state.talentPoints<talent.cost){addLog('Not enough talent points!','bad');return;}
  state.talentPoints-=talent.cost;state.unlockedTalents.push(talentId);
  state.talentUnlockedFlags[`${state.class}_${talentId}`]=true;
  talent.effect();state.quests.talent.done=true;
  addLog(`🌟 Unlocked: ${talent.name}!`,'purple');playSound('snd-magic');
  openTalents();updateUI();renderQuests();updateTalentBtn();
}
function closeTalents(){document.getElementById('talent-screen').style.display='none';}
function updateTalentBtn(){
  const btn=document.getElementById('talent-btn');
  btn.textContent=state.talentPoints>0?`🌟 Talents (${state.talentPoints})`:'🌟 Talents';
  btn.style.boxShadow=state.talentPoints>0?'0 0 10px rgba(136,68,255,.6)':'none';
}

// ── SKILLS BAR ──
function renderSkillBar(){
  if(!state.skills||!state.skills.length){document.getElementById('skills-bar').style.display='none';return;}
  document.getElementById('skills-bar').style.display='block';
  document.getElementById('skills-slot-row').innerHTML=state.skills.map(sid=>{
    const sk=SKILLS[sid];if(!sk)return'';const cd=state.skillCooldowns[sid]||0;
    return `<div class="skill-slot" draggable="true" ondragstart="event.dataTransfer.setData('skillId','${sid}')" onclick="useSkillInCombat('${sid}')">
      <div class="skill-icon-wrap ${cd>0?'on-cd':''}">${sk.icon}</div>
      <div class="skill-lbl">${sk.name}</div>
      <div class="skill-cd-lbl">${cd>0?`CD:${cd}`:`${typeof sk.mp==='function'?sk.mp():sk.mp}MP`}</div>
    </div>`;
  }).join('');
}

// ── EQUIPMENT ──
function equipItem(uid){
  const item=state.inventory.find(i=>i.uid===uid);if(!item||item.category!=='equipment')return;
  const req=item.levelReq||0;
  if(state.level<req){
    notify(`❌ Need Level ${req} to equip ${item.name}!`,'var(--red)');
    addLog(`❌ Need Level ${req} to equip ${item.name}!`,'bad');
    return;
  }
  if(state.equipped[item.slot])unequipSlot(item.slot,true);
  Object.entries(item.stats||{}).forEach(([k,v])=>{const ek='equip'+k.charAt(0).toUpperCase()+k.slice(1);state[ek]=(state[ek]||0)+v;});
  item.equipped=true;state.equipped[item.slot]=uid;state.quests.equip.done=true;
  calcStats();addLog(`Equipped ${item.name}!`,'good');playSound('snd-craft');renderInventory();renderEquipSlots();updateUI();renderQuests();
}
function unequipSlot(slot,silent=false){
  const uid=state.equipped[slot];if(!uid)return;
  const item=state.inventory.find(i=>i.uid===uid);
  if(item){Object.entries(item.stats||{}).forEach(([k,v])=>{const ek='equip'+k.charAt(0).toUpperCase()+k.slice(1);state[ek]=Math.max(0,(state[ek]||0)-v);});item.equipped=false;if(!silent)addLog(`Unequipped ${item.name}!`,'info');}
  state.equipped[slot]=null;calcStats();renderInventory();renderEquipSlots();updateUI();
}
function renderEquipSlots(){
  ['weapon','armor','helmet','boots','ring','amulet'].forEach(slot=>{
    const slotEl=document.getElementById(`slot-${slot}`),nameEl=document.getElementById(`slot-${slot}-name`);
    slotEl.className='equip-slot';const existing=slotEl.querySelector('.equip-tooltip');if(existing)existing.remove();
    const uid=state.equipped[slot];
    if(uid){
      const item=state.inventory.find(i=>i.uid===uid);
      if(item){
        nameEl.textContent=item.name.replace(/^[^\s]+ /,'').substring(0,12);
        slotEl.classList.add('has-item',item.rarity);
        // Add glow for enhanced items
        const enh=item.enhLevel||0;
        if(enh>=15)slotEl.classList.add('enh-glow-15');
        else if(enh>=7)slotEl.classList.add('enh-glow-7');
        const statsHtml=Object.entries(item.stats||{}).map(([k,v])=>`<div class="tooltip-stat">+${v} ${k.toUpperCase()}</div>`).join('');
        const rarity=RARITY[item.rarity]||RARITY.normal;
        const enh_label=enh>0?`<div style="color:${enh>=7?'var(--legendary)':'var(--gold)'};font-size:0.75em;">+${enh} Enhanced</div>`:'';
        slotEl.insertAdjacentHTML('beforeend',`<div class="equip-tooltip" style="display:none;"><div style="color:${rarity.color};font-weight:600;">${item.name}</div><div style="color:${rarity.color};font-size:0.8em;margin:3px 0;">${rarity.label}</div>${enh_label}${statsHtml}<div style="color:#888;font-size:0.75em;margin-top:4px;">Sell: ${item.sellPrice}g</div></div>`);
      }
    } else { nameEl.textContent='Empty'; }
  });
}

// ── INVENTORY ──
function addToInventory(item){
  if(item.stackable){
    const existing=state.inventory.find(i=>i.name===item.name&&i.rarity===item.rarity&&i.stackable&&!i.equipped);
    if(existing){existing.qty=(existing.qty||1)+(item.qty||1);renderInventory();return;}
  }
  state.inventory.push({...item,uid:item.uid||genUid()});renderInventory();
}
function switchInvTab(tab){
  currentInvTab=tab;state.invTab=tab;
  document.querySelectorAll('.inv-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(`inv-tab-${tab}`).classList.add('active');renderInventory();
}
function renderInventory(){
  const list=document.getElementById('inventory-list'),items=state.inventory.filter(i=>i.category===currentInvTab);
  if(!items.length){list.innerHTML='<div class="inv-empty">No items here</div>';return;}
  list.innerHTML=`<div class="item-grid">${items.map(item=>{
    const stackBadge=item.stackable&&item.qty>1?`<div class="item-icon-stack">×${item.qty}</div>`:'';
    const equippedBadge=item.equipped?`<div class="item-icon-equipped">E</div>`:'';
    const enh=item.enhLevel||0;
    const enhBadge=enh>0?`<div class="item-icon-stack" style="top:2px;left:3px;right:auto;color:${enh>=7?'var(--legendary)':'var(--gold)'}">+${enh}</div>`:'';
    const glowClass=enh>=15?'enh-glow-15':enh>=7?'enh-glow-7':'';
    const isLocked=item.levelReq&&item.levelReq>state.level;
    const lockBadge=isLocked?`<div style="position:absolute;top:2px;left:3px;font-size:.6em;color:var(--red);">🔒${item.levelReq}</div>`:'';
    return `<div class="item-icon-box ${item.rarity} ${glowClass}"
      onclick="showItemPopup('inv',${item.uid})" title="${item.name}"
      style="${isLocked?'opacity:0.5;':''}">
      <div class="item-icon-emoji">${item.name.split(' ')[0]}</div>
      ${stackBadge}${equippedBadge}${enhBadge}${lockBadge}
    </div>`;
  }).join('')}</div>`;
}

function formatNumber(num){if(num>=1000000)return(num/1000000).toFixed(1)+'M';if(num>=1000)return(num/1000).toFixed(1)+'K';return num;}

// ── ENHANCEMENT ──
const ENHANCE_COST=[0,500,1000,2000,3500,5000,8000,12000,18000,25000,35000,50000,70000,100000,150000,200000];
const ENHANCE_RATE=[0,100,95,85,75,65,55,45,35,25,25,25,25,25,25,25];
function openEnhance(uid){const item=state.inventory.find(i=>i.uid===uid);if(!item||item.category!=='equipment')return;document.getElementById('enhance-screen').style.display='block';renderEnhanceScreen(uid);}
function closeEnhance(){document.getElementById('enhance-screen').style.display='none';}
function renderEnhanceScreen(uid){
  const item=state.inventory.find(i=>i.uid===uid);if(!item)return;
  const r=RARITY[item.rarity]||RARITY.normal,enh=item.enhLevel||0,maxed=enh>=15,cost=ENHANCE_COST[enh+1]||0,rate=ENHANCE_RATE[enh+1]||0;
  const pips=Array.from({length:15},(_,i)=>`<div class="enhance-pip ${i<enh?enh>=11?'pip-high':'pip-filled':'pip-empty'}"></div>`).join('');
  const statsHtml=Object.entries(item.stats||{}).map(([k,v])=>`<div class="enhance-stat-line">+${v<1?v.toFixed(3):v} ${k.toUpperCase()}</div>`).join('');
  const nextHtml=Object.entries(item.stats||{}).map(([k,v])=>{const n=v<1?Math.round(v*1.15*1000)/1000:Math.floor(v*1.15);return `<div class="enhance-stat-line" style="color:var(--green)">+${v<1?n.toFixed(3):n} ${k.toUpperCase()}</div>`;}).join('');
  document.getElementById('enhance-screen').innerHTML=`
    <div class="enhance-container">
      <div class="enhance-title">⚒️ Enhancement</div>
      <div class="enhance-item-card">
        <div class="enhance-item-name" style="color:${r.color}">${item.name}${enh>0?`<span class="enh-badge ${enh>=7?'enh-high':'enh-low'}">+${enh}</span>`:''}</div>
        <div style="color:${r.color};font-size:.75em;text-align:center;margin-bottom:8px;">${r.label}</div>
        <div class="enhance-level-bar">${pips}</div>
        <div style="text-align:center;font-size:.72em;color:#888;margin-top:4px;">Level ${enh} / 15</div>
        ${!maxed?`<div class="enhance-stats-row"><div class="enhance-stats-col"><div class="enhance-stats-title">Current</div>${statsHtml}</div><div class="enhance-arrow">→</div><div class="enhance-stats-col"><div class="enhance-stats-title" style="color:var(--green)">After +${enh+1}</div>${nextHtml}</div></div>
        <div class="enhance-cost-box">
          <div class="enhance-cost-title">Enhancement +${enh+1}</div>
          <div class="enhance-cost-row"><span>💰 Cost</span><span style="color:${state.gold>=cost?'var(--green)':'var(--red)'}">${cost.toLocaleString()}g</span></div>
          <div class="enhance-cost-row"><span>✅ Success Rate</span><span style="color:${rate>=80?'var(--green)':rate>=50?'var(--gold)':'var(--red)'}">${rate}%</span></div>
          <div class="enhance-cost-row"><span>❌ Fail Effect</span><span style="color:var(--red)">${enh>0?`Drop to +${enh-1}`:'Nothing'}</span></div>
        </div>
        <div style="text-align:center;margin-top:12px;"><button class="enhance-btn ${state.gold<cost?'enhance-btn-disabled':''}" onclick="doEnhance(${uid})" ${state.gold<cost?'disabled':''}>⚒️ Enhance +${enh+1}</button></div>`:'<div style="text-align:center;color:var(--legendary);font-family:Cinzel,serif;margin:12px 0;">✨ MAX ENHANCED!</div>'}
      </div>
      <div style="text-align:center;margin-top:12px;"><button class="start-btn" onclick="closeEnhance()">✅ Close</button></div>
    </div>`;
}
function doEnhance(uid){
  const item=state.inventory.find(i=>i.uid===uid);if(!item)return;
  const enh=item.enhLevel||0;if(enh>=15){notify('Already max enhanced!','var(--gold)');return;}
  const cost=ENHANCE_COST[enh+1],rate=ENHANCE_RATE[enh+1];
  if(state.gold<cost){notify('Not enough gold!','var(--red)');return;}
  state.gold-=cost;

  // ── Only these flat stats get enhanced. Mults, lifeSteal, special abilities are never touched.
  const FLAT_STATS=new Set(['str','agi','int','sta','armor','maxHp','maxMp']);

  if(item.equipped){Object.entries(item.stats||{}).forEach(([k,v])=>{const ek='equip'+k.charAt(0).toUpperCase()+k.slice(1);state[ek]=Math.max(0,(state[ek]||0)-v);});}

  const success=Math.random()*100<rate;
  if(success){
    Object.keys(item.stats||{}).forEach(k=>{
      if(!FLAT_STATS.has(k))return; // skip mults and specials
      item.stats[k]=Math.floor(item.stats[k]*1.05);
    });
    item.enhLevel=enh+1;
    addLog(`⚒️ SUCCESS! ${item.name} is now +${item.enhLevel}!`,'gold');
    notify(`✨ SUCCESS! +${item.enhLevel}!`,'var(--gold)');
    playSound('snd-levelup');
  } else {
    if(enh>0){
      Object.keys(item.stats||{}).forEach(k=>{
        if(!FLAT_STATS.has(k))return; // skip mults and specials
        item.stats[k]=Math.max(1,Math.floor(item.stats[k]/1.05));
      });
      item.enhLevel=enh-1;
      addLog(`💔 FAILED! Dropped to +${item.enhLevel}!`,'bad');
      notify(`💔 FAILED! Dropped to +${item.enhLevel}!`,'var(--red)');
    } else {
      addLog(`💔 FAILED! Nothing happened.`,'bad');
      notify('💔 FAILED!','var(--red)');
    }
    playSound('snd-death');
  }

  if(item.equipped){Object.entries(item.stats||{}).forEach(([k,v])=>{const ek='equip'+k.charAt(0).toUpperCase()+k.slice(1);state[ek]=(state[ek]||0)+v;});}
  if(item.equipped)calcStats();updateUI();renderInventory();renderEnhanceScreen(uid);
}

function useItem(uid){
  const idx=state.inventory.findIndex(i=>i.uid===uid);if(idx===-1)return;
  const item=state.inventory[idx];
  if(item.effect==='treasure'){openTreasureBox(item);state.inventory.splice(idx,1);renderInventory();updateUI();return;}
  if(item.category==='consumable'){
    if(item.effect==='hp'||item.effect==='both'){state.hp=Math.min(state.maxHp,state.hp+(item.val||40));addLog(`Used ${item.name}: +${item.val} HP`,'good');playSound('snd-heal');spawnDmgFloat(`+${item.val}HP`,false,'heal-float');}
    if(item.effect==='mp'||item.effect==='both'){state.mp=Math.min(state.maxMp,state.mp+(item.val||30));addLog(`Used ${item.name}: +${item.val} MP`,'info');spawnDmgFloat(`+${item.val}MP`,false,'mp-float');}
    if(item.stackable&&item.qty>1)item.qty--;else state.inventory.splice(idx,1);
    renderInventory();updateUI();
  }
}

function showItemPopup(source,id){
  const r_=r=>RARITY[r]||RARITY.normal;
  let item,btns='',statsHtml='',reqLine='';

  if(source==='shop'){
    const all=[...SHOP_EQUIP,...SHOP_CONS];
    item=all.find(i=>i.id===id);if(!item)return;
    statsHtml=item.stats
      ?Object.entries(item.stats).map(([k,v])=>`<div class="tooltip-stat">+${v} ${k.toUpperCase()}</div>`).join('')
      :item.effect?`<div class="tooltip-stat">Restore ${item.val} ${item.effect==='both'?'HP+MP':item.effect.toUpperCase()}</div>`:'';
    reqLine=(item.levelReq&&item.levelReq>0)
      ?`<div style="font-size:.78em;margin-bottom:6px;color:${state.level>=item.levelReq?'var(--green)':'var(--red)'};">${state.level>=item.levelReq?'✅':'🔒'} Level ${item.levelReq} Required</div>`:'';
    btns=`<button class="start-btn" onclick="buyShopItem('${item.id}');closeItemPopup()">💰 Buy (${item.price}g)</button>`;

  } else {
    item=state.inventory.find(i=>i.uid===id);if(!item)return;
    statsHtml=item.stats
      ?Object.entries(item.stats).map(([k,v])=>`<div class="tooltip-stat">+${v} ${k.toUpperCase()}</div>`).join('')
      :item.effect?`<div class="tooltip-stat">Restore ${item.val} ${item.effect==='both'?'HP+MP':item.effect.toUpperCase()}</div>`:'';
    reqLine=(item.levelReq&&item.levelReq>0)
      ?`<div style="font-size:.78em;margin-bottom:6px;color:${state.level>=item.levelReq?'var(--green)':'var(--red)'};">${state.level>=item.levelReq?'✅':'🔒'} Level ${item.levelReq} Required</div>`:'';
    if(item.category==='equipment'){
      btns=item.equipped
        ?`<button class="start-btn red-btn" onclick="unequipSlot('${item.slot}');closeItemPopup()">Unequip</button>`
        :`<button class="start-btn blue-btn" onclick="equipItem(${item.uid});closeItemPopup()">Equip</button>`;
      btns+=`<button class="start-btn purple-btn" onclick="closeItemPopup();openEnhance(${item.uid})">⚒️ Enhance</button>`;
      if(!item.equipped)btns+=`<button class="start-btn" onclick="closeItemPopup();listItemForAuction(${item.uid})" style="background:linear-gradient(135deg,#005580,#0088cc);">🏛️ Auction</button>`;
    }
    if(item.category==='consumable')btns+=`<button class="start-btn" onclick="useItem(${item.uid});closeItemPopup()">Use</button>`;
    if(!item.equipped)btns+=`<button class="start-btn red-btn" onclick="sellItem(${item.uid});closeItemPopup()">Sell ${item.stackable&&item.qty>1?'All':''} (${(item.sellPrice||0)*(item.stackable?item.qty:1)}g)</button>`;
  }

  showPopup(item, reqLine+statsHtml, btns);
}
function showPopup(item,statsHtml,btns){
  const r=RARITY[item.rarity]||RARITY.normal;
  document.getElementById('item-popup-content').innerHTML=`
    <div style="text-align:center;margin-bottom:10px;"><div style="font-size:2.5em;">${item.name.split(' ')[0]}</div><div style="color:${r.color};font-family:'Cinzel',serif;font-size:1em;font-weight:600;">${item.name}</div><div style="color:${r.color};font-size:.78em;">${r.label}</div></div>
    <div style="margin:10px 0;">${statsHtml}</div><div style="color:#888;font-size:.75em;margin-bottom:12px;">Sell: ${item.sellPrice||0}g</div>
    <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">${btns}</div>
    <div style="margin-top:8px;text-align:center;"><button class="start-btn" style="background:rgba(255,255,255,.1);color:#aaa;" onclick="closeItemPopup()">✖ Close</button></div>`;
  document.getElementById('item-popup').style.display='flex';
}
function closeItemPopup(){document.getElementById('item-popup').style.display='none';}

function sellItem(uid){
  const idx=state.inventory.findIndex(i=>i.uid===uid);if(idx===-1)return;
  const item=state.inventory[idx];if(item.equipped)return;
  const total=(item.sellPrice||0)*(item.stackable?item.qty:1);
  state.gold+=total;addLog(`Sold ${item.name} for ${total}g`,'gold');state.inventory.splice(idx,1);
  renderInventory();updateUI();if(state.gold>=50)state.quests.gold50.done=true;renderQuests();
}

// ── AUTO SELL ──
function saveAutoSell(){
  state.autoSell.normal=document.getElementById('as-normal').checked;
  state.autoSell.uncommon=document.getElementById('as-uncommon').checked;
  state.autoSell.rare=document.getElementById('as-rare').checked;
  state.autoSell.epic=document.getElementById('as-epic').checked;
}
function loadAutoSellUI(){
  document.getElementById('as-normal').checked=state.autoSell?.normal||false;
  document.getElementById('as-uncommon').checked=state.autoSell?.uncommon||false;
  document.getElementById('as-rare').checked=state.autoSell?.rare||false;
  document.getElementById('as-epic').checked=state.autoSell?.epic||false;
}
function autoSellAfterCombat(){
  if(!state.autoSell?.normal&&!state.autoSell?.uncommon&&!state.autoSell?.rare&&!state.autoSell?.epic)return;
  let totalGold=0,count=0;
  const toSell=state.inventory.filter(i=>{
    if(i.equipped||!(i.category==='equipment'||i.category==='material'))return false;
    return(state.autoSell.normal&&i.rarity==='normal')||(state.autoSell.uncommon&&i.rarity==='uncommon')||(state.autoSell.rare&&i.rarity==='rare')||(state.autoSell.epic&&i.rarity==='epic');
  });
  toSell.forEach(item=>{totalGold+=(item.sellPrice||0)*(item.stackable?item.qty:1);count++;const idx=state.inventory.findIndex(i=>i.uid===item.uid);if(idx!==-1)state.inventory.splice(idx,1);});
  if(count>0){addLog(`🗑️ Auto-sold ${count} items for ${totalGold}g!`,'gold');state.gold+=totalGold;notify(`🗑️ Auto-sold ${count} items for ${totalGold}g`,'var(--gold)');renderInventory();updateUI();}
}
function autoSellNow(){ autoSellAfterCombat(); }

// ── CRAFTING ──
function openCrafting(){document.getElementById('craft-screen').style.display='block';renderCrafting();}
function closeCrafting(){document.getElementById('craft-screen').style.display='none';}
function getMaterialQty(name){const item=state.inventory.find(i=>i.name===name&&i.stackable);return item?item.qty:0;}
function renderCrafting(){
  const grid=document.getElementById('craft-grid'),r_=r=>RARITY[r]||RARITY.normal;
  grid.innerHTML=CRAFTING.map(recipe=>{
    const result=recipe.result,rColor=r_(result.rarity).color;
    const reqHtml=recipe.req.map(r=>{const have=getMaterialQty(r.name),ok=have>=r.qty;return `<div class="${ok?'ok':'no'}">• ${r.name}: ${have}/${r.qty} ${ok?'✅':'❌'}</div>`;}).join('');
    const canCraft=recipe.req.every(r=>getMaterialQty(r.name)>=r.qty);
    return `<div class="craft-card"><div class="craft-result" style="color:${rColor}">${result.name||result.slot} — <span style="color:${rColor}">${r_(result.rarity).label}</span></div><div style="font-size:.78em;color:#888;margin-bottom:5px;">${recipe.desc}</div><div class="craft-req">${reqHtml}</div><button class="craft-btn" onclick="craftItem('${recipe.id}')" ${canCraft?'':'disabled'}>⚗️ Craft</button></div>`;
  }).join('');
}
function craftItem(recipeId){
  const recipe=CRAFTING.find(r=>r.id===recipeId);if(!recipe)return;
  if(!recipe.req.every(r=>getMaterialQty(r.name)>=r.qty)){notify('Missing materials!','var(--red)');return;}
  recipe.req.forEach(req=>{let need=req.qty;state.inventory.forEach(item=>{if(item.name===req.name&&item.stackable&&need>0){const take=Math.min(item.qty,need);item.qty-=take;need-=take;}});state.inventory=state.inventory.filter(i=>!i.stackable||(i.qty||0)>0);});
  const result={...recipe.result,uid:genUid(),sellPrice:Math.round((RARITY[recipe.result.rarity]?.mult||1)*15*state.level*.5)};
  if(result.stackable)result.qty=1;if(result.category==='equipment')result.equipped=false;
  addToInventory(result);state.quests.craft.done=true;
  addLog(`⚗️ Crafted: ${result.name}!`,result.rarity==='legendary'?'legendary':'purple');notify(`⚗️ Crafted ${result.name}!`,'var(--purple)');playSound('snd-craft');renderCrafting();renderInventory();renderQuests();
}

// ── SHOP ──
function switchShopTab(tab){
  currentShopTab=tab;
  document.querySelectorAll('.shop-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(`shop-tab-${tab}`).classList.add('active');renderShop();
}
function renderShop(){
  const items=currentShopTab==='equipment'?SHOP_EQUIP:SHOP_CONS,r_=r=>RARITY[r]||RARITY.normal;
  document.getElementById('shop-content').innerHTML=`<div class="item-grid">${items.map(item=>`<div class="item-icon-box ${item.rarity}" onclick="showItemPopup('shop','${item.id}')" title="${item.name}"><div class="item-icon-emoji">${item.name.split(' ')[0]}</div><div class="item-icon-price">💰${item.price}</div></div>`).join('')}</div>`;
}
function buyShopItem(itemId){
  const all=[...SHOP_EQUIP,...SHOP_CONS],item=all.find(i=>i.id===itemId);if(!item)return;
  if(state.gold<item.price){addLog('Not enough gold!','bad');return;}
  state.gold-=item.price;
  if(item.slot){addToInventory({uid:genUid(),name:item.name,category:'equipment',slot:item.slot,rarity:item.rarity||'normal',stats:{...item.stats},equipped:false,levelReq:item.levelReq||0,sellPrice:Math.floor(item.price*.5)});}
  else{addToInventory({uid:genUid(),name:item.name,category:'consumable',rarity:item.rarity||'normal',effect:item.effect,val:item.val,sellPrice:Math.floor(item.price*.4),stackable:true,qty:1});}
  addLog(`Bought ${item.name} for ${item.price}g!`,'gold');updateUI();
  if(state.gold>=50)state.quests.gold50.done=true;renderQuests();
}

// ── QUESTS ──
function renderQuests(){document.getElementById('quest-list').innerHTML=Object.values(state.quests).map(q=>`<div class="quest-item ${q.done?'quest-done':''}">${q.done?'✅':''} ${q.text}</div>`).join('');}

// ── LOGS ──
function addLog(msg,type=''){const b=document.getElementById('log-box'),d=document.createElement('div');d.className=`log-entry ${type?'log-'+type:''}`;d.textContent=msg;b.appendChild(d);b.scrollTop=b.scrollHeight;}

// ── UPDATE UI ── (fixed: only uses state.hp / state.maxHp, no more state.health)
function updateUI(){
  calcStats();
  const hp=Math.max(0,state.hp),mp=Math.max(0,state.mp);
  document.getElementById('hp-val').textContent=formatNumber(hp);
  document.getElementById('hp-max').textContent=formatNumber(state.maxHp);
  document.getElementById('mp-val').textContent=formatNumber(mp);
  document.getElementById('mp-max').textContent=formatNumber(state.maxMp);
  document.getElementById('xp-val').textContent=formatNumber(state.xp);
  document.getElementById('xp-next').textContent=formatNumber(state.xpNext);
  document.getElementById('gold-val').textContent=formatNumber(state.gold);
  document.getElementById('str-val').textContent=formatNumber(state.str);
  document.getElementById('agi-val').textContent=formatNumber(state.agi);
  document.getElementById('int-val').textContent=formatNumber(state.int);
  document.getElementById('sta-val').textContent=formatNumber(state.sta);
  document.getElementById('atk-val').textContent=formatNumber(state.attackPower);
  document.getElementById('armor-val').textContent=formatNumber(state.armor);
  document.getElementById('crit-val').textContent=state.crit+'%';
  document.getElementById('dodge-val').textContent=formatNumber(state.dodge);
  document.getElementById('hit-val').textContent=formatNumber(state.hit);
  document.getElementById('hpregen-val').textContent=formatNumber(state.hpRegen);
  document.getElementById('mpregen-val').textContent=formatNumber(state.manaRegen);
  document.getElementById('lifesteal-val').textContent=(state.lifeSteal*100).toFixed(2)+'%';
  document.getElementById('char-level').textContent=`Level ${state.level} / 100`;
  document.getElementById('hp-bar').style.width=Math.max(0,(hp/state.maxHp)*100)+'%';
  document.getElementById('mp-bar').style.width=Math.max(0,(mp/state.maxMp)*100)+'%';
  document.getElementById('xp-bar').style.width=Math.min(100,(state.xp/state.xpNext)*100)+'%';
  document.getElementById('arena-player-hp').style.width=Math.max(0,(hp/state.maxHp)*100)+'%';
  document.getElementById('arena-player-mp').style.width=Math.max(0,(mp/state.maxHp)*100)+'%';
  updateTutorialStatus();
}

// ── LEADERBOARD ──
async function fetchLeaderboard(){
  try {
    document.getElementById('lb-list').innerHTML='<div class="lb-empty">Loading...</div>';
    // Two-step: fetch leaderboard, then get character names separately
    const{data,error}=await dbClient.from('leaderboard').select('*').order('level',{ascending:false}).order('gold',{ascending:false}).limit(20);
    if(error)throw error;
    if(!data||!data.length){document.getElementById('lb-list').innerHTML='<div class="lb-empty">No scores yet! 🏆</div>';return;}
    // Fetch character names for each player_id
    const ids=[...new Set(data.map(r=>r.player_id).filter(Boolean))];
    let nameMap={};
    if(ids.length){
      const{data:chars}=await dbClient.from('characters').select('id,name,class').in('id',ids);
      if(chars)chars.forEach(c=>{nameMap[c.id]={name:c.name,class:c.class};});
    }
    renderLeaderboard(data,nameMap);
  } catch(e){ document.getElementById('lb-list').innerHTML='<div class="lb-empty">Could not load leaderboard.</div>';console.error('Leaderboard error:',e); }
}
async function submitScore(){
  if(!state.character_id||!state.name){alert('Start the game first!');return;}
  try {
    const{data:{user}}=await dbClient.auth.getUser();if(!user){alert('You must be logged in.');return;}
    const{error}=await dbClient.from('leaderboard').upsert({player_id:state.character_id,user_id:user.id,level:state.level,gold:state.gold,class:state.class?CLASSES[state.class].name:'Adventurer',updated_at:new Date().toISOString()},{onConflict:'player_id'});
    if(error)throw error;
    addLog('🏆 Score submitted!','gold');notify('🏆 Score submitted!','var(--gold)');fetchLeaderboard();
  } catch(e){ alert('Could not submit score: '+e.message);console.error('Submit score error:',e); }
}
function renderLeaderboard(scores,nameMap={}){
  const list=document.getElementById('lb-list');
  if(!scores||!scores.length){list.innerHTML='<div class="lb-empty">No scores yet! 🏆</div>';return;}
  const medals=['🥇','🥈','🥉'],cls=['gold','silver','bronze'];
  list.innerHTML=scores.map((s,i)=>{
    const charInfo=nameMap[s.player_id]||{};
    return `<div class="lb-row"><div class="lb-rank ${cls[i]||''}">${medals[i]||'#'+(i+1)}</div><div class="lb-name">${charInfo.name||'Unknown'}</div><div class="lb-class">${charInfo.class||s.class||'Adventurer'}</div><div class="lb-level">⭐ Lv.${s.level}</div><div class="lb-gold-col">💰 ${formatNumber(s.gold)}g</div></div>`;
  }).join('');
}

// ── AUCTION HOUSE ──
const AUCTION_FEE=0.10;
const SYSTEM_ITEMS_PER_DAY=5;

async function checkAndSettleAuctions(){
  try {
    const{data:expired}=await dbClient.from('auctions').select('*').eq('status','active').lt('ends_at',new Date().toISOString());
    if(!expired||!expired.length)return;
    for(const auction of expired)await settleExpiredAuction(auction.id);

    if(!state.character_id)return;
    const{data:myAuctions}=await dbClient.from('auctions').select('*').eq('seller_id',state.character_id).eq('status','completed').eq('seller_collected',false);
    if(myAuctions&&myAuctions.length){
      let totalGold=0;
      for(const auction of myAuctions){totalGold+=Math.floor(auction.current_bid*(1-AUCTION_FEE));await dbClient.from('auctions').update({seller_collected:true}).eq('id',auction.id);}
      if(totalGold>0){state.gold+=totalGold;await savePlayerToSupabase();addLog(`🏛️ +${formatNumber(totalGold)}g from auctions!`,'legendary');notify(`💰 +${formatNumber(totalGold)}g from auctions!`,'var(--gold)');updateUI();}
    }

    const{data:wonAuctions}=await dbClient.from('auctions').select('*').eq('current_bidder_id',state.character_id).eq('status','completed').eq('winner_collected',false);
    if(wonAuctions&&wonAuctions.length){
      for(const auction of wonAuctions){
        const item=auction.item_description?(typeof auction.item_description==='string'?JSON.parse(auction.item_description):auction.item_description):{name:auction.item_name,rarity:auction.rarity,uid:genUid()};
        item.uid=genUid();addToInventory(item);await dbClient.from('auctions').update({winner_collected:true}).eq('id',auction.id);
        addLog(`🏛️ Received ${auction.item_name} from auction!`,'legendary');
      }
      await savePlayerToSupabase();renderInventory();updateUI();notify(`📦 New items from auction!`,'var(--gold)');
    }
  } catch(error){console.error('Settle auctions error:',error);}
}

async function settleExpiredAuction(auctionId){
  try {
    const{data:auction}=await dbClient.from('auctions').select('*').eq('id',auctionId).single();
    if(!auction||auction.status!=='active')return;
    if(!auction.current_bidder_id||!auction.current_bid||auction.current_bid===0){
      if(auction.source==='player'){
        const{data:sc}=await dbClient.from('characters').select('inventory').eq('id',auction.seller_id).single();
        if(sc){const inv=sc.inventory||[],item=auction.item_description?(typeof auction.item_description==='string'?JSON.parse(auction.item_description):auction.item_description):{name:auction.item_name,rarity:auction.rarity,uid:genUid()};item.uid=genUid();inv.push(item);await dbClient.from('characters').update({inventory:inv}).eq('id',auction.seller_id);}
      }
      await dbClient.from('auctions').update({status:'expired'}).eq('id',auctionId);return;
    }
    const goldAfterFee=Math.floor(auction.current_bid*(1-AUCTION_FEE));
    if(auction.source==='player'){const{data:sc}=await dbClient.from('characters').select('gold').eq('id',auction.seller_id).single();if(sc)await dbClient.from('characters').update({gold:sc.gold+goldAfterFee}).eq('id',auction.seller_id);}
    await dbClient.from('auctions').update({status:'completed',seller_collected:auction.source==='system',winner_collected:false,updated_at:new Date().toISOString()}).eq('id',auctionId);
  } catch(error){console.error('Settle single auction error:',error);}
}

async function generateSystemAuctionItems(){
  const today=new Date().toISOString().split('T')[0];
  const{data:existing}=await dbClient.from('auctions').select('id').eq('source','system').gte('created_at',today+'T00:00:00Z').eq('status','active');
  if(existing&&existing.length>=SYSTEM_ITEMS_PER_DAY)return;
  const slots=['weapon','armor','helmet','boots','ring','amulet'],rarities=['rare','rare','epic','epic','legendary'];
  const endsAt=new Date();endsAt.setHours(endsAt.getHours()+24);
  for(let i=0;i<SYSTEM_ITEMS_PER_DAY;i++){
    const slot=slots[Math.floor(Math.random()*slots.length)],rarity=rarities[Math.floor(Math.random()*rarities.length)];
    const item=mkEquipDrop(slot,rarity),basePrice=Math.floor(item.sellPrice*(2+Math.random()*2));
    await dbClient.from('auctions').insert({seller_id:null,item_name:item.name,item_description:JSON.stringify(item),rarity:item.rarity,start_price:basePrice,buyout_price:Math.floor(basePrice*2.5),current_bid:0,current_bidder_id:null,ends_at:endsAt.toISOString(),status:'active',source:'system',seller_collected:true,winner_collected:false});
  }
}

async function fetchAuctions(){
  const container=document.getElementById('auction-list');if(!container)return;
  container.innerHTML='<div style="text-align:center;color:#888;padding:20px;">Loading...</div>';
  try {
    await generateSystemAuctionItems();
    const{data,error}=await dbClient.from('auctions').select('*').eq('status','active').gt('ends_at',new Date().toISOString()).order('ends_at',{ascending:true});
    if(error)throw error;
    if(!data||!data.length){container.innerHTML='<div style="text-align:center;color:#444;padding:20px;font-style:italic;">No active auctions!</div>';return;}
    // Fetch seller names separately
    const sellerIds=[...new Set(data.map(a=>a.seller_id).filter(Boolean))];
    let sellerMap={};
    if(sellerIds.length){const{data:chars}=await dbClient.from('characters').select('id,name').in('id',sellerIds);if(chars)chars.forEach(c=>{sellerMap[c.id]=c.name;});}
    renderAuctions(data,sellerMap);
  } catch(error){console.error('Fetch auctions error:',error);container.innerHTML='<div style="text-align:center;color:#f00;padding:20px;">Failed to load auctions</div>';}
}

function renderAuctions(auctions,sellerMap={}){
  const container=document.getElementById('auction-list');if(!container)return;
  const r_=r=>RARITY[r]||RARITY.normal;
  container.innerHTML=auctions.map(auction=>{
    const endsAt=new Date(auction.ends_at),timeLeft=endsAt-new Date();
    const hoursLeft=Math.max(0,Math.floor(timeLeft/3600000)),minsLeft=Math.max(0,Math.floor((timeLeft%3600000)/60000));
    const isExpired=timeLeft<=0,isOwn=auction.seller_id===state.character_id,isSystem=auction.source==='system';
    const currentBid=auction.current_bid||auction.start_price,rColor=r_(auction.rarity).color;
    const sellerName=isSystem?'🤖 Auction House':`👤 ${sellerMap[auction.seller_id]||'Unknown'}`;
    return `<div style="background:linear-gradient(135deg,rgba(255,255,255,0.03),rgba(8,8,40,0.7));border:1px solid ${rColor};border-radius:8px;padding:10px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <div style="font-size:1.6em;">${auction.item_name.split(' ')[0]}</div>
        <div style="flex:1;"><div style="color:${rColor};font-family:'Cinzel',serif;font-size:.82em;font-weight:600;">${auction.item_name}</div><div style="font-size:.7em;color:#888;">${r_(auction.rarity).label} · ${sellerName}</div></div>
        <div style="font-size:.7em;color:${isExpired?'var(--red)':'#888'};">${isExpired?'❌ Expired':`⏱️ ${hoursLeft}h ${minsLeft}m`}</div>
      </div>
      ${auction.item_description?`<div style="font-size:.72em;color:#888;margin-bottom:6px;padding:4px;background:rgba(0,0,0,0.2);border-radius:4px;">${(()=>{try{const item=typeof auction.item_description==='string'?JSON.parse(auction.item_description):auction.item_description;return Object.entries(item.stats||{}).map(([k,v])=>`<span style="margin-right:6px;">+${v<1?v.toFixed(3):v} ${k.toUpperCase()}</span>`).join('');}catch(e){return '';}})()}</div>`:''}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <div><div style="color:var(--gold);font-family:'Cinzel',serif;font-size:.9em;">💰 ${formatNumber(currentBid)}g${auction.current_bidder_id?'<span style="font-size:.7em;color:#888;"> (highest)</span>':'<span style="font-size:.7em;color:#888;"> (starting)</span>'}</div>${auction.buyout_price?`<div style="font-size:.72em;color:#aaa;">Buyout: ${formatNumber(auction.buyout_price)}g</div>`:''}</div>
        <div style="font-size:.7em;color:#555;">Fee: 10%</div>
      </div>
      ${!isOwn&&!isExpired?`<div style="display:flex;gap:6px;"><button class="start-btn" onclick="placeBid('${auction.id}',${currentBid})" style="flex:1;font-size:.72em;padding:5px 8px;">⬆️ Bid</button>${auction.buyout_price?`<button class="start-btn" onclick="buyoutAuction('${auction.id}',${auction.buyout_price})" style="flex:1;font-size:.72em;padding:5px 8px;background:linear-gradient(135deg,#005500,#00aa44);">⚡ Buy ${formatNumber(auction.buyout_price)}g</button>`:''}</div>`:isOwn?`<div style="display:flex;gap:6px;"><div style="flex:1;text-align:center;font-size:.72em;color:#888;padding:4px;">Your listing</div><button class="start-btn red-btn" onclick="cancelAuction('${auction.id}')" style="flex:1;font-size:.72em;padding:5px 8px;">❌ Cancel</button></div>`:''}
    </div>`;
  }).join('');
}

async function placeBid(auctionId,currentBid){
  const minBid=currentBid+Math.max(100,Math.floor(currentBid*0.05));
  const bidAmount=parseInt(prompt(`Minimum bid: ${formatNumber(minBid)}g\nEnter your bid:`));
  if(!bidAmount||isNaN(bidAmount))return;
  if(bidAmount<minBid){notify(`❌ Minimum bid is ${formatNumber(minBid)}g!`,'var(--red)');return;}
  if(bidAmount>state.gold){notify('❌ Not enough gold!','var(--red)');return;}
  try {
    const{data:auction}=await dbClient.from('auctions').select('*').eq('id',auctionId).single();
    if(!auction||auction.status!=='active'){notify('❌ Auction no longer active!','var(--red)');return;}
    if(auction.current_bidder_id&&auction.current_bid>0){
      const{data:prev}=await dbClient.from('characters').select('gold').eq('id',auction.current_bidder_id).single();
      if(prev){await dbClient.from('characters').update({gold:prev.gold+auction.current_bid}).eq('id',auction.current_bidder_id);}
      if(auction.current_bidder_id===state.character_id)state.gold+=auction.current_bid;
    }
    state.gold-=bidAmount;
    await dbClient.from('auctions').update({current_bid:bidAmount,current_bidder_id:state.character_id,updated_at:new Date().toISOString()}).eq('id',auctionId);
    await savePlayerToSupabase();
    addLog(`⬆️ Bid: ${formatNumber(bidAmount)}g on ${auction.item_name}!`,'gold');notify(`⬆️ Bid: ${formatNumber(bidAmount)}g!`,'var(--gold)');updateUI();fetchAuctions();
  } catch(error){state.gold+=bidAmount;notify('❌ Bid failed: '+error.message,'var(--red)');console.error('Bid error:',error);}
}

async function buyoutAuction(auctionId,buyoutPrice){
  if(buyoutPrice>state.gold){notify('❌ Not enough gold!','var(--red)');return;}
  if(!confirm(`Buy now for ${formatNumber(buyoutPrice)}g?\n(10% fee applies to seller)`))return;
  try {
    const{data:auction}=await dbClient.from('auctions').select('*').eq('id',auctionId).single();
    if(!auction||auction.status!=='active'){notify('❌ Auction no longer active!','var(--red)');return;}
    if(auction.current_bidder_id&&auction.current_bid>0&&auction.current_bidder_id!==state.character_id){
      const{data:prev}=await dbClient.from('characters').select('gold').eq('id',auction.current_bidder_id).single();
      if(prev)await dbClient.from('characters').update({gold:prev.gold+auction.current_bid}).eq('id',auction.current_bidder_id);
    }
    state.gold-=buyoutPrice;
    const item=auction.item_description?(typeof auction.item_description==='string'?JSON.parse(auction.item_description):auction.item_description):{name:auction.item_name,rarity:auction.rarity,uid:genUid(),category:'equipment',equipped:false};
    item.uid=genUid();addToInventory(item);
    if(auction.source==='player'&&auction.seller_id){
      const goldAfterFee=Math.floor(buyoutPrice*(1-AUCTION_FEE));
      const{data:sc}=await dbClient.from('characters').select('gold').eq('id',auction.seller_id).single();
      if(sc)await dbClient.from('characters').update({gold:sc.gold+goldAfterFee}).eq('id',auction.seller_id);
    }
    await dbClient.from('auctions').update({status:'sold',current_bidder_id:state.character_id,current_bid:buyoutPrice,winner_collected:true,seller_collected:true,updated_at:new Date().toISOString()}).eq('id',auctionId);
    await savePlayerToSupabase();
    addLog(`🏛️ Bought ${auction.item_name} for ${formatNumber(buyoutPrice)}g!`,'legendary');notify(`🏛️ Item purchased!`,'var(--gold)');playSound('snd-craft');updateUI();renderInventory();fetchAuctions();
  } catch(error){state.gold+=buyoutPrice;notify('❌ Purchase failed: '+error.message,'var(--red)');console.error('Buyout error:',error);}
}

async function listItemForAuction(uid){
  const item=state.inventory.find(i=>i.uid===uid);if(!item){notify('❌ Item not found!','var(--red)');return;}
  if(item.equipped){notify('❌ Unequip item first!','var(--red)');return;}
  if(!state.character_id){notify('❌ Must be logged in to list items!','var(--red)');return;}
  const startPrice=parseInt(prompt('Starting bid price (gold):'));if(!startPrice||isNaN(startPrice)||startPrice<=0)return;
  const buyoutInput=prompt('Buyout price (leave empty for no buyout):');
  const buyoutPrice=buyoutInput?parseInt(buyoutInput):null;
  if(buyoutPrice&&buyoutPrice<=startPrice){notify('❌ Buyout must be higher than start price!','var(--red)');return;}
  try {
    const idx=state.inventory.findIndex(i=>i.uid===uid);state.inventory.splice(idx,1);
    const endsAt=new Date();endsAt.setHours(endsAt.getHours()+24);
    const{error}=await dbClient.from('auctions').insert({seller_id:state.character_id,item_name:item.name,item_description:JSON.stringify(item),rarity:item.rarity||'normal',start_price:startPrice,buyout_price:buyoutPrice||null,current_bid:0,current_bidder_id:null,ends_at:endsAt.toISOString(),status:'active',source:'player',seller_collected:false,winner_collected:false});
    if(error)throw error;
    await savePlayerToSupabase();
    addLog(`🏛️ ${item.name} listed! Starts at ${formatNumber(startPrice)}g`,'gold');notify(`🏛️ Item listed for auction!`,'var(--gold)');renderInventory();updateUI();
  } catch(error){state.inventory.push(item);notify('❌ Listing failed: '+error.message,'var(--red)');console.error('List error:',error);}
}

async function cancelAuction(auctionId){
  if(!confirm('Cancel this auction? Item will be returned.'))return;
  try {
    const{data:auction}=await dbClient.from('auctions').select('*').eq('id',auctionId).single();
    if(!auction){notify('❌ Auction not found!','var(--red)');return;}
    if(auction.current_bidder_id&&auction.current_bid>0){
      const{data:bidder}=await dbClient.from('characters').select('gold').eq('id',auction.current_bidder_id).single();
      if(bidder){await dbClient.from('characters').update({gold:bidder.gold+auction.current_bid}).eq('id',auction.current_bidder_id);}
      if(auction.current_bidder_id===state.character_id)state.gold+=auction.current_bid;
    }
    const item=auction.item_description?(typeof auction.item_description==='string'?JSON.parse(auction.item_description):auction.item_description):{name:auction.item_name,rarity:auction.rarity,uid:genUid(),category:'equipment',equipped:false};
    item.uid=genUid();addToInventory(item);
    await dbClient.from('auctions').update({status:'cancelled'}).eq('id',auctionId);
    await savePlayerToSupabase();
    notify('✅ Auction cancelled!','var(--gold)');addLog(`❌ Cancelled auction for ${auction.item_name}`,'info');renderInventory();updateUI();fetchAuctions();
  } catch(error){notify('❌ Cancel failed: '+error.message,'var(--red)');console.error('Cancel error:',error);}
}

function switchMarketTab(tab){
  document.getElementById('market-ah').style.display=tab==='auction'?'block':'none';
  document.getElementById('market-tab-ah').classList.toggle('active',tab==='auction');
  if(tab==='auction')fetchAuctions();
}

// ── CLICK SOUND ──
const clickSnd=document.getElementById('clickSound');
document.addEventListener('click',e=>{
  if(['BUTTON','A'].includes(e.target.tagName)){if(clickSnd){clickSnd.currentTime=0;clickSnd.play().catch(()=>{});}}
});
