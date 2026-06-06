// ── AUCTION HOUSE ──
// All gold/inventory transactions go through SECURITY DEFINER RPCs.
// JS only handles local state updates and UI — never direct cross-user DB writes.

const AUCTION_FEE = 0.10;
const SYSTEM_ITEMS_PER_DAY = 5;

// ============================================
// SETTLE AUCTIONS
// ============================================

async function checkAndSettleAuctions() {
  try {
    // Step 1 — settle all expired active auctions via RPC
    const { data: expired } = await dbClient
      .from('auctions')
      .select('id')
      .eq('status', 'active')
      .lt('ends_at', new Date().toISOString());
    if (expired && expired.length) {
      for (const auction of expired) {
        const { error } = await dbClient.rpc('process_settle', { p_auction_id: auction.id });
        if (error) console.error('Settle failed:', error);
      }
    }

    if (!state.character_id) return;

    // Step 2 — collect won items for current player (bid wins)
    // Hardening: older rows may have winner_collected = NULL
    const { data: wonAuctions } = await dbClient
      .from('auctions')
      .select('*')
      .eq('current_bidder_id', state.character_id)
      .eq('status', 'completed')
      .or('winner_collected.is.null,winner_collected.eq.false');

    if (wonAuctions && wonAuctions.length) {
      for (const auction of wonAuctions) {
        // Mark collected FIRST before anything else
        const { error: markError } = await dbClient
          .from('auctions')
          .update({ winner_collected: true })
          .eq('id', auction.id);

        if (markError) {
          console.error('Failed to mark collected:', markError);
          continue; // skip this item — don't add to inventory
        }

        const item = auction.item_description
          ? (typeof auction.item_description === 'string'
            ? JSON.parse(auction.item_description)
            : auction.item_description)
          : { name: auction.item_name, rarity: auction.rarity, uid: genUid() };
        item.uid = genUid();
        addToInventory(item);
        addLog(`🏛️ Received ${auction.item_name} from auction!`, 'legendary');
      }

      await savePlayerToSupabase();
      renderInventory();
      updateUI();
      //notify(`📦 New items from auction!`, 'var(--gold)')
    }
  } catch (error) { console.error('Settle auctions error:', error); }
}

// ============================================
// GENERATE SYSTEM ITEMS
// ============================================

async function generateSystemItems() {
  // Check existing count server side
  const { data: existing } = await supabase
    .from('auctions')
    .select('id')
    .eq('source', 'system')
    .eq('status', 'active')

  if (existing && existing.length >= 10) {
    console.log('System items already at limit')
    return
  }
  // generation logic here
}
// ============================================
// FETCH & RENDER
// ============================================

async function fetchAuctions(source = 'auction') {
  // Target merchant panel if visible, fallback to town panel
  // IMPORTANT: use `source` (tab param) — NOT `currentAuctionSource` (can be stale)
  const container =
    source === 'blackwing'
      ? document.getElementById('blackwing-list-merchant') || document.getElementById('auction-list-merchant')
      : document.getElementById('auction-list-merchant') || document.getElementById('auction-list');
  if (!container) return
  container.innerHTML = '<div style="text-align:center; color:#888; padding:20px; width:100%;">Loading...</div>';

  try {
    await checkAndSettleAuctions()

    let query = dbClient.from('auctions').select('*')
      .eq('status', 'active')
      .gt('ends_at', new Date().toISOString())
      .order('ends_at', { ascending: true })

    if (source === 'blackwing') {
      query = query.eq('source', 'blackwing')
    } else {
      query = query.neq('source', 'blackwing')
    }

    const { data, error } = await query
    if (error) throw error

    if (!data || !data.length) {
      const emptyMsg = source === 'blackwing'
        ? '🖤 No Black Wing items this week. Check back next reset!'
        : 'No active auctions!'
      container.innerHTML = `<div style="text-align:center;color:#444;padding:20px;font-style:italic;">${emptyMsg}</div>`
      return
    }

    const sellerIds = [...new Set(data.map(a => a.seller_id).filter(Boolean))]
    let sellerMap = {}
    if (sellerIds.length) {
      const { data: chars } = await dbClient.from('characters').select('id,name').in('id', sellerIds)
      if (chars) chars.forEach(c => { sellerMap[c.id] = c.name })
    }

    renderAuctions(data, sellerMap, source)
  } catch (error) {
    console.error('Fetch auctions error:', error)
    container.innerHTML = '<div style="text-align:center;color:#f00;padding:20px;">Failed to load auctions</div>'
  }
}

