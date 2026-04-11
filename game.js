
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





// Particicle

function spawnParticles(x, y, color='#f0c040', count=12){
  for(let i=0;i<count;i++){
    const p=document.createElement('div');
    p.className='particle';
    const angle=Math.random()*360;
    const dist=Math.random()*80+30;
    const tx=Math.cos(angle*Math.PI/180)*dist+'px';
    const ty=Math.sin(angle*Math.PI/180)*dist+'px';
    p.style.cssText=`left:${x}px;top:${y}px;width:${Math.random()*6+3}px;height:${Math.random()*6+3}px;background:${color};--tx:${tx};--ty:${ty};animation-duration:${Math.random()*0.5+0.5}s;`;
    document.body.appendChild(p);
    setTimeout(()=>p.remove(),1000);
  }
}

function showLevelUpEffect(){
  const div=document.createElement('div');
  div.className='levelup-text';
  div.textContent='⭐ LEVEL UP! ⭐';
  document.body.appendChild(div);
  setTimeout(()=>div.remove(),2000);
  // Gold particles burst from center
  spawnParticles(window.innerWidth/2, window.innerHeight/2,'#f0c040',20);
}

function showCritEffect(){
  const div=document.createElement('div');
  div.className='crit-text';
  div.textContent='💥 CRITICAL HIT!';
  document.body.appendChild(div);
  setTimeout(()=>div.remove(),800);
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
  if(isBoss){
    // Bosses: can drop epic and legendary
    if(r<0.15)return'legendary';
    if(r<0.40)return'epic';
    if(r<0.70)return'rare';
    return'uncommon';
  } else {
    // Normal monsters: max rare, small chance
    if(r<0.05)return'rare';
    if(r<0.20)return'uncommon';
    return'normal';
  }
}


