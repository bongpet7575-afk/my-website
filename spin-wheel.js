// ── SPINNING WHEEL SYSTEM ──

const WHEEL_PRIZES = [
  { id: 'normal_gold_small',  label: '💰 50,000g',        type: 'gold',      value: 50000,  weight: 30, color: '#f0c040' },
  { id: 'normal_gold_medium', label: '💰 150,000g',       type: 'gold',      value: 150000, weight: 15, color: '#f0c040' },
  { id: 'normal_gold_large',  label: '💰 300,000g',       type: 'gold',      value: 300000, weight: 5,  color: '#f0c040' },
  { id: 'normal_enhance_1',   label: '⚗️ Enhance Orb',    type: 'material',  value: 1,      weight: 25, color: '#22c55e' },
  { id: 'normal_enhance_3',   label: '⚗️ 3 Enhance Orbs', type: 'material',  value: 3,      weight: 10, color: '#22c55e' },
  { id: 'normal_rare_gear',   label: '📦 Rare Gear',      type: 'equipment', value: 'rare', weight: 10, color: '#3b82f6' },
  { id: 'normal_epic_gear',   label: '⚔️ Epic Gear',      type: 'equipment', value: 'epic', weight: 4,  color: '#a855f7' },
  { id: 'normal_title',       label: '👑 Lucky Title',    type: 'title',     value: 1,      weight: 1,  color: '#ff6644' },
];

const PREMIUM_WHEEL_PRIZES = [
  { id: 'premium_gold_large',  label: '💰 1,000,000g',     type: 'gold',      value: 1000000,   weight: 15, color: '#f0c040' },
  { id: 'premium_gold_mega',   label: '💰 3,000,000g',     type: 'gold',      value: 3000000,   weight: 5,  color: '#f0c040' },
  { id: 'premium_crystal_50',  label: '💎 50 Crystals',    type: 'crystals',  value: 50,        weight: 20, color: '#a855f7' },
  { id: 'premium_crystal_100', label: '💎 100 Crystals',   type: 'crystals',  value: 100,       weight: 8,  color: '#a855f7' },
  { id: 'premium_enhance_3',   label: '⚗️ 3 Enhance Orbs', type: 'material',  value: 3,         weight: 15, color: '#22c55e' },
  { id: 'premium_epic_gear',   label: '⚔️ Epic Gear',      type: 'equipment', value: 'epic',    weight: 15, color: '#a855f7' },
  { id: 'premium_legend_gear', label: '🌟 Legendary Gear', type: 'equipment', value: 'legendary',weight: 3, color: '#ff9900' },
  { id: 'premium_gold_mult',   label: '⚡ 2x Gold 24h',    type: 'gold_mult', value: 2,         weight: 12, color: '#ff9900' },
  { id: 'premium_title',       label: '👑 Rare Title',     type: 'title',     value: 'premium', weight: 5,  color: '#ff6644' },
  { id: 'premium_soul_orb',    label: '🔮 Soul Orb',       type: 'soul_orb',  value: 150,       weight: 2,  color: '#ec4899' },
];

const NORMAL_SPIN_COST  = window.NORMAL_SPIN_COST  || 500000;
const PREMIUM_SPIN_COST = window.PREMIUM_SPIN_COST || 200;

function getWeightedPrize(prizes) {
  const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const prize of prizes) {
    rand -= prize.weight;
    if (rand <= 0) return prize;
  }
  return prizes[0];
}

// Active wheel mode — 'normal' or 'premium'
let spinMode = 'normal';

