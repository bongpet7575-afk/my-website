// ── DEV MODE — set to false before going public! ──
const DEV_MODE = false;
window.addEventListener('beforeunload', (e) => {
  e.preventDefault();
  e.returnValue = '';
});
// ── LOADER ──
window.addEventListener('load',()=>{const l=document.getElementById('loader');l.style.opacity='0';setTimeout(()=>l.style.display='none',500);});

// ── SOUND ──
function playSound(id){
  try{
    const a=document.getElementById(id);
    if(a){a.currentTime=0;a.volume=0.4;a.play().catch(()=>{});}
  }catch(e){}
}

// ── NOTIFY ──
function notify(msg,color='var(--gold)'){
  const n=document.getElementById('notification');
  n.textContent=msg;n.style.color=color;n.style.display='block';
  clearTimeout(n._t);n._t=setTimeout(()=>n.style.display='none',3000);
}
// ── GAME CONFIG ──
let GAME_CONFIG = {};

async function loadGameConfig() {
  try {
    const { data, error } = await dbClient
      .from('game_config')
      .select('key, value');
    if (error) throw error;

    // Build config map
    data.forEach(row => {
      GAME_CONFIG[row.key] = row.value;
    });

    // Apply to game constants
    applyGameConfig();
    console.log('✅ Game config loaded');
  } catch(e) {
    console.error('Failed to load game config:', e);
    // Falls back to hardcoded values if DB fails
  }
}

function applyGameConfig() {
  // ── Apply enhance costs ──
  if (GAME_CONFIG.enhance_costs) {
    ENHANCE_COST.splice(0, ENHANCE_COST.length, ...GAME_CONFIG.enhance_costs);
  }


  // ── Apply enhance rates ──
  if (GAME_CONFIG.enhance_rates) {
    ENHANCE_RATE.splice(0, ENHANCE_RATE.length, ...GAME_CONFIG.enhance_rates);
  }

// Spin config
// Spin config — prizes loaded from spin_rewards table, only costs here
if (GAME_CONFIG.spin_config) {
  const spinCfg = GAME_CONFIG.spin_config;
  window.NORMAL_SPIN_COST  = spinCfg.normal_cost_gold      || 500000;
  window.PREMIUM_SPIN_COST = spinCfg.premium_cost_crystals || 200;
}

  // ── Apply shop equipment prices ──
  if (GAME_CONFIG.shop_equip_prices) {
    SHOP_EQUIP.forEach(item => {
      if (GAME_CONFIG.shop_equip_prices[item.id]) {
        item.price = GAME_CONFIG.shop_equip_prices[item.id];
      }
    });
  }

  // ── Apply shop consumable prices ──
  if (GAME_CONFIG.shop_cons_prices) {
    SHOP_CONS.forEach(item => {
      if (GAME_CONFIG.shop_cons_prices[item.id]) {
        item.price = GAME_CONFIG.shop_cons_prices[item.id];
      }
    });
  }

  // ── Apply monster gold multipliers ──
  if (GAME_CONFIG.monster_gold_mult) {
    const mult = GAME_CONFIG.monster_gold_mult;
    const stageMap = {
      stage_1:  ['young_wolf','forest_wolf','shadow_wolf','dire_wolf'],
      stage_2:  ['cave_spider','venom_spider','giant_spider','queen_spider'],
      stage_3:  ['goblin_scout','goblin_warrior','goblin_shaman','goblin_elite'],
      stage_4:  ['skeleton_archer','skeleton_warrior','skeleton_mage','skeleton_knight'],
      stage_5:  ['orc_grunt','orc_warrior','orc_shaman','orc_berserker'],
      stage_6:  ['vampire_thrall','vampire_hunter','vampire_noble','vampire_elder'],
      stage_7:  ['cave_troll','rock_troll','frost_troll','war_troll'],
      stage_8:  ['demon_scout','demon_warrior','demon_mage','demon_knight'],
      stage_9:  ['shadow_wraith','shadow_knight','shadow_mage','shadow_lord'],
      stage_10: ['eternal_guard','eternal_warrior','eternal_mage','eternal_champion'],
    };
    Object.entries(stageMap).forEach(([stage, monsters]) => {
      const m = mult[stage] || 1.0;
      monsters.forEach(id => {
        if (MONSTER_TEMPLATES[id]) MONSTER_TEMPLATES[id]._goldMult = m;
      });
    });
  }

  // ── Apply monster XP multipliers ──
  if (GAME_CONFIG.monster_xp_mult) {
    const mult = GAME_CONFIG.monster_xp_mult;
    const stageMap = {
      stage_1:  ['young_wolf','forest_wolf','shadow_wolf','dire_wolf'],
      stage_2:  ['cave_spider','venom_spider','giant_spider','queen_spider'],
      stage_3:  ['goblin_scout','goblin_warrior','goblin_shaman','goblin_elite'],
      stage_4:  ['skeleton_archer','skeleton_warrior','skeleton_mage','skeleton_knight'],
      stage_5:  ['orc_grunt','orc_warrior','orc_shaman','orc_berserker'],
      stage_6:  ['vampire_thrall','vampire_hunter','vampire_noble','vampire_elder'],
      stage_7:  ['cave_troll','rock_troll','frost_troll','war_troll'],
      stage_8:  ['demon_scout','demon_warrior','demon_mage','demon_knight'],
      stage_9:  ['shadow_wraith','shadow_knight','shadow_mage','shadow_lord'],
      stage_10: ['eternal_guard','eternal_warrior','eternal_mage','eternal_champion'],
    };
    Object.entries(stageMap).forEach(([stage, monsters]) => {
      const m = mult[stage] || 1.0;
      monsters.forEach(id => {
        if (MONSTER_TEMPLATES[id]) MONSTER_TEMPLATES[id]._xpMult = m;
      });
    });
  }

  // ── Apply class bonuses from config ──
  if (GAME_CONFIG.class_bonuses) {
    Object.entries(GAME_CONFIG.class_bonuses).forEach(([className, bonuses]) => {
      if (CLASSES[className]) {
        CLASSES[className].bonuses = { ...bonuses };
      }
    });
  }

  // ── Apply talent values from config ──
  if (GAME_CONFIG.talent_values) {
    Object.entries(GAME_CONFIG.talent_values).forEach(([className, talents]) => {
      if (!CLASSES[className]) return;
      Object.values(CLASSES[className].trees).forEach(tree => {
        tree.talents.forEach(talent => {
          const cfg = talents[talent.id];
          if (!cfg) return;
          talent.configValues = cfg;
          talent.effect = buildTalentEffect(talent.id, className, cfg);
        });
      });
    });
  }

  // ── Apply skill multipliers from config ──
  if (GAME_CONFIG.skill_multipliers) {
    Object.entries(GAME_CONFIG.skill_multipliers).forEach(([skillId, mults]) => {
      if (SKILLS[skillId]) {
        SKILLS[skillId].configMults = mults;
        SKILLS[skillId].use = buildSkillUse(skillId, mults);
      }
    });
  }

  // ── Practice fees now handled by getPracticeFee() — no assignment needed ──
 
}

// ── BUILD TALENT EFFECT FROM CONFIG ──
function buildTalentEffect(talentId, className, cfg) {
  return function() {
    if (cfg.critPerRank !== undefined)
      state.talentBonuses.baseCrit = (state.talentBonuses.baseCrit || 0) + cfg.critPerRank;
    if (cfg.armorMultPerRank !== undefined)
      state.talentBonuses.armorMult = (state.talentBonuses.armorMult || 0) + cfg.armorMultPerRank;
    if (cfg.hpRegenMultPerRank !== undefined)
      state.talentBonuses.hpRegenMult = (state.talentBonuses.hpRegenMult || 0) + cfg.hpRegenMultPerRank;
    if (cfg.mpRegenMultPerRank !== undefined)
      state.talentBonuses.mpRegenMult = (state.talentBonuses.mpRegenMult || 0) + cfg.mpRegenMultPerRank;
    if (cfg.dodgeMultPerRank !== undefined)
      state.talentBonuses.dodgeMult = (state.talentBonuses.dodgeMult || 0) + cfg.dodgeMultPerRank;
    if (cfg.hitMultPerRank !== undefined)
      state.talentBonuses.hitMult = (state.talentBonuses.hitMult || 0) + cfg.hitMultPerRank;
    if (cfg.strMultPerRank !== undefined)
      state.talentBonuses.strMult = (state.talentBonuses.strMult || 0) + cfg.strMultPerRank;
    if (cfg.intMultPerRank !== undefined)
      state.talentBonuses.intMult = (state.talentBonuses.intMult || 0) + cfg.intMultPerRank;
    if (cfg.agiMultPerRank !== undefined)
      state.talentBonuses.agiMult = (state.talentBonuses.agiMult || 0) + cfg.agiMultPerRank;
    if (cfg.attackPowerMultPerRank !== undefined)
      state.talentBonuses.attackPowerMult = (state.talentBonuses.attackPowerMult || 0) + cfg.attackPowerMultPerRank;
    if (cfg.lifeStealPerRank !== undefined)
      state.talentBonuses.baseLifeSteal = (state.talentBonuses.baseLifeSteal || 0) + cfg.lifeStealPerRank;
    if (cfg.spellPowerMultPerRank !== undefined)
      state.talentBonuses.spellPowerMult = (state.talentBonuses.spellPowerMult || 0) + cfg.spellPowerMultPerRank;
    if (cfg.healPowerMultPerRank !== undefined)
      state.talentBonuses.healPowerMult = (state.talentBonuses.healPowerMult || 0) + cfg.healPowerMultPerRank;
    if (cfg.critMultPerRank !== undefined)
      state.talentBonuses.critMult = (state.talentBonuses.critMult || 0) + cfg.critMultPerRank;
    if (cfg.dmgReductionPerRank !== undefined)
      state.talentBonuses.dmgReduction = (state.talentBonuses.dmgReduction || 0) + cfg.dmgReductionPerRank;
    if (cfg.dmgReflectPct !== undefined)
      state.talentBonuses.dmgReflect = (state.talentBonuses.dmgReflect || 0) + cfg.dmgReflectPct;
    if (cfg.chainChanceBonus !== undefined)
      state.talentBonuses.chainChance = (state.talentBonuses.chainChance || 0) + cfg.chainChanceBonus;
    if (cfg.bonusAttackChance !== undefined)
      state.talentBonuses.bonusAttackChance = (state.talentBonuses.bonusAttackChance || 0) + cfg.bonusAttackChance;
  };
}

function addGold(amount){
  const safe = Math.floor(Number(amount));
  if(isNaN(safe)||safe===undefined){
    console.warn('addGold received NaN:', amount);
    return;
  }
  state.gold = Math.max(0, (state.gold||0) + safe);
}

// ── BUILD SKILL USE FROM CONFIG ──
function buildSkillUse(skillId, m) {
  switch(skillId) {

    // ── WARRIOR ──
    case 'power_strike': return (e) => {
      const d = Math.floor(state.attackPower * (m.atkMult || 2.2));
      e.hp -= d;
      addCombatLog(`💥 Power Strike! ${formatNumber(d)} dmg!`, 'good');
      playSound('snd-attack'); animateAttack(true, d, false); return d;
    };
    case 'battle_cry': return (e) => {
      if (state.battleCryActive) { addCombatLog(`📯 Battle Cry already active!`, 'info'); return 0; }
      state.battleCryActive = true;
      state.combatBuffStr = (m.strMult || 0.8);
      state.combatBuffAtkp = (m.atkMult || 0.6);
      state.combatBuffHit = 0.3;
      addCombatLog(`📯 Battle Cry! +${Math.round((m.strMult||0.8)*100)}% STR, +${Math.round((m.atkMult||0.6)*100)}% ATK!`, 'good');
      playSound('snd-magic'); calcStats(); return 0;
    };
    case 'last_stand': return (e) => {
      const h = Math.floor(state.maxHp * (m.healPct || 0.15));
      state.hp = Math.min(state.maxHp, state.hp + h);
      addCombatLog(`🛡️ Last Stand! +${formatNumber(h)} HP!`, 'good');
      playSound('snd-heal'); spawnDmgFloat(`+${formatNumber(h)}HP`, false, 'heal-float');
      calcStats(); return 0;
    };

    // ── MAGE ──
    case 'fireball': return (e) => {
      const spellMult = 1 + (state.talentBonuses.spellPowerMult || 0);
      const magicPen = state.magicPen || 0;
      const reduction = Math.max(0, Math.min(0.85, (e.armor || 0) / ((e.armor || 0) + 80000)) - magicPen);
      const base = Math.floor((state.int * (m.intMult || 8.0) + state.attackPower * (m.atkMult || 0.5)) * spellMult);
      const d = Math.max(1, Math.floor(base * (1 - reduction)));
      e.hp -= d;
      addCombatLog(`🔥 Fireball! ${formatNumber(d)} dmg!`, 'good');
      playSound('snd-magic'); animateAttack(true, d, false); return d;
    };
    case 'ice_lance': return (e) => {
      const spellMult = 1 + (state.talentBonuses.spellPowerMult || 0);
      const magicPen = state.magicPen || 0;
      const reduction = Math.max(0, Math.min(0.85, (e.armor || 0) / ((e.armor || 0) + 80000)) - magicPen);
      const base = Math.floor(state.int * (m.intMult || 5.5) * spellMult);
      const d = Math.max(1, Math.floor(base * (1 - reduction)));
      e.hp -= d;
      // Bonus damage on already frozen targets
      const bonusDmg = e.frozen ? Math.floor(d * (m.frozenBonus || 1.5) - d) : 0;
      if (bonusDmg > 0) {
        e.hp -= bonusDmg;
        addCombatLog(`❄️ Ice Lance! ${formatNumber(d + bonusDmg)} dmg (frozen bonus!)`, 'info');
      } else {
        addCombatLog(`❄️ Ice Lance! ${formatNumber(d)} dmg — Frozen!`, 'info');
      }
      e.frozen = true;
      playSound('snd-magic'); animateAttack(true, d + bonusDmg, false); return d + bonusDmg;
    };
    case 'mana_shield': return (e) => {
      state.manaShield = true;
      state.manaShieldAbsorb = Math.floor(state.maxMp * (m.absorbPct || 0.40));
      addCombatLog(`🔮 Mana Shield! Absorbs up to ${formatNumber(state.manaShieldAbsorb)} dmg!`, 'info');
      playSound('snd-heal'); return 0;
    };

    // ── ROGUE ──
    case 'backstab': return (e) => {
      const d = Math.floor(state.attackPower * (m.atkMult || 1.5) + state.agi * (m.agiMult || 3.0));
      e.hp -= d;
      addCombatLog(`🗡️ Backstab! ${formatNumber(d)} dmg!`, 'good');
      playSound('snd-attack'); animateAttack(true, d, false); return d;
    };
    case 'poison_blade': return (e) => {
      const stacks = m.stacks || 5;
      const tick = Math.floor(state.agi * (m.agiMult || 1.8) + state.attackPower * (m.atkMult || 1.3));
      e.poisoned = (e.poisoned || 0) + stacks;
      e.poisonDmg = tick;
      addCombatLog(`🐍 Poisoned! ${formatNumber(tick)} dmg/tick for ${stacks} turns!`, 'good');
      playSound('snd-magic'); return 0;
    };
    case 'shadow_step': return (e) => {
      const d = Math.floor(state.attackPower * (m.atkMult || 2.0) + state.agi * (m.agiMult || 4.0));
      e.hp -= d;
      addCombatLog(`🌑 Shadow Step! ${formatNumber(d)} dmg!`, 'purple');
      playSound('snd-magic'); animateAttack(true, d, false); return d;
    };

    // ── HUNTER ──
    case 'precise_shot': return (e) => {
      const d = Math.floor(state.attackPower * (m.atkMult || 2.0) + state.agi * (m.agiMult || 4.0));
      e.hp -= d;
      addCombatLog(`🎯 Precise Shot! ${formatNumber(d)} dmg!`, 'good');
      playSound('snd-attack'); animateAttack(true, d, false); return d;
    };
    case 'bleed_arrow': return (e) => {
      const stacks = m.stacks || 4;
      const tick = Math.floor(state.agi * (m.agiMult || 1.5) + state.attackPower * (m.atkMult || 1.0));
      e.poisoned = (e.poisoned || 0) + stacks;
      e.poisonDmg = tick;
      addCombatLog(`🏹 Bleed! ${formatNumber(tick)} dmg/tick for ${stacks} turns!`, 'good');
      playSound('snd-attack'); return 0;
    };
    case 'shadow_trap': return (e) => {
      e.frozen = true;
      const d = Math.floor(state.agi * (m.agiMult || 2.5) + state.attackPower * (m.atkMult || 1.5));
      e.hp -= d;
      addCombatLog(`🪤 Shadow Trap! ${formatNumber(d)} dmg + Frozen!`, 'good');
      playSound('snd-magic'); animateAttack(true, d, false); return d;
    };

    // ── PALADIN ──
    case 'holy_strike': return (e) => {
      const healMult = 1 + (state.talentBonuses.healPowerMult || 0);
      const d = Math.floor(state.attackPower * (m.atkMult || 2.0) + state.str * (m.strMult || 3.0));
      e.hp -= d;
      const heal = Math.floor(d * (m.healPct || 0.25) * healMult);
      state.hp = Math.min(state.maxHp, state.hp + heal);
      addCombatLog(`✨ Holy Strike! ${formatNumber(d)} dmg, +${formatNumber(heal)} HP!`, 'good');
      playSound('snd-attack'); animateAttack(true, d, false);
      spawnDmgFloat(`+${formatNumber(heal)}`, false, 'heal-float'); return d;
    };
    case 'divine_shield': return (e) => {
      const healMult = 1 + (state.talentBonuses.healPowerMult || 0);
      state.manaShield = true;
      const healAmt = Math.floor(state.maxHp * (m.healPct || 0.40) * healMult);
      state.hp = Math.min(state.maxHp, state.hp + healAmt);
      addCombatLog(`🛡️ Divine Shield! +${formatNumber(healAmt)} HP + absorb!`, 'good');
      playSound('snd-heal');
      spawnDmgFloat(`+${formatNumber(healAmt)}`, false, 'heal-float'); return 0;
    };
    case 'consecration': return (e) => {
      const d = Math.floor(state.str * (m.strMult || 4.0) + state.int * (m.intMult || 3.0));
      e.hp -= d;
      const stacks = m.stacks || 5;
      e.poisoned = (e.poisoned || 0) + stacks;
      e.poisonDmg = Math.floor(d * (m.burnPct || 0.20));
      addCombatLog(`🌟 Consecration! ${formatNumber(d)} dmg + holy burn x${stacks}!`, 'good');
      playSound('snd-magic'); animateAttack(true, d, false); return d;
    };

    // ── NECROMANCER ──
    case 'death_bolt': return (e) => {
      const spellMult = 1 + (state.talentBonuses.spellPowerMult || 0);
      const d = Math.floor((state.int * (m.intMult || 7.0) + Math.random() * state.int * 2) * spellMult);
      e.hp -= d;
      const drain = Math.floor(d * (m.drainPct || 0.20));
      state.hp = Math.min(state.maxHp, state.hp + drain);
      addCombatLog(`💀 Death Bolt! ${formatNumber(d)} dmg, drained ${formatNumber(drain)} HP!`, 'good');
      playSound('snd-magic'); animateAttack(true, d, false);
      spawnDmgFloat(`+${formatNumber(drain)}`, false, 'heal-float'); return d;
    };
    case 'soul_drain': return (e) => {
      const spellMult = 1 + (state.talentBonuses.spellPowerMult || 0);
      const d = Math.floor(state.int * (m.intMult || 5.0) * spellMult);
      e.hp -= d;
      const drain = Math.floor(d * (m.drainPct || 0.25));
      state.hp = Math.min(state.maxHp, state.hp + drain);
      state.mp = Math.min(state.maxMp, state.mp + Math.floor(state.maxMp * (m.mpRestorePct || 0.10)));
      addCombatLog(`🌑 Soul Drain! ${formatNumber(d)} dmg, +${formatNumber(drain)} HP, +MP!`, 'good');
      playSound('snd-magic'); animateAttack(true, d, false); return d;
    };
    case 'plague_nova': return (e) => {
      const spellMult = 1 + (state.talentBonuses.spellPowerMult || 0);
      const stacks = m.stacks || 6;
      const tick = Math.floor(state.int * (m.intMult || 2.5) * spellMult);
      e.poisoned = (e.poisoned || 0) + stacks;
      e.poisonDmg = tick;
      const d = Math.floor(state.int * (m.directMult || 3.0) * spellMult);
      e.hp -= d;
      addCombatLog(`☠️ Plague Nova! ${formatNumber(d)} + ${formatNumber(tick)}/tick x${stacks}!`, 'good');
      playSound('snd-magic'); animateAttack(true, d, false); return d;
    };

    // ── SHAMAN ──
    case 'lightning_bolt': return (e) => {
      const chainChance = (state.talentBonuses.chainChance || 0) +
        (GAME_CONFIG.skill_multipliers?.lightning_bolt?.chainChance || 0.30);
      const d = Math.floor((state.int * (m.intMult || 6.0) + state.str * (m.strMult || 3.0)));
      e.hp -= d;
      let totalDmg = d;
      // Chain lightning
      if (Math.random() < chainChance) {
        const chainDmg = Math.floor(d * 0.6);
        e.hp -= chainDmg;
        totalDmg += chainDmg;
        addCombatLog(`⚡ Lightning Bolt! ${formatNumber(d)} + ⚡Chain ${formatNumber(chainDmg)} dmg!`, 'good');
      } else {
        addCombatLog(`⚡ Lightning Bolt! ${formatNumber(d)} dmg!`, 'good');
      }
      playSound('snd-magic'); animateAttack(true, totalDmg, false); return totalDmg;
    };
    case 'earth_totem': return (e) => {
      const healAmt = Math.floor(state.maxHp * (m.healPct || 0.20));
      state.hp = Math.min(state.maxHp, state.hp + healAmt);
      // Damage reduction for N turns
      state.earthTotemTurns = m.turns || 3;
      state.earthTotemReduction = m.dmgReductionPct || 0.20;
      state.armorMult *= 1.2;
      addCombatLog(`🪨 Earth Totem! +${formatNumber(healAmt)} HP, ${Math.round((m.dmgReductionPct||0.20)*100)}% dmg reduction for ${m.turns||3} turns!`, 'good');
      playSound('snd-heal'); calcStats(); return 0;
    };
    case 'wind_burst': return (e) => {
      const d = Math.floor(state.agi * (m.agiMult || 4.0) + state.int * (m.intMult || 4.0));
      e.hp -= d;
      e.frozen = true;
      // Queue bonus attacks
      state.bonusAttacks = (state.bonusAttacks || 0) + (m.bonusAttacks || 2);
      addCombatLog(`🌪️ Wind Burst! ${formatNumber(d)} dmg + Frozen + ${m.bonusAttacks||2} bonus attacks!`, 'good');
      playSound('snd-magic'); animateAttack(true, d, false); return d;
    };

    // ── BERSERKER ──
    case 'reckless_strike': return (e) => {
      const hpPct = state.hp / state.maxHp;
      const rageMax = m.rageMax || 2.0;
      const rageMult = 1 + (1 - hpPct) * (rageMax - 1);
      const d = Math.floor(state.attackPower * (m.atkMult || 2.5) * rageMult);
      e.hp -= d;
      addCombatLog(`🐉 Reckless Strike! ${formatNumber(d)} dmg! (${Math.round((1-hpPct)*100)}% rage)`,
        hpPct < 0.3 ? 'legendary' : 'good');
      playSound('snd-attack'); animateAttack(true, d, false); return d;
    };
    case 'blood_rage': return (e) => {
      if (state.battleCryActive) {
        addCombatLog(`🩸 Blood Rage already active!`, 'info'); return 0;
      }
      state.battleCryActive = true;
      state.combatBuffStr = (m.strMult || 0.8);
      state.combatBuffAtkp = (m.atkMult || 0.6);
      addCombatLog(`🩸 BLOOD RAGE! +${Math.round((m.strMult||0.8)*100)}% STR, +${Math.round((m.atkMult||0.6)*100)}% ATK!`, 'legendary');
      playSound('snd-magic'); calcStats(); return 0;
    };
    case 'death_wish': return (e) => {
      const sacrifice = Math.floor(state.hp * 0.30);
      state.hp = Math.max(1, state.hp - sacrifice);
      const d = Math.floor(state.attackPower * (m.atkMult || 2.5) + sacrifice * (m.sacrificeMult || 2.0));
      e.hp -= d;
      addCombatLog(`💢 Death Wish! Sacrificed ${formatNumber(sacrifice)} HP for ${formatNumber(d)} dmg!`, 'legendary');
      playSound('snd-attack'); animateAttack(true, d, false);
      spawnDmgFloat(`💢${formatNumber(d)}`, true, 'crit-dmg'); return d;
    };

    default: return SKILLS[skillId]?.use;
  }
}

// ── CLASS AVATAR ──
const CLASS_AVATARS = {
  Warrior:     'images/classes/warrior.jpeg',
  Mage:        'images/classes/mage.jpeg',
  Rogue:       'images/classes/rogue.jpeg',
  Hunter:      'images/classes/hunter.jpeg',
  Paladin:     'images/classes/paladin.jpeg',
  Necromancer: 'images/classes/necromancer.jfif',
  Shaman:      'images/classes/shaman.jfif',
  Berserker:   'images/classes/berserker.jfif',
};

function getPlayerAvatar(borderColor = 'var(--dark-gold)') {
  const img = CLASS_AVATARS[state.class] || 'images/classes/warrior.jpeg';
  return `<img src="${img}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;border:2px solid ${borderColor};">`;
}

function toggleQR(){
  const overlay = document.getElementById('qr-overlay');
  overlay.style.display = overlay.style.display === 'flex' ? 'none' : 'flex';
}

