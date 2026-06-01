import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const REP_ORDER = ['citizen', 'baron', 'chief', 'mayor', 'viscount', 'count']

function rankIndex(rank: string): number {
  return REP_ORDER.indexOf(rank?.toLowerCase() || 'citizen')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const body = await req.json()
    const { action, character_id } = body
    if (!action || !character_id) return errorResponse('Missing action or character_id')

    // Authenticate
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return errorResponse('Unauthorized', 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return errorResponse('Unauthorized', 401)

    // Fetch real player data — never trust client
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id, gold, reputation_rank, inventory, user_id')
      .eq('user_id', user.id)
      .eq('id', character_id)
      .single()

    if (charError || !character) return errorResponse('Character not found')

    const playerRank = character.reputation_rank || 'citizen'
    const playerRankIndex = rankIndex(playerRank)

    // ── AUCTION HOUSE REP GATE ──
    // list, bid, buyout all require Baron+
    const auctionActions = ['list', 'bid', 'buyout']
    if (auctionActions.includes(action) && playerRankIndex < rankIndex('chief')) {
  return errorResponse('Auction House requires Chief reputation. Speak to Mirela.', 403)
}

    // ── HANDLE ACTIONS ──

    // LIST ITEM
    if (action === 'list') {
      const { item, start_price, buyout_price } = body
      if (!item || !start_price) return errorResponse('Missing item or start_price')

      // Validate item exists in player inventory server-side
      const inventory = character.inventory || []
      const itemExists = inventory.find((i: any) => i.uid === item.uid && !i.equipped)
      if (!itemExists) return errorResponse('Item not found in inventory or is equipped')

      const endsAt = new Date()
      endsAt.setHours(endsAt.getHours() + 24)

      const { error } = await supabase.rpc('create_auction_listing', {
        p_character_id: character_id,
        p_item_name: item.name,
        p_item_description: item,
        p_rarity: item.rarity || 'normal',
        p_start_price: start_price,
        p_buyout_price: buyout_price || null,
        p_ends_at: endsAt.toISOString(),
      })

      if (error) return errorResponse(error.message)
      return jsonResponse({ success: true, message: `${item.name} listed successfully` })
    }

    // PLACE BID
    if (action === 'bid') {
      const { auction_id, bid_amount } = body
      if (!auction_id || !bid_amount) return errorResponse('Missing auction_id or bid_amount')

      // Validate player has enough gold server-side
      if (bid_amount > character.gold) return errorResponse('Not enough gold')

      // Fetch auction to validate minimum bid
      const { data: auction } = await supabase
        .from('auctions')
        .select('current_bid, start_price, current_bidder_id, status, ends_at')
        .eq('id', auction_id)
        .single()

      if (!auction) return errorResponse('Auction not found')
      if (auction.status !== 'active') return errorResponse('Auction is not active')
      if (new Date(auction.ends_at) < new Date()) return errorResponse('Auction has ended')

      const currentBid = auction.current_bid || auction.start_price
      const minBid = currentBid + Math.max(100, Math.floor(currentBid * 0.05))
      if (bid_amount < minBid) return errorResponse(`Minimum bid is ${minBid}g`)

      const { error } = await supabase.rpc('process_bid', {
        p_auction_id: auction_id,
        p_bidder_character_id: character_id,
        p_bid_amount: bid_amount,
      })

      if (error) return errorResponse(error.message)
      return jsonResponse({ success: true, message: `Bid of ${bid_amount}g placed` })
    }

    // BUYOUT
    if (action === 'buyout') {
      const { auction_id } = body
      if (!auction_id) return errorResponse('Missing auction_id')

      const { data: auction } = await supabase
        .from('auctions')
        .select('buyout_price, status, ends_at, item_description, item_name, rarity')
        .eq('id', auction_id)
        .single()

      if (!auction) return errorResponse('Auction not found')
      if (auction.status !== 'active') return errorResponse('Auction is not active')
      if (!auction.buyout_price) return errorResponse('No buyout price set')
      if (auction.buyout_price > character.gold) return errorResponse('Not enough gold')

      const { error } = await supabase.rpc('process_buyout', {
        p_auction_id: auction_id,
        p_buyer_character_id: character_id,
      })

      if (error) return errorResponse(error.message)

      const item = typeof auction.item_description === 'string'
        ? JSON.parse(auction.item_description)
        : auction.item_description

      return jsonResponse({
        success: true,
        message: `Purchased ${auction.item_name}`,
        item,
        gold_spent: auction.buyout_price
      })
    }

    // CANCEL
    if (action === 'cancel') {
      const { auction_id } = body
      if (!auction_id) return errorResponse('Missing auction_id')

      // Verify ownership server-side
      const { data: auction } = await supabase
        .from('auctions')
        .select('seller_id, current_bid, current_bidder_id, item_description, item_name, status')
        .eq('id', auction_id)
        .single()

      if (!auction) return errorResponse('Auction not found')
      if (auction.seller_id !== character_id) return errorResponse('Not your auction')
      if (auction.status !== 'active') return errorResponse('Auction is not active')

      const { error } = await supabase.rpc('process_cancel', {
        p_auction_id: auction_id,
        p_seller_character_id: character_id,
      })

      if (error) return errorResponse(error.message)

      const item = typeof auction.item_description === 'string'
        ? JSON.parse(auction.item_description)
        : auction.item_description

      return jsonResponse({
        success: true,
        message: `Auction cancelled`,
        item,
        bid_refund: auction.current_bidder_id === character_id ? auction.current_bid : 0
      })
    }

    return errorResponse('Unknown action')

  } catch (err) {
    console.error('auction-action error:', err)
    return errorResponse('Internal server error', 500)
  }
})

function jsonResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  })
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  })
}