
// ════════════════════════════════════════════════════════════════
// GAME STATE & CONSTANTS
// ════════════════════════════════════════════════════════════════

const CONSTANTS = {
  SAVE_KEY: 'rpgSave_v2',
  AUTO_SAVE_INTERVAL: 60000, // 1 minute
  MAX_LEVEL: 100,
  STARTING_GOLD: 300,
  STARTING_HP: 100,
  STARTING_MP: 50,
  BASE_XP_NEXT: 100,
  XP_MULTIPLIER: 1.25,
  BOSS_SCALING: 0.03,
  ENEMY_SCALING: 0.04,
};

const RARITY = {
  legendary: { label: 'Legendary', color: 'var(--legendary)', chance: 0.03, mult: 3.5 },
  epic: { label: 'Epic', color: 'var(--epic)', chance: 0.08, mult: 2.5 },
  rare: { label: 'Rare', color: 'var(--rare)', chance: 0.18, mult: 1.8 },
  uncommon: { label: 'Uncommon', color: 'var(--uncommon)', chance: 0.35, mult: 1.3 },
  normal: { label: 'Normal', color: '#cccccc', chance: 1, mult: 1 },
};

const SLOT_ICONS = {
  weapon: '⚔️', armor: '🛡️', helmet: '⛑️', boots: '👢', ring: '💍', amulet: '📿'
};

// ════════════════════════════════════════════════════════════════
// GAME STATE
// ════════════════════════════════════════════════════════════════

const GameState = {
  name: '',
  level: 9,
  xp: 0,
  xpNext: CONSTANTS.BASE_XP_NEXT,
  maxLevel: CONSTANTS.MAX_LEVEL,
  hp: CONSTANTS.STARTING_HP,
  maxHp: CONSTANTS.STARTING_HP,
  mp: CONSTANTS.STARTING_MP,
  maxMp: CONSTANTS.STARTING_MP,
  str: 5,
  agi: 5,
  int: 5,
  def: 2,
  gold: CONSTANTS.STARTING_GOLD ,
  inventory: [],
  equipped: { weapon: null, armor: null, helmet: null, boots: null, ring: null, amulet: null },
  class: null,
  talentPoints: 0,
  unlockedTalents: [],
  skills: [],
  skillCooldowns: {},
  defending: false,
  manaShield: false,
  usedUndying: false,
  currentScene: 'town',
  invTab: 'equipment',
  shopTab: 'equipment',
  autoSell: { normal: false, uncommon: false },
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
};

// ════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════════

const Utils = {
  sanitizeName(name) {
    return name.trim().substring(0, 20).replace(/[<>]/g, '');
  },

  rollRarity() {
    const r = Math.random();
    if (r < 0.03) return 'legendary';
    if (r < 0.08) return 'epic';
    if (r < 0.18) return 'rare';
    if (r < 0.35) return 'uncommon';
    return 'normal';
  },

  genUid() {
    return Date.now() + Math.random();
  },

  playSound(id) {
    try {
      const audio = document.getElementById(id);
      if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.3;
        audio.play().catch(() => {});
      }
    } catch (e) {}
  },

  notify(msg, color = 'var(--gold)') {
    const n = document.getElementById('notification');
    n.textContent = msg;
    n.style.color = color;
    n.style.display = 'block';
    clearTimeout(n._t);
    n._t = setTimeout(() => (n.style.display = 'none'), 3000);
  },

  showConfirm(title, text, callback) {
    window._confirmCallback = callback;
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalText').textContent = text;
    document.getElementById('confirmModal').classList.add('active');
  },
};

window.confirmAction = () => {
  document.getElementById('confirmModal').classList.remove('active');
  if (window._confirmCallback) window._confirmCallback(true);
};

window.cancelAction = () => {
  document.getElementById('confirmModal').classList.remove('active');
  if (window._confirmCallback) window._confirmCallback(false);
};

// ════════════════════════════════════════════════════════════════
// GAME ENGINE
// ════════════════════════════════════════════════════════════════

const GameEngine = {
  currentEnemy: null,
  pendingBossId: null,

  startGame() {
    const name = Utils.sanitizeName(document.getElementById('name-input').value);
    if (!name) {
      alert('Please enter your name!');
      return;
    }
    GameState.name = name;
    this.showGame();
    GameScenes.load('town');
    GameLog.add(`${name} begins their adventure!`, 'info');
    GameLeaderboard.fetch();
  },

  showGame() {
    document.getElementById('name-screen').style.display = 'none';
    document.getElementById('game-wrapper').style.display = 'grid';
    document.getElementById('leaderboard-panel').style.display = 'block';
    document.getElementById('char-name').textContent = GameState.name;
    document.getElementById('arena-player').textContent = GameState.class ? CLASSES[GameState.class].icon : '🧙';
    document.getElementById('arena-player-label').textContent = GameState.name;
    GameInventory.loadAutoSellUI();
    GameUI.updateUI();
    GameInventory.render();
    GameShop.render();
    GameQuests.render();
    GameSkills.render();
    GameEquipment.render();
  },

  saveGame() {
    try {
      localStorage.setItem(CONSTANTS.SAVE_KEY, JSON.stringify(GameState));
      GameLog.add('💾 Game saved!', 'gold');
      alert('Game saved! ✅');
    } catch (e) {
      alert('Save failed — try clearing old save data!');
    }
  },

  loadGame() {
    const saved = localStorage.getItem(CONSTANTS.SAVE_KEY);
    if (!saved) {
      alert('No save file found!');
      return;
    }
    try {
      const data = JSON.parse(saved);
      Object.assign(GameState, data);
      this.showGame();
      GameScenes.load(GameState.currentScene || 'town');
      if (GameState.class) {
        document.getElementById('char-class').textContent = `${CLASSES[GameState.class].icon} ${CLASSES[GameState.class].name}`;
        document.getElementById('char-avatar').textContent = CLASSES[GameState.class].icon;
        document.getElementById('arena-player').textContent = CLASSES[GameState.class].icon;
        document.getElementById('talent-btn').style.display = 'inline-block';
        GameUI.updateTalentBtn();
      }
      GameLog.add(`📂 Welcome back ${GameState.name}!`, 'gold');
      GameLeaderboard.fetch();
      alert(`Welcome back ${GameState.name}! ✅`);
    } catch (e) {
      alert('Load failed!');
    }
  },

  startBossFight() {
    document.getElementById('boss-cutscene').style.display = 'none';
    if (!this.pendingBossId) return;
    const boss = BOSSES.find(b => b.id === this.pendingBossId);
    if (!boss) return;

    const scale = 1 + Math.max(0, (GameState.level - boss.levelReq) * CONSTANTS.BOSS_SCALING);
    this.currentEnemy = {
      ...boss,
      hp: Math.floor(boss.hp * scale),
      maxHp: Math.floor(boss.hp * scale),
      atk: Math.floor(boss.atk * scale),
      def: boss.def,
      poisoned: 0,
      frozen: false,
      crippled: 0,
      boss: true,
    };
    GameCombat.start(this.currentEnemy);
  },
};

// ════════════════════════════════════════════════════════════════
// CLASSES & TALENTS
// ════════════════════════════════════════════════════════════════

const CLASSES = {
  warrior: {
    name: 'Warrior',
    icon: '⚔️',
    desc: 'A mighty melee fighter. High HP and STR.',
    bonuses: { str: 8, def: 5, maxHp: 50, maxMp: -10 },
    skills: ['power_strike', 'battle_cry', 'last_stand'],
    trees: {
      dps: {
        name: '🗡️ DPS',
        talents: [
          { id: 'berserker', name: 'Berserker Rage', desc: '+4 STR, bonus dmg when HP<50%', cost: 1, ranks: 3, effect: () => { GameState.str += 4; } },
          { id: 'cleave', name: 'Cleave', desc: 'Attacks hit twice at 70% dmg', cost: 2, ranks: 1, effect: () => {} },
          { id: 'execute', name: 'Execute', desc: 'Massive bonus dmg when enemy HP<30%', cost: 2, ranks: 1, effect: () => {} },
        ],
      },
      tank: {
        name: '🛡️ Tank',
        talents: [
          { id: 'iron_skin', name: 'Iron Skin', desc: '+3 DEF, +20 Max HP per rank', cost: 1, ranks: 3, effect: () => { GameState.def += 3; GameState.maxHp += 20; GameState.hp += 20; } },
          { id: 'fortress', name: 'Fortress Stance', desc: 'DEF doubled while defending', cost: 2, ranks: 1, effect: () => {} },
          { id: 'shield_wall', name: 'Shield Wall', desc: 'Reduce all incoming damage by 10%', cost: 3, ranks: 1, effect: () => {} },
        ],
      },
      heal: {
        name: '💚 Self Heal',
        talents: [
          { id: 'second_wind', name: 'Second Wind', desc: 'Restore 10 HP each combat turn', cost: 1, ranks: 3, effect: () => {} },
          { id: 'undying', name: 'Undying Will', desc: 'Survive killing blow once with 1 HP', cost: 3, ranks: 1, effect: () => {} },
          { id: 'regeneration', name: 'Regeneration', desc: '+5% Max HP after each battle', cost: 2, ranks: 2, effect: () => {} },
        ],
      },
    },
  },
  mage: {
    name: 'Mage',
    icon: '🔮',
    desc: 'A powerful spellcaster. High INT and MP.',
    bonuses: { int: 10, maxMp: 60, str: -2, def: -1 },
    skills: ['fireball', 'ice_lance', 'mana_shield'],
    trees: {
      fire: {
        name: '🔥 Fire',
        talents: [
          { id: 'fire_mastery', name: 'Fire Mastery', desc: '+5 INT, fire spells +20% dmg', cost: 1, ranks: 3, effect: () => { GameState.int += 5; } },
          { id: 'ignite', name: 'Ignite', desc: 'Enemy burns: 5 dmg/turn x3 turns', cost: 1, ranks: 1, effect: () => {} },
          { id: 'meteor', name: 'Meteor', desc: 'INT×5 damage mega spell', cost: 3, ranks: 1, effect: () => {} },
        ],
      },
      ice: {
        name: '❄️ Ice',
        talents: [
          { id: 'frost', name: 'Frost Nova', desc: 'Freeze enemy — skip one turn', cost: 1, ranks: 2, effect: () => {} },
          { id: 'ice_armor', name: 'Ice Armor', desc: '+3 DEF from ice shields', cost: 1, ranks: 2, effect: () => { GameState.def += 3; } },
          { id: 'blizzard', name: 'Blizzard', desc: 'Hit 3 times for INT×1.5 each', cost: 3, ranks: 1, effect: () => {} },
        ],
      },
      arcane: {
        name: '✨ Arcane',
        talents: [
          { id: 'mana_regen', name: 'Mana Regen', desc: 'Restore 5 MP each combat turn', cost: 1, ranks: 3, effect: () => {} },
          { id: 'spell_power', name: 'Spell Power', desc: 'All spells +15% dmg per rank', cost: 2, ranks: 2, effect: () => {} },
          { id: 'arcane_surge', name: 'Arcane Surge', desc: 'Next spell: 0 MP, double dmg', cost: 3, ranks: 1, effect: () => {} },
        ],
      },
    },
  },
  rogue: {
    name: 'Rogue',
    icon: '🗡️',
    desc: 'A cunning assassin. High AGI and crits.',
    bonuses: { agi: 10, str: 3, def: -1, maxHp: -10 },
    skills: ['backstab', 'poison_blade', 'shadow_step'],
    trees: {
      assassination: {
        name: '☠️ Assassin',
        talents: [
          { id: 'crit', name: 'Critical Strike', desc: '+15% crit chance, crits deal 2× dmg', cost: 1, ranks: 3, effect: () => {} },
          { id: 'ambush', name: 'Ambush', desc: 'First attack: AGI×3 dmg', cost: 2, ranks: 1, effect: () => {} },
          { id: 'death_mark', name: 'Death Mark', desc: 'All attacks +50% dmg to target', cost: 3, ranks: 1, effect: () => {} },
        ],
      },
      subtlety: {
        name: '🌑 Subtlety',
        talents: [
          { id: 'evasion', name: 'Evasion', desc: '+15% dodge chance per rank', cost: 1, ranks: 3, effect: () => {} },
          { id: 'smoke_bomb', name: 'Smoke Bomb', desc: 'Guaranteed flee from any battle', cost: 1, ranks: 1, effect: () => {} },
          { id: 'vanish', name: 'Vanish', desc: 'Enemy misses next attack', cost: 2, ranks: 1, effect: () => {} },
        ],
      },
      poison: {
        name: '🐍 Poison',
        talents: [
          { id: 'venom', name: 'Venom Coat', desc: 'Attacks poison enemy: 8 dmg/turn', cost: 1, ranks: 3, effect: () => {} },
          { id: 'cripple', name: 'Cripple', desc: 'Reduce enemy ATK 30% for 3 turns', cost: 2, ranks: 1, effect: () => {} },
          { id: 'plague', name: 'Plague', desc: 'Spread poison for massive DoT', cost: 3, ranks: 1, effect: () => {} },
        ],
      },
    },
  },
};

