"""
Phase E3: Student Firebase Listener for Bridge Mode
Changes:
1) Add lastBridgeTimestampRef (prevent duplicate processing)
2) Modify E2 teacher send to ALSO write payload to Firebase session doc
3) Add bridge listener inside onSnapshot student branch
4) Add localization keys for E3
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

# ============================
# 1) Add lastBridgeTimestampRef (near bridgeSend state vars)
# ============================
for i, l in enumerate(lines):
    if 'bridgeSending, setBridgeSending' in l:
        nearby = ''.join(lines[i:i+5])
        if 'lastBridgeTimestampRef' in nearby:
            print("[OK] 1: lastBridgeTimestampRef already present")
            break
        ref_line = "  const lastBridgeTimestampRef = useRef(0);\r\n"
        lines.insert(i + 1, ref_line)
        changes += 1
        print("[OK] 1: Added lastBridgeTimestampRef at L%d" % (i + 2))
        break

# ============================
# 2) Modify E2 teacher send to ALSO write to Firebase
#    After setBridgeMessage({...}), add Firebase write
# ============================
for i, l in enumerate(lines):
    if "setBridgeMessage({" in l and "english:" in lines[i+1] if i+1 < len(lines) else False:
        # Find the closing of setBridgeMessage block
        brace_count = 0
        found_start = False
        for j in range(i, min(i + 20, len(lines))):
            if 'setBridgeMessage({' in lines[j]:
                found_start = True
            if found_start:
                brace_count += lines[j].count('{') - lines[j].count('}')
                if brace_count <= 0:
                    # j is the line with closing });
                    # Check if Firebase write already exists after
                    nearby = ''.join(lines[j:j+10])
                    if 'bridgePayload' in nearby:
                        print("[OK] 2: Firebase write already present")
                        break
                    firebase_write = (
                        "                  // E3: Also write to Firebase for student devices\r\n"
                        "                  if (activeSessionCode) {\r\n"
                        "                    try {\r\n"
                        "                      const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);\r\n"
                        "                      await updateDoc(sessionRef, {\r\n"
                        "                        bridgePayload: {\r\n"
                        "                          text: bridgeSendText,\r\n"
                        "                          mode: bridgeSendMode,\r\n"
                        "                          targetGroup: bridgeSendTarget,\r\n"
                        "                          timestamp: Date.now(),\r\n"
                        "                          senderName: user?.displayName || 'Teacher'\r\n"
                        "                        }\r\n"
                        "                      });\r\n"
                        "                      debugLog('Bridge payload written to Firebase');\r\n"
                        "                    } catch(fbErr) {\r\n"
                        "                      warnLog('Bridge Firebase write failed (students wont receive):', fbErr);\r\n"
                        "                    }\r\n"
                        "                  }\r\n"
                    )
                    lines.insert(j + 1, firebase_write)
                    changes += 1
                    print("[OK] 2: Added Firebase write after setBridgeMessage at L%d" % (j + 2))
                    break
        break

# ============================
# 3) Add bridge listener inside onSnapshot student branch
#    Find the spot AFTER resource hydration in the student branch
#    Look for: if (data.mode === 'sync' && data.currentResourceId)
#    Insert bridge listener BEFORE that line
# ============================
for i, l in enumerate(lines):
    if "data.mode === 'sync' && data.currentResourceId" in l and i > 35000 and i < 40000:
        nearby = ''.join(lines[max(0, i-30):i])
        if 'bridgePayload' in nearby:
            print("[OK] 3: Bridge listener already present in onSnapshot")
            break
        bridge_listener = (
            "                  // ====== E3: Bridge Message Listener ======\r\n"
            "                  if (data.bridgePayload && data.bridgePayload.timestamp) {\r\n"
            "                    const payloadTs = data.bridgePayload.timestamp;\r\n"
            "                    if (payloadTs > lastBridgeTimestampRef.current) {\r\n"
            "                      lastBridgeTimestampRef.current = payloadTs;\r\n"
            "                      const bp = data.bridgePayload;\r\n"
            "                      // Check if this message targets our group\r\n"
            "                      const myGroupId = data.roster?.[user?.uid]?.groupId;\r\n"
            "                      const isTargeted = bp.targetGroup === 'all' || bp.targetGroup === myGroupId;\r\n"
            "                      if (isTargeted) {\r\n"
            "                        debugLog('Bridge: Received payload, generating locally...', bp.text);\r\n"
            "                        // Get group profile for localized generation\r\n"
            "                        const myProfile = myGroupId && data.groups?.[myGroupId]?.profile\r\n"
            "                          ? data.groups[myGroupId].profile\r\n"
            "                          : { gradeLevel: '5th Grade', leveledTextLanguage: 'English' };\r\n"
            "                        const targetLang = myProfile.leveledTextLanguage || 'English';\r\n"
            "                        const gradeLevel = myProfile.gradeLevel || '5th Grade';\r\n"
            "                        const langNames = { 'English': '🇺🇸 English', 'Spanish': '🇪🇸 Español', 'French': '🇫🇷 Français', 'Arabic': '🇸🇦 العربية', 'Somali': '🇸🇴 Soomaali', 'Vietnamese': '🇻🇳 Tiếng Việt', 'Portuguese': '🇧🇷 Português', 'Mandarin': '🇨🇳 中文', 'Korean': '🇰🇷 한국어', 'Tagalog': '🇵🇭 Tagalog', 'Russian': '🇷🇺 Русский', 'Japanese': '🇯🇵 日本語' };\r\n"
            "                        // Generate localized content on student device\r\n"
            "                        (async () => {\r\n"
            "                          try {\r\n"
            "                            const prompt = bp.mode === 'translate'\r\n"
            "                              ? `Translate the following text to ${targetLang}. Keep it at ${gradeLevel} reading level. Return ONLY the translation, nothing else:\\n\\n${bp.text}`\r\n"
            "                              : `Explain the following concept at ${gradeLevel} reading level. Also provide a translation in ${targetLang}. Format your response as JSON: {\"english\": \"explanation in English\", \"translated\": \"explanation in ${targetLang}\", \"terms\": [\"key\", \"vocabulary\", \"terms\"]}\\n\\nConcept: ${bp.text}`;\r\n"
            "                            const response = await callGemini(prompt, null, { temperature: 0.3 });\r\n"
            "                            let parsed;\r\n"
            "                            try {\r\n"
            "                              const jsonMatch = response.match(/\\{[\\s\\S]*\\}/);\r\n"
            "                              parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;\r\n"
            "                            } catch(e) { parsed = null; }\r\n"
            "                            if (bp.mode === 'translate' && !parsed) {\r\n"
            "                              parsed = { english: bp.text, translated: response.trim(), terms: [] };\r\n"
            "                            }\r\n"
            "                            if (!parsed) {\r\n"
            "                              parsed = { english: response.trim(), translated: '', terms: [] };\r\n"
            "                            }\r\n"
            "                            let imageUrl = null;\r\n"
            "                            if (bp.mode === 'visual') {\r\n"
            "                              try {\r\n"
            "                                imageUrl = await callGeminiImageEdit(`Educational illustration: ${bp.text}. Clear, simple, child-friendly diagram suitable for ${gradeLevel} students.`);\r\n"
            "                              } catch(e) { warnLog('Bridge visual generation failed on student device', e); }\r\n"
            "                            }\r\n"
            "                            setBridgeMessage({\r\n"
            "                              english: parsed.english || bp.text,\r\n"
            "                              translated: parsed.translated || '',\r\n"
            "                              language: targetLang,\r\n"
            "                              languageName: langNames[targetLang] || ('🌐 ' + targetLang),\r\n"
            "                              imageUrl: imageUrl,\r\n"
            "                              terms: parsed.terms || [],\r\n"
            "                              senderName: bp.senderName || 'Teacher',\r\n"
            "                              timestamp: payloadTs\r\n"
            "                            });\r\n"
            "                            debugLog('Bridge: Local generation complete, panel displayed');\r\n"
            "                          } catch(err) {\r\n"
            "                            warnLog('Bridge: Generation failed on student device', err);\r\n"
            "                            // Fallback: show raw text\r\n"
            "                            setBridgeMessage({\r\n"
            "                              english: bp.text,\r\n"
            "                              translated: '',\r\n"
            "                              language: targetLang,\r\n"
            "                              languageName: langNames[targetLang] || ('🌐 ' + targetLang),\r\n"
            "                              imageUrl: null,\r\n"
            "                              terms: [],\r\n"
            "                              senderName: bp.senderName || 'Teacher',\r\n"
            "                              timestamp: payloadTs\r\n"
            "                            });\r\n"
            "                          }\r\n"
            "                        })();\r\n"
            "                      }\r\n"
            "                    }\r\n"
            "                  }\r\n"
        )
        lines.insert(i, bridge_listener)
        changes += 1
        print("[OK] 3: Added bridge listener in onSnapshot at L%d" % (i + 1))
        break

# ============================
# 4) Add localization keys for E3
# ============================
for i, l in enumerate(lines):
    if "bridge_send_no_session:" in l:
        nearby = ''.join(lines[i:i+5])
        if 'bridge_receiving' in nearby:
            print("[OK] 4: E3 localization keys already present")
            break
        loc_keys = (
            "      bridge_receiving: 'Receiving message from teacher...',\r\n"
            "      bridge_from_teacher: 'From your teacher',\r\n"
            "      bridge_generating: 'Creating your personalized version...',\r\n"
        )
        lines.insert(i + 1, loc_keys)
        changes += 1
        print("[OK] 4: Added 3 E3 localization keys at L%d" % (i + 2))
        break

# ============================
# SAVE
# ============================
content = ''.join(lines)
content = content.replace('\r\r\n', '\r\n')
open(filepath, 'w', encoding='utf-8').write(content)
print("\n=== Total %d changes applied ===" % changes)