// ── STATE ──
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 1: Replace your const state={...} with this
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const state={

  // ACTIVE DEBUFFS (cleared after combat)
activeDebuffs: {
  maxHpReduction: 0,
  webTrapped: 0,
  rageTimer: 0,
},

  // BONUS TRACKING (NEW)
  classBonuses: {
    strMult: 0, agiMult: 0, intMult: 0, staMult: 0,
    hitMult: 0, critMult: 0, dodgeMult: 0, hpRegenMult: 0, maxHpMult: 0, maxMpMult: 0,
    mpRegenMult: 0, armorMult: 0, mpMult: 0, lifeStealMult: 0, attackPowerMult: 0, hpMult: 0,
  },
  talentBonuses: {
    strMult: 0, agiMult: 0, intMult: 0, staMult: 0,
    hitMult: 0, critMult: 0, dodgeMult: 0, hpRegenMult: 0,
    mpRegenMult: 0, armorMult: 0, mpMult: 0, lifeStealMult: 0,
    attackPowerMult: 0, maxHpMult: 0, hpMult: 0,
  },

  // EQUIPMENT BONUSES (applied on top of base * mult)
  equipStr:0, equipStrMult:0, equipAgi:0,equipAgiMult:0, equipInt:0, equipIntMult:0, equipSta:0,equipStaMult:0, equipMaxHpMult:0, equipMaxMpMult:0,
  equipMaxMp:0, equipMaxHp:0, equipArmor:0, equipArmorMult:0, equipCrit:0, equipDodge:0,equipDodgeMult:0, equipLifeSteal:0,equipAttackPower:0,equipAttackPowerMult:0, equipHpRegen:0, equipHpRegenMult:0, equipMpRegen:0,equipMpRegenMult:0, equipHit:0,equipHitMult:0,equiplifeSteal:0,equipLifeStealMult:1.0,
 
  // Track talent-based gold multiplier separately
  name:'',level:9,xp:0,xpNext:1000,maxLevel:100,
  hp:100,maxHp:100,mp:50,maxMp:50,hit:10,crit:5,dodge:5,hpRegen:20,lifeSteal:0.01,attackPower:10,armor:10,mpRegen:20,
 
  // PRIMARY BASE STATS (raw - leveled up, never modified directly by class/talent)
  baseStr:5,baseAgi:5,baseInt:5,baseSta:5,baseArmor:5,baseHit:2,baseCrit:0.1,baseDodge:2,baseHpRegen:20,baseLifeSteal:0.05,baseAttackPower:10,
 
  // STAT MULTIPLIERS (class + talent % bonuses, starts at 1.0 = 100%)
  strMult:1.0,agiMult:1.0,intMult:1.0,staMult:1.0,armorMult:1.0,maxHpMult:1.0,hpRegenMult:1.0,maxMpMult:1.0,mpMult:1.0,critMult:1.0,dodgeMult:1.0,mpRegenMult:1.0,hitMult:1.0,lifeStealMult:1.0,skillStrMult:1.0,skillStaMult:1.0,skillMaxHp:1.0,skillArmorMult:1.0,attackPowerMult:1.0,
 
  // EFFECTIVE STATS (calculated by calcStats from base * mult)
  str:5,agi:5,int:5,armor:2,sta:5,hit:5,crit:2,dodge:2,lifeSteal:0.01,attackPower:10,
  gold:300,goldMult:1.0,difficulty:'normal',
 
  // DERIVED STATS (calculated automatically by calcStats)
  attackPower:0,attackPowerMult:1.0,armor:0,armorMult:1.0,crit:0,critMult:1.0,
  dodge:0,dodgeMult:1.0,hpRegen:0,hpRegenMult:1.0,mpRegen:0,maxHp:0,maxHpMult:1.0,maxMp:0,maxMpMult:1.0,mpRegenMult:1.0,mp:0,mpMult:1.0,hit:0,hitMult:1.0,lifeSteal:0,lifeStealMult:1.0,
  inventory:[],equipped:{weapon:null,armor:null,helmet:null,boots:null,ring:null,amulet:null},
  class:null,talentPoints:0,unlockedTalents:[],talentUnlockedFlags:{},skills:[],skillCooldowns:{},
  defending:false,manaShield:false,usedUndying:false,
  currentScene:'town',invTab:'equipment',shopTab:'equipment',
  autoSell:{normal:false,uncommon:false},
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
const DIFFICULTY={
  normal:{
    label:'Normal',icon:'⚔️',color:'#cccccc',
    levelReq:0,
    hpMult:1,atkMult:1,
    hitMul:1,dodgeMult:1,
    goldMult:1,xpMult:1,
    rarityBonus:0,   // no bonus
    legendaryChance:0.003,
  },
  hard:{
    label:'Hard',icon:'🔥',color:'#ff8800',
    levelReq:20,
    hpMult:3,atkMult:3,
    hitMul:3,dodgeMult:3,
    goldMult:3,xpMult:3,
    rarityBonus:2,   // shifts rarity up by 2 tiers
    legendaryChance:0.007,
  },
  hell:{
    label:'Hell',icon:'💀',color:'#ff2222',
    levelReq:50,
    hpMult:5,atkMult:5,    
    hitMul:5,dodgeMult:5,
    goldMult:5,xpMult:5,
    rarityBonus:3,   // shifts rarity up by 2 tiers
    legendaryChance:0.009,
  },
};
function setDifficulty(diff){
  const d=DIFFICULTY[diff];
  if(state.level<d.levelReq){
    notify(`⚠️ Need Level ${d.levelReq} for ${d.label} mode!`,'var(--red)');
    return;
  }
  state.difficulty=diff;
  // update button styles
  ['normal','hard','hell'].forEach(k=>{
    const btn=document.getElementById(`diff-btn-${k}`);
    if(!btn)return;
    btn.style.opacity= k===diff?'1':'0.4';
    btn.style.transform= k===diff?'scale(1.08)':'scale(1)';
  });
  notify(`${d.icon} ${d.label} Mode activated!`,d.color);
  addLog(`${d.icon} Difficulty set to ${d.label}!`,'gold');
}
function calcStats(){
  // Combine: base * (combat temp mult) + equip + class bonus + talent bonus
  const strMult   = state.strMult   + (state.classBonuses.strMult  ||0) + (state.talentBonuses.strMult  ||0);
  const agiMult   = state.agiMult   + (state.classBonuses.agiMult  ||0) + (state.talentBonuses.agiMult  ||0);
  const intMult   = state.intMult   + (state.classBonuses.intMult  ||0) + (state.talentBonuses.intMult  ||0);
  const staMult   = state.staMult   + (state.classBonuses.staMult  ||0) + (state.talentBonuses.staMult  ||0);
  const attackPowerMult   = state.attackPowerMult   + (state.classBonuses.attackPowerMult  ||0) + (state.talentBonuses.attackPowerMult  ||0);
  const armorMult = state.armorMult + (state.classBonuses.armorMult||0) + (state.talentBonuses.armorMult||0);
  const critMult  = state.critMult  + (state.classBonuses.critMult ||0) + (state.talentBonuses.critMult ||0);
  const dodgeMult = state.dodgeMult + (state.classBonuses.dodgeMult||0) + (state.talentBonuses.dodgeMult||0);
  const hitMult   = state.hitMult   + (state.classBonuses.hitMult  ||0) + (state.talentBonuses.hitMult  ||0);
  const mpMult    = state.mpMult    + (state.classBonuses.mpMult   ||0) + (state.talentBonuses.mpMult   ||0);
  const hpRegenMult = state.hpRegenMult + (state.classBonuses.hpRegenMult||0) + (state.talentBonuses.hpRegenMult||0);
  const mpRegenMult = state.mpRegenMult + (state.classBonuses.mpRegenMult||0) + (state.talentBonuses.mpRegenMult||0);

  // Primary stats
  state.str = Math.floor(state.baseStr * strMult) + (state.equipStr||0) + (state.talentBonuses.baseStr||0);
  state.agi = Math.floor(state.baseAgi * agiMult) + (state.equipAgi||0) + (state.talentBonuses.baseAgi||0);
  state.int = Math.floor(state.baseInt * intMult) + (state.equipInt||0) + (state.talentBonuses.baseInt||0);
  state.sta = Math.floor(state.baseSta * staMult) + (state.equipSta||0) + (state.talentBonuses.baseSta||0);

  // Attack Power
  state.attackPower = Math.floor((
    (state.str * 2 + state.int * 2) * attackPowerMult) + (state.equipAttackPower||0) + (state.talentBonuses.baseAttackPower||0));

  // Max HP
  state.maxHp = Math.floor(
    50 + (state.str * 10) + (state.sta * 15) + (state.level * 20)
  ) + (state.equipMaxHp||0);

  // Armor
  state.armor = Math.floor(
    (state.agi * 3 + state.baseArmor + (state.talentBonuses.baseArmor||0)) * armorMult
  ) + (state.equipArmor||0);

  // Crit%
  state.crit = Math.floor((
    (state.agi * 0.0005 + state.baseCrit) * critMult
  ) + (state.equipCrit||0) + (state.talentBonuses.baseCrit||0));

  // Dodge
  state.dodge = Math.floor((
    (state.agi * 1.9 + state.baseDodge) * dodgeMult
  ) + (state.equipDodge||0) + (state.talentBonuses.baseDodge||0));

  // Hit
  state.hit = Math.floor((
    (state.agi * 5.3 + state.baseHit) * hitMult
  ) + (state.equipHit||0) + (state.talentBonuses.baseHit||0));

  // Max MP
  state.maxMp = Math.floor(
    (50 + state.int * 3) * mpMult
  ) + (state.equipMaxMp||0);

  // Mana Regen
  state.manaRegen = Math.floor(
    (0.5 + state.int * 1.5) * mpRegenMult
  ) + (state.equipMpRegen||0);

  // HP Regen
  state.hpRegen = Math.floor(
    (state.sta * 0.5 + state.baseHpRegen + (state.talentBonuses.baseHpRegen||0)) * hpRegenMult
  ) + (state.equipHpRegen||0);

  // Life Steal
  state.lifeSteal = (state.baseLifeSteal * state.lifeStealMult) + (state.equipLifeSteal||0);

  // Clamp
  state.hp = Math.min(state.hp, state.maxHp);
  state.mp = Math.min(state.mp, state.maxMp);
}

// ── CLASSES ──
const CLASSES={
  warrior:{name:'Warrior',icon:'⚔️',desc:'A mighty melee fighter. +10% STR bonus.',
    bonuses:{strMult:0.10,staMult:0.10},
    skills:['power_strike','battle_cry','last_stand'],
    trees:{
      dps:{name:'🗡️ DPS',talents:[
        {id:'berserker',name:'Berserker Rage',desc:'10% CRIT per rank',cost:5,ranks:10,
          effect:()=>{
            state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+1;
          }},
        {id:'cleave',name:'Brute Force',desc:'20% CRIT per rank',cost:10,ranks:5,
          effect:()=>{
            state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+2;
          }},
        {id:'execute',name:'Killing Blow',desc:'30% CRIT per rank',cost:20,ranks:3,
          effect:()=>{
            state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+3;
          }},
      ]},
      tank:{name:'🛡️ Tank',talents:[
        {id:'iron_skin',name:'Iron Skin',desc:'10% ARMOR per rank',cost:5,ranks:10,
          effect:()=>{
            state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.1;
          }},
        {id:'fortress',name:'Iron Fortress',desc:'20% ARMOR per rank',cost:10,ranks:5,
          effect:()=>{
            state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.2;
          }},
        {id:'shield_wall',name:'Hardened Skin',desc:'30% ARMOR per rank',cost:20,ranks:3,
          effect:()=>{
            state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.3;
          }},
      ]},
      heal:{name:'💚 Self Heal',talents:[
        {id:'second_wind',name:'Tough Body',desc:'10% HP regen per rank',cost:5,ranks:10,
          effect:()=>{
            state.talentBonuses.hpRegenMult=(state.talentBonuses.hpRegenMult||0)+0.1;
          }},
        {id:'undying',name:'Endurance',desc:'20% HP regen per rank',cost:10,ranks:5,
          effect:()=>{
            state.talentBonuses.hpRegenMult=(state.talentBonuses.hpRegenMult||0)+0.2;
          }},
        {id:'regeneration',name:'Vitality',desc:'30% HP regen per rank',cost:20,ranks:3,
          effect:()=>{
            state.talentBonuses.hpRegenMult=(state.talentBonuses.hpRegenMult||0)+0.3;
          }},
      ]}
    }
  },
  mage:{name:'Mage',icon:'🔮',desc:'A powerful spellcaster. +10% INT bonus.',
    bonuses:{intMult:0.10,mpMult:0.05},
    skills:['fireball','ice_lance','mana_shield'],
    trees:{
      fire:{name:'🔥 Fire',talents:[
        {id:'fire_mastery',name:'Fire Mastery',desc:'1% CRIT per rank',cost:5,ranks:5,
          effect:()=>{
            state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+1;
          }},
        {id:'ignite',name:'Burning Mind',desc:'2% CRIT per rank',cost:10,ranks:5,
          effect:()=>{
            state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+2;
          }},
        {id:'meteor',name:'Arcane Intellect',desc:'3% CRIT per rank',cost:20,ranks:3,
          effect:()=>{
            state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+3;
          }},
      ]},
      ice:{name:'❄️ Ice',talents:[
        {id:'frost',name:'Frost Barrier',desc:'1% AR per rank',cost:5,ranks:10,
          effect:()=>{
            state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.1;
          }},
        {id:'ice_armor',name:'Ice Armor',desc:'2% DODGE per rank',cost:10,ranks:5,
          effect:()=>{
            state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.2;
          }},
        {id:'blizzard',name:'Ice Mind',desc:'3% DODGE per rank',cost:20,ranks:3,
          effect:()=>{
            state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.3;
          }},
      ]},
      arcane:{name:'✨ Arcane',talents:[
        {id:'mana_regen',name:'Mana Pool',desc:'1% HP REGEN per rank',cost:5,ranks:10,
          effect:()=>{
            state.talentBonuses.mpRegenMult=(state.talentBonuses.mpRegenMult||0)+0.1;
          }},
        {id:'spell_power',name:'Spellcraft',desc:'2% HP REGEN per rank',cost:10,ranks:5,
          effect:()=>{
            state.talentBonuses.mpRegenMult=(state.talentBonuses.mpRegenMult||0)+0.2;
          }},
        {id:'arcane_surge',name:'Arcane Mastery',desc:'3% HP REGEN per rank',cost:20,ranks:3,
          effect:()=>{
            state.talentBonuses.mpRegenMult=(state.talentBonuses.mpRegenMult||0)+0.3;
          }},
      ]}
    }
  },
  rogue:{name:'Rogue',icon:'🗡️',desc:'A cunning assassin. +20% AGI',
    bonuses:{agiMult:0.2,goldMult:1.0},
    skills:['backstab','poison_blade','shadow_step'],
    trees:{
      assassination:{name:'☠️ Assassin',talents:[
        {id:'crit',name:'Precision',desc:'1% CRIT per rank',cost:5,ranks:10,
          effect:()=>{
            state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+1;
          }},
        {id:'ambush',name:'Swift Strike',desc:'2% CRIT per rank',cost:10,ranks:5,
          effect:()=>{
            state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+2;
          }},
        {id:'death_mark',name:'Lethal Focus',desc:'3% CRIT per rank',cost:20,ranks:3,
          effect:()=>{
            state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+2;
          }},
      ]},
      subtlety:{name:'🌑 Subtlety',talents:[
        {id:'evasion',name:'Agility',desc:'1% DODGE per rank',cost:5,ranks:10,
          effect:()=>{
            state.talentBonuses.dodgeMult=(state.talentBonuses.dodgeMult||0)+0.1;
          }},
        {id:'smoke_bomb',name:'Nimble Feet',desc:'2% DODGE per rank',cost:10,ranks:5,
          effect:()=>{
            state.talentBonuses.dodgeMult = (state.talentBonuses.dodgeMult || 0) + 0.2;
          }},
        {id:'vanish',name:'Shadow Reflex',desc:'3% DODGE per rank',cost:20,ranks:3,
          effect:()=>{
            state.talentBonuses.dodgeMult = (state.talentBonuses.dodgeMult || 0) + 0.3;
          }},
      ]},
      poison:{name:'🐍 Poison',talents:[
        {id:'venom',name:'Toxic Edge',desc:'1% HP REGEN per rank',cost:5,ranks:10,
          effect:()=>{
            state.talentBonuses.mpRegenMult=(state.talentBonuses.mpRegenMult||0)+0.1;
          }},
        {id:'cripple',name:'Predator',desc:'2% HP REGEN per rank',cost:10,ranks:5,
          effect:()=>{
            state.talentBonuses.mpRegenMult=(state.talentBonuses.mpRegenMult||0)+0.2;
          }},
        {id:'plague',name:'Virulence',desc:'3% HP REGEN per rank',cost:20,ranks:3,
          effect:()=>{
            state.talentBonuses.hpRegenMult=(state.talentBonuses.hpRegenMult||0)+0.3;
          }},
      ]}
    }
  }
};

// ── SKILLS ──
const SKILLS={
  // ⚔️ WARRIOR SKILLS — scale with STR / attackPower
  power_strike:{name:'Power Strike',icon:'💥',mp:()=>Math.floor(state.maxMp*0.10),cd:1,use:(e)=>{
    const d=Math.floor(state.attackPower*2.2);
    e.hp-=d;addCombatLog(`💥 Power Strike! ${d} dmg!`,'good');playSound('snd-attack');animateAttack(true,d,false);return d;}},
  
  battle_cry:{name:'Battle Cry',icon:'📯',mp:()=>Math.floor(state.maxMp*0.15),cd:5,use:(e)=>{
  // Only apply if not already active
  if(state.battleCryActive){
    addCombatLog(`📯 Battle Cry already active!`,'info');
    return 0;
  }
  state.battleCryActive = true;
  state.strMult *= 2.5;
  state.armorMult *= 2.4;
  state.critMult *= 2.5;
  state.hitMult *= 1.5;
  addCombatLog(`📯 Battle Cry! +50% STR, +40% ARMOR for this fight!`,'good');
  playSound('snd-magic');
  calcStats();
  return 0;
}},

last_stand:{name:'Last Stand',icon:'🛡️',mp:()=>Math.floor(state.maxMp*0.20),cd:1,use:(e)=>{
  const healAmt=Math.floor(state.maxHp*0.35);
  state.hp=Math.min(state.maxHp,state.hp+healAmt);
  // ✅ Use multiplier instead of equipment bonus
  addCombatLog(`🛡️ Last Stand! +${healAmt} HP, +50% ARMOR!`,'good');
  playSound('snd-heal');
  spawnDmgFloat(`+${healAmt}HP`,false,'heal-float');
  calcStats();
  return 0;
}},
  // 🔥 MAGE SKILLS — scale with INT
  fireball:{name:'Fireball',icon:'🔥',mp:()=>Math.floor(state.maxMp*0.12),cd:1,use:(e)=>{
    const d=Math.floor(state.int*6+Math.random()*state.int*2);
    e.hp-=d;addCombatLog(`🔥 Fireball! ${d} dmg!`,'good');playSound('snd-magic');animateAttack(true,d,false);return d;}},
  
  ice_lance:{name:'Ice Lance',icon:'❄️',mp:()=>Math.floor(state.maxMp*0.10),cd:2,use:(e)=>{
    const d=Math.floor(state.int*4.5);
    e.hp-=d;e.frozen=true;
    addCombatLog(`❄️ Ice Lance! ${d} dmg — Enemy Frozen!`,'info');
    playSound('snd-magic');animateAttack(true,d,false);return d;}},
  
  mana_shield:{name:'Mana Shield',icon:'🔮',mp:()=>Math.floor(state.maxMp*0.25),cd:4,use:(e)=>{
    state.manaShield=true;
    const shieldStr=Math.floor(state.int*2);
    addCombatLog(`🔮 Mana Shield active! (absorbs ~${shieldStr} dmg)`,'info');
    playSound('snd-heal');return 0;}},
  
  // 🗡️ ROGUE SKILLS — scale with AGI / attackPower
  backstab:{name:'Backstab',icon:'🗡️',mp:()=>Math.floor(state.maxMp*0.08),cd:1,use:(e)=>{
    const d=Math.floor(state.attackPower*1.5 + state.agi*3);
    e.hp-=d;addCombatLog(`🗡️ Backstab! ${d} dmg!`,'good');playSound('snd-attack');animateAttack(true,d,false);return d;}},
  
  poison_blade:{name:'Poison Blade',icon:'🐍',mp:()=>Math.floor(state.maxMp*0.12),cd:2,use:(e)=>{
    const stacks=5;
    const tickDmg=Math.floor(state.agi*1.8 + state.attackPower*1.3);
    e.poisoned=(e.poisoned||0)+stacks;
    e.poisonDmg=tickDmg;
    addCombatLog(`🐍 Poisoned! ${tickDmg} dmg/tick for ${stacks} turns!`,'good');
    playSound('snd-magic');return 0;}},
  
  shadow_step:{name:'Shadow Step',icon:'🌑',mp:()=>Math.floor(state.maxMp*0.15),cd:3,use:(e)=>{
    const d=Math.floor(state.attackPower*2.0 + state.agi*4);
    e.hp-=d;addCombatLog(`🌑 Shadow Step! ${d} dmg!`,'purple');
    playSound('snd-magic');animateAttack(true,d,false);return d;}},
};
// Key changes: Power Strike — now uses attackPower instead of raw str
// Key changes:Fireball — scales with int properly
// Key changes:Ice Lance — stronger scaling with int
// Key changes:Backstab — uses attackPower for proper scaling
// Key changes:Shadow Step — uses attackPower, highest multiplier for rogue
// Key changes:Poison Blade — 5 turns instead of 3
// Now all skills stay useful at high levels! 💪

function spawnAbilityFloat(text, color='#ffffff'){
  const div = document.createElement('div');
  div.style.cssText = `
    position:fixed;
    top:35%;
    left:50%;
    transform:translate(-50%,-50%);
    font-family:'Cinzel',serif;
    font-size:1.6em;
    font-weight:700;
    color:${color};
    text-shadow:0 0 20px ${color};
    pointer-events:none;
    z-index:9999;
    animation:critFlash 1s ease forwards;
    white-space:nowrap;
  `;
  div.textContent = text;
  document.body.appendChild(div);
  setTimeout(()=>div.remove(), 1000);
}

// ── SWITCH MAIN SCENE ──
function switchMainScene(scene){
  // Hide all scenes
  document.querySelectorAll('.main-scene').forEach(s => s.style.display = 'none');
  // Show selected scene
  document.getElementById(`main-scene-${scene}`).style.display = 'block';
  // Update nav buttons
  ['char','adv','town'].forEach(s => {
    document.getElementById(`nav-${s}`).classList.remove('active');
  });
  document.getElementById(`nav-${scene}`).classList.add('active');
  // Special actions per scene
  if(scene === 'adv') loadScene(state.currentScene || 'town');
  if(scene === 'town') renderShop();
}
 
// ── NORMAL ENEMIES ──
const NORMAL_ENEMIES= [];
// ── BASE MONSTER TEMPLATES (no scaling — pure base stats) ──
const MONSTER_TEMPLATES = {
  // 🐺 WOLF MOUNTAIN (Stage 1)
  young_wolf:      {id:'young_wolf',     name:'🐺 Young Wolf',      icon:'wolf',    hp:1000, atk:80,  armor:5,  hit:8,  dodge:5,  xp:80,  gold:[30,60]},
  forest_wolf:     {id:'forest_wolf',    name:'🐺 Forest Wolf',     icon:'wolf',    hp:1500, atk:100, armor:8,  hit:10, dodge:8,  xp:120, gold:[50,100]},
  shadow_wolf:     {id:'shadow_wolf',    name:'🐺 Shadow Wolf',     icon:'wolf',    hp:2000, atk:130, armor:12, hit:14, dodge:12, xp:160, gold:[80,140]},
  dire_wolf:       {id:'dire_wolf',      name:'🐺 Dire Wolf',       icon:'wolf',    hp:2600, atk:160, armor:15, hit:18, dodge:15, xp:200, gold:[100,180]},

  // 🕷️ SPIDER CAVERN (Stage 2)
  cave_spider:     {id:'cave_spider',    name:'🕷️ Cave Spider',     icon:'spider',  hp:3000, atk:180, armor:20, hit:20, dodge:20, xp:240, gold:[120,200]},
  venom_spider:    {id:'venom_spider',   name:'🕷️ Venom Spider',    icon:'spider',  hp:4000, atk:220, armor:25, hit:25, dodge:25, xp:300, gold:[160,260]},
  giant_spider:    {id:'giant_spider',   name:'🕷️ Giant Spider',    icon:'spider',  hp:5200, atk:270, armor:32, hit:30, dodge:30, xp:370, gold:[200,320]},
  queen_spider:    {id:'queen_spider',   name:'🕷️ Queen Spider',    icon:'spider',  hp:6800, atk:320, armor:40, hit:36, dodge:36, xp:450, gold:[250,400]},

  // 👹 GOBLIN FORTRESS (Stage 3)
  goblin_scout:    {id:'goblin_scout',   name:'👹 Goblin Scout',    icon:'goblin',  hp:8000, atk:380, armor:50, hit:44, dodge:44, xp:540, gold:[300,480]},
  goblin_warrior:  {id:'goblin_warrior', name:'👹 Goblin Warrior',  icon:'goblin',  hp:10000,atk:450, armor:60, hit:52, dodge:52, xp:650, gold:[380,580]},
  goblin_shaman:   {id:'goblin_shaman',  name:'👹 Goblin Shaman',   icon:'goblin',  hp:13000,atk:520, armor:72, hit:62, dodge:62, xp:780, gold:[460,700]},
  goblin_elite:    {id:'goblin_elite',   name:'👹 Goblin Elite',    icon:'goblin',  hp:16500,atk:600, armor:86, hit:74, dodge:74, xp:940, gold:[560,840]},

  // 💀 SKELETON CRYPT (Stage 4)
  skeleton_archer: {id:'skeleton_archer',name:'💀 Skeleton Archer', icon:'skeleton',hp:20000,atk:700, armor:100,hit:88, dodge:88, xp:1100,gold:[660,1000]},
  skeleton_warrior:{id:'skeleton_warrior',name:'💀 Skeleton Warrior',icon:'skeleton',hp:25000,atk:820, armor:120,hit:104,dodge:104,xp:1320,gold:[800,1200]},
  skeleton_mage:   {id:'skeleton_mage',  name:'💀 Skeleton Mage',   icon:'skeleton',hp:31000,atk:960, armor:144,hit:122,dodge:122,xp:1580,gold:[960,1440]},
  skeleton_knight: {id:'skeleton_knight',name:'💀 Skeleton Knight', icon:'skeleton',hp:39000,atk:1120,armor:170,hit:144,dodge:144,xp:1900,gold:[1160,1740]},

  // 👊 ORC STRONGHOLD (Stage 5)
  orc_grunt:       {id:'orc_grunt',      name:'👊 Orc Grunt',       icon:'orc',     hp:48000,atk:1300,armor:200,hit:170,dodge:170,xp:2280,gold:[1400,2100]},
  orc_warrior:     {id:'orc_warrior',    name:'👊 Orc Warrior',     icon:'orc',     hp:6000,atk:1520,armor:236,hit:200,dodge:200,xp:2740,gold:[1680,2520]},
  orc_shaman:      {id:'orc_shaman',     name:'👊 Orc Shaman',      icon:'orc',     hp:74000,atk:1780,armor:278,hit:234,dodge:234,xp:3280,gold:[2020,3020]},
  orc_berserker:   {id:'orc_berserker',  name:'👊 Orc Berserker',   icon:'orc',     hp:92000,atk:2080,armor:326,hit:274,dodge:274,xp:3940,gold:[2420,3640]},

  // 🧛 VAMPIRE CASTLE (Stage 6)
  vampire_thrall:  {id:'vampire_thrall', name:'🧛 Vampire Thrall',  icon:'vampire', hp:114000,atk:2440,armor:382,hit:322,dodge:322,xp:4720,gold:[2900,4360]},
  vampire_hunter:  {id:'vampire_hunter', name:'🧛 Vampire Hunter',  icon:'vampire', hp:140000,atk:2860,armor:448,hit:378,dodge:378,xp:5680,gold:[3500,5240]},
  vampire_noble:   {id:'vampire_noble',  name:'🧛 Vampire Noble',   icon:'vampire', hp:172000,atk:3340,armor:524,hit:442,dodge:442,xp:6820,gold:[4200,6300]},
  vampire_elder:   {id:'vampire_elder',  name:'🧛 Vampire Elder',   icon:'vampire', hp:212000,atk:3900,armor:614,hit:518,dodge:518,xp:8180,gold:[5040,7560]},

  // 👾 TROLL CAVES (Stage 7)
  cave_troll:      {id:'cave_troll',     name:'👾 Cave Troll',      icon:'troll',   hp:260000,atk:4560,armor:718,hit:606,dodge:606,xp:9820,gold:[6050,9080]},
  rock_troll:      {id:'rock_troll',     name:'👾 Rock Troll',      icon:'troll',   hp:320000,atk:5320,armor:840,hit:708,dodge:708,xp:11780,gold:[7260,10900]},
  frost_troll:     {id:'frost_troll',    name:'👾 Frost Troll',     icon:'troll',   hp:394000,atk:6220,armor:982,hit:828,dodge:828,xp:14140,gold:[8720,13080]},
  war_troll:       {id:'war_troll',      name:'👾 War Troll',       icon:'troll',   hp:486000,atk:7280,armor:1148,hit:968,dodge:968,xp:16960,gold:[10460,15700]},

  // 😈 DEMON CITADEL (Stage 8)
  demon_scout:     {id:'demon_scout',    name:'😈 Demon Scout',     icon:'demon',   hp:598000,atk:8500,armor:1342,hit:1132,dodge:1132,xp:20360,gold:[12560,18840]},
  demon_warrior:   {id:'demon_warrior',  name:'😈 Demon Warrior',   icon:'demon',   hp:736000,atk:9940,armor:1568,hit:1322,dodge:1322,xp:24440,gold:[15080,22620]},
  demon_mage:      {id:'demon_mage',     name:'😈 Demon Mage',      icon:'demon',   hp:906000,atk:11620,armor:1832,hit:1546,dodge:1546,xp:29320,gold:[18100,27140]},
  demon_knight:    {id:'demon_knight',   name:'😈 Demon Knight',    icon:'demon',   hp:1116000,atk:13580,armor:2140,hit:1806,dodge:1806,xp:35180,gold:[21720,32580]},

  // 🌑 SHADOW REALM (Stage 9)
  shadow_wraith:   {id:'shadow_wraith',  name:'🌑 Shadow Wraith',   icon:'werewolf',hp:1374000,atk:15880,armor:2500,hit:2112,dodge:2112,xp:42220,gold:[26060,39100]},
  shadow_knight:   {id:'shadow_knight',  name:'🌑 Shadow Knight',   icon:'werewolf',hp:1692000,atk:18560,armor:2922,hit:2468,dodge:2468,xp:50660,gold:[31280,46920]},
  shadow_mage:     {id:'shadow_mage',    name:'🌑 Shadow Mage',     icon:'werewolf',hp:2084000,atk:21700,armor:3416,  hit:2886,dodge:2886,xp:60800,gold:[37540,56300]},
  shadow_lord:     {id:'shadow_lord',    name:'🌑 Shadow Lord',     icon:'werewolf',hp:2568000,atk:25380,armor:3994,hit:3372,dodge:3372,xp:72960,gold:[45050,67580]},

  // 🌟 ETERNAL KINGDOM (Stage 10)
  eternal_guard:   {id:'eternal_guard',  name:'🌟 Eternal Guard',   icon:'phoenix', hp:3164000,atk:29680,armor:4668,hit:3942,dodge:3942,xp:87560,gold:[54060,81100]},
  eternal_warrior: {id:'eternal_warrior',name:'🌟 Eternal Warrior', icon:'phoenix', hp:3898000,atk:34700,armor:5460,hit:4608,dodge:4608,xp:105080,gold:[64880,97320]},
  eternal_mage:    {id:'eternal_mage',   name:'🌟 Eternal Mage',    icon:'phoenix', hp:4802000,atk:40580,armor:6386,hit:5388,dodge:5388,xp:126100,gold:[77860,116800]},
  eternal_champion:{id:'eternal_champion',name:'🌟 Eternal Champion',icon:'phoenix',hp:5916000,atk:47460,armor:7468,hit:6300,dodge:6300,xp:151300,gold:[93440,140160]},
};

// ── STAGE DEFINITIONS ──
const STAGES = [
  {
    id: 1, name: '🐺 Wolf Mountain', levelReq: 1,
    monsters: ['young_wolf','forest_wolf','shadow_wolf','dire_wolf'],
    bossId: 'stage_boss_1'
  },
  {
    id: 2, name: '🕷️ Spider Cavern', levelReq: 10,
    monsters: ['cave_spider','venom_spider','giant_spider','queen_spider'],
    bossId: 'stage_boss_2'
  },
  {
    id: 3, name: '👹 Goblin Fortress', levelReq: 20,
    monsters: ['goblin_scout','goblin_warrior','goblin_shaman','goblin_elite'],
    bossId: 'stage_boss_3'
  },
  {
    id: 4, name: '💀 Skeleton Crypt', levelReq: 30,
    monsters: ['skeleton_archer','skeleton_warrior','skeleton_mage','skeleton_knight'],
    bossId: 'stage_boss_4'
  },
  {
    id: 5, name: '👊 Orc Stronghold', levelReq: 40,
    monsters: ['orc_grunt','orc_warrior','orc_shaman','orc_berserker'],
    bossId: 'stage_boss_5'
  },
  {
    id: 6, name: '🧛 Vampire Castle', levelReq: 50,
    monsters: ['vampire_thrall','vampire_hunter','vampire_noble','vampire_elder'],
    bossId: 'stage_boss_6'
  },
  {
    id: 7, name: '👾 Troll Caves', levelReq: 60,
    monsters: ['cave_troll','rock_troll','frost_troll','war_troll'],
    bossId: 'stage_boss_7'
  },
  {
    id: 8, name: '😈 Demon Citadel', levelReq: 70,
    monsters: ['demon_scout','demon_warrior','demon_mage','demon_knight'],
    bossId: 'stage_boss_8'
  },
  {
    id: 9, name: '🌑 Shadow Realm', levelReq: 80,
    monsters: ['shadow_wraith','shadow_knight','shadow_mage','shadow_lord'],
    bossId: 'stage_boss_9'
  },
  {
    id: 10, name: '🌟 Eternal Kingdom', levelReq: 90,
    monsters: ['eternal_guard','eternal_warrior','eternal_mage','eternal_champion'],
    bossId: 'stage_boss_10'
  },
];

// ── STAGE BOSSES WITH UNIQUE ABILITIES ──
const STAGE_BOSSES = {
  stage_boss_1: {
    id:'stage_boss_1', name:'🐺 Wolf King', icon:'🐺',
    hp:5000, atk:400, armor:80, hit:60, dodge:60, xp:2000, gold:[500,1000],
    ability:{
      name:'PACK HOWL!', color:'#ffdd00', triggerEvery:3,
      desc:'Summons wolf pack — deals bonus damage!',
      effect:(e)=>{
        const bonusDmg = Math.floor(e.atk * 0.5);
        state.hp = Math.max(1, state.hp - bonusDmg);
        spawnAbilityFloat('🐺 PACK HOWL!','#ffdd00');
        addCombatLog(`🐺 Wolf King howls! Pack attacks for ${bonusDmg}!`,'bad');
        animateAttack(false, bonusDmg, false);
      }
    },
    cs:{title:'Wolf King',req:'Required: Stage 1 Clear',text:'The mighty Wolf King rises from the pack! His howl shakes the mountain. Wolves gather at his call!'},
  },
  stage_boss_2: {
    id:'stage_boss_2', name:'🕷️ Spider Queen', icon:'🕷️',
    hp:15000, atk:900, armor:200, hit:150, dodge:150, xp:5000, gold:[1200,2400],
    ability:{
      name:'WEB TRAP!', color:'#44ff44', triggerEvery:3,
      desc:'Reduces your dodge to 0 for 2 turns!',
      effect:(e)=>{
        state.webTrapped = 2;
        spawnAbilityFloat('🕸️ WEB TRAP!','#44ff44');
        addCombatLog(`🕸️ Spider Queen webs you! Dodge reduced to 0 for 2 turns!`,'bad');
      }
    },
    cs:{title:'Spider Queen',req:'Required: Stage 2 Clear',text:'From the depths of her web kingdom, the Spider Queen descends! Her silk traps even the mightiest warriors!'},
  },
  stage_boss_3: {
    id:'stage_boss_3', name:'👹 Goblin Warlord', icon:'👹',
    hp:35000, atk:1800, armor:500, hit:350, dodge:350, xp:10000, gold:[2500,5000],
    ability:{
      name:'GOLD STEAL!', color:'#f0c040', triggerEvery:3,
      desc:'Steals 10% of your gold!',
      effect:(e)=>{
        const stolen = Math.floor(state.gold * 0.10);
        state.gold = Math.max(0, state.gold - stolen);
        spawnAbilityFloat('💰 GOLD STEAL!','#f0c040');
        addCombatLog(`💰 Goblin Warlord steals ${stolen} gold!`,'bad');
      }
    },
    cs:{title:'Goblin Warlord',req:'Required: Stage 3 Clear',text:'The Goblin Warlord commands an army of thieves! He wants your gold and your head!'},
  },
  stage_boss_4: {
    id:'stage_boss_4', name:'💀 Skeleton Lord', icon:'💀',
    hp:80000, atk:3500, armor:1100, hit:800, dodge:800, xp:20000, gold:[5000,10000],
    ability:{
      name:'DEATH CURSE!', color:'#aa44ff', triggerEvery:3,
      desc:'Reduces your max HP by 5% permanently this fight!',
      effect:(e)=>{
  const reduction = Math.floor(state.maxHp * 0.05);
  state.activeDebuffs.maxHpReduction += reduction;
  state.equipMaxHp = (state.equipMaxHp||0) - reduction;
  spawnAbilityFloat('💀 DEATH CURSE!','#aa44ff');
  addCombatLog(`💀 Death Curse! Max HP reduced by ${reduction}!`,'bad');
  calcStats();
}
    },
    cs:{title:'Skeleton Lord',req:'Required: Stage 4 Clear',text:'The Skeleton Lord rises from his eternal tomb! His death magic weakens even the strongest heroes!'},
  },
  stage_boss_5: {
    id:'stage_boss_5', name:'👊 Orc Chieftain', icon:'👊',
    hp:180000, atk:7000, armor:2400, hit:1800, dodge:1800, xp:40000, gold:[10000,20000],
    ability:{
      name:'BERSERKER RAGE!', color:'#ff8800', triggerEvery:5,
      desc:'Doubles ATK for 3 turns!',
      effect:(e)=>{
        currentEnemy.atk = Math.floor(currentEnemy.atk * 2);
        currentEnemy.rageTimer = 3;
        spawnAbilityFloat('👊 BERSERKER RAGE!','#ff8800');
        addCombatLog(`👊 Orc Chieftain goes berserk! ATK doubled for 3 turns!`,'bad');
      }
    },
    cs:{title:'Orc Chieftain',req:'Required: Stage 5 Clear',text:'The Orc Chieftain is the strongest warrior alive! When he rages, no armor can protect you!'},
  },
  stage_boss_6: {
    id:'stage_boss_6', name:'🧛 Vampire Lord', icon:'🧛',
    hp:400000, atk:14000, armor:5000, hit:4000, dodge:4000, xp:80000, gold:[20000,40000],
    ability:{
      name:'LIFE DRAIN!', color:'#ff2244', triggerEvery:3,
      desc:'Heals 20% of damage dealt!',
      effect:(e)=>{
        const healAmt = Math.floor(currentEnemy.atk * 0.2);
        currentEnemy.hp = Math.min(currentEnemy.maxHp, currentEnemy.hp + healAmt);
        spawnAbilityFloat('🧛 LIFE DRAIN!','#ff2244');
        addCombatLog(`🧛 Vampire Lord drains life! Heals ${healAmt} HP!`,'bad');
        updateEnemyBar();
      }
    },
    cs:{title:'Vampire Lord',req:'Required: Stage 6 Clear',text:'The Vampire Lord rules the night! His life drain makes him nearly unkillable. Strike fast!'},
  },
  stage_boss_7: {
    id:'stage_boss_7', name:'👾 Troll King', icon:'👾',
    hp:900000, atk:28000, armor:10000, hit:8000, dodge:8000, xp:160000, gold:[40000,80000],
    ability:{
      name:'REGENERATION!', color:'#00ff88', triggerEvery:2,
      desc:'Heals 3% max HP every 2 turns!',
      effect:(e)=>{
        const healAmt = Math.floor(currentEnemy.maxHp * 0.03);
        currentEnemy.hp = Math.min(currentEnemy.maxHp, currentEnemy.hp + healAmt);
        spawnAbilityFloat('👾 REGENERATION!','#00ff88');
        addCombatLog(`👾 Troll King regenerates ${healAmt} HP!`,'bad');
        updateEnemyBar();
      }
    },
    cs:{title:'Troll King',req:'Required: Stage 7 Clear',text:'The Troll King cannot be killed! His regeneration is legendary. You must deal massive damage fast!'},
  },
  stage_boss_8: {
    id:'stage_boss_8', name:'😈 Demon Prince', icon:'😈',
    hp:2000000, atk:55000, armor:20000, hit:16000, dodge:16000, xp:320000, gold:[80000,160000],
    ability:{
      name:'HELLFIRE!', color:'#ff4400', triggerEvery:3,
      desc:'Ignores your armor completely!',
      effect:(e)=>{
        const trueDmg = Math.floor(currentEnemy.atk * 0.8);
        state.hp = Math.max(1, state.hp - trueDmg);
        spawnAbilityFloat('😈 HELLFIRE!','#ff4400');
        addCombatLog(`😈 Hellfire! ${trueDmg} true damage — armor ignored!`,'bad');
        animateAttack(false, trueDmg, false);
      }
    },
    cs:{title:'Demon Prince',req:'Required: Stage 8 Clear',text:'The Demon Prince wields hellfire that melts through any armor! Your defense means nothing here!'},
  },
  stage_boss_9: {
    id:'stage_boss_9', name:'🌑 Shadow Emperor', icon:'🌑',
    hp:5000000, atk:110000, armor:40000, hit:32000, dodge:32000, xp:640000, gold:[160000,320000],
    ability:{
      name:'PHASE SHIFT!', color:'#4488ff', triggerEvery:3,
      desc:'Becomes untargetable — your next attack misses!',
      effect:(e)=>{
        currentEnemy.phaseShifted = true;
        spawnAbilityFloat('🌑 PHASE SHIFT!','#4488ff');
        addCombatLog(`🌑 Shadow Emperor phases out! Next attack will miss!`,'bad');
      }
    },
    cs:{title:'Shadow Emperor',req:'Required: Stage 9 Clear',text:'The Shadow Emperor exists between dimensions! He phases in and out of reality. Time your attacks carefully!'},
  },
  stage_boss_10: {
    id:'stage_boss_10', name:'🌟 Eternal King', icon:'🌟',
    hp:12000000, atk:220000, armor:80000, hit:64000, dodge:64000, xp:1500000, gold:[400000,800000],
    ability:{
      name:'ALL POWERS!', color:'#ffffff', triggerEvery:2,
      desc:'Uses all abilities randomly!',
      effect:(e)=>{
        const abilities = ['pack_howl','web_trap','gold_steal','death_curse','berserker','life_drain','regen','hellfire','phase_shift'];
        const chosen = abilities[Math.floor(Math.random()*abilities.length)];
        spawnAbilityFloat('🌟 ETERNAL POWER!','#ffffff');
        // Random ability effect
        const trueDmg = Math.floor(currentEnemy.atk * 0.6);
        state.hp = Math.max(1, state.hp - trueDmg);
        addCombatLog(`🌟 Eternal King unleashes ancient power! ${trueDmg} damage!`,'bad');
        animateAttack(false, trueDmg, false);
      }
    },
    cs:{title:'Eternal King',req:'Required: Stage 10 — FINAL BOSS',text:'The Eternal King combines ALL the powers of every boss you have defeated! This is the ultimate challenge. Are you ready?'},
  },
};

// ── SCALE MONSTER TO STAGE ──
function scaleMonster(templateId, stageLevel) {
  const tmpl = MONSTER_TEMPLATES[templateId];
  if (!tmpl) return null;
  const diff = DIFFICULTY[state.difficulty || 'normal'];
  const stageScale = 1 + (stageLevel - 1) * 0.5;
  const s = stageScale * diff.hpMult;
  const a = stageScale * diff.atkMult;
  return {
    ...tmpl,
    hp:    Math.floor(tmpl.hp    * s),
    maxHp: Math.floor(tmpl.hp    * s),
    atk:   Math.floor(tmpl.atk   * a),
    armor: Math.floor(tmpl.armor * stageScale),
    hit:   Math.floor(tmpl.hit   * stageScale),
    dodge: Math.floor(tmpl.dodge * stageScale),
    xp:    Math.floor(tmpl.xp    * diff.xpMult),
    gold:  [
      Math.floor(tmpl.gold[0] * diff.goldMult),
      Math.floor(tmpl.gold[1] * diff.goldMult)
    ],
    poisoned: 0, frozen: false, boss: false,
    _xpMult: 1, _goldMult: 1,
  };
}

// ── ENTER DUNGEON ──
function enterDungeon(stageId) {
  const stage = STAGES.find(s => s.id === stageId);
  if (!stage) return;
  if (state.level < stage.levelReq) {
    notify(`⚠️ Need Level ${stage.levelReq} to enter ${stage.name}!`, 'var(--red)');
    return;
  }

  currentStage = stage;
  dungeonWave = 0;
  dungeonQueue = [];

  addLog(`⚔️ Entering ${stage.name}!`, 'gold');
  notify(`⚔️ ${stage.name} — Prepare for battle!`, 'var(--gold)');

  // Hide choices, show story
  document.getElementById('choices-box').style.display = 'none';
  document.getElementById('story-content').innerHTML = `
    <div class="scene-title">${stage.name}</div>
    <p style="color:#aaa;">Three waves of monsters await... then the boss!</p>
    <p style="color:var(--gold);margin-top:8px;">⚔️ Wave 1 incoming!</p>
  `;

  startNextWave();
}

// ── WAVE ANNOUNCEMENT ──
function showWaveAnnouncement(text, color) {
  const div = document.createElement('div');
  div.style.cssText = `
    position:fixed;
    top:45%;
    left:50%;
    transform:translate(-50%,-50%);
    font-family:'Cinzel',serif;
    font-size:2em;
    font-weight:700;
    color:${color};
    text-shadow:0 0 30px ${color};
    pointer-events:none;
    z-index:9999;
    animation:levelUpFlash 2s ease forwards;
    white-space:nowrap;
  `;
  div.textContent = text;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2000);
}