// ════════════════════════════════════════════════════════════════
// SKILLS
// ════════════════════════════════════════════════════════════════

const SKILLS = {
  power_strike: {
    name: 'Power Strike',
    icon: '💥',
    mp: 15,
    cd: 2,
    use: (e) => {
      const d = Math.floor(GameState.str * 2.5);
      e.hp -= d;
      GameCombat.addLog(`💥 Power Strike! ${d} dmg!`, 'good');
      Utils.playSound('snd-attack');
      GameCombat.animateAttack(true, d, false);
      return d;
    },
  },
  battle_cry: {
    name: 'Battle Cry',
    icon: '📯',
    mp: 20,
    cd: 3,
    use: (e) => {
      GameState.str += 3;
      GameState.def += 2;
      GameCombat.addLog('📯 Battle Cry! +3 STR, +2 DEF!', 'good');
      Utils.playSound('snd-magic');
      return 0;
    },
  },
  last_stand: {
    name: 'Last Stand',
    icon: '🛡️',
    mp: 25,
    cd: 4,
    use: (e) => {
      GameState.hp = Math.min(GameState.maxHp, GameState.hp + 40);
      GameCombat.addLog('🛡️ Last Stand! +40 HP!', 'good');
      Utils.playSound('snd-heal');
      GameCombat.spawnDmgFloat('+40HP', true, 'heal-float');
      return 0;
    },
  },
  fireball: {
    name: 'Fireball',
    icon: '🔥',
    mp: 18,
    cd: 1,
    use: (e) => {
      const d = Math.floor(GameState.int * 3 + Math.random() * 10);
      e.hp -= d;
      GameCombat.addLog(`🔥 Fireball! ${d} dmg!`, 'good');
      Utils.playSound('snd-magic');
      GameCombat.animateAttack(true, d, false);
      return d;
    },
  },
  ice_lance: {
    name: 'Ice Lance',
    icon: '❄️',
    mp: 12,
    cd: 2,
    use: (e) => {
      const d = Math.floor(GameState.int * 2);
      e.hp -= d;
      e.frozen = true;
      GameCombat.addLog(`❄️ Ice Lance! ${d} dmg — Frozen!`, 'info');
      Utils.playSound('snd-magic');
      GameCombat.animateAttack(true, d, false);
      return d;
    },
  },
  mana_shield: {
    name: 'Mana Shield',
    icon: '🔮',
    mp: 30,
    cd: 4,
    use: (e) => {
      GameState.manaShield = true;
      GameCombat.addLog('🔮 Mana Shield active!', 'info');
      Utils.playSound('snd-heal');
      return 0;
    },
  },
  backstab: {
    name: 'Backstab',
    icon: '🗡️',
    mp: 10,
    cd: 1,
    use: (e) => {
      const d = Math.floor(GameState.agi * 2.8);
      e.hp -= d;
      GameCombat.addLog(`🗡️ Backstab! ${d} dmg!`, 'good');
      Utils.playSound('snd-attack');
      GameCombat.animateAttack(true, d, false);
      return d;
    },
  },
  poison_blade: {
    name: 'Poison Blade',
    icon: '🐍',
    mp: 15,
    cd: 2,
    use: (e) => {
      e.poisoned = (e.poisoned || 0) + 3;
      GameCombat.addLog('🐍 Poisoned for 3 turns!', 'good');
      Utils.playSound('snd-magic');
      return 0;
    },
  },
  shadow_step: {
    name: 'Shadow Step',
    icon: '🌑',
    mp: 20,
    cd: 3,
    use: (e) => {
      const d = Math.floor(GameState.agi * 3.5);
      e.hp -= d;
      GameCombat.addLog(`🌑 Shadow Step! ${d} dmg!`, 'purple');
      Utils.playSound('snd-magic');
      GameCombat.animateAttack(true, d, false);
      return d;
    },
  },
};

// ════════════════════════════════════════════════════════════════
// BOSSES
// ════════════════════════════════════════════════════════════════

const BOSSES = [
  {
    id: 'boss_10',
    levelReq: 10,
    name: '🐉 Ancient Dragon',
    icon: '🐉',
    hp: 250,
    atk: 38,
    def: 14,
    xp: 400,
    gold: [80, 160],
    cs: { title: 'Ancient Dragon', req: 'Required: Level 10', text: 'The earth trembles as the Ancient Dragon awakens from its century-long slumber! Fire and fury await you, hero!' },
    loot: () => [GameItems.mkEquipDrop('weapon', 'epic'), GameItems.mkMat('🐉 Dragon Scale', 'epic', 60), GameItems.mkMat('🔥 Dragon Flame', 'rare', 40)],
  },
  {
    id: 'boss_20',
    levelReq: 20,
    name: '💀 Lich King',
    icon: '💀',
    hp: 450,
    atk: 55,
    def: 20,
    xp: 700,
    gold: [150, 250],
    cs: { title: 'Lich King', req: 'Required: Level 20', text: 'The Lich King rises from the underworld! His death magic corrupts everything it touches. Face him only if you dare!' },
    loot: () => [GameItems.mkEquipDrop('armor', 'epic'), GameItems.mkEquipDrop('ring', 'rare'), GameItems.mkMat('💀 Death Essence', 'epic', 80)],
  },
  {
    id: 'boss_30',
    levelReq: 30,
    name: '😈 Demon Lord',
    icon: '😈',
    hp: 650,
    atk: 70,
    def: 26,
    xp: 1000,
    gold: [220, 350],
    cs: { title: 'Demon Lord', req: 'Required: Level 30', text: 'The sky tears open! The Demon Lord descends with hellfire in his wake. This battle will echo through eternity!' },
    loot: () => [GameItems.mkEquipDrop('weapon', 'legendary'), GameItems.mkEquipDrop('amulet', 'epic'), GameItems.mkMat('😈 Demon Horn', 'legendary', 150)],
  },
  {
    id: 'boss_40',
    levelReq: 40,
    name: '⚡ Ancient Titan',
    icon: '⚡',
    hp: 900,
    atk: 88,
    def: 34,
    xp: 1400,
    gold: [300, 450],
    cs: { title: 'Ancient Titan', req: 'Required: Level 40', text: 'A god among monsters! The Ancient Titan towers over mountains. Its every step causes earthquakes. Can you really stand against it?' },
    loot: () => [GameItems.mkEquipDrop('armor', 'legendary'), GameItems.mkEquipDrop('helmet', 'epic'), GameItems.mkMat('⚡ Titan Soul', 'legendary', 200)],
  },
  {
    id: 'boss_50',
    levelReq: 50,
    name: '🌑 Void Dragon',
    icon: '🌑',
    hp: 1200,
    atk: 105,
    def: 42,
    xp: 2000,
    gold: [400, 600],
    cs: { title: 'Void Dragon', req: 'Required: Level 50', text: 'From the void between worlds emerges the Void Dragon! A creature of pure darkness and chaos. Even gods fear this name!' },
    loot: () => [GameItems.mkEquipDrop('weapon', 'legendary'), GameItems.mkEquipDrop('ring', 'legendary'), GameItems.mkMat('🌑 Void Crystal', 'legendary', 300)],
  },
  {
    id: 'boss_60',
    levelReq: 60,
    name: '🔱 Sea Leviathan',
    icon: '🔱',
    hp: 1600,
    atk: 125,
    def: 50,
    xp: 2800,
    gold: [500, 750],
    cs: { title: 'Sea Leviathan', req: 'Required: Level 60', text: 'The ancient seas churn as the Leviathan erupts from the deep! Sailors have feared this beast for centuries. Today you face it alone!' },
    loot: () => [GameItems.mkEquipDrop('armor', 'legendary'), GameItems.mkEquipDrop('boots', 'legendary'), GameItems.mkMat('🔱 Leviathan Scale', 'legendary', 350)],
  },
  {
    id: 'boss_70',
    levelReq: 70,
    name: '☄️ Fallen God',
    icon: '☄️',
    hp: 2200,
    atk: 148,
    def: 60,
    xp: 3800,
    gold: [650, 950],
    cs: { title: 'Fallen God', req: 'Required: Level 70', text: 'A god cast down from the heavens — bitter and powerful beyond imagination! The Fallen God wants revenge on all living things. Stand firm, hero!' },
    loot: () => [GameItems.mkEquipDrop('weapon', 'legendary'), GameItems.mkEquipDrop('amulet', 'legendary'), GameItems.mkMat('☄️ Divine Shard', 'legendary', 450)],
  },
  {
    id: 'boss_80',
    levelReq: 80,
    name: '🌀 Chaos Serpent',
    icon: '🌀',
    hp: 3000,
    atk: 175,
    def: 72,
    xp: 5000,
    gold: [800, 1200],
    cs: { title: 'Chaos Serpent', req: 'Required: Level 80', text: 'Reality warps and tears as the Chaos Serpent slithers from between dimensions! It feeds on destruction and grows stronger from chaos itself!' },
    loot: () => [GameItems.mkEquipDrop('armor', 'legendary'), GameItems.mkEquipDrop('ring', 'legendary'), GameItems.mkMat('🌀 Chaos Essence', 'legendary', 550)],
  },
  {
    id: 'boss_90',
    levelReq: 90,
    name: '💎 Crystal Colossus',
    icon: '💎',
    hp: 4000,
    atk: 205,
    def: 88,
    xp: 7000,
    gold: [1000, 1500],
    cs: { title: 'Crystal Colossus', req: 'Required: Level 90', text: 'The Crystal Colossus — forged from the hardest material in existence, animated by ancient magic. Its crystalline body reflects your own attacks back at you!' },
    loot: () => [GameItems.mkEquipDrop('helmet', 'legendary'), GameItems.mkEquipDrop('boots', 'legendary'), GameItems.mkMat('💎 Pure Crystal Core', 'legendary', 700)],
  },
  {
    id: 'boss_100',
    levelReq: 100,
    name: '🌟 Eternal King',
    icon: '🌟',
    hp: 6000,
    atk: 250,
    def: 110,
    xp: 15000,
    gold: [2000, 3000],
    cs: { title: 'Eternal King', req: 'Required: Level 100 — FINAL BOSS', text: 'The Eternal King — ruler of all realms, immortal and all-powerful. Defeating him is the ultimate achievement. Heroes who have reached this far are legends. Are you ready for your final battle?' },
    loot: () => [GameItems.mkEquipDrop('weapon', 'legendary'), GameItems.mkEquipDrop('armor', 'legendary'), GameItems.mkEquipDrop('ring', 'legendary'), GameItems.mkMat('🌟 Eternal Crown', 'legendary', 1000)],
  },
];

// ════════════════════════════════════════════════════════════════
// NORMAL ENEMIES
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// NORMAL ENEMIES - FIXED
// ════════════════════════════════════════════════════════════════

const NORMAL_ENEMIES = [
  { id: 'wolf', name: '🐺 Forest Wolf', icon: '🐺', hp: 35, atk: 8, def: 2, xp: 25, gold: [5, 15], loot: () => [GameItems.mkMat('🪶 Wolf Fang', Utils.rollRarity(), 5)] },
  { id: 'spider', name: '🕷️ Giant Spider', icon: '🕷️', hp: 28, atk: 7, def: 1, xp: 18, gold: [3, 12], loot: () => [GameItems.mkMat('🕸️ Spider Silk', Utils.rollRarity(), 6)] },
  { id: 'goblin', name: '👹 Dungeon Goblin', icon: '👹', hp: 45, atk: 12, def: 3, xp: 38, gold: [10, 25], loot: () => [GameItems.mkEquipDrop('weapon', Utils.rollRarity())] },
  { id: 'skeleton', name: '💀 Skeleton', icon: '💀', hp: 60, atk: 16, def: 5, xp: 55, gold: [15, 30], loot: () => [GameItems.mkEquipDrop('armor', Utils.rollRarity())] },
  { id: 'orc', name: '👊 Orc Warrior', icon: '👊', hp: 80, atk: 20, def: 7, xp: 75, gold: [20, 40], loot: () => [GameItems.mkEquipDrop('weapon', Utils.rollRarity()), GameItems.mkMat('🪓 Orc Fragment', 'normal', 8)] },
  { id: 'vampire', name: '🧛 Vampire', icon: '🧛', hp: 90, atk: 22, def: 8, xp: 90, gold: [25, 50], loot: () => [GameItems.mkEquipDrop('ring', Utils.rollRarity()), GameItems.mkCons('🩸 Blood Vial', 'uncommon', 35, 8)] },
  { id: 'troll', name: '👾 Cave Troll', icon: '👾', hp: 110, atk: 26, def: 10, xp: 100, gold: [30, 55], loot: () => [GameItems.mkEquipDrop('armor', Utils.rollRarity()), GameItems.mkMat('💎 Troll Gem', 'rare', 30)] },
  { id: 'golem', name: '🗿 Stone Golem', icon: '🗿', hp: 130, atk: 28, def: 14, xp: 120, gold: [35, 60], loot: () => [GameItems.mkEquipDrop('helmet', Utils.rollRarity()), GameItems.mkMat('🪨 Stone Core', 'uncommon', 15)] },
  { id: 'demon_knight', name: '😈 Demon Knight', icon: '😈', hp: 150, atk: 32, def: 12, xp: 145, gold: [40, 70], loot: () => [GameItems.mkEquipDrop('weapon', 'rare'), GameItems.mkEquipDrop('armor', Utils.rollRarity())] },
  { id: 'werewolf', name: '🐺 Werewolf', icon: '🐺', hp: 170, atk: 36, def: 15, xp: 165, gold: [45, 80], loot: () => [GameItems.mkEquipDrop('boots', Utils.rollRarity()), GameItems.mkMat('🌕 Moon Shard', 'rare', 25)] },
  { id: 'sea_monster', name: '🦑 Sea Monster', icon: '🦑', hp: 200, atk: 42, def: 18, xp: 190, gold: [55, 95], loot: () => [GameItems.mkEquipDrop('amulet', Utils.rollRarity()), GameItems.mkMat('🦑 Kraken Ink', 'epic', 45)] },
  { id: 'phoenix', name: '🦅 Phoenix', icon: '🦅', hp: 230, atk: 50, def: 20, xp: 220, gold: [65, 110], loot: () => [GameItems.mkEquipDrop('ring', Utils.rollRarity()), GameItems.mkMat('🔥 Phoenix Feather', 'epic', 60)] },
];

