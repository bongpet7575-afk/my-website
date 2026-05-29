import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================================
// NPC DIALOGUE POOLS — FREE TIER (SERVER ONLY)
// ============================================================
const NPC_DIALOGUES: Record<string, any> = {
  aldric: {
    locked:      `*Aldric glances at you and turns away* "Come back when you're worth my time. Level 10 minimum."`,
    wrongClass:  `"I train Warriors. Whatever you are — wrong hall."`,
    greeting: {
      first_time: `"...Another one walks through my door. Let's see if you're worth my time."`,
      angry:      `"I have nothing to say to you. Prove yourself before you come back here."`,
      cold:       `"You're here. Fine. Don't waste my time."`,
      neutral:    `"You're back. Good. Consistency is the first step to not dying."`,
      warm:       `"Kid. Didn't expect you so soon. You're improving."`,
      impressed:  `"Now THIS is someone worth training. What do you need?"`,
      revered:    `"Brother. The forge of battle has made you strong. Sit down."`,
    }
  },

  seraphine: {
    locked:      `*Seraphine doesn't even look up from her tome* "Level 10. Minimum. Come back when you've earned the right."`,
    wrongClass:  `"You are not a Mage. I find this conversation already tiresome."`,
    greeting: {
      first_time: `"Another student presents themselves. We shall see if your mind is worth my time."`,
      angry:      `"I don't waste my knowledge on the unreliable. Prove your worth first."`,
      cold:       `"You're here. State your purpose quickly."`,
      neutral:    `"Ah. You've returned. Let us see if you've applied what you've learned."`,
      warm:       `"Your progress is... acceptable. What brings you to the Sanctum?"`,
      impressed:  `"I rarely say this — you are becoming a worthy student of the arcane."`,
      revered:    `"A peer walks in. Rare. Sit. We have much to discuss."`,
    }
  },

  vex: {
    locked:      `*A shadow shifts in the corner* "...Wrong place. Wrong time. Wrong level. Come back at 10." *gone*`,
    wrongClass:  `"Wrong class, wrong door, wrong everything. Classic." *vanishes*`,
    greeting: {
      first_time: `"Oh look. Fresh meat found the Den. Cute. Let's see if you last."`,
      angry:      `"Oh it's you. I'd leave if I were you. Actually I am leaving." *starts to fade*`,
      cold:       `"You again. Fine. Make it quick."`,
      neutral:    `"Back already? Either you're keen or you're lost. Which is it?"`,
      warm:       `"Heh. You actually came back. Maybe you're not completely useless."`,
      impressed:  `"Okay I'll admit it. You've surprised me. That doesn't happen often."`,
      revered:    `"Crew's here. Good. Got something interesting for you today."`,
    }
  },

  kara: {
    locked:      `*Kara studies you silently. Ash growls softly.* "Not yet. Level 20. The forest will kill you now."`,
    wrongClass:  `"Ash doesn't like you. I trust Ash. Wrong path."`,
    greeting: {
      first_time: `"You found the outpost. Good instincts. Ash is watching you."`,
      angry:      `*silence* *Ash blocks your path*`,
      cold:       `"You're here." *turns back to sharpening arrow*`,
      neutral:    `"Back. Good. The hunt never stops."`,
      warm:       `"Ash wagged his tail when you arrived. That means something."`,
      impressed:  `"You move differently now. Quieter. The forest is teaching you."`,
      revered:    `"Pack member returns. Ash missed you." *rare smile*`,
    }
  },

  brother_elian: {
    locked:      `*Brother Elian smiles gently* "The light has a path for you, but not here yet. Return at level 30."`,
    wrongClass:  `"The light calls different souls to different paths. Yours does not lead here, friend."`,
    greeting: {
      first_time: `"Welcome, traveler. The monastery is open to those who seek the light."`,
      angry:      `"I pray for your soul. But I cannot teach you today. Reflect on your choices."`,
      cold:       `"You've returned. I hope you've had time to reflect."`,
      neutral:    `"Ah. Come in. The light welcomes you back."`,
      warm:       `"Your spirit grows stronger. I can see it. Welcome back."`,
      impressed:  `"The light shines brightly in you today. Sit. Let us speak."`,
      revered:    `"A true disciple returns. The monastery is honored by your presence."`,
    }
  },

  malachar: {
    locked:      `*Malachar's eyes open slowly* "...The dead say you are not ready. Level 50. Come back when you've seen enough death."`,
    wrongClass:  `"The dead whisper... wrong class. They find it amusing."`,
    greeting: {
      first_time: `"...Someone living enters the Crypt. Interesting. The dead are curious about you."`,
      angry:      `"The dead have told me things about you. Unflattering things. Leave."`,
      cold:       `"You're alive. For now. State your purpose."`,
      neutral:    `"You return. The dead remembered you were coming."`,
      warm:       `"Ah. The dead smile when you arrive. That is... rare praise."`,
      impressed:  `"The line between life and death blurs around you now. You are growing powerful."`,
      revered:    `"...The dead bow. Do you understand what that means? Welcome back."`,
    }
  },

  nara: {
    locked:      `*Nara opens her eyes slowly* "Your spirit is not yet ready for this grove. Return when you reach level 70."`,
    wrongClass:  `"Your spirit walks a different path. This one is not yours."`,
    greeting: {
      first_time: `"The spirits told me you would come. Sit. The grove has been waiting."`,
      angry:      `"Your spirit is clouded today. The spirits will not speak through me for you. Return when you are clear."`,
      cold:       `"You are here. The spirits are quiet today."`,
      neutral:    `"The wind brought word of your return. Welcome back to the grove."`,
      warm:       `"The spirits stir when you arrive now. They are beginning to know you."`,
      impressed:  `"Your spirit has grown vast. The ancient ones are taking notice."`,
      revered:    `"Elder spirit walks in living flesh. The grove honors you."`,
    }
  },

  ragnar: {
    locked:      `"LEVEL 90 MINIMUM! COME BACK WHEN YOU'VE BLED MORE! HAHAHAHA!"`,
    wrongClass:  `"WRONG CLASS! Come back as a Berserker! The Bloodpit has no time for the weak! HAHA!"`,
    greeting: {
      first_time: `"YOU MADE IT TO LEVEL 90?! THEN YOU'RE ALREADY MY KIND OF PERSON! WELCOME TO THE BLOODPIT!"`,
      angry:      `"YOU! I'm actually MORE excited to see you when there's conflict! LETS GO!"`,
      cold:       `"YOU'RE BACK! GOOD! THE BLOODPIT MISSED YOUR CHAOS!"`,
      neutral:    `"ANOTHER DAY ANOTHER WARRIOR WALKS IN! WHAT DO YOU NEED?!"`,
      warm:       `"THERE THEY ARE! MY FAVORITE WALKING DISASTER! WHAT ARE WE BREAKING TODAY?!"`,
      impressed:  `"I HAVE NEVER BEEN MORE PROUD! YOU ARE A TRUE BERSERKER! SIT! DRINK! TRAIN!"`,
      revered:    `"LEGEND ENTERS THE BLOODPIT! EVERYONE STOP! SHOW SOME RESPECT! HAHAHA!"`,
    }
  },

  mirela: {
    locked:      null, // available from level 1
    wrongClass:  null, // available to all classes
    greeting: {
      first_time: `"Ah, a new face. The guild always has work for capable hands... for the right price."`,
      angry:      `"I'm a busy woman. Your completion rate is noted. Come back when you're serious."`,
      cold:       `"You're here. I have limited time. What do you need?"`,
      neutral:    `"Back already? Good. I may have something that suits your... skill set."`,
      warm:       `"My most consistent contractor. I saved something interesting for you."`,
      impressed:  `"You continue to exceed expectations. The guild has noticed. Sit down."`,
      revered:    `"My most trusted associate walks in. I have something very special today."`,
    }
  },

  sovan: {
    locked:      null, // available from level 1
    wrongClass:  null, // available to all classes
    greeting: {
      first_time: `"Sok sabay! First time here? Come, come! Sovan makes the best weapons in the kingdom, bong!"`,
      angry:      `"Oun... Sovan is disappointed. The craft deserves respect. Come back with better attitude."`,
      cold:       `"Ah. You are here. What does bong need today."`,
      neutral:    `"Bong is back! Good timing, the forge is hot. What can Sovan do for you?"`,
      warm:       `"Ah! My favorite customer! Sovan has been working on something special, bong!"`,
      impressed:  `"Look at you! The ancestors would be proud of what you've become, lok!"`,
      revered:    `"Bong! Sovan's heart is full today. Come, sit. Tea first, then we talk craft."`,
    }
  },
}