async function showMyAuctions(btn) {
  // Target correct tab container
  const tabContainer = document.getElementById('merchant-panel-auction') || document.getElementById('town-panel-auction')
  tabContainer?.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'))
  btn.classList.add('active')

  if (!state.character_id) { notify('Must be logged in!', 'var(--red)'); return; }

  const container = document.getElementById('auction-list-merchant') || document.getElementById('auction-list')
  if (!container) return
  container.innerHTML = `<div style="text-align:center;color:var(--text-dim);padding:20px;">Loading...</div>`

  const { data } = await dbClient
    .from('auctions').select('*')
    .eq('seller_id', state.character_id).eq('status', 'active')
    .order('created_at', { ascending: false })

  if (!data || !data.length) {
    container.innerHTML = `<div style="text-align:center;color:var(--text-dim);padding:20px;font-style:italic;">No active listings.</div>`
    return
  }

  renderAuctions(data, { [state.character_id]: state.name }, 'auction')
}

function renderAuctions(auctions, sellerMap = {}, source = 'auction') {
  const container = source === 'blackwing'
    ? document.getElementById('blackwing-list-merchant')
    : document.getElementById('auction-list-merchant') || document.getElementById('auction-list')
  if (!container) return
  const r_ = r => RARITY[r] || RARITY.normal
  container.innerHTML = auctions.map(auction => {
    const endsAt = new Date(auction.ends_at), timeLeft = endsAt - new Date()
    const hoursLeft = Math.max(0, Math.floor(timeLeft / 3600000))
    const minsLeft = Math.max(0, Math.floor((timeLeft % 3600000) / 60000))
    const isExpired = timeLeft <= 0
    const isOwn = auction.seller_id === state.character_id
    const isSystem = auction.source === 'system'
    const currentBid = auction.current_bid || auction.start_price
    const rColor = r_(auction.rarity).color
    const sellerName = isSystem ? '🤖 Auction House' : `👤 ${sellerMap[auction.seller_id] || 'Unknown'}`

    let parsedItem = null
    try { parsedItem = typeof auction.item_description === 'string' ? JSON.parse(auction.item_description) : auction.item_description } catch(e) {}

    const levelReq = parsedItem?.levelReq || 0
    const isLevelLocked = levelReq > state.level

    const REP_REQ = { rare:'baron', epic:'chief', legendary:'mayor' }
    const repNeeded = REP_REQ[auction.rarity]
    const repTiers = REPUTATION_TITLES.map(r => r.id)
    const playerRepIndex = repTiers.indexOf(state.reputationTitle || '')
    const reqRepIndex = repTiers.indexOf(repNeeded || '')
    const isRepLocked = repNeeded && playerRepIndex < reqRepIndex
    const repLabel = isRepLocked ? REPUTATION_TITLES.find(r => r.id === repNeeded)?.label : null

    const lockWarning = (isLevelLocked || isRepLocked) ? `
      <div style="background:rgba(255,0,0,0.08);border:1px solid var(--red);border-radius:4px;padding:4px 8px;margin-bottom:6px;font-size:.7em;display:flex;gap:8px;flex-wrap:wrap;">
        ${isLevelLocked ? `<span style="color:var(--red);">🔒 Requires Level ${levelReq}</span>` : ''}
        ${isRepLocked ? `<span style="color:var(--epic);">👑 Requires ${repLabel} Reputation</span>` : ''}
      </div>` : ''

    return `<div style="background:linear-gradient(135deg,rgba(255,255,255,0.03),rgba(8,8,40,0.7));border:1px solid ${rColor};border-radius:8px;padding:10px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <div style="font-size:1.6em;">${auction.item_name.split(' ')[0]}</div>
        <div style="flex:1;">
          <div style="color:${rColor};font-family:'Cinzel',serif;font-size:.82em;font-weight:600;">${auction.item_name}</div>
          <div style="font-size:.7em;color:#888;">${r_(auction.rarity).label} · ${sellerName}</div>
        </div>
        <div style="font-size:.7em;color:${isExpired ? 'var(--red)' : '#888'};">${isExpired ? '❌ Expired' : `⏱️ ${hoursLeft}h ${minsLeft}m`}</div>
      </div>
      ${parsedItem ? `<div style="font-size:.72em;color:#888;margin-bottom:6px;padding:4px;background:rgba(0,0,0,0.2);border-radius:4px;">${Object.entries(parsedItem.stats || {}).map(([k,v]) => `<span style="margin-right:6px;">+${v < 1 ? v.toFixed(3) : v} ${k.toUpperCase()}</span>`).join('')}</div>` : ''}
      ${lockWarning}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <div>
          <div style="color:var(--gold);font-family:'Cinzel',serif;font-size:.9em;">💰 ${formatNumber(currentBid)}g${auction.current_bidder_id ? '<span style="font-size:.7em;color:#888;"> (highest)</span>' : '<span style="font-size:.7em;color:#888;"> (starting)</span>'}</div>
          ${auction.buyout_price ? `<div style="font-size:.72em;color:#aaa;">Buyout: ${formatNumber(auction.buyout_price)}g</div>` : ''}
        </div>
        <div style="font-size:.7em;color:#555;">Fee: 10%</div>
      </div>
      ${!isOwn && !isExpired
        ? `<div style="display:flex;gap:6px;">
            <button class="start-btn" onclick="placeBid('${auction.id}',${currentBid})" style="flex:1;font-size:.72em;padding:5px 8px;">⬆️ Bid</button>
            ${auction.buyout_price ? `<button class="start-btn" onclick="buyoutAuction('${auction.id}',${auction.buyout_price})" style="flex:1;font-size:.72em;padding:5px 8px;background:linear-gradient(135deg,#005500,#00aa44);">⚡ Buy ${formatNumber(auction.buyout_price)}g</button>` : ''}
           </div>`
        : isOwn
        ? `<div style="display:flex;gap:6px;">
            <div style="flex:1;text-align:center;font-size:.72em;color:#888;padding:4px;">Your listing</div>
            <button class="start-btn red-btn" onclick="cancelAuction('${auction.id}')" style="flex:1;font-size:.72em;padding:5px 8px;">❌ Cancel</button>
           </div>`
        : ''}
    </div>`
  }).join('')
}


