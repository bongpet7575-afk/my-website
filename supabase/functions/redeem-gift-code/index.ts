import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Mark code as used FIRST (atomic — prevents double redemption)
    const { error: updateError } = await supabase
      .from('gift_codes')
      .update({
        used: true,
        used_by: player_name || character_id,
        used_at: new Date().toISOString()
      })
      .eq('code', giftCode.code)
      .eq('used', false) // double check still unused

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Code already redeemed' }), {
        status: 400, headers: corsHeaders
      })
    }

    // Fetch current character stats
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('gold, soulCrystals, premiumSpins')
      .eq('id', character_id)
      .single()

    if (charError || !character) {
      return new Response(JSON.stringify({ error: 'Character not found' }), {
        status: 400, headers: corsHeaders
      })
    }

    // Update character rewards server-side
    const { error: rewardError } = await supabase
      .from('characters')
      .update({
        gold: (character.gold || 0) + giftCode.gold,
        soulCrystals: (character.soulCrystals || 0) + giftCode.diamonds,
        premiumSpins: (character.premiumSpins || 0) + giftCode.spins,
      })
      .eq('id', character_id)

    if (rewardError) {
      return new Response(JSON.stringify({ error: 'Failed to give rewards' }), {
        status: 500, headers: corsHeaders
      })
    }

    // Return rewards so frontend can sync state
    return new Response(JSON.stringify({
      success: true,
      rewards: {
        gold: giftCode.gold,
        diamonds: giftCode.diamonds,
        spins: giftCode.spins,
        tier: giftCode.tier
      }
    }), { status: 200, headers: corsHeaders })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: corsHeaders
    })
  }
})