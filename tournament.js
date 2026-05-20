
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
    await savePlayerToSupabase();
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

// ── SKILL COMBO PICKER ──
// BUG FIX #8: state.class is lowercase ('warrior') but the classSkills map
// used title case ('Warrior') — so it always fell back to Warrior skills
// for every class. Fixed by capitalizing state.class before lookup.
function openSkillComboPicker(tournament, tier, tierKey) {
  // BUG FIX #8: capitalize first letter so lookup works correctly
  const rawClass    = state.class || 'warrior';
  const playerClass = rawClass.charAt(0).toUpperCase() + rawClass.slice(1);

  // BUG FIX #3: use state.skills which includes both class AND legacy skills
  // Old code only showed hardcoded class skills — legacy skills were excluded
  const availableSkills = (state.skills || []).filter(sk => SKILLS[sk]);

  // BUG FIX #1: tournament combo is 3 slots — was accidentally set to 6
  // (6 slots is for auto-fight, not tournament registration)
  const COMBO_SIZE   = 3;
  const selectedCombo = new Array(COMBO_SIZE).fill(null);

  function renderPicker() {
    const popup = document.getElementById('item-popup');
    const filledCount = selectedCombo.filter(Boolean).length;
    const emptyCount  = COMBO_SIZE - filledCount;

    document.getElementById('item-popup-content').innerHTML = `
      <div style="font-family:var(--font-title);color:var(--gold);margin-bottom:4px;font-size:.95em;">
        ⚔️ ${tier.label} Tournament
      </div>
      <div style="font-size:.72em;color:var(--text-dim);margin-bottom:12px;">
        Entry Fee: <span style="color:var(--gold);">${formatNumber(tier.fee)}g</span> &nbsp;|&nbsp;
        Level: <span style="color:var(--green);">Lv.${tier.min}-${tier.max}</span>
      </div>

      <div style="font-family:var(--font-title);font-size:.75em;color:var(--text-dim);
        letter-spacing:2px;margin-bottom:8px;">
        SKILL COMBO (up to ${COMBO_SIZE})
      </div>

      <!-- Combo slots -->
      <div style="display:flex;gap:8px;justify-content:center;margin-bottom:14px;">
        ${selectedCombo.map((sk, i) => {
          const skill = sk ? SKILLS[sk] : null;
          return `
            <div onclick="clearComboSlot(${i})"
              style="width:64px;height:64px;border-radius:8px;
              border:2px solid ${skill ? 'var(--gold)' : 'rgba(255,255,255,0.15)'};
              background:${skill ? 'rgba(255,153,0,0.12)' : 'rgba(255,255,255,0.04)'};
              display:flex;flex-direction:column;align-items:center;justify-content:center;
              cursor:${skill ? 'pointer' : 'default'};position:relative;">
              ${skill
                ? `<div style="font-size:1.6em;">${skill.icon}</div>
                   <div style="font-size:.52em;color:var(--gold);text-align:center;
                     line-height:1.2;margin-top:2px;">${skill.name}</div>
                   <div style="position:absolute;top:2px;right:4px;font-size:.6em;
                     color:var(--text-dim);">${i+1}</div>`
                : `<div style="font-size:1.4em;color:rgba(255,255,255,0.15);">+</div>
                   <div style="font-size:.55em;color:rgba(255,255,255,0.2);">Slot ${i+1}</div>`
              }
            </div>`;
        }).join('')}
      </div>

      <!-- Available skills — class + legacy -->
      <div style="font-family:var(--font-title);font-size:.7em;color:var(--text-dim);
        letter-spacing:2px;margin-bottom:8px;">
        YOUR SKILLS
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:16px;">
        ${availableSkills.map(sk => {
          const skill = SKILLS[sk];
          if (!skill) return '';
          const alreadyPicked = selectedCombo.includes(sk);
          const isLegacy = skill.isLegacy;
          return `
            <div onclick="${alreadyPicked ? '' : `addToCombo('${sk}')`}"
              style="width:64px;height:64px;border-radius:8px;
              border:2px solid ${alreadyPicked ? 'var(--green)' : isLegacy ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.15)'};
              background:${alreadyPicked ? 'rgba(34,197,94,0.1)' : isLegacy ? 'rgba(168,85,247,0.06)' : 'rgba(255,255,255,0.04)'};
              display:flex;flex-direction:column;align-items:center;justify-content:center;
              cursor:${alreadyPicked ? 'default' : 'pointer'};
              opacity:${alreadyPicked ? '0.5' : '1'};">
              <div style="font-size:1.6em;">${skill.icon}</div>
              <div style="font-size:.52em;color:${isLegacy ? 'var(--purple)' : 'var(--text-dim)'};
                text-align:center;line-height:1.2;margin-top:2px;">${skill.name}</div>
              ${isLegacy ? `<div style="font-size:.48em;color:var(--purple);">✨Legacy</div>` : ''}
            </div>`;
        }).join('')}
      </div>

      <!-- BUG FIX #2: empty count now correctly based on COMBO_SIZE not array length -->
      ${emptyCount > 0 ? `
        <div style="font-size:.72em;color:var(--gold);text-align:center;margin-bottom:10px;
          background:rgba(255,153,0,0.08);border-radius:6px;padding:6px;">
          ⚠️ ${emptyCount} skill slot(s) empty — are you sure?
        </div>` : ''}

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

  window.addToCombo = function(skillKey) {
    const emptySlot = selectedCombo.indexOf(null);
    if (emptySlot === -1) {
      // BUG FIX #1: correct slot count in message
      notify(`All ${COMBO_SIZE} slots filled! Click a slot to clear it.`, 'var(--gold)');
      return;
    }
    selectedCombo[emptySlot] = skillKey;
    renderPicker();
  };

  window.clearComboSlot = function(index) {
    selectedCombo[index] = null;
    renderPicker();
  };

  window.confirmTournamentRegistration = async function() {
    try {
      const newGold = state.gold - tier.fee;
      if (newGold < 0) { notify('Not enough gold!', 'var(--red)'); return; }
      state.gold = newGold;

      calcStats(); // ensure stats are fresh before snapshot
      const snapshot = {
        character_id: state.character_id,
        name:         state.name,
        level:        state.level,
        class:        state.class,
        attackPower:  state.attackPower,
        maxHp:        state.maxHp || 1000,
        armor:        state.armor,
        hit:          state.hit,
        dodge:        state.dodge,
        crit:         state.crit,
        lifeSteal:    state.lifeSteal,
        skillCombo:   selectedCombo.filter(Boolean),
      };

      await dbClient.from('arena_registrations').insert({
        tournament_id:      tournament.id,
        character_id:       state.character_id,
        user_id:            state.user_id,
        character_snapshot: snapshot,
        skill_combo:        selectedCombo.filter(Boolean),
        points:             0,
      });

      await dbClient.from('characters')
        .update({ gold: newGold })
        .eq('id', state.character_id);

      closeItemPopup();
      addLog(`⚔️ Registered for ${tier.label} Tournament! Fee: ${formatNumber(tier.fee)}g paid.`, 'gold');
      notify(`✅ Registered for ${tier.label} Tournament!`, 'var(--gold)');
      updateUI();
      renderTournament();

    } catch(e) {
      state.gold += tier.fee; // refund on failure
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
  const baseStr = Math.floor(5 + level * 2);
  const baseAgi = Math.floor(5 + level * 2);
  const baseInt = Math.floor(5 + level * 2);
  const baseSta = Math.floor(5 + level * 2);

  const attackPower = Math.floor((baseStr * 4 + baseInt * 3 + level * 15) * m);
  const maxHp       = Math.floor((100 + baseStr * 20 + baseSta * 30 + level * 80) * m);
  const armor       = Math.floor((baseAgi * 8 + level * 10) * m);
  const crit        = Math.floor(baseAgi * 0.0005 + 5); // crit doesn't need m
  const dodge       = Math.floor(baseAgi * 1.9 * m);
  const hit         = Math.floor(baseAgi * 5.3 * m);
  const lifeSteal   = 0.02 * m; // also reduced — 0.05 * 5.5 = 27.5% lifesteal is too high

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
    const botsNeeded = TOURNAMENT_SIZE - participants.length;
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



// ── RUN A TOURNAMENT ROUND ──
// BUG FIX #5: removed the first bracket save that ran before next round
// matches were added — it was writing an incomplete bracket to the DB
// every round. Now only one save per round at the end.
async function runTournamentRound(tournamentId, bracket, round, tierKey) {
  try {
    const roundMatches = bracket.filter(m => m.round === round);
    const nextBracket  = [...bracket];
    const winners = [];
    const losers  = [];

    for (const match of roundMatches) {
      // Bye — player1 advances automatically
      if (!match.player2) {
        match.winner = match.player1;
        winners.push(match.player1);
        continue;
      }

      const result  = simulateBattle(match.player1, match.player2);
      match.winner  = result.winnerId === match.player1.character_id ? match.player1 : match.player2;
      const loser   = result.winnerId === match.player1.character_id ? match.player2 : match.player1;
      match.battleLog = result.log;
      match.turns     = result.turns;
      winners.push(match.winner);
      losers.push(loser);

      // Save battle record (both real players)
      if (!match.player1.isBot && !match.player2.isBot) {
        const { data: battleRecord } = await dbClient.from('arena_battles').insert({
          attacker_id:       match.player1.character_id,
          defender_id:       match.player2.character_id,
          winner_id:         result.winnerId,
          attacker_snapshot: match.player1,
          defender_snapshot: match.player2,
          battle_log:        result.log,
          battle_turns:      result.turns,
          points_change:     25,
        }).select().single();
        if (battleRecord) match.battleId = battleRecord.id;

      } else if (!match.player1.isBot || !match.player2.isBot) {
        const realPlayer = !match.player1.isBot ? match.player1 : match.player2;
        const botPlayer  = !match.player1.isBot ? match.player2 : match.player1;
        const { data: battleRecord } = await dbClient.from('arena_battles').insert({
          attacker_id:       realPlayer.character_id,
          defender_id:       null,
          winner_id:         result.winnerId === realPlayer.character_id ? realPlayer.character_id : null,
          attacker_snapshot: realPlayer,
          defender_snapshot: botPlayer,
          battle_log:        result.log,
          battle_turns:      result.turns,
          points_change:     15,
        }).select().single();
        if (battleRecord) match.battleId = battleRecord.id;
      }

      // Update points for winners
      if (!match.winner.isBot) {
        await dbClient.from('arena_registrations')
          .update({ points: round * 100 })
          .eq('tournament_id', tournamentId)
          .eq('character_id', match.winner.character_id);
      }
      // Update rank for losers
      if (!loser.isBot) {
        await dbClient.from('arena_registrations')
          .update({ rank: getEliminationRank(round) })
          .eq('tournament_id', tournamentId)
          .eq('character_id', loser.character_id);
      }
    }

    // Tournament over — only 1 winner left
    if (winners.length === 1) {
      // Save final bracket state before finalizing
      await dbClient.from('arena_tournaments').update({
        bracket: nextBracket,
      }).eq('id', tournamentId);
      await finalizeTournament(tournamentId, nextBracket, winners[0], tierKey);
      return;
    }

    // Build next round matches
    const nextRound = round + 1;
    for (let i = 0; i < winners.length; i += 2) {
      nextBracket.push({
        round:      nextRound,
        player1:    winners[i],
        player2:    winners[i + 1] || null,
        winner:     null,
        battleLog:  [],
      });
    }

    // BUG FIX #5: single DB write per round (was two — first was always incomplete)
    await dbClient.from('arena_tournaments').update({
      bracket: nextBracket,
      round:   nextRound,
    }).eq('id', tournamentId);

    await runTournamentRound(tournamentId, nextBracket, nextRound, tierKey);

  } catch(e) { console.error('Run round error:', e); }
}

// ── FINALIZE TOURNAMENT ──
// BUG FIX #9: thirds[0] is 3rd place, thirds[1] is 4th place.
// Old code had them reversed.
async function finalizeTournament(tournamentId, bracket, champion, tierKey) {
  try {
    const allRounds    = [...new Set(bracket.map(m => m.round))].sort((a, b) => b - a);
    const finalRound   = allRounds[0];
    const semiFinalRound = allRounds[1];

    const finalMatch  = bracket.find(m => m.round === finalRound);
    const semiMatches = bracket.filter(m => m.round === semiFinalRound);

    const first  = champion;
    const second = finalMatch
      ? (finalMatch.player1?.character_id === champion.character_id
        ? finalMatch.player2 : finalMatch.player1)
      : null;

    // BUG FIX #9: thirds[0] = 3rd place, thirds[1] = 4th place
    const thirds = semiMatches
      .map(m => m.player1?.character_id === m.winner?.character_id ? m.player2 : m.player1)
      .filter(Boolean);

    const { data: tData } = await dbClient
      .from('arena_tournaments')
      .select('rewards_expire_at')
      .eq('id', tournamentId)
      .single();
    const rewardsExpireAt = tData?.rewards_expire_at || null;

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

    // Participation reward for everyone not in top placements
    for (const reg of regs) {
      if (topIds.includes(reg.character_id)) continue;
      if (reg.character_id?.startsWith('bot_')) continue;
      await givePlacementReward(reg.character_id, 'participation', tierKey, rewardsExpireAt);
    }

    // BUG FIX #9: corrected order — thirds[0]=3rd, thirds[1]=4th
    if (thirds[1] && !thirds[1].isBot) await givePlacementReward(thirds[1].character_id, 4, tierKey, rewardsExpireAt);
    if (thirds[0] && !thirds[0].isBot) await givePlacementReward(thirds[0].character_id, 3, tierKey, rewardsExpireAt);
    if (second && !second.isBot)       await givePlacementReward(second.character_id,    2, tierKey, rewardsExpireAt);
    if (!first.isBot)                  await givePlacementReward(first.character_id,     1, tierKey, rewardsExpireAt);

    await dbClient.from('arena_tournaments').update({
      status:         'completed',
      bracket:        bracket,
      winner_id:      first.isBot ? null : first.character_id,
      reward_sent_at: new Date().toISOString(),
    }).eq('id', tournamentId);

    const winnerLabel = first.isBot ? `🤖 ${first.name} (Bot)` : first.name;
    addLog(`🏆 ${tierKey.toUpperCase()} Tournament complete! Champion: ${winnerLabel}!`, 'legendary');
    notify(`🏆 ${winnerLabel} wins the ${tierKey} Tournament!`, 'var(--gold)');
    renderTournament();

  } catch(e) { console.error('Finalize tournament error:', e); }
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
function getArenaRewardItem(tier, slot = null) {
  const arenaItems = GAME_CONFIG.arena_items || {};
  const tierItems = arenaItems[tier] || {};
  
  // Pick random slot if not specified
  const slots = ['weapon', 'armor', 'helmet', 'boots', 'ring', 'amulet'];
  const chosenSlot = slot || slots[Math.floor(Math.random() * slots.length)];
  const stats = tierItems[chosenSlot] || {};

  const icons = { weapon:'⚔️', armor:'🛡️', helmet:'⛑️', boots:'👢', ring:'💍', amulet:'📿' };
  const names = {
    weapon:'Gladiator\'s Blade', armor:'Champion\'s Plate', helmet:'Warlord\'s Crown',
    boots:'Phantom Stride', ring:'Ring of the Champion', amulet:'Amulet of Glory'
  };
  const rarityNames = { legendary:'Eternal', epic:'Heroic', rare:'Combatant\'s' };

  return {
    uid: genUid(),
    name: `${icons[chosenSlot]} ${rarityNames[tier] || ''} ${names[chosenSlot]}`,
    category: 'equipment',
    slot: chosenSlot,
    rarity: tier,
    stats: { ...stats },
    equipped: false,
    levelReq: 0,
    arenaExclusive: true,
    sellPrice: tier === 'legendary' ? 500000 : tier === 'epic' ? 200000 : 50000,
  };
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

    // Replace the hardcoded buff section with:
const buffCfg = (GAME_CONFIG.tournament_buffs || {})[tierKey]?.[place];
let tournamentBuff = null;
if (buffCfg) {
  tournamentBuff = {
    goldMult: buffCfg.goldMult,
    attackMult: buffCfg.attackMult,
    label: reward.title,
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
// BUG FIX #2: removed getPracticeFee() which was never defined —
// caused ReferenceError on every login. Now reads fees directly
// from GAME_CONFIG with fallbacks.
async function createWeeklyTournamentsIfMissing() {
  try {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7;

    let nextFriday = new Date(now);
    if (dayOfWeek === 5 && now.getUTCHours() < 12) {
      nextFriday.setUTCHours(12, 0, 0, 0);
    } else if (daysUntilFriday === 0) {
      nextFriday.setUTCDate(nextFriday.getUTCDate() + 7);
      nextFriday.setUTCHours(12, 0, 0, 0);
    } else {
      nextFriday.setUTCDate(nextFriday.getUTCDate() + daysUntilFriday);
      nextFriday.setUTCHours(12, 0, 0, 0);
    }

    const endsAt = new Date(nextFriday);
    endsAt.setUTCHours(13, 0, 0, 0);

    const rewardsExpireAt = new Date(nextFriday);
    rewardsExpireAt.setUTCDate(rewardsExpireAt.getUTCDate() + 7);
    rewardsExpireAt.setUTCHours(18, 0, 0, 0);

    // BUG FIX #2: read fees directly from GAME_CONFIG — no getPracticeFee()
    const fees = GAME_CONFIG.tournament_fees || {};
    const TIERS = [
      { key: 'rookie',  minLevel: 20, fee: fees.rookie  ?? 20000  },
      { key: 'veteran', minLevel: 41, fee: fees.veteran ?? 40000  },
      { key: 'elite',   minLevel: 61, fee: fees.elite   ?? 60000  },
      { key: 'legend',  minLevel: 81, fee: fees.legend  ?? 100000 },
    ];

    for (const tier of TIERS) {
      const { data: existing } = await dbClient
        .from('arena_tournaments')
        .select('id')
        .eq('min_level', tier.minLevel)
        .in('status', ['open', 'in_progress'])
        .gte('starts_at', nextFriday.toISOString())
        .single();

      if (existing) continue;

      await dbClient.from('arena_tournaments').insert({
        status:              'open',
        bracket:             [],
        round:               0,
        min_level:           tier.minLevel,
        entry_fee:           tier.fee,
        starts_at:           nextFriday.toISOString(),
        ends_at:             endsAt.toISOString(),
        rewards_expire_at:   rewardsExpireAt.toISOString(),
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
// BUG FIX #7: replaced new Date(year, month, day) with UTC-safe calculation.
// Local time constructor caused wrong week matching on UTC+7 servers.
async function checkAndStartGrandFinals() {
  try {
    const now = new Date();
    const TIERS = ['rookie', 'veteran', 'elite', 'legend'];
    const TIER_MIN = { rookie: 20, veteran: 41, elite: 61, legend: 81 };

    // BUG FIX #7: use UTC date subtraction — not local Date constructor
    const weekAgo = new Date(now);
    weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

    for (const tierKey of TIERS) {
      const minLevel = TIER_MIN[tierKey];

      // Check if grand final already exists and is complete/in progress this week
      const { data: existingGF } = await dbClient
        .from('grand_finals')
        .select('id, status')
        .eq('tier', tierKey)
        .in('status', ['pending', 'in_progress', 'completed'])
        .gte('created_at', weekAgo.toISOString())
        .single();

      if (existingGF?.status === 'completed')   continue;
      if (existingGF?.status === 'in_progress') continue;

      // Only run on Friday past 9pm Cambodia (2pm UTC)
      const isFriday          = now.getUTCDay() === 5;
      const isPastGrandFinalTime = now.getUTCHours() >= 14;
      if (!isFriday || !isPastGrandFinalTime) continue;

      // Check if all brackets for this tier are completed
      const { data: brackets } = await dbClient
        .from('arena_tournaments')
        .select('id, status')
        .eq('min_level', minLevel)
        .gte('created_at', weekAgo.toISOString());

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
// BUG FIX #10: removed N+1 Supabase queries inside the tier loop.
// Old code did up to 24 queries (4 tiers × 3 brackets × 2 queries each).
// Now does 2 queries total — one for all registrations, one for counts.
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

    const fees        = GAME_CONFIG.tournament_fees || {};
    const playerLevel = state.level || 1;
    const playerTierKey = playerLevel < 20  ? null
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

    // BUG FIX #10: batch-fetch ALL registrations for ALL active tournaments
    // in one query instead of querying per bracket inside the loop
    const allTournamentIds = (activeTournaments || []).map(t => t.id);
    let allRegistrations = [];
    if (allTournamentIds.length) {
      const { data: regsData } = await dbClient
        .from('arena_registrations')
        .select('tournament_id, character_id, user_id')
        .in('tournament_id', allTournamentIds);
      allRegistrations = regsData || [];
    }

    // Build lookup maps from the batch fetch
    // regsByTournament[tid] = array of registrations
    const regsByTournament = {};
    // playerTournament[user_id] = tournament_id (for "already registered" check)
    const playerTournamentMap = {};

    allRegistrations.forEach(r => {
      if (!regsByTournament[r.tournament_id]) regsByTournament[r.tournament_id] = [];
      regsByTournament[r.tournament_id].push(r);
      if (r.user_id === state.user_id) {
        playerTournamentMap[r.tournament_id] = true;
      }
    });

    let html = '';

    // ── TOURNAMENT REWARDS BANNER ──
    if (state.tournamentTitle || state.tournamentBuff || state.tournamentItem) {
      const expiry  = state.tournamentRewardsExpireAt ? new Date(state.tournamentRewardsExpireAt) : null;
      const now     = new Date();
      const msLeft  = expiry ? expiry - now : 0;
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
            const color    = tierColors[c.supreme_tier] || 'var(--gold)';
            const defenses = c.supreme_defenses || 0;
            const shields  = defenses >= 10 ? '⭐ UNDEFEATED' : '🛡️'.repeat(Math.min(defenses, 5));
            const since    = c.supreme_since ? new Date(c.supreme_since).toLocaleDateString() : '?';
            const isMe     = c.id === state.character_id;
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
      const tierFee      = fees[tier.key] ?? 20000;
      const isPlayerTier = tier.key === playerTierKey;
      const isLocked     = playerLevel < tier.min || playerLevel > tier.max;

      const tierBrackets = (activeTournaments || [])
        .filter(t => t.min_level === tier.min)
        .sort((a, b) => a.bracket_number - b.bracket_number);

      const grandFinal  = (grandFinals   || []).find(gf => gf.tier === tier.key);
      const supremeChamp = (supremeChamps || []).find(c  => c.supreme_tier === tier.key);

      // BUG FIX #10: use pre-fetched registration maps — no per-bracket queries
      let playerBracket = null;
      for (const t of tierBrackets) {
        if (playerTournamentMap[t.id]) { playerBracket = t; break; }
      }
      const isRegistered = !!playerBracket;
      const allFull = tierBrackets.length >= MAX_BRACKETS_PER_TIER &&
        tierBrackets.every(t => t.status !== 'open');

      html += `
        <div class="char-panel" style="margin-bottom:10px;
          border:1px solid ${isPlayerTier ? tier.color : 'var(--border)'};
          opacity:${isLocked ? '0.5' : '1'};">

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

          ${tierBrackets.length ? tierBrackets.map(t => {
            // BUG FIX #10: use pre-fetched count from regsByTournament
            const bracketRegCount = (regsByTournament[t.id] || []).length;
            return `
              <div style="margin-bottom:6px;padding:6px;
                background:rgba(255,255,255,0.02);border-radius:6px;
                border:1px solid rgba(255,255,255,0.06);">
                <div style="display:flex;justify-content:space-between;
                  font-size:.68em;color:var(--text-dim);margin-bottom:3px;">
                  <span>Bracket ${t.bracket_number} (${bracketRegCount}/${TOURNAMENT_SIZE})</span>
                  <span style="color:${t.status==='open'?'var(--green)':'var(--gold)'};">
                    ${t.status==='open'?'🟢 Open':'🟡 In Progress'}
                  </span>
                </div>
                <div style="height:4px;background:rgba(255,255,255,0.07);
                  border-radius:2px;overflow:hidden;">
                  <div style="height:100%;background:${tier.color};border-radius:2px;
                    width:${(bracketRegCount/TOURNAMENT_SIZE)*100}%;">
                  </div>
                </div>
                ${t.status==='in_progress' ? `
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

          ${grandFinal ? `
            <div style="margin-bottom:8px;padding:6px 8px;
              background:rgba(255,153,0,0.08);border-radius:6px;
              border:1px solid rgba(255,153,0,0.3);">
              <div style="font-size:.70em;color:var(--gold);font-family:var(--font-title);">
                👑 Grand Final — ${grandFinal.status === 'in_progress' ? '⚔️ In Progress' : '⏳ Pending 9PM'}
              </div>
              ${grandFinal.status==='in_progress' ? `
                <button class="start-btn"
                  onclick="viewGrandFinalBracket('${tier.key}')"
                  style="width:100%;padding:5px;font-size:.68em;margin-top:4px;">
                  📊 View Grand Final
                </button>` : ''}
            </div>` : ''}

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
          ` : allFull ? `
            <div style="text-align:center;color:var(--red);font-size:.75em;
              padding:8px;background:rgba(255,0,0,0.06);border-radius:6px;">
              ⚠️ All ${MAX_BRACKETS_PER_TIER} brackets full! Come back next week.
            </div>
          ` : `
            <button class="start-btn"
              onclick="registerForTournament('${tier.key}')"
              style="width:100%;padding:9px;font-size:.78em;
              background:${isPlayerTier ? `linear-gradient(135deg,${tier.color}33,${tier.color}11)` : ''};
              border-color:${isPlayerTier ? tier.color : 'var(--border)'};">
              ⚔️ Register — ${formatNumber(tierFee)}g
            </button>
          `}

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
    const p1Max = turn.p1HpMax || attacker.maxHp || 1;
    const p2Max = turn.p2HpMax || defender.maxHp || 1;
    const p1Pct = getHpPercent(turn.p1HpAfter, p1Max);
    const p2Pct = getHpPercent(turn.p2HpAfter, p2Max);
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


// ── PRACTICE FIGHT SYSTEM ──
function getPracticeFee(tierKey) {
  const fees = GAME_CONFIG.practice_fees || {};
  const defaults = { rookie: 5000, veteran: 10000, elite: 20000, legend: 50000 };
  return fees[tierKey] ?? defaults[tierKey];
}

// BUG FIX #5: now fetches ALL brackets for this tier, not just the most recent one
// BUG FIX #8: added limit(200) to win/loss query
async function renderPracticeboard(tierKey, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:12px;">Loading fighters...</div>';

  const TIER_MIN    = { rookie: 20, veteran: 41, elite: 61, legend: 81 };
  const TIER_MAX    = { rookie: 40, veteran: 60, elite: 80, legend: 100 };
  const TIER_COLORS = { rookie: '#22c55e', veteran: '#3b82f6', elite: '#a855f7', legend: '#ff9900' };
  const fee      = getPracticeFee(tierKey);
  const minLevel = TIER_MIN[tierKey];
  const tierColor = TIER_COLORS[tierKey];

  if (state.level < minLevel) {
    container.innerHTML = `
      <div style="text-align:center;font-size:.75em;color:var(--text-dim);
        padding:10px;background:rgba(255,255,255,0.03);border-radius:6px;">
        🔒 Reach Level ${minLevel} to access ${tierKey} practice fights
      </div>`;
    return;
  }

  try {
    // BUG FIX #5: fetch ALL brackets for this tier (not just most recent)
    const { data: tournaments } = await dbClient
      .from('arena_tournaments')
      .select('id, status, bracket_number')
      .in('status', ['open', 'in_progress', 'completed'])
      .eq('min_level', minLevel)
      .order('bracket_number', { ascending: true });

    if (!tournaments || !tournaments.length) {
      container.innerHTML = `
        <div style="text-align:center;font-size:.75em;color:var(--text-dim);
          padding:10px;background:rgba(255,255,255,0.03);border-radius:6px;">
          No registered fighters this week yet
        </div>`;
      return;
    }

    const tournamentIds = tournaments.map(t => t.id);

    // Batch fetch all registrations across all brackets
    const { data: regs } = await dbClient
      .from('arena_registrations')
      .select('character_id, character_snapshot, skill_combo, points, rank, tournament_id')
      .in('tournament_id', tournamentIds)
      .order('points', { ascending: false });

    if (!regs || !regs.length) {
      container.innerHTML = `
        <div style="text-align:center;font-size:.75em;color:var(--text-dim);
          padding:10px;background:rgba(255,255,255,0.03);border-radius:6px;">
          No registered fighters this week yet
        </div>`;
      return;
    }

    // Filter out bots and self
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

    // BUG FIX #1/#4: guard empty array before win/loss query
    const charIds = realPlayers.map(r => r.character_id).filter(Boolean);
    let records = {};
    charIds.forEach(id => { records[id] = { wins: 0, losses: 0 }; });

    if (charIds.length > 0) {
      // BUG FIX #8: added limit(200) — no unbounded query
      // BUG FIX #1: safer query using .in() separately instead of raw .or() string
      const { data: wonBattles } = await dbClient
        .from('arena_battles')
        .select('winner_id, attacker_id, defender_id')
        .in('attacker_id', charIds)
        .limit(200);

      const { data: defBattles } = await dbClient
        .from('arena_battles')
        .select('winner_id, attacker_id, defender_id')
        .in('defender_id', charIds)
        .limit(200);

      const allBattles = [...(wonBattles || []), ...(defBattles || [])];
      // Deduplicate by using a Set of IDs we've already counted
      const seen = new Set();
      allBattles.forEach(b => {
        const key = `${b.attacker_id}-${b.defender_id}`;
        if (seen.has(key)) return;
        seen.add(key);
        if (b.winner_id && records[b.winner_id]) records[b.winner_id].wins++;
        const loserId = b.winner_id === b.attacker_id ? b.defender_id : b.attacker_id;
        if (loserId && records[loserId]) records[loserId].losses++;
      });
    }

    const classIcons = {
      Warrior:'⚔️', Mage:'🔮', Rogue:'🗡️', Hunter:'🏹',
      Paladin:'✨', Necromancer:'💀', Shaman:'⚡', Berserker:'🐉',
    };

    // Build tournament lookup for bracket number display
    const tMap = {};
    tournaments.forEach(t => { tMap[t.id] = t; });

    let html = `
      <div style="font-family:var(--font-title);font-size:.68em;color:var(--text-dim);
        letter-spacing:2px;margin-bottom:8px;">
        ⚔️ REGISTERED FIGHTERS — Practice fee: ${formatNumber(fee)}g
      </div>`;

    realPlayers.forEach((reg, index) => {
      const snap      = reg.character_snapshot;
      const record    = records[reg.character_id] || { wins: 0, losses: 0 };
      const classIcon = classIcons[snap.class] || '👤';
      const combo     = reg.skill_combo || [];
      const rankLabel = reg.rank === 1 ? '🏆' : reg.rank === 2 ? '🥈' : reg.rank === 3 ? '🥉' : `#${index + 1}`;
      const winRate   = record.wins + record.losses > 0
        ? Math.round((record.wins / (record.wins + record.losses)) * 100)
        : 0;
      const bracketNum = tMap[reg.tournament_id]?.bracket_number || '?';

      html += `
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);
          border-radius:8px;padding:8px;margin-bottom:6px;">

          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <div style="font-size:1.3em;">${classIcon}</div>
            <div style="flex:1;">
              <div style="font-family:var(--font-title);font-size:.82em;color:var(--text);">
                ${rankLabel} ${snap.name}
              </div>
              <div style="font-size:.65em;color:var(--text-dim);">
                Lv.${snap.level} ${snap.class || ''} · Bracket ${bracketNum}
              </div>
            </div>
            <div style="text-align:right;font-size:.68em;">
              <div style="color:var(--green);">W: ${record.wins}</div>
              <div style="color:var(--red);">L: ${record.losses}</div>
              <div style="color:var(--text-dim);">${winRate}% WR</div>
            </div>
          </div>

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

          <button class="start-btn"
            onclick="initiatePracticeFight('${reg.character_id}', '${tierKey}', '${reg.tournament_id}')"
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
// BUG FIX #6: now accepts tournamentId directly from the fighter card
// so we always look up the right bracket (not just the most recent one)
// BUG FIX #7: saves practice result to arena_battles so win/loss records update
// BUG FIX #10: challenger snapshot capped to registration stats if registered,
// preventing live overpowered stats vs a stale registration snapshot
async function initiatePracticeFight(targetCharId, tierKey, tournamentId) {
  const fee      = getPracticeFee(tierKey);
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
    // BUG FIX #6: use the exact tournamentId from the fighter's bracket
    const { data: targetReg } = await dbClient
      .from('arena_registrations')
      .select('character_snapshot, skill_combo')
      .eq('tournament_id', tournamentId)
      .eq('character_id', targetCharId)
      .single();

    if (!targetReg || !targetReg.character_snapshot) {
      notify('Fighter not found!', 'var(--red)');
      return;
    }

    // Build challenger snapshot
    // BUG FIX #10: if challenger is registered, use their snapshot not live stats
    // prevents using current gear vs an old snapshot
    const { data: myReg } = await dbClient
      .from('arena_registrations')
      .select('character_snapshot, skill_combo')
      .eq('tournament_id', tournamentId)
      .eq('character_id', state.character_id)
      .single();

    const challengerSnapshot = myReg?.character_snapshot
      ? { ...myReg.character_snapshot, skillCombo: myReg.skill_combo || [] }
      : {
          character_id: state.character_id,
          name:         state.name,
          level:        state.level,
          class:        state.class,
          attackPower:  state.attackPower,
          maxHp:        state.maxHp,
          armor:        state.armor,
          hit:          state.hit,
          dodge:        state.dodge,
          crit:         state.crit,
          lifeSteal:    state.lifeSteal,
          skillCombo:   [],
          isBot:        false,
        };

    const targetSnapshot = {
      ...targetReg.character_snapshot,
      skillCombo: targetReg.skill_combo || [],
    };

    // Deduct fee
    state.gold -= fee;
    await dbClient.from('characters')
      .update({ gold: state.gold })
      .eq('id', state.character_id);

    // Pay 50% to target
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

    // BUG FIX #7: save practice battle to arena_battles so records update
    await dbClient.from('arena_battles').insert({
      attacker_id:       state.character_id,
      defender_id:       targetCharId,
      winner_id:         result.winnerId,
      attacker_snapshot: challengerSnapshot,
      defender_snapshot: targetSnapshot,
      battle_log:        result.log,
      battle_turns:      result.turns,
      points_change:     0, // practice fights don't award points
    });

    const won = result.winnerId === state.character_id;
    updateUI();
    addLog(
      `⚔️ Practice fight vs ${targetSnapshot.name} — ${won ? '✅ YOU WON!' : '❌ You lost!'}`,
      won ? 'legendary' : 'info'
    );

    // Show replay
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
