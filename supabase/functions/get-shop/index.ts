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
    const { character_id, tab } = await req.json()
    if (!character_id) return errorResponse('Missing character_id')

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
      .select('id, level, reputation_rank, gold')
      .eq('user_id', user.id)
      .eq('id', character_id)
      .single()

    if (charError || !character) return errorResponse('Character not found')

    const playerRank = character.reputation_rank || 'citizen'
    const playerRankIndex = rankIndex(playerRank)
    const playerLevel = character.level || 1

    // Fetch shop items from game_config
    const itemKey = tab === 'consumable' ? 'shop_cons_items' : 'shop_equip_items'
    const { data: configRows } = await supabase
      .from('game_config')
      .select('value')
      .eq('key', itemKey)
      .single()

    if (!configRows) return errorResponse('Shop config not found')

    const allItems: any[] = configRows.value

    // Split visible vs locked
    const visibleItems = allItems.filter(item => {
      if (!item.repReq) return true
      return rankIndex(item.repReq) <= playerRankIndex
    })

    const lockedItems = allItems.filter(item => {
      if (!item.repReq) return false
      return rankIndex(item.repReq) > playerRankIndex
    })

    // Group locked by next tier only — don't reveal future tiers
    const nextLockedRank = lockedItems.length > 0
      ? lockedItems.reduce((min: string, item: any) => {
          return rankIndex(item.repReq) < rankIndex(min) ? item.repReq : min
        }, lockedItems[0].repReq)
      : null

    const nextLockedCount = lockedItems.filter(i => i.repReq === nextLockedRank).length
    const totalLockedCount = lockedItems.length

    // Mirela's intro based on rank
    const mirelaIntro: Record<string, string> = {
      citizen:  `*without looking up* This is what I sell to citizens. Don't get excited.`,
      baron:    `A Baron deserves slightly better. Don't tell the citizens what's on the back shelf.`,
      chief:    `*unlocks back shelf* Chiefs get the real inventory. Don't abuse the privilege.`,
      mayor:    `I reserved this specifically for your rank, Lord Mayor. Take your time.`,
      viscount: `This shelf doesn't exist for most players, Lord Viscount. You've earned the right to see it.`,
      count:    `*locks the door* Lord Count. What I'm about to show you has no price tag for ordinary customers.`,
    }

    return jsonResponse({
      items: visibleItems,
      lockedCount: totalLockedCount,
      nextLockedRank,
      nextLockedCount,
      playerRank,
      playerLevel,
      playerGold: character.gold,
      mirelaIntro: mirelaIntro[playerRank] || mirelaIntro.citizen,
    })

  } catch (err) {
    console.error('get-shop error:', err)
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