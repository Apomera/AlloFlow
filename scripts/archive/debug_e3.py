import sys
sys.stdout.reconfigure(encoding='utf-8')
content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
items = [
    "lastBridgeTimestampRef = useRef(0)",
    "bridgePayload:",
    "text: bridgeSendText",
    "E3: Bridge Message Listener",
    "payloadTs > lastBridgeTimestampRef.current",
    "bp.targetGroup === 'all'",
    "senderName: bp.senderName",
    "Fallback: show raw text",
    "bridge_receiving:",
]
fails = [item for item in items if item not in content]
if fails:
    print("FAILED items:")
    for f in fails:
        print("  FAIL:", f)
else:
    print("ALL 9 KEY CHECKS PASSED!")