// ════════════════════════════════════════════════════════════════
// ITEMS & CRAFTING
// ════════════════════════════════════════════════════════════════

const GameItems = {
  EQUIP_PREFIXES: {
    legendary: ['Divine', 'Mythic', 'Godforged', 'Ancient', 'Eternal', 'Celestial'],
    epic: ['Heroic', 'Valiant', 'Exalted', 'Magnificent', 'Radiant'],
    rare: ['Polished', 'Reinforced', 'Enchanted', 'Gleaming'],
    uncommon: ['Sturdy', 'Sharpened', 'Improved'],
    normal: ['Iron', 'Wooden', 'Basic', 'Simple'],
  },

  EQUIP_NAMES: {
    weapon: ['Blade', 'Sword', 'Axe', 'Spear', 'Dagger', 'Staff', 'Bow'],
    armor: ['Plate', 'Chainmail', 'Robe', 'Leather', 'Cuirass'],
    helmet: ['Helm', 'Crown', 'Hood', 'Circlet', 'Visor'],
    boots: ['Greaves', 'Sabatons', 'Boots', 'Treads'],
    ring: ['Band', 'Seal', 'Loop', 'Signet'],
    amulet: ['Pendant', 'Amulet', 'Talisman', 'Necklace'],
  },

  EQUIP_STATS: {
    weapon: { str: [2, 6] },
    armor: { def: [2, 5] },
    helmet: { def: [1, 3], int: [1, 2] },
    boots: { agi: [2, 5] },
    ring: { str: [1, 3], int: [1, 3] },
    amulet: { int: [2, 4], maxMp: [10, 20] },
  },

  mkEquipDrop(slot, rarity) {
    const mult = RARITY[rarity].mult;
    const prefix = this.EQUIP_PREFIXES[rarity] [Math.floor(Math.random() * this.EQUIP_PREFIXES[rarity].length)];
    const suffix = this.EQUIP_NAMES[slot] [Math.floor(Math.random() * this.EQUIP_NAMES[slot].length)];
    const stats = {};
    Object.entries(this.EQUIP_STATS[slot]).forEach(([k, [mn, mx]]) => {
      stats[k] = Math.round((Math.floor(Math.random() * (mx - mn + 1)) + mn) * mult);
    });
    return {
      uid: Utils.genUid(),
      name: `${SLOT_ICONS[slot]} ${prefix} ${suffix}`,
      category: 'equipment',
      slot,
      rarity,
      stats,
      equipped: false,
      sellPrice: Math.round(12 * mult * (GameState.level || 1) * 0.4),
    };
  },

  mkMat(name, rarity, sellPrice) {
    return { uid: Utils.genUid(), name, category: 'material', rarity, sellPrice, stackable: true, qty: 1 };
  },

  mkCons(name, rarity, sellPrice, hpVal) {
    return { uid: Utils.genUid(), name, category: 'consumable', rarity, sellPrice, stackable: true, qty: 1, effect: 'hp', val: hpVal };
  },
};

const CRAFTING = [
  {
    id: 'craft_steel_sword',
    result: { name: '⚔️ Crafted Steel Sword', slot: 'weapon', rarity: 'rare', stats: { str: 10 }, category: 'equipment' },
    req: [{ name: '🪓 Orc Fragment', qty: 3 }, { name: '🪶 Wolf Fang', qty: 2 }],
    desc: 'A powerful steel sword forged from orc metal',
  },
  {
    id: 'craft_shadow_blade',
    result: { name: '🗡️ Shadow Blade', slot: 'weapon', rarity: 'epic', stats: { str: 8, agi: 6 }, category: 'equipment' },
    req: [{ name: '🌕 Moon Shard', qty: 2 }, { name: '🪶 Wolf Fang', qty: 3 }, { name: '🕸️ Spider Silk', qty: 2 }],
    desc: 'A blade imbued with shadow energy',
  },
  {
    id: 'craft_dragon_armor',
    result: { name: '🛡️ Dragon Scale Armor', slot: 'armor', rarity: 'epic', stats: { def: 12 }, category: 'equipment' },
    req: [{ name: '🐉 Dragon Scale', qty: 3 }, { name: '🪨 Stone Core', qty: 2 }],
    desc: 'Armor forged from dragon scales',
  },
  {
    id: 'craft_void_ring',
    result: { name: '💍 Void Ring', slot: 'ring', rarity: 'epic', stats: { str: 5, int: 5, agi: 5 }, category: 'equipment' },
    req: [{ name: '🌑 Void Crystal', qty: 2 }, { name: '💎 Troll Gem', qty: 3 }],
    desc: 'A ring channeling the power of the void',
  },
  {
    id: 'craft_phoenix_amulet',
    result: { name: '📿 Phoenix Amulet', slot: 'amulet', rarity: 'legendary', stats: { int: 15, maxMp: 40 }, category: 'equipment' },
    req: [{ name: '🔥 Phoenix Feather', qty: 2 }, { name: '🔥 Dragon Flame', qty: 2 }, { name: '💎 Pure Crystal Core', qty: 1 }],
    desc: 'Ultimate mage amulet — requires rare boss drops',
  },
  {
    id: 'craft_titan_helm',
    result: { name: '⛑️ Titan Helm', slot: 'helmet', rarity: 'legendary', stats: { def: 20, str: 8 }, category: 'equipment' },
    req: [{ name: '⚡ Titan Soul', qty: 1 }, { name: '💀 Death Essence', qty: 2 }, { name: '🪨 Stone Core', qty: 3 }],
    desc: 'A helmet of godlike defense',
  },
  {
    id: 'craft_chaos_boots',
    result: { name: '👢 Chaos Treads', slot: 'boots', rarity: 'legendary', stats: { agi: 18, str: 5 }, category: 'equipment' },
    req: [{ name: '🌀 Chaos Essence', qty: 2 }, { name: '🌕 Moon Shard', qty: 3 }],
    desc: 'Boots that bend space with every step',
  },
  {
    id: 'craft_mega_potion',
    result: { name: '❤️ Mega Elixir', category: 'consumable', rarity: 'epic', effect: 'hp', val: 150, stackable: true, qty: 1 },
    req: [{ name: '🩸 Blood Vial', qty: 3 }, { name: '🔥 Phoenix Feather', qty: 1 }],
    desc: 'Restores 150 HP instantly',
  },
  {
    id: 'craft_divine_blade',
    result: { name: '⚔️ Divine Blade', slot: 'weapon', rarity: 'legendary', stats: { str: 22 }, category: 'equipment' },
    req: [{ name: '☄️ Divine Shard', qty: 2 }, { name: '🐉 Dragon Scale', qty: 2 }, { name: '😈 Demon Horn', qty: 1 }],
    desc: 'The ultimate weapon — forged from fallen god material',
  },
];

// ════════════════════════════════════════════════════════════════
// SCENES
// ════════════════════════════════════════════════════════════════

