import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('BOT_SUPABASE_URL')!,
  Deno.env.get('BOT_SERVICE_ROLE_KEY')!,
);

// ── BOT CONFIG ──
const BOT_USER_ID = '00000000-0000-0000-0000-000000000001';

// Stage config matching your game
const STAGE_CONFIG = [
  { id:1,  xp:100,  gold:[50,150],   levelReq:1  },
  { id:2,  xp:250,  gold:[150,300],  levelReq:10 },
  { id:3,  xp:500,  gold:[300,600],  levelReq:20 },
  { id:4,  xp:800,  gold:[500,900],  levelReq:30 },
  { id:5,  xp:1200, gold:[800,1400], levelReq:40 },
  { id:6,  xp:2000, gold:[1200,2000],levelReq:50 },
  { id:7,  xp:3000, gold:[2000,3500],levelReq:60 },
  { id:8,  xp:5000, gold:[3000,5000],levelReq:70 },
  { id:9,  xp:8000, gold:[4000,7000],levelReq:80 },
  { id:10, xp:12000,gold:[6000,10000],levelReq:90},
];

const SLOTS = ['weapon','armor','helmet','boots','ring','amulet'];
const RARITIES = ['rare','rare','epic','epic','legendary'];

// ── HELPERS ──
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function generateBlackWingItems() {
  // Only run on Monday (UTC+7 Cambodia time)
  const nowCambodia = new Date()
  nowCambodia.setUTCHours(nowCambodia.getUTCHours() + 7)
  const dayOfWeek = nowCambodia.getUTCDay() // 0=Sunday, 1=Monday

  if (dayOfWeek !== 1) {
    console.log('Black Wing only restocks on Monday — skipping')
    return
  }

  // Check current active Black Wing inventory
  const { data: existing } = await supabase
    .from('auctions')
    .select('rarity')
    .eq('source', 'blackwing')
    .eq('status', 'active')

  const currentEpic      = existing?.filter(i => i.rarity === 'epic').length || 0
  const currentLegendary = existing?.filter(i => i.rarity === 'legendary').length || 0

  const neededEpic      = 3 - currentEpic
  const neededLegendary = 2 - currentLegendary

  if (neededEpic <= 0 && neededLegendary <= 0) {
    console.log('🖤 Black Wing fully stocked — nothing to restock')
    return
  }

  console.log(`🖤 Black Wing Monday restock: +${neededEpic} epic, +${neededLegendary} legendary`)

  const slots = ['weapon', 'armor', 'helmet', 'boots', 'ring', 'amulet']
  const endsAt = new Date()
  endsAt.setDate(endsAt.getDate() + 7) // expires next Monday

  const itemsToGenerate = [
    ...Array(neededEpic).fill({ rarity: 'epic', stageRange: [6, 8] as [number, number] }),
    ...Array(neededLegendary).fill({ rarity: 'legendary', stageRange: [8, 10] as [number, number] }),
  ]

  for (const config of itemsToGenerate) {
    const slot     = slots[rand(0, slots.length - 1)]
    const stageId  = rand(config.stageRange[0], config.stageRange[1])
    const stats    = genBotItemStats(slot, stageId, config.rarity)
    const itemName = genBotItemName(slot, config.rarity)

    const mult: Record<string, number> = { epic: 4, legendary: 7 }
    const base       = Math.pow(stageId, 2.2) * 8
    const sellPrice  = Math.round(base * (mult[config.rarity] || 1) * 500)
    const startPrice = Math.floor(sellPrice * 2)

    const item = {
      uid:      `blackwing_${Date.now()}_${Math.random()}`,
      name:     itemName,
      category: 'equipment',
      slot,
      rarity:   config.rarity,
      stats,
      equipped:  false,
      levelReq: (stageId - 1) * 10,
      sellPrice,
    }

    const { error } = await supabase.from('auctions').insert({
      seller_id:         null,
      user_id:           BOT_USER_ID,
      item_name:         itemName,
      item_description:  JSON.stringify(item),
      rarity:            config.rarity,
      start_price:       startPrice,
      buyout_price:      null,
      current_bid:       0,
      current_bidder_id: null,
      ends_at:           endsAt.toISOString(),
      status:            'active',
      source:            'blackwing',
      seller_collected:  true,
      winner_collected:  false,
    })

    if (error) {
      console.log(`Black Wing generation failed: ${error.message}`)
    } else {
      console.log(`🖤 Black Wing restocked: ${itemName} [${config.rarity}]`)
    }
  }
}

