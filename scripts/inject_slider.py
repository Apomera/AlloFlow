import re

INDEX_PATH = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\index.html"

# Read original
with open(INDEX_PATH, 'r', encoding='utf-8') as f:
    text = f.read()

# Define the new CSS to inject at the end of <head>
css = """
    <!-- AlloFlow Architecture Slider CSS -->
    <style>
        #arch-slider-container {
            width: 100%;
            border-radius: 12px;
            overflow: hidden;
            position: relative;
            background: linear-gradient(135deg, #0f172a, #1e1b4b);
            color: #f8fafc;
            font-family: 'Inter', sans-serif;
            border: 1px solid #334155;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            display: flex;
            flex-direction: column;
        }
        #arch-slides-viewport {
            flex-grow: 1;
            position: relative;
            min-height: 380px;
            overflow: hidden;
        }
        .arch-slide {
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            padding: 2.5rem 2rem;
            opacity: 0;
            transform: translateX(50px);
            transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: none;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .arch-slide.active {
            opacity: 1;
            transform: translateX(0);
            pointer-events: all;
        }
        .arch-slide.prev {
            transform: translateX(-50px);
        }
        .arch-slide-tag {
            display: inline-block;
            padding: 4px 12px;
            background: rgba(99, 102, 241, 0.15);
            color: #a5b4fc;
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 999px;
            font-size: 0.7rem;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            margin-bottom: 12px;
            align-self: flex-start;
        }
        .arch-slide h3 {
            font-family: 'Outfit', sans-serif;
            font-size: 1.8rem;
            font-weight: 800;
            margin-bottom: 12px;
            line-height: 1.2;
            background: linear-gradient(135deg, #a5b4fc, #67e8f9);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .arch-slide p {
            font-size: 0.9rem;
            line-height: 1.6;
            color: #94a3b8;
            margin-bottom: 20px;
        }
        .arch-metrics {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }
        .arch-metric {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255,255,255,0.05);
            padding: 12px;
            border-radius: 8px;
        }
        .arch-metric-val {
            font-family: 'Outfit', sans-serif;
            font-size: 1.5rem;
            font-weight: 800;
            color: #f8fafc;
        }
        .arch-metric-lbl {
            font-size: 0.7rem;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        #arch-controls {
            padding: 12px 20px;
            background: rgba(15, 23, 42, 0.8);
            border-top: 1px solid #334155;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .arch-btn {
            background: transparent;
            border: 1px solid #475569;
            color: #f8fafc;
            width: 36px; height: 36px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.2s;
        }
        .arch-btn:hover { background: #334155; }
        #arch-indicator {
            font-size: 0.85rem;
            font-weight: 700;
            color: #94a3b8;
            font-variant-numeric: tabular-nums;
        }
        .code-snippet {
            background: #0b0f19;
            padding: 12px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 0.75rem;
            color: #10b981;
            border: 1px solid #1e293b;
            overflow-x: auto;
            margin-bottom: 12px;
        }
    </style>
"""

