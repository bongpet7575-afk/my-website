// game-state.js

// game-state.js
import { config } from './config.js';

export const initializeSupabase = () => {
  return window.supabase.createClient(
    config.supabase.url,
    config.supabase.key
  );
};

export const INITIAL_STATE = {
  // Identity
  character_id: null,
  user_id: null,
  name: '',
  level: 1,
  xp: 0,
  xpNext: 2000,
  maxLevel: 100,
  
  // Health/Mana
  hp: 100,
  maxHp: 100,
  mp: 50,
  maxMp: 50,
  
  // Currency
  gold: 0,
  goldMult: 1.0,
  
  // Primary stats
  baseStr: 5,
  baseAgi: 5,
  baseInt: 5,
  baseSta: 5,
  baseArmor: 5,
  baseHit: 2,
  baseCrit: 0.1,
  baseDodge: 2,
  baseHpRegen: 20,
  baseLifeSteal: 0.05,
  baseAttackPower: 10,

  // Multipliers
  strMult: 1.0,
  agiMult: 1.0,
  intMult: 1.0,
  staMult: 1.0,
  armorMult: 1.0,
  maxHpMult: 1.0,
  hpRegenMult: 1.0,
  maxMpMult: 1.0,
  mpMult: 1.0,
  critMult: 1.0,
  dodgeMult: 1.0,
  mpRegenMult: 1.0,
  hitMult: 1.0,
  lifeStealMult: 1.0,
  attackPowerMult: 1.0,

  // Bonuses
  classBonuses: {
    strMult: 0, agiMult: 0, intMult: 0, staMult: 0,
    hitMult: 0, critMult: 0, dodgeMult: 0, hpRegenMult: 0,
    mpRegenMult: 0, armorMult: 0, mpMult: 0, lifeStealMult: 0,
    attackPowerMult: 0, maxHpMult: 0,
  },
  talentBonuses: {
    strMult: 0, agiMult: 0, intMult: 0, staMult: 0,
    hitMult: 0, critMult: 0, dodgeMult: 0, hpRegenMult: 0,
    mpRegenMult: 0, armorMult: 0, mpMult: 0, lifeStealMult: 0,
    attackPowerMult: 0, maxHpMult: 0,
  },

  // Equipment bonuses
  equipStr: 0, equipStrMult: 0,
  equipAgi: 0, equipAgiMult: 0,
  equipInt: 0, equipIntMult: 0,
  equipSta: 0, equipStaMult: 0,
  equipMaxHp: 0, equipMaxHpMult: 0,
  equipMaxMp: 0, equipMaxMpMult: 0,
  equipArmor: 0, equipArmorMult: 0,
  equipCrit: 0, equipDodge: 0, equipDodgeMult: 0,
  equipLifeSteal: 0, equipLifeStealMult: 1.0,
  equipAttackPower: 0, equipAttackPowerMult: 0,
  equipHpRegen: 0, equipHpRegenMult: 0,
  equipMpRegen: 0, equipMpRegenMult: 0,
  equipHit: 0, equipHitMult: 0,

  // Calculated stats (computed by calcStats)
  str: 5, agi: 5, int: 5, sta: 5, armor: 0,
  hit: 0, crit: 0, dodge: 0, lifeSteal: 0, attackPower: 0,
  hpRegen: 0, manaRegen: 0,

  // Inventory
  inventory: [],
  equipped: { weapon: null, armor: null, helmet: null, boots: null, ring: null, amulet: null },

  // Progression
  class: null,
  talentPoints: 0,
  unlockedTalents: [],
  talentUnlockedFlags: {},
  skills: [],
  skillCooldowns: {},

  // Combat state
  defending: false,
  manaShield: false,
  usedUndying: false,
  battleCryActive: false,
  activeDebuffs: { maxHpReduction: 0, webTrapped: 0, rageTimer: 0 },

  // UI state
  currentScene: 'town',
  invTab: 'equipment',
  shopTab: 'equipment',
  autoSell: { normal: false, uncommon: false, rare: false, epic: false },
  difficulty: 'normal',

  // Quests
  quests: {
    kill1: { text: '🗡️ Defeat your first enemy', done: false },
    gold50: { text: '💰 Earn 50 gold', done: false },
    level5: { text: '⭐ Reach Level 5', done: false },
    level10: { text: '🏆 Reach Level 10', done: false },
    boss: { text: '🐉 Defeat a Boss', done: false },
    class: { text: '✨ Choose a Class', done: false },
    talent: { text: '🌟 Unlock a Talent', done: false },
    equip: { text: '🛡️ Equip an item', done: false },
    legendary: { text: '🔱 Find a Legendary item', done: false },
    craft: { text: '⚗️ Craft an item', done: false },
    level50: { text: '👑 Reach Level 50', done: false },
    level100: { text: '🌟 Reach Max Level 100', done: false },
  },

  // Caching
  _cachedStats: null,
  _statsDirty: true,
};

export const RARITY = {
  legendary: { label: 'Legendary', color: 'var(--legendary)', chance: 0.03, mult: 5.5 },
  epic: { label: 'Epic', color: 'var(--epic)', chance: 0.08, mult: 4.5 },
  rare: { label: 'Rare', color: 'var(--rare)', chance: 0.18, mult: 3.8 },
  uncommon: { label: 'Uncommon', color: 'var(--uncommon)', chance: 0.35, mult: 2.3 },
  normal: { label: 'Normal', color: '#cccccc', chance: 1, mult: 1 },
};

export const DIFFICULTY = {
  normal: {
    label: 'Normal',
    icon: '⚔️',
    color: '#cccccc',
    levelReq: 0,
    hpMult: 1,
    atkMult: 1,
    hitMul: 1,
    dodgeMult: 1,
    goldMult: 1,
    xpMult: 1,
    rarityBonus: 0,
    legendaryChance: 0.003,
  },
  hard: {
    label: 'Hard',
    icon: '🔥',
    color: '#ff8800',
    levelReq: 20,
    hpMult: 3,
    atkMult: 3,
    hitMul: 3,
    dodgeMult: 3,
    goldMult: 3,
    xpMult: 3,
    rarityBonus: 2,
    legendaryChance: 0.007,
  },
  hell: {
    label: 'Hell',
    icon: '💀',
    color: '#ff2222',
    levelReq: 50,
    hpMult: 5,
    atkMult: 5,
    hitMul: 5,
    dodgeMult: 5,
    goldMult: 5,
    xpMult: 5,
    rarityBonus: 3,
    legendaryChance: 0.009,
  },
};

// Copy all your CLASSES, SKILLS, MONSTER_TEMPLATES, STAGES, STAGE_BOSSES here
export const CLASSES = { /* ... */ };
export const SKILLS = { /* ... */ };
export const MONSTER_TEMPLATES = { /* ... */ };
export const STAGES = [ /* ... */ ];
export const STAGE_BOSSES = { /* ... */ };
export const CRAFTING = [ /* ... */ ];
export const SHOP_EQUIP = [ /* ... */ ];
export const SHOP_CONS = [ /* ... */ ];

export function createGameState() {
  return JSON.parse(JSON.stringify(INITIAL_STATE));
}