function genBotItemName(slot: string, rarity: string): string {
  const prefixes: Record<string, string[]> = {
    legendary: ['Divine','Mythic','Godforged','Ancient','Eternal'],
    epic:      ['Heroic','Valiant','Exalted','Magnificent','Radiant'],
    rare:      ['Polished','Reinforced','Enchanted','Gleaming'],
  };
  const names: Record<string, string[]> = {
    weapon:  ['Blade','Sword','Axe','Spear','Staff'],
    armor:   ['Plate','Chainmail','Cuirass','Robe'],
    helmet:  ['Helm','Crown','Hood','Circlet'],
    boots:   ['Greaves','Sabatons','Boots','Treads'],
    ring:    ['Band','Seal','Signet','Loop'],
    amulet:  ['Pendant','Amulet','Talisman','Necklace'],
  };
  const icons: Record<string, string> = {
    weapon:'⚔️', armor:'🛡️', helmet:'⛑️', boots:'👢', ring:'💍', amulet:'📿'
  };
  const prefix = (prefixes[rarity] || prefixes.rare)[rand(0, (prefixes[rarity]||prefixes.rare).length-1)];
  const name = names[slot][rand(0, names[slot].length-1)];
  return `${icons[slot]} ${prefix} ${name}`;
}

function genBotItemStats(slot: string, stageId: number, rarity: string): Record<string, number> {
  const mult: Record<string, number> = { normal:1, uncommon:1.5, rare:2.5, epic:4, legendary:7 };
  const m = mult[rarity] || 1;
  
  // Fixed base — linear scaling instead of exponential
  const base = stageId * 12;

  const statSets: Record<string, Record<string, [number,number]>> = {
    weapon:  { 
      str:      [base*0.8,  base*1.4], 
      strMult:  [0.01*stageId, 0.03*stageId], 
      crit:     [stageId*0.5, stageId*1.5] 
    },
    armor:   { 
      armor:    [base*2,    base*5], 
      sta:      [base*0.5,  base*1.0], 
      maxHp:    [base*3,    base*8] 
    },
    helmet:  { 
      armor:    [base*1.5,  base*3], 
      int:      [base*0.5,  base*1.0] 
    },
    boots:   { 
      armor:    [base*1.5,  base*3], 
      agi:      [base*0.5,  base*1.0] 
    },
    ring:    { 
      str:      [base*0.4,  base*0.8], 
      int:      [base*0.4,  base*0.8], 
      agi:      [base*0.4,  base*0.8], 
      sta:      [base*0.4,  base*0.8] 
    },
    amulet:  { 
      strMult:  [0.01*stageId, 0.03*stageId], 
      agiMult:  [0.01*stageId, 0.03*stageId], 
      intMult:  [0.01*stageId, 0.03*stageId] 
    },
  };

  const ranges = statSets[slot] || statSets.weapon;
  const stats: Record<string, number> = {};
  for (const [k, [mn, mx]] of Object.entries(ranges)) {
    const raw = (Math.random() * (mx - mn) + mn) * m;
    // Mult stats (strMult etc) stay as decimals, others are integers
    stats[k] = mx < 1 ? Math.round(raw * 1000) / 1000 : Math.round(raw);
  }
  return stats;
}

