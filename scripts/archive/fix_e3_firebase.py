import sys
sys.stdout.reconfigure(encoding='utf-8')
lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').readlines()

# Find the addToast for bridge_send_success in the E2 send handler
for i, l in enumerate(lines):
    if "bridge_send_success" in l and "addToast" in l and i > 70000:
        nearby = ''.join(lines[i:i+10])
        if 'bridgePayload' in nearby:
            print("Firebase write already present")
            break
        firebase_write = (
            "                  // E3: Also write concept payload to Firebase for student devices\r\n"
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
            "                      debugLog('Bridge payload written to Firebase session');\r\n"
            "                    } catch(fbErr) {\r\n"
            "                      warnLog('Bridge Firebase write failed (students will not receive):', fbErr);\r\n"
            "                    }\r\n"
            "                  }\r\n"
        )
        lines.insert(i + 1, firebase_write)
        print("Injected Firebase write at L%d" % (i + 2))
        break

open('AlloFlowANTI.txt', 'w', encoding='utf-8').write(''.join(lines))
print("Done")
