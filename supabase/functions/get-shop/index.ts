import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const { character_id, tab } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('gold, level, reputation_rank')
      .eq('id', character_id)
      .single()

    if (charError || !character) {
      return new Response(JSON.stringify({ error: 'Character not found' }), { status: 400 })
    }

    const playerGold = character.gold || 0;
    const playerLevel = character.level || 0;
    const playerRep = character.reputation_rank || 'citizen';

    const { data: allItems, error: itemError } = await supabase
      .from('shop_items')
      .select('*')
      .eq('category', tab)
      .order('price', { ascending: true });

    if (itemError) throw itemError;

    // MATCHES talk-to-npc exactly:
    const rankOrder = ['citizen', 'baron', 'chief', 'mayor', 'viscount', 'count'];
    const playerRankIndex = rankOrder.indexOf(playerRep);

    const visibleItems = allItems.filter(item => {
      const req = item.rep_req || 'citizen';
      return rankOrder.indexOf(req) <= playerRankIndex;
    });

    const lockedItems = allItems.filter(item => {
      const req = item.rep_req || 'citizen';
      return rankOrder.indexOf(req) > playerRankIndex;
    });

    const nextRank = rankOrder[playerRankIndex + 1] || null;
    const lockedCount = lockedItems.length;
    const nextLockedCount = lockedItems.filter(i => i.rep_req === nextRank).length;

    // Dialogue consistency: Mirela knows your rank
    const mirelaIntros = {
      'citizen': "Welcome. Just the basics for a citizen. Don't waste my time.",
      'baron': "A Baron! I can show you the back shelf now.",
      'chief': "Chief. The real treasures are reserved for people of your standing.",
      'mayor': "Lord Mayor. I'll show you the reserved stock.",
      'viscount': "Lord Viscount. A pleasure. The hidden gems are yours.",
      'count': "Lord Count. *locks door* The guild master is waiting. Sit."
    };

    return new Response(
      JSON.stringify({
        items: visibleItems,
        lockedCount: lockedCount,
        nextLockedRank: nextRank,
        nextLockedCount: nextLockedCount,
        mirelaIntro: mirelaIntros[playerRep] || mirelaIntros['citizen'],
        playerGold: playerGold,
        playerLevel: playerLevel
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