// ============================================
// PLACE BID
// ============================================

async function placeBid(auctionId, currentBid) {
  const minBid = currentBid + Math.max(100, Math.floor(currentBid * 0.05))
  const bidAmount = parseInt(prompt(`Minimum bid: ${formatNumber(minBid)}g\nEnter your bid:`))
  if (!bidAmount || isNaN(bidAmount)) return
  if (bidAmount < minBid) { notify(`❌ Minimum bid is ${formatNumber(minBid)}g!`, 'var(--red)'); return; }
  if (bidAmount > state.gold) { notify('❌ Not enough gold!', 'var(--red)'); return; }

  try {
    const { data: { session } } = await dbClient.auth.getSession()
    const res = await fetch('https://xagwrqrgcuuitwgroiwh.supabase.co/functions/v1/auction-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        action: 'bid',
        character_id: state.character_id,
        auction_id: auctionId,
        bid_amount: bidAmount
      })
    })

    const data = await res.json()
    if (data.error) throw new Error(data.error)

    // Update local gold only after server confirms
    addGold(-bidAmount)
    await savePlayerToSupabase()
    addLog(`⬆️ Bid: ${formatNumber(bidAmount)}g placed!`, 'gold')
    notify(`⬆️ Bid: ${formatNumber(bidAmount)}g!`, 'var(--gold)')
    updateUI()
    fetchAuctions(currentAuctionSource || 'auction')

  } catch (error) {
    notify('❌ ' + error.message, 'var(--red)')
    console.error('Bid error:', error)
  }
}


// ============================================
// BUYOUT
// ============================================

async function buyoutAuction(auctionId, buyoutPrice) {
  if (buyoutPrice > state.gold) { notify('❌ Not enough gold!', 'var(--red)'); return; }
  if (!confirm(`Buy now for ${formatNumber(buyoutPrice)}g?\n(10% fee applies to seller)`)) return;

  try {
    const { data: { session } } = await dbClient.auth.getSession()
    const res = await fetch('https://xagwrqrgcuuitwgroiwh.supabase.co/functions/v1/auction-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        action: 'buyout',
        character_id: state.character_id,
        auction_id: auctionId
      })
    })

    const data = await res.json()
    if (data.error) throw new Error(data.error)

    // Update local state only after server confirms
    await loadPlayerFromSupabase(state.character_id)  // DB has the truth, gold + item both updated server-side

    trackQuestAuction()
    // ❌ remove savePlayerToSupabase() — you just loaded from DB, don't overwrite it
    addLog(`🏛️ Bought ${data.item?.name || 'item'} for ${formatNumber(buyoutPrice)}g!`, 'legendary')
    notify(`🏛️ Item purchased!`, 'var(--gold)')
    playSound('snd-craft')
    updateUI()
    renderInventory()
    fetchAuctions(currentAuctionSource || 'auction')

  } catch (error) {
    notify('❌ ' + error.message, 'var(--red)')
    console.error('Buyout error:', error)
  }
}

