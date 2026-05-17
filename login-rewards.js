// ══════════════════════════════════════════
// LOGIN REWARD SYSTEM
// ══════════════════════════════════════════
async function checkLoginReward() {
  if (!state.character_id) return;

  try {
    const loginRewards = GAME_CONFIG.login_rewards;
    if (!loginRewards || !loginRewards.length) return;

    const today = new Date().toISOString().split('T')[0];
    const alreadyClaimed = state.lastLoginDate === today;

    if (!alreadyClaimed) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newStreak = state.lastLoginDate === yesterdayStr
        ? (state.loginStreak || 0) + 1
        : 1;
      if (newStreak > 7) newStreak = 1;

      const newTotalDays = (state.totalLoginDays || 0) + 1;
      const reward = loginRewards.find(r => r.day === newStreak) || loginRewards[0];

      state.soulCrystals = (state.soulCrystals || 0) + (reward.crystals || 0);
      if (reward.gold) state.gold += reward.gold;

      let rewardItem = null;
      if (reward.item_rarity) {
        const slots = ['weapon','armor','helmet','boots','ring','amulet'];
        const slot = reward.item_slot || slots[Math.floor(Math.random() * slots.length)];
        const stageId = reward.item_rarity === 'legendary' ? 10
                      : reward.item_rarity === 'epic'      ? 7 : 5;
        rewardItem = mkEquipDrop(slot, reward.item_rarity, stageId);
        state.inventory.push(rewardItem);
      }

      state.loginStreak    = newStreak;
      state.lastLoginDate  = today;
      state.totalLoginDays = newTotalDays;

      await savePlayerToSupabase();
      updateUI();

      window._pendingLoginReward = { reward, day: newStreak, item: rewardItem, alreadyClaimed: false };

    } else {
      const currentStreak = state.loginStreak || 1;
      const reward = loginRewards.find(r => r.day === currentStreak) || loginRewards[0];
      window._pendingLoginReward = { reward, day: currentStreak, item: null, alreadyClaimed: true };
    }

  } catch(e) {
    console.error('Login reward error:', e);
  }
}

