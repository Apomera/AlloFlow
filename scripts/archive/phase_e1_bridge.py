"""
Phase E1 — BridgeMessagePanel Component
6 changes:
1. State declarations (near resourceCount state ~L32113)
2. BridgeMessagePanel component (before RosterKeyPanel ~L70210)
3. CSS styles (before </style> ~L24602)
4. Mock trigger button (teacher toolbar, temp)
5. Component render in JSX (near RosterKeyPanel render)
6. Localization keys (roster: block ~L15028)
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

# ============================
# CHANGE 1: State declarations after fullPackTargetGroup
# ============================
for i, l in enumerate(lines):
    if 'fullPackTargetGroup' in l and 'useState' in l:
        nearby = ''.join(lines[i:i+6])
        if 'bridgeMessage' in nearby:
            print("[OK] CHANGE 1: State already exists")
            break
        new_state = (
            "  const [bridgeMessage, setBridgeMessage] = useState(null);\r\n"
            "  const [bridgeKaraokeIndex, setBridgeKaraokeIndex] = useState(-1);\r\n"
            "  const [bridgeActiveLanguage, setBridgeActiveLanguage] = useState(null);\r\n"
            "  const [bridgeTtsPlaying, setBridgeTtsPlaying] = useState(false);\r\n"
        )
        lines.insert(i + 1, new_state)
        changes += 1
        print("[OK] CHANGE 1: Added bridge state at L%d" % (i + 2))
        break

# ============================
# CHANGE 6: Localization keys (do before component so line numbers are stable for CSS)
# ============================
for i, l in enumerate(lines):
    if 'no_groups_to_generate' in l and i > 14000 and i < 16000:
        nearby = ''.join(lines[i:i+15])
        if 'bridge_title' in nearby:
            print("[OK] CHANGE 6: Localization keys already present")
            break
        loc_keys = (
            "      bridge_title: '📩 Message from your teacher',\r\n"
            "      bridge_play_en: '🔊 Play English',\r\n"
            "      bridge_play_translated: '🔊 Play Translation',\r\n"
            "      bridge_save_terms: '📖 Save Terms',\r\n"
            "      bridge_read_again: '🔄 Read Again',\r\n"
            "      bridge_close: 'Close',\r\n"
            "      bridge_english: 'English',\r\n"
            "      bridge_karaoke_on: 'Karaoke highlighting active',\r\n"
            "      bridge_test: '🧪 Test Bridge',\r\n"
        )
        lines.insert(i + 1, loc_keys)
        changes += 1
        print("[OK] CHANGE 6: Added 9 localization keys at L%d" % (i + 2))
        break

# ============================
# CHANGE 3: CSS styles before second </style>
# ============================
# Find the second </style> tag
style_ends = [i for i, l in enumerate(lines) if '</style>' in l]
if len(style_ends) >= 2:
    css_insert = style_ends[1]  # before the second </style>
    nearby = ''.join(lines[max(0, css_insert - 30):css_insert])
    if 'bridge-overlay' in nearby:
        print("[OK] CHANGE 3: CSS already present")
    else:
        css_block = (
            "/* ====== Bridge Message Panel (Phase E1) ====== */\r\n"
            ".bridge-overlay {\r\n"
            "  position: fixed; inset: 0; z-index: 9999;\r\n"
            "  display: flex; align-items: center; justify-content: center;\r\n"
            "  background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(8px);\r\n"
            "  animation: bridgeFadeIn 0.3s ease-out;\r\n"
            "}\r\n"
            "@keyframes bridgeFadeIn { from { opacity: 0; } to { opacity: 1; } }\r\n"
            "@keyframes bridgeSlideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }\r\n"
            ".bridge-panel {\r\n"
            "  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%);\r\n"
            "  border-radius: 24px; padding: 32px; max-width: 640px; width: 92vw;\r\n"
            "  max-height: 85vh; overflow-y: auto; color: #e2e8f0;\r\n"
            "  box-shadow: 0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(99,102,241,0.15);\r\n"
            "  animation: bridgeSlideUp 0.4s ease-out;\r\n"
            "  border: 1px solid rgba(99,102,241,0.3);\r\n"
            "}\r\n"
            ".bridge-header {\r\n"
            "  display: flex; justify-content: space-between; align-items: center;\r\n"
            "  margin-bottom: 20px; padding-bottom: 12px;\r\n"
            "  border-bottom: 1px solid rgba(99,102,241,0.2);\r\n"
            "}\r\n"
            ".bridge-header h2 { font-size: 18px; font-weight: 700; margin: 0; color: #c7d2fe; }\r\n"
            ".bridge-close-btn {\r\n"
            "  background: rgba(255,255,255,0.1); border: none; color: #94a3b8;\r\n"
            "  width: 32px; height: 32px; border-radius: 50%; cursor: pointer;\r\n"
            "  font-size: 16px; display: flex; align-items: center; justify-content: center;\r\n"
            "  transition: all 0.2s;\r\n"
            "}\r\n"
            ".bridge-close-btn:hover { background: rgba(255,255,255,0.2); color: #fff; }\r\n"
            ".bridge-image-container {\r\n"
            "  border-radius: 16px; overflow: hidden; margin-bottom: 20px;\r\n"
            "  border: 2px solid rgba(99,102,241,0.3);\r\n"
            "}\r\n"
            ".bridge-image-container img { width: 100%; height: auto; display: block; }\r\n"
            ".bridge-text-block {\r\n"
            "  background: rgba(255,255,255,0.06); border-radius: 16px;\r\n"
            "  padding: 20px; margin-bottom: 16px;\r\n"
            "  border: 1px solid rgba(255,255,255,0.08);\r\n"
            "}\r\n"
            ".bridge-lang-label {\r\n"
            "  font-size: 12px; font-weight: 600; text-transform: uppercase;\r\n"
            "  letter-spacing: 0.05em; color: #818cf8; margin-bottom: 10px;\r\n"
            "  display: flex; align-items: center; gap: 6px;\r\n"
            "}\r\n"
            ".bridge-text {\r\n"
            "  font-size: 20px; line-height: 1.7; font-weight: 400;\r\n"
            "  color: #e2e8f0; letter-spacing: 0.01em;\r\n"
            "}\r\n"
            ".bridge-word { display: inline; transition: all 0.15s ease; padding: 1px 2px; border-radius: 4px; }\r\n"
            ".bridge-word-active {\r\n"
            "  background: rgba(251,191,36,0.35); color: #fbbf24;\r\n"
            "  font-weight: 600; text-shadow: 0 0 10px rgba(251,191,36,0.3);\r\n"
            "}\r\n"
            ".bridge-audio-controls {\r\n"
            "  display: flex; align-items: center; gap: 10px; margin-top: 12px;\r\n"
            "}\r\n"
            ".bridge-play-btn {\r\n"
            "  background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none;\r\n"
            "  color: white; padding: 8px 16px; border-radius: 12px; cursor: pointer;\r\n"
            "  font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px;\r\n"
            "  transition: all 0.2s; box-shadow: 0 2px 8px rgba(99,102,241,0.3);\r\n"
            "}\r\n"
            ".bridge-play-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.4); }\r\n"
            ".bridge-play-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }\r\n"
            ".bridge-play-btn.playing { animation: bridgePulse 1.5s infinite; }\r\n"
            "@keyframes bridgePulse { 0%, 100% { box-shadow: 0 2px 8px rgba(99,102,241,0.3); } 50% { box-shadow: 0 2px 20px rgba(99,102,241,0.6); } }\r\n"
            ".bridge-progress {\r\n"
            "  flex: 1; height: 6px; background: rgba(255,255,255,0.1);\r\n"
            "  border-radius: 3px; overflow: hidden;\r\n"
            "}\r\n"
            ".bridge-progress-bar {\r\n"
            "  height: 100%; background: linear-gradient(90deg, #6366f1, #a78bfa);\r\n"
            "  border-radius: 3px; transition: width 0.3s linear;\r\n"
            "}\r\n"
            ".bridge-actions {\r\n"
            "  display: flex; gap: 10px; margin-top: 20px; padding-top: 16px;\r\n"
            "  border-top: 1px solid rgba(99,102,241,0.2);\r\n"
            "  flex-wrap: wrap;\r\n"
            "}\r\n"
            ".bridge-action-btn {\r\n"
            "  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);\r\n"
            "  color: #c7d2fe; padding: 10px 18px; border-radius: 12px;\r\n"
            "  cursor: pointer; font-size: 13px; font-weight: 500;\r\n"
            "  transition: all 0.2s; flex: 1; text-align: center; min-width: 120px;\r\n"
            "}\r\n"
            ".bridge-action-btn:hover { background: rgba(255,255,255,0.15); color: #fff; transform: translateY(-1px); }\r\n"
        )
        lines.insert(css_insert, css_block)
        changes += 1
        print("[OK] CHANGE 3: Added CSS at L%d" % (css_insert + 1))

# ============================
# CHANGE 2: BridgeMessagePanel component (before RosterKeyPanel render)
# ============================
for i, l in enumerate(lines):
    if '<RosterKeyPanel' in l and i > 69000:
        nearby = ''.join(lines[max(0, i-20):i])
        if 'BridgeMessagePanel' in nearby or 'bridge-overlay' in nearby:
            print("[OK] CHANGE 2: Component already present")
            break
        component_jsx = (
            "      {/* === BRIDGE MESSAGE PANEL (Phase E1) === */}\r\n"
            "      {bridgeMessage && (\r\n"
            "        <div className=\"bridge-overlay\" onClick={(e) => { if (e.target === e.currentTarget) setBridgeMessage(null); }}>\r\n"
            "          <div className=\"bridge-panel\">\r\n"
            "            <div className=\"bridge-header\">\r\n"
            "              <h2>{t('roster.bridge_title') || '📩 Message from your teacher'}</h2>\r\n"
            "              <button className=\"bridge-close-btn\" onClick={() => { setBridgeMessage(null); setBridgeKaraokeIndex(-1); setBridgeTtsPlaying(false); }}>✕</button>\r\n"
            "            </div>\r\n"
            "            {bridgeMessage.imageUrl && (\r\n"
            "              <div className=\"bridge-image-container\">\r\n"
            "                <img src={bridgeMessage.imageUrl} alt=\"Visual aid\" />\r\n"
            "              </div>\r\n"
            "            )}\r\n"
            "            <div className=\"bridge-text-block\">\r\n"
            "              <div className=\"bridge-lang-label\">🇺🇸 {t('roster.bridge_english') || 'English'}</div>\r\n"
            "              <div className=\"bridge-text\">\r\n"
            "                {bridgeMessage.english.split(/\\s+/).map((word, idx) => (\r\n"
            "                  <span key={idx} className={`bridge-word ${bridgeActiveLanguage === 'en' && idx === bridgeKaraokeIndex ? 'bridge-word-active' : ''}`}>\r\n"
            "                    {word}{' '}\r\n"
            "                  </span>\r\n"
            "                ))}\r\n"
            "              </div>\r\n"
            "              <div className=\"bridge-audio-controls\">\r\n"
            "                <button\r\n"
            "                  className={`bridge-play-btn ${bridgeTtsPlaying && bridgeActiveLanguage === 'en' ? 'playing' : ''}`}\r\n"
            "                  disabled={bridgeTtsPlaying}\r\n"
            "                  onClick={async () => {\r\n"
            "                    const text = bridgeMessage.english;\r\n"
            "                    const words = text.split(/\\s+/);\r\n"
            "                    setBridgeTtsPlaying(true);\r\n"
            "                    setBridgeActiveLanguage('en');\r\n"
            "                    const msPerWord = Math.max(200, 350 / ttsSpeed);\r\n"
            "                    let cancelled = false;\r\n"
            "                    const karaokeLoop = (async () => {\r\n"
            "                      for (let wi = 0; wi < words.length && !cancelled; wi++) {\r\n"
            "                        setBridgeKaraokeIndex(wi);\r\n"
            "                        await new Promise(r => setTimeout(r, msPerWord));\r\n"
            "                      }\r\n"
            "                      setBridgeKaraokeIndex(-1);\r\n"
            "                    })();\r\n"
            "                    try {\r\n"
            "                      await handleAudio(text);\r\n"
            "                    } catch(e) { warnLog('Bridge TTS error', e); }\r\n"
            "                    cancelled = true;\r\n"
            "                    setBridgeKaraokeIndex(-1);\r\n"
            "                    setBridgeTtsPlaying(false);\r\n"
            "                  }}\r\n"
            "                >\r\n"
            "                  🔊 {t('roster.bridge_play_en') || 'Play English'}\r\n"
            "                </button>\r\n"
            "                {bridgeTtsPlaying && bridgeActiveLanguage === 'en' && (\r\n"
            "                  <div className=\"bridge-progress\"><div className=\"bridge-progress-bar\" style={{width: bridgeKaraokeIndex >= 0 ? `${(bridgeKaraokeIndex / Math.max(1, bridgeMessage.english.split(/\\s+/).length)) * 100}%` : '0%'}} /></div>\r\n"
            "                )}\r\n"
            "              </div>\r\n"
            "            </div>\r\n"
            "            <div className=\"bridge-text-block\">\r\n"
            "              <div className=\"bridge-lang-label\">🌐 {bridgeMessage.languageName || bridgeMessage.language}</div>\r\n"
            "              <div className=\"bridge-text\">\r\n"
            "                {bridgeMessage.translated.split(/\\s+/).map((word, idx) => (\r\n"
            "                  <span key={idx} className={`bridge-word ${bridgeActiveLanguage === 'translated' && idx === bridgeKaraokeIndex ? 'bridge-word-active' : ''}`}>\r\n"
            "                    {word}{' '}\r\n"
            "                  </span>\r\n"
            "                ))}\r\n"
            "              </div>\r\n"
            "              <div className=\"bridge-audio-controls\">\r\n"
            "                <button\r\n"
            "                  className={`bridge-play-btn ${bridgeTtsPlaying && bridgeActiveLanguage === 'translated' ? 'playing' : ''}`}\r\n"
            "                  disabled={bridgeTtsPlaying}\r\n"
            "                  onClick={async () => {\r\n"
            "                    const text = bridgeMessage.translated;\r\n"
            "                    const words = text.split(/\\s+/);\r\n"
            "                    setBridgeTtsPlaying(true);\r\n"
            "                    setBridgeActiveLanguage('translated');\r\n"
            "                    const msPerWord = Math.max(200, 350 / ttsSpeed);\r\n"
            "                    let cancelled = false;\r\n"
            "                    const karaokeLoop = (async () => {\r\n"
            "                      for (let wi = 0; wi < words.length && !cancelled; wi++) {\r\n"
            "                        setBridgeKaraokeIndex(wi);\r\n"
            "                        await new Promise(r => setTimeout(r, msPerWord));\r\n"
            "                      }\r\n"
            "                      setBridgeKaraokeIndex(-1);\r\n"
            "                    })();\r\n"
            "                    try {\r\n"
            "                      await handleAudio(text);\r\n"
            "                    } catch(e) { warnLog('Bridge TTS error', e); }\r\n"
            "                    cancelled = true;\r\n"
            "                    setBridgeKaraokeIndex(-1);\r\n"
            "                    setBridgeTtsPlaying(false);\r\n"
            "                  }}\r\n"
            "                >\r\n"
            "                  🔊 {t('roster.bridge_play_translated') || 'Play Translation'}\r\n"
            "                </button>\r\n"
            "                {bridgeTtsPlaying && bridgeActiveLanguage === 'translated' && (\r\n"
            "                  <div className=\"bridge-progress\"><div className=\"bridge-progress-bar\" style={{width: bridgeKaraokeIndex >= 0 ? `${(bridgeKaraokeIndex / Math.max(1, bridgeMessage.translated.split(/\\s+/).length)) * 100}%` : '0%'}} /></div>\r\n"
            "                )}\r\n"
            "              </div>\r\n"
            "            </div>\r\n"
            "            {bridgeMessage.terms && bridgeMessage.terms.length > 0 && (\r\n"
            "              <div style={{display:'flex', flexWrap:'wrap', gap:'6px', marginTop:'12px', marginBottom:'8px'}}>\r\n"
            "                {bridgeMessage.terms.map((term, ti) => (\r\n"
            "                  <span key={ti} style={{background:'rgba(99,102,241,0.2)', color:'#a5b4fc', padding:'4px 10px', borderRadius:'8px', fontSize:'12px', fontWeight:500}}>{term}</span>\r\n"
            "                ))}\r\n"
            "              </div>\r\n"
            "            )}\r\n"
            "            <div className=\"bridge-actions\">\r\n"
            "              {bridgeMessage.terms && bridgeMessage.terms.length > 0 && (\r\n"
            "                <button className=\"bridge-action-btn\" onClick={() => {\r\n"
            "                  addToast(`Saved ${bridgeMessage.terms.length} terms to vocabulary`, 'success');\r\n"
            "                }}>{t('roster.bridge_save_terms') || '📖 Save Terms'}</button>\r\n"
            "              )}\r\n"
            "              <button className=\"bridge-action-btn\" onClick={async () => {\r\n"
            "                setBridgeTtsPlaying(true); setBridgeActiveLanguage('en');\r\n"
            "                const words = bridgeMessage.english.split(/\\s+/);\r\n"
            "                const msPerWord = Math.max(200, 350 / ttsSpeed);\r\n"
            "                for (let wi = 0; wi < words.length; wi++) { setBridgeKaraokeIndex(wi); await new Promise(r => setTimeout(r, msPerWord)); }\r\n"
            "                setBridgeKaraokeIndex(-1);\r\n"
            "                try { await handleAudio(bridgeMessage.english); } catch(e) {}\r\n"
            "                setBridgeActiveLanguage('translated');\r\n"
            "                const tWords = bridgeMessage.translated.split(/\\s+/);\r\n"
            "                for (let wi = 0; wi < tWords.length; wi++) { setBridgeKaraokeIndex(wi); await new Promise(r => setTimeout(r, msPerWord)); }\r\n"
            "                setBridgeKaraokeIndex(-1);\r\n"
            "                try { await handleAudio(bridgeMessage.translated); } catch(e) {}\r\n"
            "                setBridgeTtsPlaying(false);\r\n"
            "              }}>{t('roster.bridge_read_again') || '🔄 Read Again'}</button>\r\n"
            "              <button className=\"bridge-action-btn\" onClick={() => { setBridgeMessage(null); setBridgeKaraokeIndex(-1); setBridgeTtsPlaying(false); }}>{t('roster.bridge_close') || 'Close'}</button>\r\n"
            "            </div>\r\n"
            "          </div>\r\n"
            "        </div>\r\n"
            "      )}\r\n"
        )
        lines.insert(i, component_jsx)
        changes += 1
        print("[OK] CHANGE 2: Added BridgeMessagePanel JSX at L%d" % (i + 1))
        break

# ============================
# CHANGE 4: Mock trigger button in teacher toolbar (near help mode button)
# ============================
for i, l in enumerate(lines):
    if 'data-help-key="fullpack_generate"' in l and i > 59000:
        # Go back to find the container div opening
        nearby = ''.join(lines[max(0, i-15):i])
        if 'bridge_test' in nearby or 'Test Bridge' in nearby:
            print("[OK] CHANGE 4: Mock trigger already present")
            break
        # Insert before the fullpack button container
        for j in range(i-1, max(i-20, 0), -1):
            if 'tour-tool-fullpack' in lines[j]:
                mock_btn = (
                    "            {isTeacherMode && (\r\n"
                    "              <button\r\n"
                    "                onClick={() => setBridgeMessage({\r\n"
                    "                  english: 'Plants use sunlight and water to make their own food. This process is called photosynthesis. During photosynthesis, plants convert light energy into chemical energy stored in glucose.',\r\n"
                    "                  translated: 'Dhirtu waxay adeegsadaan iftiinka qorraxda iyo biyaha si ay cuntadooda u sameeyaan. Habkan waxaa loo yaqaanaa photosynthesis. Inta lagu jiro photosynthesis, dhirtu waxay u beddelaan tamarta iftiinka tamar kiimiko ah oo lagu kaydiyo glucose.',\r\n"
                    "                  language: 'so-SO',\r\n"
                    "                  languageName: '🇸🇴 Soomaali',\r\n"
                    "                  imageUrl: null,\r\n"
                    "                  terms: ['photosynthesis', 'sunlight', 'glucose', 'chemical energy'],\r\n"
                    "                  timestamp: Date.now()\r\n"
                    "                })}\r\n"
                    "                className=\"text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-lg hover:bg-purple-200 transition-colors mb-2\"\r\n"
                    "                title=\"Dev: Test Bridge Message Panel\"\r\n"
                    "              >{t('roster.bridge_test') || '🧪 Test Bridge'}</button>\r\n"
                    "            )}\r\n"
                )
                lines.insert(j, mock_btn)
                changes += 1
                print("[OK] CHANGE 4: Added mock trigger button at L%d" % (j + 1))
                break
        break

# ============================
# SAVE + CLEANUP
# ============================
content = ''.join(lines)
content = content.replace('\r\r\n', '\r\n')
open(filepath, 'w', encoding='utf-8').write(content)
print("\n=== Total %d changes applied ===" % changes)
