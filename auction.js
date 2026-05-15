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
        await dbClient.from('auctions').update({ winner_collected: true }).eq('id', auction.id);
        addLog(`🏛️ Received ${auction.item_name} from auction!`, 'legendary');
      }
      await savePlayerToSupabase();
      renderInventory();
      updateUI();
      notify(`📦 New items from auction!`, 'var(--gold)');
    }

  } catch (error) { console.error('Settle auctions error:', error); }
}

// ============================================
// GENERATE SYSTEM ITEMS
// ============================================

async function generateSystemAuctionItems() {
  const { data: existing } = await dbClient.from('auctions').select('id')
    .eq('source', 'system')
    .eq('status', 'active');
  if (existing && existing.length >= SYSTEM_ITEMS_PER_DAY) return;
  const slots = ['weapon', 'armor', 'helmet', 'boots', 'ring', 'amulet'];
  const rarities = ['rare', 'rare', 'epic', 'epic', 'legendary'];
  const rarityStage = {
    rare:      [3, 5],
    epic:      [5, 8],
    legendary: [8, 10],
  };
  const endsAt = new Date();
  endsAt.setHours(endsAt.getHours() + 24);
  for (let i = 0; i < SYSTEM_ITEMS_PER_DAY; i++) {
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const rarity = rarities[Math.floor(Math.random() * rarities.length)];
    const [minStage, maxStage] = rarityStage[rarity];
    const stageId = Math.floor(Math.random() * (maxStage - minStage + 1)) + minStage;
    const item = mkEquipDrop(slot, rarity, stageId);
    const basePrice = Math.floor(item.sellPrice * (2 + Math.random() * 2));
    const { error } = await dbClient.from('auctions').insert({
      seller_id: null, item_name: item.name, item_description: JSON.stringify(item),
      rarity: item.rarity, start_price: basePrice, buyout_price: Math.floor(basePrice * 2.5),
      current_bid: 0, current_bidder_id: null, ends_at: endsAt.toISOString(),
      status: 'active', source: 'system', seller_collected: true, winner_collected: false,
    });
  }
}
// ============================================
// FETCH & RENDER
// ============================================

async function fetchAuctions() {
  const container = document.getElementById('auction-list');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">Loading...</div>';
  try {
    await checkAndSettleAuctions();
    await generateSystemAuctionItems();
    const { data, error } = await dbClient.from('auctions').select('*')
      .eq('status', 'active').gt('ends_at', new Date().toISOString()).order('ends_at', { ascending: true });
    if (error) throw error;
    if (!data || !data.length) {
      container.innerHTML = '<div style="text-align:center;color:#444;padding:20px;font-style:italic;">No active auctions!</div>';
      return;
    }
    const sellerIds = [...new Set(data.map(a => a.seller_id).filter(Boolean))];
    let sellerMap = {};
    if (sellerIds.length) {
      const { data: chars } = await dbClient.from('characters').select('id,name').in('id', sellerIds);
      if (chars) chars.forEach(c => { sellerMap[c.id] = c.name; });
    }
    renderAuctions(data, sellerMap);
  } catch (error) {
    console.error('Fetch auctions error:', error);
    container.innerHTML = '<div style="text-align:center;color:#f00;padding:20px;">Failed to load auctions</div>';
  }
}

