// ══════════════════════════════════════════
// ADVENTURER QUEST SYSTEM
// ══════════════════════════════════════════

// ── TIER GATE ──
// Which difficulty quests a player can access based on reputation title
function getAvailableQuestDifficulties() {
  const title = getCurrentTitle();
  if (!title)                      return ['easy'];
  if (title.id === 'baron')        return ['easy', 'normal'];
  if (title.id === 'chief')        return ['easy', 'normal', 'hard'];
  if (title.id === 'mayor')        return ['easy', 'normal', 'hard', 'epic'];
  if (title.id === 'viscount')     return ['easy', 'normal', 'hard', 'epic'];
  if (title.id === 'count')        return ['easy', 'normal', 'hard', 'epic', 'legendary'];
  return ['easy'];
}

// ── LOAD AVAILABLE QUESTS FROM DB ──
async function loadAvailableQuests() {
  const difficulties = getAvailableQuestDifficulties();
  const { data, error } = await dbClient
    .from('quests_available')
    .select('*')
    .in('difficulty', difficulties)
    .lte('min_level', state.level)
    .order('min_level', { ascending: true });

  if (error) { console.error('Load quests error:', error); return []; }
  return data || [];
}

// ── LOAD PLAYER'S ACTIVE QUESTS ──
async function loadActiveQuests() {
  if (!state.character_id) return [];
  const { data, error } = await dbClient
    .from('adventurer_quests')
    .select('*')
    .eq('character_id', state.character_id)
    .eq('claimed', false)
    .order('created_at', { ascending: false });

  if (error) { console.error('Load active quests error:', error); return []; }
  return data || [];
}

// ── ACCEPT A QUEST ──
async function acceptQuest(questId) {
  if (!state.character_id) { notify('Must be logged in!', 'var(--red)'); return; }

  try {
    // Check active quest limit (max 3)
    const active = await loadActiveQuests();
    const incomplete = active.filter(q => !q.completed);
    if (incomplete.length >= 3) {
      notify('⚠️ Max 3 active quests! Complete one first.', 'var(--gold)');
      return;
    }

    // Check not already accepted
    const alreadyAccepted = active.find(q => q.quest_id === questId && !q.claimed);
    if (alreadyAccepted) {
      notify('⚠️ Already accepted this quest!', 'var(--gold)');
      return;
    }

    // Get quest definition FIRST — needed for cooldown check and validation
    const { data: quest, error } = await dbClient
      .from('quests_available')
      .select('*')
      .eq('id', questId)
      .single();

    if (error || !quest) { notify('Quest not found!', 'var(--red)'); return; }

    // Check level requirement
    if (state.level < quest.min_level) {
      notify(`❌ Need Level ${quest.min_level} for this quest!`, 'var(--red)');
      return;
    }

    // Check difficulty gate
    const allowed = getAvailableQuestDifficulties();
    if (!allowed.includes(quest.difficulty)) {
      notify(`❌ Need higher reputation to accept ${quest.difficulty} quests!`, 'var(--red)');
      return;
    }

    // BUG FIX: cooldown check AFTER quest is fetched so repeat_cooldown_hours is available
    // BUG FIX: use maybeSingle() instead of single() — single() throws if no rows found
    const { data: recentClaim } = await dbClient
      .from('adventurer_quests')
      .select('updated_at')
      .eq('character_id', state.character_id)
      .eq('quest_id', questId)
      .eq('claimed', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentClaim) {
      const cooldownHours = quest.repeat_cooldown_hours || 24;
      const cooldownEnds  = new Date(new Date(recentClaim.updated_at).getTime() + cooldownHours * 3600000);
      const now           = new Date();
      if (now < cooldownEnds) {
        const hoursLeft = Math.ceil((cooldownEnds - now) / 3600000);
        notify(`⏳ Quest on cooldown! Available again in ${hoursLeft}h`, 'var(--gold)');
        return;
      }
    }

    // Insert into adventurer_quests
    const expiresAt = new Date();
    expiresAt.setUTCHours(expiresAt.getUTCHours() + 24);

    const { error: insertError } = await dbClient
      .from('adventurer_quests')
      .insert({
        character_id: state.character_id,
        quest_id:     quest.id,
        title:        quest.title,
        description:  quest.description,
        difficulty:   quest.difficulty,
        rep_reward:   quest.rep_reward,
        gold_reward:  quest.gold_reward,
        req_type:     quest.req_type,
        req_target:   quest.req_target,
        req_qty:      quest.req_qty,
        progress:     0,
        completed:    false,
        claimed:      false,
        expires_at:   expiresAt.toISOString(),
      });

    if (insertError) throw insertError;

    addLog(`📋 Quest accepted: ${quest.title}!`, 'gold');
    notify(`📋 ${quest.title} accepted!`, 'var(--gold)');
    renderAdventurerBoard();

  } catch(e) {
    notify('Failed to accept quest: ' + e.message, 'var(--red)');
    console.error('Accept quest error:', e);
  }
}