// ============================================
// LIST ITEM
// ============================================

async function listItemForAuction(uid) {
  const item = findInventoryItem(uid);
  if (!item) { notify('❌ Item not found!', 'var(--red)'); return; }
  if (item.equipped) { notify('❌ Unequip item first!', 'var(--red)'); return; }
  if (!state.character_id) { notify('❌ Must be logged in!', 'var(--red)'); return; }

  const startPrice = parseInt(prompt(`Starting bid price (gold):`))
  if (!startPrice || isNaN(startPrice) || startPrice <= 0) return

  const buyoutInput = prompt('Buyout price (leave empty for no buyout):')
  const buyoutPrice = buyoutInput ? parseInt(buyoutInput) : null
  if (buyoutPrice && buyoutPrice <= startPrice) {
    notify('❌ Buyout must be higher than start price!', 'var(--red)')
    return
  }

  try {
    const { data: { session } } = await dbClient.auth.getSession()
    const res = await fetch('https://xagwrqrgcuuitwgroiwh.supabase.co/functions/v1/auction-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        action: 'list',
        character_id: state.character_id,
        item,
        start_price: startPrice,
        buyout_price: buyoutPrice || null
      })
    })

    const data = await res.json()
    if (data.error) throw new Error(data.error)

    // Remove from equipment bag after server confirms
    state.inventory.equipment = (state.inventory.equipment || [])
      .filter(i => i.uid !== uid);

    await saveInventoryToSupabase()
    addLog(`🏛️ ${item.name} listed! Starts at ${formatNumber(startPrice)}g`, 'gold')
    notify(`🏛️ Item listed for auction!`, 'var(--gold)')
    renderInventory()
    updateUI()

  } catch (error) {
    notify('❌ ' + error.message, 'var(--red)')
    console.error('List error:', error)
  }
}

// ============================================
// CANCEL AUCTION
// ============================================

async function cancelAuction(auctionId) {
  if (!confirm('Cancel this auction? Item will be returned.')) return

  try {
    const { data: { session } } = await dbClient.auth.getSession()
    const res = await fetch('https://xagwrqrgcuuitwgroiwh.supabase.co/functions/v1/auction-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        action: 'cancel',
        character_id: state.character_id,
        auction_id: auctionId
      })
    })

    const data = await res.json()
    if (data.error) throw new Error(data.error)

    // Refund bid if we were also the bidder
    if (data.bid_refund > 0) addGold(data.bid_refund)

    // Return item to inventory only after server confirms
    if (data.item) {
      data.item.uid = genUid()
      addToInventory(data.item)
    }

    await savePlayerToSupabase()
    notify('✅ Auction cancelled!', 'var(--gold)')
    addLog(`❌ Cancelled auction for ${data.item?.name || 'item'}`, 'info')
    renderInventory()
    updateUI()
    fetchAuctions(currentAuctionSource || 'auction')

  } catch (error) {
    notify('❌ ' + error.message, 'var(--red)')
    console.error('Cancel error:', error)
  }
}

// ============================================
// SWITCH TAB
// ============================================

let currentAuctionSource = 'auction' // track active tab

function switchMarketTab(tab) {
  // Remove active class from all tabs
  document.querySelectorAll('.shop-tab').forEach(t => {
    t.classList.remove('active');
  });

  if (tab === 'auction') {
    currentAuctionSource = 'auction';

    // Use the correct ID: market-tab-ah-m
    const target = document.getElementById('market-tab-ah-m');
    if (target) target.classList.add('active');

    fetchAuctions('auction');

  } else if (tab === 'blackwing') {
    currentAuctionSource = 'blackwing';

    const target = document.getElementById('market-tab-blackwing');
    if (target) target.classList.add('active');

    fetchAuctions('blackwing');

  } else if (tab === 'my-listings') {
    // Load "My Listings" using existing helper.
    // Try to find the actual button element that triggers showMyAuctions.
    const btn = document.querySelector("button[onclick*='showMyAuctions']");
    if (btn) {
      btn.classList.add('active');
      showMyAuctions(btn);
    }
  }
}