// ── ACTION 1: BOT DUNGEON RUN ──
async function botDungeonRun(bot: any) {
  // Load stage config from game_config
  const { data: configs } = await supabase
    .from('game_config')
    .select('key, value')
    .in('key', ['monster_xp_mult', 'monster_gold_mult', 'boss_gold_ranges'])

  const configMap: any = {}
  configs?.forEach(c => { configMap[c.key] = c.value })

  const bossGoldRanges = configMap['boss_gold_ranges'] || {}
  const xpMults = configMap['monster_xp_mult'] || {}
  const goldMults = configMap['monster_gold_mult'] || {}

  // Pick highest stage bot can do
  const STAGE_LEVEL_REQ: Record<number, number> = {
    1:1, 2:10, 3:20, 4:30, 5:40, 6:50, 7:60, 8:70, 9:80, 10:90
  }

  const availableStages = Object.entries(STAGE_LEVEL_REQ)
    .filter(([_, req]) => bot.level >= req)
    .map(([id]) => Number(id))

  if (!availableStages.length) return

  const stageId = availableStages[availableStages.length - 1]
  const bossKey = `stage_boss_${stageId}`
  const stageKey = `stage_${stageId}`

  // Use same gold ranges as real players
  const bossGoldRange = bossGoldRanges[bossKey] || [50, 150]
  const goldMult = goldMults[stageKey] || 1
  const xpMult = xpMults[stageKey] || 1

  // Boss XP values matching STAGE_BOSSES
  const BOSS_XP: Record<number, number> = {
    1:4000, 2:8000, 3:16000, 4:21000, 5:42000,
    6:80000, 7:160000, 8:300000, 9:600000, 10:1000000
  }

  const baseXp = BOSS_XP[stageId] || 100
  const xpGained = Math.floor(baseXp * xpMult)
  const goldGained = Math.floor(
    (Math.random() * (bossGoldRange[1] - bossGoldRange[0]) + bossGoldRange[0]) * goldMult
  )

  const newExp = (bot.exp || 0) + xpGained
  const newGold = (bot.gold || 0) + goldGained

  // Level up check
  let newLevel = bot.level
  let remainingExp = newExp
  while (remainingExp >= newLevel * 100 * 20 && newLevel < 100) {
    remainingExp -= newLevel * 100 * 20
    newLevel++
  }

  await supabase.from('characters').update({
    exp: remainingExp,
    gold: newGold,
    level: newLevel,
    updated_at: new Date().toISOString(),
  }).eq('id', bot.id)

  await supabase.from('leaderboard').upsert({
    player_id: bot.id,
    user_id: BOT_USER_ID,
    level: newLevel,
    gold: newGold,
    class: bot.class,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'player_id' })

  console.log(`🤖 ${bot.name} completed stage ${stageId} — +${xpGained}xp +${goldGained}g`)
}
// ── ACTION 2: BOT PLACE BID ──
async function botPlaceBid(bot: any) {
  const { data: auctions, error } = await supabase
    .from('auctions')
    .select('*')
    .eq('status', 'active')
    .eq('source', 'player')
    .in('rarity', ['rare', 'epic', 'legendary'])
    .gt('ends_at', new Date().toISOString())
    .neq('seller_id', bot.id)
    .or(`current_bidder_id.is.null,current_bidder_id.neq.${bot.id}`)
    .limit(10);

  console.log(`🤖 ${bot.name} found ${auctions?.length ?? 0} auctions to bid on`, error);
  if (!auctions || !auctions.length) return;

  const toBid = auctions.sort(() => Math.random() - 0.5).slice(0, rand(1, 2));

  for (const auction of toBid) {
    const currentBid = auction.current_bid || auction.start_price;
    
    // Must bid at least 5% higher than current
    const minBid = currentBid + Math.max(100, Math.floor(currentBid * 0.05));
    
    // Bot won't spend more than 10% of its gold on one item
    const maxBotBid = Math.floor(bot.gold * 0.10);

    // Skip if can't afford minimum bid
    if (minBid > maxBotBid || minBid > bot.gold) {
      console.log(`🤖 ${bot.name} can't afford ${auction.item_name} (min: ${minBid}, gold: ${bot.gold})`);
      continue;
    }

    // Skip if auction price is already too inflated vs sellPrice
    try {
      const item = typeof auction.item_description === 'string'
        ? JSON.parse(auction.item_description)
        : auction.item_description;
      
      const fairValue = (item?.sellPrice || 0) * 5; // reduced from 10
      if (fairValue > 0 && currentBid > fairValue) {
        console.log(`🤖 ${bot.name} skipping overpriced ${auction.item_name} (bid: ${currentBid} > fair: ${fairValue})`);
        continue;
      }
    } catch (e) { continue; }

    const bidAmount = rand(minBid, Math.min(maxBotBid, Math.floor(minBid * 1.1)));

    // Refund previous bidder if any
    if (auction.current_bidder_id && auction.current_bid > 0) {
      const { data: prevBidder } = await supabase
        .from('characters')
        .select('gold')
        .eq('id', auction.current_bidder_id)
        .single();
      if (prevBidder) {
        await supabase.from('characters')
          .update({ gold: prevBidder.gold + auction.current_bid })
          .eq('id', auction.current_bidder_id);
      }
    }

    // Deduct gold from bot
    await supabase.from('characters')
      .update({ gold: bot.gold - bidAmount })
      .eq('id', bot.id);
    bot.gold -= bidAmount;

  // Place bid directly on auction row
    const { error: bidError } = await supabase
      .from('auctions')
      .update({
        current_bid: bidAmount,
        current_bidder_id: bot.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auction.id)
      .eq('status', 'active');

    if (bidError) {
      console.log(`🤖 ${bot.name} bid failed on ${auction.item_name}: ${bidError.message}`);
      // Refund bot since bid failed
      await supabase.from('characters')
        .update({ gold: bot.gold + bidAmount })
        .eq('id', bot.id);
      bot.gold += bidAmount;
    } else {
      console.log(`🤖 ${bot.name} bid ${bidAmount}g on ${auction.item_name}`);
    }
  }
}
// ── ACTION 3: BOT LIST ITEM ──
async function botListItem(bot: any) {
  // 40% chance to list this run
  if (Math.random() > 0.4) return

  // Check existing active listings
  const { data: existingListings } = await supabase
    .from('auctions')
    .select('id')
    .eq('seller_id', bot.id)
    .eq('status', 'active')

  // Max 3 active listings per bot
  if (existingListings && existingListings.length >= 3) {
    console.log(`🤖 ${bot.name} already has ${existingListings.length} active listings`)
    return
  }

  const slot = SLOTS[rand(0, SLOTS.length - 1)]
  const RARITIES = ['rare','rare','rare','rare','epic']
  const rarity = RARITIES[rand(0, RARITIES.length - 1)]
  // Mostly rare, occasional epic but never legendary
  
  const rarityStage: Record<string, [number, number]> = {
    rare: [3, 5], epic: [5, 8], legendary: [8, 10],
  }
  const [minStage, maxStage] = rarityStage[rarity]
  const stageId = rand(minStage, maxStage)

  const stats = genBotItemStats(slot, stageId, rarity)
  const itemName = genBotItemName(slot, rarity)
  const mult: Record<string, number> = { rare: 2.5, epic: 4, legendary: 7 }
  const base = Math.pow(stageId, 2.2) * 8
  const sellPrice = Math.round(base * (mult[rarity] || 1) * 500)
  const startPrice = Math.floor(sellPrice * (1.5 + Math.random()))
  const buyoutPrice = Math.floor(startPrice * (2 + Math.random()))

  const item = {
    uid: `bot_${Date.now()}_${Math.random()}`,
    name: itemName,
    category: 'equipment',
    slot, rarity, stats,
    equipped: false,
    levelReq: (stageId - 1) * 10,
    sellPrice,
  }

  // 48 hours expiry
  const endsAt = new Date()
  endsAt.setHours(endsAt.getHours() + 48)

  const { error } = await supabase.from('auctions').insert({
    seller_id: bot.id,
    user_id: BOT_USER_ID,
    item_name: itemName,
    item_description: JSON.stringify(item),
    rarity,
    start_price: startPrice,
    buyout_price: buyoutPrice,
    current_bid: 0,
    current_bidder_id: null,
    ends_at: endsAt.toISOString(),
    status: 'active',
    source: 'player',
    seller_collected: false,
    winner_collected: false,
  })

  if (error) {
    console.log(`🤖 ${bot.name} failed to list item: ${error.message}`)
    return
  }

  console.log(`🤖 ${bot.name} listed ${itemName} starting at ${startPrice}g (48h)`)
}

// ── ACTION 4: BOT ARENA REGISTRATION ──
async function botArenaRegister(bot: any) {
  const { data: tournaments, error } = await supabase
    .from('arena_tournaments')
    .select('*')
    .eq('status', 'open')
    .lte('min_level', bot.level)
    .gt('starts_at', new Date().toISOString()) // ✅ uncommented

  console.log(`🤖 ${bot.name} found ${tournaments?.length ?? 0} tournaments`, error)

  if (!tournaments || !tournaments.length) return
  // rest of function unchanged

  for (const tournament of tournaments) {
    // Check if already registered
    const { data: existing } = await supabase
      .from('arena_registrations')
      .select('id')
      .eq('tournament_id', tournament.id)
      .eq('character_id', bot.id)
      .single();

    if (existing) continue;

    // Check slot availability
    const { data: registrations } = await supabase
      .from('arena_registrations')
      .select('id')
      .eq('tournament_id', tournament.id);

    if (registrations && registrations.length >= (tournament.max_slots || 8)) continue;

    // Pay entry fee
    if (tournament.entry_fee && tournament.entry_fee > bot.gold) continue;
    if (tournament.entry_fee) {
      await supabase.from('characters')
        .update({ gold: bot.gold - tournament.entry_fee })
        .eq('id', bot.id);
      bot.gold -= tournament.entry_fee;
    }

    // Build snapshot
    const snapshot = {
      id: bot.id,
      name: bot.name,
      level: bot.level,
      class: bot.class,
      stats: bot.stats,
      equipped: bot.equipped,
      health: bot.health,
      max_health: bot.max_health,
      mana: bot.mana,
      max_mana: bot.max_mana,
      is_bot: true,
    };

    await supabase.from('arena_registrations').insert({
      tournament_id: tournament.id,
      character_id: bot.id,
      user_id: BOT_USER_ID,
      points: 0,
      rank: 0,
      reward_claimed: false,
      character_snapshot: snapshot,
      skill_combo: {},
      qualified_for_grand_final: false,
    });

    console.log(`🤖 ${bot.name} registered for tournament ${tournament.id}`);
  }
}

// ── ACTION 5: COLLECT WON AUCTION ITEMS ──
async function botCollectWonItems(bot: any) {
  const { data: wonAuctions } = await supabase
    .from('auctions')
    .select('*')
    .eq('current_bidder_id', bot.id)
    .eq('status', 'completed')
    .eq('winner_collected', false);

  if (!wonAuctions || !wonAuctions.length) return;

  for (const auction of wonAuctions) {
    await supabase.from('auctions')
      .update({ winner_collected: true })
      .eq('id', auction.id);
    console.log(`🤖 ${bot.name} collected ${auction.item_name}`);
  }
}

// ── MAIN HANDLER ──
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
const expectedKey = Deno.env.get('BOT_SCHEDULER_SECRET')

console.log('Auth received:', authHeader)
console.log('Expected key length:', expectedKey?.length)

if (!authHeader || authHeader !== `Bearer ${expectedKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: corsHeaders
    })
  }

  try {
    // Fetch all bot characters
    const { data: bots, error } = await supabase
      .from('characters')
      .select('*')
      .eq('is_bot', true)
      .eq('user_id', BOT_USER_ID);

    if (error) throw error;
    if (!bots || !bots.length) {
      return new Response(JSON.stringify({ message: 'No bots found' }), { status: 200 });
    }

    console.log(`🤖 Running bot scheduler for ${bots.length} bots...`);

    for (const bot of bots) {
      try {
        await botDungeonRun(bot);
        await botPlaceBid(bot);
        await botListItem(bot);
        await botArenaRegister(bot);
        await botCollectWonItems(bot);
      } catch (botError) {
        console.error(`Bot ${bot.name} error:`, botError);
      }
    }
    await generateBlackWingItems() // ✅ ADD THIS
    return new Response(JSON.stringify({ 
      success: true, 
      botsRun: bots.length,
      timestamp: new Date().toISOString(),
    }), { status: 200 });

  } catch (error) {
    console.error('Bot scheduler error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});