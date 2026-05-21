// supabase-sync.js
// Syncs game state with Supabase
// ⚠️ This file must be loaded AFTER game.js

let autoSaveInterval = null;

// ============================================
// LOAD PLAYER FROM SUPABASE → STATE
// ============================================

async function loadPlayerFromSupabase(characterId) {
  await loadGameConfig();
  try {
    const { data: { user } } = await dbClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: character, error } = await dbClient
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    if (!character) throw new Error('Character not found');

    await syncCharacterToState(character);
    await checkLoginReward();
    await checkTournamentRewardExpiry();
    await createWeeklyTournamentsIfMissing();
    await checkAndAutoStartTournaments();
    await checkAndStartGrandFinals();
    await paySupremeChampionWeeklyBonus();

    console.log('✅ Character loaded from Supabase');

    return state;
  } catch (error) {
    console.error('Load character error:', error);
    throw error;
  }
}

// ============================================
// SYNC DATABASE CHARACTER → GAME STATE
// ============================================
// BUG FIX: Removed the premature calcStats() call at the top.
// All state fields must be populated FIRST, then calcStats() runs
// once at the very bottom after rebuildSkills(). This prevents
// calcStats() from operating on stale/default values on load.

async function syncCharacterToState(character) {

  // ── Identity ──
  state.character_id  = character.id;
  state.user_id       = character.user_id;
  state.name          = character.name;
  state.level         = character.level || 1;
  state.xp            = character.exp || 0;
  state.xpNext        = Math.floor((character.level || 1) * 100 * 20);
  state.gold          = character.gold || 0;
  state.reputation    = character.reputation || 0;
  state.reputationTitle = character.reputation_rank || null; // ✅ FIX: was reputation_title (column doesn't exist)

// ✅ FIX: recalculate rank on load in case DB value is stale
const _loadedTitle = getCurrentTitle();
if (_loadedTitle && _loadedTitle.id !== state.reputationTitle) {
  state.reputationTitle = _loadedTitle.id;
}
  state.class         = character.class || null;
  state.currentScene  = character.current_scene || 'town';

  // ── Progression flags ──
  state.soulWeapon        = character.soul_weapon         || null;
  state.craftedSoulTiers  = character.crafted_soul_tiers  || {};
  state.freeStatPoints = character.free_stat_points || 0;
  state.legacyPoints   = character.legacy_points || 0;
  state.legacySkills   = character.legacy_skills || {};
  state.respecCount    = character.respec_count || 0;
  state.goldMultExpiry = character.gold_mult_expiry || null;

  // ── Soul Crystals & Login ──
  state.soulCrystals    = character.soul_crystals   || 0;
  state.loginStreak     = character.login_streak    || 0;
  state.lastLoginDate   = character.last_login_date || null;
  state.totalLoginDays  = character.total_login_days || 0;
  state.premiumSpins    = character.premium_spins || 0;

  // ── Health / Mana ──
  state.hp    = character.health    || 100;
  state.maxHp = character.max_health || 100;
  state.mp    = character.mana      || 50;
  state.maxMp = character.max_mana  || 50;

  // ── Base stats (from stats JSONB) ──
  const stats = character.stats || {};

  state.baseStr         = stats.baseStr         || 5;
  state.baseAgi         = stats.baseAgi         || 5;
  state.baseInt         = stats.baseInt         || 5;
  state.baseSta         = stats.baseSta         || 5;
  state.baseArmor       = stats.baseArmor       || 0;
  state.baseHit         = stats.baseHit         || 2;
  state.baseCrit        = stats.baseCrit        || 0.1;
  state.baseDodge       = stats.baseDodge       || 2;
  state.baseHpRegen     = stats.baseHpRegen     || 20;
  state.baseLifeSteal   = stats.baseLifeSteal   || 0;
  state.baseAttackPower = stats.baseAttackPower || 10;

  // ── Stat multipliers ──
  state.strMult         = stats.strMult         || 1.0;
  state.agiMult         = stats.agiMult         || 1.0;
  state.intMult         = stats.intMult         || 1.0;
  state.staMult         = stats.staMult         || 1.0;
  state.armorMult       = stats.armorMult       || 1.0;
  state.maxHpMult       = stats.maxHpMult       || 1.0;
  state.hpRegenMult     = stats.hpRegenMult     || 1.0;
  state.maxMpMult       = stats.maxMpMult       || 1.0;
  state.mpMult          = stats.mpMult          || 1.0;
  state.critMult        = stats.critMult        || 1.0;
  state.dodgeMult       = stats.dodgeMult       || 1.0;
  state.mpRegenMult     = stats.mpRegenMult     || 1.0;
  state.hitMult         = stats.hitMult         || 1.0;
  state.lifeStealMult   = stats.lifeStealMult   || 1.0;
  state.attackPowerMult = stats.attackPowerMult || 1.0;

  // ── Class bonuses ──
  state.classBonuses = stats.classBonuses || {
    strMult:0, agiMult:0, intMult:0, staMult:0,
    hitMult:0, critMult:0, dodgeMult:0, hpRegenMult:0,
    mpRegenMult:0, armorMult:0, mpMult:0, lifeStealMult:0,
    attackPowerMult:0, maxHpMult:0,
  };

  // ── Talent bonuses ──
  state.talentBonuses = stats.talentBonuses || {
    strMult:0, agiMult:0, intMult:0, staMult:0,
    hitMult:0, critMult:0, dodgeMult:0, hpRegenMult:0,
    mpRegenMult:0, armorMult:0, mpMult:0, lifeStealMult:0,
    attackPowerMult:0, maxHpMult:0,
  };

  // ── Equipment flat bonuses ──
  state.equipStr            = stats.equipStr            || 0;
  state.equipStrMult        = stats.equipStrMult        || 0;
  state.equipAgi            = stats.equipAgi            || 0;
  state.equipAgiMult        = stats.equipAgiMult        || 0;
  state.equipInt            = stats.equipInt            || 0;
  state.equipIntMult        = stats.equipIntMult        || 0;
  state.equipSta            = stats.equipSta            || 0;
  state.equipStaMult        = stats.equipStaMult        || 0;
  state.equipMaxHp          = stats.equipMaxHp          || 0;
  state.equipMaxHpMult      = stats.equipMaxHpMult      || 0;
  state.equipMaxMp          = stats.equipMaxMp          || 0;
  state.equipMaxMpMult      = stats.equipMaxMpMult      || 0;
  state.equipArmor          = stats.equipArmor          || 0;
  state.equipArmorMult      = stats.equipArmorMult      || 0;
  state.equipCrit           = stats.equipCrit           || 0;
  state.equipDodge          = stats.equipDodge          || 0;
  state.equipDodgeMult      = stats.equipDodgeMult      || 0;
  state.equipLifeSteal      = stats.equipLifeSteal      || 0;
  state.equipLifeStealMult  = stats.equipLifeStealMult  || 1.0;
  state.equipAttackPower    = stats.equipAttackPower    || 0;
  state.equipAttackPowerMult = stats.equipAttackPowerMult || 0;
  state.equipHpRegen        = stats.equipHpRegen        || 0;
  state.equipHpRegenMult    = stats.equipHpRegenMult    || 0;
  state.equipMpRegen        = stats.equipMpRegen        || 0;
  state.equipMpRegenMult    = stats.equipMpRegenMult    || 0;
  state.equipHit            = stats.equipHit            || 0;
  state.equipHitMult        = stats.equipHitMult        || 0;

  // ── Inventory & Equipment ──
  state.inventory = (character.inventory || []).map(item =>
  typeof item === 'string' ? JSON.parse(item) : item
).map(item => ({ ...item, uid: String(item.uid) })); // ✅ normalize uid type
  state.equipped  = character.equipped  || {
    weapon:null, armor:null, helmet:null, boots:null, ring:null, amulet:null,
  };

  // ── Talents & Skills ──
  state.talentPoints        = character.talent_points        || 0;
  state.unlockedTalents     = character.unlocked_talents     || [];
  state.talentUnlockedFlags = character.talent_unlocked_flags || {};
  state.skillCooldowns      = character.skill_cooldowns || {};

  // ── Quests ──
  state.quests = character.quests || {
    kill1:     { text:'🗡️ Defeat your first enemy', done:false },
    gold50:    { text:'💰 Earn 50 gold',            done:false },
    level5:    { text:'⭐ Reach Level 5',           done:false },
    level10:   { text:'🏆 Reach Level 10',          done:false },
    boss:      { text:'🐉 Defeat a Boss',           done:false },
    class:     { text:'✨ Choose a Class',          done:false },
    talent:    { text:'🌟 Unlock a Talent',         done:false },
    equip:     { text:'🛡️ Equip an item',           done:false },
    legendary: { text:'🔱 Find a Legendary item',  done:false },
    craft:     { text:'⚗️ Craft an item',           done:false },
    level50:   { text:'👑 Reach Level 50',          done:false },
    level100:  { text:'🌟 Reach Max Level 100',     done:false },
  };

  // ── Active debuffs ──
  state.activeDebuffs = character.active_debuffs || {
    maxHpReduction:0, webTrapped:0, rageTimer:0,
  };

  // ── UI state ──
  state.difficulty = character.difficulty || 'normal';
  state.invTab     = character.inv_tab    || 'equipment';
  state.shopTab    = character.shop_tab   || 'equipment';
  state.autoSell   = character.auto_sell  || {
    normal:false, uncommon:false, rare:false, epic:false,
  };

  // ── Tournament rewards ──
  state.tournamentTitle           = character.tournament_title            || null;
  state.tournamentBuff            = character.tournament_buff             || null;
  state.tournamentItem            = character.tournament_item             || null;
  state.tournamentRewardsExpireAt = character.tournament_rewards_expire_at || null;

  // ── Rebuild skills AFTER all state is loaded ──
  await rebuildSkills();

  // ── Talent unlocks (needs class + level to be set first) ──
  if (state.class && state.level >= 10) {
    if (typeof checkTalentUnlocks === 'function') checkTalentUnlocks();
  }

  // ── calcStats ONCE at the very end ──
  if (typeof calcStats === 'function') calcStats();
}

