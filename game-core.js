// game-core.js - Central game manager
class GameCore {
  constructor() {
    this.state = this.createState();
    this.ui = new UIManager(this.state);
    this.combat = new CombatSystem(this.state, this.ui);
    this.inventory = new InventorySystem(this.state);
    this.progression = new ProgressionSystem(this.state);
    this.auth = new AuthService(this.state);
    this.db = new DatabaseService();
    this.cache = new Map();
    this.updateQueue = [];
    this.isUpdating = false;
  }

  createState() {
    return {
      // Identity
      character_id: null,
      user_id: null,
      name: '',
      
      // Core stats
      level: 1,
      xp: 0,
      xpNext: 2000,
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      gold: 1550,
      
      // Combat state
      inCombat: false,
      currentEnemy: null,
      defending: false,
      
      // Progression
      class: null,
      talentPoints: 0,
      unlockedTalents: [],
      
      // UI
      currentScene: 'town',
      invTab: 'equipment',
      
      // Cached calculations
      _cachedStats: null,
      _statsDirty: true,
    };
  }

  // Batch UI updates to prevent thrashing
  queueUpdate(fn) {
    this.updateQueue.push(fn);
    if (!this.isUpdating) {
      this.isUpdating = true;
      requestAnimationFrame(() => this.flushUpdates());
    }
  }

  flushUpdates() {
    this.updateQueue.forEach(fn => fn());
    this.updateQueue = [];
    this.isUpdating = false;
  }

  // Memoized stat calculation
  getStats() {
    if (!this.state._statsDirty && this.state._cachedStats) {
      return this.state._cachedStats;
    }
    
    const stats = this.progression.calculateStats(this.state);
    this.state._cachedStats = stats;
    this.state._statsDirty = false;
    return stats;
  }

  markStatsDirty() {
    this.state._statsDirty = true;
  }
}