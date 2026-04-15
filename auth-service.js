// auth-service.js
class AuthService {
  constructor(state) {
    this.state = state;
    this.db = new DatabaseService();
  }

  async register(email, password, characterName) {
    // Validate inputs
    if (!this.validateEmail(email)) throw new Error('Invalid email');
    if (password.length < 8) throw new Error('Password too short');
    if (characterName.length < 2 || characterName.length > 15) throw new Error('Invalid character name');

    try {
      const { data: authData, error: authError } = await dbClient.auth.signUp({ email, password });
      if (authError) throw authError;

      const userId = authData.user.id;
      const { data: character, error: charError } = await dbClient
        .from('characters')
        .insert({
          user_id: userId,
          name: this.sanitize(characterName),
          level: 1,
          exp: 0,
          gold: 1550,
          // ... rest of character data
        })
        .select()
        .single();

      if (charError) throw charError;

      this.syncCharacterToState(character);
      return { success: true, character };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async login(email, password) {
    try {
      const { data, error } = await dbClient.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: character, error: charError } = await dbClient
        .from('characters')
        .select('*')
        .eq('user_id', data.user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (charError || !character) throw new Error('Character not found');

      this.syncCharacterToState(character);
      return { success: true, character };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout() {
    await this.db.savePlayer(this.state);
    await dbClient.auth.signOut();
  }

  syncCharacterToState(character) {
    Object.assign(this.state, {
      character_id: character.id,
      user_id: character.user_id,
      name: character.name,
      level: character.level,
      xp: character.exp,
      gold: character.gold,
      class: character.class,
      inventory: character.inventory || [],
      equipped: character.equipped || {},
      // ... rest of sync
    });
    this.state._statsDirty = true;
  }

  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  sanitize(str) {
    return str.replace(/[<>\"']/g, '').trim();
  }
}