const SCENES = {
  town: {
    title: '🏘️ Town Square',
    text: 'You stand in the peaceful town square. Merchants hawk their wares and adventurers share tales of glory.',
    choices: [
      { text: '🌲 Dark Forest', next: 'forest' },
      { text: '⛰️ Dungeon', next: 'dungeon' },
      { text: '🏔️ Mountains', next: 'mountains' },
      { text: '🌊 Coast', next: 'coast' },
      { text: '🏜️ Wasteland', next: 'wasteland' },
      { text: '🌋 Volcanic Rift', next: 'volcanic' },
      { text: '🏪 Shop', next: 'shop_scene' },
      { text: '⛪ Inn (+40 HP/MP, 5g)', next: 'inn' },
    ],
  },
  forest: {
    title: '🌲 Dark Forest',
    text: 'Ancient trees tower overhead. Creatures lurk in every shadow.',
    choices: [
      { text: '🐺 Fight Wolf', next: 'combat', enemy: 'wolf' },
      { text: '🕷️ Fight Spider', next: 'combat', enemy: 'spider' },
      { text: '🔍 Search treasure', next: 'forest_chest' },
      { text: '🌿 Gather herbs (+20 HP)', next: 'gather_herbs' },
      { text: '🐉 Boss: Ancient Dragon (Lv10+)', next: 'boss_fight', bossId: 'boss_10' },
      { text: '🏘️ Town', next: 'town' },
    ],
  },
  forest_chest: {
    title: '💎 Hidden Clearing',
    text: 'You find a hidden chest buried under ancient roots!',
    choices: [{ text: '📦 Open it', next: 'chest_open' }, { text: '🏘️ Return', next: 'town' }],
  },
  chest_open: {
    title: '📦 Ancient Chest',
    text: 'The chest opens revealing glittering treasures!',
    action: () => {
      const g = Math.floor(Math.random() * 25) + 15;
      GameState.gold += g;
      const drop = GameItems.mkEquipDrop(['weapon', 'armor', 'ring', 'boots'] [Math.floor(Math.random() * 4)], Utils.rollRarity());
      GameInventory.add(drop);
      GameLog.add(`Found ${g} gold + ${drop.name}!`, 'gold');
      if (drop.rarity === 'legendary') GameState.quests.legendary.done = true;
      GameUI.updateUI();
      GameInventory.render();
    },
    choices: [{ text: '🌲 Continue', next: 'forest' }, { text: '🏘️ Town', next: 'town' }],
  },
  gather_herbs: {
    title: '🌿 Herb Gathering',
    text: 'You find healing herbs and feel refreshed!',
    action: () => {
      GameState.hp = Math.min(GameState.maxHp, GameState.hp + 20);
      GameLog.add('Gathered herbs: +20 HP', 'good');
      Utils.playSound('snd-heal');
      GameUI.updateUI();
    },
    choices: [{ text: '🌲 Continue', next: 'forest' }, { text: '🏘️ Town', next: 'town' }],
  },
  dungeon: {
    title: '⛰️ Dungeon Depths',
    text: 'Dark stone corridors stretch before you. Multiple passages lead into darkness.',
    choices: [
      { text: '👹 Fight Goblin', next: 'combat', enemy: 'goblin' },
      { text: '💀 Fight Skeleton', next: 'combat', enemy: 'skeleton' },
      { text: '👊 Fight Orc', next: 'combat', enemy: 'orc' },
      { text: '🗿 Fight Stone Golem', next: 'combat', enemy: 'golem' },
      { text: '💀 Boss: Lich King (Lv20+)', next: 'boss_fight', bossId: 'boss_20' },
      { text: '🏘️ Town', next: 'town' },
    ],
  },
  mountains: {
    title: '🏔️ Frozen Mountains',
    text: 'Cold winds cut through the air. Dangerous creatures prowl the peaks.',
    choices: [
      { text: '🧛 Fight Vampire', next: 'combat', enemy: 'vampire' },
      { text: '👾 Fight Cave Troll', next: 'combat', enemy: 'troll' },
      { text: '🐺 Fight Werewolf', next: 'combat', enemy: 'werewolf' },
      { text: '⛏️ Mine gems', next: 'mine_gems' },
      { text: '😈 Boss: Demon Lord (Lv30+)', next: 'boss_fight', bossId: 'boss_30' },
      { text: '🏘️ Town', next: 'town' },
    ],
  },
  mine_gems: {
    title: '⛏️ Crystal Cave',
    text: 'You chip away at glittering crystal walls!',
    action: () => {
      const g = Math.floor(Math.random() * 20) + 10;
      GameState.gold += g;
      GameInventory.add(GameItems.mkMat('💎 Mountain Crystal', Utils.rollRarity(), g));
      GameLog.add(`Mined ${g}g worth of gems!`, 'gold');
      GameUI.updateUI();
      GameInventory.render();
    },
    choices: [{ text: '🏔️ Continue', next: 'mountains' }, { text: '🏘️ Town', next: 'town' }],
  },
  coast: {
    title: '🌊 Stormy Coast',
    text: 'Dark waves crash against jagged rocks. Pirates and sea monsters lurk here.',
    choices: [
      { text: '😈 Fight Demon Knight', next: 'combat', enemy: 'demon_knight' },
      { text: '🦑 Fight Sea Monster', next: 'combat', enemy: 'sea_monster' },
      { text: '🏴‍☠️ Pirate treasure', next: 'pirate_treasure' },
      { text: '⚡ Boss: Ancient Titan (Lv40+)', next: 'boss_fight', bossId: 'boss_40' },
      { text: '🌑 Boss: Void Dragon (Lv50+)', next: 'boss_fight', bossId: 'boss_50' },
      { text: '🏘️ Town', next: 'town' },
    ],
  },
  pirate_treasure: {
    title: '🏴‍☠️ Pirate Treasure',
    text: 'You find a washed up treasure chest!',
    action: () => {
      const g = Math.floor(Math.random() * 40) + 20;
      GameState.gold += g;
      GameInventory.add(GameItems.mkEquipDrop('amulet', Utils.rollRarity()));
      GameLog.add(`Pirate treasure: ${g} gold!`, 'gold');
      GameUI.updateUI();
      GameInventory.render();
    },
    choices: [{ text: '🌊 Continue', next: 'coast' }, { text: '🏘️ Town', next: 'town' }],
  },
  wasteland: {
    title: '🏜️ Barren Wasteland',
    text: 'A desolate landscape stretches endlessly. Ancient ruins dot the horizon.',
    choices: [
      { text: '🦅 Fight Phoenix', next: 'combat', enemy: 'phoenix' },
      { text: '🗿 Fight Stone Golem', next: 'combat', enemy: 'golem' },
      { text: '🔍 Ancient ruins', next: 'ancient_ruins' },
      { text: '🔱 Boss: Sea Leviathan (Lv60+)', next: 'boss_fight', bossId: 'boss_60' },
      { text: '🏘️ Town', next: 'town' },
    ],
  },
  ancient_ruins: {
    title: '🏛️ Ancient Ruins',
    text: 'Crumbling pillars surround a glowing altar of incredible power.',
    action: () => {
      const drop = GameItems.mkEquipDrop(['weapon', 'armor', 'helmet', 'ring', 'amulet'] [Math.floor(Math.random() * 5)], 'rare');
      GameInventory.add(drop);
      GameLog.add(`Found ${drop.name} in the ruins!`, 'gold');
      GameUI.updateUI();
      GameInventory.render();
    },
    choices: [{ text: '🏜️ Continue', next: 'wasteland' }, { text: '🏘️ Town', next: 'town' }],
  },
  volcanic: {
    title: '🌋 Volcanic Rift',
    text: 'Rivers of lava flow through cracked earth. The most dangerous creatures live here.',
    choices: [
      { text: '🦅 Fight Phoenix', next: 'combat', enemy: 'phoenix' },
      { text: '😈 Fight Demon Knight', next: 'combat', enemy: 'demon_knight' },
      { text: '🦑 Fight Sea Monster', next: 'combat', enemy: 'sea_monster' },
      { text: '☄️ Boss: Fallen God (Lv70+)', next: 'boss_fight', bossId: 'boss_70' },
      { text: '🌀 Boss: Chaos Serpent (Lv80+)', next: 'boss_fight', bossId: 'boss_80' },
      { text: '🏘️ Town', next: 'town' },
    ],
  },
  shop_scene: {
    title: '🏪 General Shop',
    text: 'The shopkeeper greets you warmly. Browse items on the right!',
    choices: [{ text: '🏘️ Leave Shop', next: 'town' }],
  },
  inn: {
    title: '⛪ The Rusty Flagon Inn',
    text: 'You rest comfortably. Your wounds heal and energy is restored.',
    action: () => {
        const restCost = 5;
      if (GameState.gold >= 5) {
        GameState.gold -= 5;
        GameState.hp = Math.min(GameState.maxHp, GameState.hp + 40);
        GameState.mp = Math.min(GameState.maxMp, GameState.mp + 40);
        GameLog.add('Rested: +40 HP, +40 MP. Cost 5g.', 'good');
        Utils.playSound('snd-heal');
      } else {
        GameLog.add('Need 5 gold to rest!', 'bad');
      }
      GameUI.updateUI();
    },
    choices: [{ text: '🏘️ Return to Town', next: 'town' }],
  },
  victory: {
    title: '🏆 Victory!',
    text: 'You defeated the enemy and claimed your reward!',
    choices: [
      { text: '🌲 Forest', next: 'forest' },
      { text: '⛰️ Dungeon', next: 'dungeon' },
      { text: '🏔️ Mountains', next: 'mountains' },
      { text: '🌊 Coast', next: 'coast' },
      { text: '🏜️ Wasteland', next: 'wasteland' },
      { text: '🌋 Volcanic Rift', next: 'volcanic' },
      { text: '🏘️ Town', next: 'town' },
    ],
  },
  defeat: {
    title: '💀 Defeated...',
    text: 'You have fallen. The townspeople carry you back to safety.',
    action: () => {
      const lost = Math.floor(GameState.gold * 0.15);
      GameState.gold = Math.max(0, GameState.gold - lost);
      GameState.hp = Math.floor(GameState.maxHp * 0.5);
      GameState.mp = Math.floor(GameState.maxMp * 0.5);
      GameLog.add(`Lost ${lost} gold. Revived.`, 'bad');
      Utils.playSound('snd-death');
      GameUI.updateUI();
    },
    choices: [{ text: '🔄 Back to Town', next: 'town' }],
  },
};

// ════════════════════════════════════════════════════════════════
// SHOP ITEMS
// ════════════════════════════════════════════════════════════════

const SHOP_EQUIP = [
  { id: 's1', name: '⚔️ Iron Sword', price: 20, slot: 'weapon', rarity: 'normal', stats: { str: 3 } },
  { id: 's2', name: '⚔️ Steel Sword', price: 50, slot: 'weapon', rarity: 'uncommon', stats: { str: 7 } },
  { id: 's3', name: '🛡️ Wooden Shield', price: 18, slot: 'armor', rarity: 'normal', stats: { def: 2 } },
  { id: 's4', name: '🛡️ Iron Plate', price: 40, slot: 'armor', rarity: 'uncommon', stats: { def: 5 } },
  { id: 's5', name: '👢 Leather Boots', price: 22, slot: 'boots', rarity: 'normal', stats: { agi: 3 } },
  { id: 's6', name: '💍 Power Ring', price: 35, slot: 'ring', rarity: 'uncommon', stats: { str: 3, int: 2 } },
  { id: 's7', name: '⛑️ Iron Helm', price: 28, slot: 'helmet', rarity: 'normal', stats: { def: 2, int: 1 } },
  { id: 's8', name: '📿 Mage Amulet', price: 55, slot: 'amulet', rarity: 'rare', stats: { int: 6, maxMp: 15 } },
];

const SHOP_CONS = [
  { id: 'c1', name: '❤️ Health Potion', price: 10, rarity: 'normal', effect: 'hp', val: 40 },
  { id: 'c2', name: '❤️ Mega Potion', price: 22, rarity: 'uncommon', effect: 'hp', val: 80 },
  { id: 'c3', name: '💧 Mana Potion', price: 8, rarity: 'normal', effect: 'mp', val: 30 },
  { id: 'c4', name: '💧 Mana Flask', price: 18, rarity: 'uncommon', effect: 'mp', val: 60 },
  { id: 'c5', name: '✨ Elixir', price: 40, rarity: 'rare', effect: 'both', val: 60 },
];

// ════════════════════════════════════════════════════════════════
// GAME SCENES MODULE
// ════════════════════════════════════════════════════════════════

const GameScenes = {
  load(sceneId) {
    if (sceneId === 'boss_fight') return;
    if (sceneId === 'combat') return;
    const scene = SCENES[sceneId];
    if (!scene) return;

    GameState.currentScene = sceneId;
    if (scene.action) scene.action();

    document.getElementById('story-content').innerHTML = `<div class="scene-title">${scene.title}</div><p>${scene.text}</p>`;
    document.getElementById('combat-box').style.display = 'none';

    const box = document.getElementById('choices-box');
    box.innerHTML = '';
    box.style.display = 'flex';

    scene.choices.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn fade-in';
      btn.innerHTML = c.text;

      if (c.enemy) {
        btn.onclick = () => GameCombat.startNormal(c.enemy);
      } else if (c.bossId) {
        btn.onclick = () => GameCombat.triggerBoss(c.bossId);
      } else {
        btn.onclick = () => GameScenes.load(c.next);
      }

      box.appendChild(btn);
    });

    GameUI.updateUI();
  },
};

// ════════════════════════════════════════════════════════════════
// COMBAT MODULE
// ════════════════════════════════════════════════════════════════

