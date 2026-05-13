// ── BOTS.JS ──
// Client-side bot utilities.
// Bots appear normally on leaderboard and auction house.
// They are only filtered from "real players only" contexts.

const BOT_NAMES = ['DarkSerpent', 'IronVeil', 'AshCrown', 'VoidStriker', 'BloodMoon'];

// Check if a character is a bot by name (lightweight, no DB call needed)
function isBot(characterName) {
  return BOT_NAMES.includes(characterName);
}

// Filter bots out of a list of characters (for friend lists, party, etc.)
function filterBots(characters) {
  return characters.filter(c => !c.is_bot);
}

// Format bot name with subtle indicator (optional — remove if you want bots fully hidden)
// function formatBotName(name) {
//   return isBot(name) ? `${name}` : name; // no indicator — bots look like real players
// }