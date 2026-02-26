"""Fix E5: Replace term chips with interactive save buttons and wire Save All."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
fixed = 0

# 1) Replace the simple term chip span with interactive version
for i, l in enumerate(lines):
    if "rgba(99,102,241,0.2)" in l and "{term}</span>" in l and i > 70000:
        new_chip = (
            "                  <span key={ti} className=\"bridge-term-chip-interactive\" style={{background: bridgeTermsSaved.includes(term) ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.2)', color: bridgeTermsSaved.includes(term) ? '#86efac' : '#a5b4fc', padding:'4px 10px', borderRadius:'8px', fontSize:'12px', fontWeight:500, display:'inline-flex', alignItems:'center', gap:'6px', transition:'all 0.2s'}}>{term} {!bridgeTermsSaved.includes(term) ? <button className=\"bridge-term-save-btn\" onClick={async (e) => { e.stopPropagation(); try { await handleQuickAddGlossary(term); setBridgeTermsSaved(prev => [...prev, term]); addToast(`Saved \"${term}\" to glossary`, 'success'); } catch(err) { warnLog('Bridge term save failed:', err); }}} style={{background:'none', border:'1px solid rgba(165,180,252,0.3)', color:'#a5b4fc', padding:'2px 6px', borderRadius:'6px', fontSize:'10px', cursor:'pointer'}}>+</button> : <span style={{fontSize:'10px', opacity:0.7}}>✓</span>}</span>\r\n"
        )
        lines[i] = new_chip
        fixed += 1
        print("[OK] Replaced term chip at L%d" % (i + 1))
        break

# 2) Replace the Save Terms button onclick
for i, l in enumerate(lines):
    if "bridge_save_terms" in l and "Save Terms" in l and i > 70000:
        # Find the onClick handler - go backwards to find the button start
        for j in range(i, max(i - 15, 0), -1):
            if "bridge-action-btn" in lines[j] and "onClick" in lines[j]:
                # Replace from j to i (the button block)
                new_button = (
                    "                <button className=\"bridge-action-btn\" disabled={!bridgeMessage.terms || bridgeMessage.terms.every(t2 => bridgeTermsSaved.includes(t2))} onClick={async () => { const unsaved = bridgeMessage.terms.filter(t2 => !bridgeTermsSaved.includes(t2)); if (unsaved.length === 0) return; addToast(`Saving ${unsaved.length} terms to glossary...`, 'info'); for (const term of unsaved) { try { await handleQuickAddGlossary(term); setBridgeTermsSaved(prev => [...prev, term]); } catch(err) { warnLog('Bridge term save failed:', term, err); } } addToast('All terms saved to glossary!', 'success'); }}>{bridgeMessage.terms && bridgeMessage.terms.every(t2 => bridgeTermsSaved.includes(t2)) ? '✅ All Saved' : (t('roster.bridge_save_terms') || '📖 Save All Terms')}</button>\r\n"
                )
                # Replace lines j through i
                lines[j:i+1] = [new_button]
                fixed += 1
                print("[OK] Replaced Save Terms button at L%d" % (j + 1))
                break
        break

open('AlloFlowANTI.txt', 'w', encoding='utf-8').write(''.join(lines))
print("\nFixed %d items" % fixed)
