import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================================
// STAT-AWARE DIALOGUE BUILDER — SERVER ONLY
// ============================================================

function buildSovanDialogue(ctx: any): string {
  const { level, enhancement, isFirstVisit, rep, mood } = ctx

  // First visit
  if (isFirstVisit) return `Sok sabay! First time here? Come, come! Sovan makes the best weapons in the kingdom, bong!`

  // Mood overrides
  if (mood === 'angry' || rep < -20) return `Oun... Sovan is disappointed. Come back with better attitude.`

  // Enhancement reactions — most specific first
  const enhLines: Record<string, string[]> = {
    none: [
      `No enhancement at all? Oun, the weapon is crying. Go enhance before you come back.`,
      `Bong... zero enhancement? Sovan's heart hurts. The craft deserves respect.`,
    ],
    low: [
      `+${enhancement}? Some work done, bong. But Sovan knows you can do better.`,
      `The weapon is +${enhancement}. Decent start. Keep pushing, oun.`,
    ],
    mid: [
      `+${enhancement}! Now we're talking. The ancestors nod their heads, bong.`,
      `Ah, +${enhancement}. Respectable craft. Sovan is pleased today.`,
    ],
    high: [
      `+${enhancement}! Bong, this is serious craft. Angkor smiths would approve.`,
      `Look at this +${enhancement}! Sovan is getting emotional. The ancestors are proud.`,
    ],
    max: [
      `*Sovan drops his hammer* +${enhancement}... The ancestors weep with joy, bong. This is perfection.`,
      `+${enhancement}! Sovan has never been more proud. This weapon will be remembered in history, lok.`,
    ]
  }

  // Level reactions
  const levelComment =
    level < 10  ? `You are still young, level ${level}. Much to learn.` :
    level < 30  ? `Level ${level} — still growing. Keep fighting, bong.` :
    level < 60  ? `Level ${level}! You have come far. Sovan remembers when you started.` :
    level < 90  ? `Level ${level}... You are truly powerful now, lok.` :
    `Level ${level}. A legend walks into Sovan's forge. Awkunh for honoring this place.`

  // Rep-based warmth
  const warmth =
    rep >= 75000 ? `Lord Count! Please, come in! Sovan has something special prepared for you today. ` :
    rep >= 35000 ? `Oh my! Lord Viscount! What brings you to my forge today? ` :
    rep >= 15000 ? `Sovan's What a great day! Lord Mayor! ` :
    rep >= 5000 ? `Greetings, Esteemed Chief! Welcome back to the forge. ` :
    rep >= 1000 ? `Good to see you again, bong! ` :
    rep >= 0  ? `Back again! ` : ``

  // Pick enhancement tier
  const tier =
    enhancement === 0            ? 'none' :
    enhancement <= 4             ? 'low'  :
    enhancement <= 9             ? 'mid'  :
    enhancement <= 12            ? 'high' : 'max'

  const lines = enhLines[tier]
  const enhLine = lines[level % lines.length] // deterministic, not random

  if (rep >= 75000 && enhancement >= 15) {
  return `Lord Count... *Sovan lowers his voice* There is something beneath this forge I have never shown another customer. Follow me.`
}
if (rep >= 35000 && enhancement >= 13) {
  return `Lord Viscount! A +${enhancement} weapon? Ahh... now this is the kind of craftsmanship Sovan lives for.`
}

  return `${warmth}${enhLine} ${levelComment}`
}

function buildMirelaDialogue(ctx: any): string {
  const { level, gold, rep, mood, isFirstVisit, questsCompleted, questsAbandoned } = ctx

  if (isFirstVisit) return `Ah, a new face. The guild always has work for capable hands... for the right price.`
  if (mood === 'angry' || rep < -20) return `I'm a busy woman. Your completion rate is noted. Come back when you're serious about business.`

  const goldComment =
    gold === 0         ? `I see your pockets are empty. The guild has... budget-friendly options.` :
    gold < 10000        ? `Limited budget, I see. Mirela works with what she has.` :
    gold < 100000       ? `Some gold in your pocket. Good. We can do business.` :
    gold < 1000000      ? `A respectable sum. Let me show you what the guild has prepared.` :
    gold < 10000000     ? `A serious investor walks in. I saved something special for you.` :
    `*Mirela straightens up* That gold balance... The guild council will want to meet you personally.`

  const repComment =
    rep >= 60 ? ` Our most trusted associate returns.` :
    rep >= 30 ? ` Always good to see a reliable contractor.` :
    rep >= 0  ? `` :
    ` Your completion rate is... being monitored.`

  const abandonedComment = questsAbandoned > 0
    ? ` ${questsAbandoned} abandoned contract${questsAbandoned > 1 ? 's' : ''} on record. That affects our arrangement.`
    : ``

  return `${goldComment}${repComment}${abandonedComment}`
}