const GameCombat = {
  triggerBoss(bossId) {
    const boss = BOSSES.find(b => b.id === bossId);
    if (!boss) return;
    if (GameState.level < boss.levelReq) {
      Utils.notify(`⚠️ Need Level ${boss.levelReq} for this boss!`, 'var(--red)');
      return;
    }

    GameEngine.pendingBossId = bossId;
    const cs = boss.cs;
    document.getElementById('boss-icon').textContent = cs.icon || boss.icon;
    document.getElementById('boss-cs-name').textContent = cs.title;
    document.getElementById('boss-cs-req').textContent = cs.req || '';
    document.getElementById('boss-cs-text').textContent = cs.text;
    document.getElementById('boss-cutscene').style.display = 'block';
    Utils.playSound('snd-boss');
  },

  startNormal(enemyId) {
    const tmpl = NORMAL_ENEMIES.find(e => e.id === enemyId);
    if (!tmpl) return;

    const scale = 1 + Math.max(0, (GameState.level - 1) * CONSTANTS.ENEMY_SCALING);
    GameEngine.currentEnemy = {
      ...tmpl,
      hp: Math.floor(tmpl.hp * scale),
      maxHp: Math.floor(tmpl.hp * scale),
      atk: Math.floor(tmpl.atk * scale),
      def: tmpl.def,
      poisoned: 0,
      frozen: false,
      crippled: 0,
      boss: false,
    };
    this.start(GameEngine.currentEnemy);
  },

  start(enemy) {
    document.getElementById('enemy-hp-val').textContent = enemy.hp;
    document.getElementById('enemy-hp-max').textContent = enemy.maxHp;
    document.getElementById('arena-enemy').textContent = enemy.icon;
    document.getElementById('arena-enemy-label').textContent = enemy.name;
    document.getElementById('arena-enemy-hp').style.width = '100%';
    document.getElementById('combat-log').innerHTML = '';
    document.getElementById('combat-box').style.display = 'block';
    document.getElementById('choices-box').style.display = 'none';
    document.getElementById('story-content').innerHTML = `<div class="scene-title">⚔️ Combat!</div><p><strong style="color:var(--red)">${enemy.name}</strong> appears!${enemy.boss ? '<br><span style="color:var(--gold)">⚠️ BOSS BATTLE!</span>' : ''}</p>`;
    this.addLog(`Encountered ${enemy.name}!`, 'bad');
    GameState.defending = false;
  },

  action(type) {
    if (!GameEngine.currentEnemy) return;
    const enemy = GameEngine.currentEnemy;

    if (type === 'attack') {
      let dmg = Math.max(1, GameState.str + Math.floor(Math.random() * 8) - enemy.def);
      let isCrit = false;

      if (GameState.unlockedTalents.includes('berserker') && GameState.hp < GameState.maxHp * 0.5) {
        dmg = Math.floor(dmg * 1.35);
      }
      if (GameState.unlockedTalents.includes('crit') && Math.random() < 0.3) {
        dmg = Math.floor(dmg * 2);
        isCrit = true;
      }
      if (GameState.unlockedTalents.includes('death_mark')) dmg = Math.floor(dmg * 1.5);
      if (GameState.unlockedTalents.includes('venom')) enemy.poisoned = (enemy.poisoned || 0) + 1;

      enemy.hp -= dmg;
      this.addLog(`⚔️ ${isCrit ? '💥CRIT! ' : ''}You hit for ${dmg}!`, isCrit ? 'gold' : 'good');
      Utils.playSound('snd-attack');
      this.animateAttack(true, dmg, isCrit);
      GameState.defending = false;
          } else if (type === 'magic') {
      if (GameState.mp < 10) {
        this.addLog('❌ Not enough MP!', 'bad');
        return;
      }
      let dmg = Math.max(1, GameState.int * 2 + Math.floor(Math.random() * 10));
      if (GameState.unlockedTalents.includes('spell_power')) dmg = Math.floor(dmg * 1.3);
      if (GameState.unlockedTalents.includes('fire_mastery')) dmg = Math.floor(dmg * 1.2);
      enemy.hp -= dmg;
      GameState.mp -= 10;
      this.addLog(`✨ Magic hits for ${dmg}! (-10 MP)`, 'info');
      Utils.playSound('snd-magic');
      this.animateAttack(true, dmg, false);
      GameState.defending = false;
    } else if (type === 'defend') {
      GameState.defending = true;
      this.addLog('🛡️ Bracing for impact!', 'info');
    } else if (type === 'flee') {
      const ok = GameState.unlockedTalents.includes('smoke_bomb') ? 0.99 : GameState.agi > enemy.def ? 0.7 : 0.35;
      if (Math.random() < ok) {
        GameLog.add('Fled from battle!', 'bad');
        GameEngine.currentEnemy = null;
        document.getElementById('combat-box').style.display = 'none';
        GameScenes.load('town');
        return;
      }
      this.addLog('❌ Failed to flee!', 'bad');
      GameState.defending = false;
    }

    if (enemy && enemy.hp <= 0) {
      enemy.hp = 0;
      this.updateEnemyBar();
      this.end(true);
      return;
    }

    if (GameState.unlockedTalents.includes('second_wind')) GameState.hp = Math.min(GameState.maxHp, GameState.hp + 10);
    if (GameState.unlockedTalents.includes('mana_regen')) GameState.mp = Math.min(GameState.maxMp, GameState.mp + 5);

    if (enemy && enemy.hp > 0) {
      if (enemy.frozen) {
        enemy.frozen = false;
        this.addLog(`${enemy.name} is frozen!`, 'info');
      } else {
        let eDmg = Math.max(1, enemy.atk + Math.floor(Math.random() * 6) - GameState.def);
        if (GameState.defending) eDmg = Math.floor(eDmg / (GameState.unlockedTalents.includes('fortress') ? 4 : 2));
        if (GameState.unlockedTalents.includes('shield_wall')) eDmg = Math.floor(eDmg * 0.9);
        if (GameState.manaShield) {
          GameState.manaShield = false;
          this.addLog('🔮 Mana Shield absorbed!', 'info');
          eDmg = 0;
        }
        if (GameState.unlockedTalents.includes('evasion') && Math.random() < 0.25) {
          this.addLog('💨 Dodged!', 'good');
          eDmg = 0;
        }
        GameState.hp -= eDmg;
        if (eDmg > 0) {
          this.addLog(`${enemy.name} hits you for ${eDmg}!`, 'bad');
          this.animateAttack(false, eDmg, false);
        }
      }

      if (enemy.poisoned > 0) {
        const pd = 8;
        enemy.hp -= pd;
        enemy.poisoned--;
        this.addLog(`🐍 Poison deals ${pd}!`, 'good');
      }

      if (GameState.hp <= 0 && GameState.unlockedTalents.includes('undying') && !GameState.usedUndying) {
        GameState.hp = 1;
        GameState.usedUndying = true;
        this.addLog('💪 Undying Will! Survived!', 'gold');
      }

      if (GameState.hp <= 0) {
        GameState.hp = 0;
        GameUI.updateUI();
        this.end(false);
        return;
      }
    }

    if (enemy && enemy.hp <= 0) {
      enemy.hp = 0;
      this.updateEnemyBar();
      this.end(true);
      return;
    }

    this.updateEnemyBar();
    GameUI.updateUI();
  },

  end(won) {
  GameState.usedUndying = false;
  if (won) {
    const enemy = GameEngine.currentEnemy;
    
    // ✅ FIX: Ensure gold is a valid number
    const minGold = parseInt(enemy.gold) || 0;
    const maxGold = parseInt(enemy.gold) || minGold;
    const g = Math.floor(Math.random() * (maxGold - minGold + 1)) + minGold;
    
    // Validate gold amount
    if (isNaN(g) || g < 0) {
      console.error('Invalid gold amount:', g);
      GameState.gold += 0;
    } else {
      GameState.gold += g;
    }
    
    GameState.xp += enemy.xp;
    GameLog.add(`Defeated ${enemy.name}! +${enemy.xp} XP, +${isNaN(g) ? 0 : g} Gold`, 'good');

      if (enemy.loot) {
        enemy.loot().forEach(item => {
          GameInventory.add(item);
          GameLog.add(`Loot: ${item.name} [${RARITY[item.rarity]?.label || 'Normal'}]`, item.rarity === 'legendary' ? 'legendary' : item.rarity === 'epic' ? 'epic' : 'gold');
          if (item.rarity === 'legendary') GameState.quests.legendary.done = true;
        });
      }

      if (enemy.boss) GameState.quests.boss.done = true;
      GameState.quests.kill1.done = true;
      if (GameState.gold >= 50) GameState.quests.gold50.done = true;

      GameInventory.autoSellAfterCombat();
      GameProgression.checkLevelUp();
      GameQuests.render();
      GameEngine.currentEnemy = null;
      document.getElementById('combat-box').style.display = 'none';
      GameScenes.load('victory');
    } else {
      GameEngine.currentEnemy = null;
      document.getElementById('combat-box').style.display = 'none';
      GameScenes.load('defeat');
    }
    GameUI.updateUI();
  },

  updateEnemyBar() {
    if (!GameEngine.currentEnemy) return;
    const p = Math.max(0, (GameEngine.currentEnemy.hp / GameEngine.currentEnemy.maxHp) * 100);
    document.getElementById('arena-enemy-hp').style.width = p + '%';
    document.getElementById('enemy-hp-val').textContent = Math.max(0, GameEngine.currentEnemy.hp);
  },

  animateAttack(isPlayer, dmg, isCrit) {
    if (isPlayer) {
      const a = document.getElementById('char-avatar');
      a.classList.remove('attacking');
      void a.offsetWidth;
      a.classList.add('attacking');
      setTimeout(() => a.classList.remove('attacking'), 500);
      const e = document.getElementById('arena-enemy');
      e.classList.remove('enemy-shake', 'enemy-hit');
      void e.offsetWidth;
      e.classList.add('enemy-shake');
      setTimeout(() => e.classList.remove('enemy-shake'), 500);
    } else {
      const p = document.getElementById('arena-player');
      p.classList.remove('enemy-shake');
      void p.offsetWidth;
      p.classList.add('enemy-shake');
      setTimeout(() => p.classList.remove('enemy-shake'), 400);
      const c = document.getElementById('char-avatar');
      c.classList.add('hit');
      setTimeout(() => c.classList.remove('hit'), 400);
    }
    this.spawnDmgFloat(isCrit ? `💥${dmg}!` : String(dmg), !isPlayer, isCrit ? 'crit-dmg' : isPlayer ? 'enemy-dmg' : 'player-dmg');
  },

  spawnDmgFloat(text, onEnemy, cls = '') {
    const arena = document.getElementById('arena');
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const div = document.createElement('div');
    div.className = `dmg-float ${cls}`;
    div.textContent = text;
    div.style.left = (onEnemy ? rect.right - 80 : rect.left + 30) + 'px';
    div.style.top = (rect.top + rect.height / 2 - 20) + 'px';
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 950);
  },

  addLog(msg, type = '') {
    const b = document.getElementById('combat-log');
    const d = document.createElement('div');
    d.className = `log-entry ${type ? 'log-' + type : ''}`;
    d.textContent = msg;
    b.appendChild(d);
    b.scrollTop = b.scrollHeight;
  },
};

// ════════════════════════════════════════════════════════════════
// PROGRESSION MODULE
// ════════════════════════════════════════════════════════════════

const GameProgression = {
  checkLevelUp() {
    while (GameState.xp >= GameState.xpNext && GameState.level < GameState.maxLevel) {
      GameState.xp -= GameState.xpNext;
      GameState.level++;
      GameState.xpNext = Math.floor(GameState.level * 100 * CONSTANTS.XP_MULTIPLIER);
      GameState.maxHp += 20;
      GameState.hp = GameState.maxHp;
      GameState.maxMp += 10;
      GameState.mp = GameState.maxMp;
      GameState.str += 2;
      GameState.agi += 2;
      GameState.int += 2;
      GameState.def += 1;
      GameState.talentPoints += 2;

      document.getElementById('char-level').textContent = `Level ${GameState.level} / 100`;
      GameLog.add(`🎉 LEVEL UP! Level ${GameState.level}! +2 Talent Points!`, 'gold');
      Utils.playSound('snd-levelup');
      Utils.notify(`🎉 Level Up! Now Level ${GameState.level}!`, 'var(--gold)');

      if (GameState.level >= 5) GameState.quests.level5.done = true;
      if (GameState.level >= 10) {
        GameState.quests.level10.done = true;
        if (!GameState.class) GameUI.showClassSelection();
      }
      if (GameState.level >= 50) GameState.quests.level50.done = true;
      if (GameState.level >= 100) GameState.quests.level100.done = true;

      if (GameState.class) document.getElementById('talent-btn').style.display = 'inline-block';
      GameUI.updateTalentBtn();
    }

    if (GameState.level >= GameState.maxLevel) {
      GameLog.add('🌟 MAX LEVEL REACHED! You are a legend!', 'legendary');
      GameState.xp = 0;
    }
  },
};

// ════════════════════════════════════════════════════════════════
// INVENTORY MODULE
// ════════════════════════════════════════════════════════════════