# HTML replacement
html_block = """
                    <!-- Integrated Architecture Slider -->
                    <div id="arch-slider-container">
                        <div id="arch-slides-viewport">
                            
                            <!-- Slide 1 -->
                            <div class="arch-slide active">
                                <div class="arch-slide-tag">Scale & Limits</div>
                                <h3>The 4.2MB Edge Monolith</h3>
                                <p>AlloFlow operates on a radical architectural principle: extreme React consolidation to bypass router-switching latency and achieve 0ms global context propagation.</p>
                                <div class="arch-metrics">
                                    <div class="arch-metric">
                                        <div class="arch-metric-val">4.2MB</div>
                                        <div class="arch-metric-lbl">Total Bundle Size</div>
                                    </div>
                                    <div class="arch-metric">
                                        <div class="arch-metric-val">63,000+</div>
                                        <div class="arch-metric-lbl">Lines of Javascript</div>
                                    </div>
                                    <div class="arch-metric">
                                        <div class="arch-metric-val">250+</div>
                                        <div class="arch-metric-lbl">Unique Feature Configurations</div>
                                    </div>
                                    <div class="arch-metric">
                                        <div class="arch-metric-val">Single File</div>
                                        <div class="arch-metric-lbl">Deployment Artifact</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Slide 2 -->
                            <div class="arch-slide">
                                <div class="arch-slide-tag">Hardware Acceleration</div>
                                <h3>Decoupled CDN Canvas Injectors</h3>
                                <p>To keep the monolith lean, heavy physics and 3D packages (Recharts, 3D Dice, STEM Lab Physics) are stripped out, IIFE-compiled to GitHub, and dynamically evaluated at runtime via jsDelivr CDN.</p>
                                <div class="code-snippet">
// Runtime Module Evaluation
const src = 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@latest/libs/stem_lab_clean.js';<br>
const response = await fetch(src);<br>
eval(await response.text());
                                </div>
                                <p style="font-size:0.8rem; margin:0;">This decapitation strategy allows AlloFlow to process heavy canvas rendering without bloating the initial Gemini Canvas memory cache.</p>
                            </div>

                            <!-- Slide 3 -->
                            <div class="arch-slide">
                                <div class="arch-slide-tag">AI Pipeline</div>
                                <h3>Dual-Gemini Orchestration</h3>
                                <p>AlloFlow dynamically scopes API requirements, directing generative payloads to twin models based on latency and cognition demands.</p>
                                <div class="arch-metrics" style="grid-template-columns: 1fr;">
                                    <div class="arch-metric" style="border-left: 3px solid #06b6d4;">
                                        <div class="arch-metric-val" style="font-size:1.1rem; color:#06b6d4;">Flash Lite (v2.5)</div>
                                        <div style="font-size:0.8rem; color:#94a3b8; margin-top:4px;">Used for raw speed: sub-second Phoneme tagging, JSON structuring, and real-time hint generation.</div>
                                    </div>
                                    <div class="arch-metric" style="border-left: 3px solid #10b981;">
                                        <div class="arch-metric-val" style="font-size:1.1rem; color:#10b981;">Flash Pro (v2.5)</div>
                                        <div style="font-size:0.8rem; color:#94a3b8; margin-top:4px;">Used for cognitive heavy-lifting: DOK Level 3+ Quiz generations and immersive native translations.</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Slide 4 -->
                            <div class="arch-slide">
                                <div class="arch-slide-tag">System Reliability</div>
                                <h3>Deterministic JSON Healing</h3>
                                <p>Generative UI requires aggressive fault tolerance. We do not trust raw LLM output. The engine relies on deterministic regex pipelines and structural fallbacks to prevent Canvas crashes.</p>
                                <div class="code-snippet">
let cleaned = cleanJson(result);<br>
cleaned = cleaned.replace(/(?![/u\\"bfnrt])/g, "");<br>
rawContent = safeJsonParse(cleaned);<br>
if (!rawContent) rawContent = recoverStructuralData(result);
                                </div>
                                <p style="font-size:0.8rem; margin:0;">In the event of an LLM hallucination, the system structurally repairs missing schemas to gracefully render a UI error state rather than blanking the DOM.</p>
                            </div>

                            <!-- Slide 5 -->
                            <div class="arch-slide">
                                <div class="arch-slide-tag">Bimodal UX Orchestration</div>
                                <h3>The AI Tour Engine</h3>
                                <p>Allobot isn't just a chatbot; it's a physically embodied agent. The Tour Engine reads generated instructions, scans the DOM for <code style="color:#a5b4fc">data-help-key</code> hooks, and dynamically absolute-positions elements while manipulating app states.</p>
                                <div class="arch-metrics" style="grid-template-columns: 1fr;">
                                    <div class="arch-metric" style="border-left: 3px solid #f59e0b;">
                                        <div class="arch-metric-val" style="font-size:1.1rem; color:#fbbf24;">Action Execution Pipeline</div>
                                        <div style="font-size:0.8rem; color:#94a3b8; margin-top:4px;">Parses {action: "open_sidebar", elementId: "tool_stemlab"}. Auto-scrolls user, opens sidebar, highlights grid target, and streams TTS synchronously.</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Slide 6 -->
                            <div class="arch-slide">
                                <div class="arch-slide-tag">Memory Leak Prevention</div>
                                <h3>TTS Proxy Audio Caching</h3>
                                <p>AlloFlow generates hundreds of base64 TTS audio strings dynamically per session (for reading passages, phoneme blending, and translation).</p>
                                <div class="code-snippet">
const handler = {<br>
&nbsp;&nbsp;get: function(target, prop) {<br>
&nbsp;&nbsp;&nbsp;&nbsp;if (!audioCache[prop]) audioCache[prop] = initializeProxy(prop);<br>
&nbsp;&nbsp;&nbsp;&nbsp;return audioCache[prop];<br>
&nbsp;&nbsp;}<br>
};
                                </div>
                                <p style="font-size:0.8rem; margin:0;">Storing enormous binary audio chunks directly in React state causes invariant violation loop crashes. The Proxy wrapper creates isolated memoized audio bank objects that outlive the React render cycle.</p>
                            </div>

                            <!-- Slide 7 -->
                            <div class="arch-slide">
                                <div class="arch-slide-tag">Accessibility Constraints</div>
                                <h3>Hybrid Grapheme-IPA Mapping</h3>
                                <p>Word Sounds Studio solves the 'Orthographic Conflict' problem in English phonemes.</p>
                                <p style="font-size:0.85rem">When an AI teaches Phonics for a word like 'Knight', it must visually display 'kn' to the student, but map the audio precisely to the IPA symbol /n/ for TTS synthesis accuracy. The engine parses parallel dual arrays matching the visual grapheme block to the hidden auditory instruction.</p>
                            </div>

                            <!-- Slide 8 -->
                            <div class="arch-slide">
                                <div class="arch-slide-tag">Data Sovereignty</div>
                                <h3>Sneakernet Local Persistence</h3>
                                <p>AlloFlow is designed for the strictest district privacy implementations. It features zero backend databases.</p>
                                <div class="arch-metrics" style="grid-template-columns: 1fr;">
                                    <div class="arch-metric">
                                        <div class="arch-metric-val" style="font-size:1.1rem; color:#fff;">IndexedDB LZ-String</div>
                                        <div style="font-size:0.8rem; color:#94a3b8; margin-top:4px;">All proprietary session data is compressed and retained entirely on the local device browser index. Data transfer requires physical JSON "Sneakernet" downloads, maintaining isolated airtight FERPA compliance by default.</div>
                                    </div>
                                </div>
                            </div>

                        </div>
                        
                        <!-- Controls -->
                        <div id="arch-controls">
                            <button class="arch-btn" id="arch-prev" aria-label="Previous Slide"><i data-lucide="chevron-left" style="width:18px;height:18px;"></i></button>
                            <div id="arch-indicator">1 of 8</div>
                            <button class="arch-btn" id="arch-next" aria-label="Next Slide"><i data-lucide="chevron-right" style="width:18px;height:18px;"></i></button>
                        </div>
                    </div>

                    <script>
                        // Arch Slider Logic
                        const archSlides = document.querySelectorAll('.arch-slide');
                        const archPrev = document.getElementById('arch-prev');
                        const archNext = document.getElementById('arch-next');
                        const archIndicator = document.getElementById('arch-indicator');
                        let archCurrent = 0;

                        function renderArch() {
                            archSlides.forEach((slide, i) => {
                                slide.classList.remove('active', 'prev');
                                if (i === archCurrent) slide.classList.add('active');
                                else if (i < archCurrent) slide.classList.add('prev');
                            });
                            archIndicator.textContent = `${archCurrent + 1} of ${archSlides.length}`;
                        }

                        archPrev.addEventListener('click', () => { if(archCurrent > 0) { archCurrent--; renderArch(); }});
                        archNext.addEventListener('click', () => { if(archCurrent < archSlides.length - 1) { archCurrent++; renderArch(); }});
                    </script>
"""

# 1. Inject CSS before </head>
text = text.replace('</head>', css + '\n</head>')

# 2. Find the Slide Deck preview and replace it
deck_start_pattern = r'<div class="card"\s*style="padding:0;overflow:hidden;border:1px solid #cbd5e1;display:flex;flex-direction:column">'
math_idx = re.search(deck_start_pattern, text)

if math_idx:
    start_pos = math_idx.start()
    
    # We need to find the matching closing div for this card.
    # We'll use a simple approach: find the next exactly matching structural end, or manual count
    # Because it's a known string, let's just use string replacement on a chunk.
    
    end_pattern = '</div>\n                    </div>\n                </div>\n            </div>\n        </section>'
    end_pos = text.find(end_pattern, start_pos)
    
    if end_pos != -1:
        # We replace from start_pos to end_pos
        text = text[:start_pos] + html_block + text[end_pos:]
        print("Replaced Slider Successfully.")
        
        with open(INDEX_PATH, 'w', encoding='utf-8') as f:
            f.write(text)
    else:
        print("Could not find end pattern.")
else:
    print("Could not find deck start pattern.")