function showLoginRewardPopup(reward, day, item, alreadyClaimed = false) {
  const existing = document.getElementById('login-reward-overlay');
  if (existing) existing.remove();

  const rewards = GAME_CONFIG.login_rewards || [];

  const daysHtml = rewards.map(r => {
    const isClaimed = r.day < day;
    const isToday   = r.day === day;
    const border    = isToday  ? 'rgba(255,153,0,0.6)'  : 'rgba(255,255,255,0.08)';
    const bg        = isToday  ? 'rgba(255,153,0,0.12)' : 'rgba(255,255,255,0.03)';
    const opacity   = isClaimed ? '0.4' : isToday ? '1' : '0.5';
    const icon      = isClaimed ? '✅' : isToday ? '🎁' : r.day === 7 ? '⭐' : '🔒';
    const dayLabel  = isToday
      ? `<div style="font-size:.5em;color:#ffaa00;">TODAY</div>`
      : `<div style="font-size:.5em;color:rgba(255,255,255,0.4);">Day ${r.day}</div>`;
    const itemLine  = r.item_rarity
      ? `<div style="font-size:.5em;color:${r.item_rarity==='legendary'?'#ff9900':r.item_rarity==='epic'?'#a855f7':'#4a9eff'};">${r.item_rarity[0].toUpperCase()}⚔️</div>`
      : '';
    const goldLine  = r.gold ? `<div style="font-size:.5em;color:#ffaa00;">+${r.gold/1000}kg</div>` : '';
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px;
        padding:7px 3px;border-radius:8px;
        border:1px solid ${border};background:${bg};opacity:${opacity};">
        ${dayLabel}
        <div style="font-size:1em;">${icon}</div>
        <div style="font-size:.52em;color:#a855f7;">${r.crystals}💠</div>
        ${goldLine}${itemLine}
      </div>`;
  }).join('');

  const rewardBadges = `
    <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">
      ${reward.crystals ? `
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;
          padding:12px 16px;border-radius:8px;
          background:rgba(168,85,247,0.08);border:1px solid rgba(168,85,247,0.2);">
          <div style="font-size:1.6em;">💠</div>
          <div style="font-family:'Cinzel',serif;font-size:.85em;color:#a855f7;">+${reward.crystals}</div>
          <div style="font-size:.62em;color:rgba(255,255,255,0.4);">Soul Crystals</div>
        </div>` : ''}
      ${reward.gold ? `
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;
          padding:12px 16px;border-radius:8px;
          background:rgba(255,153,0,0.08);border:1px solid rgba(255,153,0,0.2);">
          <div style="font-size:1.6em;">💰</div>
          <div style="font-family:'Cinzel',serif;font-size:.85em;color:#ffaa00;">+${reward.gold.toLocaleString()}g</div>
          <div style="font-size:.62em;color:rgba(255,255,255,0.4);">Gold</div>
        </div>` : ''}
      ${item ? `
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;
          padding:12px 16px;border-radius:8px;
          background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);">
          <div style="font-size:1.6em;">${item.name.split(' ')[0]}</div>
          <div style="font-family:'Cinzel',serif;font-size:.75em;
            color:${RARITY[item.rarity]?.color||'#fff'};">
            ${item.name.replace(/^[^\s]+ /,'').substring(0,16)}
          </div>
          <div style="font-size:.62em;color:${RARITY[item.rarity]?.color||'#fff'};">
            ${RARITY[item.rarity]?.label||''}
          </div>
        </div>` : ''}
    </div>`;

  const overlay = document.createElement('div');
  overlay.id = 'login-reward-overlay';
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;`;

  overlay.innerHTML = `
    <div style="background:linear-gradient(135deg,rgb(8,8,40),rgb(20,10,60));
      border:1px solid rgba(255,153,0,0.4);border-radius:12px;
      padding:24px;max-width:360px;width:100%;color:#fff;text-align:center;">
      <div style="font-size:2em;margin-bottom:4px;">🎁</div>
      <div style="font-family:'Cinzel',serif;font-size:1em;color:#ffaa00;letter-spacing:3px;">
        DAILY LOGIN REWARD
      </div>
      <div style="font-size:.72em;color:rgba(255,255,255,0.4);margin-top:4px;margin-bottom:16px;">
        🔥 ${day} Day Streak ${day === 7 ? '— MAX!' : `— ${7 - day} days until Legendary`}
      </div>
      <div style="height:1px;background:rgba(255,153,0,0.2);margin-bottom:16px;"></div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:20px;">
        ${daysHtml}
      </div>
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);
        border-radius:8px;padding:14px;margin-bottom:16px;">
        <div style="font-family:'Cinzel',serif;font-size:.65em;color:rgba(255,255,255,0.4);
          letter-spacing:2px;margin-bottom:12px;">TODAY'S REWARDS</div>
        ${rewardBadges}
      </div>
      ${alreadyClaimed
        ? `<button onclick="document.getElementById('login-reward-overlay').remove();"
            style="width:100%;padding:12px;border:none;border-radius:8px;cursor:pointer;
            background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);
            color:rgba(255,255,255,0.5);font-family:'Cinzel',serif;font-size:.85em;letter-spacing:2px;">
            ✓ Already Claimed — Close
          </button>`
        : `<button onclick="document.getElementById('login-reward-overlay').remove();renderInventory();"
            style="width:100%;padding:12px;border:none;border-radius:8px;cursor:pointer;
            background:linear-gradient(135deg,rgba(255,153,0,0.3),rgba(255,153,0,0.15));
            border:1px solid rgba(255,153,0,0.5);color:#ffaa00;
            font-family:'Cinzel',serif;font-size:.85em;letter-spacing:2px;">
            ✨ CLAIM REWARD
          </button>`}
      <div style="margin-top:10px;font-size:.62em;color:rgba(255,255,255,0.25);">
        Resets daily at midnight · Streak lost if you miss a day
      </div>
    </div>`;

  document.body.appendChild(overlay);
}