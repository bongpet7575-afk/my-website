import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================================
// CONTEMPT-FIRST NPC DIALOGUES — NO FREE PASSES
// ============================================================

// ============================================================
// REPUTATION RANKS — MATCHES GAME.JS EXACTLY
// ============================================================
const REP_RANKS = ['citizen', 'baron', 'chief', 'mayor', 'viscount', 'count']

function rankIndex(rank: string): number {
  return REP_RANKS.indexOf(rank?.toLowerCase() || 'citizen')
}

function isAtLeast(rank: string, minimum: string): boolean {
  return rankIndex(rank) >= rankIndex(minimum)
}

// ============================================================
// CONTEMPT-FIRST NPC DIALOGUES — REPUTATION GATED
// ============================================================
const NPC_DIALOGUES: Record<string, (ctx: any) => string> = {

  sovan: (ctx) => {
    const { level, enhancement, isFirstVisit, reputationRank, mood } = ctx
    const rank = reputationRank || 'citizen'

    if (isFirstVisit) return `*Sovan glances up from his hammer, looks you over, then looks back down* ...Sok sabay. First time here? Sovan can tell. Come back when that gear is worth looking at.`
    if (mood === 'angry') return `Oun... you have disappointed Sovan. The forge is closed to you today.`

    // Count + max enhancement — secret room
    if (rank === 'count' && enhancement >= 15) return `*Sovan sets down his hammer slowly, looks both ways* ...Lord Count. +${enhancement}. *lowers voice* There is something beneath this forge. Something Sovan has never shown another soul. Follow me.`
    if (rank === 'count') return `*Sovan stands and bows* Lord Count honors this forge today. Awkunh, lok. What can Sovan do for you?`
    if (rank === 'viscount' && enhancement >= 13) return `Lord Viscount! A +${enhancement} weapon! *emotional* The Angkor smiths... they would weep seeing this craftsmanship.`
    if (rank === 'viscount') return `Lord Viscount! *bows head* Sovan is honored. The forge is yours today.`
    if (rank === 'mayor' && enhancement >= 10) return `Lord Mayor! +${enhancement} enhancement! Now THIS is why Sovan became a blacksmith. Bong, the ancestors smile today.`
    if (rank === 'mayor') return `Lord Mayor! What a great day! Come in, come in! Sovan has been working on something special.`
    if (rank === 'chief' && enhancement >= 7) return `Esteemed Chief! +${enhancement}! *nods with deep respect* You understand the craft, bong. Sovan respects this.`
    if (rank === 'chief') return `Greetings, Esteemed Chief! Welcome back to the forge. Sovan is at your service.`
    if (rank === 'baron' && enhancement >= 7) return `*looks up properly for first time* ...Baron. +${enhancement}. *quiet nod* You've earned the right to stand in this forge.`
    if (rank === 'baron') return `*looks up* ...A Baron walks in. *studies your gear* You've proven yourself out there. What do you need, bong?`

    // Citizen — contempt tier
    if (enhancement === 0 && level < 20) return `*doesn't look up* Zero enhancement. Level ${level}. You would be killed instantly outside this town. Why are you in Sovan's forge?`
    if (enhancement === 0 && level < 50) return `Level ${level} and zero enhancement? *sighs heavily* Oun, even the wolves outside have more bite than your weapon right now.`
    if (enhancement === 0) return `A level ${level} citizen with zero enhancement walks into Sovan's forge. *long pause* ...The ancestors are embarrassed for you, bong.`
    if (enhancement < 5)  return `+${enhancement} at level ${level}. *shakes head* The craft weeps. Come back when you're serious about your weapon.`
    if (enhancement < 7)  return `+${enhancement}. You are trying. But trying is not enough in this world, oun. +7 minimum before Sovan respects your effort.`
    if (enhancement < 10) return `+${enhancement}. *small nod* Now you have Sovan's attention. Keep pushing, citizen.`
    if (enhancement < 13) return `+${enhancement}! *nods slowly* This is craft. But you are still a citizen. The forge respects the weapon, not yet the wielder.`

    return `+${enhancement}. *Sovan looks up slowly* ...Impressive weapon for a citizen. But a title means nothing to Sovan. Go earn your rank first.`
  },

  mirela: (ctx) => {
    const { level, gold, reputationRank, mood, isFirstVisit, questsAbandoned } = ctx
    const rank = reputationRank || 'citizen'

    if (isFirstVisit) return `*Mirela looks up briefly, takes in your gear, looks back at her ledger* ...A new face. The guild has work for capable hands. Whether you qualify remains to be seen.`
    if (mood === 'angry') return `Your file is flagged. The guild does not work with unreliable contractors. Come back when you've earned our trust again.`

    // Count
    if (rank === 'count') return `*Mirela walks to the door and locks it* Lord Count. *quiet* The guild master has been waiting for this meeting. Sit. This conversation stays between us.`

    // Viscount
    if (rank === 'viscount') return `*stands up* Lord Viscount. *leans forward* I have been holding something back for someone of your standing. Today is that day.${questsAbandoned > 0 ? ` Though those ${questsAbandoned} abandoned contracts... we should address that first.` : ``}`

    // Mayor
    if (rank === 'mayor') return `Lord Mayor. *closes ledger* For you I show the real inventory. Not what sits on the shelf for citizens.${questsAbandoned > 0 ? ` ${questsAbandoned} abandoned contracts on record though. That affects pricing.` : ``}`

    // Chief
    if (rank === 'chief') return `Chief. *nods once* You've proven yourself. ${gold.toLocaleString()} gold in your pocket. The guild has premium contracts reserved for people like you.`

    // Baron
    if (rank === 'baron') return `*looks up properly* ...A Baron. ${gold.toLocaleString()} gold. *closes ledger* Sit down. The guild has been watching your progress.${questsAbandoned > 0 ? ` Those ${questsAbandoned} abandoned contracts are noted however.` : ``}`

    // Citizen contempt — gold gated
    if (gold === 0 && level < 20)          return `*without looking up* Empty pockets. Level ${level}. The beggars guild is two streets north. This is the Merchant Guild.`
    if (gold === 0)                         return `Level ${level} with zero gold. *finally looks up* How are you even alive? Come back when you have something worth spending.`
    if (gold < 500000 && level < 30)        return `${gold.toLocaleString()} gold and level ${level}. *closes ledger* You are wasting my time. Come back when you're serious.`
    if (gold < 1000000)                     return `${gold.toLocaleString()} gold. That barely covers my ink. I'll make this quick — come back richer.`
    if (gold < 10000000)                    return `${gold.toLocaleString()} gold. Limited budget. Mirela works with what she has, but don't expect premium service.`
    if (gold < 100000000)                   return `${gold.toLocaleString()} gold. Adequate. We can do small business today, citizen.`
    if (gold < 1000000000)                  return `${gold.toLocaleString()} gold. *leans forward* Interesting. For a citizen, that is... notable. But gold alone doesn't buy respect here.`

    return `${gold.toLocaleString()} gold and still a citizen? *tilts head* You have the wealth but not the reputation. The guild deals in both. Go earn your rank.`
  },

  aldric: (ctx) => {
    const { level, playerClass, enhancement, reputationRank, mood, isFirstVisit } = ctx
    const rank = reputationRank || 'citizen'

    if (isFirstVisit) return `*Aldric stares without blinking* ...Another one walks through my door. *looks at your gear* Hmph. Don't touch anything.`
    if (playerClass !== 'warrior') return `*doesn't turn around* A ${playerClass} in my hall. Wrong door. Leave before I make you leave.`
    if (mood === 'angry') return `*turns away* I have nothing to say to cowards. Come back when you've earned the right to stand here.`

    // Count
    if (rank === 'count') return `*Aldric stands. Sets down his sword. The entire hall goes quiet.* ...Count. *long silence* I have trained warriors for forty years. I have never said this to anyone. *looks you in the eye* You have surpassed me. Sit. Let us talk as equals.`

    // Viscount
    if (rank === 'viscount') return `*turns around slowly* ...Viscount. *studies you for a long moment* I remember when you walked in here as nothing. *quiet* I was wrong about you. Sit down.`

    // Mayor
    if (rank === 'mayor') return `Lord Mayor. *nods with genuine respect* The Iron Brotherhood has heard your name. You have made us proud, warrior.`

    // Chief
    if (rank === 'chief') return `Chief walks into my hall. *crosses arms, rare approval* You've bled for that title. I can see it. What do you need?`

    // Baron
    if (rank === 'baron') return `*turns around for the first time* ...Baron. *long look* I'll be honest — I didn't think you had it in you. *pulls out a chair* Sit down, kid.`

    // Citizen contempt
    if (enhancement === 0 && level < 20) return `Zero enhancement. Level ${level}. *spits* I've seen better stats on the training dummy. Get out of my hall.`
    if (enhancement === 0 && level < 50) return `Level ${level}. Zero enhancement. *laughs once* That's not a weapon. That's a stick. Go fix it before you waste my time.`
    if (enhancement === 0)               return `Level ${level} warrior. Zero enhancement. *long silence* ...The Iron Brotherhood is ashamed.`
    if (enhancement < 5 && level < 30)  return `+${enhancement} at level ${level}. Raw. Weak. Come back when that number means something.`
    if (enhancement < 5)                return `Level ${level} and +${enhancement}? I expect better from someone who's survived this long. Fix your weapon, citizen.`
    if (enhancement < 7)                return `+${enhancement}. You're trying. Barely. A citizen warrior should be at +7 minimum. Push harder.`
    if (enhancement < 10)               return `+${enhancement}. *nods once* Acceptable. Don't get comfortable — push that number higher and go earn a real title.`
    if (enhancement < 13)               return `+${enhancement} on a level ${level} warrior. *rare nod* Decent weapon. Terrible reputation. Fix the second one.`

    return `+${enhancement} and still a citizen. *shakes head* The weapon tells one story. Your rank tells another. Go earn your title, warrior.`
  },

  seraphine: (ctx) => {
    const { level, playerClass, intStat, reputationRank, mood, isFirstVisit } = ctx
    const rank = reputationRank || 'citizen'

    if (isFirstVisit) return `*doesn't look up from her tome* Another student. *finally looks up* ...Your eyes suggest intelligence. The rest remains to be proven.`
    if (playerClass !== 'mage') return `You are not a Mage. *returns to tome* This conversation is already over.`
    if (mood === 'angry') return `Unreliable. Weak. Two traits I cannot tolerate. Leave.`

    if (rank === 'count')    return `*Seraphine closes her tome for the first time anyone has seen* ...Count. *stands* There are arcane secrets I have told no living soul. Today that changes. Sit.`
    if (rank === 'viscount') return `Lord Viscount. *genuine respect from someone who gives none* Your mastery of the arcane has... impressed me. That does not happen often.`
    if (rank === 'mayor')    return `Lord Mayor. *nods* The Arcane Sanctum acknowledges your standing. INT ${intStat} at this rank — you have earned my full attention.`
    if (rank === 'chief')    return `Chief. INT ${intStat}. *finally closes tome* You have proven both power and reputation. The Sanctum has advanced teachings for someone like you.`
    if (rank === 'baron')    return `*looks up properly* ...Baron Mage. INT ${intStat}. *pause* You are beginning to interest me. Sit.`

    // Citizen contempt
    if (intStat < 30 && level < 20)  return `INT ${intStat}. Level ${level}. *closes tome* You cannot form a basic spell with that mind. Come back when you've actually studied.`
    if (intStat < 50)                return `INT ${intStat}. *sighs* This is what walks into the Sanctum today. The arcane arts weep.`
    if (intStat < 100)               return `INT ${intStat} at level ${level}. Mediocre. The library is downstairs. Use it, citizen.`
    if (intStat < 200)               return `INT ${intStat}. Acceptable foundation. But a citizen mage with decent INT is still just a citizen.`
    if (intStat < 400)               return `INT ${intStat}. *looks up* The numbers are there. The reputation is not. Go earn your rank, then come back.`

    return `INT ${intStat}. Impressive for a citizen. *tilts head* But the Sanctum's advanced knowledge is not for citizens. You know what to do.`
  },

  vex: (ctx) => {
    const { level, playerClass, agiStat, reputationRank, mood, isFirstVisit } = ctx
    const rank = reputationRank || 'citizen'

    if (isFirstVisit) return `*a voice from the shadows* Oh look. Fresh meat found the Den. *steps into dim light* Cute. Let's see how long you last.`
    if (playerClass !== 'rogue') return `Wrong class. Wrong door. Wrong life choices. *vanishes*`
    if (mood === 'angry') return `Oh it's you. *already fading* I'd leave if I were you. Actually... I am leaving.`

    if (rank === 'count')    return `*Vex steps fully into the light for the first time* ...Count. *quiet* I don't do this often. *extends hand* You've earned it. Welcome to the inner circle.`
    if (rank === 'viscount') return `Viscount Rogue. *whistles quietly* You actually did it. *leans against wall* I had bets you wouldn't make it this far. I lost. Respect.`
    if (rank === 'mayor')    return `Lord Mayor. *grins from shadows* AGI ${agiStat}. That title. *nods* You're the kind of rogue stories get written about.`
    if (rank === 'chief')    return `Chief. AGI ${agiStat}. *steps closer* Now you have my real attention. Not many reach Chief. The Den has work only Chiefs can handle.`
    if (rank === 'baron')    return `*steps slightly out of shadow* ...Baron. AGI ${agiStat}. *pause* Heh. You actually came back. And you brought receipts. Not bad.`

    // Citizen contempt
    if (agiStat < 30 && level < 20)  return `AGI ${agiStat}. Level ${level}. *stares* You move like a dying cart horse. How are you even a rogue? Leave.`
    if (agiStat < 50)                return `AGI ${agiStat}. *winces* I could hear you coming from three streets away. That's not a rogue. That's a liability.`
    if (agiStat < 100)               return `AGI ${agiStat} at level ${level}. Slow. Fixable. Maybe. Come back with a better number and a real title.`
    if (agiStat < 200)               return `AGI ${agiStat}. Not bad. Not great. Still a citizen though. The Den doesn't respect citizens, only reputation.`
    if (agiStat < 350)               return `AGI ${agiStat}. *leans against wall* The stats are getting there. The rank isn't. You know what that means.`

    return `AGI ${agiStat}. *genuine pause* ...Good numbers for a citizen. But good numbers don't open doors here. Reputation does. Go get some.`
  },

  kara: (ctx) => {
    const { level, playerClass, reputationRank, mood, isFirstVisit } = ctx
    const rank = reputationRank || 'citizen'

    if (isFirstVisit) return `*Ash growls softly* ...You found the outpost. *studies you carefully* Ash is reserving judgment. So am I.`
    if (playerClass !== 'hunter') return `*Ash blocks your path* He doesn't like you. I trust Ash. Wrong path.`
    if (mood === 'angry') return `*complete silence* *Ash sits directly in front of you, unmoving*`

    if (rank === 'count')    return `*Ash lies down at your feet* ...He has never done that for anyone. *Kara quiet for a long moment* Count. The forest knows your name now. The hunt has no more secrets from you.`
    if (rank === 'viscount') return `*Ash walks to your side and stays* Viscount. *Kara nods slowly* The pack accepts you fully. That is not given. That is earned.`
    if (rank === 'mayor')    return `Lord Mayor. *Ash wags tail once* He remembers you now. Level ${level}. You have become something the forest respects.`
    if (rank === 'chief')    return `Chief Hunter. *Kara almost smiles* Ash stopped growling weeks ago. You've earned that. What do you need?`
    if (rank === 'baron')    return `*Ash steps aside on his own* ...Baron. *Kara watches Ash* He chose that himself. Level ${level}. You're becoming someone the forest notices.`

    // Citizen contempt
    if (level < 25)  return `Level ${level}. *quiet* The forest would kill you in minutes. Ash agrees. You are not ready.`
    if (level < 40)  return `Level ${level}. Still a citizen. The outpost has no use for citizens who haven't proven themselves beyond these walls.`
    if (level < 60)  return `Level ${level}. You move better. But Ash still watches you with caution. A citizen title means the world hasn't recognized you yet. Neither has he.`
    if (level < 80)  return `Level ${level} citizen. *Kara tilts head* The stats say one thing. The title says another. The forest judges both.`

    return `Level ${level} and still citizen? *quiet* You have survived much. But the world hasn't acknowledged it yet. Go make it.`
  },

  brother_elian: (ctx) => {
    const { level, playerClass, reputationRank, mood, isFirstVisit, questsAbandoned } = ctx
    const rank = reputationRank || 'citizen'

    if (isFirstVisit) return `*looks up from prayer* Welcome. The monastery receives all who seek... *studies you* ...though what you seek, I am not yet certain.`
    if (playerClass !== 'paladin') return `The light guides different souls down different roads. Yours does not pass through here. Go find your path.`
    if (mood === 'angry') return `*quiet, disappointed* I do not turn away souls. But I cannot teach one who has not reflected. Come back when you are ready.`

    if (rank === 'count')    return `*Brother Elian kneels* ...Count. *looks up* I have prayed for a soul of this magnitude to walk through these doors. The light has answered. Sit. There is much I must tell you.`
    if (rank === 'viscount') return `Lord Viscount. *stands slowly* The light has watched your journey from the beginning. *quiet* I am honored you still return here.`
    if (rank === 'mayor')    return `Lord Mayor. *bows head* ${questsAbandoned > 0 ? `Those ${questsAbandoned} abandoned souls weigh on your record still. But your rank shows growth. Let us speak of both.` : `Your record is clean. Your rank is high. The light is pleased.`}`
    if (rank === 'chief')    return `Chief. *nods with warmth* You have helped many to reach this title. ${questsAbandoned > 0 ? `Though ${questsAbandoned} abandoned still trouble me.` : `The light sees your consistency.`}`
    if (rank === 'baron')    return `*looks up with genuine warmth* Baron. *quiet* You earned that through action, not words. ${questsAbandoned > 0 ? `Though you left ${questsAbandoned} souls without help. Tell me why.` : `The light is pleased with your path.`}`

    // Citizen
    if (questsAbandoned > 2) return `You have abandoned ${questsAbandoned} people who needed help. *long pause* The light sees this. Before anything else — why?`
    if (questsAbandoned > 0) return `${questsAbandoned} abandoned. The light does not forget. Level ${level} citizen — power means nothing without responsibility.`
    if (level < 35)          return `Level ${level} citizen. Your faith is young. That is not a weakness — but it is not yet a strength. Prove yourself beyond these walls.`
    if (level < 60)          return `Level ${level}. Still a citizen. The light values deeds over levels. Go accumulate reputation through action, not just combat.`

    return `Level ${level} citizen. *gentle but firm* You have fought hard. But the world has not yet acknowledged your character. That acknowledgment must be earned.`
  },

  malachar: (ctx) => {
    const { level, playerClass, reputationRank, mood, isFirstVisit } = ctx
    const rank = reputationRank || 'citizen'

    if (isFirstVisit) return `...Someone living enters the Crypt. *opens eyes slowly* Interesting. The dead are curious. They don't get curious often.`
    if (playerClass !== 'necromancer') return `*the dead whisper* ...Wrong class. They find it amusing. I find it tiresome. Leave.`
    if (level < 50) return `...Level ${level}. *long silence* The dead have looked you over. They are not impressed. Come back at level 50. If you survive.`
    if (mood === 'angry') return `The dead have told me things about you. *pause* Unflattering things. Leave before they say worse.`

    if (rank === 'count')    return `*every candle in the Crypt extinguishes simultaneously* ...Count. *long silence* The dead have not bowed since the ancient kings walked this earth. *whispers* They are bowing now.`
    if (rank === 'viscount') return `Viscount. *the dead grow restless with excitement* ...They recognize your power now. Level ${level}. The boundary between life and death bends around you.`
    if (rank === 'mayor')    return `Lord Mayor. *the dead whisper your name* ...They know you now. That is not given to many living souls.`
    if (rank === 'chief')    return `Chief Necromancer. *looks at you differently* The dead have been following your progress. Level ${level}. They approve.`
    if (rank === 'baron')    return `*the dead go quiet* ...Baron walks into the Crypt. Level ${level}. *pause* The dead are paying attention. That is more than most get.`

    // Citizen contempt
    if (level < 65)  return `Level ${level} citizen. The dead are... unimpressed. They have seen thousands like you. Most don't come back.`
    if (level < 80)  return `Level ${level}. Still a citizen. *quiet* The dead respect power AND reputation. You have one. Not the other.`
    if (level < 95)  return `Level ${level} citizen. *whispers* The dead are curious why someone this powerful has not yet earned the world's recognition. So am I.`

    return `Level ${level} citizen necromancer. *long pause* The dead find this... puzzling. Power without recognition. Go change that.`
  },

  nara: (ctx) => {
    const { level, playerClass, reputationRank, mood, isFirstVisit } = ctx
    const rank = reputationRank || 'citizen'

    if (isFirstVisit) return `*eyes closed, speaks without turning* The spirits told me you would come. *opens eyes* They did not say you would arrive so... unformed. Sit anyway.`
    if (playerClass !== 'shaman') return `Your spirit walks a different path. *gently* This grove is not yours. Find your own.`
    if (level < 70) return `Level ${level}. *quietly* The spirits are not yet ready to speak through me for you. Return at level 70.`
    if (mood === 'angry') return `Your spirit is clouded with conflict. The spirits will not come today. Return when you are clear.`

    if (rank === 'count')    return `*the entire grove goes silent* ...Count. *long pause* The ancient spirits have not spoken this clearly in centuries. *opens eyes slowly* They say you are one of them now. Sit. This will take time.`
    if (rank === 'viscount') return `Lord Viscount. *the grove brightens* The spirits rejoice when you arrive now. Level ${level}. Your soul has grown vast.`
    if (rank === 'mayor')    return `Lord Mayor. *nods with deep respect* The ancient ones are watching you closely now. Few citizens ever reach this. Fewer still reach Mayor.`
    if (rank === 'chief')    return `Chief Shaman. *the spirits stir visibly* Level ${level}. You carry their blessing now. I can feel it.`
    if (rank === 'baron')    return `*opens eyes* ...Baron. Level ${level}. The spirits recognize your title. They are beginning to trust you. That is rare.`

    // Citizen contempt
    if (level < 80)  return `Level ${level} citizen. *quietly* The spirits stir but do not speak. They wait for the world to acknowledge you first.`
    if (level < 95)  return `Level ${level}. The ancient ones watch you with interest. But citizen... *shakes head gently* The spirits speak to those the world has recognized. Go earn that recognition.`

    return `Level ${level} citizen. *the grove whispers* Even the spirits are puzzled. This much power, this little recognition. The world does not yet know what stands before it. Go make it know.`
  },

  ragnar: (ctx) => {
    const { level, playerClass, reputationRank, isFirstVisit } = ctx
    const rank = reputationRank || 'citizen'

    if (playerClass !== 'berserker') return `WRONG CLASS! *laughing* Come back as a Berserker or DON'T COME BACK AT ALL! HAHA!`
    if (level < 90) return `LEVEL ${level}?! *laughing louder* LEVEL 90 MINIMUM! COME BACK WHEN YOU'VE ACTUALLY BLED! THE BLOODPIT DOESN'T ACCEPT CHILDREN! HAHAHAHA!`
    if (isFirstVisit) return `*stops everything* YOU. MADE IT. TO LEVEL 90. *grabs your shoulder* THEN YOU ARE ALREADY MY KIND OF PERSON! WELCOME TO THE BLOODPIT!`

    if (rank === 'count')    return `*Ragnar goes completely silent. First time ever.* ...Count Berserker. *very quietly* ...I have waited my whole life to meet someone like you. *stands straight* THE BLOODPIT BOWS TO NO ONE. EXCEPT YOU! EVERYONE DOWN! NOW!`
    if (rank === 'viscount') return `VISCOUNT! *slams table* A BERSERKER VISCOUNT! I DIDN'T THINK THIS DAY WOULD COME! THE BLOODPIT IS YOURS TODAY! HAHAHA!`
    if (rank === 'mayor')    return `LORD MAYOR BERSERKER! *laughing and emotional at same time* LEVEL ${level}! WHAT A BEAUTIFUL DISASTER YOU'VE BECOME!`
    if (rank === 'chief')    return `CHIEF BERSERKER! *roars with joy* THE BLOODPIT KNEW YOU'D MAKE IT! LEVEL ${level}! WHAT DO YOU NEED?!`
    if (rank === 'baron')    return `*stops mid-swing* BARON. *genuine respect breaking through the chaos* Level ${level} Baron Berserker. THE BLOODPIT RESPECTS THIS! WELCOME BACK!`

    // Citizen — still respected at 90+ just not titled
    if (level < 95)  return `YOU'RE BACK! Level ${level} Berserker citizen! THE BLOODPIT MISSED YOUR CHAOS! NOW GO GET A TITLE!`
    if (level < 100) return `Level ${level}! SO CLOSE TO MAX! KEEP BREAKING THINGS! AND GET A TITLE WHILE YOU'RE AT IT!`

    return `LEVEL 100 CITIZEN BERSERKER! *confused and impressed* HOW ARE YOU LEVEL 100 WITH NO TITLE?! GO. GET. BARON. NOW. THEN COME BACK! HAHA!`
  },

    voss: (ctx) => {
  const { level, reputationRank, isFirstVisit } = ctx
  const rank = reputationRank || 'citizen'

  if (isFirstVisit && rank === 'citizen') return `*A stern clerk blocks the entrance* ...The Auction House is a place of serious business. Citizens are not permitted. Come back when the world knows your name.`
  if (rank === 'citizen') return `*Clerk Voss doesn't even look up* Citizen. You know the rules. Baron minimum. Leave.`
  if (isFirstVisit && rank === 'baron') return `*Clerk Voss checks a ledger, finds your name, steps aside* ...Baron. Welcome to the Auction House. Don't embarrass yourself in there.`
  if (rank === 'baron') return `Baron. *nods once* You may enter. Black Wing is reserved for Chiefs and above. Don't ask about it.`
  if (rank === 'chief') return `Chief. *steps fully aside* The Black Wing section is open to you today. Don't let it go to your head.`
  if (rank === 'mayor') return `Lord Mayor. *bows slightly* The Auction House and Black Wing are yours. The best lots have been reserved.`
  if (rank === 'viscount') return `Lord Viscount. *opens door personally* Black Wing's finest items were held for your arrival.`
  if (rank === 'count') return `*Clerk Voss stands at attention* Lord Count. *quietly* The entire Auction House clears when you walk in. Everything is available to you.`
},
}

// ============================================================
// DIALOGUE ROUTER
// ============================================================
function buildDialogue(npcId: string, ctx: any): string {
  const fn = NPC_DIALOGUES[npcId]
  if (!fn) return `...`
  return fn(ctx)
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
  voss: { unlockLevel: 1, requiredClass: null }
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
  reputationRank:   character.reputation_rank || 'citizen',
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