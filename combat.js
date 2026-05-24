// ============================================
// combat.js — All combat-related logic
// Depends on: game.js (state, SKILLS, CLASSES, etc.)
//             supabase-sync.js (savePlayerToSupabase)
// ============================================

// ── COMBAT GLOBALS ──
let autoFightOn = false, autoFightEnemyId = null, autoFightTimer = null;
let currentEnemy = null, pendingBossId = null;
let autoSkillSlots = [null, null, null, null, null, null], autoSkillIndex = 0;
let lastSkillUseTime = 0;
let SKILL_GCD_MS = parseInt(localStorage.getItem('setting-gcd') || 800);

// ── SELECTED SKILL FOR SLOT (mobile tap-to-assign) ──
let selectedSkillForSlot = null;

// ── START COMBAT ──
function startCombat(enemyId,isBoss){
  const tmpl=MONSTER_TEMPLATES[enemyId];if(!tmpl)return;
  const diff=DIFFICULTY[state.difficulty||'normal'];
  const scale=(1+Math.max(0,(state.level-1))*0.3)*diff.hpMult;
  const atkScale=(1+Math.max(0,(state.level-1))*0.3)*diff.atkMult;
  const armorScale=(1+Math.max(0,(state.level-1))*0.3)*diff.armorMult;
  const hitScale=(1+Math.max(0,(state.level-1))*0.3)*diff.hitMult;
  const dodgeScale=(1+Math.max(0,(state.level-1))*0.3)*diff.dodgeMult;
  const prefix=state.difficulty==='hell'?'💀 Hell ':state.difficulty==='hard'?'🔥 Hard ':'';
  
  currentEnemy={...tmpl,name:prefix+tmpl.name,hp:Math.floor(tmpl.hp*scale),maxHp:Math.floor(tmpl.hp*scale),atk:Math.floor(tmpl.atk*atkScale),armor:tmpl.armor,hit:Math.floor((tmpl.hit||0)*5),dodge:Math.floor((tmpl.dodge||0)*5),poisoned:0,frozen:false,crippled:0,boss:false,_xpMult:diff.xpMult,_goldMult:diff.goldMult};
  currentEnemy=applyTutorialScaling(currentEnemy);
  startCombatWith(currentEnemy);
  if(isTutorialActive()){addCombatLog('📚 TUTORIAL MODE: Enemies are weaker!','info');showTutorialHint('firstCombat');}
  const combatArea = document.getElementById('combat-area'); // your existing combat container
  combatArea.insertAdjacentHTML('afterbegin', renderEnemyStatPanel(enemy));

  // Store current enemy reference for HP updates
  window.currentEnemy = enemy;
}

