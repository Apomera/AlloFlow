"""
Phase E2 + FERPA fix
Changes:
A) Replace FERPA subtitle with descriptive text
B) Add data-help-key to roster panel header
C) Add help_strings for roster panel
D) Add E2: Teacher Bridge Send UI (floating panel)
E) Add bridgeSendPanel state
F) Add Bridge Send button in toolbar (teacher-mode)
G) Add localization keys for E2
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

# ============================
# A) Replace FERPA subtitle localization
# ============================
for i, l in enumerate(lines):
    if "subtitle: 'FERPA-safe" in l or 'subtitle: "FERPA-safe' in l:
        lines[i] = "      subtitle: 'Organize student groups with differentiated profiles for instruction',\r\n"
        changes += 1
        print("[OK] A: Replaced FERPA subtitle at L%d" % (i + 1))
        break

# ============================
# B) Add data-help-key to roster panel header div
# ============================
for i, l in enumerate(lines):
    if "t('roster.title')" in l and 'Class Roster Key' in l:
        # Look for the header div just above
        for j in range(i-5, i):
            if '<div>' in lines[j] and j > 25000:
                lines[j] = lines[j].replace('<div>', '<div data-help-key="roster_panel_header">')
                changes += 1
                print("[OK] B: Added data-help-key to rosterpanel header at L%d" % (j + 1))
                break
        break

# ============================
# C) Add help_strings for roster panel (after group_roster_list)
# ============================
for i, l in enumerate(lines):
    if 'group_roster_list' in l and i > 15000 and i < 16000:
        nearby = ''.join(lines[i:i+10])
        if 'roster_panel_header' in nearby:
            print("[OK] C: Roster help_strings already present")
            break
        help_strings = (
            "    roster_panel_header: \"The Class Roster Key is your differentiation command center. Create student groups with unique learning profiles (grade level, language, reading level, interests, DOK), then apply those profiles to any generator. Roster data is stored in your browser's local storage and never leaves your device unless you explicitly export or sync to a live session. Use 'Apply to Generator' to instantly configure settings for a group, or 'Differentiate by Group' to batch-generate resources for all groups at once.\",\r\n"
            "    roster_import_export: \"Import a previously exported roster JSON file, or export your current roster for backup or sharing between devices. Exported files contain group names, colors, student assignments, and all profile settings.\",\r\n"
            "    roster_sync_session: \"Push your roster group metadata to the active Firebase session so students are automatically assigned to their designated group when they join. Group-specific settings (TTS speed, karaoke mode) take effect on student devices.\",\r\n"
            "    roster_batch_generate: \"Generate differentiated resources for every group simultaneously. Select which resource types to create (adapted text, glossary, quiz, etc.) and the system will iterate through each group, applying their profile settings before generating. Resources are tagged with group identifiers for easy filtering.\",\r\n"
        )
        lines.insert(i + 1, help_strings)
        changes += 1
        print("[OK] C: Added 4 roster help_strings at L%d" % (i + 2))
        break

# ============================
# E) Add bridgeSendOpen state (near bridgeMessage state)
# ============================
for i, l in enumerate(lines):
    if 'bridgeTtsPlaying, setBridgeTtsPlaying' in l:
        nearby = ''.join(lines[i:i+5])
        if 'bridgeSendOpen' in nearby:
            print("[OK] E: bridgeSendOpen state already exists")
            break
        new_state = (
            "  const [bridgeSendOpen, setBridgeSendOpen] = useState(false);\r\n"
            "  const [bridgeSendText, setBridgeSendText] = useState('');\r\n"
            "  const [bridgeSendMode, setBridgeSendMode] = useState('explain');\r\n"
            "  const [bridgeSendTarget, setBridgeSendTarget] = useState('all');\r\n"
            "  const [bridgeSending, setBridgeSending] = useState(false);\r\n"
        )
        lines.insert(i + 1, new_state)
        changes += 1
        print("[OK] E: Added bridgeSend state at L%d" % (i + 2))
        break

# ============================
# G) Add localization keys for E2 (after bridge_test key)
# ============================
for i, l in enumerate(lines):
    if "bridge_test:" in l and i > 14000 and i < 16000:
        nearby = ''.join(lines[i:i+10])
        if 'bridge_send_title' in nearby:
            print("[OK] G: E2 localization keys already present")
            break
        loc_keys = (
            "      bridge_send_title: '🌐 Bridge — Send to Students',\r\n"
            "      bridge_send_placeholder: 'Type a concept, sentence, or instructions...',\r\n"
            "      bridge_send_mode_explain: 'Explain',\r\n"
            "      bridge_send_mode_translate: 'Translate',\r\n"
            "      bridge_send_mode_visual: 'Visual + Explain',\r\n"
            "      bridge_send_btn: 'Send to Class',\r\n"
            "      bridge_send_sending: 'Generating...',\r\n"
            "      bridge_send_target_all: 'All Groups',\r\n"
            "      bridge_send_success: 'Bridge message sent!',\r\n"
            "      bridge_send_no_session: 'Start a session to send to students',\r\n"
        )
        lines.insert(i + 1, loc_keys)
        changes += 1
        print("[OK] G: Added 10 E2 localization keys at L%d" % (i + 2))
        break

# ============================
# D) Add E2: Teacher Bridge Send Panel (before BridgeMessagePanel JSX)
# ============================
for i, l in enumerate(lines):
    if 'BRIDGE MESSAGE PANEL (Phase E1)' in l:
        nearby = ''.join(lines[max(0, i-30):i])
        if 'BRIDGE SEND PANEL' in nearby:
            print("[OK] D: Bridge Send Panel already present")
            break
        send_panel = (
            "      {/* === BRIDGE SEND PANEL (Phase E2) === */}\r\n"
            "      {bridgeSendOpen && isTeacherMode && (\r\n"
            "        <div className=\"bridge-send-overlay\" onClick={(e) => { if (e.target === e.currentTarget) setBridgeSendOpen(false); }}>\r\n"
            "          <div className=\"bridge-send-panel\">\r\n"
            "            <div className=\"bridge-send-header\">\r\n"
            "              <h2>{t('roster.bridge_send_title') || '🌐 Bridge — Send to Students'}</h2>\r\n"
            "              <button className=\"bridge-close-btn\" onClick={() => setBridgeSendOpen(false)}>✕</button>\r\n"
            "            </div>\r\n"
            "            <textarea\r\n"
            "              className=\"bridge-send-input\"\r\n"
            "              value={bridgeSendText}\r\n"
            "              onChange={(e) => setBridgeSendText(e.target.value)}\r\n"
            "              placeholder={t('roster.bridge_send_placeholder') || 'Type a concept, sentence, or instructions...'}\r\n"
            "              rows={4}\r\n"
            "            />\r\n"
            "            <div className=\"bridge-send-modes\">\r\n"
            "              {[{id:'explain', label: t('roster.bridge_send_mode_explain') || 'Explain', icon:'🎨'}, {id:'translate', label: t('roster.bridge_send_mode_translate') || 'Translate', icon:'🌐'}, {id:'visual', label: t('roster.bridge_send_mode_visual') || 'Visual + Explain', icon:'🖼️'}].map(m => (\r\n"
            "                <button key={m.id} onClick={() => setBridgeSendMode(m.id)} className={`bridge-send-mode-btn ${bridgeSendMode === m.id ? 'active' : ''}`}>\r\n"
            "                  <span>{m.icon}</span> {m.label}\r\n"
            "                </button>\r\n"
            "              ))}\r\n"
            "            </div>\r\n"
            "            <div className=\"bridge-send-target-row\">\r\n"
            "              <span className=\"bridge-send-target-label\">Target:</span>\r\n"
            "              <select value={bridgeSendTarget} onChange={(e) => setBridgeSendTarget(e.target.value)} className=\"bridge-send-target-select\">\r\n"
            "                <option value=\"all\">{t('roster.bridge_send_target_all') || 'All Groups'}</option>\r\n"
            "                {rosterKey?.groups && Object.entries(rosterKey.groups).map(([gId, g]) => (\r\n"
            "                  <option key={gId} value={gId}>{g.name}</option>\r\n"
            "                ))}\r\n"
            "              </select>\r\n"
            "            </div>\r\n"
            "            <button\r\n"
            "              className=\"bridge-send-btn\"\r\n"
            "              disabled={!bridgeSendText.trim() || bridgeSending}\r\n"
            "              onClick={async () => {\r\n"
            "                if (!bridgeSendText.trim()) return;\r\n"
            "                setBridgeSending(true);\r\n"
            "                try {\r\n"
            "                  const targetGroups = bridgeSendTarget === 'all'\r\n"
            "                    ? Object.keys(rosterKey?.groups || {})\r\n"
            "                    : [bridgeSendTarget];\r\n"
            "                  const firstGroup = rosterKey?.groups?.[targetGroups[0]];\r\n"
            "                  const targetLang = firstGroup?.profile?.leveledTextLanguage || 'English';\r\n"
            "                  const gradeLevel = firstGroup?.profile?.gradeLevel || '5th Grade';\r\n"
            "                  const prompt = bridgeSendMode === 'translate'\r\n"
            "                    ? `Translate the following text to ${targetLang}. Keep it at ${gradeLevel} reading level. Return ONLY the translation, nothing else:\\n\\n${bridgeSendText}`\r\n"
            "                    : `Explain the following concept at ${gradeLevel} reading level. Also provide a translation in ${targetLang}. Format your response as JSON: {\"english\": \"explanation in English\", \"translated\": \"explanation in ${targetLang}\", \"terms\": [\"key\", \"vocabulary\", \"terms\"]}\\n\\nConcept: ${bridgeSendText}`;\r\n"
            "                  const response = await callGemini(prompt, null, { temperature: 0.3 });\r\n"
            "                  let parsed;\r\n"
            "                  try {\r\n"
            "                    const jsonMatch = response.match(/\\{[\\s\\S]*\\}/);\r\n"
            "                    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;\r\n"
            "                  } catch(e) {\r\n"
            "                    parsed = null;\r\n"
            "                  }\r\n"
            "                  if (bridgeSendMode === 'translate' && !parsed) {\r\n"
            "                    parsed = { english: bridgeSendText, translated: response.trim(), terms: [] };\r\n"
            "                  }\r\n"
            "                  if (!parsed) {\r\n"
            "                    parsed = { english: response.trim(), translated: '', terms: [] };\r\n"
            "                  }\r\n"
            "                  let imageUrl = null;\r\n"
            "                  if (bridgeSendMode === 'visual') {\r\n"
            "                    try {\r\n"
            "                      imageUrl = await callGeminiImageEdit(`Educational illustration: ${bridgeSendText}. Clear, simple, child-friendly diagram suitable for ${gradeLevel} students.`);\r\n"
            "                    } catch(e) { warnLog('Bridge visual generation failed', e); }\r\n"
            "                  }\r\n"
            "                  const langNames = { 'English': '🇺🇸 English', 'Spanish': '🇪🇸 Español', 'French': '🇫🇷 Français', 'Arabic': '🇸🇦 العربية', 'Somali': '🇸🇴 Soomaali', 'Vietnamese': '🇻🇳 Tiếng Việt', 'Portuguese': '🇧🇷 Português', 'Mandarin': '🇨🇳 中文', 'Korean': '🇰🇷 한국어', 'Tagalog': '🇵🇭 Tagalog', 'Russian': '🇷🇺 Русский', 'Japanese': '🇯🇵 日本語' };\r\n"
            "                  setBridgeMessage({\r\n"
            "                    english: parsed.english || bridgeSendText,\r\n"
            "                    translated: parsed.translated || '',\r\n"
            "                    language: targetLang,\r\n"
            "                    languageName: langNames[targetLang] || ('🌐 ' + targetLang),\r\n"
            "                    imageUrl: imageUrl,\r\n"
            "                    terms: parsed.terms || [],\r\n"
            "                    timestamp: Date.now()\r\n"
            "                  });\r\n"
            "                  setBridgeSendOpen(false);\r\n"
            "                  setBridgeSendText('');\r\n"
            "                  addToast(t('roster.bridge_send_success') || 'Bridge message sent!', 'success');\r\n"
            "                } catch(err) {\r\n"
            "                  warnLog('Bridge send failed', err);\r\n"
            "                  addToast('Bridge send failed: ' + err.message, 'error');\r\n"
            "                } finally {\r\n"
            "                  setBridgeSending(false);\r\n"
            "                }\r\n"
            "              }}\r\n"
            "            >\r\n"
            "              {bridgeSending ? (t('roster.bridge_send_sending') || '⏳ Generating...') : (t('roster.bridge_send_btn') || '📡 Send to Class')}\r\n"
            "            </button>\r\n"
            "          </div>\r\n"
            "        </div>\r\n"
            "      )}\r\n"
        )
        lines.insert(i, send_panel)
        changes += 1
        print("[OK] D: Added Bridge Send Panel JSX at L%d" % (i + 1))
        break

# ============================
# F) Add Bridge Send toolbar button (near Test Bridge button)
# ============================
for i, l in enumerate(lines):
    if 'Test Bridge' in l and 'button' in l and i > 56000:
        for j in range(i, i + 10):
            if ')}\r\n' in lines[j] and 'isTeacherMode' not in lines[j]:
                # Insert after the closing of Test Bridge button block
                bridge_btn = (
                    "            {isTeacherMode && (\r\n"
                    "              <button\r\n"
                    "                onClick={() => setBridgeSendOpen(true)}\r\n"
                    "                className=\"text-xs bg-gradient-to-r from-teal-100 to-cyan-100 text-teal-700 px-3 py-1.5 rounded-lg hover:from-teal-200 hover:to-cyan-200 transition-all font-semibold shadow-sm mb-2 flex items-center gap-1\"\r\n"
                    "                title=\"Open Bridge Mode to send bilingual messages to students\"\r\n"
                    "                data-help-key=\"bridge_send_button\"\r\n"
                    "              >🌐 Bridge Mode</button>\r\n"
                    "            )}\r\n"
                )
                lines.insert(j + 1, bridge_btn)
                changes += 1
                print("[OK] F: Added Bridge Mode toolbar button at L%d" % (j + 2))
                break
        break

# ============================
# Add CSS for Bridge Send Panel (before bridge-overlay CSS)
# ============================
for i, l in enumerate(lines):
    if '/* ====== Bridge Message Panel (Phase E1) ====== */' in l:
        nearby = ''.join(lines[max(0, i-30):i])
        if 'bridge-send-overlay' in nearby:
            print("[OK] CSS: Bridge Send CSS already present")
            break
        css_block = (
            "/* ====== Bridge Send Panel (Phase E2) ====== */\r\n"
            ".bridge-send-overlay {\r\n"
            "  position: fixed; inset: 0; z-index: 9998;\r\n"
            "  display: flex; align-items: center; justify-content: center;\r\n"
            "  background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(6px);\r\n"
            "  animation: bridgeFadeIn 0.3s ease-out;\r\n"
            "}\r\n"
            ".bridge-send-panel {\r\n"
            "  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);\r\n"
            "  border-radius: 20px; padding: 28px; max-width: 520px; width: 90vw;\r\n"
            "  color: #e2e8f0; box-shadow: 0 20px 50px rgba(0,0,0,0.4), 0 0 60px rgba(20,184,166,0.1);\r\n"
            "  animation: bridgeSlideUp 0.4s ease-out;\r\n"
            "  border: 1px solid rgba(20,184,166,0.25);\r\n"
            "}\r\n"
            ".bridge-send-header {\r\n"
            "  display: flex; justify-content: space-between; align-items: center;\r\n"
            "  margin-bottom: 18px; padding-bottom: 12px;\r\n"
            "  border-bottom: 1px solid rgba(20,184,166,0.2);\r\n"
            "}\r\n"
            ".bridge-send-header h2 { font-size: 16px; font-weight: 700; margin: 0; color: #5eead4; }\r\n"
            ".bridge-send-input {\r\n"
            "  width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);\r\n"
            "  border-radius: 12px; padding: 14px; color: #e2e8f0; font-size: 15px;\r\n"
            "  line-height: 1.6; resize: vertical; min-height: 100px;\r\n"
            "  transition: border-color 0.2s; outline: none; font-family: inherit;\r\n"
            "}\r\n"
            ".bridge-send-input:focus { border-color: rgba(20,184,166,0.5); box-shadow: 0 0 20px rgba(20,184,166,0.1); }\r\n"
            ".bridge-send-input::placeholder { color: rgba(148,163,184,0.6); }\r\n"
            ".bridge-send-modes {\r\n"
            "  display: flex; gap: 8px; margin: 14px 0;\r\n"
            "}\r\n"
            ".bridge-send-mode-btn {\r\n"
            "  flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);\r\n"
            "  color: #94a3b8; padding: 10px 8px; border-radius: 12px; cursor: pointer;\r\n"
            "  font-size: 12px; font-weight: 600; text-align: center;\r\n"
            "  transition: all 0.2s;\r\n"
            "}\r\n"
            ".bridge-send-mode-btn:hover { background: rgba(255,255,255,0.1); color: #cbd5e1; }\r\n"
            ".bridge-send-mode-btn.active {\r\n"
            "  background: rgba(20,184,166,0.15); border-color: rgba(20,184,166,0.4);\r\n"
            "  color: #5eead4; box-shadow: 0 0 12px rgba(20,184,166,0.15);\r\n"
            "}\r\n"
            ".bridge-send-target-row {\r\n"
            "  display: flex; align-items: center; gap: 10px; margin-bottom: 16px;\r\n"
            "}\r\n"
            ".bridge-send-target-label { font-size: 12px; font-weight: 600; color: #64748b; }\r\n"
            ".bridge-send-target-select {\r\n"
            "  flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);\r\n"
            "  color: #e2e8f0; padding: 8px 12px; border-radius: 10px; font-size: 13px;\r\n"
            "  outline: none; cursor: pointer;\r\n"
            "}\r\n"
            ".bridge-send-target-select option { background: #1e293b; color: #e2e8f0; }\r\n"
            ".bridge-send-btn {\r\n"
            "  width: 100%; background: linear-gradient(135deg, #0d9488, #14b8a6);\r\n"
            "  border: none; color: white; padding: 14px; border-radius: 14px;\r\n"
            "  font-size: 15px; font-weight: 700; cursor: pointer;\r\n"
            "  transition: all 0.2s; box-shadow: 0 4px 15px rgba(20,184,166,0.3);\r\n"
            "}\r\n"
            ".bridge-send-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(20,184,166,0.4); }\r\n"
            ".bridge-send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }\r\n"
        )
        lines.insert(i, css_block)
        changes += 1
        print("[OK] CSS: Added Bridge Send CSS at L%d" % (i + 1))
        break

# ============================
# Add help_string for bridge_send_button
# ============================
for i, l in enumerate(lines):
    if 'roster_batch_generate:' in l and i > 15000:
        nearby = ''.join(lines[i:i+5])
        if 'bridge_send_button' in nearby:
            print("[OK] Help: bridge_send_button already present")
            break
        help_str = (
            "    bridge_send_button: \"Open Bridge Mode to send bilingual messages to students during live instruction. Type a concept, sentence, or instructions, choose a mode (Explain, Translate, or Visual+Explain), and select a target group. The message is generated using AI with the group's language and reading level settings, then displayed as a large, readable bilingual panel on student devices with TTS and karaoke highlighting.\",\r\n"
        )
        lines.insert(i + 1, help_str)
        changes += 1
        print("[OK] Help: Added bridge_send_button help_string at L%d" % (i + 2))
        break

# ============================
# SAVE
# ============================
content = ''.join(lines)
content = content.replace('\r\r\n', '\r\n')
open(filepath, 'w', encoding='utf-8').write(content)
print("\n=== Total %d changes applied ===" % changes)
