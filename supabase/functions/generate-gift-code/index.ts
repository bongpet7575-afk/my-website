import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ADMIN_PASSWORD = 'monk35@702703'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateCode(tier: string): string {
  const prefix = tier.toUpperCase().slice(0, 4)
  const random = Math.random().toString(36).substring(2, 10).toUpperCase()
  return `${prefix}-${random}`
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const { password, tier } = await req.json()

  if (password !== ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401,
      headers: corsHeaders
    })
  }

  const tiers: Record<string, any> = {
    adventurer: { diamonds: 100, gold: 5000, spins: 1 },
    warrior:    { diamonds: 350, gold: 15000, spins: 3 },
    champion:   { diamonds: 650, gold: 30000, spins: 5 },
  }

  if (!tiers[tier]) {
    return new Response(JSON.stringify({ error: 'Invalid tier' }), { 
      status: 400,
      headers: corsHeaders
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const code = generateCode(tier)
  const { error } = await supabase.from('gift_codes').insert({
    code,
    tier,
    ...tiers[tier]
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: corsHeaders
    })
  }

  return new Response(JSON.stringify({ success: true, code }), { 
    status: 200,
    headers: corsHeaders
  })
})