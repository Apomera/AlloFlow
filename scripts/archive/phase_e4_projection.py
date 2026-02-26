"""
Phase E4: Single-Device / Projection Mode for Bridge
Changes:
1) Add bridgeProjectionMode state
2) Add projection toggle in BridgeMessagePanel header
3) Add projection CSS (larger text, optimized for projector)
4) Ensure Bridge Mode button works without active session
5) Add group profile selector dropdown in send panel for offline use
6) Add localization keys for E4
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

# ============================
# 1) Add bridgeProjectionMode state (near bridgeSend states)
# ============================
for i, l in enumerate(lines):
    if 'lastBridgeTimestampRef = useRef(0)' in l:
        nearby = ''.join(lines[i:i+3])
        if 'bridgeProjectionMode' in nearby:
            print("[OK] 1: bridgeProjectionMode already present")
            break
        new_state = "  const [bridgeProjectionMode, setBridgeProjectionMode] = useState(false);\r\n"
        lines.insert(i + 1, new_state)
        changes += 1
        print("[OK] 1: Added bridgeProjectionMode state at L%d" % (i + 2))
        break

# ============================
# 2) Add projection toggle button in BridgeMessagePanel header
#    Find the bridge-close-btn in the E1 panel and add a projection toggle before it
# ============================
for i, l in enumerate(lines):
    if 'bridge-close-btn' in l and 'setBridgeMessage(null)' in l and i > 60000:
        nearby = ''.join(lines[max(0,i-5):i])
        if 'projection-toggle' in nearby:
            print("[OK] 2: Projection toggle already present")
            break
        projection_btn = (
            "              <button className=\"bridge-projection-toggle\" onClick={() => setBridgeProjectionMode(p => !p)} title={bridgeProjectionMode ? (t('roster.bridge_exit_projection') || 'Exit Projection') : (t('roster.bridge_projection') || 'Projection Mode')}>\r\n"
            "                {bridgeProjectionMode ? '🖥️' : '📽️'}\r\n"
            "              </button>\r\n"
        )
        lines.insert(i, projection_btn)
        changes += 1
        print("[OK] 2: Added projection toggle before close button at L%d" % (i + 1))
        break

# ============================
# 3) Modify BridgeMessagePanel overlay class to include projection mode
#    Find className="bridge-overlay" and add conditional projection class
# ============================
for i, l in enumerate(lines):
    if 'className="bridge-overlay"' in l and i > 60000:
        nearby = ''.join(lines[i:i+3])
        if 'bridge-projection' in nearby:
            print("[OK] 3: Projection class already present")
            break
        lines[i] = l.replace(
            'className="bridge-overlay"',
            'className={`bridge-overlay ${bridgeProjectionMode ? "bridge-projection" : ""}`}'
        )
        changes += 1
        print("[OK] 3: Added conditional projection class at L%d" % (i + 1))
        break

# ============================
# 4) Add projection CSS (after existing bridge CSS)
# ============================
for i, l in enumerate(lines):
    if '.bridge-close-btn:hover' in l:
        # Find the end of that rule (next closing brace)
        for j in range(i, min(i + 5, len(lines))):
            if '}' in lines[j] and 'bridge-close-btn' not in lines[j]:
                nearby = ''.join(lines[j:j+10])
                if 'bridge-projection' in nearby:
                    print("[OK] 4: Projection CSS already present")
                    break
                projection_css = (
                    "/* ====== Bridge Projection Mode (Phase E4) ====== */\r\n"
                    ".bridge-projection .bridge-panel {\r\n"
                    "  max-width: 95vw; max-height: 95vh; padding: 40px 48px;\r\n"
                    "}\r\n"
                    ".bridge-projection .bridge-text-block {\r\n"
                    "  font-size: 28px; line-height: 1.8;\r\n"
                    "}\r\n"
                    ".bridge-projection .bridge-lang-label {\r\n"
                    "  font-size: 16px;\r\n"
                    "}\r\n"
                    ".bridge-projection .bridge-play-btn {\r\n"
                    "  font-size: 18px; padding: 12px 28px;\r\n"
                    "}\r\n"
                    ".bridge-projection .bridge-term-chip {\r\n"
                    "  font-size: 16px; padding: 8px 16px;\r\n"
                    "}\r\n"
                    ".bridge-projection .bridge-actions {\r\n"
                    "  gap: 16px;\r\n"
                    "}\r\n"
                    ".bridge-projection .bridge-actions button {\r\n"
                    "  font-size: 16px; padding: 14px 28px;\r\n"
                    "}\r\n"
                    ".bridge-projection .bridge-visual-card img {\r\n"
                    "  max-height: 50vh;\r\n"
                    "}\r\n"
                    ".bridge-projection-toggle {\r\n"
                    "  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);\r\n"
                    "  color: #94a3b8; padding: 6px 12px; border-radius: 8px;\r\n"
                    "  cursor: pointer; font-size: 16px; transition: all 0.2s;\r\n"
                    "}\r\n"
                    ".bridge-projection-toggle:hover {\r\n"
                    "  background: rgba(255,255,255,0.15); color: #e2e8f0;\r\n"
                    "}\r\n"
                )
                lines.insert(j + 1, projection_css)
                changes += 1
                print("[OK] 4: Added projection CSS at L%d" % (j + 2))
                break
        break

# ============================
# 5) Add offline group selector in Bridge Send panel
#    Find bridge-send-target-row and add a profile preview when no session
# ============================
for i, l in enumerate(lines):
    if 'bridge-send-target-row' in l and 'className' in l and i > 60000:
        nearby = ''.join(lines[max(0,i-5):i])
        if 'bridge-offline-notice' in nearby:
            print("[OK] 5: Offline profile selector already present")
            break
        offline_block = (
            "            {!activeSessionCode && (\r\n"
            "              <div className=\"bridge-offline-notice\">\r\n"
            "                <span>📡</span>\r\n"
            "                <span>{t('roster.bridge_offline_info') || 'No live session — preview on this device only'}</span>\r\n"
            "              </div>\r\n"
            "            )}\r\n"
        )
        lines.insert(i, offline_block)
        changes += 1
        print("[OK] 5: Added offline notice at L%d" % (i + 1))
        break

# ============================
# 6) Add CSS for offline notice (after bridge-send-btn CSS)
# ============================
for i, l in enumerate(lines):
    if '.bridge-send-btn:disabled' in l:
        for j in range(i, min(i + 5, len(lines))):
            if '}' in lines[j]:
                nearby = ''.join(lines[j:j+10])
                if 'bridge-offline-notice' in nearby:
                    print("[OK] 6: Offline CSS already present")
                    break
                offline_css = (
                    ".bridge-offline-notice {\r\n"
                    "  display: flex; align-items: center; gap: 8px;\r\n"
                    "  padding: 10px 14px; margin-bottom: 12px;\r\n"
                    "  background: rgba(234,179,8,0.1); border: 1px solid rgba(234,179,8,0.25);\r\n"
                    "  border-radius: 10px; font-size: 12px; color: #fbbf24;\r\n"
                    "}\r\n"
                )
                lines.insert(j + 1, offline_css)
                changes += 1
                print("[OK] 6: Added offline notice CSS at L%d" % (j + 2))
                break
        break

# ============================
# 7) Add localization keys for E4
# ============================
for i, l in enumerate(lines):
    if 'bridge_generating:' in l and i > 15000 and i < 16000:
        nearby = ''.join(lines[i:i+5])
        if 'bridge_projection' in nearby:
            print("[OK] 7: E4 localization keys already present")
            break
        loc_keys = (
            "      bridge_projection: '📽️ Projection Mode',\r\n"
            "      bridge_exit_projection: '🖥️ Exit Projection',\r\n"
            "      bridge_offline_info: 'No live session — preview on this device only',\r\n"
        )
        lines.insert(i + 1, loc_keys)
        changes += 1
        print("[OK] 7: Added 3 E4 localization keys at L%d" % (i + 2))
        break

# ============================
# SAVE
# ============================
content = ''.join(lines)
content = content.replace('\r\r\n', '\r\n')
open(filepath, 'w', encoding='utf-8').write(content)
print("\n=== Total %d changes applied ===" % changes)
