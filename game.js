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
  legendary:{label:'Legendary',color:'var(--legendary)',chance:.03,mult:5.5},
  epic:{label:'Epic',color:'var(--epic)',chance:.08,mult:4.5},
  rare:{label:'Rare',color:'var(--rare)',chance:.18,mult:3.8},
  uncommon:{label:'Uncommon',color:'var(--uncommon)',chance:.35,mult:2.3},
  normal:{label:'Normal',color:'#cccccc',chance:1,mult:1},
};
function rollRarity(isBoss=false){
  const r=Math.random();
  if(isBoss){ if(r<0.15)return'legendary'; if(r<0.40)return'epic'; if(r<0.70)return'rare'; return'uncommon'; }
  else { if(r<0.05)return'rare'; if(r<0.20)return'uncommon'; return'normal'; }
}

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
  normal:{ label:'Normal',icon:'⚔️',color:'#cccccc',levelReq:0,hpMult:1,atkMult:1,hitMul:1,dodgeMult:1,goldMult:1,xpMult:1,rarityBonus:0,legendaryChance:0.003 },
  hard:{   label:'Hard',  icon:'🔥',color:'#ff8800',levelReq:20,hpMult:3,atkMult:3,hitMul:3,dodgeMult:3,goldMult:3,xpMult:3,rarityBonus:2,legendaryChance:0.007 },
  hell:{   label:'Hell',  icon:'💀',color:'#ff2222',levelReq:50,hpMult:5,atkMult:5,hitMul:5,dodgeMult:5,goldMult:5,xpMult:5,rarityBonus:3,legendaryChance:0.009 },
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
  state.attackPower  = Math.floor((state.str*2+state.int*2)*atkpMult) + (state.equipAttackPower||0) + (state.talentBonuses.baseAttackPower||0);
  state.maxHp        = Math.floor(50+(state.str*10)+(state.sta*15)+(state.level*20)) + (state.equipMaxHp||0);
  state.armor        = Math.floor((state.agi*3+state.baseArmor+(state.talentBonuses.baseArmor||0))*armorMult) + (state.equipArmor||0);
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
    state.battleCryActive=true;state.strMult*=2.5;state.armorMult*=2.4;state.critMult*=2.5;state.hitMult*=1.5;
    addCombatLog(`📯 Battle Cry! +50% STR, +40% ARMOR!`,'good');playSound('snd-magic');calcStats();return 0;}},
  last_stand:{name:'Last Stand',icon:'🛡️',mp:()=>Math.floor(state.maxMp*0.20),cd:1,use:(e)=>{
    const h=Math.floor(state.maxHp*0.35);state.hp=Math.min(state.maxHp,state.hp+h);
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

// ── MONSTER TEMPLATES ──
const MONSTER_TEMPLATES = {
  young_wolf:      {id:'young_wolf',     name:'🐺 Young Wolf',      icon:'wolf',    hp:1000, atk:80,  armor:50,  hit:80,  dodge:50,  xp:800,  gold:[30,60]},
  forest_wolf:     {id:'forest_wolf',    name:'🐺 Forest Wolf',     icon:'wolf',    hp:1500, atk:100, armor:80,  hit:100, dodge:80,  xp:1200, gold:[50,100]},
  shadow_wolf:     {id:'shadow_wolf',    name:'🐺 Shadow Wolf',     icon:'wolf',    hp:2000, atk:130, armor:120, hit:140, dodge:120, xp:1600, gold:[80,140]},
  dire_wolf:       {id:'dire_wolf',      name:'🐺 Dire Wolf',       icon:'wolf',    hp:2600, atk:160, armor:150, hit:180, dodge:150, xp:2000, gold:[100,180]},
  cave_spider:     {id:'cave_spider',    name:'🕷️ Cave Spider',     icon:'spider',  hp:30000, atk:1800, armor:1500, hit:2000, dodge:2000, xp:2400, gold:[120,200]},
  venom_spider:    {id:'venom_spider',   name:'🕷️ Venom Spider',    icon:'spider',  hp:40000, atk:2200, armor:1800, hit:4500, dodge:4500, xp:3000, gold:[160,260]},
  giant_spider:    {id:'giant_spider',   name:'🕷️ Giant Spider',    icon:'spider',  hp:52000, atk:2700, armor:2200, hit:8000, dodge:8000, xp:3700, gold:[200,320]},
  queen_spider:    {id:'queen_spider',   name:'🕷️ Queen Spider',    icon:'spider',  hp:68000, atk:3200, armor:2700, hit:13600, dodge:13600, xp:4500, gold:[250,400]},
  goblin_scout:    {id:'goblin_scout',   name:'👹 Goblin Scout',    icon:'goblin',  hp:80000, atk:18000, armor:8000, hit:9400, dodge:9400, xp:5400, gold:[300,480]},
  goblin_warrior:  {id:'goblin_warrior', name:'👹 Goblin Warrior',  icon:'goblin',  hp:100000,atk:25000, armor:16000, hit:15200, dodge:15200, xp:6500, gold:[380,580]},
  goblin_shaman:   {id:'goblin_shaman',  name:'👹 Goblin Shaman',   icon:'goblin',  hp:130000,atk:32000, armor:19200, hit:16200, dodge:16200, xp:7800, gold:[460,700]},
  goblin_elite:    {id:'goblin_elite',   name:'👹 Goblin Elite',    icon:'goblin',  hp:165000,atk:40000, armor:22600, hit:17400, dodge:17400, xp:9400, gold:[560,840]},
  skeleton_archer: {id:'skeleton_archer',name:'💀 Skeleton Archer', icon:'skeleton',hp:200000,atk:52000, armor:41000,hit:22800, dodge:22880, xp:11000,gold:[660,1000]},
  skeleton_warrior:{id:'skeleton_warrior',name:'💀 Skeleton Warrior',icon:'skeleton',hp:250000,atk:68200,armor:51200,hit:28040,dodge:28040,xp:13200,gold:[800,1200]},
  skeleton_mage:   {id:'skeleton_mage',  name:'💀 Skeleton Mage',   icon:'skeleton',hp:310000,atk:79600, armor:61440,hit:31220,dodge:31220,xp:15800,gold:[960,1440]},
  skeleton_knight: {id:'skeleton_knight',name:'💀 Skeleton Knight', icon:'skeleton',hp:390000,atk:85200,armor:71700,hit:41440,dodge:41440,xp:19000,gold:[1160,1740]},
  orc_grunt:       {id:'orc_grunt',      name:'👊 Orc Grunt',       icon:'orc',     hp:480000,atk:93000,armor:88000,hit:51700,dodge:51700,xp:22800,gold:[1400,2100]},
  orc_warrior:     {id:'orc_warrior',    name:'👊 Orc Warrior',     icon:'orc',     hp:600000,atk:152000,armor:123600,hit:62000,dodge:62000,xp:27400,gold:[1680,2520]},
  orc_shaman:      {id:'orc_shaman',     name:'👊 Orc Shaman',      icon:'orc',     hp:740000,atk:178000,armor:128000,hit:72340,dodge:72340,xp:32800,gold:[2020,3020]},
  orc_berserker:   {id:'orc_berserker',  name:'👊 Orc Berserker',   icon:'orc',     hp:920000,atk:208000,armor:183260,hit:82740,dodge:82740,xp:39400,gold:[2420,3640]},
  vampire_thrall:  {id:'vampire_thrall', name:'🧛 Vampire Thrall',  icon:'vampire', hp:1140000,atk:264000,armor:238200,hit:93220,dodge:93220,xp:47200,gold:[2900,4360]},
  vampire_hunter:  {id:'vampire_hunter', name:'🧛 Vampire Hunter',  icon:'vampire', hp:1400000,atk:286000,armor:244800,hit:11780,dodge:11780,xp:56800,gold:[3500,5240]},
  vampire_noble:   {id:'vampire_noble',  name:'🧛 Vampire Noble',   icon:'vampire', hp:1720000,atk:334000,armor:302400,hit:29420,dodge:29420,xp:68200,gold:[4200,6300]},
  vampire_elder:   {id:'vampire_elder',  name:'🧛 Vampire Elder',   icon:'vampire', hp:2120000,atk:390000,armor:331400,hit:35180,dodge:35180,xp:81800,gold:[5040,7560]},
  cave_troll:      {id:'cave_troll',     name:'👾 Cave Troll',      icon:'troll',   hp:2600000,atk:456000,armor:471800,hit:46060,dodge:46060,xp:98200,gold:[6050,9080]},
  rock_troll:      {id:'rock_troll',     name:'👾 Rock Troll',      icon:'troll',   hp:3200000,atk:532000,armor:504000,hit:57080,dodge:57080,xp:117800,gold:[7260,10900]},
  frost_troll:     {id:'frost_troll',    name:'👾 Frost Troll',     icon:'troll',   hp:3940000,atk:622000,armor:598200,hit:82800,dodge:82800,xp:141400,gold:[8720,13080]},
  war_troll:       {id:'war_troll',      name:'👾 War Troll',       icon:'troll',   hp:4860000,atk:728000,armor:614800,hit:96800,dodge:96800,xp:169600,gold:[10460,15700]},
  demon_scout:     {id:'demon_scout',    name:'😈 Demon Scout',     icon:'demon',   hp:5980000,atk:850000,armor:734200,hit:113200,dodge:113200,xp:203600,gold:[12560,18840]},
  demon_warrior:   {id:'demon_warrior',  name:'😈 Demon Warrior',   icon:'demon',   hp:7360000,atk:994000,armor:856800,hit:132200,dodge:132200,xp:244400,gold:[15080,22620]},
  demon_mage:      {id:'demon_mage',     name:'😈 Demon Mage',      icon:'demon',   hp:9060000,atk:1162000,armor:983200,hit:154600,dodge:154600,xp:293200,gold:[18100,27140]},
  demon_knight:    {id:'demon_knight',   name:'😈 Demon Knight',    icon:'demon',   hp:11160000,atk:1358000,armor:1214000,hit:180600,dodge:180600,xp:351800,gold:[21720,32580]},
  shadow_wraith:   {id:'shadow_wraith',  name:'🌑 Shadow Wraith',   icon:'werewolf',hp:13740000,atk:1588000,armor:1250000,hit:211200,dodge:211200,xp:422200,gold:[26060,39100]},
  shadow_knight:   {id:'shadow_knight',  name:'🌑 Shadow Knight',   icon:'werewolf',hp:16920000,atk:1856000,armor:1292200,hit:246800,dodge:246800,xp:506600,gold:[31280,46920]},
  shadow_mage:     {id:'shadow_mage',    name:'🌑 Shadow Mage',     icon:'werewolf',hp:20840000,atk:2170000,armor:1934160,hit:288600,dodge:288600,xp:608000,gold:[37540,56300]},
  shadow_lord:     {id:'shadow_lord',    name:'🌑 Shadow Lord',     icon:'werewolf',hp:25680000,atk:2538000,armor:2239940,hit:337200,dodge:337200,xp:729600,gold:[45050,67580]},
  eternal_guard:   {id:'eternal_guard',  name:'🌟 Eternal Guard',   icon:'phoenix', hp:31640000,atk:2968000,armor:2466800,hit:394200,dodge:394200,xp:875600,gold:[54060,81100]},
  eternal_warrior: {id:'eternal_warrior',name:'🌟 Eternal Warrior', icon:'phoenix', hp:38980000,atk:3470000,armor:3146000,hit:460800,dodge:460800,xp:1050800,gold:[64880,97320]},
  eternal_mage:    {id:'eternal_mage',   name:'🌟 Eternal Mage',    icon:'phoenix', hp:48020000,atk:4058000,armor:3638600,hit:538800,dodge:538800,xp:1261000,gold:[77860,116800]},
  eternal_champion:{id:'eternal_champion',name:'🌟 Eternal Champion',icon:'phoenix',hp:59160000,atk:4746000,armor:4446800,hit:630000,dodge:630000,xp:1513000,gold:[93440,140160]},
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
  stage_boss_1:{id:'stage_boss_1',name:'🐺 Wolf King',icon:'🐺',hp:5000,atk:400,armor:80,hit:60,dodge:60,xp:2000,gold:[500,1000],
    ability:{name:'PACK HOWL!',color:'#ffdd00',triggerEvery:3,effect:(e)=>{const d=Math.floor(e.atk*0.5);state.hp=Math.max(1,state.hp-d);spawnAbilityFloat('🐺 PACK HOWL!','#ffdd00');addCombatLog(`🐺 Wolf King howls! Pack attacks for ${d}!`,'bad');animateAttack(false,d,false);}},
    cs:{title:'Wolf King',req:'Required: Stage 1 Clear',text:'The mighty Wolf King rises from the pack!'}},
  stage_boss_2:{id:'stage_boss_2',name:'🕷️ Spider Queen',icon:'🕷️',hp:150000,atk:9000,armor:2000,hit:15500,dodge:15500,xp:5000,gold:[1200,2400],
    ability:{name:'WEB TRAP!',color:'#44ff44',triggerEvery:3,effect:(e)=>{state.webTrapped=2;spawnAbilityFloat('🕸️ WEB TRAP!','#44ff44');addCombatLog(`🕸️ Spider Queen webs you! Dodge 0 for 2 turns!`,'bad');}},
    cs:{title:'Spider Queen',req:'Required: Stage 2 Clear',text:'From the depths of her web kingdom, the Spider Queen descends!'}},
  stage_boss_3:{id:'stage_boss_3',name:'👹 Goblin Warlord',icon:'👹',hp:350000,atk:18000,armor:5000,hit:18500,dodge:18500,xp:10000,gold:[2500,5000],
    ability:{name:'GOLD STEAL!',color:'#f0c040',triggerEvery:3,effect:(e)=>{const s=Math.floor(state.gold*0.10);state.gold=Math.max(0,state.gold-s);spawnAbilityFloat('💰 GOLD STEAL!','#f0c040');addCombatLog(`💰 Goblin Warlord steals ${s} gold!`,'bad');}},
    cs:{title:'Goblin Warlord',req:'Required: Stage 3 Clear',text:'The Goblin Warlord commands an army of thieves!'}},
  stage_boss_4:{id:'stage_boss_4',name:'💀 Skeleton Lord',icon:'💀',hp:800000,atk:35000,armor:11000,hit:80000,dodge:80000,xp:20000,gold:[5000,10000],
    ability:{name:'DEATH CURSE!',color:'#aa44ff',triggerEvery:3,effect:(e)=>{const r=Math.floor(state.maxHp*0.05);state.activeDebuffs.maxHpReduction+=r;state.equipMaxHp=(state.equipMaxHp||0)-r;spawnAbilityFloat('💀 DEATH CURSE!','#aa44ff');addCombatLog(`💀 Death Curse! Max HP -${r}!`,'bad');calcStats();}},
    cs:{title:'Skeleton Lord',req:'Required: Stage 4 Clear',text:'The Skeleton Lord rises from his eternal tomb!'}},
  stage_boss_5:{id:'stage_boss_5',name:'👊 Orc Chieftain',icon:'👊',hp:1800000,atk:70000,armor:24000,hit:180000,dodge:180000,xp:40000,gold:[10000,20000],
    ability:{name:'BERSERKER RAGE!',color:'#ff8800',triggerEvery:5,effect:(e)=>{currentEnemy.atk=Math.floor(currentEnemy.atk*2);currentEnemy.rageTimer=3;spawnAbilityFloat('👊 BERSERKER RAGE!','#ff8800');addCombatLog(`👊 Orc Chieftain berserk! ATK doubled!`,'bad');}},
    cs:{title:'Orc Chieftain',req:'Required: Stage 5 Clear',text:'The Orc Chieftain is the strongest warrior alive!'}},
  stage_boss_6:{id:'stage_boss_6',name:'🧛 Vampire Lord',icon:'🧛',hp:4000000,atk:140000,armor:50000,hit:240000,dodge:240000,xp:80000,gold:[20000,40000],
    ability:{name:'LIFE DRAIN!',color:'#ff2244',triggerEvery:3,effect:(e)=>{const h=Math.floor(currentEnemy.atk*0.2);currentEnemy.hp=Math.min(currentEnemy.maxHp,currentEnemy.hp+h);spawnAbilityFloat('🧛 LIFE DRAIN!','#ff2244');addCombatLog(`🧛 Vampire Lord drains life! +${h} HP!`,'bad');updateEnemyBar();}},
    cs:{title:'Vampire Lord',req:'Required: Stage 6 Clear',text:'The Vampire Lord rules the night!'}},
  stage_boss_7:{id:'stage_boss_7',name:'👾 Troll King',icon:'👾',hp:9000000,atk:280000,armor:100000,hit:380000,dodge:380000,xp:160000,gold:[40000,80000],
    ability:{name:'REGENERATION!',color:'#00ff88',triggerEvery:2,effect:(e)=>{const h=Math.floor(currentEnemy.maxHp*0.03);currentEnemy.hp=Math.min(currentEnemy.maxHp,currentEnemy.hp+h);spawnAbilityFloat('👾 REGENERATION!','#00ff88');addCombatLog(`👾 Troll King regenerates ${h} HP!`,'bad');updateEnemyBar();}},
    cs:{title:'Troll King',req:'Required: Stage 7 Clear',text:'The Troll King cannot be killed!'}},
  stage_boss_8:{id:'stage_boss_8',name:'😈 Demon Prince',icon:'😈',hp:20000000,atk:550000,armor:200000,hit:416000,dodge:416000,xp:320000,gold:[80000,160000],
    ability:{name:'HELLFIRE!',color:'#ff4400',triggerEvery:3,effect:(e)=>{const d=Math.floor(currentEnemy.atk*0.8);state.hp=Math.max(1,state.hp-d);spawnAbilityFloat('😈 HELLFIRE!','#ff4400');addCombatLog(`😈 Hellfire! ${d} true damage!`,'bad');animateAttack(false,d,false);}},
    cs:{title:'Demon Prince',req:'Required: Stage 8 Clear',text:'The Demon Prince wields hellfire that melts through any armor!'}},
  stage_boss_9:{id:'stage_boss_9',name:'🌑 Shadow Emperor',icon:'🌑',hp:50000000,atk:1100000,armor:400000,hit:532000,dodge:532000,xp:640000,gold:[160000,320000],
    ability:{name:'PHASE SHIFT!',color:'#4488ff',triggerEvery:3,effect:(e)=>{currentEnemy.phaseShifted=true;spawnAbilityFloat('🌑 PHASE SHIFT!','#4488ff');addCombatLog(`🌑 Shadow Emperor phases out! Next attack misses!`,'bad');}},
    cs:{title:'Shadow Emperor',req:'Required: Stage 9 Clear',text:'The Shadow Emperor exists between dimensions!'}},
  stage_boss_10:{id:'stage_boss_10',name:'🌟 Eternal King',icon:'🌟',hp:120000000,atk:2200000,armor:800000,hit:664000,dodge:664000,xp:1500000,gold:[400000,800000],
    ability:{name:'ALL POWERS!',color:'#ffffff',triggerEvery:2,effect:(e)=>{const d=Math.floor(currentEnemy.atk*0.6);state.hp=Math.max(1,state.hp-d);spawnAbilityFloat('🌟 ETERNAL POWER!','#ffffff');addCombatLog(`🌟 Eternal King unleashes power! ${d} damage!`,'bad');animateAttack(false,d,false);}},
    cs:{title:'Eternal King',req:'Required: Stage 10 — FINAL BOSS',text:'The Eternal King combines ALL the powers of every boss!'}},
};

function scaleMonster(templateId,stageLevel){
  const tmpl=MONSTER_TEMPLATES[templateId];if(!tmpl)return null;
  const diff=DIFFICULTY[state.difficulty||'normal'];
  const stageScale=1+(stageLevel-1)*0.9;
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
  const stageScale=1+(stageLevel-1)*0.5;
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
      {text:'🏪 Shop',                    next:'shop_scene'},
      {text:'⛪ Inn (+50% HP and MP, 5g)',       next:'inn'},
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
  {id:'s2',name:'⚔️ Steel Sword',price:500,slot:'weapon',rarity:'uncommon',stats:{str:45,lifeSteal:0.06,hit:25,crit:0.2}},
  {id:'s5',name:'🛡️ Wooden Shield',price:200,slot:'armor',rarity:'normal',stats:{sta:15,armor:25,hpRegen:25,dodge:0.2}},
  {id:'s6',name:'🛡️ Chain Mail',price:400,slot:'armor',rarity:'uncommon',stats:{sta:25,armor:55,hpRegen:50,dodge:0.5}},
  {id:'s9',name:'👢 Leather Boots',price:220,slot:'boots',rarity:'normal',stats:{agi:15,crit:0.1}},
  {id:'s10',name:'👢 Swift Treads',price:550,slot:'boots',rarity:'uncommon',stats:{agi:30,dodge:0.2}},
  {id:'s13',name:'💍 Copper Band',price:350,slot:'ring',rarity:'normal',stats:{str:10,int:10,crit:0.10}},
  {id:'s14',name:'💍 Silver Seal',price:550,slot:'ring',rarity:'uncommon',stats:{str:25,int:25,crit:0.20}},
  {id:'s17',name:'⛑️ Iron Helm',price:280,slot:'helmet',rarity:'normal',stats:{armor:25,int:10,crit:0.10}},
  {id:'s18',name:'⛑️ Steel Visor',price:580,slot:'helmet',rarity:'uncommon',stats:{armor:55,int:25,crit:0.20}},
  {id:'s21',name:'📿 Novice Pendant',price:250,slot:'amulet',rarity:'normal',stats:{int:15,maxMp:150,crit:0.10}},
  {id:'s22',name:'📿 Mage Talisman',price:550,slot:'amulet',rarity:'uncommon',stats:{int:35,maxMp:350,crit:0.20}},
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
    if(c.enemy)btn.onclick=()=>startCombat(c.enemy,false);
    else if(c.bossId)btn.onclick=()=>triggerBoss(c.bossId);
    else if(c.next==='enter_dungeon')btn.onclick=()=>enterDungeon(c.stageId);
    else btn.onclick=()=>loadScene(c.next);
    box.appendChild(btn);
  });
  updateUI();updateAutoFightBtn();
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
    let dmg=Math.max(1,state.attackPower+Math.floor(Math.random()*8)-Math.floor(currentEnemy.armor/2));
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
      let eDmg=Math.max(1,currentEnemy.atk+Math.floor(Math.random()*6)-Math.floor(state.armor/10));
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

// ── COMBAT ──
function startCombat(enemyId,isBoss){
  const tmpl=MONSTER_TEMPLATES[enemyId];if(!tmpl)return;
  const diff=DIFFICULTY[state.difficulty||'normal'];
  const scale=(1+Math.max(0,(state.level-1))*0.01)*diff.hpMult;
  const atkScale=(1+Math.max(0,(state.level-1))*0.01)*diff.atkMult;
  const prefix=state.difficulty==='hell'?'💀 Hell ':state.difficulty==='hard'?'🔥 Hard ':'';
  currentEnemy={...tmpl,name:prefix+tmpl.name,hp:Math.floor(tmpl.hp*scale),maxHp:Math.floor(tmpl.hp*scale),atk:Math.floor(tmpl.atk*atkScale),armor:tmpl.armor,hit:Math.floor((tmpl.hit||0)*5),dodge:Math.floor((tmpl.dodge||0)*5),poisoned:0,frozen:false,crippled:0,boss:false,_xpMult:diff.xpMult,_goldMult:diff.goldMult};
  currentEnemy=applyTutorialScaling(currentEnemy);
  startCombatWith(currentEnemy);
  if(isTutorialActive()){addCombatLog('📚 TUTORIAL MODE: Enemies are weaker!','info');showTutorialHint('firstCombat');}
}
function startCombatWith(enemy){
  autoSkillIndex=0;
  document.getElementById('enemy-hp-val').textContent=enemy.hp;
  document.getElementById('enemy-hp-max').textContent=enemy.maxHp;
  const el=document.getElementById('arena-enemy');
  if(enemy.icon&&!enemy.icon.includes(' ')&&enemy.icon.length<20){el.innerHTML=`<img src="${enemy.icon}.jpg" style="width:50px;height:50px;object-fit:cover;border-radius:8px;border:2px solid var(--red);">`;}
  else{el.textContent=enemy.icon;}
  document.getElementById('arena-enemy-label').textContent=enemy.name;
  document.getElementById('arena-enemy-hp').style.width='100%';
  document.getElementById('combat-log').innerHTML='';
  document.getElementById('combat-box').style.display='block';
  document.getElementById('choices-box').style.display='none';
  document.getElementById('story-content').innerHTML=`<div class="scene-title">⚔️ Combat!</div><p><strong style="color:var(--red)">${enemy.name}</strong> appears!${enemy.boss?'<br><span style="color:var(--gold)">⚠️ BOSS BATTLE!</span>':''}</p>`;
  document.getElementById('arena-player').innerHTML='<img src="warrior.jpg" style="width:50px;height:50px;object-fit:cover;border-radius:8px;border:2px solid var(--dark-gold);">';
  updateAutoFightBtn();
}

function combatAction(action){
  if(!currentEnemy)return;
  if(action==='attack'){
    showTutorialHint('firstCombat');
    const eDodge=Math.max(0,(currentEnemy.dodge||0)-state.hit)/100;
    if(Math.random()<eDodge){addCombatLog(`💨 ${currentEnemy.name} dodged!`,'bad');playSound('snd-attack');}
    else {
      let dmg=Math.max(1,state.attackPower+Math.floor(Math.random()*8)-Math.floor(currentEnemy.armor/2));
      let isCrit=false;
      const tutBonus=getTutorialDamageBonus();dmg=Math.floor(dmg*tutBonus);
      if(state.unlockedTalents.includes('berserker')&&state.hp<state.maxHp*.5)dmg=Math.floor(dmg*1.35);
      if(Math.random()<state.crit/100){dmg=Math.floor(dmg*2);isCrit=true;}
      if(isCrit)showCritEffect();
      if(state.unlockedTalents.includes('death_mark'))dmg=Math.floor(dmg*1.5);
      if(state.unlockedTalents.includes('venom'))currentEnemy.poisoned=(currentEnemy.poisoned||0)+1;
      currentEnemy.hp-=dmg;
      const ls=state.lifeSteal||0;if(ls>0){const h=Math.floor(dmg*ls);if(h>0){state.hp=Math.min(state.maxHp,state.hp+h);addCombatLog(`🩸 Life Steal heals ${h} HP!`,'good');spawnDmgFloat(`🩸+${h}`,false,'heal-float');}}
      addCombatLog(`⚔️ ${isCrit?'💥CRIT! ':''}You hit for ${dmg}!`,isCrit?'gold':'good');playSound('snd-attack');animateAttack(true,dmg,isCrit);
    }
    state.defending=false;
  } else if(action==='magic'){
    showTutorialHint('firstMagic');
    if(state.mp<10){addCombatLog('❌ Not enough MP!','bad');return;}
    let dmg=Math.max(1,state.int*2+Math.floor(Math.random()*10));
    if(state.unlockedTalents.includes('spell_power'))dmg=Math.floor(dmg*1.3);
    if(state.unlockedTalents.includes('fire_mastery'))dmg=Math.floor(dmg*1.2);
    currentEnemy.hp-=dmg;state.mp-=10;
    addCombatLog(`✨ Magic hits for ${dmg}! (-10 MP)`,'info');playSound('snd-magic');animateAttack(true,dmg,false);state.defending=false;
  } else if(action==='defend'){
    showTutorialHint('firstDefend');state.defending=true;addCombatLog('🛡️ Bracing for impact!','info');
  } else if(action==='flee'){
    showTutorialHint('firstFlee');
    const ok=state.unlockedTalents.includes('smoke_bomb')?.99:state.agi>currentEnemy.armor?.7:.35;
    if(Math.random()<ok){addLog('Fled from battle!','bad');currentEnemy=null;document.getElementById('combat-box').style.display='none';loadScene('town');return;}
    addCombatLog('❌ Failed to flee!','bad');state.defending=false;
  }
  if(currentEnemy&&currentEnemy.hp<=0){currentEnemy.hp=0;updateEnemyBar();endCombat(true);return;}
  if(state.hpRegen>0){const r=Math.floor(state.hpRegen);if(r>0&&state.hp<state.maxHp){state.hp=Math.min(state.maxHp,state.hp+r);addCombatLog(`💚 Regen +${r} HP`,'good');}}
  if(state.manaRegen>0){const r=Math.floor(state.manaRegen);if(r>0&&state.mp<state.maxMp){state.mp=Math.min(state.maxMp,state.mp+r);addCombatLog(`💙 Mana Regen +${r} MP`,'info');}}
  Object.keys(state.skillCooldowns).forEach(k=>{if(state.skillCooldowns[k]>0)state.skillCooldowns[k]--;});
  if(currentEnemy&&currentEnemy.hp>0){
    if(currentEnemy.frozen){currentEnemy.frozen=false;addCombatLog(`${currentEnemy.name} is frozen!`,'info');}
    else {
      const pDodge=Math.max(0,state.dodge-(currentEnemy.hit||0))/100;
      let eDmg=Math.max(1,currentEnemy.atk+Math.floor(Math.random()*6)-Math.floor(state.armor/10));
      if(isTutorialActive())eDmg=Math.floor(eDmg*TUTORIAL_CONFIG.enemyDamageMultiplier);
      if(state.defending)eDmg=Math.floor(eDmg/(state.unlockedTalents.includes('fortress')?4:2));
      if(state.unlockedTalents.includes('shield_wall'))eDmg=Math.floor(eDmg*.9);
      if(state.manaShield){state.manaShield=false;addCombatLog('🔮 Mana Shield absorbed!','info');eDmg=0;}
      if(Math.random()<pDodge){addCombatLog('💨 You dodged!','good');eDmg=0;}
      state.hp-=eDmg;
      if(eDmg>0){addCombatLog(`${currentEnemy.name} hits you for ${eDmg}!`,'bad');animateAttack(false,eDmg,false);}
    }
    if(currentEnemy.poisoned>0){const pd=8;currentEnemy.hp-=pd;currentEnemy.poisoned--;addCombatLog(`🐍 Poison deals ${pd}!`,'good');}
    if(state.hp<=0&&state.unlockedTalents.includes('undying')&&!state.usedUndying){state.hp=1;state.usedUndying=true;addCombatLog('💪 Undying Will! Survived!','gold');}
    if(state.hp<=0){state.hp=0;updateUI();endCombat(false);return;}
  }
  updateEnemyBar();updateUI();
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
const EQUIP_STATS={weapon:{str:[150,350],strMult:[0.05,1.5],lifeSteal:[0.01,0.02],crit:[0.01,0.05],hitMult:[0.01,0.05]},armor:{armor:[250,550],armorMult:[0.5,1.5],sta:[150,350],staMult:[0.5,1.5],maxHp:[2000,3000],maxHpMul:[0.5,1.5],hpRegen:[250,750],hpRegenMult:[0.5,1.5],dodge:[100,200]},dodgeMult:[0.5,1.5],helmet:{armor:[350,650],armorMult:[0.5,1.5],int:[150,350],intMult:[0.5,1.5],hit:[100,200],hitMult:[0.5,1.5],dodge:[50,150],dodgeMult:[0.5,1.5]},boots:{agi:[150,350],agiMult:[0.5,1.5],dodge:[100,200],dodgeMult:[0.5,1.5]},ring:{str:[150,350],strMult:[0.5,1.5],int:[150,350],intMult:[0.5,1.5],agi:[150,350],agiMult:[0.5,1.5],sta:[150,350],staMult:[0.5,1.5]},amulet:{strMult:[0.05,0.45],agiMult:[0.05,0.45],intMult:[0.05,0.45],staMult:[0.05,0.45],maxHpMult:[0.01,0.05],maxMpMult:[0.01,0.05]}};
function mkEquipDrop(slot,rarity){
  rarity=applyRarityBonus(rarity);
  const mult=RARITY[rarity].mult;
  const prefix=EQUIP_PREFIXES[rarity][Math.floor(Math.random()*EQUIP_PREFIXES[rarity].length)];
  const suffix=EQUIP_NAMES[slot][Math.floor(Math.random()*EQUIP_NAMES[slot].length)];
  const stats={};
  Object.entries(EQUIP_STATS[slot]).forEach(([k,[mn,mx]])=>{const raw=(Math.random()*(mx-mn)+mn)*mult;stats[k]=mx<1?Math.round(raw*1000)/1000:Math.round(raw);});
  return{uid:genUid(),name:`${SLOT_ICONS[slot]} ${prefix} ${suffix}`,category:'equipment',slot,rarity,stats,equipped:false,sellPrice:Math.round(50*mult*(state.level||1)*.10)};
}
function mkMat(name,rarity,sellPrice){return{uid:genUid(),name,category:'material',rarity,sellPrice,stackable:true,qty:1};}
function mkCons(name,rarity,sellPrice,hpVal){return{uid:genUid(),name,category:'consumable',rarity,sellPrice,stackable:true,qty:1,effect:'hp',val:hpVal};}
function genUid(){return Date.now()+Math.random();}
function applyRarityBonus(rarity){
  const order=['normal','uncommon','rare','epic','legendary'];
  const bonus=(DIFFICULTY[state.difficulty||'normal'].rarityBonus)||0;
  return order[Math.min(order.length-1,order.indexOf(rarity)+bonus)];
}

// ── CRAFTING ──
const CRAFTING=[
  {id:'craft_steel_sword',result:{name:'⚔️ Crafted Steel Sword',slot:'weapon',rarity:'rare',stats:{str:100},category:'equipment'},req:[{name:'🪓 Orc Fragment',qty:3},{name:'🪶 Wolf Fang',qty:2}],desc:'A powerful steel sword forged from orc metal'},
  {id:'craft_shadow_blade',result:{name:'🗡️ Shadow Blade',slot:'weapon',rarity:'epic',stats:{str:80,agi:60},category:'equipment'},req:[{name:'🌕 Moon Shard',qty:2},{name:'🪶 Wolf Fang',qty:3},{name:'🕸️ Spider Silk',qty:2}],desc:'A blade imbued with shadow energy'},
  {id:'craft_dragon_armor',result:{name:'🛡️ Dragon Scale Armor',slot:'armor',rarity:'epic',stats:{armor:320},category:'equipment'},req:[{name:'🐉 Dragon Scale',qty:3},{name:'🪨 Stone Core',qty:2}],desc:'Armor forged from dragon scales'},
  {id:'craft_void_ring',result:{name:'💍 Void Ring',slot:'ring',rarity:'epic',stats:{str:150,int:150,agi:150},category:'equipment'},req:[{name:'🌑 Void Crystal',qty:2},{name:'💎 Troll Gem',qty:3}],desc:'A ring channeling the power of the void'},
  {id:'craft_phoenix_amulet',result:{name:'📿 Phoenix Amulet',slot:'amulet',rarity:'legendary',stats:{int:150,maxMp:400},category:'equipment'},req:[{name:'🔥 Phoenix Feather',qty:2},{name:'🔥 Dragon Flame',qty:2},{name:'💎 Pure Crystal Core',qty:1}],desc:'Ultimate mage amulet'},
  {id:'craft_titan_helm',result:{name:'⛑️ Titan Helm',slot:'helmet',rarity:'legendary',stats:{armor:200,str:80},category:'equipment'},req:[{name:'⚡ Titan Soul',qty:1},{name:'💀 Death Essence',qty:2},{name:'🪨 Stone Core',qty:3}],desc:'A helmet of godlike defense'},
  {id:'craft_chaos_boots',result:{name:'👢 Chaos Treads',slot:'boots',rarity:'legendary',stats:{agi:180,str:50},category:'equipment'},req:[{name:'🌀 Chaos Essence',qty:2},{name:'🌕 Moon Shard',qty:3}],desc:'Boots that bend space'},
  {id:'craft_mega_potion',result:{name:'❤️ Mega Elixir',category:'consumable',rarity:'epic',effect:'hp',val:1500,stackable:true,qty:1},req:[{name:'🩸 Blood Vial',qty:3},{name:'🔥 Phoenix Feather',qty:1}],desc:'Restores 1500 HP instantly'},
  {id:'craft_divine_blade',result:{name:'⚔️ Divine Blade',slot:'weapon',rarity:'legendary',stats:{str:220},category:'equipment'},req:[{name:'☄️ Divine Shard',qty:2},{name:'🐉 Dragon Scale',qty:2},{name:'😈 Demon Horn',qty:1}],desc:'The ultimate weapon'},
];

// ── TREASURE CHEST ──
const TREASURE_TABLES={1:{rolls:2,tier:'normal'},2:{rolls:2,tier:'uncommon'},3:{rolls:3,tier:'uncommon'},4:{rolls:3,tier:'rare'},5:{rolls:3,tier:'rare'},6:{rolls:4,tier:'epic'},7:{rolls:4,tier:'epic'},8:{rolls:4,tier:'epic'},9:{rolls:5,tier:'legendary'},10:{rolls:5,tier:'legendary'}};
function rollTreasureRarity(tier){
  const r=Math.random();
  switch(tier){case'normal':return r<0.30?'uncommon':'normal';case'uncommon':return r<0.30?'rare':'uncommon';case'rare':return r<0.30?'epic':'rare';case'epic':return r<0.05?'legendary':'epic';case'legendary':return r<0.10?'legendary':'epic';default:return'normal';}
}
function dropTreasureBox(stageId){
  const names={1:'📦 Worn Chest',2:'📦 Wooden Chest',3:'📦 Iron Chest',4:'📦 Steel Chest',5:'📦 Golden Chest',6:'📦 Enchanted Chest',7:'📦 Ancient Chest',8:'📦 Demonic Chest',9:'📦 Shadow Chest',10:'📦 Eternal Chest'};
  const box={uid:genUid(),name:names[stageId]||'📦 Mystery Chest',category:'consumable',rarity:stageId<=2?'normal':stageId<=4?'uncommon':stageId<=6?'rare':stageId<=8?'epic':'legendary',effect:'treasure',stageId,difficulty:state.difficulty||'normal',stackable:false,qty:1,sellPrice:1000*stageId};
  addToInventory(box);addLog(`📦 ${box.name} added to inventory!`,'legendary');notify(`📦 ${box.name} dropped!`,'var(--gold)');playSound('snd-levelup');
}
function openTreasureBox(box){
  const stageId=box.stageId||1,table=TREASURE_TABLES[stageId];if(!table)return;
  const diff=DIFFICULTY[box.difficulty||'normal'];
  const slots=['weapon','armor','helmet','boots','ring','amulet'];
  const items=[];
  for(let i=0;i<table.rolls;i++){
    let rarity=rollTreasureRarity(table.tier);rarity=applyRarityBonus(rarity);
    const slot=slots[Math.floor(Math.random()*slots.length)];
    const item=mkEquipDrop(slot,rarity);addToInventory(item);items.push(item);
    if(item.rarity==='legendary')state.quests.legendary.done=true;
  }
  const bonusGold=Math.floor(1000*stageId*diff.goldMult);state.gold+=bonusGold;
  notify(`📦 Chest opened! ${items.length} items found!`,'var(--gold)');addLog(`📦 ${box.name} opened!`,'legendary');
  items.forEach(item=>addLog(`  ${item.name} [${(RARITY[item.rarity]||RARITY.normal).label}]`,item.rarity==='legendary'?'legendary':item.rarity==='epic'?'epic':'gold'));
  addLog(`💰 +${formatNumber(bonusGold)} Gold!`,'gold');
  playSound('snd-levelup');spawnParticles(window.innerWidth/2,window.innerHeight/2,'#f0c040',20);
  renderInventory();updateUI();renderQuests();
}

// ── LEVEL UP ──
function checkLevelUp(){
  while(state.xp>=state.xpNext&&state.level<state.maxLevel){
    state.xp-=state.xpNext;state.level++;
    state.xpNext=Math.floor(state.level*100*20.00);
    state.baseStr+=2;state.baseAgi+=2;state.baseInt+=2;state.baseSta+=2;state.talentPoints+=5;
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
        nameEl.textContent=item.name.replace(/^[^\s]+ /,'').substring(0,12);slotEl.classList.add('has-item',item.rarity);
        const statsHtml=Object.entries(item.stats||{}).map(([k,v])=>`<div class="tooltip-stat">+${v} ${k.toUpperCase()}</div>`).join('');
        const rarity=RARITY[item.rarity]||RARITY.normal;
        slotEl.insertAdjacentHTML('beforeend',`<div class="equip-tooltip" style="display:none;"><div style="color:${rarity.color};font-weight:600;">${item.name}</div><div style="color:${rarity.color};font-size:0.8em;margin:3px 0;">${rarity.label}</div>${statsHtml}<div style="color:#888;font-size:0.75em;margin-top:4px;">Sell: ${item.sellPrice}g</div></div>`);
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
    return `<div class="item-icon-box ${item.rarity} ${glowClass}" onclick="showItemPopup('inv',${item.uid})" title="${item.name}">
      <div class="item-icon-emoji">${item.name.split(' ')[0]}</div>${stackBadge}${equippedBadge}${enhBadge}
    </div>`;}).join('')}</div>`;
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
  if(item.equipped){Object.entries(item.stats||{}).forEach(([k,v])=>{const ek='equip'+k.charAt(0).toUpperCase()+k.slice(1);state[ek]=Math.max(0,(state[ek]||0)-v);});}
  const success=Math.random()*100<rate;
  if(success){
    Object.keys(item.stats||{}).forEach(k=>{item.stats[k]=item.stats[k]<1?Math.round(item.stats[k]*1.15*1000)/1000:Math.floor(item.stats[k]*1.15);});
    item.enhLevel=enh+1;addLog(`⚒️ SUCCESS! ${item.name} is now +${item.enhLevel}!`,'gold');notify(`✨ SUCCESS! +${item.enhLevel}!`,'var(--gold)');playSound('snd-levelup');
  } else {
    if(enh>0){Object.keys(item.stats||{}).forEach(k=>{item.stats[k]=item.stats[k]<1?Math.round(item.stats[k]/1.15*1000)/1000:Math.floor(item.stats[k]/1.15);});item.enhLevel=enh-1;addLog(`💔 FAILED! Dropped to +${item.enhLevel}!`,'bad');notify(`💔 FAILED! Dropped to +${item.enhLevel}!`,'var(--red)');}
    else{addLog(`💔 FAILED! Nothing happened.`,'bad');notify('💔 FAILED!','var(--red)');}
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
  const r_=r=>RARITY[r]||RARITY.normal;let item,btns='';
  if(source==='shop'){
    const all=[...SHOP_EQUIP,...SHOP_CONS];item=all.find(i=>i.id===id);if(!item)return;
    const desc=item.stats?Object.entries(item.stats).map(([k,v])=>`<div class="tooltip-stat">+${v} ${k.toUpperCase()}</div>`).join(''):item.effect?`<div class="tooltip-stat">Restore ${item.val} ${item.effect==='both'?'HP+MP':item.effect.toUpperCase()}</div>`:'';
    btns=`<button class="start-btn" onclick="buyShopItem('${item.id}');closeItemPopup()">💰 Buy (${item.price}g)</button>`;
    showPopup(item,desc,btns);
  } else {
    item=state.inventory.find(i=>i.uid===id);if(!item)return;
    const statsHtml=item.stats?Object.entries(item.stats).map(([k,v])=>`<div class="tooltip-stat">+${v} ${k.toUpperCase()}</div>`).join(''):item.effect?`<div class="tooltip-stat">Restore ${item.val} ${item.effect==='both'?'HP+MP':item.effect.toUpperCase()}</div>`:'';
    if(item.category==='equipment'){
      btns=item.equipped?`<button class="start-btn red-btn" onclick="unequipSlot('${item.slot}');closeItemPopup()">Unequip</button>`:`<button class="start-btn blue-btn" onclick="equipItem(${item.uid});closeItemPopup()">Equip</button>`;
      btns+=`<button class="start-btn purple-btn" onclick="closeItemPopup();openEnhance(${item.uid})">⚒️ Enhance</button>`;
      if(!item.equipped)btns+=`<button class="start-btn" onclick="closeItemPopup();listItemForAuction(${item.uid})" style="background:linear-gradient(135deg,#005580,#0088cc);">🏛️ Auction</button>`;
    }
    if(item.category==='consumable')btns+=`<button class="start-btn" onclick="useItem(${item.uid});closeItemPopup()">Use</button>`;
    if(!item.equipped)btns+=`<button class="start-btn red-btn" onclick="sellItem(${item.uid});closeItemPopup()">Sell ${item.stackable&&item.qty>1?'All':''} (${(item.sellPrice||0)*(item.stackable?item.qty:1)}g)</button>`;
    showPopup(item,statsHtml,btns);
  }
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
  if(item.slot){addToInventory({uid:genUid(),name:item.name,category:'equipment',slot:item.slot,rarity:item.rarity||'normal',stats:{...item.stats},equipped:false,sellPrice:Math.floor(item.price*.5)});}
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