// ── CLAIM QUEST REWARD ──
async function claimQuestReward(adventurerQuestId) {
  try {
    const { data: aq, error } = await dbClient
      .from('adventurer_quests')
      .select('*')
      .eq('id', adventurerQuestId)
      .eq('character_id', state.character_id)
      .single();

    if (error || !aq) { notify('Quest not found!', 'var(--red)'); return; }
    if (!aq.completed) { notify('Quest not completed yet!', 'var(--red)'); return; }
    if (aq.claimed)    { notify('Already claimed!', 'var(--gold)'); return; }

    // Mark claimed
    await dbClient
      .from('adventurer_quests')
      .update({ claimed: true })
      .eq('id', adventurerQuestId);

    // Give rewards
    state.gold += aq.gold_reward;
    addReputation(aq.rep_reward);
    addLog(`✅ Quest complete: ${aq.title}! +${formatNumber(aq.gold_reward)}g +${aq.rep_reward} REP`, 'legendary');
    notify(`✅ ${aq.title} complete! +${formatNumber(aq.gold_reward)}g`, 'var(--gold)');
    playSound('snd-levelup');
    updateUI();
    savePlayerToSupabase();
    renderAdventurerBoard();

  } catch(e) {
    notify('Claim failed: ' + e.message, 'var(--red)');
    console.error('Claim quest error:', e);
  }
}

// ── ABANDON QUEST ──
async function abandonQuest(adventurerQuestId) {
  if (!confirm('Abandon this quest? Progress will be lost.')) return;
  try {
    await dbClient
      .from('adventurer_quests')
      .update({ claimed: true }) // mark claimed so it disappears
      .eq('id', adventurerQuestId)
      .eq('character_id', state.character_id);

    notify('Quest abandoned.', 'var(--text-dim)');
    renderAdventurerBoard();
  } catch(e) {
    notify('Failed to abandon: ' + e.message, 'var(--red)');
  }
}

// ══════════════════════════════════════════
// QUEST PROGRESS TRACKING
// ══════════════════════════════════════════

// Call this from endCombat() when an enemy is killed
async function trackQuestKill(enemyId, isBoss, stageId, goldEarned) {
  if (!state.character_id) return;
  try {
    const active = await loadActiveQuests();
    const incomplete = active.filter(q => !q.completed && !q.claimed);
    if (!incomplete.length) return;

    for (const aq of incomplete) {
      let newProgress = aq.progress;

      // Kill quest — matches specific enemy id
      if (aq.req_type === 'kill' && aq.req_target === enemyId) {
        newProgress++;
      }

      // Boss kill quest — matches specific boss id
      if (aq.req_type === 'boss' && isBoss && aq.req_target === enemyId) {
        newProgress++;
      }

      // Dungeon complete quest — matches stage number
      if (aq.req_type === 'dungeon' && stageId && String(aq.req_target) === String(stageId)) {
        newProgress++;
      }

      // Gold earned quest
      if (aq.req_type === 'gold' && goldEarned > 0) {
        newProgress += goldEarned;
      }

      if (newProgress === aq.progress) continue; // no change

      const completed = newProgress >= aq.req_qty;
      await dbClient
        .from('adventurer_quests')
        .update({ progress: Math.min(newProgress, aq.req_qty), completed })
        .eq('id', aq.id);

      if (completed && !aq.completed) {
        addLog(`✅ Quest complete: ${aq.title}! Go claim your reward!`, 'legendary');
        notify(`✅ ${aq.title} complete! Claim reward in Town!`, 'var(--gold)');
      }
    }
  } catch(e) { console.error('Track quest kill error:', e); }
}

