// ── SPINNING WHEEL SYSTEM ──

const WHEEL_PRIZES = [
  { id: 'gold_small',    label: '💰 1,000 Gold',        type: 'gold',      value: 1000,   weight: 30, color: '#f0c040' },
  { id: 'gold_medium',   label: '💰 5,000 Gold',        type: 'gold',      value: 5000,   weight: 20, color: '#f0c040' },
  { id: 'gold_large',    label: '💰 15,000 Gold',       type: 'gold',      value: 15000,  weight: 10, color: '#f0c040' },
  { id: 'crystal_small', label: '💎 50 Crystals',       type: 'crystals',  value: 50,     weight: 20, color: '#a855f7' },
  { id: 'crystal_large', label: '💎 150 Crystals',      type: 'crystals',  value: 150,    weight: 8,  color: '#a855f7' },
  { id: 'enhance_mat',   label: '⚗️ Enhancement Orb',   type: 'material',  value: 1,      weight: 7,  color: '#22c55e' },
  { id: 'mystery_box',   label: '📦 Mystery Equipment', type: 'equipment', value: 1,      weight: 4,  color: '#3b82f6' },
  { id: 'title',         label: '👑 Lucky Title',       type: 'title',     value: 1,      weight: 1,  color: '#ff6644' },
];

function getWeightedPrize() {
  const totalWeight = WHEEL_PRIZES.reduce((sum, p) => sum + p.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const prize of WHEEL_PRIZES) {
    rand -= prize.weight;
    if (rand <= 0) return prize;
  }
  return WHEEL_PRIZES[0];
}

function openSpinWheel() {
  if (document.getElementById('spin-overlay')) return;

  const spins = state.premiumSpins || 0;
  const sliceAngle = 360 / WHEEL_PRIZES.length;

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

      <div style="padding:24px;text-align:center;">

        <!-- Spins counter -->
        <div style="
          display:inline-block;
          background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.3);
          padding:8px 20px;margin-bottom:20px;
          font-size:13px;color:#a855f7;letter-spacing:2px;
        ">
          🎰 <span id="spin-count">${spins}</span> PREMIUM SPIN${spins !== 1 ? 'S' : ''} REMAINING
        </div>

        <!-- Wheel container -->
        <div style="position:relative;width:280px;height:280px;margin:0 auto 20px;">

          <!-- Pointer -->
          <div style="
            position:absolute;top:-12px;left:50%;transform:translateX(-50%);
            width:0;height:0;
            border-left:12px solid transparent;
            border-right:12px solid transparent;
            border-top:24px solid #f0c040;
            z-index:10;filter:drop-shadow(0 0 8px rgba(240,192,64,0.8));
          "></div>

          <!-- Wheel -->
          <canvas id="spin-canvas" width="280" height="280" style="
            border-radius:50%;
            box-shadow:0 0 40px rgba(180,120,20,0.3),0 0 0 3px #3a2a0a;
          "></canvas>

          <!-- Center cap -->
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
          min-height:48px;margin-bottom:16px;
          display:flex;align-items:center;justify-content:center;
        ">
          <div style="color:#6a5a3a;font-size:12px;letter-spacing:2px;">Spin to reveal your prize!</div>
        </div>

        <!-- Spin button -->
        <button id="spin-btn" onclick="doSpin()" style="
          width:100%;
          background:linear-gradient(135deg,#8a6a1a,#c9a84c);
          border:none;color:#0a0806;
          font-family:'Cinzel',serif;font-size:14px;font-weight:900;
          letter-spacing:4px;padding:16px;cursor:pointer;
          transition:all 0.2s;
          ${spins <= 0 ? 'opacity:0.4;cursor:not-allowed;' : ''}
        " ${spins <= 0 ? 'disabled' : ''}>
          ${spins > 0 ? '⚡ SPIN NOW' : '❌ NO SPINS LEFT'}
        </button>

        ${spins <= 0 ? `
          <div style="margin-top:12px;font-size:11px;color:#6a5a3a;letter-spacing:1px;">
            Donate to get more premium spins!
            <span onclick="closeSpinWheel();setTimeout(openRechargePanel,100)" 
              style="color:#c9a84c;cursor:pointer;text-decoration:underline;">
              Recharge →
            </span>
          </div>
        ` : ''}

      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSpinWheel(); });
  drawWheel(0);
}

