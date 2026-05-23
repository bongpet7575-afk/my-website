// ============================================================
// chat-module.js — Rotana's RPG Live Chat
// Drop this into your project and call initChat() after login
// Requires: dbClient already initialized in index.html
// ============================================================

// ── Config ───────────────────────────────────────────────────
const CHAT_CONFIG = {
  maxLength:    200,
  cooldownMs:   3000,       // 3 seconds between messages
  historyLimit: 50,         // how many messages to load on init
  channel:      'public-chat', // Supabase realtime channel name
  maxRetries:   5,          // BUG FIX #6: cap reconnect attempts
};

// ── Spam / Content Filter ────────────────────────────────────
const BAD_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'bastard', 'dick', 'pussy',
  'cunt', 'nigga', 'nigger', 'faggot', 'retard', 'whore', 'slut',
  // add more as needed
];

function filterMessage(text) {
  let filtered = text.trim();

  // 1. Length check
  if (filtered.length === 0) return { ok: false, reason: 'Message is empty.' };
  if (filtered.length > CHAT_CONFIG.maxLength)
    return { ok: false, reason: `Max ${CHAT_CONFIG.maxLength} characters.` };

  // 2. All caps check (ignore short words like "GG" "WTF")
  if (filtered.length > 6 && filtered === filtered.toUpperCase() && /[A-Z]/.test(filtered))
    return { ok: false, reason: 'No shouting (ALL CAPS).' };

  // 3. Repeated characters (e.g. aaaaaaa, !!!!!!)
  if (/(.)\1{6,}/.test(filtered))
    return { ok: false, reason: 'Stop spamming repeated characters.' };

  // 4. Repeated words (e.g. "lol lol lol lol lol")
  const words = filtered.split(/\s+/);
  if (words.length >= 4) {
    const unique = new Set(words.map(w => w.toLowerCase()));
    if (unique.size === 1)
      return { ok: false, reason: 'Stop repeating the same word.' };
  }

  // 5. Censor bad words
  // BUG FIX #9: use word boundaries (\b) so 'ass' doesn't censor 'class',
  // 'assassin', 'classic' etc.
  BAD_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  });

  return { ok: true, text: filtered };
}

// ── State ────────────────────────────────────────────────────
let _lastSentAt      = 0;
let _lastMessage     = '';   // stores filtered text (BUG FIX #4)
let _chatReady       = false;
let _chatSubscription = null;
let _retryCount      = 0;    // BUG FIX #6: track reconnect attempts

// ── DOM Helpers ──────────────────────────────────────────────
function getChatBox()    { return document.getElementById('chat-messages'); }
function getChatInput()  { return document.getElementById('chat-input-field'); }
function getChatStatus() { return document.getElementById('chat-status'); }

function showChatStatus(msg, color = '#ff4444') {
  const el = getChatStatus();
  if (!el) return;
  el.textContent = msg;
  el.style.color = color;
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => { el.textContent = ''; }, 3000);
}