function renderAuctions(auctions, sellerMap = {}) {
  const container = document.getElementById('auction-list');
  if (!container) return;
  const r_ = r => RARITY[r] || RARITY.normal;
  container.innerHTML = auctions.map(auction => {
    const endsAt = new Date(auction.ends_at), timeLeft = endsAt - new Date();
    const hoursLeft = Math.max(0, Math.floor(timeLeft / 3600000));
    const minsLeft = Math.max(0, Math.floor((timeLeft % 3600000) / 60000));
    const isExpired = timeLeft <= 0;
    const isOwn = auction.seller_id === state.character_id;
    const isSystem = auction.source === 'system';
    const currentBid = auction.current_bid || auction.start_price;
    const rColor = r_(auction.rarity).color;
    const sellerName = isSystem ? '🤖 Auction House' : `👤 ${sellerMap[auction.seller_id] || 'Unknown'}`;

    // Parse item for lock checks
    let parsedItem = null;
    try { parsedItem = typeof auction.item_description === 'string' ? JSON.parse(auction.item_description) : auction.item_description; } catch(e) {}

    // Level lock check
    const levelReq = parsedItem?.levelReq || 0;
    const isLevelLocked = levelReq > state.level;

    // Reputation lock check
    const REP_REQ = { rare:'baron', epic:'chief', legendary:'mayor' };
    const repNeeded = REP_REQ[auction.rarity];
    const repTiers = REPUTATION_TITLES.map(r => r.id);
    const playerRepIndex = repTiers.indexOf(state.reputationTitle || '');
    const reqRepIndex = repTiers.indexOf(repNeeded || '');
    const isRepLocked = repNeeded && playerRepIndex < reqRepIndex;
    const repLabel = isRepLocked ? REPUTATION_TITLES.find(r => r.id === repNeeded)?.label : null;

    // Lock warning banner
    const lockWarning = (isLevelLocked || isRepLocked) ? `
      <div style="background:rgba(255,0,0,0.08);border:1px solid var(--red);border-radius:4px;padding:4px 8px;margin-bottom:6px;font-size:.7em;display:flex;gap:8px;flex-wrap:wrap;">
        ${isLevelLocked ? `<span style="color:var(--red);">🔒 Requires Level ${levelReq}</span>` : ''}
        ${isRepLocked ? `<span style="color:var(--epic);">👑 Requires ${repLabel} Reputation</span>` : ''}
      </div>` : '';

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
    </div>`;
  }).join('');
}

// ============================================
// PLACE BID
// ============================================

async function placeBid(auctionId, currentBid) {
  const minBid = currentBid + Math.max(100, Math.floor(currentBid * 0.05));
  const bidAmount = parseInt(prompt(`Minimum bid: ${formatNumber(minBid)}g\nEnter your bid:`));
  if (!bidAmount || isNaN(bidAmount)) return;
  if (bidAmount < minBid) { notify(`❌ Minimum bid is ${formatNumber(minBid)}g!`, 'var(--red)'); return; }
  if (bidAmount > state.gold) { notify('❌ Not enough gold!', 'var(--red)'); return; }
  try {
    // Fetch auction to know if we were the previous bidder
    const { data: auction } = await dbClient.from('auctions')
      .select('current_bidder_id,current_bid,item_name').eq('id', auctionId).single();
    if (!auction) { notify('❌ Auction not found!', 'var(--red)'); return; }
    const wasOurBid = auction.current_bidder_id === state.character_id;
    const prevBid = auction.current_bid || 0;

    const { error } = await dbClient.rpc('process_bid', {
      p_auction_id: auctionId,
      p_bidder_character_id: state.character_id,
      p_bid_amount: bidAmount,
    });
    if (error) throw error;

    // Sync state.gold to match what DB just did
    if (wasOurBid) state.gold += prevBid; // our previous bid was refunded
    state.gold -= bidAmount;              // new bid deducted

    await savePlayerToSupabase();
    addLog(`⬆️ Bid: ${formatNumber(bidAmount)}g on ${auction.item_name}!`, 'gold');
    notify(`⬆️ Bid: ${formatNumber(bidAmount)}g!`, 'var(--gold)');
    updateUI();
    fetchAuctions();
  } catch (error) {
    notify('❌ Bid failed: ' + error.message, 'var(--red)');
    console.error('Bid error:', error);
  }
}

// ============================================
// BUYOUT
// ============================================

async function buyoutAuction(auctionId, buyoutPrice) {
  if (buyoutPrice > state.gold) { notify('❌ Not enough gold!', 'var(--red)'); return; }
  if (!confirm(`Buy now for ${formatNumber(buyoutPrice)}g?\n(10% fee applies to seller)`)) return;
  try {
    const { error } = await dbClient.rpc('process_buyout', {
      p_auction_id: auctionId,
      p_buyer_character_id: state.character_id,
    });
    if (error) throw error;

    // Sync state.gold to match what DB just did
    state.gold -= buyoutPrice;

    // Fetch auction to get item (now completed)
    const { data: auction } = await dbClient.from('auctions').select('*').eq('id', auctionId).single();
    const item = auction.item_description
      ? (typeof auction.item_description === 'string' ? JSON.parse(auction.item_description) : auction.item_description)
      : { name: auction.item_name, rarity: auction.rarity, uid: genUid(), category: 'equipment', equipped: false };
    item.uid = genUid();
    addToInventory(item);

    trackQuestAuction();
    await savePlayerToSupabase();
    addLog(`🏛️ Bought ${auction.item_name} for ${formatNumber(buyoutPrice)}g!`, 'legendary');
    notify(`🏛️ Item purchased!`, 'var(--gold)');
    playSound('snd-craft');
    updateUI();
    renderInventory();
    fetchAuctions();

  } catch (error) {
    notify('❌ Purchase failed: ' + error.message, 'var(--red)');
    console.error('Buyout error:', error);
  }
}

// ============================================
// LIST ITEM
// ============================================

async function listItemForAuction(uid) {
  const item = state.inventory.find(i => i.uid === uid);
  if (!item) { notify('❌ Item not found!', 'var(--red)'); return; }
  if (item.equipped) { notify('❌ Unequip item first!', 'var(--red)'); return; }
  if (!state.character_id) { notify('❌ Must be logged in to list items!', 'var(--red)'); return; }
  const startPrice = parseInt(prompt('Starting bid price (gold):'));
  if (!startPrice || isNaN(startPrice) || startPrice <= 0) return;
  const buyoutInput = prompt('Buyout price (leave empty for no buyout):');
  const buyoutPrice = buyoutInput ? parseInt(buyoutInput) : null;
  if (buyoutPrice && buyoutPrice <= startPrice) { notify('❌ Buyout must be higher than start price!', 'var(--red)'); return; }
  try {
    const idx = state.inventory.findIndex(i => i.uid === uid);
    state.inventory.splice(idx, 1);
    const endsAt = new Date();
    endsAt.setHours(endsAt.getHours() + 24);
    const { error } = await dbClient.rpc('create_auction_listing', {
      p_character_id: state.character_id,
      p_item_name: item.name,
      p_item_description: typeof item === 'object' ? item : JSON.parse(item),
      p_rarity: item.rarity || 'normal',
      p_start_price: startPrice,
      p_buyout_price: buyoutPrice || null,
      p_ends_at: endsAt.toISOString(),
    });
    if (error) throw error;
    await savePlayerToSupabase();
    addLog(`🏛️ ${item.name} listed! Starts at ${formatNumber(startPrice)}g`, 'gold');
    notify(`🏛️ Item listed for auction!`, 'var(--gold)');
    renderInventory();
    updateUI();
  } catch (error) {
    state.inventory.push(item); // restore item on failure
    notify('❌ Listing failed: ' + error.message, 'var(--red)');
    console.error('List error:', error);
  }
}

// ============================================
// CANCEL AUCTION
// ============================================

async function cancelAuction(auctionId) {
  if (!confirm('Cancel this auction? Item will be returned.')) return;
  try {
    const { data: auction } = await dbClient.from('auctions').select('*').eq('id', auctionId).single();
    if (!auction) { notify('❌ Auction not found!', 'var(--red)'); return; }
    if (auction.seller_id !== state.character_id) { notify('❌ Not your auction!', 'var(--red)'); return; }

    const wasOurBid = auction.current_bidder_id === state.character_id;
    const bidToRefund = auction.current_bid || 0;

    const { error } = await dbClient.rpc('process_cancel', {
      p_auction_id: auctionId,
      p_seller_character_id: state.character_id,
    });
    if (error) throw error;

    // If we were also the bidder, refund state.gold
    if (wasOurBid && bidToRefund > 0) state.gold += bidToRefund;

    // Return item to local inventory
    const item = auction.item_description
      ? (typeof auction.item_description === 'string' ? JSON.parse(auction.item_description) : auction.item_description)
      : { name: auction.item_name, rarity: auction.rarity, category: 'equipment', equipped: false };
    item.uid = genUid();
    addToInventory(item);

    await savePlayerToSupabase();
    notify('✅ Auction cancelled!', 'var(--gold)');
    addLog(`❌ Cancelled auction for ${auction.item_name}`, 'info');
    renderInventory();
    updateUI();
    fetchAuctions();

  } catch (error) {
    notify('❌ Cancel failed: ' + error.message, 'var(--red)');
    console.error('Cancel error:', error);
  }
}

// ============================================
// SWITCH TAB
// ============================================

function switchMarketTab(tab) {
  document.getElementById('market-ah').style.display = tab === 'auction' ? 'block' : 'none';
  document.getElementById('market-tab-ah').classList.toggle('active', tab === 'auction');
  if (tab === 'auction') fetchAuctions();
}