function buildAldricDialogue(ctx: any): string {
  const { level, playerClass, enhancement, rep, mood, isFirstVisit } = ctx

  if (isFirstVisit) return `...Another one walks through my door. Let's see if you're worth my time.`
  if (playerClass !== 'warrior') return `A ${playerClass}? I train Warriors. You're in the wrong hall.`
  if (mood === 'angry' || rep < -20) return `I have nothing to say to you. Prove yourself before you come back here.`

  const levelComment =
    level < 15  ? `Level ${level}. Raw. Unpolished. You have a long way to go.` :
    level < 30  ? `Level ${level}. Getting there. Don't get comfortable.` :
    level < 60  ? `Level ${level}. Now I see a warrior taking shape.` :
    level < 90  ? `Level ${level}. You've earned your scars. Good.` :
    `Level ${level}. ...I have nothing left to teach you. Sit down anyway.`

  const enhComment =
    enhancement < 5   ? ` That weapon enhancement is embarrassing. Fix it.` :
    enhancement < 10  ? ` Enhancement is acceptable. Push it higher.` :
    enhancement < 13  ? `` :
    ` That enhancement... Hmph. Not bad.`

  const repComment =
    rep >= 60 ? `Kid. ` :
    rep >= 30 ? `` : ``

  return `${repComment}${levelComment}${enhComment}`
}

function buildSeraphineDialogue(ctx: any): string {
  const { level, playerClass, intStat, rep, mood, isFirstVisit } = ctx

  if (isFirstVisit) return `Another student presents themselves. We shall see if your mind is worth my time.`
  if (playerClass !== 'mage') return `You are not a Mage. I find this conversation already tiresome.`
  if (mood === 'angry' || rep < -20) return `I don't waste my knowledge on the unreliable. Prove your worth first.`

  const intComment =
    intStat < 50   ? `Your INT is... modest. We have much foundational work to do.` :
    intStat < 150  ? `INT of ${intStat}. Acceptable. The arcane demands more.` :
    intStat < 300  ? `INT ${intStat}. Now we are speaking the same language.` :
    `INT ${intStat}. Remarkable. You may actually be worth my time.`

  const levelComment =
    level < 15 ? ` Level ${level} — still an apprentice.` :
    level < 40 ? `` :
    level < 70 ? ` Your progress is... acceptable.` :
    ` A true arcane scholar stands before me.`

  return `${intComment}${levelComment}`
}

function buildVexDialogue(ctx: any): string {
  const { level, playerClass, agiStat, rep, mood, isFirstVisit } = ctx

  if (isFirstVisit) return `Oh look. Fresh meat found the Den. Cute. Let's see if you last.`
  if (playerClass !== 'rogue') return `Wrong class, wrong door, wrong everything. Classic. *starts to fade*`
  if (mood === 'angry' || rep < -20) return `Oh it's you. I'd leave if I were you. Actually I am leaving. *vanishes*`

  const agiComment =
    agiStat < 50  ? `You move like a cart horse. We have work to do. Maybe.` :
    agiStat < 150 ? `AGI ${agiStat}. Not terrible. Not great. Somewhere in between.` :
    agiStat < 300 ? `Okay. AGI ${agiStat}. You might not die immediately.` :
    `...AGI ${agiStat}. I'm actually impressed. Don't tell anyone.`

  const repComment =
    rep >= 60 ? `Crew's here. ` :
    rep >= 30 ? `Heh. You came back. ` : ``

  return `${repComment}${agiComment}`
}

function buildKaraDialogue(ctx: any): string {
  const { level, playerClass, rep, mood, isFirstVisit } = ctx

  if (isFirstVisit) return `You found the outpost. Good instincts. Ash is watching you.`
  if (playerClass !== 'hunter') return `Ash doesn't like you. I trust Ash. Wrong path.`
  if (mood === 'angry' || rep < -20) return `*silence* *Ash blocks your path*`

  const levelComment =
    level < 25  ? `Level ${level}. The forest will still kill you. Train more.` :
    level < 50  ? `Level ${level}. You move better now. Ash has noticed.` :
    level < 75  ? `Level ${level}. The hunt has changed you. Good.` :
    `Level ${level}. Ash wagged his tail when you arrived. That means something.`

  const repComment = rep >= 60 ? `Pack member returns. ` : ``

  return `${repComment}${levelComment}`
}