function appendChatMessage({ player_name, message, created_at, isSystem,
  player_level, player_class, reputation_title, tournament_title, is_supreme, 
  lucky_title, chat_color, supporter_title }) {
  const box = getChatBox();
  if (!box) return;

  const line = document.createElement('div');
  line.className = 'chat-line' + (isSystem ? ' chat-system' : '');

  const time = new Date(created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  const isMe = player_name === ((typeof state !== 'undefined' && state?.name) ? state.name : '');

  if (isSystem) {
    line.innerHTML = `
      <span class="chat-ts">[${time}]</span>
      <span class="chat-system-text">*** ${escHtml(message)}</span>`;
  } else {
    const CLASS_ICONS = {
      warrior:'⚔️', mage:'🔮', rogue:'🗡️', hunter:'🏹',
      paladin:'✨', necromancer:'💀', shaman:'⚡', berserker:'🐉',
    };

    const REP_COLORS = {
  baron:   '#ff9944',  // bright orange — easy to see
  chief:   '#ffdd00',  // bright yellow
  mayor:   '#44ff88',  // bright green
  viscount:'#44ddff',  // bright cyan
  count:   '#ff4466',  // bright red/pink
};

    let badges = '';

    if (is_supreme) {
      badges += `<span style="
        background:linear-gradient(135deg,#ff9900,#ffcc00);
        color:#000;font-size:.58em;padding:1px 5px;border-radius:3px;
        font-family:var(--font-title);letter-spacing:1px;margin-right:3px;
        animation:glow-pulse 2s infinite;">
        👑 SUPREME
      </span>`;
    }

    if (tournament_title) {
      badges += `<span style="
        background:rgba(255,153,0,0.15);border:1px solid rgba(255,153,0,0.4);
        color:#ff9900;font-size:.58em;padding:1px 5px;border-radius:3px;
        font-family:var(--font-title);letter-spacing:1px;margin-right:3px;">
        ${escHtml(tournament_title)}
      </span>`;
    }
    if (supporter_title) {
      badges += `<span style="
        background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.4);
        color:#22c55e;font-size:.58em;padding:1px 5px;border-radius:3px;
        font-family:var(--font-title);letter-spacing:1px;margin-right:3px;">
        ${escHtml(supporter_title)}
      </span>`;
    }

    if (reputation_title && REP_COLORS[reputation_title]) {
      badges += `<span style="
        color:${REP_COLORS[reputation_title]};font-size:.62em;
        margin-right:3px;" title="Reputation Title">
        [${escHtml(reputation_title)}]
      </span>`;
    }

    const nameColor = is_supreme ? '#ffcc00'
      : tournament_title ? '#ff9900'
      : (reputation_title && REP_COLORS[reputation_title]) ? REP_COLORS[reputation_title]
      : chat_color ? chat_color
      : lucky_title ? '#44ff88'
      : isMe ? 'var(--gold)'
      : '#cccccc';

   const msgStyle = is_supreme
      ? 'color:#ffe680;text-shadow:0 0 8px rgba(255,204,0,0.5);font-weight:500;'
      : tournament_title ? 'color:#ffcc44;font-weight:500;'
      : reputation_title === 'count'    ? 'color:#ff8899;'
      : reputation_title === 'viscount' ? 'color:#88eeff;'
      : reputation_title === 'mayor'    ? 'color:#88ffbb;'
      : reputation_title === 'chief'    ? 'color:#ffee88;'
      : reputation_title === 'baron'    ? 'color:#ffbb77;'
      : chat_color ? `color:${chat_color};opacity:0.85;`
      : lucky_title ? 'color:#aaffcc;'
      : 'color:#cccccc;';

    const classIcon = player_class ? (CLASS_ICONS[player_class.toLowerCase()] || '👤') : '👤';
    const levelTag  = player_level
      ? `<span style="color:var(--text-dim);font-size:.6em;margin-right:3px;">Lv.${player_level}</span>`
      : '';

    line.innerHTML = `
      <span class="chat-ts">[${time}]</span>
      ${badges}
      <span class="chat-nick ${isMe ? 'chat-nick-me' : ''}">
        ${classIcon} ${levelTag}<b style="color:${nameColor} !important;">${escHtml(player_name)}</b>:
      </span>
      <span class="chat-text" style="${msgStyle}">${escHtml(message)}</span>`;
  }

  box.appendChild(line);
  while (box.children.length > 100) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')   // BUG FIX #8: escape quotes too
    .replace(/'/g, '&#39;');
}

// ── Send Message ─────────────────────────────────────────────
async function sendChatMessage() {
  if (!_chatReady) return;

  const input = getChatInput();
  if (!input) return;
  const raw = input.value;

  // Cooldown check
  const now     = Date.now();
  const elapsed = now - _lastSentAt;
  if (elapsed < CHAT_CONFIG.cooldownMs) {
    const wait = ((CHAT_CONFIG.cooldownMs - elapsed) / 1000).toFixed(1);
    showChatStatus(`⏳ Wait ${wait}s before sending again.`);
    return;
  }

  // Filter first
  const result = filterMessage(raw);
  if (!result.ok) {
    showChatStatus(`⚠️ ${result.reason}`);
    return;
  }

  // BUG FIX #4: duplicate check uses filtered text, not raw input
  // Old code stored raw but compared trimmed — if you typed a bad word,
  // sent it (censored), then typed it again, it bypassed the duplicate check
  if (result.text === _lastMessage) {
    showChatStatus("⚠️ Don't send the same message twice.");
    return;
  }

  // BUG FIX #1: use state.name, not state.playerName
  const playerName = (typeof state !== 'undefined' && state?.name) ? state.name : 'Unknown';
  

  const { error } = await dbClient
    .from('chat_messages')
    .insert({
      player_name:       playerName,
      message:           result.text,
      player_level:      state.level || 1,
      player_class:      state.class || null,
      reputation_title:  state.reputationTitle || null,
      tournament_title:  state.tournamentTitle || null,
      is_supreme:        !!state.supremeTitle,
      lucky_title:       state.luckyTitle      || null,
      supporter_title:   state.supporterTitle  || null,
      chat_color:        state.chatColor       || null,
    });

  if (error) {
    showChatStatus('❌ Failed to send. Try again.');
    console.error('Chat send error:', error);
    return;
  }

  _lastSentAt  = now;
  _lastMessage = result.text; // BUG FIX #4: store filtered text
  input.value  = '';

  // BUG FIX #2: DO NOT call appendChatMessage here.
  // The realtime subscription will receive the INSERT and render it.
  // Calling it here too caused every sent message to appear twice.
}

// ── Load History ─────────────────────────────────────────────
async function loadChatHistory() {
  // BUG FIX #7: build messages in a fragment first, then insert all at once.
  // Old code cleared the box immediately then awaited the fetch — caused a
  // visible blank flash on slow connections (mobile hotspot).
  const { data, error } = await dbClient
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(CHAT_CONFIG.historyLimit);

  if (error) {
    console.error('Chat history error:', error);
    return;
  }

  const box = getChatBox();
  if (!box) return;

  // Clear only after data is ready — no blank flash
  box.innerHTML = '';

  // BUG FIX #3: welcome message prepended BEFORE history so it appears
  // at the top, not awkwardly in the middle of old messages
  appendChatMessage({
    player_name: 'System',
    message:     `Welcome to Rotana's RPG Chat! Be respectful 🗡️`,
    created_at:  new Date(0).toISOString(), // epoch = always first
    isSystem:    true,
  });

  (data || []).forEach(row => appendChatMessage(row));
}

// ── Realtime Subscription ─────────────────────────────────────
function subscribeChatRealtime() {
  if (_chatSubscription) {
    dbClient.removeChannel(_chatSubscription);
    _chatSubscription = null;
  }

  _chatSubscription = dbClient
    .channel(CHAT_CONFIG.channel)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      (payload) => {
        // BUG FIX #2: realtime is the ONLY place messages are rendered.
        // This fires for all players including yourself, so no double-render.
        appendChatMessage(payload.new);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        _chatReady  = true;
        _retryCount = 0; // reset retry counter on success
        showChatStatus('✅ Chat connected!', '#00ff88');
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        _chatReady = false;

        // BUG FIX #6: cap retries — don't loop forever on permanent errors
        if (_retryCount >= CHAT_CONFIG.maxRetries) {
          showChatStatus('❌ Chat unavailable. Please refresh.', '#ff4444');
          console.error('Chat: max reconnect attempts reached.');
          return;
        }

        _retryCount++;
        const delay = _retryCount * 3000; // back off: 3s, 6s, 9s...
        showChatStatus(`⚠️ Chat disconnected. Reconnecting (${_retryCount}/${CHAT_CONFIG.maxRetries})...`, '#ffaa00');
        setTimeout(subscribeChatRealtime, delay);
      }
    });
}

// ── Public Init ──────────────────────────────────────────────
async function initChat() {
  await loadChatHistory();

  // Small delay to let Supabase auth token settle before subscribing
  await new Promise(resolve => setTimeout(resolve, 500));

  subscribeChatRealtime();

  // Guard against duplicate event listeners on re-init
  const input = getChatInput();
  if (input) {
    input.removeEventListener('keydown', _onChatKeyDown);
    input.addEventListener('keydown', _onChatKeyDown);
  }

  const btn = document.getElementById('chat-send-btn');
  if (btn) {
    btn.removeEventListener('click', sendChatMessage);
    btn.addEventListener('click', sendChatMessage);
  }
}

// Named handler so we can remove it properly
function _onChatKeyDown(e) {
  if (e.key === 'Enter') sendChatMessage();
}

// ── Cleanup (call on logout) ──────────────────────────────────
function destroyChat() {
  if (_chatSubscription) {
    dbClient.removeChannel(_chatSubscription);
    _chatSubscription = null;
  }
  _chatReady  = false;
  _retryCount = 0;
}