// ── RENDER STAT POINTS PANEL ──
function renderStatPoints() {
  const panel = document.getElementById('stat-points-panel');
  const content = document.getElementById('stat-points-content');
  const badge = document.getElementById('free-stat-points-badge');
  const legacyPanel = document.getElementById('legacy-points-panel');
  const legacyContent = document.getElementById('legacy-points-content');
  const legacyBadge = document.getElementById('legacy-points-badge');

  if (!panel || !content) return;

  const pts = state.freeStatPoints || 0;
  const legacy = state.legacyPoints || 0;

  // Update badges
  if (badge) {
    badge.textContent = `${pts} pts`;
    badge.style.background = pts > 0 ? 'var(--gold)' : 'rgba(255,255,255,0.1)';
    badge.style.color = pts > 0 ? '#000' : 'var(--text-dim)';
  }
  if (legacyBadge) {
    legacyBadge.textContent = `${legacy} pts`;
    legacyBadge.style.background = legacy > 0
      ? 'linear-gradient(135deg,#a855f7,#7c3aed)'
      : 'rgba(255,255,255,0.1)';
  }

  // ── FREE STAT POINTS ──
  const STATS = [
    { key: 'baseStr', label: '⚔️ STR', color: '#ef4444', desc: 'ATK Power & HP' },
    { key: 'baseAgi', label: '🏃 AGI', color: '#22c55e', desc: 'Dodge, Hit & Speed' },
    { key: 'baseInt', label: '🔮 INT', color: '#3b82f6', desc: 'Magic & Cast Speed' },
    { key: 'baseSta', label: '🛡️ STA', color: '#f59e0b', desc: 'HP & HP Regen' },
  ];

  if (pts <= 0) {
    content.innerHTML = `
      <div style="text-align:center;font-size:.75em;color:var(--text-dim);padding:8px 0;">
        No stat points available. Level up to earn more!
      </div>`;
  } else {
    content.innerHTML = `
      <div style="font-size:.72em;color:var(--text-dim);margin-bottom:10px;">
        You have <span style="color:var(--gold);font-family:var(--font-title);">
        ${pts}</span> stat point${pts !== 1 ? 's' : ''} to spend.
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${STATS.map(s => `
          <div style="display:flex;align-items:center;gap:8px;
            padding:6px 8px;background:rgba(255,255,255,0.03);
            border-radius:6px;border:1px solid var(--border);">
            <div style="flex:1;">
              <div style="font-family:var(--font-title);font-size:.78em;color:${s.color};">
                ${s.label}
              </div>
              <div style="font-size:.62em;color:var(--text-dim);">${s.desc}</div>
            </div>
            <div style="font-size:.75em;color:var(--text-dim);min-width:40px;text-align:center;">
              ${formatNumber(state[s.key] || 0)}
            </div>
            <div style="display:flex;gap:4px;">
              <button onclick="spendStatPoint('${s.key}', 1)"
                style="width:28px;height:28px;border-radius:6px;
                background:rgba(255,153,0,0.15);border:1px solid var(--gold);
                color:var(--gold);font-size:.9em;cursor:pointer;">
                +1
              </button>
              <button onclick="spendStatPoint('${s.key}', 5)"
                style="width:28px;height:28px;border-radius:6px;
                background:rgba(255,153,0,0.08);border:1px solid rgba(255,153,0,0.3);
                color:var(--gold);font-size:.75em;cursor:pointer;
                ${pts < 5 ? 'opacity:0.4;cursor:not-allowed;' : ''}">
                +5
              </button>
              <button onclick="spendStatPoint('${s.key}', 10)"
                style="width:28px;height:28px;border-radius:6px;
                background:rgba(255,153,0,0.05);border:1px solid rgba(255,153,0,0.2);
                color:var(--gold);font-size:.75em;cursor:pointer;
                ${pts < 10 ? 'opacity:0.4;cursor:not-allowed;' : ''}">
                +10
              </button>
            </div>
          </div>`).join('')}
      </div>
      <div style="font-size:.65em;color:var(--text-dim);margin-top:8px;text-align:center;">
        Each point adds directly to your base stat
      </div>`;
  }

  // ── LEGACY POINTS ──
  if (!legacyContent) return;
  legacyContent.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:6px 0;">
      <div style="font-size:1.8em;">✨</div>
      <div style="flex:1;">
        <div style="font-family:var(--font-title);font-size:.85em;
          background:linear-gradient(135deg,#a855f7,#7c3aed);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;">
          ${formatNumber(legacy)} Legacy Points
        </div>
        <div style="font-size:.65em;color:var(--text-dim);margin-top:2px;">
          Save these for future universal skills from special events!
        </div>
      </div>
    </div>
    <div style="font-size:.65em;color:rgba(168,85,247,0.6);
      padding:6px 8px;background:rgba(168,85,247,0.05);
      border-radius:6px;border:1px solid rgba(168,85,247,0.15);
      margin-top:4px;">
      🔮 New skills coming in future events — hoard your points wisely!
    </div>`;
    renderLegacySkillPanel();
}

// ── SPEND STAT POINT ──
async function spendStatPoint(statKey, amount) {
  const pts = state.freeStatPoints || 0;
  if (pts < amount) {
    notify(`❌ Not enough stat points! Need ${amount}, have ${pts}.`, 'var(--red)');
    return;
  }

  const VALID_STATS = ['baseStr', 'baseAgi', 'baseInt', 'baseSta'];
  if (!VALID_STATS.includes(statKey)) return;

  state.freeStatPoints -= amount;
  state[statKey] = (state[statKey] || 0) + amount;

  const statNames = {
    baseStr: 'STR', baseAgi: 'AGI',
    baseInt: 'INT', baseSta: 'STA'
  };

  calcStats();
  addLog(`📊 +${amount} ${statNames[statKey]}! (${state.freeStatPoints} pts left)`, 'gold');
  notify(`+${amount} ${statNames[statKey]}!`, 'var(--gold)');
  updateUI();
  renderStatPoints();
  await savePlayerToSupabase();
}

// BUG FIX #13: CLASSES[state.class] could be undefined if class key is invalid,
// causing .icon to throw. Now uses optional chaining so it degrades gracefully.
function updateClassDisplay() {
  const cls = state.class && CLASSES[state.class];
  const className = cls ? `${cls.icon} ${cls.name}` : 'No Class';
  const topBar = document.getElementById('char-class');
  const panel  = document.getElementById('char-class-panel');
  if (topBar) topBar.textContent = className;
  if (panel)  panel.textContent  = className;
  updatePlayerAvatar();
}

function updatePlayerAvatar() {
  const classKey = state.class ? state.class.charAt(0).toUpperCase() + state.class.slice(1) : null;
  const img = CLASS_AVATARS[classKey] || 'images/classes/warrior.jpeg';
  
  // Update arena avatar
  const arenaEl = document.getElementById('arena-player');
  if (arenaEl) arenaEl.innerHTML = `<img src="${img}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;border:2px solid var(--dark-gold);">`;
  
  // Update character scene portrait
  const portraitEl = document.getElementById('char-portrait-img');
  if (portraitEl) portraitEl.src = img;
}


// ══════════════════════════════════════════
// LEGACY SKILL SYSTEM
// ══════════════════════════════════════════

// ── GET LEGACY SKILL DEFINITIONS FROM CONFIG ──
function getLegacySkillDefs() {
  return GAME_CONFIG.skill_definitions || {};
}

// ── GET PLAYER'S LEARNED LEGACY SKILLS ──
function getLearnedLegacySkills() {
  return state.legacySkills || {};
}

// ── BUILD LEGACY SKILL USE FUNCTION ──
function buildLegacySkillUse(skillId, rank) {
  const defs = getLegacySkillDefs();
  const def = defs[skillId];
  if (!def) return null;
  const rankData = def.ranks[String(rank)];
  if (!rankData) return null;

  switch(skillId) {
    case 'void_strike': return (e) => {
      // Use highest stat
      const bestStat = Math.max(state.str || 0, state.agi || 0, state.int || 0);
      const d = Math.floor(bestStat * rankData.multiplier);
      e.hp -= d;
      // Lifesteal at higher ranks
      if (rankData.lifesteal > 0) {
        const heal = Math.floor(d * rankData.lifesteal);
        state.hp = Math.min(state.maxHp, state.hp + heal);
        spawnDmgFloat(`+${formatNumber(heal)}`, false, 'heal-float');
      }
      addCombatLog(`🌀 Void Strike! ${formatNumber(d)} dmg!`, 'legendary');
      playSound('snd-magic');
      animateAttack(true, d, false);
      return d;
    };

    case 'blood_pact': return (e) => {
      const sacrifice = Math.floor(state.maxHp * rankData.sacrificePct);
      state.hp = Math.max(1, state.hp - sacrifice);
      const heal = Math.floor(state.maxHp * rankData.healPct);
      state.hp = Math.min(state.maxHp, state.hp + heal);
      const net = heal - sacrifice;
      addCombatLog(`🩸 Blood Pact! +${formatNumber(heal)} HP (net +${formatNumber(net)})!`, 'good');
      playSound('snd-heal');
      spawnDmgFloat(`+${formatNumber(heal)}`, false, 'heal-float');
      return 0;
    };

    case 'arcane_surge': return (e) => {
      if (state.arcaneSurgeActive) {
        addCombatLog(`💫 Arcane Surge already active!`, 'info');
        return 0;
      }
      state.arcaneSurgeActive = true;
      state.arcaneSurgeTurns = rankData.turns;
      state.arcaneSurgeMult = rankData.buffMult;
      // Apply buff to all multipliers
      state.strMult *= rankData.buffMult;
      state.agiMult *= rankData.buffMult;
      state.intMult *= rankData.buffMult;
      state.staMult *= rankData.buffMult;
      calcStats();
      addCombatLog(`💫 Arcane Surge! +${Math.round((rankData.buffMult-1)*100)}% ALL stats for ${rankData.turns} turns!`, 'legendary');
      playSound('snd-magic');
      spawnAbilityFloat(`💫 Arcane Surge!`, '#a855f7');
      return 0;
    };

    case 'soul_barrier': return (e) => {
      const absorb = Math.floor(state.sta * rankData.staMult);
      state.soulBarrierAbsorb = absorb;
      addCombatLog(`🔰 Soul Barrier! Absorbing ${formatNumber(absorb)} damage!`, 'good');
      playSound('snd-heal');
      spawnAbilityFloat(`🔰 Soul Barrier!`, '#3b82f6');
      return 0;
    };

    case 'eternal_flame': return (e) => {
      const bestStat = Math.max(state.str || 0, state.agi || 0, state.int || 0);
      const tick = Math.floor(bestStat * rankData.tickMult);
      e.poisoned = (e.poisoned || 0) + rankData.stacks;
      e.poisonDmg = Math.max(e.poisonDmg || 0, tick);
      addCombatLog(`🕯️ Eternal Flame! ${formatNumber(tick)} burn/tick x${rankData.stacks}!`, 'legendary');
      playSound('snd-magic');
      spawnAbilityFloat(`🕯️ Eternal Flame!`, '#f97316');
      return 0;
    };

    default: return null;
  }
}

// BUG FIX: rebuildSkills was synchronous but registerLegacySkills depends on
// GAME_CONFIG.skill_definitions which is loaded asynchronously. If config
// wasn't loaded yet, getLegacySkillDefs() returned {} and no legacy skills
// got registered into the SKILLS object — so renderSkillBar skipped them all.
//
// Fix: made rebuildSkills async, awaits loadGameConfig() before registering
// legacy skills. Also added a re-render of the skill bar after registration.
async function rebuildSkills() {
  // Step 1: Start fresh
  state.skills = [];

  // Step 2: Add class skills
  if (state.class && CLASSES[state.class]) {
    state.skills = [...CLASSES[state.class].skills];
  }

  // Step 3: Ensure GAME_CONFIG is loaded before registering legacy skills
  // This is the key fix — legacy skill defs live in GAME_CONFIG.skill_definitions
  if (typeof loadGameConfig === 'function') {
    await loadGameConfig();
  }

  // Step 4: Register legacy skills into SKILLS object
  if (typeof registerLegacySkills === 'function') {
    registerLegacySkills();
  }

  // Step 5: Add legacy skill IDs that player has learned
  const learned = state.legacySkills || {};
  Object.keys(learned).forEach(skillId => {
    if (learned[skillId] && !state.skills.includes(skillId)) {
      state.skills.push(skillId);
    }
  });

  // Step 6: Re-render skill bar now that SKILLS object is fully populated
  if (typeof renderSkillBar === 'function') {
    renderSkillBar();
  }
}

// ── REGISTER LEGACY SKILLS INTO SKILLS OBJECT ──
// No changes needed here — just needs GAME_CONFIG to be loaded first (done above)
function registerLegacySkills() {
  const learned = getLearnedLegacySkills();
  const defs    = getLegacySkillDefs();

  // Guard: if config not loaded yet, bail — rebuildSkills will retry
  if (!defs || !Object.keys(defs).length) {
    console.warn('registerLegacySkills: skill_definitions not loaded yet — skipping');
    return;
  }

  Object.entries(learned).forEach(([skillId, rank]) => {
    const def = defs[skillId];
    if (!def || !rank) return;

    const rankData = def.ranks[String(rank)];
    if (!rankData) return;

    // Register into SKILLS object so combat system and renderSkillBar pick it up
    SKILLS[skillId] = {
      name:     def.name,
      icon:     def.icon,
      mp:       () => Math.floor(state.maxMp * def.mp),
      cd:       def.cd,
      isLegacy: true,
      rank:     rank,
      use:      buildLegacySkillUse(skillId, rank),
    };
  });
}

// ── LEARN LEGACY SKILL FROM BOOK ──
async function learnLegacySkill(skillId) {
  const defs = getLegacySkillDefs();
  const def = defs[skillId];
  if (!def) { notify('Unknown skill!', 'var(--red)'); return; }

  const learned = getLearnedLegacySkills();
  const currentRank = learned[skillId] || 0;

  // Already at max rank
  if (currentRank >= 5) {
    notify(`${def.icon} ${def.name} is already at max rank!`, 'var(--gold)');
    return;
  }

  const nextRank = currentRank + 1;
  const rankData = def.ranks[String(nextRank)];
  if (!rankData) return;

  const cost = rankData.cost;

  // Check legacy points
  if ((state.legacyPoints || 0) < cost) {
    notify(`❌ Need ${cost} Legacy Points! You have ${state.legacyPoints || 0}.`, 'var(--red)');
    return;
  }

  // Confirm
  const action = currentRank === 0 ? 'Learn' : `Upgrade to Rank ${nextRank}`;
  if (!confirm(`${action} ${def.icon} ${def.name} for ${cost} Legacy Points?\n\n${rankData.desc}`)) return;

  // Deduct legacy points
  state.legacyPoints -= cost;

  // Save learned skill
  if (!state.legacySkills) state.legacySkills = {};
  state.legacySkills[skillId] = nextRank;

  // Rebuild skills from source of truth
  await rebuildSkills();

  const action2 = currentRank === 0 ? 'Learned' : `Upgraded to Rank ${nextRank}`;
  addLog(`✨ ${action2}: ${def.icon} ${def.name}! (${rankData.desc})`, 'legendary');
  notify(`✨ ${def.icon} ${def.name} ${action2}!`, 'var(--gold)');
  playSound('snd-levelup');

  calcStats();
  updateUI();
  renderStatPoints();
  renderSkillBar();
  await savePlayerToSupabase();
}

// ── UPGRADE LEGACY SKILL ──
function upgradeLegacySkill(skillId) {
  learnLegacySkill(skillId); // same flow — learn handles both learn and upgrade
}

// ── RENDER LEGACY SKILL PANEL (shows learned skills + upgrade options) ──
function renderLegacySkillPanel() {
  const content = document.getElementById('legacy-points-content');
  if (!content) return;

  const learned = getLearnedLegacySkills();
  const defs = getLegacySkillDefs();
  const legacy = state.legacyPoints || 0;

  if (!Object.keys(defs).length) {
    content.innerHTML = `
      <div style="text-align:center;font-size:.75em;color:var(--text-dim);padding:8px;">
        No legacy skills available yet.
      </div>`;
    return;
  }

  let html = `
    <div style="font-size:.72em;color:var(--text-dim);margin-bottom:10px;">
      You have <span style="color:#a855f7;font-family:var(--font-title);">
      ${legacy}</span> Legacy Points
    </div>`;

  // Show learned skills first
  const learnedIds = Object.keys(learned);
  if (learnedIds.length) {
    html += `
      <div style="font-family:var(--font-title);font-size:.65em;
        color:var(--text-dim);letter-spacing:2px;margin-bottom:6px;">
        LEARNED SKILLS
      </div>`;

    learnedIds.forEach(skillId => {
      const def = defs[skillId];
      if (!def) return;
      const rank = learned[skillId];
      const rankData = def.ranks[String(rank)];
      const nextRank = rank + 1;
      const nextRankData = def.ranks[String(nextRank)];
      const canUpgrade = nextRankData && legacy >= nextRankData.cost;

      html += `
        <div style="background:rgba(168,85,247,0.06);border:1px solid rgba(168,85,247,0.2);
          border-radius:8px;padding:8px;margin-bottom:6px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-size:1.3em;">${def.icon}</span>
            <div style="flex:1;">
              <div style="font-family:var(--font-title);font-size:.80em;color:#a855f7;">
                ${def.name}
                <span style="font-size:.75em;color:var(--gold);margin-left:4px;">
                  Rank ${rank}/5
                </span>
              </div>
              <div style="font-size:.65em;color:var(--text-dim);">${rankData?.desc || ''}</div>
            </div>
          </div>
          <!-- Rank progress bar -->
          <div style="height:3px;background:rgba(255,255,255,0.07);
            border-radius:2px;overflow:hidden;margin-bottom:6px;">
            <div style="height:100%;width:${(rank/5)*100}%;
              background:linear-gradient(135deg,#a855f7,#7c3aed);
              border-radius:2px;"></div>
          </div>
          ${nextRankData ? `
            <button onclick="upgradeLegacySkill('${skillId}')"
              style="width:100%;padding:5px;font-size:.68em;
              background:${canUpgrade ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)'};
              border:1px solid ${canUpgrade ? 'rgba(168,85,247,0.5)' : 'var(--border)'};
              border-radius:6px;color:${canUpgrade ? '#a855f7' : 'var(--text-dim)'};
              cursor:${canUpgrade ? 'pointer' : 'not-allowed'};">
              ⬆️ Rank ${nextRank} — ${nextRankData.cost} pts
              ${!canUpgrade ? `(need ${nextRankData.cost - legacy} more)` : ''}
            </button>` : `
            <div style="text-align:center;font-size:.65em;color:var(--gold);padding:4px;">
              ✅ MAX RANK
            </div>`}
        </div>`;
    });
  }

  content.innerHTML = html;
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

  soulWeapon: null, // { classId, tier, name, passive, skill, skillCd }
  craftedSoulTiers: {},  // { warrior: 2, mage: 1, ... }
  soulSkillCd: 0,
  // Identity (set on login/register)
  character_id: null,
  user_id: null,

  reputation: 0,
  reputationTitle: null,

  respecCount: 0,
  soulCrystals: 0,
  loginStreak: 0,
  lastLoginDate: null,
  totalLoginDays: 0,

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
  baseStr:5,baseAgi:5,baseInt:5,baseSta:5,baseArmor:0,
  baseHit:2,baseCrit:0.1,baseDodge:2,baseHpRegen:20,baseLifeSteal:0,baseAttackPower:10,

  // Stat multipliers (starts at 1.0)
  strMult:1.0,agiMult:1.0,intMult:1.0,staMult:1.0,armorMult:1.0,
  maxHpMult:1.0,hpRegenMult:1.0,maxMpMult:1.0,mpMult:1.0,
  critMult:1.0,dodgeMult:1.0,mpRegenMult:1.0,hitMult:1.0,
  lifeStealMult:1.0,attackPowerMult:1.0,
  skillStrMult:1.0,skillStaMult:1.0,skillMaxHp:1.0,skillArmorMult:1.0,

  // Effective stats (calculated by calcStats)
  str:15,agi:15,int:15,sta:15,armor:0,
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



// ── REPUTATION ──
const REPUTATION_TITLES = [
  { id:'baron',    label:'Baron',    req:1000,  boost:0.10, soulTier:1 },
  { id:'chief',    label:'Chief',    req:5000,  boost:0.20, soulTier:2 },
  { id:'mayor',    label:'Mayor',    req:15000, boost:0.35, soulTier:3 },
  { id:'viscount', label:'Viscount', req:35000, boost:0.50, soulTier:4 },
  { id:'count',    label:'Count',    req:75000, boost:0.75, soulTier:5 },
];

const NPC_LIST = {
  // Class Trainers
  aldric:        { name: 'Aldric',        role: 'Warrior Trainer',     location: 'Iron Brotherhood Hall' },
  seraphine:     { name: 'Seraphine',     role: 'Mage Trainer',        location: 'Arcane Sanctum'        },
  vex:           { name: 'Vex',           role: 'Rogue Trainer',       location: 'The Shadow Den'        },
  kara:          { name: 'Kara',          role: 'Hunter Trainer',      location: 'Wilderness Outpost'    },
  brother_elian: { name: 'Brother Elian', role: 'Paladin Trainer',     location: 'Sacred Monastery'      },
  malachar:      { name: 'Malachar',      role: 'Necromancer Trainer', location: 'The Crypt'             },
  nara:          { name: 'Nara',          role: 'Shaman Trainer',      location: 'Spirit Grove'          },
  ragnar:        { name: 'Ragnar',        role: 'Berserker Trainer',   location: 'The Bloodpit'          },

  // General NPCs
  mirela:        { name: 'Mirela',        role: 'Quest Giver',         location: 'Merchant Guild Hall'   },
  sovan:         { name: 'Sovan',         role: 'Blacksmith',          location: "Sovan's Forge"         },
  voss: { name: 'Clerk Voss', role: 'Auction House Guard', location: 'Auction House Entrance' }
};

// ============================================================
// NPC SYSTEM
// ============================================================
async function openNPCPanel(npcId) {
  const npc = NPC_LIST[npcId]
  if (!npc) return

  // Show panel
  const panel = document.createElement('div')
  panel.id = 'npc-panel'
  panel.innerHTML = `
    <div id="npc-overlay" onclick="closeNPCPanel()" style="
      position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;
      display:flex;align-items:center;justify-content:center;">
      <div onclick="event.stopPropagation()" style="
        background:#1a1208;border:2px solid #8b6914;border-radius:12px;
        width:min(480px,95vw);max-height:80vh;display:flex;flex-direction:column;
        box-shadow:0 0 30px rgba(139,105,20,0.4);">

        <!-- HEADER -->
        <div style="padding:16px 20px;border-bottom:1px solid #8b6914;
          display:flex;align-items:center;gap:12px;">
          <div id="npc-avatar" style="
            width:56px;height:56px;border-radius:50%;
            background:#2a1f0a;border:2px solid #8b6914;
            display:flex;align-items:center;justify-content:center;
            font-size:28px;flex-shrink:0;">
            ${getNPCEmoji(npcId)}
          </div>
          <div style="flex:1">
            <div style="color:#f0c040;font-size:18px;font-weight:bold;">${npc.name}</div>
            <div style="color:#a0845c;font-size:13px;">${npc.role}</div>
            <div style="color:#666;font-size:11px;">📍 ${npc.location}</div>
          </div>
          <div id="npc-rep-badge" style="
            padding:4px 10px;border-radius:20px;font-size:11px;font-weight:bold;
            background:#2a1f0a;border:1px solid #444;color:#888;">
            Loading...
          </div>
          <button onclick="closeNPCPanel()" style="
            background:none;border:none;color:#888;font-size:20px;
            cursor:pointer;padding:4px 8px;">✕</button>
        </div>

        <!-- DIALOGUE BOX -->
        <div style="padding:20px;flex:1;overflow-y:auto;">
          <div id="npc-dialogue" style="
            background:#0f0a02;border:1px solid #3a2f1a;border-radius:8px;
            padding:16px;min-height:80px;color:#e8d5a0;font-size:15px;
            line-height:1.6;font-style:italic;">
            <span style="color:#555">...</span>
          </div>
        </div>

        <!-- ACTIONS -->
        <div style="padding:12px 20px;border-top:1px solid #2a1f0a;
          display:flex;gap:8px;flex-wrap:wrap;">
          <button onclick="chatWithNPC('${npcId}', 'greet')" style="
            background:#2a1f0a;border:1px solid #8b6914;color:#f0c040;
            padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px;">
            💬 Greet
          </button>
          <button style="
            background:#1a1208;border:1px solid #333;color:#555;
            padding:8px 16px;border-radius:6px;cursor:not-allowed;font-size:13px;"
            title="Coming soon">
            📜 Quests
          </button>
          <button style="
            background:#1a1208;border:1px solid #333;color:#555;
            padding:8px 16px;border-radius:6px;cursor:not-allowed;font-size:13px;"
            title="Coming soon">
            ⚔️ Train
          </button>
        </div>

      </div>
    </div>
  `
  document.body.appendChild(panel)

  // Auto greet on open
  await chatWithNPC(npcId, 'greet')
}

async function chatWithNPC(npcId, messageType) {
  const dialogueBox = document.getElementById('npc-dialogue')
  if (!dialogueBox) return

  // 1. Validate character ID before making the request
  if (!state.character_id) {
    console.error("No character ID found in state. Please ensure your character is created.");
    dialogueBox.innerHTML = `<span style="color:#e67e22">*Error: Character data missing. Please refresh or create a character.*</span>`;
    return;
  }

  dialogueBox.innerHTML = `<span style="color:#555">...</span>`

  try {
    const { data: { session } } = await dbClient.auth.getSession()
    
    // Optional: Check if session is valid
    if (!session) throw new Error("No active session");

    const res = await fetch('https://xagwrqrgcuuitwgroiwh.supabase.co/functions/v1/talk-to-npc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        npc_id: npcId,
        message_type: messageType,
        character_id: state.character_id
      })
    })

    const data = await res.json()
    
    // 2. Handle specific server errors gracefully
    if (data.error) {
      // If the server says "Character not found", guide the user
      if (data.error.includes("Character not found")) {
         throw new Error("Character ID mismatch. Try refreshing the page to reload your character data.");
      }
      throw new Error(data.error)
    }

    await typeDialogue(data.response)
    updateRepBadge(data.relationship_score, data.mood)

  } catch (err) {
    console.error('NPC error:', err)
    // Only show the generic error if it's not our custom one
    if (!err.message.includes("Character ID mismatch")) {
       if (dialogueBox) dialogueBox.innerHTML = `<span style="color:#c0392b">*The NPC stares blankly. Something went wrong.*</span>`;
    } else {
       if (dialogueBox) dialogueBox.innerHTML = `<span style="color:#c0392b">*${err.message}</span>`;
    }
  }
}

async function typeDialogue(text) {
  const dialogueBox = document.getElementById('npc-dialogue')
  if (!dialogueBox) return
  // Strip surrounding quotes if present
  const clean = text.replace(/^["']|["']$/g, '').trim()
  dialogueBox.innerHTML = ''
  for (let i = 0; i < clean.length; i++) {
    dialogueBox.innerHTML += clean[i]
    await new Promise(r => setTimeout(r, 18))
  }
}

function updateRepBadge(score, mood) {
  const badge = document.getElementById('npc-rep-badge')
  if (!badge) return
  const tiers = [
    { min: 60,  label: '⭐ Revered',  color: '#f0c040', border: '#f0c040' },
    { min: 30,  label: '😊 Warm',     color: '#2ecc71', border: '#2ecc71' },
    { min: 0,   label: '😐 Neutral',  color: '#888',    border: '#444'    },
    { min: -20, label: '😒 Cold',     color: '#e67e22', border: '#e67e22' },
    { min: -100,label: '😡 Hostile',  color: '#c0392b', border: '#c0392b' },
  ]
  const tier = tiers.find(t => score >= t.min) || tiers[tiers.length - 1]
  badge.textContent = tier.label
  badge.style.color = tier.color
  badge.style.borderColor = tier.border
}

function getNPCEmoji(npcId) {
  const emojis = {
    aldric:        '⚔️',
    seraphine:     '🔮',
    vex:           '🗡️',
    kara:          '🏹',
    brother_elian: '✨',
    malachar:      '💀',
    nara:          '🌿',
    ragnar:        '🪓',
    mirela:        '💰',
    sovan:         '🔨',
  }
  return emojis[npcId] || '👤'
}

function closeNPCPanel() {
  const panel = document.getElementById('npc-panel')
  if (panel) panel.remove()
}
function getCurrentTitle() {
  let current = null;
  for (const t of REPUTATION_TITLES) {
    if (state.reputation >= t.req) current = t;
    else break;
  }
  return current;
}

function getNextTitle() {
  for (const t of REPUTATION_TITLES) {
    if (state.reputation < t.req) return t;
  }
  return null;
}

function updateRepBar() {
  const repVal = document.getElementById('rep-val');
  const repNext = document.getElementById('rep-next');
  const repBar = document.getElementById('rep-bar');
  const repTitle = document.getElementById('rep-title');
  if (!repVal) return;

  const current = getCurrentTitle();
  const next = getNextTitle();

  if (!next) {
    // MAX title reached
    repVal.textContent = formatNumber(state.reputation);
    repNext.textContent = formatNumber(75000);
    repBar.style.width = '100%';
    repTitle.textContent = '👑 COUNT';
    repTitle.style.color = 'var(--legendary)';
    repBar.style.boxShadow = '0 0 20px rgba(255,153,0,0.8)';
    return;
  }

  const prevReq = current ? current.req : 0;
  const progress = ((state.reputation - prevReq) / (next.req - prevReq)) * 100;
  repVal.textContent = formatNumber(state.reputation);
  repNext.textContent = formatNumber(next.req);
  repBar.style.width = Math.min(100, progress) + '%';
  repTitle.textContent = current ? `${current.label} → ${next.label}` : `→${next.label}`;
}

async function addReputation(points) {
  state.reputation = (state.reputation || 0) + points;
  const current = getCurrentTitle();
  const prev = state.reputationTitle;

  // Check for title upgrade
  if (current && current.id !== prev) {
    state.reputationTitle = current.id;
    notify(`👑 New Title: ${current.label}!`, 'var(--purple)');
    addLog(`👑 You are now ${current.label}! +${current.boost * 100}% all stats!`, 'purple');
    calcStats();
  }

  updateRepBar();
  await savePlayerToSupabase();
}



// ── SOUL WEAPONS ──
const SOUL_WEAPONS = {
  warrior: {
    tiers: [
      { tier:1, name:"⚔️ Warlord's Edge I",      rarity:'uncommon', levelReq:10,  stats:{str:500,  crit:3,  lifeSteal:0.15} },
      { tier:2, name:"⚔️ Warlord's Edge II",     rarity:'rare',     levelReq:30,  stats:{str:1500, crit:6,  lifeSteal:0.25, strMult:0.3} },
      { tier:3, name:"⚔️ Warlord's Edge III",    rarity:'epic',     levelReq:50,  stats:{str:4000, crit:10, lifeSteal:0.4,  strMult:0.6} },
      { tier:4, name:"⚔️ Warlord's Edge IV",     rarity:'legendary',levelReq:75,  stats:{str:9000, crit:15, lifeSteal:0.6,  strMult:1.2} },
      { tier:5, name:"⚔️ Soul of the Warlord",   rarity:'legendary',levelReq:100, stats:{str:20000,crit:25, lifeSteal:1.0,  strMult:2.5} },
    ],
    passive: { name:'Kill Stack', desc:'Every kill gives +3% ATK (resets on death)', stat:'attackPowerMult', perKill:0.03 },
    skill: { name:'Colossus Smash', icon:'💥', desc:'500% ATK + enemy armor -50% for 3 turns', cd:5,
      effect(enemy){ const d=Math.floor(state.attackPower*5); enemy.armor=Math.floor(enemy.armor*0.5); enemy.armorDebuffTurns=3; return d; }},
  },
  mage: {
    tiers: [
      { tier:1, name:"🔮 Arcane Tome I",      rarity:'uncommon', levelReq:10,  stats:{int:500,  mpMult:0.1} },
      { tier:2, name:"🔮 Arcane Tome II",     rarity:'rare',     levelReq:30,  stats:{int:1500, mpMult:0.2, intMult:0.3} },
      { tier:3, name:"🔮 Arcane Tome III",    rarity:'epic',     levelReq:50,  stats:{int:4000, mpMult:0.3, intMult:0.6} },
      { tier:4, name:"🔮 Arcane Tome IV",     rarity:'legendary',levelReq:75,  stats:{int:9000, mpMult:0.5, intMult:1.2} },
      { tier:5, name:"🔮 Arcane Grimoire",    rarity:'legendary',levelReq:100, stats:{int:20000,mpMult:1.0, intMult:2.5} },
    ],
    passive: { name:'Echo Cast', desc:'15% chance any spell casts twice', chance:0.15 },
    skill: { name:'Arcane Overload', icon:'✨', desc:'Next 3 spells cost 0 MP and deal +300% damage', cd:6,
      effect(){ state.arcaneOverloadStacks=3; }},
  },
  rogue: {
    tiers: [
      { tier:1, name:"🗡️ Shadow Blade I",     rarity:'uncommon', levelReq:10,  stats:{agi:500,  crit:5,  dodge:200} },
      { tier:2, name:"🗡️ Shadow Blade II",    rarity:'rare',     levelReq:30,  stats:{agi:1500, crit:8,  dodge:500,  agiMult:0.3} },
      { tier:3, name:"🗡️ Shadow Blade III",   rarity:'epic',     levelReq:50,  stats:{agi:4000, crit:12, dodge:1500, agiMult:0.6} },
      { tier:4, name:"🗡️ Shadow Blade IV",    rarity:'legendary',levelReq:75,  stats:{agi:9000, crit:18, dodge:4000, agiMult:1.2} },
      { tier:5, name:"🗡️ Shadow Covenant",    rarity:'legendary',levelReq:100, stats:{agi:20000,crit:30, dodge:10000,agiMult:2.5} },
    ],
    passive: { name:'First Blood', desc:'First attack each combat is always a crit' },
    skill: { name:'Death Mark', icon:'🎯', desc:'All attacks deal +100% damage for 5 turns', cd:6,
      effect(){ state.deathMarkTurns=5; }},
  },
  hunter: {
    tiers: [
      { tier:1, name:"🏹 Eagle Bow I",        rarity:'uncommon', levelReq:10,  stats:{agi:500,  hit:200} },
      { tier:2, name:"🏹 Eagle Bow II",       rarity:'rare',     levelReq:30,  stats:{agi:1500, hit:600,  agiMult:0.3} },
      { tier:3, name:"🏹 Eagle Bow III",      rarity:'epic',     levelReq:50,  stats:{agi:4000, hit:2000, agiMult:0.6, crit:8} },
      { tier:4, name:"🏹 Eagle Bow IV",       rarity:'legendary',levelReq:75,  stats:{agi:9000, hit:5000, agiMult:1.2, crit:15} },
      { tier:5, name:"🏹 Eagle Pact",         rarity:'legendary',levelReq:100, stats:{agi:20000,hit:12000,agiMult:2.5, crit:25} },
    ],
    passive: { name:'Momentum', desc:'Each consecutive attack +5% damage (max 20 stacks)', perHit:0.05, maxStacks:20 },
    skill: { name:'Killshot', icon:'🎯', desc:'Guaranteed crit dealing 800% ATK', cd:7,
      effect(enemy){ const d=Math.floor(state.attackPower*8); return d; }},
  },
  paladin: {
    tiers: [
      { tier:1, name:"✨ Holy Mace I",        rarity:'uncommon', levelReq:10,  stats:{sta:500,  armor:5000,  hpRegen:200} },
      { tier:2, name:"✨ Holy Mace II",       rarity:'rare',     levelReq:30,  stats:{sta:1500, armor:15000, hpRegen:600,  staMult:0.3} },
      { tier:3, name:"✨ Holy Mace III",      rarity:'epic',     levelReq:50,  stats:{sta:4000, armor:40000, hpRegen:2000, staMult:0.6} },
      { tier:4, name:"✨ Holy Mace IV",       rarity:'legendary',levelReq:75,  stats:{sta:9000, armor:90000, hpRegen:5000, staMult:1.2} },
      { tier:5, name:"✨ Divine Covenant",    rarity:'legendary',levelReq:100, stats:{sta:20000,armor:200000,hpRegen:15000,staMult:2.5} },
    ],
    passive: { name:'Holy Aura', desc:'Heal 5% max HP every combat turn' },
    skill: { name:'Divine Wrath', icon:'⚡', desc:'300% ATK damage + shield 30% max HP', cd:5,
      effect(enemy){ const d=Math.floor(state.attackPower*3); state.divineShield=Math.floor(state.maxHp*0.3); return d; }},
  },
  necromancer: {
    tiers: [
      { tier:1, name:"💀 Death Wand I",       rarity:'uncommon', levelReq:10,  stats:{int:500,  lifeSteal:0.2} },
      { tier:2, name:"💀 Death Wand II",      rarity:'rare',     levelReq:30,  stats:{int:1500, lifeSteal:0.4,  intMult:0.3} },
      { tier:3, name:"💀 Death Wand III",     rarity:'epic',     levelReq:50,  stats:{int:4000, lifeSteal:0.6,  intMult:0.6} },
      { tier:4, name:"💀 Death Wand IV",      rarity:'legendary',levelReq:75,  stats:{int:9000, lifeSteal:0.8,  intMult:1.2} },
      { tier:5, name:"💀 Tome of the Damned", rarity:'legendary',levelReq:100, stats:{int:20000,lifeSteal:1.5,  intMult:2.5} },
    ],
    passive: { name:'Soul Drain', desc:'20% of damage dealt restores MP' },
    skill: { name:'Soul Harvest', icon:'💀', desc:'Drain 40% of enemy current HP as damage', cd:6,
      effect(enemy){ const d=Math.floor(enemy.hp*0.4); return d; }},
  },
  shaman: {
    tiers: [
      { tier:1, name:"⚡ Storm Staff I",      rarity:'uncommon', levelReq:10,  stats:{int:500,  hit:200,  mpRegen:100} },
      { tier:2, name:"⚡ Storm Staff II",     rarity:'rare',     levelReq:30,  stats:{int:1500, hit:600,  mpRegen:300,  intMult:0.3} },
      { tier:3, name:"⚡ Storm Staff III",    rarity:'epic',     levelReq:50,  stats:{int:4000, hit:2000, mpRegen:1000, intMult:0.6} },
      { tier:4, name:"⚡ Storm Staff IV",     rarity:'legendary',levelReq:75,  stats:{int:9000, hit:5000, mpRegen:3000, intMult:1.2} },
      { tier:5, name:"⚡ Stormbinder",        rarity:'legendary',levelReq:100, stats:{int:20000,hit:12000,mpRegen:8000, intMult:2.5} },
    ],
    passive: { name:'Chain Lightning', desc:'25% chance to deal bonus 200% ATK after any attack', chance:0.25 },
    skill: { name:'Tempest', icon:'⚡', desc:'Hit 5 times for 150% ATK each', cd:5,
      effect(enemy){ const d=Math.floor(state.attackPower*1.5); return d*5; }},
  },
  berserker: {
    tiers: [
      { tier:1, name:"🩸 Rage Axe I",         rarity:'uncommon', levelReq:10,  stats:{str:500,  attackPower:1000} },
      { tier:2, name:"🩸 Rage Axe II",        rarity:'rare',     levelReq:30,  stats:{str:1500, attackPower:3000,  strMult:0.3} },
      { tier:3, name:"🩸 Rage Axe III",       rarity:'epic',     levelReq:50,  stats:{str:4000, attackPower:8000,  strMult:0.6} },
      { tier:4, name:"🩸 Rage Axe IV",        rarity:'legendary',levelReq:75,  stats:{str:9000, attackPower:20000, strMult:1.2} },
      { tier:5, name:"🩸 Bloodrage Axe",      rarity:'legendary',levelReq:100, stats:{str:20000,attackPower:50000, strMult:2.5} },
    ],
    passive: { name:'Death Wish', desc:'Below 30% HP deal 200% bonus damage' },
    skill: { name:'Rampage', icon:'🩸', desc:'Sacrifice 20% HP to deal 1000% ATK', cd:6,
      effect(enemy){ state.hp=Math.max(1,state.hp-Math.floor(state.maxHp*0.2)); const d=Math.floor(state.attackPower*10); return d; }},
  },
};

// ============================================================
// ADVENTURE SCENE TAB SWITCHER
// ============================================================
function switchAdvTab(tab, btn) {
  if (tab !== 'merchant') resetMerchantSession()
  // Hide all adv panels
  document.querySelectorAll('[id^="adv-panel-"]').forEach(p => p.style.display = 'none')
  // Deactivate all tabs
  document.querySelectorAll('#adv-tabs .town-tab').forEach(b => b.classList.remove('active'))
  // Show selected panel
  const panel = document.getElementById('adv-panel-' + tab)
  if (panel) panel.style.display = 'flex'
  // Activate tab
  if (btn) btn.classList.add('active')

  // Render content on switch
  if (tab === 'training') renderTrainingHall()
  if (tab === 'merchant') {
    renderInventory()
    renderShop()
    renderCrafting()
    fetchAuctions(currentAuctionSource || 'auction')
    updateBlackWingVisibility()
  }
}

// ============================================================
// TRAINING HALL RENDERER
// ============================================================
function renderTrainingHall() {
  const container = document.getElementById('training-hall-npcs')
  if (!container) return

  const CLASS_TRAINERS = {
    warrior:     { npcId: 'aldric',        name: 'Aldric',        role: 'Warrior Trainer',     icon: '⚔️', unlockLevel: 10  },
    mage:        { npcId: 'seraphine',     name: 'Seraphine',     role: 'Mage Trainer',        icon: '🔮', unlockLevel: 10  },
    rogue:       { npcId: 'vex',           name: 'Vex',           role: 'Rogue Trainer',       icon: '🗡️', unlockLevel: 10  },
    hunter:      { npcId: 'kara',          name: 'Kara',          role: 'Hunter Trainer',      icon: '🏹', unlockLevel: 20  },
    paladin:     { npcId: 'brother_elian', name: 'Brother Elian', role: 'Paladin Trainer',     icon: '✨', unlockLevel: 30  },
    necromancer: { npcId: 'malachar',      name: 'Malachar',      role: 'Necromancer Trainer', icon: '💀', unlockLevel: 50  },
    shaman:      { npcId: 'nara',          name: 'Nara',          role: 'Shaman Trainer',      icon: '🌿', unlockLevel: 70  },
    berserker:   { npcId: 'ragnar',        name: 'Ragnar',        role: 'Berserker Trainer',   icon: '🪓', unlockLevel: 90  },
  }

  const playerClass = state.class?.toLowerCase()
  const trainer = CLASS_TRAINERS[playerClass]

  container.innerHTML = ''

  // Your class trainer
  if (trainer) {
    const btn = document.createElement('button')
    btn.className = 'choice-btn'
    btn.innerHTML = `${trainer.icon} ${trainer.name} — ${trainer.role}`
    btn.onclick = () => openNPCPanel(trainer.npcId)
    container.appendChild(btn)
  } else {
    const msg = document.createElement('p')
    msg.style.cssText = 'color:var(--text-dim);font-style:italic;font-size:.85em;padding:8px 0;'
    msg.textContent = 'Choose a class first to find your trainer.'
    container.appendChild(msg)
  }

  // Ragnar always visible
  const ragnarBtn = document.createElement('button')
  ragnarBtn.className = 'choice-btn'
  ragnarBtn.innerHTML = `🪓 Ragnar — Berserker Trainer <span style="font-size:.75em;color:var(--text-dim);">(Lv 90+ Berserker)</span>`
  ragnarBtn.onclick = () => openNPCPanel('ragnar')
  if (playerClass === 'berserker') ragnarBtn.style.display = 'none' // already shown above
  container.appendChild(ragnarBtn)
}

// ============================================================
// MERCHANT TAB SWITCHER
// ============================================================
function switchMerchantTab(tab, btn) {
  document.querySelectorAll('[id^="merchant-panel-"]').forEach(p => p.style.display = 'none')
  document.querySelectorAll('#merchant-tabs .town-tab').forEach(b => b.classList.remove('active'))

  const panel = document.getElementById(`merchant-panel-${tab}`)
  if (panel) panel.style.display = 'block'
  if (btn) btn.classList.add('active')

  if (tab === 'inventory') {
    renderInventory()
    updateInventorySlotIndicator()
  }
  if (tab === 'shop')      renderShop()
  if (tab === 'craft')     renderCrafting()
  if (tab === 'auction')   fetchAuctions('auction')
  if (tab === 'blackwing') fetchAuctions('blackwing')
}


// ============================================================
// BLACK WING VISIBILITY
// ============================================================
function updateBlackWingVisibility() {
  const btn = document.getElementById('blackwing-btn')
  if (!btn) return
  const rank = state.reputationTitle || 'citizen'
  const ranksWithAccess = ['baron', 'chief', 'mayor', 'viscount', 'count']
  btn.style.display = ranksWithAccess.includes(rank) ? 'flex' : 'none'
}

// ============================================================
// INN from Merchant Hall
// ============================================================
function openInn() {
  const innCost = GAME_CONFIG.inn_cost || 0
  if (state.gold >= innCost) {
    addGold(-innCost)
    const hh = Math.floor(state.maxHp * 0.5)
    const mh = Math.floor(state.maxMp * 0.5)
    state.hp = Math.min(state.maxHp, state.hp + hh)
    state.mp = Math.min(state.maxMp, state.mp + mh)
    addLog(`Rested at the Inn: +${formatNumber(hh)} HP, +${formatNumber(mh)} MP. Cost ${formatNumber(innCost)}g.`, 'good')
    notify(`⛪ Rested! +${formatNumber(hh)} HP +${formatNumber(mh)} MP`, 'var(--green)')
  } else {
    notify(`⛪ Need ${formatNumber(innCost)}g to rest!`, 'var(--red)')
  }
  updateUI()
  savePlayerToSupabase()
}

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
// BUG FIXES:
// #2  — reputation boost now runs AFTER stats are calculated (not before)
// #3  — removed duplicate attackSpeed/castSpeed/attackInterval/cdr block;
//        GAME_CONFIG.combat_speed values are now actually used
// #12 — lifeSteal operator precedence fixed
// #15 — maxHpMult and equipMaxHpMult are now applied in the maxHp formula
function calcStats(){
  // ── Gold multiplier expiry check ──
  if(state.goldMultExpiry&&new Date()>new Date(state.goldMultExpiry)){
    state.goldMult=1.0;state.goldMultExpiry=null;
  }

  // ── Sanitize base stats ──
  const baseStr=Math.max(0,Number(state.baseStr)||1);
  const baseAgi=Math.max(0,Number(state.baseAgi)||1);
  const baseInt=Math.max(0,Number(state.baseInt)||1);
  const baseSta=Math.max(0,Number(state.baseSta)||1);

  // ── Aggregate multipliers ──
  const strMult  = (state.strMult||1)  + (state.classBonuses.strMult||0)  + (state.talentBonuses.strMult||0)  + (state.equipStrMult||0)  + (state.combatBuffStr||0);
  const agiMult     = (state.agiMult||1)     + (state.classBonuses.agiMult||0)         + (state.talentBonuses.agiMult||0)         + (state.equipAgiMult||0);
  const intMult     = (state.intMult||1)     + (state.classBonuses.intMult||0)         + (state.talentBonuses.intMult||0)         + (state.equipIntMult||0);
  const staMult     = (state.staMult||1)     + (state.classBonuses.staMult||0)         + (state.talentBonuses.staMult||0)         + (state.equipStaMult||0);
  const atkpMult = (state.attackPowerMult||1) + (state.classBonuses.attackPowerMult||0) + (state.talentBonuses.attackPowerMult||0) + (state.equipAttackPowerMult||0) + (state.combatBuffAtkp||0);
  const armorMult = (state.armorMult||1) + (state.classBonuses.armorMult||0) + (state.talentBonuses.armorMult||0) + (state.equipArmorMult||0) + (state.combatBuffArmor||0);
  const maxHpMult   = (state.maxHpMult||1)   + (state.classBonuses.maxHpMult||0)       + (state.talentBonuses.maxHpMult||0)       + (state.equipMaxHpMult||0);
  const critMult    = (state.critMult||1)    + (state.classBonuses.critMult||0)        + (state.talentBonuses.critMult||0);
  const dodgeMult   = (state.dodgeMult||1)   + (state.classBonuses.dodgeMult||0)       + (state.talentBonuses.dodgeMult||0)       + (state.equipDodgeMult||0);
  const hitMult  = (state.hitMult||1)  + (state.classBonuses.hitMult||0)  + (state.talentBonuses.hitMult||0)  + (state.equipHitMult||0)  + (state.combatBuffHit||0);
  const mpMult      = (state.mpMult||1)      + (state.classBonuses.mpMult||0)          + (state.talentBonuses.mpMult||0)          + (state.equipMpMult||0);
  const hpRegenMult = (state.hpRegenMult||1) + (state.classBonuses.hpRegenMult||0)     + (state.talentBonuses.hpRegenMult||0)     + (state.equipHpRegenMult||0);
  const mpRegenMult = (state.mpRegenMult||1) + (state.classBonuses.mpRegenMult||0)     + (state.talentBonuses.mpRegenMult||0)     + (state.equipMpRegenMult||0);

  // ── Primary stats (local variables — no state mutation yet) ──
const str  = Math.floor((baseStr  + (state.equipStr||0) + (state.talentBonuses.baseStr||0))  * strMult);
const agi  = Math.floor((baseAgi  + (state.equipAgi||0) + (state.talentBonuses.baseAgi||0))  * agiMult);
const int_ = Math.floor((baseInt  + (state.equipInt||0) + (state.talentBonuses.baseInt||0))  * intMult);
const sta  = Math.floor((baseSta  + (state.equipSta||0) + (state.talentBonuses.baseSta||0))  * staMult);

  // ── Derived stats (all local) ──
  const attackPower = Math.floor(
    (str*4 + int_*3 + state.level*15) * atkpMult
  ) + (state.equipAttackPower||0) + (state.talentBonuses.baseAttackPower||0);

  const maxHp = Math.floor(
    (100 + str*20 + sta*30 + state.level*80) * maxHpMult
  ) + (state.equipMaxHp||0);

  const armor = Math.floor(
    (agi*8 + (state.baseArmor||0) + state.level*10 + (state.talentBonuses.baseArmor||0)) * armorMult
  ) + (state.equipArmor||0);

  const crit      = Math.floor((agi*0.0005 + (state.baseCrit||0))  * critMult)  + (state.equipCrit||0)  + (state.talentBonuses.baseCrit||0);
  const dodge     = Math.floor((agi*1.9    + (state.baseDodge||0)) * dodgeMult) + (state.equipDodge||0) + (state.talentBonuses.baseDodge||0);
  const hit       = Math.floor((agi*5.3    + (state.baseHit||0))   * hitMult)   + (state.equipHit||0)   + (state.talentBonuses.baseHit||0);
  const maxMp     = Math.floor((50 + int_*3) * mpMult) + (state.equipMaxMp||0);
  const manaRegen = Math.floor((0.5 + int_*1.5) * mpRegenMult) + (state.equipMpRegen||0);
  const hpRegen   = Math.floor((sta*0.5 + (state.baseHpRegen||0) + (state.talentBonuses.baseHpRegen||0)) * hpRegenMult) + (state.equipHpRegen||0);
  const lifeSteal = ((state.baseLifeSteal||0) + (state.talentBonuses.baseLifeSteal||0)) + (state.equipLifeSteal||0);

  // ── Speed stats ──
  const speedCfg      = GAME_CONFIG.combat_speed||{};
  const atkSpdPerAgi  = speedCfg.attack_speed_per_agi   || 0.5;
  const castSpdPerInt = speedCfg.cast_speed_per_int     || 0.3;
  const minInterval   = speedCfg.min_attack_interval_ms || 400;
  const maxInterval   = speedCfg.max_attack_interval_ms || 2000;
  const maxAtkSpd     = speedCfg.max_attack_speed       || 800;
  const maxCastSpd    = speedCfg.max_cast_speed         || 100;
  const maxCdr        = speedCfg.max_cdr                || 0.50;

  const attackSpeed    = Math.min(maxAtkSpd,  Math.floor(agi*atkSpdPerAgi));
  const castSpeed      = Math.min(maxCastSpd, Math.floor(int_*castSpdPerInt));
  const attackInterval = Math.max(minInterval, maxInterval-(attackSpeed*2));
  const cdr            = Math.min(maxCdr, castSpeed/200);

  // ── Reputation boost (applied to local vars, not state) ──
  const repTitle = getCurrentTitle();
  const repBoost = repTitle ? (1+repTitle.boost) : 1;

  // ── Write to state ONCE at the end ──
  state.str          = str;
  state.agi          = agi;
  state.int          = int_;
  state.sta          = sta;
  state.attackPower  = Math.floor(attackPower * repBoost);
  state.maxHp        = Math.floor(maxHp       * repBoost);
  state.armor        = Math.floor(armor       * repBoost);
  state.crit         = crit;
  state.dodge        = dodge;
  state.hit          = hit;
  state.maxMp        = maxMp;
  state.manaRegen    = manaRegen;
  state.hpRegen      = hpRegen;
  state.lifeSteal    = lifeSteal;
  state.attackSpeed  = attackSpeed;
  state.castSpeed    = castSpeed;
  state.attackInterval = attackInterval;
  state.cdr          = cdr;

  // ── Talent modifiers ──
  state.magicPen           = (CLASSES[state.class]?.bonuses?.magicPen||0) + (state.talentBonuses.magicPen||0);
  state.spellPowerMult     = state.talentBonuses.spellPowerMult||0;
  state.healPowerMult      = state.talentBonuses.healPowerMult||0;
  state.dmgReduction       = state.talentBonuses.dmgReduction||0;
  state.dmgReflect         = state.talentBonuses.dmgReflect||0;
  state.chainLightningChance = state.talentBonuses.chainChance||0;

  // ── Clamp HP/MP ──
  if(state.hp>state.maxHp) state.hp=state.maxHp;
  if(state.mp>state.maxMp) state.mp=state.maxMp;
}

function reapplyClassBonuses() {
  if (!state.class || !CLASSES[state.class]) return;
  const bonuses = CLASSES[state.class].bonuses;
  // Reset first — prevent double-stacking on re-sync
  state.classBonuses = {
    strMult:0, agiMult:0, intMult:0, staMult:0,
    hitMult:0, critMult:0, dodgeMult:0, hpRegenMult:0,
    mpRegenMult:0, armorMult:0, mpMult:0, lifeStealMult:0,
    attackPowerMult:0, maxHpMult:0,
  };
  Object.entries(bonuses).forEach(([k, v]) => {
    if (state.classBonuses.hasOwnProperty(k)) {
      state.classBonuses[k] = v;
    }
  });
}

function reapplyTalentBonuses() {
  if (!state.class || !CLASSES[state.class]) return;
  // Reset
  state.talentBonuses = {
    strMult:0, agiMult:0, intMult:0, staMult:0,
    hitMult:0, critMult:0, dodgeMult:0, hpRegenMult:0,
    mpRegenMult:0, armorMult:0, mpMult:0, lifeStealMult:0,
    attackPowerMult:0, maxHpMult:0,
  };
  const unlockedTalents = state.unlockedTalents || [];
  if (!unlockedTalents.length) return;

  // Walk all talent trees and fire effect() for each unlocked rank
  const trees = CLASSES[state.class].trees;
  Object.values(trees).forEach(tree => {
    tree.talents.forEach(talent => {
      const ranks = unlockedTalents.filter(id => id === talent.id).length;
      if (!ranks) return;
      for (let i = 0; i < ranks; i++) {
        if (typeof talent.effect === 'function') talent.effect();
      }
    });
  });
}

function reapplyEquipBonuses() {
  // Reset all equip bonus state
  state.equipStr             = 0;
  state.equipStrMult         = 0;
  state.equipAgi             = 0;
  state.equipAgiMult         = 0;
  state.equipInt             = 0;
  state.equipIntMult         = 0;
  state.equipSta             = 0;
  state.equipStaMult         = 0;
  state.equipMaxHp           = 0;
  state.equipMaxHpMult       = 0;
  state.equipMaxMp           = 0;
  state.equipMaxMpMult       = 0;
  state.equipArmor           = 0;
  state.equipArmorMult       = 0;
  state.equipCrit            = 0;
  state.equipDodge           = 0;
  state.equipDodgeMult       = 0;
  state.equipLifeSteal       = 0;
  state.equipLifeStealMult   = 1.0;
  state.equipAttackPower     = 0;
  state.equipAttackPowerMult = 0;
  state.equipHpRegen         = 0;
  state.equipHpRegenMult     = 0;
  state.equipMpRegen         = 0;
  state.equipMpRegenMult     = 0;
  state.equipHit             = 0;
  state.equipHitMult         = 0;

  // Walk equipped slots and accumulate bonuses
  const equipped = state.equipped || {};
  Object.values(equipped).forEach(item => {
    if (!item || !item.stats) return;
    const s = item.stats;
    const enh = item.enh_level ?? item.enhLevel ?? 0;

    // Enhancement multiplier — each +1 adds 8% to all stats on item
    const enhMult = 1 + (enh * 0.08);

    state.equipStr             += Math.floor((s.str          || 0) * enhMult);
    state.equipStrMult         += (s.strMult         || 0);
    state.equipAgi             += Math.floor((s.agi          || 0) * enhMult);
    state.equipAgiMult         += (s.agiMult         || 0);
    state.equipInt             += Math.floor((s.int          || 0) * enhMult);
    state.equipIntMult         += (s.intMult         || 0);
    state.equipSta             += Math.floor((s.sta          || 0) * enhMult);
    state.equipStaMult         += (s.staMult         || 0);
    state.equipMaxHp           += Math.floor((s.maxHp        || 0) * enhMult);
    state.equipMaxHpMult       += (s.maxHpMult       || 0);
    state.equipMaxMp           += Math.floor((s.maxMp        || 0) * enhMult);
    state.equipMaxMpMult       += (s.maxMpMult       || 0);
    state.equipArmor           += Math.floor((s.armor        || 0) * enhMult);
    state.equipArmorMult       += (s.armorMult       || 0);
    state.equipCrit            += (s.crit            || 0);
    state.equipDodge           += Math.floor((s.dodge        || 0) * enhMult);
    state.equipDodgeMult       += (s.dodgeMult       || 0);
    state.equipLifeSteal       += (s.lifeSteal       || 0);
    state.equipLifeStealMult   += (s.lifeStealMult   || 0);
    state.equipAttackPower     += Math.floor((s.attackPower  || 0) * enhMult);
    state.equipAttackPowerMult += (s.attackPowerMult || 0);
    state.equipHpRegen         += Math.floor((s.hpRegen      || 0) * enhMult);
    state.equipHpRegenMult     += (s.hpRegenMult     || 0);
    state.equipMpRegen         += Math.floor((s.mpRegen      || 0) * enhMult);
    state.equipMpRegenMult     += (s.mpRegenMult     || 0);
    state.equipHit             += Math.floor((s.hit          || 0) * enhMult);
    state.equipHitMult         += (s.hitMult         || 0);
  });
}


// ── CLASSES ──
const CLASSES={
  warrior:{name:'Warrior',icon:'⚔️',desc:'A mighty melee fighter. +10% STR bonus.',
    bonuses:{strMult:0.10,staMult:0.10},skills:['power_strike','battle_cry','last_stand'],
    trees:{
      dps:{name:'🗡️ DPS',talents:[
        {id:'berserker',name:'Berserker Rage',desc:'10% CRIT per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+1;}},
        {id:'cleave',name:'Brute Force',desc:'20% CRIT per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+2;}},
        {id:'execute',name:'Killing Blow',desc:'30% CRIT per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+3;}},
      ]},
      tank:{name:'🛡️ Tank',talents:[
        {id:'iron_skin',name:'Iron Skin',desc:'10% ARMOR per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.1;}},
        {id:'fortress',name:'Iron Fortress',desc:'20% ARMOR per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.2;}},
        {id:'shield_wall',name:'Hardened Skin',desc:'30% ARMOR per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.3;}},
      ]},
      heal:{name:'💚 Self Heal',talents:[
        {id:'second_wind',name:'Tough Body',desc:'10% HP regen per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.hpRegenMult=(state.talentBonuses.hpRegenMult||0)+0.1;}},
        {id:'undying',name:'Endurance',desc:'20% HP regen per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.hpRegenMult=(state.talentBonuses.hpRegenMult||0)+0.2;}},
        {id:'regeneration',name:'Vitality',desc:'30% HP regen per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.hpRegenMult=(state.talentBonuses.hpRegenMult||0)+0.3;}},
      ]}
    }
  },
  mage:{name:'Mage',icon:'🔮',desc:'A powerful spellcaster. +10% INT bonus.',
    bonuses:{intMult:0.10,mpMult:0.05},skills:['fireball','ice_lance','mana_shield'],
    trees:{
      fire:{name:'🔥 Fire',talents:[
        {id:'fire_mastery',name:'Fire Mastery',desc:'1% CRIT per rank',cost:10,ranks:5,effect:()=>{state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+1;}},
        {id:'ignite',name:'Burning Mind',desc:'2% CRIT per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+2;}},
        {id:'meteor',name:'Arcane Intellect',desc:'3% CRIT per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+3;}},
      ]},
      ice:{name:'❄️ Ice',talents:[
        {id:'frost',name:'Frost Barrier',desc:'1% AR per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.1;}},
        {id:'ice_armor',name:'Ice Armor',desc:'2% DODGE per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.2;}},
        {id:'blizzard',name:'Ice Mind',desc:'3% DODGE per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.3;}},
      ]},
      arcane:{name:'✨ Arcane',talents:[
        {id:'mana_regen',name:'Mana Pool',desc:'1% MP regen per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.mpRegenMult=(state.talentBonuses.mpRegenMult||0)+0.1;}},
        {id:'spell_power',name:'Spellcraft',desc:'2% MP regen per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.mpRegenMult=(state.talentBonuses.mpRegenMult||0)+0.2;}},
        {id:'arcane_surge',name:'Arcane Mastery',desc:'3% MP regen per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.mpRegenMult=(state.talentBonuses.mpRegenMult||0)+0.3;}},
      ]}
    }
  },
  rogue:{name:'Rogue',icon:'🗡️',desc:'A cunning assassin. +20% AGI',
    bonuses:{agiMult:0.2,goldMult:1.0},skills:['backstab','poison_blade','shadow_step'],
    trees:{
      assassination:{name:'☠️ Assassin',talents:[
        {id:'crit',name:'Precision',desc:'1% CRIT per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+1;}},
        {id:'ambush',name:'Swift Strike',desc:'2% CRIT per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+2;}},
        {id:'death_mark',name:'Lethal Focus',desc:'3% CRIT per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+3;}},
      ]},
      subtlety:{name:'🌑 Subtlety',talents:[
        {id:'evasion',name:'Agility',desc:'1% DODGE per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.dodgeMult=(state.talentBonuses.dodgeMult||0)+0.1;}},
        {id:'smoke_bomb',name:'Nimble Feet',desc:'2% DODGE per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.dodgeMult=(state.talentBonuses.dodgeMult||0)+0.2;}},
        {id:'vanish',name:'Shadow Reflex',desc:'3% DODGE per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.dodgeMult=(state.talentBonuses.dodgeMult||0)+0.3;}},
      ]},
      poison:{name:'🐍 Poison',talents:[
        {id:'venom',name:'Toxic Edge',desc:'1% HP regen per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.mpRegenMult=(state.talentBonuses.mpRegenMult||0)+0.1;}},
        {id:'cripple',name:'Predator',desc:'2% HP regen per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.mpRegenMult=(state.talentBonuses.mpRegenMult||0)+0.2;}},
        {id:'plague',name:'Virulence',desc:'3% HP regen per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.hpRegenMult=(state.talentBonuses.hpRegenMult||0)+0.3;}},
      ]}
      
    }
    
  },
  hunter:{
  name:'Hunter',icon:'🏹',desc:'A deadly ranged predator. +20% AGI, high bleed chance.',
  levelReq:20,
  bonuses:{agiMult:0.20,hitMult:0.10},
  skills:['precise_shot','bleed_arrow','shadow_trap'],
  trees:{
    marksmanship:{name:'🎯 Marks',talents:[
      {id:'eagle_eye',name:'Eagle Eye',desc:'10% HIT per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.hitMult=(state.talentBonuses.hitMult||0)+0.1;}},
      {id:'headshot',name:'Headshot',desc:'20% CRIT per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+2;}},
      {id:'lethal_aim',name:'Lethal Aim',desc:'30% CRIT per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+3;}},
    ]},
    survival:{name:'🌿 Survival',talents:[
      {id:'camouflage',name:'Camouflage',desc:'10% DODGE per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.dodgeMult=(state.talentBonuses.dodgeMult||0)+0.1;}},
      {id:'evasive',name:'Evasive Instinct',desc:'20% DODGE per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.dodgeMult=(state.talentBonuses.dodgeMult||0)+0.2;}},
      {id:'ghost_step',name:'Ghost Step',desc:'30% DODGE per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.dodgeMult=(state.talentBonuses.dodgeMult||0)+0.3;}},
    ]},
    beastmastery:{name:'🐾 Beast',talents:[
      {id:'feral_bond',name:'Feral Bond',desc:'10% ATK per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.attackPowerMult=(state.talentBonuses.attackPowerMult||0)+0.1;}},
      {id:'pack_hunter',name:'Pack Hunter',desc:'20% ATK per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.attackPowerMult=(state.talentBonuses.attackPowerMult||0)+0.2;}},
      {id:'apex_predator',name:'Apex Predator',desc:'30% ATK per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.attackPowerMult=(state.talentBonuses.attackPowerMult||0)+0.3;}},
    ]}
  }
},

paladin:{
  name:'Paladin',icon:'🛡️',desc:'A holy warrior. +15% STR, +15% STA, heals on every hit.',
  levelReq:20,
  bonuses:{strMult:0.15,staMult:0.15},
  skills:['holy_strike','divine_shield','consecration'],
  trees:{
    holy:{name:'✨ Holy',talents:[
      {id:'holy_light',name:'Holy Light',desc:'10% HP REGEN per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.hpRegenMult=(state.talentBonuses.hpRegenMult||0)+0.1;}},
      {id:'blessed_armor',name:'Blessed Armor',desc:'20% ARMOR per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.2;}},
      {id:'divine_grace',name:'Divine Grace',desc:'30% HP REGEN per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.hpRegenMult=(state.talentBonuses.hpRegenMult||0)+0.3;}},
    ]},
    protection:{name:'🛡️ Protection',talents:[
      {id:'holy_armor',name:'Holy Armor',desc:'10% ARMOR per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.1;}},
      {id:'bulwark',name:'Bulwark',desc:'20% ARMOR per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.2;}},
      {id:'immovable',name:'Immovable',desc:'30% ARMOR per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.3;}},
    ]},
    retribution:{name:'⚡ Retribution',talents:[
      {id:'righteous_fury',name:'Righteous Fury',desc:'10% STR per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.strMult=(state.talentBonuses.strMult||0)+0.1;}},
      {id:'holy_wrath',name:'Holy Wrath',desc:'20% STR per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.strMult=(state.talentBonuses.strMult||0)+0.2;}},
      {id:'crusader',name:'Crusader',desc:'30% STR per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.strMult=(state.talentBonuses.strMult||0)+0.3;}},
    ]}
  }
},

necromancer:{
  name:'Necromancer',icon:'💀',desc:'Master of death magic. +20% INT, lifedrain on every spell.',
  levelReq:40,
  bonuses:{intMult:0.20,mpMult:0.10},
  skills:['death_bolt','soul_drain','plague_nova'],
  trees:{
    death:{name:'💀 Death',talents:[
      {id:'death_mastery',name:'Death Mastery',desc:'10% INT per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.intMult=(state.talentBonuses.intMult||0)+0.1;}},
      {id:'dark_pact',name:'Dark Pact',desc:'20% INT per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.intMult=(state.talentBonuses.intMult||0)+0.2;}},
      {id:'lich_form',name:'Lich Form',desc:'30% INT per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.intMult=(state.talentBonuses.intMult||0)+0.3;}},
    ]},
    drain:{name:'🩸 Drain',talents:[
      {id:'life_tap',name:'Life Tap',desc:'10% LIFESTEAL per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.baseLifeSteal=(state.talentBonuses.baseLifeSteal||0)+0.01;}},
      {id:'soul_siphon',name:'Soul Siphon',desc:'20% LIFESTEAL per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.baseLifeSteal=(state.talentBonuses.baseLifeSteal||0)+0.02;}},
      {id:'death_coil',name:'Death Coil',desc:'30% LIFESTEAL per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.baseLifeSteal=(state.talentBonuses.baseLifeSteal||0)+0.03;}},
    ]},
    undead:{name:'🦴 Undead',talents:[
      {id:'undead_resilience',name:'Undead Resilience',desc:'10% HP REGEN per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.hpRegenMult=(state.talentBonuses.hpRegenMult||0)+0.1;}},
      {id:'bone_shield',name:'Bone Shield',desc:'20% ARMOR per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.2;}},
      {id:'immortal_curse',name:'Immortal Curse',desc:'30% HP REGEN per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.hpRegenMult=(state.talentBonuses.hpRegenMult||0)+0.3;}},
    ]}
  }
},

shaman:{
  name:'Shaman',icon:'⚡',desc:'Elemental warrior. +10% STR, +10% INT, elemental burst damage.',
  levelReq:40,
  bonuses:{strMult:0.10,intMult:0.10},
  skills:['lightning_bolt','earth_totem','wind_burst'],
  trees:{
    lightning:{name:'⚡ Lightning',talents:[
      {id:'storm_caller',name:'Storm Caller',desc:'10% CRIT per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.critMult=(state.talentBonuses.critMult||0)+0.1;}},
      {id:'chain_lightning',name:'Chain Lightning',desc:'20% CRIT per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.critMult=(state.talentBonuses.critMult||0)+0.2;}},
      {id:'thunder_god',name:'Thunder God',desc:'30% CRIT per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.critMult=(state.talentBonuses.critMult||0)+0.3;}},
    ]},
    earth:{name:'🪨 Earth',talents:[
      {id:'stone_skin',name:'Stone Skin',desc:'10% ARMOR per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.1;}},
      {id:'granite_will',name:'Granite Will',desc:'20% ARMOR per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.2;}},
      {id:'mountain_form',name:'Mountain Form',desc:'30% ARMOR per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.3;}},
    ]},
    wind:{name:'🌪️ Wind',talents:[
      {id:'swift_winds',name:'Swift Winds',desc:'10% AGI per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.agiMult=(state.talentBonuses.agiMult||0)+0.1;}},
      {id:'gale_force',name:'Gale Force',desc:'20% AGI per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.agiMult=(state.talentBonuses.agiMult||0)+0.2;}},
      {id:'cyclone',name:'Cyclone',desc:'30% DODGE per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.dodgeMult=(state.talentBonuses.dodgeMult||0)+0.3;}},
    ]}
  }
},

berserker:{
  name:'Berserker',icon:'🐉',desc:'Pure rage fighter. +25% STR, damage multiplies as HP drops.',
  levelReq:40,
  bonuses:{strMult:0.25,attackPowerMult:0.10},
  skills:['reckless_strike','blood_rage','death_wish'],
  trees:{
    rage:{name:'🔥 Rage',talents:[
      {id:'battle_hunger',name:'Battle Hunger',desc:'10% STR per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.strMult=(state.talentBonuses.strMult||0)+0.1;}},
      {id:'war_cry',name:'War Cry',desc:'20% STR per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.strMult=(state.talentBonuses.strMult||0)+0.2;}},
      {id:'primal_fury',name:'Primal Fury',desc:'30% STR per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.strMult=(state.talentBonuses.strMult||0)+0.3;}},
    ]},
    bloodlust:{name:'🩸 Bloodlust',talents:[
      {id:'bloodthirst',name:'Bloodthirst',desc:'10% LIFESTEAL per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.baseLifeSteal=(state.talentBonuses.baseLifeSteal||0)+0.01;}},
      {id:'savage_wounds',name:'Savage Wounds',desc:'20% LIFESTEAL per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.baseLifeSteal=(state.talentBonuses.baseLifeSteal||0)+0.02;}},
      {id:'blood_frenzy',name:'Blood Frenzy',desc:'30% ATK per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.attackPowerMult=(state.talentBonuses.attackPowerMult||0)+0.3;}},
    ]},
    endurance:{name:'💪 Endurance',talents:[
      {id:'thick_skin',name:'Thick Skin',desc:'10% ARMOR per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.armorMult=(state.talentBonuses.armorMult||0)+0.1;}},
      {id:'iron_will',name:'Iron Will',desc:'20% HP REGEN per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.hpRegenMult=(state.talentBonuses.hpRegenMult||0)+0.2;}},
      {id:'unkillable',name:'Unkillable',desc:'30% HP REGEN per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.hpRegenMult=(state.talentBonuses.hpRegenMult||0)+0.3;}},
    ]}
  }
}
  
};

// ── SKILLS ──
const SKILLS={
  power_strike:{name:'Power Strike',icon:'💥',mp:()=>Math.floor(state.maxMp*0.10),cd:4,use:(e)=>{
    const d=Math.floor(state.attackPower*2.2);e.hp-=d;addCombatLog(`💥 Power Strike! ${d} dmg!`,'good');playSound('snd-attack');animateAttack(true,d,false);return d;}},

  battle_cry:{name:'Battle Cry',icon:'📯',mp:()=>Math.floor(state.maxMp*0.15),cd:10,use:(e)=>{
  if(state.battleCryActive){addCombatLog(`📯 Battle Cry already active!`,'info');return 0;}
  state.battleCryActive=true;
  state.combatBuffStr=(state.combatBuffStr||0)+1.5;      // +150% STR
  state.combatBuffAtkp=(state.combatBuffAtkp||0)+1.4;    // +140% ATK
  state.combatBuffHit=(state.combatBuffHit||0)+0.5;      // +50% HIT
  addCombatLog(`📯 Battle Cry! +150% STR, +140% ATK POWER!`,'good');
  playSound('snd-magic');calcStats();return 0;}},

  last_stand:{name:'Last Stand',icon:'🛡️',mp:()=>Math.floor(state.maxMp*0.20),cd:6,use:(e)=>{
    const h=Math.floor(state.maxHp*0.15);state.hp=Math.min(state.maxHp,state.hp+h);
    addCombatLog(`🛡️ Last Stand! +${h} HP!`,'good');playSound('snd-heal');spawnDmgFloat(`+${h}HP`,false,'heal-float');calcStats();return 0;}},

  fireball:{name:'Fireball',icon:'🔥',mp:()=>Math.floor(state.maxMp*0.12),cd:4,use:(e)=>{
    const d=Math.floor(state.int*6+Math.random()*state.int*2);e.hp-=d;addCombatLog(`🔥 Fireball! ${d} dmg!`,'good');playSound('snd-magic');animateAttack(true,d,false);return d;}},

  ice_lance:{name:'Ice Lance',icon:'❄️',mp:()=>Math.floor(state.maxMp*0.10),cd:6,use:(e)=>{
    const d=Math.floor(state.int*4.5);e.hp-=d;e.frozen=true;
    addCombatLog(`❄️ Ice Lance! ${d} dmg — Frozen!`,'info');playSound('snd-magic');animateAttack(true,d,false);return d;}},

  mana_shield:{name:'Mana Shield',icon:'🔮',mp:()=>Math.floor(state.maxMp*0.25),cd:10,use:(e)=>{
    state.manaShield=true;state.manaShieldAbsorb = Math.floor(state.maxMp * 1.5); // absorb pool based on MP
  addCombatLog(`🔮 Mana Shield active! Absorbs ${state.manaShieldAbsorb}!`, 'info');console.log(state.manaShieldAbsorb)
  playSound('snd-heal');
  return 0;}},
    
  backstab:{name:'Backstab',icon:'🗡️',mp:()=>Math.floor(state.maxMp*0.08),cd:4,use:(e)=>{
    const d=Math.floor(state.attackPower*1.5+state.agi*3);e.hp-=d;addCombatLog(`🗡️ Backstab! ${d} dmg!`,'good');playSound('snd-attack');animateAttack(true,d,false);return d;}},
  poison_blade:{name:'Poison Blade',icon:'🐍',mp:()=>Math.floor(state.maxMp*0.12),cd:5,use:(e)=>{
    const stacks=5,tick=Math.floor(state.agi*1.8+state.attackPower*1.3);
    e.poisoned=(e.poisoned||0)+stacks;e.poisonDmg=tick;
    addCombatLog(`🐍 Poisoned! ${tick} dmg/tick for ${stacks} turns!`,'good');playSound('snd-magic');return 0;}},
  shadow_step:{name:'Shadow Step',icon:'🌑',mp:()=>Math.floor(state.maxMp*0.15),cd:10,use:(e)=>{
    const d=Math.floor(state.attackPower*2.0+state.agi*4);e.hp-=d;addCombatLog(`🌑 Shadow Step! ${d} dmg!`,'purple');playSound('snd-magic');animateAttack(true,d,false);return d;}},
    // 🏹 HUNTER SKILLS
precise_shot:{name:'Precise Shot',icon:'🎯',mp:()=>Math.floor(state.maxMp*0.10),cd:4,use:(e)=>{
  const d=Math.floor(state.attackPower*2.0+state.agi*4);e.hp-=d;
  addCombatLog(`🎯 Precise Shot! ${d} dmg!`,'good');playSound('snd-attack');animateAttack(true,d,false);return d;}},

bleed_arrow:{name:'Bleed Arrow',icon:'🏹',mp:()=>Math.floor(state.maxMp*0.12),cd:6,use:(e)=>{
  const stacks=4,tick=Math.floor(state.agi*2.0+state.attackPower*1.0);
  e.poisoned=(e.poisoned||0)+stacks;e.poisonDmg=tick;
  addCombatLog(`🏹 Bleed! ${tick} dmg/tick for ${stacks} turns!`,'good');playSound('snd-attack');return 0;}},

shadow_trap:{name:'Shadow Trap',icon:'🪤',mp:()=>Math.floor(state.maxMp*0.15),cd:10,use:(e)=>{
  e.frozen=true;const d=Math.floor(state.agi*3.0+state.attackPower*1.5);e.hp-=d;
  addCombatLog(`🪤 Shadow Trap! ${d} dmg + Frozen!`,'good');playSound('snd-magic');animateAttack(true,d,false);return d;}},

// 🛡️ PALADIN SKILLS
holy_strike:{name:'Holy Strike',icon:'✨',mp:()=>Math.floor(state.maxMp*0.10),cd:4,use:(e)=>{
  const d=Math.floor(state.attackPower*2.0+state.str*3);e.hp-=d;
  const heal=Math.floor(d*0.15);state.hp=Math.min(state.maxHp,state.hp+heal);
  addCombatLog(`✨ Holy Strike! ${d} dmg, healed ${heal} HP!`,'good');
  playSound('snd-attack');animateAttack(true,d,false);spawnDmgFloat(`+${heal}`,false,'heal-float');return d;}},

divine_shield:{name:'Divine Shield',icon:'🛡️',mp:()=>Math.floor(state.maxMp*0.20),cd:6,use:(e)=>{
  state.manaShield=true;
  const healAmt=Math.floor(state.maxHp*0.25);state.hp=Math.min(state.maxHp,state.hp+healAmt);
  addCombatLog(`🛡️ Divine Shield! +${healAmt} HP + absorb!`,'good');
  playSound('snd-heal');spawnDmgFloat(`+${healAmt}`,false,'heal-float');return 0;}},

consecration:{name:'Consecration',icon:'🌟',mp:()=>Math.floor(state.maxMp*0.15),cd:10,use:(e)=>{
  const d=Math.floor(state.str*4+state.int*3);e.hp-=d;
  e.poisoned=(e.poisoned||0)+3;e.poisonDmg=Math.floor(d*0.2);
  addCombatLog(`🌟 Consecration! ${d} dmg + holy burn!`,'good');
  playSound('snd-magic');animateAttack(true,d,false);return d;}},

// 💀 NECROMANCER SKILLS
death_bolt:{name:'Death Bolt',icon:'💀',mp:()=>Math.floor(state.maxMp*0.12),cd:4,use:(e)=>{
  const d=Math.floor(state.int*7+Math.random()*state.int*2);e.hp-=d;
  const drain=Math.floor(d*0.20);state.hp=Math.min(state.maxHp,state.hp+drain);
  addCombatLog(`💀 Death Bolt! ${d} dmg, drained ${drain} HP!`,'good');
  playSound('snd-magic');animateAttack(true,d,false);spawnDmgFloat(`+${drain}`,false,'heal-float');return d;}},

soul_drain:{name:'Soul Drain',icon:'🌑',mp:()=>Math.floor(state.maxMp*0.15),cd:6,use:(e)=>{
  const d=Math.floor(state.int*5);e.hp-=d;
  const drain=Math.floor(d*0.35);state.hp=Math.min(state.maxHp,state.hp+drain);
  state.mp=Math.min(state.maxMp,state.mp+Math.floor(state.maxMp*0.10));
  addCombatLog(`🌑 Soul Drain! ${d} dmg, +${drain} HP, +MP!`,'good');
  playSound('snd-magic');animateAttack(true,d,false);return d;}},

plague_nova:{name:'Plague Nova',icon:'☠️',mp:()=>Math.floor(state.maxMp*0.20),cd:10,use:(e)=>{
  const stacks=6,tick=Math.floor(state.int*2.5);
  e.poisoned=(e.poisoned||0)+stacks;e.poisonDmg=tick;
  const d=Math.floor(state.int*3);e.hp-=d;
  addCombatLog(`☠️ Plague Nova! ${d} + ${tick} dmg/tick x${stacks}!`,'good');
  playSound('snd-magic');animateAttack(true,d,false);return d;}},

// ⚡ SHAMAN SKILLS
lightning_bolt:{name:'Lightning Bolt',icon:'⚡',mp:()=>Math.floor(state.maxMp*0.12),cd:4,use:(e)=>{
  const d=Math.floor((state.int*5+state.str*3)*1.2);e.hp-=d;
  addCombatLog(`⚡ Lightning Bolt! ${d} dmg!`,'good');
  playSound('snd-magic');animateAttack(true,d,false);return d;}},

earth_totem:{name:'Earth Totem',icon:'🪨',mp:()=>Math.floor(state.maxMp*0.15),cd:6,use:(e)=>{
  if(state.earthTotemTurns>0){
    addCombatLog(`🪨 Earth Totem already active! (${state.earthTotemTurns} turns left)`,'info');
    return 0;
  }
  const healAmt=Math.floor(state.maxHp*0.20);
  state.hp=Math.min(state.maxHp,state.hp+healAmt);
  state.earthTotemTurns=3;
  state.earthTotemReduction=0.20;
  state.combatBuffArmor=0.2; // flat addition to armorMult in calcStats
  addCombatLog(`🪨 Earth Totem! +${healAmt} HP, +20% ARMOR for 3 turns!`,'good');
  playSound('snd-heal');calcStats();return 0;}},

wind_burst:{name:'Wind Burst',icon:'🌪️',mp:()=>Math.floor(state.maxMp*0.18),cd:10,use:(e)=>{
  const d=Math.floor(state.agi*4+state.int*4);e.hp-=d;e.frozen=true;
  addCombatLog(`🌪️ Wind Burst! ${d} dmg + Frozen!`,'good');
  playSound('snd-magic');animateAttack(true,d,false);return d;}},

// 🐉 BERSERKER SKILLS
reckless_strike:{name:'Reckless Strike',icon:'🐉',mp:()=>Math.floor(state.maxMp*0.08),cd:4,use:(e)=>{
  const hpPct=state.hp/state.maxHp;
  const rageMult=1+(1-hpPct)*2.0; // up to 3x damage at 0 HP
  const d=Math.floor(state.attackPower*2.5*rageMult);e.hp-=d;
  addCombatLog(`🐉 Reckless Strike! ${d} dmg! (${Math.round((1-hpPct)*100)}% rage)`,hpPct<0.3?'legendary':'good');
  playSound('snd-attack');animateAttack(true,d,false);return d;}},

blood_rage:{name:'Blood Rage',icon:'🩸',mp:()=>Math.floor(state.maxMp*0.15),cd:6,use:(e)=>{
  if(state.battleCryActive){addCombatLog(`🩸 Blood Rage already active!`,'info');return 0;}
  state.battleCryActive=true;
  state.combatBuffStr=(state.combatBuffStr||0)+2.0;      // +200% STR
  state.combatBuffAtkp=(state.combatBuffAtkp||0)+1.5;    // +150% ATK
  addCombatLog(`🩸 BLOOD RAGE! +200% STR, +150% ATK POWER!`,'legendary');
  playSound('snd-magic');calcStats();return 0;}},

death_wish:{name:'Death Wish',icon:'💢',mp:()=>Math.floor(state.maxMp*0.25),cd:10,use:(e)=>{
  // Sacrifice 30% current HP for massive damage
  const sacrifice=Math.floor(state.hp*0.30);
  state.hp=Math.max(1,state.hp-sacrifice);
  const d=Math.floor(state.attackPower*4.0+sacrifice*2);e.hp-=d;
  addCombatLog(`💢 Death Wish! Sacrificed ${sacrifice} HP for ${d} dmg!`,'legendary');
  playSound('snd-attack');animateAttack(true,d,false);spawnDmgFloat(`💢${d}`,true,'crit-dmg');return d;}},
};

function spawnAbilityFloat(text,color='#ffffff'){
  const div=document.createElement('div');
  div.style.cssText=`position:fixed;top:35%;left:50%;transform:translate(-50%,-50%);font-family:'Cinzel',serif;font-size:1.6em;font-weight:700;color:${color};text-shadow:0 0 20px ${color};pointer-events:none;z-index:9999;animation:critFlash 1s ease forwards;white-space:nowrap;`;
  div.textContent=text;document.body.appendChild(div);setTimeout(()=>div.remove(),1000);
}

function renderSettingsPanel() {
  // keybind UI comes next session
  // game settings — restore saved state
  const sfx = localStorage.getItem('setting-sfx') !== 'false';
  const particles = localStorage.getItem('setting-particles') !== 'false';
  const autosave = localStorage.getItem('setting-autosave') !== 'false';
  document.getElementById('setting-sfx').checked = sfx;
  document.getElementById('setting-particles').checked = particles;
  document.getElementById('setting-autosave').checked = autosave;
}

function saveSetting(key, value) {
  localStorage.setItem(`setting-${key}`, value);
  notify(`✅ ${key} ${value ? 'enabled' : 'disabled'}`, 'var(--green)');
}

// ── SWITCH MAIN SCENE ──
function switchMainScene(scene){
  document.querySelectorAll('.main-scene').forEach(s=>s.style.display='none');
  document.getElementById(`main-scene-${scene}`).style.display='block';
  ['char','adv','town','settings'].forEach(s=>document.getElementById(`nav-${s}`).classList.remove('active'));
  document.getElementById(`nav-${scene}`).classList.add('active');
  if(scene==='adv')loadScene(state.currentScene||'town');
  if(scene==='town')renderShop();
  if(scene==='settings')renderSettingsPanel();
}

async function loadMonsterData() {
  const { data, error } = await dbClient
    .from('monsters')
    .select('id, attack_interval, base_hp, base_atk, base_armor, base_hit, base_dodge, base_xp, gold_min, gold_max, regen_pct, base_crit, ability_trigger_every, ability_damage_pct, ability_heal_pct')

  if (data) {
    data.forEach(m => {
      if (MONSTER_TEMPLATES[m.id]) {
        MONSTER_TEMPLATES[m.id].attackInterval    = m.attack_interval
        MONSTER_TEMPLATES[m.id].regenPct          = m.regen_pct || 0
        MONSTER_TEMPLATES[m.id].base_crit         = m.base_crit || 0
      }
      if (STAGE_BOSSES[m.id]) {
  STAGE_BOSSES[m.id].attackInterval    = m.attack_interval
  STAGE_BOSSES[m.id].regenPct          = m.regen_pct || 0
  STAGE_BOSSES[m.id].base_crit         = m.base_crit || 0
  STAGE_BOSSES[m.id].abilityTriggerEvery = m.ability_trigger_every || 3
  STAGE_BOSSES[m.id].abilityDamagePct  = m.ability_damage_pct || 0
  STAGE_BOSSES[m.id].abilityHealPct    = m.ability_heal_pct || 0
}
    })
  }
}
const MONSTER_TEMPLATES = {
  // Stage 1 — Level 1-9 — atk ~player lvl1 ATK (80), HP takes ~15 hits
  young_wolf:      {id:'young_wolf',     name:'🐺 Young Wolf',      icon:'images/monsters/wolf',    hp:1200,   atk:60,    armor:5000,   hit:80,   dodge:50,   xp:800,   gold:[300,600]},
  forest_wolf:     {id:'forest_wolf',    name:'🐺 Forest Wolf',     icon:'images/monsters/wolf',    hp:1800,   atk:120,    armor:5000,   hit:160,  dodge:130,   xp:1200,  gold:[500,1000]},
  shadow_wolf:     {id:'shadow_wolf',    name:'🐺 Shadow Wolf',     icon:'images/monsters/wolf',    hp:2400,   atk:240,   armor:5000,   hit:220,  dodge:190,   xp:1600,  gold:[800,1400]},
  dire_wolf:       {id:'dire_wolf',      name:'🐺 Dire Wolf',       icon:'images/monsters/wolf',    hp:3200,   atk:400,   armor:5000,  hit:350,  dodge:250,  xp:2000,  gold:[1000,1800]},

  // Stage 2 — Level 10-19 — player ATK ~290, HP ~1730
  cave_spider:     {id:'cave_spider',    name:'🕷️ Cave Spider',     icon:'images/monsters/spider',  hp:8000,   atk:2200,   armor:5000,  hit:1200,  dodge:800,  xp:2400,  gold:[1200,2000]},
  venom_spider:    {id:'venom_spider',   name:'🕷️ Venom Spider',    icon:'images/monsters/spider',  hp:12000,  atk:2800,   armor:5000,  hit:1800,  dodge:1000,  xp:3000,  gold:[1600,2600]},
  giant_spider:    {id:'giant_spider',   name:'🕷️ Giant Spider',    icon:'images/monsters/spider',  hp:18000,  atk:3400,   armor:5000,  hit:2000,  dodge:1600,  xp:3700,  gold:[2000,3200]},
  queen_spider:    {id:'queen_spider',   name:'🕷️ Queen Spider',    icon:'images/monsters/spider',  hp:26000,  atk:4200,   armor:5000,  hit:2500,  dodge:1900,  xp:4500,  gold:[2500,4000]},

  // Stage 3 — Level 20-29 — player ATK ~620, HP ~3580
  goblin_scout:    {id:'goblin_scout',   name:'👹 Goblin Scout',    icon:'images/monsters/goblin',  hp:40000,  atk:4800,   armor:20000,  hit:2000,  dodge:1000,  xp:5400,  gold:[3000,4800]},
  goblin_warrior:  {id:'goblin_warrior', name:'👹 Goblin Warrior',  icon:'images/monsters/goblin',  hp:60000,  atk:5800,   armor:20000,  hit:3500,  dodge:2800,  xp:6500,  gold:[3800,5800]},
  goblin_shaman:   {id:'goblin_shaman',  name:'👹 Goblin Shaman',   icon:'images/monsters/goblin',  hp:85000,  atk:7000,   armor:20000,  hit:4000,  dodge:3000,  xp:7800,  gold:[4600,7000]},
  goblin_elite:    {id:'goblin_elite',   name:'👹 Goblin Elite',    icon:'images/monsters/goblin',  hp:120000, atk:8600,   armor:20000,  hit:5500, dodge:4800,  xp:9400,  gold:[5600,8400]},

  // Stage 4 — Level 30-39 — player ATK ~1050, HP ~6280
  skeleton_archer: {id:'skeleton_archer',name:'💀 Skeleton Archer', icon:'images/monsters/skeleton',hp:160000, atk:10000,  armor:20000, hit:6500, dodge:5000, xp:11000, gold:[6600,10000]},
  skeleton_warrior:{id:'skeleton_warrior',name:'💀 Skeleton Warrior', icon:'images/monsters/skeleton',hp:220000, atk:12000,  armor:20000, hit:8000, dodge:6000, xp:13200, gold:[8000,12000]},
  skeleton_mage:   {id:'skeleton_mage',  name:'💀 Skeleton Mage',   icon:'images/monsters/skeleton',hp:300000, atk:14500,  armor:20000, hit:10200, dodge:9500, xp:15800, gold:[9600,14400]},
  skeleton_knight: {id:'skeleton_knight',name:'💀 Skeleton Knight', icon:'images/monsters/skeleton',hp:420000, atk:17500,  armor:20000, hit:12000, dodge:10500, xp:19000, gold:[11600,17400]},

  // Stage 5 — Level 40-49 — player ATK ~1580, HP ~9780
  orc_grunt:       {id:'orc_grunt',      name:'👊 Orc Grunt',       icon:'images/monsters/orc',     lifeSteal:1.5, hp:560000, atk:20000,  armor:50000, hit:15000, dodge:12000, xp:22800, gold:[14000,21000]},
  orc_warrior:     {id:'orc_warrior',    name:'👊 Orc Warrior',     icon:'images/monsters/orc',     lifeSteal:1.5, hp:760000, atk:20000,  armor:50000, hit:18000, dodge:13000, xp:27400, gold:[16800,25200]},
  orc_shaman:      {id:'orc_shaman',     name:'👊 Orc Shaman',      icon:'images/monsters/orc',     lifeSteal:1.5, hp:1000000,atk:20000,  armor:50000, hit:20000, dodge:17000, xp:32800, gold:[20200,30200]},
  orc_berserker:   {id:'orc_berserker',  name:'👊 Orc Berserker',   icon:'images/monsters/orc',     lifeSteal:1.5, hp:1400000,atk:20000,  armor:50000, hit:22000, dodge:19000, xp:39400, gold:[24200,36400]},

  // Stage 6 — Level 50-59 — player ATK ~2210, HP ~14080
  vampire_thrall:  {id:'vampire_thrall', name:'🧛 Vampire Thrall',  icon:'images/monsters/vampire', hp:1800000,atk:42000,  armor:50000, hit:26000, dodge:22000, xp:47200, gold:[29000,43600]},
  vampire_hunter:  {id:'vampire_hunter', name:'🧛 Vampire Hunter',  icon:'images/monsters/vampire', hp:2400000,atk:50000,  armor:50000, hit:30000, dodge:25000, xp:56800, gold:[35000,52400]},
  vampire_noble:   {id:'vampire_noble',  name:'🧛 Vampire Noble',   icon:'images/monsters/vampire', hp:3200000,atk:60000,  armor:50000, hit:40000, dodge:30000, xp:68200, gold:[42000,63000]},
  vampire_elder:   {id:'vampire_elder',  name:'🧛 Vampire Elder',   icon:'images/monsters/vampire', hp:4200000,atk:72000,  armor:50000, hit:48000, dodge:38200, xp:81800, gold:[50400,75600]},

  // Stage 7 — Level 60-69 — player ATK ~2940, HP ~19180
  cave_troll:      {id:'cave_troll',     name:'👾 Cave Troll',      icon:'images/monsters/troll',   hp:5500000,atk:85000,  armor:80000,hit:40500,dodge:30500, xp:98200, gold:[60500,90800]},
  rock_troll:      {id:'rock_troll',     name:'👾 Rock Troll',      icon:'images/monsters/troll',   hp:7200000,atk:100000, armor:80000,hit:62500,dodge:45000,xp:117800,gold:[72600,109000]},
  frost_troll:     {id:'frost_troll',    name:'👾 Frost Troll',     icon:'images/monsters/troll',   hp:9500000,atk:120000, armor:80000,hit:75000,dodge:55000,xp:141400,gold:[87200,130800]},
  war_troll:       {id:'war_troll',      name:'👾 War Troll',       icon:'images/monsters/troll',   hp:12500000,atk:145000,armor:80000,hit:80000,dodge:70500,xp:169600,gold:[104600,157000]},

  // Stage 8 — Level 70-79 — player ATK ~3770, HP ~25080
  demon_scout:     {id:'demon_scout',    name:'😈 Demon Scout',     icon:'images/monsters/demon',   hp:16000000,atk:170000,armor:80000,hit:121000,dodge:87000,xp:203600,gold:[125600,188400]},
  demon_warrior:   {id:'demon_warrior',  name:'😈 Demon Warrior',   icon:'images/monsters/demon',   hp:21000000,atk:200000,armor:80000,hit:125000,dodge:99000,xp:244400,gold:[150800,226200]},
  demon_mage:      {id:'demon_mage',     name:'😈 Demon Mage',      icon:'images/monsters/demon',   hp:27000000,atk:240000,armor:80000,hit:160000,dodge:124000,xp:293200,gold:[181000,271400]},
  demon_knight:    {id:'demon_knight',   name:'😈 Demon Knight',    icon:'images/monsters/demon',   hp:35000000,atk:290000,armor:80000,hit:186000,dodge:169000,xp:351800,gold:[217200,325800]},

  // Stage 9 — Level 80-89 — player ATK ~4700, HP ~31780
  shadow_wraith:   {id:'shadow_wraith',  name:'🌑 Shadow Wraith',   icon:'images/monsters/werewolf',hp:44000000,atk:340000,armor:160000,hit:220000,dodge:190000,xp:422200,gold:[260600,391000]},
  shadow_knight:   {id:'shadow_knight',  name:'🌑 Shadow Knight',   icon:'images/monsters/werewolf',hp:56000000,atk:400000,armor:160000,hit:280000,dodge:220000,xp:506600,gold:[312800,469200]},
  shadow_mage:     {id:'shadow_mage',    name:'🌑 Shadow Mage',     icon:'images/monsters/werewolf',hp:70000000,atk:470000,armor:160000,hit:340000,dodge:267000,xp:608000,gold:[375400,563000]},
  shadow_lord:     {id:'shadow_lord',    name:'🌑 Shadow Lord',     icon:'images/monsters/werewolf',hp:88000000,atk:550000,armor:160000,hit:409000,dodge:305000,xp:729600,gold:[450500,675800]},

  // Stage 10 — Level 90-100 — player ATK ~5730, HP ~39280
  eternal_guard:   {id:'eternal_guard',  name:'🌟 Eternal Guard',   icon:'images/monsters/phoenix', hp:110000000,atk:640000,armor:160000, hit:380000, dodge:334000,xp:875600, gold:[540600,811000]},
  eternal_warrior: {id:'eternal_warrior',name:'🌟 Eternal Warrior', icon:'images/monsters/phoenix', hp:140000000,atk:750000,armor:160000,hit:444000, dodge:375000,xp:1050800,gold:[648800,973200]},
  eternal_mage:    {id:'eternal_mage',   name:'🌟 Eternal Mage',    icon:'images/monsters/phoenix', hp:175000000,atk:880000,armor:160000,hit:511000,dodge:458000,xp:1261000,gold:[778600,1168000]},
  eternal_champion:{id:'eternal_champion',name:'🌟 Eternal Champion',icon:'images/monsters/phoenix',hp:220000000,atk:1040000,armor:160000,hit:613000,dodge:504000,xp:1513000,gold:[934400,1401600]},
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
  stage_boss_1:{id:'stage_boss_1',name:'🐺 Wolf King',icon:'images/bosses/boss1',
    hp:18000,atk:500,armor:20000,hit:600,dodge:400,xp:4000,gold:[3000,6000],
    ability:{name:'PACK HOWL!',color:'#ffdd00',triggerEvery:3,effect:(e)=>{
      const d=Math.floor(e.atk*(e.abilityDamagePct||0.5));
      state.hp=Math.max(1,state.hp-d);
      spawnAbilityFloat('🐺 PACK HOWL!','#ffdd00');
      addCombatLog(`🐺 Wolf King howls! Pack attacks for ${d}!`,'bad');
      animateAttack(false,d,false);}},
    cs:{title:'Wolf King',req:'Required: Stage 1 Clear',text:'The mighty Wolf King rises from the pack!'}},

  stage_boss_2:{id:'stage_boss_2',name:'🕷️ Spider Queen',icon:'images/bosses/boss2',
    hp:120000,atk:8600,armor:50000,hit:5500,dodge:4600,xp:8000,gold:[8000,16000],
    ability:{name:'WEB TRAP!',color:'#44ff44',triggerEvery:3,effect:(e)=>{
      state.webTrapped=2;
      spawnAbilityFloat('🕸️ WEB TRAP!','#44ff44');
      addCombatLog(`🕸️ Spider Queen webs you! Dodge 0 for 2 turns!`,'bad');}},
    cs:{title:'Spider Queen',req:'Required: Stage 2 Clear',text:'From the depths of her web kingdom, the Spider Queen descends!'}},

  stage_boss_3:{id:'stage_boss_3',name:'👹 Goblin Warlord',icon:'images/bosses/boss3',
    hp:480000,atk:13200,armor:50000,hit:12000,dodge:10200,xp:16000,gold:[15000,28000],
    ability:{name:'GOLD STEAL!',color:'#f0c040',triggerEvery:3,effect:(e)=>{
      const s=Math.floor(state.gold*(e.abilityDamagePct||0.10));
      state.gold=Math.max(0,state.gold-s);
      spawnAbilityFloat('💰 GOLD STEAL!','#f0c040');
      addCombatLog(`💰 Goblin Warlord steals ${s} gold!`,'bad');}},
    cs:{title:'Goblin Warlord',req:'Required: Stage 3 Clear',text:'The Goblin Warlord commands an army of thieves!'}},

  stage_boss_4:{id:'stage_boss_4',name:'💀 Skeleton Lord',icon:'images/bosses/boss4',
    hp:1800000,atk:29500,armor:50000,hit:18500,dodge:16500,xp:21000,gold:[30000,55000],
    ability:{name:'DEATH CURSE!',color:'#aa44ff',triggerEvery:3,effect:(e)=>{
      const r=Math.floor(state.maxHp*(e.abilityDamagePct||0.05));
      state.activeDebuffs.maxHpReduction+=r;
      state.equipMaxHp=(state.equipMaxHp||0)-r;
      spawnAbilityFloat('💀 DEATH CURSE!','#aa44ff');
      addCombatLog(`💀 Death Curse! Max HP -${r}!`,'bad');
      calcStats();}},
    cs:{title:'Skeleton Lord',req:'Required: Stage 4 Clear',text:'The Skeleton Lord rises from his eternal tomb!'}},

  stage_boss_5:{id:'stage_boss_5',name:'👊 Orc Chieftain',icon:'images/bosses/boss5',
    hp:6000000,atk:63000,armor:80000,hit:46000,dodge:33000,xp:42000,gold:[60000,110000],
    ability:{name:'BERSERKER RAGE!',color:'#ff8800',triggerEvery:5,effect:(e)=>{
      currentEnemy.atk=Math.floor(currentEnemy.atk*2);
      currentEnemy.rageTimer=3;
      spawnAbilityFloat('👊 BERSERKER RAGE!','#ff8800');
      addCombatLog(`👊 Orc Chieftain berserk! ATK doubled!`,'bad');}},
    cs:{title:'Orc Chieftain',req:'Required: Stage 5 Clear',text:'The Orc Chieftain is the strongest warrior alive!'}},

  stage_boss_6:{id:'stage_boss_6',name:'🧛 Vampire Lord',icon:'images/bosses/boss6',
    hp:18000000,atk:120000,armor:80000,hit:72000,dodge:56000,xp:80000,gold:[110000,200000],
    ability:{name:'LIFE DRAIN!',color:'#ff2244',triggerEvery:3,effect:(e)=>{
      const h=Math.floor(currentEnemy.atk*(e.abilityHealPct||0.2));
      currentEnemy.hp=Math.min(currentEnemy.maxHp,currentEnemy.hp+h);
      spawnAbilityFloat('🧛 LIFE DRAIN!','#ff2244');
      addCombatLog(`🧛 Vampire Lord drains life! +${h} HP!`,'bad');
      updateEnemyBar();}},
    cs:{title:'Vampire Lord',req:'Required: Stage 6 Clear',text:'The Vampire Lord rules the night!'}},

  stage_boss_7:{id:'stage_boss_7',name:'👾 Troll King',icon:'images/bosses/boss7',
    hp:55000000,atk:222000,armor:160000,hit:125000,dodge:92000,xp:160000,gold:[200000,380000],
    ability:{name:'REGENERATION!',color:'#00ff88',triggerEvery:2,effect:(e)=>{
      const h=Math.floor(e.maxHp*(e.regenPct||0.006));
      e.hp=Math.min(e.maxHp,e.hp+h);
      updateEnemyBar();}}, // silent regen
    cs:{title:'Troll King',req:'Required: Stage 7 Clear',text:'The Troll King cannot be killed!'}},

  stage_boss_8:{id:'stage_boss_8',name:'😈 Demon Prince',icon:'images/bosses/boss8',
    hp:160000000,atk:405000,armor:160000,hit:160000,dodge:135000,xp:300000,gold:[380000,700000],
    ability:{name:'HELLFIRE!',color:'#ff4400',triggerEvery:3,effect:(e)=>{
      const d=Math.floor(currentEnemy.atk*(e.abilityDamagePct||0.8));
      state.hp=Math.max(1,state.hp-d);
      spawnAbilityFloat('😈 HELLFIRE!','#ff4400');
      addCombatLog(`😈 Hellfire! ${d} true damage — armor ignored!`,'bad');
      animateAttack(false,d,false);}},
    cs:{title:'Demon Prince',req:'Required: Stage 8 Clear',text:'The Demon Prince wields hellfire that melts through any armor!'}},

  stage_boss_9:{id:'stage_boss_9',name:'🌑 Shadow Emperor',icon:'images/bosses/boss9',
    hp:450000000,atk:810000,armor:400000,hit:460000,dodge:210000,xp:600000,gold:[700000,1300000],
    ability:{name:'PHASE SHIFT!',color:'#4488ff',triggerEvery:3,effect:(e)=>{
      currentEnemy.phaseShifted=true;
      spawnAbilityFloat('🌑 PHASE SHIFT!','#4488ff');
      addCombatLog(`🌑 Shadow Emperor phases out! Next attack misses!`,'bad');}},
    cs:{title:'Shadow Emperor',req:'Required: Stage 9 Clear',text:'The Shadow Emperor exists between dimensions!'}},

  stage_boss_10:{id:'stage_boss_10',name:'🌟 Eternal King',icon:'images/bosses/boss10',
    hp:1200000000,atk:1400000,armor:400000,hit:800000,dodge:400000,xp:1000000,gold:[1500000,3000000],
    ability:{name:'ALL POWERS!',color:'#ffffff',triggerEvery:2,effect:(e)=>{
      const d=Math.floor(currentEnemy.atk*(e.abilityDamagePct||0.6));
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
  const isPhase1 = (state.worldPhase || 1) < 2
  const isPhase2 = (state.worldPhase || 1) < 3
  return{...tmpl,
    hp:      Math.floor(tmpl.hp*stageScale*diff.hpMult),
    maxHp:   Math.floor(tmpl.hp*stageScale*diff.hpMult),
    atk:     Math.floor(tmpl.atk*stageScale*diff.atkMult),
    armor:   Math.floor(tmpl.armor*stageScale),
    hit:     isPhase1 ? 0 : Math.floor(tmpl.hit*stageScale),
    dodge:   isPhase1 ? 0 : Math.floor(tmpl.dodge*stageScale),
    crit:    isPhase1 ? 0 : (tmpl.base_crit || 0),
    ability: isPhase2 ? null : tmpl.ability,
    xp:    Math.floor(tmpl.xp*diff.xpMult),
    gold:  [Math.floor(tmpl.gold[0]*diff.goldMult),Math.floor(tmpl.gold[1]*diff.goldMult)],
    poisoned:0,frozen:false,boss:false,_xpMult:1,_goldMult:1
  };
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
      const innCost = GAME_CONFIG.inn_cost || 0;
      if(state.gold >= innCost){
        addGold(-innCost); // ✅ sanitized
        const hh=Math.floor(state.maxHp*0.5),mh=Math.floor(state.maxMp*0.5);
        state.hp=Math.min(state.maxHp,state.hp+hh);state.mp=Math.min(state.maxMp,state.mp+mh);
        addLog(`Rested: +${formatNumber(hh)} HP, +${formatNumber(mh)} MP. Cost ${formatNumber(innCost)}g.`,'good');
      } else { addLog(`Need ${formatNumber(innCost)} gold to rest!`,'bad'); }
      updateUI();
    },
    choices:[{text:'🏘️ Return to Town',next:'town'}]},
};

// ── SHOP ITEMS ──
const SHOP_EQUIP=[
  {id:'s1',name:'⚔️ Iron Sword',price:200,slot:'weapon',rarity:'normal',stats:{str:20,lifeSteal:0.05,hit:15,crit:0.1}},
  {id:'s2',name:'⚔️ Steel Sword',price:500,slot:'weapon',rarity:'uncommon',levelReq:10,stats:{str:45,lifeSteal:0.06,hit:25,crit:0.2}},
  {id:'s5',name:'🛡️ Wooden Shield',price:200,slot:'armor',rarity:'normal',stats:{sta:15,armor:5000,hpRegen:35,dodge:0.2}},
  {id:'s6',name:'🛡️ Chain Mail',price:400,slot:'armor',rarity:'uncommon',levelReq:10,stats:{sta:25,armor:5000,hpRegen:50,dodge:0.5}},
  {id:'s9',name:'👢 Leather Boots',price:220,slot:'boots',rarity:'normal',stats:{agi:15,crit:0.1,armor:5000}},
  {id:'s10',name:'👢 Swift Treads',price:550,slot:'boots',rarity:'uncommon',levelReq:10,stats:{agi:30,dodge:0.2,armor:5000}},
  {id:'s13',name:'💍 Copper Band',price:350,slot:'ring',rarity:'normal',stats:{str:10,int:10,crit:0.10}},
  {id:'s14',name:'💍 Silver Seal',price:550,slot:'ring',rarity:'uncommon',levelReq:10,stats:{str:25,int:25,crit:0.20}},
  {id:'s17',name:'⛑️ Iron Helm',price:280,slot:'helmet',rarity:'normal',stats:{armor:5000,int:10,crit:0.10}},
  {id:'s18',name:'⛑️ Steel Visor',price:580,slot:'helmet',rarity:'uncommon',levelReq:10,stats:{armor:5000,int:25,crit:0.20}},
  {id:'s21',name:'📿 Novice Pendant',price:250,slot:'amulet',rarity:'normal',stats:{int:15,maxMp:150,crit:0.10,armor:5000}},
  {id:'s22',name:'📿 Mage Talisman',price:550,slot:'amulet',rarity:'uncommon',levelReq:10,stats:{int:35,maxMp:350,crit:0.20,armor:5000}},
];
const SHOP_CONS=[
  {id:'c1',name:'❤️ Health Potion',price:100,rarity:'normal',effect:'hp',val:400},
  {id:'c2',name:'❤️ Mega Potion',price:220,rarity:'uncommon',effect:'hp',val:2000},
  {id:'c3',name:'💧 Mana Potion',price:80,rarity:'normal',effect:'mp',val:300},
  {id:'c4',name:'💧 Mana Flask',price:180,rarity:'uncommon',effect:'mp',val:6000},
  {id:'c5',name:'✨ Elixir',price:400,rarity:'rare',effect:'both',val:10000},
];

// ── COMBAT VARS ──

let currentInvTab='equipment',currentShopTab='equipment';


// ── ANIMATIONS ──
function animateAttack(isPlayer, dmg, isCrit) {
  if (isPlayer) {
    const a = document.getElementById('arena-player'); // was 'char-avatar'
    if (a) { a.classList.remove('attacking'); void a.offsetWidth; a.classList.add('attacking'); setTimeout(() => a.classList.remove('attacking'), 500); }
    const e = document.getElementById('arena-enemy');
    if (e) { e.classList.remove('enemy-shake','enemy-hit'); void e.offsetWidth; e.classList.add('enemy-shake'); setTimeout(() => e.classList.remove('enemy-shake'), 500); }
  } else {
    const p = document.getElementById('arena-player'); // was 'arena-player' — already correct
    if (p) { p.classList.remove('enemy-shake'); void p.offsetWidth; p.classList.add('enemy-shake'); setTimeout(() => p.classList.remove('enemy-shake'), 400); }
    const c = document.getElementById('arena-player'); // was 'char-avatar'
    if (c) { c.classList.add('hit'); setTimeout(() => c.classList.remove('hit'), 400); }
  }
  spawnDmgFloat(isCrit ? `💥${dmg}!` : String(dmg), !isPlayer, isCrit ? 'crit-dmg' : isPlayer ? 'enemy-dmg' : 'player-dmg');
}
// Track float queue per side
const _floatQueues = { enemy: 0, player: 0 }

function spawnDmgFloat(text, onEnemy, cls='') {
  const targetId = onEnemy ? 'arena-enemy' : 'arena-player'
  const target = document.getElementById(targetId)
  if (!target) return

  const rect = target.getBoundingClientRect()
  const side = onEnemy ? 'enemy' : 'player'

  // Stack offset — each new float is 24px higher than previous
  const stackOffset = _floatQueues[side] * 24
  _floatQueues[side]++

  const div = document.createElement('div')
  div.className = `dmg-float ${cls}`
  div.textContent = text
  div.style.cssText = `
    position:fixed;
    left:${rect.left + rect.width / 2}px;
    top:${rect.top - 10 - stackOffset}px;
    transform:translateX(-50%);
    z-index:9999;
  `

  document.body.appendChild(div)

  // Clean up and decrement queue
  setTimeout(() => {
    div.remove()
    _floatQueues[side] = Math.max(0, _floatQueues[side] - 1)
  }, 950)
}

// ── AUTH: REGISTER ──
async function registerUser(){
  const email    = (document.getElementById('reg-email')?.value || document.getElementById('auth-email')?.value || '').trim();
  const password = (document.getElementById('reg-pass')?.value  || document.getElementById('auth-password')?.value || '').trim();
  const name     = (document.getElementById('reg-name')?.value  || document.getElementById('name-input')?.value || '').trim();
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
  ? ({
      warrior:     '⚔️ Warrior',
      mage:        '🔮 Mage',
      rogue:       '🗡️ Rogue',
      hunter:      '🏹 Hunter',
      paladin:     '🛡️ Paladin',
      necromancer: '💀 Necromancer',
      shaman:      '⚡ Shaman',
      berserker:   '🐉 Berserker',
    }[c.class] || c.class)
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

async function selectCharacterAndPlay(characterId) {
  try {
    // Check if session is already active
    const { data: charCheck } = await dbClient
      .from('characters')
      .select('active_session, session_started_at, name')
      .eq('id', characterId)
      .single()

    if (charCheck?.active_session) {
      const since = charCheck.session_started_at
        ? new Date(charCheck.session_started_at).toLocaleTimeString()
        : 'unknown time'

      const force = confirm(
        `⚠️ ${charCheck.name} is already logged in from another session (since ${since}).\n\nForce login? The other session will be disconnected.`
      )

      if (!force) {
        document.getElementById('char-select-screen').remove()
        document.getElementById('auth-screen').style.display = 'flex'
        return
      }
    }

    // Claim the session
    const sessionToken = `${characterId}_${Date.now()}`
    await dbClient
      .from('characters')
      .update({
        active_session: sessionToken,
        session_started_at: new Date().toISOString()
      })
      .eq('id', characterId)

    state.sessionToken = sessionToken

    setTimeout(() => collectArenaRewards(), 2000)
    setTimeout(() => resumeStuckTournaments(), 3000)

    const screen = document.getElementById('char-select-screen')
    if (screen) screen.remove()

    const { data: character, error } = await dbClient
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single()

    if (error) {
      console.error('Supabase error:', error)
      notify('❌ Failed to load character: ' + error.message, 'var(--red)')
      return
    }

    if (!character) {
      notify('❌ Character not found', 'var(--red)')
      return
    }

    if (!character.id || !character.name) {
      console.error('Invalid character data:', character)
      notify('❌ Character data is corrupted', 'var(--red)')
      return
    }

    if (typeof syncCharacterToState === 'function') {
      await syncCharacterToState(character)
    } else {
      console.warn('syncCharacterToState not loaded yet')
      notify('❌ Game initialization failed', 'var(--red)')
      return
    }

    // Safety check — catch any sync failure before proceeding
    if (!state.character_id || state.character_id === 'undefined') {
      console.error('CRITICAL: character_id missing after sync', character)
      notify('❌ Critical Error: Character data failed to load. Please refresh.', 'var(--red)')
      document.getElementById('auth-screen').style.display = 'flex'
      return
    }

    await checkLoginReward()

    if (typeof initChat === 'function') await initChat()

    showGame()
    setTimeout(() => startSessionWatcher(), 10000)
    loadScene(state.currentScene || 'town')

    if (typeof initializeSupabaseSync === 'function') {
      initializeSupabaseSync()
    }

    checkAndSettleAuctions()
    addLog(`☁️ Welcome back ${state.name}! (Lv.${state.level})`, 'gold')

    setTimeout(() => {
      if (window._pendingLoginReward) {
        const { reward, day, item, alreadyClaimed } = window._pendingLoginReward
        showLoginRewardPopup(reward, day, item, alreadyClaimed)
        window._pendingLoginReward = null
      }
    }, 500)

  } catch (e) {
    console.error('Character load error:', e)
    notify('❌ Load failed: ' + e.message, 'var(--red)')
  }
}
let sessionWatcherInterval = null

function startSessionWatcher() {
  // Clear any existing watcher first
  if (sessionWatcherInterval) clearInterval(sessionWatcherInterval)

  sessionWatcherInterval = setInterval(async () => {
  if (!state.character_id || !state.sessionToken) return

  const { data } = await dbClient
    .from('characters')
    .select('active_session')
    .eq('id', state.character_id)
    .single()

  if (data?.active_session !== state.sessionToken) {
    // Stop watcher AND disable heartbeat immediately
    clearInterval(sessionWatcherInterval)
    sessionWatcherInterval = null
    state.sessionToken = null // disables heartbeat in savePlayerToSupabase

    if (currentEnemy) {
      notify('⚠️ Another session detected! Logging out after combat.', 'var(--red)')
      const waitForCombatEnd = setInterval(async () => {
        if (!currentEnemy) {
          clearInterval(waitForCombatEnd)
          await forceLogout()
        }
      }, 1000)
    } else {
      await forceLogout()
    }
  }
}, 5000)
}

async function forceLogout() {
  clearInterval(autoFightTimer)
  autoFightOn = false

  try {
    await savePlayerToSupabase()
  } catch (e) {
    console.warn('Emergency save failed:', e)
  }

  state.sessionToken = null
  await dbClient.auth.signOut()
  alert('⚠️ You have been logged out. Another session has taken over.')
  location.reload()
}

async function respecClass(){
  if(!state.class){
    notify('No class to respec!','var(--red)');return;
  }
  const cost = 50000 * (state.respecCount + 1);
  if(state.gold < cost){
    notify(`❌ Need ${formatNumber(cost)}g to respec!`,'var(--red)');return;
  }
  const soulWarning = state.soulWeapon ? `\n\n⚠️ WARNING: Your Soul Weapon "${state.soulWeapon.name}" will be DESTROYED FOREVER!` : '';
if(!confirm(`Respec class for ${formatNumber(cost)}g?${soulWarning}\nAll talents will be reset and talent points refunded.`))return;

// Destroy soul weapon
if (state.soulWeapon) {
  const old = SOUL_WEAPONS[state.soulWeapon.classId]?.tiers.find(t => t.tier === state.soulWeapon.tier);
  if (old) Object.entries(old.stats).forEach(([k,v]) => {
    const ek = 'equip' + k.charAt(0).toUpperCase() + k.slice(1);
    state[ek] = (state[ek] || 0) - v;
  });
  addLog(`💔 Soul Weapon "${state.soulWeapon.name}" destroyed on respec!`, 'bad');
  state.soulWeapon = null;
  state.craftedSoulTiers = {};
}

  addGold(-cost); // ✅ sanitized
  state.respecCount++;

  // Refund all talent points — count only spent ranks
const c = CLASSES[state.class];
// Count only manually spent ranks
let refunded = 0;
const rankCounts = {};
state.unlockedTalents.forEach(id => {
  rankCounts[id] = (rankCounts[id] || 0) + 1;
});
Object.values(c.trees).forEach(tree => {
  tree.talents.forEach(talent => {
    const ranks = rankCounts[talent.id] || 0;
    refunded += ranks * talent.cost;
  });
});
state.talentPoints += refunded;

  // Reset talent bonuses
  state.talentBonuses = {
    strMult:0,agiMult:0,intMult:0,staMult:0,
    hitMult:0,critMult:0,dodgeMult:0,hpRegenMult:0,
    mpRegenMult:0,armorMult:0,mpMult:0,lifeStealMult:0,
    attackPowerMult:0,maxHpMult:0,hpMult:0,
  };

  // Reset class bonuses
  state.classBonuses = {
    strMult:0,agiMult:0,intMult:0,staMult:0,
    hitMult:0,critMult:0,dodgeMult:0,hpRegenMult:0,
    mpRegenMult:0,armorMult:0,mpMult:0,lifeStealMult:0,
    attackPowerMult:0,maxHpMult:0,hpMult:0,
  };

  // Reset talents and flags
  state.unlockedTalents = [];
  state.talentUnlockedFlags = {};
  state.class = null;
  autoSkillSlots = [null,null,null,null,null,null];
  autoSkillIndex = 0;
  // Reset portrait to placeholder
const portraitEl = document.getElementById('char-portrait-img');
if (portraitEl) portraitEl.src = 'images/classes/warrior.jpeg';
document.getElementById('char-class').textContent = 'No Class';
  await rebuildSkills();

  // Reset stat multipliers
  state.strMult=1.0;state.agiMult=1.0;state.intMult=1.0;state.staMult=1.0;
  state.armorMult=1.0;state.critMult=1.0;state.dodgeMult=1.0;
  state.hpRegenMult=1.0;state.mpRegenMult=1.0;state.hitMult=1.0;
  state.mpMult=1.0;state.attackPowerMult=1.0;
  calcStats();
  addLog(`🔄 Respec complete! ${refunded} talent points refunded. Cost: ${formatNumber(cost)}g`,'gold');
  notify(`🔄 Class reset! Choose a new class.`,'var(--gold)');
  updateClassDisplay();  
  updateAutoSlotHighlight();
  showClassSelection();
  updatePlayerAvatar(); // 👈 add this
  renderSkillBar();
  renderQuests();
  updateUI();
  savePlayerToSupabase();
}

// ── AUTH: LOGOUT ──
async function logoutUser() {
  if (currentEnemy) {
    notify('⚠️ Cannot logout during combat!', 'var(--red)')
    return
  }

  // Stop session watcher
  if (sessionWatcherInterval) {
    clearInterval(sessionWatcherInterval)
    sessionWatcherInterval = null
  }

  try {
    await savePlayerToSupabase()
  } catch(e) { console.warn('Save on logout failed:', e) }

  if (state.character_id) {
    await dbClient
      .from('characters')
      .update({ active_session: null, session_started_at: null })
      .eq('id', state.character_id)
  }

  cleanupSupabaseSync()
  await dbClient.auth.signOut()
  location.reload()
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
  updatePlayerAvatar();
  document.getElementById('arena-player-label').textContent=state.name;
  loadAutoSellUI();calcStats();updateUI();renderShop();renderQuests();
  renderInventory();
  renderSkillBar();renderEquipSlots();fetchLeaderboard();
  setDifficulty(state.difficulty||'normal');
  renderSoulWeaponSlot(); // ← ADD THIS
  initSkillBarKeyHandler();
  switchMainScene('adv');
  loadMonsterData();
}

// ── LOAD SCENE ──
function loadScene(sceneId){
  if(sceneId==='boss_fight')return;
  const scene=SCENES[sceneId];if(!scene)return;
  state.currentScene=sceneId;
  if(scene.action)scene.action();
  document.getElementById('story-content').innerHTML=`<div class="scene-title">${scene.title}</div><p>${scene.text}</p>`;
  showChoicesMode();
const box=document.getElementById('choices-box');box.innerHTML='';
  scene.choices.forEach(c=>{
    const btn=document.createElement('button');btn.className='choice-btn fade-in';btn.innerHTML=c.text;
    if(c.action)btn.onclick=()=>c.action();
    else if(c.enemy)btn.onclick=()=>startCombat(c.enemy,false);
    else if(c.bossId)btn.onclick=()=>triggerBoss(c.bossId);
    else if(c.next==='enter_dungeon')btn.onclick=()=>enterDungeon(c.stageId);
    else btn.onclick=()=>loadScene(c.next);
      box.appendChild(btn);
  // Update inn cost text dynamically
document.querySelectorAll('.choice-btn').forEach(btn => {
  if (btn.textContent.includes('Inn')) {
    const innCost = GAME_CONFIG.inn_cost || 0;
    btn.textContent = `⛪ Inn (+50% HP and MP, ${formatNumber(innCost)}g)`;
  }  
  });   
  });
  updateUI();updateAutoFightBtn();
}
function showCombatMode() {
  document.getElementById('arena').style.display = 'flex';
  document.getElementById('combat-controls').style.display = 'flex';
  document.getElementById('combat-log').style.display = 'block';
  document.getElementById('choices-box').style.display = 'none';
  document.getElementById('choices-box').innerHTML = '';
}

function showChoicesMode() {
  document.getElementById('arena').style.display = 'none';
  document.getElementById('combat-controls').style.display = 'none';
  document.getElementById('combat-log').style.display = 'none';
  document.getElementById('combat-log').innerHTML = '';
  document.getElementById('choices-box').style.display = 'flex';
}
function renderEnemyStatPanel(enemy) {
  return `
    <div class="enemy-stat-panel">
      <div class="enemy-stat-header">
        <span class="enemy-name">${enemy.name}</span>
      </div>      
      <div class="enemy-stats-grid">

        <!-- Phase 1+ — always shown -->
        <div class="stat-item">
          <span class="stat-icon">⚔️</span>
          <span class="stat-name">ATK</span>
          <span class="stat-val">${formatNumber(enemy.atk||0)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">🛡️</span>
          <span class="stat-name">ARM</span>
          <span class="stat-val">${formatNumber(enemy.armor||0)}</span>
        </div>

        <!-- Phase 2+ — dodge, hit, crit unlocked -->
        ${state.worldPhase >= 2 ? `
        <div class="stat-item">
          <span class="stat-icon">💨</span>
          <span class="stat-name">DODGE</span>
          <span class="stat-val">${formatNumber(enemy.dodge||0)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">🎯</span>
          <span class="stat-name">HIT</span>
          <span class="stat-val">${formatNumber(enemy.hit||0)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">💥</span>
          <span class="stat-name">CRIT</span>
          <span class="stat-val">${enemy.crit||0}%</span>
        </div>` : ''}

        <!-- Phase 3+ — skills, flee unlocked (coming later) -->
        ${state.worldPhase >= 3 ? `
        <div class="stat-item">
          <span class="stat-icon">⚡</span>
          <span class="stat-name">SKILLS</span>
          <span class="stat-val">Active</span>
        </div>` : ''}

      </div>
    </div>
  `
}


function renderBuffsAndTitles() {
  const panel = document.getElementById('buffs-titles-panel');
  const content = document.getElementById('buffs-titles-content');
  if (!panel || !content) return;

  const rows = [];

  // ── Gold Multiplier Buff ──
  if (state.goldMult && state.goldMult > 1 && state.goldMultExpiry) {
    const expiry = new Date(state.goldMultExpiry);
    const now = new Date();
    if (now < expiry) {
      const msLeft = expiry - now;
      const hours  = Math.floor(msLeft / 3600000);
      const mins   = Math.floor((msLeft % 3600000) / 60000);
      const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      rows.push(`
        <div style="display:flex;align-items:center;gap:8px;padding:7px 8px;
          background:rgba(255,153,0,0.08);border:1px solid rgba(255,153,0,0.2);
          border-radius:6px;margin-bottom:6px;">
          <div style="font-size:1.3em;">💰</div>
          <div style="flex:1;">
            <div style="font-family:var(--font-title);font-size:.78em;color:var(--gold);">
              ${state.goldMult}x Gold Boost
            </div>
            <div style="font-size:.65em;color:var(--text-dim);">
              From Fortune Wheel — expires in ${timeStr}
            </div>
          </div>
          <div style="font-size:.68em;color:var(--gold);font-family:var(--font-title);">
            ⏰ ${timeStr}
          </div>
        </div>`);
    } else {
      // Expired — reset
      state.goldMult = 1;
      state.goldMultExpiry = null;
    }
  }

  // ── Tournament Buff ──
  if (state.tournamentBuff) {
    const expiry = state.tournamentRewardsExpireAt ? new Date(state.tournamentRewardsExpireAt) : null;
    const expired = expiry && new Date() > expiry;
    if (!expired) {
      if (state.tournamentBuff.goldMult && state.tournamentBuff.goldMult > 1) {
        rows.push(`
          <div style="display:flex;align-items:center;gap:8px;padding:7px 8px;
            background:rgba(255,153,0,0.08);border:1px solid rgba(255,153,0,0.2);
            border-radius:6px;margin-bottom:6px;">
            <div style="font-size:1.3em;">🏆</div>
            <div style="flex:1;">
              <div style="font-family:var(--font-title);font-size:.78em;color:var(--gold);">
                +${Math.round((state.tournamentBuff.goldMult - 1) * 100)}% Tournament Gold Bonus
              </div>
              <div style="font-size:.65em;color:var(--text-dim);">From Tournament placement</div>
            </div>
          </div>`);
      }
      if (state.tournamentBuff.attackMult && state.tournamentBuff.attackMult > 1) {
        rows.push(`
          <div style="display:flex;align-items:center;gap:8px;padding:7px 8px;
            background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);
            border-radius:6px;margin-bottom:6px;">
            <div style="font-size:1.3em;">⚔️</div>
            <div style="flex:1;">
              <div style="font-family:var(--font-title);font-size:.78em;color:var(--red);">
                +${Math.round((state.tournamentBuff.attackMult - 1) * 100)}% Tournament ATK Bonus
              </div>
              <div style="font-size:.65em;color:var(--text-dim);">From Tournament placement</div>
            </div>
          </div>`);
      }
    }
  }

  // ── Titles Section ──
  const titles = [];

  if (state.supremeTitle) {
    titles.push(`
      <div style="display:flex;align-items:center;gap:8px;padding:7px 8px;
        background:linear-gradient(135deg,rgba(255,153,0,0.15),rgba(255,204,0,0.08));
        border:1px solid rgba(255,153,0,0.4);border-radius:6px;margin-bottom:6px;
        animation:glow-pulse 2s infinite;">
        <div style="font-size:1.3em;">👑</div>
        <div>
          <div style="font-family:var(--font-title);font-size:.78em;color:var(--gold);">
            ${state.supremeTitle}
          </div>
          <div style="font-size:.65em;color:var(--text-dim);">Supreme Champion Title</div>
        </div>
      </div>`);
  }

  if (state.tournamentTitle) {
    titles.push(`
      <div style="display:flex;align-items:center;gap:8px;padding:7px 8px;
        background:rgba(255,153,0,0.08);border:1px solid rgba(255,153,0,0.2);
        border-radius:6px;margin-bottom:6px;">
        <div style="font-size:1.3em;">🏆</div>
        <div>
          <div style="font-family:var(--font-title);font-size:.78em;color:var(--gold);">
            ${state.tournamentTitle}
          </div>
          <div style="font-size:.65em;color:var(--text-dim);">Tournament Title</div>
        </div>
      </div>`);
  }

  if (state.luckyTitle) {
    titles.push(`
      <div style="display:flex;align-items:center;gap:8px;padding:7px 8px;
        background:rgba(168,85,247,0.08);border:1px solid rgba(168,85,247,0.2);
        border-radius:6px;margin-bottom:6px;">
        <div style="font-size:1.3em;">🍀</div>
        <div>
          <div style="font-family:var(--font-title);font-size:.78em;color:#a855f7;">
            ${state.luckyTitle}
          </div>
          <div style="font-size:.65em;color:var(--text-dim);">Fortune Wheel Title</div>
        </div>
      </div>`);
  }

  if (state.reputationTitle) {
    const REP_COLORS = {
      baron:'#cd7f32', viscount:'#a0a0a0', earl:'#ffd700',
      marquess:'#00bfff', duke:'#ff6600', archduke:'#ff2244',
    };
    const color = REP_COLORS[state.reputationTitle] || 'var(--text-dim)';
    titles.push(`
      <div style="display:flex;align-items:center;gap:8px;padding:7px 8px;
        background:rgba(255,255,255,0.03);border:1px solid ${color}44;
        border-radius:6px;margin-bottom:6px;">
        <div style="font-size:1.3em;">🎖️</div>
        <div>
          <div style="font-family:var(--font-title);font-size:.78em;color:${color};">
            ${state.reputationTitle.charAt(0).toUpperCase() + state.reputationTitle.slice(1)}
          </div>
          <div style="font-size:.65em;color:var(--text-dim);">Reputation Title</div>
        </div>
      </div>`);
  }

  const allRows = [...rows, ...titles];

  if (allRows.length === 0) {
    panel.style.display = 'none';
    return;
  }

  panel.style.display = 'block';
  content.innerHTML = allRows.join('');
}

// ============================================================
// MERCHANT HALL STATE — resets on every visit
// ============================================================
const merchantSession = {
  craftUnlocked:     false,
  shopUnlocked:      false,
  auctionUnlocked:   false,
  blackWingUnlocked: false,
}

function resetMerchantSession() {
  merchantSession.craftUnlocked     = false
  merchantSession.shopUnlocked      = false
  merchantSession.auctionUnlocked   = false
  merchantSession.blackWingUnlocked = false

  // Hide all NPC inline panels
  const mirelaPanel = document.getElementById('mirela-inline-panel')
  const sovanPanel  = document.getElementById('sovan-inline-panel')
  if (mirelaPanel) mirelaPanel.style.display = 'none'
  if (sovanPanel)  sovanPanel.style.display  = 'none'

  // Hide all tabs except inventory
  ;['craft','shop','auction','blackwing'].forEach(tab => {
    const btn = document.getElementById(`merchant-tab-${tab}`)
    if (btn) btn.style.display = 'none'
  })

  // Reset to inventory tab
  switchMerchantTab('inventory', document.getElementById('merchant-tab-inventory'))
}

// ============================================================
// MERCHANT HALL
// ============================================================

async function openMerchantNPC(npcId) {
  if (npcId === 'sovan') await openSovanPopup()
  if (npcId === 'mirela') await openMirelaPopup()
}

function closeMerchantContent() {
  // Hide all content panels
  document.querySelectorAll('[id^="merchant-panel-"]').forEach(p => p.style.display = 'none')
  // Hide content view, show default
  document.getElementById('merchant-content-view').style.display = 'none'
  document.getElementById('merchant-default-view').style.display = 'flex'
}

function showMerchantPanel(panelId) {
  // Hide all panels
  document.querySelectorAll('[id^="merchant-panel-"]').forEach(p => p.style.display = 'none')
  // Show content view
  document.getElementById('merchant-default-view').style.display = 'none'
  document.getElementById('merchant-content-view').style.display = 'flex'
  // Show target panel
  const panel = document.getElementById(panelId)
  if (panel) panel.style.display = 'flex'
}

// ============================================================
// SOVAN POPUP
// ============================================================
async function openSovanPopup() {
  // Create popup
  const popup = document.createElement('div')
  popup.id = 'sovan-popup'
  popup.innerHTML = `
    <div onclick="event.stopPropagation()" style="
      background:#1a1208;border:2px solid #8b6914;border-radius:12px;
      width:min(420px,92vw);max-height:75vh;display:flex;flex-direction:column;
      box-shadow:0 0 30px rgba(139,105,20,0.4);">

      <!-- Header -->
      <div style="padding:14px 16px;border-bottom:1px solid #8b6914;
        display:flex;align-items:center;gap:10px;">
        <div style="width:48px;height:48px;border-radius:50%;background:#2a1f0a;
          border:2px solid #8b6914;display:flex;align-items:center;
          justify-content:center;font-size:1.6em;flex-shrink:0;">🔨</div>
        <div style="flex:1;">
          <div style="color:#f0c040;font-size:16px;font-weight:bold;font-family:var(--font-title);">Sovan</div>
          <div style="color:#a0845c;font-size:12px;">Master Blacksmith</div>
        </div>
        <button onclick="document.getElementById('sovan-popup').remove()"
          style="background:none;border:none;color:#888;font-size:18px;cursor:pointer;">✕</button>
      </div>

      <!-- Dialogue -->
      <div style="padding:16px;flex:1;overflow-y:auto;">
        <div id="sovan-popup-dialogue" style="
          background:#0f0a02;border:1px solid #3a2f1a;border-radius:8px;
          padding:14px;color:#e8d5a0;font-size:14px;line-height:1.6;
          font-style:italic;min-height:60px;">
          <span style="color:#555">...</span>
        </div>
      </div>

      <!-- Actions -->
      <div style="padding:10px 16px;border-top:1px solid #2a1f0a;display:flex;flex-direction:column;gap:6px;">
        <button onclick="
          document.getElementById('sovan-popup').remove();
          showMerchantPanel('merchant-panel-craft');
          renderCrafting();"
          style="background:#2a1f0a;border:1px solid #8b6914;color:#f0c040;
          padding:9px 16px;border-radius:6px;cursor:pointer;font-size:13px;text-align:left;">
          ⚗️ Enter the Forge — Crafting
        </button>
      </div>

    </div>`

  popup.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:1000;
    display:flex;align-items:center;justify-content:center;`
  popup.onclick = () => popup.remove()
  document.body.appendChild(popup)

  // Fetch Sovan dialogue
  try {
    const { data: { session } } = await dbClient.auth.getSession()
    const res = await fetch('https://xagwrqrgcuuitwgroiwh.supabase.co/functions/v1/talk-to-npc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ npc_id: 'sovan', message_type: 'greet', character_id: state.character_id })
    })
    const data = await res.json()
    await typeNPCPopupDialogue('sovan-popup-dialogue', data.response || '...')
  } catch(err) {
    document.getElementById('sovan-popup-dialogue').textContent = '*Sovan glances up from his hammer*'
  }
}

// ============================================================
// MIRELA POPUP
// ============================================================
async function openMirelaPopup() {
  const rank = state.reputationTitle || 'citizen'
  const REP_ORDER = ['citizen','baron','chief','mayor','viscount','count']
  const rankIndex = REP_ORDER.indexOf(rank)

  // Inn cost by rank
  const INN_DISCOUNTS = {
    citizen:1.00, baron:0.90, chief:0.75, mayor:0.50, viscount:0.20, count:0.00
  }
  const baseCost = GAME_CONFIG.inn_cost || 10000
  const discount = INN_DISCOUNTS[rank] ?? 1.00
  const innCost = Math.floor(baseCost * discount)
  const innLabel = innCost === 0
    ? `🛏️ Rest at the Inn — FREE`
    : `🛏️ Rest at the Inn — ${formatNumber(innCost)}g${discount < 1 ? ` (${Math.round((1-discount)*100)}% off)` : ''}`

  // Build action buttons based on rank
  const auctionBtn = rankIndex >= REP_ORDER.indexOf('chief')
    ? `<button onclick="
        document.getElementById('mirela-popup').remove();
        showMerchantPanel('merchant-panel-auction');
        fetchAuctions('auction');"
        style="background:#2a1f0a;border:1px solid #8b6914;color:#f0c040;
        padding:9px 16px;border-radius:6px;cursor:pointer;font-size:13px;text-align:left;">
        🏛️ Auction House
      </button>` : ''

  const blackwingBtn = rankIndex >= REP_ORDER.indexOf('viscount')
    ? `<button onclick="
        document.getElementById('mirela-popup').remove();
        showMerchantPanel('merchant-panel-blackwing');
        fetchAuctions('blackwing');"
        style="background:#1a0a1a;border:1px solid #5a2d8a;color:#a855f7;
        padding:9px 16px;border-radius:6px;cursor:pointer;font-size:13px;text-align:left;">
        🖤 Black Wing <span style="font-size:.8em;color:#666;"></span>
      </button>` : ''

  const popup = document.createElement('div')
  popup.id = 'mirela-popup'
  popup.innerHTML = `
    <div onclick="event.stopPropagation()" style="
      background:#1a1208;border:2px solid #8b6914;border-radius:12px;
      width:min(420px,92vw);max-height:80vh;display:flex;flex-direction:column;
      box-shadow:0 0 30px rgba(139,105,20,0.4);">

      <!-- Header -->
      <div style="padding:14px 16px;border-bottom:1px solid #8b6914;
        display:flex;align-items:center;gap:10px;">
        <div style="width:48px;height:48px;border-radius:50%;background:#2a1f0a;
          border:2px solid #8b6914;display:flex;align-items:center;
          justify-content:center;font-size:1.6em;flex-shrink:0;">💰</div>
        <div style="flex:1;">
          <div style="color:#f0c040;font-size:16px;font-weight:bold;font-family:var(--font-title);">Mirela</div>
          <div style="color:#a0845c;font-size:12px;">Merchant Guild Representative</div>
        </div>
        <button onclick="document.getElementById('mirela-popup').remove()"
          style="background:none;border:none;color:#888;font-size:18px;cursor:pointer;">✕</button>
      </div>

      <!-- Dialogue -->
      <div style="padding:16px;flex:1;overflow-y:auto;">
        <div id="mirela-popup-dialogue" style="
          background:#0f0a02;border:1px solid #3a2f1a;border-radius:8px;
          padding:14px;color:#e8d5a0;font-size:14px;line-height:1.6;
          font-style:italic;min-height:60px;">
          <span style="color:#555">...</span>
        </div>
      </div>

      <!-- Actions -->
      <div style="padding:10px 16px;border-top:1px solid #2a1f0a;display:flex;flex-direction:column;gap:6px;">

        <button id="mirela-inn-popup-btn"
          onclick="handleMirelaInn()"
          style="background:#2a1f0a;border:1px solid #8b6914;color:#f0c040;
          padding:9px 16px;border-radius:6px;cursor:pointer;font-size:13px;text-align:left;">
          ${innLabel}
        </button>

        <button onclick="
          document.getElementById('mirela-popup').remove();
          showMerchantPanel('merchant-panel-inventory');
          renderInventory();
          updateInventorySlotIndicator();"
          style="background:#2a1f0a;border:1px solid #8b6914;color:#f0c040;
          padding:9px 16px;border-radius:6px;cursor:pointer;font-size:13px;text-align:left;">
          🎒 View Inventory
        </button>

        <button onclick="
          document.getElementById('mirela-popup').remove();
          showMerchantPanel('merchant-panel-shop');
          renderShop();"
          style="background:#2a1f0a;border:1px solid #8b6914;color:#f0c040;
          padding:9px 16px;border-radius:6px;cursor:pointer;font-size:13px;text-align:left;">
          🏪 Browse Shop
        </button>

        ${auctionBtn}
        ${blackwingBtn}

      </div>
    </div>`

  popup.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:1000;
    display:flex;align-items:center;justify-content:center;`
  popup.onclick = () => popup.remove()
  document.body.appendChild(popup)

  // Fetch Mirela dialogue
  try {
    const { data: { session } } = await dbClient.auth.getSession()
    const res = await fetch('https://xagwrqrgcuuitwgroiwh.supabase.co/functions/v1/talk-to-npc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ npc_id: 'mirela', message_type: 'greet', character_id: state.character_id })
    })
    const data = await res.json()
    await typeNPCPopupDialogue('mirela-popup-dialogue', data.response || '...')
  } catch(err) {
    document.getElementById('mirela-popup-dialogue').textContent = '*Mirela looks up from her ledger*'
  }
}

// ============================================================
// MIRELA INN HANDLER
// ============================================================
async function handleMirelaInn() {
  const rank = state.reputationTitle || 'citizen'
  const INN_DISCOUNTS = {
    citizen:1.00, baron:0.90, chief:0.75, mayor:0.50, viscount:0.20, count:0.00
  }
  const baseCost = GAME_CONFIG.inn_cost || 10000
  const innCost = Math.floor(baseCost * (INN_DISCOUNTS[rank] ?? 1.00))

  if (state.gold >= innCost || innCost === 0) {
    if (innCost > 0) addGold(-innCost)
    const hh = Math.floor(state.maxHp * 0.5)
    const mh = Math.floor(state.maxMp * 0.5)
    state.hp = Math.min(state.maxHp, state.hp + hh)
    state.mp = Math.min(state.maxMp, state.mp + mh)
    addLog(`Rested: +${formatNumber(hh)} HP +${formatNumber(mh)} MP. Cost ${formatNumber(innCost)}g.`, 'good')
    notify(`🛏️ Rested! +${formatNumber(hh)} HP +${formatNumber(mh)} MP`, 'var(--green)')
    updateUI()
    savePlayerToSupabase()

    // Fetch inn response from Edge Function
    try {
      const { data: { session } } = await dbClient.auth.getSession()
      const res = await fetch('https://xagwrqrgcuuitwgroiwh.supabase.co/functions/v1/talk-to-npc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ npc_id: 'mirela', message_type: 'inn', character_id: state.character_id })
      })
      const data = await res.json()
      await typeNPCPopupDialogue('mirela-popup-dialogue', data.response || '...')
    } catch(err) {
      document.getElementById('mirela-popup-dialogue').textContent = '*Mirela nods as you head upstairs*'
    }
  } else {
    notify(`🛏️ Need ${formatNumber(innCost)}g to rest!`, 'var(--red)')
    await typeNPCPopupDialogue('mirela-popup-dialogue', `You cannot afford to rest here. ${formatNumber(innCost)}g required. Come back when you have the gold.`)
  }
}

// ============================================================
// TYPING ANIMATION FOR POPUP DIALOGUE
// ============================================================
async function typeNPCPopupDialogue(elementId, text) {
  const el = document.getElementById(elementId)
  if (!el) return
  const clean = text.replace(/^["']|["']$/g, '').trim()
  el.textContent = ''
  for (let i = 0; i < clean.length; i++) {
    el.textContent += clean[i]
    await new Promise(r => setTimeout(r, 15))
  }
}

// ============================================================
// INVENTORY SLOT INDICATOR
// ============================================================
function updateInventorySlotIndicator() {
  const el = document.getElementById('inventory-slot-indicator');
  if (!el) return;

  const rank = state.reputationTitle || 'citizen';
  const slots = GAME_CONFIG.inventory_slots_by_rank?.[rank] || { equipment: 20, consumable: 20, material: 20 };
  const tab = state.invTab || 'equipment';
  const limit = slots[tab] || 20;

  // ✅ FIX: Access the specific array for the tab first
  const categoryArray = state.inventory[tab] || [];
  const current = Array.isArray(categoryArray) ? categoryArray.length : 0;

  el.textContent = `${current}/${limit} slots`;
  el.style.color = current >= limit ? 'var(--red)' : 'var(--text-dim)';
}

// ============================================================
// UPDATED switchMerchantTab — simplified
// ============================================================
function switchMerchantTab(tab, btn) {
  // Reset merchant hall to default view when leaving
  if (tab !== 'merchant') {
    document.getElementById('merchant-default-view').style.display = 'flex'
    document.getElementById('merchant-content-view').style.display = 'none'
    document.querySelectorAll('[id^="merchant-panel-"]').forEach(p => p.style.display = 'none')
  }
  const panel = document.getElementById(`merchant-panel-${tab}`)
  if (panel) panel.style.display = 'flex'

  if (tab === 'inventory') { renderInventory(); updateInventorySlotIndicator() }
  if (tab === 'shop')      renderShop()
  if (tab === 'craft')     renderCrafting()
  if (tab === 'auction')   fetchAuctions('auction')
  if (tab === 'blackwing') fetchAuctions('blackwing')
}

// ===== ENEMY STATS DISPLAY MANAGER =====

const enemyStatsPanel = document.getElementById('enemy-stats-panel');
const enemyStats = {
  name: document.getElementById('enemy-stats-name'),
  level: document.getElementById('enemy-stats-level'),
  hpBar: document.getElementById('enemy-hp-bar'),
  hpValue: document.getElementById('enemy-hp-val'),
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
 // updateEnemyHP(enemy.hp, enemy.maxHp);

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




// ── ITEM HELPERS ──
const SLOT_ICONS={weapon:'⚔️',armor:'🛡️',helmet:'⛑️',boots:'👢',ring:'💍',amulet:'📿'};
const EQUIP_PREFIXES={legendary:['Divine','Mythic','Godforged','Ancient','Eternal','Celestial'],epic:['Heroic','Valiant','Exalted','Magnificent','Radiant'],rare:['Polished','Reinforced','Enchanted','Gleaming'],uncommon:['Sturdy','Sharpened','Improved','Sturdy'],normal:['Iron','Wooden','Basic','Simple']};
const EQUIP_NAMES={weapon:['Blade','Sword','Axe','Spear','Dagger','Staff','Bow'],armor:['Plate','Chainmail','Robe','Leather','Cuirass'],helmet:['Helm','Crown','Hood','Circlet','Visor'],boots:['Greaves','Sabatons','Boots','Treads'],ring:['Band','Seal','Loop','Signet'],amulet:['Pendant','Amulet','Talisman','Necklace']};
const EQUIP_STATS={weapon:{str:[35,55],strMult:[0.1,0.5],lifeSteal:[0.01,0.09],crit:[2,5],hit:[80,120],hitMult:[0.1,0.5]},armor:{armor:[5000,10000],sta:[35,55],staMult:[0.1,0.5],maxHp:[2000,3000],maxHpMult:[0.1,0.5],hpRegen:[25,750],hpRegenMult:[0.1,0.5],dodge:[30,700],dodgeMult:[0.1,0.5]},helmet:{armor:[5000,10000],int:[35,55],intMult:[0.05,0.09]},boots:{armor:[5000,10000],agi:[35,55],agiMult:[0.1,0.5]},ring:{str:[35,55],int:[35,55],agi:[35,55],sta:[35,55]},amulet:{strMult:[0.05,0.09],agiMult:[0.05,0.09],intMult:[0.05,0.09],staMult:[0.05,0.09]}};

function getEquipStats(slot, stageId) {
  const s = stageId || 1;
  const base = s * 12; // linear scaling — stage 1=12, stage 5=60, stage 10=120

  const statSets = {
    weapon:  { str:[base*0.8,base*1.4], strMult:[0.01*s,0.03*s], lifeSteal:[0.01,0.02*s], crit:[s*0.5,s*1.5], hit:[base*0.3,base*0.6], hitMult:[0.01*s,0.03*s] },
    armor:   { armor:[base*2,base*5], sta:[base*0.5,base*1.0], staMult:[0.01*s,0.03*s], maxHp:[base*3,base*8], maxHpMult:[0.01*s,0.03*s], hpRegen:[base*0.5,base*1.5], dodgeMult:[0.01*s,0.03*s], dodge:[base*0.5,base*2] },
    helmet:  { armor:[base*1.5,base*3], int:[base*0.5,base*1.0], intMult:[0.01*s,0.03*s], attackPower:[base*1,base*3] },
    boots:   { armor:[base*1.5,base*3], agi:[base*0.5,base*1.0], agiMult:[0.01*s,0.03*s] },
    ring:    { str:[base*0.4,base*0.8], int:[base*0.4,base*0.8], agi:[base*0.4,base*0.8], sta:[base*0.4,base*0.8] },
    amulet:  { strMult:[0.01*s,0.03*s], agiMult:[0.01*s,0.03*s], intMult:[0.01*s,0.03*s], staMult:[0.01*s,0.03*s] },
  };
  return statSets[slot];
}

function mkEquipDrop(slot, rarity, stageId = 1) {
  rarity = applyRarityBonus(rarity);
  const mult = RARITY[rarity].mult;
  const base = Math.pow(stageId, 2.2) * 8;
  const prefix = EQUIP_PREFIXES[rarity][Math.floor(Math.random() * EQUIP_PREFIXES[rarity].length)];
  const suffix = EQUIP_NAMES[slot][Math.floor(Math.random() * EQUIP_NAMES[slot].length)];
  const stats = {};
  const statRanges = getEquipStats(slot, stageId);
  Object.entries(statRanges).forEach(([k, [mn, mx]]) => {
    const raw = (Math.random() * (mx - mn) + mn) * mult;
    stats[k] = mx < 1 ? Math.round(raw * 1000) / 1000 : Math.round(raw);
  });
  return {
    uid: genUid(),
    name: `${SLOT_ICONS[slot]} ${prefix} ${suffix}`,
    category: 'equipment',
    slot, rarity, stats, equipped: false,
    levelReq: (stageId - 1) * 10,
    sellPrice: Math.round(stageId * 12 * mult * 500),
  };
}
function mkMat(name,rarity,sellPrice){return{uid:genUid(),name,category:'material',rarity,sellPrice,stackable:true,qty:1};}
function mkCons(name,rarity,sellPrice,hpVal){return{uid:genUid(),name,category:'consumable',rarity,sellPrice,stackable:true,qty:1,effect:'hp',val:hpVal};}
function genUid() {
  return 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
}
function applyRarityBonus(rarity){
  const order=['normal','uncommon','rare','epic','legendary'];
  const bonus=(DIFFICULTY[state.difficulty||'normal'].rarityBonus)||0;
  return order[Math.min(order.length-1,order.indexOf(rarity)+bonus)];
}

// ── MAT TABLES (2 mats per stage: common + rare) ──
const STAGE_MATS = {
  1:  { common:{name:'🐺 Wolf Fang',      rarity:'normal'},   rare:{name:'🐺 Alpha Pelt',      rarity:'uncommon'} },
  2:  { common:{name:'🕸️ Spider Silk',    rarity:'normal'},   rare:{name:'🕷️ Venom Gland',     rarity:'uncommon'} },
  3:  { common:{name:'🪓 Goblin Scrap',   rarity:'uncommon'}, rare:{name:'👹 Warlord Crest',   rarity:'rare'}     },
  4:  { common:{name:'💀 Bone Shard',     rarity:'uncommon'}, rare:{name:'💀 Death Essence',   rarity:'rare'}     },
  5:  { common:{name:'👊 Stone Core',     rarity:'uncommon'}, rare:{name:'👊 Chieftain Brand', rarity:'rare'}     },
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
  // Soul weapon material drops from bosses only
  if (isBoss) {
    const SOUL_MAT_DROPS = {
      3:  { warrior:'⚔️ Warlord Soul',   shaman:'⚡ Storm Crystal' },
      4:  { paladin:'✨ Holy Relic' },
      5:  { warrior:'⚔️ Warlord Soul',   berserker:'🩸 Rage Stone' },
      6:  { rogue:'🗡️ Shadow Shard' },
      7:  { hunter:'🏹 Eagle Eye' },
      8:  { necromancer:'💀 Soul Gem' },
      9:  { mage:'🔮 Arcane Core' },
      10: { berserker:'🩸 Rage Stone',   mage:'🔮 Arcane Core' },
    };
    const drops = SOUL_MAT_DROPS[stageId];
    if (drops && state.class) {
      const classKey = state.class.toLowerCase();
      const matName = drops[classKey];
      if (matName) {
        const qty = Math.floor(Math.random() * 3) + 1;
        const mat = mkMat(matName, 'epic', qty);
        addToInventory(mat);
        addLog(`✨ ${matName} x${qty} dropped! (Soul Weapon material)`, 'legendary');
        notify(`✨ Soul material dropped!`, 'var(--legendary)');
      }
    }
  }
}

// BUG FIX #9: The old key builder did:
//   'equip' + k.charAt(0).toUpperCase() + k.slice(1)
// This works for flat stats:  str     → equipStr      ✅
// But breaks for multipliers: strMult → equipStrmult  ❌ (lowercase 'm')
// The correct key is equipStrMult (capital M).
//
// Fix: map known multiplier stat keys to their correct equip field names
// explicitly, and fall back to the old builder only for flat stats.

const SOUL_WEAPON_STAT_KEY_MAP = {
  // flat stats — old builder works fine for these
  str:          'equipStr',
  agi:          'equipAgi',
  int:          'equipInt',
  sta:          'equipSta',
  armor:        'equipArmor',
  crit:         'equipCrit',
  dodge:        'equipDodge',
  hit:          'equipHit',
  hpRegen:      'equipHpRegen',
  mpRegen:      'equipMpRegen',
  attackPower:  'equipAttackPower',
  maxHp:        'equipMaxHp',
  maxMp:        'equipMaxMp',
  lifeSteal:    'equipLifeSteal',
  // multiplier stats — old builder got these wrong
  strMult:          'equipStrMult',
  agiMult:          'equipAgiMult',
  intMult:          'equipIntMult',
  staMult:          'equipStaMult',
  armorMult:        'equipArmorMult',
  critMult:         'equipCritMult',
  dodgeMult:        'equipDodgeMult',
  hitMult:          'equipHitMult',
  hpRegenMult:      'equipHpRegenMult',
  mpRegenMult:      'equipMpRegenMult',
  attackPowerMult:  'equipAttackPowerMult',
  maxHpMult:        'equipMaxHpMult',
  maxMpMult:        'equipMaxMpMult',
  lifeStealMult:    'equipLifeStealMult',
};
function findInventoryItem(uid) {
  return Object.values(state.inventory)
    .flat()
    .find(i => String(i.uid) === String(uid));
}

function getSoulWeaponEquipKey(statKey) {
  // Use explicit map if available, otherwise fall back to old builder
  return SOUL_WEAPON_STAT_KEY_MAP[statKey]
    || ('equip' + statKey.charAt(0).toUpperCase() + statKey.slice(1));
}

async function equipSoulWeapon(uid) {
  const item = findInventoryItem(uid);
  if (!item || item.category !== 'soul_weapon') return;

  const classKey = state.class?.toLowerCase();

  // ── Remove old soul weapon stats ──
  if (state.soulWeapon) {
    const sw  = SOUL_WEAPONS[state.soulWeapon.classId];
    const old = sw?.tiers.find(t => t.tier === state.soulWeapon.tier);
    if (old) {
      Object.entries(old.stats).forEach(([k, v]) => {
        const ek = getSoulWeaponEquipKey(k);
        state[ek] = (state[ek] || 0) - v;
      });
    }
  }

  // ── Apply new soul weapon stats ──
  Object.entries(item.stats || {}).forEach(([k, v]) => {
    const ek = getSoulWeaponEquipKey(k);
    state[ek] = (state[ek] || 0) + v;
  });

  // ── Track crafted tier ──
  state.craftedSoulTiers[classKey] = item.soulTier;

  // ── Bind to character ──
  state.soulWeapon = { classId: classKey, tier: item.soulTier, name: item.name, uid: item.uid };

  // ── Remove from inventory ──
  state.inventory = state.inventory.filter(i => i.uid !== uid);

  calcStats();
  renderSoulWeaponSlot();
  renderSkillBar();
  updateUI();
  await savePlayerToSupabase();
}

// ── CRAFTING ──
// All results have guaranteed high stats — better than random drops of same rarity.
const CRAFTING = [
  // ── STAGE 1-2 MATS → Rare weapons/armor ──
  {
    id:'craft_wolf_blade',
    result:{name:'⚔️ Wolfstrike Blade',slot:'weapon',rarity:'rare',levelReq:20,
      stats:{str:280,strMult:0.15,crit:3,lifeSteal:0.15,hitMult:0.15},category:'equipment'},
    req:[{name:'🐺 Wolf Fang',qty:50},{name:'🐺 Alpha Pelt',qty:10}],
    desc:'A blade carved from the Alpha\'s fangs. Guaranteed crit and lifesteal.'
  },
  {
    id:'craft_wolf_armor',
    result:{name:'🛡️ Wolfstrike Armor',slot:'armor',rarity:'rare',levelReq:20,
      stats:{armor:20000,sta:280,maxHp:1550,hpRegen:330,dodge:50,staMul:0.15,dodgeMult:0.15},category:'equipment'},
    req:[{name:'🐺 Wolf Fang',qty:50},{name:'🐺 Alpha Pelt',qty:10}],
    desc:'An armor crafted from the Alpha\'s pelt. Guaranteed survival.'
  },
  {
    id:'craft_wolf_boot',
    result:{name:'👢 Wolfstrike Boots',slot:'boots',rarity:'rare',levelReq:20,
      stats:{armor:5000,agi:280,maxHp:1550,dodge:50,agiMult:0.15,dodgeMult:0.15},category:'equipment'},
    req:[{name:'🐺 Wolf Fang',qty:50},{name:'🐺 Alpha Pelt',qty:10}],
    desc:'A pair of boots crafted from the Alpha\'s pelt. Guaranteed agility.'
  },  
  {
    id:'craft_wolf_helm',
    result:{name:'⛑️ Wolfstrike Helm',slot:'helmet',rarity:'rare',levelReq:30,
      stats:{armor:5000,int:280,attackPower:1500,intMult:0.15},category:'equipment'},
    req:[{name:'🐺 Wolf Fang',qty:50},{name:'🐺 Alpha Pelt',qty:10}],
    desc:'A helm crafted from the Alpha\'s pelt. Guaranteed intelligence.'
  },
  {
    id:'craft_silk_blade',
    result:{name:'⚔️ Spiderweave Blade',slot:'weapon',rarity:'rare',levelReq:30,
      stats:{str:500,strMult:0.2,crit:5,lifeSteal:0.2,hitMult:0.2},category:'equipment'},
    req:[{name:'🕸️ Spider Silk',qty:50},{name:'🕷️ Venom Gland',qty:20}],
    desc:'Woven from spider silk — light but incredibly resilient.'
  },
  {
    id:'craft_silk_armor',
    result:{name:'🛡️ Spiderweave Armor',slot:'armor',rarity:'rare',levelReq:30,
      stats:{armor:50000,sta:500,maxHp:15500,hpRegen:3300,dodge:500,staMult:0.2,dodgeMult:0.2},category:'equipment'},
    req:[{name:'🕸️ Spider Silk',qty:50},{name:'🕷️ Venom Gland',qty:20}],
    desc:'Woven from spider silk — light but incredibly resilient.'
  },
  {
    id:'craft_silk_boot',
    result:{name:'👢 Spiderweave Boots',slot:'boots',rarity:'rare',levelReq:30,
      stats:{armor:20000,agi:500,agiMult:0.2},category:'equipment'},
    req:[{name:'🕸️ Spider Silk',qty:50},{name:'🕷️ Venom Gland',qty:20}],
    desc:'Woven from spider silk — light but incredibly resilient.'
  },
  {
    id:'craft_silk_helm',
    result:{name:'⛑️ Spiderweave Helm',slot:'helmet',rarity:'rare',levelReq:30,
      stats:{armor:20000,int:500,intMult:0.2},category:'equipment'},
    req:[{name:'🕸️ Spider Silk',qty:50},{name:'🕷️ Venom Gland',qty:20}],
    desc:'Woven from spider silk — light but incredibly durable.'
  },
  // ── STAGE 3-4 MATS → Epic weapons/armor/helmet ──
  {
    id:'craft_goblin_axe',
    result:{name:'⚔️ Warlord Cleaver',slot:'weapon',rarity:'epic',levelReq:40,
      stats:{str:1000,strMult:0.25,crit:7,lifeSteal:0.25,hitMult:0.25},category:'equipment'},
    req:[{name:'🪓 Goblin Scrap',qty:50},{name:'👹 Warlord Crest',qty:20}],
    desc:'Forged from Goblin war-steel. Comes with a permanent STR multiplier.'
  },
  {
    id:'craft_goblin_armor',
    result:{name:'🛡️ Warlord Armor',slot:'armor',rarity:'epic',levelReq:40,
      stats:{armor:80000,sta:1000,maxHp:25500,hpRegen:5300,dodge:3000,staMult:0.25,dodgeMult:0.25},category:'equipment'},
    req:[{name:'🪓 Goblin Scrap',qty:50},{name:'👹 Warlord Crest',qty:20}],
    desc:'Forged from Goblin war-steel. Comes with a permanent STR multiplier.'
  },
  {
    id:'craft_goblin_boots',
    result:{name:'👢 Warlord Boots',slot:'boots',rarity:'epic',levelReq:40,
      stats:{armor:20000,agi:1000,agiMult:0.25},category:'equipment'},
    req:[{name:'🪓 Goblin Scrap',qty:50},{name:'👹 Warlord Crest',qty:20}],
    desc:'Forged from Goblin war-steel. Comes with a permanent AGI multiplier.'
  },
  {
    id:'craft_goblin_helm',
    result:{name:'⛑️ Warlord Helm',slot:'helmet',rarity:'epic',levelReq:40,
      stats:{armor:20000,int:1000,intMult:0.25},category:'equipment'},
    req:[{name:'🪓 Goblin Scrap',qty:50},{name:'👹 Warlord Crest',qty:20}],
    desc:'Forged from Goblin war-steel. Comes with a permanent INT multiplier.'
  },
  {
    id:'craft_goblin_amulet',
    result:{name:'📿 Warlord Amulet',slot:'amulet',rarity:'epic',levelReq:40,
      stats:{armor:20000,strMult:1.5,agiMult:1.5,intMult:1.5,staMult:1.5,hitMult:1.5,dodgeMult:1.5},category:'equipment'},
    req:[{name:'🪓 Goblin Scrap',qty:50},{name:'👹 Warlord Crest',qty:20}],
    desc:'Forged from Goblin war-steel. Comes with a permanent stat multiplier.'
  },
  {
    id:'craft_death_blade',
    result:{name:'⚔️ Death Knight Blade',slot:'weapon',rarity:'epic',levelReq:50,
      stats:{str:2000,strMult:1.35,crit:9,lifeSteal:0.35,hitMult:1.35},category:'equipment'},
    req:[{name:'💀 Bone Shard',qty:50},{name:'💀 Death Essence',qty:20}],
    desc:'Forged from cursed bone. Boosts dodge permanently.'
  },
  {
    id:'craft_death_armor',
    result:{name:'🛡️ Death Knight Armor',slot:'armor',rarity:'epic',levelReq:50,
      stats:{armor:40800,sta:2000,maxHp:25500,hpRegen:5300,dodge:4000,staMult:1.35,dodgeMult:1.35},category:'equipment'},
    req:[{name:'💀 Bone Shard',qty:50},{name:'💀 Death Essence',qty:20}],
    desc:'Forged from cursed bone. Boosts dodge permanently.'
  },
  {
    id:'craft_death_boots',
    result:{name:'👢 Death Knight Boots',slot:'boots',rarity:'epic',levelReq:50,
      stats:{armor:40800,agi:2000,agiMult:1.35,dodgeMult:1.35},category:'equipment'},
    req:[{name:'💀 Bone Shard',qty:40},{name:'💀 Death Essence',qty:20}],
    desc:'Forged from cursed bone. Boosts dodge permanently.'
  },
  {
    id:'craft_death_helm',
    result:{name:'⛑️ Death Knight Helm',slot:'helmet',rarity:'epic',levelReq:50,
      stats:{armor:40800,int:2000,intMult:1.35},category:'equipment'},
    req:[{name:'💀 Bone Shard',qty:50},{name:'💀 Death Essence',qty:20}],
    desc:'Forged from cursed bone. Boosts dodge permanently.'
  },
  // ── STAGE 5-6 MATS → Epic boots/ring + Legendary weapon ──
  {
    id:'craft_stone_ring',
    result:{name:'💍 Warlord Signet',slot:'ring',rarity:'epic',levelReq:60,
      stats:{str:5800,sta:5800,agi:5800,int:5800},category:'equipment'},
    req:[{name:'👊 Stone Core',qty:100},{name:'👊 Chieftain Brand',qty:50}],
    desc:'The Orc Chieftain\'s ring — balanced power across all stats.'
  },
  {
    id:'craft_vampire_amulet',
    result:{name:'📿 Blood Pact Amulet',slot:'amulet',rarity:'legendary',levelReq:70,
      stats:{strMult:3.5,agiMult:3.5,staMult:3.5,intMult:3.5,hitMult:3.5,dodgeMult:3.5},category:'equipment'},
    req:[{name:'🩸 Blood Vial',qty:150},{name:'🧛 Vampire Fang',qty:70}],
    desc:'A pact sealed in vampire blood. Massive lifesteal and stat multipliers.'
  },
  // ── STAGE 7-8 MATS → Legendary armor/weapon ──
  {
    id:'craft_troll_sword',
    result:{name:'⚔️ Trollhide Sword',slot:'weapon',rarity:'legendary',levelReq:80,
      stats:{str:9000,strMult:2.4,crit:15,lifeSteal:0.7,hitMult:2.4},category:'equipment'},
    req:[{name:'💎 Troll Gem',qty:200},{name:'👾 Troll Heart',qty:150}],
    desc:'Practically indestructible. The ultimate dps weapon.'
  },
  {
    id:'craft_troll_plate',
    result:{name:'🛡️ Trollhide Plate',slot:'armor',rarity:'legendary',levelReq:80,
      stats:{armor:82000,sta:9000,maxHp:50000,maxHpMult:2.4,armorMult:2.4,hpRegenMult:2.4},category:'equipment'},
    req:[{name:'💎 Troll Gem',qty:200},{name:'👾 Troll Heart',qty:150}],
    desc:'Practically indestructible. The ultimate tank chest piece.'
  },
  {
    id:'craft_troll_boots',
    result:{name:'👢 Trollhide Boots',slot:'boots',rarity:'legendary',levelReq:80,
      stats:{armor:82000,agi:9000,agiMult:2.4},category:'equipment'},
    req:[{name:'💎 Troll Gem',qty:200},{name:'👾 Troll Heart',qty:150}],
    desc:'Practically indestructible. The ultimate tank chest piece.'
  },
  {
    id:'craft_troll_helm',
    result:{name:'⛑️ Trollhide Helm',slot:'helmet',rarity:'legendary',levelReq:80,
      stats:{armor:82000,int:9000,intMult:2.4},category:'equipment'},
    req:[{name:'💎 Troll Gem',qty:200},{name:'👾 Troll Heart',qty:150}],
    desc:'Practically indestructible. The ultimate tank chest piece.'
  },
  {
    id:'craft_hellfire_sword',
    result:{name:'⚔️ Hellfire Greatsword',slot:'weapon',rarity:'legendary',levelReq:90,
      stats:{str:15000,attackPower:20000,strMult:3.45,crit:25,hitMult:3.45},category:'equipment'},
    req:[{name:'😈 Demon Horn',qty:300},{name:'🔥 Hellfire Core',qty:200}],
    desc:'Forged in the Demon Citadel. The most powerful weapon in the mid-game.'
  },
  {
    id:'craft_hellfire_armor',
    result:{name:'🛡️ Hellfire Greatarmor',slot:'armor',rarity:'legendary',levelReq:90,
      stats:{armor:120000,sta:15000,dodge:20000,armorMult:3.45,staMult:3.45,dodgeMult:3.45},category:'equipment'},
    req:[{name:'😈 Demon Horn',qty:300},{name:'🔥 Hellfire Core',qty:200}],
    desc:'Forged in the Demon Citadel. The most powerful armor in the mid-game.'
  },
  {
    id:'craft_hellfire_boots',
    result:{name:'👢 Hellfire Greatboots',slot:'boots',rarity:'legendary',levelReq:90,
      stats:{armor:120000,agi:15000,agiMult:3.45},category:'equipment'},
    req:[{name:'😈 Demon Horn',qty:300},{name:'🔥 Hellfire Core',qty:200}],
    desc:'Forged in the Demon Citadel. The most powerful boots in the mid-game.'
  },
  {
    id:'craft_hellfire_helm',
    result:{name:'⛑️ Hellfire Great Helm',slot:'helmet',rarity:'legendary',levelReq:90,
      stats:{armor:120000,int:15000,intMult:3.45},category:'equipment'},
    req:[{name:'😈 Demon Horn',qty:300},{name:'🔥 Hellfire Core',qty:200}],
    desc:'Forged in the Demon Citadel. The most powerful helm in the mid-game.'
  },
  // ── STAGE 9-10 MATS → Legendary endgame gear ──
  {
    id:'craft_void_amulet',
    result:{name:'📿 Void Walker Amulet',slot:'amulet',rarity:'legendary',levelReq:95,
      stats:{strMult:6,agiMult:6,intMult:6,staMult:6,hitMult:6,dodgeMult:6},category:'equipment'},
    req:[{name:'🌑 Void Crystal',qty:350},{name:'🌑 Shadow Essence',qty:250}],
    desc:'Step between shadows. Best-in-slot amulet for any build.'
  },
  {
    id:'craft_eternal_ring',
    result:{name:'💍 Eternal Dominion Ring',slot:'ring',rarity:'legendary',levelReq:100,
      stats:{str:30000,agi:30000,int:30000,sta:30000},category:'equipment'},
    req:[{name:'🌟 Eternal Shard',qty:400},{name:'👑 Eternal Crown',qty:300}],
    desc:'The ultimate ring. Requires Stage 10 mats. Best-in-slot for any build.'
  },
  // ── SOUL WEAPON RECIPES ──
// Tier 1 — existing early mats
{ id:'soul_warrior_1', classReq:'warrior',
  result:{name:"⚔️ Warlord's Edge I", slot:'soul', rarity:'uncommon', levelReq:10, soulTier:1, category:'soul_weapon', stats:{str:500,crit:3,lifeSteal:0.15}},
  req:[{name:'🐺 Wolf Fang',qty:30},{name:'🐺 Alpha Pelt',qty:5}],
  desc:"Warrior only. Binds on craft. First step of the Warlord's Soul Weapon." },
{ id:'soul_mage_1', classReq:'mage',
  result:{name:"🔮 Arcane Tome I", slot:'soul', rarity:'uncommon', levelReq:10, soulTier:1, category:'soul_weapon', stats:{int:500,mpMult:0.1}},
  req:[{name:'🐺 Wolf Fang',qty:30},{name:'🐺 Alpha Pelt',qty:5}],
  desc:'Mage only. Binds on craft.' },
{ id:'soul_rogue_1', classReq:'rogue',
  result:{name:"🗡️ Shadow Blade I", slot:'soul', rarity:'uncommon', levelReq:10, soulTier:1, category:'soul_weapon', stats:{agi:500,crit:5,dodge:200}},
  req:[{name:'🐺 Wolf Fang',qty:30},{name:'🐺 Alpha Pelt',qty:5}],
  desc:'Rogue only. Binds on craft.' },
{ id:'soul_hunter_1', classReq:'hunter',
  result:{name:"🏹 Eagle Bow I", slot:'soul', rarity:'uncommon', levelReq:10, soulTier:1, category:'soul_weapon', stats:{agi:500,hit:200}},
  req:[{name:'🐺 Wolf Fang',qty:30},{name:'🐺 Alpha Pelt',qty:5}],
  desc:'Hunter only. Binds on craft.' },
{ id:'soul_paladin_1', classReq:'paladin',
  result:{name:"✨ Holy Mace I", slot:'soul', rarity:'uncommon', levelReq:10, soulTier:1, category:'soul_weapon', stats:{sta:500,armor:5000,hpRegen:200}},
  req:[{name:'🐺 Wolf Fang',qty:30},{name:'🐺 Alpha Pelt',qty:5}],
  desc:'Paladin only. Binds on craft.' },
{ id:'soul_necromancer_1', classReq:'necromancer',
  result:{name:"💀 Death Wand I", slot:'soul', rarity:'uncommon', levelReq:10, soulTier:1, category:'soul_weapon', stats:{int:500,lifeSteal:0.2}},
  req:[{name:'🐺 Wolf Fang',qty:30},{name:'🐺 Alpha Pelt',qty:5}],
  desc:'Necromancer only. Binds on craft.' },
{ id:'soul_shaman_1', classReq:'shaman',
  result:{name:"⚡ Storm Staff I", slot:'soul', rarity:'uncommon', levelReq:10, soulTier:1, category:'soul_weapon', stats:{int:500,hit:200,mpRegen:100}},
  req:[{name:'🐺 Wolf Fang',qty:30},{name:'🐺 Alpha Pelt',qty:5}],
  desc:'Shaman only. Binds on craft.' },
{ id:'soul_berserker_1', classReq:'berserker',
  result:{name:"🩸 Rage Axe I", slot:'soul', rarity:'uncommon', levelReq:10, soulTier:1, category:'soul_weapon', stats:{str:500,attackPower:1000}},
  req:[{name:'🐺 Wolf Fang',qty:30},{name:'🐺 Alpha Pelt',qty:5}],
  desc:'Berserker only. Binds on craft.' },

// Tier 2 — existing mats + class mat from boss 3-4
{ id:'soul_warrior_2', classReq:'warrior',
  result:{name:"⚔️ Warlord's Edge II", slot:'soul', rarity:'rare', levelReq:30, soulTier:2, category:'soul_weapon', stats:{str:1500,crit:6,lifeSteal:0.25,strMult:0.3}},
  req:[{name:'💀 Bone Shard',qty:30},{name:'⚔️ Warlord Soul',qty:5}],
  desc:'Warrior only. Upgrade from Tier 1.' },
{ id:'soul_mage_2', classReq:'mage',
  result:{name:"🔮 Arcane Tome II", slot:'soul', rarity:'rare', levelReq:30, soulTier:2, category:'soul_weapon', stats:{int:1500,mpMult:0.2,intMult:0.3}},
  req:[{name:'💀 Bone Shard',qty:30},{name:'🔮 Arcane Core',qty:5}],
  desc:'Mage only.' },
{ id:'soul_rogue_2', classReq:'rogue',
  result:{name:"🗡️ Shadow Blade II", slot:'soul', rarity:'rare', levelReq:30, soulTier:2, category:'soul_weapon', stats:{agi:1500,crit:8,dodge:500,agiMult:0.3}},
  req:[{name:'💀 Bone Shard',qty:30},{name:'🗡️ Shadow Shard',qty:5}],
  desc:'Rogue only.' },
{ id:'soul_hunter_2', classReq:'hunter',
  result:{name:"🏹 Eagle Bow II", slot:'soul', rarity:'rare', levelReq:30, soulTier:2, category:'soul_weapon', stats:{agi:1500,hit:600,agiMult:0.3}},
  req:[{name:'💀 Bone Shard',qty:30},{name:'🏹 Eagle Eye',qty:5}],
  desc:'Hunter only.' },
{ id:'soul_paladin_2', classReq:'paladin',
  result:{name:"✨ Holy Mace II", slot:'soul', rarity:'rare', levelReq:30, soulTier:2, category:'soul_weapon', stats:{sta:1500,armor:15000,hpRegen:600,staMult:0.3}},
  req:[{name:'💀 Bone Shard',qty:30},{name:'✨ Holy Relic',qty:5}],
  desc:'Paladin only.' },
{ id:'soul_necromancer_2', classReq:'necromancer',
  result:{name:"💀 Death Wand II", slot:'soul', rarity:'rare', levelReq:30, soulTier:2, category:'soul_weapon', stats:{int:1500,lifeSteal:0.4,intMult:0.3}},
  req:[{name:'💀 Bone Shard',qty:30},{name:'💀 Soul Gem',qty:5}],
  desc:'Necromancer only.' },
{ id:'soul_shaman_2', classReq:'shaman',
  result:{name:"⚡ Storm Staff II", slot:'soul', rarity:'rare', levelReq:30, soulTier:2, category:'soul_weapon', stats:{int:1500,hit:600,mpRegen:300,intMult:0.3}},
  req:[{name:'💀 Bone Shard',qty:30},{name:'⚡ Storm Crystal',qty:5}],
  desc:'Shaman only.' },
{ id:'soul_berserker_2', classReq:'berserker',
  result:{name:"🩸 Rage Axe II", slot:'soul', rarity:'rare', levelReq:30, soulTier:2, category:'soul_weapon', stats:{str:1500,attackPower:3000,strMult:0.3}},
  req:[{name:'💀 Bone Shard',qty:30},{name:'🩸 Rage Stone',qty:5}],
  desc:'Berserker only.' },

// Tier 3 — epic mats + more class mats
{ id:'soul_warrior_3', classReq:'warrior',
  result:{name:"⚔️ Warlord's Edge III", slot:'soul', rarity:'epic', levelReq:50, soulTier:3, category:'soul_weapon', stats:{str:4000,crit:10,lifeSteal:0.4,strMult:0.6}},
  req:[{name:'👊 Stone Core',qty:50},{name:'⚔️ Warlord Soul',qty:20}],
  desc:'Warrior only.' },
{ id:'soul_mage_3', classReq:'mage',
  result:{name:"🔮 Arcane Tome III", slot:'soul', rarity:'epic', levelReq:50, soulTier:3, category:'soul_weapon', stats:{int:4000,mpMult:0.3,intMult:0.6}},
  req:[{name:'👊 Stone Core',qty:50},{name:'🔮 Arcane Core',qty:20}],
  desc:'Mage only.' },
{ id:'soul_rogue_3', classReq:'rogue',
  result:{name:"🗡️ Shadow Blade III", slot:'soul', rarity:'epic', levelReq:50, soulTier:3, category:'soul_weapon', stats:{agi:4000,crit:12,dodge:1500,agiMult:0.6}},
  req:[{name:'👊 Stone Core',qty:50},{name:'🗡️ Shadow Shard',qty:20}],
  desc:'Rogue only.' },
{ id:'soul_hunter_3', classReq:'hunter',
  result:{name:"🏹 Eagle Bow III", slot:'soul', rarity:'epic', levelReq:50, soulTier:3, category:'soul_weapon', stats:{agi:4000,hit:2000,agiMult:0.6,crit:8}},
  req:[{name:'👊 Stone Core',qty:50},{name:'🏹 Eagle Eye',qty:20}],
  desc:'Hunter only.' },
{ id:'soul_paladin_3', classReq:'paladin',
  result:{name:"✨ Holy Mace III", slot:'soul', rarity:'epic', levelReq:50, soulTier:3, category:'soul_weapon', stats:{sta:4000,armor:40000,hpRegen:2000,staMult:0.6}},
  req:[{name:'👊 Stone Core',qty:50},{name:'✨ Holy Relic',qty:20}],
  desc:'Paladin only.' },
{ id:'soul_necromancer_3', classReq:'necromancer',
  result:{name:"💀 Death Wand III", slot:'soul', rarity:'epic', levelReq:50, soulTier:3, category:'soul_weapon', stats:{int:4000,lifeSteal:0.6,intMult:0.6}},
  req:[{name:'👊 Stone Core',qty:50},{name:'💀 Soul Gem',qty:20}],
  desc:'Necromancer only.' },
{ id:'soul_shaman_3', classReq:'shaman',
  result:{name:"⚡ Storm Staff III", slot:'soul', rarity:'epic', levelReq:50, soulTier:3, category:'soul_weapon', stats:{int:4000,hit:2000,mpRegen:1000,intMult:0.6}},
  req:[{name:'👊 Stone Core',qty:50},{name:'⚡ Storm Crystal',qty:20}],
  desc:'Shaman only.' },
{ id:'soul_berserker_3', classReq:'berserker',
  result:{name:"🩸 Rage Axe III", slot:'soul', rarity:'epic', levelReq:50, soulTier:3, category:'soul_weapon', stats:{str:4000,attackPower:8000,strMult:0.6}},
  req:[{name:'👊 Stone Core',qty:50},{name:'🩸 Rage Stone',qty:20}],
  desc:'Berserker only.' },

// Tier 4 — legendary mats + class mats
{ id:'soul_warrior_4', classReq:'warrior',
  result:{name:"⚔️ Warlord's Edge IV", slot:'soul', rarity:'legendary', levelReq:75, soulTier:4, category:'soul_weapon', stats:{str:9000,crit:15,lifeSteal:0.6,strMult:1.2}},
  req:[{name:'😈 Demon Horn',qty:100},{name:'⚔️ Warlord Soul',qty:50}],
  desc:'Warrior only.' },
{ id:'soul_mage_4', classReq:'mage',
  result:{name:"🔮 Arcane Tome IV", slot:'soul', rarity:'legendary', levelReq:75, soulTier:4, category:'soul_weapon', stats:{int:9000,mpMult:0.5,intMult:1.2}},
  req:[{name:'😈 Demon Horn',qty:100},{name:'🔮 Arcane Core',qty:50}],
  desc:'Mage only.' },
{ id:'soul_rogue_4', classReq:'rogue',
  result:{name:"🗡️ Shadow Blade IV", slot:'soul', rarity:'legendary', levelReq:75, soulTier:4, category:'soul_weapon', stats:{agi:9000,crit:18,dodge:4000,agiMult:1.2}},
  req:[{name:'😈 Demon Horn',qty:100},{name:'🗡️ Shadow Shard',qty:50}],
  desc:'Rogue only.' },
{ id:'soul_hunter_4', classReq:'hunter',
  result:{name:"🏹 Eagle Bow IV", slot:'soul', rarity:'legendary', levelReq:75, soulTier:4, category:'soul_weapon', stats:{agi:9000,hit:5000,agiMult:1.2,crit:15}},
  req:[{name:'😈 Demon Horn',qty:100},{name:'🏹 Eagle Eye',qty:50}],
  desc:'Hunter only.' },
{ id:'soul_paladin_4', classReq:'paladin',
  result:{name:"✨ Holy Mace IV", slot:'soul', rarity:'legendary', levelReq:75, soulTier:4, category:'soul_weapon', stats:{sta:9000,armor:90000,hpRegen:5000,staMult:1.2}},
  req:[{name:'😈 Demon Horn',qty:100},{name:'✨ Holy Relic',qty:50}],
  desc:'Paladin only.' },
{ id:'soul_necromancer_4', classReq:'necromancer',
  result:{name:"💀 Death Wand IV", slot:'soul', rarity:'legendary', levelReq:75, soulTier:4, category:'soul_weapon', stats:{int:9000,lifeSteal:0.8,intMult:1.2}},
  req:[{name:'😈 Demon Horn',qty:100},{name:'💀 Soul Gem',qty:50}],
  desc:'Necromancer only.' },
{ id:'soul_shaman_4', classReq:'shaman',
  result:{name:"⚡ Storm Staff IV", slot:'soul', rarity:'legendary', levelReq:75, soulTier:4, category:'soul_weapon', stats:{int:9000,hit:5000,mpRegen:3000,intMult:1.2}},
  req:[{name:'😈 Demon Horn',qty:100},{name:'⚡ Storm Crystal',qty:50}],
  desc:'Shaman only.' },
{ id:'soul_berserker_4', classReq:'berserker',
  result:{name:"🩸 Rage Axe IV", slot:'soul', rarity:'legendary', levelReq:75, soulTier:4, category:'soul_weapon', stats:{str:9000,attackPower:20000,strMult:1.2}},
  req:[{name:'😈 Demon Horn',qty:100},{name:'🩸 Rage Stone',qty:50}],
  desc:'Berserker only.' },

// Tier 5 — endgame class mats only
{ id:'soul_warrior_5', classReq:'warrior',
  result:{name:"⚔️ Soul of the Warlord", slot:'soul', rarity:'legendary', levelReq:100, soulTier:5, category:'soul_weapon', stats:{str:20000,crit:25,lifeSteal:1.0,strMult:2.5}},
  req:[{name:'⚔️ Warlord Soul',qty:200}],
  desc:'Warrior only. Final form. Unlocks Colossus Smash.' },
{ id:'soul_mage_5', classReq:'mage',
  result:{name:"🔮 Arcane Grimoire", slot:'soul', rarity:'legendary', levelReq:100, soulTier:5, category:'soul_weapon', stats:{int:20000,mpMult:1.0,intMult:2.5}},
  req:[{name:'🔮 Arcane Core',qty:200}],
  desc:'Mage only. Final form. Unlocks Arcane Overload.' },
{ id:'soul_rogue_5', classReq:'rogue',
  result:{name:"🗡️ Shadow Covenant", slot:'soul', rarity:'legendary', levelReq:100, soulTier:5, category:'soul_weapon', stats:{agi:20000,crit:30,dodge:10000,agiMult:2.5}},
  req:[{name:'🗡️ Shadow Shard',qty:200}],
  desc:'Rogue only. Final form. Unlocks Death Mark.' },
{ id:'soul_hunter_5', classReq:'hunter',
  result:{name:"🏹 Eagle Pact", slot:'soul', rarity:'legendary', levelReq:100, soulTier:5, category:'soul_weapon', stats:{agi:20000,hit:12000,agiMult:2.5,crit:25}},
  req:[{name:'🏹 Eagle Eye',qty:200}],
  desc:'Hunter only. Final form. Unlocks Killshot.' },
{ id:'soul_paladin_5', classReq:'paladin',
  result:{name:"✨ Divine Covenant", slot:'soul', rarity:'legendary', levelReq:100, soulTier:5, category:'soul_weapon', stats:{sta:20000,armor:200000,hpRegen:15000,staMult:2.5}},
  req:[{name:'✨ Holy Relic',qty:200}],
  desc:'Paladin only. Final form. Unlocks Divine Wrath.' },
{ id:'soul_necromancer_5', classReq:'necromancer',
  result:{name:"💀 Tome of the Damned", slot:'soul', rarity:'legendary', levelReq:100, soulTier:5, category:'soul_weapon', stats:{int:20000,lifeSteal:1.5,intMult:2.5}},
  req:[{name:'💀 Soul Gem',qty:200}],
  desc:'Necromancer only. Final form. Unlocks Soul Harvest.' },
{ id:'soul_shaman_5', classReq:'shaman',
  result:{name:"⚡ Stormbinder", slot:'soul', rarity:'legendary', levelReq:100, soulTier:5, category:'soul_weapon', stats:{int:20000,hit:12000,mpRegen:8000,intMult:2.5}},
  req:[{name:'⚡ Storm Crystal',qty:200}],
  desc:'Shaman only. Final form. Unlocks Tempest.' },
{ id:'soul_berserker_5', classReq:'berserker',
  result:{name:"🩸 Bloodrage Axe", slot:'soul', rarity:'legendary', levelReq:100, soulTier:5, category:'soul_weapon', stats:{str:20000,attackPower:50000,strMult:2.5}},
  req:[{name:'🩸 Rage Stone',qty:200}],
  desc:'Berserker only. Final form. Unlocks Rampage.' },
];

// ── TREASURE CHEST ──
const TREASURE_TABLES={
  1:{rolls:2,tier:'normal'},  2:{rolls:2,tier:'uncommon'},
  3:{rolls:3,tier:'uncommon'},4:{rolls:3,tier:'rare'},
  5:{rolls:3,tier:'rare'},    6:{rolls:4,tier:'epic'},
  7:{rolls:4,tier:'epic'},    8:{rolls:4,tier:'epic'},
  9:{rolls:5,tier:'legendary'},10:{rolls:5,tier:'legendary'}
};

function rollTreasureRarity(tier) {
  const r = Math.random();
  switch (tier) {
    case 'normal':    return r < 0.25 ? 'uncommon' : 'normal';
    case 'uncommon':  return r < 0.25 ? 'rare' : 'uncommon';
    case 'rare':      return r < 0.20 ? 'rare' : 'uncommon';   // capped at rare, no epic
    case 'epic':      return r < 0.08 ? 'legendary' : 'epic';
    case 'legendary': return r < 0.15 ? 'legendary' : 'epic';
    default:          return 'normal';
  }
}
function dropTreasureBox(stageId){
  const bossNames={
    1:'Wolf King',2:'Spider Queen',3:'Goblin Warlord',4:'Skeleton Lord',5:'Orc Chieftain',
    6:'Vampire Lord',7:'Troll King',8:'Demon Prince',9:'Shadow Emperor',10:'Eternal King'
  };
  const chestNames={
    1:'📦 Worn Chest',2:'📦 Wooden Chest',3:'📦 Iron Chest',4:'📦 Steel Chest',
    5:'📦 Golden Chest',6:'📦 Enchanted Chest',7:'📦 Ancient Chest',
    8:'📦 Demonic Chest',9:'📦 Shadow Chest',10:'📦 Eternal Chest'
  };
  const bossName=bossNames[stageId]||'Unknown Boss';
  const chestName=chestNames[stageId]||'📦 Mystery Chest';
  const box={
  uid:genUid(),
  name:chestName,                          // short — for inventory grid
  displayName:`${bossName}'s ${chestName}`, // full — for popup
  
    category:'consumable',
    rarity:stageId<=2?'normal':stageId<=4?'uncommon':stageId<=6?'rare':stageId<=8?'epic':'legendary',
    effect:'treasure',
    stageId,
    sourceMonster:`stage_boss_${stageId}`,
    sourceBossName:bossName,
    difficulty:state.difficulty||'normal',
    droppedAt:new Date().toISOString(),
    stackable:false,
    qty:1,
    sellPrice:1000*stageId
  };
  addToInventory(box);
  addLog(`📦 ${bossName}'s ${chestName} added to inventory!`,'legendary');
  notify(`📦 ${bossName}'s ${chestName} dropped!`,'var(--gold)');
  playSound('snd-levelup');
}
function openTreasureBox(box){
  const MAX_STAGE=10;
  const stageId=Math.min(MAX_STAGE,Math.max(1,currentStage?.id||box.stageId||1));
  const difficulty=state.difficulty||'normal';
  const diff=DIFFICULTY[difficulty];
  const table=TREASURE_TABLES[stageId];if(!table)return;
  const slots=['weapon','armor','helmet','boots','ring','amulet'];
  const items=[];

  for(let i=0;i<table.rolls;i++){
    let rarity=rollTreasureRarity(table.tier);
    const slot=slots[Math.floor(Math.random()*slots.length)];
    const item=mkEquipDrop(slot,rarity,stageId);
    const before=state.inventory.length;
    addToInventory(item);
    const added=state.inventory.length>before||
      (item.stackable&&state.inventory.find(i=>i.name===item.name));
    if(added){
      items.push(item);
      if(item.rarity==='legendary')state.quests.legendary.done=true;
    }
  }

  if(items.length<table.rolls){
    const lost=table.rolls-items.length;
    notify(`⚠️ ${lost} item(s) lost — bag full! Sell items before opening chests.`,'var(--red)');
    addLog(`⚠️ ${lost} chest item(s) discarded due to full bag.`,'bad');
  }

  const matCount=2+Math.floor(Math.random()*2);
  for(let i=0;i<matCount;i++)rollMatDrop(stageId,false);

  const bonusGold=Math.floor(1000*stageId*diff.goldMult);
  addGold(bonusGold); // ✅ sanitized

  const bossName=box.sourceBossName||`Stage ${stageId} Boss`;
  notify(`📦 ${bossName}'s chest opened! ${items.length} items found!`,'var(--gold)');
  addLog(`📦 ${box.displayName||box.name} opened!`,'legendary');
  items.forEach(item=>addLog(`  ${item.name} [${(RARITY[item.rarity]||RARITY.normal).label}]`,
    item.rarity==='legendary'?'legendary':item.rarity==='epic'?'epic':'gold'));
  addLog(`💰 +${formatNumber(bonusGold)} Gold!`,'gold');
  playSound('snd-levelup');
  spawnParticles(window.innerWidth/2,window.innerHeight/2,'#f0c040',20);

  // Track drops in Supabase
  if(state.character_id&&items.length>0){
    const drops=items.map(item=>({name:item.name,rarity:item.rarity}));
    dbClient.rpc('record_monster_kill',{
      p_monster_id:box.sourceMonster||`stage_boss_${stageId}`,
      p_character_id:state.character_id,
      p_stage_id:stageId,
      p_drops:drops,
      p_difficulty:difficulty
    }).then(({error})=>{if(error)console.warn('treasure drop tracking failed:',error.message);});
  }

  renderInventory();updateUI();renderQuests();
}

