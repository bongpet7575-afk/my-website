// ui-manager.js
class UIManager {
  constructor(state) {
    this.state = state;
    this.elements = new Map();
    this.cacheElements();
  }

  cacheElements() {
    const selectors = {
      hpBar: '#hp-bar',
      mpBar: '#mp-bar',
      xpBar: '#xp-bar',
      goldDisplay: '#gold-val',
      combatBox: '#combat-box',
      storyBox: '#story-content',
      // ... cache all frequently accessed elements
    };

    Object.entries(selectors).forEach(([key, selector]) => {
      const el = document.querySelector(selector);
      if (el) this.elements.set(key, el);
    });
  }

  updateBars() {
    const hpPercent = (this.state.hp / this.state.maxHp) * 100;
    const mpPercent = (this.state.mp / this.state.maxMp) * 100;
    const xpPercent = (this.state.xp / this.state.xpNext) * 100;

    this.elements.get('hpBar')?.style.setProperty('width', `${hpPercent}%`);
    this.elements.get('mpBar')?.style.setProperty('width', `${mpPercent}%`);
    this.elements.get('xpBar')?.style.setProperty('width', `${xpPercent}%`);
  }

  showCombatUI() {
    this.elements.get('combatBox')?.style.setProperty('display', 'block');
  }

  hideCombatUI() {
    this.elements.get('combatBox')?.style.setProperty('display', 'none');
  }

  renderCombat(state, log) {
    // Render combat efficiently
  }
}

// Initialize game
const game = new GameCore();

// Auto-save every 30 seconds
setInterval(() => {
  game.db.savePlayer(game.state).catch(err => console.error('Auto-save failed:', err));
}, 30000);