// Call this from craftItem()
async function trackQuestCraft(itemName) {
  if (!state.character_id) return;
  try {
    const active = await loadActiveQuests();
    const craftQuests = active.filter(q =>
      !q.completed && !q.claimed && q.req_type === 'craft'
    );
    for (const aq of craftQuests) {
      const newProgress = aq.progress + 1;
      const completed = newProgress >= aq.req_qty;
      await dbClient
        .from('adventurer_quests')
        .update({ progress: Math.min(newProgress, aq.req_qty), completed })
        .eq('id', aq.id);
      if (completed && !aq.completed) {
        addLog(`✅ Quest complete: ${aq.title}! Go claim your reward!`, 'legendary');
        notify(`✅ ${aq.title} complete!`, 'var(--gold)');
      }
    }
  } catch(e) { console.error('Track quest craft error:', e); }
}

// Call this from buyoutAuction() and winning a bid
async function trackQuestAuction() {
  if (!state.character_id) return;
  try {
    const active = await loadActiveQuests();
    const auctionQuests = active.filter(q =>
      !q.completed && !q.claimed && q.req_type === 'auction'
    );
    for (const aq of auctionQuests) {
      const newProgress = aq.progress + 1;
      const completed = newProgress >= aq.req_qty;
      await dbClient
        .from('adventurer_quests')
        .update({ progress: Math.min(newProgress, aq.req_qty), completed })
        .eq('id', aq.id);
      if (completed && !aq.completed) {
        addLog(`✅ Quest complete: ${aq.title}! Go claim your reward!`, 'legendary');
        notify(`✅ ${aq.title} complete!`, 'var(--gold)');
      }
    }
  } catch(e) { console.error('Track quest auction error:', e); }
}

// ══════════════════════════════════════════
// RENDER ADVENTURER BOARD UI
// ══════════════════════════════════════════