function drawWheel(rotation) {
  const canvas = document.getElementById('spin-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = 140, cy = 140, r = 136;
  const sliceAngle = (2 * Math.PI) / WHEEL_PRIZES.length;

  ctx.clearRect(0, 0, 280, 280);

  WHEEL_PRIZES.forEach((prize, i) => {
    const startAngle = rotation + i * sliceAngle;
    const endAngle = startAngle + sliceAngle;

    // Slice
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.closePath();

    // Alternate dark/darker slices with color accent
    const isDark = i % 2 === 0;
    ctx.fillStyle = isDark ? '#1a1205' : '#0d0a06';
    ctx.fill();

    // Color rim
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.lineWidth = 6;
    ctx.strokeStyle = prize.color;
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Divider lines
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
    ctx.font = 'bold 10px Cinzel, serif';
    ctx.fillStyle = prize.color;
    ctx.shadowColor = prize.color;
    ctx.shadowBlur = 4;

    // Split label into emoji and text
    const parts = prize.label.split(' ');
    const emoji = parts[0];
    const text = parts.slice(1).join(' ');

    ctx.font = '13px serif';
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
  if ((state.premiumSpins || 0) <= 0) return;

  isSpinning = true;
  const btn = document.getElementById('spin-btn');
  btn.disabled = true;
  btn.textContent = '⏳ SPINNING...';

  // Pick prize
  const prize = getWeightedPrize();
  const prizeIndex = WHEEL_PRIZES.indexOf(prize);
  const sliceAngle = (2 * Math.PI) / WHEEL_PRIZES.length;

  // Calculate target rotation — land on prize
  const targetSlice = prizeIndex * sliceAngle + sliceAngle / 2;
  const extraSpins = (5 + Math.floor(Math.random() * 5)) * 2 * Math.PI;
  const targetAngle = extraSpins + (2 * Math.PI - targetSlice) - Math.PI / 2;

  // Animate
  const duration = 4000;
  const start = performance.now();
  let currentRotation = 0;

  function animate(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);

    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    currentRotation = targetAngle * eased;

    drawWheel(currentRotation);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // Done spinning
      isSpinning = false;
      showSpinResult(prize);
      applySpinReward(prize);
    }
  }

  requestAnimationFrame(animate);
}

function showSpinResult(prize) {
  const resultEl = document.getElementById('spin-result');
  if (!resultEl) return;

  resultEl.innerHTML = `
    <div style="
      background:rgba(180,120,20,0.1);border:1px solid ${prize.color};
      padding:12px 20px;width:100%;
      animation: fadeIn 0.5s ease;
    ">
      <div style="font-size:22px;margin-bottom:4px;">${prize.label.split(' ')[0]}</div>
      <div style="color:${prize.color};font-size:13px;font-weight:900;letter-spacing:2px;">
        ${prize.label.split(' ').slice(1).join(' ')}
      </div>
      <div style="color:#6a5a3a;font-size:11px;margin-top:4px;letter-spacing:1px;">Added to your inventory!</div>
    </div>
  `;

  // Update spin count
  const countEl = document.getElementById('spin-count');
  const spins = state.premiumSpins || 0;
  if (countEl) countEl.textContent = spins;

  const btn = document.getElementById('spin-btn');
  if (btn) {
    if (spins > 0) {
      btn.disabled = false;
      btn.textContent = '⚡ SPIN AGAIN';
      btn.style.opacity = '1';
    } else {
      btn.disabled = true;
      btn.textContent = '❌ NO SPINS LEFT';
      btn.style.opacity = '0.4';
    }
  }
}

async function applySpinReward(prize) {
  // Deduct spin
  state.premiumSpins = Math.max(0, (state.premiumSpins || 0) - 1);

  switch (prize.type) {
    case 'gold':
      state.gold = (state.gold || 0) + prize.value;
      const goldEl = document.getElementById('gold-val');
      if (goldEl) goldEl.textContent = state.gold.toLocaleString();
      addCombatLog(`🎰 Fortune Wheel: Won ${prize.value.toLocaleString()} gold!`, 'good');
      break;

    case 'crystals':
      state.soulCrystals = (state.soulCrystals || 0) + prize.value;
      const crystalEl = document.getElementById('soul-crystal-val');
      if (crystalEl) crystalEl.textContent = state.soulCrystals.toLocaleString();
      addCombatLog(`🎰 Fortune Wheel: Won ${prize.value} soul crystals!`, 'good');
      break;

    case 'material':
      const orb = {
        id: 'enhance_orb_' + Date.now(),
        name: '⚗️ Enhancement Orb',
        type: 'material',
        rarity: 'uncommon',
        description: 'Increases enhancement success rate by 20%',
      };
      if (!state.inventory) state.inventory = [];
      state.inventory.push(orb);
      addCombatLog(`🎰 Fortune Wheel: Won an Enhancement Orb!`, 'good');
      break;

    case 'equipment':
      if (typeof generateItem === 'function') {
        const item = generateItem(state.level || 1, 'rare');
        if (!state.inventory) state.inventory = [];
        state.inventory.push(item);
        addCombatLog(`🎰 Fortune Wheel: Won ${item.name}!`, 'good');
      }
      break;

    case 'title':
      state.luckyTitle = '🍀 Fortune\'s Chosen';
      addCombatLog(`🎰 Fortune Wheel: Won the title "Fortune's Chosen"!`, 'good');
      break;
  }

  // Save via RPC (consistent with all other saves)
  try {
    await savePlayerToSupabase();
  } catch (err) {
    console.error('Failed to save spin reward:', err);
  }
}

function closeSpinWheel() {
  const el = document.getElementById('spin-overlay');
  if (el) el.remove();
}