// ── SPAWN NEXT MONSTER IN QUEUE ──

function spawnNextDungeonMonster() {
  if (!currentStage || dungeonQueue.length === 0) return;

  const nextId = dungeonQueue.shift();

  if (nextId === 'BOSS') {
    triggerStageBoss(currentStage.bossId);
    return;
  }

  const monster = scaleMonster(nextId, currentStage.id);
  if (!monster) return;

  currentEnemy = monster;
  startCombatWith(currentEnemy);

  // Auto fight starts immediately!
  clearInterval(autoFightTimer);
  autoFightTimer = setInterval(() => {
    if (!currentEnemy) { clearInterval(autoFightTimer); return; }
    autoFightStep();
  }, 1000);
}
// ── START NEXT WAVE ──
function startNextWave() {
  if (!currentStage) return;
  dungeonWave++;

  if (dungeonWave === 1) {
    dungeonQueue = [currentStage.monsters[0]];
    showWaveAnnouncement('⚔️ WAVE 1', '#f0c040');
  } else if (dungeonWave === 2) {
    const count = Math.floor(Math.random() * 5) + 3;
    dungeonQueue = Array.from({length: count}, () =>
      currentStage.monsters[Math.floor(Math.random() * currentStage.monsters.length)]
    );
    showWaveAnnouncement(`⚔️ WAVE 2 — ${count} enemies!`, '#ff8800');
  } else if (dungeonWave === 3) {
    const count = Math.floor(Math.random() * 5) + 3;
    dungeonQueue = Array.from({length: count}, () =>
      currentStage.monsters[Math.floor(Math.random() * currentStage.monsters.length)]
    );
    showWaveAnnouncement(`⚔️ WAVE 3 — ${count} enemies!`, '#ff4444');
  } else if (dungeonWave === 4) {
    dungeonQueue = ['BOSS'];
    showWaveAnnouncement('💀 BOSS INCOMING!', '#ff0000');
  } else {
    dungeonComplete();
    return;
  }

  dungeonMonstersLeft = dungeonQueue.length;

  // Wait for announcement to finish before spawning (2.5s)
  setTimeout(() => spawnNextDungeonMonster(), 2500);
}

function triggerStageBoss(bossId) {
  const boss = STAGE_BOSSES[bossId];
  if (!boss) return;

  // Show boss cutscene
  pendingBossId = bossId;
  document.getElementById('boss-icon').textContent = boss.icon;
  document.getElementById('boss-cs-name').textContent = boss.cs.title;
  document.getElementById('boss-cs-req').textContent = boss.cs.req;
  document.getElementById('boss-cs-text').textContent = boss.cs.text;
  document.getElementById('boss-cutscene').style.display = 'block';
  playSound('snd-boss');
}
// ── START BOSS FIGHT ──
function startBossFight(){
  if(currentStage){
    startStageBossFight();
    return;
  }
  document.getElementById('boss-cutscene').style.display='none';
  if(!pendingBossId)return;
  const boss=BOSSES.find(b=>b.id===pendingBossId);if(!boss)return;

  const diff=DIFFICULTY[state.difficulty||'normal'];
  const scale=1+Math.max(0,(state.level-boss.levelReq))*0.05;

  // Add difficulty prefix to boss name
  const prefix=state.difficulty==='hell'?'💀 Hell ':state.difficulty==='hard'?'🔥 Hard ':'';

  currentEnemy={
    ...boss,
    name:prefix+boss.name,
    hp:Math.floor(boss.hp*scale*diff.hpMult),
    maxHp:Math.floor(boss.hp*scale*diff.hpMult),
    atk:Math.floor(boss.atk*scale*diff.atkMult),
    armor:boss.armor,
    poisoned:0,frozen:false,crippled:0,boss:true,
    _xpMult:diff.xpMult,
    _goldMult:diff.goldMult,
  };
  startCombatWith(currentEnemy);
}

