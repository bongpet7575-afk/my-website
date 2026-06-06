import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function genUid() {
  return 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

const SLOT_ICONS: Record<string, string> = {
  weapon:'⚔️', armor:'🛡️', helmet:'⛑️', boots:'👢', ring:'💍', amulet:'📿'
}
const EQUIP_PREFIXES: Record<string, string[]> = {
  legendary: ['Divine','Mythic','Godforged','Ancient','Eternal','Celestial'],
  epic:      ['Heroic','Valiant','Exalted','Magnificent','Radiant'],
  rare:      ['Polished','Reinforced','Enchanted','Gleaming'],
  uncommon:  ['Sturdy','Sharpened','Improved','Sturdy'],
  normal:    ['Iron','Wooden','Basic','Simple'],
}
const EQUIP_NAMES: Record<string, string[]> = {
  weapon:  ['Blade','Sword','Axe','Spear','Dagger','Staff','Bow'],
  armor:   ['Plate','Chainmail','Robe','Leather','Cuirass'],
  helmet:  ['Helm','Crown','Hood','Circlet','Visor'],
  boots:   ['Greaves','Sabatons','Boots','Treads'],
  ring:    ['Band','Seal','Loop','Signet'],
  amulet:  ['Pendant','Amulet','Talisman','Necklace'],
}
const RARITY_MULT: Record<string, number> = {
  normal: 1, uncommon: 1.2, rare: 1.5, epic: 2, legendary: 3
}

function rand(mn: number, mx: number): number {
  return Math.random() * (mx - mn) + mn
}

function getEquipStats(slot: string, stageId: number): Record<string, [number, number]> {
  const s = stageId
  const base = s * 12
  const statSets: Record<string, Record<string, [number, number]>> = {
    weapon:  { str:[base*0.8,base*1.4], strMult:[0.01*s,0.03*s], lifeSteal:[0.01,0.02*s], crit:[s*0.5,s*1.5], hit:[base*0.3,base*0.6], hitMult:[0.01*s,0.03*s] },
    armor:   { armor:[base*2,base*5], sta:[base*0.5,base*1.0], staMult:[0.01*s,0.03*s], maxHp:[base*3,base*8], maxHpMult:[0.01*s,0.03*s], hpRegen:[base*0.5,base*1.5], dodgeMult:[0.01*s,0.03*s], dodge:[base*0.5,base*2] },
    helmet:  { armor:[base*1.5,base*3], int:[base*0.5,base*1.0], intMult:[0.01*s,0.03*s], attackPower:[base*1,base*3] },
    boots:   { armor:[base*1.5,base*3], agi:[base*0.5,base*1.0], agiMult:[0.01*s,0.03*s] },
    ring:    { str:[base*0.4,base*0.8], int:[base*0.4,base*0.8], agi:[base*0.4,base*0.8], sta:[base*0.4,base*0.8] },
    amulet:  { strMult:[0.01*s,0.03*s], agiMult:[0.01*s,0.03*s], intMult:[0.01*s,0.03*s], staMult:[0.01*s,0.03*s] },
  }
  return statSets[slot]
}

function mkEquipDrop(slot: string, rarity: string, stageId: number) {
  const mult = RARITY_MULT[rarity] || 1
  const prefixes = EQUIP_PREFIXES[rarity]
  const names = EQUIP_NAMES[slot]
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const suffix = names[Math.floor(Math.random() * names.length)]
  const statRanges = getEquipStats(slot, stageId)
  const stats: Record<string, number> = {}

  Object.entries(statRanges).forEach(([k, [mn, mx]]) => {
    const raw = rand(mn, mx) * mult
    stats[k] = mx < 1 ? Math.round(raw * 1000) / 1000 : Math.round(raw)
  })

  return {
    uid:       genUid(),
    name:      `${SLOT_ICONS[slot]} ${prefix} ${suffix}`,
    category:  'equipment',
    slot,
    rarity,
    stats,
    equipped:  false,
    enh_level: 0,
    levelReq:  (stageId - 1) * 10,
    sellPrice: Math.round(stageId * 12 * mult * 500),
  }
}

const TIER_CONFIG: Record<string, { rarity: string, stage: number }> = {
  adventurer: { rarity: 'uncommon', stage: 1 },
  warrior:    { rarity: 'rare',     stage: 3 },
  champion:   { rarity: 'epic',     stage: 5 },
  starter_pack: { rarity: 'uncommon', stage: 1 },
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
        used:     true,
        used_by:  character.name || player_name || String(character_id),
        used_at:  new Date().toISOString()
      })
      .eq('code', giftCode.code)
      .eq('used', false)

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Code already redeemed' }), {
        status: 400, headers: corsHeaders
      })
    }

    // Generate items for all tiers
    const tierCfg = TIER_CONFIG[giftCode.tier]
    const slots = ['weapon', 'armor', 'helmet', 'boots', 'ring', 'amulet']
    const generatedItems = tierCfg
      ? slots.map(slot => mkEquipDrop(slot, tierCfg.rarity, tierCfg.stage))
      : []

    // Normalize existing inventory
    let equipmentBag: any[] = []
    let consumableBag: any[] = []
    let materialBag: any[] = []
    const existingInv = character.inventory

    if (existingInv && !Array.isArray(existingInv) && existingInv.equipment !== undefined) {
      equipmentBag  = (existingInv.equipment  || []).map((i: any) => typeof i === 'string' ? JSON.parse(i) : i)
      consumableBag = (existingInv.consumable || []).map((i: any) => typeof i === 'string' ? JSON.parse(i) : i)
      materialBag   = (existingInv.material   || []).map((i: any) => typeof i === 'string' ? JSON.parse(i) : i)
    } else if (Array.isArray(existingInv)) {
      equipmentBag = existingInv.map((i: any) => typeof i === 'string' ? JSON.parse(i) : i)
    }

    // Add generated items to equipment bag (max 50 slots)
    for (const item of generatedItems) {
      if (equipmentBag.length < 50) equipmentBag.push(item)
    }

    // Build update payload
    const updatePayload: Record<string, any> = {
      gold:          (character.gold || 0) + (giftCode.gold || 0),
      soul_crystals: (character.soul_crystals || 0) + (giftCode.diamonds || 0),
      premium_spins: (character.premium_spins || 0) + (giftCode.spins || 0),
      inventory: {
        equipment:  equipmentBag,
        consumable: consumableBag,
        material:   materialBag,
      }
    }

    // Starter pack extras
    if (giftCode.tier === 'starter_pack') {
      updatePayload.starter_pack_redeemed = true
      updatePayload.supporter_title       = '🎖️ Supporter'
      updatePayload.chat_color            = '#22c55e'
      updatePayload.is_supporter          = true
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
        gold:           giftCode.gold,
        diamonds:       giftCode.diamonds,
        spins:          giftCode.spins,
        tier:           giftCode.tier,
        items:          generatedItems,
        supporterTitle: giftCode.tier === 'starter_pack' ? '🎖️ Supporter' : undefined,
        chatColor:      giftCode.tier === 'starter_pack' ? '#22c55e' : undefined,
      }
    }), { status: 200, headers: corsHeaders })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: corsHeaders
    })
  }
})