function buildElianDialogue(ctx: any): string {
  const { level, playerClass, rep, mood, isFirstVisit, questsAbandoned } = ctx

  if (isFirstVisit) return `Welcome, traveler. The monastery is open to those who seek the light.`
  if (playerClass !== 'paladin') return `The light calls different souls to different paths. Yours does not lead here, friend.`
  if (mood === 'angry' || rep < -20) return `I pray for your soul. But I cannot teach you today. Reflect on your choices.`

  const abandonComment = questsAbandoned > 0
    ? `You left ${questsAbandoned} soul${questsAbandoned > 1 ? 's' : ''} without help. The light sees this. Tell me why.`
    : `The light welcomes you back.`

  const levelComment =
    level < 35  ? ` Level ${level} — your faith is still young. That is fine.` :
    level < 60  ? `` :
    ` Your spirit grows stronger. I can see it.`

  return `${abandonComment}${levelComment}`
}

function buildMalacharDialogue(ctx: any): string {
  const { level, playerClass, rep, mood, isFirstVisit } = ctx

  if (isFirstVisit) return `...Someone living enters the Crypt. Interesting. The dead are curious about you.`
  if (playerClass !== 'necromancer') return `The dead whisper... wrong class. They find it amusing.`
  if (level < 50) return `...The dead say you are not ready. Come back when you have seen more death. Level 50 minimum.`
  if (mood === 'angry' || rep < -20) return `The dead have told me things about you. Unflattering things. Leave.`

  const levelComment =
    level < 65  ? `Level ${level}. The dead are... mildly interested.` :
    level < 80  ? `Level ${level}. The line between life and death blurs around you now.` :
    `Level ${level}. ...The dead bow. Do you understand what that means?`

  const repComment = rep >= 60 ? `...The dead smile when you arrive. ` : ``

  return `${repComment}${levelComment}`
}

function buildNaraDialogue(ctx: any): string {
  const { level, playerClass, rep, mood, isFirstVisit } = ctx

  if (isFirstVisit) return `The spirits told me you would come. Sit. The grove has been waiting.`
  if (playerClass !== 'shaman') return `Your spirit walks a different path. This one is not yours.`
  if (level < 70) return `Your spirit is not yet ready for this grove. Return when you reach level 70.`
  if (mood === 'angry' || rep < -20) return `Your spirit is clouded today. The spirits will not speak through me for you.`

  const levelComment =
    level < 80  ? `Level ${level}. The spirits stir when you arrive. They are beginning to know you.` :
    level < 95  ? `Level ${level}. Your spirit has grown vast. The ancient ones are taking notice.` :
    `Level ${level}. Elder spirit walks in living flesh. The grove honors you.`

  return levelComment
}

function buildRagnarDialogue(ctx: any): string {
  const { level, playerClass, rep, isFirstVisit } = ctx

  if (playerClass !== 'berserker') return `WRONG CLASS! Come back as a Berserker! HAHA!`
  if (level < 90) return `LEVEL 90 MINIMUM! COME BACK WHEN YOU'VE BLED MORE! HAHAHAHA!`
  if (isFirstVisit) return `YOU MADE IT TO LEVEL 90?! THEN YOU'RE ALREADY MY KIND OF PERSON! WELCOME TO THE BLOODPIT!`

  const levelComment =
    level < 95  ? `YOU'RE HERE! Level ${level} Berserker! THE BLOODPIT MISSED YOUR CHAOS!` :
    level < 100 ? `Level ${level}! ALMOST THERE! KEEP BREAKING THINGS!` :
    `LEVEL 100 BERSERKER ENTERS THE BLOODPIT! EVERYONE STOP! SHOW SOME RESPECT! HAHAHA!`

  const repComment = rep >= 60 ? `MY FAVORITE WALKING DISASTER! ` : ``

  return `${repComment}${levelComment}`
}

// ============================================================
// DIALOGUE ROUTER
// ============================================================
function buildDialogue(npcId: string, ctx: any): string {
  switch(npcId) {
    case 'sovan':         return buildSovanDialogue(ctx)
    case 'mirela':        return buildMirelaDialogue(ctx)
    case 'aldric':        return buildAldricDialogue(ctx)
    case 'seraphine':     return buildSeraphineDialogue(ctx)
    case 'vex':           return buildVexDialogue(ctx)
    case 'kara':          return buildKaraDialogue(ctx)
    case 'brother_elian': return buildElianDialogue(ctx)
    case 'malachar':      return buildMalacharDialogue(ctx)
    case 'nara':          return buildNaraDialogue(ctx)
    case 'ragnar':        return buildRagnarDialogue(ctx)
    default: return `...`
  }
}

