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
  state.character_id   = character.id;
  state.user_id        = character.user_id;
  state.name           = character.name;
  state.level          = character.level || 1;
  state.xp             = character.exp   || 0;
  state.xpNext         = Math.floor((character.level || 1) * 100 * 50);
  state.gold           = character.gold  || 0;
  state.reputation     = character.reputation   || 0;
  state.reputationTitle = character.reputation_rank || null;
  state.luckyTitle     = character.lucky_title     || null;
  state.supporterTitle = character.supporter_title || null;
  state.chatColor      = character.chat_color      || null;
  state.class          = character.class           || null;
  state.currentScene   = character.current_scene   || 'town';

  // ── Recalculate reputation rank on load in case DB is stale ──
  const _loadedTitle = getCurrentTitle();
  if (_loadedTitle && _loadedTitle.id !== state.reputationTitle) {
    state.reputationTitle = _loadedTitle.id;
  }

  // ── Progression ──
  state.soulWeapon       = character.soul_weapon        || null;
  state.craftedSoulTiers = character.crafted_soul_tiers || {};
  state.freeStatPoints   = character.free_stat_points   || 0;
  state.legacyPoints     = character.legacy_points      || 0;
  state.legacySkills     = character.legacy_skills      || {};
  state.respecCount      = character.respec_count       || 0;
  state.goldMult         = character.gold_mult          || 1;
  state.goldMultExpiry   = character.gold_mult_expiry   || null;

  // ── Currency & login ──
  state.soulCrystals   = character.soul_crystals    || 0;
  state.premiumSpins   = character.premium_spins    || 0;
  state.loginStreak    = character.login_streak     || 0;
  state.lastLoginDate  = character.last_login_date  || null;
  state.totalLoginDays = character.total_login_days || 0;

  // ── Health / Mana ──
  state.hp    = character.health     || 100;
  state.maxHp = character.max_health || 100;
  state.mp    = character.mana       || 50;
  state.maxMp = character.max_mana   || 50;

  // ── Base stats ──
  state.baseStr         = character.base_str          || 5;
  state.baseAgi         = character.base_agi          || 5;
  state.baseInt         = character.base_int          || 5;
  state.baseSta         = character.base_sta          || 5;
  state.baseArmor       = character.base_armor        || 0;
  state.baseHit         = character.base_hit          || 2;
  state.baseCrit        = character.base_crit         || 0.1;
  state.baseDodge       = character.base_dodge        || 2;
  state.baseHpRegen     = character.base_hp_regen     || 20;
  state.baseLifeSteal   = character.base_life_steal   || 0;
  state.baseAttackPower = character.base_attack_power || 10;

  // ── Multipliers — reset to 1.0 ──
  state.strMult = 1.0; state.agiMult = 1.0; state.intMult = 1.0; state.staMult = 1.0;
  state.armorMult = 1.0; state.maxHpMult = 1.0; state.hpRegenMult = 1.0; state.maxMpMult = 1.0;
  state.mpMult = 1.0; state.critMult = 1.0; state.dodgeMult = 1.0; state.mpRegenMult = 1.0;
  state.hitMult = 1.0; state.lifeStealMult = 1.0; state.attackPowerMult = 1.0;

  state.classBonuses = { strMult:0, agiMult:0, intMult:0, staMult:0, hitMult:0, critMult:0, dodgeMult:0, hpRegenMult:0, mpRegenMult:0, armorMult:0, mpMult:0, lifeStealMult:0, attackPowerMult:0, maxHpMult:0 };
  state.talentBonuses = { strMult:0, agiMult:0, intMult:0, staMult:0, hitMult:0, critMult:0, dodgeMult:0, hpRegenMult:0, mpRegenMult:0, armorMult:0, mpMult:0, lifeStealMult:0, attackPowerMult:0, maxHpMult:0 };

  state.equipStr = 0; state.equipStrMult = 0; state.equipAgi = 0; state.equipAgiMult = 0;
  state.equipInt = 0; state.equipIntMult = 0; state.equipSta = 0; state.equipStaMult = 0;
  state.equipMaxHp = 0; state.equipMaxHpMult = 0; state.equipMaxMp = 0; state.equipMaxMpMult = 0;
  state.equipArmor = 0; state.equipArmorMult = 0; state.equipCrit = 0; state.equipDodge = 0;
  state.equipDodgeMult = 0; state.equipLifeSteal = 0; state.equipLifeStealMult = 1.0;
  state.equipAttackPower = 0; state.equipAttackPowerMult = 0; state.equipHpRegen = 0; state.equipHpRegenMult = 0;
  state.equipMpRegen = 0; state.equipMpRegenMult = 0; state.equipHit = 0; state.equipHitMult = 0;

  // ── FIXED Inventory Sync ──
  const rawInventory = character.inventory;
  
  // The secure normalize function: handles BOTH Arrays and Objects
  const normalizeBag = (bag) => {
    if (!bag) return [];
    // If it's an object {uid: item}, convert to array [item]
    const itemsList = Array.isArray(bag) ? bag : Object.values(bag);
    
    return itemsList.map(item => {
      if (!item) return null;
      const parsed = typeof item === 'string' ? JSON.parse(item) : item;
      return { ...parsed, uid: String(parsed.uid || 'unknown') };
    }).filter(i => i !== null);
  };

  if (rawInventory && !Array.isArray(rawInventory) && (rawInventory.equipment !== undefined || rawInventory.consumable !== undefined)) {
    // New Secure 3-bag structure
    state.inventory = {
      equipment:  normalizeBag(rawInventory.equipment),
      consumable: normalizeBag(rawInventory.consumable),
      material:   normalizeBag(rawInventory.material),
    };
  } else if (Array.isArray(rawInventory)) {
    // Legacy flat array
    state.inventory = { 
        equipment: normalizeBag(rawInventory), 
        consumable: [], 
        material: [] 
    };
  } else {
    state.inventory = { equipment: [], consumable: [], material: [] };
  }

  state.equipped = character.equipped || { weapon:null, armor:null, helmet:null, boots:null, ring:null, amulet:null };
  state.talentPoints = character.talent_points || 0;
  state.unlockedTalents = character.unlocked_talents || [];
  state.talentUnlockedFlags = character.talent_unlocked_flags || {};
  state.skillCooldowns = character.skill_cooldowns || {};

  const loadedQuests = character.quests || {};
  state.quests = {
    kill1:     loadedQuests.kill1     || { text:'🗡️ Defeat your first enemy', done:false },
    gold50:    loadedQuests.gold50    || { text:'💰 Earn 50 gold',            done:false },
    level5:    loadedQuests.level5    || { text:'⭐ Reach Level 5',           done:false },
    level10:   loadedQuests.level10   || { text:'🏆 Reach Level 10',          done:false },
    boss:      loadedQuests.boss      || { text:'🐉 Defeat a Boss',           done:false },
    class:     loadedQuests.class     || { text:'✨ Choose a Class',           done:false },
    talent:    loadedQuests.talent    || { text:'🌟 Unlock a Talent',         done:false },
    equip:     loadedQuests.equip     || { text:'🛡️ Equip an item',           done:false },
    legendary: loadedQuests.legendary || { text:'🔱 Find a Legendary item',  done:false },
    craft:     loadedQuests.craft     || { text:'⚗️ Craft an item',           done:false },
    level50:   loadedQuests.level50   || { text:'👑 Reach Level 50',           done:false },
    level100:  loadedQuests.level100  || { text:'🌟 Reach Max Level 100',     done:false },
  };

  state.activeDebuffs = character.active_debuffs || { maxHpReduction:0, webTrapped:0, rageTimer:0 };
  state.difficulty = character.difficulty || 'normal';
  state.invTab = character.inv_tab || 'equipment';
  state.shopTab = character.shop_tab || 'equipment';
  state.autoSell = character.auto_sell || { normal:false, uncommon:false, rare:false, epic:false };

  state.tournamentTitle = character.tournament_title || null;
  state.tournamentBuff = character.tournament_buff || null;
  state.tournamentItem = character.tournament_item || null;
  state.tournamentRewardsExpireAt = character.tournament_rewards_expire_at || null;

  const { data: worldState } = await dbClient.from('world_state').select('phase').eq('id', 1).single();
  state.worldPhase = worldState?.phase || 1;

  await rebuildSkills();
  if (state.class && state.level >= 10) {
    if (typeof checkTalentUnlocks === 'function') checkTalentUnlocks();
  }

  reapplyClassBonuses();