async function renderAdventurerBoard() {
  const container = document.getElementById('adventurer-board');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:16px;">Loading quests...</div>';

  try {
    const [available, active] = await Promise.all([
      loadAvailableQuests(),
      loadActiveQuests(),
    ]);

    const incomplete  = active.filter(q => !q.claimed);
    const acceptedIds = new Set(incomplete.map(q => q.quest_id));

    // ── BUG FIX: fetch cooldown data — last claimed time per quest ──
    const { data: claimedHistory } = await dbClient
      .from('adventurer_quests')
      .select('quest_id, updated_at')
      .eq('character_id', state.character_id)
      .eq('claimed', true)
      .order('updated_at', { ascending: false });

    // Build cooldown map: quest_id → last claimed timestamp
    const cooldownMap = {};
    (claimedHistory || []).forEach(cq => {
      if (!cooldownMap[cq.quest_id]) cooldownMap[cq.quest_id] = cq.updated_at;
    });

    const diffColors = {
      easy:      '#22c55e',
      normal:    '#3b82f6',
      hard:      '#f97316',
      epic:      '#a855f7',
      legendary: '#ff9900',
    };

    const diffLabels = {
      easy:      '🌱 Easy',
      normal:    '⚔️ Normal',
      hard:      '🔥 Hard',
      epic:      '💀 Epic',
      legendary: '👑 Legendary',
    };

    const currentTitle = getCurrentTitle();
    const nextTitle    = getNextTitle();
    const now          = new Date();

    let html = '';

    // ── Reputation status banner ──
    html += `
      <div style="padding:10px 12px;margin-bottom:12px;
        background:rgba(168,85,247,0.08);border:1px solid rgba(168,85,247,0.2);
        border-radius:var(--radius);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
          <div style="font-family:var(--font-title);font-size:.78em;color:var(--purple);">
            👑 ${currentTitle ? currentTitle.label : 'No Title'}
          </div>
          <div style="font-size:.68em;color:var(--text-dim);">
            ${formatNumber(state.reputation)} REP
          </div>
        </div>
        ${nextTitle ? `
          <div style="height:4px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden;">
            <div style="height:100%;background:var(--purple);border-radius:2px;
              width:${Math.min(100,((state.reputation-(currentTitle?.req||0))/(nextTitle.req-(currentTitle?.req||0)))*100)}%;">
            </div>
          </div>
          <div style="font-size:.62em;color:var(--text-dim);margin-top:3px;">
            ${formatNumber(nextTitle.req - state.reputation)} REP until ${nextTitle.label}
          </div>` : `
          <div style="font-size:.68em;color:var(--legendary);">⭐ MAX TITLE REACHED</div>`}
      </div>`;

    // ── Active quests ──
    if (incomplete.length) {
      html += `
        <div style="font-family:var(--font-title);font-size:.7em;color:var(--gold);
          letter-spacing:2px;margin-bottom:8px;">
          📋 ACTIVE QUESTS (${incomplete.length}/3)
        </div>`;

      incomplete.forEach(aq => {
        const pct       = Math.min(100, Math.floor((aq.progress / aq.req_qty) * 100));
        const color     = diffColors[aq.difficulty] || 'var(--gold)';
        const isExpired = aq.expires_at && new Date(aq.expires_at) < now;
        const timeLeft  = aq.expires_at ? Math.max(0, new Date(aq.expires_at) - now) : 0;
        const hoursLeft = Math.floor(timeLeft / 3600000);
        const minsLeft  = Math.floor((timeLeft % 3600000) / 60000);

        html += `
          <div style="background:rgba(255,255,255,0.03);border:1px solid ${color}44;
            border-radius:var(--radius);padding:10px;margin-bottom:8px;">

            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <div style="font-family:var(--font-title);font-size:.78em;color:${color};">
                ${aq.title}
              </div>
              <div style="font-size:.62em;color:${isExpired?'var(--red)':'var(--text-dim)'};">
                ${isExpired ? '❌ Expired' : `⏱️ ${hoursLeft}h ${minsLeft}m`}
              </div>
            </div>

            <div style="font-size:.72em;color:var(--text-dim);margin-bottom:6px;">
              ${aq.description}
            </div>

            <!-- Progress bar -->
            <div style="height:6px;background:rgba(255,255,255,0.07);
              border-radius:3px;overflow:hidden;margin-bottom:4px;">
              <div style="height:100%;width:${pct}%;background:${color};
                border-radius:3px;transition:width .3s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:.65em;
              color:var(--text-dim);margin-bottom:8px;">
              <span>${aq.progress} / ${aq.req_qty}</span>
              <span>${pct}%</span>
            </div>

            <!-- Rewards -->
            <div style="display:flex;gap:8px;margin-bottom:8px;">
              <span style="font-size:.65em;color:var(--gold);
                background:rgba(255,153,0,0.08);border-radius:4px;padding:2px 6px;">
                💰 ${formatNumber(aq.gold_reward)}g
              </span>
              <span style="font-size:.65em;color:var(--purple);
                background:rgba(168,85,247,0.08);border-radius:4px;padding:2px 6px;">
                👑 +${aq.rep_reward} REP
              </span>
            </div>

            <!-- Action buttons -->
            <div style="display:flex;gap:6px;">
              ${aq.completed ? `
                <button class="start-btn" onclick="claimQuestReward('${aq.id}')"
                  style="flex:2;padding:7px;font-size:.72em;
                  background:linear-gradient(135deg,rgba(255,153,0,0.2),rgba(255,153,0,0.1));
                  border-color:var(--gold);color:var(--gold);">
                  ✅ Claim Reward
                </button>` : `
                <div style="flex:2;font-size:.68em;color:var(--text-dim);
                  padding:7px;text-align:center;">
                  ${isExpired ? '❌ Quest expired' : '⚔️ In progress...'}
                </div>`}
              <button class="start-btn red-btn" onclick="abandonQuest('${aq.id}')"
                style="flex:1;padding:7px;font-size:.68em;">
                🗑️ Drop
              </button>
            </div>
          </div>`;
      });
    }

    // ── Available quest board ──
    const allowedDiffs = getAvailableQuestDifficulties();
    const notAccepted  = available.filter(q => !acceptedIds.has(q.id));

    html += `
      <div style="font-family:var(--font-title);font-size:.7em;color:var(--text-dim);
        letter-spacing:2px;margin:12px 0 8px;">
        📌 QUEST BOARD
      </div>`;

    if (!notAccepted.length) {
      html += `
        <div style="text-align:center;color:var(--text-dim);
          font-size:.78em;padding:16px;font-style:italic;">
          All available quests accepted!
        </div>`;
    } else {
      // Group by difficulty
      const grouped = {};
      notAccepted.forEach(q => {
        if (!grouped[q.difficulty]) grouped[q.difficulty] = [];
        grouped[q.difficulty].push(q);
      });

      const diffOrder = ['easy', 'normal', 'hard', 'epic', 'legendary'];
      diffOrder.forEach(diff => {
        if (!grouped[diff]) return;
        const color    = diffColors[diff] || 'var(--gold)';
        const label    = diffLabels[diff] || diff;
        const isLocked = !allowedDiffs.includes(diff);

        html += `
          <div style="font-size:.65em;color:${color};font-family:var(--font-title);
            letter-spacing:1px;margin:8px 0 4px;opacity:${isLocked?'0.4':'1'};">
            ${label} ${isLocked ? '🔒' : ''}
          </div>`;

        grouped[diff].forEach(q => {
          const locked = isLocked || state.level < q.min_level;

          // ── Cooldown check ──
          const lastClaim    = cooldownMap[q.id];
          const cooldownHrs  = q.repeat_cooldown_hours || 24;
          const cooldownEnds = lastClaim
            ? new Date(new Date(lastClaim).getTime() + cooldownHrs * 3600000)
            : null;
          const onCooldown   = cooldownEnds && now < cooldownEnds;
          const cdHoursLeft  = onCooldown
            ? Math.ceil((cooldownEnds - now) / 3600000)
            : 0;

          html += `
            <div style="background:rgba(255,255,255,0.02);
              border:1px solid ${locked||onCooldown?'rgba(255,255,255,0.06)':color+'33'};
              border-radius:var(--radius);padding:8px;margin-bottom:6px;
              opacity:${locked||onCooldown?'0.5':'1'};">

              <div style="display:flex;align-items:center;
                justify-content:space-between;margin-bottom:3px;">
                <div style="font-family:var(--font-title);font-size:.75em;
                  color:${locked||onCooldown?'var(--text-dim)':color};">
                  ${q.title}
                </div>
                <div style="font-size:.60em;color:var(--text-dim);">
                  Lv.${q.min_level}+
                </div>
              </div>

              <div style="font-size:.68em;color:var(--text-dim);margin-bottom:6px;">
                ${q.description}
                <span style="color:var(--text-dim);"> (0/${q.req_qty})</span>
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                <div style="display:flex;gap:6px;">
                  <span style="font-size:.62em;color:var(--gold);
                    background:rgba(255,153,0,0.08);border-radius:4px;padding:2px 5px;">
                    💰 ${formatNumber(q.gold_reward)}g
                  </span>
                  <span style="font-size:.62em;color:var(--purple);
                    background:rgba(168,85,247,0.08);border-radius:4px;padding:2px 5px;">
                    👑 +${q.rep_reward}
                  </span>
                </div>

                ${locked ? `
                  <div style="font-size:.62em;color:var(--text-dim);">
                    ${isLocked ? `Need ${diff} rep title` : `Need Lv.${q.min_level}`}
                  </div>
                ` : onCooldown ? `
                  <div style="font-size:.62em;color:var(--red);">
                    ⏳ ${cdHoursLeft}h cooldown
                  </div>
                ` : `
                  <button class="start-btn" onclick="acceptQuest('${q.id}')"
                    style="padding:5px 12px;font-size:.65em;
                    border-color:${color}88;color:${color};">
                    + Accept
                  </button>`}
              </div>
            </div>`;
        });
      });
    }

    container.innerHTML = html;

  } catch(e) {
    console.error('Render adventurer board error:', e);
    container.innerHTML = '<div style="text-align:center;color:var(--red);padding:16px;">Failed to load quests.</div>';
  }
}