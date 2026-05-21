import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function genUid() {
  return 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

function makeStarterItem(slot: string, level: number) {
  const icons: Record<string, string> = {
    weapon: '⚔️', armor: '🛡️', helmet: '⛑️',
    boots: '👢', ring: '💍', amulet: '📿'
  }
  const names: Record<string, string> = {
    weapon: 'Sword', armor: 'Plate', helmet: 'Helm',
    boots: 'Boots', ring: 'Ring', amulet: 'Amulet'
  }

  const stats: Record<string, any> = {}
  if (slot === 'weapon') {
    stats.str = 40
    stats.strMult = 0.25
    stats.hit = 100
    stats.hitMult = 0.25
    stats.crit = 3
    stats.lifeSteal = 0.04
  } else if (slot === 'armor') {
    stats.armor = 7000
    stats.sta = 40
    stats.staMult = 0.25
    stats.maxHp = 2500
    stats.maxHpMult = 0.25
    stats.hpRegen = 300
    stats.dodge = 400
  } else if (slot === 'helmet') {
    stats.armor = 7000
    stats.int = 40
    stats.intMult = 0.07
  } else if (slot === 'boots') {
    stats.armor = 7000
    stats.agi = 40
    stats.agiMult = 0.25
  } else if (slot === 'ring') {
    stats.str = 40
    stats.int = 40
    stats.agi = 40
    stats.sta = 40
  } else if (slot === 'amulet') {
    stats.strMult = 0.07
    stats.agiMult = 0.07
    stats.intMult = 0.07
    stats.staMult = 0.07
  }

  return {
    uid: genUid(),
    name: `${icons[slot]} Supporter's ${names[slot]}`,
    category: 'equipment',
    slot,
    rarity: 'uncommon',
    enhancement: 0,
    stats,
    equipped: false,
    levelReq: 1,
    sellPrice: 5000,
    starterPackItem: true,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, character_id, player_name } = await req.json()

    if (!code || !character_id) {
      return new Response(JSON.stringify({ error: 'Missing code or character_id' }), {
        status: 400, headers: corsHeaders
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check code exists and is unused
    const { data: giftCode, error: fetchError } = await supabase
      .from('gift_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('used', false)
      .single()

    if (fetchError || !giftCode) {
      return new Response(JSON.stringify({ error: 'Invalid or already used code' }), {
        status: 400, headers: corsHeaders
      })
    }

    // Fetch character
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('gold, soul_crystals, name, premium_spins, inventory, starter_pack_redeemed')
      .eq('id', character_id)
      .single()

    if (charError || !character) {
      return new Response(JSON.stringify({ error: 'Character not found' }), {
        status: 400, headers: corsHeaders
      })
    }

    // One-time check for starter_pack
    if (giftCode.tier === 'starter_pack' && character.starter_pack_redeemed) {
      return new Response(JSON.stringify({ error: 'Starter Pack already redeemed on this account' }), {
        status: 400, headers: corsHeaders
      })
    }

    // Mark code as used
    const { error: updateError } = await supabase
      .from('gift_codes')
      .update({
        used: true,
        used_by: character.name || player_name || String(character_id),
        used_at: new Date().toISOString()
      })
      .eq('code', giftCode.code)
      .eq('used', false)

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Code already redeemed' }), {
        status: 400, headers: corsHeaders
      })
    }

    // Build update payload
    const updatePayload: Record<string, any> = {
      gold: (character.gold || 0) + giftCode.gold,
      soul_crystals: (character.soul_crystals || 0) + giftCode.diamonds,
      premium_spins: (character.premium_spins || 0) + giftCode.spins,
    }

    let starterItems: any[] = []

    if (giftCode.tier === 'starter_pack') {
      // Generate 6 uncommon starter items
      const slots = ['weapon', 'armor', 'helmet', 'boots', 'ring', 'amulet']
      const charLevel = character.level || 1
      starterItems = slots.map(slot => makeStarterItem(slot, charLevel))

      const currentInventory = (character.inventory || []).map((item: any) =>
  typeof item === 'string' ? JSON.parse(item) : item
)
      updatePayload.inventory = [...currentInventory, ...starterItems]
      updatePayload.starter_pack_redeemed = true
      updatePayload.supporter_title = '🎖️ Supporter'
      updatePayload.chat_color = '#22c55e'
    }

    const { error: rewardError } = await supabase
      .from('characters')
      .update(updatePayload)
      .eq('id', character_id)

    if (rewardError) {
      return new Response(JSON.stringify({ error: 'Failed to give rewards' }), {
        status: 500, headers: corsHeaders
      })
    }

    return new Response(JSON.stringify({
      success: true,
      rewards: {
        gold: giftCode.gold,
        diamonds: giftCode.diamonds,
        spins: giftCode.spins,
        tier: giftCode.tier,
        starterItems: starterItems.length > 0 ? starterItems : undefined,
        supporterTitle: giftCode.tier === 'starter_pack' ? '🎖️ Supporter' : undefined,
        chatColor: giftCode.tier === 'starter_pack' ? '#22c55e' : undefined,
      }
    }), { status: 200, headers: corsHeaders })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: corsHeaders
    })
  }
})