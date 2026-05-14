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
  const base = Math.pow(stageId, 2.2) * 8;
  const statSets: Record<string, Record<string, [number,number]>> = {
    weapon:  { str:[base*0.8,base*1.4], strMult:[0.05*stageId,0.12*stageId], crit:[stageId,stageId*2.5] },
    armor:   { armor:[base*600,base*1200], sta:[base*0.8,base*1.4], maxHp:[base*80,base*200] },
    helmet:  { armor:[base*300,base*800], int:[base*0.8,base*1.4] },
    boots:   { armor:[base*300,base*800], agi:[base*0.8,base*1.4] },
    ring:    { str:[base*0.6,base*1.2], int:[base*0.6,base*1.2], agi:[base*0.6,base*1.2], sta:[base*0.6,base*1.2] },
    amulet:  { strMult:[0.04*stageId,0.1*stageId], agiMult:[0.04*stageId,0.1*stageId], intMult:[0.04*stageId,0.1*stageId] },
  };
  const ranges = statSets[slot] || statSets.weapon;
  const stats: Record<string, number> = {};
  for (const [k, [mn, mx]] of Object.entries(ranges)) {
    const raw = (Math.random() * (mx - mn) + mn) * m;
    stats[k] = mx < 1 ? Math.round(raw * 1000) / 1000 : Math.round(raw);
  }
  return stats;
}

// ── ACTION 1: BOT DUNGEON RUN ──
async function botDungeonRun(bot: any) {
  // Pick highest stage bot can do based on level
  const availableStages = STAGE_CONFIG.filter(s => bot.level >= s.levelReq);
  if (!availableStages.length) return;
  const stage = availableStages[availableStages.length - 1];

  const xpGained = stage.xp + rand(0, Math.floor(stage.xp * 0.3));
  const goldGained = rand(stage.gold[0], stage.gold[1]);
  const newExp = (bot.exp || 0) + xpGained;
  const newGold = (bot.gold || 0) + goldGained;

  // Simple level up check
  let newLevel = bot.level;
  let remainingExp = newExp;
  while (remainingExp >= newLevel * 100 * 20 && newLevel < 100) {
    remainingExp -= newLevel * 100 * 20;
    newLevel++;
  }

  await supabase.from('characters').update({
    exp: remainingExp,
    gold: newGold,
    level: newLevel,
    updated_at: new Date().toISOString(),
  }).eq('id', bot.id);

  // Update leaderboard
  await supabase.from('leaderboard').upsert({
    player_id: bot.id,
    user_id: BOT_USER_ID,
    level: newLevel,
    gold: newGold,
    class: bot.class,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'player_id' });

  console.log(`🤖 ${bot.name} completed stage ${stage.id} — +${xpGained}xp +${goldGained}g`);
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
    const minBid = currentBid + Math.max(100, Math.floor(currentBid * 0.05));
    const maxBotBid = Math.floor(bot.gold * 0.15);

    try {
      const item = typeof auction.item_description === 'string'
        ? JSON.parse(auction.item_description)
        : auction.item_description;
      const fairValue = (item?.sellPrice || 0) * 10;
      if (auction.start_price > fairValue * 3) {
        console.log(`🤖 ${bot.name} skipping overpriced item ${auction.item_name}`);
        continue;
      }
    } catch (e) { continue; }

    if (minBid > maxBotBid) continue;

    const bidAmount = rand(minBid, Math.min(maxBotBid, Math.floor(minBid * 1.2)));

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

    // Place bid
    await supabase.from('auctions').update({
      current_bid: bidAmount,
      current_bidder_id: bot.id,
      updated_at: new Date().toISOString(),
    }).eq('id', auction.id);

    console.log(`🤖 ${bot.name} bid ${bidAmount}g on ${auction.item_name}`);
  }
}
// ── ACTION 3: BOT LIST ITEM ──
async function botListItem(bot: any) {
  // 40% chance to list an item this run
  if (Math.random() > 0.4) return;

  // Generate a random item to list
  const slot = SLOTS[rand(0, SLOTS.length - 1)];
  const rarity = RARITIES[rand(0, RARITIES.length - 1)];
  const rarityStage: Record<string, [number,number]> = {
    rare: [3,5], epic: [5,8], legendary: [8,10],
  };
  const [minStage, maxStage] = rarityStage[rarity];
  const stageId = rand(minStage, maxStage);

  const stats = genBotItemStats(slot, stageId, rarity);
  const itemName = genBotItemName(slot, rarity);
  const mult: Record<string, number> = { rare:2.5, epic:4, legendary:7 };
  const base = Math.pow(stageId, 2.2) * 8;
  const sellPrice = Math.round(base * (mult[rarity] || 1) * 50);
  const startPrice = Math.floor(sellPrice * (1.5 + Math.random()));
  const buyoutPrice = Math.floor(startPrice * (2 + Math.random()));

  const item = {
    uid: `bot_${Date.now()}_${Math.random()}`,
    name: itemName,
    category: 'equipment',
    slot, rarity, stats, equipped: false,
    levelReq: (stageId - 1) * 10,
    sellPrice,
  };

  const endsAt = new Date();
  endsAt.setHours(endsAt.getHours() + 24);

  await supabase.from('auctions').insert({
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
  });

  console.log(`🤖 ${bot.name} listed ${itemName} starting at ${startPrice}g`);
}

// ── ACTION 4: BOT ARENA REGISTRATION ──
async function botArenaRegister(bot: any) {
  // Check for open tournaments bot qualifies for
  const { data: tournaments, error } = await supabase
    .from('arena_tournaments')
    .select('*')
    .eq('status', 'open')
    .lte('min_level', bot.level)
   // .gt('starts_at', new Date().toISOString());
    console.log(`🤖 ${bot.name} found ${tournaments?.length ?? 0} tournaments`, error);

  if (!tournaments || !tournaments.length) return;

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
Deno.serve(async (req) => {
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