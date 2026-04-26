// ── DEV MODE — set to false before going public! ──
const DEV_MODE = false;
window.addEventListener('beforeunload', (e) => {
  e.preventDefault();
  e.returnValue = '';
});
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

  // ── Register legacy skills ──
  if (typeof registerLegacySkills === 'function') registerLegacySkills();
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
      state.strMult *= (1 + (m.strMult || 0.8));
      state.attackPowerMult *= (1 + (m.atkMult || 0.6));
      state.hitMult *= 1.3;
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
      state.strMult *= (1 + (m.strMult || 0.8));
      state.attackPowerMult *= (1 + (m.atkMult || 0.6));
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
function spendStatPoint(statKey, amount) {
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
  savePlayerToSupabase();
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

// ── REGISTER LEGACY SKILLS INTO SKILLS OBJECT ──
function registerLegacySkills() {
  const learned = getLearnedLegacySkills();
  const defs = getLegacySkillDefs();

  Object.entries(learned).forEach(([skillId, rank]) => {
    const def = defs[skillId];
    if (!def || !rank) return;

    const rankData = def.ranks[String(rank)];
    if (!rankData) return;

    // Register into SKILLS object so combat system picks it up
    SKILLS[skillId] = {
      name: def.name,
      icon: def.icon,
      mp: () => Math.floor(state.maxMp * def.mp),
      cd: def.cd,
      isLegacy: true,
      rank: rank,
      use: buildLegacySkillUse(skillId, rank),
    };
  });
}

// ── LEARN LEGACY SKILL FROM BOOK ──
function learnLegacySkill(skillId) {
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

  // Register into SKILLS
  registerLegacySkills();

  // Add to skill bar if not already there
  if (!state.skills.includes(skillId)) {
    state.skills.push(skillId);
  }

  const action2 = currentRank === 0 ? 'Learned' : `Upgraded to Rank ${nextRank}`;
  addLog(`✨ ${action2}: ${def.icon} ${def.name}! (${rankData.desc})`, 'legendary');
  notify(`✨ ${def.icon} ${def.name} ${action2}!`, 'var(--gold)');
  playSound('snd-levelup');

  calcStats();
  updateUI();
  renderStatPoints();
  renderSkillBar();
  savePlayerToSupabase();
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
  // Identity (set on login/register)
  character_id: null,
  user_id: null,

  

  respecCount: 0,

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
function calcStats(){
  // Check gold multiplier expiry
if(state.goldMultExpiry && new Date() > new Date(state.goldMultExpiry)) {
  state.goldMult = 1.0;
  state.goldMultExpiry = null;
}
  const strMult      = state.strMult      + (state.classBonuses.strMult     ||0) + (state.talentBonuses.strMult     ||0) + (state.equipStrMult || 0);
  const agiMult      = state.agiMult      + (state.classBonuses.agiMult     ||0) + (state.talentBonuses.agiMult     ||0) + (state.equipAgiMult || 0);
  const intMult      = state.intMult      + (state.classBonuses.intMult     ||0) + (state.talentBonuses.intMult     ||0) + (state.equipIntMult || 0);
  const staMult      = state.staMult      + (state.classBonuses.staMult     ||0) + (state.talentBonuses.staMult     ||0) + (state.equipStaMult || 0);
  const atkpMult     = state.attackPowerMult + (state.classBonuses.attackPowerMult||0) + (state.talentBonuses.attackPowerMult||0) + (state.equipAttackPowerMult || 0);
  const armorMult    = state.armorMult    + (state.classBonuses.armorMult   ||0) + (state.talentBonuses.armorMult   ||0) + (state.equipArmorMult || 0);
  const critMult     = state.critMult     + (state.classBonuses.critMult    ||0) + (state.talentBonuses.critMult    ||0);
  const dodgeMult    = state.dodgeMult    + (state.classBonuses.dodgeMult   ||0) + (state.talentBonuses.dodgeMult   ||0) + (state.equipDodgeMult || 0);
  const hitMult      = state.hitMult      + (state.classBonuses.hitMult     ||0) + (state.talentBonuses.hitMult     ||0) + (state.equipHitMult || 0);
  const mpMult       = state.mpMult       + (state.classBonuses.mpMult      ||0) + (state.talentBonuses.mpMult      ||0) + (state.equipMpMult || 0);
  const hpRegenMult  = state.hpRegenMult  + (state.classBonuses.hpRegenMult ||0) + (state.talentBonuses.hpRegenMult ||0) + (state.equipHpRenMult || 0);
  const mpRegenMult  = state.mpRegenMult  + (state.classBonuses.mpRegenMult ||0) + (state.talentBonuses.mpRegenMult ||0) + (state.equipMpRegenMult || 0);
  const speedCfg = GAME_CONFIG.combat_speed || {};
const atkSpdPerAgi = speedCfg.attack_speed_per_agi || 0.5;
const castSpdPerInt = speedCfg.cast_speed_per_int || 0.3;
const minInterval = speedCfg.min_attack_interval_ms || 400;
const maxInterval = speedCfg.max_attack_interval_ms || 2000;
const maxAtkSpd = speedCfg.max_attack_speed || 800;
const maxCastSpd = speedCfg.max_cast_speed || 100;
const maxCdr = speedCfg.max_cdr || 0.50;

state.attackSpeed = Math.min(maxAtkSpd, Math.floor(state.agi * atkSpdPerAgi));
state.castSpeed = Math.min(maxCastSpd, Math.floor(state.int * castSpdPerInt));
state.attackInterval = Math.max(minInterval, maxInterval - (state.attackSpeed * 2));
state.cdr = Math.min(maxCdr, state.castSpeed / 200);

  state.str = Math.floor(state.baseStr * strMult) + (state.equipStr||0) + (state.talentBonuses.baseStr||0);
  state.agi = Math.floor(state.baseAgi * agiMult) + (state.equipAgi||0) + (state.talentBonuses.baseAgi||0);
  state.int = Math.floor(state.baseInt * intMult) + (state.equipInt||0) + (state.talentBonuses.baseInt||0);
  state.sta = Math.floor(state.baseSta * staMult) + (state.equipSta||0) + (state.talentBonuses.baseSta||0);
  state.attackPower = Math.floor(
  (state.str * 4 + state.int * 3 + state.level * 15) * atkpMult
) + (state.equipAttackPower||0) + (state.talentBonuses.baseAttackPower||0);
  state.maxHp = Math.floor(
  100 + (state.str * 20) + (state.sta * 30) + (state.level * 80)
) + (state.equipMaxHp||0);
  state.armor = Math.floor(
  ((state.agi * 8 + state.baseArmor + state.level * 10 + (state.talentBonuses.baseArmor||0)) * armorMult)
) + (state.equipArmor||0);
  state.crit         = Math.floor(((state.agi*0.0005+state.baseCrit)*critMult) + (state.equipCrit||0) + (state.talentBonuses.baseCrit||0));
  state.dodge        = Math.floor(((state.agi*1.9+state.baseDodge)*dodgeMult) + (state.equipDodge||0) + (state.talentBonuses.baseDodge||0));
  state.hit          = Math.floor(((state.agi*5.3+state.baseHit)*hitMult) + (state.equipHit||0) + (state.talentBonuses.baseHit||0));
  state.maxMp        = Math.floor((50+state.int*3)*mpMult) + (state.equipMaxMp||0);
  state.manaRegen    = Math.floor((0.5+state.int*1.5)*mpRegenMult) + (state.equipMpRegen||0);
  state.hpRegen      = Math.floor((state.sta*0.5+state.baseHpRegen+(state.talentBonuses.baseHpRegen||0))*hpRegenMult) + (state.equipHpRegen||0);
  state.lifeSteal    = (state.baseLifeSteal+state.talentBonuses.baseLifeSteal||0) + (state.equipLifeSteal||0);
  // Magic penetration (Mage class bonus)
  state.magicPen = (CLASSES[state.class]?.bonuses?.magicPen || 0) +
  (state.talentBonuses.magicPen || 0);

  // Spell power multiplier (from Mage arcane talents)
  state.spellPowerMult = state.talentBonuses.spellPowerMult || 0;

  // Heal power multiplier (from Paladin holy talents)
  state.healPowerMult = state.talentBonuses.healPowerMult || 0;

  // Damage reduction (from Shaman earth talents)
  state.dmgReduction = state.talentBonuses.dmgReduction || 0;

  // Damage reflect (from Paladin protection talents)
  state.dmgReflect = state.talentBonuses.dmgReflect || 0;

  // Chain lightning chance (from Shaman lightning talents)
  state.chainLightningChance = state.talentBonuses.chainChance || 0;

  // Attack speed — scales with AGI (how fast auto attacks fire)
// Base 0, each AGI point gives 0.5 speed, soft cap at 800
state.attackSpeed = Math.min(800, Math.floor(state.agi * 0.5));

// Cast speed — scales with INT (reduces skill cooldowns)
// Base 0, each INT point gives 0.3 speed, soft cap at 100 (= 50% CDR)
state.castSpeed = Math.min(100, Math.floor(state.int * 0.3));

// Attack interval in ms — used by auto fight timer
// Min 400ms, Max 2000ms
state.attackInterval = Math.max(400, 2000 - (state.attackSpeed * 2));

// Cooldown reduction % from cast speed
// castSpeed 100 = 50% CDR, castSpeed 0 = 0% CDR
state.cdr = Math.min(0.50, state.castSpeed / 200);

  state.hp = Math.min(state.hp, state.maxHp);
  state.mp = Math.min(state.mp, state.maxMp);
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
        {id:'death_mark',name:'Lethal Focus',desc:'3% CRIT per rank',cost:30,ranks:3,effect:()=>{state.talentBonuses.baseCrit=(state.talentBonuses.baseCrit||0)+2;}},
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
      {id:'bloodthirst',name:'Bloodthirst',desc:'10% LIFESTEAL per rank',cost:10,ranks:10,effect:()=>{state.talentBonuses.baseLifeSteal=(state.talentBonuses.baseLifeSteal||0)+0.1;}},
      {id:'savage_wounds',name:'Savage Wounds',desc:'20% LIFESTEAL per rank',cost:20,ranks:5,effect:()=>{state.talentBonuses.baseLifeSteal=(state.talentBonuses.baseLifeSteal||0)+0.2;}},
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
    state.battleCryActive=true;state.strMult*=2.5;state.attackPowerMult*=2.4;state.hitMult*=1.5;
    addCombatLog(`📯 Battle Cry! +25% STR, +25% ATTACK POWER!`,'good');playSound('snd-magic');calcStats();return 0;}},
  last_stand:{name:'Last Stand',icon:'🛡️',mp:()=>Math.floor(state.maxMp*0.20),cd:6,use:(e)=>{
    const h=Math.floor(state.maxHp*0.15);state.hp=Math.min(state.maxHp,state.hp+h);
    addCombatLog(`🛡️ Last Stand! +${h} HP!`,'good');playSound('snd-heal');spawnDmgFloat(`+${h}HP`,false,'heal-float');calcStats();return 0;}},
  fireball:{name:'Fireball',icon:'🔥',mp:()=>Math.floor(state.maxMp*0.12),cd:4,use:(e)=>{
    const d=Math.floor(state.int*6+Math.random()*state.int*2);e.hp-=d;addCombatLog(`🔥 Fireball! ${d} dmg!`,'good');playSound('snd-magic');animateAttack(true,d,false);return d;}},
  ice_lance:{name:'Ice Lance',icon:'❄️',mp:()=>Math.floor(state.maxMp*0.10),cd:6,use:(e)=>{
    const d=Math.floor(state.int*4.5);e.hp-=d;e.frozen=true;
    addCombatLog(`❄️ Ice Lance! ${d} dmg — Frozen!`,'info');playSound('snd-magic');animateAttack(true,d,false);return d;}},
  mana_shield:{name:'Mana Shield',icon:'🔮',mp:()=>Math.floor(state.maxMp*0.25),cd:10,use:(e)=>{
    state.manaShield=true;addCombatLog(`🔮 Mana Shield active!`,'info');playSound('snd-heal');return 0;}},
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
  const healAmt=Math.floor(state.maxHp*0.20);state.hp=Math.min(state.maxHp,state.hp+healAmt);
  state.armorMult*=1.2;
  addCombatLog(`🪨 Earth Totem! +${healAmt} HP, +30% ARMOR!`,'good');
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
  state.battleCryActive=true;state.strMult*=3.0;state.attackPowerMult*=2.5;
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

// ── SWITCH MAIN SCENE ──
function switchMainScene(scene){
  document.querySelectorAll('.main-scene').forEach(s=>s.style.display='none');
  document.getElementById(`main-scene-${scene}`).style.display='block';
  ['char','adv','town'].forEach(s=>document.getElementById(`nav-${s}`).classList.remove('active'));
  document.getElementById(`nav-${scene}`).classList.add('active');
  if(scene==='adv')loadScene(state.currentScene||'town');
  if(scene==='town')renderShop();
}

const MONSTER_TEMPLATES = {
  // Stage 1 — Level 1-9 — atk ~player lvl1 ATK (80), HP takes ~15 hits
  young_wolf:      {id:'young_wolf',     name:'🐺 Young Wolf',      icon:'wolf',    hp:1200,   atk:60,    armor:5000,   hit:80,   dodge:50,   xp:800,   gold:[300,600]},
  forest_wolf:     {id:'forest_wolf',    name:'🐺 Forest Wolf',     icon:'wolf',    hp:1800,   atk:120,    armor:5000,   hit:160,  dodge:130,   xp:1200,  gold:[500,1000]},
  shadow_wolf:     {id:'shadow_wolf',    name:'🐺 Shadow Wolf',     icon:'wolf',    hp:2400,   atk:240,   armor:5000,   hit:220,  dodge:190,   xp:1600,  gold:[800,1400]},
  dire_wolf:       {id:'dire_wolf',      name:'🐺 Dire Wolf',       icon:'wolf',    hp:3200,   atk:400,   armor:5000,  hit:350,  dodge:250,  xp:2000,  gold:[1000,1800]},

  // Stage 2 — Level 10-19 — player ATK ~290, HP ~1730
  cave_spider:     {id:'cave_spider',    name:'🕷️ Cave Spider',     icon:'spider',  hp:8000,   atk:2200,   armor:5000,  hit:1200,  dodge:800,  xp:2400,  gold:[1200,2000]},
  venom_spider:    {id:'venom_spider',   name:'🕷️ Venom Spider',    icon:'spider',  hp:12000,  atk:2800,   armor:5000,  hit:1800,  dodge:1000,  xp:3000,  gold:[1600,2600]},
  giant_spider:    {id:'giant_spider',   name:'🕷️ Giant Spider',    icon:'spider',  hp:18000,  atk:3400,   armor:5000,  hit:2000,  dodge:1600,  xp:3700,  gold:[2000,3200]},
  queen_spider:    {id:'queen_spider',   name:'🕷️ Queen Spider',    icon:'spider',  hp:26000,  atk:4200,   armor:5000,  hit:2500,  dodge:1900,  xp:4500,  gold:[2500,4000]},

  // Stage 3 — Level 20-29 — player ATK ~620, HP ~3580
  goblin_scout:    {id:'goblin_scout',   name:'👹 Goblin Scout',    icon:'goblin',  hp:40000,  atk:4800,   armor:20000,  hit:2000,  dodge:1000,  xp:5400,  gold:[3000,4800]},
  goblin_warrior:  {id:'goblin_warrior', name:'👹 Goblin Warrior',  icon:'goblin',  hp:60000,  atk:5800,   armor:20000,  hit:3500,  dodge:2800,  xp:6500,  gold:[3800,5800]},
  goblin_shaman:   {id:'goblin_shaman',  name:'👹 Goblin Shaman',   icon:'goblin',  hp:85000,  atk:7000,   armor:20000,  hit:4000,  dodge:3000,  xp:7800,  gold:[4600,7000]},
  goblin_elite:    {id:'goblin_elite',   name:'👹 Goblin Elite',    icon:'goblin',  hp:120000, atk:8600,   armor:20000,  hit:5500, dodge:4800,  xp:9400,  gold:[5600,8400]},

  // Stage 4 — Level 30-39 — player ATK ~1050, HP ~6280
  skeleton_archer: {id:'skeleton_archer',name:'💀 Skeleton Archer', icon:'skeleton',hp:160000, atk:10000,  armor:20000, hit:6500, dodge:5000, xp:11000, gold:[6600,10000]},
  skeleton_warrior:{id:'skeleton_warrior',name:'💀 Skeleton Warrior',icon:'skeleton',hp:220000, atk:12000,  armor:20000, hit:8000, dodge:6000, xp:13200, gold:[8000,12000]},
  skeleton_mage:   {id:'skeleton_mage',  name:'💀 Skeleton Mage',   icon:'skeleton',hp:300000, atk:14500,  armor:20000, hit:10200, dodge:9500, xp:15800, gold:[9600,14400]},
  skeleton_knight: {id:'skeleton_knight',name:'💀 Skeleton Knight', icon:'skeleton',hp:420000, atk:17500,  armor:20000, hit:12000, dodge:10500, xp:19000, gold:[11600,17400]},

  // Stage 5 — Level 40-49 — player ATK ~1580, HP ~9780
  orc_grunt:       {id:'orc_grunt',      name:'👊 Orc Grunt',       icon:'orc',     lifeSteal:1.5, hp:560000, atk:20000,  armor:50000, hit:15000, dodge:12000, xp:22800, gold:[14000,21000]},
  orc_warrior:     {id:'orc_warrior',    name:'👊 Orc Warrior',     icon:'orc',     lifeSteal:1.5, hp:760000, atk:20000,  armor:50000, hit:18000, dodge:13000, xp:27400, gold:[16800,25200]},
  orc_shaman:      {id:'orc_shaman',     name:'👊 Orc Shaman',      icon:'orc',     lifeSteal:1.5, hp:1000000,atk:20000,  armor:50000, hit:20000, dodge:17000, xp:32800, gold:[20200,30200]},
  orc_berserker:   {id:'orc_berserker',  name:'👊 Orc Berserker',   icon:'orc',     lifeSteal:1.5, hp:1400000,atk:20000,  armor:50000, hit:22000, dodge:19000, xp:39400, gold:[24200,36400]},

  // Stage 6 — Level 50-59 — player ATK ~2210, HP ~14080
  vampire_thrall:  {id:'vampire_thrall', name:'🧛 Vampire Thrall',  icon:'vampire', hp:1800000,atk:42000,  armor:50000, hit:26000, dodge:22000, xp:47200, gold:[29000,43600]},
  vampire_hunter:  {id:'vampire_hunter', name:'🧛 Vampire Hunter',  icon:'vampire', hp:2400000,atk:50000,  armor:50000, hit:30000, dodge:25000, xp:56800, gold:[35000,52400]},
  vampire_noble:   {id:'vampire_noble',  name:'🧛 Vampire Noble',   icon:'vampire', hp:3200000,atk:60000,  armor:50000, hit:40000, dodge:30000, xp:68200, gold:[42000,63000]},
  vampire_elder:   {id:'vampire_elder',  name:'🧛 Vampire Elder',   icon:'vampire', hp:4200000,atk:72000,  armor:50000, hit:48000, dodge:38200, xp:81800, gold:[50400,75600]},

  // Stage 7 — Level 60-69 — player ATK ~2940, HP ~19180
  cave_troll:      {id:'cave_troll',     name:'👾 Cave Troll',      icon:'troll',   hp:5500000,atk:85000,  armor:80000,hit:40500,dodge:30500, xp:98200, gold:[60500,90800]},
  rock_troll:      {id:'rock_troll',     name:'👾 Rock Troll',      icon:'troll',   hp:7200000,atk:100000, armor:80000,hit:62500,dodge:45000,xp:117800,gold:[72600,109000]},
  frost_troll:     {id:'frost_troll',    name:'👾 Frost Troll',     icon:'troll',   hp:9500000,atk:120000, armor:80000,hit:75000,dodge:55000,xp:141400,gold:[87200,130800]},
  war_troll:       {id:'war_troll',      name:'👾 War Troll',       icon:'troll',   hp:12500000,atk:145000,armor:80000,hit:80000,dodge:70500,xp:169600,gold:[104600,157000]},

  // Stage 8 — Level 70-79 — player ATK ~3770, HP ~25080
  demon_scout:     {id:'demon_scout',    name:'😈 Demon Scout',     icon:'demon',   hp:16000000,atk:170000,armor:80000,hit:121000,dodge:87000,xp:203600,gold:[125600,188400]},
  demon_warrior:   {id:'demon_warrior',  name:'😈 Demon Warrior',   icon:'demon',   hp:21000000,atk:200000,armor:80000,hit:125000,dodge:99000,xp:244400,gold:[150800,226200]},
  demon_mage:      {id:'demon_mage',     name:'😈 Demon Mage',      icon:'demon',   hp:27000000,atk:240000,armor:80000,hit:160000,dodge:124000,xp:293200,gold:[181000,271400]},
  demon_knight:    {id:'demon_knight',   name:'😈 Demon Knight',    icon:'demon',   hp:35000000,atk:290000,armor:80000,hit:186000,dodge:169000,xp:351800,gold:[217200,325800]},

  // Stage 9 — Level 80-89 — player ATK ~4700, HP ~31780
  shadow_wraith:   {id:'shadow_wraith',  name:'🌑 Shadow Wraith',   icon:'werewolf',hp:44000000,atk:340000,armor:160000,hit:220000,dodge:190000,xp:422200,gold:[260600,391000]},
  shadow_knight:   {id:'shadow_knight',  name:'🌑 Shadow Knight',   icon:'werewolf',hp:56000000,atk:400000,armor:160000,hit:280000,dodge:220000,xp:506600,gold:[312800,469200]},
  shadow_mage:     {id:'shadow_mage',    name:'🌑 Shadow Mage',     icon:'werewolf',hp:70000000,atk:470000,armor:160000,hit:340000,dodge:267000,xp:608000,gold:[375400,563000]},
  shadow_lord:     {id:'shadow_lord',    name:'🌑 Shadow Lord',     icon:'werewolf',hp:88000000,atk:550000,armor:160000,hit:409000,dodge:305000,xp:729600,gold:[450500,675800]},

  // Stage 10 — Level 90-100 — player ATK ~5730, HP ~39280
  eternal_guard:   {id:'eternal_guard',  name:'🌟 Eternal Guard',   icon:'phoenix', hp:110000000,atk:640000,armor:160000, hit:380000, dodge:334000,xp:875600, gold:[540600,811000]},
  eternal_warrior: {id:'eternal_warrior',name:'🌟 Eternal Warrior', icon:'phoenix', hp:140000000,atk:750000,armor:160000,hit:444000, dodge:375000,xp:1050800,gold:[648800,973200]},
  eternal_mage:    {id:'eternal_mage',   name:'🌟 Eternal Mage',    icon:'phoenix', hp:175000000,atk:880000,armor:160000,hit:511000,dodge:458000,xp:1261000,gold:[778600,1168000]},
  eternal_champion:{id:'eternal_champion',name:'🌟 Eternal Champion',icon:'phoenix',hp:220000000,atk:1040000,armor:160000,hit:613000,dodge:504000,xp:1513000,gold:[934400,1401600]},
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
  // Boss 1 — after Stage 1 (player ~Lv9, ATK ~260, HP ~1580)
  stage_boss_1:{id:'stage_boss_1',name:'🐺 Wolf King',icon:'🐺',
    hp:18000,atk:500,armor:20000,hit:600,dodge:400,xp:4000,gold:[3000,6000],
    ability:{name:'PACK HOWL!',color:'#ffdd00',triggerEvery:3,effect:(e)=>{
      const d=Math.floor(e.atk*0.5);state.hp=Math.max(1,state.hp-d);
      spawnAbilityFloat('🐺 PACK HOWL!','#ffdd00');
      addCombatLog(`🐺 Wolf King howls! Pack attacks for ${d}!`,'bad');
      animateAttack(false,d,false);}},
    cs:{title:'Wolf King',req:'Required: Stage 1 Clear',text:'The mighty Wolf King rises from the pack!'}},

  // Boss 2 — after Stage 2 (player ~Lv19, ATK ~560, HP ~3380)
  stage_boss_2:{id:'stage_boss_2',name:'🕷️ Spider Queen',icon:'🕷️',
    hp:120000,atk:8600,armor:50000,hit:5500,dodge:4600,xp:8000,gold:[8000,16000],
    ability:{name:'WEB TRAP!',color:'#44ff44',triggerEvery:3,effect:(e)=>{
      state.webTrapped=2;
      spawnAbilityFloat('🕸️ WEB TRAP!','#44ff44');
      addCombatLog(`🕸️ Spider Queen webs you! Dodge 0 for 2 turns!`,'bad');}},
    cs:{title:'Spider Queen',req:'Required: Stage 2 Clear',text:'From the depths of her web kingdom, the Spider Queen descends!'}},

  // Boss 3 — after Stage 3 (player ~Lv29, ATK ~940, HP ~6080)
  stage_boss_3:{id:'stage_boss_3',name:'👹 Goblin Warlord',icon:'👹',
    hp:480000,atk:13200,armor:50000,hit:12000,dodge:10200,xp:16000,gold:[15000,28000],
    ability:{name:'GOLD STEAL!',color:'#f0c040',triggerEvery:3,effect:(e)=>{
      const s=Math.floor(state.gold*0.10);state.gold=Math.max(0,state.gold-s);
      spawnAbilityFloat('💰 GOLD STEAL!','#f0c040');
      addCombatLog(`💰 Goblin Warlord steals ${s} gold!`,'bad');}},
    cs:{title:'Goblin Warlord',req:'Required: Stage 3 Clear',text:'The Goblin Warlord commands an army of thieves!'}},

  // Boss 4 — after Stage 4 (player ~Lv39, ATK ~1460, HP ~9480)
  stage_boss_4:{id:'stage_boss_4',name:'💀 Skeleton Lord',icon:'💀',
    hp:1800000,atk:29500,armor:50000,hit:18500,dodge:16500,xp:21000,gold:[30000,55000],
    ability:{name:'DEATH CURSE!',color:'#aa44ff',triggerEvery:3,effect:(e)=>{
      const r=Math.floor(state.maxHp*0.05);
      state.activeDebuffs.maxHpReduction+=r;
      state.equipMaxHp=(state.equipMaxHp||0)-r;
      spawnAbilityFloat('💀 DEATH CURSE!','#aa44ff');
      addCombatLog(`💀 Death Curse! Max HP -${r}!`,'bad');
      calcStats();}},
    cs:{title:'Skeleton Lord',req:'Required: Stage 4 Clear',text:'The Skeleton Lord rises from his eternal tomb!'}},

  // Boss 5 — after Stage 5 (player ~Lv49, ATK ~2090, HP ~13880)
  stage_boss_5:{id:'stage_boss_5',name:'👊 Orc Chieftain',icon:'👊',
    hp:6000000,atk:63000,armor:80000,hit:46000,dodge:33000,xp:42000,gold:[60000,110000],
    ability:{name:'BERSERKER RAGE!',color:'#ff8800',triggerEvery:5,effect:(e)=>{
      currentEnemy.atk=Math.floor(currentEnemy.atk*2);
      currentEnemy.rageTimer=3;
      spawnAbilityFloat('👊 BERSERKER RAGE!','#ff8800');
      addCombatLog(`👊 Orc Chieftain berserk! ATK doubled!`,'bad');}},
    cs:{title:'Orc Chieftain',req:'Required: Stage 5 Clear',text:'The Orc Chieftain is the strongest warrior alive!'}},

  // Boss 6 — after Stage 6 (player ~Lv59, ATK ~2820, HP ~19480)
  stage_boss_6:{id:'stage_boss_6',name:'🧛 Vampire Lord',icon:'🧛',
    hp:18000000,atk:120000,armor:80000,hit:72000,dodge:56000,xp:80000,gold:[110000,200000],
    ability:{name:'LIFE DRAIN!',color:'#ff2244',triggerEvery:3,effect:(e)=>{
      const h=Math.floor(currentEnemy.atk*0.2);
      currentEnemy.hp=Math.min(currentEnemy.maxHp,currentEnemy.hp+h);
      spawnAbilityFloat('🧛 LIFE DRAIN!','#ff2244');
      addCombatLog(`🧛 Vampire Lord drains life! +${h} HP!`,'bad');
      updateEnemyBar();}},
    cs:{title:'Vampire Lord',req:'Required: Stage 6 Clear',text:'The Vampire Lord rules the night!'}},

  // Boss 7 — after Stage 7 (player ~Lv69, ATK ~3650, HP ~26180)
  stage_boss_7:{id:'stage_boss_7',name:'👾 Troll King',icon:'👾',
    hp:55000000,atk:222000,armor:160000,hit:125000,dodge:92000,xp:160000,gold:[200000,380000],
    ability:{name:'REGENERATION!',color:'#00ff88',triggerEvery:2,effect:(e)=>{
      const h=Math.floor(currentEnemy.maxHp*0.03);
      currentEnemy.hp=Math.min(currentEnemy.maxHp,currentEnemy.hp+h);
      spawnAbilityFloat('👾 REGENERATION!','#00ff88');
      addCombatLog(`👾 Troll King regenerates ${h} HP!`,'bad');
      updateEnemyBar();}},
    cs:{title:'Troll King',req:'Required: Stage 7 Clear',text:'The Troll King cannot be killed!'}},

  // Boss 8 — after Stage 8 (player ~Lv79, ATK ~4580, HP ~33980)
  stage_boss_8:{id:'stage_boss_8',name:'😈 Demon Prince',icon:'😈',
    hp:160000000,atk:405000,armor:160000,hit:160000,dodge:135000,xp:300000,gold:[380000,700000],
    ability:{name:'HELLFIRE!',color:'#ff4400',triggerEvery:3,effect:(e)=>{
      const d=Math.floor(currentEnemy.atk*0.8);
      state.hp=Math.max(1,state.hp-d);
      spawnAbilityFloat('😈 HELLFIRE!','#ff4400');
      addCombatLog(`😈 Hellfire! ${d} true damage — armor ignored!`,'bad');
      animateAttack(false,d,false);}},
    cs:{title:'Demon Prince',req:'Required: Stage 8 Clear',text:'The Demon Prince wields hellfire that melts through any armor!'}},

  // Boss 9 — after Stage 9 (player ~Lv89, ATK ~5660, HP ~43280)
  stage_boss_9:{id:'stage_boss_9',name:'🌑 Shadow Emperor',icon:'🌑',
    hp:450000000,atk:810000,armor:400000,hit:460000,dodge:210000,xp:600000,gold:[700000,1300000],
    ability:{name:'PHASE SHIFT!',color:'#4488ff',triggerEvery:3,effect:(e)=>{
      currentEnemy.phaseShifted=true;
      spawnAbilityFloat('🌑 PHASE SHIFT!','#4488ff');
      addCombatLog(`🌑 Shadow Emperor phases out! Next attack misses!`,'bad');}},
    cs:{title:'Shadow Emperor',req:'Required: Stage 9 Clear',text:'The Shadow Emperor exists between dimensions!'}},

  // Boss 10 — FINAL BOSS (player ~Lv99, ATK ~6790, HP ~53580)
  stage_boss_10:{id:'stage_boss_10',name:'🌟 Eternal King',icon:'🌟',
    hp:1200000000,atk:1400000,armor:400000,hit:800000,dodge:400000,xp:1000000,gold:[1500000,3000000],
    ability:{name:'ALL POWERS!',color:'#ffffff',triggerEvery:2,effect:(e)=>{
      const d=Math.floor(currentEnemy.atk*0.6);
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
  startStageBossFight();return;
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
  const stageScale=1+(stageLevel-1)*0.4;
  const prefix=state.difficulty==='hell'?'💀 Hell ':state.difficulty==='hard'?'🔥 Hard ':'';
  currentEnemy={...boss,name:prefix+boss.name,hp:Math.floor(boss.hp*stageScale*diff.hpMult),maxHp:Math.floor(boss.hp*stageScale*diff.hpMult),atk:Math.floor(boss.atk*stageScale*diff.atkMult),armor:Math.floor(boss.armor*stageScale),hit:Math.floor(boss.hit*stageScale),dodge:Math.floor(boss.dodge*stageScale),xp:Math.floor(boss.xp*diff.xpMult),gold:[Math.floor(boss.gold[0]*diff.goldMult),Math.floor(boss.gold[1]*diff.goldMult)],poisoned:0,frozen:false,boss:true,abilityTurn:0,_xpMult:1,_goldMult:1};
  startCombatWith(currentEnemy);
  clearInterval(autoFightTimer);
  autoFightTimer=setInterval(()=>{if(!currentEnemy){clearInterval(autoFightTimer);return;}autoFightStep();},1000);
}
function dungeonComplete(){
  const stageId = currentStage.id;
  const completedStage = currentStage;
  currentStage = null; dungeonWave = 0; dungeonQueue = [];
  addLog('🏆 Dungeon Complete! Starting next run...', 'legendary');
  notify('🏆 Dungeon Complete!', 'var(--gold)');
  dropTreasureBox(stageId);
  updateUI(); renderInventory();

  // Auto loop — restart same dungeon after short delay
  setTimeout(() => {
      enterDungeon(completedStage.id);
    
  }, 15);
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
      {text:'🏪 Shop', action:()=>{ switchMainScene('town'); switchTownPanel('shop', document.querySelector('.town-tab:nth-child(2)')); }},
      {text:`⛪ Inn (+50% HP and MP, ${formatNumber(GAME_CONFIG.inn_cost||0)}g)`, next:'inn'},
      {text:'👤 Character', action:()=>{ switchMainScene('char'); }},
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
        state.gold -= innCost;
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
        baseStr:15,baseAgi:15,baseInt:15,baseSta:15,baseArmor:0,baseHit:2,baseCrit:0.1,
        baseDodge:2,baseHpRegen:20,baseLifeSteal:0,baseAttackPower:10,
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
  setTimeout(()=>collectArenaRewards(), 2000);
  setTimeout(()=>resumeStuckTournaments(), 3000);
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

function respecClass(){
  if(!state.class){
    notify('No class to respec!','var(--red)');return;
  }
  const cost = 50000 * (state.respecCount + 1);
  if(state.gold < cost){
    notify(`❌ Need ${formatNumber(cost)}g to respec!`,'var(--red)');return;
  }
  if(!confirm(`Respec class for ${formatNumber(cost)}g?\nAll talents will be reset and talent points refunded.`))return;

  state.gold -= cost;
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
  state.skills = [];

  // Reset stat multipliers
  state.strMult=1.0;state.agiMult=1.0;state.intMult=1.0;state.staMult=1.0;
  state.armorMult=1.0;state.critMult=1.0;state.dodgeMult=1.0;
  state.hpRegenMult=1.0;state.mpRegenMult=1.0;state.hitMult=1.0;
  state.mpMult=1.0;state.attackPowerMult=1.0;

  calcStats();
  addLog(`🔄 Respec complete! ${refunded} talent points refunded. Cost: ${formatNumber(cost)}g`,'gold');
  notify(`🔄 Class reset! Choose a new class.`,'var(--gold)');
  document.getElementById('char-class').textContent='No Class';
  showClassSelection();
  updateUI();renderSkillBar();renderQuests();
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
  addTouchDragSupport();
}

function renderEnemyStatPanel(enemy) {
  return `
    <div class="enemy-stat-panel">
      <div class="enemy-stat-header">
        <span class="enemy-name">${enemy.name}</span>
        <span class="enemy-level">Lv. ${enemy.level}</span>
      </div>

      <!-- HP Bar -->
      <div class="stat-row hp-row">
        <span class="stat-label">❤️ HP</span>
        <div class="hp-bar-wrapper">
          <div class="hp-bar" style="width: ${(enemy.hp / enemy.maxHp) * 100}%"></div>
        </div>
        <span class="stat-value">${enemy.hp.toLocaleString()} / ${enemy.maxHp.toLocaleString()}</span>
      </div>

      <!-- Combat Stats Grid -->
      <div class="enemy-stats-grid">
        <div class="stat-item">
          <span class="stat-icon">⚔️</span>
          <span class="stat-name">ATK</span>
          <span class="stat-val">${enemy.attack}</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">🛡️</span>
          <span class="stat-name">ARM</span>
          <span class="stat-val">${enemy.armor}</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">💨</span>
          <span class="stat-name">DODGE</span>
          <span class="stat-val">${enemy.dodge}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">🎯</span>
          <span class="stat-name">HIT</span>
          <span class="stat-val">${enemy.hit}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">💥</span>
          <span class="stat-name">CRIT</span>
          <span class="stat-val">${enemy.crit}%</span>
        </div>
      </div>
    </div>
  `;
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
  const interval = state.attackInterval || 1000;
  autoFightTimer=setInterval(()=>{
    if(!autoFightOn||!currentEnemy){clearInterval(autoFightTimer);return;}
    autoFightStep();
  }, interval);
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
    let dmg=calculateAttackDamage(state.attackPower, currentEnemy.armor);
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

  // Tick down Arcane Surge
if (state.arcaneSurgeActive && state.arcaneSurgeTurns > 0) {
  state.arcaneSurgeTurns--;
  if (state.arcaneSurgeTurns <= 0) {
    state.arcaneSurgeActive = false;
    // Remove buff
    const m = state.arcaneSurgeMult || 1;
    state.strMult /= m;
    state.agiMult /= m;
    state.intMult /= m;
    state.staMult /= m;
    state.arcaneSurgeMult = 1;
    calcStats();
    addCombatLog(`💫 Arcane Surge fades!`, 'info');
  }
}

// Tick down Soul Barrier
if (state.soulBarrierAbsorb > 0) {
  // Soul barrier is consumed in handleEnemyTurn
  // Just show it's active
}

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
      let eDmg=calculateEnemyAttackDamage(currentEnemy.atk, state.armor);
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
  const es=document.getElementById('enemy-stats');if(es)es.style.display='none';
  if(!currentEnemy)return;

  state.arcaneSurgeActive = false;
  state.arcaneSurgeTurns = 0;
  state.arcaneSurgeMult = 1;
  state.soulBarrierAbsorb = 0;

  // Reset new combat states
    state.earthTotemTurns = 0;
    state.earthTotemReduction = 0;
    state.bonusAttacks = 0;
    state.manaShieldAbsorb = 0;

  // Clear boss debuffs
  if(state.activeDebuffs.maxHpReduction>0){state.equipMaxHp=(state.equipMaxHp||0)+state.activeDebuffs.maxHpReduction;state.activeDebuffs.maxHpReduction=0;}
  state.activeDebuffs.webTrapped=0;state.activeDebuffs.rageTimer=0;state.webTrapped=0;
  if(currentEnemy.rageTimer>0)currentEnemy.atk=Math.floor(currentEnemy.atk/2);

  state.usedUndying=false;state.skillCooldowns={};state.battleCryActive=false;

  // Reset ONLY temporary combat multipliers (never touch classBonuses or talentBonuses)
  state.strMult=1.0;state.agiMult=1.0;state.intMult=1.0;state.staMult=1.0;
  state.armorMult=1.0;state.critMult=1.0;state.dodgeMult=1.0;state.hpRegenMult=1.0;
  state.mpRegenMult=1.0;state.hitMult=1.0;state.mpMult=1.0;state.attackPowerMult=1.0;state.lifeStealMult=1.0;state.maxHpMult=1.0;

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
    // Mat drop — only works inside dungeons (currentStage tells us which stage)
    if(currentStage) rollMatDrop(currentStage.id, wasBoss);
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
  state.mp-=mpCost;// Apply cast speed cooldown reduction
const cdr = state.cdr || 0;
state.skillCooldowns[skillId] = Math.max(1, Math.floor(sk.cd * (1 - cdr)));sk.use(enemy);
  spawnAbilityFloat(`${sk.icon} ${sk.name}!`,'#f0c040');return true;
}

// ══════════════════════════════════════════
// ARENA SYSTEM
// ══════════════════════════════════════════
async function collectArenaRewards() {
  if(!state.character_id) return;
  try {
    const { data: c } = await dbClient.from('characters')
      .select('arena_rewards, gold_mult, gold_mult_expiry')
      .eq('id', state.character_id).single();
    if(!c || !c.arena_rewards || !c.arena_rewards.length) return;

    const uncollected = c.arena_rewards.filter(r => !r.collected);
    if(!uncollected.length) return;

    // Apply gold mult from DB in case we missed it
    if(c.gold_mult && c.gold_mult > 1) {
      state.goldMult = c.gold_mult;
      state.goldMultExpiry = c.gold_mult_expiry;
    }

    // Show reward logs
    uncollected.forEach(r => {
      addLog(`━━━━━━━━━━━━━━━━━━━━━━━━`, 'gold');
      addLog(`🏟️ ARENA REWARD — ${r.placeText}`, 'legendary');
      addLog(`💰 +${formatNumber(r.gold)}g awarded!`, 'gold');
      if(r.goldMult) addLog(`⚡ +${Math.round((r.goldMult-1)*100)}% Gold Multiplier for 24hrs!`, 'gold');
      if(r.title) addLog(`🎖️ Title awarded: ${r.title}`, 'legendary');
      r.items.forEach(name => addLog(`🎁 ${name} added to inventory!`, 'legendary'));
      addLog(`━━━━━━━━━━━━━━━━━━━━━━━━`, 'gold');
      notify(`🏆 Arena reward collected! Check your log!`, 'var(--gold)');
    });

    // Mark all as collected
    const updatedRewards = c.arena_rewards.map(r => ({...r, collected: true}));
    await dbClient.from('characters').update({
      arena_rewards: updatedRewards,
    }).eq('id', state.character_id);

    updateUI();
    renderInventory();
  } catch(e){ console.error('Collect arena rewards error:', e); }
}

const ARENA_TITLES = [
  { title:'Rookie',   min:0,    color:'#cccccc' },
  { title:'Fighter',  min:1000, color:'#22c55e' },
  { title:'Warrior',  min:1500, color:'#3b82f6' },
  { title:'Champion', min:2000, color:'#a855f7' },
  { title:'Legend',   min:2500, color:'#ff9900' },
  { title:'Eternal',  min:3000, color:'#ff2244' },
];

const TOURNAMENT_SIZE = 16;    // slots per bracket
const MAX_BRACKETS_PER_TIER = 3; // max brackets per tier per week

const DAILY_REWARDS = {
  1: { gold: 500000,  title:'🏆 Tournament Champion' },
  2: { gold: 250000,  title:'🥈 Tournament Runner-up' },
  3: { gold: 120000,  title:'🥉 Tournament Third Place' },
  4: { gold: 60000,   title:null },
  participation: { gold: 10000, title:null },
};

// ── AUTO START OVERDUE TOURNAMENTS ──
async function checkAndAutoStartTournaments() {
  try {
    const now = new Date();

    // Find all open tournaments whose start time has passed
    const { data: overdue } = await dbClient
      .from('arena_tournaments')
      .select('*')
      .eq('status', 'open')
      .lt('starts_at', now.toISOString());

    if (!overdue || !overdue.length) return;

    for (const tournament of overdue) {
      // Determine tier key from min_level
      const tierKey = tournament.min_level === 20 ? 'rookie'
        : tournament.min_level === 41 ? 'veteran'
        : tournament.min_level === 61 ? 'elite'
        : tournament.min_level === 81 ? 'legend'
        : null;

      if (!tierKey) continue;

      addLog(`⚔️ Auto-starting overdue ${tierKey} tournament...`, 'gold');
      await startTournament(tournament.id, tierKey);
    }
  } catch(e) { console.error('Auto start tournament error:', e); }
}

// ── SKILL COMBO PICKER (opens before tournament registration) ──
function openSkillComboPicker(tournament, tier, tierKey) {
  const classSkills = {
    Warrior:     ['power_strike', 'battle_cry', 'last_stand'],
    Mage:        ['fireball', 'ice_lance', 'mana_shield'],
    Rogue:       ['backstab', 'poison_blade', 'shadow_step'],
    Hunter:      ['precise_shot', 'bleed_arrow', 'shadow_trap'],
    Paladin:     ['holy_strike', 'divine_shield', 'consecration'],
    Necromancer: ['death_bolt', 'soul_drain', 'plague_nova'],
    Shaman:      ['lightning_bolt', 'earth_totem', 'wind_burst'],
    Berserker:   ['reckless_strike', 'blood_rage', 'death_wish'],
  };

  const playerClass = state.class || 'Warrior';
  const availableSkills = classSkills[playerClass] || classSkills['Warrior'];
  const selectedCombo = [null, null, null]; // 3 slots

  function renderPicker() {
    const popup = document.getElementById('item-popup');
    document.getElementById('item-popup-content').innerHTML = `
      <div style="font-family:var(--font-title);color:var(--gold);margin-bottom:4px;font-size:.95em;">
        ⚔️ ${tier.label} Tournament
      </div>
      <div style="font-size:.72em;color:var(--text-dim);margin-bottom:12px;">
        Entry Fee: <span style="color:var(--gold);">${formatNumber(tier.fee)}g</span> &nbsp;|&nbsp;
        Level: <span style="color:var(--green);">Lv.${tier.min}-${tier.max}</span>
      </div>

      <div style="font-family:var(--font-title);font-size:.75em;color:var(--text-dim);letter-spacing:2px;margin-bottom:8px;">
        SKILL COMBO (up to 3)
      </div>

      <!-- 3 combo slots -->
      <div style="display:flex;gap:8px;justify-content:center;margin-bottom:14px;">
        ${selectedCombo.map((sk, i) => {
          const skill = sk ? SKILLS[sk] : null;
          return `
            <div onclick="clearComboSlot(${i})"
              style="width:64px;height:64px;border-radius:8px;border:2px solid ${skill ? 'var(--gold)' : 'rgba(255,255,255,0.15)'};
              background:${skill ? 'rgba(255,153,0,0.12)' : 'rgba(255,255,255,0.04)'};
              display:flex;flex-direction:column;align-items:center;justify-content:center;
              cursor:${skill ? 'pointer' : 'default'};position:relative;">
              ${skill
                ? `<div style="font-size:1.6em;">${skill.icon}</div>
                   <div style="font-size:.52em;color:var(--gold);text-align:center;line-height:1.2;margin-top:2px;">${skill.name}</div>
                   <div style="position:absolute;top:2px;right:4px;font-size:.6em;color:var(--text-dim);">${i+1}</div>`
                : `<div style="font-size:1.4em;color:rgba(255,255,255,0.15);">+</div>
                   <div style="font-size:.55em;color:rgba(255,255,255,0.2);">Slot ${i+1}</div>`
              }
            </div>`;
        }).join('')}
      </div>

      <!-- Available skills to pick -->
      <div style="font-family:var(--font-title);font-size:.7em;color:var(--text-dim);letter-spacing:2px;margin-bottom:8px;">
        YOUR SKILLS
      </div>
      <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;">
        ${availableSkills.map(sk => {
          const skill = SKILLS[sk];
          const alreadyPicked = selectedCombo.includes(sk);
          return `
            <div onclick="${alreadyPicked ? '' : `addToCombo('${sk}')`}"
              style="width:64px;height:64px;border-radius:8px;
              border:2px solid ${alreadyPicked ? 'var(--green)' : 'rgba(255,255,255,0.15)'};
              background:${alreadyPicked ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)'};
              display:flex;flex-direction:column;align-items:center;justify-content:center;
              cursor:${alreadyPicked ? 'default' : 'pointer'};opacity:${alreadyPicked ? '0.5' : '1'};">
              <div style="font-size:1.6em;">${skill.icon}</div>
              <div style="font-size:.52em;color:var(--text-dim);text-align:center;line-height:1.2;margin-top:2px;">${skill.name}</div>
            </div>`;
        }).join('')}
      </div>

      <!-- Warning if empty slots -->
      ${selectedCombo.some(s => s === null) ? `
        <div style="font-size:.72em;color:var(--gold);text-align:center;margin-bottom:10px;
          background:rgba(255,153,0,0.08);border-radius:6px;padding:6px;">
          ⚠️ ${selectedCombo.filter(s => s === null).length} skill slot(s) empty — are you sure?
        </div>` : ''
      }

      <!-- Buttons -->
      <div style="display:flex;gap:8px;margin-top:4px;">
        <button class="start-btn" onclick="closeItemPopup()"
          style="flex:1;background:rgba(255,255,255,0.05);padding:10px;">
          ✖ Cancel
        </button>
        <button class="start-btn" onclick="confirmTournamentRegistration()"
          style="flex:2;padding:10px;">
          ✅ Confirm & Pay ${formatNumber(tier.fee)}g
        </button>
      </div>`;
    popup.style.display = 'flex';
  }

  // Expose helpers to window so onclick can reach them
  window.addToCombo = function(skillKey) {
    const emptySlot = selectedCombo.indexOf(null);
    if (emptySlot === -1) { notify('All 3 slots filled! Click a slot to clear it.', 'var(--gold)'); return; }
    selectedCombo[emptySlot] = skillKey;
    renderPicker();
  };

  window.clearComboSlot = function(index) {
    selectedCombo[index] = null;
    renderPicker();
  };

  window.confirmTournamentRegistration = async function() {
    try {
      // Deduct entry fee
      const newGold = state.gold - tier.fee;
      if (newGold < 0) { notify('Not enough gold!', 'var(--red)'); return; }
      state.gold = newGold;

      // Build character snapshot at registration time
      const snapshot = {
        character_id: state.character_id,
        name: state.name,
        level: state.level,
        class: state.class,
        attackPower: state.attackPower,
        maxHp: state.maxHp,
        armor: state.armor,
        hit: state.hit,
        dodge: state.dodge,
        crit: state.crit,
        lifeSteal: state.lifeSteal,
        skillCombo: selectedCombo.filter(Boolean),
      };

      // Save registration to DB
      await dbClient.from('arena_registrations').insert({
        tournament_id: tournament.id,
        character_id: state.character_id,
        user_id: state.user_id,
        character_snapshot: snapshot,
        skill_combo: selectedCombo.filter(Boolean),
        points: 0,
      });

      // Deduct gold in DB
      await dbClient.from('characters')
        .update({ gold: newGold })
        .eq('id', state.character_id);

      closeItemPopup();
      addLog(`⚔️ Registered for ${tier.label} Tournament! Entry fee: ${formatNumber(tier.fee)}g paid.`, 'gold');
      notify(`✅ Registered for ${tier.label} Tournament!`, 'var(--gold)');
      updateUI();
      renderTournament();

    } catch(e) {
      notify('Registration failed: ' + e.message, 'var(--red)');
      console.error(e);
    }
  };

  renderPicker();
}

async function resumeStuckTournaments() {
  try {
    const { data: tournament } = await dbClient
      .from('arena_tournaments')
      .select('*')
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!tournament) return;

    const bracket = tournament.bracket || [];
    const currentRound = tournament.round || 1;

    // Check if current round is fully resolved
    const currentMatches = bracket.filter(m => m.round === currentRound);
    const allDone = currentMatches.every(m => m.winner !== null);

    if (!allDone) {
      // Current round not finished — run it
      addLog(`⚔️ Resuming tournament round ${currentRound}...`, 'gold');
      await runTournamentRound(tournament.id, bracket, currentRound);
    } else {
      // Current round done but next round not started — check if next round exists
      const nextRound = currentRound + 1;
      const nextMatches = bracket.filter(m => m.round === nextRound);

      if (nextMatches.length === 0) {
        // Next round not created yet — get winners and continue
        const winners = currentMatches.map(m => m.winner).filter(Boolean);
        if (winners.length === 1) {
          await finalizeTournament(tournament.id, bracket, winners[0]);
        } else {
          addLog(`⚔️ Resuming tournament round ${nextRound}...`, 'gold');
          await runTournamentRound(tournament.id, bracket, nextRound);
        }
      }
    }
  } catch(e) { console.error('Resume tournament error:', e); }
}

// ── GET ARENA TITLE FROM POINTS ──
function getArenaTitle(points) {
  for(let i=ARENA_TITLES.length-1;i>=0;i--){
    if(points>=ARENA_TITLES[i].min) return ARENA_TITLES[i];
  }
  return ARENA_TITLES[0];
}

// ── RENDER TOURNAMENT REWARDS ON CHARACTER SCREEN ──
function renderTournamentRewards() {
  const panel = document.getElementById('tournament-rewards-panel');
  const content = document.getElementById('tournament-rewards-content');
  if (!panel || !content) return;

  // Hide panel if no active rewards
  if (!state.tournamentTitle && !state.tournamentBuff && !state.tournamentItem) {
    panel.style.display = 'none';
    return;
  }

  // Check expiry
  const expiry = state.tournamentRewardsExpireAt ? new Date(state.tournamentRewardsExpireAt) : null;
  const now = new Date();
  if (expiry && now > expiry) {
    panel.style.display = 'none';
    return;
  }

  // Calculate time remaining
  let timeLeftHtml = '';
  if (expiry) {
    const msLeft = expiry - now;
    const days    = Math.floor(msLeft / 86400000);
    const hours   = Math.floor((msLeft % 86400000) / 3600000);
    const mins    = Math.floor((msLeft % 3600000) / 60000);
    const timeStr = days > 0
      ? `${days}d ${hours}h ${mins}m`
      : `${hours}h ${mins}m`;
    const urgentColor = msLeft < 3600000 ? 'var(--red)' : msLeft < 86400000 ? 'var(--gold)' : 'var(--green)';
    timeLeftHtml = `
      <div style="font-size:.70em;color:${urgentColor};margin-top:8px;
        padding:4px 8px;background:rgba(255,255,255,0.03);border-radius:6px;">
        ⏰ Expires in: <b>${timeStr}</b>
      </div>`;
  }

  panel.style.display = 'block';
  content.innerHTML = `
    ${state.tournamentTitle ? `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;
        padding:8px;background:rgba(255,153,0,0.08);border-radius:8px;
        border:1px solid rgba(255,153,0,0.2);">
        <div style="font-size:1.4em;">🎖️</div>
        <div>
          <div style="font-family:var(--font-title);color:var(--gold);font-size:.85em;">
            ${state.tournamentTitle}
          </div>
          <div style="font-size:.65em;color:var(--text-dim);">Tournament Title</div>
        </div>
      </div>` : ''}

    ${state.tournamentBuff ? `
      <div style="margin-bottom:8px;padding:8px;
        background:rgba(34,197,94,0.06);border-radius:8px;
        border:1px solid rgba(34,197,94,0.15);">
        <div style="font-size:.70em;color:var(--text-dim);
          font-family:var(--font-title);letter-spacing:1px;margin-bottom:6px;">
          ⚡ ACTIVE BUFFS
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${state.tournamentBuff.goldMult && state.tournamentBuff.goldMult > 1 ? `
            <div style="flex:1;min-width:80px;text-align:center;padding:6px;
              background:rgba(255,153,0,0.08);border-radius:6px;">
              <div style="font-size:1.1em;">💰</div>
              <div style="font-family:var(--font-title);color:var(--gold);font-size:.78em;">
                +${Math.round((state.tournamentBuff.goldMult - 1) * 100)}%
              </div>
              <div style="font-size:.60em;color:var(--text-dim);">Gold Bonus</div>
            </div>` : ''}
          ${state.tournamentBuff.attackMult && state.tournamentBuff.attackMult > 1 ? `
            <div style="flex:1;min-width:80px;text-align:center;padding:6px;
              background:rgba(239,68,68,0.08);border-radius:6px;">
              <div style="font-size:1.1em;">⚔️</div>
              <div style="font-family:var(--font-title);color:var(--red);font-size:.78em;">
                +${Math.round((state.tournamentBuff.attackMult - 1) * 100)}%
              </div>
              <div style="font-size:.60em;color:var(--text-dim);">ATK Bonus</div>
            </div>` : ''}
        </div>
      </div>` : ''}

    ${state.tournamentItem ? `
      <div style="margin-bottom:8px;padding:8px;
        background:rgba(168,85,247,0.06);border-radius:8px;
        border:1px solid rgba(168,85,247,0.15);">
        <div style="font-size:.70em;color:var(--text-dim);
          font-family:var(--font-title);letter-spacing:1px;margin-bottom:6px;">
          🎁 REWARD ITEM
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="font-size:1.3em;">
            ${state.tournamentItem.icon || '📦'}
          </div>
          <div>
            <div style="font-size:.78em;
              color:${state.tournamentItem.rarity === 'legendary' ? 'var(--legendary)' : 'var(--epic)'};
              font-family:var(--font-title);">
              ${state.tournamentItem.name || 'Tournament Item'}
            </div>
            <div style="font-size:.62em;color:var(--text-dim);">
              ${state.tournamentItem.slot || ''} · ${state.tournamentItem.rarity || ''}
            </div>
          </div>
        </div>
      </div>` : ''}

    ${timeLeftHtml}`;
}

// ── SIMULATE BATTLE WITH FULL TURN RECORDING ──
function simulateBattle(attacker, defender) {
  const log = [];
  const turns = []; // structured turn data for replay
  let aHp = attacker.maxHp;
  let dHp = defender.maxHp;
  let turn = 0;
  const MAX_TURNS = 60;

  let aSkillIndex = 0;
  let dSkillIndex = 0;
  const aCombo = attacker.skillCombo || [];
  const dCombo = defender.skillCombo || [];

  const BUFF_SKILLS = ['battle_cry','last_stand','mana_shield','divine_shield','earth_totem','blood_rage'];

  function estimateSkillDmg(snapshot, skillKey) {
    switch(skillKey) {
      case 'power_strike':    return Math.floor(snapshot.attackPower * 2.2);
      case 'fireball':        return Math.floor(snapshot.attackPower * 1.8 + Math.random() * snapshot.attackPower * 0.5);
      case 'ice_lance':       return Math.floor(snapshot.attackPower * 1.5);
      case 'backstab':        return Math.floor(snapshot.attackPower * 1.5);
      case 'poison_blade':    return Math.floor(snapshot.attackPower * 1.3 * 5);
      case 'shadow_step':     return Math.floor(snapshot.attackPower * 2.0);
      case 'precise_shot':    return Math.floor(snapshot.attackPower * 2.0);
      case 'bleed_arrow':     return Math.floor(snapshot.attackPower * 1.0 * 4);
      case 'shadow_trap':     return Math.floor(snapshot.attackPower * 1.5);
      case 'holy_strike':     return Math.floor(snapshot.attackPower * 2.0);
      case 'consecration':    return Math.floor(snapshot.attackPower * 1.8);
      case 'death_bolt':      return Math.floor(snapshot.attackPower * 2.0);
      case 'soul_drain':      return Math.floor(snapshot.attackPower * 1.6);
      case 'plague_nova':     return Math.floor(snapshot.attackPower * 1.5 * 6);
      case 'lightning_bolt':  return Math.floor(snapshot.attackPower * 2.0);
      case 'wind_burst':      return Math.floor(snapshot.attackPower * 1.8);
      case 'reckless_strike': return Math.floor(snapshot.attackPower * 2.5);
      case 'death_wish':      return Math.floor(snapshot.attackPower * 4.0);
      default:                return Math.floor(snapshot.attackPower * 1.5);
    }
  }

  function getBuffDescription(skillKey, snapshot) {
    switch(skillKey) {
      case 'battle_cry':    return `${snapshot.name} activates Battle Cry! +STR +ATK POWER!`;
      case 'last_stand':    return `${snapshot.name} uses Last Stand! Restores HP!`;
      case 'mana_shield':   return `${snapshot.name} raises Mana Shield! Damage absorbed!`;
      case 'divine_shield': return `${snapshot.name} uses Divine Shield! +HP + absorb!`;
      case 'earth_totem':   return `${snapshot.name} plants Earth Totem! +HP +ARMOR!`;
      case 'blood_rage':    return `${snapshot.name} enters Blood Rage! MASSIVE ATK boost!`;
      default:              return `${snapshot.name} uses ${skillKey}!`;
    }
  }

  // Record a turn into structured data
  function recordTurn(actor, actionType, opts = {}) {
    turns.push({
      turn,
      actor,          // 'p1' or 'p2'
      action: actionType, // 'attack', 'skill', 'buff', 'dodge', 'crit'
      skillKey:    opts.skillKey    || null,
      skillName:   opts.skillName   || null,
      skillIcon:   opts.skillIcon   || null,
      damage:      opts.damage      || 0,
      healAmount:  opts.healAmount  || 0,
      isCrit:      opts.isCrit      || false,
      isDodge:     opts.isDodge     || false,
      isBuff:      opts.isBuff      || false,
      buffDesc:    opts.buffDesc    || null,
      p1HpAfter:   Math.max(0, aHp),
      p2HpAfter:   Math.max(0, dHp),
      p1HpMax:     attacker.maxHp,
      p2HpMax:     defender.maxHp,
      logText:     opts.logText     || '',
    });
  }

  while (aHp > 0 && dHp > 0 && turn < MAX_TURNS) {
    turn++;

    // ── ATTACKER'S TURN ──
    const aSkill = aCombo.length > 0 ? aCombo[aSkillIndex % aCombo.length] : null;
    if (aSkill) {
      aSkillIndex++;
      const skill = SKILLS[aSkill];
      const skillName = skill?.name || aSkill;
      const skillIcon = skill?.icon || '⚔️';

      if (BUFF_SKILLS.includes(aSkill)) {
        const buffDesc = getBuffDescription(aSkill, attacker);
        log.push(`Turn ${turn}: ${buffDesc}`);
        recordTurn('p1', 'buff', { skillKey: aSkill, skillName, skillIcon, isBuff: true, buffDesc, logText: buffDesc });
      } else {
        const skillDmg = estimateSkillDmg(attacker, aSkill);
        const reduction = Math.min(0.85, (defender.armor || 0) / ((defender.armor || 0) + 80000));
        const finalDmg = Math.max(1, Math.floor(skillDmg * (1 - reduction)));
        dHp -= finalDmg;
        if (attacker.lifeSteal > 0) aHp = Math.min(attacker.maxHp, aHp + Math.floor(finalDmg * attacker.lifeSteal));
        const txt = `Turn ${turn}: ${attacker.name} uses ${skillName} on ${defender.name} for ${formatNumber(finalDmg)} dmg!`;
        log.push(txt);
        recordTurn('p1', 'skill', { skillKey: aSkill, skillName, skillIcon, damage: finalDmg, logText: txt });
      }
    } else {
      // Normal attack
      const aDodge = Math.max(0, (defender.dodge || 0) - (attacker.hit || 0)) / 100;
      if (Math.random() < aDodge) {
        const txt = `Turn ${turn}: ${attacker.name} missed! ${defender.name} dodged.`;
        log.push(txt);
        recordTurn('p1', 'dodge', { isDodge: true, logText: txt });
      } else {
        const aReduction = Math.min(0.85, (defender.armor || 0) / ((defender.armor || 0) + 80000));
        let aDmg = Math.max(1, Math.floor((attacker.attackPower * (0.95 + Math.random() * 0.1)) * (1 - aReduction)));
        const isCrit = Math.random() < (attacker.crit || 0) / 100;
        if (isCrit) aDmg = Math.floor(aDmg * 2);
        dHp -= aDmg;
        if (attacker.lifeSteal > 0) aHp = Math.min(attacker.maxHp, aHp + Math.floor(aDmg * attacker.lifeSteal));
        const txt = isCrit
          ? `Turn ${turn}: ${attacker.name} CRITS ${defender.name} for ${formatNumber(aDmg)}!`
          : `Turn ${turn}: ${attacker.name} hits ${defender.name} for ${formatNumber(aDmg)}.`;
        log.push(txt);
        recordTurn('p1', isCrit ? 'crit' : 'attack', { damage: aDmg, isCrit, logText: txt });
      }
    }
    if (dHp <= 0) { recordTurn('p1', 'end', { logText: '' }); break; }

    // ── DEFENDER'S TURN ──
    const dSkill = dCombo.length > 0 ? dCombo[dSkillIndex % dCombo.length] : null;
    if (dSkill) {
      dSkillIndex++;
      const skill = SKILLS[dSkill];
      const skillName = skill?.name || dSkill;
      const skillIcon = skill?.icon || '⚔️';

      if (BUFF_SKILLS.includes(dSkill)) {
        const buffDesc = getBuffDescription(dSkill, defender);
        log.push(`Turn ${turn}: ${buffDesc}`);
        recordTurn('p2', 'buff', { skillKey: dSkill, skillName, skillIcon, isBuff: true, buffDesc, logText: buffDesc });
      } else {
        const skillDmg = estimateSkillDmg(defender, dSkill);
        const reduction = Math.min(0.85, (attacker.armor || 0) / ((attacker.armor || 0) + 80000));
        const finalDmg = Math.max(1, Math.floor(skillDmg * (1 - reduction)));
        aHp -= finalDmg;
        if (defender.lifeSteal > 0) dHp = Math.min(defender.maxHp, dHp + Math.floor(finalDmg * defender.lifeSteal));
        const txt = `Turn ${turn}: ${defender.name} uses ${skillName} on ${attacker.name} for ${formatNumber(finalDmg)} dmg!`;
        log.push(txt);
        recordTurn('p2', 'skill', { skillKey: dSkill, skillName, skillIcon, damage: finalDmg, logText: txt });
      }
    } else {
      const dDodge = Math.max(0, (attacker.dodge || 0) - (defender.hit || 0)) / 100;
      if (Math.random() < dDodge) {
        const txt = `Turn ${turn}: ${defender.name} missed! ${attacker.name} dodged.`;
        log.push(txt);
        recordTurn('p2', 'dodge', { isDodge: true, logText: txt });
      } else {
        const dReduction = Math.min(0.85, (attacker.armor || 0) / ((attacker.armor || 0) + 80000));
        let dDmg = Math.max(1, Math.floor((defender.attackPower * (0.95 + Math.random() * 0.1)) * (1 - dReduction)));
        const isCrit = Math.random() < (defender.crit || 0) / 100;
        if (isCrit) dDmg = Math.floor(dDmg * 2);
        aHp -= dDmg;
        if (defender.lifeSteal > 0) dHp = Math.min(defender.maxHp, dHp + Math.floor(dDmg * defender.lifeSteal));
        const txt = isCrit
          ? `Turn ${turn}: ${defender.name} CRITS ${attacker.name} for ${formatNumber(dDmg)}!`
          : `Turn ${turn}: ${defender.name} hits ${attacker.name} for ${formatNumber(dDmg)}.`;
        log.push(txt);
        recordTurn('p2', isCrit ? 'crit' : 'attack', { damage: dDmg, isCrit, logText: txt });
      }
    }
  }

  // Determine winner
  let winnerId, reason;
  if (aHp >= dHp) {
    winnerId = attacker.character_id;
    reason = turn >= MAX_TURNS
      ? `${attacker.name} wins by HP advantage!`
      : `${attacker.name} defeats ${defender.name}!`;
  } else {
    winnerId = defender.character_id;
    reason = turn >= MAX_TURNS
      ? `${defender.name} wins by HP advantage!`
      : `${defender.name} defeats ${attacker.name}!`;
  }
  log.push(`⚔️ RESULT: ${reason}`);
  turns.push({
    turn: turn + 1,
    actor: 'system',
    action: 'result',
    logText: `⚔️ RESULT: ${reason}`,
    p1HpAfter: Math.max(0, aHp),
    p2HpAfter: Math.max(0, dHp),
    p1HpMax: attacker.maxHp,
    p2HpMax: defender.maxHp,
    winnerId,
  });

  return {
    winnerId,
    log,
    turns,  // ← structured replay data
    totalTurns: turn,
    attackerHpLeft: Math.max(0, aHp),
    defenderHpLeft: Math.max(0, dHp),
  };
}

// ── SNAPSHOT CURRENT PLAYER STATS ──
function getPlayerSnapshot() {
  return {
    character_id: state.character_id,
    name: state.name,
    level: state.level,
    class: state.class,
    attackPower: state.attackPower,
    maxHp: state.maxHp,
    armor: state.armor,
    hit: state.hit,
    dodge: state.dodge,
    crit: state.crit,
    lifeSteal: state.lifeSteal,
    arena_points: state.arena_points || 1000,
  };
}

// ── BOT NAME POOLS ──
const BOT_NAMES = [
  'Shadowfang','Ironclad','Doomhammer','Voidwalker','Stormrage',
  'Bloodthorn','Darkblade','Emberclaw','Frostmourne','Nightstalker',
  'Ashbringer','Grimstone','Thunderfist','Venomfang','Soulreaper',
  'Wolfsbane','Dreadlord','Bonecrusher','Skullsplitter','Wraithbane',
];

// ── GENERATE BOT CHARACTER FOR A TIER ──
function generateBot(tierKey) {
  const TIER_CONFIG = {
    rookie:  { minLv: 20, maxLv: 40,  statMult: 1.0,  label: '🌱 Rookie'  },
    veteran: { minLv: 41, maxLv: 60,  statMult: 2.0,  label: '⚔️ Veteran' },
    elite:   { minLv: 61, maxLv: 80,  statMult: 3.5,  label: '💀 Elite'   },
    legend:  { minLv: 81, maxLv: 100, statMult: 5.5,  label: '👑 Legend'  },
  };

  const config = TIER_CONFIG[tierKey];
  const level = Math.floor(Math.random() * (config.maxLv - config.minLv + 1)) + config.minLv;
  const m = config.statMult;

  // Pick random name and class
  const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)] + '_Bot';
  const classes = ['Warrior','Mage','Rogue','Hunter','Paladin','Necromancer','Shaman','Berserker'];
  const botClass = classes[Math.floor(Math.random() * classes.length)];

  // Scale stats based on tier multiplier and level
  const baseStr = Math.floor((5 + level * 2) * m);
  const baseAgi = Math.floor((5 + level * 2) * m);
  const baseInt = Math.floor((5 + level * 2) * m);
  const baseSta = Math.floor((5 + level * 2) * m);

  const attackPower = Math.floor((baseStr * 4 + baseInt * 3 + level * 15) * m);
  const maxHp       = Math.floor((100 + baseStr * 20 + baseSta * 30 + level * 80) * m);
  const armor       = Math.floor((baseAgi * 8 + level * 10) * m);
  const crit        = Math.floor(baseAgi * 0.0005 * m + 5);
  const dodge       = Math.floor(baseAgi * 1.9 * m);
  const hit         = Math.floor(baseAgi * 5.3 * m);
  const lifeSteal   = 0.05 * m;

  // Bot skill combo — pick 3 random skills from any pool
  const allSkillKeys = Object.keys(SKILLS);
  const skillCombo = [];
  const pool = [...allSkillKeys];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    skillCombo.push(pool.splice(idx, 1)[0]);
  }

  return {
    character_id: 'bot_' + Math.random().toString(36).substr(2, 9),
    name,
    level,
    class: botClass,
    isBot: true,
    attackPower,
    maxHp,
    armor,
    crit,
    dodge,
    hit,
    lifeSteal,
    skillCombo,
  };
}

// ── REGISTER FOR TOURNAMENT ──
async function registerForTournament(tierKey) {
  if (!state.character_id) { notify('Must be logged in!', 'var(--red)'); return; }
  if (!state.user_id) { notify('Account not found!', 'var(--red)'); return; }

  const fees = GAME_CONFIG.tournament_fees || {};
  const TIERS = {
    rookie:  { label: '🌱 Rookie',  min: 20, max: 40,  fee: fees.rookie  ?? 20000, minLevel: 20 },
    veteran: { label: '⚔️ Veteran', min: 41, max: 60,  fee: fees.veteran ?? 40000, minLevel: 41 },
    elite:   { label: '💀 Elite',   min: 61, max: 80,  fee: fees.elite   ?? 60000, minLevel: 61 },
    legend:  { label: '👑 Legend',  min: 81, max: 100, fee: fees.legend  ?? 100000, minLevel: 81 },
  };

  const tier = TIERS[tierKey];
  if (!tier) { notify('Invalid tier!', 'var(--red)'); return; }

  // Level check
  if (state.level < tier.min || state.level > tier.max) {
    notify(`❌ Your level (${state.level}) doesn't fit ${tier.label} tier! (Lv.${tier.min}-${tier.max})`, 'var(--red)');
    return;
  }

  // Gold check
  if (state.gold < tier.fee) {
    notify(`❌ Not enough gold! Need ${formatNumber(tier.fee)}g to enter.`, 'var(--red)');
    return;
  }

  try {
    // Get all open tournaments for this tier this week
    const { data: openTournaments } = await dbClient
      .from('arena_tournaments')
      .select('*')
      .eq('status', 'open')
      .eq('min_level', tier.min)
      .order('bracket_number', { ascending: true });

    // Check if user already registered in ANY bracket of this tier
    if (openTournaments && openTournaments.length) {
      const tournamentIds = openTournaments.map(t => t.id);
      for (const tid of tournamentIds) {
        const { data: existing } = await dbClient
          .from('arena_registrations')
          .select('id')
          .eq('tournament_id', tid)
          .eq('user_id', state.user_id)
          .single();
        if (existing) {
          notify('⚠️ You already registered in this tier this week!', 'var(--gold)');
          return;
        }
      }
    }

    // Find a bracket with available slots
    let tournament = null;
    if (openTournaments && openTournaments.length) {
      for (const t of openTournaments) {
        const { count } = await dbClient
          .from('arena_registrations')
          .select('*', { count: 'exact' })
          .eq('tournament_id', t.id);
        if ((count || 0) < TOURNAMENT_SIZE) {
          tournament = t;
          break;
        }
      }
    }

    // No available bracket — create a new one if under max
    if (!tournament) {
      const bracketCount = openTournaments ? openTournaments.length : 0;
      if (bracketCount >= MAX_BRACKETS_PER_TIER) {
        notify(`⚠️ All ${MAX_BRACKETS_PER_TIER} brackets are full! Wait for next week.`, 'var(--gold)');
        return;
      }

      // Calculate next Friday schedule
      const now = new Date();
      const dayOfWeek = now.getUTCDay();
      const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
      let startsAt = new Date(now);
      if (dayOfWeek === 5 && now.getUTCHours() < 12) {
        startsAt.setUTCHours(12, 0, 0, 0);
      } else if (daysUntilFriday === 0) {
        startsAt.setUTCDate(startsAt.getUTCDate() + 7);
        startsAt.setUTCHours(12, 0, 0, 0);
      } else {
        startsAt.setUTCDate(startsAt.getUTCDate() + daysUntilFriday);
        startsAt.setUTCHours(12, 0, 0, 0);
      }

      const endsAt = new Date(startsAt);
      endsAt.setUTCHours(13, 0, 0, 0);

      const rewardsExpireAt = new Date(startsAt);
      rewardsExpireAt.setUTCDate(rewardsExpireAt.getUTCDate() + 7);
      rewardsExpireAt.setUTCHours(18, 0, 0, 0);

      const newBracketNumber = bracketCount + 1;

      const { data: newT, error } = await dbClient
        .from('arena_tournaments')
        .insert({
          status: 'open',
          bracket: [],
          round: 0,
          min_level: tier.min,
          entry_fee: tier.fee,
          max_slots: TOURNAMENT_SIZE,
          bracket_number: newBracketNumber,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          rewards_expire_at: rewardsExpireAt.toISOString(),
        }).select().single();

      if (error) throw error;
      tournament = newT;
      addLog(`📋 Bracket ${newBracketNumber} opened for ${tier.label}!`, 'gold');
    }

    // Open skill combo picker
    openSkillComboPicker(tournament, tier, tierKey);

  } catch(e) {
    notify('Registration failed: ' + e.message, 'var(--red)');
    console.error(e);
  }
}

// ── START TOURNAMENT ──
async function startTournament(tournamentId, tierKey) {
  try {
    // Get all registrations with snapshots
    const { data: regs } = await dbClient
      .from('arena_registrations')
      .select('character_id, character_snapshot, skill_combo')
      .eq('tournament_id', tournamentId);

    // Build player snapshots from saved registration snapshots
    let participants = regs
      .filter(r => r.character_snapshot)
      .map(r => ({
        ...r.character_snapshot,
        skillCombo: r.skill_combo || [],
        isBot: false,
      }));

    // Fill remaining slots with bots
    const botsNeeded = 8 - participants.length;
    for (let i = 0; i < botsNeeded; i++) {
      participants.push(generateBot(tierKey));
    }

    // Shuffle participants
    participants = participants.sort(() => Math.random() - 0.5);

    // Build Round 1 bracket
    const bracket = [];
    for (let i = 0; i < participants.length; i += 2) {
      bracket.push({
        round: 1,
        player1: participants[i],
        player2: participants[i + 1] || null,
        winner: null,
        battleLog: [],
      });
    }

    await dbClient.from('arena_tournaments').update({
      status: 'in_progress',
      bracket: bracket,
      round: 1,
    }).eq('id', tournamentId);

    addLog(`⚔️ ${tierKey.toUpperCase()} Tournament started! ${participants.length} fighters entered!`, 'gold');
    await runTournamentRound(tournamentId, bracket, 1, tierKey);

  } catch(e) { console.error('Start tournament error:', e); }
}

// ── SIMULATE BATTLE WITH SKILL COMBOS ──
function simulateBattle(attacker, defender) {
  const log = [];
  let aHp = attacker.maxHp;
  let dHp = defender.maxHp;
  let turn = 0;
  const MAX_TURNS = 60;

  // Skill combo state — track position in rotation
  let aSkillIndex = 0;
  let dSkillIndex = 0;
  const aCombo = attacker.skillCombo || [];
  const dCombo = defender.skillCombo || [];

  // Simple skill damage estimator for simulation
  // (we can't run full SKILLS functions since they depend on live state)
  function estimateSkillDmg(snapshot, skillKey) {
    const s = snapshot;
    const skill = SKILLS[skillKey];
    if (!skill) return 0;

    // Estimate based on skill type using snapshot stats
    switch(skillKey) {
      case 'power_strike':    return Math.floor(s.attackPower * 2.2);
      case 'fireball':        return Math.floor(s.attackPower * 1.8 + Math.random() * s.attackPower * 0.5);
      case 'ice_lance':       return Math.floor(s.attackPower * 1.5);
      case 'backstab':        return Math.floor(s.attackPower * 1.5);
      case 'poison_blade':    return Math.floor(s.attackPower * 1.3 * 5); // 5 ticks
      case 'shadow_step':     return Math.floor(s.attackPower * 2.0);
      case 'precise_shot':    return Math.floor(s.attackPower * 2.0);
      case 'bleed_arrow':     return Math.floor(s.attackPower * 1.0 * 4); // 4 ticks
      case 'shadow_trap':     return Math.floor(s.attackPower * 1.5);
      case 'holy_strike':     return Math.floor(s.attackPower * 2.0);
      case 'consecration':    return Math.floor(s.attackPower * 1.8);
      case 'death_bolt':      return Math.floor(s.attackPower * 2.0);
      case 'soul_drain':      return Math.floor(s.attackPower * 1.6);
      case 'plague_nova':     return Math.floor(s.attackPower * 1.5 * 6); // 6 ticks
      case 'lightning_bolt':  return Math.floor(s.attackPower * 2.0);
      case 'wind_burst':      return Math.floor(s.attackPower * 1.8);
      case 'reckless_strike': return Math.floor(s.attackPower * 2.5);
      case 'death_wish':      return Math.floor(s.attackPower * 4.0);
      // Buff/heal skills return 0 damage but log the action
      case 'battle_cry':
      case 'last_stand':
      case 'mana_shield':
      case 'divine_shield':
      case 'earth_totem':
      case 'blood_rage':      return 0;
      default:                return Math.floor(s.attackPower * 1.5);
    }
  }

  // Buff skill descriptions for log
  function getBuffDescription(skillKey, snapshot) {
    switch(skillKey) {
      case 'battle_cry':    return `${snapshot.name} activates Battle Cry! +STR +ATK POWER!`;
      case 'last_stand':    return `${snapshot.name} uses Last Stand! Restores HP!`;
      case 'mana_shield':   return `${snapshot.name} raises Mana Shield! Damage absorbed!`;
      case 'divine_shield': return `${snapshot.name} uses Divine Shield! +HP + absorb!`;
      case 'earth_totem':   return `${snapshot.name} plants Earth Totem! +HP +ARMOR!`;
      case 'blood_rage':    return `${snapshot.name} enters Blood Rage! MASSIVE ATK boost!`;
      default:              return `${snapshot.name} uses ${skillKey}!`;
    }
  }

  const BUFF_SKILLS = ['battle_cry','last_stand','mana_shield','divine_shield','earth_totem','blood_rage'];

  while (aHp > 0 && dHp > 0 && turn < MAX_TURNS) {
    turn++;

    // ── ATTACKER'S TURN ──
    // Use skill if available in combo this turn
    const aSkill = aCombo[aSkillIndex % aCombo.length] || null;
    if (aSkill && aCombo.length > 0) {
      aSkillIndex++;
      if (BUFF_SKILLS.includes(aSkill)) {
        log.push(`Turn ${turn}: ${getBuffDescription(aSkill, attacker)}`);
      } else {
        const skillDmg = estimateSkillDmg(attacker, aSkill);
        if (skillDmg > 0) {
          const reduction = Math.min(0.85, (defender.armor || 0) / ((defender.armor || 0) + 80000));
          const finalDmg = Math.max(1, Math.floor(skillDmg * (1 - reduction)));
          dHp -= finalDmg;
          const skillName = SKILLS[aSkill]?.name || aSkill;
          log.push(`Turn ${turn}: ${attacker.name} uses ${skillName} on ${defender.name} for ${formatNumber(finalDmg)} dmg!`);
          // Lifesteal from skills
          if (attacker.lifeSteal > 0) {
            aHp = Math.min(attacker.maxHp, aHp + Math.floor(finalDmg * attacker.lifeSteal));
          }
        }
      }
    } else {
      // Normal attack
      const aDodge = Math.max(0, (defender.dodge || 0) - (attacker.hit || 0)) / 100;
      if (Math.random() < aDodge) {
        log.push(`Turn ${turn}: ${attacker.name} missed! ${defender.name} dodged.`);
      } else {
        const aReduction = Math.min(0.85, (defender.armor || 0) / ((defender.armor || 0) + 80000));
        let aDmg = Math.max(1, Math.floor((attacker.attackPower * (0.95 + Math.random() * 0.1)) * (1 - aReduction)));
        if (Math.random() < (attacker.crit || 0) / 100) {
          aDmg = Math.floor(aDmg * 2);
          log.push(`Turn ${turn}: ${attacker.name} CRITS ${defender.name} for ${formatNumber(aDmg)}!`);
        } else {
          log.push(`Turn ${turn}: ${attacker.name} hits ${defender.name} for ${formatNumber(aDmg)}.`);
        }
        dHp -= aDmg;
        if (attacker.lifeSteal > 0) aHp = Math.min(attacker.maxHp, aHp + Math.floor(aDmg * attacker.lifeSteal));
      }
    }
    if (dHp <= 0) break;

    // ── DEFENDER'S TURN ──
    const dSkill = dCombo[dSkillIndex % dCombo.length] || null;
    if (dSkill && dCombo.length > 0) {
      dSkillIndex++;
      if (BUFF_SKILLS.includes(dSkill)) {
        log.push(`Turn ${turn}: ${getBuffDescription(dSkill, defender)}`);
      } else {
        const skillDmg = estimateSkillDmg(defender, dSkill);
        if (skillDmg > 0) {
          const reduction = Math.min(0.85, (attacker.armor || 0) / ((attacker.armor || 0) + 80000));
          const finalDmg = Math.max(1, Math.floor(skillDmg * (1 - reduction)));
          aHp -= finalDmg;
          const skillName = SKILLS[dSkill]?.name || dSkill;
          log.push(`Turn ${turn}: ${defender.name} uses ${skillName} on ${attacker.name} for ${formatNumber(finalDmg)} dmg!`);
          if (defender.lifeSteal > 0) {
            dHp = Math.min(defender.maxHp, dHp + Math.floor(finalDmg * defender.lifeSteal));
          }
        }
      }
    } else {
      const dDodge = Math.max(0, (attacker.dodge || 0) - (defender.hit || 0)) / 100;
      if (Math.random() < dDodge) {
        log.push(`Turn ${turn}: ${defender.name} missed! ${attacker.name} dodged.`);
      } else {
        const dReduction = Math.min(0.85, (attacker.armor || 0) / ((attacker.armor || 0) + 80000));
        let dDmg = Math.max(1, Math.floor((defender.attackPower * (0.95 + Math.random() * 0.1)) * (1 - dReduction)));
        if (Math.random() < (defender.crit || 0) / 100) {
          dDmg = Math.floor(dDmg * 2);
          log.push(`Turn ${turn}: ${defender.name} CRITS ${attacker.name} for ${formatNumber(dDmg)}!`);
        } else {
          log.push(`Turn ${turn}: ${defender.name} hits ${attacker.name} for ${formatNumber(dDmg)}.`);
        }
        aHp -= dDmg;
        if (defender.lifeSteal > 0) dHp = Math.min(defender.maxHp, dHp + Math.floor(dDmg * defender.lifeSteal));
      }
    }
  }

  // Determine winner
  let winnerId, reason;
  if (aHp >= dHp) {
    winnerId = attacker.character_id;
    reason = turn >= MAX_TURNS
      ? `${attacker.name} wins by HP advantage after ${MAX_TURNS} turns!`
      : `${attacker.name} defeats ${defender.name}!`;
  } else {
    winnerId = defender.character_id;
    reason = turn >= MAX_TURNS
      ? `${defender.name} wins by HP advantage after ${MAX_TURNS} turns!`
      : `${defender.name} defeats ${attacker.name}!`;
  }
  log.push(`⚔️ RESULT: ${reason}`);

  return {
    winnerId,
    log,
    turns: turn,
    attackerHpLeft: Math.max(0, aHp),
    defenderHpLeft: Math.max(0, dHp),
  };
}

// ── RUN A TOURNAMENT ROUND ──
async function runTournamentRound(tournamentId, bracket, round, tierKey) {
  try {
    const roundMatches = bracket.filter(m => m.round === round);
    const nextBracket = [...bracket];
    const winners = [];
    const losers = [];

    for (const match of roundMatches) {
      // Bye — player1 advances automatically
      if (!match.player2) {
        match.winner = match.player1;
        winners.push(match.player1);
        continue;
      }

      const result = simulateBattle(match.player1, match.player2);
      match.winner = result.winnerId === match.player1.character_id ? match.player1 : match.player2;
      const loser  = result.winnerId === match.player1.character_id ? match.player2 : match.player1;
      match.battleLog = result.log;
      match.turns = result.turns;
      winners.push(match.winner);
      losers.push(loser);

      // Save battle record (both real players)
      if (!match.player1.isBot && !match.player2.isBot) {
        const { data: battleRecord } = await dbClient.from('arena_battles').insert({
          attacker_id: match.player1.character_id,
          defender_id: match.player2.character_id,
          winner_id: result.winnerId,
          attacker_snapshot: match.player1,
          defender_snapshot: match.player2,
          battle_log: result.log,
          battle_turns: result.turns,
          points_change: 25,
        }).select().single();
        if (battleRecord) match.battleId = battleRecord.id;

      } else if (!match.player1.isBot || !match.player2.isBot) {
        // One real player vs bot
        const realPlayer = !match.player1.isBot ? match.player1 : match.player2;
        const botPlayer  = !match.player1.isBot ? match.player2 : match.player1;
        const { data: battleRecord } = await dbClient.from('arena_battles').insert({
          attacker_id: realPlayer.character_id,
          defender_id: null,
          winner_id: result.winnerId === realPlayer.character_id ? realPlayer.character_id : null,
          attacker_snapshot: realPlayer,
          defender_snapshot: botPlayer,
          battle_log: result.log,
          battle_turns: result.turns,
          points_change: 15,
        }).select().single();
        if (battleRecord) match.battleId = battleRecord.id;
      }

      // Update points in registration for real players only
      if (!match.winner.isBot) {
        await dbClient.from('arena_registrations')
          .update({ points: round * 100 })
          .eq('tournament_id', tournamentId)
          .eq('character_id', match.winner.character_id);
      }
      if (!loser.isBot) {
        await dbClient.from('arena_registrations')
          .update({ rank: getEliminationRank(round) })
          .eq('tournament_id', tournamentId)
          .eq('character_id', loser.character_id);
      }
    }

    // Save updated bracket with battleIds into DB after each round
    await dbClient.from('arena_tournaments').update({
      bracket: nextBracket,
    }).eq('id', tournamentId);

    // Tournament over — only 1 winner left
    if (winners.length === 1) {
      await finalizeTournament(tournamentId, nextBracket, winners[0], tierKey);
      return;
    }

    // Build next round matches
    const nextRound = round + 1;
    for (let i = 0; i < winners.length; i += 2) {
      nextBracket.push({
        round: nextRound,
        player1: winners[i],
        player2: winners[i + 1] || null,
        winner: null,
        battleLog: [],
      });
    }

    await dbClient.from('arena_tournaments').update({
      bracket: nextBracket,
      round: nextRound,
    }).eq('id', tournamentId);

    await runTournamentRound(tournamentId, nextBracket, nextRound, tierKey);

  } catch(e) { console.error('Run round error:', e); }
}

// ── HELPER: GET RANK FROM ELIMINATION ROUND ──
function getEliminationRank(round) {
  // Round 1 eliminated = 5th-8th, Round 2 = 3rd-4th, Round 3 = 2nd
  switch(round) {
    case 1: return 5; // quarterfinal loser
    case 2: return 3; // semifinal loser
    case 3: return 2; // final loser
    default: return 8;
  }
}

// ══════════════════════════════════════════
// ARENA EXCLUSIVE ITEMS
// ══════════════════════════════════════════

const ARENA_ITEMS = {
  // ── LEGENDARY (1st place pool) ──
  arena_sword_legend: {
    name:'⚔️ Gladiator\'s Eternal Blade', slot:'weapon', rarity:'legendary',
    arenaExclusive:true, levelReq:0,
    stats:{ str:12000, attackPower:60000, strMult:5.5, crit:20, lifeSteal:1.4 },
    sellPrice:500000
  },
  arena_armor_legend: {
    name:'🛡️ Champion\'s Immortal Plate', slot:'armor', rarity:'legendary',
    arenaExclusive:true, levelReq:0,
    stats:{ armor:80000, sta:8000, maxHp:150000, armorMult:5.6, hpRegenMult:5.5 },
    sellPrice:500000
  },
  arena_helmet_legend: {
    name:'⛑️ Warlord\'s Crown of Glory', slot:'helmet', rarity:'legendary',
    arenaExclusive:true, levelReq:0,
    stats:{ armor:80000, int:8000, hit:40000, dodgeMult:5.5, hitMult:5.4 },
    sellPrice:500000
  },
  arena_boots_legend: {
    name:'👢 Phantom Stride Boots', slot:'boots', rarity:'legendary',
    arenaExclusive:true, levelReq:0,
    stats:{ agi:8000, dodge:20000, agiMult:5.6, dodgeMult:5.5 },
    sellPrice:500000
  },
  arena_ring_legend: {
    name:'💍 Ring of the Eternal Champion', slot:'ring', rarity:'legendary',
    arenaExclusive:true, levelReq:0,
    stats:{ str:4000, agi:4000, int:4000, sta:4000, strMult:2.4, agiMult:2.4, intMult:2.4, staMult:2.4 },
    sellPrice:500000
  },
  arena_amulet_legend: {
    name:'📿 Amulet of Undying Glory', slot:'amulet', rarity:'legendary',
    arenaExclusive:true, levelReq:0,
    stats:{ strMult:2.5, agiMult:2.5, intMult:2.5, staMult:2.5, lifeSteal:0.5 },
    sellPrice:500000
  },

  // ── EPIC (2nd & 3rd place pool) ──
  arena_sword_epic: {
    name:'⚔️ Gladiator\'s War Blade', slot:'weapon', rarity:'epic',
    arenaExclusive:true, levelReq:0,
    stats:{ str:800, attackPower:350, strMult:0.3, crit:12, lifeSteal:0.025 },
    sellPrice:200000
  },
  arena_armor_epic: {
    name:'🛡️ Champion\'s Battle Plate', slot:'armor', rarity:'epic',
    arenaExclusive:true, levelReq:0,
    stats:{ armor:20000, sta:500, maxHp:8000, armorMult:0.35, hpRegenMult:0.3 },
    sellPrice:200000
  },
  arena_helmet_epic: {
    name:'⛑️ Warlord\'s Iron Crown', slot:'helmet', rarity:'epic',
    arenaExclusive:true, levelReq:0,
    stats:{ armor:20000, int:500, hit:400, dodgeMult:0.3, hitMult:0.25 },
    sellPrice:200000
  },
  arena_boots_epic: {
    name:'👢 Shadow Runner Boots', slot:'boots', rarity:'epic',
    arenaExclusive:true, levelReq:0,
    stats:{ agi:700, dodge:500, agiMult:0.35, dodgeMult:0.3 },
    sellPrice:200000
  },
  arena_ring_epic: {
    name:'💍 Ring of the Arena', slot:'ring', rarity:'epic',
    arenaExclusive:true, levelReq:0,
    stats:{ str:500, agi:500, int:500, sta:500, strMult:0.25 },
    sellPrice:200000
  },
  arena_amulet_epic: {
    name:'📿 Amulet of Battle', slot:'amulet', rarity:'epic',
    arenaExclusive:true, levelReq:0,
    stats:{ strMult:0.3, agiMult:0.3, intMult:0.3, lifeSteal:0.03 },
    sellPrice:200000
  },

  // ── RARE (participation box) ──
  arena_sword_rare: {
    name:'⚔️ Arena Combatant\'s Blade', slot:'weapon', rarity:'rare',
    arenaExclusive:true, levelReq:0,
    stats:{ str:400, attackPower:150, crit:6, lifeSteal:0.012 },
    sellPrice:50000
  },
  arena_armor_rare: {
    name:'🛡️ Arena Combatant\'s Shield', slot:'armor', rarity:'rare',
    arenaExclusive:true, levelReq:0,
    stats:{ armor:20000, sta:250, maxHp:3000, hpRegen:200 },
    sellPrice:50000
  },
};

// Give a random arena item from a tier
function getArenaRewardItem(tier) {
  const keys = Object.keys(ARENA_ITEMS).filter(k => ARENA_ITEMS[k].rarity === tier);
  const key = keys[Math.floor(Math.random() * keys.length)];
  const template = ARENA_ITEMS[key];
  return { ...template, uid: genUid(), category: 'equipment', equipped: false };
}

// ── FINALIZE TOURNAMENT ──
async function finalizeTournament(tournamentId, bracket, champion, tierKey) {
  try {
    const allRounds = [...new Set(bracket.map(m => m.round))].sort((a, b) => b - a);
    const finalRound = allRounds[0];
    const semiFinalRound = allRounds[1];

    const finalMatch = bracket.find(m => m.round === finalRound);
    const semiMatches = bracket.filter(m => m.round === semiFinalRound);

    const first  = champion;
    const second = finalMatch
      ? (finalMatch.player1?.character_id === champion.character_id ? finalMatch.player2 : finalMatch.player1)
      : null;
    const thirds = semiMatches
      .map(m => m.player1?.character_id === m.winner?.character_id ? m.player2 : m.player1)
      .filter(Boolean);

    // Get rewards expiry from tournament record
    const { data: tData } = await dbClient
      .from('arena_tournaments')
      .select('rewards_expire_at')
      .eq('id', tournamentId)
      .single();
    const rewardsExpireAt = tData?.rewards_expire_at || null;

    // Get all registrations
    const { data: regs } = await dbClient
      .from('arena_registrations')
      .select('character_id, isBot')
      .eq('tournament_id', tournamentId);

    const topIds = [
      first?.character_id,
      second?.character_id,
      ...(thirds.map(t => t?.character_id)),
    ].filter(Boolean);

    // Set rank 1 for champion
    if (!first.isBot) {
      await dbClient.from('arena_registrations')
        .update({ rank: 1 })
        .eq('tournament_id', tournamentId)
        .eq('character_id', first.character_id);
    }

    // Participation reward for everyone not in top 3 (real players only)
    for (const reg of regs) {
      if (topIds.includes(reg.character_id)) continue;
      if (reg.character_id?.startsWith('bot_')) continue;
      await givePlacementReward(reg.character_id, 'participation', tierKey, rewardsExpireAt);
    }

    // Top placements
    if (thirds[1] && !thirds[1].isBot) await givePlacementReward(thirds[1].character_id, 4, tierKey, rewardsExpireAt);
    if (thirds[0] && !thirds[0].isBot) await givePlacementReward(thirds[0].character_id, 3, tierKey, rewardsExpireAt);
    if (second && !second.isBot)       await givePlacementReward(second.character_id, 2, tierKey, rewardsExpireAt);
    if (!first.isBot)                  await givePlacementReward(first.character_id, 1, tierKey, rewardsExpireAt);

    // Mark tournament complete
    await dbClient.from('arena_tournaments').update({
      status: 'completed',
      bracket: bracket,
      winner_id: first.isBot ? null : first.character_id,
      reward_sent_at: new Date().toISOString(),
    }).eq('id', tournamentId);

    const winnerLabel = first.isBot ? `🤖 ${first.name} (Bot)` : first.name;
    addLog(`🏆 ${tierKey.toUpperCase()} Tournament complete! Champion: ${winnerLabel}!`, 'legendary');
    notify(`🏆 ${winnerLabel} wins the ${tierKey} Tournament!`, 'var(--gold)');
    renderTournament();

  } catch(e) { console.error('Finalize tournament error:', e); }
}

// ── GIVE PLACEMENT REWARD ──
async function givePlacementReward(characterId, place, tierKey, rewardsExpireAt) {
  if (!characterId || characterId.startsWith('bot_')) return;
  try {
    const { data: c } = await dbClient.from('characters')
      .select('gold, inventory, tournament_title, tournament_buff, tournament_item')
      .eq('id', characterId).single();
    if (!c) return;

    // Tier reward tables
   const cfgRewards = GAME_CONFIG.tournament_rewards || {};
   const TIER_REWARDS = {
    rookie: {
      1: { gold: cfgRewards.rookie?.['1'] ?? 50000,  title: '🌱 Rookie Champion'  },
      2: { gold: cfgRewards.rookie?.['2'] ?? 25000,  title: '🌱 Rookie Finalist'  },
      3: { gold: cfgRewards.rookie?.['3'] ?? 12000,  title: null },
      4: { gold: cfgRewards.rookie?.['4'] ?? 6000,   title: null },
      participation: { gold: cfgRewards.rookie?.participation ?? 2000, title: null },
    },
    veteran: {
      1: { gold: cfgRewards.veteran?.['1'] ?? 120000, title: '⚔️ Veteran Champion' },
      2: { gold: cfgRewards.veteran?.['2'] ?? 60000,  title: '⚔️ Veteran Finalist' },
      3: { gold: cfgRewards.veteran?.['3'] ?? 30000,  title: null },
    4: { gold: cfgRewards.veteran?.['4'] ?? 15000,  title: null },
    participation: { gold: cfgRewards.veteran?.participation ?? 5000, title: null },
    },
    elite: {
      1: { gold: cfgRewards.elite?.['1'] ?? 300000, title: '💀 Elite Champion'   },
      2: { gold: cfgRewards.elite?.['2'] ?? 150000, title: '💀 Elite Finalist'   },
      3: { gold: cfgRewards.elite?.['3'] ?? 75000,  title: null },
      4: { gold: cfgRewards.elite?.['4'] ?? 35000,  title: null },
      participation: { gold: cfgRewards.elite?.participation ?? 10000, title: null },
    },
    legend: {
      1: { gold: cfgRewards.legend?.['1'] ?? 800000, title: '👑 Legend Champion'  },
      2: { gold: cfgRewards.legend?.['2'] ?? 400000, title: '👑 Legend Finalist'  },
      3: { gold: cfgRewards.legend?.['3'] ?? 200000, title: null },
      4: { gold: cfgRewards.legend?.['4'] ?? 100000, title: null },
      participation: { gold: cfgRewards.legend?.participation ?? 25000, title: null },
    },
  };

    const reward = TIER_REWARDS[tierKey][place];
    if (!reward) return;

    // Build timed tournament item based on tier and place
    let tournamentItem = null;
    if (place === 1 || place === 2) {
      const rarity = place === 1 ? 'legendary' : 'epic';
      tournamentItem = getArenaRewardItem(rarity);
      tournamentItem.expiresAt = rewardsExpireAt;
      tournamentItem.tournamentReward = true;
    } else if (place === 3 || place === 4) {
      tournamentItem = getArenaRewardItem('epic');
      tournamentItem.expiresAt = rewardsExpireAt;
      tournamentItem.tournamentReward = true;
    }

    // Build timed buff based on tier and place
    let tournamentBuff = null;
    if (place === 1) {
      tournamentBuff = {
        goldMult: tierKey === 'legend' ? 2.0 : tierKey === 'elite' ? 1.75 : tierKey === 'veteran' ? 1.5 : 1.25,
        attackMult: 1.15,
        label: reward.title,
        expiresAt: rewardsExpireAt,
      };
    } else if (place === 2) {
      tournamentBuff = {
        goldMult: tierKey === 'legend' ? 1.5 : tierKey === 'elite' ? 1.35 : tierKey === 'veteran' ? 1.25 : 1.15,
        attackMult: 1.10,
        label: `${tierKey.charAt(0).toUpperCase() + tierKey.slice(1)} Finalist`,
        expiresAt: rewardsExpireAt,
      };
    }

    // Add timed item to inventory
    const inv = c.inventory || [];
    if (tournamentItem) inv.push(tournamentItem);

    await dbClient.from('characters').update({
      gold: (c.gold || 0) + reward.gold,
      inventory: inv,
      tournament_title: reward.title || c.tournament_title,
      tournament_buff: tournamentBuff,
      tournament_item: tournamentItem,
      tournament_rewards_expire_at: rewardsExpireAt,
    }).eq('id', characterId);

    addLog(`🏆 Reward sent to ${place === 1 ? '👑 Champion' : place === 'participation' ? '🎖️ Participant' : `#${place}`}!`, 'gold');

  } catch(e) { console.error(`Reward error for place ${place}:`, e); }
}

// ── CHECK & WIPE EXPIRED TOURNAMENT REWARDS ──
async function checkTournamentRewardExpiry() {
  if (!state.character_id) return;
  try {
    const { data: c } = await dbClient.from('characters')
      .select('tournament_title, tournament_buff, tournament_item, tournament_rewards_expire_at')
      .eq('id', state.character_id).single();
    if (!c || !c.tournament_rewards_expire_at) return;

    const now = new Date();
    const expiry = new Date(c.tournament_rewards_expire_at);
    if (now < expiry) return; // not expired yet

    // Wipe expired rewards
    await dbClient.from('characters').update({
      tournament_title: null,
      tournament_buff: null,
      tournament_item: null,
      tournament_rewards_expire_at: null,
    }).eq('id', state.character_id);

    // Clear from state too
    state.tournamentTitle = null;
    state.tournamentBuff = null;
    state.tournamentItem = null;
    state.tournamentRewardsExpireAt = null;

    addLog(`⏰ Your tournament rewards have expired!`, 'info');
    notify(`⏰ Tournament rewards expired. Compete again this Friday!`, 'var(--gold)');
    updateUI();

  } catch(e) { console.error('Expiry check error:', e); }
}

// ── CREATE WEEKLY TOURNAMENTS IF MISSING ──
async function createWeeklyTournamentsIfMissing() {
  try {
    const now = new Date();

    // Find next Friday 7pm Cambodia (UTC+7) = Friday 12:00 UTC
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 5=Fri
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7;

    // If today is Friday and before 7pm Cambodia (12:00 UTC), use today
    // Otherwise use next Friday
    let nextFriday = new Date(now);
    if (dayOfWeek === 5 && now.getUTCHours() < 12) {
      // Today is Friday before 7pm Cambodia — use today
      nextFriday.setUTCHours(12, 0, 0, 0);
    } else if (daysUntilFriday === 0) {
      // Today is Friday but past 7pm — use next Friday
      nextFriday.setUTCDate(nextFriday.getUTCDate() + 7);
      nextFriday.setUTCHours(12, 0, 0, 0);
    } else {
      nextFriday.setUTCDate(nextFriday.getUTCDate() + daysUntilFriday);
      nextFriday.setUTCHours(12, 0, 0, 0);
    }

    const endsAt = new Date(nextFriday);
    endsAt.setUTCHours(13, 0, 0, 0); // 8pm Cambodia = 1pm UTC

    // Rewards expire next Friday 1am Cambodia = Thursday 6pm UTC
    const rewardsExpireAt = new Date(nextFriday);
    rewardsExpireAt.setUTCDate(rewardsExpireAt.getUTCDate() + 7);
    rewardsExpireAt.setUTCHours(18, 0, 0, 0);

    const TIERS = [
      { key: 'rookie',  minLevel: 20, fee: getPracticeFee('rookie')  },
      { key: 'veteran', minLevel: 41, fee: getPracticeFee('veteran') },
      { key: 'elite',   minLevel: 61, fee: getPracticeFee('elite')   },
      { key: 'legend',  minLevel: 81, fee: getPracticeFee('legend')  },
    ];

    for (const tier of TIERS) {
      // Check if tournament already exists for this tier and week
      const { data: existing } = await dbClient
        .from('arena_tournaments')
        .select('id')
        .eq('min_level', tier.minLevel)
        .in('status', ['open', 'in_progress'])
        .gte('starts_at', nextFriday.toISOString())
        .single();

      if (existing) continue; // already created

      // Create tournament for this tier
      await dbClient.from('arena_tournaments').insert({
        status: 'open',
        bracket: [],
        round: 0,
        min_level: tier.minLevel,
        entry_fee: tier.fee,
        starts_at: nextFriday.toISOString(),
        ends_at: endsAt.toISOString(),
        rewards_expire_at: rewardsExpireAt.toISOString(),
      });

      addLog(`📅 ${tier.key} tournament created for Friday!`, 'gold');
    }

  } catch(e) { console.error('Create weekly tournaments error:', e); }
}

// ── QUALIFY TOP PLAYERS FOR GRAND FINAL ──
async function qualifyTopPlayersForGrandFinal(tierKey) {
  try {
    const TIER_MIN = { rookie: 20, veteran: 41, elite: 61, legend: 81 };
    const minLevel = TIER_MIN[tierKey];

    // Get all completed brackets for this tier this week
    const { data: brackets } = await dbClient
      .from('arena_tournaments')
      .select('*')
      .eq('min_level', minLevel)
      .eq('status', 'completed')
      .order('bracket_number', { ascending: true });

    if (!brackets || !brackets.length) {
      addLog(`⚠️ No completed brackets found for ${tierKey} Grand Final`, 'info');
      return null;
    }

    // Get current Supreme Champion for this tier
    const { data: supremeChamp } = await dbClient
      .from('characters')
      .select('id, name, level, class, stats, skills, skill_cooldowns, equipped')
      .eq('supreme_tier', tierKey)
      .single();

    const qualifiedPlayers = [];
    const bracketPoints = []; // track which bracket has most points for 8th seed

    for (const bracket of brackets) {
      // Get top 2 from each bracket by points
      const { data: topRegs } = await dbClient
        .from('arena_registrations')
        .select('character_id, character_snapshot, skill_combo, points, rank')
        .eq('tournament_id', bracket.id)
        .not('character_snapshot', 'is', null)
        .order('points', { ascending: false })
        .limit(3); // get top 3 in case we need 8th seed

      if (!topRegs || !topRegs.length) continue;

      // Filter out bots
      const realPlayers = topRegs.filter(r =>
        r.character_snapshot &&
        !r.character_snapshot.isBot
      );

      // Top 2 qualify
      const top2 = realPlayers.slice(0, 2);
      top2.forEach(reg => {
        qualifiedPlayers.push({
          ...reg.character_snapshot,
          skillCombo: reg.skill_combo || [],
          qualifiedFrom: `Bracket ${bracket.bracket_number}`,
          points: reg.points,
          isSupremeChamp: false,
        });
      });

      // Track 3rd place for potential 8th seed
      if (realPlayers[2]) {
        bracketPoints.push({
          player: {
            ...realPlayers[2].character_snapshot,
            skillCombo: realPlayers[2].skill_combo || [],
            qualifiedFrom: `Bracket ${bracket.bracket_number} (3rd)`,
            points: realPlayers[2].points,
            isSupremeChamp: false,
          },
          points: realPlayers[2].points || 0,
        });
      }

      // Mark top 2 as qualified in DB
      for (const reg of top2) {
        if (!reg.character_snapshot?.isBot) {
          await dbClient.from('arena_registrations')
            .update({ qualified_for_grand_final: true })
            .eq('tournament_id', bracket.id)
            .eq('character_id', reg.character_id);
        }
      }
    }

    // Add Supreme Champion as auto-seed if exists
    // and not already qualified from bracket
    if (supremeChamp) {
      const alreadyQualified = qualifiedPlayers
        .some(p => p.character_id === supremeChamp.id);

      if (!alreadyQualified) {
        // Build Supreme Champ snapshot
        const { data: champReg } = await dbClient
          .from('arena_registrations')
          .select('character_snapshot, skill_combo')
          .eq('character_id', supremeChamp.id)
          .order('registered_at', { ascending: false })
          .limit(1)
          .single();

        const champSnapshot = champReg?.character_snapshot || {
          character_id: supremeChamp.id,
          name: supremeChamp.name,
          level: supremeChamp.level,
          class: supremeChamp.class,
          attackPower: 0,
          maxHp: 0,
          armor: 0,
          hit: 0,
          dodge: 0,
          crit: 0,
          lifeSteal: 0,
          isBot: false,
        };

        qualifiedPlayers.push({
          ...champSnapshot,
          skillCombo: champReg?.skill_combo || [],
          qualifiedFrom: '👑 Supreme Champion',
          isSupremeChamp: true,
          points: 9999, // always seeded high
        });
      }
    }

    // Fill 8th slot with best 3rd place if needed
    if (qualifiedPlayers.length < 8 && bracketPoints.length) {
      bracketPoints.sort((a, b) => b.points - a.points);
      const eighthSeed = bracketPoints[0]?.player;
      if (eighthSeed) qualifiedPlayers.push(eighthSeed);
    }

    // Fill remaining slots with bots if still under 8
    while (qualifiedPlayers.length < 8) {
      qualifiedPlayers.push(generateBot(tierKey));
    }

    addLog(`👑 ${tierKey} Grand Final: ${qualifiedPlayers.length} fighters qualified!`, 'legendary');
    return qualifiedPlayers.slice(0, 8);

  } catch(e) {
    console.error('Qualify grand final error:', e);
    return null;
  }
}

// ── START GRAND FINAL ──
async function startGrandFinal(tierKey) {
  try {
    const TIER_MIN = { rookie: 20, veteran: 41, elite: 61, legend: 81 };
    const minLevel = TIER_MIN[tierKey];

    // Check if grand final already exists for this tier
    const { data: existing } = await dbClient
      .from('grand_finals')
      .select('id, status')
      .eq('tier', tierKey)
      .in('status', ['pending', 'in_progress'])
      .single();

    if (existing) {
      if (existing.status === 'in_progress') {
        addLog(`⚔️ ${tierKey} Grand Final already in progress!`, 'gold');
        return;
      }
    }

    // Get qualified players
    const qualifiedPlayers = await qualifyTopPlayersForGrandFinal(tierKey);
    if (!qualifiedPlayers || !qualifiedPlayers.length) {
      addLog(`⚠️ Not enough players for ${tierKey} Grand Final`, 'info');
      return;
    }

    // Shuffle but keep Supreme Champ seeded at top
    const supremeChamp = qualifiedPlayers.find(p => p.isSupremeChamp);
    const others = qualifiedPlayers
      .filter(p => !p.isSupremeChamp)
      .sort(() => Math.random() - 0.5);
    const seeded = supremeChamp ? [supremeChamp, ...others] : others;

    // Build Quarter Final bracket
    const bracket = [];
    for (let i = 0; i < seeded.length; i += 2) {
      bracket.push({
        round: 1,
        player1: seeded[i],
        player2: seeded[i + 1] || null,
        winner: null,
        battleLog: [],
        battleId: null,
      });
    }

    // Calculate times
    const now = new Date();
    const startsAt = new Date(now);
    startsAt.setUTCHours(14, 0, 0, 0); // 9pm Cambodia = 2pm UTC

    const endsAt = new Date(startsAt);
    endsAt.setUTCHours(15, 0, 0, 0); // 10pm Cambodia = 3pm UTC

    const rewardsExpireAt = new Date(startsAt);
    rewardsExpireAt.setUTCDate(rewardsExpireAt.getUTCDate() + 7);
    rewardsExpireAt.setUTCHours(18, 0, 0, 0); // Next Friday 1am Cambodia

    // Get previous supreme champion
    const { data: prevChamp } = await dbClient
      .from('characters')
      .select('id')
      .eq('supreme_tier', tierKey)
      .single();

    // Create grand final record
    const { data: grandFinal, error } = await dbClient
      .from('grand_finals')
      .insert({
        tier: tierKey,
        status: 'in_progress',
        bracket: bracket,
        round: 1,
        previous_champion_id: prevChamp?.id || null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        rewards_expire_at: rewardsExpireAt.toISOString(),
      }).select().single();

    if (error) throw error;

    addLog(`👑 ${tierKey.toUpperCase()} GRAND FINAL STARTED! ${seeded.length} elite fighters!`, 'legendary');
    notify(`👑 ${tierKey} Grand Final has begun!`, 'var(--gold)');

    // Run the bracket
    await runGrandFinalRound(grandFinal.id, bracket, 1, tierKey);

  } catch(e) { console.error('Start grand final error:', e); }
}

// ── RUN GRAND FINAL ROUND ──
async function runGrandFinalRound(grandFinalId, bracket, round, tierKey) {
  try {
    const roundMatches = bracket.filter(m => m.round === round);
    const nextBracket = [...bracket];
    const winners = [];
    const losers = [];

    for (const match of roundMatches) {
      // Bye — player advances automatically
      if (!match.player2) {
        match.winner = match.player1;
        winners.push(match.player1);
        continue;
      }

      const result = simulateBattle(match.player1, match.player2);
      match.winner = result.winnerId === match.player1.character_id
        ? match.player1 : match.player2;
      const loser = result.winnerId === match.player1.character_id
        ? match.player2 : match.player1;

      match.battleLog = result.log;
      match.turns = result.turns;
      winners.push(match.winner);
      losers.push(loser);

      // Save battle record for real players
      if (!match.player1.isBot || !match.player2.isBot) {
        const realAttacker = !match.player1.isBot ? match.player1 : match.player2;
        const realDefender = !match.player1.isBot ? match.player2 : match.player1;

        const { data: battleRecord } = await dbClient
          .from('arena_battles')
          .insert({
            attacker_id: realAttacker.character_id,
            defender_id: realDefender.isBot ? null : realDefender.character_id,
            winner_id: result.winnerId,
            attacker_snapshot: match.player1,
            defender_snapshot: match.player2,
            battle_log: result.log,
            battle_turns: result.turns,
            points_change: 50, // Grand Final worth more points
          }).select().single();

        if (battleRecord) match.battleId = battleRecord.id;
      }
    }

    // Save updated bracket
    await dbClient.from('grand_finals').update({
      bracket: nextBracket,
    }).eq('id', grandFinalId);

    // Grand Final is over
    if (winners.length === 1) {
      await finalizeGrandFinal(grandFinalId, nextBracket, winners[0], tierKey);
      return;
    }

    // Build next round
    const nextRound = round + 1;
    for (let i = 0; i < winners.length; i += 2) {
      nextBracket.push({
        round: nextRound,
        player1: winners[i],
        player2: winners[i + 1] || null,
        winner: null,
        battleLog: [],
        battleId: null,
      });
    }

    await dbClient.from('grand_finals').update({
      bracket: nextBracket,
      round: nextRound,
    }).eq('id', grandFinalId);

    await runGrandFinalRound(grandFinalId, nextBracket, nextRound, tierKey);

  } catch(e) { console.error('Run grand final round error:', e); }
}

// ── FINALIZE GRAND FINAL ──
async function finalizeGrandFinal(grandFinalId, bracket, champion, tierKey) {
  try {
    const TIER_COLORS = {
      rookie: '#22c55e', veteran: '#3b82f6',
      elite: '#a855f7', legend: '#ff9900'
    };
    const TIER_LABELS = {
      rookie: '🌱 Rookie', veteran: '⚔️ Veteran',
      elite: '💀 Elite', legend: '👑 Legend'
    };

    const tierColor = TIER_COLORS[tierKey];
    const tierLabel = TIER_LABELS[tierKey];

    // Get all rounds for placements
    const allRounds = [...new Set(bracket.map(m => m.round))].sort((a,b) => b-a);
    const finalRound = allRounds[0];
    const semiFinalRound = allRounds[1];

    const finalMatch = bracket.find(m => m.round === finalRound);
    const semiMatches = bracket.filter(m => m.round === semiFinalRound);

    const second = finalMatch
      ? (finalMatch.player1?.character_id === champion.character_id
        ? finalMatch.player2 : finalMatch.player1)
      : null;

    const thirds = semiMatches
      .map(m => m.player1?.character_id === m.winner?.character_id
        ? m.player2 : m.player1)
      .filter(Boolean);

    // Get grand final record for expiry
    const { data: gfData } = await dbClient
      .from('grand_finals')
      .select('rewards_expire_at, previous_champion_id')
      .eq('id', grandFinalId)
      .single();

    const rewardsExpireAt = gfData?.rewards_expire_at || null;
    const prevChampId = gfData?.previous_champion_id || null;

    // ── HANDLE SUPREME CHAMPION ──
    if (!champion.isBot) {
      // Get current defense count
      const { data: champChar } = await dbClient
        .from('characters')
        .select('supreme_defenses, supreme_tier')
        .eq('id', champion.character_id)
        .single();

      const isDefending = champChar?.supreme_tier === tierKey;
      const newDefenses = isDefending
        ? (champChar.supreme_defenses || 0) + 1
        : 0;

      const supremeTitle = `${tierLabel} Supreme Champion`;
      const defenseLabel = newDefenses >= 10
        ? `⭐ UNDEFEATED ${supremeTitle}`
        : newDefenses >= 5
        ? `🛡️🛡️🛡️🛡️🛡️ ${supremeTitle}`
        : newDefenses > 0
        ? `${'🛡️'.repeat(newDefenses)} ${supremeTitle}`
        : supremeTitle;

      // Get weekly gold bonus from config
      const supremeGold = (GAME_CONFIG.supreme_weekly_gold || {})[tierKey] || 500000;

      // Get champion's current gold
      const { data: champGoldData } = await dbClient
        .from('characters')
        .select('gold')
        .eq('id', champion.character_id)
        .single();

      // Update champion as new Supreme
      await dbClient.from('characters').update({
        supreme_title: defenseLabel,
        supreme_tier: tierKey,
        supreme_since: isDefending ? champChar.supreme_since : new Date().toISOString(),
        supreme_defenses: newDefenses,
        supreme_weekly_gold: supremeGold,
        gold: (champGoldData?.gold || 0) + supremeGold,
        tournament_title: defenseLabel,
        tournament_rewards_expire_at: null, // Supreme title never expires
      }).eq('id', champion.character_id);

      addLog(`👑 NEW SUPREME CHAMPION: ${champion.name}! (${tierLabel})`, 'legendary');
      notify(`👑 ${champion.name} is the new ${tierLabel} Supreme Champion!`, 'var(--gold)');
    }

    // ── STRIP TITLE FROM PREVIOUS CHAMPION if dethroned ──
    if (prevChampId && prevChampId !== champion.character_id) {
      await dbClient.from('characters').update({
        supreme_title: null,
        supreme_tier: null,
        supreme_since: null,
        supreme_defenses: 0,
        supreme_weekly_gold: 0,
      }).eq('id', prevChampId);

      addLog(`💔 Previous Supreme Champion has been dethroned!`, 'info');
    }

    // ── GIVE PLACEMENT REWARDS ──
    // 2nd place
    if (second && !second.isBot) {
      await giveGrandFinalReward(second.character_id, 2, tierKey, rewardsExpireAt);
    }
    // 3rd-4th place
    for (const third of thirds) {
      if (third && !third.isBot) {
        await giveGrandFinalReward(third.character_id, 3, tierKey, rewardsExpireAt);
      }
    }
    // All other participants
    const allRealPlayers = bracket
      .flatMap(m => [m.player1, m.player2])
      .filter(p => p && !p.isBot)
      .filter((p, i, arr) => arr.findIndex(x => x?.character_id === p?.character_id) === i);

    const topIds = [
      champion.character_id,
      second?.character_id,
      ...thirds.map(t => t?.character_id),
    ].filter(Boolean);

    for (const player of allRealPlayers) {
      if (!topIds.includes(player.character_id)) {
        await giveGrandFinalReward(player.character_id, 'participation', tierKey, rewardsExpireAt);
      }
    }

    // Mark grand final complete
    await dbClient.from('grand_finals').update({
      status: 'completed',
      bracket: bracket,
      champion_id: champion.isBot ? null : champion.character_id,
    }).eq('id', grandFinalId);

    addLog(`🏆 ${tierLabel} Grand Final Complete! Champion: ${champion.name}!`, 'legendary');
    renderTournament();

  } catch(e) { console.error('Finalize grand final error:', e); }
}

// ── GIVE GRAND FINAL REWARD ──
async function giveGrandFinalReward(characterId, place, tierKey, rewardsExpireAt) {
  if (!characterId) return;
  try {
    const { data: c } = await dbClient
      .from('characters')
      .select('gold, inventory, tournament_title')
      .eq('id', characterId).single();
    if (!c) return;

    // Grand Final rewards are 3x regular tournament rewards
    const cfgRewards = GAME_CONFIG.tournament_rewards || {};
    const baseReward = cfgRewards[tierKey]?.[place] ||
      cfgRewards[tierKey]?.participation || 0;
    const goldReward = Math.floor(baseReward * 3);

    // Title for 2nd place
    const TIER_LABELS = {
      rookie: '🌱 Rookie', veteran: '⚔️ Veteran',
      elite: '💀 Elite', legend: '👑 Legend'
    };
    const title = place === 2
      ? `${TIER_LABELS[tierKey]} Grand Finalist`
      : null;

    // Item reward
    let tournamentItem = null;
    if (place === 2) {
      tournamentItem = getArenaRewardItem('legendary');
      tournamentItem.expiresAt = rewardsExpireAt;
      tournamentItem.tournamentReward = true;
    } else if (place === 3) {
      tournamentItem = getArenaRewardItem('epic');
      tournamentItem.expiresAt = rewardsExpireAt;
      tournamentItem.tournamentReward = true;
    }

    // Buff for 2nd place
    const tournamentBuff = place === 2 ? {
      goldMult: tierKey === 'legend' ? 1.75 : tierKey === 'elite' ? 1.5
        : tierKey === 'veteran' ? 1.35 : 1.2,
      attackMult: 1.12,
      label: title,
      expiresAt: rewardsExpireAt,
    } : null;

    const inv = c.inventory || [];
    if (tournamentItem) inv.push(tournamentItem);

    await dbClient.from('characters').update({
      gold: (c.gold || 0) + goldReward,
      inventory: inv,
      tournament_title: title || c.tournament_title,
      tournament_buff: tournamentBuff,
      tournament_item: tournamentItem,
      tournament_rewards_expire_at: rewardsExpireAt,
    }).eq('id', characterId);

    addLog(`🏆 Grand Final reward sent! Place: ${place === 'participation' ? '🎖️' : `#${place}`}`, 'gold');

  } catch(e) { console.error(`Grand Final reward error for place ${place}:`, e); }
}

// ── AUTO CHECK AND START GRAND FINALS ──
async function checkAndStartGrandFinals() {
  try {
    const now = new Date();
    const TIERS = ['rookie', 'veteran', 'elite', 'legend'];
    const TIER_MIN = { rookie: 20, veteran: 41, elite: 61, legend: 81 };

    for (const tierKey of TIERS) {
      const minLevel = TIER_MIN[tierKey];

      // Check if grand final already exists and is complete/in progress
      const { data: existingGF } = await dbClient
        .from('grand_finals')
        .select('id, status')
        .eq('tier', tierKey)
        .in('status', ['pending', 'in_progress', 'completed'])
        .gte('created_at', new Date(now.getFullYear(), now.getMonth(),
          now.getDate() - 7).toISOString())
        .single();

      if (existingGF?.status === 'completed') continue;
      if (existingGF?.status === 'in_progress') continue;

      // Check if it's past 9pm Cambodia (2pm UTC) on a Friday
      const isFriday = now.getUTCDay() === 5;
      const isPastGrandFinalTime = now.getUTCHours() >= 14;

      if (!isFriday || !isPastGrandFinalTime) continue;

      // Check if all brackets for this tier are completed
      const { data: brackets } = await dbClient
        .from('arena_tournaments')
        .select('id, status')
        .eq('min_level', minLevel)
        .gte('created_at', new Date(now.getFullYear(), now.getMonth(),
          now.getDate() - 1).toISOString());

      if (!brackets || !brackets.length) continue;

      const allCompleted = brackets.every(b => b.status === 'completed');
      if (!allCompleted) continue;

      // All brackets done — start grand final!
      addLog(`👑 Starting ${tierKey} Grand Final...`, 'legendary');
      await startGrandFinal(tierKey);
    }

  } catch(e) { console.error('Check grand finals error:', e); }
}

// ── PAY WEEKLY SUPREME CHAMPION GOLD BONUS ──
async function paySupremeChampionWeeklyBonus() {
  try {
    const now = new Date();
    const isFriday = now.getUTCDay() === 5;
    const isPastRewardTime = now.getUTCHours() >= 15; // 10pm Cambodia
    if (!isFriday || !isPastRewardTime) return;

    // Get all Supreme Champions
    const { data: champs } = await dbClient
      .from('characters')
      .select('id, name, supreme_tier, supreme_weekly_gold, gold')
      .not('supreme_tier', 'is', null);

    if (!champs || !champs.length) return;

    for (const champ of champs) {
      const weeklyBonus = champ.supreme_weekly_gold ||
        (GAME_CONFIG.supreme_weekly_gold || {})[champ.supreme_tier] || 0;
      if (!weeklyBonus) continue;

      await dbClient.from('characters').update({
        gold: (champ.gold || 0) + weeklyBonus,
      }).eq('id', champ.id);

      // Notify if current player
      if (champ.id === state.character_id) {
        state.gold += weeklyBonus;
        addLog(`👑 Supreme Champion weekly bonus: +${formatNumber(weeklyBonus)}g!`, 'legendary');
        notify(`👑 +${formatNumber(weeklyBonus)}g Supreme Champion bonus!`, 'var(--gold)');
        updateUI();
      }
    }
  } catch(e) { console.error('Supreme weekly bonus error:', e); }
}

// ── VIEW GRAND FINAL BRACKET ──
async function viewGrandFinalBracket(tierKey) {
  const { data: grandFinal } = await dbClient
    .from('grand_finals')
    .select('*')
    .eq('tier', tierKey)
    .in('status', ['in_progress', 'completed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!grandFinal) { notify('No Grand Final found!', 'var(--gold)'); return; }

  const bracket = grandFinal.bracket || [];
  const rounds = [...new Set(bracket.map(m => m.round))].sort();
  const roundLabels = {
    1: 'QUARTER FINALS',
    2: 'SEMI FINALS',
    3: 'GRAND FINAL',
  };

  const TIER_COLORS = {
    rookie: '#22c55e', veteran: '#3b82f6',
    elite: '#a855f7', legend: '#ff9900'
  };
  const tierColor = TIER_COLORS[tierKey];

  document.getElementById('item-popup-content').innerHTML = `
    <div style="font-family:var(--font-title);color:var(--gold);
      margin-bottom:4px;font-size:.92em;text-align:center;">
      👑 ${tierKey.charAt(0).toUpperCase()+tierKey.slice(1)} Grand Final
    </div>
    <div style="font-size:.68em;color:${grandFinal.status==='completed'?'var(--green)':'var(--gold)'};
      text-align:center;margin-bottom:10px;">
      ${grandFinal.status === 'completed' ? '✅ Completed' : '⚔️ In Progress'}
    </div>
    <div style="max-height:420px;overflow-y:auto;">
      ${rounds.map(r => `
        <div style="margin-bottom:14px;">
          <div style="font-family:var(--font-title);font-size:.65em;
            color:${r === Math.max(...rounds) ? tierColor : 'var(--text-dim)'};
            letter-spacing:2px;margin-bottom:6px;">
            ${r === Math.max(...rounds) ? '👑 ' : ''}${roundLabels[r] || `ROUND ${r}`}
          </div>
          ${bracket.filter(m => m.round === r).map(m => {
            const p1Won = m.winner?.character_id === m.player1?.character_id;
            const p2Won = m.winner?.character_id === m.player2?.character_id;
            const p1IsChamp = m.player1?.isSupremeChamp;
            const p2IsChamp = m.player2?.isSupremeChamp;
            return `
              <div style="background:rgba(255,255,255,0.03);
                border:1px solid ${r === Math.max(...rounds) ? tierColor+'44' : 'var(--border)'};
                border-radius:6px;padding:8px;margin-bottom:5px;font-size:.76em;">
                <div style="display:flex;justify-content:space-between;
                  align-items:center;gap:6px;">
                  <span style="flex:1;
                    color:${p1Won ? 'var(--gold)' : m.winner ? 'var(--text-dim)' : 'var(--text)'};">
                    ${p1IsChamp ? '👑 ' : m.player1?.isBot ? '🤖 ' : '👤 '}
                    ${m.player1?.name || 'TBD'}
                    <span style="color:var(--text-dim);font-size:.8em;">
                      Lv.${m.player1?.level || '?'}
                    </span>
                  </span>
                  <span style="color:var(--text-dim);font-size:.68em;">VS</span>
                  <span style="flex:1;text-align:right;
                    color:${p2Won ? 'var(--gold)' : m.winner ? 'var(--text-dim)' : 'var(--text)'};">
                    ${m.player2
                      ? `${p2IsChamp ? '👑 ' : m.player2.isBot ? '🤖 ' : '👤 '}
                         ${m.player2.name}
                         <span style="color:var(--text-dim);font-size:.8em;">
                           Lv.${m.player2?.level || '?'}
                         </span>`
                      : 'BYE'}
                  </span>
                </div>
                ${m.winner ? `
                  <div style="text-align:center;
                    color:${r === Math.max(...rounds) ? 'var(--gold)' : 'var(--text-dim)'};
                    font-size:.65em;margin-top:4px;">
                    ${r === Math.max(...rounds) ? '👑' : '🏆'} ${m.winner.name} wins
                  </div>` : ''}
                ${m.battleId ? `
                  <div style="text-align:center;margin-top:4px;">
                    <button onclick="openBattleReplay('${m.battleId}')"
                      style="background:transparent;border:1px solid var(--border);
                      border-radius:4px;color:var(--text-dim);
                      font-size:.68em;padding:2px 8px;cursor:pointer;">
                      🎬 Replay
                    </button>
                  </div>` : ''}
              </div>`;
          }).join('')}
        </div>`).join('')}
    </div>
    <div style="text-align:center;margin-top:8px;">
      <button class="start-btn" onclick="closeItemPopup()">✖ Close</button>
    </div>`;
  document.getElementById('item-popup').style.display = 'flex';
}

// ── RENDER TOURNAMENT UI ──
async function renderTournament() {
  const container = document.getElementById('arena-content');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:20px;">Loading...</div>';

  try {
    await checkTournamentRewardExpiry();

    const TIERS = [
      { key: 'rookie',  label: '🌱 Rookie',  min: 20, max: 40,  color: '#22c55e' },
      { key: 'veteran', label: '⚔️ Veteran', min: 41, max: 60,  color: '#3b82f6' },
      { key: 'elite',   label: '💀 Elite',   min: 61, max: 80,  color: '#a855f7' },
      { key: 'legend',  label: '👑 Legend',  min: 81, max: 100, color: '#ff9900' },
    ];

    const fees = GAME_CONFIG.tournament_fees || {};
    const playerLevel = state.level || 1;
    const playerTierKey = playerLevel < 20 ? null
      : playerLevel <= 40 ? 'rookie'
      : playerLevel <= 60 ? 'veteran'
      : playerLevel <= 80 ? 'elite'
      : 'legend';

    // Fetch all open/in_progress tournaments
    const { data: activeTournaments } = await dbClient
      .from('arena_tournaments')
      .select('*')
      .in('status', ['open', 'in_progress'])
      .order('bracket_number', { ascending: true });

    // Fetch grand finals
    const { data: grandFinals } = await dbClient
      .from('grand_finals')
      .select('*')
      .in('status', ['pending', 'in_progress'])
      .order('created_at', { ascending: false });

    // Fetch supreme champions
    const { data: supremeChamps } = await dbClient
      .from('characters')
      .select('id, name, class, level, supreme_tier, supreme_title, supreme_defenses, supreme_since')
      .not('supreme_tier', 'is', null);

    let html = '';

    // ── TOURNAMENT REWARDS BANNER ──
    if (state.tournamentTitle || state.tournamentBuff || state.tournamentItem) {
      const expiry = state.tournamentRewardsExpireAt ? new Date(state.tournamentRewardsExpireAt) : null;
      const now = new Date();
      const msLeft = expiry ? expiry - now : 0;
      const hoursLeft = Math.max(0, Math.floor(msLeft / 3600000));
      const minsLeft  = Math.max(0, Math.floor((msLeft % 3600000) / 60000));
      html += `
        <div class="char-panel" style="margin-bottom:12px;border:1px solid var(--gold);
          background:rgba(255,153,0,0.06);">
          <div class="panel-title" style="color:var(--gold);">🏆 Active Tournament Rewards</div>
          ${state.tournamentTitle ? `
            <div style="font-family:var(--font-title);font-size:.88em;color:var(--gold);margin-bottom:6px;">
              🎖️ ${state.tournamentTitle}
            </div>` : ''}
          ${state.tournamentBuff ? `
            <div style="font-size:.75em;color:var(--text-dim);margin-bottom:4px;">
              ⚡ Gold: +${Math.round((state.tournamentBuff.goldMult-1)*100)}%
              &nbsp;|&nbsp; ATK: +${Math.round((state.tournamentBuff.attackMult-1)*100)}%
            </div>` : ''}
          <div style="font-size:.70em;color:var(--red);margin-top:4px;">
            ⏰ Expires in: ${hoursLeft}h ${minsLeft}m
          </div>
        </div>`;
    }

    // ── SUPREME CHAMPION DISPLAY ──
    if (supremeChamps && supremeChamps.length) {
      const classIcons = { Warrior:'⚔️',Mage:'🔮',Rogue:'🗡️',Hunter:'🏹',Paladin:'✨',Necromancer:'💀',Shaman:'⚡',Berserker:'🐉' };
      const tierColors = { rookie:'#22c55e', veteran:'#3b82f6', elite:'#a855f7', legend:'#ff9900' };
      html += `
        <div class="char-panel" style="margin-bottom:12px;
          border:1px solid var(--gold);background:rgba(255,153,0,0.04);">
          <div class="panel-title" style="color:var(--gold);">👑 Supreme Champions</div>
          ${supremeChamps.map(c => {
            const color = tierColors[c.supreme_tier] || 'var(--gold)';
            const defenses = c.supreme_defenses || 0;
            const shields = defenses >= 10 ? '⭐ UNDEFEATED' 
              : '🛡️'.repeat(Math.min(defenses, 5));
            const since = c.supreme_since 
              ? new Date(c.supreme_since).toLocaleDateString() : '?';
            const isMe = c.id === state.character_id;
            return `
              <div style="display:flex;align-items:center;gap:8px;padding:8px;
                margin-bottom:6px;border-radius:8px;
                background:${isMe ? 'rgba(255,153,0,0.08)' : 'rgba(255,255,255,0.03)'};
                border:1px solid ${isMe ? 'var(--gold)' : 'rgba(255,255,255,0.06)'};">
                <div style="font-size:1.4em;">${classIcons[c.class]||'👤'}</div>
                <div style="flex:1;">
                  <div style="font-family:var(--font-title);font-size:.82em;color:${color};">
                    ${c.supreme_title || ''}
                  </div>
                  <div style="font-size:.72em;color:var(--text);">
                    ${c.name} 
                    <span style="color:var(--text-dim);">Lv.${c.level}</span>
                    ${isMe ? '<span style="color:var(--gold);"> (You)</span>' : ''}
                  </div>
                  <div style="font-size:.65em;color:var(--text-dim);">
                    ${shields} ${defenses} defense${defenses!==1?'s':''}
                    · Since ${since}
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>`;
    }

    // ── LEVEL WARNING ──
    if (playerLevel < 20) {
      html += `
        <div class="char-panel" style="margin-bottom:12px;text-align:center;">
          <div style="font-size:1.5em;margin-bottom:8px;">🔒</div>
          <div style="font-family:var(--font-title);color:var(--gold);margin-bottom:4px;">
            Tournament Locked
          </div>
          <div style="font-size:.78em;color:var(--text-dim);">
            Reach <span style="color:var(--green);">Level 20</span> to compete.
            You are Level ${playerLevel} — ${20-playerLevel} levels to go!
          </div>
        </div>`;
    }

    // ── SCHEDULE INFO ──
    html += `
      <div style="font-size:.72em;color:var(--text-dim);margin-bottom:10px;
        background:rgba(255,255,255,0.03);border-radius:6px;padding:8px;line-height:1.9;">
        🗓️ <b style="color:var(--text);">Every Friday</b> &nbsp;|&nbsp;
        🕖 Registration: <b style="color:var(--gold);">7 PM</b> &nbsp;|&nbsp;
        ⚔️ Brackets: <b style="color:var(--gold);">7–8 PM</b> &nbsp;|&nbsp;
        👑 Grand Final: <b style="color:var(--gold);">9 PM</b> &nbsp;|&nbsp;
        🏆 Rewards: <b style="color:var(--gold);">10 PM</b> &nbsp;|&nbsp;
        ⏰ Expires: <b style="color:var(--red);">Next Fri 1 AM</b>
        <br>All times Cambodia (UTC+7)
      </div>`;

    // ── TIER CARDS ──
    for (const tier of TIERS) {
      const tierFee = fees[tier.key] ?? 20000;
      const isPlayerTier = tier.key === playerTierKey;
      const isLocked = playerLevel < tier.min || playerLevel > tier.max;

      // Get all brackets for this tier
      const tierBrackets = (activeTournaments || [])
        .filter(t => t.min_level === tier.min)
        .sort((a, b) => a.bracket_number - b.bracket_number);

      // Get grand final for this tier
      const grandFinal = (grandFinals || []).find(gf => gf.tier === tier.key);

      // Get supreme champ for this tier
      const supremeChamp = (supremeChamps || []).find(c => c.supreme_tier === tier.key);

      // Check if player is registered in any bracket
      let playerBracket = null;
      let playerRegCount = 0;
      for (const t of tierBrackets) {
        const { data: myReg } = await dbClient
          .from('arena_registrations')
          .select('id')
          .eq('tournament_id', t.id)
          .eq('user_id', state.user_id)
          .single();
        if (myReg) { playerBracket = t; break; }
        const { count } = await dbClient
          .from('arena_registrations')
          .select('*', { count: 'exact' })
          .eq('tournament_id', t.id);
        playerRegCount += count || 0;
      }

      const isRegistered = !!playerBracket;
      const totalSlots = tierBrackets.length * TOURNAMENT_SIZE;
      const allFull = tierBrackets.length >= MAX_BRACKETS_PER_TIER &&
        tierBrackets.every(t => t.status !== 'open');

      html += `
        <div class="char-panel" style="margin-bottom:10px;
          border:1px solid ${isPlayerTier ? tier.color : 'var(--border)'};
          opacity:${isLocked ? '0.5' : '1'};">

          <!-- Tier Header -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div>
              <span style="font-family:var(--font-title);font-size:.92em;color:${tier.color};">
                ${tier.label}
              </span>
              <span style="font-size:.68em;color:var(--text-dim);margin-left:6px;">
                Lv.${tier.min}–${tier.max}
              </span>
              ${isPlayerTier ? `<span style="font-size:.62em;color:var(--green);margin-left:6px;">● YOUR TIER</span>` : ''}
            </div>
            <div style="font-size:.72em;color:var(--gold);">
              Entry: ${formatNumber(tierFee)}g
            </div>
          </div>

          <!-- Supreme Champ Badge -->
          ${supremeChamp ? `
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;
              padding:5px 8px;background:rgba(255,153,0,0.08);
              border-radius:6px;border:1px solid rgba(255,153,0,0.2);">
              <span style="font-size:.9em;">👑</span>
              <span style="font-size:.70em;color:var(--gold);font-family:var(--font-title);">
                Supreme: ${supremeChamp.name}
              </span>
              <span style="font-size:.62em;color:var(--text-dim);margin-left:auto;">
                ${'🛡️'.repeat(Math.min(supremeChamp.supreme_defenses||0, 5))}
              </span>
            </div>` : ''}

          <!-- Brackets -->
          ${tierBrackets.length ? tierBrackets.map(t => {
            const bracketRegCount = 0; // will show from slot bar
            return `
              <div style="margin-bottom:6px;padding:6px;
                background:rgba(255,255,255,0.02);border-radius:6px;
                border:1px solid rgba(255,255,255,0.06);">
                <div style="display:flex;justify-content:space-between;
                  font-size:.68em;color:var(--text-dim);margin-bottom:3px;">
                  <span>Bracket ${t.bracket_number}</span>
                  <span style="color:${t.status==='open'?'var(--green)':'var(--gold)'};">
                    ${t.status==='open'?'🟢 Open':'🟡 In Progress'}
                  </span>
                </div>
                <div style="height:4px;background:rgba(255,255,255,0.07);
                  border-radius:2px;overflow:hidden;">
                  <div style="height:100%;background:${tier.color};border-radius:2px;
                    width:${(Math.min(t.bracket?.length||0, TOURNAMENT_SIZE)/TOURNAMENT_SIZE)*100}%;">
                  </div>
                </div>
                ${t.status==='in_progress'?`
                  <button class="start-btn" 
                    onclick="viewBracketByTierAndNumber('${tier.key}', ${t.bracket_number})"
                    style="width:100%;padding:5px;font-size:.68em;margin-top:4px;">
                    📊 View Bracket
                  </button>` : ''}
              </div>`;
          }).join('') : `
            <div style="font-size:.72em;color:var(--text-dim);
              text-align:center;padding:6px 0;">
              No brackets open yet
            </div>`}

          <!-- Grand Final Status -->
          ${grandFinal ? `
            <div style="margin-bottom:8px;padding:6px 8px;
              background:rgba(255,153,0,0.08);border-radius:6px;
              border:1px solid rgba(255,153,0,0.3);">
              <div style="font-size:.70em;color:var(--gold);font-family:var(--font-title);">
                👑 Grand Final — ${grandFinal.status === 'in_progress' ? '⚔️ In Progress' : '⏳ Pending 9PM'}
              </div>
              ${grandFinal.status==='in_progress'?`
                <button class="start-btn"
                  onclick="viewGrandFinalBracket('${tier.key}')"
                  style="width:100%;padding:5px;font-size:.68em;margin-top:4px;">
                  📊 View Grand Final
                </button>` : ''}
            </div>` : ''}

          <!-- Action Button -->
          ${isLocked ? `
            <div style="font-size:.72em;color:var(--text-dim);text-align:center;padding:4px 0;">
              🔒 Requires Level ${tier.min}–${tier.max}
            </div>
          ` : isRegistered ? `
            <div style="text-align:center;color:var(--green);font-size:.78em;
              padding:8px;background:rgba(34,197,94,0.06);border-radius:6px;">
              ✅ Registered in Bracket ${playerBracket?.bracket_number}!
              Waiting for tournament to start...
            </div>
            ${playerBracket?.status === 'open' ? `
              ` : ''}
          ` : allFull ? `
            <div style="text-align:center;color:var(--red);font-size:.75em;
              padding:8px;background:rgba(255,0,0,0.06);border-radius:6px;">
              ⚠️ All ${MAX_BRACKETS_PER_TIER} brackets full! Come back next week.
            </div>
          ` : `
            <button class="start-btn"
              onclick="registerForTournament('${tier.key}')"
              style="width:100%;padding:9px;font-size:.78em;
              background:${isPlayerTier?`linear-gradient(135deg,${tier.color}33,${tier.color}11)`:''};
              border-color:${isPlayerTier?tier.color:'var(--border)'};">
              ⚔️ Register — ${formatNumber(tierFee)}g
            </button>
          `}

          <!-- Practice Board Toggle -->
          ${!isLocked ? `
            <div style="margin-top:8px;">
              <button onclick="togglePracticeboard('${tier.key}')"
                id="practice-toggle-${tier.key}"
                style="width:100%;padding:6px;font-size:.70em;
                background:rgba(255,255,255,0.03);border:1px solid var(--border);
                border-radius:6px;color:var(--text-dim);cursor:pointer;">
                👥 View Registered Fighters
              </button>
              <div id="practiceboard-${tier.key}" style="display:none;margin-top:8px;"></div>
            </div>` : ''}
        </div>`;
    }

    container.innerHTML = html;

  } catch(e) {
    container.innerHTML = '<div style="text-align:center;color:var(--red);padding:20px;">Failed to load tournament.</div>';
    console.error(e);
  }
}



// ── TOGGLE PRACTICEBOARD ──
function togglePracticeboard(tierKey) {
  const board = document.getElementById(`practiceboard-${tierKey}`);
  const btn = document.getElementById(`practice-toggle-${tierKey}`);
  if (!board) return;

  if (board.style.display === 'none') {
    board.style.display = 'block';
    btn.textContent = '👥 Hide Fighters';
    renderPracticeboard(tierKey, `practiceboard-${tierKey}`);
  } else {
    board.style.display = 'none';
    btn.textContent = '👥 View Registered Fighters';
  }
}

// ── VIEW BATTLE LOG ──
async function viewBattleLog(battleId) {
  const { data: battle } = await dbClient.from('arena_battles').select('*').eq('id', battleId).single();
  if(!battle) return;

  const log = battle.battle_log || [];
  const popup = document.getElementById('item-popup');
  document.getElementById('item-popup-content').innerHTML = `
    <div style="font-family:var(--font-title);color:var(--gold);margin-bottom:12px;font-size:.9em;">⚔️ Battle Log</div>
    <div style="max-height:300px;overflow-y:auto;font-size:.75em;line-height:1.9;color:var(--text);">
      ${log.map(l => `<div style="border-bottom:1px solid rgba(255,255,255,0.04);padding:2px 0;">${l}</div>`).join('')}
    </div>
    <div style="text-align:center;margin-top:12px;">
      <button class="start-btn" onclick="closeItemPopup()">✖ Close</button>
    </div>`;
  popup.style.display = 'flex';
}

// ── BATTLE REPLAY VIEWER ──
async function openBattleReplay(battleId) {
  const { data: battle } = await dbClient
    .from('arena_battles')
    .select('*')
    .eq('id', battleId)
    .single();

  if (!battle) { notify('Battle not found!', 'var(--red)'); return; }

  const turns = battle.battle_turns || [];
  const p1 = battle.attacker_snapshot || {};
  const p2 = battle.defender_snapshot || {};

  if (!turns.length) {
    // Fallback to text log if no structured turns
    viewBattleLog(battleId);
    return;
  }

  let currentTurn = 0;
  let replayInterval = null;
  let speed = 800; // ms per turn
  let isPlaying = false;

  const popup = document.getElementById('item-popup');

  function getHpPercent(hp, max) {
    return Math.max(0, Math.min(100, Math.floor((hp / max) * 100)));
  }

  function getHpColor(pct) {
    if (pct > 60) return 'var(--green)';
    if (pct > 30) return 'var(--gold)';
    return 'var(--red)';
  }

  function getClassIcon(cls) {
    const icons = {
      Warrior: '⚔️', Mage: '🔮', Rogue: '🗡️',
      Hunter: '🏹', Paladin: '✨', Necromancer: '💀',
      Shaman: '⚡', Berserker: '🐉',
    };
    return icons[cls] || '👤';
  }

  function renderReplay() {
    const turn = turns[currentTurn] || turns[turns.length - 1];
    const p1Pct = getHpPercent(turn.p1HpAfter, turn.p1HpMax);
    const p2Pct = getHpPercent(turn.p2HpAfter, turn.p2HpMax);
    const p1HpColor = getHpColor(p1Pct);
    const p2HpColor = getHpColor(p2Pct);
    const isP1Acting = turn.actor === 'p1';
    const isP2Acting = turn.actor === 'p2';
    const isResult = turn.action === 'result';

    // Action display
    let actionHtml = '';
    if (isResult) {
      actionHtml = `
        <div style="text-align:center;padding:10px 0;">
          <div style="font-family:var(--font-title);font-size:1.1em;color:var(--gold);
            animation:glow-pulse 1s infinite;">
            🏆 ${turn.logText}
          </div>
        </div>`;
    } else if (turn.action === 'buff') {
      actionHtml = `
        <div style="text-align:center;padding:8px;
          background:rgba(168,85,247,0.1);border-radius:8px;">
          <div style="font-size:1.4em;">${turn.skillIcon || '✨'}</div>
          <div style="font-size:.75em;color:#a855f7;margin-top:2px;">${turn.buffDesc || turn.skillName}</div>
        </div>`;
    } else if (turn.action === 'dodge') {
      actionHtml = `
        <div style="text-align:center;padding:8px;
          background:rgba(59,130,246,0.1);border-radius:8px;">
          <div style="font-size:1.4em;">💨</div>
          <div style="font-size:.75em;color:#3b82f6;margin-top:2px;">Dodged!</div>
        </div>`;
    } else if (turn.action === 'skill') {
      actionHtml = `
        <div style="text-align:center;padding:8px;
          background:rgba(255,153,0,0.1);border-radius:8px;">
          <div style="font-size:1.4em;">${turn.skillIcon || '⚔️'}</div>
          <div style="font-size:.72em;color:var(--gold);margin-top:2px;">${turn.skillName}</div>
          <div style="font-size:.85em;color:var(--red);font-family:var(--font-title);margin-top:2px;">
            -${formatNumber(turn.damage)}
          </div>
        </div>`;
    } else if (turn.action === 'crit') {
      actionHtml = `
        <div style="text-align:center;padding:8px;
          background:rgba(255,34,68,0.1);border-radius:8px;">
          <div style="font-size:1.4em;">💥</div>
          <div style="font-size:.72em;color:var(--red);margin-top:2px;">CRITICAL HIT!</div>
          <div style="font-size:.9em;color:var(--red);font-family:var(--font-title);margin-top:2px;">
            -${formatNumber(turn.damage)}
          </div>
        </div>`;
    } else {
      actionHtml = `
        <div style="text-align:center;padding:8px;
          background:rgba(255,255,255,0.04);border-radius:8px;">
          <div style="font-size:1.4em;">⚔️</div>
          <div style="font-size:.72em;color:var(--text-dim);margin-top:2px;">Attack</div>
          <div style="font-size:.85em;color:var(--red);font-family:var(--font-title);margin-top:2px;">
            -${formatNumber(turn.damage)}
          </div>
        </div>`;
    }

    document.getElementById('item-popup-content').innerHTML = `
      <!-- Header -->
      <div style="font-family:var(--font-title);color:var(--gold);
        margin-bottom:10px;font-size:.88em;text-align:center;">
        ⚔️ Battle Replay
        <span style="font-size:.7em;color:var(--text-dim);margin-left:8px;">
          Turn ${isResult ? turns.length - 1 : turn.turn}/${turns.length - 1}
        </span>
      </div>

      <!-- Fighters Row -->
      <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:10px;">

        <!-- Player 1 -->
        <div style="flex:1;background:${isP1Acting && !isResult ? 'rgba(255,153,0,0.08)' : 'rgba(255,255,255,0.03)'};
          border:1px solid ${isP1Acting && !isResult ? 'var(--gold)' : 'var(--border)'};
          border-radius:8px;padding:8px;transition:all .2s;">
          <div style="font-size:.68em;color:var(--text-dim);margin-bottom:2px;">
            ${p1.isBot ? '🤖' : '👤'} ${getClassIcon(p1.class)}
          </div>
          <div style="font-family:var(--font-title);font-size:.78em;
            color:${battle.winner_id === p1.character_id ? 'var(--gold)' : 'var(--text)'};
            margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${p1.name || 'Player 1'}
            ${battle.winner_id === p1.character_id ? ' 🏆' : ''}
          </div>
          <div style="font-size:.65em;color:var(--text-dim);margin-bottom:4px;">
            Lv.${p1.level || '?'} ${p1.class || ''}
          </div>
          <!-- HP Bar -->
          <div style="height:6px;background:rgba(255,255,255,0.07);
            border-radius:3px;overflow:hidden;margin-bottom:2px;">
            <div style="height:100%;width:${p1Pct}%;
              background:${p1HpColor};border-radius:3px;transition:width .3s;">
            </div>
          </div>
          <div style="font-size:.65em;color:${p1HpColor};">
            ${formatNumber(turn.p1HpAfter)} / ${formatNumber(turn.p1HpMax)} HP
          </div>
          <!-- Skill Combo -->
          ${p1.skillCombo?.length ? `
            <div style="display:flex;gap:3px;margin-top:5px;flex-wrap:wrap;">
              ${p1.skillCombo.map(sk => `
                <span style="font-size:1em;" title="${SKILLS[sk]?.name || sk}">
                  ${SKILLS[sk]?.icon || '⚔️'}
                </span>`).join('')}
            </div>` : ''}
        </div>

        <!-- Action Center -->
        <div style="width:80px;flex-shrink:0;padding-top:16px;">
          ${actionHtml}
          <!-- Arrow indicator -->
          ${!isResult ? `
            <div style="text-align:center;font-size:.7em;color:var(--text-dim);margin-top:4px;">
              ${isP1Acting ? '→' : '←'}
            </div>` : ''}
        </div>

        <!-- Player 2 -->
        <div style="flex:1;background:${isP2Acting && !isResult ? 'rgba(255,153,0,0.08)' : 'rgba(255,255,255,0.03)'};
          border:1px solid ${isP2Acting && !isResult ? 'var(--gold)' : 'var(--border)'};
          border-radius:8px;padding:8px;transition:all .2s;">
          <div style="font-size:.68em;color:var(--text-dim);margin-bottom:2px;">
            ${p2.isBot ? '🤖' : '👤'} ${getClassIcon(p2.class)}
          </div>
          <div style="font-family:var(--font-title);font-size:.78em;
            color:${battle.winner_id === p2.character_id ? 'var(--gold)' : 'var(--text)'};
            margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${p2.name || 'Player 2'}
            ${battle.winner_id === p2.character_id ? ' 🏆' : ''}
          </div>
          <div style="font-size:.65em;color:var(--text-dim);margin-bottom:4px;">
            Lv.${p2.level || '?'} ${p2.class || ''}
          </div>
          <!-- HP Bar -->
          <div style="height:6px;background:rgba(255,255,255,0.07);
            border-radius:3px;overflow:hidden;margin-bottom:2px;">
            <div style="height:100%;width:${p2Pct}%;
              background:${p2HpColor};border-radius:3px;transition:width .3s;">
            </div>
          </div>
          <div style="font-size:.65em;color:${p2HpColor};">
            ${formatNumber(turn.p2HpAfter)} / ${formatNumber(turn.p2HpMax)} HP
          </div>
          <!-- Skill Combo -->
          ${p2.skillCombo?.length ? `
            <div style="display:flex;gap:3px;margin-top:5px;flex-wrap:wrap;">
              ${p2.skillCombo.map(sk => `
                <span style="font-size:1em;" title="${SKILLS[sk]?.name || sk}">
                  ${SKILLS[sk]?.icon || '⚔️'}
                </span>`).join('')}
            </div>` : ''}
        </div>
      </div>

      <!-- Turn Log Text -->
      <div style="font-size:.72em;color:var(--text-dim);text-align:center;
        min-height:20px;margin-bottom:10px;padding:4px 8px;
        background:rgba(255,255,255,0.03);border-radius:6px;line-height:1.5;">
        ${turn.logText || ''}
      </div>

      <!-- Progress Bar -->
      <div style="height:3px;background:rgba(255,255,255,0.07);
        border-radius:2px;overflow:hidden;margin-bottom:10px;">
        <div style="height:100%;
          width:${((currentTurn + 1) / turns.length) * 100}%;
          background:var(--gold);border-radius:2px;transition:width .3s;">
        </div>
      </div>

      <!-- Controls -->
      <div style="display:flex;gap:6px;margin-bottom:8px;">
        <button onclick="replayStep(-1)"
          style="flex:1;background:rgba(255,255,255,0.05);border:1px solid var(--border);
          border-radius:6px;color:var(--text);padding:8px;cursor:pointer;font-size:.8em;">
          ⏮ Prev
        </button>
        <button id="replay-play-btn" onclick="replayTogglePlay()"
          style="flex:2;background:rgba(255,153,0,0.15);border:1px solid var(--gold);
          border-radius:6px;color:var(--gold);padding:8px;cursor:pointer;
          font-family:var(--font-title);font-size:.8em;">
          ${isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onclick="replayStep(1)"
          style="flex:1;background:rgba(255,255,255,0.05);border:1px solid var(--border);
          border-radius:6px;color:var(--text);padding:8px;cursor:pointer;font-size:.8em;">
          Next ⏭
        </button>
      </div>

      <!-- Speed + Close -->
      <div style="display:flex;gap:6px;">
        <button onclick="replaySetSpeed(1200)"
          style="flex:1;background:${speed===1200?'rgba(255,153,0,0.2)':'rgba(255,255,255,0.04)'};
          border:1px solid ${speed===1200?'var(--gold)':'var(--border)'};
          border-radius:6px;color:var(--text-dim);padding:6px;cursor:pointer;font-size:.7em;">
          🐢 Slow
        </button>
        <button onclick="replaySetSpeed(800)"
          style="flex:1;background:${speed===800?'rgba(255,153,0,0.2)':'rgba(255,255,255,0.04)'};
          border:1px solid ${speed===800?'var(--gold)':'var(--border)'};
          border-radius:6px;color:var(--text-dim);padding:6px;cursor:pointer;font-size:.7em;">
          ⚡ Normal
        </button>
        <button onclick="replaySetSpeed(300)"
          style="flex:1;background:${speed===300?'rgba(255,153,0,0.2)':'rgba(255,255,255,0.04)'};
          border:1px solid ${speed===300?'var(--gold)':'var(--border)'};
          border-radius:6px;color:var(--text-dim);padding:6px;cursor:pointer;font-size:.7em;">
          🚀 Fast
        </button>
        <button onclick="replayClose()"
          style="flex:1;background:rgba(255,255,255,0.04);border:1px solid var(--border);
          border-radius:6px;color:var(--text-dim);padding:6px;cursor:pointer;font-size:.7em;">
          ✖ Close
        </button>
      </div>`;

    popup.style.display = 'flex';
  }

  // Expose controls to window
  window.replayStep = function(dir) {
    currentTurn = Math.max(0, Math.min(turns.length - 1, currentTurn + dir));
    renderReplay();
  };

  window.replayTogglePlay = function() {
    isPlaying = !isPlaying;
    if (isPlaying) {
      replayInterval = setInterval(() => {
        if (currentTurn >= turns.length - 1) {
          isPlaying = false;
          clearInterval(replayInterval);
          renderReplay();
          return;
        }
        currentTurn++;
        renderReplay();
      }, speed);
    } else {
      clearInterval(replayInterval);
    }
    renderReplay();
  };

  window.replaySetSpeed = function(newSpeed) {
    speed = newSpeed;
    if (isPlaying) {
      clearInterval(replayInterval);
      replayInterval = setInterval(() => {
        if (currentTurn >= turns.length - 1) {
          isPlaying = false;
          clearInterval(replayInterval);
          renderReplay();
          return;
        }
        currentTurn++;
        renderReplay();
      }, speed);
    }
    renderReplay();
  };

  window.replayClose = function() {
    isPlaying = false;
    clearInterval(replayInterval);
    closeItemPopup();
  };

  // Initial render
  renderReplay();
}

// ── VIEW BRACKET BY TIER AND BRACKET NUMBER ──
async function viewBracketByTierAndNumber(tierKey, bracketNumber) {
  const TIER_MIN = { rookie: 20, veteran: 41, elite: 61, legend: 81 };
  const minLevel = TIER_MIN[tierKey];

  const { data: tournament } = await dbClient
    .from('arena_tournaments')
    .select('*')
    .in('status', ['open', 'in_progress', 'completed'])
    .eq('min_level', minLevel)
    .eq('bracket_number', bracketNumber)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!tournament) { notify('No bracket found!', 'var(--gold)'); return; }

  const bracket = tournament.bracket || [];
  const rounds = [...new Set(bracket.map(m => m.round))].sort();
  const roundLabels = {
    1: 'ROUND OF 16',
    2: 'QUARTER FINALS',
    3: 'SEMI FINALS',
    4: 'FINALS'
  };

  document.getElementById('item-popup-content').innerHTML = `
    <div style="font-family:var(--font-title);color:var(--gold);
      margin-bottom:4px;font-size:.88em;">
      📊 ${tierKey.charAt(0).toUpperCase()+tierKey.slice(1)} — Bracket ${bracketNumber}
    </div>
    <div style="font-size:.68em;color:var(--text-dim);margin-bottom:10px;">
      ${tournament.status === 'completed' ? '✅ Completed' : '⚔️ In Progress'}
    </div>
    <div style="max-height:400px;overflow-y:auto;">
      ${rounds.map(r => `
        <div style="margin-bottom:14px;">
          <div style="font-family:var(--font-title);font-size:.65em;
            color:var(--text-dim);letter-spacing:2px;margin-bottom:6px;">
            ${roundLabels[r] || `ROUND ${r}`}
          </div>
          ${bracket.filter(m => m.round === r).map(m => {
            const p1Won = m.winner?.character_id === m.player1?.character_id;
            const p2Won = m.winner?.character_id === m.player2?.character_id;
            return `
              <div style="background:rgba(255,255,255,0.03);
                border:1px solid var(--border);border-radius:6px;
                padding:8px;margin-bottom:5px;font-size:.76em;">
                <div style="display:flex;justify-content:space-between;
                  align-items:center;gap:6px;">
                  <span style="flex:1;color:${p1Won?'var(--gold)':m.winner?'var(--text-dim)':'var(--text)'};">
                    ${m.player1?.isBot?'🤖':'👤'} ${m.player1?.name||'TBD'}
                    <span style="color:var(--text-dim);font-size:.8em;">
                      Lv.${m.player1?.level||'?'}
                    </span>
                  </span>
                  <span style="color:var(--text-dim);font-size:.68em;">VS</span>
                  <span style="flex:1;text-align:right;
                    color:${p2Won?'var(--gold)':m.winner?'var(--text-dim)':'var(--text)'};">
                    ${m.player2?`${m.player2.isBot?'🤖':'👤'} ${m.player2.name}
                    <span style="color:var(--text-dim);font-size:.8em;">
                      Lv.${m.player2?.level||'?'}
                    </span>`:'BYE'}
                  </span>
                </div>
                ${m.winner?`
                  <div style="text-align:center;color:var(--gold);
                    font-size:.65em;margin-top:4px;">
                    🏆 ${m.winner.name} advances
                  </div>` : ''}
                ${m.battleId?`
                  <div style="text-align:center;margin-top:4px;">
                    <button onclick="openBattleReplay('${m.battleId}')"
                      style="background:transparent;border:1px solid var(--border);
                      border-radius:4px;color:var(--text-dim);
                      font-size:.68em;padding:2px 8px;cursor:pointer;">
                      🎬 Replay
                    </button>
                  </div>` : ''}
              </div>`;
          }).join('')}
        </div>
      `).join('')}
    </div>
    <div style="text-align:center;margin-top:8px;">
      <button class="start-btn" onclick="closeItemPopup()">✖ Close</button>
    </div>`;
  document.getElementById('item-popup').style.display = 'flex';
}

// ── VIEW BATTLE LOG INLINE (from bracket) ──
function viewBattleLogInline(log) {
  document.getElementById('item-popup-content').innerHTML = `
    <div style="font-family:var(--font-title);color:var(--gold);margin-bottom:12px;font-size:.9em;">
      ⚔️ Battle Log
    </div>
    <div style="max-height:320px;overflow-y:auto;font-size:.74em;line-height:1.9;color:var(--text);">
      ${log.map(l => `
        <div style="border-bottom:1px solid rgba(255,255,255,0.04);padding:2px 0;">${l}</div>
      `).join('')}
    </div>
    <div style="text-align:center;margin-top:12px;">
      <button class="start-btn" onclick="closeItemPopup()">✖ Close</button>
    </div>`;
  document.getElementById('item-popup').style.display = 'flex';
}

// ===== ENEMY STATS DISPLAY MANAGER =====

const enemyStatsPanel = document.getElementById('enemy-stats-panel');
const enemyStats = {
  name: document.getElementById('enemy-stats-name'),
  level: document.getElementById('enemy-stats-level'),
  hpBar: document.getElementById('enemy-hp-bar'),
  hpValue: document.getElementById('enemy-hp-value'),
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
  updateEnemyHP(enemy.hp, enemy.maxHp);

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

// ── COMBAT ──
function startCombat(enemyId,isBoss){
  const tmpl=MONSTER_TEMPLATES[enemyId];if(!tmpl)return;
  const diff=DIFFICULTY[state.difficulty||'normal'];
  const scale=(1+Math.max(0,(state.level-1))*0.3)*diff.hpMult;
  const atkScale=(1+Math.max(0,(state.level-1))*0.3)*diff.atkMult;
  const armorScale=(1+Math.max(0,(state.level-1))*0.3)*diff.armorMult;
  const hitScale=(1+Math.max(0,(state.level-1))*0.3)*diff.hitMult;
  const dodgeScale=(1+Math.max(0,(state.level-1))*0.3)*diff.dodgeMult;
  const prefix=state.difficulty==='hell'?'💀 Hell ':state.difficulty==='hard'?'🔥 Hard ':'';
  currentEnemy={...tmpl,name:prefix+tmpl.name,hp:Math.floor(tmpl.hp*scale),maxHp:Math.floor(tmpl.hp*scale),atk:Math.floor(tmpl.atk*atkScale),armor:tmpl.armor,hit:Math.floor((tmpl.hit||0)*5),dodge:Math.floor((tmpl.dodge||0)*5),poisoned:0,frozen:false,crippled:0,boss:false,_xpMult:diff.xpMult,_goldMult:diff.goldMult};
  currentEnemy=applyTutorialScaling(currentEnemy);
  startCombatWith(currentEnemy);
  if(isTutorialActive()){addCombatLog('📚 TUTORIAL MODE: Enemies are weaker!','info');showTutorialHint('firstCombat');}
  const combatArea = document.getElementById('combat-area'); // your existing combat container
  combatArea.insertAdjacentHTML('afterbegin', renderEnemyStatPanel(enemy));

  // Store current enemy reference for HP updates
  window.currentEnemy = enemy;
}
function startCombatWith(enemy){
  autoSkillIndex=0;
  document.getElementById('enemy-hp-val').textContent=formatNumber(enemy.hp);
  document.getElementById('enemy-hp-max').textContent=formatNumber(enemy.maxHp);
  const el=document.getElementById('arena-enemy');
  if(enemy.icon&&!enemy.icon.includes(' ')&&enemy.icon.length<20){el.innerHTML=`<img src="${enemy.icon}.jpg" style="width:50px;height:50px;object-fit:cover;border-radius:8px;border:2px solid var(--red);">`;}
  else{el.textContent=enemy.icon;}
  document.getElementById('arena-enemy-label').textContent=enemy.name;
  document.getElementById('arena-enemy-hp').style.width='100%';
  document.getElementById('combat-log').innerHTML='';
  document.getElementById('combat-box').style.display='block';
  document.getElementById('choices-box').style.display='none';

  // Enemy stats under their HP bar
  const es=document.getElementById('enemy-stats');
  if(es){
    es.style.display='block';
    es.innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 6px;font-size:.65em;">
        <span style="color:var(--text-dim);">⚔️ ATK <strong style="color:var(--red)">${formatNumber(enemy.atk)}</strong></span>
        <span style="color:var(--text-dim);">🛡️ ARM <strong style="color:var(--text)">${formatNumber(enemy.armor||0)}</strong></span>
        <span style="color:var(--text-dim);">🎯 HIT <strong style="color:var(--text)">${formatNumber(enemy.hit||0)}</strong></span>
        <span style="color:var(--text-dim);">💨 DDG <strong style="color:var(--text)">${formatNumber(enemy.dodge||0)}</strong></span>
        ${enemy.ability?`<span style="color:var(--red);grid-column:span 2;">⚡ ${enemy.ability.name}</span>`:''}
      </div>`;
  }

  document.getElementById('story-content').innerHTML=`
    <div class="scene-title">⚔️ Combat!</div>
    <p><strong style="color:var(--red)">${enemy.name}</strong> appears!${enemy.boss?'<span style="color:var(--gold);margin-left:6px;">⚠️ BOSS BATTLE!</span>':''}</p>`;

  document.getElementById('arena-player').innerHTML='<img src="warrior.jpg" style="width:50px;height:50px;object-fit:cover;border-radius:8px;border:2px solid var(--dark-gold);">';
  updateAutoFightBtn();
}

function combatAction(action) {
  if (!currentEnemy) return;

  // Player action handling
  if (action === 'attack') {
    showTutorialHint('firstCombat');
    handlePlayerAttack();
  } else if (action === 'magic') {
    showTutorialHint('firstMagic');
    handlePlayerMagic();
  } else if (action === 'defend') {
    showTutorialHint('firstDefend');
    state.defending = true;
    addCombatLog('🛡️ Bracing for impact!', 'info');
  } else if (action === 'flee') {
    showTutorialHint('firstFlee');
    handleFlee();
  }

  // Check if enemy is dead
  if (currentEnemy && currentEnemy.hp <= 0) {
    currentEnemy.hp = 0;
    updateEnemyBar();
    endCombat(true);
    return;
  }

  // Apply player regeneration
  applyPlayerRegeneration();

  // Enemy turn (if alive)
  if (currentEnemy && currentEnemy.hp > 0) {
    handleEnemyTurn();
  }

  // Check if player is dead
  if (state.hp <= 0) {
    state.hp = 0;
    updateUI();
    endCombat(false);
    return;
  }

  // Update UI
  updateEnemyBar();
  updateUI();
}

// ============================================
// PLAYER ATTACK HANDLER
// ============================================
function handlePlayerAttack() {
  // Check dodge
  const enemyDodgeChance = calculateDodgeChance(currentEnemy.dodge, state.hit);
  if (Math.random() < enemyDodgeChance) {
    addCombatLog(`💨 ${currentEnemy.name} dodged!`, 'bad');
    playSound('snd-attack');
    state.defending = false;
    return;
  }

  // Calculate base damage
  let damage = calculateAttackDamage(state.attackPower, currentEnemy.armor);

  // Apply tutorial bonus
  const tutBonus = getTutorialDamageBonus();
  damage = Math.floor(damage * tutBonus);

  // Apply berserker talent (low HP bonus)
  if (state.unlockedTalents.includes('berserker') && state.hp < state.maxHp * 0.5) {
    damage = Math.floor(damage * 1.35);
  }

  // Check for critical hit
  let isCrit = false;
  if (Math.random() < state.crit / 100) {
    damage = Math.floor(damage * 2);
    isCrit = true;
    showCritEffect();
  }

  // Apply death mark talent
  if (state.unlockedTalents.includes('death_mark')) {
    damage = Math.floor(damage * 1.5);
  }

  // Apply venom talent
  if (state.unlockedTalents.includes('venom')) {
    currentEnemy.poisoned = (currentEnemy.poisoned || 0) + 1;
  }

  // Deal damage to enemy
  currentEnemy.hp -= damage;

  // Apply life steal
  applyLifeSteal(damage);

  // Log and animate
  addCombatLog(
    `⚔️ ${isCrit ? '💥CRIT! ' : ''}You hit for ${damage}!`,
    isCrit ? 'gold' : 'good'
  );
  playSound('snd-attack');
  animateAttack(true, damage, isCrit);

  state.defending = false;
}

// ============================================
// PLAYER MAGIC HANDLER
// ============================================
function handlePlayerMagic() {
  const magicCost = 10;
  if (state.mp < magicCost) {
    addCombatLog('❌ Not enough MP!', 'bad');
    return;
  }

  // Calculate magic damage (INT-based)
  let damage = calculateMagicDamage(state.int);

  // Apply spell power talent
  if (state.unlockedTalents.includes('spell_power')) {
    damage = Math.floor(damage * 1.3);
  }

  // Apply fire mastery talent
  if (state.unlockedTalents.includes('fire_mastery')) {
    damage = Math.floor(damage * 1.2);
  }

  // Deal damage and consume mana
  currentEnemy.hp -= damage;
  state.mp -= magicCost;

  addCombatLog(`✨ Magic hits for ${damage}! (-${magicCost} MP)`, 'info');
  playSound('snd-magic');
  animateAttack(true, damage, false);

  state.defending = false;
}

// ============================================
// FLEE HANDLER
// ============================================
function handleFlee() {
  let fleeChance = 0.35; // Base flee chance

  // Smoke bomb talent gives high flee chance
  if (state.unlockedTalents.includes('smoke_bomb')) {
    fleeChance = 0.99;
  }
  // Agility vs enemy armor (higher agility = better flee)
  else if (state.agi > currentEnemy.armor) {
    fleeChance = 0.7;
  }

  if (Math.random() < fleeChance) {
    addLog('Fled from battle!', 'bad');
    currentEnemy = null;
    document.getElementById('combat-box').style.display = 'none';
    loadScene('town');
    return;
  }

  addCombatLog('❌ Failed to flee!', 'bad');
  state.defending = false;
}

// ============================================
// DAMAGE CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate physical attack damage using armor scaling
 * Formula: damage * (100 / (100 + armor))
 */
function calculateAttackDamage(attackPower, enemyArmor) {
  const variance = Math.floor(Math.random() * attackPower * 0.1);
  const baseDamage = attackPower + variance;
  const reduction = Math.min(0.85, enemyArmor / (enemyArmor + 80000));
  return Math.max(1, Math.floor(baseDamage * (1 - reduction)));
}

/**
 * Calculate magic damage (INT-based)
 */
function calculateMagicDamage(intelligence) {
  const baseVariance = Math.floor(Math.random() * 10); // 0-10 variance
  return Math.max(1, intelligence * 2 + baseVariance);
}

/**
 * Calculate dodge chance
 * Dodge is reduced by player's hit chance
 */
function calculateDodgeChance(enemyDodge, playerHit) {
  const netDodge = Math.max(0, enemyDodge - playerHit);
  return netDodge / 100;
}

/**
 * Apply life steal effect
 */
function applyLifeSteal(damageDealt) {
  const lifeStealPercent = state.lifeSteal || 0;
  if (lifeStealPercent > 0) {
    const healAmount = Math.floor(damageDealt * (lifeStealPercent / 100));
    if (healAmount > 0) {
      state.hp = Math.min(state.maxHp, state.hp + healAmount);
      addCombatLog(`🩸 Life Steal heals ${healAmount} HP!`, 'good');
      spawnDmgFloat(`🩸+${healAmount}`, false, 'heal-float');
    }
  }
}

// ============================================
// ENEMY TURN HANDLER
// ============================================
function handleEnemyTurn() {
  // Check if enemy is frozen
  if (currentEnemy.frozen) {
    currentEnemy.frozen = false;
    addCombatLog(`${currentEnemy.name} is frozen and loses their turn!`, 'info');
    return;
  }

  // Calculate enemy dodge chance (player trying to dodge enemy attack)
  const playerDodgeChance = calculateDodgeChance(state.dodge, currentEnemy.hit);
  if (Math.random() < playerDodgeChance) {
    addCombatLog('💨 You dodged!', 'good');
    return;
  }

  // Calculate enemy damage
  let enemyDamage = calculateEnemyAttackDamage(currentEnemy.atk, state.armor);

  // Apply tutorial difficulty modifier
  if (isTutorialActive()) {
    enemyDamage = Math.floor(enemyDamage * TUTORIAL_CONFIG.enemyDamageMultiplier);
  }

  // Apply defending reduction
  if (state.defending) {
    const defenseReduction = state.unlockedTalents.includes('fortress') ? 4 : 2;
    enemyDamage = Math.floor(enemyDamage / defenseReduction);
  }

  // Apply shield wall talent
  if (state.unlockedTalents.includes('shield_wall')) {
    enemyDamage = Math.floor(enemyDamage * 0.9);
  }

  // ── SHAMAN: Earth Totem damage reduction ──
  if (state.earthTotemTurns > 0) {
    const reduction = state.earthTotemReduction || 0;
    const reduced = Math.floor(enemyDamage * reduction);
    enemyDamage = Math.max(1, enemyDamage - reduced);
    state.earthTotemTurns--;
    addCombatLog(`🪨 Earth Totem reduced damage by ${formatNumber(reduced)}! (${state.earthTotemTurns} turns left)`, 'info');
    if (state.earthTotemTurns === 0) {
      state.earthTotemReduction = 0;
      addCombatLog(`🪨 Earth Totem fades!`, 'info');
    }
  }

  // ── Soul Barrier absorption ──
if (state.soulBarrierAbsorb > 0 && enemyDamage > 0) {
  if (enemyDamage <= state.soulBarrierAbsorb) {
    state.soulBarrierAbsorb -= enemyDamage;
    addCombatLog(`🔰 Soul Barrier absorbed ${formatNumber(enemyDamage)}! (${formatNumber(state.soulBarrierAbsorb)} remaining)`, 'good');
    enemyDamage = 0;
  } else {
    enemyDamage -= state.soulBarrierAbsorb;
    addCombatLog(`🔰 Soul Barrier shattered! Absorbed ${formatNumber(state.soulBarrierAbsorb)}!`, 'info');
    state.soulBarrierAbsorb = 0;
  }
}

  // ── Apply mana shield (absorbs hit) ──
  if (state.manaShield) {
    // Mage mana shield — absorbs based on max MP
    if (state.manaShieldAbsorb && state.manaShieldAbsorb > 0) {
      if (enemyDamage <= state.manaShieldAbsorb) {
        state.manaShieldAbsorb -= enemyDamage;
        addCombatLog(`🔮 Mana Shield absorbed ${formatNumber(enemyDamage)}! (${formatNumber(state.manaShieldAbsorb)} remaining)`, 'info');
        enemyDamage = 0;
        // Shield stays active until absorb depleted
        if (state.manaShieldAbsorb <= 0) {
          state.manaShield = false;
          state.manaShieldAbsorb = 0;
          addCombatLog(`🔮 Mana Shield shattered!`, 'info');
        }
      } else {
        enemyDamage -= state.manaShieldAbsorb;
        addCombatLog(`🔮 Mana Shield absorbed ${formatNumber(state.manaShieldAbsorb)}! Shield shattered!`, 'info');
        state.manaShield = false;
        state.manaShieldAbsorb = 0;
      }
    } else {
      // Paladin divine shield — absorbs one full hit
      state.manaShield = false;
      addCombatLog(`🔮 Divine Shield absorbed the hit!`, 'info');
      enemyDamage = 0;
    }
  }

  // Deal damage to player
  state.hp -= enemyDamage;

  if (enemyDamage > 0) {
    addCombatLog(`${currentEnemy.name} hits you for ${formatNumber(enemyDamage)}!`, 'bad');
    animateAttack(false, enemyDamage, false);

    // ── PALADIN: Damage reflect ──
    if (state.dmgReflect > 0 && currentEnemy && currentEnemy.hp > 0) {
      const reflectDmg = Math.floor(enemyDamage * state.dmgReflect);
      if (reflectDmg > 0) {
        currentEnemy.hp -= reflectDmg;
        addCombatLog(`🛡️ Reflected ${formatNumber(reflectDmg)} dmg back!`, 'good');
        spawnDmgFloat(`↩️${formatNumber(reflectDmg)}`, true, 'crit-dmg');
      }
    }
  }

  // ── Apply poison damage to enemy ──
  if (currentEnemy.poisoned > 0) {
    const poisonDamage = currentEnemy.poisonDmg || 8;
    currentEnemy.hp -= poisonDamage;
    currentEnemy.poisoned--;
    addCombatLog(`🐍 Poison deals ${formatNumber(poisonDamage)}! (${currentEnemy.poisoned} stacks left)`, 'good');
    spawnDmgFloat(formatNumber(poisonDamage), true, 'poison-float');
  }

  // ── SHAMAN: Bonus attacks from Wind Burst ──
  if (state.bonusAttacks > 0 && currentEnemy.hp > 0) {
    const bonusHits = Math.min(state.bonusAttacks, 2); // max 2 per turn
    state.bonusAttacks = Math.max(0, state.bonusAttacks - bonusHits);
    for (let i = 0; i < bonusHits; i++) {
      if (currentEnemy.hp <= 0) break;
      const bonusDmg = Math.floor(state.attackPower * 0.5);
      currentEnemy.hp -= bonusDmg;
      addCombatLog(`🌪️ Wind Strike! ${formatNumber(bonusDmg)} bonus dmg!`, 'good');
      spawnDmgFloat(formatNumber(bonusDmg), true, 'dmg-float');
    }
  }

  // ── Check for undying talent (survive lethal blow) ──
  if (state.hp <= 0 && state.unlockedTalents.includes('undying') && !state.usedUndying) {
    state.hp = 1;
    state.usedUndying = true;
    addCombatLog('💪 Undying Will! Survived with 1 HP!', 'gold');
    spawnDmgFloat('💪 UNDYING!', false, 'heal-float');
  }

  updateUI();
}

/**
 * Calculate enemy attack damage using armor scaling
 */
function calculateEnemyAttackDamage(enemyAttack, playerArmor) {
  const variance = Math.floor(Math.random() * enemyAttack * 0.1);
  const baseDamage = enemyAttack + variance;
  const reduction = Math.min(0.85, playerArmor / (playerArmor + 80000));
  return Math.max(1, Math.floor(baseDamage * (1 - reduction)));
}

// ============================================
// PLAYER REGENERATION
// ============================================
function applyPlayerRegeneration() {
  // HP Regen
  if (state.hpRegen > 0) {
    const regenAmount = Math.floor(state.hpRegen);
    if (regenAmount > 0 && state.hp < state.maxHp) {
      state.hp = Math.min(state.maxHp, state.hp + regenAmount);
      addCombatLog(`💚 Regen +${regenAmount} HP`, 'good');
    }
  }

  // Mana Regen
  if (state.manaRegen > 0) {
    const regenAmount = Math.floor(state.manaRegen);
    if (regenAmount > 0 && state.mp < state.maxMp) {
      state.mp = Math.min(state.maxMp, state.mp + regenAmount);
      addCombatLog(`💙 Mana Regen +${regenAmount} MP`, 'info');
    }
  }

  // Skill cooldown reduction
  Object.keys(state.skillCooldowns).forEach(k => {
    if (state.skillCooldowns[k] > 0) {
      state.skillCooldowns[k]--;
    }
  });
}




function useSkillInCombat(skillId){
  if(!currentEnemy)return;
  const sk=SKILLS[skillId];if(!sk)return;
  const cd=state.skillCooldowns[skillId]||0,mpCost=typeof sk.mp==='function'?sk.mp():sk.mp;
  if(cd>0){addCombatLog(`${sk.name} on cooldown! (${cd})`,'bad');return;}
  if(state.mp<mpCost){addCombatLog(`Not enough MP for ${sk.name}!`,'bad');return;}
  state.mp-=mpCost;// Apply cast speed cooldown reduction
const cdr = state.cdr || 0;
state.skillCooldowns[skillId] = Math.max(1, Math.floor(sk.cd * (1 - cdr)));sk.use(currentEnemy);
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
const EQUIP_STATS={weapon:{str:[35,55],strMult:[0.1,0.5],lifeSteal:[0.01,0.09],crit:[2,5],hit:[80,120],hitMult:[0.1,0.5]},armor:{armor:[5000,10000],sta:[35,55],staMult:[0.1,0.5],maxHp:[2000,3000],maxHpMult:[0.1,0.5],hpRegen:[25,750],hpRegenMult:[0.1,0.5],dodge:[30,700],dodgeMult:[0.1,0.5]},helmet:{armor:[5000,10000],int:[35,55],intMult:[0.05,0.09]},boots:{armor:[5000,10000],agi:[35,55],agiMult:[0.1,0.5]},ring:{str:[35,55],int:[35,55],agi:[35,55],sta:[35,55]},amulet:{strMult:[0.05,0.09],agiMult:[0.05,0.09],intMult:[0.05,0.09],staMult:[0.05,0.09]}};
function mkEquipDrop(slot,rarity,stageId=1){
  rarity=applyRarityBonus(rarity);
  const mult=RARITY[rarity].mult;
  const prefix=EQUIP_PREFIXES[rarity][Math.floor(Math.random()*EQUIP_PREFIXES[rarity].length)];
  const suffix=EQUIP_NAMES[slot][Math.floor(Math.random()*EQUIP_NAMES[slot].length)];
  const stats={};
  Object.entries(EQUIP_STATS[slot]).forEach(([k,[mn,mx]])=>{const raw=(Math.random()*(mx-mn)+mn)*mult;stats[k]=mx<1?Math.round(raw*1000)/1000:Math.round(raw);});
  return{uid:genUid(),name:`${SLOT_ICONS[slot]} ${prefix} ${suffix}`,category:'equipment',slot,rarity,stats,equipped:false,
  levelReq:(stageId-1)*10,
  sellPrice:Math.round(50*mult*(state.level||1)*.10)};
}
function mkMat(name,rarity,sellPrice){return{uid:genUid(),name,category:'material',rarity,sellPrice,stackable:true,qty:1};}
function mkCons(name,rarity,sellPrice,hpVal){return{uid:genUid(),name,category:'consumable',rarity,sellPrice,stackable:true,qty:1,effect:'hp',val:hpVal};}
function genUid(){return Date.now()+Math.random();}
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
      stats:{str:9000,strMul:2.4,crit:15,lifeSteal:0.7,hitMult:2.4},category:'equipment'},
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
    result:{name:'⛑️ Trollhide Helm',slot:'helm',rarity:'legendary',levelReq:80,
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
    result:{name:'🛡️ Hellfire Greatarmor',slot:'weapon',rarity:'legendary',levelReq:90,
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
    result:{name:'⛑️ Hellfire Great Helm',slot:'helm',rarity:'legendary',levelReq:90,
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
];

// ── TREASURE CHEST ──
const TREASURE_TABLES={
  1:{rolls:2,tier:'normal'},  2:{rolls:2,tier:'uncommon'},
  3:{rolls:3,tier:'uncommon'},4:{rolls:3,tier:'rare'},
  5:{rolls:3,tier:'rare'},    6:{rolls:4,tier:'epic'},
  7:{rolls:4,tier:'epic'},    8:{rolls:4,tier:'epic'},
  9:{rolls:5,tier:'legendary'},10:{rolls:5,tier:'legendary'}
};

function rollTreasureRarity(tier){
  const r=Math.random();
  switch(tier){
    case'normal':   return r<0.25?'uncommon':'normal';
    case'uncommon': return r<0.25?'rare':'uncommon';
    case'rare':     return r<0.25?'epic':'rare';
    case'epic':     return r<0.08?'legendary':'epic';
    case'legendary':return r<0.15?'legendary':'epic';  // 15% legendary from Stage 9-10 boxes
    default:        return'normal';
  }
}
function dropTreasureBox(stageId){
  const names={1:'📦 Worn Chest',2:'📦 Wooden Chest',3:'📦 Iron Chest',4:'📦 Steel Chest',
    5:'📦 Golden Chest',6:'📦 Enchanted Chest',7:'📦 Ancient Chest',
    8:'📦 Demonic Chest',9:'📦 Shadow Chest',10:'📦 Eternal Chest'};
  const box={uid:genUid(),name:names[stageId]||'📦 Mystery Chest',category:'consumable',
    rarity:stageId<=2?'normal':stageId<=4?'uncommon':stageId<=6?'rare':stageId<=8?'epic':'legendary',
    effect:'treasure',stageId,difficulty:state.difficulty||'normal',stackable:false,qty:1,sellPrice:1000*stageId};
  addToInventory(box);
  addLog(`📦 ${box.name} added to inventory!`,'legendary');
  notify(`📦 ${box.name} dropped!`,'var(--gold)');
  playSound('snd-levelup');
}
function openTreasureBox(box){
  const stageId=box.stageId||1, table=TREASURE_TABLES[stageId]; if(!table)return;
  const diff=DIFFICULTY[box.difficulty||'normal'];
  const slots=['weapon','armor','helmet','boots','ring','amulet'];
  const items=[];
  // Equipment rolls
  for(let i=0;i<table.rolls;i++){
    let rarity=rollTreasureRarity(table.tier);
    const slot=slots[Math.floor(Math.random()*slots.length)];
    const item=mkEquipDrop(slot,rarity,stageId); addToInventory(item); items.push(item);
    if(item.rarity==='legendary') state.quests.legendary.done=true;
  }
  // Bonus mat drops from chest (2-3 mats matching stage)
  const matCount = 2 + Math.floor(Math.random()*2);
  for(let i=0;i<matCount;i++) rollMatDrop(stageId, false);

  const bonusGold=Math.floor(1000*stageId*diff.goldMult); state.gold+=bonusGold;
  notify(`📦 Chest opened! ${items.length} items + mats found!`,'var(--gold)');
  addLog(`📦 ${box.name} opened!`,'legendary');
  items.forEach(item=>addLog(`  ${item.name} [${(RARITY[item.rarity]||RARITY.normal).label}]`,
    item.rarity==='legendary'?'legendary':item.rarity==='epic'?'epic':'gold'));
  addLog(`💰 +${formatNumber(bonusGold)} Gold!`,'gold');
  playSound('snd-levelup');
  spawnParticles(window.innerWidth/2,window.innerHeight/2,'#f0c040',20);
  renderInventory(); updateUI(); renderQuests();
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

// ── SKILL SELECTION FOR MOBILE TAP-TO-ASSIGN ──
let selectedSkillForSlot = null;

function selectSkillForSlot(skillId) {
  // If already selected, deselect
  if (selectedSkillForSlot === skillId) {
    selectedSkillForSlot = null;
    renderSkillBar();
    updateAutoSlotHighlight();
    return;
  }
  selectedSkillForSlot = skillId;
  renderSkillBar();
  updateAutoSlotHighlight();
  setTimeout(() => notify('👆 Now tap a slot to assign!', 'var(--gold)'), 50);
}

function assignSelectedSkill(slotIndex) {
  if (!selectedSkillForSlot) {
    // No skill selected — clear the slot instead
    clearSlot(slotIndex);
    return;
  }
  autoSkillSlots[slotIndex] = selectedSkillForSlot;
  selectedSkillForSlot = null;
  renderAutoSlots();
  renderSkillBar();
  updateAutoSlotHighlight();
  notify('✅ Skill assigned!', 'var(--green)');
}

function updateAutoSlotHighlight() {
  for (let i = 0; i < 3; i++) {
    const icon = document.getElementById(`auto-slot-content-${i}`);
    if (!icon) continue;
    if (selectedSkillForSlot) {
      icon.classList.add('slot-ready');
    } else {
      icon.classList.remove('slot-ready');
    }
  }
}

// ── SKILLS BAR (updated with tap-to-assign support) ──
function renderSkillBar() {
  if (!state.skills || !state.skills.length) {
    document.getElementById('skills-bar').style.display = 'none';
    return;
  }
  document.getElementById('skills-bar').style.display = 'block';
  document.getElementById('skills-slot-row').innerHTML = state.skills.map(sid => {
    const sk = SKILLS[sid]; if (!sk) return '';
    const cd = state.skillCooldowns[sid] || 0;
    const inSlot = autoSkillSlots.includes(sid);
    return `<div class="skill-slot ${inSlot ? 'in-slot' : ''}"
      draggable="true"
      ondragstart="event.dataTransfer.setData('skillId','${sid}')"
      onclick="${currentEnemy ? `useSkillInCombat('${sid}')` : `assignSkillToAutoSlot('${sid}')`}">
      <div class="skill-icon-wrap ${cd > 0 ? 'on-cd' : ''}">${sk.icon}</div>
      <div class="skill-lbl">${sk.name}</div>
      <div class="skill-cd-lbl">${cd > 0 ? `CD:${cd}` : `${typeof sk.mp === 'function' ? sk.mp() : sk.mp}MP`}</div>
    </div>`;
  }).join('');
}

function assignSkillToAutoSlot(skillId) {
  if (!skillId || !SKILLS[skillId]) return;
  // Find first empty slot
  const emptySlot = autoSkillSlots.indexOf(null);
  if (emptySlot === -1) {
    notify('All 3 slots filled! Tap a slot icon to clear it.', 'var(--gold)');
    return;
  }
  autoSkillSlots[emptySlot] = skillId;
  renderAutoSlots();
  notify('✅ Skill assigned to slot ' + (emptySlot + 1) + '!', 'var(--green)');
}

// ── EQUIPMENT ──
function equipItem(uid){
  const item=state.inventory.find(i=>i.uid===uid);if(!item||item.category!=='equipment')return;
  
  // Check tournament item expiry
  if (item.tournamentReward && item.expiresAt) {
    if (new Date() > new Date(item.expiresAt)) {
      notify(`❌ This tournament item has expired!`, 'var(--red)');
      addLog(`❌ ${item.name} has expired and cannot be equipped!`, 'bad');
      // Remove expired item from inventory
      state.inventory = state.inventory.filter(i => i.uid !== uid);
      renderInventory();
      return;
    }
  }

  const req=item.levelReq||0;
  if(state.level<req){
    notify(`❌ Need Level ${req} to equip ${item.name}!`,'var(--red)');
    addLog(`❌ Need Level ${req} to equip ${item.name}!`,'bad');
    return;
  }
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
        nameEl.textContent=item.name.replace(/^[^\s]+ /,'').substring(0,12);
        slotEl.classList.add('has-item',item.rarity);
        // Add glow for enhanced items
        const enh=item.enhLevel||0;
        if(enh>=15)slotEl.classList.add('enh-glow-15');
        else if(enh>=7)slotEl.classList.add('enh-glow-7');
        const statsHtml=Object.entries(item.stats||{}).map(([k,v])=>`<div class="tooltip-stat">+${v} ${k.toUpperCase()}</div>`).join('');
        const rarity=RARITY[item.rarity]||RARITY.normal;
        const enh_label=enh>0?`<div style="color:${enh>=7?'var(--legendary)':'var(--gold)'};font-size:0.75em;">+${enh} Enhanced</div>`:'';
        slotEl.insertAdjacentHTML('beforeend',`<div class="equip-tooltip" style="display:none;"><div style="color:${rarity.color};font-weight:600;">${item.name}</div><div style="color:${rarity.color};font-size:0.8em;margin:3px 0;">${rarity.label}</div>${enh_label}${statsHtml}<div style="color:#888;font-size:0.75em;margin-top:4px;">Sell: ${item.sellPrice}g</div></div>`);
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
    const isLocked=item.levelReq&&item.levelReq>state.level;
    const lockBadge=isLocked?`<div style="position:absolute;top:2px;left:3px;font-size:.6em;color:var(--red);">🔒${item.levelReq}</div>`:'';
    return `<div class="item-icon-box ${item.rarity} ${glowClass}"
      onclick="showItemPopup('inv',${item.uid})" title="${item.name}"
      style="${isLocked?'opacity:0.5;':''}">
      <div class="item-icon-emoji">${item.name.split(' ')[0]}</div>
      ${stackBadge}${equippedBadge}${enhBadge}${lockBadge}
    </div>`;
  }).join('')}</div>`;
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

  // ── Only these flat stats get enhanced. Mults, lifeSteal, special abilities are never touched.
  const FLAT_STATS=new Set(['str','agi','int','sta','armor','maxHp','maxMp']);

  if(item.equipped){Object.entries(item.stats||{}).forEach(([k,v])=>{const ek='equip'+k.charAt(0).toUpperCase()+k.slice(1);state[ek]=Math.max(0,(state[ek]||0)-v);});}

  const success=Math.random()*100<rate;
  if(success){
    Object.keys(item.stats||{}).forEach(k=>{
      if(!FLAT_STATS.has(k))return; // skip mults and specials
      item.stats[k]=Math.floor(item.stats[k]*1.05);
    });
    item.enhLevel=enh+1;
    addLog(`⚒️ SUCCESS! ${item.name} is now +${item.enhLevel}!`,'gold');
    notify(`✨ SUCCESS! +${item.enhLevel}!`,'var(--gold)');
    playSound('snd-levelup');
  } else {
    if(enh>0){
      Object.keys(item.stats||{}).forEach(k=>{
        if(!FLAT_STATS.has(k))return; // skip mults and specials
        item.stats[k]=Math.max(1,Math.floor(item.stats[k]/1.05));
      });
      item.enhLevel=enh-1;
      addLog(`💔 FAILED! Dropped to +${item.enhLevel}!`,'bad');
      notify(`💔 FAILED! Dropped to +${item.enhLevel}!`,'var(--red)');
    } else {
      addLog(`💔 FAILED! Nothing happened.`,'bad');
      notify('💔 FAILED!','var(--red)');
    }
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
  const r_=r=>RARITY[r]||RARITY.normal;
  let item,btns='',statsHtml='',reqLine='';

  if(source==='shop'){
    const all=[...SHOP_EQUIP,...SHOP_CONS];
    item=all.find(i=>i.id===id);if(!item)return;
    statsHtml=item.stats
      ?Object.entries(item.stats).map(([k,v])=>`<div class="tooltip-stat">+${v} ${k.toUpperCase()}</div>`).join('')
      :item.effect?`<div class="tooltip-stat">Restore ${item.val} ${item.effect==='both'?'HP+MP':item.effect.toUpperCase()}</div>`:'';
    reqLine=(item.levelReq&&item.levelReq>0)
      ?`<div style="font-size:.78em;margin-bottom:6px;color:${state.level>=item.levelReq?'var(--green)':'var(--red)'};">${state.level>=item.levelReq?'✅':'🔒'} Level ${item.levelReq} Required</div>`:'';
    btns=`<button class="start-btn" onclick="buyShopItem('${item.id}');closeItemPopup()">💰 Buy (${item.price}g)</button>`;

  } else {
    item=state.inventory.find(i=>i.uid===id);if(!item)return;
    statsHtml=item.stats
      ?Object.entries(item.stats).map(([k,v])=>`<div class="tooltip-stat">+${v} ${k.toUpperCase()}</div>`).join('')
      :item.effect?`<div class="tooltip-stat">Restore ${item.val} ${item.effect==='both'?'HP+MP':item.effect.toUpperCase()}</div>`:'';
    reqLine=(item.levelReq&&item.levelReq>0)
      ?`<div style="font-size:.78em;margin-bottom:6px;color:${state.level>=item.levelReq?'var(--green)':'var(--red)'};">${state.level>=item.levelReq?'✅':'🔒'} Level ${item.levelReq} Required</div>`:'';
    if(item.category==='equipment'){
      btns=item.equipped
        ?`<button class="start-btn red-btn" onclick="unequipSlot('${item.slot}');closeItemPopup()">Unequip</button>`
        :`<button class="start-btn blue-btn" onclick="equipItem(${item.uid});closeItemPopup()">Equip</button>`;
      btns+=`<button class="start-btn purple-btn" onclick="closeItemPopup();openEnhance(${item.uid})">⚒️ Enhance</button>`;
      if(!item.equipped)btns+=`<button class="start-btn" onclick="closeItemPopup();listItemForAuction(${item.uid})" style="background:linear-gradient(135deg,#005580,#0088cc);">🏛️ Auction</button>`;
    }
    if(item.category==='consumable')btns+=`<button class="start-btn" onclick="useItem(${item.uid});closeItemPopup()">Use</button>`;
    if(!item.equipped)btns+=`<button class="start-btn red-btn" onclick="sellItem(${item.uid});closeItemPopup()">Sell ${item.stackable&&item.qty>1?'All':''} (${(item.sellPrice||0)*(item.stackable?item.qty:1)}g)</button>`;
  }

  showPopup(item, reqLine+statsHtml, btns);
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
function renderShop() {
  const container = document.getElementById('shop-content');
  if (!container) return;

  const items = currentShopTab === 'equipment' ? SHOP_EQUIP : SHOP_CONS;
  const r_ = r => RARITY[r] || RARITY.normal;

  // ── EQUIPMENT TAB ──
  if (currentShopTab === 'equipment') {
    container.innerHTML = `
      <div class="item-grid">
        ${items.map(item => `
          <div class="item-icon-box ${item.rarity}"
            onclick="showItemPopup('shop','${item.id}')"
            title="${item.name}">
            <div class="item-icon-emoji">${item.name.split(' ')[0]}</div>
            <div class="item-icon-price">💰${formatNumber(item.price)}</div>
          </div>`).join('')}
      </div>`;
    return;
  }

  // ── CONSUMABLES TAB ──
  let html = `
    <div class="item-grid">
      ${items.map(item => `
        <div class="item-icon-box ${item.rarity}"
          onclick="showItemPopup('shop','${item.id}')"
          title="${item.name}">
          <div class="item-icon-emoji">${item.name.split(' ')[0]}</div>
          <div class="item-icon-price">💰${formatNumber(item.price)}</div>
        </div>`).join('')}
    </div>`;

  // ── LEGACY SKILL TOMES ──
  const skillBooks = GAME_CONFIG.skill_books || [];
  const defs = getLegacySkillDefs();
  const learned = getLearnedLegacySkills();

  if (skillBooks.length) {
    html += `
      <div style="font-family:var(--font-title);font-size:.65em;
        color:var(--text-dim);letter-spacing:2px;margin:12px 0 6px;">
        ✨ LEGACY SKILL TOMES
      </div>`;

    skillBooks.forEach(book => {
      const def = defs[book.skillId];
      if (!def) return;
      const currentRank = learned[book.skillId] || 0;
      const nextRank = currentRank + 1;
      const nextRankData = def.ranks[String(nextRank)];
      const isMaxed = currentRank >= 5;
      const canAfford = state.gold >= book.price;
      const hasLegacyPts = nextRankData &&
        (state.legacyPoints || 0) >= nextRankData.cost;
      const rColor = '#a855f7';

      html += `
        <div style="background:rgba(168,85,247,0.04);
          border:1px solid ${rColor}44;border-radius:8px;
          padding:10px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <div style="font-size:1.5em;">${def.icon}</div>
            <div style="flex:1;">
              <div style="font-family:var(--font-title);font-size:.80em;color:${rColor};">
                ${book.name}
              </div>
              <div style="font-size:.65em;color:var(--text-dim);">${def.desc}</div>
              ${currentRank > 0 ? `
                <div style="font-size:.62em;color:#a855f7;margin-top:2px;">
                  Currently: Rank ${currentRank}/5
                </div>` : ''}
            </div>
            <div style="text-align:right;">
              <div style="font-family:var(--font-title);color:var(--gold);font-size:.78em;">
                ${formatNumber(book.price)}g
              </div>
              ${nextRankData ? `
                <div style="font-size:.60em;color:#a855f7;">
                  ${nextRankData.cost} LP required
                </div>` : ''}
            </div>
          </div>
          ${isMaxed ? `
            <div style="text-align:center;font-size:.70em;color:var(--gold);
              padding:5px;background:rgba(255,153,0,0.08);border-radius:6px;">
              ✅ MAX RANK — Fully Mastered!
            </div>
          ` : `
            <button onclick="buySkillBook('${book.id}', '${book.skillId}')"
              style="width:100%;padding:7px;font-size:.72em;
              background:${canAfford && hasLegacyPts
                ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)'};
              border:1px solid ${canAfford && hasLegacyPts
                ? rColor : 'var(--border)'};
              border-radius:6px;
              color:${canAfford && hasLegacyPts ? rColor : 'var(--text-dim)'};
              cursor:${canAfford && hasLegacyPts ? 'pointer' : 'not-allowed'};">
              ${currentRank === 0
                ? '📖 Learn Skill'
                : `⬆️ Upgrade to Rank ${nextRank}`}
              ${!canAfford
                ? ` (need ${formatNumber(book.price - state.gold)}g more)`
                : !hasLegacyPts && nextRankData
                ? ` (need ${nextRankData.cost - (state.legacyPoints||0)} more LP)`
                : ''}
            </button>`}
        </div>`;
    });
  }

  container.innerHTML = html;
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
  state.gold -= book.price;
  state.legacyPoints -= rankData.cost;

  // Learn/upgrade skill
  if (!state.legacySkills) state.legacySkills = {};
  state.legacySkills[skillId] = nextRank;

  // Register into SKILLS object
  registerLegacySkills();

  // Add to skill bar if rank 1 (first time learning)
  if (currentRank === 0 && !state.skills.includes(skillId)) {
    state.skills.push(skillId);
  }

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
  document.getElementById('lifesteal-val').textContent=(state.lifeSteal*100).toFixed(2)+'%';document.getElementById('char-level').textContent = `Level ${state.level} / 100`;

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
  document.getElementById('arena-player-mp').style.width=Math.max(0,(mp/state.maxHp)*100)+'%';
  renderStatPoints();
  renderTournamentRewards();
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
async function checkAndSettleAuctions() {
  try {
    // Step 1 — settle all expired active auctions
    const { data: expired } = await dbClient
      .from('auctions')
      .select('*')
      .eq('status', 'active')
      .lt('ends_at', new Date().toISOString());
    if (expired && expired.length) {
      for (const auction of expired) await settleExpiredAuction(auction.id);
    }

    if (!state.character_id) return;

    // Step 2 — collect won items (buyer side)
    const { data: wonAuctions } = await dbClient
      .from('auctions')
      .select('*')
      .eq('current_bidder_id', state.character_id)
      .eq('status', 'completed')
      .eq('winner_collected', false);

    if (wonAuctions && wonAuctions.length) {
      for (const auction of wonAuctions) {
        const item = auction.item_description
          ? (typeof auction.item_description === 'string'
            ? JSON.parse(auction.item_description)
            : auction.item_description)
          : { name: auction.item_name, rarity: auction.rarity, uid: genUid() };
        item.uid = genUid();
        addToInventory(item);
        await dbClient.from('auctions')
          .update({ winner_collected: true })
          .eq('id', auction.id);
        addLog(`🏛️ Received ${auction.item_name} from auction!`, 'legendary');
      }
      await savePlayerToSupabase();
      renderInventory();
      updateUI();
      notify(`📦 New items from auction!`, 'var(--gold)');
    }

    // Step 3 — notify seller of completed sales (gold already paid in settleExpiredAuction)
    // We just need to sync state.gold from DB in case this session missed the settlement
    const { data: myCompleted } = await dbClient
      .from('auctions')
      .select('*')
      .eq('seller_id', state.character_id)
      .eq('status', 'completed')
      .eq('seller_collected', true);

    if (myCompleted && myCompleted.length) {
      // Re-sync gold from DB to make sure state matches what was already paid
      const { data: freshChar } = await dbClient
        .from('characters')
        .select('gold')
        .eq('id', state.character_id)
        .single();
      if (freshChar && freshChar.gold !== state.gold) {
        const diff = freshChar.gold - state.gold;
        if (diff > 0) {
          state.gold = freshChar.gold;
          addLog(`🏛️ +${formatNumber(diff)}g from auction sales!`, 'legendary');
          notify(`💰 +${formatNumber(diff)}g from auction sales!`, 'var(--gold)');
          updateUI();
        }
      }
    }

  } catch (error) { console.error('Settle auctions error:', error); }
}

async function settleExpiredAuction(auctionId) {
  try {
    const { data: auction } = await dbClient
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single();
    if (!auction || auction.status !== 'active') return;

    // No bids — return item to seller
    if (!auction.current_bidder_id || !auction.current_bid || auction.current_bid === 0) {
      if (auction.source === 'player' && auction.seller_id) {
        const { data: sc } = await dbClient
          .from('characters')
          .select('inventory')
          .eq('id', auction.seller_id)
          .single();
        if (sc) {
          const inv = sc.inventory || [];
          const item = auction.item_description
            ? (typeof auction.item_description === 'string'
              ? JSON.parse(auction.item_description)
              : auction.item_description)
            : { name: auction.item_name, rarity: auction.rarity, uid: genUid() };
          item.uid = genUid();
          inv.push(item);
          await dbClient.from('characters')
            .update({ inventory: inv })
            .eq('id', auction.seller_id);
        }
      }
      await dbClient.from('auctions')
        .update({ status: 'expired' })
        .eq('id', auctionId);
      return;
    }

    // Has a winner — pay seller directly in DB atomically
    const goldAfterFee = Math.floor(auction.current_bid * (1 - AUCTION_FEE));

    if (auction.source === 'player' && auction.seller_id) {
      // Read fresh gold from DB — never use state.gold here to avoid stale data
      const { data: sc } = await dbClient
        .from('characters')
        .select('gold')
        .eq('id', auction.seller_id)
        .single();
      if (sc) {
        await dbClient.from('characters')
          .update({ gold: sc.gold + goldAfterFee })
          .eq('id', auction.seller_id);
      }
    }

    // Mark auction completed — seller_collected:true means gold already sent
    await dbClient.from('auctions').update({
      status: 'completed',
      seller_collected: true,   // ← always true, gold paid above
      winner_collected: false,  // buyer still needs to collect item
      updated_at: new Date().toISOString(),
    }).eq('id', auctionId);

  } catch (error) { console.error('Settle single auction error:', error); }
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
    if (auction.source === 'player' && auction.seller_id) {
  const goldAfterFee = Math.floor(buyoutPrice * (1 - AUCTION_FEE));
  const { data: sc } = await dbClient
    .from('characters')
    .select('gold')
    .eq('id', auction.seller_id)
    .single();
  if (sc) {
    const newSellerGold = sc.gold + goldAfterFee;
    await dbClient.from('characters')
      .update({ gold: newSellerGold })
      .eq('id', auction.seller_id);
    // If seller is current player, sync state immediately
    if (auction.seller_id === state.character_id) {
      state.gold = newSellerGold;
      updateUI();
    }
  }
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

// ── PRACTICE FIGHT SYSTEM ──
function getPracticeFee(tierKey) {
  const fees = GAME_CONFIG.practice_fees || {};
  const defaults = { rookie: 5000, veteran: 10000, elite: 20000, legend: 50000 };
  return fees[tierKey] ?? defaults[tierKey];
}

async function renderPracticeboard(tierKey, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:12px;">Loading fighters...</div>';

  const TIER_MIN = { rookie: 20, veteran: 41, elite: 61, legend: 81 };
  const TIER_MAX = { rookie: 40, veteran: 60, elite: 80, legend: 100 };
  const TIER_COLORS = { rookie: '#22c55e', veteran: '#3b82f6', elite: '#a855f7', legend: '#ff9900' };
  const fee = getPracticeFee(tierKey);
  const minLevel = TIER_MIN[tierKey];
  const maxLevel = TIER_MAX[tierKey];
  const tierColor = TIER_COLORS[tierKey];

  // Level requirement check
  if (state.level < minLevel) {
    container.innerHTML = `
      <div style="text-align:center;font-size:.75em;color:var(--text-dim);
        padding:10px;background:rgba(255,255,255,0.03);border-radius:6px;">
        🔒 Reach Level ${minLevel} to access ${tierKey} practice fights
      </div>`;
    return;
  }

  try {
    // Get current tournament for this tier
    const { data: tournament } = await dbClient
      .from('arena_tournaments')
      .select('id, status')
      .in('status', ['open', 'in_progress', 'completed'])
      .eq('min_level', minLevel)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!tournament) {
      container.innerHTML = `
        <div style="text-align:center;font-size:.75em;color:var(--text-dim);
          padding:10px;background:rgba(255,255,255,0.03);border-radius:6px;">
          No registered fighters this week yet
        </div>`;
      return;
    }

    // Get all registrations with snapshots for this tier
    const { data: regs } = await dbClient
      .from('arena_registrations')
      .select('character_id, character_snapshot, skill_combo, points, rank')
      .eq('tournament_id', tournament.id)
      .order('points', { ascending: false });

    if (!regs || !regs.length) {
      container.innerHTML = `
        <div style="text-align:center;font-size:.75em;color:var(--text-dim);
          padding:10px;background:rgba(255,255,255,0.03);border-radius:6px;">
          No registered fighters this week yet
        </div>`;
      return;
    }

    // Filter out bots
    const realPlayers = regs.filter(r =>
      r.character_snapshot &&
      !r.character_snapshot.isBot &&
      r.character_id !== state.character_id
    );

    if (!realPlayers.length) {
      container.innerHTML = `
        <div style="text-align:center;font-size:.75em;color:var(--text-dim);
          padding:10px;background:rgba(255,255,255,0.03);border-radius:6px;">
          No other fighters registered yet — be the first!
        </div>`;
      return;
    }

    // Get win/loss records from arena_battles
    const charIds = realPlayers.map(r => r.character_id);
    const { data: battles } = await dbClient
      .from('arena_battles')
      .select('winner_id, attacker_id, defender_id')
      .or(`attacker_id.in.(${charIds.join(',')}),defender_id.in.(${charIds.join(',')})`);

    // Build win/loss map
    const records = {};
    charIds.forEach(id => { records[id] = { wins: 0, losses: 0 }; });
    if (battles) {
      battles.forEach(b => {
        if (b.winner_id && records[b.winner_id]) records[b.winner_id].wins++;
        const loserId = b.winner_id === b.attacker_id ? b.defender_id : b.attacker_id;
        if (loserId && records[loserId]) records[loserId].losses++;
      });
    }

    const classIcons = {
      Warrior: '⚔️', Mage: '🔮', Rogue: '🗡️',
      Hunter: '🏹', Paladin: '✨', Necromancer: '💀',
      Shaman: '⚡', Berserker: '🐉',
    };

    // Render fighter cards
    let html = `
      <div style="font-family:var(--font-title);font-size:.68em;color:var(--text-dim);
        letter-spacing:2px;margin-bottom:8px;">
        ⚔️ REGISTERED FIGHTERS — Practice fee: ${formatNumber(fee)}g
      </div>`;

    realPlayers.forEach((reg, index) => {
      const snap = reg.character_snapshot;
      const record = records[reg.character_id] || { wins: 0, losses: 0 };
      const classIcon = classIcons[snap.class] || '👤';
      const combo = reg.skill_combo || [];
      const rankLabel = reg.rank === 1 ? '🏆' : reg.rank === 2 ? '🥈' : reg.rank === 3 ? '🥉' : `#${index + 1}`;
      const winRate = record.wins + record.losses > 0
        ? Math.round((record.wins / (record.wins + record.losses)) * 100)
        : 0;

      html += `
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);
          border-radius:8px;padding:8px;margin-bottom:6px;">

          <!-- Fighter Header -->
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <div style="font-size:1.3em;">${classIcon}</div>
            <div style="flex:1;">
              <div style="font-family:var(--font-title);font-size:.82em;color:var(--text);">
                ${rankLabel} ${snap.name}
              </div>
              <div style="font-size:.65em;color:var(--text-dim);">
                Lv.${snap.level} ${snap.class || ''}
              </div>
            </div>
            <div style="text-align:right;font-size:.68em;">
              <div style="color:var(--green);">W: ${record.wins}</div>
              <div style="color:var(--red);">L: ${record.losses}</div>
              <div style="color:var(--text-dim);">${winRate}% WR</div>
            </div>
          </div>

          <!-- Stats Row -->
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
            <span style="font-size:.62em;color:var(--text-dim);
              background:rgba(255,255,255,0.04);border-radius:4px;padding:2px 5px;">
              ⚡ ATK ${formatNumber(snap.attackPower)}
            </span>
            <span style="font-size:.62em;color:var(--text-dim);
              background:rgba(255,255,255,0.04);border-radius:4px;padding:2px 5px;">
              ❤️ HP ${formatNumber(snap.maxHp)}
            </span>
            <span style="font-size:.62em;color:var(--text-dim);
              background:rgba(255,255,255,0.04);border-radius:4px;padding:2px 5px;">
              🛡️ ARM ${formatNumber(snap.armor)}
            </span>
            <span style="font-size:.62em;color:var(--text-dim);
              background:rgba(255,255,255,0.04);border-radius:4px;padding:2px 5px;">
              💥 CRIT ${snap.crit}%
            </span>
          </div>

          <!-- Skill Combo -->
          ${combo.length ? `
            <div style="display:flex;align-items:center;gap:4px;margin-bottom:8px;">
              <span style="font-size:.62em;color:var(--text-dim);">Combo:</span>
              ${combo.map(sk => `
                <span style="font-size:1.1em;" title="${SKILLS[sk]?.name || sk}">
                  ${SKILLS[sk]?.icon || '⚔️'}
                </span>`).join('<span style="font-size:.6em;color:var(--text-dim);">→</span>')}
            </div>` : `
            <div style="font-size:.62em;color:var(--text-dim);margin-bottom:8px;">
              No skill combo set
            </div>`}

          <!-- Fight Button -->
          <button class="start-btn"
            onclick="initiatePracticeFight('${reg.character_id}', '${tierKey}')"
            style="width:100%;padding:7px;font-size:.72em;
            background:linear-gradient(135deg,${tierColor}22,${tierColor}11);
            border-color:${tierColor}88;">
            ⚔️ Challenge — ${formatNumber(fee)}g
          </button>
        </div>`;
    });

    container.innerHTML = html;

  } catch(e) {
    console.error('Practiceboard error:', e);
    container.innerHTML = '<div style="text-align:center;color:var(--red);padding:10px;">Failed to load fighters.</div>';
  }
}

// ── INITIATE PRACTICE FIGHT ──
async function initiatePracticeFight(targetCharId, tierKey) {
  const fee = getPracticeFee(tierKey);
  const TIER_MIN = { rookie: 20, veteran: 41, elite: 61, legend: 81 };
  const minLevel = TIER_MIN[tierKey];

  if (state.level < minLevel) {
    notify(`❌ Need Level ${minLevel} to fight in ${tierKey} bracket!`, 'var(--red)');
    return;
  }
  if (state.gold < fee) {
    notify(`❌ Need ${formatNumber(fee)}g for this practice fight!`, 'var(--red)');
    return;
  }

  try {
    // Get target registration snapshot + skill combo
    const { data: tournament } = await dbClient
      .from('arena_tournaments')
      .select('id')
      .in('status', ['open', 'in_progress', 'completed'])
      .eq('min_level', minLevel)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!tournament) { notify('No active tournament found!', 'var(--red)'); return; }

    const { data: targetReg } = await dbClient
      .from('arena_registrations')
      .select('character_snapshot, skill_combo')
      .eq('tournament_id', tournament.id)
      .eq('character_id', targetCharId)
      .single();

    if (!targetReg) { notify('Fighter not found!', 'var(--red)'); return; }

    // Build challenger snapshot
    // Use registered snapshot if challenger is registered, else use current stats
    let challengerSnapshot;
    const { data: myReg } = await dbClient
      .from('arena_registrations')
      .select('character_snapshot, skill_combo')
      .eq('tournament_id', tournament.id)
      .eq('character_id', state.character_id)
      .single();

    if (myReg && myReg.character_snapshot) {
      challengerSnapshot = {
        ...myReg.character_snapshot,
        skillCombo: myReg.skill_combo || [],
      };
    } else {
      // Use current live stats
      challengerSnapshot = {
        character_id: state.character_id,
        name: state.name,
        level: state.level,
        class: state.class,
        attackPower: state.attackPower,
        maxHp: state.maxHp,
        armor: state.armor,
        hit: state.hit,
        dodge: state.dodge,
        crit: state.crit,
        lifeSteal: state.lifeSteal,
        skillCombo: [],
        isBot: false,
      };
    }

    const targetSnapshot = {
      ...targetReg.character_snapshot,
      skillCombo: targetReg.skill_combo || [],
    };

    // Deduct fee from challenger
    state.gold -= fee;
    await dbClient.from('characters')
      .update({ gold: state.gold })
      .eq('id', state.character_id);

    // Pay 50% to target (passive gold)
    const targetCut = Math.floor(fee * 0.5);
    const { data: targetChar } = await dbClient
      .from('characters')
      .select('gold')
      .eq('id', targetCharId)
      .single();
    if (targetChar) {
      await dbClient.from('characters')
        .update({ gold: targetChar.gold + targetCut })
        .eq('id', targetCharId);
      addLog(`💰 ${formatNumber(targetCut)}g sent to ${targetSnapshot.name} for the challenge!`, 'gold');
    }

    // Run simulation
    notify(`⚔️ Fighting ${targetSnapshot.name}...`, 'var(--gold)');
    const result = simulateBattle(challengerSnapshot, targetSnapshot);

    updateUI();
    addLog(`⚔️ Practice fight vs ${targetSnapshot.name} — ${result.winnerId === state.character_id ? '✅ YOU WON!' : '❌ You lost!'}`, result.winnerId === state.character_id ? 'legendary' : 'info');

    // Show replay immediately
    openPracticeReplay(result, challengerSnapshot, targetSnapshot);

  } catch(e) {
    state.gold += fee; // refund on error
    notify('❌ Practice fight failed: ' + e.message, 'var(--red)');
    console.error('Practice fight error:', e);
  }
}

// ── PRACTICE FIGHT REPLAY ──
function openPracticeReplay(result, attacker, defender) {
  const turns = result.turns || [];
  if (!turns.length) { notify('No battle data!', 'var(--red)'); return; }

  let currentTurn = 0;
  let replayInterval = null;
  let speed = 800;
  let isPlaying = false;

  const popup = document.getElementById('item-popup');

  function getHpPercent(hp, max) { return Math.max(0, Math.min(100, Math.floor((hp / max) * 100))); }
  function getHpColor(pct) {
    if (pct > 60) return 'var(--green)';
    if (pct > 30) return 'var(--gold)';
    return 'var(--red)';
  }
  function getClassIcon(cls) {
    const icons = { Warrior:'⚔️', Mage:'🔮', Rogue:'🗡️', Hunter:'🏹', Paladin:'✨', Necromancer:'💀', Shaman:'⚡', Berserker:'🐉' };
    return icons[cls] || '👤';
  }

  function renderReplay() {
    const turn = turns[currentTurn] || turns[turns.length - 1];
    const p1Pct = getHpPercent(turn.p1HpAfter, turn.p1HpMax);
    const p2Pct = getHpPercent(turn.p2HpAfter, turn.p2HpMax);
    const isP1Acting = turn.actor === 'p1';
    const isP2Acting = turn.actor === 'p2';
    const isResult = turn.action === 'result';

    let actionHtml = '';
    if (isResult) {
      const won = turn.winnerId === attacker.character_id;
      actionHtml = `
        <div style="text-align:center;padding:8px 0;">
          <div style="font-family:var(--font-title);font-size:.95em;
            color:${won ? 'var(--gold)' : 'var(--red)'};">
            ${won ? '🏆 YOU WIN!' : '💀 YOU LOSE!'}
          </div>
        </div>`;
    } else if (turn.action === 'buff') {
      actionHtml = `<div style="text-align:center;padding:6px;background:rgba(168,85,247,0.1);border-radius:8px;">
        <div style="font-size:1.3em;">${turn.skillIcon || '✨'}</div>
        <div style="font-size:.68em;color:#a855f7;">${turn.skillName}</div></div>`;
    } else if (turn.action === 'dodge') {
      actionHtml = `<div style="text-align:center;padding:6px;background:rgba(59,130,246,0.1);border-radius:8px;">
        <div style="font-size:1.3em;">💨</div>
        <div style="font-size:.68em;color:#3b82f6;">Dodged!</div></div>`;
    } else if (turn.action === 'skill') {
      actionHtml = `<div style="text-align:center;padding:6px;background:rgba(255,153,0,0.1);border-radius:8px;">
        <div style="font-size:1.3em;">${turn.skillIcon || '⚔️'}</div>
        <div style="font-size:.65em;color:var(--gold);">${turn.skillName}</div>
        <div style="font-size:.82em;color:var(--red);font-family:var(--font-title);">-${formatNumber(turn.damage)}</div></div>`;
    } else if (turn.action === 'crit') {
      actionHtml = `<div style="text-align:center;padding:6px;background:rgba(255,34,68,0.1);border-radius:8px;">
        <div style="font-size:1.3em;">💥</div>
        <div style="font-size:.65em;color:var(--red);">CRIT!</div>
        <div style="font-size:.82em;color:var(--red);font-family:var(--font-title);">-${formatNumber(turn.damage)}</div></div>`;
    } else {
      actionHtml = `<div style="text-align:center;padding:6px;background:rgba(255,255,255,0.04);border-radius:8px;">
        <div style="font-size:1.3em;">⚔️</div>
        <div style="font-size:.65em;color:var(--text-dim);">Attack</div>
        <div style="font-size:.82em;color:var(--red);font-family:var(--font-title);">-${formatNumber(turn.damage)}</div></div>`;
    }

    document.getElementById('item-popup-content').innerHTML = `
      <div style="font-family:var(--font-title);color:var(--gold);
        margin-bottom:8px;font-size:.88em;text-align:center;">
        ⚔️ Practice Fight
        <span style="font-size:.7em;color:var(--text-dim);margin-left:6px;">
          Turn ${isResult ? turns.length - 1 : turn.turn}/${turns.length - 1}
        </span>
      </div>

      <!-- Fighters -->
      <div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:8px;">

        <!-- Challenger (you) -->
        <div style="flex:1;background:${isP1Acting && !isResult ? 'rgba(255,153,0,0.08)' : 'rgba(255,255,255,0.03)'};
          border:1px solid ${isP1Acting && !isResult ? 'var(--gold)' : 'var(--border)'};
          border-radius:8px;padding:7px;transition:all .2s;">
          <div style="font-size:.62em;color:var(--green);margin-bottom:1px;">YOU</div>
          <div style="font-family:var(--font-title);font-size:.75em;color:var(--text);
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${getClassIcon(attacker.class)} ${attacker.name}
          </div>
          <div style="font-size:.62em;color:var(--text-dim);margin-bottom:4px;">
            Lv.${attacker.level}
          </div>
          <div style="height:5px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden;margin-bottom:2px;">
            <div style="height:100%;width:${p1Pct}%;background:${getHpColor(p1Pct)};border-radius:3px;transition:width .3s;"></div>
          </div>
          <div style="font-size:.62em;color:${getHpColor(p1Pct)};">
            ${formatNumber(turn.p1HpAfter)} HP
          </div>
          ${attacker.skillCombo?.length ? `
            <div style="display:flex;gap:2px;margin-top:4px;flex-wrap:wrap;">
              ${attacker.skillCombo.map(sk => `<span style="font-size:.9em;" title="${SKILLS[sk]?.name||sk}">${SKILLS[sk]?.icon||'⚔️'}</span>`).join('→')}
            </div>` : ''}
        </div>

        <!-- Action -->
        <div style="width:72px;flex-shrink:0;padding-top:14px;">
          ${actionHtml}
          ${!isResult ? `<div style="text-align:center;font-size:.65em;color:var(--text-dim);margin-top:3px;">
            ${isP1Acting ? '→' : '←'}</div>` : ''}
        </div>

        <!-- Opponent -->
        <div style="flex:1;background:${isP2Acting && !isResult ? 'rgba(255,153,0,0.08)' : 'rgba(255,255,255,0.03)'};
          border:1px solid ${isP2Acting && !isResult ? 'var(--gold)' : 'var(--border)'};
          border-radius:8px;padding:7px;transition:all .2s;">
          <div style="font-size:.62em;color:var(--red);margin-bottom:1px;">OPPONENT</div>
          <div style="font-family:var(--font-title);font-size:.75em;color:var(--text);
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${getClassIcon(defender.class)} ${defender.name}
          </div>
          <div style="font-size:.62em;color:var(--text-dim);margin-bottom:4px;">
            Lv.${defender.level}
          </div>
          <div style="height:5px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden;margin-bottom:2px;">
            <div style="height:100%;width:${p2Pct}%;background:${getHpColor(p2Pct)};border-radius:3px;transition:width .3s;"></div>
          </div>
          <div style="font-size:.62em;color:${getHpColor(p2Pct)};">
            ${formatNumber(turn.p2HpAfter)} HP
          </div>
          ${defender.skillCombo?.length ? `
            <div style="display:flex;gap:2px;margin-top:4px;flex-wrap:wrap;">
              ${defender.skillCombo.map(sk => `<span style="font-size:.9em;" title="${SKILLS[sk]?.name||sk}">${SKILLS[sk]?.icon||'⚔️'}</span>`).join('→')}
            </div>` : ''}
        </div>
      </div>

      <!-- Turn log -->
      <div style="font-size:.70em;color:var(--text-dim);text-align:center;
        min-height:18px;margin-bottom:8px;padding:3px 6px;
        background:rgba(255,255,255,0.03);border-radius:6px;line-height:1.5;">
        ${turn.logText || ''}
      </div>

      <!-- Progress bar -->
      <div style="height:3px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden;margin-bottom:8px;">
        <div style="height:100%;width:${((currentTurn + 1) / turns.length) * 100}%;
          background:var(--gold);border-radius:2px;transition:width .3s;"></div>
      </div>

      <!-- Controls -->
      <div style="display:flex;gap:6px;margin-bottom:6px;">
        <button onclick="practiceReplayStep(-1)"
          style="flex:1;background:rgba(255,255,255,0.05);border:1px solid var(--border);
          border-radius:6px;color:var(--text);padding:7px;cursor:pointer;font-size:.78em;">
          ⏮ Prev
        </button>
        <button id="practice-play-btn" onclick="practiceReplayToggle()"
          style="flex:2;background:rgba(255,153,0,0.15);border:1px solid var(--gold);
          border-radius:6px;color:var(--gold);padding:7px;cursor:pointer;
          font-family:var(--font-title);font-size:.78em;">
          ${isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onclick="practiceReplayStep(1)"
          style="flex:1;background:rgba(255,255,255,0.05);border:1px solid var(--border);
          border-radius:6px;color:var(--text);padding:7px;cursor:pointer;font-size:.78em;">
          Next ⏭
        </button>
      </div>

      <!-- Speed + Close -->
      <div style="display:flex;gap:6px;">
        <button onclick="practiceSetSpeed(1200)"
          style="flex:1;background:${speed===1200?'rgba(255,153,0,0.2)':'rgba(255,255,255,0.04)'};
          border:1px solid ${speed===1200?'var(--gold)':'var(--border)'};
          border-radius:6px;color:var(--text-dim);padding:5px;cursor:pointer;font-size:.68em;">
          🐢 Slow
        </button>
        <button onclick="practiceSetSpeed(800)"
          style="flex:1;background:${speed===800?'rgba(255,153,0,0.2)':'rgba(255,255,255,0.04)'};
          border:1px solid ${speed===800?'var(--gold)':'var(--border)'};
          border-radius:6px;color:var(--text-dim);padding:5px;cursor:pointer;font-size:.68em;">
          ⚡ Normal
        </button>
        <button onclick="practiceSetSpeed(300)"
          style="flex:1;background:${speed===300?'rgba(255,153,0,0.2)':'rgba(255,255,255,0.04)'};
          border:1px solid ${speed===300?'var(--gold)':'var(--border)'};
          border-radius:6px;color:var(--text-dim);padding:5px;cursor:pointer;font-size:.68em;">
          🚀 Fast
        </button>
        <button onclick="practiceReplayClose()"
          style="flex:1;background:rgba(255,255,255,0.04);border:1px solid var(--border);
          border-radius:6px;color:var(--text-dim);padding:5px;cursor:pointer;font-size:.68em;">
          ✖ Close
        </button>
      </div>`;

    popup.style.display = 'flex';
  }

  // Controls
  window.practiceReplayStep = function(dir) {
    currentTurn = Math.max(0, Math.min(turns.length - 1, currentTurn + dir));
    renderReplay();
  };

  window.practiceReplayToggle = function() {
    isPlaying = !isPlaying;
    if (isPlaying) {
      replayInterval = setInterval(() => {
        if (currentTurn >= turns.length - 1) {
          isPlaying = false;
          clearInterval(replayInterval);
          renderReplay();
          return;
        }
        currentTurn++;
        renderReplay();
      }, speed);
    } else {
      clearInterval(replayInterval);
    }
    renderReplay();
  };

  window.practiceSetSpeed = function(newSpeed) {
    speed = newSpeed;
    if (isPlaying) {
      clearInterval(replayInterval);
      replayInterval = setInterval(() => {
        if (currentTurn >= turns.length - 1) {
          isPlaying = false;
          clearInterval(replayInterval);
          renderReplay();
          return;
        }
        currentTurn++;
        renderReplay();
      }, speed);
    }
    renderReplay();
  };

  window.practiceReplayClose = function() {
    isPlaying = false;
    clearInterval(replayInterval);
    closeItemPopup();
  };

  // Auto play on open
  currentTurn = 0;
  renderReplay();
  setTimeout(() => { isPlaying = true; practiceReplayToggle(); }, 500);
}

// ── CLICK SOUND ──
const clickSnd=document.getElementById('clickSound');
document.addEventListener('click',e=>{
  if(['BUTTON','A'].includes(e.target.tagName)){if(clickSnd){clickSnd.currentTime=0;clickSnd.play().catch(()=>{});}}
});
