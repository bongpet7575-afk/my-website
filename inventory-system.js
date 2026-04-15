// inventory-system.js
class InventorySystem {
  constructor(state) {
    this.state = state;
    this.maxInventorySize = 100;
  }

  addItem(item) {
    if (item.stackable) {
      const existing = this.state.inventory.find(
        i => i.name === item.name && i.rarity === item.rarity && i.stackable
      );
      if (existing) {
        existing.qty = (existing.qty || 1) + (item.qty || 1);
        return;
      }
    }

    if (this.state.inventory.length >= this.maxInventorySize) {
      throw new Error('Inventory full!');
    }

    this.state.inventory.push({
      ...item,
      uid: item.uid || this.generateUID(),
    });
  }

  removeItem(uid) {
    const index = this.state.inventory.findIndex(i => i.uid === uid);
    if (index !== -1) {
      this.state.inventory.splice(index, 1);
      return true;
    }
    return false;
  }

  equipItem(uid, slot) {
    const item = this.state.inventory.find(i => i.uid === uid);
    if (!item || item.category !== 'equipment') return false;

    // Unequip previous item
    if (this.state.equipped[slot]) {
      this.unequipSlot(slot, true);
    }

    item.equipped = true;
    this.state.equipped[slot] = uid;
    return true;
  }

  unequipSlot(slot, silent = false) {
    const uid = this.state.equipped[slot];
    if (!uid) return false;

    const item = this.state.inventory.find(i => i.uid === uid);
    if (item) {
      item.equipped = false;
    }

    this.state.equipped[slot] = null;
    return true;
  }

  generateUID() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}