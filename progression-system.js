// progression-system.js
import { INITIAL_STATE, CLASSES, RARITY } from './game-state.js';

export class ProgressionSystem {
  constructor(state) {
    this.state = state;
  }

  // Calculate effective stats
  calcStats() {
    const strMult = this.state.strMult + (this.state.classBonuses.strMult || 0) + (this.state.talentBonuses.strMult || 0);
    const agiMult = this.state.agiMult + (this.state.classBonuses.agiMult || 0) + (this.state.talentBonuses.agiMult || 0);
    const intMult = this.state.intMult + (this.state.classBonuses.intMult || 0) + (this.state.talentBonuses.intMult || 0);
    const staMult = this.state.staMult + (this.state.classBonuses.staMult || 0) + (this.state.talentBonuses.staMult || 0);
    const atkpMult = this.state.attackPowerMult + (this.state.classBonuses.attackPowerMult || 0) + (this.state.talentBonuses.attackPowerMult || 0);
    const armorMult = this.state.armorMult + (this.state.classBonuses.armorMult || 0) + (this.state.talentBonuses.armorMult || 0);
    const critMult = this.state.critMult + (this.state.classBonuses.critMult || 0) + (this.state.talentBonuses.critMult || 0);
    const dodgeMult = this.state.dodgeMult + (this.state.classBonuses.dodgeMult || 0) + (this.state.talentBonuses.dodgeMult || 0);
    const hitMult = this.state.hitMult + (this.state.classBonuses.hitMult || 0) + (this.state.talentBonuses.hitMult || 0);
    const mpMult = this.state.mpMult + (this.state.classBonuses.mpMult || 0) + (this.state.talentBonuses.mpMult || 0);
    const hpRegenMult = this.state.hpRegenMult + (this.state.classBonuses.hpRegenMult || 0) + (this.state.talentBonuses.hpRegenMult || 0);
    const mpRegenMult = this.state.mpRegenMult + (this.state.classBonuses.mpRegenMult || 0) + (this.state.talentBonuses.mpRegenMult || 0);

    this.state.str = Math.floor(this.state.baseStr * strMult) + (this.state.equipStr || 0) + (this.state.talentBonuses.baseStr || 0);
    this.state.agi = Math.floor(this.state.baseAgi * agiMult) + (this.state.equipAgi || 0) + (this.state.talentBonuses.baseAgi || 0);
    this.state.int = Math.floor(this.state.baseInt * intMult) + (this.state.equipInt || 0) + (this.state.talentBonuses.baseInt || 0);
    this.state.sta = Math.floor(this.state.baseSta * staMult) + (this.state.equipSta || 0) + (this.state.talentBonuses.baseSta || 0);
    this.state.attackPower = Math.floor((this.state.str * 2 + this.state.int * 2) * atkpMult) + (this.state.equipAttackPower || 0) + (this.state.talentBonuses.baseAttackPower || 0);
    this.state.maxHp = Math.floor(50 + (this.state.str * 10) + (this.state.sta * 15) + (this.state.level * 20)) + (this.state.equipMaxHp || 0);
    this.state.armor = Math.floor((this.state.agi * 3 + this.state.baseArmor + (this.state.talentBonuses.baseArmor || 0)) * armorMult) + (this.state.equipArmor || 0);
    this.state.crit = Math.floor(((this.state.agi * 0.0005 + this.state.baseCrit) * critMult) + (this.state.equipCrit || 0) + (this.state.talentBonuses.baseCrit || 0));
    this.state.dodge = Math.floor(((this.state.agi * 1.9 + this.state.baseDodge) * dodgeMult) + (this.state.equipDodge || 0) + (this.state.talentBonuses.baseDodge || 0));
    this.state.hit = Math.floor(((this.state.agi * 5.3 + this.state.baseHit) * hitMult) + (this.state.equipHit || 0) + (this.state.talentBonuses.baseHit || 0));
    this.state.maxMp = Math.floor((50 + this.state.int * 3) * mpMult) + (this.state.equipMaxMp || 0);
    this.state.manaRegen = Math.floor((0.5 + this.state.int * 1.5) * mpRegenMult) + (this.state.equipMpRegen || 0);
    this.state.hpRegen = Math.floor((this.state.sta * 0.5 + this.state.baseHpRegen + (this.state.talentBonuses.baseHpRegen || 0)) * hpRegenMult) + (this.state.equipHpRegen || 0);
    this.state.lifeSteal = (this.state.baseLifeSteal * this.state.lifeStealMult) + (this.state.equipLifeSteal || 0);

    this.state.hp = Math.min(this.state.hp, this.state.maxHp);
    this.state.mp = Math.min(this.state.mp, this.state.maxMp);
    this.state._statsDirty = false;
  }

  checkLevelUp() {
    let leveledUp = false;

    while (this.state.xp >= this.state.xpNext && this.state.level < this.state.maxLevel) {
      this.state.xp -= this.state.xpNext;
      this.state.level++;
      this.state.xpNext = Math.floor(this.state.level * 100 * 20);
      this.state.baseStr += 2;
      this.state.baseAgi += 2;
      this.state.baseInt += 2;
      this.state.baseSta += 2;
      this.state.talentPoints += 5;
      this.state._statsDirty = true;
      leveledUp = true;

      // Mark quests
      if (this.state.level >= 5) this.state.quests.level5.done = true;
      if (this.state.level >= 10) this.state.quests.level10.done = true;
      if (this.state.level >= 50) this.state.quests.level50.done = true;
      if (this.state.level >= 100) this.state.quests.level100.done = true;
    }

    if (this.state.level >= this.state.maxLevel) {
      this.state.xp = 0;
    }

    return leveledUp;
  }

  selectClass(classId) {
    const classData = CLASSES[classId];
    if (!classData) return false;

    this.state.class = classId;
    this.state.quests.class.done = true;

    Object.entries(classData.bonuses).forEach(([key, value]) => {
      this.state.classBonuses[key] = value;
      this.state[key] = (this.state[key] || 1) + value;
    });

    this.state.skills = classData.skills;
    this.state._statsDirty = true;
    this.calcStats();

    return true;
  }

  unlockTalent(talentId, treeId) {
    if (!this.state.class) return false;

    const classData = CLASSES[this.state.class];
    const tree = classData.trees[treeId];
    const talent = tree.talents.find(t => t.id === talentId);

    if (!talent) return false;

    const rank = this.state.unlockedTalents.filter(u => u === talentId).length;
    if (rank >= talent.ranks) return false;
    if (this.state.talentPoints < talent.cost) return false;

    this.state.talentPoints -= talent.cost;
    this.state.unlockedTalents.push(talentId);
    this.state.talentUnlockedFlags[`${this.state.class}_${talentId}`] = true;

    if (talent.effect) {
      talent.effect(this.state);
    }

    this.state.quests.talent.done = true;
    this.state._statsDirty = true;
    this.calcStats();

    return true;
  }
}