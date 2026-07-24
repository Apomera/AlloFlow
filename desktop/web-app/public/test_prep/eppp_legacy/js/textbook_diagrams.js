/* ============================================================
   PasstheEPPP — Interactive Animated Diagrams for Textbook
   Patches diagrams into existing textbook chapter sections
   ============================================================ */
(function() {
    'use strict';

    // We'll patch diagrams into chapters after a brief delay to ensure chapters are loaded
    window._epppDiagrams = {

        // ─── 1. NEURON STRUCTURE & ACTION POTENTIAL (Ch 4 / Biological) ───
        neuronActionPotential: {
            svg: `<svg viewBox="0 0 700 280" xmlns="http://www.w3.org/2000/svg" style="max-width:700px">
                <defs>
                    <linearGradient id="axonGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stop-color="#818cf8"/>
                        <stop offset="100%" stop-color="#6ee7b7"/>
                    </linearGradient>
                    <linearGradient id="myelinGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.7"/>
                        <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.3"/>
                    </linearGradient>
                    <filter id="neonGlow"><feGaussianBlur stdDeviation="3" result="blur"/>
                        <feComposite in="SourceGraphic" in2="blur" operator="over"/></filter>
                </defs>
                <text x="350" y="20" text-anchor="middle" class="diagram-label" font-weight="700" font-size="13" fill="#a78bfa">Example Myelinated Multipolar Neuron — Schematic</text>
                <!-- Cell body (soma) -->
                <ellipse cx="90" cy="140" rx="55" ry="45" fill="#312e81" stroke="#818cf8" stroke-width="2" class="diagram-box"/>
                <text x="90" y="125" text-anchor="middle" class="diagram-label" font-weight="600">Cell Body</text>
                <text x="90" y="140" text-anchor="middle" class="diagram-label-sm">(Soma)</text>
                <!-- Nucleus -->
                <circle cx="90" cy="158" r="14" fill="#4338ca" stroke="#a78bfa" stroke-width="1.5" class="diagram-node-pulse"/>
                <text x="90" y="162" text-anchor="middle" style="font-size:8px;fill:#c4b5fd">Nucleus</text>
                <!-- Dendrites -->
                <path d="M40 100 Q20 80 10 60" stroke="#a78bfa" stroke-width="2" fill="none" opacity="0.7"/>
                <path d="M50 95 Q35 70 25 50" stroke="#a78bfa" stroke-width="2" fill="none" opacity="0.7"/>
                <path d="M45 105 Q15 95 5 85" stroke="#a78bfa" stroke-width="2" fill="none" opacity="0.7"/>
                <path d="M42 180 Q20 200 10 220" stroke="#a78bfa" stroke-width="2" fill="none" opacity="0.7"/>
                <path d="M50 185 Q30 210 20 230" stroke="#a78bfa" stroke-width="2" fill="none" opacity="0.7"/>
                <text x="5" y="48" class="diagram-label-sm">Dendrites</text>
                <text x="5" y="58" style="font-size:9px;fill:#94a3b8">(common input sites)</text>
                <!-- Axon Initial Segment label -->
                <text x="155" y="118" class="diagram-label-sm" fill="#fbbf24">Axon Initial Segment</text>
                <line x1="145" y1="140" x2="155" y2="125" stroke="#fbbf24" stroke-width="1" stroke-dasharray="3 2"/>
                <!-- Axon -->
                <line x1="145" y1="140" x2="550" y2="140" stroke="url(#axonGrad)" stroke-width="3"/>
                <text x="340" y="130" text-anchor="middle" class="diagram-label">Axon</text>
                <!-- Myelin sheaths -->
                <rect x="175" y="128" width="50" height="24" rx="12" fill="url(#myelinGrad)" class="diagram-box"/>
                <rect x="255" y="128" width="50" height="24" rx="12" fill="url(#myelinGrad)" class="diagram-box"/>
                <rect x="335" y="128" width="50" height="24" rx="12" fill="url(#myelinGrad)" class="diagram-box"/>
                <rect x="415" y="128" width="50" height="24" rx="12" fill="url(#myelinGrad)" class="diagram-box"/>
                <text x="200" y="175" text-anchor="middle" class="diagram-label-sm" fill="#fbbf24">Myelin Sheath</text>
                <!-- Nodes of Ranvier labels -->
                <text x="238" y="195" text-anchor="middle" style="font-size:9px;fill:#6ee7b7">Node of</text>
                <text x="238" y="204" text-anchor="middle" style="font-size:9px;fill:#6ee7b7">Ranvier</text>
                <line x1="238" y1="152" x2="238" y2="188" stroke="#6ee7b7" stroke-width="0.7" stroke-dasharray="2 2"/>
                <!-- Schematic sequence marker; not a physical particle or voltage trace -->
                <circle cx="0" cy="140" r="5" fill="#6ee7b7" filter="url(#neonGlow)">
                    <animate attributeName="cx" values="145;238;320;400;480;550" keyTimes="0;0.2;0.4;0.6;0.8;1" calcMode="discrete" dur="2s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="1;0.3;1;0.3;1" dur="2s" repeatCount="indefinite"/>
                </circle>
                <circle cx="0" cy="140" r="3" fill="#a7f3d0">
                    <animate attributeName="cx" values="145;238;320;400;480;550" keyTimes="0;0.2;0.4;0.6;0.8;1" calcMode="discrete" dur="2s" repeatCount="indefinite"/>
                </circle>
                <!-- Terminal buttons -->
                <g transform="translate(550,140)">
                    <line x1="0" y1="0" x2="30" y2="-25" stroke="#6ee7b7" stroke-width="2"/>
                    <line x1="0" y1="0" x2="35" y2="0" stroke="#6ee7b7" stroke-width="2"/>
                    <line x1="0" y1="0" x2="30" y2="25" stroke="#6ee7b7" stroke-width="2"/>
                    <circle cx="30" cy="-25" r="8" fill="#065f46" stroke="#6ee7b7" stroke-width="1.5" class="diagram-node-pulse"/>
                    <circle cx="35" cy="0" r="8" fill="#065f46" stroke="#6ee7b7" stroke-width="1.5" class="diagram-node-pulse" style="animation-delay:0.3s"/>
                    <circle cx="30" cy="25" r="8" fill="#065f46" stroke="#6ee7b7" stroke-width="1.5" class="diagram-node-pulse" style="animation-delay:0.6s"/>
                    <text x="55" y="-20" class="diagram-label-sm">Axon</text>
                    <text x="55" y="-10" class="diagram-label-sm">Terminals</text>
                    <!-- Neurotransmitter release -->
                    <circle cx="38" cy="-32" r="2" fill="#fbbf24" class="diagram-fade-pulse"/>
                    <circle cx="42" cy="-20" r="2" fill="#fbbf24" class="diagram-fade-pulse" style="animation-delay:0.5s"/>
                    <circle cx="44" cy="7" r="2" fill="#fbbf24" class="diagram-fade-pulse" style="animation-delay:1s"/>
                    <circle cx="38" cy="32" r="2" fill="#fbbf24" class="diagram-fade-pulse" style="animation-delay:1.5s"/>
                    <text x="55" y="5" style="font-size:9px;fill:#fbbf24">(neurotransmitter release</text>
                    <text x="55" y="14" style="font-size:9px;fill:#fbbf24"> into synaptic cleft)</text>
                </g>
                <!-- Direction arrow -->
                <text x="340" y="108" text-anchor="middle" style="font-size:9px;fill:#6ee7b7">⚡ Schematic node-to-node sequence →</text>
            </svg>`,
            description: '🔬 Simplified example of a myelinated multipolar neuron. Dendrites and the soma commonly receive and integrate synaptic inputs, and the soma contains the nucleus. Action potentials usually initiate at the axon initial segment, propagate along the axon, and trigger neurotransmitter release from axon terminals into the synaptic cleft. In a myelinated axon, active regeneration occurs at nodes of Ranvier while depolarizing current spreads beneath myelin. The green marker represents direction and sequence, not a physical particle or an exact continuous voltage trace.'
        },

        // ─── 2. CLASSICAL CONDITIONING (Ch for Learning/Development) ───
        classicalConditioning: {
            svg: `<svg viewBox="0 0 660 300" xmlns="http://www.w3.org/2000/svg" style="max-width:660px">
                <defs>
                    <linearGradient id="ccGrad1" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stop-color="#3b82f6"/>
                        <stop offset="100%" stop-color="#818cf8"/>
                    </linearGradient>
                    <linearGradient id="ccGrad2" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stop-color="#f59e0b"/>
                        <stop offset="100%" stop-color="#ef4444"/>
                    </linearGradient>
                </defs>
                <!-- Title -->
                <text x="330" y="25" text-anchor="middle" class="diagram-label" font-weight="700" font-size="13" fill="#a78bfa">Classical Conditioning (Pavlov)</text>
                <!-- BEFORE Conditioning -->
                <rect x="20" y="45" width="200" height="70" rx="10" fill="#1e1b4b" stroke="#4338ca" stroke-width="1.5" class="diagram-box"/>
                <text x="120" y="66" text-anchor="middle" class="diagram-label" font-weight="600" fill="#818cf8">BEFORE</text>
                <text x="120" y="82" text-anchor="middle" class="diagram-label-sm">🔔 Bell (NS) → No response</text>
                <text x="120" y="96" text-anchor="middle" class="diagram-label-sm">🥩 Food (UCS) → 🤤 Salivation (UCR)</text>
                <!-- Arrow -->
                <path d="M230 80 Q260 80 260 155" stroke="#818cf8" stroke-width="2" fill="none" marker-end="url(#arrowCC)" class="diagram-signal-flow"/>
                <defs><marker id="arrowCC" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#818cf8"/></marker></defs>
                <!-- DURING Conditioning -->
                <rect x="230" y="135" width="200" height="70" rx="10" fill="#1e1b4b" stroke="#f59e0b" stroke-width="1.5" class="diagram-box diagram-glow"/>
                <text x="330" y="156" text-anchor="middle" class="diagram-label" font-weight="600" fill="#fbbf24">DURING (pairing)</text>
                <text x="330" y="173" text-anchor="middle" class="diagram-label-sm">🔔 Bell + 🥩 Food → 🤤 Salivation</text>
                <text x="330" y="190" text-anchor="middle" class="diagram-label-sm" fill="#fbbf24">⟲ repeated pairings</text>
                <!-- Animated pairing indicator -->
                <circle cx="295" cy="173" r="4" fill="#fbbf24" class="diagram-fade-pulse"/>
                <circle cx="365" cy="173" r="4" fill="#fbbf24" class="diagram-fade-pulse" style="animation-delay:1s"/>
                <!-- Arrow -->
                <path d="M440 170 Q470 170 470 245" stroke="#f59e0b" stroke-width="2" fill="none" marker-end="url(#arrowCC2)" class="diagram-signal-flow"/>
                <defs><marker id="arrowCC2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#f59e0b"/></marker></defs>
                <!-- AFTER Conditioning -->
                <rect x="420" y="225" width="220" height="70" rx="10" fill="#1e1b4b" stroke="#22c55e" stroke-width="1.5" class="diagram-box"/>
                <text x="530" y="246" text-anchor="middle" class="diagram-label" font-weight="600" fill="#6ee7b7">AFTER</text>
                <text x="530" y="264" text-anchor="middle" class="diagram-label-sm">🔔 Bell alone (CS) → 🤤 Salivation (CR)</text>
                <text x="530" y="280" text-anchor="middle" class="diagram-label-sm" fill="#6ee7b7">✓ Learning occurred!</text>
                <!-- Legend boxes on right -->
                <g transform="translate(20,130)">
                    <rect x="0" y="0" width="8" height="8" rx="2" fill="#64748b"/>
                    <text x="14" y="8" style="font-size:8px;fill:#94a3b8">NS = Neutral Stimulus</text>
                    <rect x="0" y="15" width="8" height="8" rx="2" fill="#3b82f6"/>
                    <text x="14" y="23" style="font-size:8px;fill:#94a3b8">UCS = Unconditioned Stimulus</text>
                    <rect x="0" y="30" width="8" height="8" rx="2" fill="#ef4444"/>
                    <text x="14" y="38" style="font-size:8px;fill:#94a3b8">UCR = Unconditioned Response</text>
                    <rect x="0" y="45" width="8" height="8" rx="2" fill="#22c55e"/>
                    <text x="14" y="53" style="font-size:8px;fill:#94a3b8">CS = Conditioned Stimulus</text>
                    <rect x="0" y="60" width="8" height="8" rx="2" fill="#6ee7b7"/>
                    <text x="14" y="68" style="font-size:8px;fill:#94a3b8">CR = Conditioned Response</text>
                </g>
            </svg>`,
            description: '🧠 Classical conditioning: a neutral stimulus (bell) becomes a conditioned stimulus through repeated pairing with an unconditioned stimulus (food). The glowing box shows the active learning phase.'
        },

        // ─── 3. HPA AXIS STRESS RESPONSE ───
        hpaAxis: {
            svg: `<svg viewBox="0 0 500 380" xmlns="http://www.w3.org/2000/svg" style="max-width:500px">
                <defs>
                    <linearGradient id="hpaG1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#ef4444"/>
                        <stop offset="100%" stop-color="#b91c1c"/>
                    </linearGradient>
                    <linearGradient id="hpaG2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#f59e0b"/>
                        <stop offset="100%" stop-color="#d97706"/>
                    </linearGradient>
                    <linearGradient id="hpaG3" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#22c55e"/>
                        <stop offset="100%" stop-color="#15803d"/>
                    </linearGradient>
                    <marker id="hpaArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                        <path d="M0 0 L10 5 L0 10 z" fill="#e2e8f0"/>
                    </marker>
                    <marker id="hpaFeedback" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                        <path d="M0 0 L10 5 L0 10 z" fill="#ef4444"/>
                    </marker>
                </defs>
                <text x="250" y="22" text-anchor="middle" class="diagram-label" font-weight="700" font-size="13" fill="#a78bfa">HPA Axis — Stress Response Cascade</text>
                <!-- Stress trigger -->
                <rect x="185" y="35" width="130" height="32" rx="16" fill="#7c3aed" stroke="#a78bfa" stroke-width="1.5" class="diagram-glow"/>
                <text x="250" y="56" text-anchor="middle" class="diagram-label" font-weight="600">⚡ STRESSOR</text>
                <!-- Arrow down -->
                <line x1="250" y1="67" x2="250" y2="90" stroke="#e2e8f0" stroke-width="2" marker-end="url(#hpaArrow)"/>
                <!-- Hypothalamus -->
                <rect x="165" y="90" width="170" height="50" rx="12" fill="url(#hpaG1)" class="diagram-box" opacity="0.9"/>
                <text x="250" y="112" text-anchor="middle" class="diagram-label" font-weight="600">Hypothalamus</text>
                <text x="250" y="128" text-anchor="middle" class="diagram-label-sm" fill="#fecaca">releases CRH →</text>
                <!-- Flowing CRH signal -->
                <line x1="250" y1="140" x2="250" y2="170" stroke="#fca5a5" stroke-width="2" class="diagram-signal-flow" marker-end="url(#hpaArrow)"/>
                <text x="310" y="158" class="diagram-label-sm" fill="#fca5a5">CRH</text>
                <!-- Pituitary -->
                <rect x="165" y="170" width="170" height="50" rx="12" fill="url(#hpaG2)" class="diagram-box" opacity="0.9"/>
                <text x="250" y="192" text-anchor="middle" class="diagram-label" font-weight="600">Anterior Pituitary</text>
                <text x="250" y="208" text-anchor="middle" class="diagram-label-sm" fill="#fef3c7">releases ACTH →</text>
                <!-- Flowing ACTH signal -->
                <line x1="250" y1="220" x2="250" y2="250" stroke="#fbbf24" stroke-width="2" class="diagram-signal-flow" marker-end="url(#hpaArrow)"/>
                <text x="310" y="238" class="diagram-label-sm" fill="#fbbf24">ACTH</text>
                <!-- Adrenal cortex -->
                <rect x="165" y="250" width="170" height="50" rx="12" fill="url(#hpaG3)" class="diagram-box" opacity="0.9"/>
                <text x="250" y="272" text-anchor="middle" class="diagram-label" font-weight="600">Adrenal Cortex</text>
                <text x="250" y="288" text-anchor="middle" class="diagram-label-sm" fill="#bbf7d0">releases Cortisol →</text>
                <!-- Cortisol output -->
                <line x1="250" y1="300" x2="250" y2="330" stroke="#6ee7b7" stroke-width="2" marker-end="url(#hpaArrow)" class="diagram-signal-flow"/>
                <rect x="175" y="330" width="150" height="35" rx="10" fill="#1e1b4b" stroke="#6ee7b7" stroke-width="1.5"/>
                <text x="250" y="350" text-anchor="middle" class="diagram-label" fill="#6ee7b7" font-weight="600">💪 CORTISOL</text>
                <text x="250" y="362" text-anchor="middle" style="font-size:7px;fill:#86efac">mobilizes energy; feeds back on CRH/ACTH</text>
                <!-- Negative feedback loop (red dashed) -->
                <path d="M175 345 Q60 345 60 200 Q60 100 165 100" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="5 3" fill="none" marker-end="url(#hpaFeedback)" opacity="0.7"/>
                <text x="45" y="230" class="diagram-label-sm" fill="#ef4444" transform="rotate(-90,45,230)">NEGATIVE FEEDBACK</text>
                <text x="30" y="200" style="font-size:7px;fill:#fca5a5" transform="rotate(-90,30,200)">Cortisol suppresses CRH + ACTH</text>
                <!-- Chronic stress warning -->
                <rect x="350" y="310" width="140" height="55" rx="8" fill="rgba(239,68,68,0.1)" stroke="#ef4444" stroke-width="1" stroke-dasharray="3 2"/>
                <text x="420" y="328" text-anchor="middle" style="font-size:8px;fill:#ef4444;font-weight:600">⚠ Chronic Stress</text>
                <text x="420" y="342" text-anchor="middle" style="font-size:7px;fill:#fca5a5">Prolonged stress may</text>
                <text x="420" y="354" text-anchor="middle" style="font-size:7px;fill:#fca5a5">alter HPA function and</text>
                <text x="420" y="366" text-anchor="middle" style="font-size:7px;fill:#fca5a5">hippocampal processes</text>
            </svg>`,
            description: '🔴 The HPA axis stress cascade: hypothalamic CRH stimulates pituitary ACTH, which stimulates adrenal-cortex cortisol release; cortisol participates in negative feedback. Prolonged or dysregulated stress-system activity is associated with hippocampal structural and functional changes and greater risk for stress-related disorders, but it does not determine that a person will develop a disorder.'
        },

        // ─── 4. BRAIN REGIONS (Lateral View) ───
        brainRegions: {
            svg: `<svg viewBox="0 0 600 350" xmlns="http://www.w3.org/2000/svg" style="max-width:600px">
                <defs>
                    <filter id="brainGlow"><feGaussianBlur stdDeviation="2" result="blur"/>
                        <feComposite in="SourceGraphic" in2="blur" operator="over"/></filter>
                </defs>
                <text x="300" y="22" text-anchor="middle" class="diagram-label" font-weight="700" font-size="13" fill="#a78bfa">Cerebral Lobes &amp; Selected Landmarks — Left Lateral Schematic</text>
                <text x="70" y="45" class="diagram-label-sm" fill="#94a3b8">← Anterior</text>
                <text x="530" y="45" text-anchor="end" class="diagram-label-sm" fill="#94a3b8">Posterior →</text>
                <!-- Brain outline -->
                <path d="M120 280 Q80 250 70 180 Q65 130 100 90 Q140 50 200 40 Q280 30 360 40 Q440 50 480 80 Q520 110 520 160 Q520 200 490 240 Q460 270 420 290 Q380 300 340 310 Q280 320 220 310 Q160 300 120 280 Z" fill="#1e1b4b" stroke="#4338ca" stroke-width="2"/>
                <!-- Frontal Lobe -->
                <path d="M120 280 Q80 250 70 180 Q65 130 100 90 Q130 60 180 50 L220 200 Q180 260 120 280" fill="#3b82f620" stroke="#3b82f6" stroke-width="1.5" class="diagram-box"/>
                <text x="130" y="155" class="diagram-label" font-weight="600" fill="#60a5fa">Frontal</text>
                <text x="115" y="170" class="diagram-label-sm" fill="#93c5fd">Executive functions,</text>
                <text x="115" y="182" class="diagram-label-sm" fill="#93c5fd">planning, motor control</text>
                <!-- Parietal Lobe -->
                <path d="M180 50 Q250 35 340 42 Q380 60 360 120 L220 200 Z" fill="#8b5cf620" stroke="#8b5cf6" stroke-width="1.5" class="diagram-box"/>
                <text x="270" y="85" class="diagram-label" font-weight="600" fill="#a78bfa">Parietal</text>
                <text x="260" y="100" class="diagram-label-sm" fill="#c4b5fd">Somatosensory &amp;</text>
                <text x="260" y="112" class="diagram-label-sm" fill="#c4b5fd">spatial attention</text>
                <!-- Temporal Lobe -->
                <path d="M220 200 Q280 210 340 200 Q390 220 420 290 Q380 300 340 310 Q280 315 220 310 Q170 295 120 280 Q175 260 220 200" fill="#f59e0b20" stroke="#f59e0b" stroke-width="1.5" class="diagram-box"/>
                <text x="275" y="260" class="diagram-label" font-weight="600" fill="#fbbf24">Temporal</text>
                <text x="265" y="275" class="diagram-label-sm" fill="#fde68a">Auditory processing;</text>
                <text x="265" y="287" class="diagram-label-sm" fill="#fde68a">memory/language networks</text>
                <!-- Occipital Lobe -->
                <path d="M360 120 Q380 60 480 80 Q520 110 520 160 Q520 200 490 240 Q460 270 420 290 Q390 220 340 200 Q330 160 360 120" fill="#22c55e20" stroke="#22c55e" stroke-width="1.5" class="diagram-box"/>
                <text x="460" y="155" class="diagram-label" font-weight="600" fill="#6ee7b7">Occipital</text>
                <text x="445" y="170" class="diagram-label-sm" fill="#86efac">Visual</text>
                <text x="445" y="182" class="diagram-label-sm" fill="#86efac">processing</text>
                <!-- Central Sulcus label -->
                <line x1="220" y1="200" x2="180" y2="50" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4 3" opacity="0.4"/>
                <text x="165" y="42" style="font-size:8px;fill:#94a3b8">Central Sulcus ↓</text>
                <!-- Cerebellum -->
                <ellipse cx="490" cy="290" rx="50" ry="35" fill="#ec489920" stroke="#ec4899" stroke-width="1.5" class="diagram-box"/>
                <text x="490" y="287" text-anchor="middle" class="diagram-label-sm" font-weight="600" fill="#f472b6">Cerebellum</text>
                <text x="490" y="300" text-anchor="middle" style="font-size:9px;fill:#f9a8d4">Coordination,</text>
                <text x="490" y="310" text-anchor="middle" style="font-size:9px;fill:#f9a8d4">balance, motor learning</text>
                <!-- Brainstem -->
                <rect x="380" y="310" width="80" height="30" rx="8" fill="#64748b30" stroke="#64748b" stroke-width="1"/>
                <text x="420" y="330" text-anchor="middle" style="font-size:8px;fill:#94a3b8;font-weight:600">Brainstem</text>
                <!-- Key highlight spot — Broca's area -->
                <ellipse cx="148" cy="220" rx="18" ry="12" fill="none" stroke="#f472b6" stroke-width="1.5" stroke-dasharray="3 2"/>
                <text x="100" y="240" style="font-size:9px;fill:#f472b6">Classic Broca</text>
                <text x="100" y="251" style="font-size:9px;fill:#f472b6">region</text>
                <!-- Wernicke's area -->
                <ellipse cx="340" cy="225" rx="22" ry="12" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="3 2"/>
                <text x="365" y="221" style="font-size:9px;fill:#fbbf24">Classic Wernicke</text>
                <text x="365" y="232" style="font-size:9px;fill:#fbbf24">region</text>
            </svg>`,
            description: '🧩 Simplified left lateral view of the four conventionally named cerebral lobes and selected landmarks. The frontal lobe participates in executive and motor functions; the parietal lobe in somatosensory processing and spatial attention; the temporal lobe in auditory, memory, and language networks; and the occipital lobe in visual processing. The central sulcus separates frontal and parietal cortex. The outlined Broca and Wernicke regions are approximate, classically named regions in the usually dominant left hemisphere; language depends on a broader connected network whose precise functional locations vary across people. The cerebellum and brainstem are orientation landmarks, not cerebral lobes.'
        },

        // ─── 5. DOPAMINE PATHWAYS ───
        dopaminePathways: {
            svg: `<svg viewBox="0 0 580 300" xmlns="http://www.w3.org/2000/svg" style="max-width:580px">
                <text x="290" y="22" text-anchor="middle" class="diagram-label" font-weight="700" font-size="13" fill="#a78bfa">Four Major Dopamine Pathways</text>
                <!-- Brain outline simplified -->
                <path d="M100 260 Q60 220 55 160 Q55 100 90 70 Q130 40 200 35 Q300 28 380 35 Q450 42 480 70 Q510 100 510 160 Q510 220 480 260 Q440 290 380 295 Q300 300 200 295 Q140 290 100 260 Z" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
                <!-- VTA (source) -->
                <ellipse cx="270" cy="230" rx="30" ry="18" fill="#7c3aed" stroke="#a78bfa" stroke-width="2" class="diagram-glow"/>
                <text x="270" y="234" text-anchor="middle" class="diagram-label-sm" font-weight="600" fill="#e9d5ff">VTA</text>
                <!-- Substantia Nigra -->
                <ellipse cx="210" cy="240" rx="28" ry="14" fill="#4338ca" stroke="#818cf8" stroke-width="1.5"/>
                <text x="210" y="244" text-anchor="middle" style="font-size:7px;fill:#c4b5fd;font-weight:600">Subst. Nigra</text>
                <!-- PFC target -->
                <ellipse cx="150" cy="90" rx="40" ry="22" fill="#3b82f620" stroke="#3b82f6" stroke-width="1.5" class="diagram-box"/>
                <text x="150" y="87" text-anchor="middle" class="diagram-label-sm" font-weight="600" fill="#60a5fa">Prefrontal</text>
                <text x="150" y="98" text-anchor="middle" style="font-size:7px;fill:#93c5fd">Cortex</text>
                <!-- Nucleus Accumbens target -->
                <ellipse cx="350" cy="155" rx="35" ry="20" fill="#22c55e20" stroke="#22c55e" stroke-width="1.5" class="diagram-box"/>
                <text x="350" y="153" text-anchor="middle" class="diagram-label-sm" font-weight="600" fill="#6ee7b7">Nucleus</text>
                <text x="350" y="164" text-anchor="middle" style="font-size:7px;fill:#86efac">Accumbens</text>
                <!-- Caudate/Putamen target -->
                <ellipse cx="300" cy="105" rx="38" ry="20" fill="#f59e0b20" stroke="#f59e0b" stroke-width="1.5" class="diagram-box"/>
                <text x="300" y="103" text-anchor="middle" class="diagram-label-sm" font-weight="600" fill="#fbbf24">Caudate/</text>
                <text x="300" y="114" text-anchor="middle" style="font-size:7px;fill:#fde68a">Putamen</text>
                <!-- Pituitary target -->
                <ellipse cx="270" cy="270" rx="22" ry="12" fill="#ec489920" stroke="#ec4899" stroke-width="1"/>
                <text x="270" y="274" text-anchor="middle" style="font-size:7px;fill:#f472b6">Pituitary</text>
                <!-- Pathway 1: Mesocortical (VTA → PFC) -->
                <path d="M255 215 Q200 160 155 112" stroke="#3b82f6" stroke-width="2" fill="none" class="diagram-signal-flow"/>
                <!-- Pathway 2: Mesolimbic (VTA → NAc) -->
                <path d="M290 220 Q330 190 345 175" stroke="#22c55e" stroke-width="2" fill="none" class="diagram-signal-flow"/>
                <!-- Pathway 3: Nigrostriatal (SN → Caudate) -->
                <path d="M215 226 Q250 160 295 125" stroke="#f59e0b" stroke-width="2" fill="none" class="diagram-signal-flow"/>
                <!-- Pathway 4: Tuberoinfundibular (Hypothalamus → Pituitary) -->
                <line x1="270" y1="248" x2="270" y2="258" stroke="#ec4899" stroke-width="1.5" class="diagram-signal-flow"/>
                <!-- Labels on right -->
                <g transform="translate(430,60)">
                    <rect x="0" y="0" width="10" height="10" rx="3" fill="#3b82f6"/>
                    <text x="16" y="9" style="font-size:9px;fill:#60a5fa;font-weight:600">Mesocortical</text>
                    <text x="16" y="20" style="font-size:7px;fill:#93c5fd">Cognition, neg. symptoms</text>
                    <rect x="0" y="30" width="10" height="10" rx="3" fill="#22c55e"/>
                    <text x="16" y="39" style="font-size:9px;fill:#6ee7b7;font-weight:600">Mesolimbic</text>
                    <text x="16" y="50" style="font-size:7px;fill:#86efac">Reward, pos. symptoms</text>
                    <rect x="0" y="60" width="10" height="10" rx="3" fill="#f59e0b"/>
                    <text x="16" y="69" style="font-size:9px;fill:#fbbf24;font-weight:600">Nigrostriatal</text>
                    <text x="16" y="80" style="font-size:7px;fill:#fde68a">Movement (Parkinson's)</text>
                    <rect x="0" y="90" width="10" height="10" rx="3" fill="#ec4899"/>
                    <text x="16" y="99" style="font-size:9px;fill:#f472b6;font-weight:600">Tuberoinfundibular</text>
                    <text x="16" y="110" style="font-size:7px;fill:#f9a8d4">Prolactin regulation</text>
                </g>
            </svg>`,
            description: '🧬 The four dopamine pathways: Mesocortical (VTA→PFC, cognition), Mesolimbic (VTA→NAc, reward/psychosis), Nigrostriatal (SN→Caudate, movement), Tuberoinfundibular (hypothalamus→pituitary, prolactin). Flowing dashes show signal direction.'
        },

        // ─── 6. ERIKSON'S PSYCHOSOCIAL STAGES ───
        eriksonStages: {
            svg: `<svg viewBox="0 0 700 220" xmlns="http://www.w3.org/2000/svg" style="max-width:700px">
                <text x="350" y="18" text-anchor="middle" class="diagram-label" font-weight="700" font-size="12" fill="#a78bfa">Erikson's Eight-Stage Psychosocial Theory</text>
                ${[
                    {age:'Infancy',crisis:'Trust vs.\nMistrust',color:'#ef4444',virtue:'Hope'},
                    {age:'Early Childhood',crisis:'Autonomy vs.\nShame &amp; Doubt',color:'#f59e0b',virtue:'Will'},
                    {age:'Play Age',crisis:'Initiative vs.\nGuilt',color:'#eab308',virtue:'Purpose'},
                    {age:'School Age',crisis:'Industry vs.\nInferiority',color:'#22c55e',virtue:'Competence'},
                    {age:'Adolescence',crisis:'Identity vs.\nRole Confusion',color:'#06b6d4',virtue:'Fidelity'},
                    {age:'Young Adulthood',crisis:'Intimacy vs.\nIsolation',color:'#3b82f6',virtue:'Love'},
                    {age:'Adulthood',crisis:'Generativity vs.\nStagnation',color:'#8b5cf6',virtue:'Care'},
                    {age:'Later Adulthood',crisis:'Integrity vs.\nDespair',color:'#a855f7',virtue:'Wisdom'}
                ].map((s,i) => {
                    const x = 20 + i * 84;
                    const lines = s.crisis.split('\\n');
                    return '<g class="diagram-box">' +
                        '<rect x="' + x + '" y="30" width="78" height="120" rx="8" fill="' + s.color + '15" stroke="' + s.color + '" stroke-width="1.5"/>' +
                        '<text x="' + (x+39) + '" y="48" text-anchor="middle" style="font-size:8px;fill:' + s.color + ';font-weight:700">' + s.age + '</text>' +
                        '<text x="' + (x+39) + '" y="70" text-anchor="middle" style="font-size:8px;fill:#e2e8f0;font-weight:600">' + lines[0] + '</text>' +
                        (lines[1] ? '<text x="' + (x+39) + '" y="82" text-anchor="middle" style="font-size:8px;fill:#e2e8f0;font-weight:600">' + lines[1] + '</text>' : '') +
                        '<text x="' + (x+39) + '" y="110" text-anchor="middle" style="font-size:9px;fill:#94a3b8">Ego strength:</text>' +
                        '<text x="' + (x+39) + '" y="123" text-anchor="middle" style="font-size:9px;fill:' + s.color + ';font-weight:600">' + s.virtue + '</text>' +
                        (i < 7 ? '<line x1="' + (x+78) + '" y1="90" x2="' + (x+84) + '" y2="90" stroke="#4b5563" stroke-width="1"/>' : '') +
                        '</g>';
                }).join('')}
                <!-- Lifespan arrow -->
                <line x1="20" y1="165" x2="690" y2="165" stroke="#4b5563" stroke-width="1.5"/>
                <text x="20" y="180" style="font-size:8px;fill:#94a3b8">Earlier life</text>
                <text x="660" y="180" style="font-size:8px;fill:#94a3b8">Later life</text>
                <text x="350" y="195" text-anchor="middle" style="font-size:9px;fill:#6ee7b7">Proposed sequence; conflicts may be revisited across life</text>
                <!-- Motion removed: the theory does not prescribe one fixed developmental timetable. -->
            </svg>`,
            description: '📊 Erikson’s classic theory proposes eight psychosocial tensions and associated ego strengths: trust versus mistrust—hope; autonomy versus shame and doubt—will; initiative versus guilt—purpose; industry versus inferiority—competence; identity versus role confusion—fidelity; intimacy versus isolation—love; generativity versus stagnation—care; and integrity versus despair—wisdom. The life periods are approximate teaching conventions, not rigid deadlines; within the theory, earlier conflicts can be revisited across the lifespan. This is a developmental framework, not a universal timetable.'
        },

        // ─── 7. DIFFERENTIAL DIAGNOSIS FLOWCHART ───
        differentialDx: {
            svg: `<svg viewBox="0 0 500 340" xmlns="http://www.w3.org/2000/svg" style="max-width:500px">
                <defs>
                    <marker id="ddArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                        <path d="M0 0 L10 5 L0 10 z" fill="#818cf8"/>
                    </marker>
                </defs>
                <text x="250" y="22" text-anchor="middle" class="diagram-label" font-weight="700" font-size="13" fill="#a78bfa">Differential Diagnosis Hierarchy</text>
                <!-- Step 1 -->
                <rect x="150" y="35" width="200" height="38" rx="8" fill="#1e1b4b" stroke="#ef4444" stroke-width="1.5" class="diagram-box"/>
                <text x="170" y="50" class="diagram-label-sm" fill="#ef4444" font-weight="700">1.</text>
                <text x="185" y="50" class="diagram-label-sm" fill="#e2e8f0">Rule out Malingering /</text>
                <text x="185" y="63" class="diagram-label-sm" fill="#e2e8f0">Factitious Disorder</text>
                <line x1="250" y1="73" x2="250" y2="90" stroke="#818cf8" stroke-width="1.5" marker-end="url(#ddArrow)"/>
                <!-- Step 2 -->
                <rect x="150" y="90" width="200" height="38" rx="8" fill="#1e1b4b" stroke="#f59e0b" stroke-width="1.5" class="diagram-box"/>
                <text x="170" y="105" class="diagram-label-sm" fill="#f59e0b" font-weight="700">2.</text>
                <text x="185" y="105" class="diagram-label-sm" fill="#e2e8f0">Rule out Substance/</text>
                <text x="185" y="118" class="diagram-label-sm" fill="#e2e8f0">Medication-Induced</text>
                <line x1="250" y1="128" x2="250" y2="145" stroke="#818cf8" stroke-width="1.5" marker-end="url(#ddArrow)"/>
                <!-- Step 3 -->
                <rect x="150" y="145" width="200" height="38" rx="8" fill="#1e1b4b" stroke="#eab308" stroke-width="1.5" class="diagram-box"/>
                <text x="170" y="160" class="diagram-label-sm" fill="#eab308" font-weight="700">3.</text>
                <text x="185" y="160" class="diagram-label-sm" fill="#e2e8f0">Rule out General</text>
                <text x="185" y="173" class="diagram-label-sm" fill="#e2e8f0">Medical Condition</text>
                <line x1="250" y1="183" x2="250" y2="200" stroke="#818cf8" stroke-width="1.5" marker-end="url(#ddArrow)"/>
                <!-- Step 4 -->
                <rect x="150" y="200" width="200" height="38" rx="8" fill="#1e1b4b" stroke="#22c55e" stroke-width="1.5" class="diagram-box diagram-glow" style="animation-duration:4s"/>
                <text x="170" y="215" class="diagram-label-sm" fill="#22c55e" font-weight="700">4.</text>
                <text x="185" y="215" class="diagram-label-sm" fill="#e2e8f0">Determine Specific</text>
                <text x="185" y="228" class="diagram-label-sm" fill="#e2e8f0">Primary Disorder</text>
                <line x1="250" y1="238" x2="250" y2="255" stroke="#818cf8" stroke-width="1.5" marker-end="url(#ddArrow)"/>
                <!-- Step 5 -->
                <rect x="150" y="255" width="200" height="38" rx="8" fill="#1e1b4b" stroke="#3b82f6" stroke-width="1.5" class="diagram-box"/>
                <text x="170" y="270" class="diagram-label-sm" fill="#3b82f6" font-weight="700">5.</text>
                <text x="185" y="270" class="diagram-label-sm" fill="#e2e8f0">Assess for</text>
                <text x="185" y="283" class="diagram-label-sm" fill="#e2e8f0">Comorbidity</text>
                <!-- Animated scanning indicator -->
                <rect x="145" y="35" width="210" height="38" rx="8" fill="none" stroke="#6ee7b7" stroke-width="2" opacity="0.6">
                    <animate attributeName="y" values="35;90;145;200;255;255;35" dur="5s" repeatCount="indefinite"/>
                </rect>
                <!-- Side notes -->
                <text x="370" y="58" style="font-size:7px;fill:#ef4444;font-style:italic">Is it genuine?</text>
                <text x="370" y="113" style="font-size:7px;fill:#f59e0b;font-style:italic">Substances causing it?</text>
                <text x="370" y="168" style="font-size:7px;fill:#eab308;font-style:italic">Medical cause?</text>
                <text x="370" y="223" style="font-size:7px;fill:#22c55e;font-style:italic">Apply DSM criteria</text>
                <text x="370" y="278" style="font-size:7px;fill:#3b82f6;font-style:italic">Multiple disorders?</text>
                <!-- Result arrow -->
                <line x1="250" y1="293" x2="250" y2="320" stroke="#6ee7b7" stroke-width="2" marker-end="url(#ddArrow)"/>
                <text x="250" y="335" text-anchor="middle" class="diagram-label" fill="#6ee7b7" font-weight="600">✓ Diagnosis + Specifiers</text>
            </svg>`,
            description: '📋 The 5-step differential diagnosis hierarchy: always rule out malingering, substances, and medical conditions BEFORE determining the primary mental disorder. The green scanner shows the systematic evaluation process.'
        },

        // ─── 8. NORMAL DISTRIBUTION CURVE (Ch 6 / Research & Stats) ───
        normalDistribution: {
            svg: `<svg viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg" style="max-width:600px">
                <defs>
                    <linearGradient id="bellGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.6"/>
                        <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.1"/>
                    </linearGradient>
                    <linearGradient id="highlightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#22c55e" stop-opacity="0.8"/>
                        <stop offset="100%" stop-color="#22c55e" stop-opacity="0.2"/>
                    </linearGradient>
                </defs>
                <text x="300" y="25" text-anchor="middle" class="diagram-label" font-weight="700" font-size="14" fill="#a78bfa">The Normal Distribution (Bell Curve)</text>
                
                <!-- The Bell Curve Path -->
                <path d="M 20 250 L 580 250 L 580 248 Q 500 248, 440 200 Q 370 110, 300 60 Q 230 110, 160 200 Q 100 248, 20 248 Z" fill="url(#bellGrad)" stroke="#a78bfa" stroke-width="2"/>
                
                <!-- Highlighting 68% Area (±1 SD) -->
                <clipPath id="sd1Clip">
                    <rect x="230" y="50" width="140" height="200" />
                </clipPath>
                <path d="M 20 250 L 580 250 L 580 248 Q 500 248, 440 200 Q 370 110, 300 60 Q 230 110, 160 200 Q 100 248, 20 248 Z" fill="url(#highlightGrad)" clip-path="url(#sd1Clip)" class="diagram-fade-pulse" style="animation-duration: 4s"/>
                
                <!-- Base Axis -->
                <line x1="20" y1="250" x2="580" y2="250" stroke="#e2e8f0" stroke-width="2"/>
                
                <!-- Vertical Lines & Labels -->
                <g style="font-size:10px; fill:#94a3b8; text-anchor:middle;">
                    <!-- Mean (0 SD) -->
                    <line x1="300" y1="60" x2="300" y2="255" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="4 2"/>
                    <text x="300" y="270" fill="#e2e8f0" font-weight="bold">Mean (0)</text>
                    <text x="300" y="285">IQ: 100 / T: 50</text>
                    
                    <!-- +1 SD -->
                    <line x1="370" y1="120" x2="370" y2="255" stroke="#94a3b8" stroke-width="1" stroke-dasharray="2 2"/>
                    <text x="370" y="270">+1 SD</text>
                    <text x="370" y="285">IQ: 115</text>
                    
                    <!-- +2 SD -->
                    <line x1="440" y1="200" x2="440" y2="255" stroke="#64748b" stroke-width="1" stroke-dasharray="2 2"/>
                    <text x="440" y="270">+2 SD</text>
                    <text x="440" y="285">IQ: 130</text>
                    
                    <!-- +3 SD -->
                    <line x1="510" y1="237" x2="510" y2="255" stroke="#475569" stroke-width="1" stroke-dasharray="2 2"/>
                    <text x="510" y="270">+3 SD</text>
                    <text x="510" y="285">IQ: 145</text>
                    
                    <!-- -1 SD -->
                    <line x1="230" y1="120" x2="230" y2="255" stroke="#94a3b8" stroke-width="1" stroke-dasharray="2 2"/>
                    <text x="230" y="270">-1 SD</text>
                    <text x="230" y="285">IQ: 85</text>
                    
                    <!-- -2 SD -->
                    <line x1="160" y1="200" x2="160" y2="255" stroke="#64748b" stroke-width="1" stroke-dasharray="2 2"/>
                    <text x="160" y="270">-2 SD</text>
                    <text x="160" y="285">IQ: 70</text>
                    
                    <!-- -3 SD -->
                    <line x1="90" y1="237" x2="90" y2="255" stroke="#475569" stroke-width="1" stroke-dasharray="2 2"/>
                    <text x="90" y="270">-3 SD</text>
                    <text x="90" y="285">IQ: 55</text>
                </g>
                
                <!-- Percentages -->
                <g style="font-size:12px; fill:#e2e8f0; text-anchor:middle; font-weight:bold;">
                    <text x="265" y="180">34.13%</text>
                    <text x="335" y="180">34.13%</text>
                    <text x="195" y="225">13.59%</text>
                    <text x="405" y="225">13.59%</text>
                    <text x="125" y="240" font-size="9">2.14%</text>
                    <text x="475" y="240" font-size="9">2.14%</text>
                </g>
                
                <!-- 68-95-99.7 Rule Labels -->
                <path d="M 230 100 L 230 90 L 370 90 L 370 100" fill="none" stroke="#22c55e" stroke-width="1.5"/>
                <text x="300" y="85" text-anchor="middle" fill="#22c55e" font-size="11" font-weight="bold">68.26% (±1 SD)</text>
                
                <path d="M 160 170 L 160 160 L 440 160 L 440 170" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3 3"/>
                <text x="300" y="155" text-anchor="middle" fill="#f59e0b" font-size="11">95.44% (±2 SD)</text>
            </svg>`,
            description: '📊 The Normal Distribution (Bell Curve). Shows the 68-95-99.7 rule. 1 Standard Deviation (±1 SD) contains ~68% of the population. 2 SDs contain ~95%. The green pulsing area highlights the 68% between -1 and +1 SD.'
        },

        // ─── 9. OPERANT CONDITIONING QUADRANTS (Ch 12 / Learning) ───
        operantConditioning: {
            svg: `<svg viewBox="0 0 600 420" xmlns="http://www.w3.org/2000/svg" style="max-width:600px">
                <text x="300" y="25" text-anchor="middle" class="diagram-label" font-weight="700" font-size="14" fill="#a78bfa">Four Operant-Consequence Contingencies</text>
                
                <!-- Matrix Background -->
                <rect x="150" y="80" width="400" height="300" fill="none" stroke="#334155" stroke-width="2" rx="8"/>
                <line x1="350" y1="80" x2="350" y2="380" stroke="#334155" stroke-width="2"/>
                <line x1="150" y1="230" x2="550" y2="230" stroke="#334155" stroke-width="2"/>
                
                <!-- Row/Col Headers -->
                <text x="250" y="65" text-anchor="middle" font-weight="bold" fill="#6ee7b7" font-size="13">PRESENT / ADD (positive +)</text>
                <text x="450" y="65" text-anchor="middle" font-weight="bold" fill="#ef4444" font-size="13">WITHDRAW / REMOVE (negative −)</text>
                
                <!-- Vertical Headers (rotated) -->
                <g transform="translate(130, 155)">
                    <text x="0" y="0" text-anchor="middle" transform="rotate(-90)" font-weight="bold" fill="#3b82f6" font-size="13">REINFORCEMENT</text>
                    <text x="0" y="15" text-anchor="middle" transform="rotate(-90)" font-size="10" fill="#93c5fd">(Future behavior increases)</text>
                </g>
                <g transform="translate(130, 305)">
                    <text x="0" y="0" text-anchor="middle" transform="rotate(-90)" font-weight="bold" fill="#f59e0b" font-size="13">PUNISHMENT</text>
                    <text x="0" y="15" text-anchor="middle" transform="rotate(-90)" font-size="10" fill="#fde68a">(Future behavior decreases)</text>
                </g>

                <!-- Q1: Positive Reinforcement -->
                <g transform="translate(150, 80)">
                    <rect x="5" y="5" width="190" height="140" fill="#3b82f615" rx="4" class="diagram-box"/>
                    <text x="100" y="30" text-anchor="middle" font-weight="bold" fill="#60a5fa" font-size="12">Positive Reinforcement</text>
                    <text x="100" y="50" text-anchor="middle" fill="#e2e8f0" font-size="10">Present a stimulus after behavior;</text>
                    <text x="100" y="62" text-anchor="middle" fill="#e2e8f0" font-size="10">that behavior later INCREASES.</text>
                    <rect x="20" y="75" width="160" height="60" fill="#0f172a" stroke="#60a5fa" rx="4"/>
                    <text x="100" y="95" text-anchor="middle" fill="#93c5fd" font-size="10">Ex: Cookie follows room cleaning;</text>
                    <text x="100" y="107" text-anchor="middle" fill="#93c5fd" font-size="10">later room cleaning increases.</text>
                    <text x="100" y="125" text-anchor="middle" fill="#22c55e" font-weight="bold" font-size="10">Future behavior ↑</text>
                </g>

                <!-- Q2: Negative Reinforcement -->
                <g transform="translate(350, 80)">
                    <rect x="5" y="5" width="190" height="140" fill="#22c55e15" rx="4" class="diagram-box"/>
                    <text x="100" y="30" text-anchor="middle" font-weight="bold" fill="#4ade80" font-size="12">Negative Reinforcement</text>
                    <text x="100" y="50" text-anchor="middle" fill="#e2e8f0" font-size="10">Remove a stimulus after behavior;</text>
                    <text x="100" y="62" text-anchor="middle" fill="#e2e8f0" font-size="10">that behavior later INCREASES.</text>
                    <rect x="20" y="75" width="160" height="60" fill="#0f172a" stroke="#4ade80" rx="4"/>
                    <text x="100" y="95" text-anchor="middle" fill="#86efac" font-size="10">Ex: Buckling stops a warning tone;</text>
                    <text x="100" y="107" text-anchor="middle" fill="#86efac" font-size="10">later buckling increases.</text>
                    <text x="100" y="125" text-anchor="middle" fill="#22c55e" font-weight="bold" font-size="10">Future behavior ↑</text>
                </g>

                <!-- Q3: Positive Punishment -->
                <g transform="translate(150, 230)">
                    <rect x="5" y="5" width="190" height="140" fill="#f59e0b15" rx="4" class="diagram-box"/>
                    <text x="100" y="30" text-anchor="middle" font-weight="bold" fill="#fbbf24" font-size="12">Positive Punishment</text>
                    <text x="100" y="50" text-anchor="middle" fill="#e2e8f0" font-size="10">Present a stimulus after behavior;</text>
                    <text x="100" y="62" text-anchor="middle" fill="#e2e8f0" font-size="10">that behavior later DECREASES.</text>
                    <rect x="20" y="75" width="160" height="60" fill="#0f172a" stroke="#fbbf24" rx="4"/>
                    <text x="100" y="95" text-anchor="middle" fill="#fde68a" font-size="10">Ex: Ticket follows speeding;</text>
                    <text x="100" y="107" text-anchor="middle" fill="#fde68a" font-size="10">later speeding decreases.</text>
                    <text x="100" y="125" text-anchor="middle" fill="#ef4444" font-weight="bold" font-size="10">Future behavior ↓</text>
                </g>

                <!-- Q4: Negative Punishment -->
                <g transform="translate(350, 230)">
                    <rect x="5" y="5" width="190" height="140" fill="#ef444415" rx="4" class="diagram-box"/>
                    <text x="100" y="30" text-anchor="middle" font-weight="bold" fill="#f87171" font-size="12">Negative Punishment</text>
                    <text x="100" y="50" text-anchor="middle" fill="#e2e8f0" font-size="10">Remove a stimulus after behavior;</text>
                    <text x="100" y="62" text-anchor="middle" fill="#e2e8f0" font-size="10">that behavior later DECREASES.</text>
                    <rect x="20" y="75" width="160" height="60" fill="#0f172a" stroke="#f87171" rx="4"/>
                    <text x="100" y="95" text-anchor="middle" fill="#fca5a5" font-size="10">Ex: Phone access is removed after</text>
                    <text x="100" y="107" text-anchor="middle" fill="#fca5a5" font-size="10">curfew-breaking; it later decreases.</text>
                    <text x="100" y="125" text-anchor="middle" fill="#ef4444" font-weight="bold" font-size="10">Future behavior ↓</text>
                </g>
                
                <!-- No contingency is visually privileged; classification depends on the observed future effect. -->
            </svg>`,
            description: '🐀 Operant consequences are classified on two axes. Positive means a stimulus is presented; negative means a stimulus is removed. Reinforcement means the target behavior becomes more likely in similar future conditions; punishment means it becomes less likely. Thus the four standard contingencies are positive reinforcement (present; behavior increases), negative reinforcement (remove; behavior increases), positive punishment (present; behavior decreases), and negative punishment (remove; behavior decreases). A consequence is classified by its observed effect on future behavior—not by whether someone intended it as a reward or penalty or assumed it was desirable or aversive.'
        },

        // ─── 10. PIAGET'S STAGES OF COGNITIVE DEVELOPMENT ───
        piagetStages: {
            svg: `<svg viewBox="0 0 600 320" xmlns="http://www.w3.org/2000/svg" style="max-width:600px">
                <text x="300" y="25" text-anchor="middle" class="diagram-label" font-weight="700" font-size="14" fill="#a78bfa">Piaget's Stages of Cognitive Development</text>
                
                <!-- Steps Background -->
                <path d="M 50 280 L 170 280 L 170 210 L 290 210 L 290 140 L 410 140 L 410 70 L 530 70 L 530 280 Z" fill="#1e1b4b" stroke="#334155" stroke-width="2"/>
                
                <!-- Stage 1: Sensorimotor -->
                <g transform="translate(50, 210)">
                    <rect x="5" y="5" width="110" height="65" fill="#3b82f620" stroke="#3b82f6" rx="4" class="diagram-box"/>
                    <text x="60" y="25" text-anchor="middle" font-weight="bold" fill="#60a5fa" font-size="12">Sensorimotor</text>
                    <text x="60" y="40" text-anchor="middle" fill="#e2e8f0" font-size="10">ages 0 - 2</text>
                    <text x="60" y="60" text-anchor="middle" font-weight="bold" fill="#93c5fd" font-size="11">Object Permanence</text>
                </g>

                <!-- Stage 2: Preoperational -->
                <g transform="translate(170, 140)">
                    <rect x="5" y="5" width="110" height="65" fill="#22c55e20" stroke="#22c55e" rx="4" class="diagram-box"/>
                    <text x="60" y="25" text-anchor="middle" font-weight="bold" fill="#4ade80" font-size="12">Preoperational</text>
                    <text x="60" y="40" text-anchor="middle" fill="#e2e8f0" font-size="10">ages 2 - 7</text>
                    <text x="60" y="60" text-anchor="middle" font-weight="bold" fill="#86efac" font-size="11">Egocentrism, Magic</text>
                </g>

                <!-- Stage 3: Concrete Operational -->
                <g transform="translate(290, 70)">
                    <rect x="5" y="5" width="110" height="65" fill="#f59e0b20" stroke="#f59e0b" rx="4" class="diagram-box"/>
                    <text x="60" y="25" text-anchor="middle" font-weight="bold" fill="#fbbf24" font-size="12">Concrete Oper.</text>
                    <text x="60" y="40" text-anchor="middle" fill="#e2e8f0" font-size="10">ages 7 - 11</text>
                    <text x="60" y="60" text-anchor="middle" font-weight="bold" fill="#fde68a" font-size="11">Conservation</text>
                </g>

                <!-- Stage 4: Formal Operational -->
                <g transform="translate(410, 0)">
                    <rect x="5" y="5" width="110" height="65" fill="#ec489920" stroke="#ec4899" rx="4" class="diagram-box"/>
                    <text x="60" y="25" text-anchor="middle" font-weight="bold" fill="#f472b6" font-size="12">Formal Oper.</text>
                    <text x="60" y="40" text-anchor="middle" fill="#e2e8f0" font-size="10">ages 11 - Adult</text>
                    <text x="60" y="60" text-anchor="middle" font-weight="bold" fill="#f9a8d4" font-size="11">Abstract Logic</text>
                </g>
                
                <!-- Animated Child moving up steps -->
                <circle cx="110" cy="200" r="8" fill="#a78bfa">
                    <animate attributeName="cx" values="110; 110; 230; 230; 350; 350; 470; 470" dur="8s" repeatCount="indefinite" calcMode="discrete"/>
                    <animate attributeName="cy" values="200; 130; 130; 60; 60; -10; -10; -10" dur="8s" repeatCount="indefinite" calcMode="discrete"/>
                    <animate attributeName="opacity" values="1; 1; 1; 1; 1; 1; 1; 0" dur="8s" repeatCount="indefinite" />
                </circle>
                
                <!-- Expanded details below -->
                <g transform="translate(60, 230)">
                    <text x="0" y="60" fill="#94a3b8" font-size="10">Key milestones achieved at each distinct developmental stage.</text>
                </g>
            </svg>`,
            description: '👶 Piaget\'s Cognitive Stages: A staircase model. Sensorimotor (learn via senses/movement; achieve Object Permanence). Preoperational (symbols, language; but Egocentric and lacking conservation). Concrete Operational (logical thinking about physical objects; achieve Conservation). Formal Operational (abstract and hypothetical reasoning).'
        },

        // ─── 11. SYNAPTIC TRANSMISSION & DRUG MECHANISMS (Psychopharmacology) ───
        synapseDrugs: {
            svg: `<svg viewBox="0 0 600 380" xmlns="http://www.w3.org/2000/svg" style="max-width:600px">
                <defs>
                    <marker id="drugArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M0 0 L10 5 L0 10 z" fill="#e2e8f0"/>
                    </marker>
                    <filter id="glowSerotonin"><feGaussianBlur stdDeviation="2" result="blur"/><feComposite in="SourceGraphic" in2="blur" operator="over"/></filter>
                </defs>
                <text x="300" y="25" text-anchor="middle" class="diagram-label" font-weight="700" font-size="14" fill="#a78bfa">Selected Antidepressant Mechanisms</text>
                
                <!-- Pre-synaptic neuron top -->
                <path d="M 200 40 L 200 120 Q 200 180, 250 200 Q 300 220, 350 200 Q 400 180, 400 120 L 400 40" fill="#312e81" stroke="#818cf8" stroke-width="2"/>
                <text x="300" y="60" text-anchor="middle" fill="#818cf8" font-weight="bold">Presynaptic Neuron</text>
                
                <!-- Vesicles -->
                <circle cx="260" cy="110" r="20" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="2 2"/>
                <circle cx="340" cy="140" r="20" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="2 2"/>
                
                <!-- Action Potential Arrow -->
                <line x1="300" y1="40" x2="300" y2="80" stroke="#f59e0b" stroke-width="3" marker-end="url(#drugArrow)"/>
                <text x="310" y="70" fill="#f59e0b" font-size="10" font-weight="bold">Action Potential</text>
                
                <!-- Post-synaptic neuron bottom -->
                <path d="M 150 380 L 150 320 Q 150 260, 300 260 Q 450 260, 450 320 L 450 380" fill="#1e1b4b" stroke="#f472b6" stroke-width="2"/>
                <text x="300" y="340" text-anchor="middle" fill="#f472b6" font-weight="bold">Postsynaptic Neuron</text>
                
                <!-- Receptors -->
                <path d="M 250 260 Q 260 270, 270 260" fill="none" stroke="#ec4899" stroke-width="4"/>
                <path d="M 330 260 Q 340 270, 350 260" fill="none" stroke="#ec4899" stroke-width="4"/>
                
                <!-- Neurotransmitters (Serotonin molecules) -->
                <g fill="#22c55e" filter="url(#glowSerotonin)">
                    <!-- In vesicles -->
                    <circle cx="255" cy="105" r="4"/><circle cx="265" cy="115" r="4"/><circle cx="255" cy="115" r="4"/>
                    <circle cx="335" cy="135" r="4"/><circle cx="345" cy="145" r="4"/>
                    
                    <!-- Releasing -->
                    <circle cx="300" cy="205" r="4" class="diagram-fade-pulse"/>
                    <circle cx="280" cy="215" r="4" class="diagram-fade-pulse" style="animation-delay: 0.5s"/>
                    <circle cx="320" cy="225" r="4" class="diagram-fade-pulse" style="animation-delay: 1.0s"/>
                    
                    <!-- At receptors -->
                    <circle cx="260" cy="255" r="4"/>
                    <circle cx="340" cy="255" r="4"/>
                </g>
                
                <!-- Reuptake Pump -->
                <rect x="205" y="140" width="20" height="40" fill="#0f172a" stroke="#3b82f6" stroke-width="2" rx="4"/>
                <path d="M 215 180 Q 215 220, 250 240" fill="none" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="2 2" marker-start="url(#drugArrow)"/>
                
                <!-- DRUG: SSRI Action -->
                <rect x="185" y="130" width="30" height="20" fill="#ef4444" rx="4" class="diagram-glow"/>
                <text x="175" y="120" text-anchor="end" fill="#fca5a5" font-size="11" font-weight="bold">SSRI (e.g., fluoxetine)</text>
                <text x="175" y="135" text-anchor="end" fill="#fca5a5" font-size="9">Inhibits serotonin reuptake</text>
                <line x1="185" y1="140" x2="205" y2="150" stroke="#ef4444" stroke-width="2"/>
                
                <!-- MAO Enzyme -->
                <circle cx="380" cy="165" r="15" fill="#eab30820" stroke="#eab308" stroke-width="2"/>
                <text x="380" y="169" text-anchor="middle" fill="#eab308" font-size="10" font-weight="bold">MAO</text>
                <text x="380" y="189" text-anchor="middle" fill="#fde68a" font-size="8">intracellular</text>
                <!-- Intracellular metabolism of monoamines -->
                <line x1="345" y1="145" x2="365" y2="160" stroke="#fde68a" stroke-width="1" stroke-dasharray="2 2"/>
                
                <!-- DRUG: MAOI Action -->
                <rect x="420" y="155" width="40" height="20" fill="#ef4444" rx="4" class="diagram-glow" style="animation-delay:1s"/>
                <text x="470" y="160" fill="#fca5a5" font-size="11" font-weight="bold">MAOI</text>
                <text x="470" y="175" fill="#fca5a5" font-size="9">Inhibits monoamine metabolism</text>
                <line x1="420" y1="165" x2="395" y2="165" stroke="#ef4444" stroke-width="2"/>
                
                <!-- Summary Text -->
                <rect x="100" y="300" width="400" height="40" fill="none" stroke="#64748b" stroke-width="1" rx="4"/>
                <text x="300" y="315" text-anchor="middle" fill="#e2e8f0" font-size="10">SSRIs inhibit serotonin reuptake at the transporter.</text>
                <text x="300" y="330" text-anchor="middle" fill="#e2e8f0" font-size="10">MAOIs inhibit intracellular metabolism of monoamines.</text>
            </svg>`,
            description: '💊 Selected antidepressant mechanisms. SSRIs inhibit the serotonin transporter and reduce serotonin reuptake. Monoamine oxidase is an intracellular, mitochondrial enzyme; MAOIs inhibit monoamine metabolism. These are distinct acute mechanisms, and therapeutic effects involve downstream adaptations rather than one interchangeable increase in generic “neurotransmitter activity.”'
        },

        // ─── 12. FREUD'S ICEBERG MODEL (Personality Structure) ───
        freudIceberg: {
            svg: `<svg viewBox="0 0 500 400" xmlns="http://www.w3.org/2000/svg" style="max-width:500px">
                <defs>
                    <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#0284c7" stop-opacity="0.6"/>
                        <stop offset="100%" stop-color="#1e3a8a" stop-opacity="0.9"/>
                    </linearGradient>
                    <linearGradient id="iceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#f8fafc"/>
                        <stop offset="100%" stop-color="#94a3b8"/>
                    </linearGradient>
                </defs>
                <text x="250" y="25" text-anchor="middle" class="diagram-label" font-weight="700" font-size="14" fill="#a78bfa">Freud's Historical Model (Iceberg Metaphor)</text>
                
                <!-- Water Surface -->
                <path d="M 0 150 Q 125 140 250 150 T 500 150 L 500 400 L 0 400 Z" fill="url(#waterGrad)" class="diagram-pulse" style="animation-duration: 6s; transform-origin: center bottom;"/>
                <line x1="0" y1="150" x2="500" y2="150" stroke="#7dd3fc" stroke-width="2" stroke-dasharray="8 4" opacity="0.8"/>
                <text x="470" y="145" text-anchor="end" fill="#7dd3fc" font-size="11" font-weight="bold">Water Surface</text>

                <!-- Iceberg -->
                <path d="M 250 50 L 320 150 L 380 320 L 250 380 L 120 320 L 180 150 Z" fill="url(#iceGrad)" stroke="#cbd5e1" stroke-width="2" opacity="0.9"/>

                <!-- Regions of Mind Labels (Left Side) -->
                <g fill="#e2e8f0" font-size="11" font-weight="bold">
                    <text x="100" y="100" text-anchor="end">CONSCIOUS</text>
                    <text x="100" y="115" text-anchor="end" font-size="9" fill="#94a3b8" font-weight="normal">(Thoughts, perceptions)</text>
                    
                    <text x="100" y="180" text-anchor="end">PRECONSCIOUS</text>
                    <text x="100" y="195" text-anchor="end" font-size="9" fill="#94a3b8" font-weight="normal">(Memories, stored knowledge)</text>
                    
                    <text x="100" y="280" text-anchor="end">UNCONSCIOUS</text>
                    <text x="100" y="295" text-anchor="end" font-size="9" fill="#94a3b8" font-weight="normal">(Fears, unacceptable desires,</text>
                    <text x="100" y="307" text-anchor="end" font-size="9" fill="#94a3b8" font-weight="normal">violent motives, traumas)</text>
                </g>

                <!-- Structural Entities (Right Side & On Iceberg) -->
                <!-- EGO -->
                <ellipse cx="250" cy="120" rx="55" ry="30" fill="#3b82f640" stroke="#3b82f6" stroke-width="2" class="diagram-box"/>
                <text x="250" y="117" text-anchor="middle" fill="#1d4ed8" font-weight="bold" font-size="12">EGO</text>
                <text x="250" y="132" text-anchor="middle" fill="#1e40af" font-size="9">Reality Principle</text>
                <line x1="305" y1="120" x2="400" y2="90" stroke="#60a5fa" stroke-width="1.5" stroke-dasharray="3 3"/>
                <text x="405" y="85" fill="#60a5fa" font-size="10">Executive mediator</text>
                <text x="405" y="97" fill="#60a5fa" font-size="10">Spans conscious &</text>
                <text x="405" y="109" fill="#60a5fa" font-size="10">unconscious</text>

                <!-- SUPEREGO -->
                <ellipse cx="310" cy="220" rx="50" ry="60" fill="#a855f740" stroke="#a855f7" stroke-width="2" class="diagram-box"/>
                <text x="310" y="210" text-anchor="middle" fill="#6b21a8" font-weight="bold" font-size="12">SUPEREGO</text>
                <text x="310" y="225" text-anchor="middle" fill="#581c87" font-size="9">Moral Principle</text>
                <line x1="360" y1="220" x2="400" y2="220" stroke="#c084fc" stroke-width="1.5" stroke-dasharray="3 3"/>
                <text x="405" y="215" fill="#c084fc" font-size="10">Internalized ideals</text>
                <text x="405" y="227" fill="#c084fc" font-size="10">and morals</text>

                <!-- ID -->
                <ellipse cx="200" cy="280" rx="60" ry="40" fill="#ef444440" stroke="#ef4444" stroke-width="2" class="diagram-box diagram-glow"/>
                <text x="200" y="275" text-anchor="middle" fill="#b91c1c" font-weight="bold" font-size="14">ID</text>
                <text x="200" y="290" text-anchor="middle" fill="#991b1b" font-size="9">Pleasure Principle</text>
                <text x="200" y="302" text-anchor="middle" fill="#991b1b" font-size="9">(Libido / Thanatos)</text>
                <line x1="260" y1="280" x2="400" y2="300" stroke="#f87171" stroke-width="1.5" stroke-dasharray="3 3"/>
                <text x="405" y="295" fill="#f87171" font-size="10">In Freud’s theory</text>
                <text x="405" y="307" fill="#f87171" font-size="10">Theoretical drives</text>
            </svg>`,
            description: '🧊 Historical theory, not an anatomical map. This teaching metaphor combines Freud’s structural constructs (id, ego, and superego) with the related topographic ideas of conscious, preconscious, and unconscious mental life. It is useful for recognizing Freudian terminology, but these constructs should not be presented as literal brain regions or as conclusions established by modern empirical research.'
        },

        // ─── 13. RELIABILITY VS. VALIDITY (Target Analogy) ───
        reliabilityValidity: {
            svg: `<svg viewBox="0 0 650 270" xmlns="http://www.w3.org/2000/svg" style="max-width:650px">
                <text x="325" y="25" text-anchor="middle" class="diagram-label" font-weight="700" font-size="14" fill="#a78bfa">Target Analogy: Precision, Bias, and Validity</text>
                
                <defs>
                    <g id="rvTarget">
                        <circle cx="0" cy="0" r="45" fill="#1e293b" stroke="#475569" stroke-width="2"/>
                        <circle cx="0" cy="0" r="30" fill="#334155" stroke="#64748b" stroke-width="2"/>
                        <circle cx="0" cy="0" r="15" fill="#ef4444" stroke="#f87171" stroke-width="2" class="diagram-pulse"/>
                        <text x="0" y="5" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold">+</text>
                    </g>
                    <g id="rvHit">
                        <circle cx="0" cy="0" r="4" fill="#fbbf24" stroke="#fff" stroke-width="1"/>
                    </g>
                </defs>

                <!-- TARGET 1: Low Precision; Off Target -->
                <g transform="translate(110, 110)">
                    <use href="#rvTarget"/>
                    <!-- Scattered shots -->
                    <use href="#rvHit" x="-30" y="-20"/>
                    <use href="#rvHit" x="15" y="-35"/>
                    <use href="#rvHit" x="35" y="10"/>
                    <use href="#rvHit" x="-10" y="30"/>
                    <use href="#rvHit" x="-25" y="25"/>
                    <text x="0" y="75" text-anchor="middle" fill="#ef4444" font-weight="bold" font-size="12">Low Precision; Off Target</text>
                    <text x="0" y="90" text-anchor="middle" fill="#94a3b8" font-size="10">Scattered under these replications</text>
                </g>

                <!-- TARGET 2: Reliable but Invalid -->
                <g transform="translate(325, 110)">
                    <use href="#rvTarget"/>
                    <!-- Tightly grouped but off-center -->
                    <use href="#rvHit" x="25" y="-25"/>
                    <use href="#rvHit" x="30" y="-20"/>
                    <use href="#rvHit" x="22" y="-18"/>
                    <use href="#rvHit" x="28" y="-30"/>
                    <use href="#rvHit" x="32" y="-25"/>
                    <text x="0" y="75" text-anchor="middle" fill="#f59e0b" font-weight="bold" font-size="12">High Precision; Biased</text>
                    <text x="0" y="90" text-anchor="middle" fill="#94a3b8" font-size="10">Tight grouping with systematic offset</text>
                </g>

                <!-- TARGET 3: High Precision; Near Target -->
                <g transform="translate(540, 110)">
                    <use href="#rvTarget"/>
                    <!-- Tightly grouped in center -->
                    <use href="#rvHit" x="0" y="-5"/>
                    <use href="#rvHit" x="4" y="2"/>
                    <use href="#rvHit" x="-3" y="4"/>
                    <use href="#rvHit" x="-4" y="-2"/>
                    <use href="#rvHit" x="2" y="-2"/>
                    <text x="0" y="75" text-anchor="middle" fill="#22c55e" font-weight="bold" font-size="12">High Precision; Near Target</text>
                    <text x="0" y="90" text-anchor="middle" fill="#94a3b8" font-size="10">Tight grouping near the reference</text>
                </g>

                <!-- Connecting arrow and rule -->
                <line x1="110" y1="230" x2="540" y2="230" stroke="#a78bfa" stroke-width="2"/>
                <text x="325" y="245" text-anchor="middle" fill="#c4b5fd" font-size="11" font-weight="bold" class="diagram-pulse">Grouping illustrates precision; closeness to center illustrates bias—not validity by itself.</text>
            </svg>`,
            description: '🎯 This target analogy illustrates random versus systematic measurement error. Grouping represents reliability/precision across a defined set of replications; distance from the center represents bias or accuracy in this analogy. Neither feature, by itself, establishes validity. Validity is a unitary, evidence-based judgment about a specified interpretation of scores for a proposed use. Reliable/precise scores can still support an invalid interpretation when systematic error or other evidence undermines that use.'
        },

        // ─── 14. ATKINSON-SHIFFRIN MEMORY MODEL (Cognitive) ───
        memoryModel: {
            svg: `<svg viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg" style="max-width:600px">
                <defs>
                    <marker id="memArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M0 0 L10 5 L0 10 z" fill="#3b82f6"/>
                    </marker>
                    <marker id="rehearsalArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                        <path d="M0 0 L10 5 L0 10 z" fill="#22c55e"/>
                    </marker>
                </defs>
                <text x="300" y="25" text-anchor="middle" class="diagram-label" font-weight="700" font-size="14" fill="#a78bfa">Atkinson–Shiffrin Modal Model of Memory</text>

                <!-- Input -->
                <text x="30" y="145" fill="#f8fafc" font-weight="bold">Input</text>
                <line x1="60" y1="140" x2="100" y2="140" stroke="#3b82f6" stroke-width="3" marker-end="url(#memArrow)"/>

                <!-- Sensory Memory -->
                <rect x="110" y="100" width="100" height="80" fill="#1e1b4b" stroke="#818cf8" stroke-width="2" rx="8" class="diagram-box"/>
                <text x="160" y="130" text-anchor="middle" fill="#818cf8" font-weight="bold">Sensory</text>
                <text x="160" y="145" text-anchor="middle" fill="#818cf8" font-weight="bold">Memory</text>
                <text x="160" y="165" text-anchor="middle" fill="#94a3b8" font-size="9">Brief sensory register</text>
                
                <line x1="160" y1="180" x2="160" y2="240" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 2" marker-end="url(#memArrow)"/>
                <text x="165" y="215" fill="#ef4444" font-size="10">Decay</text>

                <!-- Transfer 1: Attention -->
                <line x1="210" y1="140" x2="290" y2="140" stroke="#3b82f6" stroke-width="3" marker-end="url(#memArrow)" class="diagram-signal-flow"/>
                <rect x="220" y="115" width="60" height="20" fill="#0f172a" stroke="#60a5fa" rx="4"/>
                <text x="250" y="128" text-anchor="middle" fill="#60a5fa" font-size="10" font-weight="bold">Attention</text>

                <!-- Short-Term / Working Memory -->
                <rect x="300" y="100" width="100" height="80" fill="#1e1b4b" stroke="#22c55e" stroke-width="2" rx="8" class="diagram-box diagram-glow"/>
                <text x="350" y="130" text-anchor="middle" fill="#4ade80" font-weight="bold">Short-Term</text>
                <text x="350" y="145" text-anchor="middle" fill="#4ade80" font-weight="bold">Store</text>
                <text x="350" y="165" text-anchor="middle" fill="#94a3b8" font-size="9">Limited, brief holding</text>

                <!-- Maintenance Rehearsal Loop -->
                <path d="M 330 100 Q 350 40 370 100" fill="none" stroke="#22c55e" stroke-width="2" marker-end="url(#rehearsalArrow)"/>
                <text x="350" y="55" text-anchor="middle" fill="#4ade80" font-size="10">Maintenance</text>
                <text x="350" y="68" text-anchor="middle" fill="#4ade80" font-size="10">Rehearsal (Loop)</text>

                <line x1="350" y1="180" x2="350" y2="240" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 2" marker-end="url(#memArrow)"/>
                <text x="355" y="215" fill="#ef4444" font-size="10">Displacement</text>

                <!-- Transfer 2: Encoding / Retrieval -->
                <line x1="400" y1="125" x2="480" y2="125" stroke="#3b82f6" stroke-width="3" marker-end="url(#memArrow)" class="diagram-signal-flow"/>
                <text x="440" y="118" text-anchor="middle" fill="#60a5fa" font-size="10">Encoding ➔</text>
                
                <line x1="480" y1="155" x2="400" y2="155" stroke="#8b5cf6" stroke-width="3" marker-end="url(#memArrow)" style="stroke-dasharray: 4 2;"/>
                <text x="440" y="172" text-anchor="middle" fill="#a78bfa" font-size="10">⬅ Retrieval</text>

                <!-- Long-Term Memory -->
                <rect x="490" y="100" width="100" height="80" fill="#1e1b4b" stroke="#f59e0b" stroke-width="2" rx="8" class="diagram-box"/>
                <text x="540" y="130" text-anchor="middle" fill="#fbbf24" font-weight="bold">Long-Term</text>
                <text x="540" y="145" text-anchor="middle" fill="#fbbf24" font-weight="bold">Memory (LTM)</text>
                <text x="540" y="165" text-anchor="middle" fill="#94a3b8" font-size="9">Large capacity, durable</text>

                <line x1="540" y1="180" x2="540" y2="240" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 2" marker-end="url(#memArrow)"/>
                <text x="545" y="215" fill="#ef4444" font-size="10">Interference /</text>
                <text x="545" y="228" fill="#ef4444" font-size="10">Decay</text>
            </svg>`,
            description: '🧠 The Atkinson–Shiffrin modal model is a historical, simplified framework: sensory registers briefly retain incoming information; attention supports transfer to a limited short-term store; and rehearsal or other control processes can support encoding and retrieval. Long-term storage can be durable but is not guaranteed permanent, and modern working-memory models add processes not shown in this three-store flow.'
        },

        // ─── 15. MASLOW'S HIERARCHY OF NEEDS ───
        maslowHierarchy: {
            svg: `<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" style="max-width:600px">
                <text x="300" y="25" text-anchor="middle" class="diagram-label" font-weight="700" font-size="14" fill="#a78bfa">Maslow's Hierarchy of Needs</text>

                <!-- The Pyramid Polygons -->
                <!-- Base: Physiological -->
                <polygon points="100,340 500,340 450,280 150,280" fill="#ef4444" stroke="#1e293b" stroke-width="3" class="diagram-box"/>
                <text x="300" y="310" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">PHYSIOLOGICAL NEEDS</text>
                <text x="300" y="328" text-anchor="middle" fill="#fee2e2" font-size="10">Food, water, warmth, rest, homeostasis</text>

                <!-- Level 2: Safety -->
                <polygon points="150,280 450,280 400,220 200,220" fill="#f59e0b" stroke="#1e293b" stroke-width="3" class="diagram-box"/>
                <text x="300" y="250" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">SAFETY NEEDS</text>
                <text x="300" y="268" text-anchor="middle" fill="#fef3c7" font-size="10">Security, safety, employment, health</text>

                <!-- Level 3: Love & Belonging -->
                <polygon points="200,220 400,220 350,160 250,160" fill="#22c55e" stroke="#1e293b" stroke-width="3" class="diagram-box"/>
                <text x="300" y="190" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">LOVE & BELONGING</text>
                <text x="300" y="208" text-anchor="middle" fill="#dcfce7" font-size="10">Intimate relationships, friends, family</text>

                <!-- Level 4: Esteem -->
                <polygon points="250,160 350,160 315,100 285,100" fill="#3b82f6" stroke="#1e293b" stroke-width="3" class="diagram-box"/>
                <text x="300" y="130" text-anchor="middle" fill="#fff" font-weight="bold" font-size="13">ESTEEM</text>
                <text x="300" y="148" text-anchor="middle" fill="#dbeafe" font-size="10">Prestige, accomplishment</text>

                <!-- Level 5: Self-Actualization -->
                <polygon points="285,100 315,100 300,50" fill="#8b5cf6" stroke="#1e293b" stroke-width="3" class="diagram-box diagram-pulse"/>
                <text x="300" y="85" text-anchor="middle" fill="#fff" font-weight="bold" font-size="9">SELF-</text>
                <text x="300" y="95" text-anchor="middle" fill="#fff" font-weight="bold" font-size="8">ACTUALIZATION</text>

                <!-- Brackets on the left -->
                <path d="M 80,340 L 60,340 L 60,280 L 80,280" fill="none" stroke="#94a3b8" stroke-width="2"/>
                <path d="M 80,280 L 60,280 L 60,220 L 80,220" fill="none" stroke="#94a3b8" stroke-width="2"/>
                <path d="M 80,220 L 60,220 L 60,160 L 80,160" fill="none" stroke="#94a3b8" stroke-width="2"/>
                <path d="M 80,160 L 60,160 L 60,100 L 80,100" fill="none" stroke="#94a3b8" stroke-width="2"/>
                <!-- Vertical combine line -->
                <line x1="60" y1="340" x2="60" y2="100" stroke="#94a3b8" stroke-width="2"/>
                <line x1="60" y1="220" x2="40" y2="220" stroke="#94a3b8" stroke-width="2"/>
                <text x="35" y="220" text-anchor="end" fill="#94a3b8" font-size="11" transform="rotate(-90, 35, 220)">Deficiency Needs (D-Needs)</text>

                <path d="M 80,100 L 60,100 L 60,50 L 80,50" fill="none" stroke="#c084fc" stroke-width="2"/>
                <line x1="60" y1="75" x2="40" y2="75" stroke="#c084fc" stroke-width="2"/>
                <text x="35" y="75" text-anchor="end" fill="#c084fc" font-size="11" transform="rotate(-90, 35, 75)">Growth/B-Needs</text>
            </svg>`,
            description: '🔺 Maslow\'s Hierarchy of Needs. Lower four levels are Deficiency Needs (D-Needs) — motivated by lack. The top level, Self-Actualization, is a Being Need (B-Need) — achieving one\'s full potential.'
        },

        // ─── 16. THE VISUAL PATHWAY (Biopsychology) ───
        visualPathway: {
            svg: `<svg viewBox="0 0 500 450" xmlns="http://www.w3.org/2000/svg" style="max-width:500px">
                <defs>
                    <marker id="vpArrowLeft" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M0 0 L10 5 L0 10 z" fill="#3b82f6"/>
                    </marker>
                    <marker id="vpArrowRight" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M0 0 L10 5 L0 10 z" fill="#ef4444"/>
                    </marker>
                </defs>
                <text x="250" y="25" text-anchor="middle" class="diagram-label" font-weight="700" font-size="14" fill="#a78bfa">The Visual Pathway & Contralateral Processing</text>

                <!-- Visual Fields -->
                <text x="150" y="70" text-anchor="middle" fill="#93c5fd" font-weight="bold">Left Visual Field</text>
                <text x="350" y="70" text-anchor="middle" fill="#fca5a5" font-weight="bold">Right Visual Field</text>
                
                <!-- Light rays -->
                <path d="M 150 80 L 190 140" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4 2"/>
                <path d="M 150 80 L 310 140" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4 2"/>
                <path d="M 350 80 L 190 140" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 2"/>
                <path d="M 350 80 L 310 140" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 2"/>

                <!-- Eyes -->
                <ellipse cx="170" cy="160" rx="30" ry="20" fill="none" stroke="#cbd5e1" stroke-width="2"/>
                <text x="120" y="165" text-anchor="end" fill="#e2e8f0" font-size="12">Left Eye</text>
                <!-- Retinas -->
                <path d="M 145 150 Q 140 160 145 170" fill="none" stroke="#ef4444" stroke-width="4"/> <!-- Temporal Left (RVF) -->
                <path d="M 195 150 Q 200 160 195 170" fill="none" stroke="#3b82f6" stroke-width="4"/> <!-- Nasal Left (LVF) -->
                
                <ellipse cx="330" cy="160" rx="30" ry="20" fill="none" stroke="#cbd5e1" stroke-width="2"/>
                <text x="380" y="165" fill="#e2e8f0" font-size="12">Right Eye</text>
                
                <path d="M 305 150 Q 300 160 305 170" fill="none" stroke="#ef4444" stroke-width="4"/> <!-- Nasal Right (RVF) -->
                <path d="M 355 150 Q 360 160 355 170" fill="none" stroke="#3b82f6" stroke-width="4"/> <!-- Temporal Right (LVF) -->

                <!-- Optic Nerves -->
                <path d="M 155 175 Q 165 210 200 240" fill="none" stroke="#ef4444" stroke-width="3" class="diagram-signal-flow"/>
                <path d="M 185 175 Q 195 210 230 240" fill="none" stroke="#3b82f6" stroke-width="3" class="diagram-signal-flow"/>
                <path d="M 345 175 Q 335 210 300 240" fill="none" stroke="#3b82f6" stroke-width="3" class="diagram-signal-flow"/>
                <path d="M 315 175 Q 305 210 270 240" fill="none" stroke="#ef4444" stroke-width="3" class="diagram-signal-flow"/>
                
                <text x="120" y="210" text-anchor="end" fill="#94a3b8" font-size="11">Optic Nerves</text>

                <!-- Optic Chiasm -->
                <ellipse cx="250" cy="240" rx="40" ry="20" fill="#334155" stroke="#64748b" stroke-width="2"/>
                <text x="250" y="244" text-anchor="middle" fill="#e2e8f0" font-size="10" font-weight="bold">Optic Chiasm</text>
                <path d="M 230 240 Q 250 250 270 260" fill="none" stroke="#3b82f6" stroke-width="3" class="diagram-glow"/>
                <path d="M 270 240 Q 250 250 230 260" fill="none" stroke="#ef4444" stroke-width="3" class="diagram-glow"/>
                <path d="M 200 240 Q 195 250 190 260" fill="none" stroke="#ef4444" stroke-width="3"/>
                <path d="M 300 240 Q 305 250 310 260" fill="none" stroke="#3b82f6" stroke-width="3"/>

                <text x="400" y="244" fill="#a78bfa" font-size="10" class="diagram-pulse">Nasal retinas cross over!</text>

                <!-- Optic Tracts -->
                <path d="M 190 260 Q 160 290 140 330" fill="none" stroke="#ef4444" stroke-width="4" marker-end="url(#vpArrowRight)"/>
                <path d="M 230 260 Q 200 290 160 330" fill="none" stroke="#ef4444" stroke-width="4" marker-end="url(#vpArrowRight)"/>
                <text x="150" y="290" text-anchor="end" fill="#94a3b8" font-size="11">Left Optic Tract</text>
                
                <path d="M 310 260 Q 340 290 360 330" fill="none" stroke="#3b82f6" stroke-width="4" marker-end="url(#vpArrowLeft)"/>
                <path d="M 270 260 Q 300 290 340 330" fill="none" stroke="#3b82f6" stroke-width="4" marker-end="url(#vpArrowLeft)"/>
                <text x="350" y="290" fill="#94a3b8" font-size="11">Right Optic Tract</text>

                <!-- LGN (Thalamus) -->
                <circle cx="150" cy="340" r="18" fill="#7f1d1d" stroke="#ef4444" stroke-width="2" class="diagram-box"/>
                <text x="150" y="344" text-anchor="middle" fill="#fca5a5" font-size="10" font-weight="bold">LGN</text>
                
                <circle cx="350" cy="340" r="18" fill="#1e3a8a" stroke="#3b82f6" stroke-width="2" class="diagram-box"/>
                <text x="350" y="344" text-anchor="middle" fill="#93c5fd" font-size="10" font-weight="bold">LGN</text>
                
                <text x="250" y="344" text-anchor="middle" fill="#94a3b8" font-size="10">Thalamus</text>

                <!-- Optic Radiations to Primary Visual Cortex (V1) -->
                <path d="M 140 360 Q 120 390 130 430" fill="none" stroke="#ef4444" stroke-width="3" stroke-dasharray="2 3"/>
                <path d="M 150 360 L 150 430" fill="none" stroke="#ef4444" stroke-width="3" stroke-dasharray="2 3"/>
                <path d="M 160 360 Q 180 390 170 430" fill="none" stroke="#ef4444" stroke-width="3" stroke-dasharray="2 3"/>
                <rect x="100" y="420" width="100" height="20" fill="#450a0a" stroke="#ef4444" rx="4"/>
                <text x="150" y="434" text-anchor="middle" fill="#fca5a5" font-size="11" font-weight="bold">Left Occipital Lobe</text>
                
                <path d="M 340 360 Q 320 390 330 430" fill="none" stroke="#3b82f6" stroke-width="3" stroke-dasharray="2 3"/>
                <path d="M 350 360 L 350 430" fill="none" stroke="#3b82f6" stroke-width="3" stroke-dasharray="2 3"/>
                <path d="M 360 360 Q 380 390 370 430" fill="none" stroke="#3b82f6" stroke-width="3" stroke-dasharray="2 3"/>
                <rect x="300" y="420" width="100" height="20" fill="#172554" stroke="#3b82f6" rx="4"/>
                <text x="350" y="434" text-anchor="middle" fill="#93c5fd" font-size="11" font-weight="bold">Right Occipital Lobe</text>

            </svg>`,
            description: '👁️ The visual pathway. Information from the left visual hemifield falls on the left nasal retina and right temporal retina. Nasal retinal axons cross at the optic chiasm while temporal retinal axons remain ipsilateral, bringing left-field information into the right postchiasmal pathway; the reverse applies to the right field. Prechiasmal lesions can produce monocular deficits. Postchiasmal lesions produce contralateral homonymous field defects whose extent depends on lesion site and completeness; optic-radiation lesions can produce quadrantanopia rather than loss of an entire hemifield.'
        },

        // ─── 17. COGNITIVE DISSONANCE (Social Psychology) ───
        cognitiveDissonance: {
            svg: `<svg viewBox="0 0 600 350" xmlns="http://www.w3.org/2000/svg" style="max-width:600px">
                <text x="300" y="25" text-anchor="middle" class="diagram-label" font-weight="700" font-size="14" fill="#a78bfa">Festinger's Cognitive Dissonance Theory</text>

                <!-- Stage 1: Conflict -->
                <rect x="50" y="70" width="160" height="150" fill="#1e293b" stroke="#334155" stroke-width="2" rx="8"/>
                <text x="130" y="95" text-anchor="middle" fill="#e2e8f0" font-weight="bold" font-size="12">Stage 1: Inconsistency</text>
                
                <!-- Attitude -->
                <rect x="70" y="110" width="120" height="40" fill="#3b82f640" stroke="#3b82f6" rx="4" class="diagram-box"/>
                <text x="130" y="127" text-anchor="middle" fill="#93c5fd" font-weight="bold" font-size="11">Attitude/Belief</text>
                <text x="130" y="142" text-anchor="middle" fill="#bfdbfe" font-size="9">"Smoking causes cancer"</text>
                
                <!-- Behavior -->
                <rect x="70" y="165" width="120" height="40" fill="#ef444440" stroke="#ef4444" rx="4" class="diagram-box"/>
                <text x="130" y="182" text-anchor="middle" fill="#fca5a5" font-weight="bold" font-size="11">Behavior</text>
                <text x="130" y="197" text-anchor="middle" fill="#fecaca" font-size="9">"I smoke a pack a day"</text>

                <!-- Conflict Lightning -->
                <path d="M 125 155 L 135 155 L 130 165 Z" fill="#fbbf24" class="diagram-pulse"/>

                <!-- Arrow 1 -->
                <path d="M 220 145 L 250 145 L 245 140 M 250 145 L 245 150" fill="none" stroke="#64748b" stroke-width="3"/>

                <!-- Stage 2: Dissonance -->
                <circle cx="300" cy="145" r="45" fill="#ca8a0440" stroke="#ca8a04" stroke-width="3" class="diagram-glow" style="transform-origin: 300px 145px; animation: 0.5s infinite alternate vibrate;"/>
                <text x="300" y="140" text-anchor="middle" fill="#fef08a" font-weight="bold" font-size="12">Cognitive</text>
                <text x="300" y="155" text-anchor="middle" fill="#fef08a" font-weight="bold" font-size="12">Dissonance</text>
                <text x="300" y="210" text-anchor="middle" fill="#fbbf24" font-size="10">(Uncomfortable</text>
                <text x="300" y="222" text-anchor="middle" fill="#fbbf24" font-size="10">psychological tension)</text>

                <!-- Arrow 2 (Splits in two) -->
                <path d="M 355 145 L 390 145" fill="none" stroke="#64748b" stroke-width="3"/>

                <!-- Stage 3: Resolution -->
                <rect x="400" y="70" width="160" height="240" fill="#1e293b" stroke="#334155" stroke-width="2" rx="8"/>
                <text x="480" y="95" text-anchor="middle" fill="#e2e8f0" font-weight="bold" font-size="12">Stage 3: Resolution</text>
                <text x="480" y="110" text-anchor="middle" fill="#94a3b8" font-size="10">(Must restore harmony)</text>

                <!-- Option A -->
                <rect x="415" y="125" width="130" height="50" fill="#22c55e40" stroke="#22c55e" rx="4" class="diagram-box"/>
                <text x="420" y="140" fill="#86efac" font-weight="bold" font-size="10">Option A: Change Behavior</text>
                <line x1="420" y1="145" x2="535" y2="145" stroke="#4ade80" stroke-width="1" stroke-dasharray="2 2"/>
                <text x="480" y="160" text-anchor="middle" fill="#bbf7d0" font-size="10">"I will quit smoking now."</text>

                <text x="480" y="190" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">-- OR --</text>

                <!-- Option B -->
                <rect x="415" y="205" width="130" height="90" fill="#a855f740" stroke="#a855f7" rx="4" class="diagram-box"/>
                <text x="420" y="220" fill="#d8b4fe" font-weight="bold" font-size="10">Option B: Change Attitude /</text>
                <text x="420" y="232" fill="#d8b4fe" font-weight="bold" font-size="10">Add Consonant Cognition</text>
                <line x1="420" y1="237" x2="535" y2="237" stroke="#c084fc" stroke-width="1" stroke-dasharray="2 2"/>
                <text x="480" y="255" text-anchor="middle" fill="#e9d5ff" font-size="10">"The science is flawed."</text>
                <text x="480" y="270" text-anchor="middle" fill="#e9d5ff" font-size="10">"It relieves my stress, which</text>
                <text x="480" y="282" text-anchor="middle" fill="#e9d5ff" font-size="10">is healthier anyway."</text>

                <!-- Vibrate keyframe animation -->
                <style>
                    @keyframes vibrate {
                        0% { transform: scale(1) rotate(-2deg); }
                        100% { transform: scale(1.05) rotate(2deg); }
                    }
                </style>
            </svg>`,
            description: '⚡ Festinger\'s Cognitive Dissonance Theory. When our attitudes and behaviors clash, we experience an uncomfortable tension (dissonance). Because changing behavior (quitting smoking) is often difficult, people frequently resolve the tension by changing their attitude or rationalizing the behavior (e.g., adding a new belief like "smoking lowers my stress").'
        },

        // ─── 18. TYPES OF VALIDITY (Research & Statistics) ───
        typesOfValidity: {
            svg: `<svg viewBox="0 0 650 350" xmlns="http://www.w3.org/2000/svg" style="max-width:650px">
                <text x="325" y="25" text-anchor="middle" class="diagram-label" font-weight="700" font-size="14" fill="#a78bfa">Unified Validity: Sources of Evidence</text>
                
                <!-- Main Umbrella: Construct Validity -->
                <path d="M 225 80 Q 325 30 425 80 L 325 90 Z" fill="#4c1d95" stroke="#8b5cf6" stroke-width="2"/>
                <rect x="315" y="85" width="20" height="200" fill="#4c1d95" stroke="#8b5cf6" stroke-width="2"/>
                <rect x="250" y="50" width="150" height="30" fill="#2e1065" stroke="#a855f7" rx="4"/>
                <text x="325" y="70" text-anchor="middle" fill="#ddd6fe" font-weight="bold" font-size="14">Validity Argument</text>
                <text x="325" y="115" text-anchor="middle" fill="#a78bfa" font-size="11" font-weight="bold" fill-opacity="0.8">Do evidence and theory support</text>
                <text x="325" y="130" text-anchor="middle" fill="#a78bfa" font-size="11" font-weight="bold" fill-opacity="0.8">the intended interpretation and use?</text>
                
                <line x1="335" y1="135" x2="480" y2="150" stroke="#8b5cf6" stroke-width="2" stroke-dasharray="4 2"/>
                <line x1="315" y1="135" x2="170" y2="150" stroke="#8b5cf6" stroke-width="2" stroke-dasharray="4 2"/>

                <!-- Left Branch: Internal Evidence -->
                <rect x="60" y="150" width="220" height="140" fill="#1e293b" stroke="#3b82f6" stroke-width="2" rx="8" class="diagram-box"/>
                <text x="170" y="170" text-anchor="middle" fill="#93c5fd" font-weight="bold" font-size="12">Evidence Within the Assessment</text>
                
                <!-- Content Validity -->
                <rect x="70" y="185" width="200" height="40" fill="#1e3a8a" stroke="#60a5fa" rx="4"/>
                <text x="80" y="202" fill="#bfdbfe" font-weight="bold" font-size="11">Test content:</text>
                <text x="80" y="217" fill="#93c5fd" font-size="10">Does content represent the intended domain?</text>
                
                <!-- Face Validity -->
                <rect x="70" y="235" width="200" height="40" fill="#1e3a8a" stroke="#60a5fa" rx="4"/>
                <text x="80" y="252" fill="#bfdbfe" font-weight="bold" font-size="11">Response processes:</text>
                <text x="80" y="267" fill="#93c5fd" font-size="10">Do responses reflect intended processes?</text>

                <!-- Right Branch: Empirical / Criterion Evidence -->
                <rect x="370" y="150" width="250" height="180" fill="#1e293b" stroke="#22c55e" stroke-width="2" rx="8" class="diagram-box"/>
                <text x="495" y="170" text-anchor="middle" fill="#86efac" font-weight="bold" font-size="12">Structure &amp; External Relations</text>
                
                <!-- Concurrent -->
                <rect x="380" y="185" width="230" height="40" fill="#14532d" stroke="#4ade80" rx="4"/>
                <text x="390" y="202" fill="#bbf7d0" font-weight="bold" font-size="11">Internal structure:</text>
                <text x="390" y="217" fill="#86efac" font-size="10">Do item/scale relations fit the construct?</text>

                <!-- Predictive -->
                <rect x="380" y="235" width="230" height="40" fill="#14532d" stroke="#4ade80" rx="4"/>
                <text x="390" y="252" fill="#bbf7d0" font-weight="bold" font-size="11">Relations to criteria:</text>
                <text x="390" y="267" fill="#86efac" font-size="10">Concurrent or later outcomes, as predicted.</text>

                <!-- Convergent/Divergent -->
                <rect x="380" y="285" width="230" height="35" fill="#1e293b" stroke="#f59e0b" stroke-dasharray="2 2" rx="4"/>
                <text x="390" y="300" fill="#fde68a" font-weight="bold" font-size="10">Convergent: predicted related constructs align.</text>
                <text x="390" y="312" fill="#fde68a" font-weight="bold" font-size="10">Discriminant: predicted distinctions appear.</text>
            </svg>`,
            description: '📊 Validity is a unified argument about whether accumulated evidence and theory support a particular interpretation of test scores for a proposed use; it is not a fixed property of a test. The Standards describe sources of validity evidence—not separate “types of validity”—including test content, response processes, internal structure, and relations to other variables (such as concurrent or later criteria and convergent/discriminant patterns). The evidence needed depends on the claims being made. Perceived face relevance is not a separate psychometric validity type, although it can affect engagement or response processes. Older textbooks and exam items may still use “content validity,” “criterion-related validity” (concurrent/predictive), and “construct validity.” Treat those as historical labels; the current Standards organize a unified validity argument around sources of evidence.'
        },

        // ─── 19. KOHLBERG'S MORAL DEVELOPMENT (Developmental) ───
        kohlbergMoral: {
            svg: `<svg viewBox="0 0 600 350" xmlns="http://www.w3.org/2000/svg" style="max-width:600px">
                <text x="300" y="25" text-anchor="middle" class="diagram-label" font-weight="700" font-size="14" fill="#a78bfa">Kohlberg's Proposed Stages of Moral Reasoning</text>
                
                <!-- Level 1: Preconventional -->
                <rect x="50" y="70" width="150" height="230" fill="#1e293b" stroke="#ef4444" stroke-width="2" rx="8" class="diagram-box"/>
                <rect x="65" y="55" width="120" height="30" fill="#7f1d1d" stroke="#ef4444" rx="4"/>
                <text x="125" y="75" text-anchor="middle" fill="#fca5a5" font-weight="bold" font-size="12">PRECONVENTIONAL</text>
                <text x="125" y="105" text-anchor="middle" fill="#e2e8f0" font-size="10">(Consequences / self-interest)</text>
                
                <rect x="60" y="120" width="130" height="80" fill="#0f172a" stroke="#f87171" rx="4"/>
                <text x="125" y="140" text-anchor="middle" fill="#f87171" font-weight="bold" font-size="11">Stage 1: Punishment</text>
                <text x="125" y="155" text-anchor="middle" fill="#fecaca" font-size="10">"I won't steal because</text>
                <text x="125" y="167" text-anchor="middle" fill="#fecaca" font-size="10">I'll go to jail."</text>
                <text x="125" y="187" text-anchor="middle" fill="#ef4444" font-weight="bold" font-size="10">Avoid Punishment</text>
                
                <rect x="60" y="210" width="130" height="80" fill="#0f172a" stroke="#f87171" rx="4"/>
                <text x="125" y="230" text-anchor="middle" fill="#f87171" font-weight="bold" font-size="11">Stage 2: Reward</text>
                <text x="125" y="245" text-anchor="middle" fill="#fecaca" font-size="10">"I'll share if</text>
                <text x="125" y="257" text-anchor="middle" fill="#fecaca" font-size="10">you share back."</text>
                <text x="125" y="277" text-anchor="middle" fill="#ef4444" font-weight="bold" font-size="10">Self-Interest</text>

                <!-- Arrow 1 to 2 -->
                <path d="M 205 185 L 220 185 L 215 180 M 220 185 L 215 190" fill="none" stroke="#64748b" stroke-width="3"/>

                <!-- Level 2: Conventional -->
                <rect x="225" y="70" width="150" height="230" fill="#1e293b" stroke="#3b82f6" stroke-width="2" rx="8" class="diagram-box"/>
                <rect x="240" y="55" width="120" height="30" fill="#1e3a8a" stroke="#3b82f6" rx="4"/>
                <text x="300" y="75" text-anchor="middle" fill="#93c5fd" font-weight="bold" font-size="12">CONVENTIONAL</text>
                <text x="300" y="105" text-anchor="middle" fill="#e2e8f0" font-size="10">(Approval / social order)</text>
                
                <rect x="235" y="120" width="130" height="80" fill="#0f172a" stroke="#60a5fa" rx="4"/>
                <text x="300" y="140" text-anchor="middle" fill="#60a5fa" font-weight="bold" font-size="11">Stage 3: Interpersonal Accord</text>
                <text x="300" y="155" text-anchor="middle" fill="#bfdbfe" font-size="10">"I'll help so people</text>
                <text x="300" y="167" text-anchor="middle" fill="#bfdbfe" font-size="10">think I'm a good person."</text>
                <text x="300" y="187" text-anchor="middle" fill="#3b82f6" font-weight="bold" font-size="10">Social Approval</text>
                
                <rect x="235" y="210" width="130" height="80" fill="#0f172a" stroke="#60a5fa" rx="4"/>
                <text x="300" y="230" text-anchor="middle" fill="#60a5fa" font-weight="bold" font-size="11">Stage 4: Law & Order</text>
                <text x="300" y="245" text-anchor="middle" fill="#bfdbfe" font-size="10">"You must obey the rules</text>
                <text x="300" y="257" text-anchor="middle" fill="#bfdbfe" font-size="10">or society falls apart."</text>
                <text x="300" y="277" text-anchor="middle" fill="#3b82f6" font-weight="bold" font-size="10">Duty & Rules</text>

                <!-- Arrow 2 to 3 -->
                <path d="M 380 185 L 395 185 L 390 180 M 395 185 L 390 190" fill="none" stroke="#64748b" stroke-width="3"/>

                <!-- Level 3: Postconventional -->
                <rect x="400" y="70" width="150" height="230" fill="#1e293b" stroke="#22c55e" stroke-width="2" rx="8" class="diagram-box"/>
                <rect x="415" y="55" width="120" height="30" fill="#14532d" stroke="#22c55e" rx="4"/>
                <text x="475" y="75" text-anchor="middle" fill="#86efac" font-weight="bold" font-size="12">POSTCONVENTIONAL</text>
                <text x="475" y="105" text-anchor="middle" fill="#e2e8f0" font-size="10">(Rights / principles)</text>
                
                <rect x="410" y="120" width="130" height="80" fill="#0f172a" stroke="#4ade80" rx="4"/>
                <text x="475" y="140" text-anchor="middle" fill="#4ade80" font-weight="bold" font-size="11">Stage 5: Social Contract</text>
                <text x="475" y="155" text-anchor="middle" fill="#bbf7d0" font-size="10">"Rules are made by people,</text>
                <text x="475" y="167" text-anchor="middle" fill="#bbf7d0" font-size="10">unjust rules can change."</text>
                <text x="475" y="187" text-anchor="middle" fill="#22c55e" font-weight="bold" font-size="10">Rights can guide law reform</text>
                
                <rect x="410" y="210" width="130" height="80" fill="#0f172a" stroke="#4ade80" rx="4" class="diagram-glow"/>
                <text x="475" y="230" text-anchor="middle" fill="#4ade80" font-weight="bold" font-size="11">Proposed 6: Principles</text>
                <text x="475" y="245" text-anchor="middle" fill="#bbf7d0" font-size="10">General principles guide</text>
                <text x="475" y="257" text-anchor="middle" fill="#bbf7d0" font-size="10">moral judgment.</text>
                <text x="475" y="277" text-anchor="middle" fill="#22c55e" font-weight="bold" font-size="10">Internal Moral Code</text>

                <!-- Indicator Line -->
                <path d="M 50 320 L 550 320" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-dasharray="4 4"/>
                <text x="300" y="335" text-anchor="middle" fill="#e2e8f0" font-size="11" font-weight="bold">Proposed progression in reasoning; age does not fix a person’s level</text>
            </svg>`,
            description: '⚖️ Kohlberg’s framework classifies the reasoning used to justify moral choices, not whether a particular choice is correct. Its levels are not fixed to childhood, adolescence, and adulthood, and the proposed sequence is not a rule for every person or culture. Gilligan challenged its justice emphasis and sampling; a meta-analysis found only small average gender differences in care versus justice orientations, not a uniform women-use-care distinction.'
        },
        
        // ─── 18. CBT TRIANGLE (Clinical Psychology) ───
        cbtTriangle: {
            svg: `<svg viewBox="0 0 500 450" xmlns="http://www.w3.org/2000/svg" style="max-width:500px">
                <defs>
                    <linearGradient id="cbtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#3B82F6"/>
                        <stop offset="100%" stop-color="#8B5CF6"/>
                    </linearGradient>
                    <marker id="cbtArrowHead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#94A3B8"/>
                    </marker>
                    <filter id="cbtGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#3B82F6" flood-opacity="0.3"/>
                    </filter>
                </defs>
                <style>
                    .cbt-node { fill: #1E293B; stroke: url(#cbtGrad); stroke-width: 3px; filter: url(#cbtGlow); }
                    /* Static nodes: guided reveal controls provide the diagram interaction. */
                    .cbt-text { fill: #F8FAFC; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 16px; text-anchor: middle; pointer-events: none; }
                    .cbt-subtext { fill: #94A3B8; font-family: 'Inter', sans-serif; font-size: 12px; text-anchor: middle; pointer-events: none; }
                    .cbt-edge { stroke: #475569; stroke-width: 2px; fill: none; marker-end: url(#cbtArrowHead); stroke-dasharray: 6 4; animation: cbtFlow 20s linear infinite; }
                    @keyframes cbtFlow { from { stroke-dashoffset: 200; } to { stroke-dashoffset: 0; } }
                </style>
                
                <text x="250" y="24" text-anchor="middle" class="diagram-label" font-weight="700" font-size="16" fill="#a78bfa">Simplified CBT Formulation</text>
                <!-- Connections -->
                <!-- Thoughts to Feelings -->
                <path d="M 230 110 L 140 260" class="cbt-edge"/>
                <path d="M 160 270 L 250 120" class="cbt-edge"/>
                <!-- Feelings to Behaviors -->
                <path d="M 150 310 L 330 310" class="cbt-edge"/>
                <path d="M 350 290 L 170 290" class="cbt-edge"/>
                <!-- Behaviors to Thoughts -->
                <path d="M 340 260 L 250 110" class="cbt-edge"/>
                <path d="M 270 120 L 360 270" class="cbt-edge"/>

                <!-- Nodes -->
                <!-- Thoughts (Top) -->
                <g transform="translate(250, 70)">
                    <rect x="-75" y="-35" width="150" height="70" rx="35" class="cbt-node"/>
                    <text x="0" y="0" class="cbt-text">Thoughts</text>
                    <text x="0" y="18" class="cbt-subtext">Appraisals / meanings</text>
                </g>

                <!-- Feelings (Bottom Left) -->
                <g transform="translate(110, 300)">
                    <rect x="-75" y="-35" width="150" height="70" rx="35" class="cbt-node"/>
                    <text x="0" y="0" class="cbt-text">Feelings</text>
                    <text x="0" y="18" class="cbt-subtext">Emotions</text>
                </g>

                <!-- Behaviors (Bottom Right) -->
                <g transform="translate(390, 300)">
                    <rect x="-75" y="-35" width="150" height="70" rx="35" class="cbt-node"/>
                    <text x="0" y="0" class="cbt-text">Behaviors</text>
                    <text x="0" y="18" class="cbt-subtext">Actions / avoidance</text>
                </g>
                
                <!-- Core Beliefs -->
                <g transform="translate(250, 200)">
                    <circle cx="0" cy="0" r="45" fill="#0F172A" stroke="#475569" stroke-width="2" stroke-dasharray="4 4"/>
                    <text x="0" y="-5" fill="#94A3B8" font-family="'Inter', sans-serif" font-size="12px" text-anchor="middle">Underlying</text>
                    <text x="0" y="12" fill="#94A3B8" font-family="'Inter', sans-serif" font-size="12px" text-anchor="middle">beliefs</text>
                </g>
                <text x="250" y="425" text-anchor="middle" fill="#94A3B8" font-family="'Inter', sans-serif" font-size="11px">A formulation aid; situation, physiology, culture, and context also matter.</text>
            </svg>`,
            description: '🔺 A simplified CBT formulation. In a situation, appraisals, emotions, behavior, and physiological responses can influence one another, while deeper beliefs can shape appraisals. Changing one element may affect others, but change is not guaranteed and cognition is not presented as the sole cause of distress. CBT uses an individualized, evolving formulation to select cognitive, behavioral, and other interventions.'
        },

        // ─── 19. SYSTEMATIC DESENSITIZATION (Behavioral Therapy) ───
        systematicDesensitization: {
            svg: `<svg viewBox="0 0 600 450" xmlns="http://www.w3.org/2000/svg" style="max-width:600px">
                <defs>
                    <linearGradient id="sdAnxGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#EF4444" stop-opacity="0.2"/>
                        <stop offset="100%" stop-color="#EF4444" stop-opacity="0.9"/>
                    </linearGradient>
                    <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#10B981" flood-opacity="0.6"/>
                    </filter>
                </defs>
                <style>
                    .sd-bar { fill: url(#sdAnxGrad); transition: height 0.5s; cursor: pointer; }
                    .sd-bar:hover { filter: brightness(1.2); }
                    .sd-relax { stroke: #10B981; stroke-width: 4px; stroke-dasharray: 8 4; fill: none; animation: relaxPulse 3s infinite alternate; }
                    .sd-text { fill: #E2E8F0; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; }
                    .sd-heading { fill: #F8FAFC; font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 700; text-anchor: middle; }
                    .sd-axis { stroke: #475569; stroke-width: 2px; }
                    @keyframes relaxPulse { from { opacity: 0.6; } to { opacity: 1; filter: url(#glowGreen); } }
                </style>
                
                <text x="300" y="30" class="sd-heading">Fear Hierarchy & Reciprocal Inhibition</text>
                <text x="300" y="50" fill="#94A3B8" font-family="'Inter', sans-serif" font-size="12px" text-anchor="middle">Wolpe's Classical Conditioning Approach to Phobias</text>
                
                <!-- Axes -->
                <line x1="50" y1="350" x2="550" y2="350" class="sd-axis"/>
                <line x1="50" y1="350" x2="50" y2="80" class="sd-axis"/>
                <text x="25" y="215" class="sd-text" transform="rotate(-90 25,215)" text-anchor="middle">Anxiety Level (SUDs 0-100)</text>
                
                <!-- Baseline / Relaxation Curve -->
                <path d="M 50 320 C 200 340, 400 340, 550 320" class="sd-relax"/>
                <text x="500" y="310" fill="#10B981" font-family="'Inter', sans-serif" font-size="12px" font-weight="600">Relaxation Response</text>

                <!-- Steps (Hierarchy) -->
                <!-- Step 1 -->
                <rect x="80" y="280" width="60" height="70" class="sd-bar"/>
                <text x="110" y="370" class="sd-text" text-anchor="middle">1. See picture</text>
                <text x="110" y="270" fill="#EF4444" font-family="'Inter', sans-serif" font-size="12px" text-anchor="middle">Anx: 20</text>
                <text x="110" y="295" fill="#10B981" font-family="'Inter', sans-serif" font-size="10px" text-anchor="middle">Paired w/</text>
                <text x="110" y="307" fill="#10B981" font-family="'Inter', sans-serif" font-size="10px" text-anchor="middle">Relaxation</text>

                <!-- Step 2 -->
                <rect x="170" y="230" width="60" height="120" class="sd-bar"/>
                <text x="200" y="385" class="sd-text" text-anchor="middle">2. Video</text>
                <text x="200" y="220" fill="#EF4444" font-family="'Inter', sans-serif" font-size="12px" text-anchor="middle">Anx: 40</text>
                <text x="200" y="245" fill="#10B981" font-family="'Inter', sans-serif" font-size="10px" text-anchor="middle">Paired w/</text>
                <text x="200" y="257" fill="#10B981" font-family="'Inter', sans-serif" font-size="10px" text-anchor="middle">Relaxation</text>

                <!-- Step 3 -->
                <rect x="260" y="180" width="60" height="170" class="sd-bar"/>
                <text x="290" y="370" class="sd-text" text-anchor="middle">3. See across room</text>
                <text x="290" y="170" fill="#EF4444" font-family="'Inter', sans-serif" font-size="12px" text-anchor="middle">Anx: 60</text>
                <text x="290" y="195" fill="#10B981" font-family="'Inter', sans-serif" font-size="10px" text-anchor="middle">Paired w/</text>
                <text x="290" y="207" fill="#10B981" font-family="'Inter', sans-serif" font-size="10px" text-anchor="middle">Relaxation</text>

                <!-- Step 4 -->
                <rect x="350" y="130" width="60" height="220" class="sd-bar"/>
                <text x="380" y="385" class="sd-text" text-anchor="middle">4. Stand next to</text>
                <text x="380" y="120" fill="#EF4444" font-family="'Inter', sans-serif" font-size="12px" text-anchor="middle">Anx: 80</text>
                <text x="380" y="145" fill="#10B981" font-family="'Inter', sans-serif" font-size="10px" text-anchor="middle">Paired w/</text>
                <text x="380" y="157" fill="#10B981" font-family="'Inter', sans-serif" font-size="10px" text-anchor="middle">Relaxation</text>

                <!-- Step 5 -->
                <rect x="440" y="80" width="60" height="270" class="sd-bar"/>
                <text x="470" y="370" class="sd-text" text-anchor="middle">5. Touch/Hold</text>
                <text x="470" y="70" fill="#EF4444" font-family="'Inter', sans-serif" font-size="12px" text-anchor="middle">Anx: 100</text>
                <text x="470" y="95" fill="#10B981" font-family="'Inter', sans-serif" font-size="10px" text-anchor="middle">Paired w/</text>
                <text x="470" y="107" fill="#10B981" font-family="'Inter', sans-serif" font-size="10px" text-anchor="middle">Relaxation</text>
            </svg>`,
            description: '🪜 Systematic Desensitization relies on \'reciprocal inhibition\' (anxiety and relaxation are physiologically mutually exclusive). The therapist builds a graduated fear hierarchy, trains the client in deep relaxation, and successfully pairs the relaxation response with each escalating exposure step.'
        },

        // ─── 20. DBT MODULES (Borderline Personality Disorder) ───
        dbtModules: {
            svg: `<svg viewBox="0 0 500 480" xmlns="http://www.w3.org/2000/svg" style="max-width:500px">
                <defs>
                    <radialGradient id="dbtCenter" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.2"/>
                        <stop offset="100%" stop-color="#0F172A" stop-opacity="1"/>
                    </radialGradient>
                    <filter id="dbtGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#8B5CF6" flood-opacity="0.5"/>
                    </filter>
                </defs>
                <style>
                    .dbt-quad { fill: #1E293B; stroke: #475569; stroke-width: 2px; }
                    /* Static module cards: guided reveal controls provide the diagram interaction. */
                    .dbt-title { fill: #F8FAFC; font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 700; text-anchor: middle; }
                    .dbt-desc { fill: #94A3B8; font-family: 'Inter', sans-serif; font-size: 11px; text-anchor: middle; }
                    .dbt-tag { fill: #38BDF8; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600; text-anchor: middle; }
                </style>
                
                <text x="250" y="22" text-anchor="middle" class="dbt-title">DBT Skills-Training Modules</text>
                <g transform="translate(0,30)">
                <rect x="0" y="0" width="500" height="450" fill="url(#dbtCenter)" rx="10"/>
                
                <!-- Dialectic Axiom Axis -->
                <path d="M 250 50 L 250 400" stroke="#475569" stroke-width="4" stroke-dasharray="8 4"/>
                <path d="M 50 225 L 450 225" stroke="#475569" stroke-width="4" stroke-dasharray="8 4"/>
                <circle cx="250" cy="225" r="40" fill="#0F172A" stroke="#8B5CF6" stroke-width="3"/>
                <text x="250" y="221" fill="#F8FAFC" font-family="'Inter', sans-serif" font-size="12px" font-weight="700" text-anchor="middle">The</text>
                <text x="250" y="235" fill="#F8FAFC" font-family="'Inter', sans-serif" font-size="12px" font-weight="700" text-anchor="middle">Dialectic</text>

                <!-- Labels on Axis -->
                <rect x="200" y="15" width="100" height="25" rx="5" fill="#10B981" opacity="0.2"/>
                <text x="250" y="32" fill="#10B981" font-family="'Inter', sans-serif" font-size="14px" font-weight="700" text-anchor="middle">ACCEPTANCE</text>

                <rect x="200" y="410" width="100" height="25" rx="5" fill="#EF4444" opacity="0.2"/>
                <text x="250" y="427" fill="#EF4444" font-family="'Inter', sans-serif" font-size="14px" font-weight="700" text-anchor="middle">CHANGE</text>

                <!-- Quadrant 1: Mindfulness (Top Left) -->
                <g transform="translate(60, 60)" style="transform-origin: 90px 70px;">
                    <rect x="0" y="0" width="170" height="140" rx="15" class="dbt-quad"/>
                    <text x="85" y="30" class="dbt-title" fill="#A78BFA">Mindfulness</text>
                    <text x="85" y="55" class="dbt-tag" style="font-size:11px">Present-moment awareness</text>
                    <text x="85" y="80" class="dbt-desc">Observe, Describe, Participate</text>
                    <text x="85" y="100" class="dbt-desc">"Wise Mind"</text>
                    <text x="85" y="120" class="dbt-desc" style="font-size:9px">Nonjudgmentally and effectively</text>
                </g>

                <!-- Quadrant 2: Distress Tolerance (Top Right) -->
                <g transform="translate(270, 60)" style="transform-origin: 90px 70px;">
                    <rect x="0" y="0" width="170" height="140" rx="15" class="dbt-quad"/>
                    <text x="85" y="30" class="dbt-title" fill="#F472B6">Distress Tolerance</text>
                    <text x="85" y="55" class="dbt-tag">Focus: Crisis survival</text>
                    <text x="85" y="80" class="dbt-desc" style="font-size:9px">Crisis-survival skills (e.g., TIPP)</text>
                    <text x="85" y="95" class="dbt-desc">Reality-acceptance skills</text>
                    <text x="85" y="120" class="dbt-desc">Radical acceptance</text>
                </g>

                <!-- Quadrant 3: Emotion Regulation (Bottom Left) -->
                <g transform="translate(60, 250)" style="transform-origin: 90px 70px;">
                    <rect x="0" y="0" width="170" height="140" rx="15" class="dbt-quad"/>
                    <text x="85" y="30" class="dbt-title" fill="#38BDF8">Emotion Reg.</text>
                    <text x="85" y="55" class="dbt-tag">Understand &amp; regulate</text>
                    <text x="85" y="80" class="dbt-desc">ABC PLEASE</text>
                    <text x="85" y="100" class="dbt-desc">Identify &amp; Label Emotions</text>
                    <text x="85" y="120" class="dbt-desc">Opposite Action</text>
                </g>

                <!-- Quadrant 4: Interpersonal Effectiveness (Bottom Right) -->
                <g transform="translate(270, 250)" style="transform-origin: 90px 70px;">
                    <rect x="0" y="0" width="170" height="140" rx="15" class="dbt-quad"/>
                    <text x="85" y="30" class="dbt-title" fill="#FBBF24">Interpersonal Eff.</text>
                    <text x="85" y="55" class="dbt-tag">Focus: Relationships</text>
                    <text x="85" y="80" class="dbt-desc">DEAR MAN — objectives</text>
                    <text x="85" y="100" class="dbt-desc">GIVE — relationships</text>
                    <text x="85" y="120" class="dbt-desc">FAST — self-respect</text>
                </g>
                </g>
            </svg>`,
            description: '☯️ These are the four DBT skills-training modules. Mindfulness and distress tolerance are acceptance-oriented; emotion regulation and interpersonal effectiveness are change-oriented. Skills training is one component of comprehensive DBT, which also includes individual therapy, between-session phone coaching, and a therapist consultation team. DBT uses a target hierarchy that prioritizes life-threatening behavior, therapy-interfering behavior, quality-of-life-interfering behavior, and then skills acquisition. Teaching selected skills alone should not be labeled comprehensive DBT.'
        }
,

        // ─── 21. ASCH CONFORMITY EXPERIMENT (Social Psychology) ───
        aschConformity: {
            svg: `<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" width="100%" style="width: 100%; height: auto; max-width: 600px;">
                <defs>
                    <linearGradient id="aschGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.1"/>
                        <stop offset="100%" stop-color="#8B5CF6" stop-opacity="0.1"/>
                    </linearGradient>
                    <filter id="glowAsch" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#8B5CF6" flood-opacity="0.4"/>
                    </filter>
                </defs>
                <style>
                    .asch-line { stroke: #F8FAFC; stroke-width: 8px; stroke-linecap: round; transition: all 0.3s ease; }
                    .asch-line:hover { stroke: #A78BFA; filter: url(#glowAsch); cursor: pointer; }
                    .asch-card { fill: #1E293B; stroke: #475569; stroke-width: 2px; rx: 8px; }
                    .asch-text { fill: #E2E8F0; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; text-anchor: middle; }
                    .asch-person { fill: #64748B; transition: all 0.3s ease; }
                    .asch-confederate { animation: confederatePoint 4s infinite; }
                    .asch-participant { animation: participantConfuse 4s infinite; fill: #3B82F6; }
                    .asch-speech { fill: #0F172A; stroke: #64748B; stroke-width: 1px; rx: 4px; opacity: 0; }
                    .asch-speech-text { fill: #F8FAFC; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: bold; text-anchor: middle; opacity: 0; }
                    
                    @keyframes confederatePoint {
                        0%, 10% { transform: translateY(0); fill: #64748B; }
                        20%, 80% { transform: translateY(-5px); fill: #EF4444; }
                        90%, 100% { transform: translateY(0); fill: #64748B; }
                    }
                    @keyframes confederateSpeech {
                        0%, 10% { opacity: 0; }
                        20%, 80% { opacity: 1; }
                        90%, 100% { opacity: 0; }
                    }
                    @keyframes participantConfuse {
                        0%, 40% { transform: translateY(0); fill: #3B82F6; }
                        50%, 60% { transform: translateY(-2px) translateX(-2px); fill: #F59E0B; }
                        70%, 80% { transform: translateY(-2px); fill: #F59E0B; } /* Response is not predetermined */
                        90%, 100% { transform: translateY(0); fill: #3B82F6; }
                    }
                    /* The participant’s answer is intentionally not animated or preselected. */
                </style>
                
                <text x="300" y="30" class="asch-text" font-size="18">Asch Line-Judgment Studies (1950s)</text>

                <!-- Experiment Cards -->
                <!-- Standard Line Card -->
                <rect x="100" y="60" width="120" height="180" class="asch-card"/>
                <text x="160" y="225" class="asch-text">Target Line</text>
                <line x1="160" y1="90" x2="160" y2="190" class="asch-line"/> <!-- Length: 100 -->

                <!-- Comparison Lines Card -->
                <rect x="280" y="60" width="220" height="180" class="asch-card"/>
                <text x="390" y="225" class="asch-text">Comparison Lines</text>
                
                <!-- Line 1 (Wrong, picked by confederates) -->
                <line x1="330" y1="90" x2="330" y2="170" class="asch-line"/> <!-- Length: 80 -->
                <text x="330" y="200" class="asch-text" font-size="12">1</text>
                
                <!-- Line 2 (Correct) -->
                <line x1="390" y1="90" x2="390" y2="190" class="asch-line"/> <!-- Length: 100 -->
                <text x="390" y="200" class="asch-text" font-size="12">2</text>
                
                <!-- Line 3 (Wrong) -->
                <line x1="450" y1="90" x2="450" y2="210" class="asch-line"/> <!-- Length: 120 -->
                <text x="450" y="200" class="asch-text" font-size="12">3</text>

                <!-- People Seated (Confederates 1-4, Participant, Confederate 6) -->
                <g transform="translate(40, 320)">
                    <!-- Confederate 1 -->
                    <g transform="translate(0, 0)" class="asch-confederate" style="animation-delay: 0s;">
                        <circle cx="20" cy="0" r="15"/>
                        <path d="M 5 20 Q 20 5 35 20 L 35 50 L 5 50 Z"/>
                        <text x="20" y="70" class="asch-text" font-size="10">Actor 1</text>
                        <rect x="5" y="-35" width="30" height="18" class="asch-speech" style="animation: confederateSpeech 4s infinite 0s;"/>
                        <text x="20" y="-22" class="asch-speech-text" style="animation: confederateSpeech 4s infinite 0s;">"1"</text>
                    </g>
                    <!-- Confederate 2 -->
                    <g transform="translate(80, 0)" class="asch-confederate" style="animation-delay: 0.2s;">
                        <circle cx="20" cy="0" r="15"/>
                        <path d="M 5 20 Q 20 5 35 20 L 35 50 L 5 50 Z"/>
                        <text x="20" y="70" class="asch-text" font-size="10">Actor 2</text>
                        <rect x="5" y="-35" width="30" height="18" class="asch-speech" style="animation: confederateSpeech 4s infinite 0.2s;"/>
                        <text x="20" y="-22" class="asch-speech-text" style="animation: confederateSpeech 4s infinite 0.2s;">"1"</text>
                    </g>
                    <!-- Confederate 3 -->
                    <g transform="translate(160, 0)" class="asch-confederate" style="animation-delay: 0.4s;">
                        <circle cx="20" cy="0" r="15"/>
                        <path d="M 5 20 Q 20 5 35 20 L 35 50 L 5 50 Z"/>
                        <text x="20" y="70" class="asch-text" font-size="10">Actor 3</text>
                        <rect x="5" y="-35" width="30" height="18" class="asch-speech" style="animation: confederateSpeech 4s infinite 0.4s;"/>
                        <text x="20" y="-22" class="asch-speech-text" style="animation: confederateSpeech 4s infinite 0.4s;">"1"</text>
                    </g>
                    <!-- Confederate 4 -->
                    <g transform="translate(240, 0)" class="asch-confederate" style="animation-delay: 0.6s;">
                        <circle cx="20" cy="0" r="15"/>
                        <path d="M 5 20 Q 20 5 35 20 L 35 50 L 5 50 Z"/>
                        <text x="20" y="70" class="asch-text" font-size="10">Actor 4</text>
                        <rect x="5" y="-35" width="30" height="18" class="asch-speech" style="animation: confederateSpeech 4s infinite 0.6s;"/>
                        <text x="20" y="-22" class="asch-speech-text" style="animation: confederateSpeech 4s infinite 0.6s;">"1"</text>
                    </g>
                    <!-- Participant (Subject) -->
                    <g transform="translate(320, 0)" class="asch-participant">
                        <circle cx="20" cy="0" r="15"/>
                        <path d="M 5 20 Q 20 5 35 20 L 35 50 L 5 50 Z"/>
                        <text x="20" y="70" class="asch-text" font-size="10" fill="#60A5FA">Subject</text>
                        <!-- Participant response intentionally not preselected. -->
                        <text x="20" y="-22" class="asch-text" font-size="9">answer varies</text>
                    </g>
                    <!-- Confederate 5 -->
                    <g transform="translate(400, 0)" class="asch-confederate" style="animation-delay: 1.0s;">
                        <circle cx="20" cy="0" r="15"/>
                        <path d="M 5 20 Q 20 5 35 20 L 35 50 L 5 50 Z"/>
                        <text x="20" y="70" class="asch-text" font-size="10">Actor 5</text>
                        <rect x="5" y="-35" width="30" height="18" class="asch-speech" style="animation: confederateSpeech 4s infinite 1.0s;"/>
                        <text x="20" y="-22" class="asch-speech-text" style="animation: confederateSpeech 4s infinite 1.0s;">"1"</text>
                    </g>
                </g>
            </svg>`,
            description: '👥 In Asch’s 1956 line-judgment report, participants yielded to a unanimous majority’s wrong answer on 36.8% of critical trials—not on all trials—and many judgments remained independent. Breaking unanimity and changing response conditions reduced yielding. The classic paradigm demonstrates majority influence under specified conditions; it does not imply that a participant will conform or establish one universal conformity rate across settings.'
        },

        // ─── 22. BYSTANDER INTERVENTION (Social Psychology) ───
        bystanderIntervention: {
            svg: `<svg viewBox="0 0 600 450" xmlns="http://www.w3.org/2000/svg" width="100%" style="width: 100%; height: auto; max-width: 600px;">
                <defs>
                    <linearGradient id="bystanderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#14532D"/>
                        <stop offset="100%" stop-color="#1E293B"/>
                    </linearGradient>
                    <marker id="arrowBystander" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#4ADE80"/>
                    </marker>
                    <marker id="arrowFail" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#EF4444"/>
                    </marker>
                </defs>
                <style>
                    .bi-box { fill: #0F172A; stroke: #4ADE80; stroke-width: 2px; rx: 6px; transition: all 0.3s; cursor: pointer; }
                    .bi-box:hover { fill: #14532D; filter: drop-shadow(0 0 6px rgba(74,222,128,0.4)); }
                    .bi-text { fill: #F8FAFC; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; text-anchor: middle; }
                    .bi-sub { fill: #94A3B8; font-family: 'Inter', sans-serif; font-size: 10px; text-anchor: middle; }
                    .bi-path { stroke: #4ADE80; stroke-width: 3px; fill: none; marker-end: url(#arrowBystander); }
                    .bi-fail { stroke: #EF4444; stroke-width: 2px; fill: none; marker-end: url(#arrowFail); stroke-dasharray: 4 4; }
                    .bi-fail-text { fill: #FCA5A5; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: bold; }
                </style>

                <text x="300" y="30" class="bi-text" font-size="18">Darley & Latané's Bystander Intervention Tree</text>
                <text x="300" y="50" class="bi-sub" font-size="12">5 Steps Required to Help in an Emergency</text>

                <!-- Flowchart -->
                <!-- Step 1 -->
                <rect x="200" y="70" width="200" height="40" class="bi-box"/>
                <text x="300" y="95" class="bi-text">1. Notice the Event</text>
                <path d="M 300 110 L 300 130" class="bi-path"/>
                <path d="M 400 90 L 450 90 L 450 110" class="bi-fail"/>
                <text x="410" y="85" class="bi-fail-text">NO</text>
                <text x="500" y="120" class="bi-sub" text-anchor="middle">Distracted / In a hurry</text>

                <!-- Step 2 -->
                <rect x="200" y="140" width="200" height="40" class="bi-box"/>
                <text x="300" y="165" class="bi-text">2. Interpret as Emergency</text>
                <path d="M 300 180 L 300 200" class="bi-path"/>
                <path d="M 400 160 L 450 160 L 450 180" class="bi-fail"/>
                <text x="410" y="155" class="bi-fail-text">NO</text>
                <text x="500" y="190" class="bi-sub" text-anchor="middle">Pluralistic Ignorance</text>

                <!-- Step 3 -->
                <rect x="200" y="210" width="200" height="40" class="bi-box"/>
                <text x="300" y="235" class="bi-text">3. Assume Responsibility</text>
                <path d="M 300 250 L 300 270" class="bi-path"/>
                <path d="M 400 230 L 450 230 L 450 250" class="bi-fail"/>
                <text x="410" y="225" class="bi-fail-text">NO</text>
                <text x="500" y="260" class="bi-sub" text-anchor="middle">Diffusion of Responsibility</text>

                <!-- Step 4 -->
                <rect x="200" y="280" width="200" height="40" class="bi-box"/>
                <text x="300" y="305" class="bi-text">4. Know How to Help</text>
                <path d="M 300 320 L 300 340" class="bi-path"/>
                <path d="M 400 300 L 450 300 L 450 320" class="bi-fail"/>
                <text x="410" y="295" class="bi-fail-text">NO</text>
                <text x="500" y="330" class="bi-sub" text-anchor="middle">Lack of Skills (e.g., CPR)</text>

                <!-- Step 5 -->
                <rect x="200" y="350" width="200" height="40" class="bi-box"/>
                <text x="300" y="375" class="bi-text">5. Decide to Implement</text>
                <path d="M 300 390 L 300 410" class="bi-path"/>
                <path d="M 400 370 L 450 370 L 450 390" class="bi-fail"/>
                <text x="410" y="365" class="bi-fail-text">NO</text>
                <text x="500" y="400" class="bi-sub" text-anchor="middle">Cost/Danger too high</text>

                <!-- Outcome -->
                <circle cx="300" cy="425" r="15" fill="#22C55E"/>
                <text x="300" y="430" class="bi-text" font-size="12" fill="#022C22">HELP</text>
                
                <!-- Failure Bucket -->
                <rect x="420" y="415" width="160" height="30" fill="#7F1D1D" rx="4"/>
                <text x="500" y="435" class="bi-text" fill="#FECACA">NO HELP GIVEN</text>
                <!-- Arrows into bucket -->
                <path d="M 450 130 L 450 415" stroke="#EF4444" stroke-width="1.5" stroke-dasharray="2 2" fill="none"/>
                <path d="M 450 200 L 450 415" stroke="#EF4444" stroke-width="1.5" stroke-dasharray="2 2" fill="none"/>
                <path d="M 450 270 L 450 415" stroke="#EF4444" stroke-width="1.5" stroke-dasharray="2 2" fill="none"/>
                <path d="M 450 340 L 450 415" stroke="#EF4444" stroke-width="1.5" stroke-dasharray="2 2" fill="none"/>
                <path d="M 450 410 L 450 415" stroke="#EF4444" stroke-width="1.5" stroke-dasharray="2 2" fill="none"/>

            </svg>`,
            description: '🛑 Bystander Intervention Tree. A prosocial act requires completing ALL 5 steps. "Pluralistic Ignorance" breaks Step 2 (if no one acts, you assume it\'s not an emergency). "Diffusion of Responsibility" breaks Step 3 (assuming someone else called 911).'
        },

        // ─── 23. AUTONOMIC NERVOUS SYSTEM (Biopsychology) ───
        autonomicNervousSystem: {
            svg: `<svg viewBox="0 0 600 450" xmlns="http://www.w3.org/2000/svg" width="100%" style="width: 100%; height: auto; max-width: 600px;">
                <defs>
                    <linearGradient id="sympGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#EF4444" stop-opacity="0.1"/>
                        <stop offset="100%" stop-color="#B91C1C" stop-opacity="0.4"/>
                    </linearGradient>
                    <linearGradient id="paraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.1"/>
                        <stop offset="100%" stop-color="#1D4ED8" stop-opacity="0.4"/>
                    </linearGradient>
                </defs>
                <style>
                    .ans-title { fill: #F8FAFC; font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 700; text-anchor: middle; }
                    .ans-sub { fill: #94A3B8; font-family: 'Inter', sans-serif; font-size: 11px; text-anchor: middle; }
                    .ans-text { fill: #E2E8F0; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; }
                    .symp-box { fill: url(#sympGrad); stroke: #EF4444; stroke-width: 2px; rx: 8px; }
                    .para-box { fill: url(#paraGrad); stroke: #3B82F6; stroke-width: 2px; rx: 8px; }
                    .ans-organ { fill: #475569; stroke: #94A3B8; stroke-width: 1px; }
                    .symp-line { stroke: #EF4444; stroke-width: 2px; stroke-dasharray: 4 2; fill: none; }
                    .para-line { stroke: #3B82F6; stroke-width: 2px; stroke-dasharray: 4 2; fill: none; }
                </style>

                <text x="300" y="30" class="ans-title" font-size="18">The Autonomic Nervous System</text>

                <!-- Sympathetic Div -->
                <rect x="20" y="60" width="270" height="370" class="symp-box"/>
                <text x="155" y="90" class="ans-title" fill="#FCA5A5">SYMPATHETIC</text>
                <text x="155" y="110" class="ans-sub" fill="#FECACA">"Fight or Flight"</text>
                <text x="155" y="125" class="ans-sub" fill="#F87171">Arouses body, expends energy</text>
                
                <!-- Sympathetic Effects -->
                <g transform="translate(40, 160)">
                    <circle cx="10" cy="-5" r="4" fill="#FCA5A5"/>
                    <text x="25" y="0" class="ans-text">Dilates Pupils (Wide)</text>
                    
                    <circle cx="10" cy="35" r="4" fill="#FCA5A5"/>
                    <text x="25" y="40" class="ans-text">Inhibits Salivation</text>
                    
                    <circle cx="10" cy="75" r="4" fill="#FCA5A5"/>
                    <text x="25" y="80" class="ans-text">Accelerates Heart Rate</text>
                    
                    <circle cx="10" cy="115" r="4" fill="#FCA5A5"/>
                    <text x="25" y="120" class="ans-text">Dilates Bronchi (Lungs)</text>
                    
                    <circle cx="10" cy="155" r="4" fill="#FCA5A5"/>
                    <text x="25" y="160" class="ans-text">Inhibits Digestion</text>
                    
                    <circle cx="10" cy="195" r="4" fill="#FCA5A5"/>
                    <text x="25" y="200" class="ans-text">Stimulates Glucose Release</text>
                    
                    <circle cx="10" cy="235" r="4" fill="#FCA5A5"/>
                    <text x="25" y="240" class="ans-text">Relaxes Bladder</text>
                </g>

                <!-- Parasympathetic Div -->
                <rect x="310" y="60" width="270" height="370" class="para-box"/>
                <text x="445" y="90" class="ans-title" fill="#93C5FD">PARASYMPATHETIC</text>
                <text x="445" y="110" class="ans-sub" fill="#BFDBFE">"Rest and Digest"</text>
                <text x="445" y="125" class="ans-sub" fill="#60A5FA">Calms body, conserves energy</text>

                <!-- Parasympathetic Effects -->
                <g transform="translate(330, 160)">
                    <circle cx="10" cy="-5" r="4" fill="#93C5FD"/>
                    <text x="25" y="0" class="ans-text">Constricts Pupils (Small)</text>
                    
                    <circle cx="10" cy="35" r="4" fill="#93C5FD"/>
                    <text x="25" y="40" class="ans-text">Stimulates Salivation</text>
                    
                    <circle cx="10" cy="75" r="4" fill="#93C5FD"/>
                    <text x="25" y="80" class="ans-text">Slows Heart Rate</text>
                    
                    <circle cx="10" cy="115" r="4" fill="#93C5FD"/>
                    <text x="25" y="120" class="ans-text">Constricts Bronchi</text>
                    
                    <circle cx="10" cy="155" r="4" fill="#93C5FD"/>
                    <text x="25" y="160" class="ans-text">Stimulates Digestion</text>
                    
                    <circle cx="10" cy="195" r="4" fill="#93C5FD"/>
                    <text x="25" y="200" class="ans-text">Stimulates Gallbladder</text>
                    
                    <circle cx="10" cy="235" r="4" fill="#93C5FD"/>
                    <text x="25" y="240" class="ans-text">Contracts Bladder</text>
                </g>

            </svg>`,
            description: '🧬 Autonomic Nervous System. Remember: "Sympathy" for a stressful situation (Sympathetic = Fight/Flight). A "Parachute" calms you down (Parasympathetic = Rest/Digest). Everything the sympathetic nervous system turns on during an emergency (heart rate, breathing), the parasympathetic reverses when safe.'
        }
    };

    // Patch diagrams into existing chapters
    function patchDiagrams() {
        var chapters = window.TextbookChapters || [];
        if (!chapters.length) return;

        chapters.forEach(function(ch) {
            var applied = new Set();
            ch.sections.forEach(function(sec) {
                var heading = sec.heading ? sec.heading.toLowerCase() : '';

                // ─── NEW DIAGRAMS (Prioritized to prevent greedy matching from older broad rules) ───
                // CBT Triangle
                if ((ch.id === 'ch-14' && heading === 'why this chapter matters') && !sec.interactiveDiagram) {
                    if (!applied.has('cbtTriangle')) { sec.interactiveDiagram = window._epppDiagrams.cbtTriangle; applied.add('cbtTriangle'); }
                }
                // Systematic Desensitization
                if ((heading.includes('systematic desensitization') || heading.includes('exposure therapies') || heading.includes('exposure therapy')) && !sec.interactiveDiagram) {
                    if (!applied.has('systematicDesensitization')) { sec.interactiveDiagram = window._epppDiagrams.systematicDesensitization; applied.add('systematicDesensitization'); }
                }
                // DBT Modules
                if ((heading.includes('dialectical') || heading.includes('dbt') || heading.includes('borderline personality') || heading.includes('linehan')) && !sec.interactiveDiagram) {
                    if (!applied.has('dbtModules')) { sec.interactiveDiagram = window._epppDiagrams.dbtModules; applied.add('dbtModules'); }
                }
                // Visual Pathway
                if ((heading.includes(' vision') || heading === 'vision' || heading.includes('visual pathway') || heading.includes('occipital') || heading.includes('lateralization') || heading.includes('split-brain')) && !sec.interactiveDiagram) {
                    if (!applied.has('visualPathway')) { sec.interactiveDiagram = window._epppDiagrams.visualPathway; applied.add('visualPathway'); }
                }
                // Cognitive Dissonance
                if ((heading.includes('dissonance') || heading.includes('festinger') || heading.includes('attitude') || heading.includes('persuasion')) && !sec.interactiveDiagram) {
                    if (!applied.has('cognitiveDissonance')) { sec.interactiveDiagram = window._epppDiagrams.cognitiveDissonance; applied.add('cognitiveDissonance'); }
                }
                // Kohlberg
                if ((heading.includes('kohlberg') || heading.includes('moral development') || heading.includes('gilligan')) && !sec.interactiveDiagram) {
                    if (!applied.has('kohlbergMoral')) { sec.interactiveDiagram = window._epppDiagrams.kohlbergMoral; applied.add('kohlbergMoral'); }
                }
                // Types of Validity
                if ((heading.includes('types of validity') || heading.includes('construct validity') || heading.includes('predictive validity') || heading.includes('validity: does the test measure')) && !sec.interactiveDiagram) {
                    if (!applied.has('typesOfValidity')) { sec.interactiveDiagram = window._epppDiagrams.typesOfValidity; applied.add('typesOfValidity'); }
                }

                // Asch Conformity
                if ((heading.includes('conformity') || heading.includes('asch')) && !sec.interactiveDiagram) {
                    if (!applied.has('aschConformity')) { sec.interactiveDiagram = window._epppDiagrams.aschConformity; applied.add('aschConformity'); }
                }
                // Bystander Intervention
                if ((heading.includes('bystander') || heading.includes('prosocial') || heading.includes('altruism') || heading.includes('latan')) && !sec.interactiveDiagram) {
                    if (!applied.has('bystanderIntervention')) { sec.interactiveDiagram = window._epppDiagrams.bystanderIntervention; applied.add('bystanderIntervention'); }
                }
                // Autonomic Nervous System
                if ((heading.includes('autonomic') || heading.includes('sympathetic') || heading.includes('parasympathetic') || heading.includes('nervous system')) && !sec.interactiveDiagram) {
                    if (!applied.has('autonomicNervousSystem')) { sec.interactiveDiagram = window._epppDiagrams.autonomicNervousSystem; applied.add('autonomicNervousSystem'); }
                }

                // ─── EXISTING DIAGRAMS ───
                // Neuron / Action Potential diagrams
                if ((heading.includes('neuron') || heading.includes('action potential') || heading.includes('neural communication') || heading.includes('nervous system')) && !sec.interactiveDiagram) {
                    if (!applied.has('neuronActionPotential')) { sec.interactiveDiagram = window._epppDiagrams.neuronActionPotential; applied.add('neuronActionPotential'); }
                }
                // Classical conditioning
                if ((heading.includes('classical conditioning') || heading.includes('pavlov') || heading.includes('respondent conditioning')) && !sec.interactiveDiagram) {
                    if (!applied.has('classicalConditioning')) { sec.interactiveDiagram = window._epppDiagrams.classicalConditioning; applied.add('classicalConditioning'); }
                }
                // HPA Axis / Stress
                if ((heading.includes('hpa') || heading.includes('stress response') || heading.includes('hypothalamic') || (heading.includes('stress') && heading.includes('biolog'))) && !sec.interactiveDiagram) {
                    if (!applied.has('hpaAxis')) { sec.interactiveDiagram = window._epppDiagrams.hpaAxis; applied.add('hpaAxis'); }
                }
                // Brain regions / lobes
                if ((heading.includes('brain region') || heading.includes('cerebral cortex') || heading.includes('lobes of the brain') || heading.includes('cortical areas') || heading.includes('brain structure')) && !sec.interactiveDiagram) {
                    if (!applied.has('brainRegions')) { sec.interactiveDiagram = window._epppDiagrams.brainRegions; applied.add('brainRegions'); }
                }
                // Dopamine pathways
                if ((heading.includes('dopamine') || heading.includes('neurotransmitter pathways') || heading.includes('dopaminergic')) && !sec.interactiveDiagram) {
                    if (!applied.has('dopaminePathways')) { sec.interactiveDiagram = window._epppDiagrams.dopaminePathways; applied.add('dopaminePathways'); }
                }
                // Erikson's stages
                if ((heading.includes('erikson') || heading.includes('psychosocial stages') || heading.includes('psychosocial development')) && !sec.interactiveDiagram) {
                    if (!applied.has('eriksonStages')) { sec.interactiveDiagram = window._epppDiagrams.eriksonStages; applied.add('eriksonStages'); }
                }
                // Differential diagnosis
                if ((heading.includes('differential diagnosis') || heading.includes('diagnostic hierarchy')) && !sec.interactiveDiagram) {
                    if (!applied.has('differentialDx')) { sec.interactiveDiagram = window._epppDiagrams.differentialDx; applied.add('differentialDx'); }
                }
                // Normal distribution
                if ((heading.includes('normal distribution') || heading.includes('bell curve') || heading.includes('standard score') || heading.includes('standard deviation')) && !sec.interactiveDiagram) {
                    if (!applied.has('normalDistribution')) { sec.interactiveDiagram = window._epppDiagrams.normalDistribution; applied.add('normalDistribution'); }
                }
                // Operant conditioning
                if ((heading.includes('operant') || heading.includes('skinner') || heading.includes('reinforcement') || heading.includes('behavioral conditioning')) && !sec.interactiveDiagram) {
                    if (!applied.has('operantConditioning')) { sec.interactiveDiagram = window._epppDiagrams.operantConditioning; applied.add('operantConditioning'); }
                }
                // Piaget stages
                if ((heading.includes('piaget') || heading.includes('cognitive development')) && !sec.interactiveDiagram) {
                    if (!applied.has('piagetStages')) { sec.interactiveDiagram = window._epppDiagrams.piagetStages; applied.add('piagetStages'); }
                }
                // Synapse / Psychotropics
                if ((heading.includes('psychopharmacology') || heading.includes('antidepressant') || heading.includes('synapse') || heading.includes('synaptic') || heading.includes('medicat')) && !sec.interactiveDiagram) {
                    if (!applied.has('synapseDrugs')) { sec.interactiveDiagram = window._epppDiagrams.synapseDrugs; applied.add('synapseDrugs'); }
                }
                // Freud's Iceberg Model
                if ((heading.includes('freud') || heading.includes('psychoanalytic') || heading.includes('psychodynamic') || heading.includes('personality structure') || heading.includes('id, ego')) && !sec.interactiveDiagram) {
                    if (!applied.has('freudIceberg')) { sec.interactiveDiagram = window._epppDiagrams.freudIceberg; applied.add('freudIceberg'); }
                }
                // Reliability vs Validity
                if ((ch.id === 'ch-1' && heading.includes('reliability: is the test consistent')) && !heading.includes('threats') && !heading.includes('validity scales') && !heading.includes('performance validity') && !sec.interactiveDiagram) {
                    if (!applied.has('reliabilityValidity')) { sec.interactiveDiagram = window._epppDiagrams.reliabilityValidity; applied.add('reliabilityValidity'); }
                }
                // Memory Model
                if ((heading.includes('memory model') || heading.includes('information processing') || heading.includes('atkinson') || heading.includes('short-term memory') || heading.includes('encoding')) && !sec.interactiveDiagram) {
                    if (!applied.has('memoryModel')) { sec.interactiveDiagram = window._epppDiagrams.memoryModel; applied.add('memoryModel'); }
                }
                // Maslow's Hierarchy
                if ((heading.includes('maslow') || heading.includes('hierarchy of needs') || heading.includes('humanistic')) && !sec.interactiveDiagram) {
                    if (!applied.has('maslowHierarchy')) { sec.interactiveDiagram = window._epppDiagrams.maslowHierarchy; applied.add('maslowHierarchy'); }
                }
            });
        });

        console.log('PasstheEPPP: Interactive diagrams patched into textbook chapters. Total templates available: ' + Object.keys(window._epppDiagrams).length);
    }

    // Patch when DOM is ready (chapters load before this file)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', patchDiagrams);
    } else {
        patchDiagrams();
    }
})();