// ============================================================
// REPUTATION TIER → DIALOGUE KEY
// ============================================================
function getGreetingKey(score: number, mood: string, isFirstVisit: boolean): string {
  if (isFirstVisit) return 'first_time'
  if (mood === 'angry' || score < -20) return 'angry'
  if (score < 0) return 'cold'
  if (score < 30) return 'neutral'
  if (score < 60) return 'warm'
  if (score < 80) return 'impressed'
  return 'revered'
}

// ============================================================
// MAIN HANDLER
// ============================================================
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    // 1. Parse request
    const { npc_id, message_type, character_id } = await req.json()
if (!npc_id || !character_id) return errorResponse('Missing npc_id or character_id')
    // message_type: 'greet' (free) | 'chat' (paid - Claude, coming later)

    if (!npc_id) return errorResponse('Missing npc_id')

    // 2. Authenticate
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return errorResponse('Unauthorized', 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return errorResponse('Unauthorized', 401)

    // 3. Fetch real player data from DB
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id, name, level, class, stats, equipped')
      .eq('user_id', user.id)
      .eq('id', character_id)
      .single()

    if (charError || !character) return errorResponse('Character not found')

    // 4. Get NPC dialogues
    const npcDialogue = NPC_DIALOGUES[npc_id]
    if (!npcDialogue) return errorResponse('NPC not found')

    // 5. Get NPC registry for unlock rules
    const npcMeta: Record<string, any> = {
      aldric:        { unlockLevel: 10,  requiredClass: 'Warrior'      },
      seraphine:     { unlockLevel: 10,  requiredClass: 'Mage'         },
      vex:           { unlockLevel: 10,  requiredClass: 'Rogue'        },
      kara:          { unlockLevel: 20,  requiredClass: 'Hunter'       },
      brother_elian: { unlockLevel: 30,  requiredClass: 'Paladin'      },
      malachar:      { unlockLevel: 50,  requiredClass: 'Necromancer'  },
      nara:          { unlockLevel: 70,  requiredClass: 'Shaman'       },
      ragnar:        { unlockLevel: 90,  requiredClass: 'Berserker'    },
      mirela:        { unlockLevel: 1,   requiredClass: null           },
      sovan:         { unlockLevel: 1,   requiredClass: null           },
    }

    const meta = npcMeta[npc_id]

    // 6. Server-side unlock validation
    if (character.level < meta.unlockLevel) {
      return jsonResponse({ response: npcDialogue.locked, mood: 'neutral', relationship_score: 0 })
    }

    if (meta.requiredClass && character.class !== meta.requiredClass) {
      return jsonResponse({ response: npcDialogue.wrongClass, mood: 'neutral', relationship_score: 0 })
    }

    // 7. Fetch or create relationship
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

    // 8. Handle message types
    if (message_type === 'greet') {
      // FREE — just return hardcoded greeting based on reputation
      const greetingKey = getGreetingKey(
        relationship.relationship_score,
        relationship.mood,
        isFirstVisit
      )
      const greeting = npcDialogue.greeting[greetingKey] || npcDialogue.greeting['neutral']

      // Update last visited
      await supabase
        .from('npc_relationships')
        .update({ last_visited: new Date().toISOString() })
        .eq('player_id', user.id)
        .eq('npc_id', npc_id)

      return jsonResponse({
        response: greeting,
        mood: relationship.mood,
        relationship_score: relationship.relationship_score
      })
    }

    if (message_type === 'chat') {
      // PAID — Claude API call (coming later when you top up)
      return jsonResponse({
        response: `*${npc_id} looks at you thoughtfully* "...This feature is coming soon."`,
        mood: relationship.mood,
        relationship_score: relationship.relationship_score
      })
    }

    return errorResponse('Invalid message_type')

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