function openSpinWheel() {
  if (document.getElementById('spin-overlay')) return;
  spinMode = 'normal';

  const overlay = document.createElement('div');
  overlay.id = 'spin-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:9999;
    display:flex;align-items:center;justify-content:center;
    font-family:'Cinzel',serif;
  `;

  overlay.innerHTML = `
    <div style="
      background:#0d0a06;border:1px solid #3a2a0a;
      width:min(480px,95vw);
      position:relative;box-shadow:0 0 80px rgba(180,120,20,0.2);
      overflow:hidden;
    ">
      <!-- Header -->
      <div style="
        background:linear-gradient(135deg,#1a1205,#0d0a06);
        padding:18px 24px;border-bottom:1px solid #2a1a05;
        display:flex;justify-content:space-between;align-items:center;
      ">
        <div>
          <div style="color:#c9a84c;font-size:15px;font-weight:900;letter-spacing:4px;">🎰 FORTUNE WHEEL</div>
          <div style="color:#6a5a3a;font-size:11px;letter-spacing:2px;margin-top:2px;">Spin to win legendary rewards</div>
        </div>
        <button onclick="closeSpinWheel()" style="
          background:transparent;border:1px solid #3a2a0a;
          color:#6a5a3a;font-family:'Cinzel',serif;font-size:11px;
          padding:6px 12px;cursor:pointer;
        ">✕</button>
      </div>

      <div style="padding:20px 24px;text-align:center;">

        <!-- Mode tabs -->
        <div style="display:flex;gap:0;margin-bottom:16px;border:1px solid #3a2a0a;overflow:hidden;">
          <button id="tab-normal" onclick="switchSpinMode('normal')" style="
            flex:1;padding:10px;font-family:'Cinzel',serif;font-size:11px;
            letter-spacing:2px;cursor:pointer;border:none;transition:all .2s;
            background:linear-gradient(135deg,#8a6a1a,#c9a84c);color:#0a0806;font-weight:900;
          ">⚔️ NORMAL<br><span style="font-size:9px;opacity:.8;">${formatNumber(NORMAL_SPIN_COST)} GOLD</span></button>
          <button id="tab-premium" onclick="switchSpinMode('premium')" style="
            flex:1;padding:10px;font-family:'Cinzel',serif;font-size:11px;
            letter-spacing:2px;cursor:pointer;border:none;transition:all .2s;
            background:#0d0a06;color:#a855f7;border-left:1px solid #3a2a0a;
          ">💎 PREMIUM<br><span style="font-size:9px;opacity:.8;">${PREMIUM_SPIN_COST} CRYSTALS</span></button>
        </div>

        <!-- Currency display -->
        <div id="spin-currency-display" style="
          display:inline-block;
          background:rgba(240,192,64,0.1);border:1px solid rgba(240,192,64,0.3);
          padding:8px 20px;margin-bottom:16px;
          font-size:12px;color:#f0c040;letter-spacing:2px;
        ">
          💰 <span id="spin-currency-val">${formatNumber(state.gold)}</span> GOLD
        </div>

        <!-- Wheel container -->
        <div style="position:relative;width:280px;height:280px;margin:0 auto 16px;">
          <div style="
            position:absolute;top:-12px;left:50%;transform:translateX(-50%);
            width:0;height:0;
            border-left:12px solid transparent;
            border-right:12px solid transparent;
            border-top:24px solid #f0c040;
            z-index:10;filter:drop-shadow(0 0 8px rgba(240,192,64,0.8));
          "></div>
          <canvas id="spin-canvas" width="280" height="280" style="
            border-radius:50%;
            box-shadow:0 0 40px rgba(180,120,20,0.3),0 0 0 3px #3a2a0a;
          "></canvas>
          <div style="
            position:absolute;top:50%;left:50%;
            transform:translate(-50%,-50%);
            width:44px;height:44px;border-radius:50%;
            background:radial-gradient(circle,#c9a84c,#8a6a1a);
            border:3px solid #0d0a06;
            display:flex;align-items:center;justify-content:center;
            font-size:18px;z-index:5;
            box-shadow:0 0 20px rgba(180,120,20,0.5);
          ">⚔️</div>
        </div>

        <!-- Result display -->
        <div id="spin-result" style="
          min-height:48px;margin-bottom:14px;
          display:flex;align-items:center;justify-content:center;
        ">
          <div style="color:#6a5a3a;font-size:11px;letter-spacing:2px;">Spin to reveal your prize!</div>
        </div>

        <!-- Spin button -->
        <button id="spin-btn" onclick="doSpin()" style="
          width:100%;
          background:linear-gradient(135deg,#8a6a1a,#c9a84c);
          border:none;color:#0a0806;
          font-family:'Cinzel',serif;font-size:14px;font-weight:900;
          letter-spacing:4px;padding:14px;cursor:pointer;transition:all 0.2s;
        ">⚡ SPIN — ${formatNumber(NORMAL_SPIN_COST)}g</button>

        <!-- Prize list -->
        <div id="prize-list" style="margin-top:14px;text-align:left;">
          ${buildPrizeList(WHEEL_PRIZES)}
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSpinWheel(); });
  drawWheel(0, WHEEL_PRIZES);
}

function buildPrizeList(prizes) {
  const sorted = [...prizes].sort((a, b) => a.weight - b.weight);
  return `
    <div style="font-size:9px;color:#6a5a3a;letter-spacing:2px;margin-bottom:6px;">POSSIBLE PRIZES</div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;">
      ${sorted.map(p => `
        <div style="
          font-size:10px;padding:3px 7px;
          background:rgba(255,255,255,0.03);border:1px solid ${p.color}44;
          color:${p.color};letter-spacing:1px;
        ">${p.label}</div>
      `).join('')}
    </div>`;
}

window.switchSpinMode = function(mode) {
  spinMode = mode;
  const isPremium = mode === 'premium';
  const cost = isPremium
  ? (window.PREMIUM_SPIN_COST || 200)
  : (window.NORMAL_SPIN_COST  || 500000);

const prizes = isPremium
  ? (window.PREMIUM_WHEEL_PRIZES || PREMIUM_WHEEL_PRIZES)
  : (window.WHEEL_PRIZES         || WHEEL_PRIZES);
  const crystals = state.soulCrystals || 0;
  const gold = state.gold || 0;

  // Tab styles
  document.getElementById('tab-normal').style.cssText = `
    flex:1;padding:10px;font-family:'Cinzel',serif;font-size:11px;
    letter-spacing:2px;cursor:pointer;border:none;transition:all .2s;
    ${!isPremium
      ? 'background:linear-gradient(135deg,#8a6a1a,#c9a84c);color:#0a0806;font-weight:900;'
      : 'background:#0d0a06;color:#6a5a3a;border-right:1px solid #3a2a0a;'}
  `;
  document.getElementById('tab-premium').style.cssText = `
    flex:1;padding:10px;font-family:'Cinzel',serif;font-size:11px;
    letter-spacing:2px;cursor:pointer;border:none;transition:all .2s;
    ${isPremium
      ? 'background:linear-gradient(135deg,#3b1d6e,#a855f7);color:#fff;font-weight:900;'
      : 'background:#0d0a06;color:#a855f7;border-left:1px solid #3a2a0a;'}
  `;

  // Currency display
  const currencyEl = document.getElementById('spin-currency-display');
  const valEl = document.getElementById('spin-currency-val');
  if (currencyEl && valEl) {
    if (isPremium) {
      currencyEl.style.background = 'rgba(168,85,247,0.1)';
      currencyEl.style.borderColor = 'rgba(168,85,247,0.3)';
      currencyEl.style.color = '#a855f7';
      currencyEl.innerHTML = `💎 <span id="spin-currency-val">${formatNumber(crystals)}</span> CRYSTALS`;
    } else {
      currencyEl.style.background = 'rgba(240,192,64,0.1)';
      currencyEl.style.borderColor = 'rgba(240,192,64,0.3)';
      currencyEl.style.color = '#f0c040';
      currencyEl.innerHTML = `💰 <span id="spin-currency-val">${formatNumber(gold)}</span> GOLD`;
    }
  }

  // Spin button
  const btn = document.getElementById('spin-btn');
  const canAfford = isPremium ? crystals >= cost : gold >= cost;
  if (btn) {
    btn.disabled = !canAfford;
    btn.style.opacity = canAfford ? '1' : '0.4';
    btn.style.cursor = canAfford ? 'pointer' : 'not-allowed';
    if (isPremium) {
      btn.style.background = canAfford
        ? 'linear-gradient(135deg,#3b1d6e,#a855f7)'
        : '#1a1205';
      btn.style.color = '#fff';
      btn.textContent = canAfford
        ? `💎 PREMIUM SPIN — ${cost} Crystals`
        : `❌ NOT ENOUGH CRYSTALS (need ${cost})`;
    } else {
      btn.style.background = canAfford
        ? 'linear-gradient(135deg,#8a6a1a,#c9a84c)'
        : '#1a1205';
      btn.style.color = canAfford ? '#0a0806' : '#6a5a3a';
      btn.textContent = canAfford
        ? `⚡ SPIN — ${formatNumber(cost)}g`
        : `❌ NOT ENOUGH GOLD (need ${formatNumber(cost)}g)`;
    }
  }

  // Redraw wheel and prize list
  drawWheel(0, prizes);
  const prizeListEl = document.getElementById('prize-list');
  if (prizeListEl) prizeListEl.innerHTML = buildPrizeList(prizes);

  // Reset result
  const resultEl = document.getElementById('spin-result');
  if (resultEl) resultEl.innerHTML = `<div style="color:#6a5a3a;font-size:11px;letter-spacing:2px;">Spin to reveal your prize!</div>`;
};

function drawWheel(rotation, prizes) {
  const canvas = document.getElementById('spin-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = 140, cy = 140, r = 136;
  const sliceAngle = (2 * Math.PI) / prizes.length;

  ctx.clearRect(0, 0, 280, 280);

  prizes.forEach((prize, i) => {
    const startAngle = rotation + i * sliceAngle;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? '#1a1205' : '#0d0a06';
    ctx.fill();

    // Color rim
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.lineWidth = 6;
    ctx.strokeStyle = prize.color;
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Divider
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * Math.cos(startAngle), cy + r * Math.sin(startAngle));
    ctx.strokeStyle = '#3a2a0a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = 'right';

    const parts = prize.label.split(' ');
    const emoji = parts[0];
    const text = parts.slice(1).join(' ');

    ctx.font = '13px serif';
    ctx.fillStyle = prize.color;
    ctx.shadowColor = prize.color;
    ctx.shadowBlur = 4;
    ctx.fillText(emoji, r - 8, 3);

    ctx.font = 'bold 9px Cinzel, serif';
    ctx.fillStyle = '#d4b896';
    ctx.shadowBlur = 0;
    ctx.fillText(text, r - 24, 3);

    ctx.restore();
  });

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.strokeStyle = '#3a2a0a';
  ctx.lineWidth = 2;
  ctx.stroke();
}

let isSpinning = false;

async function doSpin() {
  if (isSpinning) return;

  const isPremium = spinMode === 'premium';
  const cost = isPremium ? PREMIUM_SPIN_COST : NORMAL_SPIN_COST;

  // Client-side pre-check (UX only — server validates too)
  if (isPremium && (state.soulCrystals || 0) < cost) {
    notify(`❌ Not enough crystals! Need ${cost}.`, 'var(--red)');
    return;
  }
  if (!isPremium && (state.gold || 0) < cost) {
    notify(`❌ Not enough gold! Need ${formatNumber(cost)}g.`, 'var(--red)');
    return;
  }

  isSpinning = true;
  const btn = document.getElementById('spin-btn');
  btn.disabled = true;
  btn.textContent = '⏳ SPINNING...';

  // Call RPC — server deducts cost AND rolls the prize
  const { data, error } = await dbClient.rpc('process_spin', {
    character_id: state.character_id,
    spin_mode: spinMode,
  });

  if (error || data?.error) {
    notify(`❌ ${data?.error || 'Spin failed'}`, 'var(--red)');
    isSpinning = false;
    btn.disabled = false;
    btn.textContent = isPremium ? `💎 SPIN — ${cost} Crystals` : `⚡ SPIN — ${formatNumber(cost)}g`;
    return;
  }

  // Deduct from local state to match server
  if (isPremium) {
    state.soulCrystals = Math.max(0, (state.soulCrystals || 0) - cost);
  } else {
    state.gold = Math.max(0, (state.gold || 0) - cost);
  }

  // Update currency display
  const valEl = document.getElementById('spin-currency-val');
  if (valEl) valEl.textContent = isPremium ? formatNumber(state.soulCrystals) : formatNumber(state.gold);

  // Build prize from server response — client array only used for animation position
  const prizes = isPremium
    ? (window.PREMIUM_WHEEL_PRIZES || PREMIUM_WHEEL_PRIZES)
    : (window.WHEEL_PRIZES || WHEEL_PRIZES);

  const prize = {
    id:    data.prize_id,
    type:  data.prize_type,
    value: data.prize_value,
    label: data.prize_label || data.prize_id,
    color: data.prize_color || '#f0c040',
  };

  const prizeIndex = Math.max(0, prizes.findIndex(p => p.id === data.prize_id));
  const sliceAngle = (2 * Math.PI) / prizes.length;

  // Animate wheel to land on server-determined prize
  const targetSlice = prizeIndex * sliceAngle + sliceAngle / 2;
  const extraSpins = (5 + Math.floor(Math.random() * 5)) * 2 * Math.PI;
  const targetAngle = extraSpins + (2 * Math.PI - targetSlice) - Math.PI / 2;
  const duration = 4000;
  const start = performance.now();

  function animate(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    drawWheel(targetAngle * eased, prizes);
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      isSpinning = false;
      showSpinResult(prize, isPremium);
      applySpinReward(prize, isPremium);
    }
  }

  requestAnimationFrame(animate);
}

function showSpinResult(prize, isPremium) {
  const resultEl = document.getElementById('spin-result');
  if (!resultEl) return;

  resultEl.innerHTML = `
    <div style="
      background:rgba(180,120,20,0.1);border:1px solid ${prize.color};
      padding:12px 20px;width:100%;
      animation:fadeIn 0.5s ease;
    ">
      <div style="font-size:22px;margin-bottom:4px;">${prize.label.split(' ')[0]}</div>
      <div style="color:${prize.color};font-size:13px;font-weight:900;letter-spacing:2px;">
        ${prize.label.split(' ').slice(1).join(' ')}
      </div>
      <div style="color:#6a5a3a;font-size:11px;margin-top:4px;letter-spacing:1px;">
        ${isPremium ? '💎 Premium reward claimed!' : 'Added to your account!'}
      </div>
    </div>
  `;

  // Re-enable button
  const btn = document.getElementById('spin-btn');
  const isPrem = spinMode === 'premium';
  const cost = isPrem ? PREMIUM_SPIN_COST : NORMAL_SPIN_COST;
  const canAfford = isPrem
    ? (state.soulCrystals || 0) >= cost
    : (state.gold || 0) >= cost;

  if (btn) {
    btn.disabled = !canAfford;
    btn.style.opacity = canAfford ? '1' : '0.4';
    btn.style.cursor = canAfford ? 'pointer' : 'not-allowed';
    if (isPrem) {
      btn.style.background = canAfford ? 'linear-gradient(135deg,#3b1d6e,#a855f7)' : '#1a1205';
      btn.style.color = '#fff';
      btn.textContent = canAfford ? `💎 SPIN AGAIN — ${cost} Crystals` : `❌ NOT ENOUGH CRYSTALS`;
    } else {
      btn.style.background = canAfford ? 'linear-gradient(135deg,#8a6a1a,#c9a84c)' : '#1a1205';
      btn.style.color = canAfford ? '#0a0806' : '#6a5a3a';
      btn.textContent = canAfford ? `⚡ SPIN AGAIN — ${formatNumber(cost)}g` : `❌ NOT ENOUGH GOLD`;
    }
  }
}

async function applySpinReward(prize, isPremium) {
  // Gold, crystals, gold_mult, soul_orb, material already applied server-side in RPC
  // Client only handles equipment (needs generateItem) and title (state only)

  switch (prize.type) {
    case 'equipment': {
      const rarity = prize.value || 'rare';
      if (typeof generateItem === 'function') {
        const item = generateItem(state.level || 1, rarity);
        addToInventory(item);
        addLog(`🎰 Fortune Wheel: Won ${item.name}!`, rarity === 'legendary' ? 'legendary' : 'gold');
      }
      break;
    }

    case 'title':
      if (prize.value === 'premium') {
        state.luckyTitle = '🌟 Fortune\'s Legend';
        addLog(`🎰 Fortune Wheel: Won the rare title "Fortune\'s Legend"!`, 'legendary');
      } else {
        state.luckyTitle = '🍀 Fortune\'s Chosen';
        addLog(`🎰 Fortune Wheel: Won the title "Fortune\'s Chosen"!`, 'gold');
      }
      break;

    case 'gold':
      // Already applied server-side — just sync state from server value
      state.gold = (state.gold || 0) + parseInt(prize.value);
      addLog(`🎰 Fortune Wheel: Won ${formatNumber(parseInt(prize.value))} gold!`, 'gold');
      break;

    case 'crystals':
      state.soulCrystals = (state.soulCrystals || 0) + parseInt(prize.value);
      addLog(`🎰 Fortune Wheel: Won ${prize.value} soul crystals!`, 'gold');
      break;

    case 'gold_mult':
      state.goldMult = parseInt(prize.value);
      state.goldMultExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      addLog(`🎰 Fortune Wheel: ${prize.value}x Gold multiplier active for 24 hours!`, 'legendary');
      notify(`⚡ ${prize.value}x Gold Boost active for 24h!`, 'var(--gold)');
      break;

    case 'soul_orb':
      state.soulCrystals = (state.soulCrystals || 0) + parseInt(prize.value);
      addLog(`🎰 Fortune Wheel: Won a Soul Orb! +${prize.value} Soul Crystals!`, 'legendary');
      notify(`🔮 Soul Orb claimed! +${prize.value} Soul Crystals!`, 'var(--gold)');
      break;

    case 'material':
      // Already added to DB inventory by RPC — just sync state
      addLog(`🎰 Fortune Wheel: Won ${prize.value} Enhancement Orb(s)!`, 'gold');
      break;
  }

  updateUI();

  try {
    await savePlayerToSupabase();
  } catch(err) {
    console.error('Failed to save spin reward:', err);
  }
}

function closeSpinWheel() {
  const el = document.getElementById('spin-overlay');
  if (el) el.remove();
  isSpinning = false;
}