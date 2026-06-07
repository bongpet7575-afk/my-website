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