// ============================================
// REALTIME SUBSCRIPTION
// ============================================

let realtimeChannel = null;

function startRealtimeSync() {
  if (!state.character_id) return;

  if (realtimeChannel) {
    dbClient.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  realtimeChannel = dbClient
    .channel('character-sync')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'characters',
      filter: `id=eq.${state.character_id}`,
    }, (payload) => {
      const newGold = payload.new.gold;

      if (newGold > state.gold) {
        const diff = newGold - state.gold;
        state.gold = newGold;
        addLog(`💰 +${formatNumber(diff)}g from auction sale!`, 'legendary');
        notify(`💰 +${formatNumber(diff)}g received!`, 'var(--gold)');
        updateUI();
      }
    })
    .subscribe((status) => {
      console.log('🔴 Realtime status:', status);
    });
}

function stopRealtimeSync() {
  if (realtimeChannel) {
    dbClient.removeChannel(realtimeChannel);
    realtimeChannel = null;
    console.log('🔴 Realtime stopped');
  }
}

// ============================================
// SAVE PLAYER TO SUPABASE
// ============================================

async function savePlayerToSupabase() {
  try {
    const { data: { user } } = await dbClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    if (!state.character_id) throw new Error('No character ID');

    const safeGold = state.gold;

    const { error } = await dbClient.rpc('update_character_safe', {
      p_soul_weapon:           state.soulWeapon || null,
      p_crafted_soul_tiers:    state.craftedSoulTiers || {},
      p_character_id:          state.character_id,
      p_level:                 state.level,
      p_xp:                    state.xp,
      p_gold:                  safeGold,
      p_hp:                    state.hp,
      p_mp:                    state.mp,
      p_reputation:            state.reputation    || 0,
      p_reputation_rank:       state.reputationTitle || null, // ✅ FIX: now saves rank to DB
      p_name:                  state.name,
      p_class:                 state.class,
      p_max_health:            state.maxHp,
      p_max_mana:              state.maxMp,
      p_free_stat_points:      state.freeStatPoints || 0,
      p_legacy_points:         state.legacyPoints   || 0,
      p_legacy_skills:         state.legacySkills   || {},
      p_current_scene:         state.currentScene,
      p_talent_points:         state.talentPoints,
      p_unlocked_talents:      state.unlockedTalents,
      p_talent_unlocked_flags: state.talentUnlockedFlags,
      p_skill_cooldowns:       state.skillCooldowns,
      p_quests:                state.quests,
      p_inventory:             state.inventory,
      p_equipped:              state.equipped,
      p_difficulty:            state.difficulty,
      p_inv_tab:               state.invTab,
      p_shop_tab:              state.shopTab,
      p_auto_sell:             state.autoSell,
      p_active_debuffs:        state.activeDebuffs,
      p_respec_count:          state.respecCount,
      p_gold_mult_expiry:      state.goldMultExpiry,
      p_soul_crystals:         state.soulCrystals   || 0,
      p_premium_spins:         state.premiumSpins   || 0,
      p_login_streak:          state.loginStreak    || 0,
      p_last_login_date:       state.lastLoginDate  || null,
      p_total_login_days:      state.totalLoginDays || 0,
      p_stats: {
        // ── Base stats ──
        baseStr:               state.baseStr,
        baseAgi:               state.baseAgi,
        baseInt:               state.baseInt,
        baseSta:               state.baseSta,
        baseArmor:             state.baseArmor,
        baseHit:               state.baseHit,
        baseCrit:              state.baseCrit,
        baseDodge:             state.baseDodge,
        baseHpRegen:           state.baseHpRegen,
        baseLifeSteal:         state.baseLifeSteal,
        baseAttackPower:       state.baseAttackPower,
        // ── Multipliers ──
        strMult:               state.strMult,
        agiMult:               state.agiMult,
        intMult:               state.intMult,
        staMult:               state.staMult,
        armorMult:             state.armorMult,
        maxHpMult:             state.maxHpMult,
        hpRegenMult:           state.hpRegenMult,
        maxMpMult:             state.maxMpMult,
        mpMult:                state.mpMult,
        critMult:              state.critMult,
        dodgeMult:             state.dodgeMult,
        mpRegenMult:           state.mpRegenMult,
        hitMult:               state.hitMult,
        lifeStealMult:         state.lifeStealMult,
        attackPowerMult:       state.attackPowerMult,
        // ── Bonus objects ──
        classBonuses:          state.classBonuses,
        talentBonuses:         state.talentBonuses,
        // ── Equipment bonuses ──
        equipStr:              state.equipStr,
        equipStrMult:          state.equipStrMult,
        equipAgi:              state.equipAgi,
        equipAgiMult:          state.equipAgiMult,
        equipInt:              state.equipInt,
        equipIntMult:          state.equipIntMult,
        equipSta:              state.equipSta,
        equipStaMult:          state.equipStaMult,
        equipMaxHp:            state.equipMaxHp,
        equipMaxHpMult:        state.equipMaxHpMult,
        equipMaxMp:            state.equipMaxMp,
        equipMaxMpMult:        state.equipMaxMpMult,
        equipArmor:            state.equipArmor,
        equipArmorMult:        state.equipArmorMult,
        equipCrit:             state.equipCrit,
        equipDodge:            state.equipDodge,
        equipDodgeMult:        state.equipDodgeMult,
        equipLifeSteal:        state.equipLifeSteal,
        equipLifeStealMult:    state.equipLifeStealMult,
        equipAttackPower:      state.equipAttackPower,
        equipAttackPowerMult:  state.equipAttackPowerMult,
        equipHpRegen:          state.equipHpRegen,
        equipHpRegenMult:      state.equipHpRegenMult,
        equipMpRegen:          state.equipMpRegen,
        equipMpRegenMult:      state.equipMpRegenMult,
        equipHit:              state.equipHit,
        equipHitMult:          state.equipHitMult,
      },
    });

    if (error) throw error;
    console.log('✅ Character saved to Supabase (fully secured)');

  } catch (error) {
    console.error('Save character error:', error);
    throw error;
  }
}

// ============================================
// AUTO-SAVE
// ============================================

function startAutoSave() {
  if (autoSaveInterval) clearInterval(autoSaveInterval);
  autoSaveInterval = setInterval(async () => {
    try {
      await savePlayerToSupabase();
      console.log('💾 Auto-saved');
    } catch (error) {
      console.warn('Auto-save failed:', error);
    }
  }, 120000); // every 2 minutes
}

function stopAutoSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
}

function setupAutoSaveOnUnload() {
  window.addEventListener('beforeunload', async () => {
    try { await savePlayerToSupabase(); } catch (e) { console.error('Save on unload failed:', e); }
  });
}

function initializeSupabaseSync() {
  startAutoSave();
  setupAutoSaveOnUnload();
  startRealtimeSync();
  console.log('🔄 Supabase sync initialized');
}

function cleanupSupabaseSync() {
  stopAutoSave();
  stopRealtimeSync();
  console.log('🔄 Supabase sync stopped');
}