// ============================================================
// NPC META — UNLOCK RULES
// ============================================================
const NPC_META: Record<string, any> = {
  aldric:        { unlockLevel: 10,  requiredClass: 'warrior'      },
  seraphine:     { unlockLevel: 10,  requiredClass: 'mage'         },
  vex:           { unlockLevel: 10,  requiredClass: 'rogue'        },
  kara:          { unlockLevel: 20,  requiredClass: 'hunter'       },
  brother_elian: { unlockLevel: 30,  requiredClass: 'paladin'      },
  malachar:      { unlockLevel: 50,  requiredClass: 'necromancer'  },
  nara:          { unlockLevel: 70,  requiredClass: 'shaman'       },
  ragnar:        { unlockLevel: 90,  requiredClass: 'berserker'    },
  mirela:        { unlockLevel: 1,   requiredClass: null           },
  sovan:         { unlockLevel: 1,   requiredClass: null           },
}

// ============================================================
// MAIN HANDLER
// ============================================================
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const { npc_id, message_type, character_id } = await req.json()
    if (!npc_id || !character_id) return errorResponse('Missing npc_id or character_id')

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

    // Fetch real player data
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id, name, level, class, stats, equipped, inventory, gold')
      .eq('user_id', user.id)
      .eq('id', character_id)
      .single()

    if (charError || !character) return errorResponse('Character not found')

    // Get NPC meta
    const meta = NPC_META[npc_id]
    if (!meta) return errorResponse('NPC not found')

    // Server-side unlock validation
    if (character.level < meta.unlockLevel) {
      return jsonResponse({
        response: `*You sense you are not yet worthy of their attention. Required level: ${meta.unlockLevel}*`,
        mood: 'neutral',
        relationship_score: 0
      })
    }

    if (meta.requiredClass && character.class !== meta.requiredClass) {
      return jsonResponse({
        response: buildDialogue(npc_id, { playerClass: character.class, level: character.level, rep: 0, mood: 'neutral', isFirstVisit: false }),
        mood: 'neutral',
        relationship_score: 0
      })
    }

    // Fetch or create relationship
    let { data: relationship } = await supabase
      .from('npc_relationships')
      .select('*')
      .eq('player_id', user.id)
      .eq('npc_id', npc_id)
      .single()

    const isFirstVisit = !relationship

    if (!relationship) {
      const { data: newRel } = await supabase
        .from('npc_relationships')
        .insert({
          player_id: user.id,
          npc_id,
          relationship_score: 0,
          mood: 'neutral',
          memory: [],
          quests_completed: [],
          quests_abandoned: [],
          last_visited: new Date().toISOString()
        })
        .select()
        .single()
      relationship = newRel
    }

    // Calculate max enhancement from equipped items
    const equipped = character.equipped || {}
    const inventory = character.inventory || []
    const equippedUids = Object.values(equipped) as string[]
    const equippedItems = inventory.filter((item: any) => equippedUids.includes(item.uid))
    const maxEnhancement = equippedItems.length > 0
      ? Math.max(...equippedItems.map((item: any) => item.enhancement || 0))
      : 0

    // Build context
    const stats = character.stats || {}
    const ctx = {
      level:            character.level,
      playerClass:      character.class,
      gold:             character.gold || 0,
      enhancement:      maxEnhancement,
      rep:              relationship.relationship_score,
      mood:             relationship.mood,
      isFirstVisit,
      questsCompleted:  (relationship.quests_completed as any[]).length,
      questsAbandoned:  (relationship.quests_abandoned as any[]).length,
      strStat:          stats.baseStr || 0,
      agiStat:          stats.baseAgi || 0,
      intStat:          stats.baseInt || 0,
    }

    // Build stat-aware dialogue
    const response = buildDialogue(npc_id, ctx)

    // Update last visited
    await supabase
      .from('npc_relationships')
      .update({ last_visited: new Date().toISOString() })
      .eq('player_id', user.id)
      .eq('npc_id', npc_id)

    return jsonResponse({
      response,
      npc_name: npc_id,
      mood: relationship.mood,
      relationship_score: relationship.relationship_score
    })

  } catch (err) {
    console.error('talk-to-npc error:', err)
    return errorResponse('Internal server error', 500)
  }
})

// ============================================================
// HELPERS
// ============================================================
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