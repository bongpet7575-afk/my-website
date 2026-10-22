// npc-character.js
// God Domain — NPC Portrait System
// Add each NPC's SVG here as oracle.exe delivers them

const NPC_PORTRAITS = {

  mirela: `<svg viewBox="0 0 600 700" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="mirela_candleGlow" cx="50%" cy="30%" r="60%">
        <stop offset="0%" stop-color="#ffb347" stop-opacity="0.4"/>
        <stop offset="40%" stop-color="#ff8c00" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#050508" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="mirela_faceLight" cx="50%" cy="80%" r="50%">
        <stop offset="0%" stop-color="#ffb347" stop-opacity="0.3"/>
        <stop offset="60%" stop-color="#ff8c00" stop-opacity="0.1"/>
        <stop offset="100%" stop-color="#050508" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="mirela_flameGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff5e6" stop-opacity="1"/>
        <stop offset="30%" stop-color="#ffb347" stop-opacity="0.8"/>
        <stop offset="70%" stop-color="#ff6600" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#ff4500" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="mirela_deskWood" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#3d2817"/>
        <stop offset="50%" stop-color="#2a1a0f"/>
        <stop offset="100%" stop-color="#1a0f08"/>
      </linearGradient>
      <linearGradient id="mirela_dressGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#2d1b4e"/>
        <stop offset="50%" stop-color="#1d0b3e"/>
        <stop offset="100%" stop-color="#0d0520"/>
      </linearGradient>
      <linearGradient id="mirela_hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#1a0820"/>
        <stop offset="100%" stop-color="#0a0310"/>
      </linearGradient>
      <filter id="mirela_softShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
        <feOffset dx="2" dy="4"/>
        <feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer>
        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="mirela_glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <radialGradient id="mirela_vignette" cx="50%" cy="50%" r="70%">
        <stop offset="50%" stop-color="transparent"/>
        <stop offset="100%" stop-color="#050508" stop-opacity="0.7"/>
      </radialGradient>
    </defs>
    <rect width="600" height="700" fill="#050508"/>
    <rect width="600" height="700" fill="url(#mirela_candleGlow)" opacity="0.5"/>
    <rect x="0" y="0" width="600" height="350" fill="#0a0812"/>
    <rect x="50" y="80" width="80" height="200" fill="#0d0a15" rx="2"/>
    <rect x="55" y="90" width="70" height="40" fill="#12101a" rx="1"/>
    <rect x="55" y="140" width="70" height="40" fill="#12101a" rx="1"/>
    <rect x="55" y="190" width="70" height="40" fill="#12101a" rx="1"/>
    <rect x="60" y="95" width="8" height="30" fill="#2a1540" rx="1"/>
    <rect x="70" y="98" width="6" height="27" fill="#3d2060" rx="1"/>
    <rect x="78" y="93" width="10" height="32" fill="#1d0b3e" rx="1"/>
    <rect x="90" y="96" width="7" height="29" fill="#4a2870" rx="1"/>
    <rect x="99" y="94" width="9" height="31" fill="#2d1b4e" rx="1"/>
    <rect x="470" y="100" width="80" height="180" fill="#0d0a15" rx="2"/>
    <rect x="475" y="110" width="70" height="35" fill="#12101a" rx="1"/>
    <rect x="475" y="155" width="70" height="35" fill="#12101a" rx="1"/>
    <rect x="480" y="115" width="8" height="25" fill="#3d2060" rx="1"/>
    <rect x="490" y="118" width="6" height="22" fill="#2a1540" rx="1"/>
    <rect x="498" y="114" width="10" height="26" fill="#4a2870" rx="1"/>
    <rect x="100" y="380" width="400" height="25" fill="url(#mirela_deskWood)" filter="url(#mirela_softShadow)"/>
    <rect x="100" y="380" width="400" height="3" fill="#4a3520" opacity="0.5"/>
    <rect x="110" y="405" width="380" height="80" fill="#251810"/>
    <rect x="115" y="410" width="120" height="70" fill="#1a1008" rx="2"/>
    <rect x="245" y="410" width="120" height="70" fill="#1a1008" rx="2"/>
    <rect x="375" y="410" width="105" height="70" fill="#1a1008" rx="2"/>
    <circle cx="175" cy="445" r="5" fill="#c9a227" opacity="0.6"/>
    <circle cx="305" cy="445" r="5" fill="#c9a227" opacity="0.6"/>
    <rect x="120" y="485" width="20" height="100" fill="#1a0f08"/>
    <rect x="460" y="485" width="20" height="100" fill="#1a0f08"/>
    <ellipse cx="420" cy="375" rx="20" ry="6" fill="#8b7355"/>
    <rect x="412" y="355" width="16" height="20" fill="#c9a227" opacity="0.8"/>
    <ellipse cx="420" cy="355" rx="8" ry="3" fill="#c9a227"/>
    <rect x="414" y="320" width="12" height="35" fill="#f5e6d3"/>
    <rect x="414" y="320" width="3" height="35" fill="#fff5e6" opacity="0.3"/>
    <line x1="420" y1="320" x2="420" y2="310" stroke="#1a0a05" stroke-width="2"/>
    <g filter="url(#mirela_glow)">
      <ellipse cx="420" cy="300" rx="8" ry="15" fill="#ffb347" opacity="0.9">
        <animate attributeName="ry" values="15;17;15;16;15" dur="0.3s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="420" cy="298" rx="5" ry="10" fill="#fff5e6" opacity="0.8">
        <animate attributeName="ry" values="10;12;10;11;10" dur="0.4s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="420" cy="295" rx="2" ry="5" fill="#ffffff" opacity="0.9"/>
    </g>
    <ellipse cx="400" cy="385" rx="150" ry="30" fill="#ffb347" opacity="0.1"/>
    <g filter="url(#mirela_softShadow)">
      <path d="M220 280 L220 450 L380 450 L380 280 Q350 260 300 255 Q250 260 220 280" fill="#1a0a25"/>
      <path d="M230 290 L230 440 L370 440 L370 290 Q345 275 300 270 Q255 275 230 290" fill="#251535"/>
      <path d="M240 180 Q230 250 235 350 Q240 380 250 400 L260 400 Q255 350 260 280 Z" fill="url(#mirela_hairGrad)"/>
      <path d="M360 180 Q370 250 365 350 Q360 380 350 400 L340 400 Q345 350 340 280 Z" fill="url(#mirela_hairGrad)"/>
      <path d="M230 280 Q200 320 180 400 L180 450 L420 450 L420 400 Q400 320 370 280 Q340 260 300 255 Q260 260 230 280" fill="url(#mirela_dressGrad)"/>
      <path d="M250 270 Q270 285 300 290 Q330 285 350 270" fill="none" stroke="#c9a227" stroke-width="2"/>
      <path d="M180 400 Q200 395 220 398" fill="none" stroke="#c9a227" stroke-width="1.5" opacity="0.6"/>
      <path d="M380 398 Q400 395 420 400" fill="none" stroke="#c9a227" stroke-width="1.5" opacity="0.6"/>
      <ellipse cx="220" cy="300" rx="25" ry="15" fill="#2d1b4e"/>
      <ellipse cx="380" cy="300" rx="25" ry="15" fill="#2d1b4e"/>
      <path d="M220 300 Q200 340 220 380 Q230 390 250 395" fill="url(#mirela_dressGrad)" stroke="#1d0b3e" stroke-width="1"/>
      <path d="M380 300 Q395 340 380 370 Q370 380 350 385" fill="url(#mirela_dressGrad)" stroke="#1d0b3e" stroke-width="1"/>
      <ellipse cx="245" cy="398" rx="18" ry="10" fill="#e8cfc0"/>
      <ellipse cx="355" cy="398" rx="18" ry="10" fill="#e8cfc0"/>
      <ellipse cx="230" cy="400" rx="8" ry="5" fill="#e8cfc0"/>
      <ellipse cx="260" cy="400" rx="8" ry="5" fill="#e8cfc0"/>
      <ellipse cx="340" cy="400" rx="8" ry="5" fill="#e8cfc0"/>
      <ellipse cx="370" cy="400" rx="8" ry="5" fill="#e8cfc0"/>
      <rect x="285" y="220" width="30" height="40" fill="#fce4d6"/>
      <path d="M245 150 Q250 120 300 110 Q350 120 355 150 Q350 140 300 135 Q250 140 245 150" fill="url(#mirela_hairGrad)"/>
      <path d="M245 150 Q240 180 245 220 L260 220 Q255 180 260 160 Z" fill="url(#mirela_hairGrad)"/>
      <path d="M355 150 Q360 180 355 220 L340 220 Q345 180 340 160 Z" fill="url(#mirela_hairGrad)"/>
      <ellipse cx="300" cy="115" rx="25" ry="18" fill="#1a0820"/>
      <ellipse cx="300" cy="112" rx="15" ry="10" fill="#2a1535" opacity="0.5"/>
      <circle cx="300" cy="100" r="6" fill="#c9a227"/>
      <circle cx="300" cy="100" r="3" fill="#ffb347"/>
      <path d="M260 160 Q255 180 260 210 Q270 235 300 240 Q330 235 340 210 Q345 180 340 160 Q330 145 300 140 Q270 145 260 160" fill="#fce4d6"/>
      <path d="M260 160 Q255 180 260 210 Q270 235 300 240 Q330 235 340 210 Q345 180 340 160 Q330 145 300 140 Q270 145 260 160" fill="url(#mirela_faceLight)"/>
      <path d="M265 175 Q275 170 290 173" fill="none" stroke="#3a2015" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M335 175 Q325 170 310 173" fill="none" stroke="#3a2015" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse cx="278" cy="188" rx="12" ry="8" fill="#ffffff"/>
      <ellipse cx="276" cy="190" rx="6" ry="6" fill="#5b2c6f"/>
      <ellipse cx="276" cy="190" rx="3" ry="3" fill="#0a0a0a"/>
      <circle cx="274" cy="188" r="1.5" fill="#ffffff" opacity="0.8"/>
      <path d="M266 185 Q278 180 290 185" fill="none" stroke="#2a1510" stroke-width="2"/>
      <path d="M266 191 Q278 195 290 191" fill="none" stroke="#d4a898" stroke-width="1"/>
      <ellipse cx="322" cy="188" rx="12" ry="8" fill="#ffffff"/>
      <ellipse cx="324" cy="190" rx="6" ry="6" fill="#5b2c6f"/>
      <ellipse cx="324" cy="190" rx="3" ry="3" fill="#0a0a0a"/>
      <circle cx="322" cy="188" r="1.5" fill="#ffffff" opacity="0.8"/>
      <path d="M310 185 Q322 180 334 185" fill="none" stroke="#2a1510" stroke-width="2"/>
      <path d="M310 191 Q322 195 334 191" fill="none" stroke="#d4a898" stroke-width="1"/>
      <path d="M266 185 Q263 182 260 180" fill="none" stroke="#1a0a05" stroke-width="1.5"/>
      <path d="M290 185 Q293 182 296 180" fill="none" stroke="#1a0a05" stroke-width="1.5"/>
      <path d="M310 185 Q307 182 304 180" fill="none" stroke="#1a0a05" stroke-width="1.5"/>
      <path d="M334 185 Q337 182 340 180" fill="none" stroke="#1a0a05" stroke-width="1.5"/>
      <path d="M298 195 Q300 205 302 195" fill="none" stroke="#d4a898" stroke-width="1.5"/>
      <path d="M295 205 Q300 210 305 205" fill="none" stroke="#d4a898" stroke-width="1"/>
      <ellipse cx="270" cy="200" rx="8" ry="4" fill="#e8a090" opacity="0.25"/>
      <ellipse cx="330" cy="200" rx="8" ry="4" fill="#e8a090" opacity="0.25"/>
      <path d="M285 218 Q292 215 300 216 Q308 215 315 218" fill="none" stroke="#b56a60" stroke-width="2" stroke-linecap="round"/>
      <path d="M290 235 Q300 240 310 235" fill="none" stroke="#e0c8b8" stroke-width="1" opacity="0.5"/>
    </g>
    <g transform="translate(260, 360)">
      <rect x="0" y="0" width="80" height="55" fill="#4a3020" rx="2"/>
      <rect x="3" y="3" width="74" height="49" fill="#5a3828" rx="1"/>
      <rect x="0" y="0" width="8" height="55" fill="#3a2015" rx="2"/>
      <rect x="10" y="5" width="60" height="45" fill="#f5e6d3"/>
      <rect x="12" y="7" width="56" height="41" fill="#faf0e6"/>
      <line x1="15" y1="12" x2="65" y2="12" stroke="#c9b8a8" stroke-width="0.5"/>
      <line x1="15" y1="17" x2="60" y2="17" stroke="#c9b8a8" stroke-width="0.5"/>
      <line x1="15" y1="22" x2="65" y2="22" stroke="#c9b8a8" stroke-width="0.5"/>
      <line x1="15" y1="27" x2="55" y2="27" stroke="#c9b8a8" stroke-width="0.5"/>
      <line x1="15" y1="32" x2="65" y2="32" stroke="#c9b8a8" stroke-width="0.5"/>
      <line x1="15" y1="37" x2="58" y2="37" stroke="#c9b8a8" stroke-width="0.5"/>
      <text x="18" y="12" font-size="3" fill="#a89888" font-family="serif">47,291</text>
      <text x="18" y="17" font-size="3" fill="#a89888" font-family="serif">-12,847</text>
      <text x="18" y="22" font-size="3" fill="#a89888" font-family="serif">34,444</text>
      <text x="18" y="27" font-size="3" fill="#a89888" font-family="serif">...</text>
      <rect x="30" y="0" width="50" height="55" fill="#ffb347" opacity="0.08"/>
    </g>
    <g transform="translate(450, 365)">
      <ellipse cx="0" cy="8" rx="12" ry="4" fill="#1a1a2e"/>
      <rect x="-8" y="0" width="16" height="8" fill="#2a2a4e"/>
      <ellipse cx="0" cy="0" rx="8" ry="3" fill="#0a0a1a"/>
      <line x1="5" y1="-5" x2="20" y2="-25" stroke="#4a3020" stroke-width="2"/>
      <polygon points="20,-25 22,-28 18,-26" fill="#1a0a05"/>
    </g>
    <g transform="translate(150, 370) rotate(-5)">
      <rect x="0" y="0" width="35" height="25" fill="#f5e6d3" opacity="0.9"/>
      <rect x="0" y="0" width="35" height="25" fill="#ffb347" opacity="0.1"/>
      <line x1="5" y1="5" x2="30" y2="5" stroke="#c9b8a8" stroke-width="0.5"/>
      <line x1="5" y1="10" x2="25" y2="10" stroke="#c9b8a8" stroke-width="0.5"/>
      <line x1="5" y1="15" x2="28" y2="15" stroke="#c9b8a8" stroke-width="0.5"/>
    </g>
    <rect x="0" y="0" width="600" height="700" fill="url(#mirela_candleGlow)" opacity="0.3"/>
    <rect x="0" y="0" width="600" height="700" fill="url(#mirela_vignette)"/>
    <circle cx="380" cy="320" r="1" fill="#ffb347" opacity="0.3">
      <animate attributeName="cy" values="320;300;320" dur="3s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.3;0.1;0.3" dur="3s" repeatCount="indefinite"/>
    </circle>
    <circle cx="440" cy="340" r="0.8" fill="#ffb347" opacity="0.2">
      <animate attributeName="cy" values="340;315;340" dur="4s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.2;0.05;0.2" dur="4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="410" cy="350" r="0.6" fill="#ffb347" opacity="0.25">
      <animate attributeName="cy" values="350;330;350" dur="3.5s" repeatCount="indefinite"/>
    </circle>
  </svg>`,

  // ragnar: `...paste Ragnar SVG here...`,
  // sovan: `...paste Sovan SVG here...`,
  // aldric: `...`,
  // vex: `...`,
  // kara: `...`,
  // brother_elian: `...`,
  // malachar: `...`,
  // nara: `...`,
  // seraphine: `...`,

}