const GameInventory = {
  add(item) {
    if (item.stackable) {
      const existing = GameState.inventory.find(
        i => i.name === item.name && i.rarity === item.rarity && i.stackable && !i.equipped
      );
      if (existing) {
        existing.qty = (existing.qty || 1) + (item.qty || 1);
        this.render();
        return;
      }
    }
    GameState.inventory.push({ ...item, uid: item.uid || Utils.genUid() });
    this.render();
  },

  switchTab(tab) {
    GameState.invTab = tab;
    document.querySelectorAll('#inv-tabs .tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`inv-tab-${tab}`).classList.add('active');
    this.render();
  },

  render() {
    const list = document.getElementById('inventory-list');
    const items = GameState.inventory.filter(i => i.category === GameState.invTab);

    if (!items.length) {
      list.innerHTML = '<div class="inv-empty">No items here</div>';
      return;
    }

    const r_ = r => RARITY[r] || RARITY.normal;
    list.innerHTML = items
      .map(item => {
        const r = r_(item.rarity);
        const statsText = item.stats ? Object.entries(item.stats).map(([k, v]) => `+${v}${k.toUpperCase()}`).join(' ') : '';
        const consText = item.effect ? `Restores ${item.val} ${item.effect === 'both' ? 'HP+MP' : item.effect.toUpperCase()}` : '';
        const stackBadge = item.stackable && item.qty > 1 ? `<span class="inv-item-stack">×${item.qty}</span>` : '';

        const enhClass = item.enhanceLevel >= 15 ? 'enhanced-max' : item.enhanceLevel >= 7 ? 'enhanced-high' : '';
       return `<div class="inv-item ${item.rarity} ${enhClass}">
          <div class="inv-item-top">
            <div class="inv-item-name" style="color:${r.color}">${item.name}</div>
            ${stackBadge}
          </div>
          <div style="font-size:.7em;color:${r.color};margin-top:1px;">${r.label}</div>
          <div class="inv-item-stats">${statsText || consText}</div>
          <div style="font-size:.7em;color:#555;margin-top:2px;">Sell: ${item.sellPrice || 0}g${item.stackable && item.qty > 1 ? ` (total: ${(item.sellPrice || 0) * item.qty}g)` : ''}</div>
          <div class="inv-item-btns">
           ${
         item.category === 'equipment'
           ? item.equipped
             ? `<button class="inv-btn btn-unequip" onclick="GameEquipment.unequip('${item.slot}')">Unequip</button>`
             : `<button class="inv-btn btn-equip" onclick="GameEquipment.equip(${item.uid})">Equip</button>`
           : ''
       }  
          ${item.category === 'equipment'
         ? `<button class="inv-btn btn-enhance" onclick="GameEnhancement.open(${item.uid})">⚒️ +${item.enhanceLevel || 0}</button>`
         : ''}
            ${item.category === 'consumable' ? `<button class="inv-btn btn-use" onclick="GameInventory.useItem(${item.uid})">Use</button>` : ''}
            ${!item.equipped ? `<button class="inv-btn btn-sell" onclick="GameInventory.sellItem(${item.uid})">Sell${item.stackable && item.qty > 1 ? ' All' : ''}</button>` : ''}
          </div>
        </div>`;
      })
      .join('');
  },

  useItem(uid) {
    const idx = GameState.inventory.findIndex(i => i.uid === uid);
    if (idx === -1) return;
    const item = GameState.inventory[idx];

    if (item.category === 'consumable') {
      if (item.effect === 'hp' || item.effect === 'both') {
        GameState.hp = Math.min(GameState.maxHp, GameState.hp + (item.val || 40));
        GameLog.add(`Used ${item.name}: +${item.val} HP`, 'good');
        Utils.playSound('snd-heal');
        GameCombat.spawnDmgFloat(`+${item.val}HP`, false, 'heal-float');
      }
      if (item.effect === 'mp' || item.effect === 'both') {
        GameState.mp = Math.min(GameState.maxMp, GameState.mp + (item.val || 30));
        GameLog.add(`Used ${item.name}: +${item.val} MP`, 'info');
        GameCombat.spawnDmgFloat(`+${item.val}MP`, false, 'mp-float');
      }

      if (item.stackable && item.qty > 1) {
        item.qty--;
      } else {
        GameState.inventory.splice(idx, 1);
      }
      this.render();
      GameUI.updateUI();
    }
  },

    sellItem(uid) {
    const idx = GameState.inventory.findIndex(i => i.uid === uid);
    if (idx === -1) return;
    const item = GameState.inventory[idx];
    if (item.equipped) return;

    const sellPrice = parseInt(item.sellPrice) || 0;
    const qty = parseInt(item.qty) || 1;
    const total = sellPrice * (item.stackable ? qty : 1);
    
    if (isNaN(total) || total < 0) {
      console.error('Invalid sell total:', total);
      GameState.gold += 0;
    } else {
      GameState.gold += total;
    }
    
    GameLog.add(`Sold ${item.name}${item.stackable && item.qty > 1 ? ` ×${item.qty}` : ''} for ${isNaN(total) ? 0 : total}g`, 'gold');
    GameState.inventory.splice(idx, 1);
    this.render();
    GameUI.updateUI();

    if (GameState.gold >= 50) GameState.quests.gold50.done = true;
    GameQuests.render();
  },

  saveAutoSell() {
    GameState.autoSell.normal = document.getElementById('as-normal').checked;
    GameState.autoSell.uncommon = document.getElementById('as-uncommon').checked;
  },

  loadAutoSellUI() {
    document.getElementById('as-normal').checked = GameState.autoSell?.normal || false;
    document.getElementById('as-uncommon').checked = GameState.autoSell?.uncommon || false;
  },

  autoSellAfterCombat() {
    if (!GameState.autoSell?.normal && !GameState.autoSell?.uncommon) return;

    let totalGold = 0;
    let count = 0;
    const toSell = GameState.inventory.filter(i => {
      if (i.equipped) return false;
      if (i.category !== 'equipment' && i.category !== 'material') return false;
      if (GameState.autoSell.normal && i.rarity === 'normal') return true;
      if (GameState.autoSell.uncommon && i.rarity === 'uncommon') return true;
      return false;
    });

    toSell.forEach(item => {
      const total = (item.sellPrice || 0) * (item.stackable ? item.qty : 1);
      totalGold += total;
      count++;
      const idx = GameState.inventory.findIndex(i => i.uid === item.uid);
      if (idx !== -1) GameState.inventory.splice(idx, 1);
    });

    if (count > 0) {
      GameLog.add(`🗑️ Auto-sold ${count} junk items for ${totalGold}g!`, 'gold');
      GameState.gold += totalGold;
      Utils.notify(`🗑️ Auto-sold ${count} items for ${totalGold}g`, 'var(--gold)');
      this.render();
      GameUI.updateUI();
    }
  },

  autoSellNow() {
    this.autoSellAfterCombat();
    if (!document.getElementById('as-normal').checked && !document.getElementById('as-uncommon').checked) {
      Utils.notify('Enable auto-sell toggles first!', 'var(--red)');
    }
  },
};

// ════════════════════════════════════════════════════════════════
// EQUIPMENT MODULE
// ════════════════════════════════════════════════════════════════

const GameEquipment = {
  equip(uid) {
    const item = GameState.inventory.find(i => i.uid === uid);
    if (!item || item.category !== 'equipment') return;

    if (GameState.equipped[item.slot]) this.unequip(item.slot, true);

    Object.entries(item.stats || {}).forEach(([k, v]) => {
      GameState[k] = (GameState[k] || 0) + v;
    });

    item.equipped = true;
    GameState.equipped[item.slot] = uid;
    GameState.quests.equip.done = true;
    GameLog.add(`Equipped ${item.name}!`, 'good');
    Utils.playSound('snd-craft');
    GameInventory.render();
    this.render();
    GameUI.updateUI();
    GameQuests.render();
  },

  unequip(slot, silent = false) {
    const uid = GameState.equipped[slot];
    if (!uid) return;

    const item = GameState.inventory.find(i => i.uid === uid);
    if (item) {
      Object.entries(item.stats || {}).forEach(([k, v]) => {
        GameState[k] = Math.max(0, (GameState[k] || 0) - v);
      });
      item.equipped = false;
      if (!silent) GameLog.add(`Unequipped ${item.name}!`, 'info');
    }

    GameState.equipped[slot] = null;
    GameInventory.render();
    this.render();
    GameUI.updateUI();
  },

  render() {
    ['weapon', 'armor', 'helmet', 'boots', 'ring', 'amulet'].forEach(slot => {
      const slotEl = document.querySelector(`[data-slot="${slot}"]`);
      const nameEl = document.getElementById(`slot-${slot}-name`);
      const uid = GameState.equipped[slot];

      slotEl.className = 'equip-slot';
      if (uid) {
        const item = GameState.inventory.find(i => i.uid === uid);
        if (item) {
          const enhTag = item.enhanceLevel > 0 ? ` +${item.enhanceLevel}` : '';
       nameEl.textContent = item.name.replace(/^[^\s]+ /, '').substring(0, 10) + enhTag;
       const slotEnhClass = item.enhanceLevel >= 15 ? 'enhanced-max' : item.enhanceLevel >= 7 ? 'enhanced-high' : '';
       slotEl.classList.add('has-item', item.rarity);
       if (slotEnhClass) slotEl.classList.add(slotEnhClass);
        }
      } else {
        nameEl.textContent = 'Empty';
      }
    });
  },
};

// ════════════════════════════════════════════════════════════════
// SHOP MODULE
// ════════════════════════════════════════════════════════════════

const GameShop = {
  switchTab(tab) {
    GameState.shopTab = tab;
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`shop-tab-${tab}`).classList.add('active');
    this.render();
  },

  render() {
    const items = GameState.shopTab === 'equipment' ? SHOP_EQUIP : SHOP_CONS;
    const r_ = r => RARITY[r] || RARITY.normal;

    document.getElementById('shop-content').innerHTML = items
      .map(item => {
        const r = r_(item.rarity);
        const desc = item.stats
          ? Object.entries(item.stats).map(([k, v]) => `+${v}${k.toUpperCase()}`).join(' ')
          : item.effect
          ? `Restore ${item.val} ${item.effect === 'both' ? 'HP+MP' : item.effect.toUpperCase()}`
          : '';

        return `<div class="shop-item ${item.rarity}">
          <button class="shop-btn" onclick="GameShop.buy('${item.id}')">Buy</button>
          <div style="color:${r.color};font-size:.85em;font-weight:600;">${item.name}</div>
          <div style="color:${r.color};font-size:.68em;">${r.label}</div>
          <div style="color:#888;font-size:.78em;">💰${item.price}g — ${desc}</div>
        </div>`;
      })
      .join('');
  },

  buy(itemId) {
    const all = [...SHOP_EQUIP, ...SHOP_CONS];
    const item = all.find(i => i.id === itemId);
    if (!item) return;

    if (GameState.gold < item.price) {
      GameLog.add(`Not enough gold!`, 'bad');
      return;
    }

        const priceAmount = parseInt(item.price) || 0;
    GameState.gold -= priceAmount;

    if (item.slot) {
      GameInventory.add({
        uid: Utils.genUid(),
        name: item.name,
        category: 'equipment',
        slot: item.slot,
        rarity: item.rarity || 'normal',
        stats: item.stats,
        equipped: false,
        sellPrice: Math.floor(priceAmount * 0.5),
      });
    } else {
      GameInventory.add({
        uid: Utils.genUid(),
        name: item.name,
        category: 'consumable',
        rarity: item.rarity || 'normal',
        effect: item.effect,
        val: item.val,
        sellPrice: Math.floor(priceAmount * 0.4),
        stackable: true,
        qty: 1,
      });
    }

    GameLog.add(`Bought ${item.name} for ${priceAmount}g!`, 'gold');
    GameUI.updateUI();

    if (GameState.gold >= 50) GameState.quests.gold50.done = true;
    GameQuests.render();
  },
};

// ════════════════════════════════════════════════════════════════
// SKILLS MODULE
// ════════════════════════════════════════════════════════════════

const GameSkills = {
  render() {
    if (!GameState.skills || !GameState.skills.length) {
      document.getElementById('skills-bar').style.display = 'none';
      return;
    }

    document.getElementById('skills-bar').style.display = 'block';
    document.getElementById('skills-slot-row').innerHTML = GameState.skills
      .map(sid => {
        const sk = SKILLS[sid];
        if (!sk) return '';
        const cd = GameState.skillCooldowns[sid] || 0;
        return `<div class="skill-slot" onclick="GameSkills.use('${sid}')">
          <div class="skill-icon-wrap ${cd > 0 ? 'on-cd' : ''}">${sk.icon}</div>
          <div class="skill-lbl">${sk.name}</div>
          <div class="skill-cd-lbl">${cd > 0 ? `CD:${cd}` : `${sk.mp}MP`}</div>
        </div>`;
      })
      .join('');
  },

  use(skillId) {
    if (!GameEngine.currentEnemy) return;
    const sk = SKILLS[skillId];
    if (!sk) return;

    const cd = GameState.skillCooldowns[skillId] || 0;
    if (cd > 0) {
      GameCombat.addLog(`${sk.name} on cooldown! (${cd})`, 'bad');
      return;
    }

    if (GameState.mp < sk.mp) {
      GameCombat.addLog(`Not enough MP for ${sk.name}!`, 'bad');
      return;
    }

    GameState.mp -= sk.mp;
    GameState.skillCooldowns[skillId] = sk.cd;
    sk.use(GameEngine.currentEnemy);

    Object.keys(GameState.skillCooldowns).forEach(k => {
      if (k !== skillId && GameState.skillCooldowns[k] > 0) GameState.skillCooldowns[k]--;
    });

    if (GameEngine.currentEnemy.hp <= 0) {
      GameEngine.currentEnemy.hp = 0;
      GameCombat.updateEnemyBar();
      GameCombat.end(true);
      return;
    }

    if (GameEngine.currentEnemy.hp > 0) {
      const eDmg = Math.max(1, GameEngine.currentEnemy.atk + Math.floor(Math.random() * 6) - GameState.def);
      GameState.hp -= eDmg;
      GameCombat.addLog(`${GameEngine.currentEnemy.name} retaliates: ${eDmg}!`, 'bad');
      GameCombat.animateAttack(false, eDmg, false);

      if (GameState.hp <= 0) {
        GameState.hp = 0;
        GameUI.updateUI();
        GameCombat.end(false);
        return;
      }
    }

    GameCombat.updateEnemyBar();
    GameUI.updateUI();
    this.render();
  },
};

// ════════════════════════════════════════════════════════════════
// CLASS & TALENTS MODULE
// ════════════════════════════════════════════════════════════════

const GameClasses = {
  showSelection() {
    const grid = document.getElementById('class-grid');
    grid.innerHTML = Object.entries(CLASSES)
      .map(([id, c]) => {
        const bonusesHtml = Object.entries(c.bonuses)
          .map(([k, v]) => `<div class="class-stat"><span>${k.toUpperCase()}</span><span>${v > 0 ? '+' : ''}${v}</span></div>`)
          .join('');
        return `<div class="class-card" onclick="GameClasses.select('${id}')">
          <div class="class-icon">${c.icon}</div>
          <div class="class-name">${c.name}</div>
          <div class="class-desc">${c.desc}</div>
          ${bonusesHtml}
        </div>`;
      })
      .join('');
    document.getElementById('class-screen').style.display = 'block';
  },

  select(classId) {
    const c = CLASSES[classId];
    GameState.class = classId;
    GameState.quests.class.done = true;

    Object.entries(c.bonuses).forEach(([k, v]) => {
      if (k === 'maxHp') {
        GameState.maxHp += v;
        GameState.hp = Math.min(GameState.hp + Math.max(0, v), GameState.maxHp);
      } else if (k === 'maxMp') {
        GameState.maxMp += v;
        GameState.mp = Math.min(GameState.mp + Math.max(0, v), GameState.maxMp);
      } else {
        GameState[k] = (GameState[k] || 0) + v;
      }
    });

    GameState.skills = c.skills;
    document.getElementById('char-class').textContent = `${c.icon} ${c.name}`;
    document.getElementById('char-avatar').textContent = c.icon;
    document.getElementById('arena-player').textContent = c.icon;
    document.getElementById('class-screen').style.display = 'none';
    document.getElementById('talent-btn').style.display = 'inline-block';

    GameLog.add(`🎉 You are now a ${c.name}!`, 'purple');
    Utils.playSound('snd-levelup');
    GameUI.updateUI();
    GameSkills.render();
    GameQuests.render();
  },
};

