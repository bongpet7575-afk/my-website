
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
  // BONUS TRACKING (NEW)
  classBonuses: {
    strMult: 0, agiMult: 0, intMult: 0, staMult: 0,
    hitMult: 0, critMult: 0, dodgeMult: 0, hpRegenMult: 0,
    mpRegenMult: 0, armorMult: 0, mpMult: 0, lifeStealMult: 0
  },
  talentBonuses: {
    strMult: 0, agiMult: 0, intMult: 0, staMult: 0,
    hitMult: 0, critMult: 0, dodgeMult: 0, hpRegenMult: 0,
    mpRegenMult: 0, armorMult: 0, mpMult: 0, lifeStealMult: 0
  },

  // EQUIPMENT BONUSES (applied on top of base * mult)
  equipStr:0, equipAgi:0, equipInt:0, equipSta:0,
  equipMaxMp:0, equipMaxHp:0, equipArmor:0, equipCrit:0, equipDodge:0,equipLifeSteal:0,equipAttackPower:0,equipHpRegen:0,equipMpRegen:0,hpRegen:0,manaRegen:0,equipHit:0,lifeSteal:0,lifeStealMult:1.0,
 
  // Track talent-based gold multiplier separately
  name:'',level:9,xp:0,xpNext:100,maxLevel:100,
  hp:100,maxHp:100,mp:50,maxMp:50,hit:10,crit:5,dodge:5,hpRegen:20,lifeSteal:0.01,
 
  // PRIMARY BASE STATS (raw - leveled up, never modified directly by class/talent)
  baseStr:5,baseAgi:5,baseInt:5,baseSta:5,baseArmor:5,baseHit:10,baseCrit:0,baseDodge:2,baseHpRegen:20,baseLifeSteal:0.01,
 
  // STAT MULTIPLIERS (class + talent % bonuses, starts at 1.0 = 100%)
  strMult:1.0,agiMult:1.0,intMult:1.0,staMult:1.0,armorMult:1.0,hpRegenMult:1.0,mpMult:1.0,critMult:1.0,dodgeMult:1.0,mpRegenMult:1.0,hitMult:1.0,lifeStealMult:1.0,skillStrMult:1.0,skillStaMult:1.0,skillMaxHp:1.0,skillArmorMult:1.0,
 
  // EFFECTIVE STATS (calculated by calcStats from base * mult)
  str:5,agi:5,int:5,armor:2,sta:5,hit:5,crit:2,dodge:2,lifeSteal:0.01,
  gold:300,goldMult:1.0,difficulty:'normal',
 
  // DERIVED STATS (calculated automatically by calcStats)
  attackPower:0,attackMult:1.0,armor:0,crit:0,critMult:1.0,
  dodge:0,dodgeMult:1.0,hpRegen:0,manaRegen:0,mpMult:1.0,hitMult:1.0,lifeSteal:0,lifeStealMult:1.0,
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
  // Apply multipliers to base stats → effective stats
  state.str  = Math.floor(state.baseStr  * state.strMult) + (state.equipStr||0);
  state.agi  = Math.floor(state.baseAgi  * state.agiMult) + (state.equipAgi||0);
  state.int  = Math.floor(state.baseInt  * state.intMult) + (state.equipInt||0);
  state.sta  = Math.floor(state.baseSta  * state.staMult) + (state.equipSta||0);
  
  // STR + INT → Attack Power
  state.attackPower = Math.floor((state.str * 2 * state.attackMult)+(state.int * 2 * state.attackMult*0.5)) + (state.equipAttackPower||0);

  // STR + STA → Max HP
  state.maxHp = Math.floor(50 + (state.str * 10) + (state.sta * 15) + (state.level * 20)) + (state.equipMaxHp||0);
  
  // AGI + baseArmor → Armor (with armorMult + equipment bonus)
  state.armor = Math.floor((state.agi * 0.5 + state.baseArmor) * state.armorMult) + (state.equipArmor||0);
  
  // AGI → Crit% Hit% and Dodge%
//  state.crit  = Math.floor((state.agi * 0.1 * state.baseCrit) * state.critMult) + (state.equipCrit||0);
  state.crit  = Math.floor(state.critMult) + (state.equipCrit);
  state.dodge = Math.floor((state.agi * 0.1 * state.baseDodge) * state.dodgeMult) + (state.equipDodge||0);
