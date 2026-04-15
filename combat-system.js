// combat-system.js
class CombatSystem {
  constructor(state, ui) {
    this.state = state;
    this.ui = ui;
    this.combatLog = [];
    this.maxLogEntries = 50;
  }

  startCombat(enemy) {
    this.state.inCombat = true;
    this.state.currentEnemy = { ...enemy };
    this.combatLog = [];
    this.ui.showCombatUI();
    this.ui.renderCombat(this.state, this.combatLog);
  }

  playerAttack() {
    if (!this.state.inCombat || !this.state.currentEnemy) return;

    const enemy = this.state.currentEnemy;
    const stats = this.getStats();
    
    // Calculate hit chance
    const dodgeChance = Math.max(0, (enemy.dodge - stats.hit) / 100);
    if (Math.random() < dodgeChance) {
      this.addLog(`💨 ${enemy.name} dodged!`, 'bad');
      this.enemyAttack();
      return;
    }

    // Calculate damage
    let damage = Math.max(1, stats.attackPower + Math.floor(Math.random() * 8) - Math.floor(enemy.armor / 2));
    const isCrit = Math.random() < (stats.crit / 100);
    
    if (isCrit) {
      damage = Math.floor(damage * 2);
      this.ui.showCritEffect();
    }

    enemy.hp -= damage;
    this.addLog(`⚔️ ${isCrit ? '💥CRIT! ' : ''}You hit for ${damage}!`, isCrit ? 'gold' : 'good');
    
    // Apply life steal
    if (stats.lifeSteal > 0) {
      const heal = Math.floor(damage * stats.lifeSteal);
      if (heal > 0) {
        this.state.hp = Math.min(this.state.maxHp, this.state.hp + heal);
        this.addLog(`🩸 Life Steal +${heal} HP!`, 'good');
      }
    }

    if (enemy.hp <= 0) {
      this.endCombat(true);
    } else {
      this.enemyAttack();
    }
  }

  enemyAttack() {
    if (!this.state.inCombat || !this.state.currentEnemy) return;

    const enemy = this.state.currentEnemy;
    const stats = this.getStats();
    
    const hitChance = Math.max(0, (stats.dodge - enemy.hit) / 100);
    if (Math.random() < hitChance) {
      this.addLog('💨 You dodged!', 'good');
      return;
    }

    let damage = Math.max(1, enemy.atk + Math.floor(Math.random() * 6) - Math.floor(stats.armor / 10));
    
    if (this.state.defending) {
      damage = Math.floor(damage / 2);
    }

    this.state.hp -= damage;
    this.addLog(`${enemy.name} hits you for ${damage}!`, 'bad');

    if (this.state.hp <= 0) {
      this.state.hp = 0;
      this.endCombat(false);
    }
  }

  endCombat(won) {
    this.state.inCombat = false;
    
    if (won && this.state.currentEnemy) {
      const rewards = this.calculateRewards(this.state.currentEnemy);
      this.state.gold += rewards.gold;
      this.state.xp += rewards.xp;
      this.addLog(`Victory! +${rewards.xp} XP, +${rewards.gold} Gold`, 'good');
    }

    this.state.currentEnemy = null;
    this.ui.hideCombatUI();
  }

  calculateRewards(enemy) {
    const baseGold = enemy.gold?. || 50;
    const baseXp = enemy.xp || 100;
    return {
      gold: Math.floor(baseGold + Math.random() * (enemy.gold?. - enemy.gold?. || 0)),
      xp: baseXp,
    };
  }

  addLog(msg, type = '') {
    this.combatLog.push({ msg, type, timestamp: Date.now() });
    if (this.combatLog.length > this.maxLogEntries) {
      this.combatLog.shift();
    }
  }

  getStats() {
    // Delegate to progression system
    return this.progression?.calculateStats?.(this.state) || {};
  }
}