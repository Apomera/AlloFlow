"""
Phase E5: Auto Glossary Integration for Bridge Mode
Changes:
1) Add bridgeTermsSaved state (tracks which terms have been saved)
2) Replace Save Terms button with per-term save + bulk save
3) Update term chips to show save buttons and saved state
4) Add localization keys for E5
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

# ============================
# 1) Add bridgeTermsSaved state (near bridgeProjectionMode)
# ============================
for i, l in enumerate(lines):
    if 'bridgeProjectionMode, setBridgeProjectionMode' in l:
        nearby = ''.join(lines[i:i+3])
        if 'bridgeTermsSaved' in nearby:
            print("[OK] 1: bridgeTermsSaved already present")
            break
        new_state = "  const [bridgeTermsSaved, setBridgeTermsSaved] = useState([]);\r\n"
        lines.insert(i + 1, new_state)
        changes += 1
        print("[OK] 1: Added bridgeTermsSaved state at L%d" % (i + 2))
        break

# ============================
# 2) Replace the simple Save Terms button + term chips with enhanced versions
#    Find the term chip rendering and replace with interactive chips
# ============================

# First, replace the term chip span with a clickable save-per-term chip
for i, l in enumerate(lines):
    if "bridgeMessage.terms.map((term, ti)" in l and "span key" in lines[i+1] if i+1 < len(lines) else "span key" in lines[i+2] if i+2 < len(lines) else False:
        # Find the span line (may be +1 or +2 due to blank lines)
        for j in range(i, min(i + 5, len(lines))):
            if "span key={ti}" in lines[j] and "rgba(99,102,241" in lines[j]:
                nearby = ''.join(lines[max(0,j-5):j+5])
                if 'bridge-term-save-btn' in nearby:
                    print("[OK] 2: Interactive term chips already present")
                    break
                # Replace the simple span with an interactive chip
                old_chip = lines[j]
                new_chip = (
                    "                  <span key={ti} className=\"bridge-term-chip-interactive\" style={{background: bridgeTermsSaved.includes(term) ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.2)', color: bridgeTermsSaved.includes(term) ? '#86efac' : '#a5b4fc', padding:'4px 10px', borderRadius:'8px', fontSize:'12px', fontWeight:500, display:'inline-flex', alignItems:'center', gap:'6px', transition:'all 0.2s'}}>\r\n"
                    "                    {term}\r\n"
                    "                    {!bridgeTermsSaved.includes(term) ? (\r\n"
                    "                      <button className=\"bridge-term-save-btn\" onClick={async (e) => {\r\n"
                    "                        e.stopPropagation();\r\n"
                    "                        try {\r\n"
                    "                          await handleQuickAddGlossary(term);\r\n"
                    "                          setBridgeTermsSaved(prev => [...prev, term]);\r\n"
                    "                          addToast(t('roster.bridge_term_saved', { term }) || `Saved \"${term}\" to glossary`, 'success');\r\n"
                    "                        } catch(err) {\r\n"
                    "                          warnLog('Bridge term save failed:', err);\r\n"
                    "                          addToast(t('roster.bridge_term_save_failed') || 'Failed to save term', 'error');\r\n"
                    "                        }\r\n"
                    "                      }} title={t('roster.bridge_save_term') || 'Save to glossary'} style={{background:'none', border:'1px solid rgba(165,180,252,0.3)', color:'#a5b4fc', padding:'2px 6px', borderRadius:'6px', fontSize:'10px', cursor:'pointer', transition:'all 0.2s'}}>+</button>\r\n"
                    "                    ) : (\r\n"
                    "                      <span style={{fontSize:'10px', opacity:0.7}}>✓</span>\r\n"
                    "                    )}\r\n"
                    "                  </span>\r\n"
                )
                lines[j] = new_chip
                changes += 1
                print("[OK] 2: Replaced term chip with interactive version at L%d" % (j + 1))
                break
        break

# ============================
# 3) Replace the bulk Save Terms button with Save All Remaining
# ============================
for i, l in enumerate(lines):
    if "bridge_save_terms" in l and "button" in l and "onClick" in l:
        # Find the full button block
        # The button starts a few lines above
        for j in range(max(0, i - 10), i + 1):
            if "bridge-action-btn" in lines[j] and "onClick" in lines[j]:
                # Find the end of this button (closing </button>)
                end_j = j
                for k in range(j, min(j + 10, len(lines))):
                    if "bridge_save_terms" in lines[k] and "/button>" in lines[k]:
                        end_j = k
                        break
                    elif "/button>" in lines[k] and k > j:
                        end_j = k
                        break
                
                nearby = ''.join(lines[j:end_j+1])
                if 'handleQuickAddGlossary' in nearby:
                    print("[OK] 3: Save All button already wired")
                    break
                
                # Replace lines j through end_j with new save-all button
                new_button = (
                    "                <button className=\"bridge-action-btn\" disabled={!bridgeMessage.terms || bridgeMessage.terms.every(t2 => bridgeTermsSaved.includes(t2))} onClick={async () => {\r\n"
                    "                  const unsaved = bridgeMessage.terms.filter(t2 => !bridgeTermsSaved.includes(t2));\r\n"
                    "                  if (unsaved.length === 0) return;\r\n"
                    "                  addToast(t('roster.bridge_saving_terms', { count: unsaved.length }) || `Saving ${unsaved.length} terms to glossary...`, 'info');\r\n"
                    "                  for (const term of unsaved) {\r\n"
                    "                    try {\r\n"
                    "                      await handleQuickAddGlossary(term);\r\n"
                    "                      setBridgeTermsSaved(prev => [...prev, term]);\r\n"
                    "                    } catch(err) {\r\n"
                    "                      warnLog('Bridge term save failed:', term, err);\r\n"
                    "                    }\r\n"
                    "                  }\r\n"
                    "                  addToast(t('roster.bridge_all_saved') || 'All terms saved to glossary!', 'success');\r\n"
                    "                }}>{bridgeMessage.terms && bridgeMessage.terms.every(t2 => bridgeTermsSaved.includes(t2))\r\n"
                    "                  ? (t('roster.bridge_terms_saved') || '✅ All Saved')\r\n"
                    "                  : (t('roster.bridge_save_terms') || '📖 Save All Terms')\r\n"
                    "                }</button>\r\n"
                )
                # Replace lines j to end_j
                lines[j:end_j+1] = [new_button]
                changes += 1
                print("[OK] 3: Replaced Save Terms button with Save All at L%d" % (j + 1))
                break
        break

# ============================
# 4) Reset bridgeTermsSaved when bridge message changes (in setBridgeMessage(null) close handler)
# ============================
for i, l in enumerate(lines):
    if "setBridgeMessage(null)" in l and "setBridgeKaraokeIndex(-1)" in l and i > 70000:
        if "setBridgeTermsSaved" in l:
            print("[OK] 4: bridgeTermsSaved reset already present")
            break
        lines[i] = l.replace(
            "setBridgeMessage(null); setBridgeKaraokeIndex(-1); setBridgeTtsPlaying(false);",
            "setBridgeMessage(null); setBridgeKaraokeIndex(-1); setBridgeTtsPlaying(false); setBridgeTermsSaved([]);"
        )
        changes += 1
        print("[OK] 4: Added bridgeTermsSaved reset in close handler at L%d" % (i + 1))
        break

# ============================
# 5) Add CSS for term chip save button
# ============================
for i, l in enumerate(lines):
    if '.bridge-projection-toggle:hover' in l:
        for j in range(i, min(i + 5, len(lines))):
            if '}' in lines[j]:
                nearby = ''.join(lines[j:j+10])
                if 'bridge-term-save-btn' in nearby:
                    print("[OK] 5: Term save CSS already present")
                    break
                css_block = (
                    "/* ====== Bridge Term Save (Phase E5) ====== */\r\n"
                    ".bridge-term-chip-interactive { cursor: default; }\r\n"
                    ".bridge-term-save-btn:hover {\r\n"
                    "  background: rgba(99,102,241,0.3) !important;\r\n"
                    "  border-color: rgba(165,180,252,0.6) !important;\r\n"
                    "  color: #c7d2fe !important;\r\n"
                    "  transform: scale(1.1);\r\n"
                    "}\r\n"
                )
                lines.insert(j + 1, css_block)
                changes += 1
                print("[OK] 5: Added term save CSS at L%d" % (j + 2))
                break
        break

# ============================
# 6) Add localization keys for E5
# ============================
for i, l in enumerate(lines):
    if 'bridge_offline_info:' in l and i > 15000 and i < 16000:
        nearby = ''.join(lines[i:i+5])
        if 'bridge_term_saved' in nearby:
            print("[OK] 6: E5 localization keys already present")
            break
        loc_keys = (
            "      bridge_term_saved: 'Saved \"{term}\" to glossary',\r\n"
            "      bridge_term_save_failed: 'Failed to save term',\r\n"
            "      bridge_save_term: 'Save to glossary',\r\n"
            "      bridge_saving_terms: 'Saving {count} terms to glossary...',\r\n"
            "      bridge_all_saved: 'All terms saved to glossary!',\r\n"
            "      bridge_terms_saved: '✅ All Saved',\r\n"
        )
        lines.insert(i + 1, loc_keys)
        changes += 1
        print("[OK] 6: Added 6 E5 localization keys at L%d" % (i + 2))
        break

# ============================
# SAVE
# ============================
content = ''.join(lines)
content = content.replace('\r\r\n', '\r\n')
open(filepath, 'w', encoding='utf-8').write(content)
print("\n=== Total %d changes applied ===" % changes)