//  state.hit = Math.floor(state.equipHit);
  state.hit = Math.floor((state.agi * 0.1 * state.baseHit) * state.hitMult) + (state.equipHit||0);

  // INT → Max MP and Mana Regen
  state.maxMp     = Math.floor((50 + (state.int * 3)) * state.mpMult) + (state.equipMaxMp||0);
  state.manaRegen = Math.floor((0.5 + (state.int * 2)) * state.mpRegenMult) + (state.equipMpRegen||0);

  // STA → HP Regen
  state.hpRegen = Math.floor((state.sta * 0.1 * (state.baseHpRegen)) * state.hpRegenMult) + (state.equipHpRegen||0);

  // LifeSteal
  state.lifeSteal = (state.equipLifeSteal||0);

  // Clamp hp/mp
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
            state.baseCrit+=0;
            state.talentBonuses.critMult = (state.talentBonuses.critMult || 0) + 0.01;
          }},
        {id:'cleave',name:'Brute Force',desc:'20% CRIT per rank',cost:10,ranks:5,
          effect:()=>{
            state.talentBonuses.critMult = (state.talentBonuses.critMult || 0) + 0.02;
          }},
        {id:'execute',name:'Killing Blow',desc:'30% CRIT per rank',cost:20,ranks:3,
          effect:()=>{
            state.talentBonuses.critMult = (state.talentBonuses.critMult || 0) + 0.03;
          }},
      ]},
      tank:{name:'🛡️ Tank',talents:[
        {id:'iron_skin',name:'Iron Skin',desc:'10% ARMOR per rank',cost:5,ranks:10,
          effect:()=>{
            state.talentBonuses.armorMult = (state.talentBonuses.armorMult || 0) + 0.1;
          }},
        {id:'fortress',name:'Iron Fortress',desc:'20% ARMOR per rank',cost:10,ranks:5,
          effect:()=>{
            state.talentBonuses.armorMult = (state.talentBonuses.armorMult || 0) + 0.2;
          }},
        {id:'shield_wall',name:'Hardened Skin',desc:'30% ARMOR per rank',cost:20,ranks:3,
          effect:()=>{
            state.talentBonuses.armorMult = (state.talentBonuses.armorMult || 0) + 0.3;
          }},
      ]},
      heal:{name:'💚 Self Heal',talents:[
        {id:'second_wind',name:'Tough Body',desc:'10% HP regen per rank',cost:5,ranks:10,
          effect:()=>{
            state.talentBonuses.hpRegenMult = (state.talentBonuses.hpRegenMult || 0) + 0.1;
          }},
        {id:'undying',name:'Endurance',desc:'20% HP regen per rank',cost:10,ranks:5,
          effect:()=>{
            state.talentBonuses.hpRegenMult = (state.talentBonuses.hpRegenMult || 0) + 0.2;
          }},
        {id:'regeneration',name:'Vitality',desc:'30% HP regen per rank',cost:20,ranks:3,
          effect:()=>{
            state.talentBonuses.hpRegenMult = (state.talentBonuses.hpRegenMult || 0) + 0.3;
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
            state.talentBonuses.critMult = (state.talentBonuses.critMult || 0) + 0.01;
          }},
        {id:'ignite',name:'Burning Mind',desc:'2% CRIT per rank',cost:10,ranks:5,
          effect:()=>{
            state.talentBonuses.critMult = (state.talentBonuses.critMult || 0) + 0.02;
          }},
        {id:'meteor',name:'Arcane Intellect',desc:'3% CRIT per rank',cost:20,ranks:3,
          effect:()=>{
            state.talentBonuses.critMult = (state.talentBonuses.critMult || 0) + 0.03;
          }},
      ]},
      ice:{name:'❄️ Ice',talents:[
        {id:'frost',name:'Frost Barrier',desc:'1% DODGE per rank',cost:5,ranks:10,
          effect:()=>{
            state.talentBonuses.dodgeMult = (state.talentBonuses.dodgeMult || 0) + 0.01;
          }},
        {id:'ice_armor',name:'Ice Armor',desc:'2% DODGE per rank',cost:10,ranks:5,
          effect:()=>{
            state.talentBonuses.dodgeMult = (state.talentBonuses.dodgeMult || 0) + 0.02;
          }},
        {id:'blizzard',name:'Ice Mind',desc:'3% DODGE per rank',cost:20,ranks:3,
          effect:()=>{
            state.talentBonuses.dodgeMult = (state.talentBonuses.dodgeMult || 0) + 0.03;
          }},
      ]},
      arcane:{name:'✨ Arcane',talents:[
        {id:'mana_regen',name:'Mana Pool',desc:'1% HP REGEN per rank',cost:5,ranks:10,
          effect:()=>{
            state.talentBonuses.hpRegenMult = (state.talentBonuses.hpRegenMult || 0) + 0.1;
          }},
        {id:'spell_power',name:'Spellcraft',desc:'2% HP REGEN per rank',cost:10,ranks:5,
          effect:()=>{
            state.talentBonuses.hpRegenMult = (state.talentBonuses.hpRegenMult || 0) + 0.2;
          }},
        {id:'arcane_surge',name:'Arcane Mastery',desc:'3% HP REGEN per rank',cost:20,ranks:3,
          effect:()=>{
            state.talentBonuses.hpRegenMult = (state.talentBonuses.hpRegenMult || 0) + 0.3;
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
            state.talentBonuses.critMult = (state.talentBonuses.critMult || 0) + 0.01;
          }},
        {id:'ambush',name:'Swift Strike',desc:'2% CRIT per rank',cost:10,ranks:5,
          effect:()=>{
            state.talentBonuses.critMult = (state.talentBonuses.critMult || 0) + 0.02;
          }},
        {id:'death_mark',name:'Lethal Focus',desc:'3% CRIT per rank',cost:20,ranks:3,
          effect:()=>{
            state.talentBonuses.critMult = (state.talentBonuses.critMult || 0) + 0.03;
          }},
      ]},
      subtlety:{name:'🌑 Subtlety',talents:[
        {id:'evasion',name:'Agility',desc:'1% DODGE per rank',cost:5,ranks:10,
          effect:()=>{
            state.talentBonuses.dodgeMult = (state.talentBonuses.dodgeMult || 0) + 0.01;
          }},
        {id:'smoke_bomb',name:'Nimble Feet',desc:'2% DODGE per rank',cost:10,ranks:5,
          effect:()=>{
            state.talentBonuses.dodgeMult = (state.talentBonuses.dodgeMult || 0) + 0.02;
          }},
        {id:'vanish',name:'Shadow Reflex',desc:'3% DODGE per rank',cost:20,ranks:3,
          effect:()=>{
            state.talentBonuses.dodgeMult = (state.talentBonuses.dodgeMult || 0) + 0.03;
          }},
      ]},
      poison:{name:'🐍 Poison',talents:[
        {id:'venom',name:'Toxic Edge',desc:'1% HP REGEN per rank',cost:5,ranks:10,
          effect:()=>{
            state.talentBonuses.hpRegenMult = (state.talentBonuses.hpRegenMult || 0) + 0.1;
          }},
        {id:'cripple',name:'Predator',desc:'2% HP REGEN per rank',cost:10,ranks:5,
          effect:()=>{
            state.talentBonuses.hpRegenMult = (state.talentBonuses.hpRegenMult || 0) + 0.2;
          }},
        {id:'plague',name:'Virulence',desc:'3% HP REGEN per rank',cost:20,ranks:3,
          effect:()=>{
            state.talentBonuses.hpRegenMult = (state.talentBonuses.hpRegenMult || 0) + 0.3;
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
  
  battle_cry:{name:'Battle Cry',icon:'📯',mp:()=>Math.floor(state.maxMp*0.15),cd:999,use:(e)=>{
  // ✅ Use multipliers instead of equipment bonuses
  state.strMult *= 1.5;
  state.armorMult *= 1.4;
  state.critMult *= 10;
  addCombatLog(`📯 Battle Cry! +50% STR, +40% ARMOR for this fight!`,'good');
  playSound('snd-magic');
  calcStats();
  return 0;
}},

last_stand:{name:'Last Stand',icon:'🛡️',mp:()=>Math.floor(state.maxMp*0.20),cd:2,use:(e)=>{
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
    const tickDmg=Math.floor(state.agi*0.8 + state.attackPower*0.3);
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


// ── BOSSES (one every 10 levels, up to level 100) ──
const BOSSES=[
  {id:'boss_10',levelReq:10,name:'🐉 Ancient Dragon',icon:'🐉',hp:2500,atk:250,armor:150,hit:200,dodge:200,xp:400,gold:[800,1600],
   cs:{title:'Ancient Dragon',req:'Required: Level 10',text:'The earth trembles as the Ancient Dragon awakens from its century-long slumber! Fire and fury await you, hero!'},
   loot:()=>[mkEquipDrop('weapon','epic'),mkMat('🐉 Dragon Scale','epic',60),mkMat('🔥 Dragon Flame','rare',40)]},
  {id:'boss_20',levelReq:20,name:'💀 Lich King',icon:'💀',hp:11000,atk:1100,armor:800,hit:400,dodge:400,xp:700,gold:[1500,2500],
   cs:{title:'Lich King',req:'Required: Level 20',text:'The Lich King rises from the underworld! His death magic corrupts everything it touches. Face him only if you dare!'},
   loot:()=>[mkEquipDrop('armor','epic'),mkEquipDrop('ring','rare'),mkMat('💀 Death Essence','epic',80)]},
  {id:'boss_30',levelReq:30,name:'😈 Demon Lord',icon:'😈',hp:22000,atk:3000,armor:2600,hit:800,dodge:800,xp:1000,gold:[2200,3500],
   cs:{title:'Demon Lord',req:'Required: Level 30',text:'The sky tears open! The Demon Lord descends with hellfire in his wake. This battle will echo through eternity!'},
   loot:()=>[mkEquipDrop('weapon','legendary'),mkEquipDrop('amulet','epic'),mkMat('😈 Demon Horn','legendary',150)]},
  {id:'boss_40',levelReq:40,name:'⚡ Ancient Titan',icon:'⚡',hp:35000,atk:6600,armor:5700,hit:1600,dodge:1600,xp:1400,gold:[3000,4500],
   cs:{title:'Ancient Titan',req:'Required: Level 40',text:'A god among monsters! The Ancient Titan towers over mountains. Its every step causes earthquakes. Can you really stand against it?'},
   loot:()=>[mkEquipDrop('armor','legendary'),mkEquipDrop('helmet','epic'),mkMat('⚡ Titan Soul','legendary',200)]},
  {id:'boss_50',levelReq:50,name:'🌑 Void Dragon',icon:'🌑',hp:44000,atk:6600,armor:5400,hit:2200,dodge:2200,xp:2000,gold:[4000,6000],
   cs:{title:'Void Dragon',req:'Required: Level 50',text:'From the void between worlds emerges the Void Dragon! A creature of pure darkness and chaos. Even gods fear this name!'},
   loot:()=>[mkEquipDrop('weapon','legendary'),mkEquipDrop('ring','legendary'),mkMat('🌑 Void Crystal','legendary',300)]},
  {id:'boss_60',levelReq:60,name:'🔱 Sea Leviathan',icon:'🔱',hp:80000,atk:9000,armor:8000,hit:4400,dodge:4400,xp:2800,gold:[5000,7500],
   cs:{title:'Sea Leviathan',req:'Required: Level 60',text:'The ancient seas churn as the Leviathan erupts from the deep! Sailors have feared this beast for centuries. Today you face it alone!'},
   loot:()=>[mkEquipDrop('armor','legendary'),mkEquipDrop('boots','legendary'),mkMat('🔱 Leviathan Scale','legendary',350)]},
  {id:'boss_70',levelReq:70,name:'☄️ Fallen God',icon:'☄️',hp:160000,atk:16000,armor:10000,hit:8800,dodge:8800,xp:3800,gold:[6500,9500],
   cs:{title:'Fallen God',req:'Required: Level 70',text:'A god cast down from the heavens — bitter and powerful beyond imagination! The Fallen God wants revenge on all living things. Stand firm, hero!'},
   loot:()=>[mkEquipDrop('weapon','legendary'),mkEquipDrop('amulet','legendary'),mkMat('☄️ Divine Shard','legendary',450)]},
  {id:'boss_80',levelReq:80,name:'🌀 Chaos Serpent',icon:'🌀',hp:300000,atk:22000,armor:20000,hit:16000,dodge:16000,xp:5000,gold:[8000,12000],
   cs:{title:'Chaos Serpent',req:'Required: Level 80',text:'Reality warps and tears as the Chaos Serpent slithers from between dimensions! It feeds on destruction and grows stronger from chaos itself!'},
   loot:()=>[mkEquipDrop('armor','legendary'),mkEquipDrop('ring','legendary'),mkMat('🌀 Chaos Essence','legendary',550)]},
  {id:'boss_90',levelReq:90,name:'💎 Crystal Colossus',icon:'💎',hp:600000,atk:44000,armor:40000,hit:22000,dodge:22000,xp:7000,gold:[10000,15000],
   cs:{title:'Crystal Colossus',req:'Required: Level 90',text:'The Crystal Colossus — forged from the hardest material in existence, animated by ancient magic. Its crystalline body reflects your own attacks back at you!'},
   loot:()=>[mkEquipDrop('helmet','legendary'),mkEquipDrop('boots','legendary'),mkMat('💎 Pure Crystal Core','legendary',700)]},
  {id:'boss_100',levelReq:100,name:'🌟 Eternal King',icon:'🌟',hp:1200000,atk:88000,armor:80000,hit:44000,dodge:44000,xp:15000,gold:[20000,30000],
   cs:{title:'Eternal King',req:'Required: Level 100 — FINAL BOSS',text:'The Eternal King — ruler of all realms, immortal and all-powerful. Defeating him is the ultimate achievement. Heroes who have reached this far are legends. Are you ready for your final battle?'},
   loot:()=>[mkEquipDrop('weapon','legendary'),mkEquipDrop('armor','legendary'),mkEquipDrop('ring','legendary'),mkMat('🌟 Eternal Crown','legendary',1000)]},
];

// ── NORMAL ENEMIES ──
const NORMAL_ENEMIES=[
  {id:'wolf',name:'🐺 Forest Wolf',icon:'wolf',hp:150,atk:100,armor:10,hit:10,dodge:10,xp:125,gold:[55,150],loot:()=>[mkMat('🐺Wolf Fang',rollRarity(),5)]},
  {id:'spider',name:'🕷️ Giant Spider',icon:'spider',hp:380,atk:180,armor:10,hit:15,dodge:15,xp:181,gold:[99,200],loot:()=>[mkMat('🕸️ Spider Silk',rollRarity(),6)]},
 
  {id:'goblin',name:'👹 Dungeon Goblin',icon:'goblin',hp:750,atk:220,armor:30,hit:30,dodge:30,xp:381,gold:[150,350],loot:()=>[mkEquipDrop('weapon',rollRarity()),mkEquipDrop('armor',rollRarity())]},
  {id:'skeleton',name:'💀 Skeleton',icon:'skeleton',hp:1200,atk:360,armor:50,hit:50,dodge:50,xp:551,gold:[300,550],loot:()=>[mkEquipDrop('armor',rollRarity()),mkEquipDrop('weapon',rollRarity())]},
  {id:'orc',name:'👊 Orc Warrior',icon:'orc',hp:2200,atk:480,armor:400,hit:80,dodge:80,xp:751,gold:[500,750],loot:()=>[mkEquipDrop('weapon',rollRarity()),mkMat('🪓 Orc Fragment','normal',8)]},
  {id:'golem',name:'🗿 Stone Golem',icon:'golem',hp:2900,atk:580,armor:500,xp:1201,hit:160,dodge:160,gold:[800,950],loot:()=>[mkEquipDrop('helmet',rollRarity()),mkMat('🪨 Stone Core','uncommon',15)]},
 
  {id:'vampire',name:'🧛 Vampire',icon:'vampire',hp:3900,atk:620,armor:600,hit:100,dodge:100,xp:1501,gold:[900,1250],loot:()=>[mkEquipDrop('ring',rollRarity()),mkCons('🩸 Blood Vial','uncommon',35)]},
  {id:'troll',name:'👾 Cave Troll',icon:'troll',hp:6900,atk:860,armor:110,xp:1701,hit:130,dodge:130,gold:[1200,1450],loot:()=>[mkEquipDrop('armor',rollRarity()),mkMat('💎 Troll Gem','rare',40)]},
  {id:'werewolf',name:'🐺 Werewolf',icon:'werewolf',hp:13000,atk:2000,armor:1700,hit:250,dodge:250,xp:2051,gold:[1700,1850],loot:()=>[mkEquipDrop('boots',rollRarity()),mkMat('🌕 Moon Shard','rare',45)]},

  {id:'demon_knight',name:'😈 Demon Knight',icon:'demon',hp:19500,atk:3500,armor:2600,xp:3251,hit:210,dodge:210,gold:[2100,3150],loot:()=>[mkEquipDrop('weapon','rare'),mkEquipDrop('armor',rollRarity())]},
  {id:'sea_monster',name:'🦑 Sea Monster',icon:'kraken',hp:25000,atk:5200,armor:4000,hit:300,dodge:300,xp:4501,gold:[3800,5950],loot:()=>[mkEquipDrop('amulet',rollRarity()),mkMat('🦑 Kraken Ink','epic',55)]},
  
  {id:'king_kong',name:' King Kong',icon:'kingkong',hp:33300,atk:7200,armor:5200,hit:500,dodge:500,xp:5200,gold:[7950,9250],loot:()=>[mkEquipDrop('ring',rollRarity()),mkMat('🔥 Phoenix Feather','epic',60)]},
{id:'Krud',name:' Krud',icon:'krud',hp:43300,atk:6600,armor:5500,hit:600,dodge:600,xp:7200,gold:[12050,14250],loot:()=>[mkEquipDrop('ring',rollRarity()),mkMat('🔥 Phoenix Feather','epic',70)]},
{id:'hanuman',name:' Hanuman',icon:'hanumn',hp:67300,atk:7900,armor:6500,hit:700,dodge:700,xp:9200,gold:[15950,16250],loot:()=>[mkEquipDrop('ring',rollRarity()),mkMat('🔥 Phoenix Feather','epic',80)]},
  
  {id:'phoenix',name:'🦅 Phoenix',icon:'phoenix',hp:87300,atk:9900,armor:7500,hit:900,dodge:900,xp:12200,gold:[19050,22250],loot:()=>[mkEquipDrop('ring',rollRarity()),mkMat('🔥 Phoenix Feather','epic',90)]},
];

// ── ITEM HELPERS ──
const SLOT_ICONS={weapon:'⚔️',armor:'🛡️',helmet:'⛑️',boots:'👢',ring:'💍',amulet:'📿'};
const EQUIP_PREFIXES={legendary:['Divine','Mythic','Godforged','Ancient','Eternal','Celestial'],epic:['Heroic','Valiant','Exalted','Magnificent','Radiant'],rare:['Polished','Reinforced','Enchanted','Gleaming'],uncommon:['Sturdy','Sharpened','Improved','Sturdy'],normal:['Iron','Wooden','Basic','Simple']};
const EQUIP_NAMES={weapon:['Blade','Sword','Axe','Spear','Dagger','Staff','Bow'],armor:['Plate','Chainmail','Robe','Leather','Cuirass'],helmet:['Helm','Crown','Hood','Circlet','Visor'],boots:['Greaves','Sabatons','Boots','Treads'],ring:['Band','Seal','Loop','Signet'],amulet:['Pendant','Amulet','Talisman','Necklace']};
const EQUIP_STATS={weapon:{str:[15,35], equipLifeSteal:[0.01, 0.09]},armor:{armor:[25,55], sta:[15,35],maxHp:[200,300],hpRegen:[25,75]},helmet:{armor:[35,65],int:[15,35]},boots:{agi:[15,35]},ring:{str:[15,35],int:[15,35]},amulet:{int:[25,45],maxMp:[105,205]}};

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
  town:{title:'🏘️ Town Square',text:'You stand in the peaceful town square. Merchants hawk their wares and adventurers share tales of glory.',
    choices:[
      {text:'🌲 Dark Forest',next:'forest'},{text:'⛰️ Dungeon',next:'dungeon'},
      {text:'🏔️ Mountains',next:'mountains'},{text:'🌊 Coast',next:'coast'},
      {text:'🏜️ Wasteland',next:'wasteland'},{text:'🌋 Volcanic Rift',next:'volcanic'},
      {text:'🏪 Shop',next:'shop_scene'},{text:'⛪ Inn (+9999 HP and 100 MP, 5g)',next:'inn'},
    ]},
  forest:{title:'🌲 Dark Forest',text:'Ancient trees tower overhead. Creatures lurk in every shadow.',
    choices:[
      {text:'🐺 Fight Wolf',next:'combat',enemy:'wolf'},
      {text:'🕷️ Fight Spider',next:'combat',enemy:'spider'},
      {text:'🔍 Search treasure',next:'forest_chest'},{text:'🌿 Gather herbs (+200 HP)',next:'gather_herbs'},
      {text:'🐉 Boss: Ancient Dragon (Lv10+)',next:'boss_fight',bossId:'boss_10'},
      {text:'🏘️ Town',next:'town'},
    ]},
  forest_chest:{title:'💎 Hidden Clearing',text:'You find a hidden chest buried under ancient roots!',
    choices:[{text:'📦 Open it',next:'chest_open'},{text:'🏘️ Return',next:'town'}]},
  chest_open:{title:'📦 Ancient Chest',text:'The chest opens revealing glittering treasures!',
    action:()=>{
      const g=Math.floor(Math.random()*15)+15;state.gold+=g;
      const drop=mkEquipDrop(['weapon','armor','ring','boots'][Math.floor(Math.random()*2)],rollRarity());
      addToInventory(drop);addLog(`Found ${g} gold + ${drop.name}!`,'gold');
      if(drop.rarity==='legendary'){state.quests.legendary.done=true;}
      updateUI();renderInventory();
    },
    choices:[{text:'🌲 Continue',next:'forest'},{text:'🏘️ Town',next:'town'}]},
  gather_herbs:{title:'🌿 Herb Gathering',text:'You find healing herbs and feel refreshed!',
    action:()=>{state.hp=Math.min(state.maxHp,state.hp+200);addLog('Gathered herbs: +200 HP','good');playSound('snd-heal');updateUI();},
    choices:[{text:'🌲 Continue',next:'forest'},{text:'🏘️ Town',next:'town'}]},
  dungeon:{title:'⛰️ Dungeon Depths',text:'Dark stone corridors stretch before you. Multiple passages lead into darkness.',
    choices:[
      {text:'👹 Fight Goblin',next:'combat',enemy:'goblin'},
      {text:'💀 Fight Skeleton',next:'combat',enemy:'skeleton'},
      {text:'👊 Fight Orc',next:'combat',enemy:'orc'},
      {text:'🗿 Fight Stone Golem',next:'combat',enemy:'golem'},
      {text:'💀 Boss: Lich King (Lv20+)',next:'boss_fight',bossId:'boss_20'},
      {text:'🏘️ Town',next:'town'},
    ]},
  mountains:{title:'🏔️ Frozen Mountains',text:'Cold winds cut through the air. Dangerous creatures prowl the peaks.',
    choices:[
      {text:'🧛 Fight Vampire',next:'combat',enemy:'vampire'},
      {text:'👾 Fight Cave Troll',next:'combat',enemy:'troll'},
      {text:'🐺 Fight Werewolf',next:'combat',enemy:'werewolf'},{text:'⛏️ Mine gems',next:'mine_gems'},
      {text:'😈 Boss: Demon Lord (Lv30+)',next:'boss_fight',bossId:'boss_30'},
      {text:'🏘️ Town',next:'town'},
    ]},
  mine_gems:{title:'⛏️ Crystal Cave',text:'You chip away at glittering crystal walls!',
    action:()=>{const g=Math.floor(Math.random()*20)+10;state.gold+=g;addToInventory(mkMat('💎 Mountain Crystal',rollRarity(),g));addLog(`Mined ${g}g worth of gems!`,'gold');updateUI();renderInventory();},
    choices:[{text:'🏔️ Continue',next:'mountains'},{text:'🏘️ Town',next:'town'}]},
  coast:{title:'🌊 Stormy Coast',text:'Dark waves crash against jagged rocks. Pirates and sea monsters lurk here.',
    choices:[
      {text:'😈 Fight Demon Knight',next:'combat',enemy:'demon_knight'},
      {text:'🦑 Fight Sea Monster',next:'combat',enemy:'sea_monster'},
      {text:'🏴‍☠️ Pirate treasure',next:'pirate_treasure'},
      {text:'⚡ Boss: Ancient Titan (Lv40+)',next:'boss_fight',bossId:'boss_40'},
      {text:'🌑 Boss: Void Dragon (Lv50+)',next:'boss_fight',bossId:'boss_50'},
      {text:'🏘️ Town',next:'town'},
    ]},
  pirate_treasure:{title:'🏴‍☠️ Pirate Treasure',text:'You find a washed up treasure chest!',
    action:()=>{const g=Math.floor(Math.random()*40)+20;state.gold+=g;addToInventory(mkEquipDrop('amulet',rollRarity()));addLog(`Pirate treasure: ${g} gold!`,'gold');updateUI();renderInventory();},
    choices:[{text:'🌊 Continue',next:'coast'},{text:'🏘️ Town',next:'town'}]},
  wasteland:{title:'🏜️ Barren Wasteland',text:'A desolate landscape stretches endlessly. Ancient ruins dot the horizon.',
    choices:[
      {text:'🗿 Fight King Kong',next:'combat',enemy:'king_kong'},
      {text:'🗿 Fight Krud',next:'combat',enemy:'krud'},
      {text:'🗿 Fight Hanuman',next:'combat',enemy:'hanuman'},
      {text:'🔍 Ancient ruins',next:'ancient_ruins'},
      {text:'🔱 Boss: Sea Leviathan (Lv60+)',next:'boss_fight',bossId:'boss_60'},
      {text:'🏘️ Town',next:'town'},
    ]},
  ancient_ruins:{title:'🏛️ Ancient Ruins',text:'Crumbling pillars surround a glowing altar of incredible power.',
    action:()=>{const drop=mkEquipDrop(['weapon','armor','helmet','ring','amulet'][Math.floor(Math.random()*5)],'rare');addToInventory(drop);addLog(`Found ${drop.name} in the ruins!`,'gold');updateUI();renderInventory();},
    choices:[{text:'🏜️ Continue',next:'wasteland'},{text:'🏘️ Town',next:'town'}]},
  volcanic:{title:'🌋 Volcanic Rift',text:'Rivers of lava flow through cracked earth. The most dangerous creatures live here.',
    choices:[
      {text:'🦅 Fight Phoenix',next:'combat',enemy:'phoenix'},
      {text:'☄️ Boss: Fallen God (Lv70+)',next:'boss_fight',bossId:'boss_70'},
      {text:'🌀 Boss: Chaos Serpent (Lv80+)',next:'boss_fight',bossId:'boss_80'},
      {text:'🏘️ Town',next:'town'},
    ]},
  shop_scene:{title:'🏪 General Shop',text:'The shopkeeper greets you warmly. Browse items on the right!',
    choices:[{text:'🏘️ Leave Shop',next:'town'}]},
  inn:{title:'⛪ The Rusty Flagon Inn',text:'You rest comfortably. Your wounds heal and energy is restored.',
    action:()=>{if(state.gold>=5){state.gold-=5;state.hp=Math.min(state.maxHp,state.hp+9999);state.mp=Math.min(state.maxMp,state.mp+100);addLog('Rested: +9999 HP, +100 MP. Cost 5g.','good');playSound('snd-heal');}else addLog('Need 5 gold to rest!','bad');updateUI();},
    choices:[{text:'🏘️ Return to Town',next:'town'}]},
  victory:{title:'🏆 Victory!',text:'You defeated the enemy and claimed your reward!',
    choices:[{text:'🌲 Forest',next:'forest'},{text:'⛰️ Dungeon',next:'dungeon'},{text:'🏔️ Mountains',next:'mountains'},{text:'🌊 Coast',next:'coast'},{text:'🏜️ Wasteland',next:'wasteland'},{text:'🌋 Volcanic Rift',next:'volcanic'},{text:'🏘️ Town',next:'town'}]},
  defeat:{title:'💀 Defeated...',text:'You have fallen. The townspeople carry you back to safety.',
    action:()=>{const lost=Math.floor(state.gold*.15);state.gold=Math.max(0,state.gold-lost);state.hp=Math.floor(state.maxHp*.5);state.mp=Math.floor(state.maxMp*.5);addLog(`Lost ${lost} gold. Revived.`,'bad');playSound('snd-death');updateUI();},
    choices:[{text:'🔄 Back to Town',next:'town'}]},
};

// ── SHOP ITEMS ──
const SHOP_EQUIP=[
  // ── WEAPONS ──
  {id:'s1',name:'⚔️ Iron Sword',price:200,slot:'weapon',rarity:'normal',stats:{str:20,equipLifeSteal:0.05,hit:5}},
  {id:'s2',name:'⚔️ Steel Sword',price:500,slot:'weapon',rarity:'uncommon',stats:{str:45,equipLifeSteal:0.06,hit:25}},
  //{id:'s3',name:'⚔️ War Blade',price:2200,slot:'weapon',rarity:'rare',stats:{str:90,lifeSteal:0.07,hit:50}},
  //{id:'s4',name:'⚔️ Sovereign Blade',price:5500,slot:'weapon',rarity:'legendary',stats:{str:180,lifeSteal:0.1,hit:150}},
  // ── ARMOR ──
  {id:'s5',name:'🛡️ Wooden Shield',price:200,slot:'armor',rarity:'normal',stats:{sta:15,armor:25,hpRegen:25}},
  {id:'s6',name:'🛡️ Chain Mail',price:400,slot:'armor',rarity:'uncommon',stats:{sta:25,armor:55,hpRegen:50}},
  //{id:'s7',name:'🛡️ Knight Plate',price:2200,slot:'armor',rarity:'rare',stats:{sta:50,armor:110,maxHp:300,hpRegen:100}},
  //{id:'s8',name:'🛡️ Dragon Plate',price:4400,slot:'armor',rarity:'legendary',stats:{sta:90,armor:200,maxHp:800,hpRegen:300}},
  // ── BOOTS ──
  {id:'s9',name:'👢 Leather Boots',price:220,slot:'boots',rarity:'normal',stats:{agi:15}},
  {id:'s10',name:'👢 Swift Treads',price:550,slot:'boots',rarity:'uncommon',stats:{agi:30}},
  //{id:'s11',name:'👢 Shadow Greaves',price:2200,slot:'boots',rarity:'rare',stats:{agi:60}},
  //{id:'s12',name:'👢 Void Sabatons',price:5500,slot:'boots',rarity:'legendary',stats:{agi:120}},
  // ── RINGS ──
  {id:'s13',name:'💍 Copper Band',price:350,slot:'ring',rarity:'normal',stats:{str:10,int:10}},
  {id:'s14',name:'💍 Silver Seal',price:550,slot:'ring',rarity:'uncommon',stats:{str:25,int:25}},
  //{id:'s15',name:'💍 Enchanted Loop',price:2200,slot:'ring',rarity:'rare',stats:{str:50,int:50}},
  //{id:'s16',name:'💍 Eternal Signet',price:5500,slot:'ring',rarity:'legendary',stats:{str:100,int:100}},
  // ── HELMETS ──
  {id:'s17',name:'⛑️ Iron Helm',price:280,slot:'helmet',rarity:'normal',stats:{armor:25,int:10}},
  {id:'s18',name:'⛑️ Steel Visor',price:580,slot:'helmet',rarity:'uncommon',stats:{armor:55,int:25}},
 // {id:'s19',name:'⛑️ Warlord Crown',price:2800,slot:'helmet',rarity:'rare',stats:{armor:110,int:55}},
  //{id:'s20',name:'⛑️ Divine Circlet',price:6600,slot:'helmet',rarity:'legendary',stats:{armor:220,int:110}},
  // ── AMULETS ──
  {id:'s21',name:'📿 Novice Pendant',price:250,slot:'amulet',rarity:'normal',stats:{int:15,maxMp:150}},
  {id:'s22',name:'📿 Mage Talisman',price:550,slot:'amulet',rarity:'uncommon',stats:{int:35,maxMp:350}},
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
  document.getElementById('difficulty-bar').style.display='flex';
  document.getElementById('name-screen').style.display='none';
  document.getElementById('game-wrapper').style.display='grid';
  document.getElementById('leaderboard-panel').style.display='block';
  document.getElementById('char-name').textContent=state.name;
  document.getElementById('arena-player').innerHTML='<img src="warrior.jpg" style="width:50px;height:50px;object-fit:cover;border-radius:8px;border:2px solid var(--dark-gold);">';
  document.getElementById('arena-player-label').textContent=state.name;
  loadAutoSellUI();updateUI();renderShop();renderQuests();renderInventory();renderSkillBar();renderEquipSlots();fetchLeaderboard();
  setDifficulty('normal');
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
    if(c.enemy)btn.onclick=()=>startCombat(c.enemy,false);
    else if(c.bossId)btn.onclick=()=>triggerBoss(c.bossId);
    else btn.onclick=()=>loadScene(c.next);
    box.appendChild(btn);
  });
  updateUI();
  updateAutoFightBtn(); // ← ADD THIS
}

function toggleAutoFight(){
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
    // ← ADD THIS: Show choices so player can navigate
    document.getElementById('combat-box').style.display='none';
    document.getElementById('choices-box').style.display='flex';
  }
}
 
function updateAutoFightBtn(){
  const btn=document.getElementById('auto-fight-btn');
  if(!btn)return;
  btn.textContent=autoFightOn?'⏹️ Stop Auto':'⚡ Auto Fight';
  btn.style.background=autoFightOn
    ?'linear-gradient(135deg,#6a0000,#aa2222)'
    :'linear-gradient(135deg,#005500,#00aa44)';
  // Only show if player has defeated this enemy before AND not currently in combat
  btn.style.display=(autoFightEnemyId && !currentEnemy)?'inline-block':'none';
}
 
function startAutoFight(){
  if(!autoFightOn||!autoFightEnemyId)return;
  // start a new fight immediately
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
 
function stopAutoFight(){
  autoFightOn=false;
  clearInterval(autoFightTimer);
  autoFightTimer=null;
  updateAutoFightBtn();
  // Don't clear currentEnemy here - let endCombat() handle it
}
 
function autoFightStep(){
  if(!currentEnemy||!autoFightOn)return;
  const enemyDodgeChance=Math.max(0,(currentEnemy.dodge||0)-state.hit)/100;
  if(Math.random()<enemyDodgeChance){
    addCombatLog(`💨 ${currentEnemy.name} dodged!`,'bad');
  } else {
    let dmg=Math.max(1,state.attackPower+Math.floor(Math.random()*8)-Math.floor(currentEnemy.armor/2));
    let isCrit=false;
    if(Math.random()<state.crit/100){dmg=Math.floor(dmg*2);isCrit=true;}
    if(state.unlockedTalents.includes('berserker')&&state.hp<state.maxHp*.5)dmg=Math.floor(dmg*1.35);
    if(state.unlockedTalents.includes('death_mark'))dmg=Math.floor(dmg*1.5);
    if(isCrit) showCritEffect();
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
  if(currentEnemy.hp<=0){
    currentEnemy.hp=0;
    updateEnemyBar();
    clearInterval(autoFightTimer);
    autoFightTimer=null;
    endCombat(true);
    if(autoFightOn){
      setTimeout(()=>{
        if(autoFightOn&&autoFightEnemyId){
          startCombat(autoFightEnemyId,false);
          autoFightTimer=setInterval(()=>{
            if(!autoFightOn||!currentEnemy){clearInterval(autoFightTimer);return;}
            autoFightStep();
          },1000);
        }
      },1200);
    }
    return;
  }
  Object.keys(state.skillCooldowns).forEach(k=>{
    if(state.skillCooldowns[k]>0)state.skillCooldowns[k]--;
  });
  // HP/MP regen per turn
if(state.hpRegen>0){
  const regen=Math.floor(state.hpRegen);
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
  if(currentEnemy.frozen){
    currentEnemy.frozen=false;
    addCombatLog(`${currentEnemy.name} is frozen!`,'info');
  } else {
    const playerDodgeChance=Math.max(0,state.dodge-(currentEnemy.hit||0))/100;
    let eDmg=Math.max(1,currentEnemy.atk+Math.floor(Math.random()*6)-Math.floor(state.armor/10));
    if(state.defending)eDmg=Math.floor(eDmg/2);
    if(Math.random()<playerDodgeChance){addCombatLog('💨 You dodged!','good');eDmg=0;}
    state.hp-=eDmg;
    if(eDmg>0){addCombatLog(`${currentEnemy.name} hits you for ${eDmg}!`,'bad');animateAttack(false,eDmg,false);}
  }
  if(currentEnemy.poisoned>0){
  const pd = currentEnemy.poisonDmg || Math.floor(state.agi*0.8 + state.attackPower*0.3);
  currentEnemy.hp-=pd;
  currentEnemy.poisoned--;
  addCombatLog(`🐍 Poison deals ${pd}!`,'good');
  spawnDmgFloat(`🐍${pd}`,true,'enemy-dmg');
}
  if(state.hp<=0){
    state.hp=0;
    updateUI();
    clearInterval(autoFightTimer);
    autoFightTimer=null;
    stopAutoFight();
  // Reset all combat multipliers to base
    state.str=1.0;
    state.skillArmorMult=1.0;
    state.skillMaxHp=1.0;

    addLog('💀 Auto Fight stopped — you died!','bad');
    notify('💀 Auto Fight stopped — you died!','var(--red)');
    endCombat(false);
    return;
  }
  updateEnemyBar();
  updateUI();
}
  // ... rest of your function stays the same
 
 
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 3: Replace endCombat() with this new version
// Adds: skill CD reset + auto fight next round
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function endCombat(won){
  if(!currentEnemy)return;

  state.usedUndying=false;
  state.skillCooldowns={};
  
  // ✅ Reset ALL multipliers to 1.0 FIRST
  state.strMult = 1.0;
  state.agiMult = 1.0;
  state.intMult = 1.0;
  state.staMult = 1.0;
  state.hitMult = 1.0;
  state.critMult = 1.0;
  state.dodgeMult = 1.0;
  state.hpRegenMult = 1.0;
  state.mpRegenMult = 1.0;
  state.armorMult = 1.0;
  state.maxHp = 1.0;
  state.manaShield = 1.0;
  state.maxMp = 1.0;
  
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
    renderQuests();

    currentEnemy=null;
    document.getElementById('combat-box').style.display='none';

    if(!autoFightOn){
      loadScene('victory');
    }

  } else {
    currentEnemy=null;
    document.getElementById('combat-box').style.display='none';
    loadScene('defeat');
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
  const filledSlots = autoSkillSlots.filter(s => s !== null);
  if (filledSlots.length === 0) return false;

  for (let attempt = 0; attempt < 3; attempt++) {
    const idx = autoSkillIndex % 3;
    const skillId = autoSkillSlots[idx];
    autoSkillIndex++;

    if (!skillId || !SKILLS[skillId]) continue;

    const skill = SKILLS[skillId];
    const cd = state.skillCooldowns[skillId] || 0;
    const mpCost = typeof skill.mp === 'function' ? skill.mp() : skill.mp;

    if (cd > 0) {
      addCombatLog(`⏳ ${skill.name} on cooldown (${cd})`, 'info');
      continue;
    }
    if (state.mp < mpCost) {
      addCombatLog(`💙 Not enough MP for ${skill.name}!`, 'bad');
      continue;
    }

    // Use the skill!
    state.mp -= mpCost;
    state.skillCooldowns[skillId] = skill.cd;
    skill.use(enemy);
    return true;
  }
  return false;
}
// ── BOSS ──
function triggerBoss(bossId){
  const boss=BOSSES.find(b=>b.id===bossId);if(!boss)return;
  if(state.level<boss.levelReq){notify(`⚠️ Need Level ${boss.levelReq} for this boss!`,'var(--red)');return;}
  pendingBossId=bossId;
  const cs=boss.cs;
  document.getElementById('boss-icon').textContent=cs.icon||boss.icon;
  document.getElementById('boss-cs-name').textContent=cs.title;
  document.getElementById('boss-cs-req').textContent=cs.req||'';
  document.getElementById('boss-cs-text').textContent=cs.text;
  document.getElementById('boss-cutscene').style.display='block';
  playSound('snd-boss');
}
function startBossFight(){
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

// ── COMBAT ──
function startCombat(enemyId,isBoss){
  const tmpl=NORMAL_ENEMIES.find(e=>e.id===enemyId);
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
  state.mp-=mpCost;state.skillCooldowns[skillId]=sk.cd;
  sk.use(currentEnemy);
  Object.keys(state.skillCooldowns).forEach(k=>{if(k!==skillId&&state.skillCooldowns[k]>0)state.skillCooldowns[k]--;});
  if(currentEnemy.hp<=0){
    currentEnemy.hp=0;
    updateEnemyBar();
    clearInterval(autoFightTimer);
    autoFightTimer=null;
    endCombat(true);
    if(autoFightOn){
      setTimeout(()=>{
        if(autoFightOn&&autoFightEnemyId){
          startCombat(autoFightEnemyId,false);
          autoFightTimer=setInterval(()=>{
            if(!autoFightOn||!currentEnemy){clearInterval(autoFightTimer);return;}
            autoFightStep();
          },1000);
        }
      },1200);
    }
    return;
  }
  if(currentEnemy.hp>0){
    const eDmg=Math.max(1,currentEnemy.atk+Math.floor(Math.random()*6)-state.armor);
    state.hp-=eDmg;
    addCombatLog(`${currentEnemy.name} retaliates: ${eDmg}!`,'bad');
    animateAttack(false,eDmg,false);
    if(state.hp<=0){state.hp=0;updateUI();endCombat(false);return;}
  }
  updateEnemyBar();updateUI();renderSkillBar();
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

// ── LEVEL UP ──
function checkLevelUp(){
  while(state.xp>=state.xpNext&&state.level<state.maxLevel){
    state.xp-=state.xpNext;
    state.level++;
    state.xpNext=Math.floor(state.level*100*1.25);
    
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
  if(item.category==='consumable'){
    if(item.effect==='hp'||item.effect==='both'){state.hp=Math.min(state.maxHp,state.hp+(item.val||40));addLog(`Used ${item.name}: +${item.val} HP`,'good');playSound('snd-heal');spawnDmgFloat(`+${item.val}HP`,false,'heal-float');}
    if(item.effect==='mp'||item.effect==='both'){state.mp=Math.min(state.maxMp,state.mp+(item.val||30));addLog(`Used ${item.name}: +${item.val} MP`,'info');spawnDmgFloat(`+${item.val}MP`,false,'mp-float');}
    if(item.stackable&&item.qty>1){item.qty--;}else{state.inventory.splice(idx,1);}
    renderInventory();updateUI();
  }
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