const GameTalents = {
  open() {
    if (!GameState.class) {
      GameLog.add('Choose a class first!', 'bad');
      return;
    }

    const c = CLASSES[GameState.class];
    document.getElementById('talent-title').textContent = `${c.icon} ${c.name} Talent Tree`;
    document.getElementById('talent-pts-val').textContent = GameState.talentPoints;

    document.getElementById('tree-grid').innerHTML = Object.entries(c.trees)
      .map(([tid, tree]) => {
        const talentsHtml = tree.talents
          .map(t => {
            const rank = GameState.unlockedTalents.filter(u => u === t.id).length;
            const maxed = rank >= t.ranks;
            const locked = GameState.talentPoints < t.cost && rank === 0;

            return `<div class="talent-node ${maxed ? 'unlocked' : locked ? 'locked' : ''}" onclick="GameTalents.unlock('${t.id}','${tid}')">
              <span class="talent-node-rank">${rank}/${t.ranks}</span>
              <div class="talent-node-name">${t.name}</div>
              <div class="talent-node-desc">${t.desc}</div>
              <div class="talent-node-cost">Cost: ${t.cost}pt ${maxed ? '✅' : ''}</div>
            </div>`;
          })
          .join('');

        return `<div class="tree-col">
          <div class="tree-name">${tree.name}</div>
          ${talentsHtml}
        </div>`;
      })
      .join('');

    document.getElementById('talent-screen').style.display = 'block';
  },

  unlock(talentId, treeId) {
    const c = CLASSES[GameState.class];
    const tree = c.trees[treeId];
    const talent = tree.talents.find(t => t.id === talentId);
    if (!talent) return;

    const rank = GameState.unlockedTalents.filter(u => u === talentId).length;

    if (rank >= talent.ranks) {
      GameLog.add(`${talent.name} already maxed!`, 'bad');
      return;
    }

    if (GameState.talentPoints < talent.cost) {
      GameLog.add('Not enough talent points!', 'bad');
      return;
    }

    GameState.talentPoints -= talent.cost;
    GameState.unlockedTalents.push(talentId);
    talent.effect();
    GameState.quests.talent.done = true;

    GameLog.add(`🌟 Unlocked: ${talent.name}!`, 'purple');
    Utils.playSound('snd-magic');
    this.open();
    GameUI.updateUI();
    GameQuests.render();
    GameUI.updateTalentBtn();
  },

  close() {
    document.getElementById('talent-screen').style.display = 'none';
  },
};

// ════════════════════════════════════════════════════════════════
// CRAFTING MODULE
// ════════════════════════════════════════════════════════════════

const GameCrafting = {
  getMaterialQty(name) {
    const item = GameState.inventory.find(i => i.name === name && i.stackable);
    return item ? item.qty : 0;
  },

  render() {
    const grid = document.getElementById('craft-grid');
    const r_ = r => RARITY[r] || RARITY.normal;

    grid.innerHTML = CRAFTING.map(recipe => {
      const result = recipe.result;
      const rColor = r_(result.rarity).color;

      const reqHtml = recipe.req
        .map(r => {
          const have = this.getMaterialQty(r.name);
          const ok = have >= r.qty;
          return `<div class="${ok ? 'ok' : 'no'}">• ${r.name}: ${have}/${r.qty} ${ok ? '✅' : '❌'}</div>`;
        })
        .join('');

      const canCraft = recipe.req.every(r => this.getMaterialQty(r.name) >= r.qty);

      return `<div class="craft-card">
        <div class="craft-result" style="color:${rColor}">${result.name || result.slot} — <span style="color:${rColor}">${r_(result.rarity).label}</span></div>
        <div style="font-size:.78em;color:#888;margin-bottom:5px;">${recipe.desc}</div>
        <div class="craft-req">${reqHtml}</div>
        <button class="craft-btn" onclick="GameCrafting.craft('${recipe.id}')" ${canCraft ? '' : 'disabled'}>⚗️ Craft</button>
      </div>`;
    }).join('');
  },

  craft(recipeId) {
    const recipe = CRAFTING.find(r => r.id === recipeId);
    if (!recipe) return;

    if (!recipe.req.every(r => this.getMaterialQty(r.name) >= r.qty)) {
      Utils.notify('Missing materials!', 'var(--red)');
      return;
    }

    // Consume materials
    recipe.req.forEach(req => {
      let need = req.qty;
      GameState.inventory.forEach(item => {
        if (item.name === req.name && item.stackable && need > 0) {
          const take = Math.min(item.qty, need);
          item.qty -= take;
          need -= take;
        }
      });
    });

    GameState.inventory = GameState.inventory.filter(i => !i.stackable || (i.qty || 0) > 0);

    // Create result
    const result = {
      ...recipe.result,
      uid: Utils.genUid(),
      sellPrice: Math.round((RARITY[recipe.result.rarity]?.mult || 1) * 15 * GameState.level * 0.5),
    };

    if (result.stackable) result.qty = 1;
    if (result.category === 'equipment') result.equipped = false;

    GameInventory.add(result);
    GameState.quests.craft.done = true;

    GameLog.add(`⚗️ Crafted: ${result.name}!`, result.rarity === 'legendary' ? 'legendary' : 'purple');
    Utils.notify(`⚗️ Crafted ${result.name}!`, 'var(--purple)');
    Utils.playSound('snd-craft');

    this.render();
    GameInventory.render();
    GameQuests.render();
  },
};

// ════════════════════════════════════════════════════════════════
// QUESTS MODULE
// ════════════════════════════════════════════════════════════════

const GameQuests = {
  render() {
    document.getElementById('quest-list').innerHTML = Object.values(GameState.quests)
      .map(q => `<div class="quest-item ${q.done ? 'quest-done' : ''}">${q.done ? '✅' : ''}
         ${q.text}</div>`)
      .join('');
  },
};

// ════════════════════════════════════════════════════════════════
// LOG MODULE
// ════════════════════════════════════════════════════════════════

const GameLog = {
  add(msg, type = '') {
    const b = document.getElementById('log-box');
    const d = document.createElement('div');
    d.className = `log-entry ${type ? 'log-' + type : ''}`;
    d.textContent = msg;
    b.appendChild(d);
    b.scrollTop = b.scrollHeight;
  },
};

// ════════════════════════════════════════════════════════════════
// UI MODULE
// ════════════════════════════════════════════════════════════════

const GameUI = {
  updateUI() {
    const hp = Math.max(0, GameState.hp);
    const mp = Math.max(0, GameState.mp);

    document.getElementById('hp-val').textContent = hp;
    document.getElementById('hp-max').textContent = GameState.maxHp;
    document.getElementById('mp-val').textContent = mp;
    document.getElementById('mp-max').textContent = GameState.maxMp;
    document.getElementById('xp-val').textContent = GameState.xp;
    document.getElementById('xp-next').textContent = GameState.xpNext;
    document.getElementById('gold-val').textContent = GameState.gold;
    document.getElementById('str-val').textContent = GameState.str;
    document.getElementById('agi-val').textContent = GameState.agi;
    document.getElementById('int-val').textContent = GameState.int;
    document.getElementById('def-val').textContent = GameState.def;
    document.getElementById('char-level').textContent = `Level ${GameState.level} / 100`;

    document.getElementById('hp-bar').style.width = Math.max(0, (hp / GameState.maxHp) * 100) + '%';
    document.getElementById('mp-bar').style.width = Math.max(0, (mp / GameState.maxMp) * 100) + '%';
    document.getElementById('xp-bar').style.width = Math.min(100, (GameState.xp / GameState.xpNext) * 100) + '%';
    document.getElementById('arena-player-hp').style.width = Math.max(0, (hp / GameState.maxHp) * 100) + '%';
  },

  showClassSelection() {
    GameClasses.showSelection();
  },

  openTalents() {
    GameTalents.open();
  },

  closeTalents() {
    GameTalents.close();
  },

  openCrafting() {
    document.getElementById('craft-screen').style.display = 'block';
    GameCrafting.render();
  },
  openEnhancement() {
         Utils.notify('Select an item from inventory to enhance!', 'var(--gold)');
       },
 
       closeEnhancement() {
         GameEnhancement.close();
       },

  closeCrafting() {
    document.getElementById('craft-screen').style.display = 'none';
  },

  updateTalentBtn() {
    const btn = document.getElementById('talent-btn');
    btn.textContent = GameState.talentPoints > 0 ? `🌟 Talents (${GameState.talentPoints})` : '🌟 Talents';
    btn.style.boxShadow = GameState.talentPoints > 0 ? '0 0 10px rgba(136,68,255,.6)' : 'none';
  },
};

// ════════════════════════════════════════════════════════════════
// LEADERBOARD MODULE
// ════════════════════════════════════════════════════════════════

