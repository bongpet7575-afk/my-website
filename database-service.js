// database-service.js
class DatabaseService {
  async savePlayer(state) {
    try {
      const { data: { user } } = await dbClient.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await dbClient
        .from('characters')
        .update({
          name: state.name,
          level: state.level,
          exp: state.xp,
          gold: state.gold,
          health: state.hp,
          max_health: state.maxHp,
          mana: state.mp,
          max_mana: state.maxMp,
          inventory: state.inventory,
          equipped: state.equipped,
          updated_at: new Date().toISOString(),
        })
        .eq('id', state.character_id)
        .eq('user_id', user.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Save error:', error);
      throw error;
    }
  }

  async loadPlayer(characterId) {
    try {
      const { data: { user } } = await dbClient.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: character, error } = await dbClient
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return character;
    } catch (error) {
      console.error('Load error:', error);
      throw error;
    }
  }
}