// ── START STAGE BOSS FIGHT ──
function startStageBossFight() {
  document.getElementById('boss-cutscene').style.display = 'none';
  if (!pendingBossId) return;

  const boss = STAGE_BOSSES[pendingBossId];
  if (!boss) return;

  const diff = DIFFICULTY[state.difficulty || 'normal'];
  const stageLevel = currentStage ? currentStage.id : 1;
  const stageScale = 1 + (stageLevel - 1) * 0.5;

  const prefix = state.difficulty==='hell'?'💀 Hell ':state.difficulty==='hard'?'🔥 Hard ':'';

  currentEnemy = {
    ...boss,
    name: prefix + boss.name,
    hp: Math.floor(boss.hp * stageScale * diff.hpMult),
    maxHp: Math.floor(boss.hp * stageScale * diff.hpMult),
    atk: Math.floor(boss.atk * stageScale * diff.atkMult),
    armor: Math.floor(boss.armor * stageScale),
    hit: Math.floor(boss.hit * stageScale),
    dodge: Math.floor(boss.dodge * stageScale),
    xp: Math.floor(boss.xp * diff.xpMult),
    gold: [
      Math.floor(boss.gold[0] * diff.goldMult),
      Math.floor(boss.gold[1] * diff.goldMult)
    ],
    poisoned: 0, frozen: false, boss: true,
    abilityTurn: 0,
    _xpMult: 1, _goldMult: 1,
  };

  startCombatWith(currentEnemy);

  // Auto fight starts immediately for boss too!
  clearInterval(autoFightTimer);
  autoFightTimer = setInterval(() => {
    if (!currentEnemy) { clearInterval(autoFightTimer); return; }
    autoFightStep();
  }, 1000);
}

// ── DUNGEON COMPLETE ──
function dungeonComplete() {
  const stageId = currentStage.id;
  currentStage = null;
  dungeonWave = 0;
  dungeonQueue = [];

  addLog('🏆 Dungeon Complete!', 'legendary');
  notify('🏆 Dungeon Complete!', 'var(--gold)');

  // Drop treasure box
  dropTreasureBox(stageId);

  // Show completion screen
  document.getElementById('story-content').innerHTML = `
    <div class="scene-title">🏆 Dungeon Complete!</div>
    <p style="color:var(--gold);margin-bottom:8px;">All enemies defeated!</p>
    <p style="color:#aaa;">A treasure chest has been added to your inventory!</p>
    <p style="color:#aaa;margin-top:4px;">Open it from the Items tab to claim your rewards!</p>
  `;

  const box = document.getElementById('choices-box');
  box.innerHTML = '';
  box.style.display = 'flex';
  const btn = document.createElement('button');
  btn.className = 'choice-btn fade-in';
  btn.innerHTML = '🏘️ Return to Town';
  btn.onclick = () => loadScene('town');
  box.appendChild(btn);

  updateUI();
  renderInventory();
}

// ── ITEM HELPERS ──
const SLOT_ICONS={weapon:'⚔️',armor:'🛡️',helmet:'⛑️',boots:'👢',ring:'💍',amulet:'📿'};
const EQUIP_PREFIXES={legendary:['Divine','Mythic','Godforged','Ancient','Eternal','Celestial'],epic:['Heroic','Valiant','Exalted','Magnificent','Radiant'],rare:['Polished','Reinforced','Enchanted','Gleaming'],uncommon:['Sturdy','Sharpened','Improved','Sturdy'],normal:['Iron','Wooden','Basic','Simple']};
const EQUIP_NAMES={weapon:['Blade','Sword','Axe','Spear','Dagger','Staff','Bow'],armor:['Plate','Chainmail','Robe','Leather','Cuirass'],helmet:['Helm','Crown','Hood','Circlet','Visor'],boots:['Greaves','Sabatons','Boots','Treads'],ring:['Band','Seal','Loop','Signet'],amulet:['Pendant','Amulet','Talisman','Necklace']};
const EQUIP_STATS={weapon:{str:[15,35], lifeSteal:[0.07, 0.29]},armor:{armor:[25,55], sta:[15,35],maxHp:[200,300],hpRegen:[25,75]},helmet:{armor:[35,65],int:[15,35]},boots:{agi:[15,35]},ring:{str:[15,35],int:[15,35]},amulet:{int:[25,45],maxMp:[105,205]}};

function mkEquipDrop(slot, rarity){
  rarity = applyRarityBonus(rarity);
  const mult=RARITY[rarity].mult;
  const prefix=EQUIP_PREFIXES[rarity][Math.floor(Math.random()*EQUIP_PREFIXES[rarity].length)];
  const suffix=EQUIP_NAMES[slot][Math.floor(Math.random()*EQUIP_NAMES[slot].length)];
  const stats={};
  Object.entries(EQUIP_STATS[slot]).forEach(([k,[mn,mx]])=>{
    const raw=(Math.random()*(mx-mn)+mn)*mult;
    // If the stat range is decimals, keep 3 decimal places
    stats[k]=mx<1?Math.round(raw*1000)/1000:Math.round(raw);
  });
  return {uid:genUid(),name:`${SLOT_ICONS[slot]} ${prefix} ${suffix}`,category:'equipment',slot,rarity,stats,equipped:false,sellPrice:Math.round(50*mult*(state.level||1)*.10)};
}
function mkMat(name,rarity,sellPrice){return {uid:genUid(),name,category:'material',rarity,sellPrice,stackable:true,qty:1};}
function mkCons(name,rarity,sellPrice,hpVal){return {uid:genUid(),name,category:'consumable',rarity,sellPrice,stackable:true,qty:1,effect:'hp',val:hpVal};}
function genUid(){return Date.now()+Math.random();}
function applyRarityBonus(rarity){
  const order=['normal','uncommon','rare','epic','legendary'];
  const diff=DIFFICULTY[state.difficulty||'normal'];
  const bonus=diff.rarityBonus||0;
  const idx=order.indexOf(rarity);
  const newIdx=Math.min(order.length-1, idx+bonus);
  return order[newIdx];
}
// ── CRAFTING RECIPES ──
const CRAFTING=[
  {id:'craft_steel_sword',result:{name:'⚔️ Crafted Steel Sword',slot:'weapon',rarity:'rare',stats:{str:100},category:'equipment'},
   req:[{name:'🪓 Orc Fragment',qty:3},{name:'🪶 Wolf Fang',qty:2}],desc:'A powerful steel sword forged from orc metal'},
  {id:'craft_shadow_blade',result:{name:'🗡️ Shadow Blade',slot:'weapon',rarity:'epic',stats:{str:80,agi:60},category:'equipment'},
   req:[{name:'🌕 Moon Shard',qty:2},{name:'🪶 Wolf Fang',qty:3},{name:'🕸️ Spider Silk',qty:2}],desc:'A blade imbued with shadow energy'},
  {id:'craft_dragon_armor',result:{name:'🛡️ Dragon Scale Armor',slot:'armor',rarity:'epic',stats:{armor:320},category:'equipment'},
   req:[{name:'🐉 Dragon Scale',qty:3},{name:'🪨 Stone Core',qty:2}],desc:'Armor forged from dragon scales'},
  {id:'craft_void_ring',result:{name:'💍 Void Ring',slot:'ring',rarity:'epic',stats:{str:150,int:150,agi:150},category:'equipment'},
   req:[{name:'🌑 Void Crystal',qty:2},{name:'💎 Troll Gem',qty:3}],desc:'A ring channeling the power of the void'},
  {id:'craft_phoenix_amulet',result:{name:'📿 Phoenix Amulet',slot:'amulet',rarity:'legendary',stats:{int:150,maxMp:400},category:'equipment'},
   req:[{name:'🔥 Phoenix Feather',qty:2},{name:'🔥 Dragon Flame',qty:2},{name:'💎 Pure Crystal Core',qty:1}],desc:'Ultimate mage amulet — requires rare boss drops'},
  {id:'craft_titan_helm',result:{name:'⛑️ Titan Helm',slot:'helmet',rarity:'legendary',stats:{armor:200,str:80},category:'equipment'},
   req:[{name:'⚡ Titan Soul',qty:1},{name:'💀 Death Essence',qty:2},{name:'🪨 Stone Core',qty:3}],desc:'A helmet of godlike defense'},
  {id:'craft_chaos_boots',result:{name:'👢 Chaos Treads',slot:'boots',rarity:'legendary',stats:{agi:180,str:50},category:'equipment'},
   req:[{name:'🌀 Chaos Essence',qty:2},{name:'🌕 Moon Shard',qty:3}],desc:'Boots that bend space with every step'},
  {id:'craft_mega_potion',result:{name:'❤️ Mega Elixir',category:'consumable',rarity:'epic',effect:'hp',val:1500,stackable:true,qty:1},
   req:[{name:'🩸 Blood Vial',qty:3},{name:'🔥 Phoenix Feather',qty:1}],desc:'Restores 1500 HP instantly'},
  {id:'craft_divine_blade',result:{name:'⚔️ Divine Blade',slot:'weapon',rarity:'legendary',stats:{str:220},category:'equipment'},
   req:[{name:'☄️ Divine Shard',qty:2},{name:'🐉 Dragon Scale',qty:2},{name:'😈 Demon Horn',qty:1}],desc:'The ultimate weapon — forged from fallen god material'},
];

// ── SCENES ──
const SCENES={
  town:{
  title:'🏘️ Town Square',
  text:'You stand in the peaceful town square. Choose a dungeon to enter or visit the shop!',
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
  ]
},

dungeon_1:{title:'🐺 Wolf Mountain',text:'The howling mountain awaits. Wolves rule these peaks.',
  choices:[
    {text:'⚔️ Enter Dungeon',next:'enter_dungeon',stageId:1},
    {text:'🏘️ Town',next:'town'}
  ]},
dungeon_2:{title:'🕷️ Spider Cavern',text:'Dark webs cover every surface. The Spider Queen lurks within.',
  choices:[
    {text:'⚔️ Enter Dungeon',next:'enter_dungeon',stageId:2},
    {text:'🏘️ Town',next:'town'}
  ]},
dungeon_3:{title:'👹 Goblin Fortress',text:'The fortress stinks of greed and blood. Goblins swarm inside.',
  choices:[
    {text:'⚔️ Enter Dungeon',next:'enter_dungeon',stageId:3},
    {text:'🏘️ Town',next:'town'}
  ]},
dungeon_4:{title:'💀 Skeleton Crypt',text:'Ancient bones rattle in the darkness. Death magic fills the air.',
  choices:[
    {text:'⚔️ Enter Dungeon',next:'enter_dungeon',stageId:4},
    {text:'🏘️ Town',next:'town'}
  ]},
dungeon_5:{title:'👊 Orc Stronghold',text:'War drums echo through the stronghold. Orcs prepare for battle.',
  choices:[
    {text:'⚔️ Enter Dungeon',next:'enter_dungeon',stageId:5},
    {text:'🏘️ Town',next:'town'}
  ]},
dungeon_6:{title:'🧛 Vampire Castle',text:'The castle is cold as death. Vampires feed on the unwary.',
  choices:[
    {text:'⚔️ Enter Dungeon',next:'enter_dungeon',stageId:6},
    {text:'🏘️ Town',next:'town'}
  ]},
dungeon_7:{title:'👾 Troll Caves',text:'The cave floor shakes with each troll step. Regeneration keeps them alive.',
  choices:[
    {text:'⚔️ Enter Dungeon',next:'enter_dungeon',stageId:7},
    {text:'🏘️ Town',next:'town'}
  ]},
dungeon_8:{title:'😈 Demon Citadel',text:'Hellfire burns eternally here. Demons feast on lost souls.',
  choices:[
    {text:'⚔️ Enter Dungeon',next:'enter_dungeon',stageId:8},
    {text:'🏘️ Town',next:'town'}
  ]},
dungeon_9:{title:'🌑 Shadow Realm',text:'Reality bends here. The Shadow Emperor commands the darkness.',
  choices:[
    {text:'⚔️ Enter Dungeon',next:'enter_dungeon',stageId:9},
    {text:'🏘️ Town',next:'town'}
  ]},
dungeon_10:{title:'🌟 Eternal Kingdom',text:'The final challenge. The Eternal King waits on his throne.',
  choices:[
    {text:'⚔️ Enter Dungeon',next:'enter_dungeon',stageId:10},
    {text:'🏘️ Town',next:'town'}
  ]}, 

inn:{
  title:'⛪ The Rusty Flagon Inn',
  text:'You rest comfortably. Your wounds heal and energy is restored.',
  action:()=>{
    if(state.gold>=5){
      state.gold-=5;
      const hpHeal = Math.floor(state.maxHp * 0.5);
      const mpHeal = Math.floor(state.maxMp * 0.5);
      state.hp=Math.min(state.maxHp, state.hp + hpHeal);
      state.mp=Math.min(state.maxMp, state.mp + mpHeal);
      addLog(`Rested: +${formatNumber(hpHeal)} HP, +${formatNumber(mpHeal)} MP. Cost 5g.`,'good');
      playSound('snd-heal');
    } else {
      addLog('Need 5 gold to rest!','bad');
    }
    updateUI();
  },
  choices:[{text:'🏘️ Return to Town',next:'town'}]
},
}

// ── SHOP ITEMS ──
const SHOP_EQUIP=[
  // ── WEAPONS ──
  {id:'s1',name:'⚔️ Iron Sword',price:200,slot:'weapon',rarity:'normal',stats:{str:20,lifeSteal:0.05,hit:5,crit:0.1}},
  {id:'s2',name:'⚔️ Steel Sword',price:500,slot:'weapon',rarity:'uncommon',stats:{str:45,equipLifeSteal:0.06,hit:25,crit:0.2}},
  //{id:'s3',name:'⚔️ War Blade',price:2200,slot:'weapon',rarity:'rare',stats:{str:90,lifeSteal:0.07,hit:50}},
  //{id:'s4',name:'⚔️ Sovereign Blade',price:5500,slot:'weapon',rarity:'legendary',stats:{str:180,lifeSteal:0.1,hit:150}},
  // ── ARMOR ──
  {id:'s5',name:'🛡️ Wooden Shield',price:200,slot:'armor',rarity:'normal',stats:{sta:15,armor:25,hpRegen:25,dodge:0.2}},
  {id:'s6',name:'🛡️ Chain Mail',price:400,slot:'armor',rarity:'uncommon',stats:{sta:25,armor:55,hpRegen:50,dodge:0.5}},
  //{id:'s7',name:'🛡️ Knight Plate',price:2200,slot:'armor',rarity:'rare',stats:{sta:50,armor:110,maxHp:300,hpRegen:100}},
  //{id:'s8',name:'🛡️ Dragon Plate',price:4400,slot:'armor',rarity:'legendary',stats:{sta:90,armor:200,maxHp:800,hpRegen:300}},
  // ── BOOTS ──
  {id:'s9',name:'👢 Leather Boots',price:220,slot:'boots',rarity:'normal',stats:{agi:15,crit:0.1}},
  {id:'s10',name:'👢 Swift Treads',price:550,slot:'boots',rarity:'uncommon',stats:{agi:30,dodge:0.2}},
  //{id:'s11',name:'👢 Shadow Greaves',price:2200,slot:'boots',rarity:'rare',stats:{agi:60}},
  //{id:'s12',name:'👢 Void Sabatons',price:5500,slot:'boots',rarity:'legendary',stats:{agi:120}},
  // ── RINGS ──
  {id:'s13',name:'💍 Copper Band',price:350,slot:'ring',rarity:'normal',stats:{str:10,int:10,crit:0.10}},
  {id:'s14',name:'💍 Silver Seal',price:550,slot:'ring',rarity:'uncommon',stats:{str:25,int:25,crit:0.20}},
  //{id:'s15',name:'💍 Enchanted Loop',price:2200,slot:'ring',rarity:'rare',stats:{str:50,int:50}},
  //{id:'s16',name:'💍 Eternal Signet',price:5500,slot:'ring',rarity:'legendary',stats:{str:100,int:100}},
  // ── HELMETS ──
  {id:'s17',name:'⛑️ Iron Helm',price:280,slot:'helmet',rarity:'normal',stats:{armor:25,int:10,crit:0.10}},
  {id:'s18',name:'⛑️ Steel Visor',price:580,slot:'helmet',rarity:'uncommon',stats:{armor:55,int:25,crit:0.20}},
 // {id:'s19',name:'⛑️ Warlord Crown',price:2800,slot:'helmet',rarity:'rare',stats:{armor:110,int:55}},
  //{id:'s20',name:'⛑️ Divine Circlet',price:6600,slot:'helmet',rarity:'legendary',stats:{armor:220,int:110}},
  // ── AMULETS ──
  {id:'s21',name:'📿 Novice Pendant',price:250,slot:'amulet',rarity:'normal',stats:{int:15,maxMp:150,crit:0.10}},
  {id:'s22',name:'📿 Mage Talisman',price:550,slot:'amulet',rarity:'uncommon',stats:{int:35,maxMp:350,crit:0.20}},
  //{id:'s23',name:'📿 Arcane Necklace',price:2200,slot:'amulet',rarity:'rare',stats:{int:70,maxMp:700}},
 // {id:'s24',name:'📿 Celestial Amulet',price:5500,slot:'amulet',rarity:'legendary',stats:{int:140,maxMp:1400}},
];
const SHOP_CONS=[
  {id:'c1',name:'❤️ Health Potion',price:100,rarity:'normal',effect:'hp',val:400},
  {id:'c2',name:'❤️ Mega Potion',price:220,rarity:'uncommon',effect:'hp',val:2000},
  {id:'c3',name:'💧 Mana Potion',price:80,rarity:'normal',effect:'mp',val:300},
  {id:'c4',name:'💧 Mana Flask',price:180,rarity:'uncommon',effect:'mp',val:6000},
  {id:'c5',name:'✨ Elixir',price:400,rarity:'rare',effect:'both',val:10000},
];
let autoFightOn = false;
let autoFightEnemyId = null;  // tracks last defeated enemy
let autoFightTimer = null;    // holds the interval reference
let currentEnemy=null;
let pendingBossId=null;
let currentInvTab='equipment';
let currentShopTab='equipment';

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
function spawnDmgFloat(text, onEnemy, cls=''){
  const arena=document.getElementById('arena');
  if(!arena)return;
  const rect=arena.getBoundingClientRect();
  const div=document.createElement('div');
  div.className=`dmg-float ${cls}`;
  div.textContent=text;
  
  // Random offset so they don't stack
  const randomX = Math.floor(Math.random()*40)-20;
  const randomY = Math.floor(Math.random()*30)-15;
  
  div.style.left=(onEnemy ? rect.right-80 : rect.left+30) + randomX +'px';
  div.style.top=(rect.top + rect.height/2 - 20) + randomY +'px';
  
  document.body.appendChild(div);
  setTimeout(()=>div.remove(),950);
}