const GameLeaderboard = {
  // Using JSONBin for leaderboard - SECURE VERSION
  // In production, replace with your own backend API endpoint
  BACKEND_URL: 'https://your-backend.com/api/leaderboard', // Change this to your backend

  async fetch() {
    try {
      document.getElementById('lb-list').innerHTML = '<div class="lb-empty">Loading...</div>';
      const res = await fetch(`${this.BACKEND_URL}/get`);
      const data = await res.json();
      this.render(data.scores || []);
    } catch (e) {
      document.getElementById('lb-list').innerHTML = '<div class="lb-empty">Could not load leaderboard.</div>';
    }
  },

  async submit() {
    if (!GameState.name) {
      alert('Start the game first!');
      return;
    }

    try {
      const response = await fetch(`${this.BACKEND_URL}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: Utils.sanitizeName(GameState.name),
          level: GameState.level,
          gold: GameState.gold,
          class: GameState.class ? CLASSES[GameState.class].name : 'Adventurer',
          date: new Date().toLocaleDateString(),
        }),
      });

      const data = await response.json();
      this.render(data.scores || []);
      GameLog.add('🏆 Score submitted!', 'gold');
      alert('Submitted! 🏆');
    } catch (e) {
      alert('Could not submit. Check connection!');
    }
  },

  render(scores) {
    const list = document.getElementById('lb-list');
    if (!scores || !scores.length) {
      list.innerHTML = '<div class="lb-empty">No scores yet! 🏆</div>';
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const cls = ['gold', 'silver', 'bronze'];

    list.innerHTML = scores
      .map(
        (s, i) => `
      <div class="lb-row">
        <div class="lb-rank ${cls[i] || ''}">${medals[i] || '#' + (i + 1)}</div>
        <div class="lb-name">${s.name}</div>
        <div class="lb-class">${s.class || 'Adventurer'}</div>
        <div class="lb-level">⭐ Lv.${s.level}</div>
        <div class="lb-gold-col">💰 ${s.gold}g</div>
      </div>`
      )
      .join('');
  },
};

// ════════════════════════════════════════════════════════════════
// INITIALIZATION & AUTO-SAVE
// ════════════════════════════════════════════════════════════════

window.addEventListener('load', () => {
  const l = document.getElementById('loader');
  l.style.opacity = '0';
  setTimeout(() => (l.style.display = 'none'), 500);
});

// Auto-save every 2 minutes
setInterval(() => {
  if (GameState.name) {
    try {
      localStorage.setItem(CONSTANTS.SAVE_KEY, JSON.stringify(GameState));
    } catch (e) {}
  }
}, CONSTANTS.AUTO_SAVE_INTERVAL);

// ════════════════════════════════════════════════════════════════
// EQUIPMENT ENHANCEMENT MODULE
// Add this entire block to your game.js
// ════════════════════════════════════════════════════════════════

// ── Enhancement materials required per level tier ──
// Low level items (normal/uncommon) use early boss mats
// High level items (rare/epic/legendary) use late boss mats

const ENHANCE_MATS = {
  normal:    { low: { name: '🪶 Wolf Fang',        qty: 2 }, high: { name: '🪓 Orc Fragment',    qty: 3 } },
  uncommon:  { low: { name: '🕸️ Spider Silk',       qty: 2 }, high: { name: '🪨 Stone Core',      qty: 3 } },
  rare:      { low: { name: '🐉 Dragon Scale',      qty: 2 }, high: { name: '💀 Death Essence',   qty: 2 } },
  epic:      { low: { name: '😈 Demon Horn',        qty: 1 }, high: { name: '🌑 Void Crystal',    qty: 2 } },
  legendary: { low: { name: '☄️ Divine Shard',      qty: 1 }, high: { name: '🌟 Eternal Crown',   qty: 1 } },
};

// Gold cost per enhancement level
const ENHANCE_GOLD_COST = {
  1: 50,   2: 80,   3: 120,  4: 160,  5: 200,
  6: 250,  7: 400,  8: 500,  9: 600,  10: 750,
  11: 900, 12: 1100, 13: 1300, 14: 1600, 15: 2000,
};

// Success rates per level
const ENHANCE_RATES = {
  1: 0.95, 2: 0.90, 3: 0.85, 4: 0.80, 5: 0.75,
  6: 0.70, 7: 0.45, 8: 0.40, 9: 0.35, 10: 0.30,
  11: 0.25, 12: 0.20, 13: 0.18, 14: 0.15, 15: 0.12,
};

const GameEnhancement = {

  // Get the material needed based on item rarity and enhance level
  getRequiredMat(item) {
    const mats = ENHANCE_MATS[item.rarity] || ENHANCE_MATS.normal;
    const enhLvl = item.enhanceLevel || 0;
    // Use high tier mat from +7 onwards
    return enhLvl >= 6 ? mats.high : mats.low;
  },

  // Get gold cost for next enhancement
  getGoldCost(item) {
    const nextLvl = (item.enhanceLevel || 0) + 1;
    return ENHANCE_GOLD_COST[nextLvl] || 2000;
  },

  // Get success rate for next enhancement
  getSuccessRate(item) {
    const nextLvl = (item.enhanceLevel || 0) + 1;
    return ENHANCE_RATES[nextLvl] || 0.10;
  },

  // Check how many of a material the player has
  getMaterialQty(matName) {
    const item = GameState.inventory.find(i => i.name === matName && i.stackable);
    return item ? (item.qty || 0) : 0;
  },

  // Apply stat bonus based on enhance level
  applyEnhanceBonus(item, level) {
    if (!item.baseStats) {
      // Save original stats first time
      item.baseStats = { ...item.stats };
    }

    const base = item.baseStats;
    const newStats = {};

    Object.entries(base).forEach(([stat, baseVal]) => {
      if (level <= 6) {
        // Flat bonus: +1 per level for each stat
        newStats[stat] = baseVal + level;
      } else {
        // Percentage bonus from +7: flat 6 + 1% per level above 6
        const flatBonus = 6;
        const pctBonus = (level - 6) * 0.01;
        newStats[stat] = Math.floor(baseVal + flatBonus + (baseVal * pctBonus));
      }
    });

    item.stats = newStats;
  },

  // Remove stat bonus when recalculating
  removeEnhanceBonus(item) {
    if (item.baseStats) {
      item.stats = { ...item.baseStats };
    }
  },

  // Open enhancement screen for a specific item
  open(uid) {
    const item = GameState.inventory.find(i => i.uid === uid);
    if (!item || item.category !== 'equipment') return;

    const screen = document.getElementById('enhance-screen');
    const enhLvl = item.enhanceLevel || 0;
    const maxed = enhLvl >= 15;
    const mat = this.getRequiredMat(item);
    const goldCost = this.getGoldCost(item);
    const rate = Math.round(this.getSuccessRate(item) * 100);
    const haveMat = this.getMaterialQty(mat.name);
    const haveGold = GameState.gold >= goldCost;
    const canEnhance = !maxed && haveMat >= mat.qty && haveGold;
    const nextLvl = enhLvl + 1;

    // Calculate what stats will look like after success
    const previewStats = {};
    if (!maxed && item.baseStats) {
      Object.entries(item.baseStats).forEach(([stat, baseVal]) => {
        if (nextLvl <= 6) {
          previewStats[stat] = baseVal + nextLvl;
        } else {
          const flatBonus = 6;
          const pctBonus = (nextLvl - 6) * 0.01;
          previewStats[stat] = Math.floor(baseVal + flatBonus + (baseVal * pctBonus));
        }
      });
    } else if (!maxed) {
      Object.entries(item.stats || {}).forEach(([stat, val]) => {
        if (nextLvl <= 6) {
          previewStats[stat] = val + 1;
        } else {
          previewStats[stat] = Math.floor(val * 1.01);
        }
      });
    }

    const rarityColor = (RARITY[item.rarity] || RARITY.normal).color;
    const enhSuffix = enhLvl > 0 ? ` <span class="enh-badge enh-${enhLvl >= 7 ? 'high' : 'low'}">+${enhLvl}</span>` : '';

    screen.innerHTML = `
      <div class="enhance-container">
        <div class="enhance-title">⚒️ Enhancement Forge</div>

        <div class="enhance-item-card">
          <div class="enhance-item-name" style="color:${rarityColor}">${item.name}${enhSuffix}</div>
          <div style="font-size:.75em;color:${rarityColor};margin-top:2px;">${(RARITY[item.rarity] || RARITY.normal).label}</div>

          <div class="enhance-stats-row">
            <div class="enhance-stats-col">
              <div class="enhance-stats-title">Current Stats</div>
              ${Object.entries(item.stats || {}).map(([k, v]) =>
                `<div class="enhance-stat-line">+${v} ${k.toUpperCase()}</div>`
              ).join('')}
            </div>
            ${!maxed ? `
            <div class="enhance-arrow">→</div>
            <div class="enhance-stats-col">
              <div class="enhance-stats-title" style="color:var(--green)">After +${nextLvl}</div>
              ${Object.entries(previewStats).map(([k, v]) =>
                `<div class="enhance-stat-line" style="color:var(--green)">+${v} ${k.toUpperCase()}</div>`
              ).join('')}
            </div>` : ''}
          </div>

          <div class="enhance-level-bar">
            ${Array.from({length: 15}, (_, i) => `
              <div class="enhance-pip ${i < enhLvl ? (i >= 6 ? 'pip-high' : 'pip-filled') : 'pip-empty'}"></div>
            `).join('')}
          </div>
          <div style="text-align:center;font-size:.75em;color:#888;margin-top:4px;">
            Enhancement Level: <span style="color:var(--gold)">${enhLvl}/15</span>
            ${enhLvl >= 7 ? `<span style="color:var(--legendary)"> ✨ Radiant</span>` : ''}
          </div>
        </div>

        ${maxed ? `
          <div style="text-align:center;color:var(--legendary);font-family:'Cinzel',serif;font-size:1.1em;margin:15px 0;">
            🌟 MAX ENHANCEMENT REACHED! 🌟
          </div>
        ` : `
          <div class="enhance-cost-box">
            <div class="enhance-cost-title">Required to Enhance to +${nextLvl}</div>
            <div class="enhance-cost-row">
              <span>💰 Gold</span>
              <span style="color:${haveGold ? 'var(--green)' : 'var(--red)'}">
                ${GameState.gold} / ${goldCost} ${haveGold ? '✅' : '❌'}
              </span>
            </div>
            <div class="enhance-cost-row">
              <span>${mat.name} ×${mat.qty}</span>
              <span style="color:${haveMat >= mat.qty ? 'var(--green)' : 'var(--red)'}">
                ${haveMat} / ${mat.qty} ${haveMat >= mat.qty ? '✅' : '❌'}
              </span>
            </div>
            <div class="enhance-cost-row">
              <span>🎲 Success Rate</span>
              <span style="color:${rate >= 70 ? 'var(--green)' : rate >= 40 ? 'var(--gold)' : 'var(--red)'}">
                ${rate}%
              </span>
            </div>
            ${nextLvl >= 8 ? `
              <div style="font-size:.72em;color:var(--red);margin-top:5px;text-align:center;">
                ⚠️ Failure at +${nextLvl} will reduce to +${nextLvl - 2}!
              </div>
            ` : nextLvl >= 7 ? `
              <div style="font-size:.72em;color:var(--gold);margin-top:5px;text-align:center;">
                ⚠️ Failure will reduce enhancement by 1!
              </div>
            ` : `
              <div style="font-size:.72em;color:#888;margin-top:5px;text-align:center;">
                Failure loses materials and gold only.
              </div>
            `}
          </div>

          <div style="display:flex;gap:8px;justify-content:center;margin-top:12px;">
            <button class="enhance-btn ${canEnhance ? '' : 'enhance-btn-disabled'}"
              onclick="GameEnhancement.attempt(${uid})"
              ${canEnhance ? '' : 'disabled'}>
              ⚒️ Enhance!
            </button>
            <button class="start-btn red-btn" style="font-size:.8em;padding:6px 16px;"
              onclick="GameEnhancement.close()">
              ✖ Close
            </button>
          </div>
        `}

        ${maxed ? `
          <div style="text-align:center;margin-top:12px;">
            <button class="start-btn red-btn" style="font-size:.8em;padding:6px 16px;"
              onclick="GameEnhancement.close()">
              ✖ Close
            </button>
          </div>
        ` : ''}

        <div id="enhance-result" style="min-height:30px;text-align:center;margin-top:10px;font-family:'Cinzel',serif;font-size:.9em;"></div>
      </div>
    `;

    screen.style.display = 'block';
    this._currentUid = uid;
  },

  // Attempt enhancement
  attempt(uid) {
    const item = GameState.inventory.find(i => i.uid === uid);
    if (!item) return;

    const enhLvl = item.enhanceLevel || 0;
    if (enhLvl >= 15) return;

    const mat = this.getRequiredMat(item);
    const goldCost = this.getGoldCost(item);
    const rate = this.getSuccessRate(item);
    const nextLvl = enhLvl + 1;

    // Check requirements
    const haveMat = this.getMaterialQty(mat.name);
    if (GameState.gold < goldCost) { Utils.notify('Not enough gold!', 'var(--red)'); return; }
    if (haveMat < mat.qty) { Utils.notify(`Need ${mat.qty}x ${mat.name}!`, 'var(--red)'); return; }

    // Consume gold and materials
    GameState.gold -= goldCost;
    let need = mat.qty;
    GameState.inventory.forEach(i => {
      if (i.name === mat.name && i.stackable && need > 0) {
        const take = Math.min(i.qty, need);
        i.qty -= take;
        need -= take;
      }
    });
    GameState.inventory = GameState.inventory.filter(i => !i.stackable || (i.qty || 0) > 0);

    const resultEl = document.getElementById('enhance-result');
    const success = Math.random() < rate;

    // Unequip temporarily if equipped to recalculate stats safely
    const wasEquipped = item.equipped;
    if (wasEquipped) {
      // Remove old stat contribution
      Object.entries(item.stats || {}).forEach(([k, v]) => {
        GameState[k] = Math.max(0, (GameState[k] || 0) - v);
      });
    }

    if (success) {
      item.enhanceLevel = nextLvl;
      this.applyEnhanceBonus(item, nextLvl);

      if (wasEquipped) {
        // Re-apply new stats
        Object.entries(item.stats || {}).forEach(([k, v]) => {
          GameState[k] = (GameState[k] || 0) + v;
        });
      }

      GameLog.add(`⚒️ Enhancement SUCCESS! ${item.name} is now +${nextLvl}!`, 'gold');
      Utils.notify(`✨ +${nextLvl} SUCCESS!`, 'var(--green)');

      if (resultEl) {
        resultEl.style.color = 'var(--green)';
        resultEl.textContent = `✨ SUCCESS! Enhanced to +${nextLvl}!`;
        if (nextLvl >= 15) {
          resultEl.textContent = '🌟 MAX LEVEL REACHED! Your item glows with eternal power!';
          resultEl.style.color = 'var(--legendary)';
        }
      }

    } else {
      // Failure logic
      let newLvl = enhLvl;
      if (enhLvl >= 7) {
        newLvl = Math.max(0, enhLvl - 1); // Drop 1 level
      }
      item.enhanceLevel = newLvl;
      this.applyEnhanceBonus(item, newLvl);

      if (wasEquipped) {
        Object.entries(item.stats || {}).forEach(([k, v]) => {
          GameState[k] = (GameState[k] || 0) + v;
        });
      }

      if (enhLvl >= 7) {
        GameLog.add(`💔 Enhancement FAILED! ${item.name} dropped to +${newLvl}!`, 'bad');
        Utils.notify(`💔 Failed! Dropped to +${newLvl}`, 'var(--red)');
        if (resultEl) {
          resultEl.style.color = 'var(--red)';
          resultEl.textContent = `💔 FAILED! Enhancement dropped to +${newLvl}!`;
        }
      } else {
        GameLog.add(`💔 Enhancement FAILED! Materials and gold lost.`, 'bad');
        Utils.notify('💔 Enhancement Failed!', 'var(--red)');
        if (resultEl) {
          resultEl.style.color = 'var(--red)';
          resultEl.textContent = '💔 FAILED! Materials and gold lost.';
        }
      }
    }

    GameUI.updateUI();
    GameInventory.render();
    GameEquipment.render();

    // Refresh the enhancement screen after a short delay
    setTimeout(() => {
      if (document.getElementById('enhance-screen').style.display === 'block') {
        this.open(uid);
      }
    }, 1500);
  },

  close() {
    document.getElementById('enhance-screen').style.display = 'none';
  },
};

// ── Expose to global scope ──
window.GameEnhancement = GameEnhancement;


// ════════════════════════════════════════════════════════════════
// CHANGES NEEDED IN EXISTING CODE
// ════════════════════════════════════════════════════════════════

// 1. In GameInventory.render(), find this line inside the equipment section:
//
//    : `<button class="inv-btn btn-equip" onclick="GameEquipment.equip(${item.uid})">Equip</button>`
//
// Replace it with:
//
//    : `<button class="inv-btn btn-equip" onclick="GameEquipment.equip(${item.uid})">Equip</button>
//       <button class="inv-btn btn-enhance" onclick="GameEnhancement.open(${item.uid})">⚒️ +${item.enhanceLevel || 0}</button>`
//
// This adds an enhance button next to every equipment item in inventory.


// 2. In GameEquipment.render(), find:
//    nameEl.textContent = item.name.replace(/^[^\s]+ /, '').substring(0, 12);
//
// Replace with:
//    const enhTag = item.enhanceLevel > 0 ? ` +${item.enhanceLevel}` : '';
//    nameEl.textContent = item.name.replace(/^[^\s]+ /, '').substring(0, 10) + enhTag;
//
// This shows the +level on equipped item slots.

// Expose functions to global scope for onclick handlers
window.GameEngine = GameEngine;
window.GameUI = GameUI;
window.GameInventory = GameInventory;
window.GameEquipment = GameEquipment;
window.GameShop = GameShop;
window.GameCombat = GameCombat;
window.GameCrafting = GameCrafting;
window.GameClasses = GameClasses;
window.GameTalents = GameTalents;
window.GameLeaderboard = GameLeaderboard;
window.GameScenes = GameScenes;
window.GameSkills = GameSkills;
window.GameLog = GameLog;
window.GameProgression = GameProgression;
window.GameQuests = GameQuests;