// Call this when player opens NPC dialogue
function showNPCPortrait(npcId) {
  if (!npcId || typeof npcId !== 'string') {
    hideNPCPortrait()
    return
  }

  // normalize id to match keys in NPC_PORTRAITS
  const key = npcId.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  const portrait = NPC_PORTRAITS[key]
  const container = document.getElementById('npc-portrait')
  if (!container) return
  if (portrait) {
    container.innerHTML = portrait
    container.style.display = 'block'
    container.setAttribute('aria-hidden', 'false')
  } else {
    // fallback if portrait not yet added
    container.innerHTML = ''
    container.style.display = 'none'
    container.setAttribute('aria-hidden', 'true')
  }
}

// Call this when player closes NPC dialogue
function hideNPCPortrait() {
  const container = document.getElementById('npc-portrait')
  if (container) {
    container.innerHTML = ''
    container.style.display = 'none'
    container.setAttribute('aria-hidden', 'true')
  }
}

const STAGE_BACKGROUNDS = {
  wolf_den: `<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="den_sky_grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0a0a12"/><stop offset="40%" stop-color="#0f0f18"/><stop offset="100%" stop-color="#151520"/>
      </linearGradient>
      <radialGradient id="den_moon_glow" cx="70%" cy="15%" r="30%">
        <stop offset="0%" stop-color="#c0c8d0" stop-opacity="0.4"/><stop offset="50%" stop-color="#8090a0" stop-opacity="0.15"/><stop offset="100%" stop-color="#0a0a12" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="den_moonbeam_grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#c0c8d0" stop-opacity="0.15"/><stop offset="100%" stop-color="#c0c8d0" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="den_ground_grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#1a1a22"/><stop offset="100%" stop-color="#0f0f15"/>
      </linearGradient>
      <linearGradient id="den_fog_grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#2a2a35" stop-opacity="0"/><stop offset="50%" stop-color="#2a2a35" stop-opacity="0.3"/><stop offset="100%" stop-color="#1a1a25" stop-opacity="0.5"/>
      </linearGradient>
      <linearGradient id="den_cave_grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#050508"/><stop offset="100%" stop-color="#020204"/>
      </linearGradient>
      <radialGradient id="den_eye_glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ff2200" stop-opacity="1"/><stop offset="30%" stop-color="#cc1100" stop-opacity="0.6"/><stop offset="100%" stop-color="#660800" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="den_rock_grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#252530"/><stop offset="100%" stop-color="#15151a"/>
      </linearGradient>
      <linearGradient id="den_bone_grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#3a3a35"/><stop offset="100%" stop-color="#25252a"/>
      </linearGradient>
      <linearGradient id="den_leaf_grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#2a2218"/><stop offset="100%" stop-color="#1a1510"/>
      </linearGradient>
      <linearGradient id="den_moss_grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#1a2a18"/><stop offset="100%" stop-color="#0f1a0f"/>
      </linearGradient>
      <radialGradient id="den_vignette" cx="50%" cy="50%" r="70%">
        <stop offset="40%" stop-color="transparent"/><stop offset="100%" stop-color="#020204" stop-opacity="0.8"/>
      </radialGradient>
    </defs>
    <rect width="600" height="400" fill="url(#den_sky_grad)"/>
    <rect width="600" height="400" fill="url(#den_moon_glow)"/>
    <circle cx="420" cy="50" r="20" fill="#c8d0d8" opacity="0.6"/>
    <circle cx="420" cy="50" r="18" fill="#d0d8e0" opacity="0.4"/>
    <g opacity="0.4">
      <path d="M-20 120 Q-15 80 -10 40 Q-5 20 0 10 Q5 20 10 40 Q15 80 20 120" fill="#08080a"/>
      <path d="M-10 40 Q-30 35 -50 45" fill="#08080a"/><path d="M0 25 Q15 15 35 25" fill="#08080a"/>
      <path d="M80 130 Q85 70 90 30 Q95 15 100 5 Q105 15 110 30 Q115 70 120 130" fill="#08080a"/>
      <path d="M90 30 Q70 25 50 35" fill="#08080a"/><path d="M100 15 Q115 8 130 18" fill="#08080a"/>
      <path d="M250 125 Q255 75 260 35 Q265 20 270 10 Q275 20 280 35 Q285 75 290 125" fill="#08080a"/>
      <path d="M450 130 Q455 80 460 40 Q465 25 470 15 Q475 25 480 40 Q485 80 490 130" fill="#08080a"/>
      <path d="M560 120 Q565 70 570 30 Q575 15 580 5 Q585 15 590 30 Q595 70 600 120" fill="#08080a"/>
    </g>
    <polygon points="400,0 420,0 480,400 440,400" fill="url(#den_moonbeam_grad)" opacity="0.3"/>
    <polygon points="350,0 365,0 390,400 370,400" fill="url(#den_moonbeam_grad)" opacity="0.2"/>
    <path d="M30 280 Q28 200 32 150 Q35 120 40 100 L50 100 Q48 120 45 150 Q42 200 45 280 Z" fill="#0c0c12"/>
    <path d="M40 100 Q20 85 5 95 Q15 100 30 105" fill="#0c0c12"/>
    <path d="M45 110 Q65 95 85 105 Q70 112 55 115" fill="#0c0c12"/>
    <path d="M30 280 Q15 290 5 300 Q20 295 35 290" fill="#0c0c12"/>
    <path d="M45 280 Q55 295 65 310 Q50 300 42 290" fill="#0c0c12"/>
    <path d="M100 300 Q95 220 100 170 Q105 140 110 120 L125 120 Q120 140 115 170 Q110 220 115 300 Z" fill="#0e0e15"/>
    <path d="M110 120 Q85 100 65 115 Q80 120 100 125" fill="#0e0e15"/>
    <path d="M100 300 Q80 315 60 330 Q85 320 105 310" fill="#0e0e15"/>
    <path d="M115 300 Q130 320 145 340 Q125 325 110 310" fill="#0e0e15"/>
    <path d="M500 290 Q498 210 502 160 Q505 130 510 110 L520 110 Q518 130 515 160 Q512 210 515 290 Z" fill="#0c0c12"/>
    <path d="M510 110 Q490 95 475 105 Q490 110 505 115" fill="#0c0c12"/>
    <path d="M500 290 Q485 300 470 315 Q490 305 505 298" fill="#0c0c12"/>
    <path d="M420 310 Q415 240 420 190 Q425 160 430 140 L445 140 Q440 160 435 190 Q430 240 435 310 Z" fill="#0e0e15"/>
    <path d="M420 310 Q400 325 385 345 Q410 330 425 318" fill="#0e0e15"/>
    <path d="M200 280 Q250 250 320 240 Q380 235 420 250 Q450 265 470 290 Q480 310 475 340 L200 340 Z" fill="url(#den_rock_grad)"/>
    <ellipse cx="340" cy="300" rx="70" ry="50" fill="url(#den_cave_grad)"/>
    <ellipse cx="340" cy="300" rx="65" ry="45" fill="#030305"/>
    <path d="M270 280 Q265 260 275 245 Q290 235 310 240 Q300 255 295 275 Q290 285 280 290 Z" fill="#1a1a25"/>
    <path d="M410 275 Q415 255 405 240 Q390 230 370 235 Q380 250 385 270 Q390 282 400 288 Z" fill="#1a1a25"/>
    <ellipse cx="340" cy="305" rx="55" ry="35" fill="#010102"/>
    <g filter="url(#den_eye_glow)" opacity="0.7">
      <ellipse cx="325" cy="308" rx="4" ry="3" fill="#cc1100"/>
      <ellipse cx="355" cy="308" rx="4" ry="3" fill="#cc1100"/>
    </g>
    <ellipse cx="325" cy="308" rx="2" ry="2" fill="#ff2200" opacity="0.5"/>
    <ellipse cx="355" cy="308" rx="2" ry="2" fill="#ff2200" opacity="0.5"/>
    <rect x="0" y="340" width="600" height="60" fill="url(#den_ground_grad)"/>
    <ellipse cx="300" cy="360" rx="350" ry="40" fill="url(#den_fog_grad)"/>
    <path d="M-10 380 Q20 360 50 370 Q70 375 80 365 Q60 378 30 382 Q0 385 -10 380 Z" fill="#0e0e15"/>
    <path d="M250 395 Q270 375 295 380 Q310 385 320 375 Q305 388 285 392 Q265 396 250 395 Z" fill="#0e0e15"/>
    <path d="M450 385 Q470 368 495 375 Q510 380 520 370 Q500 382 480 386 Q460 388 450 385 Z" fill="#0e0e15"/>
    <g transform="translate(80,355)">
      <ellipse cx="0" cy="0" rx="12" ry="8" fill="url(#den_bone_grad)"/>
      <ellipse cx="-4" cy="-2" rx="3" ry="2" fill="#0a0a0f"/>
      <ellipse cx="4" cy="-2" rx="3" ry="2" fill="#0a0a0f"/>
    </g>
    <g transform="translate(200,350)">
      <ellipse cx="0" cy="0" rx="15" ry="10" fill="url(#den_bone_grad)"/>
      <path d="M-10 -5 L-15 -15 L-5 -8 Z" fill="url(#den_bone_grad)"/>
      <path d="M10 -5 L15 -15 L5 -8 Z" fill="url(#den_bone_grad)"/>
      <ellipse cx="-5" cy="-2" rx="4" ry="3" fill="#0a0a0f"/>
      <ellipse cx="5" cy="-2" rx="4" ry="3" fill="#0a0a0f"/>
    </g>
    <g transform="translate(480,358)">
      <ellipse cx="0" cy="0" rx="10" ry="7" fill="url(#den_bone_grad)"/>
      <ellipse cx="-3" cy="-1" rx="2.5" ry="1.5" fill="#0a0a0f"/>
      <ellipse cx="3" cy="-1" rx="2.5" ry="1.5" fill="#0a0a0f"/>
    </g>
    <g transform="translate(60,370)">
      <ellipse cx="0" cy="0" rx="8" ry="4" fill="url(#den_leaf_grad)" transform="rotate(-15)"/>
      <ellipse cx="8" cy="3" rx="7" ry="3" fill="#1a1510" transform="rotate(20)"/>
    </g>
    <g transform="translate(520,372)">
      <ellipse cx="0" cy="0" rx="8" ry="4" fill="url(#den_leaf_grad)" transform="rotate(-20)"/>
      <ellipse cx="7" cy="4" rx="6" ry="3" fill="#1a1510" transform="rotate(15)"/>
    </g>
    <rect width="600" height="400" fill="url(#den_vignette)"/>
  </svg>`,



spider_cavern: `<svg viewBox="0 0 600 400" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cavern_bg_grad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#08080a"/><stop offset="50%" stop-color="#050508"/><stop offset="100%" stop-color="#030305"/></linearGradient>
      <linearGradient id="cavern_ceiling_grad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#0a0a0e"/><stop offset="100%" stop-color="#15151a"/></linearGradient>
      <linearGradient id="cavern_floor_grad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#121218"/><stop offset="100%" stop-color="#0a0a0e"/></linearGradient>
      <linearGradient id="cavern_stone_grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1a1a22"/><stop offset="100%" stop-color="#0f0f15"/></linearGradient>
      <radialGradient id="cavern_fungus_glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#2a8a2a" stop-opacity="0.6"/><stop offset="40%" stop-color="#1a6a1a" stop-opacity="0.3"/><stop offset="100%" stop-color="#0a3a0a" stop-opacity="0"/></radialGradient>
      <linearGradient id="cavern_drip_grad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#1a5a1a" stop-opacity="0.3"/><stop offset="100%" stop-color="#0a2a0a" stop-opacity="0"/></linearGradient>
      <linearGradient id="cavern_web_grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#c0c0c8" stop-opacity="0.4"/><stop offset="50%" stop-color="#a0a0a8" stop-opacity="0.2"/><stop offset="100%" stop-color="#808088" stop-opacity="0.1"/></linearGradient>
      <linearGradient id="cavern_cocoon_grad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#3a3a35"/><stop offset="100%" stop-color="#25252a"/></linearGradient>
      <radialGradient id="cavern_eye_glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ffaa00" stop-opacity="1"/><stop offset="40%" stop-color="#cc8800" stop-opacity="0.7"/><stop offset="100%" stop-color="#885500" stop-opacity="0"/></radialGradient>
      <radialGradient id="cavern_torch_glow" cx="50%" cy="50%" r="60%"><stop offset="0%" stop-color="#aa6600" stop-opacity="0.3"/><stop offset="100%" stop-color="#442200" stop-opacity="0"/></radialGradient>
      <radialGradient id="cavern_vignette" cx="50%" cy="50%" r="75%"><stop offset="30%" stop-color="transparent"/><stop offset="100%" stop-color="#020203" stop-opacity="0.85"/></radialGradient>
      <linearGradient id="cavern_stalactite_grad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#1a1a22"/><stop offset="100%" stop-color="#0f0f15"/></linearGradient>
      <linearGradient id="cavern_fungus_body_grad" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stop-color="#1a4a1a"/><stop offset="100%" stop-color="#0a2a0a"/></linearGradient>
    </defs>
    <rect width="600" height="400" fill="url(#cavern_bg_grad)"/>
    <path d="M0 0 L600 0 L600 80 Q550 60 500 90 Q450 70 400 100 Q350 75 300 95 Q250 65 200 85 Q150 70 100 90 Q50 60 0 80 Z" fill="url(#cavern_ceiling_grad)"/>
    <path d="M50 80 L45 140 L55 140 Z" fill="url(#cavern_stalactite_grad)"/>
    <path d="M120 90 L115 180 L125 180 Z" fill="url(#cavern_stalactite_grad)"/>
    <path d="M280 100 L272 220 L288 220 Z" fill="url(#cavern_stalactite_grad)"/>
    <path d="M350 95 L342 200 L358 200 Z" fill="url(#cavern_stalactite_grad)"/>
    <path d="M480 82 L475 145 L485 145 Z" fill="url(#cavern_stalactite_grad)"/>
    <path d="M540 92 L535 175 L545 175 Z" fill="url(#cavern_stalactite_grad)"/>
    <path d="M280 220 Q278 250 280 280" fill="none" stroke="url(#cavern_drip_grad)" stroke-width="2"/>
    <ellipse cx="280" cy="282" rx="3" ry="5" fill="#1a5a1a" opacity="0.3"/>
    <path d="M0 80 Q20 100 30 150 Q40 200 35 250 Q30 300 20 350 L0 400 L0 80" fill="url(#cavern_stone_grad)"/>
    <path d="M600 80 Q580 100 570 150 Q560 200 565 250 Q570 300 580 350 L600 400 L600 80" fill="url(#cavern_stone_grad)"/>
    <path d="M20 350 Q100 340 200 355 Q300 365 400 355 Q500 345 580 350 L600 400 L0 400 Z" fill="url(#cavern_floor_grad)"/>
    <g stroke="url(#cavern_web_grad)" fill="none" stroke-width="1">
      <line x1="100" y1="120" x2="30" y2="200"/><line x1="100" y1="120" x2="80" y2="250"/><line x1="100" y1="120" x2="150" y2="220"/><line x1="100" y1="120" x2="180" y2="150"/>
      <path d="M60 140 Q70 160 80 155 Q90 150 95 165 Q100 180 110 175" fill="none"/>
      <path d="M80 155 Q85 170 95 165 Q105 160 115 175 Q120 190 130 185" fill="none"/>
    </g>
    <g stroke="url(#cavern_web_grad)" fill="none" stroke-width="1.2">
      <line x1="300" y1="80" x2="220" y2="150"/><line x1="300" y1="80" x2="250" y2="200"/><line x1="300" y1="80" x2="350" y2="180"/><line x1="300" y1="80" x2="380" y2="130"/>
      <path d="M250 140 Q260 155 270 148 Q280 142 290 155 Q300 168 310 160 Q320 152 330 165" fill="none"/>
      <path d="M270 148 Q275 162 285 155 Q295 148 305 162 Q315 175 325 168 Q335 160 345 172" fill="none"/>
    </g>
    <g stroke="url(#cavern_web_grad)" fill="none" stroke-width="1">
      <line x1="500" y1="100" x2="450" y2="180"/><line x1="500" y1="100" x2="480" y2="220"/><line x1="500" y1="100" x2="540" y2="200"/><line x1="500" y1="100" x2="560" y2="140"/>
      <path d="M470 150 Q480 165 490 158 Q500 152 510 165" fill="none"/>
      <path d="M490 158 Q498 172 508 165 Q518 158 528 170" fill="none"/>
    </g>
    <g transform="translate(70,200)">
      <ellipse cx="0" cy="0" rx="18" ry="30" fill="url(#cavern_cocoon_grad)"/>
      <path d="M-15 -25 Q0 -35 15 -25" stroke="#4a4a45" stroke-width="1" fill="none"/>
      <path d="M-17 -15 Q0 -28 17 -15" stroke="#4a4a45" stroke-width="1" fill="none"/>
      <path d="M-18 -5 Q0 -18 18 -5" stroke="#4a4a45" stroke-width="1" fill="none"/>
      <line x1="0" y1="-30" x2="0" y2="-50" stroke="url(#cavern_web_grad)" stroke-width="1"/>
    </g>
    <g transform="translate(280,160)">
      <ellipse cx="0" cy="0" rx="22" ry="38" fill="url(#cavern_cocoon_grad)"/>
      <path d="M-18 -32 Q0 -45 18 -32" stroke="#4a4a45" stroke-width="1.2" fill="none"/>
      <path d="M-20 -20 Q0 -35 20 -20" stroke="#4a4a45" stroke-width="1.2" fill="none"/>
      <path d="M-22 -8 Q0 -22 22 -8" stroke="#4a4a45" stroke-width="1.2" fill="none"/>
      <line x1="0" y1="-38" x2="0" y2="-60" stroke="url(#cavern_web_grad)" stroke-width="1.2"/>
    </g>
    <g transform="translate(520,190)">
      <ellipse cx="0" cy="0" rx="16" ry="28" fill="url(#cavern_cocoon_grad)"/>
      <path d="M-13 -23 Q0 -32 13 -23" stroke="#4a4a45" stroke-width="1" fill="none"/>
      <path d="M-15 -12 Q0 -22 15 -12" stroke="#4a4a45" stroke-width="1" fill="none"/>
      <line x1="0" y1="-28" x2="0" y2="-45" stroke="url(#cavern_web_grad)" stroke-width="1"/>
    </g>
    <g transform="translate(80,350)">
      <ellipse cx="0" cy="5" rx="25" ry="15" fill="url(#cavern_fungus_glow)"/>
      <path d="M-15 5 Q-18 -10 -12 -20 Q-8 -25 -5 -20 Q-2 -10 -5 5 Z" fill="url(#cavern_fungus_body_grad)"/>
      <path d="M-5 5 Q-8 -15 -2 -28 Q3 -35 8 -28 Q12 -15 8 5 Z" fill="url(#cavern_fungus_body_grad)"/>
      <path d="M8 5 Q5 -8 10 -18 Q15 -22 18 -18 Q20 -8 16 5 Z" fill="url(#cavern_fungus_body_grad)"/>
      <ellipse cx="-8" cy="-22" rx="3" ry="2" fill="#3a9a3a" opacity="0.6"/>
      <ellipse cx="3" cy="-32" rx="3" ry="2" fill="#3a9a3a" opacity="0.6"/>
    </g>
    <g transform="translate(320,355)">
      <ellipse cx="0" cy="5" rx="35" ry="18" fill="url(#cavern_fungus_glow)"/>
      <path d="M-25 5 Q-28 -12 -20 -25 Q-15 -30 -8 -25 Q-3 -12 -5 5 Z" fill="url(#cavern_fungus_body_grad)"/>
      <path d="M-10 5 Q-15 -18 -8 -32 Q-2 -40 5 -32 Q10 -18 8 5 Z" fill="url(#cavern_fungus_body_grad)"/>
      <path d="M8 5 Q5 -12 12 -22 Q18 -28 24 -22 Q28 -12 22 5 Z" fill="url(#cavern_fungus_body_grad)"/>
      <ellipse cx="-14" cy="-27" rx="4" ry="3" fill="#3a9a3a" opacity="0.7"/>
      <ellipse cx="-1" cy="-36" rx="4" ry="3" fill="#3a9a3a" opacity="0.7"/>
    </g>
    <g transform="translate(480,348)">
      <ellipse cx="0" cy="5" rx="28" ry="14" fill="url(#cavern_fungus_glow)"/>
      <path d="M-18 5 Q-20 -10 -15 -20 Q-10 -25 -5 -20 Q0 -10 0 5 Z" fill="url(#cavern_fungus_body_grad)"/>
      <path d="M-2 5 Q-5 -12 0 -22 Q5 -28 10 -22 Q14 -12 10 5 Z" fill="url(#cavern_fungus_body_grad)"/>
      <ellipse cx="-10" cy="-22" rx="3" ry="2" fill="#3a9a3a" opacity="0.6"/>
      <ellipse cx="3" cy="-25" rx="3" ry="2.5" fill="#3a9a3a" opacity="0.6"/>
    </g>
    <g filter="url(#cavern_eye_glow)" opacity="0.8">
      <ellipse cx="35" cy="280" rx="4" ry="3" fill="#cc8800"/>
      <ellipse cx="50" cy="275" rx="4" ry="3" fill="#cc8800"/>
    </g>
    <g filter="url(#cavern_eye_glow)" opacity="0.7">
      <ellipse cx="200" cy="120" rx="5" ry="4" fill="#cc8800"/>
      <ellipse cx="218" cy="115" rx="5" ry="4" fill="#cc8800"/>
      <ellipse cx="185" cy="128" rx="4" ry="3" fill="#cc8800"/>
    </g>
    <g filter="url(#cavern_eye_glow)" opacity="0.75">
      <ellipse cx="555" cy="260" rx="4" ry="3" fill="#cc8800"/>
      <ellipse cx="570" cy="255" rx="5" ry="4" fill="#cc8800"/>
    </g>
    <ellipse cx="500" cy="320" rx="80" ry="60" fill="url(#cavern_torch_glow)"/>
    <path d="M90 355 Q85 320 90 300 Q95 290 100 300 Q105 320 100 355 Z" fill="#15151a"/>
    <path d="M350 350 Q342 300 350 270 Q358 255 366 270 Q374 300 366 350 Z" fill="#15151a"/>
    <path d="M530 360 Q527 340 530 325 Q533 318 536 325 Q539 340 536 360 Z" fill="#15151a"/>
    <ellipse cx="150" cy="375" rx="20" ry="8" fill="#121218"/>
    <ellipse cx="400" cy="380" rx="25" ry="10" fill="#121218"/>
    <rect width="600" height="400" fill="url(#cavern_vignette)"/>
  </svg>`,

   goblin_warren: `<svg viewBox="0 0 600 400" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="gw_torchGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ff8c1a" stop-opacity="0.6"/><stop offset="60%" stop-color="#ff5500" stop-opacity="0.15"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient>
    <radialGradient id="gw_fireGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ff6600" stop-opacity="0.7"/><stop offset="40%" stop-color="#cc3300" stop-opacity="0.3"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient>
    <pattern id="gw_stonePattern" x="0" y="0" width="40" height="30" patternUnits="userSpaceOnUse"><rect width="40" height="30" fill="#3a3530"/><path d="M0 15 L20 0 L40 15 L20 30 Z" fill="#2e2a25" opacity="0.5"/></pattern>
    <pattern id="gw_woodGrain" x="0" y="0" width="20" height="60" patternUnits="userSpaceOnUse"><rect width="20" height="60" fill="#5c3a1e"/><line x1="0" y1="10" x2="20" y2="10" stroke="#4a2e16" stroke-width="1" opacity="0.5"/><line x1="0" y1="30" x2="20" y2="30" stroke="#4a2e16" stroke-width="1.5" opacity="0.4"/></pattern>
    <radialGradient id="gw_vignette" cx="50%" cy="55%" r="60%"><stop offset="0%" stop-color="#000" stop-opacity="0"/><stop offset="70%" stop-color="#000" stop-opacity="0.15"/><stop offset="100%" stop-color="#000" stop-opacity="0.5"/></radialGradient>
  </defs>
  <rect x="0" y="0" width="600" height="400" fill="url(#gw_stonePattern)"/>
  <path d="M0 0 L600 0 L600 60 Q550 40 500 55 Q450 30 400 50 Q350 25 300 45 Q250 20 200 40 Q150 15 100 35 Q50 10 0 30 Z" fill="#2a2520" opacity="0.9"/>
  <polygon points="80,60 85,110 90,60" fill="#2e2a25"/>
  <polygon points="200,50 207,100 214,50" fill="#2e2a25"/>
  <polygon points="350,55 360,115 370,55" fill="#2e2a25"/>
  <polygon points="480,48 488,95 496,48" fill="#2e2a25"/>
  <rect x="0" y="320" width="600" height="80" fill="#2a2520"/>
  <rect x="0" y="320" width="600" height="5" fill="#3a3530"/>
  <g opacity="0.7">
    <line x1="100" y1="340" x2="120" y2="335" stroke="#c8b89a" stroke-width="3" stroke-linecap="round"/>
    <circle cx="98" cy="341" r="3" fill="#c8b89a"/><circle cx="122" cy="334" r="3" fill="#c8b89a"/>
    <ellipse cx="250" cy="345" rx="8" ry="6" fill="#d4c4a4"/>
    <circle cx="247" cy="343" r="2" fill="#1a1208"/><circle cx="253" cy="343" r="2" fill="#1a1208"/>
    <line x1="448" y1="346" x2="472" y2="339" stroke="#c8b89a" stroke-width="3" stroke-linecap="round"/>
    <circle cx="448" cy="346" r="3" fill="#c8b89a"/><circle cx="472" cy="339" r="3" fill="#c8b89a"/>
  </g>
  <g>
    <rect x="20" y="200" width="160" height="12" fill="url(#gw_woodGrain)" rx="2"/>
    <rect x="20" y="260" width="160" height="12" fill="url(#gw_woodGrain)" rx="2"/>
    <rect x="30" y="170" width="14" height="120" fill="#5c3a1e" rx="2"/>
    <rect x="90" y="165" width="14" height="125" fill="#5c3a1e" rx="2"/>
    <rect x="150" y="170" width="14" height="120" fill="#5c3a1e" rx="2"/>
    <polygon points="30,170 37,150 44,170" fill="#5c3a1e"/>
    <polygon points="90,165 97,145 104,165" fill="#5c3a1e"/>
    <polygon points="150,170 157,150 164,170" fill="#5c3a1e"/>
  </g>
  <g>
    <rect x="420" y="190" width="160" height="12" fill="url(#gw_woodGrain)" rx="2"/>
    <rect x="420" y="250" width="160" height="12" fill="url(#gw_woodGrain)" rx="2"/>
    <rect x="430" y="160" width="14" height="120" fill="#5c3a1e" rx="2"/>
    <rect x="490" y="155" width="14" height="125" fill="#5c3a1e" rx="2"/>
    <rect x="550" y="160" width="14" height="120" fill="#5c3a1e" rx="2"/>
    <polygon points="430,160 437,140 444,160" fill="#5c3a1e"/>
    <polygon points="490,155 497,135 504,155" fill="#5c3a1e"/>
    <polygon points="550,160 557,140 564,160" fill="#5c3a1e"/>
  </g>
  <g>
    <rect x="195" y="130" width="6" height="30" fill="#555" rx="1"/>
    <rect x="190" y="128" width="16" height="6" fill="#666" rx="2"/>
    <rect x="196" y="100" width="4" height="30" fill="#4a2e16" rx="1"/>
    <ellipse cx="198" cy="92" rx="8" ry="14" fill="#ff6600" opacity="0.9"/>
    <ellipse cx="198" cy="88" rx="5" ry="10" fill="#ffaa00" opacity="0.8"/>
    <ellipse cx="198" cy="85" rx="3" ry="6" fill="#ffdd44" opacity="0.7"/>
    <circle cx="198" cy="95" r="50" fill="url(#gw_torchGlow)"/>
  </g>
  <g>
    <rect x="398" y="125" width="6" height="30" fill="#555" rx="1"/>
    <rect x="393" y="123" width="16" height="6" fill="#666" rx="2"/>
    <rect x="399" y="95" width="4" height="30" fill="#4a2e16" rx="1"/>
    <ellipse cx="401" cy="87" rx="8" ry="14" fill="#ff6600" opacity="0.9"/>
    <ellipse cx="401" cy="83" rx="5" ry="10" fill="#ffaa00" opacity="0.8"/>
    <circle cx="401" cy="90" r="50" fill="url(#gw_torchGlow)"/>
  </g>
  <g>
    <rect x="130" y="70" width="4" height="100" fill="#4a2e16"/>
    <path d="M134 75 L134 140 L170 130 L170 85 Z" fill="#5a2020" opacity="0.85"/>
    <circle cx="148" cy="102" r="2.5" fill="#2a1010"/><circle cx="156" cy="102" r="2.5" fill="#2a1010"/>
  </g>
  <g>
    <rect x="466" y="65" width="4" height="105" fill="#4a2e16"/>
    <path d="M470 70 L470 140 L506 128 L506 82 Z" fill="#3a1a3a" opacity="0.85"/>
  </g>
  <g>
    <ellipse cx="300" cy="310" rx="70" ry="18" fill="#4a4540"/>
    <ellipse cx="300" cy="306" rx="58" ry="12" fill="#1a1510"/>
    <ellipse cx="300" cy="310" rx="80" ry="25" fill="url(#gw_fireGlow)"/>
    <line x1="270" y1="305" x2="330" y2="300" stroke="#3a2010" stroke-width="5" stroke-linecap="round"/>
    <path d="M280 300 Q285 270 295 290 Q300 260 305 285 Q310 255 315 280 Q320 265 325 295 Q330 275 335 300 Z" fill="#ff4400" opacity="0.9"/>
    <path d="M285 300 Q290 278 298 292 Q302 272 308 288 Q312 275 318 295 Q322 280 328 300 Z" fill="#ff7700" opacity="0.85"/>
    <path d="M295 300 Q298 290 300 296 Q303 288 305 300 Z" fill="#ffdd44" opacity="0.7"/>
    <circle cx="290" cy="275" r="1.5" fill="#ffaa00" opacity="0.8"/>
    <circle cx="310" cy="270" r="1" fill="#ffdd44" opacity="0.7"/>
  </g>
  <g>
    <rect x="50" y="280" width="40" height="50" fill="#5c3a1e" rx="5"/>
    <rect x="48" y="285" width="44" height="5" fill="#4a2e16" rx="1"/>
    <rect x="48" y="310" width="44" height="5" fill="#4a2e16" rx="1"/>
  </g>
  <g>
    <rect x="510" y="270" width="45" height="40" fill="url(#gw_woodGrain)" rx="2"/>
    <rect x="520" y="240" width="35" height="30" fill="url(#gw_woodGrain)" rx="2"/>
  </g>
  <rect x="0" y="0" width="600" height="400" fill="url(#gw_vignette)"/>
  <ellipse cx="200" cy="60" rx="80" ry="15" fill="#2a2015" opacity="0.15"/>
  <ellipse cx="400" cy="55" rx="70" ry="12" fill="#2a2015" opacity="0.12"/>
  </svg>`,
  skeleton_crypt: `<svg viewBox="0 0 600 400" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="sc_deathGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#4488cc" stop-opacity="0.5"/><stop offset="40%" stop-color="#2266aa" stop-opacity="0.2"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient>
    <radialGradient id="sc_candleGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ffdd88" stop-opacity="0.4"/><stop offset="50%" stop-color="#ccaa44" stop-opacity="0.1"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient>
    <pattern id="sc_cryptStone" x="0" y="0" width="50" height="35" patternUnits="userSpaceOnUse"><rect width="50" height="35" fill="#2a2d32"/><rect x="1" y="1" width="23" height="16" fill="#323640" rx="1"/><rect x="26" y="1" width="23" height="16" fill="#2e3138" rx="1"/><rect x="1" y="18" width="23" height="16" fill="#2e3138" rx="1"/><rect x="26" y="18" width="23" height="16" fill="#323640" rx="1"/></pattern>
    <pattern id="sc_floorStone" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse"><rect width="60" height="40" fill="#1e2028"/><rect x="2" y="2" width="56" height="36" fill="#252830" rx="1"/><line x1="0" y1="20" x2="60" y2="20" stroke="#1a1c22" stroke-width="1"/><line x1="30" y1="0" x2="30" y2="40" stroke="#1a1c22" stroke-width="1"/></pattern>
    <radialGradient id="sc_vignette" cx="50%" cy="50%" r="65%"><stop offset="0%" stop-color="#000" stop-opacity="0"/><stop offset="60%" stop-color="#000" stop-opacity="0.1"/><stop offset="100%" stop-color="#000" stop-opacity="0.55"/></radialGradient>
  </defs>
  <rect x="0" y="0" width="600" height="400" fill="url(#sc_cryptStone)"/>
  <rect x="0" y="0" width="600" height="50" fill="#1a1c22"/>
  <path d="M0 50 L600 50 L600 45 Q500 35 400 42 Q300 30 200 40 Q100 28 0 38 Z" fill="#1e2028"/>
  <rect x="0" y="310" width="600" height="90" fill="url(#sc_floorStone)"/>
  <rect x="0" y="308" width="600" height="4" fill="#2a2d35"/>
  <g>
    <rect x="230" y="60" width="140" height="250" fill="#1a1c22" rx="3"/>
    <rect x="225" y="55" width="150" height="10" fill="#3a3d45" rx="2"/>
    <path d="M225 60 Q225 20 300 10 Q375 20 375 60" fill="#1a1c22"/>
    <path d="M230 58 Q230 25 300 15 Q370 25 370 58" fill="#252830"/>
    <rect x="235" y="65" width="130" height="240" fill="#1a3355" opacity="0.3"/>
    <ellipse cx="300" cy="180" rx="100" ry="160" fill="url(#sc_deathGlow)"/>
    <g stroke="#4488cc" stroke-width="1.5" opacity="0.5" fill="none">
      <path d="M235 100 L245 90 L255 100 L245 110 Z"/><circle cx="245" cy="100" r="3"/>
      <path d="M355 100 L365 90 L375 100 L365 110 Z"/><circle cx="365" cy="100" r="3"/>
      <path d="M235 200 L245 190 L255 200 L245 210 Z"/><circle cx="245" cy="200" r="3"/>
      <path d="M355 200 L365 190 L375 200 L365 210 Z"/><circle cx="365" cy="200" r="3"/>
    </g>
    <line x1="300" y1="65" x2="300" y2="305" stroke="#0e1015" stroke-width="2" opacity="0.5"/>
    <circle cx="285" cy="180" r="6" fill="none" stroke="#4a4d55" stroke-width="2"/>
    <circle cx="315" cy="180" r="6" fill="none" stroke="#4a4d55" stroke-width="2"/>
  </g>
  <g>
    <rect x="30" y="230" width="120" height="80" fill="#3a3d45" rx="3"/>
    <rect x="35" y="235" width="110" height="70" fill="#323640" rx="2"/>
    <path d="M25 230 Q25 210 90 205 Q155 210 155 230" fill="#404450"/>
    <path d="M30 230 Q30 215 90 210 Q150 215 150 230" fill="#3a3d45"/>
    <path d="M70 210 L75 230 L72 250" fill="none" stroke="#1a1c22" stroke-width="1" opacity="0.5"/>
    <line x1="158" y1="245" x2="175" y2="250" stroke="#c8c0b0" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="156" cy="244" r="2.5" fill="#c8c0b0"/><circle cx="177" cy="251" r="2.5" fill="#c8c0b0"/>
    <ellipse cx="172" cy="265" rx="5" ry="3" fill="#c8c0b0" opacity="0.7"/>
  </g>
  <g>
    <rect x="450" y="220" width="120" height="85" fill="#3a3d45" rx="3"/>
    <rect x="455" y="225" width="110" height="75" fill="#323640" rx="2"/>
    <path d="M445 220 Q445 198 510 192 Q575 198 575 220" fill="#404450"/>
    <path d="M450 220 Q450 203 510 197 Q570 203 570 220" fill="#3a3d45"/>
    <line x1="575" y1="228" x2="590" y2="235" stroke="#c8c0b0" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="573" cy="227" r="2.5" fill="#c8c0b0"/><circle cx="592" cy="236" r="2.5" fill="#c8c0b0"/>
    <ellipse cx="588" cy="255" rx="6" ry="5" fill="#d0c8b8"/>
    <circle cx="586" cy="253" r="1.8" fill="#1a1c22"/><circle cx="591" cy="253" r="1.8" fill="#1a1c22"/>
  </g>
  <g>
    <rect x="60" y="50" width="35" height="260" fill="#3a3d45"/>
    <rect x="55" y="45" width="45" height="12" fill="#404450" rx="2"/>
    <rect x="55" y="305" width="45" height="12" fill="#404450" rx="2"/>
    <path d="M75 120 L78 160 L75 200" fill="none" stroke="#1a1c22" stroke-width="0.8" opacity="0.4"/>
  </g>
  <g>
    <rect x="505" y="50" width="35" height="260" fill="#3a3d45"/>
    <rect x="500" y="45" width="45" height="12" fill="#404450" rx="2"/>
    <rect x="500" y="305" width="45" height="12" fill="#404450" rx="2"/>
    <path d="M520 100 L523 150 L520 190" fill="none" stroke="#1a1c22" stroke-width="0.8" opacity="0.4"/>
  </g>
  <g>
    <ellipse cx="45" cy="308" rx="10" ry="4" fill="#8a7a50" opacity="0.5"/>
    <rect x="42" y="295" width="6" height="13" fill="#d4c8a0" rx="1"/>
    <ellipse cx="45" cy="291" rx="2.5" ry="5" fill="#ffdd88" opacity="0.8"/>
    <ellipse cx="45" cy="290" rx="1.5" ry="3" fill="#fff8e0" opacity="0.6"/>
    <circle cx="45" cy="293" r="20" fill="url(#sc_candleGlow)"/>
  </g>
  <g>
    <ellipse cx="560" cy="308" rx="8" ry="3" fill="#8a7a50" opacity="0.5"/>
    <rect x="557" y="298" width="6" height="10" fill="#d4c8a0" rx="1"/>
    <ellipse cx="560" cy="295" rx="2" ry="4" fill="#ffdd88" opacity="0.7"/>
    <circle cx="560" cy="296" r="18" fill="url(#sc_candleGlow)"/>
  </g>
  <g>
    <circle cx="280" cy="120" r="1.5" fill="#4488cc" opacity="0.4"><animate attributeName="cy" values="120;100;120" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0.7;0.4" dur="3s" repeatCount="indefinite"/></circle>
    <circle cx="320" cy="150" r="1" fill="#66aadd" opacity="0.3"><animate attributeName="cy" values="150;130;150" dur="4s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.3;0.6;0.3" dur="4s" repeatCount="indefinite"/></circle>
    <circle cx="290" cy="200" r="1.2" fill="#4488cc" opacity="0.35"><animate attributeName="cy" values="200;175;200" dur="3.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.35;0.65;0.35" dur="3.5s" repeatCount="indefinite"/></circle>
    <circle cx="310" cy="240" r="1" fill="#66aadd" opacity="0.3"><animate attributeName="cy" values="240;220;240" dur="4.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.3;0.55;0.3" dur="4.5s" repeatCount="indefinite"/></circle>
  </g>
  <g opacity="0.6">
    <line x1="320" y1="320" x2="335" y2="318" stroke="#c8c0b0" stroke-width="2" stroke-linecap="round"/>
    <circle cx="318" cy="321" r="2" fill="#c8c0b0"/><circle cx="337" cy="317" r="2" fill="#c8c0b0"/>
    <line x1="170" y1="315" x2="182" y2="312" stroke="#c8c0b0" stroke-width="2" stroke-linecap="round"/>
    <circle cx="168" cy="316" r="2" fill="#c8c0b0"/><circle cx="184" cy="311" r="2" fill="#c8c0b0"/>
    <line x1="430" y1="320" x2="445" y2="318" stroke="#b8b0a0" stroke-width="2" stroke-linecap="round"/>
    <circle cx="428" cy="321" r="2" fill="#b8b0a0"/><circle cx="447" cy="317" r="2" fill="#b8b0a0"/>
  </g>
  <rect x="0" y="0" width="600" height="400" fill="url(#sc_vignette)"/>
  <ellipse cx="200" cy="315" rx="120" ry="12" fill="#1a2030" opacity="0.12"/>
  <ellipse cx="400" cy="318" rx="100" ry="10" fill="#1a2030" opacity="0.1"/>
  </svg>`,

  orc_stronghold: `<svg viewBox="0 0 600 400" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="os_fire" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ff6600" stop-opacity="0.8"/><stop offset="30%" stop-color="#cc3300" stop-opacity="0.4"/><stop offset="70%" stop-color="#661100" stop-opacity="0.1"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient>
    <radialGradient id="os_smoke" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#333" stop-opacity="0.15"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient>
    <radialGradient id="os_torch" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ff7700" stop-opacity="0.5"/><stop offset="50%" stop-color="#aa4400" stop-opacity="0.12"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient>
    <pattern id="os_stone" x="0" y="0" width="60" height="40" patternUnits="userSpaceOnUse"><rect width="60" height="40" fill="#2a2522"/><rect x="2" y="2" width="27" height="17" fill="#332e2a" rx="1"/><rect x="31" y="2" width="27" height="17" fill="#2e2926" rx="1"/><rect x="2" y="21" width="27" height="17" fill="#2e2926" rx="1"/><rect x="31" y="21" width="27" height="17" fill="#332e2a" rx="1"/></pattern>
    <pattern id="os_floor" x="0" y="0" width="80" height="50" patternUnits="userSpaceOnUse"><rect width="80" height="50" fill="#1e1a18"/><rect x="2" y="2" width="76" height="46" fill="#252220" rx="1"/><line x1="0" y1="25" x2="80" y2="25" stroke="#181514" stroke-width="1.5"/><line x1="40" y1="0" x2="40" y2="50" stroke="#181514" stroke-width="1.5"/></pattern>
    <radialGradient id="os_vignette" cx="50%" cy="50%" r="65%"><stop offset="0%" stop-color="#000" stop-opacity="0"/><stop offset="55%" stop-color="#000" stop-opacity="0.08"/><stop offset="100%" stop-color="#000" stop-opacity="0.5"/></radialGradient>
  </defs>
  <rect x="0" y="0" width="600" height="400" fill="url(#os_stone)"/>
  <rect x="0" y="0" width="600" height="35" fill="#1a1614"/>
  <rect x="0" y="38" width="600" height="12" fill="#2a2522"/>
  <rect x="50" y="38" width="15" height="50" fill="#1e1a18"/>
  <rect x="200" y="38" width="15" height="50" fill="#1e1a18"/>
  <rect x="350" y="38" width="15" height="50" fill="#1e1a18"/>
  <rect x="500" y="38" width="15" height="50" fill="#1e1a18"/>
  <rect x="0" y="70" width="600" height="8" fill="#252220"/>
  <g stroke="#555" stroke-width="2" fill="none" opacity="0.5">
    <path d="M80 48 Q82 65 78 80 Q74 95 80 110"/>
    <path d="M520 50 Q518 68 522 82 Q526 98 520 112"/>
    <path d="M170 48 Q172 60 168 75 Q164 88 170 100"/>
    <path d="M430 48 Q428 62 432 78 Q436 92 430 105"/>
  </g>
  <g opacity="0.45">
    <rect x="165" y="95" width="10" height="8" fill="#444" rx="2"/>
    <path d="M165 103 Q160 115 168 120 Q175 115 175 103" fill="none" stroke="#444" stroke-width="3"/>
    <rect x="425" y="92" width="10" height="8" fill="#444" rx="2"/>
    <path d="M425 100 Q420 112 428 117 Q435 112 435 100" fill="none" stroke="#444" stroke-width="3"/>
    <rect x="295" y="100" width="10" height="8" fill="#444" rx="2"/>
    <path d="M295 108 Q290 120 300 125 Q310 120 305 108" fill="none" stroke="#444" stroke-width="3"/>
  </g>
  <rect x="0" y="300" width="600" height="100" fill="url(#os_floor)"/>
  <rect x="0" y="298" width="600" height="4" fill="#332e2a"/>
  <ellipse cx="150" cy="340" rx="25" ry="12" fill="#151010" opacity="0.6"/>
  <ellipse cx="400" cy="350" rx="30" ry="15" fill="#151010" opacity="0.5"/>
  <g>
    <rect x="118" y="70" width="4" height="14" fill="#333"/>
    <path d="M122 74 L122 150 L180 140 L180 84 Z" fill="#8a1a1a" opacity="0.9"/>
    <g stroke="#440808" stroke-width="3" fill="none" opacity="0.7">
      <path d="M138 100 L145 120 L152 100"/>
      <path d="M155 100 L162 120 L169 100"/>
    </g>
    <path d="M122 150 L127 156 L122 162 L128 168" fill="#8a1a1a" opacity="0.7"/>
  </g>
  <g>
    <rect x="478" y="68" width="4" height="16" fill="#333"/>
    <path d="M482 72 L482 155 L545 144 L545 82 Z" fill="#6a1515" opacity="0.85"/>
    <path d="M482 155 L487 162 L482 168 L488 174" fill="#6a1515" opacity="0.6"/>
  </g>
  <g>
    <line x1="300" y1="35" x2="300" y2="55" stroke="#333" stroke-width="3"/>
    <path d="M270 58 L270 165 L330 155 L330 65 Z" fill="#5a1212" opacity="0.8"/>
    <ellipse cx="300" cy="100" rx="18" ry="15" fill="none" stroke="#220404" stroke-width="3" opacity="0.6"/>
    <circle cx="294" cy="96" r="4" fill="#220404" opacity="0.5"/>
    <circle cx="306" cy="96" r="4" fill="#220404" opacity="0.5"/>
    <path d="M270 165 L276 172 L270 178 L276 185" fill="#5a1212" opacity="0.5"/>
  </g>
  <rect x="0" y="80" width="8" height="220" fill="#4a4a4a" opacity="0.5"/>
  <rect x="592" y="75" width="8" height="225" fill="#4a4a4a" opacity="0.5"/>
  <g>
    <ellipse cx="300" cy="280" rx="80" ry="22" fill="#3a3532"/>
    <ellipse cx="300" cy="275" rx="68" ry="16" fill="#1a1512"/>
    <ellipse cx="300" cy="280" rx="100" ry="30" fill="url(#os_fire)"/>
    <line x1="245" y1="275" x2="355" y2="270" stroke="#2a1a0a" stroke-width="6" stroke-linecap="round"/>
    <line x1="275" y1="270" x2="325" y2="285" stroke="#2a1a0a" stroke-width="4" stroke-linecap="round"/>
    <path d="M260 272 Q265 220 280 250 Q290 200 300 240 Q310 195 320 245 Q330 210 340 255 Q345 225 355 272 Z" fill="#ff4400" opacity="0.9"/>
    <path d="M268 272 Q275 230 288 255 Q295 215 305 248 Q315 208 325 242 Q333 220 342 260 Z" fill="#ff6600" opacity="0.85"/>
    <path d="M285 272 Q290 250 298 262 Q304 245 312 260 Q318 250 325 272 Z" fill="#ffaa00" opacity="0.75"/>
    <path d="M293 272 Q296 258 300 265 Q304 255 307 272 Z" fill="#ffcc44" opacity="0.65"/>
    <circle cx="275" cy="230" r="2" fill="#ff6600" opacity="0.7"><animate attributeName="cy" values="230;200;170" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.7;0.3;0" dur="2s" repeatCount="indefinite"/></circle>
    <circle cx="310" cy="225" r="1.5" fill="#ff8800" opacity="0.6"><animate attributeName="cy" values="225;195;165" dur="2.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.6;0.25;0" dur="2.5s" repeatCount="indefinite"/></circle>
    <circle cx="295" cy="220" r="2" fill="#ffaa00" opacity="0.5"><animate attributeName="cy" values="220;190;160" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.5;0.2;0" dur="3s" repeatCount="indefinite"/></circle>
  </g>
  <g opacity="0.08">
    <ellipse cx="290" cy="180" rx="30" ry="15" fill="#444"/>
    <ellipse cx="310" cy="150" rx="25" ry="12" fill="#444"/>
    <ellipse cx="295" cy="120" rx="20" ry="10" fill="#333"/>
    <ellipse cx="302" cy="58" rx="20" ry="8" fill="#222"/>
  </g>
  <ellipse cx="300" cy="50" rx="200" ry="25" fill="url(#os_smoke)"/>
  <g>
    <rect x="5" y="130" width="12" height="6" fill="#555" rx="2"/>
    <rect x="8" y="110" width="4" height="20" fill="#3a3020"/>
    <ellipse cx="10" cy="103" rx="7" ry="12" fill="#ff5500" opacity="0.85"/>
    <ellipse cx="10" cy="98" rx="2.5" ry="5" fill="#ffbb44" opacity="0.6"/>
    <circle cx="10" cy="105" r="30" fill="url(#os_torch)"/>
  </g>
  <g>
    <rect x="5" y="230" width="12" height="6" fill="#555" rx="2"/>
    <rect x="8" y="210" width="4" height="20" fill="#3a3020"/>
    <ellipse cx="10" cy="203" rx="6" ry="10" fill="#ff5500" opacity="0.8"/>
    <circle cx="10" cy="205" r="25" fill="url(#os_torch)"/>
  </g>
  <g>
    <rect x="583" y="125" width="12" height="6" fill="#555" rx="2"/>
    <rect x="586" y="105" width="4" height="20" fill="#3a3020"/>
    <ellipse cx="588" cy="98" rx="7" ry="12" fill="#ff5500" opacity="0.85"/>
    <ellipse cx="588" cy="93" rx="2.5" ry="5" fill="#ffbb44" opacity="0.6"/>
    <circle cx="588" cy="100" r="30" fill="url(#os_torch)"/>
  </g>
  <g>
    <rect x="583" y="225" width="12" height="6" fill="#555" rx="2"/>
    <rect x="586" y="205" width="4" height="20" fill="#3a3020"/>
    <ellipse cx="588" cy="198" rx="6" ry="10" fill="#ff5500" opacity="0.8"/>
    <circle cx="588" cy="200" r="25" fill="url(#os_torch)"/>
  </g>
  <rect x="0" y="0" width="600" height="400" fill="url(#os_vignette)"/>
  </svg>`,

  vampire_castle: `<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Moonlight through window -->
    <linearGradient id="moonlight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#4466aa" stop-opacity="0.35"/>
      <stop offset="50%" stop-color="#334488" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#223366" stop-opacity="0.05"/>
    </linearGradient>
    <!-- Candle glow -->
    <radialGradient id="candleGlowVamp" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffcc66" stop-opacity="0.35"/>
      <stop offset="40%" stop-color="#cc9933" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <!-- Floor marble -->
    <pattern id="marbleFloor" x="0" y="0" width="80" height="50" patternUnits="userSpaceOnUse">
      <rect width="80" height="50" fill="#1a1520"/>
      <rect x="2" y="2" width="76" height="46" fill="#1e1828" rx="1"/>
      <path d="M10 10 Q30 5 50 12 Q70 18 60 30 Q40 35 20 28 Z" fill="#221a30" opacity="0.3"/>
      <path d="M0 25 Q20 20 40 28 Q55 32 40 40" fill="none" stroke="#251d35" stroke-width="0.5" opacity="0.3"/>
    </pattern>
    <!-- Wall stone -->
    <pattern id="castleWall" x="0" y="0" width="50" height="35" patternUnits="userSpaceOnUse">
      <rect width="50" height="35" fill="#1a1520"/>
      <rect x="1" y="1" width="23" height="16" fill="#1e1828" rx="1"/>
      <rect x="26" y="1" width="23" height="16" fill="#1c1626" rx="1"/>
      <rect x="1" y="18" width="23" height="16" fill="#1c1626" rx="1"/>
      <rect x="26" y="18" width="23" height="16" fill="#1e1828" rx="1"/>
    </pattern>
    <!-- Gold trim gradient -->
    <linearGradient id="goldTrim" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8a7020"/>
      <stop offset="30%" stop-color="#c8a840"/>
      <stop offset="50%" stop-color="#e8d060"/>
      <stop offset="70%" stop-color="#c8a840"/>
      <stop offset="100%" stop-color="#8a7020"/>
    </linearGradient>
    <!-- Stained glass gradient -->
    <linearGradient id="glassPurple" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#6633aa" stop-opacity="0.6"/>
      <stop offset="50%" stop-color="#4422aa" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#331188" stop-opacity="0.4"/>
    </linearGradient>
    <linearGradient id="glassBlue" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3366cc" stop-opacity="0.5"/>
      <stop offset="50%" stop-color="#2244aa" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#113388" stop-opacity="0.3"/>
    </linearGradient>
    <linearGradient id="glassRed" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#882244" stop-opacity="0.5"/>
      <stop offset="50%" stop-color="#661133" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#440822" stop-opacity="0.3"/>
    </linearGradient>
    <!-- Moon glow -->
    <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#aabbee" stop-opacity="0.3"/>
      <stop offset="50%" stop-color="#6677aa" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background wall -->
  <rect x="0" y="0" width="600" height="400" fill="url(#castleWall)"/>

  <!-- === STAINED GLASS WINDOWS === -->
  <!-- Left window -->
  <g>
    <!-- Window frame -->
    <rect x="30" y="30" width="100" height="200" fill="#0e0a14" rx="3"/>
    <path d="M30 30 Q30 5 80 0 Q130 5 130 30" fill="#0e0a14"/>
    <!-- Gold trim frame -->
    <rect x="28" y="28" width="4" height="204" fill="url(#goldTrim)"/>
    <rect x="128" y="28" width="4" height="204" fill="url(#goldTrim)"/>
    <path d="M28 30 Q28 3 80 -2 Q132 3 132 30" fill="none" stroke="url(#goldTrim)" stroke-width="4"/>
    <!-- Glass panels -->
    <rect x="36" y="36" width="40" height="90" fill="url(#glassPurple)" rx="1"/>
    <rect x="80" y="36" width="44" height="90" fill="url(#glassBlue)" rx="1"/>
    <rect x="36" y="130" width="40" height="90" fill="url(#glassRed)" rx="1"/>
    <rect x="80" y="130" width="44" height="90" fill="url(#glassPurple)" rx="1"/>
    <!-- Lead lines -->
    <line x1="78" y1="36" x2="78" y2="220" stroke="#1a1520" stroke-width="2"/>
    <line x1="36" y1="128" x2="124" y2="128" stroke="#1a1520" stroke-width="2"/>
    <!-- Arch divider -->
    <path d="M36 36 Q36 10 80 5 Q124 10 124 36" fill="none" stroke="#1a1520" stroke-width="2"/>
    <!-- Moonlight beam from window -->
    <path d="M36 36 L10 300 L150 300 L124 36 Z" fill="url(#moonlight)" opacity="0.5"/>
    <!-- Moon visible through window -->
    <circle cx="80" cy="55" r="12" fill="#dde4ff" opacity="0.25"/>
    <circle cx="80" cy="55" r="18" fill="url(#moonGlow)"/>
  </g>

  <!-- Right window -->
  <g>
    <rect x="470" y="30" width="100" height="200" fill="#0e0a14" rx="3"/>
    <path d="M470 30 Q470 5 520 0 Q570 5 570 30" fill="#0e0a14"/>
    <rect x="468" y="28" width="4" height="204" fill="url(#goldTrim)"/>
    <rect x="568" y="28" width="4" height="204" fill="url(#goldTrim)"/>
    <path d="M468 30 Q468 3 520 -2 Q572 3 572 30" fill="none" stroke="url(#goldTrim)" stroke-width="4"/>
    <rect x="476" y="36" width="44" height="90" fill="url(#glassBlue)" rx="1"/>
    <rect x="524" y="36" width="40" height="90" fill="url(#glassPurple)" rx="1"/>
    <rect x="476" y="130" width="44" height="90" fill="url(#glassRed)" rx="1"/>
    <rect x="524" y="130" width="40" height="90" fill="url(#glassBlue)" rx="1"/>
    <line x1="522" y1="36" x2="522" y2="220" stroke="#1a1520" stroke-width="2"/>
    <line x1="476" y1="128" x2="564" y2="128" stroke="#1a1520" stroke-width="2"/>
    <path d="M476 36 Q476 10 520 5 Q564 10 564 36" fill="none" stroke="#1a1520" stroke-width="2"/>
    <path d="M476 36 L450 300 L600 300 L564 36 Z" fill="url(#moonlight)" opacity="0.5"/>
    <circle cx="520" cy="55" r="12" fill="#dde4ff" opacity="0.25"/>
    <circle cx="520" cy="55" r="18" fill="url(#moonGlow)"/>
  </g>

  <!-- Center window (larger, above staircase) -->
  <g>
    <rect x="240" y="15" width="120" height="160" fill="#0e0a14" rx="3"/>
    <path d="M240 15 Q240 -15 300 -25 Q360 -15 360 15" fill="#0e0a14"/>
    <rect x="238" y="13" width="4" height="164" fill="url(#goldTrim)"/>
    <rect x="358" y="13" width="4" height="164" fill="url(#goldTrim)"/>
    <path d="M238 15 Q238 -17 300 -27 Q362 -17 362 15" fill="none" stroke="url(#goldTrim)" stroke-width="4"/>
    <!-- Rose window design -->
    <circle cx="300" cy="70" r="40" fill="url(#glassPurple)" opacity="0.4"/>
    <circle cx="300" cy="70" r="30" fill="url(#glassBlue)" opacity="0.35"/>
    <circle cx="300" cy="70" r="20" fill="url(#glassRed)" opacity="0.3"/>
    <circle cx="300" cy="70" r="8" fill="#dde4ff" opacity="0.2"/>
    <!-- Rose window spokes -->
    <g stroke="#1a1520" stroke-width="1.5" opacity="0.6">
      <line x1="300" y1="30" x2="300" y2="110"/>
      <line x1="260" y1="70" x2="340" y2="70"/>
      <line x1="272" y1="42" x2="328" y2="98"/>
      <line x1="328" y1="42" x2="328" y2="98"/>
      <line x1="272" y1="98" x2="328" y2="42"/>
      <line x1="328" y1="98" x2="272" y2="42"/>
    </g>
    <!-- Lower panels -->
    <rect x="246" y="120" width="52" height="50" fill="url(#glassBlue)" rx="1"/>
    <rect x="302" y="120" width="52" height="50" fill="url(#glassPurple)" rx="1"/>
    <line x1="300" y1="120" x2="300" y2="170" stroke="#1a1520" stroke-width="2"/>
    <!-- Moonlight beam -->
    <path d="M246 120 L220 400 L380 400 L354 120 Z" fill="url(#moonlight)" opacity="0.4"/>
    <!-- Moon -->
    <circle cx="300" cy="50" r="15" fill="#dde4ff" opacity="0.3"/>
    <circle cx="300" cy="50" r="22" fill="url(#moonGlow)"/>
  </g>

  <!-- === ORNATE PILLARS === -->
  <!-- Left pillar -->
  <g>
    <rect x="155" y="50" width="30" height="250" fill="#1e1828"/>
    <rect x="150" y="45" width="40" height="12" fill="url(#goldTrim)" rx="2"/>
    <rect x="150" y="293" width="40" height="12" fill="url(#goldTrim)" rx="2"/>
    <!-- Fluting -->
    <line x1="162" y1="57" x2="162" y2="293" stroke="#16121e" stroke-width="1" opacity="0.5"/>
    <line x1="170" y1="57" x2="170" y2="293" stroke="#16121e" stroke-width="1" opacity="0.5"/>
    <line x1="178" y1="57" x2="178" y2="293" stroke="#16121e" stroke-width="1" opacity="0.5"/>
    <!-- Gold trim bands -->
    <rect x="153" y="80" width="34" height="3" fill="url(#goldTrim)" opacity="0.6"/>
    <rect x="153" y="260" width="34" height="3" fill="url(#goldTrim)" opacity="0.6"/>
    <!-- Capital detail -->
    <path d="M148 57 L155 50 L185 50 L192 57" fill="none" stroke="url(#goldTrim)" stroke-width="2" opacity="0.5"/>
  </g>

  <!-- Right pillar -->
  <g>
    <rect x="415" y="50" width="30" height="250" fill="#1e1828"/>
    <rect x="410" y="45" width="40" height="12" fill="url(#goldTrim)" rx="2"/>
    <rect x="410" y="293" width="40" height="12" fill="url(#goldTrim)" rx="2"/>
    <line x1="422" y1="57" x2="422" y2="293" stroke="#16121e" stroke-width="1" opacity="0.5"/>
    <line x1="430" y1="57" x2="430" y2="293" stroke="#16121e" stroke-width="1" opacity="0.5"/>
    <line x1="438" y1="57" x2="438" y2="293" stroke="#16121e" stroke-width="1" opacity="0.5"/>
    <rect x="413" y="80" width="34" height="3" fill="url(#goldTrim)" opacity="0.6"/>
    <rect x="413" y="260" width="34" height="3" fill="url(#goldTrim)" opacity="0.6"/>
    <path d="M408 57 L415 50 L445 50 L452 57" fill="none" stroke="url(#goldTrim)" stroke-width="2" opacity="0.5"/>
  </g>

  <!-- === GRAND STAIRCASE (background) === -->
  <g>
    <!-- Staircase opening (darkness) -->
    <path d="M250 175 L250 400 L350 400 L350 175 Z" fill="#06040a"/>
    <!-- Stair steps going up into darkness -->
    <path d="M250 400 L250 175 L260 175 L260 390 Z" fill="#0e0a14"/>
    <path d="M340 390 L340 175 L350 175 L350 400 Z" fill="#0e0a14"/>
    <!-- Steps -->
    <line x1="250" y1="390" x2="350" y2="390" stroke="#1a1520" stroke-width="2"/>
    <line x1="250" y1="370" x2="350" y2="370" stroke="#1a1520" stroke-width="2"/>
    <line x1="250" y1="350" x2="350" y2="350" stroke="#1a1520" stroke-width="2"/>
    <line x1="250" y1="330" x2="350" y2="330" stroke="#1a1520" stroke-width="2"/>
    <line x1="250" y1="310" x2="350" y2="310" stroke="#1a1520" stroke-width="2"/>
    <line x1="250" y1="290" x2="350" y2="290" stroke="#1a1520" stroke-width="2"/>
    <line x1="250" y1="270" x2="350" y2="270" stroke="#1a1520" stroke-width="2"/>
    <line x1="250" y1="250" x2="350" y2="250" stroke="#1a1520" stroke-width="2"/>
    <line x1="250" y1="230" x2="350" y2="230" stroke="#1a1520" stroke-width="2"/>
    <line x1="250" y1="210" x2="350" y2="210" stroke="#1a1520" stroke-width="2"/>
    <line x1="250" y1="190" x2="350" y2="190" stroke="#1a1520" stroke-width="2"/>
    <line x1="250" y1="175" x2="350" y2="175" stroke="#1a1520" stroke-width="2"/>
    <!-- Banister -->
    <line x1="250" y1="175" x2="250" y2="400" stroke="url(#goldTrim)" stroke-width="3" opacity="0.4"/>
    <line x1="350" y1="175" x2="350" y2="400" stroke="url(#goldTrim)" stroke-width="3" opacity="0.4"/>
    <!-- Banister posts -->
    <circle cx="250" cy="390" r="3" fill="url(#goldTrim)" opacity="0.4"/>
    <circle cx="250" cy="350" r="3" fill="url(#goldTrim)" opacity="0.4"/>
    <circle cx="250" cy="310" r="3" fill="url(#goldTrim)" opacity="0.4"/>
    <circle cx="250" cy="270" r="3" fill="url(#goldTrim)" opacity="0.4"/>
    <circle cx="250" cy="230" r="3" fill="url(#goldTrim)" opacity="0.4"/>
    <circle cx="250" cy="190" r="3" fill="url(#goldTrim)" opacity="0.4"/>
    <circle cx="350" cy="390" r="3" fill="url(#goldTrim)" opacity="0.4"/>
    <circle cx="350" cy="350" r="3" fill="url(#goldTrim)" opacity="0.4"/>
    <circle cx="350" cy="310" r="3" fill="url(#goldTrim)" opacity="0.4"/>
    <circle cx="350" cy="270" r="3" fill="url(#goldTrim)" opacity="0.4"/>
    <circle cx="350" cy="230" r="3" fill="url(#goldTrim)" opacity="0.4"/>
    <circle cx="350" cy="190" r="3" fill="url(#goldTrim)" opacity="0.4"/>
    <!-- Darkness at top -->
    <path d="M250 175 L250 165 Q300 155 350 165 L350 175 Z" fill="#030206"/>
  </g>

  <!-- === FLOOR === -->
  <rect x="0" y="300" width="600" height="100" fill="url(#marbleFloor)"/>
  <rect x="0" y="298" width="600" height="4" fill="#251d35"/>
  <!-- Moonlight pools on floor -->
  <ellipse cx="80" cy="340" rx="50" ry="20" fill="#4466aa" opacity="0.06"/>
  <ellipse cx="520" cy="340" rx="50" ry="20" fill="#4466aa" opacity="0.06"/>
  <ellipse cx="300" cy="350" rx="70" ry="25" fill="#4466aa" opacity="0.05"/>

  <!-- === CANDELABRAS === -->
  <!-- Left candelabra -->
  <g>
    <!-- Base -->
    <ellipse cx="100" cy="295" rx="15" ry="5" fill="#2a2015"/>
    <rect x="97" y="275" width="6" height="20" fill="url(#goldTrim)" rx="1"/>
    <!-- Arms -->
    <path d="M100 275 L80 265" stroke="url(#goldTrim)" stroke-width="3"/>
    <path d="M100 275 L100 260" stroke="url(#goldTrim)" stroke-width="3"/>
    <path d="M100 275 L120 265" stroke="url(#goldTrim)" stroke-width="3"/>
    <!-- Candle holders -->
    <rect x="76" y="260" width="8" height="5" fill="url(#goldTrim)" rx="1"/>
    <rect x="96" y="255" width="8" height="5" fill="url(#goldTrim)" rx="1"/>
    <rect x="116" y="260" width="8" height="5" fill="url(#goldTrim)" rx="1"/>
    <!-- Black candles -->
    <rect x="78" y="240" width="4" height="20" fill="#1a1a1a" rx="1"/>
    <rect x="98" y="235" width="4" height="20" fill="#1a1a1a" rx="1"/>
    <rect x="118" y="240" width="4" height="20" fill="#1a1a1a" rx="1"/>
    <!-- Wax drips -->
    <path d="M78 245 Q75 250 76 255" fill="#2a2a2a" opacity="0.5"/>
    <path d="M122 248 Q125 253 124 258" fill="#2a2a2a" opacity="0.5"/>
    <!-- Flames -->
    <ellipse cx="80" cy="235" rx="2.5" ry="5" fill="#ffcc44" opacity="0.7"/>
    <ellipse cx="100" cy="230" rx="2.5" ry="5" fill="#ffcc44" opacity="0.7"/>
    <ellipse cx="120" cy="235" rx="2.5" ry="5" fill="#ffcc44" opacity="0.7"/>
    <!-- Glow -->
    <circle cx="100" cy="240" r="30" fill="url(#candleGlowVamp)"/>
  </g>

  <!-- Right candelabra -->
  <g>
    <ellipse cx="500" cy="295" rx="15" ry="5" fill="#2a2015"/>
    <rect x="497" y="275" width="6" height="20" fill="url(#goldTrim)" rx="1"/>
    <path d="M500 275 L480 265" stroke="url(#goldTrim)" stroke-width="3"/>
    <path d="M500 275 L500 260" stroke="url(#goldTrim)" stroke-width="3"/>
    <path d="M500 275 L520 265" stroke="url(#goldTrim)" stroke-width="3"/>
    <rect x="476" y="260" width="8" height="5" fill="url(#goldTrim)" rx="1"/>
    <rect x="496" y="255" width="8" height="5" fill="url(#goldTrim)" rx="1"/>
    <rect x="516" y="260" width="8" height="5" fill="url(#goldTrim)" rx="1"/>
    <rect x="478" y="240" width="4" height="20" fill="#1a1a1a" rx="1"/>
    <rect x="498" y="235" width="4" height="20" fill="#1a1a1a" rx="1"/>
    <rect x="518" y="240" width="4" height="20" fill="#1a1a1a" rx="1"/>
    <path d="M478 248 Q475 253 476 258" fill="#2a2a2a" opacity="0.5"/>
    <path d="M522 245 Q525 250 524 255" fill="#2a2a2a" opacity="0.5"/>
    <ellipse cx="480" cy="235" rx="2.5" ry="5" fill="#ffcc44" opacity="0.7"/>
    <ellipse cx="500" cy="230" rx="2.5" ry="5" fill="#ffcc44" opacity="0.7"/>
    <ellipse cx="520" cy="235" rx="2.5" ry="5" fill="#ffcc44" opacity="0.7"/>
    <circle cx="500" cy="240" r="30" fill="url(#candleGlowVamp)"/>
  </g>

  <!-- === DECAYED FURNITURE === -->
  <!-- Left ornate chair -->
  <g opacity="0.7">
    <rect x="170" y="260" width="40" height="8" fill="#2a1520" rx="2"/>
    <rect x="172" y="268" width="5" height="30" fill="#221018"/>
    <rect x="203" y="268" width="5" height="30" fill="#221018"/>
    <rect x="170" y="220" width="40" height="42" fill="#2a1520" rx="3"/>
    <!-- Gold trim on chair -->
    <rect x="168" y="218" width="44" height="3" fill="url(#goldTrim)" opacity="0.4" rx="1"/>
    <rect x="168" y="258" width="44" height="3" fill="url(#goldTrim)" opacity="0.4" rx="1"/>
    <!-- Torn upholstery -->
    <path d="M175 225 L180 230 L175 235" fill="#1a0a12" opacity="0.5"/>
    <path d="M200 240 L205 245 L200 250" fill="#1a0a12" opacity="0.5"/>
  </g>

  <!-- Right small table -->
  <g opacity="0.65">
    <ellipse cx="440" cy="280" rx="25" ry="8" fill="#2a1520"/>
    <rect x="436" y="250" width="8" height="30" fill="#221018"/>
    <!-- Gold trim -->
    <ellipse cx="440" cy="250" rx="22" ry="6" fill="none" stroke="url(#goldTrim)" stroke-width="2" opacity="0.35"/>
    <!-- Items on table -->
    <ellipse cx="435" cy="247" rx="5" ry="3" fill="#3a2030" opacity="0.6"/>
    <rect x="445" y="242" width="6" height="8" fill="#1a1a2a" rx="1" opacity="0.5"/>
  </g>

  <!-- === PORTRAIT PAINTINGS === -->
  <!-- Left portrait -->
  <g>
    <rect x="160" y="100" width="50" height="65" fill="#0e0a14" rx="2"/>
    <rect x="157" y="97" width="56" height="71" fill="none" stroke="url(#goldTrim)" stroke-width="3" rx="2"/>
    <!-- Painting content (dark figure) -->
    <rect x="164" y="104" width="38" height="52" fill="#120e1a" rx="1"/>
    <!-- Face area -->
    <ellipse cx="183" cy="122" rx="10" ry="12" fill="#1a1525"/>
    <!-- Eyes that seem to follow (pale, unsettling) -->
    <circle cx="179" cy="120" r="2" fill="#aabbdd" opacity="0.6"/>
    <circle cx="187" cy="120" r="2" fill="#aabbdd" opacity="0.6"/>
    <circle cx="179" cy="120" r="0.8" fill="#ffffff" opacity="0.4"/>
    <circle cx="187" cy="120" r="0.8" fill="#ffffff" opacity="0.4"/>
    <!-- Body suggestion -->
    <path d="M173 135 Q183 130 193 135 L195 155 L171 155 Z" fill="#0e0812"/>
    <!-- Dark crimson accent -->
    <path d="M175 145 L183 140 L191 145" fill="none" stroke="#441122" stroke-width="1.5" opacity="0.5"/>
  </g>

  <!-- Right portrait -->
  <g>
    <rect x="390" y="95" width="50" height="70" fill="#0e0a14" rx="2"/>
    <rect x="387" y="92" width="56" height="76" fill="none" stroke="url(#goldTrim)" stroke-width="3" rx="2"/>
    <rect x="394" y="99" width="38" height="57" fill="#120e1a" rx="1"/>
    <ellipse cx="413" cy="118" rx="10" ry="12" fill="#1a1525"/>
    <circle cx="409" cy="116" r="2" fill="#aabbdd" opacity="0.6"/>
    <circle cx="417" cy="116" r="2" fill="#aabbdd" opacity="0.6"/>
    <circle cx="409" cy="116" r="0.8" fill="#ffffff" opacity="0.4"/>
    <circle cx="417" cy="116" r="0.8" fill="#ffffff" opacity="0.4"/>
    <path d="M403 131 Q413 126 423 131 L425 155 L401 155 Z" fill="#0e0812"/>
    <!-- Gold jewelry hint -->
    <path d="M407 133 L413 130 L419 133" fill="none" stroke="url(#goldTrim)" stroke-width="1" opacity="0.4"/>
  </g>

  <!-- === ROTTING ROSE PETALS === -->
  <g opacity="0.5">
    <!-- Petal 1 -->
    <ellipse cx="220" cy="320" rx="6" ry="3" fill="#4a1525" transform="rotate(-20 220 320)"/>
    <!-- Petal 2 -->
    <ellipse cx="260" cy="335" rx="5" ry="2.5" fill="#3a1020" transform="rotate(15 260 335)"/>
    <!-- Petal 3 -->
    <ellipse cx="350" cy="325" rx="6" ry="3" fill="#4a1525" transform="rotate(-35 350 325)"/>
    <!-- Petal 4 -->
    <ellipse cx="380" cy="340" rx="5" ry="2.5" fill="#3a1020" transform="rotate(40 380 340)"/>
    <!-- Petal 5 -->
    <ellipse cx="180" cy="345" rx="4" ry="2" fill="#2a0a18" transform="rotate(-10 180 345)"/>
    <!-- Petal 6 -->
    <ellipse cx="420" cy="330" rx="5" ry="2.5" fill="#4a1525" transform="rotate(25 420 330)"/>
    <!-- Petal 7 -->
    <ellipse cx="310" cy="350" rx="4" ry="2" fill="#3a1020" transform="rotate(-5 310 350)"/>
    <!-- Petal 8 -->
    <ellipse cx="460" cy="345" rx="5" ry="2" fill="#2a0a18" transform="rotate(30 460 345)"/>
    <!-- Wilted stem pieces -->
    <line x1="225" y1="322" x2="235" y2="328" stroke="#2a3a1a" stroke-width="0.8" opacity="0.3"/>
    <line x1="355" y1="328" x2="365" y2="332" stroke="#2a3a1a" stroke-width="0.8" opacity="0.3"/>
  </g>

  <!-- === COBWEBS (subtle, corners) === -->
  <g stroke="#555566" stroke-width="0.4" fill="none" opacity="0.12">
    <!-- Top left corner -->
    <path d="M0 0 L40 5 L15 35 L0 25 Z"/>
    <line x1="0" y1="0" x2="15" y2="35"/>
    <line x1="0" y1="0" x2="40" y2="5"/>
    <path d="M5 5 Q20 12 15 30"/>
    <!-- Top right corner -->
    <path d="M600 0 L555 5 L580 35 L600 25 Z"/>
    <line x1="600" y1="0" x2="580" y2="35"/>
    <line x1="600" y1="0" x2="555" y2="5"/>
    <path d="M595 5 Q578 12 580 30"/>
    <!-- Near left pillar -->
    <path d="M150 45 L135 55 L130 80 L148 75 Z"/>
    <line x1="150" y1="45" x2="130" y2="80"/>
    <line x1="150" y1="45" x2="135" y2="55"/>
  </g>

  <!-- === MOONLIGHT FLOOR REFLECTIONS === -->
  <g opacity="0.04">
    <ellipse cx="80" cy="350" rx="40" ry="15" fill="#6688cc"/>
    <ellipse cx="520" cy="350" rx="40" ry="15" fill="#6688cc"/>
    <ellipse cx="300" cy="360" rx="55" ry="18" fill="#6688cc"/>
  </g>

  <!-- === VIGNETTE === -->
  <radialGradient id="vampireVignette" cx="50%" cy="45%" r="65%">
    <stop offset="0%" stop-color="#000" stop-opacity="0"/>
    <stop offset="50%" stop-color="#000" stop-opacity="0.08"/>
    <stop offset="100%" stop-color="#000" stop-opacity="0.55"/>
  </radialGradient>
  <rect x="0" y="0" width="600" height="400" fill="url(#vampireVignette)"/>

  <!-- === COLD MIST NEAR FLOOR === -->
  <ellipse cx="200" cy="305" rx="100" ry="8" fill="#1a1530" opacity="0.1"/>
  <ellipse cx="400" cy="308" rx="80" ry="6" fill="#1a1530" opacity="0.08"/>
  <ellipse cx="300" cy="310" rx="60" ry="5" fill="#1a1530" opacity="0.06"/>

  <!-- === SUBTLE BAT SILHOUETTES (distant, near ceiling) === -->
  <g opacity="0.08">
    <path d="M200 25 Q205 20 210 25 Q215 20 220 25" fill="none" stroke="#0a0810" stroke-width="1.5"/>
    <path d="M400 30 Q404 26 408 30 Q412 26 416 30" fill="none" stroke="#0a0810" stroke-width="1.2"/>
    <path d="M350 18 Q353 15 356 18 Q359 15 362 18" fill="none" stroke="#0a0810" stroke-width="1"/>
  </g>

</svg>`,

  vampire_castle: `<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Ice ambient glow -->
    <radialGradient id="iceGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#66aadd" stop-opacity="0.2"/>
      <stop offset="50%" stop-color="#4488bb" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <!-- Warm light from ceiling crack -->
    <linearGradient id="warmLight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffaa44" stop-opacity="0.25"/>
      <stop offset="30%" stop-color="#cc8822" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
    <!-- Frozen lake gradient -->
    <linearGradient id="frozenLake" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3366aa" stop-opacity="0.4"/>
      <stop offset="50%" stop-color="#224488" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#112244" stop-opacity="0.5"/>
    </linearGradient>
    <!-- Cave wall pattern -->
    <pattern id="caveWall" x="0" y="0" width="60" height="45" patternUnits="userSpaceOnUse">
      <rect width="60" height="45" fill="#141820"/>
      <path d="M0 15 Q15 5 30 12 Q45 20 60 10" fill="#1a1e28" opacity="0.4"/>
      <path d="M0 35 Q20 28 40 32 Q50 38 60 30" fill="#181c25" opacity="0.3"/>
      <path d="M5 0 L8 20 L3 30" fill="#101418" opacity="0.3"/>
    </pattern>
    <!-- Ice crystal pattern -->
    <pattern id="icePattern" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
      <rect width="30" height="30" fill="#1a2840" opacity="0.3"/>
      <line x1="0" y1="0" x2="30" y2="30" stroke="#3366aa" stroke-width="0.3" opacity="0.3"/>
      <line x1="30" y1="0" x2="0" y2="30" stroke="#3366aa" stroke-width="0.3" opacity="0.3"/>
      <line x1="15" y1="0" x2="15" y2="30" stroke="#4488bb" stroke-width="0.2" opacity="0.2"/>
      <line x1="0" y1="15" x2="30" y2="15" stroke="#4488bb" stroke-width="0.2" opacity="0.2"/>
    </pattern>
    <!-- Bone gradient -->
    <linearGradient id="boneGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#b8a888"/>
      <stop offset="50%" stop-color="#d4c4a8"/>
      <stop offset="100%" stop-color="#a89878"/>
    </linearGradient>
  </defs>

  <!-- Background cave wall -->
  <rect x="0" y="0" width="600" height="400" fill="url(#caveWall)"/>

  <!-- === CEILING WITH ICICLES AND STALACTITES === -->
  <!-- Ceiling mass -->
  <path d="M0 0 L600 0 L600 80 Q550 60 500 75 Q480 50 460 70 Q420 45 400 65 Q380 40 360 60 Q320 35 300 55 Q280 30 260 50 Q220 25 200 45 Q180 20 160 40 Q120 15 100 35 Q80 10 60 30 Q30 5 0 25 Z" fill="#0c1018"/>

  <!-- Large icicles -->
  <g fill="#88bbee" opacity="0.25">
    <polygon points="80,70 88,170 96,70"/>
    <polygon points="150,60 156,140 162,60"/>
    <polygon points="230,50 238,155 246,50"/>
    <polygon points="310,55 317,130 324,55"/>
    <polygon points="380,48 388,160 396,48"/>
    <polygon points="460,65 470,145 480,65"/>
    <polygon points="530,70 540,120 550,70"/>
  </g>
  <!-- Medium icicles -->
  <g fill="#aaddff" opacity="0.2">
    <polygon points="55,55 60,110 65,55"/>
    <polygon points="120,45 125,100 130,45"/>
    <polygon points="190,48 195,115 200,48"/>
    <polygon points="270,42 274,95 278,42"/>
    <polygon points="340,50 345,108 350,50"/>
    <polygon points="420,55 425,115 430,55"/>
    <polygon points="500,60 505,100 510,60"/>
    <polygon points="560,68 564,95 568,68"/>
  </g>
  <!-- Small icicles -->
  <g fill="#cceeff" opacity="0.15">
    <polygon points="40,40 43,70 46,40"/>
    <polygon points="100,35 103,65 106,35"/>
    <polygon points="170,38 173,68 176,38"/>
    <polygon points="250,32 253,60 256,32"/>
    <polygon points="330,42 333,72 336,42"/>
    <polygon points="400,35 403,65 406,35"/>
    <polygon points="440,40 443,70 446,40"/>
    <polygon points="480,45 483,75 486,45"/>
    <polygon points="545,50 548,78 551,50"/>
  </g>

  <!-- Stalactites (thicker, rock) -->
  <polygon points="100,75 108,130 116,75" fill="#1a1e28"/>
  <polygon points="200,65 206,115 212,65" fill="#161a22"/>
  <polygon points="350,60 356,125 362,60" fill="#1a1e28"/>
  <polygon points="500,70 507,105 514,70" fill="#161a22"/>

  <!-- Ice crystal formations on ceiling -->
  <g opacity="0.15">
    <path d="M60 30 L65 40 L55 45 L62 50" fill="#88ccff"/>
    <path d="M180 25 L185 35 L175 42 L182 48" fill="#66aaee"/>
    <path d="M420 28 L426 38 L416 44 L423 50" fill="#88ccff"/>
  </g>

  <!-- === CRACK IN CEILING WITH WARM LIGHT === -->
  <g>
    <!-- Crack -->
    <path d="M295 0 L298 40 Q300 50 297 70 Q302 60 300 80" fill="none" stroke="#ffaa44" stroke-width="3" opacity="0.6"/>
    <path d="M296 0 L300 35 Q299 38 301 55" fill="none" stroke="#ffcc66" stroke-width="1.5" opacity="0.4"/>
    <!-- Warm light beam -->
    <path d="M295 0 L270 150 L260 300 L340 300 L330 150 Z" fill="url(#warmLight)" opacity="0.7"/>
    <!-- Light source point -->
    <ellipse cx="298" cy="8" rx="8" ry="4" fill="#ffcc44" opacity="0.5"/>
    <circle cx="298" cy="5" r="3" fill="#ffdd88" opacity="0.6"/>
  </g>

  <!-- === CAVE FLOOR === -->
  <rect x="0" y="300" width="600" height="100" fill="#0e1218"/>
  <path d="M0 300 Q50 295 100 298 Q200 290 300 295 Q400 288 500 293 Q550 290 600 295 L600 400 L0 400 Z" fill="#101418"/>

  <!-- Ice patches on floor -->
  <g opacity="0.35">
    <ellipse cx="80" cy="340" rx="40" ry="12" fill="#3366aa" opacity="0.3"/>
    <ellipse cx="80" cy="340" rx="35" ry="10" fill="#4488cc" opacity="0.2"/>
    <ellipse cx="200" cy="360" rx="50" ry="15" fill="#3366aa" opacity="0.25"/>
    <ellipse cx="200" cy="360" rx="44" ry="13" fill="#4488cc" opacity="0.15"/>
    <ellipse cx="400" cy="335" rx="45" ry="14" fill="#3366aa" opacity="0.3"/>
    <ellipse cx="400" cy="335" rx="40" ry="12" fill="#4488cc" opacity="0.2"/>
    <ellipse cx="520" cy="355" rx="35" ry="10" fill="#3366aa" opacity="0.25"/>
    <ellipse cx="520" cy="355" rx="30" ry="8" fill="#4488cc" opacity="0.15"/>
  </g>
  <!-- Ice crack lines -->
  <g stroke="#5588bb" stroke-width="0.5" fill="none" opacity="0.2">
    <path d="M80 340 L95 335 L110 340 L120 338"/>
    <path d="M200 360 L215 355 L230 360 L245 357"/>
    <path d="M400 335 L415 330 L430 335 L440 333"/>
    <path d="M400 335 L390 325 L385 315"/>
  </g>
  <!-- Ice reflections (bright spots) -->
  <ellipse cx="75" cy="338" rx="8" ry="3" fill="#88ccff" opacity="0.1"/>
  <ellipse cx="195" cy="358" rx="10" ry="4" fill="#88ccff" opacity="0.08"/>
  <ellipse cx="395" cy="333" rx="9" ry="3" fill="#88ccff" opacity="0.1"/>
  <ellipse cx="515" cy="353" rx="7" ry="2.5" fill="#88ccff" opacity="0.08"/>

  <!-- Floor rocks/debris -->
  <ellipse cx="30" cy="320" rx="12" ry="6" fill="#1a1e28"/>
  <ellipse cx="150" cy="330" rx="10" ry="5" fill="#161a22"/>
  <ellipse cx="320" cy="315" rx="8" ry="4" fill="#1a1e28"/>
  <ellipse cx="460" cy="320" rx="11" ry="5" fill="#161a22"/>
  <ellipse cx="580" cy="318" rx="9" ry="4" fill="#1a1e28"/>

  <!-- === FROZEN UNDERGROUND LAKE (background) === -->
  <g>
    <!-- Lake surface (ice) -->
    <ellipse cx="300" cy="240" rx="180" ry="40" fill="url(#frozenLake)"/>
    <ellipse cx="300" cy="240" rx="170" ry="36" fill="#2a4466" opacity="0.4"/>
    <ellipse cx="300" cy="240" rx="160" ry="32" fill="#335588" opacity="0.3"/>
    <!-- Ice surface cracks -->
    <g stroke="#4488cc" stroke-width="0.8" fill="none" opacity="0.25">
      <path d="M180 230 L220 235 L260 228"/>
      <path d="M220 235 L240 250"/>
      <path d="M300 225 L320 235 L350 230 L380 238"/>
      <path d="M320 235 L330 245"/>
      <path d="M380 238 L400 232"/>
      <path d="M200 250 L250 248 L300 255"/>
      <path d="M350 250 L400 252 L420 248"/>
    </g>
    <!-- Ice surface highlights -->
    <ellipse cx="250" cy="232" rx="30" ry="5" fill="#66aadd" opacity="0.1"/>
    <ellipse cx="350" cy="235" rx="25" ry="4" fill="#66aadd" opacity="0.08"/>
    <!-- Something dark beneath the ice -->
    <ellipse cx="300" cy="250" rx="80" ry="18" fill="#020408" opacity="0.5"/>
    <ellipse cx="300" cy="250" rx="60" ry="12" fill="#040810" opacity="0.4"/>
    <!-- Faint shape suggestion (massive, ominous) -->
    <ellipse cx="280" cy="248" rx="20" ry="8" fill="#060a12" opacity="0.3"/>
    <ellipse cx="320" cy="252" rx="15" ry="6" fill="#040810" opacity="0.25"/>
    <!-- Faint eye-like glow beneath ice -->
    <circle cx="270" cy="246" r="3" fill="#4466aa" opacity="0.08"/>
    <!-- Ambient glow from ice -->
    <ellipse cx="300" cy="240" rx="180" ry="40" fill="url(#iceGlow)"/>
  </g>

  <!-- === SMASHED / SCATTERED STONE FURNITURE === -->
  <!-- Massive broken stone table -->
  <g opacity="0.6">
    <!-- Table top (broken, tilted) -->
    <path d="M100 270 L160 265 L180 290 L110 295 Z" fill="#2a2e38"/>
    <path d="M105 272 L155 268 L170 288 L115 292 Z" fill="#333842"/>
    <!-- Broken edge -->
    <path d="M160 265 L170 260 L180 275 L180 290" fill="#2a2e38"/>
    <!-- Table legs (one broken) -->
    <rect x="108" y="293" width="10" height="15" fill="#2a2e38"/>
    <rect x="165" y="288" width="10" height="18" fill="#2a2e38"/>
    <!-- Broken leg piece on ground -->
    <rect x="155" y="305" width="8" height="12" fill="#2a2e38" transform="rotate(25 159 311)"/>
  </g>

  <!-- Smashed stone chair/boulder seat -->
  <g opacity="0.5">
    <ellipse cx="480" cy="280" rx="25" ry="15" fill="#2a2e38"/>
    <ellipse cx="480" cy="277" rx="20" ry="10" fill="#333842"/>
    <!-- Broken pieces -->
    <polygon points="505,275 515,270 518,280 510,285" fill="#2a2e38"/>
    <polygon points="460,280 455,275 450,282 457,286" fill="#333842"/>
    <!-- Leg stumps -->
    <rect x="468" y="290" width="8" height="10" fill="#2a2e38"/>
    <rect x="490" y="292" width="8" height="8" fill="#2a2e38"/>
  </g>

  <!-- Scattered stone chunks -->
  <g opacity="0.45">
    <polygon points="60,310 72,305 78,312 68,318" fill="#2a2e38"/>
    <polygon points="540,315 552,310 555,318 545,322" fill="#333842"/>
    <ellipse cx="350" cy="320" rx="12" ry="8" fill="#2a2e38"/>
    <ellipse cx="250" cy="295" rx="8" ry="5" fill="#333842"/>
    <polygon points="440,320 448,316 452,324 444,328" fill="#2a2e38"/>
  </g>

  <!-- === GIANT BONES PILED IN CORNERS === -->
  <!-- Left corner bone pile -->
  <g>
    <!-- Large bones -->
    <line x1="30" y1="290" x2="70" y2="260" stroke="url(#boneGrad)" stroke-width="6" stroke-linecap="round"/>
    <circle cx="27" cy="293" r="6" fill="#d4c4a8"/>
    <circle cx="73" cy="257" r="6" fill="#c8b898"/>
    
    <line x1="40" y1="295" x2="85" y2="275" stroke="url(#boneGrad)" stroke-width="5" stroke-linecap="round"/>
    <circle cx="37" cy="298" r="5" fill="#c8b898"/>
    <circle cx="88" cy="273" r="5" fill="#b8a888"/>
    
    <line x1="55" y1="298" x2="90" y2="290" stroke="url(#boneGrad)" stroke-width="4" stroke-linecap="round"/>
    
    <line x1="25" y1="280" x2="50" y2="255" stroke="url(#boneGrad)" stroke-width="7" stroke-linecap="round"/>
    <circle cx="22" cy="283" r="7" fill="#d4c4a8"/>
    <circle cx="53" cy="252" r="7" fill="#c8b898"/>
    
    <!-- Skull -->
    <g transform="translate(45,265) rotate(-15)">
      <ellipse cx="0" cy="0" rx="12" ry="10" fill="#d4c4a8"/>
      <ellipse cx="0" cy="2" rx="10" ry="8" fill="#c8b898"/>
      <circle cx="-4" cy="-2" r="3" fill="#0e1218"/>
      <circle cx="4" cy="-2" r="3" fill="#0e1218"/>
      <circle cx="-4" cy="-2" r="1.5" fill="#3366aa" opacity="0.1"/>
      <circle cx="4" cy="-2" r="1.5" fill="#3366aa" opacity="0.1"/>
      <path d="M-3 5 L0 7 L3 5" fill="none" stroke="#0e1218" stroke-width="1"/>
      <!-- Jaw -->
      <path d="M-6 4 Q0 12 6 4" fill="#c8b898" stroke="#b8a888" stroke-width="0.5"/>
    </g>
    
    <!-- Smaller bones mixed in -->
    <line x1="60" y1="285" x2="80" y2="278" stroke="#b8a888" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="35" y1="270" x2="50" y2="265" stroke="#c8b898" stroke-width="3" stroke-linecap="round"/>
  </g>

  <!-- Right corner bone pile -->
  <g>
    <line x1="520" y1="295" x2="570" y2="265" stroke="url(#boneGrad)" stroke-width="6" stroke-linecap="round"/>
    <circle cx="517" cy="298" r="6" fill="#d4c4a8"/>
    <circle cx="573" cy="262" r="6" fill="#c8b898"/>
    
    <line x1="540" y1="298" x2="585" y2="280" stroke="url(#boneGrad)" stroke-width="5" stroke-linecap="round"/>
    <circle cx="537" cy="301" r="5" fill="#c8b898"/>
    <circle cx="588" cy="278" r="5" fill="#b8a888"/>
    
    <line x1="530" y1="290" x2="565" y2="260" stroke="url(#boneGrad)" stroke-width="8" stroke-linecap="round"/>
    <circle cx="527" cy="293" r="8" fill="#d4c4a8"/>
    <circle cx="568" cy="257" r="8" fill="#c8b898"/>
    
    <line x1="555" y1="295" x2="580" y2="288" stroke="url(#boneGrad)" stroke-width="4" stroke-linecap="round"/>
    
    <!-- Another skull -->
    <g transform="translate(550,275) rotate(20)">
      <ellipse cx="0" cy="0" rx="10" ry="8" fill="#d4c4a8"/>
      <circle cx="-3" cy="-1" r="2.5" fill="#0e1218"/>
      <circle cx="3" cy="-1" r="2.5" fill="#0e1218"/>
      <path d="M-2 4 L1 6 L4 4" fill="none" stroke="#0e1218" stroke-width="0.8"/>
    </g>
    
    <!-- Rib bone -->
    <path d="M560 275 Q575 265 590 275" fill="none" stroke="url(#boneGrad)" stroke-width="3"/>
    <path d="M562 278 Q575 270 588 278" fill="none" stroke="url(#boneGrad)" stroke-width="2.5"/>
    
    <line x1="545" y1="280" x2="560" y2="272" stroke="#c8b898" stroke-width="3" stroke-linecap="round"/>
    <line x1="565" y1="288" x2="578" y2="284" stroke="#b8a888" stroke-width="2" stroke-linecap="round"/>
  </g>

  <!-- Scattered center bones -->
  <g opacity="0.7">
    <line x1="250" y1="275" x2="270" y2="270" stroke="#c8b898" stroke-width="3" stroke-linecap="round"/>
    <circle cx="248" cy="276" r="3" fill="#c8b898"/>
    <circle cx="272" cy="269" r="3" fill="#b8a888"/>
    
    <line x1="350" y1="290" x2="365" y2="286" stroke="#b8a888" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="348" cy="291" r="2.5" fill="#c8b898"/>
    <circle cx="367" cy="285" r="2.5" fill="#b8a888"/>
    
    <ellipse cx="180" cy="305" rx="6" ry="3" fill="#c8b898" opacity="0.6" transform="rotate(-20 180 305)"/>
  </g>

  <!-- === CAVE WALL ICE FORMATIONS === -->
  <!-- Left wall ice -->
  <g opacity="0.25">
    <path d="M0 200 L0 280 L20 260 L30 240 L15 220 L0 230" fill="#3366aa"/>
    <path d="M0 150 L0 190 L12 175 L8 155 L0 165" fill="#4488cc" opacity="0.5"/>
  </g>
  <!-- Right wall ice -->
  <g opacity="0.25">
    <path d="M600 180 L600 260 L585 245 L575 225 L590 205 L600 215" fill="#3366aa"/>
    <path d="M600 130 L600 170 L590 155 L592 135 L600 145" fill="#4488cc" opacity="0.5"/>
  </g>

  <!-- === STALAGMITES (from floor) === -->
  <g fill="#1a1e28" opacity="0.6">
    <polygon points="100,300 105,260 110,300"/>
    <polygon points="500,302 504,270 508,302"/>
    <!-- Ice-covered stalagmites -->
    <polygon points="180,300 183,265 186,300" fill="#2a4466" opacity="0.4"/>
    <polygon points="420,301 424,268 428,301" fill="#2a4466" opacity="0.4"/>
  </g>

  <!-- === COLD BLUE AMBIENT LIGHT OVERLAY === -->
  <rect x="0" y="0" width="600" height="400" fill="#1a3366" opacity="0.03"/>

  <!-- === VIGNETTE === -->
  <radialGradient id="caveVignette" cx="50%" cy="48%" r="65%">
    <stop offset="0%" stop-color="#000" stop-opacity="0"/>
    <stop offset="55%" stop-color="#000" stop-opacity="0.1"/>
    <stop offset="100%" stop-color="#000" stop-opacity="0.6"/>
  </radialGradient>
  <rect x="0" y="0" width="600" height="400" fill="url(#caveVignette)"/>

  <!-- === FOG / COLD MIST near floor === -->
  <ellipse cx="150" cy="310" rx="120" ry="15" fill="#1a2840" opacity="0.12"/>
  <ellipse cx="400" cy="315" rx="100" ry="12" fill="#1a2840" opacity="0.1"/>
  <ellipse cx="550" cy="320" rx="80" ry="10" fill="#1a2840" opacity="0.08"/>

  <!-- === WATER DRIP PARTICLES (subtle) === -->
  <g fill="#66aadd" opacity="0.2">
    <circle cx="95" cy="175" r="1">
      <animate attributeName="cy" values="175;195;210" dur="3s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.2;0.1;0" dur="3s" repeatCount="indefinite"/>
    </circle>
    <circle cx="388" cy="165" r="1">
      <animate attributeName="cy" values="165;185;200" dur="4s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.2;0.1;0" dur="4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="240" cy="158" r="0.8">
      <animate attributeName="cy" values="158;178;195" dur="3.5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.15;0.08;0" dur="3.5s" repeatCount="indefinite"/>
    </circle>
  </g>

</svg>`,
  stage_name: `<svg ...>...</svg>`,
}

function showStageBackground(stageId) {
  const container = document.getElementById('stage-background')
  if (!container) return
  const bg = STAGE_BACKGROUNDS[stageId]
  if (bg) {
    container.innerHTML = bg
    container.style.display = 'block'
  } else {
    container.innerHTML = ''
  }
}
 
function hideStageBackground() {
  const container = document.getElementById('stage-background')
  if (container) {
    container.innerHTML = ''
    container.style.display = 'none'
  }
}