// ── START ──
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
  loadAutoSellUI();updateUI();renderShop();renderQuests();
  renderInventory();renderSkillBar();renderEquipSlots();fetchLeaderboard();
  setDifficulty('normal');
  switchMainScene('adv'); // Start on Adventure scene
}

// ── LOAD SCENE ──
function loadScene(sceneId){
  if(sceneId==='boss_fight')return;
  const scene=SCENES[sceneId];if(!scene)return;
  state.currentScene=sceneId;
  if(scene.action)scene.action();
  document.getElementById('story-content').innerHTML=`<div class="scene-title">${scene.title}</div><p>${scene.text}</p>`;
  document.getElementById('combat-box').style.display='none';
  const box=document.getElementById('choices-box');
  box.innerHTML='';box.style.display='flex';
  scene.choices.forEach(c=>{
  const btn=document.createElement('button');
  btn.className='choice-btn fade-in';btn.innerHTML=c.text;
  if(c.enemy) btn.onclick=()=>startCombat(c.enemy,false);
  else if(c.bossId) btn.onclick=()=>triggerBoss(c.bossId);
  else if(c.next==='enter_dungeon') btn.onclick=()=>enterDungeon(c.stageId);
  else btn.onclick=()=>loadScene(c.next);
  box.appendChild(btn);
});
  updateUI();
  updateAutoFightBtn(); // ← ADD THIS
}

function toggleAutoFight(){
  if(currentStage){
    // In dungeon — stop auto fight and reset dungeon
    autoFightOn=false;
    clearInterval(autoFightTimer);
    autoFightTimer=null;
    currentStage=null;
    dungeonWave=0;
    dungeonQueue=[];
    currentEnemy=null;
    document.getElementById('combat-box').style.display='none';
    document.getElementById('choices-box').style.display='flex';
    stopAutoFight();
    addLog('⏹️ Left the dungeon!','info');
    notify('⏹️ Dungeon abandoned!','#888');
    loadScene('town');
    return;
  }

  // Outside dungeon — old behavior
  if(!autoFightEnemyId){
    notify('⚠️ Defeat an enemy first!','var(--red)');
    return;
  }
  autoFightOn=!autoFightOn;
  updateAutoFightBtn();
  if(autoFightOn){
    addLog('⚡ Auto Fight ON!','gold');
    notify('⚡ Auto Fight activated!','var(--gold)');
    startAutoFight();
  } else {
    stopAutoFight();
    addLog('⏹️ Auto Fight OFF.','info');
    notify('⏹️ Auto Fight stopped.','#888');
    document.getElementById('combat-box').style.display='none';
    document.getElementById('choices-box').style.display='flex';
  }
}
 
function updateAutoFightBtn(){
  const btn=document.getElementById('auto-fight-btn');
  if(!btn)return;
  
  if(currentStage){
    // Inside dungeon — show as "Leave Dungeon" button
    btn.textContent='🚪 Leave Dungeon';
    btn.style.background='linear-gradient(135deg,#6a0000,#aa2222)';
    btn.style.display='inline-block';
    return;
  }

  btn.textContent=autoFightOn?'⏹️ Stop Auto':'⚡ Auto Fight';
  btn.style.background=autoFightOn
    ?'linear-gradient(135deg,#6a0000,#aa2222)'
    :'linear-gradient(135deg,#005500,#00aa44)';
  btn.style.display=(autoFightEnemyId&&!currentEnemy)?'inline-block':'none';
}
 
function startAutoFight(){
  if(!autoFightOn||!autoFightEnemyId)return;
 //  start a new fight immediately
  startCombat(autoFightEnemyId, false);
  // then run one auto action every 1 second
  autoFightTimer=setInterval(()=>{
    if(!autoFightOn||!currentEnemy){
      clearInterval(autoFightTimer);
      return;
    }
    autoFightStep();
  },1000);
}
  
function autoFightStep(){
  if(!currentEnemy)return;

  // ── PLAYER ATTACKS ──
  const enemyDodgeChance=Math.max(0,(currentEnemy.dodge||0)-state.hit)/100;
  if(Math.random()<enemyDodgeChance){
    addCombatLog(`💨 ${currentEnemy.name} dodged!`,'bad');
  } else {
    let dmg=Math.max(1,state.attackPower+Math.floor(Math.random()*8)-Math.floor(currentEnemy.armor/2));
    let isCrit=false;
    if(Math.random()<state.crit/100){dmg=Math.floor(dmg*2);isCrit=true;}
    if(state.unlockedTalents.includes('berserker')&&state.hp<state.maxHp*.5)dmg=Math.floor(dmg*1.35);
    if(state.unlockedTalents.includes('death_mark'))dmg=Math.floor(dmg*1.5);
    if(isCrit)showCritEffect();
    currentEnemy.hp-=dmg;
    const lifeSteal=state.lifeSteal||0;
    if(lifeSteal>0){
      const healAmt=Math.floor(dmg*lifeSteal);
      if(healAmt>0){
        state.hp=Math.min(state.maxHp,state.hp+healAmt);
        addCombatLog(`🩸 Life Steal heals ${healAmt} HP!`,'good');
        spawnDmgFloat(`🩸+${healAmt}`,false,'heal-float');
      }
    }
    useNextAutoSkill(currentEnemy);
    addCombatLog(`⚔️ ${isCrit?'💥CRIT! ':''}Auto: ${dmg} dmg!`,isCrit?'gold':'good');
    animateAttack(true,dmg,isCrit);
  }

  // ── CHECK ENEMY DEATH ──
  if(currentEnemy.hp<=0){
    currentEnemy.hp=0;
    updateEnemyBar();
    clearInterval(autoFightTimer);
    autoFightTimer=null;
    endCombat(true);
    return; // ← endCombat handles next monster/wave
  }

  // ── SKILL COOLDOWNS ──
  Object.keys(state.skillCooldowns).forEach(k=>{
    if(state.skillCooldowns[k]>0)state.skillCooldowns[k]--;
  });

  // ── HP/MP REGEN ──
  if(state.hpRegen>0){
    const regen=Math.floor(state.hpRegen);
    if(regen>0&&state.hp<state.maxHp){
      state.hp=Math.min(state.maxHp,state.hp+regen);
      addCombatLog(`💚 Regen +${regen} HP`,'good');
    }
  }
  if(state.manaRegen>0){
    const mregen=Math.floor(state.manaRegen);
    if(mregen>0&&state.mp<state.maxMp){
      state.mp=Math.min(state.maxMp,state.mp+mregen);
      addCombatLog(`💙 Mana Regen +${mregen} MP`,'info');
    }
  }

  // ── BOSS ABILITY ──
  if(currentEnemy.boss && currentEnemy.ability){
    currentEnemy.abilityTurn=(currentEnemy.abilityTurn||0)+1;
    if(currentEnemy.abilityTurn>=currentEnemy.ability.triggerEvery){
      currentEnemy.abilityTurn=0;
      currentEnemy.ability.effect(currentEnemy);
    }
  }

  // ── ENEMY ATTACKS ──
  if(currentEnemy.frozen){
    currentEnemy.frozen=false;
    addCombatLog(`${currentEnemy.name} is frozen!`,'info');
  } else {
    // Check web trap
    const dodge = state.webTrapped>0 ? 0 : state.dodge;
    if(state.webTrapped>0) state.webTrapped--;

    // Check phase shift
    if(currentEnemy.phaseShifted){
      currentEnemy.phaseShifted=false;
      addCombatLog(`🌑 ${currentEnemy.name} phases back in!`,'info');
    } else {
      const playerDodgeChance=Math.max(0,dodge-(currentEnemy.hit||0))/100;
      let eDmg=Math.max(1,currentEnemy.atk+Math.floor(Math.random()*6)-Math.floor(state.armor/10));
      if(state.defending)eDmg=Math.floor(eDmg/2);
      if(Math.random()<playerDodgeChance){addCombatLog('💨 You dodged!','good');eDmg=0;}
      state.hp-=eDmg;
      if(eDmg>0){addCombatLog(`${currentEnemy.name} hits you for ${eDmg}!`,'bad');animateAttack(false,eDmg,false);}
    }
  }

  // ── RAGE TIMER ──
  if(currentEnemy.rageTimer>0){
    currentEnemy.rageTimer--;
    if(currentEnemy.rageTimer===0){
      currentEnemy.atk=Math.floor(currentEnemy.atk/2);
      addCombatLog(`👊 ${currentEnemy.name} calms down!`,'info');
    }
  }

  // ── POISON ──
  if(currentEnemy.poisoned>0){
    const pd=currentEnemy.poisonDmg||Math.floor(state.agi*0.8+state.attackPower*0.3);
    currentEnemy.hp-=pd;
    currentEnemy.poisoned--;
    addCombatLog(`🐍 Poison deals ${pd}!`,'good');
    spawnDmgFloat(`🐍${pd}`,true,'enemy-dmg');
  }

  // ── PLAYER DEATH ──
  if(state.hp<=0){
    state.hp=0;
    updateUI();
    clearInterval(autoFightTimer);
    autoFightTimer=null;
    // Reset dungeon state
    currentStage=null;
    dungeonWave=0;
    dungeonQueue=[];
    addLog('💀 You died!','bad');
    notify('💀 You died!','var(--red)');
    endCombat(false);
    return;
  }

  updateEnemyBar();
  updateUI();
}

function stopAutoFight(){
  autoFightOn=false;
  clearInterval(autoFightTimer);
  autoFightTimer=null;
  updateAutoFightBtn();
  // Don't clear currentEnemy here - let endCombat() handle it
}


 //  ... rest of your function stays the same
 
 
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 3: Replace endCombat() with this new version
// Adds: skill CD reset + auto fight next round
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function endCombat(won){
  if(!currentEnemy)return;
// ── CLEAR ALL BOSS DEBUFFS ──
  if(state.activeDebuffs.maxHpReduction > 0){
    state.equipMaxHp = (state.equipMaxHp||0) + state.activeDebuffs.maxHpReduction;
    state.activeDebuffs.maxHpReduction = 0;
  }
  state.activeDebuffs.webTrapped = 0;
  state.activeDebuffs.rageTimer = 0;
  state.webTrapped = 0;

  // Also restore orc chieftain rage if still active
  if(currentEnemy.rageTimer > 0){
    currentEnemy.atk = Math.floor(currentEnemy.atk / 2);
  }

  state.usedUndying=false;
  state.skillCooldowns={};
  
  // Reset ONLY temporary combat buffs
state.strMult   = 1.0;
state.agiMult   = 1.0;
state.intMult   = 1.0;
state.staMult   = 1.0;
state.armorMult = 1.0;
state.critMult  = 1.0;
state.dodgeMult = 1.0;
state.hpRegenMult = 1.0;
state.mpRegenMult = 1.0;
state.hitMult   = 1.0;
state.mpMult    = 1.0;
state.attackMult = 1.0;
state.battleCryActive = false;
// ← classBonuses and talentBonuses are NEVER touched here!
  
  // ✅ Reapply permanent bonuses (class + talent)
  if(state.class){
    const c = CLASSES[state.class];
    Object.entries(c.bonuses).forEach(([k,v])=>{
      if(k in state) {
        state[k] = 1.0 + v;
      }
    });
  }

  Object.keys(state.talentBonuses).forEach(k => {
    if(k in state && k.includes('Mult')) {
      state[k] += state.talentBonuses[k];
    }
  });

  calcStats();

  if(won){
    if(currentEnemy.id&&!currentEnemy.boss){
      autoFightEnemyId=currentEnemy.id;
    }

    // ✅ Safe gold calculation
    let baseGold = [50, 150];
    if(currentEnemy.gold && Array.isArray(currentEnemy.gold)) {
      baseGold = currentEnemy.gold;
    }
    
    const min = Number(baseGold) || 50;
    const max = Number(baseGold) || 150;
    const goldMult = Number(currentEnemy._goldMult) || 1;
    const xpMult = Number(currentEnemy._xpMult) || 1;
    
    const g = Math.floor((Math.random() * (max - min) + min) * goldMult);
    const xp = Math.floor(currentEnemy.xp * xpMult);
    
    state.gold += g;
    state.xp += xp;
    addLog(`Defeated ${currentEnemy.name}! +${xp} XP, +${g} Gold`, 'good');

    if(currentEnemy.loot){
      currentEnemy.loot().forEach(item=>{
        addToInventory(item);
        addLog(`Loot: ${item.name} [${RARITY[item.rarity]?.label||'Normal'}]`,item.rarity==='legendary'?'legendary':item.rarity==='epic'?'epic':'gold');
        if(item.rarity==='legendary')state.quests.legendary.done=true;
      });
    }

    if(currentEnemy.boss)state.quests.boss.done=true;
    state.quests.kill1.done=true;
    if(state.gold>=50)state.quests.gold50.done=true;
    autoSellAfterCombat();
    checkLevelUp();
    // ── After checkLevelUp() in endCombat() ──
if(won){
  if(currentEnemy.id && !currentEnemy.boss){
    autoFightEnemyId = currentEnemy.id;
  }

  const baseGold = currentEnemy.gold && Array.isArray(currentEnemy.gold) ? currentEnemy.gold : [50,150];
  const goldMult = Number(currentEnemy._goldMult) || 1;
  const xpMult = Number(currentEnemy._xpMult) || 1;
  const g = Math.floor((Math.random()*(baseGold[1]-baseGold[0])+baseGold[0])*goldMult);
  const xp = Math.floor(currentEnemy.xp * xpMult);
  state.gold += g;
  state.xp += xp;
  addLog(`Defeated ${currentEnemy.name}! +${xp} XP, +${g} Gold`,'good');

  const wasBoss = currentEnemy.boss; // ← save BEFORE clearing
  currentEnemy = null;
  document.getElementById('combat-box').style.display = 'none';

  if(currentEnemy && currentEnemy.loot){
    currentEnemy.loot().forEach(item=>{
      addToInventory(item);
      addLog(`Loot: ${item.name} [${RARITY[item.rarity]?.label||'Normal'}]`,item.rarity==='legendary'?'legendary':item.rarity==='epic'?'epic':'gold');
      if(item.rarity==='legendary')state.quests.legendary.done=true;
    });
  }

  if(wasBoss) state.quests.boss.done=true;
  state.quests.kill1.done=true;
  if(state.gold>=50)state.quests.gold50.done=true;
  autoSellAfterCombat();
  checkLevelUp();
  renderQuests();

  // ── DUNGEON FLOW ──
  if(currentStage){
    if(wasBoss){
      dungeonComplete();
    } else {
      if(dungeonQueue.length > 0){
        setTimeout(()=>spawnNextDungeonMonster(), 1200);
      } else {
        setTimeout(()=>startNextWave(), 1500);
      }
    }
  } else if(!autoFightOn){
  }
}
    renderQuests();

    currentEnemy=null;
    document.getElementById('combat-box').style.display='none';

    if(!autoFightOn){
      loadScene('victory');
    }

  } else {
    currentEnemy=null;document.getElementById('combat-box').style.display='none';
    loadScene('town');
}

  updateUI();
  renderSkillBar();
  updateAutoFightBtn();
}

// Auto skill slots state
let autoSkillSlots = [null, null, null];
let autoSkillIndex = 0;

function dropSkillToSlot(event, slotIndex) {
  const skillId = event.dataTransfer.getData('skillId');
  if (!skillId || !SKILLS[skillId]) return;
  autoSkillSlots[slotIndex] = skillId;
  renderAutoSlots();
}

function clearSlot(slotIndex) {
  autoSkillSlots[slotIndex] = null;
  renderAutoSlots();
}

function renderAutoSlots() {
  autoSkillSlots.forEach((skillId, i) => {
    const content = document.getElementById(`auto-slot-content-${i}`);
    const slot = document.getElementById(`auto-slot-${i}`);
    if (!content || !slot) return;
    if (skillId && SKILLS[skillId]) {
      const skill = SKILLS[skillId];
      content.innerHTML = skill.icon;
      content.style.borderColor = 'var(--gold)';
      slot.querySelector('.skill-lbl').textContent = skill.name;
    } else {
      content.innerHTML = '➕';
      content.style.borderColor = '';
      slot.querySelector('.skill-lbl').textContent = `Slot ${i+1}`;
    }
  });
}