reapplyTalentBonuses();
reapplyEquipBonuses();
if (typeof calcStats === 'function') calcStats();

// Write calculated stats back to DB so server-side RPCs use correct values
await dbClient
  .from('characters')
  .update({
    max_health: state.maxHp,
    max_mana:   state.maxMp,
    health:     Math.min(state.hp, state.maxHp),
    mana:       Math.min(state.mp, state.maxMp),
  })
  .eq('id', state.character_id);
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



async function saveInventoryToSupabase() {
  try {
    const { data, error } = await dbClient.rpc('save_inventory', {
      p_character_id: state.character_id,
      p_inventory:    state.inventory,
      p_equipped:     state.equipped,
    });
    if (error) throw error;
    if (data && !data.success) throw new Error(data.error);
    console.log('✅ Inventory saved');
  } catch (err) {
    console.error('Save inventory error:', err);
  }
}

async function syncCharacterData() {
  try {
    const { data, error } = await dbClient
      .from('characters')
      .select('gold, inventory, level, xp, xp_next, base_str, base_agi, base_int, base_sta, talent_points, free_stat_points, legacy_points, equipped, auto_sell, health, mana, max_health, max_mana')
      .eq('id', state.character_id)
      .single();

    if (error) throw error;

    if (data) {
      state.hp    = data.health;
      state.mp    = data.mana;
      state.maxHp = data.max_health;
      state.maxMp = data.max_mana;
      state.gold           = data.gold;
      state.level          = data.level;
      state.xp             = data.xp || 0;
      state.xpNext         = data.xp_next || 5000;
      state.baseStr        = data.base_str;
      state.baseAgi        = data.base_agi;
      state.baseInt        = data.base_int;
      state.baseSta        = data.base_sta;
      state.talentPoints   = data.talent_points || 0;
      state.freeStatPoints = data.free_stat_points || 0;
      state.legacyPoints   = data.legacy_points || 0;
      state.equipped       = data.equipped || {weapon:null,armor:null,helmet:null,boots:null,ring:null,amulet:null};
      state.autoSell = data.auto_sell || {
  equipment:  { normal: false, uncommon: false, rare: false, epic: false },
  consumable: { normal: false, uncommon: false, rare: false, epic: false },
  material:   { normal: false, uncommon: false, rare: false, epic: false },
};

      // inventory sync unchanged
      const dbInventory = data.inventory || {};
      const syncedInventory = {};

      Object.keys(dbInventory).forEach(category => {
        const categoryData = dbInventory[category];
        if (!categoryData) { syncedInventory[category] = []; return; }

        let itemsArray = Array.isArray(categoryData)
          ? categoryData
          : Object.values(categoryData);

        syncedInventory[category] = itemsArray.map(item => {
          if (!item || typeof item !== 'object') return null;
          const keys = Object.keys(item);
          if (keys.length === 1 && item[keys[0]] && typeof item[keys[0]] === 'object') {
            return item[keys[0]];
          }
          return item;
        }).filter(item => item && item.name);
      });

      state.inventory = syncedInventory;
    }
  } catch (err) {
    console.error("Sync error:", err);
  }
  updateUI()
}

function initializeSupabaseSync() {
  // startAutoSave();
  // setupAutoSaveOnUnload();
  startRealtimeSync();
  console.log('🔄 Supabase sync initialized');
}

function cleanupSupabaseSync() {
  // stopAutoSave();
  stopRealtimeSync();
  console.log('🔄 Supabase sync stopped');
}
