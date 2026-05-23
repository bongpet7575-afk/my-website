// ── BOT.JS ──
// Client-side bot utilities.

// Check if a character is a bot
function isBot(characterName) {
  return !!(characterName && characterName.startsWith('bot_'));
}

// Filter bots out of a list of characters
function filterBots(characters) {
  return characters.filter(c => !c.is_bot);
}