function useNextAutoSkill(enemy) {
  const filledSlots = autoSkillSlots
    .map((id, i) => ({ id, i }))
    .filter(s => s.id !== null);
  
  if (filledSlots.length === 0) return false;

  // Cycle through filled slots only
  const slot = filledSlots[autoSkillIndex % filledSlots.length];
  autoSkillIndex++;

  const skillId = slot.id;
  if (!skillId || !SKILLS[skillId]) return false;

  const skill = SKILLS[skillId];
  const cd = state.skillCooldowns[skillId] || 0;
  const mpCost = typeof skill.mp === 'function' ? skill.mp() : skill.mp;

  if (cd > 0) {
    addCombatLog(`⏳ ${skill.name} on cooldown (${cd})`, 'info');
    return false;
  }
  if (state.mp < mpCost) {
    addCombatLog(`💙 Not enough MP for ${skill.name}!`, 'bad');
    return false;
  }

  state.mp -= mpCost;
  state.skillCooldowns[skillId] = skill.cd;
  skill.use(enemy);
  spawnAbilityFloat(`${skill.icon} ${skill.name}!`, '#f0c040');
  return true;
}




// ── COMBAT ──
function startCombat(enemyId,isBoss){
  const tmpl=MONSTER_TEMPLATES[enemyId];
  if(!tmpl)return;
  
  const diff=DIFFICULTY[state.difficulty||'normal'];
  const scale=(1+Math.max(0,(state.level-1))*0.01)*diff.hpMult;
  const atkScale=(1+Math.max(0,(state.level-1))*0.01)*diff.atkMult;

 
  // Add difficulty prefix to name
  const prefix=state.difficulty==='hell'?'💀 Hell ':state.difficulty==='hard'?'🔥 Hard ':'';
 
  currentEnemy={
    ...tmpl,
    name:prefix+tmpl.name,
    hp:Math.floor(tmpl.hp*scale),
    maxHp:Math.floor(tmpl.hp*scale),
    atk:Math.floor(tmpl.atk*atkScale),
    armor:tmpl.armor,
    hit:Math.floor((tmpl.hit||0)*5),
    dodge:Math.floor((tmpl.dodge||0)*5),
    poisoned:0,
    frozen:false,
    crippled:0,
    boss:false,
    _xpMult:diff.xpMult,
    _goldMult:diff.goldMult,
  };
  startCombatWith(currentEnemy);
}
function startCombatWith(enemy){
  autoSkillIndex = 0;
  document.getElementById('enemy-hp-val').textContent=enemy.hp;
  document.getElementById('enemy-hp-max').textContent=enemy.maxHp;
  const enemyEl=document.getElementById('arena-enemy');
if(enemy.icon&&!enemy.icon.includes(' ')&&enemy.icon.length<20){
  enemyEl.innerHTML=`<img src="${enemy.icon}.jpg" style="width:50px;height:50px;object-fit:cover;border-radius:8px;border:2px solid var(--red);">`;
}else{
  enemyEl.textContent=enemy.icon;
}
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
    const enemyDodgeChance = Math.max(0, (currentEnemy.dodge||0) - state.hit) / 100;
    if(Math.random() < enemyDodgeChance){
      addCombatLog(`💨 ${currentEnemy.name} dodged your attack!`,'bad');
      playSound('snd-attack');
    } else {
      let dmg=Math.max(1, state.attackPower + Math.floor(Math.random()*8) - Math.floor(currentEnemy.armor/2));
      let isCrit=false;
      if(state.unlockedTalents.includes('berserker')&&state.hp<state.maxHp*.5)dmg=Math.floor(dmg*1.35);
      if(Math.random() < state.crit/100){dmg=Math.floor(dmg*2);isCrit=true;}
      if(isCrit) showCritEffect();
      if(state.unlockedTalents.includes('death_mark'))dmg=Math.floor(dmg*1.5);
      if(state.unlockedTalents.includes('venom'))currentEnemy.poisoned=(currentEnemy.poisoned||0)+1;
      currentEnemy.hp-=dmg;
      // Life steal
    const lifeSteal = state.lifeSteal || 0;
      if(lifeSteal > 0){
      const healAmt = Math.floor(dmg * lifeSteal);
      if(healAmt > 0){
      state.hp = Math.min(state.maxHp, state.hp + healAmt);
      addCombatLog(`🩸 Life Steal heals ${healAmt} HP!`, 'good');
      spawnDmgFloat(`🩸+${healAmt}`, false, 'heal-float');
  }
    }
      addCombatLog(`⚔️ ${isCrit?'💥CRIT! ':''}You hit for ${dmg}!`,isCrit?'gold':'good');
      playSound('snd-attack');animateAttack(true,dmg,isCrit);
    }
    state.defending=false;
  } else if(action==='magic'){
    if(state.mp<10){addCombatLog('❌ Not enough MP!','bad');return;}
    let dmg=Math.max(1,state.int*2+Math.floor(Math.random()*10));
    if(state.unlockedTalents.includes('spell_power'))dmg=Math.floor(dmg*1.3);
    if(state.unlockedTalents.includes('fire_mastery'))dmg=Math.floor(dmg*1.2);
    currentEnemy.hp-=dmg;state.mp-=10;
    addCombatLog(`✨ Magic hits for ${dmg}! (-10 MP)`,'info');playSound('snd-magic');animateAttack(true,dmg,false);
    state.defending=false;
  } else if(action==='defend'){
    state.defending=true;addCombatLog('🛡️ Bracing for impact!','info');
  } else if(action==='flee'){
    const ok=state.unlockedTalents.includes('smoke_bomb')?.99:state.agi>currentEnemy.armor?.7:.35;
    if(Math.random()<ok){addLog('Fled from battle!','bad');currentEnemy=null;document.getElementById('combat-box').style.display='none';loadScene('town');return;}
    addCombatLog('❌ Failed to flee!','bad');state.defending=false;
  }
  
  // ✅ CHECK IF ENEMY DIED FIRST
  if(currentEnemy&&currentEnemy.hp<=0){
    currentEnemy.hp=0;
    updateEnemyBar();
    endCombat(true);
    return;  // ← IMPORTANT: Stop here!
  }
  
  // Apply talent healing
  // Apply talent healing
//if(state.unlockedTalents.includes('second_wind'))state.hp=Math.min(state.maxHp,state.hp+50);
//if(state.unlockedTalents.includes('mana_regen'))state.mp=Math.min(state.maxMp,state.mp+50);

// HP/MP regen per turn
if(state.hpRegen>0){
  const regen=Math.floor(state.hpRegen + state.equipHpRegen);
  if(regen>0&&state.hp<state.maxHp){
    state.hp=Math.min(state.maxHp,state.hp+regen);
    //spawnDmgFloat(`+${regen}HP`,false,'heal-float');
    addCombatLog(`💚 Regen +${regen} HP`,'good'); // ← add this
  }
}
if(state.manaRegen>0){
  const mregen=Math.floor(state.manaRegen);
  if(mregen>0&&state.mp<state.maxMp){
    state.mp=Math.min(state.maxMp,state.mp+mregen);
    addCombatLog(`💙 Mana Regen +${mregen} MP`,'info'); // ← add this
  }
}
  
  // Decrement all skill cooldowns after player action
  Object.keys(state.skillCooldowns).forEach(k => {
    if (state.skillCooldowns[k] > 0) {
      state.skillCooldowns[k]--;
    }
  });
  
  // ✅ ENEMY ATTACKS ONLY IF STILL ALIVE
  if(currentEnemy&&currentEnemy.hp>0){
    if(currentEnemy.frozen){
      currentEnemy.frozen=false;
      addCombatLog(`${currentEnemy.name} is frozen!`,'info');
    } else {
      const playerDodgeChance = Math.max(0, state.dodge - (currentEnemy.hit||0)) / 100;
      let eDmg=Math.max(1, currentEnemy.atk + Math.floor(Math.random()*6) - Math.floor(state.armor/10));
      if(state.defending)eDmg=Math.floor(eDmg/(state.unlockedTalents.includes('fortress')?4:2));
      if(state.unlockedTalents.includes('shield_wall'))eDmg=Math.floor(eDmg*.9);
      if(state.manaShield){state.manaShield=false;addCombatLog('🔮 Mana Shield absorbed!','info');eDmg=0;}
      if(Math.random() < playerDodgeChance){addCombatLog('💨 You dodged!','good');eDmg=0;}
      state.hp-=eDmg;
      if(eDmg>0){addCombatLog(`${currentEnemy.name} hits you for ${eDmg}!`,'bad');animateAttack(false,eDmg,false);}
    }
    
    if(currentEnemy.poisoned>0){
      const pd=8;
      currentEnemy.hp-=pd;
      currentEnemy.poisoned--;
      addCombatLog(`🐍 Poison deals ${pd}!`,'good');
    }
    
    if(state.hp<=0&&state.unlockedTalents.includes('undying')&&!state.usedUndying){
      state.hp=1;
      state.usedUndying=true;
      addCombatLog('💪 Undying Will! Survived!','gold');
    }
    
    if(state.hp<=0){
      state.hp=0;
      updateUI();
      endCombat(false);
      return;
    }
  }
  
  updateEnemyBar();
  updateUI();
}

function useSkillInCombat(skillId){
  if(!currentEnemy)return;
  const sk=SKILLS[skillId];if(!sk)return;
  const cd=state.skillCooldowns[skillId]||0;
  const mpCost=typeof sk.mp==='function'?sk.mp():sk.mp;
  if(cd>0){addCombatLog(`${sk.name} on cooldown! (${cd})`,'bad');return;}
  if(state.mp<mpCost){addCombatLog(`Not enough MP for ${sk.name}!`,'bad');return;}

  // Use skill
  state.mp-=mpCost;
  state.skillCooldowns[skillId]=sk.cd;
  sk.use(currentEnemy);

  // Show skill float
  spawnAbilityFloat(`${sk.icon} ${sk.name}!`, '#f0c040');

  // Tick down other cooldowns
  Object.keys(state.skillCooldowns).forEach(k=>{
    if(k!==skillId&&state.skillCooldowns[k]>0)state.skillCooldowns[k]--;
  });

  // Check if enemy died
  if(currentEnemy&&currentEnemy.hp<=0){
    currentEnemy.hp=0;
    updateEnemyBar();
    clearInterval(autoFightTimer);
    autoFightTimer=null;
    endCombat(true);
    return;
  }

  // Enemy retaliates
  if(currentEnemy&&currentEnemy.hp>0){
    const playerDodgeChance=Math.max(0,state.dodge-(currentEnemy.hit||0))/100;
    let eDmg=Math.max(1,currentEnemy.atk+Math.floor(Math.random()*6)-Math.floor(state.armor/10));
    if(state.manaShield){state.manaShield=false;addCombatLog('🔮 Mana Shield absorbed!','info');eDmg=0;}
    if(Math.random()<playerDodgeChance){addCombatLog('💨 You dodged!','good');eDmg=0;}
    state.hp-=eDmg;
    if(eDmg>0){addCombatLog(`${currentEnemy.name} retaliates: ${eDmg}!`,'bad');animateAttack(false,eDmg,false);}
    if(state.hp<=0){state.hp=0;updateUI();endCombat(false);return;}
  }

  updateEnemyBar();
  updateUI();
  renderSkillBar();
}

function addCombatLog(msg,type=''){
  // Format large numbers in combat messages
  msg = msg.replace(/(\d+)/g, (match) => formatNumber(parseInt(match)));
  
  const b=document.getElementById('combat-log');
  const d=document.createElement('div');
  d.className=`log-entry ${type?'log-'+type:''}`;
  d.textContent=msg;
  b.appendChild(d);
  b.scrollTop=b.scrollHeight;
}

function updateEnemyBar(){
  if(!currentEnemy)return;
  const p=Math.max(0,(currentEnemy.hp/currentEnemy.maxHp)*100);
  document.getElementById('arena-enemy-hp').style.width=p+'%';
  document.getElementById('enemy-hp-val').textContent=Math.max(0,currentEnemy.hp);
}

// ── TREASURE CHEST LOOT TABLES ──
const TREASURE_TABLES = {
  1:  { rolls: 2, tier: 'normal' },
  2:  { rolls: 2, tier: 'uncommon' },
  3:  { rolls: 3, tier: 'uncommon' },
  4:  { rolls: 3, tier: 'rare' },
  5:  { rolls: 3, tier: 'rare' },
  6:  { rolls: 4, tier: 'epic' },
  7:  { rolls: 4, tier: 'epic' },
  8:  { rolls: 4, tier: 'epic' },
  9:  { rolls: 5, tier: 'legendary' },
  10: { rolls: 5, tier: 'legendary' },
};

function rollTreasureRarity(tier){
  const r = Math.random();
  switch(tier){
    case 'normal':
      // normal 70%, uncommon 30%
      return r < 0.30 ? 'uncommon' : 'normal';
    
    case 'uncommon':
      // uncommon 70%, rare 30%
      return r < 0.30 ? 'rare' : 'uncommon';
    
    case 'rare':
      // rare 70%, epic 30%
      return r < 0.30 ? 'epic' : 'rare';
    
    case 'epic':
      // epic 90%, legendary 10%
      return r < 0.05 ? 'legendary' : 'epic';
    
    case 'legendary':
      // epic 80%, legendary 10%
      return r < 0.10 ? 'legendary' : 'epic';
    
    default:
      return 'normal';
  }
}

// ── OPEN TREASURE CHEST ──
// ── DROP TREASURE BOX INTO INVENTORY ──
function dropTreasureBox(stageId) {
  const boxNames = {
    1:  '📦 Worn Chest',
    2:  '📦 Wooden Chest',
    3:  '📦 Iron Chest',
    4:  '📦 Steel Chest',
    5:  '📦 Golden Chest',
    6:  '📦 Enchanted Chest',
    7:  '📦 Ancient Chest',
    8:  '📦 Demonic Chest',
    9:  '📦 Shadow Chest',
    10: '📦 Eternal Chest',
  };

  const box = {
    uid: genUid(),
    name: boxNames[stageId] || '📦 Mystery Chest',
    category: 'consumable',
    rarity: stageId <= 2 ? 'normal' :
            stageId <= 4 ? 'uncommon' :
            stageId <= 6 ? 'rare' :
            stageId <= 8 ? 'epic' : 'legendary',
    effect: 'treasure',
    stageId: stageId,
    difficulty: state.difficulty || 'normal',
    stackable: false,
    qty: 1,
    sellPrice: 1000 * stageId,
  };

  addToInventory(box);
  addLog(`📦 ${box.name} added to inventory!`, 'legendary');
  notify(`📦 ${box.name} dropped!`, 'var(--gold)');
  playSound('snd-levelup');
}

// ── LEVEL UP ──
function checkLevelUp(){
  while(state.xp>=state.xpNext&&state.level<state.maxLevel){
    state.xp-=state.xpNext;
    state.level++;
    state.xpNext=Math.floor(state.level*100*20.00);
    
    // Level up BASE stats
    state.baseStr+=2;
    state.baseAgi+=2;
    state.baseInt+=2;
    state.baseSta+=2;
    state.talentPoints+=5;
    
    calcStats();
    state.hp=state.maxHp;
    state.mp=state.maxMp;
    document.getElementById('char-level').textContent=`Level ${state.level} / 100`;
    addLog(`🎉 LEVEL UP! Level ${state.level}! +5 Talent Points!`,'gold');
    playSound('snd-levelup');
    showLevelUpEffect();
    notify(`🎉 Level Up! Now Level ${state.level}!`,'var(--gold)');
    
    if(state.level>=5)state.quests.level5.done=true;
    if(state.level>=10){
      state.quests.level10.done=true;
      if(!state.class)showClassSelection();
      checkTalentUnlocks();
    }
    if(state.level>=50)state.quests.level50.done=true;
    if(state.level>=100)state.quests.level100.done=true;
    if(state.class)document.getElementById('talent-btn').style.display='inline-block';
    updateTalentBtn();
  }
  if(state.level>=state.maxLevel){
    addLog('🌟 MAX LEVEL REACHED! You are a legend!','legendary');
    state.xp=0;
  }
}

function checkTalentUnlocks(){
  if(!state.class)return;
  const c=CLASSES[state.class];
  
  Object.entries(c.trees).forEach(([treeId,tree])=>{
    tree.talents.forEach(talent=>{
      const flagKey=`${state.class}_${talent.id}`;
      
      // Only unlock once per talent, ever
      if(!state.talentUnlockedFlags[flagKey]){
        state.talentUnlockedFlags[flagKey]=true;
        state.unlockedTalents.push(talent.id);
        talent.effect();
        addLog(`🌟 Unlocked: ${talent.name}!`,'purple');
      }
    });
  });
}

function checkTalentUnlocks(){
  if(!state.class)return;
  const c=CLASSES[state.class];
  
  Object.entries(c.trees).forEach(([treeId,tree])=>{
    tree.talents.forEach(talent=>{
      // Create a unique flag key for this talent
      const flagKey=`${state.class}_${talent.id}`;
      
      // Only unlock once per talent, ever
      if(!state.talentUnlockedFlags[flagKey]){
        state.talentUnlockedFlags[flagKey]=true;
        state.unlockedTalents.push(talent.id);
        talent.effect();
        addLog(`🌟 Unlocked: ${talent.name}!`,'purple');
      }
    });
  });
}

// ── CLASS ──
function showClassSelection(){
  const grid=document.getElementById('class-grid');
  grid.innerHTML=Object.entries(CLASSES).map(([id,c])=>`
    <div class="class-card" onclick="selectClass('${id}')">
      <div class="class-icon">${c.icon}</div>
      <div class="class-name">${c.name}</div>
      <div class="class-desc">${c.desc}</div>
      ${Object.entries(c.bonuses).map(([k,v])=>`<div class="class-stat"><span>${k.replace('Mult','').toUpperCase()}</span><span>+${Math.round(v*100)}%</span></div>`).join('')}
    </div>`).join('');
  document.getElementById('class-screen').style.display='block';
}
function selectClass(classId){
  const c=CLASSES[classId];
  state.class=classId;
  state.quests.class.done=true;
  
  // ✅ Store class bonuses
  Object.entries(c.bonuses).forEach(([k,v])=>{
    state.classBonuses[k] = v;
    state[k]=(state[k]||1)+v;
  });
  
  state.skills=c.skills;
  document.getElementById('char-class').textContent=`${c.icon} ${c.name}`;
  document.getElementById('arena-player').innerHTML='<img src="warrior.jpg" style="width:50px;height:50px;object-fit:cover;border-radius:8px;border:2px solid var(--dark-gold);">';
  document.getElementById('arena-player').textContent=c.icon;
  document.getElementById('class-screen').style.display='none';
  document.getElementById('talent-btn').style.display='inline-block';
  
  Object.entries(c.trees).forEach(([treeId,tree])=>{
    tree.talents.forEach(talent=>{
      const flagKey=`${classId}_${talent.id}`;
      state.talentUnlockedFlags[flagKey]=false;
    });
  });
  
  addLog(`🎉 You are now a ${c.name}!`,'purple');
  playSound('snd-levelup');
  updateUI();
  renderSkillBar();
  renderQuests();
}