// ── START COMBAT WITH (enemy object) ──
function startCombatWith(enemy){
  autoSkillIndex=0;
  document.getElementById('enemy-hp-val').textContent=formatNumber(enemy.hp);
  document.getElementById('enemy-hp-max').textContent=formatNumber(enemy.maxHp);
  const el=document.getElementById('arena-enemy');
  if(enemy.icon&&!enemy.icon.includes(' ')&&(enemy.icon.length<20||enemy.icon.startsWith('images/'))){el.innerHTML=`<img src="${enemy.icon}.jpg" style="width:50px;height:50px;object-fit:cover;border-radius:8px;border:2px solid var(--red);">`;}
  else{el.textContent=enemy.icon;}
  document.getElementById('arena-enemy-label').textContent=enemy.name;
  document.getElementById('arena-enemy-hp').style.width='100%';
  document.getElementById('combat-log').innerHTML='';
  showCombatMode();
  // Enemy stats under their HP bar
  const es=document.getElementById('enemy-stats');
  if(es){
    es.style.display='block';
    es.innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 6px;font-size:.65em;">
        <span style="color:var(--text-dim);">⚔️ ATK <strong style="color:var(--red)">${formatNumber(enemy.atk)}</strong></span>
        <span style="color:var(--text-dim);">🛡️ ARM <strong style="color:var(--text)">${formatNumber(enemy.armor||0)}</strong></span>
        <span style="color:var(--text-dim);">🎯 HIT <strong style="color:var(--text)">${formatNumber(enemy.hit||0)}</strong></span>
        <span style="color:var(--text-dim);">💨 DDG <strong style="color:var(--text)">${formatNumber(enemy.dodge||0)}</strong></span>
        ${enemy.ability?`<span style="color:var(--red);grid-column:span 2;">⚡ ${enemy.ability.name}</span>`:''}
      </div>`;
  }

  document.getElementById('story-content').innerHTML=`
    <div class="scene-title">⚔️ Combat!</div>
    <p><strong style="color:var(--red)">${enemy.name}</strong> appears!${enemy.boss?'<span style="color:var(--gold);margin-left:6px;">⚠️ BOSS BATTLE!</span>':''}</p>`;

  updatePlayerAvatar();
  updateAutoFightBtn();
}

// ── COMBAT ACTION (manual) ──
function combatAction(action) {
  if (!currentEnemy) return;

  // Player action handling
  if (action === 'attack') {
    showTutorialHint('firstCombat');
    handlePlayerAttack();
  } else if (action === 'magic') {
    showTutorialHint('firstMagic');
    handlePlayerMagic();
  } else if (action === 'defend') {
    showTutorialHint('firstDefend');
    state.defending = true;
    addCombatLog('🛡️ Bracing for impact!', 'info');
  } else if (action === 'flee') {
    showTutorialHint('firstFlee');
    handleFlee();
  }

  // Check if enemy is dead
  if (currentEnemy && currentEnemy.hp <= 0) {
    currentEnemy.hp = 0;
    updateEnemyBar();
    endCombat(true);
    return;
  }

  // Apply player regeneration
  applyPlayerRegeneration();

  // Enemy turn (if alive)
  if (currentEnemy && currentEnemy.hp > 0) {
    handleEnemyTurn();
  }

  // Check if player is dead
  if (state.hp <= 0) {
    state.hp = 0;
    updateUI();
    endCombat(false);
    return;
  }

  // Update UI
  updateEnemyBar();
  updateUI();
}

// ── PLAYER ATTACK ──
function handlePlayerAttack() {
  // Check dodge
  const enemyDodgeChance = calculateDodgeChance(currentEnemy.dodge, state.hit);
  if (Math.random() < enemyDodgeChance) {
    addCombatLog(`💨 ${currentEnemy.name} dodged!`, 'bad');
    playSound('snd-attack');
    state.defending = false;
    return;
  }

  // Calculate base damage
  let damage = calculateAttackDamage(state.attackPower, currentEnemy.armor);

  // Apply tutorial bonus
  const tutBonus = getTutorialDamageBonus();
  damage = Math.floor(damage * tutBonus);

  // Apply berserker talent (low HP bonus)
  if (state.unlockedTalents.includes('berserker') && state.hp < state.maxHp * 0.5) {
    damage = Math.floor(damage * 1.35);
  }

  // Check for critical hit
  let isCrit = false;
  if (Math.random() < state.crit / 100) {
    damage = Math.floor(damage * 2);
    isCrit = true;
    showCritEffect();
  }

  // Apply death mark talent
  if (state.unlockedTalents.includes('death_mark')) {
    damage = Math.floor(damage * 1.5);
  }

  // Apply venom talent
  if (state.unlockedTalents.includes('venom')) {
    currentEnemy.poisoned = (currentEnemy.poisoned || 0) + 1;
  }

  // Deal damage to enemy
  currentEnemy.hp -= damage;

  // Apply life steal
  applyLifeSteal(damage);

  // Log and animate
  addCombatLog(
    `⚔️ ${isCrit ? '💥CRIT! ' : ''}You hit for ${damage}!`,
    isCrit ? 'gold' : 'good'
  );
  playSound('snd-attack');
  animateAttack(true, damage, isCrit);

  state.defending = false;
}

// ── PLAYER MAGIC ──
function handlePlayerMagic() {
  const magicCost = 10;
  if (state.mp < magicCost) {
    addCombatLog('❌ Not enough MP!', 'bad');
    return;
  }

  // Calculate magic damage (INT-based)
  let damage = calculateMagicDamage(state.int);

  // Apply spell power talent
  if (state.unlockedTalents.includes('spell_power')) {
    damage = Math.floor(damage * 1.3);
  }

  // Apply fire mastery talent
  if (state.unlockedTalents.includes('fire_mastery')) {
    damage = Math.floor(damage * 1.2);
  }

  // Deal damage and consume mana
  currentEnemy.hp -= damage;
  state.mp -= magicCost;

  addCombatLog(`✨ Magic hits for ${damage}! (-${magicCost} MP)`, 'info');
  playSound('snd-magic');
  animateAttack(true, damage, false);

  state.defending = false;
}

// ── FLEE ──
function handleFlee() {
  let fleeChance = 0.35; // Base flee chance

  // Smoke bomb talent gives high flee chance
  if (state.unlockedTalents.includes('smoke_bomb')) {
    fleeChance = 0.99;
  }
  // Agility vs enemy armor (higher agility = better flee)
  else if (state.agi > currentEnemy.armor) {
    fleeChance = 0.7;
  }

  if (Math.random() < fleeChance) {
    addLog('Fled from battle!', 'bad');
    currentEnemy = null;
    showChoicesMode();
    loadScene('town');
    return;
  }

  addCombatLog('❌ Failed to flee!', 'bad');
  state.defending = false;
}

// ── DAMAGE CALCULATIONS ──
function calculateAttackDamage(attackPower, enemyArmor) {
  const variance = Math.floor(Math.random() * attackPower * 0.1);
  const baseDamage = attackPower + variance;
  const reduction = Math.min(0.85, enemyArmor / (enemyArmor + 80000));
  return Math.max(1, Math.floor(baseDamage * (1 - reduction)));
}

function calculateEnemyAttackDamage(enemyAttack, playerArmor) {
  const variance = Math.floor(Math.random() * enemyAttack * 0.1);
  const baseDamage = enemyAttack + variance;
  const reduction = Math.min(0.85, playerArmor / (playerArmor + 80000));
  return Math.max(1, Math.floor(baseDamage * (1 - reduction)));
}

function calculateMagicDamage(intelligence) {
  const baseVariance = Math.floor(Math.random() * 10); // 0-10 variance
  return Math.max(1, intelligence * 2 + baseVariance);
}

function calculateDodgeChance(enemyDodge, playerHit) {
  const netDodge = Math.max(0, enemyDodge - playerHit);
  return netDodge / 100;
}

function applyLifeSteal(damageDealt) {
  const lifeStealPercent = state.lifeSteal || 0;
  if (lifeStealPercent > 0) {
    const healAmount = Math.floor(damageDealt * (lifeStealPercent / 100));
    if (healAmount > 0) {
      state.hp = Math.min(state.maxHp, state.hp + healAmount);
      addCombatLog(`🩸 Life Steal heals ${healAmount} HP!`, 'good');
      spawnDmgFloat(`🩸+${healAmount}`, false, 'heal-float');
    }
  }
}

// ── PLAYER REGENERATION ──
function applyPlayerRegeneration() {
  // HP Regen
  if (state.hpRegen > 0) {
    const regenAmount = Math.floor(state.hpRegen);
    if (regenAmount > 0 && state.hp < state.maxHp) {
      state.hp = Math.min(state.maxHp, state.hp + regenAmount);
      addCombatLog(`💚 Regen +${regenAmount} HP`, 'good');
    }
  }

  // Mana Regen
  if (state.manaRegen > 0) {
    const regenAmount = Math.floor(state.manaRegen);
    if (regenAmount > 0 && state.mp < state.maxMp) {
      state.mp = Math.min(state.maxMp, state.mp + regenAmount);
      addCombatLog(`💙 Mana Regen +${regenAmount} MP`, 'info');
    }
  }

  // Skill cooldown reduction
  Object.keys(state.skillCooldowns).forEach(k => {
    if (state.skillCooldowns[k] > 0) {
      state.skillCooldowns[k]--;
    }
  });
}

// ── ENEMY TURN ──
function handleEnemyTurn() {
  // Check if enemy is frozen
  if (currentEnemy.frozen) {
    currentEnemy.frozen = false;
    addCombatLog(`${currentEnemy.name} is frozen and loses their turn!`, 'info');
    return;
  }

  // Calculate enemy dodge chance (player trying to dodge enemy attack)
  const playerDodgeChance = calculateDodgeChance(state.dodge, currentEnemy.hit);
  if (Math.random() < playerDodgeChance) {
    addCombatLog('💨 You dodged!', 'good');
    return;
  }

  // Calculate enemy damage
  let enemyDamage = calculateEnemyAttackDamage(currentEnemy.atk, state.armor);

  // Apply tutorial difficulty modifier
  if (isTutorialActive()) {
    enemyDamage = Math.floor(enemyDamage * TUTORIAL_CONFIG.enemyDamageMultiplier);
  }

  // Apply defending reduction
  if (state.defending) {
    const defenseReduction = state.unlockedTalents.includes('fortress') ? 4 : 2;
    enemyDamage = Math.floor(enemyDamage / defenseReduction);
  }

  // Apply shield wall talent
  if (state.unlockedTalents.includes('shield_wall')) {
    enemyDamage = Math.floor(enemyDamage * 0.9);
  }

  // ── SHAMAN: Earth Totem damage reduction ──
  if (state.earthTotemTurns > 0) {
    const reduction = state.earthTotemReduction || 0;
    const reduced = Math.floor(enemyDamage * reduction);
    enemyDamage = Math.max(1, enemyDamage - reduced);
    state.earthTotemTurns--;
    addCombatLog(`🪨 Earth Totem reduced damage by ${formatNumber(reduced)}! (${state.earthTotemTurns} turns left)`, 'info');
    if (state.earthTotemTurns === 0) {
      state.earthTotemReduction = 0;
      addCombatLog(`🪨 Earth Totem fades!`, 'info');
    }
  }

  // ── Soul Barrier absorption ──
if (state.soulBarrierAbsorb > 0 && enemyDamage > 0) {
  if (enemyDamage <= state.soulBarrierAbsorb) {
    state.soulBarrierAbsorb -= enemyDamage;
    addCombatLog(`🔰 Soul Barrier absorbed ${formatNumber(enemyDamage)}! (${formatNumber(state.soulBarrierAbsorb)} remaining)`, 'good');
    enemyDamage = 0;
  } else {
    enemyDamage -= state.soulBarrierAbsorb;
    addCombatLog(`🔰 Soul Barrier shattered! Absorbed ${formatNumber(state.soulBarrierAbsorb)}!`, 'info');
    state.soulBarrierAbsorb = 0;
  }
}

  // ── Apply mana shield (absorbs hit) ──
  if (state.manaShield) {
    // Mage mana shield — absorbs based on max MP
    if (state.manaShieldAbsorb && state.manaShieldAbsorb > 0) {
      if (enemyDamage <= state.manaShieldAbsorb) {
        state.manaShieldAbsorb -= enemyDamage;
        addCombatLog(`🔮 Mana Shield absorbed ${formatNumber(enemyDamage)}! (${formatNumber(state.manaShieldAbsorb)} remaining)`, 'info');
        enemyDamage = 0;
        // Shield stays active until absorb depleted
        if (state.manaShieldAbsorb <= 0) {
          state.manaShield = false;
          state.manaShieldAbsorb = 0;
          addCombatLog(`🔮 Mana Shield shattered!`, 'info');
        }
      } else {
        enemyDamage -= state.manaShieldAbsorb;
        addCombatLog(`🔮 Mana Shield absorbed ${formatNumber(state.manaShieldAbsorb)}! Shield shattered!`, 'info');
        state.manaShield = false;
        state.manaShieldAbsorb = 0;
      }
    } else {
      // Paladin divine shield — absorbs one full hit
      state.manaShield = false;
      addCombatLog(`🔮 Divine Shield absorbed the hit!`, 'info');
      enemyDamage = 0;
    }
  }

  // Deal damage to player
  state.hp -= enemyDamage;

  if (enemyDamage > 0) {
    addCombatLog(`${currentEnemy.name} hits you for ${formatNumber(enemyDamage)}!`, 'bad');
    animateAttack(false, enemyDamage, false);

    // ── PALADIN: Damage reflect ──
    if (state.dmgReflect > 0 && currentEnemy && currentEnemy.hp > 0) {
      const reflectDmg = Math.floor(enemyDamage * state.dmgReflect);
      if (reflectDmg > 0) {
        currentEnemy.hp -= reflectDmg;
        addCombatLog(`🛡️ Reflected ${formatNumber(reflectDmg)} dmg back!`, 'good');
        spawnDmgFloat(`↩️${formatNumber(reflectDmg)}`, true, 'crit-dmg');
      }
    }
  }

  // ── Apply poison damage to enemy ──
  if (currentEnemy.poisoned > 0) {
    const poisonDamage = currentEnemy.poisonDmg || 8;
    currentEnemy.hp -= poisonDamage;
    currentEnemy.poisoned--;
    addCombatLog(`🐍 Poison deals ${formatNumber(poisonDamage)}! (${currentEnemy.poisoned} stacks left)`, 'good');
    spawnDmgFloat(formatNumber(poisonDamage), true, 'poison-float');
  }

  // ── SHAMAN: Bonus attacks from Wind Burst ──
  if (state.bonusAttacks > 0 && currentEnemy.hp > 0) {
    const bonusHits = Math.min(state.bonusAttacks, 2); // max 2 per turn
    state.bonusAttacks = Math.max(0, state.bonusAttacks - bonusHits);
    for (let i = 0; i < bonusHits; i++) {
      if (currentEnemy.hp <= 0) break;
      const bonusDmg = Math.floor(state.attackPower * 0.5);
      currentEnemy.hp -= bonusDmg;
      addCombatLog(`🌪️ Wind Strike! ${formatNumber(bonusDmg)} bonus dmg!`, 'good');
      spawnDmgFloat(formatNumber(bonusDmg), true, 'dmg-float');
    }
  }

  // ── Check for undying talent (survive lethal blow) ──
  if (state.hp <= 0 && state.unlockedTalents.includes('undying') && !state.usedUndying) {
    state.hp = 1;
    state.usedUndying = true;
    addCombatLog('💪 Undying Will! Survived with 1 HP!', 'gold');
    spawnDmgFloat('💪 UNDYING!', false, 'heal-float');
  }

  updateUI();
}


// ── USE SKILL IN COMBAT ──
function useSkillInCombat(skillId){
  if(!currentEnemy)return;
  const sk=SKILLS[skillId];if(!sk)return;
  const cd=state.skillCooldowns[skillId]||0,mpCost=typeof sk.mp==='function'?sk.mp():sk.mp;
  if(cd>0){addCombatLog(`${sk.name} on cooldown! (${cd})`,'bad');return;}
  if(state.mp<mpCost){addCombatLog(`Not enough MP for ${sk.name}!`,'bad');return;}
  state.mp-=mpCost;// Apply cast speed cooldown reduction
const cdr = state.cdr || 0;
state.skillCooldowns[skillId] = Math.max(1, Math.floor(sk.cd * (1 - cdr)));sk.use(currentEnemy);
  spawnAbilityFloat(`${sk.icon} ${sk.name}!`,'#f0c040');
  Object.keys(state.skillCooldowns).forEach(k=>{if(k!==skillId&&state.skillCooldowns[k]>0)state.skillCooldowns[k]--;});
  if(currentEnemy&&currentEnemy.hp<=0){currentEnemy.hp=0;updateEnemyBar();clearInterval(autoFightTimer);autoFightTimer=null;endCombat(true);return;}
  if(currentEnemy&&currentEnemy.hp>0){
    const pDodge=Math.max(0,state.dodge-(currentEnemy.hit||0))/100;
    let eDmg=Math.max(1,currentEnemy.atk+Math.floor(Math.random()*6)-Math.floor(state.armor/10));
    if(state.manaShield){state.manaShield=false;addCombatLog('🔮 Mana Shield absorbed!','info');eDmg=0;}
    if(Math.random()<pDodge){addCombatLog('💨 You dodged!','good');eDmg=0;}
    state.hp-=eDmg;
    if(eDmg>0){addCombatLog(`${currentEnemy.name} retaliates: ${eDmg}!`,'bad');animateAttack(false,eDmg,false);}
    if(state.hp<=0){state.hp=0;updateUI();endCombat(false);return;}
  }
  updateEnemyBar();updateUI();renderSkillBar();
}

// ── SOUL SKILL ──
function useSoulSkill(){
  if(!currentEnemy){notify('No enemy!','var(--red)');return;}
  if(!state.soulWeapon){notify('No Soul Weapon!','var(--red)');return;}
  if(state.soulSkillCd>0){notify(`Soul skill on cooldown! (${state.soulSkillCd} turns)`,'var(--red)');return;}

  const sw=SOUL_WEAPONS[state.soulWeapon.classId];
  if(!sw?.skill)return;

  const skill=sw.skill;
  let dmg=0;

  try{ dmg=skill.effect(currentEnemy)||0; }catch(e){ console.error(e); }

  state.soulSkillCd=skill.cd;

  if(dmg>0){
    // Apply damage
    const actualDmg=Math.max(1,dmg-Math.floor(currentEnemy.armor*0.3));
    currentEnemy.hp=Math.max(0,currentEnemy.hp-actualDmg);
    spawnDmgFloat(actualDmg,true);
    addCombatLog(`✨ ${skill.name}! ${formatNumber(actualDmg)} damage!`,'gold');
    updateEnemyBar();
    if(currentEnemy.hp<=0){endCombat(true);return;}
  } else {
    addCombatLog(`✨ ${skill.name} activated!`,'gold');
    spawnAbilityFloat(`✨ ${skill.name}!`,'var(--legendary)');
  }

  renderSkillBar();
  notify(`✨ ${skill.name}!`,'var(--legendary)');
}

// ── END COMBAT ──
async function endCombat(won){
  const es=document.getElementById('enemy-stats');if(es)es.style.display='none';
  if(!currentEnemy)return;

  state.arcaneSurgeActive=false;state.arcaneSurgeTurns=0;state.arcaneSurgeMult=1;state.soulBarrierAbsorb=0;
  state.earthTotemTurns=0;state.earthTotemReduction=0;state.bonusAttacks=0;state.manaShieldAbsorb=0;

  if(state.activeDebuffs.maxHpReduction>0){state.equipMaxHp=(state.equipMaxHp||0)+state.activeDebuffs.maxHpReduction;state.activeDebuffs.maxHpReduction=0;}
  state.activeDebuffs.webTrapped=0;state.activeDebuffs.rageTimer=0;state.webTrapped=0;
  if(currentEnemy.rageTimer>0)currentEnemy.atk=Math.floor(currentEnemy.atk/2);

  state.usedUndying=false;state.skillCooldowns={};state.battleCryActive=false;

  state.strMult=1.0;state.agiMult=1.0;state.intMult=1.0;state.staMult=1.0;
  state.armorMult=1.0;state.critMult=1.0;state.dodgeMult=1.0;state.hpRegenMult=1.0;
  state.mpRegenMult=1.0;state.hitMult=1.0;state.mpMult=1.0;state.attackPowerMult=1.0;state.lifeStealMult=1.0;state.maxHpMult=1.0;

  if(state.class){
    const c=CLASSES[state.class];
    Object.entries(c.bonuses).forEach(([k,v])=>{if(k in state)state[k]=1.0+v;});
  }
  Object.keys(state.talentBonuses).forEach(k=>{
    if(k in state&&k.includes('Mult'))state[k]+=state.talentBonuses[k];
  });
  calcStats();

  const wasBoss=currentEnemy.boss;
  const defeatedId=currentEnemy.id;

  if(won){
    if(defeatedId&&!wasBoss)autoFightEnemyId=defeatedId;

    const baseGold=currentEnemy.gold&&Array.isArray(currentEnemy.gold)?currentEnemy.gold:[50,150];
    const goldMult=Number(currentEnemy._goldMult)||1;
    const xpMult=Number(currentEnemy._xpMult)||1;

    let spinGoldMult=1;
    if(state.goldMult&&state.goldMult>1&&state.goldMultExpiry){
      if(new Date()<new Date(state.goldMultExpiry)){
        spinGoldMult=state.goldMult;
      } else {
        state.goldMult=1;state.goldMultExpiry=null;
      }
    }

    const g=Math.floor((Math.random()*(baseGold[1]-baseGold[0])+baseGold[0])*goldMult*spinGoldMult);
    const xp=Math.floor(currentEnemy.xp*xpMult);
    state.gold+=g;state.xp+=xp;
    addLog(`Defeated ${currentEnemy.name}! +${xp} XP, +${g} Gold`,'good');

    if(currentEnemy.loot){
      currentEnemy.loot().forEach(item=>{
        addToInventory(item);
        addLog(`Loot: ${item.name} [${RARITY[item.rarity]?.label||'Normal'}]`,item.rarity==='legendary'?'legendary':item.rarity==='epic'?'epic':'gold');
        if(item.rarity==='legendary')state.quests.legendary.done=true;
      });
    }

    if(wasBoss)state.quests.boss.done=true;
    state.quests.kill1.done=true;
    if(state.gold>=50)state.quests.gold50.done=true;
    autoSellAfterCombat();
    if(currentStage)rollMatDrop(currentStage.id,wasBoss);
    checkLevelUp();
    if(!autoFightOn && !currentStage) savePlayerToSupabase();
    renderQuests();

    trackQuestKill(defeatedId,wasBoss,currentStage?.id||null,g);

    // Record kill to Supabase
    if(defeatedId&&state.character_id){
  const drops=(currentEnemy?.loot?currentEnemy.loot():[]).map(item=>({name:item.name,rarity:item.rarity}));
  dbClient.rpc('record_monster_kill',{
    p_monster_id:defeatedId,
    p_character_id:state.character_id,
    p_stage_id:currentStage?.id||1,
    p_drops:drops,
    p_difficulty:state.difficulty||'normal'
  }).then(({error})=>{if(error)console.warn('record_monster_kill failed:',error.message);});
}

    currentEnemy=null;

    // Dungeon flow
    if(currentStage){
      if(wasBoss){dungeonComplete();}
      else if(dungeonQueue.length>0){setTimeout(()=>spawnNextDungeonMonster(),1200);}
      else{setTimeout(()=>startNextWave(),1500);}
    } else if(autoFightOn){
      // Stay in combat UI, restart next fight
      setTimeout(()=>{
        if(autoFightOn&&autoFightEnemyId)startCombat(autoFightEnemyId,false);
      },1000);
    } else {
      showChoicesMode();
    }

  } else {
    currentEnemy=null;
    showCombatMode();
    loadScene('town');
  }

  updateUI();renderSkillBar();updateAutoFightBtn();
}


// ── AUTO FIGHT ──
function toggleAutoFight() {
  if (currentStage) {
    autoFightOn = false; clearInterval(autoFightTimer); autoFightTimer = null;
    currentStage = null; dungeonWave = 0; dungeonQueue = []; currentEnemy = null;
    showChoicesMode();
    stopAutoFight();
    addLog('⏹️ Left the dungeon!', 'info');
    notify('⏹️ Dungeon abandoned!', '#888');
    loadScene('town'); return;
  }
  if (!autoFightEnemyId) { notify('⚠️ Defeat an enemy first!', 'var(--red)'); return; }
  autoFightOn = !autoFightOn; updateAutoFightBtn();
  if (autoFightOn) {
    addLog('⚡ Auto Fight ON!', 'gold');
    notify('⚡ Auto Fight activated!', 'var(--gold)');
    startAutoFight();
  } else {
    stopAutoFight();
    addLog('⏹️ Auto Fight OFF.', 'info');
    notify('⏹️ Auto Fight stopped.', '#888');
    showChoicesMode();
  }
}

function updateAutoFightBtn() {
  const btn = document.getElementById('auto-fight-btn'); if (!btn) return;
  if (currentStage) {
    btn.textContent = '🚪 Leave Dungeon';
    btn.style.background = 'linear-gradient(135deg,#6a0000,#aa2222)';
    btn.style.display = 'inline-block'; return;
  }
  btn.textContent = autoFightOn ? '⏹️ Stop Auto' : '⚡ Auto Fight';
  btn.style.background = autoFightOn
    ? 'linear-gradient(135deg,#6a0000,#aa2222)'
    : 'linear-gradient(135deg,#005500,#00aa44)';
  btn.style.display = (autoFightEnemyId && !currentEnemy) ? 'inline-block' : 'none';
}

function startAutoFight() {
  if (!autoFightOn || !autoFightEnemyId) return;
  if (autoFightTimer) { clearInterval(autoFightTimer); autoFightTimer = null; }
  startCombat(autoFightEnemyId, false);
  const interval = state.attackInterval || 1000;
  autoFightTimer = setInterval(() => {
    if (!autoFightOn) { clearInterval(autoFightTimer); autoFightTimer = null; return; }
    if (!currentEnemy) return; // enemy is null between fights — just wait, don't clear
    autoFightStep();
  }, interval);
}

async function stopAutoFight() {
  autoFightOn = false;
  clearInterval(autoFightTimer);
  autoFightTimer = null;
  updateAutoFightBtn();
  await savePlayerToSupabase();
}

async function autoFightStep(){
  if(!currentEnemy)return;
  // Player attacks
  const eDodge=Math.max(0,(currentEnemy.dodge||0)-state.hit)/100;
  if(Math.random()<eDodge){ addCombatLog(`💨 ${currentEnemy.name} dodged!`,'bad'); }
  else {
    let dmg=calculateAttackDamage(state.attackPower, currentEnemy.armor);
    let isCrit=false;
    if(Math.random()<state.crit/100){dmg=Math.floor(dmg*2);isCrit=true;}
    if(state.unlockedTalents.includes('berserker')&&state.hp<state.maxHp*.5)dmg=Math.floor(dmg*1.35);
    if(state.unlockedTalents.includes('death_mark'))dmg=Math.floor(dmg*1.5);
    if(isCrit)showCritEffect();
    currentEnemy.hp-=dmg;
    const ls=state.lifeSteal||0;
    if(ls>0){const h=Math.floor(dmg*ls);if(h>0){state.hp=Math.min(state.maxHp,state.hp+h);addCombatLog(`🩸 Life Steal +${h} HP!`,'good');spawnDmgFloat(`🩸+${h}`,false,'heal-float');}}
    useNextAutoSkill(currentEnemy);
    addCombatLog(`⚔️ ${isCrit?'💥CRIT! ':''}Auto: ${dmg} dmg!`,isCrit?'gold':'good');
    animateAttack(true,dmg,isCrit);
  }
  if(currentEnemy.hp<=0){currentEnemy.hp=0;updateEnemyBar();endCombat(true);return;}
Object.keys(state.skillCooldowns).forEach(k=>{if(state.skillCooldowns[k]>0)state.skillCooldowns[k]--;});if(state.soulSkillCd>0)state.soulSkillCd--;

  // Tick down Arcane Surge
if (state.arcaneSurgeActive && state.arcaneSurgeTurns > 0) {
  state.arcaneSurgeTurns--;
  if (state.arcaneSurgeTurns <= 0) {
    state.arcaneSurgeActive = false;
    // Remove buff
    const m = state.arcaneSurgeMult || 1;
    state.strMult /= m;
    state.agiMult /= m;
    state.intMult /= m;
    state.staMult /= m;
    state.arcaneSurgeMult = 1;
    calcStats();
    addCombatLog(`💫 Arcane Surge fades!`, 'info');
  }
}

// Tick down Soul Barrier
if (state.soulBarrierAbsorb > 0) {
  // Soul barrier is consumed in handleEnemyTurn
  // Just show it's active
}

  if(state.hpRegen>0){const r=Math.floor(state.hpRegen);if(r>0&&state.hp<state.maxHp){state.hp=Math.min(state.maxHp,state.hp+r);addCombatLog(`💚 Regen +${r} HP`,'good');}}
  if(state.manaRegen>0){const r=Math.floor(state.manaRegen);if(r>0&&state.mp<state.maxMp){state.mp=Math.min(state.maxMp,state.mp+r);addCombatLog(`💙 Mana Regen +${r} MP`,'info');}}
  // Boss ability
  if(currentEnemy.boss&&currentEnemy.ability){
    currentEnemy.abilityTurn=(currentEnemy.abilityTurn||0)+1;
    if(currentEnemy.abilityTurn>=currentEnemy.ability.triggerEvery){currentEnemy.abilityTurn=0;currentEnemy.ability.effect(currentEnemy);}
  }
  // Enemy attacks
  if(currentEnemy.frozen){currentEnemy.frozen=false;addCombatLog(`${currentEnemy.name} is frozen!`,'info');}
  else {
    const dodge=state.webTrapped>0?0:state.dodge;
    if(state.webTrapped>0)state.webTrapped--;
    if(currentEnemy.phaseShifted){currentEnemy.phaseShifted=false;addCombatLog(`🌑 ${currentEnemy.name} phases back!`,'info');}
    else {
      const pDodge=Math.max(0,dodge-(currentEnemy.hit||0))/100;
      let eDmg=calculateEnemyAttackDamage(currentEnemy.atk, state.armor);
      if(state.defending)eDmg=Math.floor(eDmg/2);
      if(Math.random()<pDodge){addCombatLog('💨 You dodged!','good');eDmg=0;}
      state.hp-=eDmg;
      if(eDmg>0){addCombatLog(`${currentEnemy.name} hits you for ${eDmg}!`,'bad');animateAttack(false,eDmg,false);}
    }
  }
  if(currentEnemy.rageTimer>0){currentEnemy.rageTimer--;if(currentEnemy.rageTimer===0){currentEnemy.atk=Math.floor(currentEnemy.atk/2);addCombatLog(`👊 ${currentEnemy.name} calms down!`,'info');}}
  if(currentEnemy.poisoned>0){const pd=currentEnemy.poisonDmg||Math.floor(state.agi*0.8+state.attackPower*0.3);currentEnemy.hp-=pd;currentEnemy.poisoned--;addCombatLog(`🐍 Poison deals ${pd}!`,'good');spawnDmgFloat(`🐍${pd}`,true,'enemy-dmg');}
  if(state.hp<=0){
    state.hp=0;updateUI();clearInterval(autoFightTimer);autoFightTimer=null;
    currentStage=null;dungeonWave=0;dungeonQueue=[];
    addLog('💀 You died!','bad');notify('💀 You died!','var(--red)');endCombat(false);return;
  }
  updateEnemyBar();updateUI();
}


// ── USE NEXT AUTO SKILL ──
function useNextAutoSkill(enemy){
  const filled=autoSkillSlots.map((id,i)=>({id,i})).filter(s=>s.id!==null);if(!filled.length)return false;
  const slot=filled[autoSkillIndex%filled.length];autoSkillIndex++;
  const skillId=slot.id;if(!skillId||!SKILLS[skillId])return false;
  const sk=SKILLS[skillId],cd=state.skillCooldowns[skillId]||0,mpCost=typeof sk.mp==='function'?sk.mp():sk.mp;
  if(cd>0){addCombatLog(`⏳ ${sk.name} on cooldown (${cd})`,'info');return false;}
  if(state.mp<mpCost){addCombatLog(`💙 Not enough MP for ${sk.name}!`,'bad');return false;}
  state.mp-=mpCost;// Apply cast speed cooldown reduction
const cdr = state.cdr || 0;
state.skillCooldowns[skillId] = Math.max(1, Math.floor(sk.cd * (1 - cdr)));sk.use(enemy);
  spawnAbilityFloat(`${sk.icon} ${sk.name}!`,'#f0c040');return true;
}

// ── AUTO SLOT HELPERS ──
function dropSkillToSlot(event,slotIndex){const skillId=event.dataTransfer.getData('skillId');if(!skillId||!SKILLS[skillId])return;autoSkillSlots[slotIndex]=skillId;renderAutoSlots();}
function clearSlot(slotIndex){autoSkillSlots[slotIndex]=null;renderAutoSlots();}
function renderAutoSlots(){
  autoSkillSlots.forEach((skillId,i)=>{
    const content=document.getElementById(`auto-slot-content-${i}`);const slot=document.getElementById(`auto-slot-${i}`);if(!content||!slot)return;
    if(skillId&&SKILLS[skillId]){const sk=SKILLS[skillId];content.innerHTML=sk.icon;content.style.borderColor='var(--gold)';slot.querySelector('.skill-lbl').textContent=sk.name;}
    else{content.innerHTML='➕';content.style.borderColor='';slot.querySelector('.skill-lbl').textContent=`Slot ${i+1}`;}
  });
}

function clearSlot(slotIndex) {
  autoSkillSlots[slotIndex] = null;
  renderAutoSlots();
}

function renderAutoSlots() {
  autoSkillSlots.forEach((skillId, i) => {
    const content = document.getElementById(`auto-slot-content-${i}`);
    const slot = document.getElementById(`auto-slot-${i}`);
    if (!content || !slot) return;
    if (skillId && SKILLS[skillId]) {
      const sk = SKILLS[skillId];
      content.innerHTML = sk.icon;
      content.style.borderColor = 'var(--gold)';
      slot.querySelector('.skill-lbl').textContent = sk.name;
    } else {
      content.innerHTML = '➕';
      content.style.borderColor = '';
      slot.querySelector('.skill-lbl').textContent = `Slot ${i + 1}`;
    }
  });
}

function selectSkillForSlot(skillId) {
  // If already selected, deselect
  if (selectedSkillForSlot === skillId) {
    selectedSkillForSlot = null;
    renderSkillBar();
    updateAutoSlotHighlight();
    return;
  }
  selectedSkillForSlot = skillId;
  renderSkillBar();
  updateAutoSlotHighlight();
  setTimeout(() => notify('👆 Now tap a slot to assign!', 'var(--gold)'), 50);
}

function assignSelectedSkill(slotIndex) {
  if (!selectedSkillForSlot) {
    clearSlot(slotIndex);
    return;
  }

  // BUG FIX: prevent same skill being assigned to multiple slots
  if (autoSkillSlots.includes(selectedSkillForSlot)) {
    const sk = SKILLS[selectedSkillForSlot];
    notify(`${sk?.icon || ''} ${sk?.name || selectedSkillForSlot} is already in a slot!`, 'var(--gold)');
    selectedSkillForSlot = null;
    updateAutoSlotHighlight();
    return;
  }

  autoSkillSlots[slotIndex] = selectedSkillForSlot;
  selectedSkillForSlot = null;
  renderAutoSlots();
  renderSkillBar();
  updateAutoSlotHighlight();
  notify('✅ Skill assigned!', 'var(--green)');
}

function updateAutoSlotHighlight() {
  for (let i = 0; i < 6; i++) {
    const icon = document.getElementById(`auto-slot-content-${i}`);
    if (!icon) continue;

    const assignedSkill = autoSkillSlots[i];
    const sk = assignedSkill ? SKILLS[assignedSkill] : null;

    if (selectedSkillForSlot) {
      // Show slot-ready pulse when player is picking a slot
      icon.classList.add('slot-ready');
    } else {
      icon.classList.remove('slot-ready');
    }

    // Show assigned skill icon or empty placeholder
    if (sk) {
      icon.textContent = sk.icon;
      icon.title = sk.name;
    } else {
      icon.textContent = '➕';
      icon.title = '';
    }
  }
}

function assignSkillToAutoSlot(skillId) {
  if (!skillId || !SKILLS[skillId]) return;

  // BUG FIX: prevent same skill being assigned to multiple slots
  if (autoSkillSlots.includes(skillId)) {
    notify(`${SKILLS[skillId].icon} ${SKILLS[skillId].name} is already in a slot!`, 'var(--gold)');
    return;
  }

  const emptySlot = autoSkillSlots.indexOf(null);
  if (emptySlot === -1) {
    notify('All 6 slots filled! Tap a slot icon to clear it.', 'var(--gold)');
    return;
  }
  autoSkillSlots[emptySlot] = skillId;
  renderAutoSlots();
  notify('✅ Skill assigned to slot ' + (emptySlot + 1) + '!', 'var(--green)');
}

// ── SKILL BAR RENDER ──
function renderSkillBar(){
  if(!state.skills||!state.skills.length){
    document.getElementById('skills-bar').style.display='none';
    return;
  }
  document.getElementById('skills-bar').style.display='block';

  const regularSkills=state.skills.map((sid, index)=>{
    const sk=SKILLS[sid];if(!sk)return'';
    const cd=state.skillCooldowns[sid]||0;
    const inSlot=autoSkillSlots.includes(sid);
    const keyNum=index<9?index+1:null;
    const keyBadge=keyNum
      ?`<div style="position:absolute;top:2px;left:4px;font-size:.6em;color:var(--gold);
          background:rgba(0,0,0,0.6);border:1px solid rgba(255,153,0,0.3);
          border-radius:3px;padding:0 3px;line-height:1.4;font-family:var(--font-body);">${keyNum}</div>`
      :'';
    return`<div class="skill-slot ${inSlot?'in-slot':''}"
      style="position:relative;"
      draggable="true"
      ondragstart="event.dataTransfer.setData('skillId','${sid}')"
      onclick="${currentEnemy?`useSkillInCombat('${sid}')`:`assignSkillToAutoSlot('${sid}')`}">
      ${keyBadge}
      <div class="skill-icon-wrap ${cd>0?'on-cd':''}">${sk.icon}</div>
      <div class="skill-lbl">${sk.name}</div>
      <div class="skill-cd-lbl">${cd>0?`CD:${cd}`:`${typeof sk.mp==='function'?sk.mp():sk.mp}MP`}</div>
    </div>`;
  }).join('');

  // Soul weapon skill
  let soulSkillHtml='';
  if(state.soulWeapon){
    const sw=SOUL_WEAPONS[state.soulWeapon.classId];
    if(sw?.skill){
      const cd=state.soulSkillCd||0;
      soulSkillHtml=`<div class="skill-slot soul-skill ${cd>0?'on-cd':''}"
        onclick="${currentEnemy?`useSoulSkill()`:`''`}"
        style="position:relative;border-color:var(--legendary);background:rgba(255,153,0,0.08);">
        <div style="position:absolute;top:2px;left:4px;font-size:.6em;color:var(--legendary);
          background:rgba(0,0,0,0.6);border:1px solid rgba(255,153,0,0.3);
          border-radius:3px;padding:0 3px;line-height:1.4;font-family:var(--font-body);">S</div>
        <div class="skill-icon-wrap ${cd>0?'on-cd':''}">${sw.skill.icon}</div>
        <div class="skill-lbl" style="color:var(--legendary);">${sw.skill.name}</div>
        <div class="skill-cd-lbl">${cd>0?`CD:${cd}`:'SOUL'}</div>
      </div>`;
    }
  }

  document.getElementById('skills-slot-row').innerHTML=regularSkills+soulSkillHtml;
}