// ── LEVEL UP ──
function checkLevelUp(){
  while(state.xp>=state.xpNext&&state.level<state.maxLevel){
    state.xp-=state.xpNext;state.level++;
    state.xpNext=Math.floor(state.level*100*50.00);
    
    // Read from config
const lvlRewards = GAME_CONFIG.level_up_rewards || {};
const autoStats = lvlRewards.auto_stats_per_level ?? 10;
const freeStats = lvlRewards.free_stat_points_per_level ?? 5;
const legacyPts = lvlRewards.legacy_points_per_level ?? 2;

// Auto stats
state.baseStr += autoStats;
state.baseAgi += autoStats;
state.baseInt += autoStats;
state.baseSta += autoStats;

// Talent points (unchanged)
state.talentPoints += 5;

// New points
state.freeStatPoints = (state.freeStatPoints || 0) + freeStats;
state.legacyPoints = (state.legacyPoints || 0) + legacyPts;

addLog(`🎉 LEVEL UP! Level ${state.level}! +5 Talent Points, +${freeStats} Stat Points, +${legacyPts} Legacy Points!`, 'gold');
    calcStats();state.hp=state.maxHp;state.mp=state.maxMp;
    document.getElementById('char-level').textContent=`Level ${state.level} / 100`;    
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
function checkTalentUnlocks() {
  if (!state.class) return;
  const c = CLASSES[state.class];
  Object.entries(c.trees).forEach(([treeId, tree]) => {
    tree.talents.forEach(talent => {
      const flagKey = `${state.class}_${talent.id}`;
      // ONLY mark as available — never push to unlockedTalents
      // and never call talent.effect() here
      // unlockedTalents is ONLY for tracking spent ranks
      if (!state.talentUnlockedFlags[flagKey]) {
        state.talentUnlockedFlags[flagKey] = true;
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
    // Show respec cost if already has class
  const respecHtml = state.class ? `
    <div style="text-align:center;margin-top:12px;font-size:.78em;color:var(--text-dim);">
      Next respec cost: <span style="color:var(--gold);">${formatNumber(cost)}g</span>
    </div>` : '';

  document.getElementById('class-screen').innerHTML = `
    <div class="overlay-box">
      <div class="overlay-title">${state.class?'🔄 RESPEC CLASS':'⚔️ CHOOSE YOUR CLASS'}</div>
      <p style="text-align:center;font-size:.82em;color:var(--text-dim);margin-bottom:16px;font-style:italic;">
        ${state.class?'Choose a new class. All talents will be reset.':'You have reached Level 10! Your path is revealed.'}
      </p>
      <div id="class-grid" class="class-grid"></div>
      ${respecHtml}
      <div style="text-align:center;margin-top:12px;">
        <button class="start-btn" onclick="document.getElementById('class-screen').style.display='none'">✖ Close</button>
      </div>
    </div>`;

  // Re-render grid inside new HTML
  document.getElementById('class-grid').innerHTML=Object.entries(CLASSES).map(([id,c])=>{
    const locked = state.level < (c.levelReq||10);
    return `
    <div class="class-card ${locked?'':''}}"
      onclick="${locked?'void 0':`selectClass('${id}')`}"
      style="${locked?'opacity:0.4;cursor:not-allowed;':''}">
      <div class="class-icon">${c.icon}</div>
      <div class="class-name">${c.name}</div>
      ${locked?`<div style="color:var(--red);font-size:.65em;">🔒 Lvl ${c.levelReq}</div>`:''}
      <div class="class-desc">${c.desc}</div>
      ${Object.entries(c.bonuses).map(([k,v])=>`<div class="class-stat"><span>${k.replace('Mult','').toUpperCase()}</span><span>+${Math.round(v*100)}%</span></div>`).join('')}
    </div>`;
  }).join('');
  document.getElementById('class-screen').style.display='block';
}
function selectClass(classId){
  const c=CLASSES[classId];state.class=classId;state.quests.class.done=true;
  Object.entries(c.bonuses).forEach(([k,v])=>{state.classBonuses[k]=v;state[k]=(state[k]||1)+v;});
  state.skills=c.skills;
  autoSkillSlots=[null,null,null,null,null,null];
  autoSkillIndex=0;
  updateClassDisplay();
  updatePlayerAvatar();
  document.getElementById('class-screen').style.display='none';
  document.getElementById('talent-btn').style.display='inline-block';
  Object.entries(c.trees).forEach(([treeId,tree])=>{tree.talents.forEach(talent=>{state.talentUnlockedFlags[`${classId}_${talent.id}`]=false;});});
  addLog(`🎉 You are now a ${c.name}!`,'purple');playSound('snd-levelup');
  updateUI();renderSkillBar();renderQuests();
  rebuildSkills();
  savePlayerToSupabase();
}

// ── TALENTS ──
function openTalents(){
  if(!state.class){addLog('Choose a class first!','bad');return;}
  
  // Always sync talent availability before rendering
  checkTalentUnlocks();
  
  const c=CLASSES[state.class];
  document.getElementById('talent-title').textContent=`${c.icon} ${c.name} Talent Tree`;
  document.getElementById('talent-pts-val').textContent=state.talentPoints;

  // Add reset button next to points display
  const ptsEl=document.getElementById('talent-pts-val');
  if(ptsEl&&!document.getElementById('talent-reset-btn')){
    ptsEl.insertAdjacentHTML('afterend',`
      <button id="talent-reset-btn" class="start-btn red-btn"
        style="padding:4px 10px;font-size:.65em;margin-left:10px;"
        onclick="resetTalents()">↺ Reset Talents</button>`);
  }

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

function resetTalents() {
  if (!state.class) return;
  if (!confirm('Reset all talents? Points will be fully refunded.')) return;
  const c = CLASSES[state.class];

  // Count only manually spent ranks
  let refunded = 0;
  const rankCounts = {};
  state.unlockedTalents.forEach(id => {
    rankCounts[id] = (rankCounts[id] || 0) + 1;
  });
  Object.values(c.trees).forEach(tree => {
    tree.talents.forEach(talent => {
      const ranks = rankCounts[talent.id] || 0;
      refunded += ranks * talent.cost;
    });
  });

  state.talentPoints += refunded;

  // Clear spent ranks but keep flags so talents stay visible
  state.unlockedTalents = [];

  // Reset talent bonuses
  state.talentBonuses = {
    strMult:0, agiMult:0, intMult:0, staMult:0,
    hitMult:0, critMult:0, dodgeMult:0, hpRegenMult:0,
    mpRegenMult:0, armorMult:0, mpMult:0, lifeStealMult:0,
    attackPowerMult:0, maxHpMult:0, hpMult:0,
    spellPowerMult:0, healPowerMult:0, dmgReduction:0,
    dmgReflect:0, chainChance:0, bonusAttackChance:0,
    baseLifeSteal:0, baseCrit:0,
  };

  calcStats();
  addLog(`↺ Talents reset! ${refunded} points refunded.`, 'gold');
  notify(`↺ Talents reset! ${refunded} pts refunded.`, 'var(--gold)');
  updateUI(); updateTalentBtn();
  openTalents();
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


// ── EQUIPMENT ──
let equipCooldown = false

async function equipItem(uid) {
  if (equipCooldown) {
    notify('⏳ Please wait before equipping again!', 'var(--gold)')
    return
  }
  equipCooldown = true
  setTimeout(() => equipCooldown = false, 2000) // 2 second cooldown

  const item = findInventoryItem(uid);
  if (!item || item.category !== 'equipment') return

  // rest of function unchanged

  // Check tournament item expiry
  if (item.tournamentReward && item.expiresAt) {
    if (new Date() > new Date(item.expiresAt)) {
      notify(`❌ This tournament item has expired!`, 'var(--red)')
      addLog(`❌ ${item.name} has expired and cannot be equipped!`, 'bad')
      state.inventory = state.inventory.filter(i => i.uid !== uid)
      renderInventory()
      return
    }
  }

  // Server side validation — read actual values from database
  const { data: character, error } = await dbClient
    .from('characters')
    .select('level, reputation_rank')
    .eq('id', state.character_id)
    .single()

  if (error || !character) {
    notify('❌ Failed to validate equipment requirements.', 'var(--red)')
    return
  }

  // Level check against real database value
  const req = item.levelReq || 0
  if (character.level < req) {
    notify(`❌ Need Level ${req} to equip ${item.name}!`, 'var(--red)')
    addLog(`❌ Need Level ${req} to equip ${item.name}!`, 'bad')
    return
  }

  // Reputation check against real database value
  const REP_REQ = { rare: 'baron', epic: 'chief', legendary: 'mayor' }
  const repNeeded = REP_REQ[item.rarity]
  if (repNeeded) {
    const repTiers = REPUTATION_TITLES.map(r => r.id)
    const playerRepIndex = repTiers.indexOf(character.reputation_rank || '')
    const reqRepIndex = repTiers.indexOf(repNeeded)
    if (playerRepIndex < reqRepIndex) {
      const repLabel = REPUTATION_TITLES.find(r => r.id === repNeeded)?.label
      notify(`❌ Need ${repLabel} reputation to equip ${item.name}!`, 'var(--red)')
      addLog(`❌ Need ${repLabel} reputation to equip ${item.name}!`, 'bad')
      return
    }
  }

  // All checks passed — equip the item
  if (state.equipped[item.slot]) unequipSlot(item.slot, true)
  Object.entries(item.stats || {}).forEach(([k, v]) => {
    const ek = 'equip' + k.charAt(0).toUpperCase() + k.slice(1)
    state[ek] = (state[ek] || 0) + v
  })
  item.equipped = true
  state.equipped[item.slot] = uid
  state.quests.equip.done = true
  calcStats()
  addLog(`Equipped ${item.name}!`, 'good')
  playSound('snd-craft')
  renderInventory()
  renderEquipSlots()
  updateUI()
  renderQuests()
  await saveInventoryToSupabase();
}
async function unequipSlot(slot,silent=false){
  const uid=state.equipped[slot];if(!uid)return;
  const item = findInventoryItem(uid);
  if(item){Object.entries(item.stats||{}).forEach(([k,v])=>{const ek='equip'+k.charAt(0).toUpperCase()+k.slice(1);state[ek]=Math.max(0,(state[ek]||0)-v);});item.equipped=false;if(!silent)addLog(`Unequipped ${item.name}!`,'info');}
  state.equipped[slot]=null;calcStats();renderInventory();renderEquipSlots();updateUI();await saveInventoryToSupabase();

}
function renderEquipSlots(){
  ['weapon','armor','helmet','boots','ring','amulet'].forEach(slot=>{
    // Target both main and merchant slot elements
    const slotEl  = document.getElementById(`slot-${slot}`)
    const nameEl  = document.getElementById(`slot-${slot}-name`)
    const slotElM = document.getElementById(`slot-${slot}-m`)
    const nameElM = document.getElementById(`slot-${slot}-name-m`)

    // Reset both
    if(slotEl)  slotEl.className  = 'equip-slot'
    if(slotElM) slotElM.className = 'equip-slot'

    ;[slotEl, slotElM].forEach(el => {
      if(!el) return
      const existing = el.querySelector('.equip-tooltip')
      if(existing) existing.remove()
      const enhLabelEl = el.querySelector('.slot-enh-label')
      if(enhLabelEl) enhLabelEl.remove()
    })

    const uid = state.equipped[slot]
    if(uid){
      const item = findInventoryItem(uid)
      if(item){
        const enh = item.enh_level ?? item.enhLevel ?? 0;
        const shortName = item.name.replace(/^[^\s]+ /,'').substring(0,12)

        // Enhancement label
        const makeEnhEl = () => {
          const enhEl = document.createElement('div')
          enhEl.className = 'slot-enh-label'
          enhEl.textContent = enh > 0 ? `+${enh}` : ''
          enhEl.style.color = enh >= 15 ? 'var(--legendary)' : enh >= 7 ? 'var(--gold)' : '#aaa'
          return enhEl
        }

        // Tooltip HTML
        const statsHtml = Object.entries(item.stats||{}).map(([k,v])=>`<div class="tooltip-stat">+${v} ${k.toUpperCase()}</div>`).join('')
        const rarity = RARITY[item.rarity] || RARITY.normal
        const enh_label = enh > 0 ? `<div style="color:${enh>=7?'var(--legendary)':'var(--gold)'};font-size:0.75em;">+${enh} Enhanced</div>` : ''
        const tooltipHtml = `<div class="equip-tooltip" style="display:none;">
          <div style="color:${rarity.color};font-weight:600;">${item.name}</div>
          <div style="color:${rarity.color};font-size:0.8em;margin:3px 0;">${rarity.label}</div>
          ${enh_label}${statsHtml}
          <div style="color:#888;font-size:0.75em;margin-top:4px;">Sell: ${item.sellPrice}g</div>
        </div>`

        // Apply to main slot
        if(slotEl && nameEl){
          nameEl.textContent = shortName
          slotEl.appendChild(makeEnhEl())
          slotEl.classList.add('has-item', item.rarity)
          if(enh >= 15) slotEl.classList.add('enh-glow-15')
          else if(enh >= 7) slotEl.classList.add('enh-glow-7')
          slotEl.insertAdjacentHTML('beforeend', tooltipHtml)
        }

        // Mirror to merchant slot
        if(slotElM && nameElM){
          nameElM.textContent = shortName
          slotElM.appendChild(makeEnhEl())
          slotElM.classList.add('has-item', item.rarity)
          if(enh >= 15) slotElM.classList.add('enh-glow-15')
          else if(enh >= 7) slotElM.classList.add('enh-glow-7')
          slotElM.insertAdjacentHTML('beforeend', tooltipHtml)
        }
      }
    } else {
      if(nameEl)  nameEl.textContent  = 'Empty'
      if(nameElM) nameElM.textContent = 'Empty'
    }
  })
}

// ── INVENTORY ──
function getInvSlotLimit(category){
  const limits=window.GAME_CONFIG?.inventory?.slot_limits;
  if(limits&&limits[category]!==undefined)return limits[category];
  const defaults={equipment:20,consumable:20,material:20};
  return defaults[category]??60;
}

function countInvSlots(category) {
  const categoryArray = state.inventory[category];
  // If the category doesn't exist or isn't an array, return 0
  if (!Array.isArray(categoryArray)) return 0;
  
  // Count items that are NOT equipped
  return categoryArray.filter(i => !i.equipped).length;
}

function addToInventory(item) {
  const cat = item.category || 'equipment';

  // Handle Soul Weapons separately (no limit, usually a single object or specific logic)
  if (cat === 'soul_weapon') {
    // Assuming soul weapons are stored directly or handled differently. 
    // If they go in the object too:
    if (!state.inventory.soul_weapon) state.inventory.soul_weapon = [];
    state.inventory.soul_weapon.push({...item, uid: String(item.uid || genUid())});
    renderInventory();
    return;
  }

  // Stackable Logic
  if (item.stackable) {
    const categoryArray = state.inventory[cat] || [];
    const existing = categoryArray.find(i => 
      i.name === item.name && 
      i.rarity === item.rarity && 
      i.stackable && 
      !i.equipped
    );

    if (existing) {
      existing.qty = (existing.qty || 1) + (item.qty || 1);
      renderInventory();
      return;
    }
  }

  // Check Slot Limit
  const limit = getInvSlotLimit(cat);
  const current = countInvSlots(cat);

  if (current >= limit) {
    const label = cat.charAt(0).toUpperCase() + cat.slice(1);
    const sellPrice = item.sellPrice || 0;

    if (sellPrice > 0) {
      addGold(sellPrice);
      addLog(`⚠️ ${label} bag full! ${item.name} auto-sold for ${formatNumber(sellPrice)}g.`, 'bad');
      notify(`⚠️ Bag full! ${item.name} sold for ${formatNumber(sellPrice)}g`, 'var(--red)');
    } else {
      addLog(`⚠️ ${label} bag full! ${item.name} discarded.`, 'bad');
      notify(`⚠️ Bag full! ${item.name} discarded.`, 'var(--red)');
    }

    // Show Popup (Existing logic remains the same)
    if (!document.getElementById('bag-full-popup')) {
      const popup = document.createElement('div');
      popup.id = 'bag-full-popup';
      popup.style.cssText = `
        position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
        background:#1a0a0a;border:1px solid var(--red);
        padding:20px 24px;z-index:99999;text-align:center;
        font-family:var(--font-title);max-width:280px;width:90%;
        box-shadow:0 0 40px rgba(255,34,68,0.3);`;
      popup.innerHTML = `
        <div style="font-size:1.4em;margin-bottom:8px;">⚠️</div>
        <div style="color:var(--red);font-size:.85em;letter-spacing:2px;margin-bottom:8px;">BAG FULL</div>
        <div style="font-size:.72em;color:var(--text-dim);line-height:1.6;margin-bottom:14px;">
          Your ${label} bag is full.<br>
          Additional drops will be <span style="color:var(--gold)">auto-sold</span> for gold.<br>
          Sell or drop items to make room.
        </div>
        <button onclick="document.getElementById('bag-full-popup').remove()"
          style="background:rgba(255,34,68,0.15);border:1px solid var(--red);
          color:var(--red);font-family:var(--font-title);font-size:.75em;
          letter-spacing:2px;padding:8px 20px;cursor:pointer;width:100%;">
          ✖ GOT IT
        </button>`;
      document.body.appendChild(popup);
      setTimeout(() => { const el = document.getElementById('bag-full-popup'); if (el) el.remove(); }, 5000);
    }
    return;
  }

  // Add Item to the specific category array
  if (!state.inventory[cat]) {
    state.inventory[cat] = [];
  }
  
  state.inventory[cat].push({ ...item, uid: String(item.uid || genUid()) });
  renderInventory();
}
function switchInvTab(tab){
  currentInvTab=tab;state.invTab=tab;
  document.querySelectorAll('.inv-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(`inv-tab-${tab}`).classList.add('active');renderInventory();
}

function formatNumber(num){if(num>=1000000)return(num/1000000).toFixed(1)+'M';if(num>=1000)return(num/1000).toFixed(1)+'K';return num;}



// ── ENHANCEMENT ──
const ENHANCE_COST=[0,500,1000,2000,3500,5000,8000,12000,18000,25000,35000,50000,70000,100000,150000,200000];
const ENHANCE_RATE=[0,100,95,85,75,65,55,45,35,25,25,25,25,25,25,25];
function openEnhance(uid) {
  const item = getItemByUid(uid);
  if (!item || item.category !== 'equipment') return;
  document.getElementById('enhance-screen').style.display = 'block';
  renderEnhanceScreen(uid);

  if (window._enhanceKeyHandler) document.removeEventListener('keydown', window._enhanceKeyHandler);
  window._enhanceKeyHandler = function(e) {
    if (document.getElementById('enhance-screen').style.display === 'none') return;
    const k = e.key.toLowerCase();
    if (k === 'escape') { closeEnhance(); return; }
    if (k === 'enter' || k === 'e') {
      const btn = document.querySelector('.enhance-btn:not(.enhance-btn-disabled)');
      if (btn) doEnhance(uid);
    }
    if (k === 'o') {
      const chk = document.getElementById('enhance-orb-toggle');
      if (chk && !chk.disabled) { chk.checked = !chk.checked; updateEnhanceRateDisplay(); }
    }
  };
  document.addEventListener('keydown', window._enhanceKeyHandler);
}

function closeEnhance() {
  document.getElementById('enhance-screen').style.display = 'none';
  if (window._enhanceKeyHandler) {
    document.removeEventListener('keydown', window._enhanceKeyHandler);
    window._enhanceKeyHandler = null;
  }
  // ← removed savePlayerToSupabase() — enhance_item RPC already saved to DB
}

function renderEnhanceScreen(uid){
  const orbCount = (state.inventory.material || [])
  .filter(i => i.name === '⚗️ Enhancement Orb')
  .reduce((sum, i) => sum + (i.quantity || 1), 0);
  const orbHtml=`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;
      padding:8px;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.2);
      border-radius:6px;" onclick="event.stopPropagation()">
      <input type="checkbox" id="enhance-orb-toggle"
       onclick="event.stopPropagation()"
       onchange="updateEnhanceRateDisplay()"
      ${orbCount===0?'disabled':''}
      style="width:16px;height:16px;cursor:pointer;accent-color:#22c55e;">
      <div style="flex:1;">
        <div style="font-size:.75em;color:var(--green);">⚗️ Use Enhancement Orb <span style="color:#888;font-size:.85em;">(<u>O</u>)</span></div>
        <div style="font-size:.65em;color:var(--text-dim);">+20% success rate this attempt</div>
      </div>
      <div style="font-size:.72em;color:${orbCount>0?'var(--green)':'var(--text-dim)'};">
        ${orbCount>0?`${orbCount} owned`:'None owned'}
      </div>
    </div>`;
  const item = getItemByUid(uid);
  if(!item)return;
  const r=RARITY[item.rarity]||RARITY.normal,enh=item.enh_level??item.enhLevel??item.enhancement??0,maxed=enh>=15,cost=ENHANCE_COST[enh+1]||0,rate=ENHANCE_RATE[enh+1]||0;
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
          <div class="enhance-cost-row"><span>👛 Your Gold</span><span style="color:var(--gold)">${state.gold.toLocaleString()}g</span></div>
          <div class="enhance-cost-row"><span>✅ Success Rate</span><span id="enhance-rate-display" data-enh="${enh}" style="color:${rate>=80?'var(--green)':rate>=50?'var(--gold)':'var(--red)'}">${rate}%</span></div>
          <div class="enhance-cost-row"><span>❌ Fail Effect</span><span style="color:var(--red)">${enh>0?`Drop to +${enh-1}`:'Nothing'}</span></div>
        </div>
        ${orbHtml}
        <div style="text-align:center;margin-top:12px;">
          <button class="enhance-btn ${state.gold<cost?'enhance-btn-disabled':''}" onclick="doEnhance('${uid}')" ${state.gold<cost?'disabled':''}>⚒️ Enhance +${enh+1} <span style="color:#888;font-size:.8em;">[Enter]</span></button>
        </div>`:'<div style="text-align:center;color:var(--legendary);font-family:Cinzel,serif;margin:12px 0;">✨ MAX ENHANCED!</div>'
      }
      </div>
      <div style="text-align:center;margin-top:12px;"><button class="start-btn" onclick="closeEnhance()">✅ Close <span style="color:#888;font-size:.8em;">[Esc]</span></button></div>
    </div>`;
    
}
function updateEnhanceRateDisplay() {
  const toggle = document.getElementById('enhance-orb-toggle');
  const rateEl = document.getElementById('enhance-rate-display');
  if (!toggle || !rateEl) return;

  const enh = parseInt(rateEl.dataset.enh);
  let rate = ENHANCE_RATE[enh + 1] || 0;
  if (toggle.checked) rate = Math.min(95, rate + 20);

  rateEl.textContent = rate + '%';
  rateEl.style.color = rate >= 80 ? 'var(--green)' : rate >= 50 ? 'var(--gold)' : 'var(--red)';
}
async function doEnhance(uid) {
  const useOrb = document.getElementById('enhance-orb-toggle')?.checked || false;

  // Get item from bag to read current enh level for display
  const item = getItemByUid(uid);
console.log('enhance uid:', uid, typeof uid);
console.log('equipment bag uids:', state.inventory.equipment.map(i => ({ uid: i.uid, type: typeof i.uid })));  // ← was missing
  if (!item) {
    notify('❌ Item not found!', 'var(--red)');
    return;
  }

  const enh = item.enh_level ?? item.enhLevel ?? 0;
  const displayCost = ENHANCE_COST[enh + 1] || 0;
  if (state.gold < displayCost) {
    notify('Not enough gold!', 'var(--red)');
    return;
  }
  // ... rest unchanged

  try {
    const { data, error } = await dbClient.rpc('enhance_item', {
      p_character_id: state.character_id,
      p_item_uid:     uid,
      p_use_orb:      useOrb,
    });

    if (error) throw error;
    if (!data.success) {
      notify(`❌ ${data.error}`, 'var(--red)');
      return;
    }

    // ── Apply server result to local state ──
    state.gold = data.new_gold;

    // Update item in equipment bag
    const bag = state.inventory.equipment;
    const idx = bag.findIndex(i => i.uid === uid);
    if (idx !== -1) {
      bag[idx].stats     = data.new_stats;
      bag[idx].enh_level = data.enh_level;
      // Clean up old field names
      delete bag[idx].enhLevel;
      delete bag[idx].enhancement;
    }

    // Update equipped slot if this item is equipped
    Object.entries(state.equipped).forEach(([slot, item]) => {
      if (item && String(item.uid || item) === uid) {
        if (typeof item === 'object') {
          item.stats     = data.new_stats;
          item.enh_level = data.enh_level;
          delete item.enhLevel;
          delete item.enhancement;
        }
      }
    });

    if (data.result === 'success') {
      addLog(`⚒️ SUCCESS! Item is now +${data.enh_level}!`, 'gold');
      notify(`✨ SUCCESS! +${data.enh_level}!`, 'var(--gold)');
      playSound('snd-levelup');
    } else {
      if (data.enh_level < enh) {
        addLog(`💔 FAILED! Dropped to +${data.enh_level}!`, 'bad');
        notify(`💔 FAILED! Dropped to +${data.enh_level}!`, 'var(--red)');
      } else {
        addLog(`💔 FAILED! Nothing happened.`, 'bad');
        notify('💔 FAILED!', 'var(--red)');
      }
      playSound('snd-death');
    }

    // Reapply equip bonuses since stats changed
    reapplyEquipBonuses();
    calcStats();
    updateUI();
    renderInventory();
    renderEnhanceScreen(uid);

  } catch (err) {
    console.error('enhance_item error:', err);
    notify('❌ Enhancement failed. Try again.', 'var(--red)');
  }
}


function getItemByUid(uid) {
  const inv = state.inventory;
  return (
    inv.equipment?.find(i => i.uid === uid) ||
    inv.consumable?.find(i => i.uid === uid) ||
    inv.material?.find(i => i.uid === uid) ||
    null
  );
}

async function useItem(uid) {
  const bag = state.inventory.consumable || [];
  const idx = bag.findIndex(i => String(i.uid) === String(uid));
  if (idx === -1) return;
  const item = bag[idx];

  if (item.effect === 'treasure') {
    openTreasureBox(item);
    bag.splice(idx, 1);
    renderInventory();
    updateUI();
    
    await saveInventoryToSupabase();
    return;
  }

  if (item.category === 'consumable') {
    if (item.effect === 'hp' || item.effect === 'both') {
      state.hp = Math.min(state.maxHp, state.hp + (item.val || 40));
      addLog(`Used ${item.name}: +${item.val} HP`, 'good');
      playSound('snd-heal');
      spawnDmgFloat(`+${item.val}HP`, false, 'heal-float');
    }
    if (item.effect === 'mp' || item.effect === 'both') {
      state.mp = Math.min(state.maxMp, state.mp + (item.val || 30));
      addLog(`Used ${item.name}: +${item.val} MP`, 'info');
      spawnDmgFloat(`+${item.val}MP`, false, 'mp-float');
    }
    if (item.stackable && item.qty > 1) item.qty--;
    else bag.splice(idx, 1);
    renderInventory();
    updateUI();
    
    await saveInventoryToSupabase();
  }
}

function showItemPopup(source,id){
  console.log("source =", source);
  console.log("id =", id);

  const r_=r=>RARITY[r]||RARITY.normal;
  let item,btns='',statsHtml='',reqLine='';

  if(source==='shop'){
    const equipItems = window._shopEquipCache || SHOP_EQUIP
    const consItems = window._shopConsCache || SHOP_CONS
    const all=[...equipItems,...consItems];
    item=all.find(i=>i.id===id);if(!item)return;
    statsHtml=item.stats
      ?Object.entries(item.stats).map(([k,v])=>`<div class="tooltip-stat">+${v} ${k.toUpperCase()}</div>`).join('')
      :item.effect?`<div class="tooltip-stat">Restore ${item.val} ${item.effect==='both'?'HP+MP':item.effect.toUpperCase()}</div>`:'';
    reqLine=(item.levelReq&&item.levelReq>0)
      ?`<div style="font-size:.78em;margin-bottom:6px;color:${state.level>=item.levelReq?'var(--green)':'var(--red)'};">${state.level>=item.levelReq?'✅':'🔒'} Level ${item.levelReq} Required</div>`:'';
    btns=`<button class="start-btn" onclick="buyShopItem('${item.id}');closeItemPopup()">💰 <u>B</u>uy (${item.price}g)</button>`;

  } else {
    console.log("inventory:", state.inventory);
    console.log("type:", typeof state.inventory);
    console.log("isArray:", Array.isArray(state.inventory));
    item = Object.values(state.inventory)
  .flat()
  .find(i => String(i.uid) === String(id));

if (!item) {
  console.error("Item not found:", id);
  return;
}
    statsHtml=item.stats
      ?Object.entries(item.stats).map(([k,v])=>`<div class="tooltip-stat">+${v} ${k.toUpperCase()}</div>`).join('')
      :item.effect?`<div class="tooltip-stat">Restore ${item.val} ${item.effect==='both'?'HP+MP':item.effect.toUpperCase()}</div>`:'';
    reqLine=(item.levelReq&&item.levelReq>0)
      ?`<div style="font-size:.78em;margin-bottom:6px;color:${state.level>=item.levelReq?'var(--green)':'var(--red)'};">${state.level>=item.levelReq?'✅':'🔒'} Level ${item.levelReq} Required</div>`:'';

    // Treasure box info
    if(item.effect==='treasure'){
      const dropDate=item.droppedAt
        ?new Date(item.droppedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})
        :'Unknown';
      const diff=item.difficulty||'normal';
      const diffColor=diff==='hell'?'var(--red)':diff==='hard'?'var(--gold)':'var(--green)';
      statsHtml+=`
        <div style="margin:8px 0;padding:8px;background:rgba(255,153,0,0.06);border:1px solid rgba(255,153,0,0.2);border-radius:6px;">
          <div style="font-size:.78em;color:var(--gold);margin-bottom:4px;">⚔️ From: <strong>${item.sourceBossName||'Unknown Boss'}</strong></div>
          <div style="font-size:.72em;color:var(--text-dim);">📅 Dropped: ${dropDate}</div>
          <div style="font-size:.72em;color:${diffColor};margin-top:2px;">⚠️ Difficulty: ${diff.toUpperCase()}</div>
        </div>`;
    }

    if(item.category==='equipment'){
      btns=item.equipped
        ?`<button class="start-btn red-btn" onclick="unequipSlot('${item.slot}');closeItemPopup()"><u>U</u>nequip</button>`
        :`<button class="start-btn blue-btn" onclick="equipItem('${item.uid}');closeItemPopup()"><u>E</u>quip</button>`;
      btns+=`<button class="start-btn purple-btn" onclick="closeItemPopup();openEnhance('${item.uid}')">⚒️ <u>H</u>enhance</button>`;
      if(!item.equipped)btns+=`<button class="start-btn" onclick="closeItemPopup();listItemForAuction('${item.uid}')" style="background:linear-gradient(135deg,#005580,#0088cc);">🏛️ <u>A</u>uction</button>`;
    }
    if(item.category==='consumable')btns+=`<button class="start-btn" onclick="useItem('${item.uid}');closeItemPopup()"><u>U</u>se</button>`;
    if(item.category==='soul_weapon'){
      const sw=SOUL_WEAPONS[item.slot==='soul'?state.class?.toLowerCase():''];
      const alreadyHas=state.soulWeapon&&state.soulWeapon.tier>=item.soulTier;
      const wrongClass=item.classReq&&item.classReq!==state.class?.toLowerCase();
      const passiveDesc=sw?.passive?`<div style="font-size:.72em;color:var(--deep-gold);margin:4px 0;">⚡ Passive: ${sw.passive.desc}</div>`:'';
      const skillDesc=sw?.skill?`<div style="font-size:.72em;color:var(--legendary);margin:4px 0;">🎯 Skill: ${sw.skill.name} — ${sw.skill.desc}</div>`:'';
      statsHtml+=passiveDesc+skillDesc;
      if(wrongClass){
        btns=`<button class="start-btn" disabled style="opacity:.4;">❌ Wrong Class</button>`;
      } else if(alreadyHas){
        btns=`<button class="start-btn" disabled style="opacity:.4;">✅ Already Bound</button>`;
      } else {
        btns=`<button class="start-btn" style="border-color:var(--legendary);color:var(--legendary);" onclick="equipSoulWeapon('${item.uid}');closeItemPopup()">✨ <u>B</u>ind to Soul</button>`;
      }
    }
    if(!item.equipped){
      const _qty=item.qty||item.quantity||1;
      const _total=(item.sellPrice||0)*(item.stackable?_qty:1);
      btns+=`<button class="start-btn red-btn" onclick="sellItem('${item.uid}');closeItemPopup()"><u>S</u>ell ${item.stackable&&_qty>1?'All':''} (${formatNumber(_total)}g)</button>`;
    }
  }

  showPopup(item, reqLine+statsHtml, btns, source, id);
}

function showPopup(item,statsHtml,btns,source,id){
  const r=RARITY[item.rarity]||RARITY.normal;
  document.getElementById('item-popup-content').innerHTML=`
    <div style="text-align:center;margin-bottom:10px;"><div style="font-size:2.5em;">${item.name.split(' ')[0]}</div><div style="color:${r.color};font-family:'Cinzel',serif;font-size:1em;font-weight:600;">${item.displayName||item.name}</div><div style="color:${r.color};font-size:.78em;">${r.label}</div></div>
    <div style="margin:10px 0;">${statsHtml}</div><div style="color:#888;font-size:.75em;margin-bottom:12px;">Sell: ${formatNumber(item.sellPrice||0)}g</div>
    <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">${btns}</div>
    <div style="margin-top:8px;text-align:center;"><button class="start-btn" style="background:rgba(255,255,255,.1);color:#aaa;" onclick="closeItemPopup()">✖ Close</button></div>`;
  document.getElementById('item-popup').style.display='flex';

  // keyboard shortcuts
  if(window._itemPopupKeyHandler) document.removeEventListener('keydown',window._itemPopupKeyHandler);
  window._itemPopupKeyHandler=function(e){
    if(!document.getElementById('item-popup') || document.getElementById('item-popup').style.display==='none') return;
    const k=e.key.toLowerCase();
    if(k==='escape'){closeItemPopup();return;}
    if(source==='shop'){
      if(k==='b'){buyShopItem(item.id);closeItemPopup();}
    } else {
      if(item.category==='equipment'){
        if(item.equipped&&k==='u'){unequipSlot(item.slot);closeItemPopup();}
        if(!item.equipped&&k==='e'){equipItem(item.uid);closeItemPopup();}
        if(k==='h'){closeItemPopup();openEnhance(item.uid);}
        if(!item.equipped&&k==='a'){closeItemPopup();listItemForAuction(item.uid);}
      }
      if(item.category==='consumable'&&k==='u'){useItem(item.uid);closeItemPopup();}
      if(item.category==='soul_weapon'&&k==='b'){equipSoulWeapon(item.uid);closeItemPopup();}
      if(!item.equipped&&k==='s'){sellItem(item.uid);closeItemPopup();}
    }
  };
  document.addEventListener('keydown',window._itemPopupKeyHandler);
}

function closeItemPopup(){
  document.getElementById('item-popup').style.display='none';
  if(window._itemPopupKeyHandler){
    document.removeEventListener('keydown',window._itemPopupKeyHandler);
    window._itemPopupKeyHandler=null;
  }
}
function closeItemPopup(){document.getElementById('item-popup').style.display='none';}

async function sellItem(uid) {
  // Search all bags
  let found = false;
  for (const bagKey of ['equipment', 'consumable', 'material']) {
    const bag = state.inventory[bagKey] || [];
    const idx = bag.findIndex(i => String(i.uid) === String(uid));
    if (idx === -1) continue;
    const item = bag[idx];
    if (item.equipped) return;
    const qty = item.qty || item.quantity || 1;
    const total = (item.sellPrice || 0) * (item.stackable ? qty : 1);
    addGold(total);
    addLog(`Sold ${item.name} for ${formatNumber(total)}g`, 'gold');
    bag.splice(idx, 1);
    found = true;
    break;
  }
  if (!found) return;
  renderInventory();
  updateUI();
  if (state.gold >= 50) state.quests.gold50.done = true;
  renderQuests();
  await saveInventoryToSupabase();
}

// ══════════════════════════════════════════
// AUTO-SELL SYSTEM — Per inventory tab
// ══════════════════════════════════════════

// ── STATE MIGRATION ──
// Old: state.autoSell = { normal, uncommon, rare, epic }
// New: state.autoSell = {
//   equipment:  { normal, uncommon, rare, epic },
//   consumable: { normal, uncommon, rare, epic },
//   material:   { normal, uncommon, rare, epic },
// }
// Migration runs once on load — converts old flat structure to new per-tab structure

function migrateAutoSell() {
  const s = state.autoSell;
  if (!s || typeof s.equipment === 'object') return; // already migrated

  // Old flat structure — migrate to per-tab
  const flat = {
    normal:   s.normal   || false,
    uncommon: s.uncommon || false,
    rare:     s.rare     || false,
    epic:     s.epic     || false,
  };

  state.autoSell = {
    equipment:  { ...flat },
    consumable: { normal: false, uncommon: false, rare: false, epic: false },
    material:   { normal: false, uncommon: false, rare: false, epic: false },
  };
}

// ── RENDER INVENTORY (updated to include per-tab auto-sell UI) ──
function renderInventory() {
  migrateAutoSell();

  const list  = document.getElementById('inventory-list-merchant') || document.getElementById('inventory-list');
  const categoryArray = state.inventory[currentInvTab];
  const items = Array.isArray(categoryArray) ? categoryArray : [];


  // Soul tab has no slot limit
  const hasLimit = currentInvTab !== 'soul_weapon';
  const limit  = hasLimit ? getInvSlotLimit(currentInvTab) : null;
  const used   = hasLimit ? countInvSlots(currentInvTab) : null;

  // ── Auto-sell bar HTML ──
  const sellableTabs = ['equipment', 'material'];
  const showAutoSell = sellableTabs.includes(currentInvTab);
  const tabSell = state.autoSell[currentInvTab] || {};

  const autoSellBar = showAutoSell ? `
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;
      padding:8px 10px;margin-bottom:10px;
      background:rgba(255,255,255,0.03);border:1px solid var(--border);
      border-radius:var(--radius);">
      <span style="font-family:var(--font-title);font-size:.65em;
        color:var(--text-dim);letter-spacing:1px;margin-right:4px;">
        AUTO-SELL:
      </span>
      <label class="as-check">
        <input type="checkbox" id="as-${currentInvTab}-normal"
          ${tabSell.normal ? 'checked' : ''}
          onchange="saveTabAutoSell('${currentInvTab}')">
        <span style="color:#aaa;">Normal</span>
      </label>
      <label class="as-check">
        <input type="checkbox" id="as-${currentInvTab}-uncommon"
          ${tabSell.uncommon ? 'checked' : ''}
          onchange="saveTabAutoSell('${currentInvTab}')">
        <span style="color:var(--uncommon);">Uncommon</span>
      </label>
      <label class="as-check">
        <input type="checkbox" id="as-${currentInvTab}-rare"
          ${tabSell.rare ? 'checked' : ''}
          onchange="saveTabAutoSell('${currentInvTab}')">
        <span style="color:var(--rare);">Rare</span>
      </label>
      <label class="as-check">
        <input type="checkbox" id="as-${currentInvTab}-epic"
          ${tabSell.epic ? 'checked' : ''}
          onchange="saveTabAutoSell('${currentInvTab}')">
        <span style="color:var(--epic);">Epic</span>
      </label>
      <button class="start-btn" style="margin-left:auto;padding:5px 12px;font-size:.68em;"
        onclick="autoSellTab('${currentInvTab}')">
        🗑️ Sell Now
      </button>
    </div>` : '';

  // ── Item grid with empty slots ──
    const filledSlots = items.map(item => {
    const stackBadge    = item.stackable && item.qty > 1 ? `<div class="item-icon-stack">×${item.qty}</div>` : '';
    const equippedBadge = item.equipped ? `<div class="item-icon-equipped">E</div>` : '';
    const enh = item.enh_level ?? item.enhLevel ?? 0;
    const enhBadge      = enh > 0 ? `<div class="item-icon-stack" style="top:2px;left:3px;right:auto;color:${enh >= 7 ? 'var(--legendary)' : 'var(--gold)'}">+${enh}</div>` : '';
    const glowClass     = enh >= 15 ? 'enh-glow-15' : enh >= 7 ? 'enh-glow-7' : '';
    const isLocked      = item.levelReq && item.levelReq > state.level;
    const lockBadge     = isLocked ? `<div style="position:absolute;top:2px;left:3px;font-size:.6em;color:var(--red);">🔒${item.levelReq}</div>` : '';

    // Reputation lock
    const REP_REQ = { rare:'baron', epic:'chief', legendary:'mayor' };
    const repNeeded = REP_REQ[item.rarity];
    const repTiers = REPUTATION_TITLES.map(r => r.id);
    const playerRepIndex = repTiers.indexOf(state.reputationTitle || '');
    const reqRepIndex = repTiers.indexOf(repNeeded || '');
    const isRepLocked = repNeeded && playerRepIndex < reqRepIndex;
    const repLabel = isRepLocked ? REPUTATION_TITLES.find(r => r.id === repNeeded)?.label : null;
    const repLockBadge = isRepLocked ? `<div style="position:absolute;bottom:2px;left:3px;font-size:.6em;color:var(--epic);">👑${repLabel}</div>` : '';

    const isAnyLocked = isLocked || isRepLocked;

    return `<div class="item-icon-box ${item.rarity} ${glowClass}"
      onclick="showItemPopup('inv','${item.uid}')" title="${item.name}"
      style="${isAnyLocked ? 'opacity:0.5;' : ''}">
      <div class="item-icon-emoji">${item.name.split(' ')[0]}</div>
      ${stackBadge}${equippedBadge}${enhBadge}${lockBadge}${repLockBadge}
    </div>`;
  });

  // Empty slot boxes up to limit
  const emptySlots = hasLimit
    ? Array.from({length: Math.max(0, limit - used)}, () =>
        `<div class="item-icon-box empty-slot"></div>`)
    : [];

  const allSlots = [...filledSlots, ...emptySlots];

  const gridHtml = !hasLimit && !items.length
    ? '<div class="inv-empty">No items here</div>'
    : `<div class="item-grid">${allSlots.join('')}</div>`;

  // ── Slot counter footer ──
  const slotFooter = hasLimit ? `
    <div style="display:flex;justify-content:space-between;align-items:center;
      margin-top:10px;padding:6px 10px;
      background:rgba(255,255,255,0.03);border:1px solid var(--border);
      border-radius:var(--radius);">
      <span style="font-family:var(--font-title);font-size:.65em;color:var(--text-dim);letter-spacing:1px;">
        BAG SLOTS
      </span>
      <span style="font-family:var(--font-title);font-size:.78em;
        color:${used >= limit ? 'var(--red)' : used >= limit * 0.8 ? 'var(--legendary)' : 'var(--gold)'};">
        ${used} / ${limit}
      </span>
    </div>` : '';

  list.innerHTML = autoSellBar + gridHtml + slotFooter;
}

// ── SAVE AUTO-SELL FOR A SPECIFIC TAB ──
async function saveTabAutoSell(tab) {
  if (!state.autoSell[tab]) state.autoSell[tab] = {};
  state.autoSell[tab].normal   = document.getElementById(`as-${tab}-normal`)?.checked   || false;
  state.autoSell[tab].uncommon = document.getElementById(`as-${tab}-uncommon`)?.checked || false;
  state.autoSell[tab].rare     = document.getElementById(`as-${tab}-rare`)?.checked     || false;
  state.autoSell[tab].epic     = document.getElementById(`as-${tab}-epic`)?.checked     || false;
  await savePlayerToSupabase();
}

// ── AUTO-SELL NOW FOR A SPECIFIC TAB ──
async function autoSellTab(tab){
  migrateAutoSell();
  const tabSell=state.autoSell[tab];
  if(!tabSell)return;
  if(!tabSell.normal&&!tabSell.uncommon&&!tabSell.rare&&!tabSell.epic){
    notify('No rarities selected to auto-sell!','var(--gold)');return;
  }

  let totalGold=0,count=0;
  const toSell=state.inventory.filter(i=>{
    if(i.equipped)return false;
    if(i.category!==tab)return false;
    return (tabSell.normal&&i.rarity==='normal')||
           (tabSell.uncommon&&i.rarity==='uncommon')||
           (tabSell.rare&&i.rarity==='rare')||
           (tabSell.epic&&i.rarity==='epic');
  });

  toSell.forEach(item=>{
    totalGold+=Math.floor(Number(item.sellPrice||0))*(item.stackable?item.qty:1);
    count++;
    const idx=state.inventory.findIndex(i=>i.uid===item.uid);
    if(idx!==-1)state.inventory.splice(idx,1);
  });

  if(count>0){
    addGold(totalGold); // ✅ sanitized
    addLog(`🗑️ Auto-sold ${count} ${tab} items for ${formatNumber(totalGold)}g!`,'gold');
    notify(`🗑️ Sold ${count} items for ${formatNumber(totalGold)}g`,'var(--gold)');
    renderInventory();updateUI();
    await savePlayerToSupabase();
  } else {
    notify('No items to sell in this tab!','var(--text-dim)');
  }
}

async function autoSellAfterCombat(){
  migrateAutoSell();
  let totalGold=0,count=0;

  ['equipment','consumable','material'].forEach(tab=>{
    const tabSell=state.autoSell[tab];
    if(!tabSell)return;
    if(!tabSell.normal&&!tabSell.uncommon&&!tabSell.rare&&!tabSell.epic)return;

    const toSell=state.inventory.filter(i=>{
      if(i.equipped)return false;
      if(i.category!==tab)return false;
      return (tabSell.normal&&i.rarity==='normal')||
             (tabSell.uncommon&&i.rarity==='uncommon')||
             (tabSell.rare&&i.rarity==='rare')||
             (tabSell.epic&&i.rarity==='epic');
    });

    toSell.forEach(item=>{
      totalGold+=Math.floor(Number(item.sellPrice||0))*(item.stackable?item.qty:1);
      count++;
      const idx=state.inventory.findIndex(i=>i.uid===item.uid);
      if(idx!==-1)state.inventory.splice(idx,1);
    });
  });

  if(count>0){
    addGold(totalGold); // ✅ sanitized
    addLog(`🗑️ Auto-sold ${count} items for ${formatNumber(totalGold)}g!`,'gold');
    notify(`🗑️ Auto-sold ${count} items for ${formatNumber(totalGold)}g`,'var(--gold)');
    renderInventory();updateUI();
    await savePlayerToSupabase();
  }
}

// ── LEGACY STUBS (kept so nothing crashes if called) ──
// Old saveAutoSell/loadAutoSellUI/autoSellNow are replaced by the new system
async function saveAutoSell()  { /* replaced by saveTabAutoSell */ }
async function loadAutoSellUI(){ migrateAutoSell(); }
async function autoSellNow()   { await autoSellAfterCombat(); }
// ── CRAFTING ──
function openCrafting(){document.getElementById('craft-screen').style.display='block';renderCrafting();}
function closeCrafting(){document.getElementById('craft-screen').style.display='none';}
function getMaterialQty(name) {
  // ✅ FIX: Access the 'material' array directly from the object
  const materials = state.inventory.material || [];
  
  // Now safely use .find() on the array
  const item = materials.find(i => i.name === name && i.stackable);
  
  return item ? item.qty : 0;
}
function renderCrafting(){
  const grid=document.getElementById('craft-grid-merchant') || document.getElementById('craft-grid-town'),r_=r=>RARITY[r]||RARITY.normal;
  grid.innerHTML=CRAFTING.map(recipe=>{
    // Hide other class soul weapons
    if(recipe.classReq){
      const classKey=state.class?.toLowerCase();
      if(recipe.classReq!==classKey)return'';
    }

    // Block soul weapon if tier already crafted or skipping tiers
    if(recipe.result.category==='soul_weapon'){
      const classKey=state.class?.toLowerCase();
      const currentTier=state.craftedSoulTiers[classKey]||0;
      const recipeTier=recipe.result.soulTier;
      if(recipeTier<=currentTier)return''; // already crafted
      if(recipeTier>currentTier+1)return''; // can't skip tiers
    }

    const result=recipe.result,rColor=r_(result.rarity).color;
    const reqHtml=recipe.req.map(r=>{const have=getMaterialQty(r.name),ok=have>=r.qty;return`<div class="${ok?'ok':'no'}">• ${r.name}: ${have}/${r.qty} ${ok?'✅':'❌'}</div>`;}).join('');
    const canCraft=recipe.req.every(r=>getMaterialQty(r.name)>=r.qty);
    return`<div class="craft-card"><div class="craft-result" style="color:${rColor}">${result.name||result.slot} — <span style="color:${rColor}">${r_(result.rarity).label}</span></div><div style="font-size:.78em;color:#888;margin-bottom:5px;">${recipe.desc}</div><div class="craft-req">${reqHtml}</div><button class="craft-btn" onclick="craftItem('${recipe.id}')" ${canCraft?'':'disabled'}>⚗️ Craft</button></div>`;
  }).join('');
}
async function craftItem(recipeId){
  const recipe=CRAFTING.find(r=>r.id===recipeId);if(!recipe)return;
  if(!recipe.req.every(r=>getMaterialQty(r.name)>=r.qty)){notify('Missing materials!','var(--red)');return;}
  recipe.req.forEach(req=>{let need=req.qty;state.inventory.forEach(item=>{if(item.name===req.name&&item.stackable&&need>0){const take=Math.min(item.qty,need);item.qty-=take;need-=take;}});state.inventory=state.inventory.filter(i=>!i.stackable||(i.qty||0)>0);});
  const result={...recipe.result,uid:genUid(),sellPrice:Math.round((RARITY[recipe.result.rarity]?.mult||1)*15*state.level*.5)};
  if(result.stackable)result.qty=1;if(result.category==='equipment')result.equipped=false;
  addToInventory(result);state.quests.craft.done=true;
trackQuestCraft(result.name);

  if(result.category==='soul_weapon'){
    await equipSoulWeapon(result.uid);
    addLog(`⚗️ Crafted & bound: ${result.name}!`,'legendary');
    notify(`✨ Soul Weapon bound!`,'var(--legendary)');
    playSound('snd-craft');
    console.log('result.category:', result.category);
    renderCrafting();renderInventory();renderQuests();
    return;
  }

  addLog(`⚗️ Crafted: ${result.name}!`,result.rarity==='legendary'?'legendary':'purple');
  notify(`⚗️ Crafted ${result.name}!`,'var(--purple)');
  playSound('snd-craft');renderCrafting();renderInventory();renderQuests();await savePlayerToSupabase();
}

function renderSoulWeaponSlot(){
  const nameEl=document.getElementById('soul-weapon-name');
  const iconEl=document.getElementById('soul-weapon-icon');
  const passiveEl=document.getElementById('soul-weapon-passive');
  const skillEl=document.getElementById('soul-weapon-skill');
  if(!nameEl)return;

  if(!state.soulWeapon){
    nameEl.textContent='No Soul Weapon';
    nameEl.style.color='var(--text-dim)';
    iconEl.textContent='❓';
    iconEl.style.borderColor='var(--border)';
    iconEl.style.borderStyle='dashed';
    passiveEl.textContent='Craft your class Soul Weapon in the Town!';
    skillEl.textContent='';
    return;
  }

  const sw=SOUL_WEAPONS[state.soulWeapon.classId];
  const tier=sw?.tiers.find(t=>t.tier===state.soulWeapon.tier);
  const rarity=RARITY[tier?.rarity]||RARITY.normal;

  nameEl.textContent=`${state.soulWeapon.name} (Tier ${state.soulWeapon.tier}/5)`;
  nameEl.style.color=rarity.color;
  iconEl.textContent=state.soulWeapon.name.split(' ')[0];
  iconEl.style.borderColor=rarity.color;
  iconEl.style.borderStyle='solid';
  iconEl.style.boxShadow=`0 0 12px ${rarity.color}66`;
  passiveEl.innerHTML=sw?.passive?`<span style="color:var(--deep-gold);">⚡ Passive:</span> ${sw.passive.desc}`:'';
  skillEl.innerHTML=sw?.skill?`<span style="color:var(--legendary);">🎯 ${sw.skill.name}:</span> ${sw.skill.desc} <span style="color:var(--text-dim);">(CD: ${sw.skill.cd} turns)</span>`:'';
}

// ── SHOP ──
function switchShopTab(tab){
  currentShopTab=tab;
  document.querySelectorAll('.shop-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(`shop-tab-${tab}`).classList.add('active');renderShop();
}
async function renderShop() {
  const container = document.getElementById('shop-content-merchant') || document.getElementById('shop-content')
  if (!container) return

  container.innerHTML = `<div style="text-align:center;color:var(--text-dim);padding:20px;">Loading...</div>`

  try {
    const { data: { session } } = await dbClient.auth.getSession()
    const res = await fetch('https://xagwrqrgcuuitwgroiwh.supabase.co/functions/v1/get-shop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        character_id: state.character_id,
        tab: currentShopTab || 'equipment'
      })
    })

    const data = await res.json()
    if (data.error) throw new Error(data.error)

    const { items, lockedCount, nextLockedRank, nextLockedCount, mirelaIntro, playerGold, playerLevel } = data
    const r_ = r => RARITY[r] || RARITY.normal

    let html = ''

    // Mirela intro
    html += `
      <div style="background:rgba(200,168,75,0.05);border:1px solid var(--border);
        border-radius:8px;padding:10px 14px;margin-bottom:12px;
        font-style:italic;font-size:.82em;color:var(--text-dim);">
        💰 <span style="color:var(--gold);">Mirela:</span> "${mirelaIntro}"
      </div>`

    if (currentShopTab === 'equipment') {
      // Group visible items by rep tier
      const tiers = [
        { key: null,       label: '🏪 Basic Stock',              color: 'var(--text-dim)' },
        { key: 'baron',    label: '📦 Back Shelf — Baron+',      color: 'var(--rare)' },
        { key: 'chief',    label: '🔑 Real Inventory — Chief+',  color: 'var(--epic)' },
        { key: 'mayor',    label: '⭐ Reserved — Mayor+',        color: 'var(--legendary)' },
        { key: 'viscount', label: '💎 Hidden Shelf — Viscount+', color: '#00ffcc' },
        { key: 'count',    label: '👑 Legend Inventory — Count', color: '#ffd700' },
      ]

      tiers.forEach(tier => {
        const tierItems = items.filter(i => (i.repReq || null) === tier.key)
        if (!tierItems.length) return

        html += `
          <div style="font-family:var(--font-title);font-size:.65em;
            color:${tier.color};letter-spacing:2px;margin:12px 0 6px;">
            ${tier.label}
          </div>
          <div class="item-grid">`

        tierItems.forEach(item => {
          const cantAfford = playerGold < item.price
          const levelLocked = playerLevel < (item.levelReq || 0)
          html += `
            <div class="item-icon-box ${item.rarity}"
              onclick="showItemPopup('shop','${item.id}')"
              title="${item.name}"
              style="${cantAfford || levelLocked ? 'opacity:0.6;' : ''}">
              <div class="item-icon-emoji">${item.name.split(' ')[0]}</div>
              <div class="item-icon-price" style="color:${cantAfford ? 'var(--red)' : 'var(--gold)'};">
                💰${formatNumber(item.price)}
              </div>
              ${levelLocked ? `<div style="position:absolute;top:2px;left:2px;font-size:.5em;color:var(--red);">Lv${item.levelReq}</div>` : ''}
            </div>`
        })

        html += `</div>`
      })

      // Locked silhouettes — psychological torture 💀
      if (lockedCount > 0) {
        const nextLabel = nextLockedRank
          ? nextLockedRank.charAt(0).toUpperCase() + nextLockedRank.slice(1)
          : 'higher rank'

        html += `
          <div style="font-family:var(--font-title);font-size:.65em;
            color:#333;letter-spacing:2px;margin:16px 0 6px;">
            🔒 LOCKED — Reach ${nextLabel} to unlock
          </div>
          <div class="item-grid">`

        for (let i = 0; i < Math.min(nextLockedCount, 6); i++) {
          html += `
            <div class="item-icon-box" style="opacity:0.12;cursor:not-allowed;filter:blur(3px);">
              <div class="item-icon-emoji">❓</div>
              <div class="item-icon-price">???g</div>
            </div>`
        }

        if (lockedCount > nextLockedCount) {
          html += `
            <div style="grid-column:1/-1;text-align:center;
              color:#2a2a2a;font-size:.72em;padding:8px;font-style:italic;">
              +${lockedCount - nextLockedCount} more items in higher tiers...
            </div>`
        }

        html += `</div>`
      }

    } else {
      // Consumables
      const tiers = [
        { key: null,       label: '🏪 Basic Potions',      color: 'var(--text-dim)' },
        { key: 'baron',    label: '📦 Baron Potions',      color: 'var(--rare)' },
        { key: 'chief',    label: '🔑 Chief Potions',      color: 'var(--epic)' },
        { key: 'mayor',    label: '⭐ Mayor Potions',      color: 'var(--legendary)' },
        { key: 'viscount', label: '💎 Viscount Potions',   color: '#00ffcc' },
        { key: 'count',    label: '👑 Count Potions',      color: '#ffd700' },
      ]

      tiers.forEach(tier => {
        const tierItems = items.filter(i => (i.repReq || null) === tier.key)
        if (!tierItems.length) return

        html += `
          <div style="font-family:var(--font-title);font-size:.65em;
            color:${tier.color};letter-spacing:2px;margin:12px 0 6px;">
            ${tier.label}
          </div>
          <div class="item-grid">`

        tierItems.forEach(item => {
          const cantAfford = playerGold < item.price
          html += `
            <div class="item-icon-box ${item.rarity}"
              onclick="showItemPopup('shop','${item.id}')"
              title="${item.name}"
              style="${cantAfford ? 'opacity:0.6;' : ''}">
              <div class="item-icon-emoji">${item.name.split(' ')[0]}</div>
              <div class="item-icon-price" style="color:${cantAfford ? 'var(--red)' : 'var(--gold)'};">
                💰${formatNumber(item.price)}
              </div>
            </div>`
        })

        html += `</div>`
      })

      // Locked silhouettes
      if (lockedCount > 0) {
        const nextLabel = nextLockedRank
          ? nextLockedRank.charAt(0).toUpperCase() + nextLockedRank.slice(1)
          : 'higher rank'
        html += `
          <div style="font-family:var(--font-title);font-size:.65em;
            color:#333;letter-spacing:2px;margin:16px 0 6px;">
            🔒 LOCKED — Reach ${nextLabel} to unlock
          </div>
          <div class="item-grid">`

        for (let i = 0; i < Math.min(nextLockedCount, 4); i++) {
          html += `
            <div class="item-icon-box" style="opacity:0.12;cursor:not-allowed;filter:blur(3px);">
              <div class="item-icon-emoji">❓</div>
              <div class="item-icon-price">???g</div>
            </div>`
        }

        html += `</div>`
      }

      // Legacy Skill Tomes — unchanged
      const skillBooks = GAME_CONFIG.skill_books || []
      const defs = getLegacySkillDefs()
      const learned = getLearnedLegacySkills()

      if (skillBooks.length) {
        html += `
          <div style="font-family:var(--font-title);font-size:.65em;
            color:var(--text-dim);letter-spacing:2px;margin:12px 0 6px;">
            ✨ LEGACY SKILL TOMES
          </div>`

        skillBooks.forEach(book => {
          const def = defs[book.skillId]
          if (!def) return
          const currentRank = learned[book.skillId] || 0
          const nextRank = currentRank + 1
          const nextRankData = def.ranks[String(nextRank)]
          const isMaxed = currentRank >= 5
          const canAfford = state.gold >= book.price
          const hasLegacyPts = nextRankData && (state.legacyPoints || 0) >= nextRankData.cost
          const rColor = '#a855f7'

          html += `
            <div style="background:rgba(168,85,247,0.04);
              border:1px solid ${rColor}44;border-radius:8px;
              padding:10px;margin-bottom:8px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <div style="font-size:1.5em;">${def.icon}</div>
                <div style="flex:1;">
                  <div style="font-family:var(--font-title);font-size:.80em;color:${rColor};">${book.name}</div>
                  <div style="font-size:.65em;color:var(--text-dim);">${def.desc}</div>
                  ${currentRank > 0 ? `<div style="font-size:.62em;color:#a855f7;margin-top:2px;">Currently: Rank ${currentRank}/5</div>` : ''}
                </div>
                <div style="text-align:right;">
                  <div style="font-family:var(--font-title);color:var(--gold);font-size:.78em;">${formatNumber(book.price)}g</div>
                  ${nextRankData ? `<div style="font-size:.60em;color:#a855f7;">${nextRankData.cost} LP required</div>` : ''}
                </div>
              </div>
              ${isMaxed
                ? `<div style="text-align:center;font-size:.70em;color:var(--gold);padding:5px;background:rgba(255,153,0,0.08);border-radius:6px;">✅ MAX RANK — Fully Mastered!</div>`
                : `<button onclick="buySkillBook('${book.id}', '${book.skillId}')"
                    style="width:100%;padding:7px;font-size:.72em;
                    background:${canAfford && hasLegacyPts ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)'};
                    border:1px solid ${canAfford && hasLegacyPts ? rColor : 'var(--border)'};
                    border-radius:6px;
                    color:${canAfford && hasLegacyPts ? rColor : 'var(--text-dim)'};
                    cursor:${canAfford && hasLegacyPts ? 'pointer' : 'not-allowed'};">
                    ${currentRank === 0 ? '📖 Learn Skill' : `⬆️ Upgrade to Rank ${nextRank}`}
                    ${!canAfford ? ` (need ${formatNumber(book.price - state.gold)}g more)` : !hasLegacyPts && nextRankData ? ` (need ${nextRankData.cost - (state.legacyPoints||0)} more LP)` : ''}
                  </button>`}
            </div>`
        })
      }
    }

    container.innerHTML = html

    // Also update SHOP_EQUIP/SHOP_CONS in memory for buyItem() to work
    if (currentShopTab === 'equipment') {
      window._shopEquipCache = items
    } else {
      window._shopConsCache = items
    }

  } catch (err) {
    console.error('renderShop error:', err)
    container.innerHTML = `<div style="text-align:center;color:var(--red);padding:20px;">Failed to load shop. Check connection.</div>`
  }
}

// ── BUY SKILL BOOK FROM SHOP ──
async function buySkillBook(bookId, skillId) {
  const skillBooks = GAME_CONFIG.skill_books || [];
  const book = skillBooks.find(b => b.id === bookId);
  if (!book) { notify('Book not found!', 'var(--red)'); return; }

  const defs = getLegacySkillDefs();
  const def = defs[skillId];
  if (!def) { notify('Skill not found!', 'var(--red)'); return; }

  const learned = getLearnedLegacySkills();
  const currentRank = learned[skillId] || 0;
  const nextRank = currentRank + 1;
  const rankData = def.ranks[String(nextRank)];

  if (currentRank >= 5) {
    notify(`✅ ${def.name} is already max rank!`, 'var(--gold)');
    return;
  }

  // Check gold
  if (state.gold < book.price) {
    notify(`❌ Need ${formatNumber(book.price)}g!`, 'var(--red)');
    return;
  }

  // Check legacy points
  if ((state.legacyPoints || 0) < rankData.cost) {
    notify(`❌ Need ${rankData.cost} Legacy Points! You have ${state.legacyPoints || 0}.`, 'var(--red)');
    return;
  }

  const action = currentRank === 0 ? 'Learn' : `Upgrade to Rank ${nextRank}`;
  if (!confirm(
    `${action} ${def.icon} ${def.name}?\n\n` +
    `Cost: ${formatNumber(book.price)}g + ${rankData.cost} Legacy Points\n\n` +
    `Effect: ${rankData.desc}`
  )) return;

  // Deduct gold and legacy points
  addGold(-book.price); // ✅ sanitized
  state.legacyPoints -= rankData.cost;

  // Learn/upgrade skill
  if (!state.legacySkills) state.legacySkills = {};
  state.legacySkills[skillId] = nextRank;

  // Rebuild skills from source of truth
  await rebuildSkills();

  const action2 = currentRank === 0 ? 'Learned' : `Upgraded to Rank ${nextRank}`;
  addLog(`✨ ${action2}: ${def.icon} ${def.name}! ${rankData.desc}`, 'legendary');
  notify(`✨ ${def.icon} ${def.name} ${action2}!`, 'var(--gold)');
  playSound('snd-levelup');

  calcStats();
  updateUI();
  renderStatPoints();
  renderSkillBar();
  renderShop();
  await savePlayerToSupabase();
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
  const goldEl = document.getElementById('gold-val');
const goldElM = document.getElementById('gold-val-merchant');
if (goldEl) goldEl.textContent = formatNumber(state.gold);
if (goldElM) goldElM.textContent = formatNumber(state.gold);

const crystalEl = document.getElementById('soul-crystal-val');
const crystalElM = document.getElementById('soul-crystal-val-merchant');
if (crystalEl) crystalEl.textContent = formatNumber(state.soulCrystals || 0);
if (crystalElM) crystalElM.textContent = formatNumber(state.soulCrystals || 0);
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
  document.getElementById('lifesteal-val').textContent=(state.lifeSteal*100).toFixed(2)+'%';document.getElementById('char-level').textContent = `Level ${state.level} / 100`;

  
  updatePlayerAvatar();

  const atkspdEl = document.getElementById('atkspd-val');
if (atkspdEl) {
  const interval = state.attackInterval || 2000;
  const spd = ((2000 - interval) / 2000 * 100).toFixed(0);
  atkspdEl.textContent = `${spd}% (${(interval/1000).toFixed(1)}s)`;
}

const castspdEl = document.getElementById('castspd-val');
if (castspdEl) {
  castspdEl.textContent = `${((state.cdr||0)*100).toFixed(0)}% CDR`;
}

// Update class display
const charClassEl = document.getElementById('char-class');
if (charClassEl) {
  if (state.class) {
    const classIcons = {
      Warrior: '⚔️', Mage: '🔮', Rogue: '🗡️',
      Hunter: '🏹', Paladin: '✨', Necromancer: '💀',
      Shaman: '⚡', Berserker: '🐉',
    };
    const icon = classIcons[state.class] || '👤';
    charClassEl.textContent = `${icon} ${state.class}`;
    charClassEl.style.color = 'var(--gold)';
  } else {
    charClassEl.textContent = 'No Class';
    charClassEl.style.color = 'var(--text-dim)';
  }
}
  document.getElementById('hp-bar').style.width=Math.max(0,(hp/state.maxHp)*100)+'%';
  document.getElementById('mp-bar').style.width=Math.max(0,(mp/state.maxMp)*100)+'%';
  document.getElementById('xp-bar').style.width=Math.min(100,(state.xp/state.xpNext)*100)+'%';
  document.getElementById('arena-player-hp').style.width=Math.max(0,(hp/state.maxHp)*100)+'%';
  document.getElementById('arena-player-mp').style.width=Math.max(0,(mp/state.maxMp)*100)+'%';
  updateClassDisplay()
  updateRepBar();
  renderStatPoints();
  renderSoulWeaponSlot();
  renderTournamentRewards();
  updateTutorialStatus();
  renderBuffsAndTitles();
  renderPlayerStatPanel()
}

// ── LEADERBOARD ──
async function fetchLeaderboard(){
  try {
    document.getElementById('lb-list').innerHTML='<div class="lb-empty">Loading...</div>';
    
    const { data, error } = await dbClient
  .from('characters_public')
  .select('*')
  .order('level', { ascending: false })
  .order('id', { ascending: false })
  .limit(10);

    if(error) throw error;
    if(!data || !data.length){
      document.getElementById('lb-list').innerHTML='<div class="lb-empty">No players yet! 🏆</div>';
      return;
    }

    renderLeaderboard(data);
  } catch(e){
    document.getElementById('lb-list').innerHTML='<div class="lb-empty">Could not load leaderboard.</div>';
    console.error('Leaderboard error:',e);
  }
}

function renderLeaderboard(scores){
  const list=document.getElementById('lb-list');
  if(!scores||!scores.length){
    list.innerHTML='<div class="lb-empty">No scores yet! 🏆</div>';
    return;
  }
  const medals=['🥇','🥈','🥉'];
  const cls=['gold','silver','bronze'];
  list.innerHTML=scores.map((s,i)=>{
    const title = s.reputation >= 75000 ? '👑' :
                  s.reputation >= 35000 ? '🔵' :
                  s.reputation >= 15000 ? '🟢' :
                  s.reputation >= 5000  ? '🟡' :
                  s.reputation >= 1000  ? '⚪' : '';
    return `<div class="lb-row">
      <div class="lb-rank ${cls[i]||''}">${medals[i]||'#'+(i+1)}</div>
      <div class="lb-name">${title} ${s.name||'Unknown'}</div>
      <div class="lb-class">${s.class||'Adventurer'}</div>
      <div class="lb-level">⭐ Lv.${s.level}</div>
      <div class="lb-gold-col">💰 ${formatNumber(s.gold)}g</div>
    </div>`;
  }).join('');
}

// ── CLICK SOUND ──
const clickSnd=document.getElementById('clickSound');
document.addEventListener('click',e=>{
  if(['BUTTON','A'].includes(e.target.tagName)){if(clickSnd){clickSnd.currentTime=0;clickSnd.play().catch(()=>{});}}
});