// ── TALENTS ──
function openTalents(){
  if(!state.class){addLog('Choose a class first!','bad');return;}
  const c=CLASSES[state.class];
  document.getElementById('talent-title').textContent=`${c.icon} ${c.name} Talent Tree`;
  document.getElementById('talent-pts-val').textContent=state.talentPoints;
  document.getElementById('tree-grid').innerHTML=Object.entries(c.trees).map(([tid,tree])=>`
    <div class="tree-col">
      <div class="tree-name">${tree.name}</div>
      ${tree.talents.map(t=>{
        const rank=state.unlockedTalents.filter(u=>u===t.id).length;
        const maxed=rank>=t.ranks;const locked=state.talentPoints<t.cost&&rank===0;
        return `<div class="talent-node ${maxed?'unlocked':locked?'locked':''}" onclick="unlockTalent('${t.id}','${tid}')">
          <span class="talent-node-rank">${rank}/${t.ranks}</span>
          <div class="talent-node-name">${t.name}</div>
          <div class="talent-node-desc">${t.desc}</div>
          <div class="talent-node-cost">Cost: ${t.cost}pt ${maxed?'✅':''}</div>
        </div>`;}).join('')}
    </div>`).join('');
  document.getElementById('talent-screen').style.display='block';
}
function unlockTalent(talentId,treeId){
  const c=CLASSES[state.class];
  const tree=c.trees[treeId];
  const talent=tree.talents.find(t=>t.id===talentId);
  if(!talent)return;
  
  const rank=state.unlockedTalents.filter(u=>u===talentId).length;
  if(rank>=talent.ranks){
    addLog(`${talent.name} already maxed!`,'bad');
    return;
  }
  if(state.talentPoints<talent.cost){
    addLog('Not enough talent points!','bad');
    return;
  }

  state.talentPoints-=talent.cost;
  state.unlockedTalents.push(talentId);

  const flagKey=`${state.class}_${talentId}`;
  state.talentUnlockedFlags[flagKey]=true;
  
  // ✅ Call effect to update talentBonuses
  talent.effect();
  
  state.quests.talent.done=true;
  addLog(`🌟 Unlocked: ${talent.name}!`,'purple');
  playSound('snd-magic');
  openTalents();
  updateUI();
  renderQuests();
  updateTalentBtn();
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
    const sk=SKILLS[sid];if(!sk)return'';
    const cd=state.skillCooldowns[sid]||0;
    return `<div class="skill-slot" draggable="true" 
      ondragstart="event.dataTransfer.setData('skillId','${sid}')"
      onclick="useSkillInCombat('${sid}')">
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
  
  // Add to equipment bonus pool
  Object.entries(item.stats||{}).forEach(([k,v])=>{
    const equipKey='equip'+k.charAt(0).toUpperCase()+k.slice(1);
    state[equipKey]=(state[equipKey]||0)+v;
  });
  
  item.equipped=true;
  state.equipped[item.slot]=uid;
  state.quests.equip.done=true;
  
  calcStats(); // ← Recalculate with new equipment bonuses
  addLog(`Equipped ${item.name}!`,'good');
  playSound('snd-craft');
  renderInventory();
  renderEquipSlots();
  updateUI();
  renderQuests();
}
function unequipSlot(slot,silent=false){
  const uid=state.equipped[slot];if(!uid)return;
  const item=state.inventory.find(i=>i.uid===uid);
  if(item){
    Object.entries(item.stats||{}).forEach(([k,v])=>{
      const equipKey='equip'+k.charAt(0).toUpperCase()+k.slice(1);
      state[equipKey]=Math.max(0,(state[equipKey]||0)-v);
    });
    item.equipped=false;
    if(!silent)addLog(`Unequipped ${item.name}!`,'info');
  }
  state.equipped[slot]=null;
  calcStats(); // ← Recalculate without equipment bonuses
  renderInventory();
  renderEquipSlots();
  updateUI();
}
function renderEquipSlots(){
  ['weapon','armor','helmet','boots','ring','amulet'].forEach(slot=>{
    const slotEl=document.getElementById(`slot-${slot}`);
    const nameEl=document.getElementById(`slot-${slot}-name`);
    const uid=state.equipped[slot];
    slotEl.className='equip-slot';
    
    // Clear existing tooltip if any
    const existingTooltip=slotEl.querySelector('.equip-tooltip');
    if(existingTooltip) existingTooltip.remove();
    
    if(uid){
      const item=state.inventory.find(i=>i.uid===uid);
      if(item){
        nameEl.textContent=item.name.replace(/^[^\s]+ /,'').substring(0,12);
        slotEl.classList.add('has-item',item.rarity);
        
        // Build tooltip with display:none
        const statsHtml=Object.entries(item.stats||{})
          .map(([k,v])=>`<div class="tooltip-stat">+${v} ${k.toUpperCase()}</div>`)
          .join('');
        
        const rarity=RARITY[item.rarity]||RARITY.normal;
        const tooltip=`
          <div class="equip-tooltip" style="display:none;">
            <div style="color:${rarity.color};font-weight:600;">${item.name}</div>
            <div style="color:${rarity.color};font-size:0.8em;margin:3px 0;">${rarity.label}</div>
            ${statsHtml}
            <div style="color:#888;font-size:0.75em;margin-top:4px;">Sell: ${item.sellPrice}g</div>
          </div>`;
        
        // Append tooltip to slot
        slotEl.insertAdjacentHTML('beforeend', tooltip);
      }
    } else {
      nameEl.textContent='Empty';
    }
  });
}

// ── INVENTORY (STACKING) ──
function addToInventory(item){
  // Stack stackable items with same name and rarity
  if(item.stackable){
    const existing=state.inventory.find(i=>i.name===item.name&&i.rarity===item.rarity&&i.stackable&&!i.equipped);
    if(existing){existing.qty=(existing.qty||1)+(item.qty||1);renderInventory();return;}
  }
  state.inventory.push({...item,uid:item.uid||genUid()});renderInventory();
}

function switchInvTab(tab){
  currentInvTab=tab;state.invTab=tab;
  document.querySelectorAll('.inv-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(`inv-tab-${tab}`).classList.add('active');
  renderInventory();
}
function showItemPopup(source, id){
  const r_=r=>RARITY[r]||RARITY.normal;
  let item, btns='';

  if(source==='shop'){
    const all=[...SHOP_EQUIP,...SHOP_CONS];
    item=all.find(i=>i.id===id);
    if(!item)return;
    const desc=item.stats?Object.entries(item.stats).map(([k,v])=>`<div class="tooltip-stat">+${v} ${k.toUpperCase()}</div>`).join(''):
      item.effect?`<div class="tooltip-stat">Restore ${item.val} ${item.effect==='both'?'HP+MP':item.effect.toUpperCase()}</div>`:'';
    btns=`<button class="start-btn" onclick="buyShopItem('${item.id}');closeItemPopup()">💰 Buy (${item.price}g)</button>`;
    showPopup(item, desc, btns);
  } else {
    item=state.inventory.find(i=>i.uid===id);
    if(!item)return;
    const statsHtml=item.stats?Object.entries(item.stats).map(([k,v])=>`<div class="tooltip-stat">+${v} ${k.toUpperCase()}</div>`).join(''):
      item.effect?`<div class="tooltip-stat">Restore ${item.val} ${item.effect==='both'?'HP+MP':item.effect.toUpperCase()}</div>`:'';
    if(item.category==='equipment'){
  btns=item.equipped
    ?`<button class="start-btn red-btn" onclick="unequipSlot('${item.slot}');closeItemPopup()">Unequip</button>`
    :`<button class="start-btn blue-btn" onclick="equipItem(${item.uid});closeItemPopup()">Equip</button>`;
  btns+=`<button class="start-btn purple-btn" onclick="closeItemPopup();openEnhance(${item.uid})">⚒️ Enhance</button>`;
}
    if(item.category==='consumable'){
      btns+=`<button class="start-btn" onclick="useItem(${item.uid});closeItemPopup()">Use</button>`;
    }
    if(!item.equipped){
      btns+=`<button class="start-btn red-btn" onclick="sellItem(${item.uid});closeItemPopup()">Sell ${item.stackable&&item.qty>1?'All':''} (${(item.sellPrice||0)*(item.stackable?item.qty:1)}g)</button>`;
    }
    showPopup(item, statsHtml, btns);
  }
}

function showPopup(item, statsHtml, btns){
  const r=RARITY[item.rarity]||RARITY.normal;
  document.getElementById('item-popup-content').innerHTML=`
    <div style="text-align:center;margin-bottom:10px;">
      <div style="font-size:2.5em;">${item.name.split(' ')[0]}</div>
      <div style="color:${r.color};font-family:'Cinzel',serif;font-size:1em;font-weight:600;">${item.name}</div>
      <div style="color:${r.color};font-size:.78em;">${r.label}</div>
    </div>
    <div style="margin:10px 0;">${statsHtml}</div>
    <div style="color:#888;font-size:.75em;margin-bottom:12px;">Sell: ${item.sellPrice||0}g</div>
    <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">${btns}</div>
    <div style="margin-top:8px;text-align:center;">
      <button class="start-btn" style="background:rgba(255,255,255,.1);color:#aaa;" onclick="closeItemPopup()">✖ Close</button>
    </div>`;
  document.getElementById('item-popup').style.display='flex';
}

function closeItemPopup(){
  document.getElementById('item-popup').style.display='none';
}
function renderInventory(){
  const list=document.getElementById('inventory-list');
  const items=state.inventory.filter(i=>i.category===currentInvTab);
  if(!items.length){list.innerHTML='<div class="inv-empty">No items here</div>';return;}
  list.innerHTML=`
    <div class="item-grid">
      ${items.map(item=>{
        const stackBadge=item.stackable&&item.qty>1?`<div class="item-icon-stack">×${item.qty}</div>`:'';
        const equippedBadge=item.equipped?`<div class="item-icon-equipped">E</div>`:'';
        const enh=item.enhLevel||0;
        const enhBadge=enh>0?`<div class="item-icon-stack" style="top:2px;left:3px;right:auto;color:${enh>=7?'var(--legendary)':'var(--gold)'}">+${enh}</div>`:'';
        const glowClass=enh>=15?'enh-glow-15':enh>=7?'enh-glow-7':'';
        return `<div class="item-icon-box ${item.rarity} ${glowClass}" onclick="showItemPopup('inv',${item.uid})" title="${item.name}">
          <div class="item-icon-emoji">${item.name.split(' ')[0]}</div>
          ${stackBadge}${equippedBadge}${enhBadge}
        </div>`;
      }).join('')}
    </div>`;
}

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num;
}

// ── ENHANCEMENT ──
const ENHANCE_COST=[0,500,1000,2000,3500,5000,8000,12000,18000,25000,35000,50000,70000,100000,150000,200000];
const ENHANCE_RATE=[0,100,95,85,75,65,55,45,35,25,25,25,25,25,25,25];

function openEnhance(uid){
  const item=state.inventory.find(i=>i.uid===uid);
  if(!item||item.category!=='equipment')return;
  document.getElementById('enhance-screen').style.display='block';
  renderEnhanceScreen(uid);
}

function closeEnhance(){
  document.getElementById('enhance-screen').style.display='none';
}
function renderEnhanceScreen(uid){
  const item=state.inventory.find(i=>i.uid===uid);
  if(!item)return;
  const r=RARITY[item.rarity]||RARITY.normal;
  const enh=item.enhLevel||0;
  const maxed=enh>=15;
  const cost=ENHANCE_COST[enh+1]||0;
  const rate=ENHANCE_RATE[enh+1]||0;

  const pips=Array.from({length:15},(_,i)=>{
    let cls='pip-empty';
    if(i<enh)cls=enh>=11?'pip-high':'pip-filled';
    return `<div class="enhance-pip ${cls}"></div>`;
  }).join('');

  const statsHtml=Object.entries(item.stats||{})
    .map(([k,v])=>`<div class="enhance-stat-line">+${v<1?v.toFixed(3):v} ${k.toUpperCase()}</div>`)
    .join('');

  const nextStatsHtml=Object.entries(item.stats||{})
    .map(([k,v])=>{
      const next=v<1?Math.round(v*1.15*1000)/1000:Math.floor(v*1.15);
      return `<div class="enhance-stat-line" style="color:var(--green)">+${v<1?next.toFixed(3):next} ${k.toUpperCase()}</div>`;
    }).join('');

  document.getElementById('enhance-screen').innerHTML=`
    <div class="enhance-container">
      <div class="enhance-title">⚒️ Enhancement</div>
      <div class="enhance-item-card">
        <div class="enhance-item-name" style="color:${r.color}">
          ${item.name}
          ${enh>0?`<span class="enh-badge ${enh>=7?'enh-high':'enh-low'}">+${enh}</span>`:''}
        </div>
        <div style="color:${r.color};font-size:.75em;text-align:center;margin-bottom:8px;">${r.label}</div>
        <div class="enhance-level-bar">${pips}</div>
        <div style="text-align:center;font-size:.72em;color:#888;margin-top:4px;">Level ${enh} / 15</div>
        ${!maxed?`
        <div class="enhance-stats-row">
          <div class="enhance-stats-col">
            <div class="enhance-stats-title">Current</div>
            ${statsHtml}
          </div>
          <div class="enhance-arrow">→</div>
          <div class="enhance-stats-col">
            <div class="enhance-stats-title" style="color:var(--green)">After +${enh+1}</div>
            ${nextStatsHtml}
          </div>
        </div>`:'<div style="text-align:center;color:var(--legendary);font-family:Cinzel,serif;margin:12px 0;">✨ MAX ENHANCED!</div>'}
        ${!maxed?`
        <div class="enhance-cost-box">
          <div class="enhance-cost-title">Enhancement +${enh+1}</div>
          <div class="enhance-cost-row"><span>💰 Cost</span><span style="color:${state.gold>=cost?'var(--green)':'var(--red)'}">${cost.toLocaleString()}g</span></div>
          <div class="enhance-cost-row"><span>✅ Success Rate</span><span style="color:${rate>=80?'var(--green)':rate>=50?'var(--gold)':'var(--red)'}">${rate}%</span></div>
          <div class="enhance-cost-row"><span>❌ Fail Effect</span><span style="color:var(--red)">${enh>0?`Drop to +${enh-1}`:'Nothing'}</span></div>
          <div class="enhance-cost-row"><span>💰 Your Gold</span><span>${state.gold.toLocaleString()}g</span></div>
        </div>
        <div style="text-align:center;margin-top:12px;">
          <button class="enhance-btn ${state.gold<cost?'enhance-btn-disabled':''}"
            onclick="doEnhance(${uid})" ${state.gold<cost?'disabled':''}>
            ⚒️ Enhance +${enh+1}
          </button>
        </div>`:''}
      </div>
      <div style="text-align:center;margin-top:12px;">
        <button class="start-btn" onclick="closeEnhance()">✅ Close</button>
      </div>
    </div>`;
}

function doEnhance(uid){
  const item=state.inventory.find(i=>i.uid===uid);
  if(!item)return;
  const enh=item.enhLevel||0;
  if(enh>=15){notify('Already max enhanced!','var(--gold)');return;}
  const cost=ENHANCE_COST[enh+1];
  const rate=ENHANCE_RATE[enh+1];
  if(state.gold<cost){notify('Not enough gold!','var(--red)');return;}

  state.gold-=cost;
  
  // ✅ If equipped, REMOVE old bonuses first
  if(item.equipped){
    Object.entries(item.stats||{}).forEach(([k,v])=>{
      const equipKey='equip'+k.charAt(0).toUpperCase()+k.slice(1);
      state[equipKey]=Math.max(0,(state[equipKey]||0)-v);
    });
  }
  
  const success=Math.random()*100<rate;

  if(success){
    Object.keys(item.stats||{}).forEach(k=>{
      if(item.stats[k]<1){
        item.stats[k]=Math.round(item.stats[k]*1.15*1000)/1000;
      } else {
        item.stats[k]=Math.floor(item.stats[k]*1.15);
      }
    });
    item.enhLevel=(enh+1);
    addLog(`⚒️ Enhancement SUCCESS! ${item.name} is now +${item.enhLevel}!`,'gold');
    notify(`✨ SUCCESS! +${item.enhLevel}!`,'var(--gold)');
    playSound('snd-levelup');
  } else {
    if(enh>0){
      Object.keys(item.stats||{}).forEach(k=>{
        if(item.stats[k]<1){
          item.stats[k]=Math.round(item.stats[k]/1.15*1000)/1000;
        } else {
          item.stats[k]=Math.floor(item.stats[k]/1.15);
        }
      });
      item.enhLevel=enh-1;
      addLog(`💔 Enhancement FAILED! ${item.name} dropped to +${item.enhLevel}!`,'bad');
      notify(`💔 FAILED! Dropped to +${item.enhLevel}!`,'var(--red)');
    } else {
      addLog(`💔 Enhancement FAILED! Nothing happened.`,'bad');
      notify('💔 FAILED! Nothing happened.','var(--red)');
    }
    playSound('snd-death');
  }

  // ✅ If equipped, ADD new bonuses back
  if(item.equipped){
    Object.entries(item.stats||{}).forEach(([k,v])=>{
      const equipKey='equip'+k.charAt(0).toUpperCase()+k.slice(1);
      state[equipKey]=(state[equipKey]||0)+v;
    });
  }

  if(item.equipped)calcStats();
  updateUI();
  renderInventory();
  renderEnhanceScreen(uid);
}

function useItem(uid){
  
  const idx=state.inventory.findIndex(i=>i.uid===uid);if(idx===-1)return;
  const item=state.inventory[idx];

  // ── TREASURE BOX ──
  if(item.effect === 'treasure'){
    openTreasureBox(item);
    state.inventory.splice(idx, 1);
    renderInventory();
    updateUI();
    return;
  }
  if(item.category==='consumable'){
    if(item.effect==='hp'||item.effect==='both'){state.hp=Math.min(state.maxHp,state.hp+(item.val||40));addLog(`Used ${item.name}: +${item.val} HP`,'good');playSound('snd-heal');spawnDmgFloat(`+${item.val}HP`,false,'heal-float');}
    if(item.effect==='mp'||item.effect==='both'){state.mp=Math.min(state.maxMp,state.mp+(item.val||30));addLog(`Used ${item.name}: +${item.val} MP`,'info');spawnDmgFloat(`+${item.val}MP`,false,'mp-float');}
    if(item.stackable&&item.qty>1){item.qty--;}else{state.inventory.splice(idx,1);}
    renderInventory();updateUI();
  }
}

function openTreasureBox(box) {
  const stageId = box.stageId || 1;
  const table = TREASURE_TABLES[stageId];
  if (!table) return;

  const diff = DIFFICULTY[box.difficulty || 'normal'];
  const slots = ['weapon','armor','helmet','boots','ring','amulet'];
  const items = [];

  for (let i = 0; i < table.rolls; i++) {
    // Roll rarity based on box tier
    let rarity = rollTreasureRarity(table.tier);
    // Apply difficulty bonus on top
    rarity = applyRarityBonus(rarity);
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const item = mkEquipDrop(slot, rarity);
    addToInventory(item);
    items.push(item);
    if(item.rarity === 'legendary') state.quests.legendary.done = true;
  }

  // Gold reward scales with stage and difficulty
  const bonusGold = Math.floor(1000 * stageId * diff.goldMult);
  state.gold += bonusGold;

  // Show results
  const r_ = r => RARITY[r] || RARITY.normal;
  notify(`📦 Chest opened! ${items.length} items found!`, 'var(--gold)');
  addLog(`📦 ${box.name} opened!`, 'legendary');
  items.forEach(item => {
    addLog(`  ${item.name} [${r_(item.rarity).label}]`,
      item.rarity==='legendary'?'legendary':
      item.rarity==='epic'?'epic':'gold');
  });
  addLog(`💰 +${formatNumber(bonusGold)} Gold!`, 'gold');

  playSound('snd-levelup');
  spawnParticles(window.innerWidth/2, window.innerHeight/2, '#f0c040', 20);
  renderInventory();
  updateUI();
  renderQuests();
}

function sellItem(uid){
  const idx=state.inventory.findIndex(i=>i.uid===uid);if(idx===-1)return;
  const item=state.inventory[idx];
  if(item.equipped)return;
  const total=(item.sellPrice||0)*(item.stackable?item.qty:1);
  state.gold+=total;addLog(`Sold ${item.name}${item.stackable&&item.qty>1?` ×${item.qty}`:''}for ${total}g`,'gold');
  state.inventory.splice(idx,1);renderInventory();updateUI();
  if(state.gold>=50)state.quests.gold50.done=true;renderQuests();
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
  let totalGold=0;let count=0;
  const toSell=state.inventory.filter(i=>{
    if(i.equipped)return false;
    if(i.category!=='equipment'&&i.category!=='material')return false;
    if(state.autoSell.normal&&i.rarity==='normal')return true;
    if(state.autoSell.uncommon&&i.rarity==='uncommon')return true;
    if(state.autoSell.rare&&i.rarity==='rare')return true;
    if(state.autoSell.epic&&i.rarity==='epic')return true;
    return false;
  });
  toSell.forEach(item=>{
    const total=(item.sellPrice||0)*(item.stackable?item.qty:1);
    totalGold+=total;count++;
    const idx=state.inventory.findIndex(i=>i.uid===item.uid);
    if(idx!==-1)state.inventory.splice(idx,1);
  });
  if(count>0){addLog(`🗑️ Auto-sold ${count} junk items for ${totalGold}g!`,'gold');state.gold+=totalGold;notify(`🗑️ Auto-sold ${count} items for ${totalGold}g`,'var(--gold)');renderInventory();updateUI();}
}
function autoSellNow(){
  autoSellAfterCombat();
  if(!document.getElementById('as-normal').checked&&!document.getElementById('as-uncommon').checked){notify('Enable auto-sell toggles first!','var(--red)');}
}

// ── CRAFTING ──
function openCrafting(){
  document.getElementById('craft-screen').style.display='block';renderCrafting();
}
function closeCrafting(){document.getElementById('craft-screen').style.display='none';}
function getMaterialQty(name){
  const item=state.inventory.find(i=>i.name===name&&i.stackable);
  return item?item.qty:0;
}
function renderCrafting(){
  const grid=document.getElementById('craft-grid');
  const r_=r=>RARITY[r]||RARITY.normal;
  grid.innerHTML=CRAFTING.map(recipe=>{
    const result=recipe.result;
    const rColor=r_(result.rarity).color;
    const reqHtml=recipe.req.map(r=>{
      const have=r.name.includes('Crystal')||r.name.includes('Essence')||r.name.includes('Soul')||r.name.includes('Horn')||r.name.includes('Shard')||r.name.includes('Core')||r.name.includes('Feather')||r.name.includes('Flame')||r.name.includes('Fragment')||r.name.includes('Gem')||r.name.includes('Scale')||r.name.includes('Silk')||r.name.includes('Fang')||r.name.includes('Ink')||r.name.includes('Vial')||r.name.includes('Shard')||r.name.includes('Moon')||r.name.includes('Orc')||r.name.includes('Stone')||r.name.includes('Void')||r.name.includes('Chaos')||r.name.includes('Titan')||r.name.includes('Death')||r.name.includes('Divine')||r.name.includes('Dragon')||r.name.includes('Demon')||r.name.includes('Phoenix')||true?getMaterialQty(r.name):0;
      const ok=have>=r.qty;
      return `<div class="${ok?'ok':'no'}">• ${r.name}: ${have}/${r.qty} ${ok?'✅':'❌'}</div>`;
    }).join('');
    const canCraft=recipe.req.every(r=>getMaterialQty(r.name)>=r.qty);
    return `<div class="craft-card">
      <div class="craft-result" style="color:${rColor}">${result.name||result.slot} — <span style="color:${rColor}">${r_(result.rarity).label}</span></div>
      <div style="font-size:.78em;color:#888;margin-bottom:5px;">${recipe.desc}</div>
      <div class="craft-req">${reqHtml}</div>
      <button class="craft-btn" onclick="craftItem('${recipe.id}')" ${canCraft?'':'disabled'}>⚗️ Craft</button>
    </div>`;}).join('');
}
function craftItem(recipeId){
  const recipe=CRAFTING.find(r=>r.id===recipeId);if(!recipe)return;
  if(!recipe.req.every(r=>getMaterialQty(r.name)>=r.qty)){notify('Missing materials!','var(--red)');return;}
  // Consume materials
  recipe.req.forEach(req=>{
    let need=req.qty;
    state.inventory.forEach(item=>{
      if(item.name===req.name&&item.stackable&&need>0){
        const take=Math.min(item.qty,need);item.qty-=take;need-=take;
      }
    });
    state.inventory=state.inventory.filter(i=>!i.stackable||(i.qty||0)>0);
  });
  // Create result
  const result={...recipe.result,uid:genUid(),sellPrice:Math.round((RARITY[recipe.result.rarity]?.mult||1)*15*state.level*.5)};
  if(result.stackable)result.qty=1;
  if(result.category==='equipment')result.equipped=false;
  addToInventory(result);
  state.quests.craft.done=true;
  addLog(`⚗️ Crafted: ${result.name}!`,result.rarity==='legendary'?'legendary':'purple');
  notify(`⚗️ Crafted ${result.name}!`,'var(--purple)');
  playSound('snd-craft');renderCrafting();renderInventory();renderQuests();
}

// ── SHOP ──
function switchShopTab(tab){
  currentShopTab=tab;
  document.querySelectorAll('.shop-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(`shop-tab-${tab}`).classList.add('active');
  renderShop();
}
function renderShop(){
  const items=currentShopTab==='equipment'?SHOP_EQUIP:SHOP_CONS;
  const r_=r=>RARITY[r]||RARITY.normal;
  document.getElementById('shop-content').innerHTML=`
    <div class="item-grid">
      ${items.map(item=>{
        const r=r_(item.rarity);
        return `<div class="item-icon-box ${item.rarity}" onclick="showItemPopup('shop','${item.id}')" title="${item.name}">
          <div class="item-icon-emoji">${item.name.split(' ')[0]}</div>
          <div class="item-icon-price">💰${item.price}</div>
        </div>`;
      }).join('')}
    </div>`;
}
function buyShopItem(itemId){
  const all=[...SHOP_EQUIP,...SHOP_CONS];const item=all.find(i=>i.id===itemId);if(!item)return;
  if(state.gold<item.price){addLog(`Not enough gold!`,'bad');return;}
  state.gold-=item.price;
  if(item.slot){addToInventory({uid:genUid(),name:item.name,category:'equipment',slot:item.slot,rarity:item.rarity||'normal',stats:{...item.stats},equipped:false,sellPrice:Math.floor(item.price*.5)});}
  else{addToInventory({uid:genUid(),name:item.name,category:'consumable',rarity:item.rarity||'normal',effect:item.effect,val:item.val,sellPrice:Math.floor(item.price*.4),stackable:true,qty:1});}
  addLog(`Bought ${item.name} for ${item.price}g!`,'gold');updateUI();
  if(state.gold>=50)state.quests.gold50.done=true;renderQuests();
}

// ── QUESTS ──
function renderQuests(){
  document.getElementById('quest-list').innerHTML=Object.values(state.quests).map(q=>`
    <div class="quest-item ${q.done?'quest-done':''}">${q.done?'✅':''} ${q.text}</div>`).join('');
}

// ── LOGS ──
function addLog(msg,type=''){const b=document.getElementById('log-box');const d=document.createElement('div');d.className=`log-entry ${type?'log-'+type:''}`;d.textContent=msg;b.appendChild(d);b.scrollTop=b.scrollHeight;}
function addCombatLog(msg,type=''){const b=document.getElementById('combat-log');const d=document.createElement('div');d.className=`log-entry ${type?'log-'+type:''}`;d.textContent=msg;b.appendChild(d);b.scrollTop=b.scrollHeight;}

// ── UPDATE UI ──
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
 
  // Primary stats
  document.getElementById('str-val').textContent=formatNumber(state.str);
  document.getElementById('agi-val').textContent=formatNumber(state.agi);
  document.getElementById('int-val').textContent=formatNumber(state.int);
  document.getElementById('sta-val').textContent=formatNumber(state.sta);
 
  // Derived stats
  document.getElementById('atk-val').textContent=formatNumber(state.attackPower);
  document.getElementById('armor-val').textContent=formatNumber(state.armor);
  document.getElementById('crit-val').textContent=state.crit+'%';
  document.getElementById('dodge-val').textContent=formatNumber(state.dodge);
  document.getElementById('hit-val').textContent=formatNumber(state.hit);
  document.getElementById('hpregen-val').textContent=formatNumber(state.hpRegen);
  document.getElementById('mpregen-val').textContent=formatNumber(state.manaRegen);
  document.getElementById('lifesteal-val').textContent=(state.lifeSteal*100).toFixed(1)+'%';
 
  document.getElementById('char-level').textContent=`Level ${state.level} / 100`;
  document.getElementById('hp-bar').style.width=Math.max(0,(hp/state.maxHp)*100)+'%';
  document.getElementById('mp-bar').style.width=Math.max(0,(mp/state.maxMp)*100)+'%';
  document.getElementById('xp-bar').style.width=Math.min(100,(state.xp/state.xpNext)*100)+'%';
  document.getElementById('arena-player-hp').style.width=Math.max(0,(hp/state.maxHp)*100)+'%';
}

// ── SAVE / LOAD ──
async function saveGame(){
  await saveToCloud();
}
async function loadGame(){
  await loadFromCloud();
}
// Save game to Supabase
async function saveToCloud() {
  if (!state.name) {
    alert("No character found! Please start a game first.");
    return;
  }

  const { error } = await dbClient
    .from("game_saves")
    .upsert({ player_name: state.name, game_state: state, updated_at: new Date() },
             { onConflict: "player_name" });

  if (error) {
    alert("❌ Cloud save failed: " + error.message);
  } else {
    addLog('💾 Game saved to cloud!', 'gold');
    alert("✅ Game saved to cloud!");
  }
}

// Load game from Supabase
async function loadFromCloud() {
  const playerName = prompt("Enter your character name to load:");
  if (!playerName) return;

  console.log("Trying to load:", playerName);

  const { data, error } = await dbClient
    .from("game_saves")
    .select("game_state")
    .eq("player_name", playerName)
    .single();

  console.log("Data:", data);
  console.log("Error:", error);

  if (error || !data) {
    alert("❌ No cloud save found for: " + playerName);
  } else {
    // Load directly into state instead of reloading
    Object.assign(state, data.game_state);
    localStorage.setItem("rpgSave5", JSON.stringify(state));
    showGame();
    loadScene(state.currentScene || 'town');
    addLog(`☁️ Cloud save loaded! Welcome back ${state.name}!`, 'gold');
    alert("✅ Game loaded from cloud!");
  }
}

async function registerUser() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const name = document.getElementById('name-input').value.trim();
  const msg = document.getElementById('auth-msg');

  if (!email || !password || !name) { msg.textContent = 'Please fill in all fields!'; return; }

  const { error } = await dbClient.auth.signUp({ email, password });
  if (error) { msg.textContent = '❌ ' + error.message; return; }

  state.name = name;
  await saveToCloud();
  msg.style.color = '#44ff44';
  msg.textContent = '✅ Registered! Starting game...';
  setTimeout(() => startGame(), 1000);
}

async function loginUser() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const name = document.getElementById('name-input').value.trim();
  const msg = document.getElementById('auth-msg');

  if (!email || !password) { msg.textContent = 'Please enter email and password!'; return; }

  const { error } = await dbClient.auth.signInWithPassword({ email, password });
  if (error) { msg.textContent = '❌ ' + error.message; return; }

  // Use name from input if provided, otherwise prompt
  if (name) {
    const { data, error: loadError } = await dbClient
      .from("game_saves")
      .select("game_state")
      .eq("player_name", name)
      .single();

    if (loadError || !data) {
      msg.textContent = '❌ No save found for: ' + name;
    } else {
      Object.assign(state, data.game_state);
      showGame();
      loadScene(state.currentScene || 'town');
      addLog(`☁️ Welcome back ${state.name}!`, 'gold');
    }
  } else {
    await loadFromCloud();
  }
}

// ── LEADERBOARD ──
async function fetchLeaderboard(){
  try{
    document.getElementById('lb-list').innerHTML='<div class="lb-empty">Loading...</div>';
    const { data, error } = await dbClient
      .from('leaderboard')
      .select('*')
      .order('level', { ascending: false })
      .order('gold', { ascending: false })
      .limit(20);
    if(error)throw error;
    renderLeaderboard(data||[]);
  }catch(e){
    document.getElementById('lb-list').innerHTML='<div class="lb-empty">Could not load leaderboard.</div>';
  }
}

async function submitScore(){
  if(!state.name){alert('Start the game first!');return;}
  try{
    const { error } = await dbClient
      .from('leaderboard')
      .upsert({
        player_name: state.name,
        level: state.level,
        gold: state.gold,
        class: state.class ? CLASSES[state.class].name : 'Adventurer',
        date: new Date().toLocaleDateString(),
        updated_at: new Date()
      }, { onConflict: 'player_name' });
    if(error)throw error;
    addLog('🏆 Score submitted!','gold');
    notify('🏆 Score submitted!','var(--gold)');
    fetchLeaderboard();
  }catch(e){
    alert('Could not submit score: ' + e.message);
  }
}

function renderLeaderboard(scores){
  const list=document.getElementById('lb-list');
  if(!scores||!scores.length){list.innerHTML='<div class="lb-empty">No scores yet! 🏆</div>';return;}
  const medals=['🥇','🥈','🥉'];
  const cls=['gold','silver','bronze'];
  list.innerHTML=scores.map((s,i)=>`
    <div class="lb-row">
      <div class="lb-rank ${cls[i]||''}">${medals[i]||'#'+(i+1)}</div>
      <div class="lb-name">${s.player_name}</div>
      <div class="lb-class">${s.class||'Adventurer'}</div>
      <div class="lb-level">⭐ Lv.${s.level}</div>
      <div class="lb-gold-col">💰 ${formatNumber(s.gold)}g</div>
    </div>`).join('');
}

// Click sound
const clickSnd=document.getElementById('clickSound');
document.addEventListener('click',e=>{if(['BUTTON','A'].includes(e.target.tagName)){if(clickSnd){clickSnd.currentTime=0;clickSnd.play().catch(()=>{});}}});