// ── KEYBOARD SHORTCUTS ──
const SkillGCD = (() => {
  let lastUseTime = 0;
  const getGCD = () => parseInt(localStorage.getItem('setting-gcd') || 800);
  return {
    canUse() {
      const now = Date.now();
      if (now - lastUseTime < getGCD()) return false;
      lastUseTime = now;
      return true;
    }
  };
})();

function initSkillBarKeyHandler() {
  if (window._skillBarKeyHandler) document.removeEventListener('keydown', window._skillBarKeyHandler);
  window._skillBarKeyHandler = function (e) {
    if(!e || !e.key) return; // ADD THIS
    if (document.getElementById('item-popup')?.style.display === 'flex') return;
    if (document.getElementById('enhance-screen')?.style.display === 'block') return;

    const k = e.key.toLowerCase();

    // ── OUTSIDE COMBAT: slot management ──
    if (!currentEnemy) {
      
    }

    // ── IN COMBAT: skill keys ──
    if (currentEnemy) {
        if (k === 'a') {
        const unassigned = state.skills.find(sid => !autoSkillSlots.includes(sid));
        if (!unassigned) { notify('All skills already assigned!', 'var(--gold)'); return; }
        const emptySlot = autoSkillSlots.indexOf(null);
        if (emptySlot === -1) { notify('All 6 slots filled!', 'var(--gold)'); return; }
        autoSkillSlots[emptySlot] = unassigned;
        renderAutoSlots(); renderSkillBar();
        const sk = SKILLS[unassigned];
        notify(`${sk?.icon || ''} ${sk?.name} → Slot ${emptySlot + 1}`, 'var(--green)');
      }
      if (k === 'r') {
        let lastFilled = -1;
        for (let i = 5; i >= 0; i--) { if (autoSkillSlots[i] !== null) { lastFilled = i; break; } }
        if (lastFilled === -1) { notify('No skills in slots!', 'var(--gold)'); return; }
        const sk = SKILLS[autoSkillSlots[lastFilled]];
        autoSkillSlots[lastFilled] = null;
        renderAutoSlots(); renderSkillBar();
        notify(`${sk?.icon || ''} ${sk?.name} removed from slot ${lastFilled + 1}`, 'var(--red)');
      }
      if (k === 'q') {
        autoSkillSlots.fill(null);
        renderAutoSlots(); renderSkillBar();
        notify('🗑️ All skill slots cleared!', 'var(--red)');
      }
      // 1-6 → auto skill slots, 7-9 → state.skills directly
      const num = parseInt(e.key);
        if (num >= 1 && num <= 9) {
        if (!SkillGCD.canUse()) { notify('⏳ Too fast!', 'var(--red)'); return; }
        const skillId = state.skills[num - 1];
        if (skillId) useSkillInCombat(skillId);
        else notify(`No skill in slot ${num}!`, 'var(--gold)');
         return;
    }
      // S → soul skill
      if (k === 's') {
        if (!SkillGCD.canUse()) { notify('⏳ Too fast!', 'var(--red)'); return; }
        useSoulSkill(); return;
      }
      // Space → toggle auto-fight
      if (e.key === ' ') { e.preventDefault(); toggleAutoFight(); return; }
      // F → leave dungeon / flee
      if (k === 'f') { combatAction('flee'); return; }
    }
  };
  document.addEventListener('keydown', window._skillBarKeyHandler);
}

function updateGCD(val) {
  localStorage.setItem('setting-gcd', val);
  document.getElementById('setting-gcd-val').textContent = val + 'ms';
  notify(`⚡ GCD set to ${val}ms`, 'var(--green)');
}

// ── COMBAT LOG & UI HELPERS ──
function addCombatLog(msg,type=''){
  msg=msg.replace(/(\d+)/g,(m)=>formatNumber(parseInt(m)));
  const b=document.getElementById('combat-log'),d=document.createElement('div');
  d.className=`log-entry ${type?'log-'+type:''}`;d.textContent=msg;b.appendChild(d);b.scrollTop=b.scrollHeight;
}

function updateEnemyBar(){
  if(!currentEnemy)return;
  const p=Math.max(0,(currentEnemy.hp/currentEnemy.maxHp)*100);
  document.getElementById('arena-enemy-hp').style.width=p+'%';
  document.getElementById('enemy-hp-val').textContent=Math.max(0,currentEnemy.hp);
}